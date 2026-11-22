import { z } from "zod";

// Formlarda kullanılan doğrulama kuralları (zod şemaları)

export const SIFRE_KURALI = /^(?=.*[A-Za-zÇĞİÖŞÜçğıöşü])(?=.*\d).{8,}$/;

export function eduTrMi(eposta = "") {
  return /@([a-z0-9-]+\.)+edu\.tr$/i.test(eposta.trim());
}

export const girisSemasi = z.object({
  eposta: z.email("Geçerli bir e-posta adresi girin."),
  sifre: z.string().min(1, "Şifrenizi girin."),
});

const eposta = z.email("Geçerli bir e-posta adresi girin.");

// Sayı alanları boş bırakılırsa NaN gelir; bu yüzden aralık mesajı tip hatasında da gösterilir
const aralik = (en, enFazla) => {
  const mesaj = `${en} ile ${enFazla} arasında bir sayı girin.`;
  return z.number(mesaj).int(mesaj).min(en, mesaj).max(enFazla, mesaj);
};

const ortakAlanlar = {
  adSoyad: z.string().trim().min(3, "Ad soyad en az 3 karakter olmalı."),
  sifre: z
    .string()
    .regex(SIFRE_KURALI, "Şifre en az 8 karakter olmalı; en az bir harf ve bir rakam içermeli."),
  kvkk: z.literal(true, "Devam etmek için aydınlatma metnini onaylamalısınız."),
};

// Role göre iki ayrı şema: tüm alan hataları aynı anda gösterilebilsin
export const kayitSemasi = z.discriminatedUnion("rol", [
  z.object({
    rol: z.literal("student"),
    ...ortakAlanlar,
    eposta: eposta.refine(
      eduTrMi,
      "Öğrenci kaydı için .edu.tr uzantılı üniversite e-postası gerekir.",
    ),
    bolum: z.string().min(1, "Bölüm seçin."),
    sinif: z.string().min(1, "Sınıf seçin."),
  }),
  z.object({
    rol: z.literal("mentor"),
    ...ortakAlanlar,
    eposta,
    unvan: z.string().trim().min(2, "Unvanınızı yazın."),
    uzmanlik: z.string().min(1, "Uzmanlık alanı seçin."),
    deneyimYili: aralik(1, 50),
    kapasite: aralik(1, 5),
  }),
]);

export const BOLUMLER = [
  "Bilgisayar Mühendisliği",
  "Yazılım Mühendisliği",
  "Bilgisayar Programcılığı",
  "Yönetim Bilişim Sistemleri",
  "Elektrik-Elektronik Mühendisliği",
  "Diğer",
];

export const UZMANLIK_ALANLARI = [
  "Web Geliştirme",
  "Mobil Geliştirme",
  "Veri Bilimi / Yapay Zeka",
  "Siber Güvenlik",
  "Gömülü Sistemler",
  "Oyun Geliştirme",
];

// Profil düzenleme formu (rol kayıttan sonra değiştirilemez)
const hakkinda = z.string().max(1000, "En fazla 1000 karakter yazabilirsiniz.").optional();

export const profilSemalari = {
  student: z.object({
    adSoyad: ortakAlanlar.adSoyad,
    bolum: z.string().min(1, "Bölüm seçin."),
    sinif: z.string().min(1, "Sınıf seçin."),
    hakkinda,
  }),
  mentor: z.object({
    adSoyad: ortakAlanlar.adSoyad,
    unvan: z.string().trim().min(2, "Unvanınızı yazın."),
    uzmanlik: z.string().min(1, "Uzmanlık alanı seçin."),
    deneyimYili: aralik(1, 50),
    kapasite: aralik(1, 5),
    hakkinda,
  }),
  admin: z.object({ adSoyad: ortakAlanlar.adSoyad, hakkinda }),
};

// Boş bırakılan isteğe bağlı sayı alanı (NaN) "yok" sayılır
const istegeBagliSayi = (en, enFazla) =>
  z.preprocess((v) => (Number.isNaN(v) || v === "" ? undefined : v), aralik(en, enFazla).optional());

export const projeSemasi = z.object({
  baslik: z.string().trim().min(5, "Başlık en az 5 karakter olmalı.").max(120, "Başlık en fazla 120 karakter olabilir."),
  aciklama: z
    .string()
    .trim()
    .min(20, "Açıklama en az 20 karakter olmalı.")
    .max(4000, "Açıklama en fazla 4000 karakter olabilir."),
  takimBuyuklugu: aralik(2, 10),
  sureHafta: istegeBagliSayi(1, 52),
});

export const basvuruSemasi = z.object({
  mesaj: z
    .string()
    .trim()
    .min(10, "Mesajın en az 10 karakter olmalı.")
    .max(1000, "Mesajın en fazla 1000 karakter olabilir."),
});

export const BASVURU_DURUMU = {
  pending: "Beklemede",
  accepted: "Kabul edildi",
  rejected: "Reddedildi",
  withdrawn: "Geri çekildi",
};
