import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { basvuruDurumuDegistir, projeBasvurulari } from "../../api/basvurular";
import { BASVURU_DURUMU } from "../../lib/dogrulama";
import { basHarfler } from "../../lib/metin";
import { useIslem } from "../../lib/useIslem";
import { Yukleniyor } from "../Durumlar";

// Proje liderinin başvuruları değerlendirdiği bölüm
export default function BasvuruListesi({ proje }) {
  const { calistir, calisiyor } = useIslem();
  const basvurular = useQuery({
    queryKey: ["proje-basvurulari", proje.id],
    queryFn: () => projeBasvurulari(proje.id),
  });

  if (basvurular.isPending) return <Yukleniyor />;

  const bekleyenler = basvurular.data.filter((b) => b.durum === "pending");
  const sonuclananlar = basvurular.data.filter((b) => b.durum !== "pending");
  const gerekenler = new Set(proje.beceriler.map((b) => b.id));
  const dolu = proje.uyeSayisi >= proje.takimBuyuklugu;

  return (
    <section className="bolum" aria-labelledby="basvurular-baslik">
      <h2 id="basvurular-baslik">Başvurular ({bekleyenler.length} bekleyen)</h2>
      {bekleyenler.length === 0 && <p className="soluk">Bekleyen başvuru yok.</p>}

      <ul className="basvuru-listesi">
        {bekleyenler.map((b) => {
          const uyan = b.ogrenci.beceriler.filter((x) => gerekenler.has(x.id));
          return (
            <li key={b.id} className="basvuru">
              <div className="basvuru-ust">
                <span className="avatar" aria-hidden="true">
                  {basHarfler(b.ogrenci.adSoyad)}
                </span>
                <div>
                  <strong>{b.ogrenci.adSoyad}</strong>
                  <small className="soluk">
                    {b.ogrenci.bolum}
                    {b.ogrenci.sinif && `, ${b.ogrenci.sinif}. sınıf`} &middot;{" "}
                    {format(new Date(b.olusturulma), "d MMM HH:mm", { locale: tr })}
                  </small>
                </div>
              </div>
              <p className="metin-satirlari">{b.mesaj}</p>
              <p className="soluk kucuk-yazi">
                Gerekli becerilerden {uyan.length} / {gerekenler.size} tanesine sahip
              </p>
              <div className="etiketler">
                {b.ogrenci.beceriler.map((x) => (
                  <span key={x.id} className={gerekenler.has(x.id) ? "etiket-uyan" : undefined}>
                    {x.ad} &middot; {x.seviye}/5
                  </span>
                ))}
              </div>
              <div className="buton-satiri">
                <button
                  type="button"
                  className="buton buton-kucuk"
                  disabled={calisiyor || dolu}
                  title={dolu ? "Takım dolu" : undefined}
                  onClick={() =>
                    calistir(() => basvuruDurumuDegistir(b.id, "accepted"), `${b.ogrenci.adSoyad} takıma eklendi.`)
                  }
                >
                  Kabul Et
                </button>
                <button
                  type="button"
                  className="buton buton-kucuk buton-cizgili"
                  disabled={calisiyor}
                  onClick={() => calistir(() => basvuruDurumuDegistir(b.id, "rejected"), "Başvuru reddedildi.")}
                >
                  Reddet
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {sonuclananlar.length > 0 && (
        <details className="ust-bosluk">
          <summary>Sonuçlanan başvurular ({sonuclananlar.length})</summary>
          <ul className="sade-liste">
            {sonuclananlar.map((b) => (
              <li key={b.id}>
                {b.ogrenci.adSoyad} &middot; {BASVURU_DURUMU[b.durum]}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
