import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

export default function UstMenu() {
  const [acik, setAcik] = useState(false);
  const konum = useLocation();

  // Sayfa değişince telefon menüsü kapansın
  const [sonKonum, setSonKonum] = useState(konum.pathname);
  if (sonKonum !== konum.pathname) {
    setSonKonum(konum.pathname);
    setAcik(false);
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
          <NavLink to="/projeler">Projeler</NavLink>
          <NavLink to="/mentorler">Mentörler</NavLink>
          <Link to="/giris" className="buton buton-kucuk buton-cizgili">
            Giriş Yap
          </Link>
          <Link to="/kayit" className="buton buton-kucuk">
            Kayıt Ol
          </Link>
        </nav>
      </div>
    </header>
  );
}
