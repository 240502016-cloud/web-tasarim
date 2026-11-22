// 9. hafta: arayüz geliştirilirken kullanılan örnek veri.
// Alan adları ileride Supabase'den gelecek veriyle aynı biçimde tutuldu.

export const ornekProjeler = [
  {
    id: "p1",
    baslik: "Kampüs Etkinlik Uygulaması",
    aciklama: "Kulüp ve etkinlik duyurularını tek yerde toplayan mobil uygulama.",
    durum: "open",
    takimBuyuklugu: 4,
    uyeSayisi: 2,
    sureHafta: 10,
    olusturulma: "2026-11-05T10:00:00Z",
    beceriler: [{ id: 5, ad: "Flutter" }, { id: 6, ad: "Firebase" }],
    sahip: { id: "u1", adSoyad: "Proje Lideri", bolum: "Bilgisayar Mühendisliği" },
    mentor: null,
  },
  {
    id: "p2",
    baslik: "Kütüphane Doluluk Takibi",
    aciklama: "Kütüphane salonlarının anlık doluluk oranını gösteren web sitesi.",
    durum: "open",
    takimBuyuklugu: 3,
    uyeSayisi: 1,
    sureHafta: 8,
    olusturulma: "2026-11-03T10:00:00Z",
    beceriler: [{ id: 1, ad: "HTML / CSS" }, { id: 2, ad: "JavaScript" }],
    sahip: { id: "u2", adSoyad: "Proje Lideri", bolum: "Yazılım Mühendisliği" },
    mentor: null,
  },
  {
    id: "p3",
    baslik: "Yemekhane Menü Uygulaması",
    aciklama: "Günlük menüyü ve kalori bilgisini gösteren, oylama yapılabilen uygulama.",
    durum: "in_progress",
    takimBuyuklugu: 4,
    uyeSayisi: 4,
    sureHafta: 12,
    olusturulma: "2026-10-20T10:00:00Z",
    beceriler: [{ id: 3, ad: "React" }, { id: 2, ad: "JavaScript" }],
    sahip: { id: "u3", adSoyad: "Proje Lideri", bolum: "Bilgisayar Mühendisliği" },
    mentor: { id: "m1", adSoyad: "Mentör", unvan: "Yazılım Mühendisi" },
  },
];

export const ornekMentorler = [
  {
    id: "m1",
    adSoyad: "Mentör",
    unvan: "Yazılım Mühendisi",
    uzmanlik: "Web Geliştirme",
    deneyimYili: 6,
    kapasite: 2,
    aktifProje: 1,
    hakkinda: "Öğrencilere proje planlama ve kod inceleme konusunda destek oluyorum.",
    beceriler: [{ id: 3, ad: "React", seviye: 5 }, { id: 2, ad: "JavaScript", seviye: 5 }],
  },
  {
    id: "m2",
    adSoyad: "Mentör",
    unvan: "Veri Bilimci",
    uzmanlik: "Veri Bilimi / Yapay Zeka",
    deneyimYili: 4,
    kapasite: 1,
    aktifProje: 0,
    hakkinda: "Makine öğrenmesi projelerinde veri hazırlama ve model seçimi konusunda yardımcı olurum.",
    beceriler: [{ id: 4, ad: "Python", seviye: 5 }, { id: 7, ad: "Yapay Zeka", seviye: 4 }],
  },
];
