import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { projeGetir } from "../api/projeler";
import { useOturum } from "../baglam/OturumBaglami";
import { HataMesaji, Yukleniyor } from "../bilesenler/Durumlar";
import { DURUM_SINIFI, DURUM_YAZISI, basHarfler } from "../lib/metin";

export default function ProjeDetay() {
  const { id } = useParams();
  const { kullanici } = useOturum();
  const sorgu = useQuery({ queryKey: ["proje", id], queryFn: () => projeGetir(id) });

  if (sorgu.isPending) return <div className="kapsayici"><Yukleniyor /></div>;
  if (sorgu.isError) return <div className="kapsayici"><HataMesaji hata={sorgu.error} /></div>;

  const proje = sorgu.data;
  const bosYer = Math.max(0, proje.takimBuyuklugu - proje.uyeSayisi);

  return (
    <div className="kapsayici">
      <nav className="konum" aria-label="Bulunduğunuz yer">
        <Link to="/projeler">Projeler</Link>
        <span aria-hidden="true">/</span>
        <span>{proje.baslik}</span>
      </nav>

      <div className="detay-duzeni">
        <article className="detay-icerik">
          <span className={`durum ${DURUM_SINIFI[proje.durum]}`}>{DURUM_YAZISI[proje.durum]}</span>
          <h1>{proje.baslik}</h1>
          <p className="ozet metin-satirlari">{proje.aciklama}</p>

          <section className="bolum">
            <h2>Gerekli Beceriler</h2>
            <div className="etiketler">
              {proje.beceriler.map((b) => (
                <span key={b.id}>{b.ad}</span>
              ))}
            </div>
          </section>

          <section className="bolum">
            <h2>Proje Bilgileri</h2>
            <dl className="bilgi-listesi">
              {proje.sureHafta && (
                <>
                  <dt>Tahmini süre</dt>
                  <dd>{proje.sureHafta} hafta</dd>
                </>
              )}
              <dt>Oluşturulma</dt>
              <dd>{format(new Date(proje.olusturulma), "d MMMM yyyy", { locale: tr })}</dd>
              {proje.sahip && (
                <>
                  <dt>Proje lideri</dt>
                  <dd>{proje.sahip.adSoyad}</dd>
                </>
              )}
            </dl>
          </section>

          <section className="bolum">
            <h2>Takım</h2>
            <ul className="kisi-listesi">
              {proje.uyeler.map((u) => (
                <li key={u.id}>
                  <span className="avatar" aria-hidden="true">
                    {u.adSoyad ? basHarfler(u.adSoyad) : "?"}
                  </span>
                  <div>
                    <strong>{u.adSoyad ?? "Takım üyesi"}</strong>
                    <small>
                      {u.rol === "leader" ? "Proje lideri" : "Üye"}
                      {u.bolum && ` · ${u.bolum}`}
                      {u.sinif && `, ${u.sinif}. sınıf`}
                    </small>
                  </div>
                </li>
              ))}
              {bosYer > 0 && (
                <li className="bos-yer">
                  <span className="avatar" aria-hidden="true">
                    +
                  </span>
                  <div>
                    <strong>Boş yer</strong>
                    <small>{bosYer} kişi daha aranıyor</small>
                  </div>
                </li>
              )}
            </ul>
          </section>

          <section className="bolum">
            <h2>Mentör</h2>
            {proje.mentor ? (
              <ul className="kisi-listesi">
                <li>
                  <span className="avatar" aria-hidden="true">
                    {basHarfler(proje.mentor.adSoyad)}
                  </span>
                  <div>
                    <strong>
                      <Link to={`/mentorler/${proje.mentor.id}`}>{proje.mentor.adSoyad}</Link>
                    </strong>
                    <small>{proje.mentor.unvan}</small>
                  </div>
                </li>
              </ul>
            ) : (
              <p className="soluk">Bu projenin henüz mentörü yok.</p>
            )}
          </section>
        </article>

        <aside className="panel yan-kutu">
          <h2>Takım Doluluğu</h2>
          <progress value={proje.uyeSayisi} max={proje.takimBuyuklugu}>
            {proje.uyeSayisi} / {proje.takimBuyuklugu}
          </progress>
          <p className="soluk">
            <strong>
              {proje.uyeSayisi} / {proje.takimBuyuklugu}
            </strong>{" "}
            kişi &middot; {bosYer > 0 ? `${bosYer} yer boş` : "takım dolu"}
          </p>
          {!kullanici && (
            <p className="bilgi-kutusu">
              Başvurmak için{" "}
              <Link to="/giris" state={{ geri: `/projeler/${proje.id}` }}>
                giriş yap
              </Link>
              .
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
