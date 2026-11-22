import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anahtar = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anahtar) {
  throw new Error(
    "Supabase ayarları eksik: uygulama klasöründe .env.local dosyası oluşturup " +
      "VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY değerlerini girin (.env.example dosyasına bakın).",
  );
}

// Tarayıcıda yalnızca herkese açık (anon) anahtar kullanılır.
// Yetkiler veritabanındaki RLS politikalarıyla sağlanır; service_role anahtarı asla buraya yazılmaz.
export const supabase = createClient(url, anahtar);

// Supabase / PostgreSQL hata mesajlarını kullanıcıya gösterilecek Türkçe metne çevirir
export function hataMetni(hata) {
  if (!hata) return "Bir hata oluştu.";
  const mesaj = hata.message || String(hata);

  const bilinenler = [
    [/Invalid login credentials/i, "E-posta veya şifre hatalı."],
    [/Email not confirmed/i, "Giriş yapmadan önce e-posta adresini doğrulaman gerekiyor."],
    [/User already registered/i, "Bu e-posta adresiyle zaten bir hesap var."],
    [
      /Password should|weak password/i,
      "Şifre çok zayıf: en az 8 karakter, harf ve rakam içermeli.",
    ],
    [/rate limit|too many requests/i, "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar dene."],
    [
      /Database error saving new user/i,
      "Kayıt tamamlanamadı. Öğrenciysen .edu.tr uzantılı e-posta kullandığından emin ol.",
    ],
    [/Failed to fetch|NetworkError/i, "Sunucuya bağlanılamadı. İnternet bağlantını kontrol et."],
    [/duplicate key/i, "Bu kayıt zaten var."],
    [/row-level security|permission denied/i, "Bu işlem için yetkin yok."],
  ];
  for (const [desen, metin] of bilinenler) {
    if (desen.test(mesaj)) return metin;
  }
  // Veritabanı tetikleyicilerimiz zaten Türkçe hata mesajı üretiyor
  return mesaj;
}

// Supabase sorgu sonucunu kontrol eder: hata varsa fırlatır, yoksa veriyi döndürür
export function sonuc({ data, error }) {
  if (error) throw new Error(hataMetni(error));
  return data;
}
