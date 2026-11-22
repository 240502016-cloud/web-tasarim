import { Route, Routes } from "react-router-dom";
import SayfaDuzeni from "./bilesenler/SayfaDuzeni";
import AnaSayfa from "./sayfalar/AnaSayfa";
import Projeler from "./sayfalar/Projeler";
import ProjeDetay from "./sayfalar/ProjeDetay";
import Mentorler from "./sayfalar/Mentorler";
import MentorProfil from "./sayfalar/MentorProfil";
import Giris from "./sayfalar/Giris";
import Kayit from "./sayfalar/Kayit";
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
        <Route path="mentorler/:id" element={<MentorProfil />} />
        <Route path="kvkk" element={<Kvkk />} />
        <Route path="*" element={<Bulunamadi />} />
      </Route>
      {/* Giriş ve kayıt sayfalarının kendi tam ekran düzeni var */}
      <Route path="giris" element={<Giris />} />
      <Route path="kayit" element={<Kayit />} />
    </Routes>
  );
}
