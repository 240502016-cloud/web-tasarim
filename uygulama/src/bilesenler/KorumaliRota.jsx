import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useOturum } from "../baglam/OturumBaglami";
import { Yukleniyor } from "./Durumlar";

// Giriş yapmamış kullanıcıyı giriş sayfasına yönlendirir.
// roller verilirse yalnızca o rollerdeki kullanıcılar girebilir.
export default function KorumaliRota({ roller }) {
  const { kullanici, profil, yukleniyor } = useOturum();
  const konum = useLocation();

  if (yukleniyor) {
    return (
      <div className="kapsayici">
        <Yukleniyor />
      </div>
    );
  }
  if (!kullanici) {
    return <Navigate to="/giris" replace state={{ geri: konum.pathname + konum.search }} />;
  }
  if (roller && !roller.includes(profil?.rol)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
