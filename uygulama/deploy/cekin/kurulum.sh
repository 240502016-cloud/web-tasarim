#!/usr/bin/env bash
# ProjeEşleştir sunucu kurulumu / güncellemesi. /opt/proje-eslestir içinde çalışır.
# - .env yoksa sırları üretir (ekrana basmaz)
# - veritabanını ve servisleri başlatır
# - supabase/migrations altındaki yeni migration'ları sırayla uygular
# Tekrar çalıştırmak güvenlidir: uygulanmış migration atlanır, veri silinmez.
set -euo pipefail
cd "$(dirname "$0")"

SITE_URL_VARSAYILAN="https://web.cekin.gen.tr"

# ---------- 1) Sırlar ----------
if [ ! -f .env ]; then
  echo "[kurulum] .env üretiliyor"
  umask 077
  JWT_SECRET=$(openssl rand -hex 32)
  anahtar() {
    python3 - "$JWT_SECRET" "$1" <<'PY'
import base64, hashlib, hmac, json, sys, time
secret, role = sys.argv[1], sys.argv[2]
b64 = lambda b: base64.urlsafe_b64encode(b).rstrip(b"=").decode()
now = int(time.time())
head = b64(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
body = b64(json.dumps({"role": role, "iss": "supabase", "iat": now, "exp": now + 10 * 365 * 24 * 3600}, separators=(",", ":")).encode())
sig = b64(hmac.new(secret.encode(), f"{head}.{body}".encode(), hashlib.sha256).digest())
print(f"{head}.{body}.{sig}")
PY
  }
  cat > .env <<EOF
SITE_URL=${SITE_URL_VARSAYILAN}
POSTGRES_PASSWORD=$(openssl rand -hex 32)
JWT_SECRET=${JWT_SECRET}
ANON_KEY=$(anahtar anon)
SERVICE_ROLE_KEY=$(anahtar service_role)
REALTIME_DB_ENC_KEY=$(openssl rand -hex 8)
SECRET_KEY_BASE=$(openssl rand -hex 32)
# E-posta doğrulaması: SMTP girilince false yapın ve 'docker compose up -d auth' çalıştırın
MAILER_AUTOCONFIRM=true
SMTP_ADMIN_EMAIL=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_SENDER_NAME=ProjeEşleştir
EOF
  chmod 600 .env
fi

saglikli_bekle() {
  local ad=$1 i
  for i in $(seq 1 60); do
    if [ "$(docker inspect -f '{{.State.Health.Status}}' "$ad" 2>/dev/null)" = "healthy" ]; then
      echo "[kurulum] $ad hazır"
      return 0
    fi
    sleep 3
  done
  echo "[kurulum] HATA: $ad sağlıklı hale gelmedi"; docker logs --tail 50 "$ad"; return 1
}

# ---------- 2) Veritabanı ve giriş servisi ----------
docker compose pull -q
docker compose up -d db
saglikli_bekle pe-db
docker compose up -d auth          # GoTrue auth şemasını kendi migration'larıyla hazırlar
saglikli_bekle pe-auth

# ---------- 3) Uygulama migration'ları ----------
psql_db() { docker exec -i pe-db psql -v ON_ERROR_STOP=1 -q -U postgres -h localhost -d postgres "$@"; }

psql_db <<'SQL'
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);
SQL

uygulanan=0
for dosya in migrations/*.sql; do
  ad=$(basename "$dosya" .sql)
  surum=${ad%%_*}
  var=$(psql_db -tAc "select 1 from supabase_migrations.schema_migrations where version = '$surum'")
  if [ "$var" = "1" ]; then continue; fi
  echo "[kurulum] migration uygulanıyor: $ad"
  { echo "begin;"; cat "$dosya"; echo; echo "insert into supabase_migrations.schema_migrations (version, name) values ('$surum', '${ad#*_}');"; echo "commit;"; } | psql_db
  uygulanan=$((uygulanan + 1))
done
echo "[kurulum] yeni migration: $uygulanan"

# ---------- 4) Diğer servisler ----------
docker compose up -d rest realtime
saglikli_bekle pe-rest
saglikli_bekle pe-realtime
[ "$uygulanan" -gt 0 ] && psql_db -c "notify pgrst, 'reload schema';" || true

if [ -f dist/index.html ]; then
  docker compose up -d web
  docker compose restart web >/dev/null   # yeni dist dosyalarını kesin olarak görsün
  saglikli_bekle pe-web
else
  echo "[kurulum] dist/ yok, web konteyneri başlatılmadı"
fi

docker compose ps --format 'table {{.Name}}\t{{.Status}}'
