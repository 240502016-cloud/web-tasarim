import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { BOLUMLER, UZMANLIK_ALANLARI, kayitSemasi } from "../lib/dogrulama";
import { useOturum } from "../baglam/OturumBaglami";
import FormAlani from "../bilesenler/FormAlani";

const SIFRE_IPUCU = "En az 8 karakter; en az bir harf ve bir rakam içermeli.";

export default function Kayit() {
  const [parametreler] = useSearchParams();
  const { kullanici, kayitOl } = useOturum();
  const navigate = useNavigate();
  const [hata, setHata] = useState("");
  const [dogrulamaBekleniyor, setDogrulamaBekleniyor] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(kayitSemasi),
    defaultValues: {
      rol: parametreler.get("rol") === "mentor" ? "mentor" : "student",
      kapasite: 2,
    },
  });
  const rol = watch("rol");

  if (kullanici && !dogrulamaBekleniyor) return <Navigate to="/profil" replace />;

  async function gonder(veri) {
    setHata("");
    try {
      const oturumAcildi = await kayitOl(veri);
      if (oturumAcildi) navigate("/profil", { replace: true });
      else setDogrulamaBekleniyor(true);
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
        <h1>Projeni, takımını ve mentörünü bul.</h1>
        <ul>
          <li>Becerilerine uygun projeler önerilir</li>
          <li>Deneyimli mentörlerle görüşme planlarsın</li>
          <li>Takımınla tek yerden haberleşirsin</li>
        </ul>
      </section>

      <section className="form-alani">
        <h2>Kayıt Ol</h2>
        <p className="soluk">
          Zaten hesabın var mı? <Link to="/giris">Giriş yap</Link>
        </p>

        {dogrulamaBekleniyor ? (
          <div className="bilgi-kutusu" role="status">
            <p>
              <strong>Neredeyse bitti!</strong> E-posta adresine bir doğrulama bağlantısı gönderdik.
              Bağlantıya tıkladıktan sonra giriş yapabilirsin.
            </p>
          </div>
        ) : (
          <>
            {hata && (
              <p className="uyari-kutusu" role="alert">
                {hata}
              </p>
            )}

            <div className="rol-secici" role="radiogroup" aria-label="Hesap türü">
              {[
                ["student", "Öğrenciyim"],
                ["mentor", "Mentörüm"],
              ].map(([deger, yazi]) => (
                <button
                  key={deger}
                  type="button"
                  role="radio"
                  aria-checked={rol === deger}
                  className={rol === deger ? "secili" : undefined}
                  onClick={() => setValue("rol", deger)}
                >
                  {yazi}
                </button>
              ))}
            </div>

            <form className="form" onSubmit={handleSubmit(gonder)} noValidate>
              <FormAlani id="adSoyad" etiket="Ad Soyad" hata={errors.adSoyad}>
                <input type="text" autoComplete="name" {...register("adSoyad")} />
              </FormAlani>

              <FormAlani
                id="eposta"
                etiket={rol === "student" ? "KOSTÜ öğrenci e-postası" : "KOSTÜ personel e-postası"}
                hata={errors.eposta}
                ipucu={
                  rol === "student"
                    ? "Öğrenci numaran + @kocaelisaglik.edu.tr (ör. 24xxxxxxx@kocaelisaglik.edu.tr)"
                    : "Ör. ad.soyad@kocaelisaglik.edu.tr"
                }
              >
                <input type="email" autoComplete="email" {...register("eposta")} />
              </FormAlani>

              {rol === "student" ? (
                <div className="iki-sutun">
                  <div>
                    <FormAlani id="bolum" etiket="Bölüm" hata={errors.bolum}>
                      <select {...register("bolum")}>
                        <option value="">Seçiniz</option>
                        {BOLUMLER.map((b) => (
                          <option key={b}>{b}</option>
                        ))}
                      </select>
                    </FormAlani>
                  </div>
                  <div>
                    <FormAlani id="sinif" etiket="Sınıf" hata={errors.sinif}>
                      <select {...register("sinif")}>
                        <option value="">Seçiniz</option>
                        {["1", "2", "3", "4"].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </FormAlani>
                  </div>
                </div>
              ) : (
                <>
                  <FormAlani
                    id="unvan"
                    etiket="Unvan"
                    hata={errors.unvan}
                    ipucu="Ör. Öğretim Üyesi, Araştırma Görevlisi"
                  >
                    <input type="text" {...register("unvan")} />
                  </FormAlani>
                  <FormAlani id="uzmanlik" etiket="Uzmanlık alanı" hata={errors.uzmanlik}>
                    <select {...register("uzmanlik")}>
                      <option value="">Seçiniz</option>
                      {UZMANLIK_ALANLARI.map((a) => (
                        <option key={a}>{a}</option>
                      ))}
                    </select>
                  </FormAlani>
                  <div className="iki-sutun">
                    <div>
                      <FormAlani id="deneyimYili" etiket="Deneyim (yıl)" hata={errors.deneyimYili}>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          {...register("deneyimYili", { valueAsNumber: true })}
                        />
                      </FormAlani>
                    </div>
                    <div>
                      <FormAlani id="kapasite" etiket="Aynı anda kaç proje?" hata={errors.kapasite}>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          {...register("kapasite", { valueAsNumber: true })}
                        />
                      </FormAlani>
                    </div>
                  </div>
                </>
              )}

              <FormAlani id="sifre" etiket="Şifre" hata={errors.sifre} ipucu={SIFRE_IPUCU}>
                <input type="password" autoComplete="new-password" {...register("sifre")} />
              </FormAlani>

              <label className="onay">
                <input
                  type="checkbox"
                  {...register("kvkk")}
                  aria-invalid={errors.kvkk ? true : undefined}
                />
                <span>
                  <Link to="/kvkk" target="_blank">
                    KVKK Aydınlatma Metni
                  </Link>
                  &apos;ni okudum, kişisel verilerimin işlenmesini kabul ediyorum.
                </span>
              </label>
              {errors.kvkk && <small className="ipucu alan-hatasi">{errors.kvkk.message}</small>}

              {rol === "mentor" && (
                <p className="bilgi-kutusu">
                  Mentörlük KOSTÜ personeline açıktır. Hesabın, kimlik kontrolü için{" "}
                  <strong>yönetici onayından sonra</strong> aktif olur.
                </p>
              )}

              <button type="submit" className="buton buton-tam" disabled={isSubmitting}>
                {isSubmitting
                  ? "Kaydediliyor..."
                  : rol === "student"
                    ? "Öğrenci Olarak Kayıt Ol"
                    : "Mentör Başvurusu Gönder"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
