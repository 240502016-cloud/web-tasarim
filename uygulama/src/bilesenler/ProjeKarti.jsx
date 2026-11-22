import { Link } from "react-router-dom";
import { DURUM_SINIFI, DURUM_YAZISI } from "../lib/metin";

export default function ProjeKarti({ proje, ek }) {
  const dolu = proje.uyeSayisi >= proje.takimBuyuklugu;

  return (
    <article className="kart">
      <span className={`durum ${DURUM_SINIFI[proje.durum]}`}>{DURUM_YAZISI[proje.durum]}</span>
      <h3>{proje.baslik}</h3>
      <p>{proje.aciklama}</p>
      {ek}
      <div className="etiketler">
        {proje.beceriler.map((b) => (
          <span key={b.id}>{b.ad}</span>
        ))}
      </div>
      <div className="kart-alt">
        <span className={dolu ? "takim-dolu" : undefined}>
          Takım: {proje.uyeSayisi} / {proje.takimBuyuklugu}
          {dolu && " (dolu)"}
        </span>
        <Link to={`/projeler/${proje.id}`} className="buton buton-kucuk">
          İncele
        </Link>
      </div>
    </article>
  );
}
