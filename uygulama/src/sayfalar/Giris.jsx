import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { girisSemasi } from "../lib/dogrulama";
import FormAlani from "../bilesenler/FormAlani";

export default function Giris() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(girisSemasi) });

  async function gonder() {
    toast("Giriş, 10. haftada Supabase Auth ile bağlanacak.");
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

        <form className="form" onSubmit={handleSubmit(gonder)} noValidate>
          <FormAlani id="eposta" etiket="E-posta" hata={errors.eposta}>
            <input type="email" autoComplete="email" {...register("eposta")} />
          </FormAlani>

          <FormAlani id="sifre" etiket="Şifre" hata={errors.sifre}>
            <input type="password" autoComplete="current-password" {...register("sifre")} />
          </FormAlani>

          <button type="submit" className="buton buton-tam ust-bosluk" disabled={isSubmitting}>
            {isSubmitting ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
      </section>
    </main>
  );
}
