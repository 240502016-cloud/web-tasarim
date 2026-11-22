import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { supabase, hataMetni } from "../lib/supabase";
import { SIFRE_KURALI } from "../lib/dogrulama";
import { useOturum } from "../baglam/OturumBaglami";
import { Yukleniyor } from "../bilesenler/Durumlar";

// E-postadaki şifre yenileme bağlantısı kullanıcıyı geçici bir oturumla buraya getirir
export default function SifreYenile() {
  const { kullanici, yukleniyor } = useOturum();
  const navigate = useNavigate();
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState("");
  const [kaydediliyor, setKaydediliyor] = useState(false);

  async function gonder(e) {
    e.preventDefault();
    if (!SIFRE_KURALI.test(sifre)) {
      setHata("Şifre en az 8 karakter olmalı; en az bir harf ve bir rakam içermeli.");
      return;
    }
    setKaydediliyor(true);
    const { error } = await supabase.auth.updateUser({ password: sifre });
    setKaydediliyor(false);
    if (error) {
      setHata(hataMetni(error));
    } else {
      toast.success("Şifren güncellendi.");
      navigate("/profil", { replace: true });
    }
  }

  if (yukleniyor)
    return (
      <div className="kapsayici">
        <Yukleniyor />
      </div>
    );

  return (
    <div className="kapsayici dar-form">
      <div className="sayfa-baslik">
        <h1>Yeni Şifre Belirle</h1>
      </div>
      <div className="panel">
        {!kullanici ? (
          <p>
            Bağlantının süresi dolmuş olabilir.{" "}
            <Link to="/sifremi-unuttum" className="icerik-linki">
              Yeni bağlantı iste
            </Link>
            .
          </p>
        ) : (
          <form className="form" onSubmit={gonder}>
            {hata && (
              <p className="uyari-kutusu" role="alert">
                {hata}
              </p>
            )}
            <label htmlFor="sifre">Yeni şifre</label>
            <input
              id="sifre"
              type="password"
              autoComplete="new-password"
              value={sifre}
              onChange={(e) => setSifre(e.target.value)}
              aria-describedby="sifre-ipucu"
            />
            <small id="sifre-ipucu" className="ipucu">
              En az 8 karakter; en az bir harf ve bir rakam içermeli.
            </small>
            <button type="submit" className="buton buton-tam ust-bosluk" disabled={kaydediliyor}>
              Şifreyi Kaydet
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
