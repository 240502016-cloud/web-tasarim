import { Link } from "react-router-dom";
import { basHarfler } from "../lib/metin";

export default function MentorKarti({ mentor }) {
  const dolu = mentor.aktifProje >= mentor.kapasite;

  return (
    <article className="kart mentor-kart">
      <span className="avatar" aria-hidden="true">
        {basHarfler(mentor.adSoyad)}
      </span>
      <h3>{mentor.adSoyad}</h3>
      {mentor.unvan && <p className="soluk">{mentor.unvan}</p>}
      <p className="alan">{mentor.uzmanlik}</p>
      <p>{mentor.deneyimYili} yıl deneyim</p>
      <div className="etiketler">
        {mentor.beceriler.map((b) => (
          <span key={b.id}>{b.ad}</span>
        ))}
      </div>
      <div className="kart-alt">
        {dolu ? (
          <span className="takim-dolu">Kapasite dolu</span>
        ) : (
          <span>
            Kapasite: {mentor.aktifProje} / {mentor.kapasite}
          </span>
        )}
        <Link to={`/mentorler/${mentor.id}`} className="buton buton-kucuk">
          Profili Gör
        </Link>
      </div>
    </article>
  );
}
