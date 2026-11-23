#!/usr/bin/env bash
# ProjeEşleştir günlük veritabanı yedeği (systemd zamanlayıcısı pe-yedek.timer çalıştırır).
# Kullanıcı hesapları (auth) ve uygulama verisi (public) dahil tüm veritabanını alır,
# son 14 günü tutar. Geri yükleme: deploy/cekin/README.md "Geri yükleme".
set -euo pipefail
umask 077   # yedeklerde şifre özetleri var: yalnız root okuyabilsin
HEDEF=/opt/proje-eslestir/yedekler
mkdir -p "$HEDEF"
chmod 700 "$HEDEF"
ZAMAN=$(date -u +%Y%m%dT%H%M%SZ)
DOSYA="$HEDEF/proje-eslestir-$ZAMAN.dump"

docker exec pe-db pg_dump -U supabase_admin -h localhost -d postgres -Fc > "$DOSYA.yarim"
mv "$DOSYA.yarim" "$DOSYA"
sha256sum "$DOSYA" | awk '{print $1}' > "$DOSYA.sha256"
find "$HEDEF" -name 'proje-eslestir-*.dump*' -mtime +14 -delete
echo "yedek alındı: $DOSYA ($(du -h "$DOSYA" | cut -f1))"
