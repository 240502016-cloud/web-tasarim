import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { girisSemasi } from "../lib/dogrulama";
import { useOturum } from "../baglam/OturumBaglami";
import FormAlani from "../bilesenler/FormAlani";

export default function Giris() {
  const { kullanici, girisYap } = useOturum();
  const navigate = useNavigate();
  const konum = useLocation();
  const [hata, setHata] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(girisSemasi) });

  const geri = konum.state?.geri ?? "/profil";
  if (kullanici) return <Navigate to={geri} replace />;

  async function gonder(veri) {
    setHata("");
    try {
      await girisYap(veri.eposta, veri.sifre);
      navigate(geri, { replace: true });
    } catch (e) {
      setHata(e.message);
    }
  }

  return (
    <main className="hesap-sayfasi">
      <section className="tanitim">
        <Link to="/" className="logo">
          Proje<span>Eşleştir</span>
        </Link>
        <h1>Tekrar hoş geldin!</h1>
        <ul>
          <li>Başvurularının durumunu takip et</li>
          <li>Mentörünle görüşmelerini gör</li>
          <li>Sana önerilen yeni projelere göz at</li>
        </ul>
      </section>

      <section className="form-alani">
        <h2>Giriş Yap</h2>
        <p className="soluk">
          Hesabın yok mu? <Link to="/kayit">Kayıt ol</Link>
        </p>

        {hata && (
          <p className="uyari-kutusu" role="alert">
            {hata}
          </p>
        )}

        <form className="form" onSubmit={handleSubmit(gonder)} noValidate>
          <FormAlani id="eposta" etiket="E-posta" hata={errors.eposta}>
            <input type="email" autoComplete="email" {...register("eposta")} />
          </FormAlani>

          <FormAlani id="sifre" etiket="Şifre" hata={errors.sifre}>
            <input type="password" autoComplete="current-password" {...register("sifre")} />
          </FormAlani>

          <p className="sag-hizali">
            <Link to="/sifremi-unuttum">Şifremi unuttum</Link>
          </p>

          <button type="submit" className="buton buton-tam" disabled={isSubmitting}>
            {isSubmitting ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
      </section>
    </main>
  );
}
