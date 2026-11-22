import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useOturum } from "../baglam/OturumBaglami";
import { mentorleriGetir } from "../api/mentorler";
import MentorKarti from "../bilesenler/MentorKarti";
import { BosDurum, HataMesaji, Yukleniyor } from "../bilesenler/Durumlar";
import { UZMANLIK_ALANLARI } from "../lib/dogrulama";

export default function Mentorler() {
  const [alan, setAlan] = useState("");
  const { kullanici, yukleniyor } = useOturum();
  const mentorler = useQuery({
    queryKey: ["mentorler"],
    queryFn: mentorleriGetir,
    enabled: Boolean(kullanici),
  });

  // Ziyaretçiler mentör profillerini göremez (gereksinim: rol yetkileri tablosu)
  if (!yukleniyor && !kullanici) {
    return (
      <div className="kapsayici">
        <div className="sayfa-baslik">
          <h1>Mentörler</h1>
        </div>
        <p className="bilgi-kutusu">
          Mentör profillerini görmek için <Link to="/giris" state={{ geri: "/mentorler" }}>giriş yap</Link>{" "}
          ya da <Link to="/kayit">kayıt ol</Link>.
        </p>
      </div>
    );
  }

  const liste = (mentorler.data ?? []).filter((m) => !alan || m.uzmanlik === alan);

  return (
    <div className="kapsayici">
      <div className="sayfa-baslik">
        <h1>Mentörler</h1>
        <p>Projene yol gösterecek deneyimli bir mentör bul. Mentörlük talebini proje lideri gönderir.</p>
      </div>

      <div className="liste-ust">
        <span aria-live="polite">{mentorler.isSuccess && `${liste.length} mentör`}</span>
        <select
          aria-label="Uzmanlık alanına göre filtrele"
          value={alan}
          onChange={(e) => setAlan(e.target.value)}
        >
          <option value="">Tüm alanlar</option>
          {UZMANLIK_ALANLARI.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
      </div>

      {mentorler.isPending && <Yukleniyor />}
      {mentorler.isError && <HataMesaji hata={mentorler.error} />}
      {mentorler.isSuccess && liste.length === 0 && <BosDurum>Bu alanda henüz mentör yok.</BosDurum>}

      <h2 className="ekran-okuyucu">Mentör listesi</h2>
      <div className="izgara">
        {liste.map((m) => (
          <MentorKarti key={m.id} mentor={m} />
        ))}
      </div>
    </div>
  );
}
