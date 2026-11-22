import { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useOturum } from "../baglam/OturumBaglami";

export default function UstMenu() {
  const [acik, setAcik] = useState(false);
  const konum = useLocation();
  const navigate = useNavigate();
  const { kullanici, profil, cikisYap } = useOturum();

  // Sayfa değişince telefon menüsü kapansın
  const [sonKonum, setSonKonum] = useState(konum.pathname);
  if (sonKonum !== konum.pathname) {
    setSonKonum(konum.pathname);
    setAcik(false);
  }

  async function cikis() {
    await cikisYap();
    navigate("/");
  }

  return (
    <header className="ust-menu">
      <div className="kapsayici ust-menu-ic">
        <Link to="/" className="logo">
          Proje<span>Eşleştir</span>
        </Link>
        <button
          type="button"
          className="menu-dugmesi"
          aria-expanded={acik}
          aria-controls="ana-menu"
          onClick={() => setAcik(!acik)}
        >
          Menü
        </button>
        <nav id="ana-menu" className={`ana-menu${acik ? " acik" : ""}`} aria-label="Ana menü">
          <NavLink to="/projeler" end>
            Projeler
          </NavLink>
          <NavLink to="/mentorler">Mentörler</NavLink>
          {kullanici ? (
            <>
              <NavLink to="/panelim">Panelim</NavLink>
              <NavLink to="/profil">Profilim</NavLink>
              <button type="button" className="buton buton-kucuk buton-cizgili" onClick={cikis}>
                Çıkış
              </button>
              <span className="ekran-okuyucu">{profil?.adSoyad} olarak giriş yapıldı</span>
            </>
          ) : (
            <>
              <Link to="/giris" className="buton buton-kucuk buton-cizgili">
                Giriş Yap
              </Link>
              <Link to="/kayit" className="buton buton-kucuk">
                Kayıt Ol
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
