import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { mentorGetir } from "../api/mentorler";
import { HataMesaji, Yukleniyor } from "../bilesenler/Durumlar";
import { basHarfler } from "../lib/metin";

export default function MentorProfil() {
  const { id } = useParams();
  const sorgu = useQuery({ queryKey: ["mentor", id], queryFn: () => mentorGetir(id) });

  if (sorgu.isPending) return <div className="kapsayici"><Yukleniyor /></div>;
  if (sorgu.isError) return <div className="kapsayici"><HataMesaji hata={sorgu.error} /></div>;

  const mentor = sorgu.data;
  const bosYer = Math.max(0, mentor.kapasite - mentor.aktifProje);

  return (
    <div className="kapsayici">
      <nav className="konum" aria-label="Bulunduğunuz yer">
        <Link to="/mentorler">Mentörler</Link>
        <span aria-hidden="true">/</span>
        <span>{mentor.adSoyad}</span>
      </nav>

      <div className="detay-duzeni">
        <article className="detay-icerik">
          <div className="profil-ust">
            <span className="avatar avatar-buyuk" aria-hidden="true">
              {basHarfler(mentor.adSoyad)}
            </span>
            <div>
              <h1>{mentor.adSoyad}</h1>
              <p className="alan">{mentor.uzmanlik}</p>
              <p className="soluk">
                {mentor.unvan} &middot; {mentor.deneyimYili} yıl deneyim
              </p>
            </div>
          </div>

          {mentor.hakkinda && (
            <section className="bolum">
              <h2>Hakkında</h2>
              <p className="metin-satirlari">{mentor.hakkinda}</p>
            </section>
          )}

          <section className="bolum">
            <h2>Uzmanlık Alanları</h2>
            <div className="etiketler">
              {mentor.beceriler.map((b) => (
                <span key={b.id}>
                  {b.ad} &middot; {b.seviye}/5
                </span>
              ))}
            </div>
          </section>
        </article>

        <aside className="panel yan-kutu">
          <h2>Mentörlük Kapasitesi</h2>
          <progress value={mentor.aktifProje} max={mentor.kapasite}>
            {mentor.aktifProje} / {mentor.kapasite}
          </progress>
          <p className="soluk">
            <strong>
              {mentor.aktifProje} / {mentor.kapasite}
            </strong>{" "}
            proje &middot; {bosYer > 0 ? `${bosYer} yer boş` : "kapasite dolu"}
          </p>
        </aside>
      </div>
    </div>
  );
}
