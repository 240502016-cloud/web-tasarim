import { describe, expect, test } from "vitest";
import { eduTrMi, kayitSemasi, projeSemasi } from "./dogrulama";
import { projeleriFiltrele } from "./filtre";
import { basHarfler, kucukHarf } from "./metin";
import { eslesmeAciklamasi, puanSinifi } from "./eslesme";
import { bildirimBaglantisi, bildirimMetni } from "./bildirimMetni";

describe("e-posta ve kayıt doğrulama", () => {
  test(".edu.tr adresleri tanınır", () => {
    expect(eduTrMi("ayse@ogr.kocaelisaglik.edu.tr")).toBe(true);
    expect(eduTrMi("ali@itu.edu.tr")).toBe(true);
    expect(eduTrMi("ali@gmail.com")).toBe(false);
    expect(eduTrMi("ali@edu.tr.com")).toBe(false);
  });

  const ogrenci = {
    rol: "student",
    adSoyad: "Ayşe Yılmaz",
    eposta: "ayse@ogr.x.edu.tr",
    sifre: "guclu123",
    kvkk: true,
    bolum: "Bilgisayar Mühendisliği",
    sinif: "3",
  };

  test("geçerli öğrenci kaydı kabul edilir", () => {
    expect(kayitSemasi.safeParse(ogrenci).success).toBe(true);
  });

  test("öğrenci gmail ile, zayıf şifreyle ya da onaysız kayıt olamaz", () => {
    const sonuc = kayitSemasi.safeParse({
      ...ogrenci,
      eposta: "a@gmail.com",
      sifre: "abcdefgh",
      kvkk: false,
    });
    const alanlar = sonuc.error.issues.map((h) => h.path[0]).sort();
    expect(alanlar).toEqual(["eposta", "kvkk", "sifre"]);
  });

  test("mentör .edu.tr olmadan kayıt olabilir ama deneyim ve kapasite aralıkta olmalı", () => {
    const mentor = {
      rol: "mentor",
      adSoyad: "Deniz Kaya",
      eposta: "deniz@firma.com",
      sifre: "guclu123",
      kvkk: true,
      unvan: "Yazılım Mühendisi",
      uzmanlik: "Web Geliştirme",
      deneyimYili: 5,
      kapasite: 2,
    };
    expect(kayitSemasi.safeParse(mentor).success).toBe(true);
    expect(kayitSemasi.safeParse({ ...mentor, kapasite: 9 }).success).toBe(false);
    expect(kayitSemasi.safeParse({ ...mentor, deneyimYili: Number.NaN }).success).toBe(false);
  });

  test("proje formu: süre boş bırakılabilir, takım 2-10 kişi olmalı", () => {
    const proje = {
      baslik: "Kampüs Uygulaması",
      aciklama: "Etkinlikleri tek yerde toplayan uygulama.",
      takimBuyuklugu: 4,
      sureHafta: Number.NaN,
    };
    const sonuc = projeSemasi.safeParse(proje);
    expect(sonuc.success).toBe(true);
    expect(sonuc.data.sureHafta).toBeUndefined();
    expect(projeSemasi.safeParse({ ...proje, takimBuyuklugu: 1 }).success).toBe(false);
  });
});

describe("proje listesi filtreleme (6. haftadan taşınan mantık)", () => {
  const projeler = [
    {
      id: 1,
      baslik: "Staj İlanları Panosu",
      aciklama: "İlanlar",
      durum: "open",
      uyeSayisi: 1,
      takimBuyuklugu: 4,
      olusturulma: "2026-11-07",
      beceriler: [{ ad: "React" }],
    },
    {
      id: 2,
      baslik: "Kayıp Eşya",
      aciklama: "Bulunan eşyalar için ilan sistemi",
      durum: "in_progress",
      uyeSayisi: 3,
      takimBuyuklugu: 3,
      olusturulma: "2026-10-15",
      beceriler: [{ ad: "Flutter" }],
    },
    {
      id: 3,
      baslik: "Akran Destek",
      aciklama: "Ders anlatımı",
      durum: "open",
      uyeSayisi: 2,
      takimBuyuklugu: 5,
      olusturulma: "2026-10-22",
      beceriler: [{ ad: "Python" }],
    },
    {
      id: 4,
      baslik: "İptal Edilen",
      aciklama: "Görünmemeli",
      durum: "cancelled",
      uyeSayisi: 1,
      takimBuyuklugu: 2,
      olusturulma: "2026-11-09",
      beceriler: [],
    },
  ];
  const varsayilan = {
    aranan: "",
    beceriler: [],
    durum: "tumu",
    sadeceBosYer: false,
    siralama: "yeni",
  };
  const idler = (ayar) => projeleriFiltrele(projeler, { ...varsayilan, ...ayar }).map((p) => p.id);

  test("iptal edilen projeler listelenmez, en yeni önce gelir", () => {
    expect(idler({})).toEqual([1, 3, 2]);
  });

  test("Türkçe büyük/küçük harf duyarsız arama (İLAN -> ilan)", () => {
    expect(idler({ aranan: "İLAN" })).toEqual([1, 2]);
  });

  test("beceri, durum ve boş yer filtreleri", () => {
    expect(idler({ beceriler: ["Flutter", "Python"] })).toEqual([3, 2]);
    expect(idler({ durum: "in_progress" })).toEqual([2]);
    expect(idler({ sadeceBosYer: true })).toEqual([1, 3]);
  });

  test("boş yere ve ada göre sıralama", () => {
    expect(idler({ siralama: "bos-yer" })).toEqual([1, 3, 2]);
    expect(idler({ siralama: "ad" })).toEqual([3, 2, 1]);
  });
});

describe("metin yardımcıları", () => {
  test("baş harfler ve Türkçe küçük harf", () => {
    expect(basHarfler("ayşe nur yılmaz")).toBe("AN");
    expect(basHarfler("ismail")).toBe("İ");
    expect(basHarfler("")).toBe("?");
    expect(kucukHarf("IŞIK İzmir")).toBe("ışık izmir");
  });

  test("eşleştirme açıklaması ve puan rengi", () => {
    expect(eslesmeAciklamasi({ uyanlar: ["A", "B", "C"], gerekliSayisi: 4 })).toBe(
      "4 gerekli beceriden 3 tanesine sahipsin",
    );
    expect(puanSinifi(75)).toBe("puan-yuksek");
    expect(puanSinifi(59)).toBe("puan-orta");
    expect(puanSinifi(20)).toBe("puan-dusuk");
  });

  test("bildirim metinleri ve bağlantıları", () => {
    const veri = { project_id: "p1", project_title: "Kampüs", name: "Ali" };
    expect(bildirimMetni("new_application", veri)).toBe('Ali, "Kampüs" projesine başvurdu.');
    expect(bildirimMetni("bilinmeyen")).toBe("Yeni bir bildirimin var.");
    expect(bildirimBaglantisi("application_accepted", veri)).toBe("/projeler/p1");
    expect(bildirimBaglantisi("mentor_request", veri)).toBe("/panelim");
  });
});
