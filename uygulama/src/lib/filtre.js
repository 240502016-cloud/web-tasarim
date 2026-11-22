import { kucukHarf } from "./metin";

// 6. haftadaki filtreleme mantığı (hafta-06/app.js) React'e taşındı
export function projeleriFiltrele(projeler, { aranan, beceriler, durum, sadeceBosYer, siralama }) {
  const metin = kucukHarf(aranan.trim());

  const sonuc = projeler.filter((p) => {
    if (p.durum === "cancelled") return false;
    const metinUyuyor =
      !metin ||
      kucukHarf(p.baslik).includes(metin) ||
      kucukHarf(p.aciklama).includes(metin) ||
      p.beceriler.some((b) => kucukHarf(b.ad).includes(metin));
    const beceriUyuyor =
      beceriler.length === 0 || p.beceriler.some((b) => beceriler.includes(b.ad));
    const durumUyuyor = durum === "tumu" || p.durum === durum;
    const bosYerUyuyor = !sadeceBosYer || p.uyeSayisi < p.takimBuyuklugu;
    return metinUyuyor && beceriUyuyor && durumUyuyor && bosYerUyuyor;
  });

  if (siralama === "bos-yer") {
    sonuc.sort((a, b) => b.takimBuyuklugu - b.uyeSayisi - (a.takimBuyuklugu - a.uyeSayisi));
  } else if (siralama === "ad") {
    sonuc.sort((a, b) => a.baslik.localeCompare(b.baslik, "tr"));
  } else {
    sonuc.sort((a, b) => b.olusturulma.localeCompare(a.olusturulma));
  }
  return sonuc;
}
