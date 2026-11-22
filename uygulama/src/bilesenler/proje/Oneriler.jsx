import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { mentorOnerileri, ogrenciOnerileri } from "../../api/eslesme";
import { basHarfler } from "../../lib/metin";
import PuanRozeti from "../PuanRozeti";
import { Yukleniyor } from "../Durumlar";

// Proje liderine: projeye uygun ve kapasitesi dolmamış mentörler (FR-14)
export function MentorOnerileri({ proje, eylem }) {
  const oneriler = useQuery({
    queryKey: ["mentor-onerileri", proje.id],
    queryFn: () => mentorOnerileri(proje.id),
  });

  return (
    <section className="bolum" aria-labelledby="mentor-onerileri">
      <h2 id="mentor-onerileri">Projene Uygun Mentörler</h2>
      {oneriler.isPending && <Yukleniyor />}
      {oneriler.data?.length === 0 && (
        <p className="soluk">
          Şu an projenin becerilerine uyan ve kapasitesi boş bir mentör yok.{" "}
          <Link to="/mentorler" className="icerik-linki">
            Tüm mentörlere göz at
          </Link>
          .
        </p>
      )}
      <ul className="oneri-listesi">
        {oneriler.data?.map((m) => (
          <li key={m.id}>
            <span className="avatar" aria-hidden="true">
              {basHarfler(m.adSoyad)}
            </span>
            <div className="esnek-buyu">
              <strong>
                <Link to={`/mentorler/${m.id}`}>{m.adSoyad}</Link>
              </strong>
              <small className="soluk">
                {m.unvan} &middot; {m.uzmanlik} &middot; Kapasite {m.aktifProje}/{m.kapasite}
              </small>
              <PuanRozeti oneri={m} ozne="sahip" />
            </div>
            {eylem?.(m)}
          </li>
        ))}
      </ul>
    </section>
  );
}

// Proje liderine: projenin aradığı becerilere sahip öğrenciler (FR-13)
export function OgrenciOnerileri({ proje }) {
  const oneriler = useQuery({
    queryKey: ["ogrenci-onerileri", proje.id],
    queryFn: () => ogrenciOnerileri(proje.id),
  });

  return (
    <section className="bolum" aria-labelledby="ogrenci-onerileri">
      <h2 id="ogrenci-onerileri">Projene Uygun Öğrenciler</h2>
      <p className="soluk kucuk-yazi">
        Bu öğrenciler projenin aradığı becerilere sahip. Projeni paylaşarak başvurmalarını
        isteyebilirsin.
      </p>
      {oneriler.isPending && <Yukleniyor />}
      {oneriler.data?.length === 0 && <p className="soluk">Şu an önerilecek öğrenci yok.</p>}
      <ul className="oneri-listesi">
        {oneriler.data?.map((o) => (
          <li key={o.id}>
            <span className="avatar" aria-hidden="true">
              {basHarfler(o.adSoyad)}
            </span>
            <div className="esnek-buyu">
              <strong>{o.adSoyad}</strong>
              <small className="soluk">
                {o.bolum}
                {o.sinif && `, ${o.sinif}. sınıf`}
              </small>
              <PuanRozeti oneri={o} ozne="sahip" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
