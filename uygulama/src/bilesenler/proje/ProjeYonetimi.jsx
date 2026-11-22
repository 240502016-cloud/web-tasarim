import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { projeDurumuDegistir, projeSil } from "../../api/projeler";
import { DURUM_YAZISI } from "../../lib/metin";
import { useIslem } from "../../lib/useIslem";

// Proje sahibinin yan paneldeki yönetim araçları
export default function ProjeYonetimi({ proje }) {
  const navigate = useNavigate();
  const { calistir, calisiyor } = useIslem();
  const [durum, setDurum] = useState(proje.durum);

  async function sil() {
    if (!window.confirm(`"${proje.baslik}" projesi, başvuruları ve mesajlarıyla birlikte kalıcı olarak silinecek. Emin misin?`)) {
      return;
    }
    if (await calistir(() => projeSil(proje.id), "Proje silindi.")) navigate("/panelim");
  }

  return (
    <div className="ayrik-form">
      <h2>Proje Yönetimi</h2>
      <Link to={`/projeler/${proje.id}/duzenle`} className="buton buton-cizgili buton-tam">
        Projeyi Düzenle
      </Link>

      <div className="form">
        <label htmlFor="proje-durumu">Proje durumu</label>
        <div className="beceri-ekle iki-oge">
          <select id="proje-durumu" value={durum} onChange={(e) => setDurum(e.target.value)}>
            {Object.entries(DURUM_YAZISI).map(([deger, yazi]) => (
              <option key={deger} value={deger}>
                {yazi}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="buton buton-kucuk"
            disabled={calisiyor || durum === proje.durum}
            onClick={() => calistir(() => projeDurumuDegistir(proje.id, durum), "Proje durumu güncellendi.")}
          >
            Kaydet
          </button>
        </div>
        <small className="ipucu">"Açık" dışındaki durumlarda yeni başvuru alınmaz.</small>
      </div>

      <button type="button" className="metin-dugmesi tehlike ust-bosluk" onClick={sil} disabled={calisiyor}>
        Projeyi sil
      </button>
    </div>
  );
}
