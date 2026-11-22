import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { projeleriGetir } from "../api/projeler";
import ProjeKarti from "../bilesenler/ProjeKarti";
import { BosDurum, HataMesaji, Yukleniyor } from "../bilesenler/Durumlar";
import { kucukHarf } from "../lib/metin";

const SAYFA_BOYUTU = 12;

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

export default function Projeler() {
  const [parametreler] = useSearchParams();
  const projeler = useQuery({ queryKey: ["projeler"], queryFn: projeleriGetir });

  const [aranan, setAranan] = useState(parametreler.get("ara") ?? "");
  const [beceriler, setBeceriler] = useState([]);
  const [durum, setDurum] = useState("tumu");
  const [sadeceBosYer, setSadeceBosYer] = useState(false);
  const [siralama, setSiralama] = useState("yeni");
  const [sayfa, setSayfa] = useState(1);

  const tumBeceriler = useMemo(() => {
    const adlar = new Set((projeler.data ?? []).flatMap((p) => p.beceriler.map((b) => b.ad)));
    return [...adlar].sort((a, b) => a.localeCompare(b, "tr"));
  }, [projeler.data]);

  const filtrelenmis = useMemo(
    () =>
      projeleriFiltrele(projeler.data ?? [], {
        aranan,
        beceriler,
        durum,
        sadeceBosYer,
        siralama,
      }),
    [projeler.data, aranan, beceriler, durum, sadeceBosYer, siralama],
  );

  const sayfaSayisi = Math.max(1, Math.ceil(filtrelenmis.length / SAYFA_BOYUTU));
  const gecerliSayfa = Math.min(sayfa, sayfaSayisi);
  const gosterilen = filtrelenmis.slice((gecerliSayfa - 1) * SAYFA_BOYUTU, gecerliSayfa * SAYFA_BOYUTU);

  // Her filtre değişikliğinde ilk sayfaya dön
  function degistir(ayarla) {
    return (deger) => {
      ayarla(deger);
      setSayfa(1);
    };
  }

  function beceriDegistir(ad, secili) {
    degistir(setBeceriler)(secili ? [...beceriler, ad] : beceriler.filter((b) => b !== ad));
  }

  function temizle() {
    setAranan("");
    setBeceriler([]);
    setDurum("tumu");
    setSadeceBosYer(false);
    setSiralama("yeni");
    setSayfa(1);
  }

  return (
    <div className="kapsayici">
      <div className="sayfa-baslik">
        <h1>Projeler</h1>
        <p>Becerilerine uygun bir projeye katıl ya da kendi projeni oluştur.</p>
      </div>

      <div className="liste-duzeni">
        <aside className="panel filtre-paneli">
          <h2>Filtrele</h2>

          <label className="filtre-etiket" htmlFor="arama">
            Ara
          </label>
          <input
            type="search"
            id="arama"
            value={aranan}
            onChange={(e) => degistir(setAranan)(e.target.value)}
            placeholder="Proje adı, açıklama veya beceri..."
          />

          <fieldset>
            <legend>Beceriler</legend>
            {tumBeceriler.map((ad) => (
              <label key={ad}>
                <input
                  type="checkbox"
                  checked={beceriler.includes(ad)}
                  onChange={(e) => beceriDegistir(ad, e.target.checked)}
                />{" "}
                {ad}
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend>Durum</legend>
            {[
              ["tumu", "Tümü"],
              ["open", "Açık"],
              ["in_progress", "Devam ediyor"],
              ["completed", "Tamamlandı"],
            ].map(([deger, yazi]) => (
              <label key={deger}>
                <input
                  type="radio"
                  name="durum"
                  checked={durum === deger}
                  onChange={() => degistir(setDurum)(deger)}
                />{" "}
                {yazi}
              </label>
            ))}
          </fieldset>

          <label className="tek-secim">
            <input
              type="checkbox"
              checked={sadeceBosYer}
              onChange={(e) => degistir(setSadeceBosYer)(e.target.checked)}
            />{" "}
            Sadece boş yeri olanlar
          </label>

          <button type="button" className="buton buton-cizgili buton-tam" onClick={temizle}>
            Filtreleri Temizle
          </button>
        </aside>

        <section aria-labelledby="sonuc-sayisi">
          <div className="liste-ust">
            <span id="sonuc-sayisi" aria-live="polite">
              {projeler.isSuccess && `${filtrelenmis.length} proje bulundu`}
            </span>
            <select
              aria-label="Sıralama"
              value={siralama}
              onChange={(e) => setSiralama(e.target.value)}
            >
              <option value="yeni">En yeni</option>
              <option value="bos-yer">Boş yeri en çok olan</option>
              <option value="ad">Ada göre (A–Z)</option>
            </select>
          </div>

          {projeler.isPending && <Yukleniyor />}
          {projeler.isError && <HataMesaji hata={projeler.error} />}
          {projeler.isSuccess && gosterilen.length === 0 && (
            <BosDurum>Aradığın kriterlere uygun proje bulunamadı. Filtreleri değiştirmeyi dene.</BosDurum>
          )}

          <div className="izgara">
            {gosterilen.map((p) => (
              <ProjeKarti key={p.id} proje={p} />
            ))}
          </div>

          {sayfaSayisi > 1 && (
            <nav className="sayfalama" aria-label="Sayfalar">
              {Array.from({ length: sayfaSayisi }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={n === gecerliSayfa ? "aktif" : undefined}
                  aria-current={n === gecerliSayfa ? "page" : undefined}
                  onClick={() => setSayfa(n)}
                >
                  {n}
                </button>
              ))}
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
