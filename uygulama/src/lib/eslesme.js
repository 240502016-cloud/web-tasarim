// Eşleştirme puanını kullanıcıya açıklayan metinler (FR-15).
// Puanın kendisi veritabanında hesaplanır (supabase/migrations/..._hafta12_eslestirme.sql).

export function eslesmeAciklamasi({ uyanlar, gerekliSayisi }, ozne = "sahipsin") {
  return `${gerekliSayisi} gerekli beceriden ${uyanlar.length} tanesine ${ozne}`;
}

// Puana göre rozet rengi
export function puanSinifi(puan) {
  if (puan >= 75) return "puan-yuksek";
  if (puan >= 50) return "puan-orta";
  return "puan-dusuk";
}
