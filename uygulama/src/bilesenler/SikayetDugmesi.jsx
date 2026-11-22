import { useState } from "react";
import { sikayetEt } from "../api/yonetici";
import { useIslem } from "../lib/useIslem";

const TUR_ADI = { project: "projeyi", profile: "profili", message: "mesajı" };

// Uygunsuz içeriği yöneticiye bildirme (FR-28)
export default function SikayetDugmesi({ profil, tur, hedefId }) {
  const { calistir, calisiyor } = useIslem();
  const [acik, setAcik] = useState(false);
  const [neden, setNeden] = useState("");
  const [gonderildi, setGonderildi] = useState(false);

  if (!profil) return null;
  if (gonderildi) return <small className="soluk">Şikâyetin yöneticiye iletildi.</small>;

  if (!acik) {
    return (
      <button type="button" className="metin-dugmesi kucuk-yazi" onClick={() => setAcik(true)}>
        Şikâyet et
      </button>
    );
  }

  async function gonder(e) {
    e.preventDefault();
    const tamam = await calistir(() => sikayetEt(profil.id, tur, hedefId, neden.trim()));
    if (tamam) setGonderildi(true);
  }

  return (
    <form className="form sikayet-formu" onSubmit={gonder}>
      <label htmlFor={`sikayet-${hedefId}`}>Bu {TUR_ADI[tur]} neden şikâyet ediyorsun?</label>
      <textarea
        id={`sikayet-${hedefId}`}
        rows="2"
        required
        minLength={10}
        maxLength={500}
        value={neden}
        onChange={(e) => setNeden(e.target.value)}
      />
      <div className="buton-satiri ust-bosluk">
        <button type="submit" className="buton buton-kucuk buton-tehlike" disabled={calisiyor}>
          Gönder
        </button>
        <button
          type="button"
          className="buton buton-kucuk buton-cizgili"
          onClick={() => setAcik(false)}
        >
          Vazgeç
        </button>
      </div>
    </form>
  );
}
