import { Outlet } from "react-router-dom";
import UstMenu from "./UstMenu";

// Üst menü + sayfa içeriği + alt bilgi
export default function SayfaDuzeni() {
  return (
    <>
      <a href="#icerik" className="atla-linki">
        İçeriğe geç
      </a>
      <UstMenu />
      <main id="icerik">
        <Outlet />
      </main>
      <footer>
        <p>ProjeEşleştir &middot; Öğrenci, Mentör ve Proje Eşleştirme Platformu</p>
      </footer>
    </>
  );
}
