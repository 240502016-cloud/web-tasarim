import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase, hataMetni } from "../lib/supabase";

export default function SifremiUnuttum() {
  const [eposta, setEposta] = useState("");
  const [durum, setDurum] = useState("bos"); // bos | gonderiliyor | gonderildi
  const [hata, setHata] = useState("");

  async function gonder(e) {
    e.preventDefault();
    setHata("");
    setDurum("gonderiliyor");
    const { error } = await supabase.auth.resetPasswordForEmail(eposta.trim(), {
      redirectTo: `${window.location.origin}/sifre-yenile`,
    });
    if (error) {
      setHata(hataMetni(error));
      setDurum("bos");
    } else {
      setDurum("gonderildi");
    }
  }

  return (
    <div className="kapsayici dar-form">
      <div className="sayfa-baslik">
        <h1>Şifremi Unuttum</h1>
        <p>E-posta adresini yaz, sana şifre yenileme bağlantısı gönderelim.</p>
      </div>

      <div className="panel">
        {durum === "gonderildi" ? (
          <p role="status">
            Bu adrese kayıtlı bir hesap varsa şifre yenileme bağlantısı gönderildi. Gelen kutunu (ve
            gereksiz klasörünü) kontrol et.
          </p>
        ) : (
          <form className="form" onSubmit={gonder}>
            {hata && (
              <p className="uyari-kutusu" role="alert">
                {hata}
              </p>
            )}
            <label htmlFor="eposta">E-posta</label>
            <input
              id="eposta"
              type="email"
              required
              autoComplete="email"
              value={eposta}
              onChange={(e) => setEposta(e.target.value)}
            />
            <button
              type="submit"
              className="buton buton-tam ust-bosluk"
              disabled={durum === "gonderiliyor"}
            >
              Bağlantı Gönder
            </button>
          </form>
        )}
        <p className="ust-bosluk">
          <Link to="/giris" className="icerik-linki">
            Giriş sayfasına dön
          </Link>
        </p>
      </div>
    </div>
  );
}
