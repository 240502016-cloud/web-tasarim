# web.cekin.gen.tr kurulumu

```text
Sunucu  : 169.40.43.242 (Nexus ile aynı makine)   SSH: root, ~/.ssh/nexus_vds_migration_ed25519
Klasör  : /opt/proje-eslestir                      Compose projesi: proje-eslestir
Adres   : https://web.cekin.gen.tr                 TLS: Nexus'un Caddy'si (Cloudflare DNS-01)
DNS     : web → 169.40.43.242, A kaydı, gri bulut
```

## Yapı

```text
İnternet ─► Nexus Caddy (443, TLS) ─► pe-web (Caddy, nexus_app ağında)
                                         ├── /            → dist/ (React)
                                         ├── /auth/v1/*   → pe-auth (GoTrue)
                                         ├── /rest/v1/*   → pe-rest (PostgREST)
                                         └── /realtime/v1/websocket → pe-realtime
                                      pe-db (Supabase Postgres) — dışarıya kapalı
```

- Dışarıya port açılmaz; yalnız `pe-web` Nexus'un Caddy ağına katılır. Nexus'un servislerine ve verisine dokunulmaz.
- Her serviste bellek sınırı var (toplam en fazla ~2,1 GB). Supabase taşsa bile Nexus'u boğamaz.
- Loglar 3 × 10 MB ile sınırlı.
- Supabase'in yalnız gereken parçaları kurulu: Storage, Studio ve Edge Functions yok.
- Sırlar `/opt/proje-eslestir/.env` dosyasındadır (izin 600, Git'te yok). İlk kurulumda `kurulum.sh` üretti.
  **Bu dosyanın bir kopyasını parola yöneticisinde saklayın.** Kaybolursa yedekten dönülse bile oturumlar ve anahtarlar yeniden üretilmek zorunda kalır.

## Güncelleme

Kod değişince (uygulama klasöründen):

```powershell
powershell -ExecutionPolicy Bypass -File deploy\cekin\deploy.ps1
```

Betik şunları yapar:
1. Yeni migration'ları uygular.
2. Arayüzü derleyip yükler.
3. `pe-web`'i yeniden başlatır.

Veritabanı ve `.env` korunur. Bir önceki arayüz `dist.eski/` klasöründe kalır.

## İlk yönetici

Kendi hesabınla siteden kayıt ol. Sonra sunucuda:

```bash
docker exec -i pe-db psql -U postgres -h localhost -d postgres -c \
  "update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'SENIN@EPOSTAN')"
```

## E-posta (SMTP)

Şu an e-posta doğrulaması kapalı (`MAILER_AUTOCONFIRM=true`), şifre sıfırlama e-postası da gitmez.

Açmak için:
1. `.env` içinde `SMTP_*` alanlarını doldur ve `MAILER_AUTOCONFIRM=false` yap.
2. `cd /opt/proje-eslestir && docker compose up -d auth` çalıştır.

## Yedek ve geri yükleme

- `pe-yedek.timer` her gün 04:15 UTC'de tüm veritabanını (hesaplar dahil) `/opt/proje-eslestir/yedekler/` klasörüne alır ve 14 günü tutar.
- Elle almak için: `systemctl start pe-yedek.service`.
- Bilgisayara çekmek için:

  ```powershell
  scp -i $env:USERPROFILE\.ssh\nexus_vds_migration_ed25519 "root@169.40.43.242:/opt/proje-eslestir/yedekler/*.dump" C:\Users\mahfl\proje-eslestir-yedekler\
  ```

Geri yükleme yeni ve boş bir veritabanına yapılır:

```bash
cd /opt/proje-eslestir
docker compose stop web rest realtime auth
docker exec -i pe-db pg_restore -U supabase_admin -h localhost -d postgres --clean --if-exists \
  --schema=public --schema=auth --schema=supabase_migrations < yedekler/<DOSYA>.dump
docker compose up -d
```

## Günlük işler

```bash
cd /opt/proje-eslestir
docker compose ps                          # durum
docker compose logs -f --tail 100 auth     # giriş servisi logları
docker stats --no-stream | grep pe-        # bellek kullanımı
```

## Nexus Caddy'si hakkında

- `web.caddy` bloğu `/opt/nexus/docker/reverse-proxy/Caddyfile` dosyasının sonuna eklendi. Eklemeden önceki hâlin yedeği: `/root/Caddyfile.before-web`.
- Nexus'un `Update` işlemi (git stash + pull) bu bloğu silebilir. Silerse bloğu yeniden ekle:
  `cat /opt/proje-eslestir/web.caddy >> Caddyfile`
- Çalışan Caddy konteyneri 23 Kasım 2026'da eski bir dosya kopyasını görüyordu. Dosya daha önce yeniden yazılmış ve bağlantı (mount) eski dosyada kalmıştı. Ayar kesinti olmasın diye `/tmp/Caddyfile.guncel` kopyasından yüklendi.
- Caddy konteyneri bir sonraki yeniden başlatmada güncel dosyayı zaten okur.
- Önemli: o zamana kadar `caddy reload --config /etc/caddy/Caddyfile` komutu **eski** dosyayı yükler ve web bloğunu düşürür. Nexus'un bir sonraki bakımında `docker compose restart reverse-proxy` ile bu durum düzelir.

## Geri alma (siteyi tamamen kaldırmak)

1. Caddy'yi eski hâline getir. Dosyanın yerini değiştirmeden üzerine yaz, sonra yeniden yükle:

   ```bash
   cat /root/Caddyfile.before-web > /opt/nexus/docker/reverse-proxy/Caddyfile
   docker exec nexus-reverse-proxy-1 caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
   ```

2. Servisleri durdur. Veri volume'u kalır; `-v` **ekleme**:

   ```bash
   cd /opt/proje-eslestir && docker compose down
   systemctl disable --now pe-yedek.timer
   ```

İstersen Cloudflare'deki `web` A kaydını da silebilirsin.
