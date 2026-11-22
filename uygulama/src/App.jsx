import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import SayfaDuzeni from "./bilesenler/SayfaDuzeni";
import KorumaliRota from "./bilesenler/KorumaliRota";
import AnaSayfa from "./sayfalar/AnaSayfa";
import Projeler from "./sayfalar/Projeler";
import Bulunamadi from "./sayfalar/Bulunamadi";
import { Yukleniyor } from "./bilesenler/Durumlar";

const ProjeDetay = lazy(() => import("./sayfalar/ProjeDetay"));
const Mentorler = lazy(() => import("./sayfalar/Mentorler"));
const MentorProfil = lazy(() => import("./sayfalar/MentorProfil"));
const Giris = lazy(() => import("./sayfalar/Giris"));
const Kayit = lazy(() => import("./sayfalar/Kayit"));
const SifremiUnuttum = lazy(() => import("./sayfalar/SifremiUnuttum"));
const SifreYenile = lazy(() => import("./sayfalar/SifreYenile"));
const Profil = lazy(() => import("./sayfalar/Profil"));
const Panelim = lazy(() => import("./sayfalar/Panelim"));
const Bildirimler = lazy(() => import("./sayfalar/Bildirimler"));
const Yonetici = lazy(() => import("./sayfalar/Yonetici"));
const ProjeFormu = lazy(() => import("./sayfalar/ProjeFormu"));
const Kvkk = lazy(() => import("./sayfalar/Kvkk"));

export default function App() {
  // Ana sayfa ve proje listesi dışındaki sayfalar ayrı parçalar halinde, gerektiğinde yüklenir.
  // Böylece ilk açılışta indirilen kod küçülür (NFR-01).
  return (
    <Suspense
      fallback={
        <div className="kapsayici">
          <Yukleniyor />
        </div>
      }
    >
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

          <Route element={<KorumaliRota roller={["admin"]} />}>
            <Route path="yonetim" element={<Yonetici />} />
          </Route>

          <Route path="*" element={<Bulunamadi />} />
        </Route>
        {/* Giriş ve kayıt sayfalarının kendi tam ekran düzeni var */}
        <Route path="giris" element={<Giris />} />
        <Route path="kayit" element={<Kayit />} />
      </Routes>
    </Suspense>
  );
}
