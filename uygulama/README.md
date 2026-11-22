# ProjeEşleştir

Öğrencileri becerilerine uygun **projelerle**, **takım arkadaşlarıyla** ve deneyimli **mentörlerle** buluşturan web platformu.

## Özellikler

| Rol | Yapabildikleri |
|---|---|
| **Ziyaretçi** | Projeleri listeler, arar ve filtreler |
| **Öğrenci** | `.edu.tr` e-postasıyla kayıt olur, becerilerini seviyeleriyle ekler, kendisine **uygunluk puanıyla önerilen** projeleri görür, projeye başvurur, proje açar |
| **Proje lideri** | Başvuruları kabul / ret eder, projeye uygun öğrenci ve mentör önerilerini görür, mentörlük talebi gönderir, görüşme planlar |
| **Mentör** | Yönetici onayından sonra aktif olur, talepleri kapasitesine göre kabul eder, görüşme planlar |
| **Ekip** | Proje içinde anlık mesajlaşır, uygulama içi bildirim alır |
| **Yönetici** | Mentörleri onaylar, şikâyetleri inceler, kullanıcıyı askıya alır, beceri listesini yönetir, istatistikleri görür |

Uygunluk puanı: `100 × (0,7 × beceri kapsama + 0,3 × ortalama seviye / 5)`. Hesap veritabanında yapılır (`supabase/migrations/…_hafta12_eslestirme.sql`).

## Teknolojiler

- **Arayüz:** React 19 + Vite, React Router, TanStack Query, React Hook Form + Zod, date-fns, Recharts
- **Arka uç:** Supabase (PostgreSQL, Auth, Realtime). Yetkiler veritabanında **RLS** politikalarıyla uygulanır.
- **Yayın:** Vercel (arayüz) + Supabase Cloud (veritabanı)

## Klasör yapısı

```
src/
  api/          Supabase sorguları (veritabanı satırı -> arayüz nesnesi dönüşümü burada)
  baglam/       Oturum (giriş yapan kullanıcı ve profili)
  bilesenler/   Ortak bileşenler; proje/ altında proje sayfasının parçaları
  lib/          Doğrulama şemaları, filtreleme, metin yardımcıları
  sayfalar/     Rotalara karşılık gelen sayfalar
  styles/       Ortak stil dosyası (prototip/css/stil.css'ten taşındı)
supabase/
  migrations/   Veritabanı şeması, tetikleyiciler, RLS ve fonksiyonlar (haftalara göre)
  seed.sql      Yalnızca yerel geliştirme / sunum için örnek veri
  testler/      Veritabanı testleri (Docker gerektirmez, PGlite ile çalışır)
```

## Yerelde çalıştırma

Gerekenler: Node.js 22+, Docker Desktop (yerel Supabase için).

```bash
npm install
npx supabase start
```

`supabase start` çıktısındaki **API URL** ve **anon key** değerleriyle `.env.local` dosyası oluştur (`.env.example`'a bak):

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=...
```

```bash
npx supabase db reset   # şemayı ve örnek veriyi yükler
npm run dev
```

Örnek hesaplar (şifre hepsi için `Demo1234`):

| E-posta | Rol |
|---|---|
| `yonetici@demo.edu.tr` | Yönetici |
| `ayse@ogr.demo.edu.tr`, `mehmet@…`, `zeynep@…`, `can@ogr.demo.edu.tr` | Öğrenci |
| `deniz@demo-mentor.com`, `selin@demo-mentor.com` | Onaylı mentör |
| `emre@demo-mentor.com` | Onay bekleyen mentör |

## Testler

```bash
npm test          # arayüz birim testleri (Vitest)
npm run test:db   # veritabanı testleri: RLS, tetikleyiciler, eşleştirme, örnek veri
npm run lint
```

Veritabanı testleri `supabase/migrations` içindeki SQL dosyalarını, tarayıcı dışında çalışan bir PostgreSQL (PGlite) üzerinde çalıştırır; Docker gerekmez. GitHub Actions her push'ta tüm testleri çalıştırır (`.github/workflows/ci.yml`).

## Yayına alma (canlı)

### 1. Supabase projesi

1. [supabase.com](https://supabase.com) üzerinde yeni bir proje oluştur (bölge: Frankfurt / `eu-central-1`, Türkiye'ye en yakın).
2. Şemayı yükle:
   ```bash
   npx supabase login
   npx supabase link --project-ref <proje-ref>
   npx supabase db push
   ```
   `db push` yalnızca `migrations/` klasörünü uygular; örnek veri (`seed.sql`) canlıya **yüklenmez**.
3. **Authentication → URL Configuration**
   - Site URL: `https://<vercel-adresin>`
   - Redirect URLs: `https://<vercel-adresin>/giris`, `https://<vercel-adresin>/sifre-yenile`
4. **Authentication → Providers → Email:** "Confirm email" açık olsun. Şifre en az 8 karakter, harf ve rakam içersin (Password requirements: *Letters and digits*).
5. **Authentication → Emails → SMTP:** Supabase'in yerleşik e-posta servisi saatte birkaç e-postayla sınırlıdır. Gerçek kullanıcılar için bir SMTP sağlayıcısı (ör. Resend, Brevo) bağla.
6. **İlk yöneticiyi ata:** Kendi hesabınla kayıt ol, sonra **SQL Editor**'de çalıştır:
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'senin@universite.edu.tr');
   ```

### 2. Vercel

1. [vercel.com](https://vercel.com) → **Add New Project** → GitHub'daki `web-tasarim` reposunu seç.
2. **Root Directory:** `uygulama` (framework Vite olarak otomatik algılanır).
3. **Environment Variables:** `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` (Supabase → Project Settings → API).
4. Deploy. Bundan sonra `main` dalına her push otomatik yayına alınır.

> `service_role` anahtarını **asla** Vercel'e ya da koda ekleme; tarayıcıda yalnızca anon anahtarı kullanılır.

### 3. Yayından sonra kontrol listesi

- [ ] `.edu.tr` adresiyle öğrenci kaydı → doğrulama e-postası geliyor, giriş yapılabiliyor
- [ ] Mentör kaydı → yönetim panelinde "Mentör Onayları"nda görünüyor, onaylanınca bildirim gidiyor
- [ ] Proje oluşturma, başvuru, kabul → takım doluluğu güncelleniyor
- [ ] İki farklı tarayıcıda aynı projenin sohbetinde mesajlar anında görünüyor (Realtime)
- [ ] Şifremi unuttum e-postasındaki bağlantı `/sifre-yenile` sayfasını açıyor
- [ ] Ücretsiz Supabase projeleri bir hafta kullanılmazsa duraklatılır; sunumdan önce panelden kontrol et

## Sunum için demo akışı

1. Ziyaretçi olarak ana sayfa → projeler (arama, filtreler).
2. `ayse@ogr.demo.edu.tr` ile giriş → **Panelim**: önerilen projeler ve uygunluk puanları, başvurular.
3. "Kütüphane Doluluk Takibi" projesinin lideri Ayşe: gelen başvuruyu kabul et, mentör önerilerinden talep gönder.
4. `deniz@demo-mentor.com` ile giriş: "Yemekhane Menü Uygulaması" sohbeti ve görüşmeleri; gelen talepleri gör.
5. `yonetici@demo.edu.tr` ile giriş → **Yönetim**: istatistikler, Emre'nin mentörlük onayı.
