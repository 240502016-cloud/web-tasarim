import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { kullanicininProjeleri } from "../api/projeler";
import { talepGonder } from "../api/mentorluk";
import { useIslem } from "../lib/useIslem";

// Mentör profilinde, proje liderinin mentörlük talebi gönderdiği form (FR-22)
export default function MentorTalepFormu({ mentor, profil, onerilenProjeId }) {
  const { calistir, calisiyor } = useIslem();
  const projeler = useQuery({
    queryKey: ["projelerim", profil.id],
    queryFn: () => kullanicininProjeleri(profil.id),
  });
  const [projeId, setProjeId] = useState(onerilenProjeId ?? "");
  const [mesaj, setMesaj] = useState("");
  const [gonderildi, setGonderildi] = useState(false);

  // Mentörü olmayan, devam eden ve kullanıcının lideri olduğu projeler
  const uygunlar = (projeler.data ?? []).filter(
    (p) => p.sahipId === profil.id && !p.mentorId && ["open", "in_progress"].includes(p.durum),
  );

  if (projeler.isPending) return null;
  if (gonderildi) {
    return (
      <p className="bilgi-kutusu ust-bosluk">
        Talebin gönderildi. Mentör yanıtladığında bildirim alacaksın.
      </p>
    );
  }
  if (mentor.aktifProje >= mentor.kapasite) {
    return <p className="soluk ust-bosluk">Bu mentörün kapasitesi şu an dolu.</p>;
  }
  if (!uygunlar.length) {
    return (
      <p className="soluk ust-bosluk">
        Mentörlük talebi göndermek için mentörü olmayan bir projenin lideri olmalısın.{" "}
        <Link to="/projeler/yeni" className="icerik-linki">
          Proje oluştur
        </Link>
      </p>
    );
  }

  async function gonder(e) {
    e.preventDefault();
    const tamam = await calistir(
      () => talepGonder(projeId, mentor.id, mesaj.trim()),
      "Mentörlük talebi gönderildi.",
    );
    if (tamam) setGonderildi(true);
  }

  return (
    <form className="form ayrik-form" onSubmit={gonder}>
      <h2>Mentörlük Talebi Gönder</h2>
      <label htmlFor="talep-proje">Hangi projen için?</label>
      <select
        id="talep-proje"
        required
        value={projeId}
        onChange={(e) => setProjeId(e.target.value)}
      >
        <option value="">Seçiniz</option>
        {uygunlar.map((p) => (
          <option key={p.id} value={p.id}>
            {p.baslik}
          </option>
        ))}
      </select>
      <label htmlFor="talep-mesaj">Mesajın</label>
      <textarea
        id="talep-mesaj"
        rows="4"
        required
        minLength={10}
        maxLength={1000}
        value={mesaj}
        onChange={(e) => setMesaj(e.target.value)}
        placeholder="Projeni ve hangi konuda desteğe ihtiyacın olduğunu yaz..."
      />
      <button type="submit" className="buton buton-tam ust-bosluk" disabled={calisiyor}>
        Talep Gönder
      </button>
    </form>
  );
}
