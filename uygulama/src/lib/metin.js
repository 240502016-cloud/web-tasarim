// Arayüzde kullanılan küçük metin yardımcıları

export const DURUM_YAZISI = {
  open: "Açık",
  in_progress: "Devam ediyor",
  completed: "Tamamlandı",
  cancelled: "İptal edildi",
};

export const DURUM_SINIFI = {
  open: "durum-acik",
  in_progress: "durum-devam",
  completed: "durum-bitti",
  cancelled: "durum-bitti",
};

// Türkçe karakterlerle doğru küçük harf ("İ" -> "i", "I" -> "ı")
export function kucukHarf(metin = "") {
  return metin.toLocaleLowerCase("tr");
}

// "Ayşe Yılmaz" -> "AY"
export function basHarfler(adSoyad = "") {
  return (
    adSoyad
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((kelime) => kelime[0].toLocaleUpperCase("tr"))
      .join("") || "?"
  );
}
