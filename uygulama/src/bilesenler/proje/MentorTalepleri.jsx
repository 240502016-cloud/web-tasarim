import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { mentoruCikar, projeTalepleri, talebiGeriAl } from "../../api/mentorluk";
import { useIslem } from "../../lib/useIslem";

const TALEP_DURUMU = {
  pending: "Yanıt bekleniyor",
  accepted: "Kabul edildi",
  rejected: "Kabul edilmedi",
  cancelled: "Geri alındı",
};

// Proje liderinin gönderdiği mentörlük talepleri ve mentör yönetimi
export default function MentorTalepleri({ proje }) {
  const { calistir, calisiyor } = useIslem();
  const talepler = useQuery({
    queryKey: ["proje-talepleri", proje.id],
    queryFn: () => projeTalepleri(proje.id),
  });

  async function cikar() {
    if (!window.confirm(`${proje.mentor.adSoyad} projenin mentörlüğünden çıkarılsın mı?`)) return;
    await calistir(() => mentoruCikar(proje.id), "Mentör projeden çıkarıldı.");
  }

  const bekleyenler = (talepler.data ?? []).filter((t) => t.durum === "pending");
  const digerleri = (talepler.data ?? []).filter((t) => t.durum !== "pending");

  return (
    <div className="ust-bosluk">
      {proje.mentor && (
        <button type="button" className="metin-dugmesi tehlike" onClick={cikar} disabled={calisiyor}>
          Mentörü projeden çıkar
        </button>
      )}
      {bekleyenler.length > 0 && (
        <>
          <h3 className="ara-baslik">Bekleyen mentörlük talepleri</h3>
          <ul className="sade-liste">
            {bekleyenler.map((t) => (
              <li key={t.id}>
                <Link to={`/mentorler/${t.mentor.id}`} className="icerik-linki">
                  {t.mentor.adSoyad}
                </Link>{" "}
                &middot; {TALEP_DURUMU[t.durum]} &middot;{" "}
                <button
                  type="button"
                  className="metin-dugmesi"
                  disabled={calisiyor}
                  onClick={() => calistir(() => talebiGeriAl(t.id), "Talep geri alındı.")}
                >
                  Geri al
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {digerleri.length > 0 && (
        <details className="ust-bosluk">
          <summary>Önceki talepler ({digerleri.length})</summary>
          <ul className="sade-liste">
            {digerleri.map((t) => (
              <li key={t.id}>
                {t.mentor?.adSoyad} &middot; {TALEP_DURUMU[t.durum]}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
