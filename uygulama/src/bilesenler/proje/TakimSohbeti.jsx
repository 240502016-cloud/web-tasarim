import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isToday } from "date-fns";
import { tr } from "date-fns/locale";
import toast from "react-hot-toast";
import { mesajGonder, mesajiDonustur, mesajlariDinle, mesajlariGetir } from "../../api/mesajlar";
import { Yukleniyor } from "../Durumlar";

// Proje ekibinin (üyeler + mentör) anlık mesajlaştığı alan (FR-25)
export default function TakimSohbeti({ proje, profil }) {
  const queryClient = useQueryClient();
  const anahtar = ["mesajlar", proje.id];
  const mesajlar = useQuery({ queryKey: anahtar, queryFn: () => mesajlariGetir(proje.id) });
  const [metin, setMetin] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const listeRef = useRef(null);

  // Yeni mesajlar Supabase Realtime ile anında gelir
  useEffect(() => {
    return mesajlariDinle(proje.id, (satir) => {
      queryClient.setQueryData(["mesajlar", proje.id], (eski = []) =>
        eski.some((m) => m.id === satir.id) ? eski : [...eski, mesajiDonustur(satir)],
      );
    });
  }, [proje.id, queryClient]);

  // Yeni mesajda en alta kaydır
  useEffect(() => {
    if (listeRef.current) listeRef.current.scrollTop = listeRef.current.scrollHeight;
  }, [mesajlar.data?.length]);

  // Realtime ile gelen mesajda gönderenin adı yok; ekip listesinden bulunur
  const adlar = new Map(proje.uyeler.map((u) => [u.id, u.adSoyad]));
  if (proje.mentor) adlar.set(proje.mentor.id, `${proje.mentor.adSoyad} (mentör)`);

  async function gonder(e) {
    e.preventDefault();
    if (!metin.trim()) return;
    setGonderiliyor(true);
    try {
      await mesajGonder(proje.id, profil.id, metin);
      setMetin("");
      await queryClient.invalidateQueries({ queryKey: anahtar });
    } catch (hata) {
      toast.error(hata.message);
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <section className="bolum" aria-labelledby="sohbet-baslik">
      <h2 id="sohbet-baslik">Takım Sohbeti</h2>
      <p className="soluk kucuk-yazi">Mesajları yalnızca takım üyeleri ve projenin mentörü görebilir.</p>

      <div className="sohbet" ref={listeRef} aria-live="polite">
        {mesajlar.isPending && <Yukleniyor />}
        {mesajlar.data?.length === 0 && <p className="soluk">Henüz mesaj yok. İlk mesajı sen yaz!</p>}
        {mesajlar.data?.map((m) => {
          const benim = m.gonderenId === profil.id;
          const tarih = new Date(m.tarih);
          return (
            <div key={m.id} className={`mesaj${benim ? " benim" : ""}`}>
              {!benim && <strong>{adlar.get(m.gonderenId) ?? m.gonderen ?? "Eski üye"}</strong>}
              <p className="metin-satirlari">{m.icerik}</p>
              <time dateTime={m.tarih}>
                {format(tarih, isToday(tarih) ? "HH:mm" : "d MMM HH:mm", { locale: tr })}
              </time>
            </div>
          );
        })}
      </div>

      <form className="sohbet-formu" onSubmit={gonder}>
        <label htmlFor="mesaj-yaz" className="ekran-okuyucu">
          Mesajın
        </label>
        <textarea
          id="mesaj-yaz"
          rows="2"
          maxLength={2000}
          value={metin}
          placeholder="Ekibine bir mesaj yaz..."
          onChange={(e) => setMetin(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) gonder(e);
          }}
        />
        <button type="submit" className="buton" disabled={gonderiliyor || !metin.trim()}>
          Gönder
        </button>
      </form>
    </section>
  );
}
