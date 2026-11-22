import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isPast } from "date-fns";
import { tr } from "date-fns/locale";
import { gorusmeEkle, gorusmeSil, projeGorusmeleri } from "../../api/gorusmeler";
import { useIslem } from "../../lib/useIslem";
import { Yukleniyor } from "../Durumlar";

function yarinSaat14() {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  t.setHours(14, 0, 0, 0);
  // datetime-local alanı yerel saati "YYYY-MM-DDTHH:mm" biçiminde ister
  return format(t, "yyyy-MM-dd'T'HH:mm");
}

// Mentör görüşmeleri: lider ve mentör planlar, tüm ekip görür (FR-24)
export default function Gorusmeler({ proje, profil, planlayabilir }) {
  const { calistir, calisiyor } = useIslem();
  const gorusmeler = useQuery({
    queryKey: ["gorusmeler", proje.id],
    queryFn: () => projeGorusmeleri(proje.id),
  });
  const [form, setForm] = useState({ baslangic: yarinSaat14(), sureDk: 30, baglanti: "", not: "" });
  const [hata, setHata] = useState("");

  function alan(ad) {
    return {
      value: form[ad],
      onChange: (e) => setForm({ ...form, [ad]: ad === "sureDk" ? Number(e.target.value) : e.target.value }),
    };
  }

  async function ekle(e) {
    e.preventDefault();
    setHata("");
    if (form.baglanti && !form.baglanti.startsWith("https://")) {
      setHata("Görüşme bağlantısı https:// ile başlamalı.");
      return;
    }
    if (new Date(form.baslangic) < new Date()) {
      setHata("Geçmiş bir tarihe görüşme planlanamaz.");
      return;
    }
    const tamam = await calistir(
      () => gorusmeEkle(proje.id, profil.id, form),
      "Görüşme planlandı; ekibe bildirim gönderildi.",
    );
    if (tamam) setForm({ ...form, baglanti: "", not: "" });
  }

  const liste = gorusmeler.data ?? [];

  return (
    <section className="bolum" aria-labelledby="gorusmeler-baslik">
      <h2 id="gorusmeler-baslik">Görüşmeler</h2>
      {gorusmeler.isPending && <Yukleniyor />}
      {gorusmeler.isSuccess && liste.length === 0 && <p className="soluk">Planlanmış görüşme yok.</p>}

      <ul className="gorusme-listesi">
        {liste.map((g) => {
          const gecti = isPast(new Date(g.baslangic));
          return (
            <li key={g.id} className={gecti ? "gecmis" : undefined}>
              <div className="esnek-buyu">
                <strong>{format(new Date(g.baslangic), "d MMMM yyyy, EEEE HH:mm", { locale: tr })}</strong>
                <small className="soluk">
                  {g.sureDk} dakika{gecti && " · tamamlandı"}
                </small>
                {g.not && <p className="metin-satirlari">{g.not}</p>}
                {g.baglanti && !gecti && (
                  <a href={g.baglanti} target="_blank" rel="noopener noreferrer" className="icerik-linki">
                    Görüşmeye katıl
                  </a>
                )}
              </div>
              {(g.olusturan === profil.id || proje.sahipId === profil.id) && (
                <button
                  type="button"
                  className="metin-dugmesi tehlike"
                  disabled={calisiyor}
                  onClick={() => calistir(() => gorusmeSil(g.id), "Görüşme silindi.")}
                >
                  Sil
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {planlayabilir && (
        <details className="ust-bosluk">
          <summary>Yeni görüşme planla</summary>
          <form className="form" onSubmit={ekle}>
            {hata && (
              <p className="uyari-kutusu" role="alert">
                {hata}
              </p>
            )}
            <div className="iki-sutun">
              <div>
                <label htmlFor="g-baslangic">Tarih ve saat</label>
                <input id="g-baslangic" type="datetime-local" required {...alan("baslangic")} />
              </div>
              <div>
                <label htmlFor="g-sure">Süre</label>
                <select id="g-sure" {...alan("sureDk")}>
                  {[15, 30, 45, 60, 90, 120].map((d) => (
                    <option key={d} value={d}>
                      {d} dakika
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label htmlFor="g-baglanti">
              Görüşme bağlantısı <span className="soluk">(Meet, Zoom vb.)</span>
            </label>
            <input id="g-baglanti" type="url" placeholder="https://meet.google.com/..." {...alan("baglanti")} />
            <label htmlFor="g-not">
              Gündem <span className="soluk">(isteğe bağlı)</span>
            </label>
            <textarea id="g-not" rows="2" maxLength={500} {...alan("not")} />
            <button type="submit" className="buton ust-bosluk" disabled={calisiyor}>
              Görüşmeyi Planla
            </button>
          </form>
        </details>
      )}
    </section>
  );
}
