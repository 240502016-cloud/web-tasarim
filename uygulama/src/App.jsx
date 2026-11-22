import { Route, Routes } from "react-router-dom";
import SayfaDuzeni from "./bilesenler/SayfaDuzeni";
import KorumaliRota from "./bilesenler/KorumaliRota";
import AnaSayfa from "./sayfalar/AnaSayfa";
import Projeler from "./sayfalar/Projeler";
import ProjeDetay from "./sayfalar/ProjeDetay";
import Mentorler from "./sayfalar/Mentorler";
import MentorProfil from "./sayfalar/MentorProfil";
import Giris from "./sayfalar/Giris";
import Kayit from "./sayfalar/Kayit";
import SifremiUnuttum from "./sayfalar/SifremiUnuttum";
import SifreYenile from "./sayfalar/SifreYenile";
import Profil from "./sayfalar/Profil";
import Panelim from "./sayfalar/Panelim";
import Bildirimler from "./sayfalar/Bildirimler";
import ProjeFormu from "./sayfalar/ProjeFormu";
import Kvkk from "./sayfalar/Kvkk";
import Bulunamadi from "./sayfalar/Bulunamadi";

export default function App() {
  return (
    <Routes>
      <Route element={<SayfaDuzeni />}>
        <Route index element={<AnaSayfa />} />
        <Route path="projeler" element={<Projeler />} />
        <Route path="projeler/:id" element={<ProjeDetay />} />
        <Route path="mentorler" element={<Mentorler />} />
        <Route path="kvkk" element={<Kvkk />} />
        <Route path="sifremi-unuttum" element={<SifremiUnuttum />} />
        <Route path="sifre-yenile" element={<SifreYenile />} />

        {/* Giriş gerektiren sayfalar */}
        <Route element={<KorumaliRota />}>
          <Route path="mentorler/:id" element={<MentorProfil />} />
          <Route path="profil" element={<Profil />} />
          <Route path="panelim" element={<Panelim />} />
          <Route path="bildirimler" element={<Bildirimler />} />
          <Route path="projeler/yeni" element={<ProjeFormu />} />
          <Route path="projeler/:id/duzenle" element={<ProjeFormu />} />
        </Route>

        <Route path="*" element={<Bulunamadi />} />
      </Route>
      {/* Giriş ve kayıt sayfalarının kendi tam ekran düzeni var */}
      <Route path="giris" element={<Giris />} />
      <Route path="kayit" element={<Kayit />} />
    </Routes>
  );
}
