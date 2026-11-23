import { describe, expect, test } from "vitest";
import {
  azamiSinif,
  girisSemasi,
  kayitSemasi,
  kostuEpostasiMi,
  ogrenciEpostasiHatasi,
  personelEpostasiMi,
  projeSemasi,
} from "./dogrulama";
import { projeleriFiltrele } from "./filtre";
import { basHarfler, kucukHarf } from "./metin";
import { eslesmeAciklamasi, puanSinifi } from "./eslesme";
import { bildirimBaglantisi, bildirimMetni } from "./bildirimMetni";

describe("e-posta ve kayıt doğrulama", () => {
  test("yalnız KOSTÜ adresleri tanınır; personel adresi öğrenci numarası olamaz", () => {
    expect(kostuEpostasiMi("240502016@kocaelisaglik.edu.tr")).toBe(true);
    expect(kostuEpostasiMi("ali.veli@kocaelisaglik.edu.tr")).toBe(true);
    expect(kostuEpostasiMi("ali@itu.edu.tr")).toBe(false);
    expect(kostuEpostasiMi("ali@kocaelisaglik.edu.tr.com")).toBe(false);
    expect(personelEpostasiMi("ali.veli@kocaelisaglik.edu.tr")).toBe(true);
    expect(personelEpostasiMi("240502016@kocaelisaglik.edu.tr")).toBe(false);
  });

  test("öğrenci numarası: 9 hane, geçerli giriş yılı, sıfır olmayan kodlar", () => {
    const simdi = new Date(2026, 10, 23);
    const hata = (e) => ogrenciEpostasiHatasi(e, simdi);
    expect(hata("240502016@kocaelisaglik.edu.tr")).toBeNull();
    expect(hata("99999999@kocaelisaglik.edu.tr")).toMatch(/9 haneli/);
    expect(hata("999999999@kocaelisaglik.edu.tr")).toMatch(/giriş yılı/);
    expect(hata("270502001@kocaelisaglik.edu.tr")).toMatch(/giriş yılı/);
    expect(hata("240502000@kocaelisaglik.edu.tr")).toMatch(/geçerli bir KOSTÜ/);
    expect(hata("ali@gmail.com")).toMatch(/KOSTÜ/);
  });

  test("en yüksek sınıf giriş yılına ve Eylül'de başlayan eğitim yılına göre hesaplanır", () => {
    expect(azamiSinif("240502016", new Date(2026, 10, 23))).toBe(3);
    expect(azamiSinif("240502016", new Date(2026, 7, 31))).toBe(2);
    expect(azamiSinif("260502016", new Date(2026, 7, 1))).toBe(1);
  });

  const ogrenci = {
    rol: "student",
    adSoyad: "Ayşe Yılmaz",
    eposta: "240502016@kocaelisaglik.edu.tr",
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

  test("mentör KOSTÜ personel adresiyle kayıt olur; deneyim ve kapasite aralıkta olmalı", () => {
    const mentor = {
      rol: "mentor",
      adSoyad: "Deniz Kaya",
      eposta: "deniz.kaya@kocaelisaglik.edu.tr",
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
    expect(kayitSemasi.safeParse({ ...mentor, eposta: "deniz@firma.com" }).success).toBe(false);
    expect(
      kayitSemasi.safeParse({ ...mentor, eposta: "240502016@kocaelisaglik.edu.tr" }).success,
    ).toBe(false);
  });

  test("sınıf, numaradaki giriş yılına göre imkânsızsa sınıf alanında hata verilir", () => {
    const buYil = String(new Date().getFullYear() % 100).padStart(2, "0");
    const sonuc = kayitSemasi.safeParse({
      ...ogrenci,
      eposta: `${buYil}0502001@kocaelisaglik.edu.tr`,
      sinif: "4",
    });
    expect(sonuc.success).toBe(false);
    expect(sonuc.error.issues[0].path).toEqual(["sinif"]);
  });

  test("giriş yalnız KOSTÜ adresiyle yapılır", () => {
    const giris = (eposta) => girisSemasi.safeParse({ eposta, sifre: "x" }).success;
    expect(giris("240502016@kocaelisaglik.edu.tr")).toBe(true);
    expect(giris("ali.veli@kocaelisaglik.edu.tr")).toBe(true);
    expect(giris("ali@gmail.com")).toBe(false);
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
