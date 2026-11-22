import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useOturum } from "../baglam/OturumBaglami";
import { becerileriGetir } from "../api/beceriler";
import { becerileriKaydet, hesabiSil, profilGuncelle } from "../api/profiller";
import { BOLUMLER, UZMANLIK_ALANLARI, profilSemalari } from "../lib/dogrulama";
import FormAlani from "../bilesenler/FormAlani";
import BeceriSecici from "../bilesenler/BeceriSecici";
import { Yukleniyor } from "../bilesenler/Durumlar";

const ROL_ADI = { student: "Öğrenci", mentor: "Mentör", admin: "Yönetici" };

function ProfilFormu({ profil, onKaydet }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm({
    resolver: zodResolver(profilSemalari[profil.rol]),
    defaultValues: {
      adSoyad: profil.adSoyad,
      hakkinda: profil.hakkinda,
      bolum: profil.bolum ?? "",
      sinif: profil.sinif ? String(profil.sinif) : "",
      unvan: profil.unvan ?? "",
      uzmanlik: profil.uzmanlik ?? "",
      deneyimYili: profil.deneyimYili ?? undefined,
      kapasite: profil.kapasite ?? 2,
    },
  });

  async function gonder(veri) {
    try {
      await profilGuncelle(profil.id, { ...veri, rol: profil.rol });
      await onKaydet();
      reset(veri);
      toast.success("Profilin güncellendi.");
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit(gonder)} noValidate>
      <FormAlani id="adSoyad" etiket="Ad Soyad" hata={errors.adSoyad}>
        <input type="text" autoComplete="name" {...register("adSoyad")} />
      </FormAlani>

      {profil.rol === "student" && (
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
                {["1", "2", "3", "4", "5", "6"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </FormAlani>
          </div>
        </div>
      )}

      {profil.rol === "mentor" && (
        <>
          <FormAlani id="unvan" etiket="Unvan" hata={errors.unvan}>
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

      <FormAlani
        id="hakkinda"
        etiket="Hakkında"
        hata={errors.hakkinda}
        ipucu="Kendini, ilgi alanlarını ve hedeflerini kısaca anlat."
      >
        <textarea rows="4" {...register("hakkinda")} />
      </FormAlani>

      <button type="submit" className="buton ust-bosluk" disabled={isSubmitting || !isDirty}>
        {isSubmitting ? "Kaydediliyor..." : "Bilgileri Kaydet"}
      </button>
    </form>
  );
}

function BecerilerBolumu({ profil, onKaydet }) {
  const tumBeceriler = useQuery({ queryKey: ["beceriler"], queryFn: becerileriGetir });
  const [secili, setSecili] = useState(profil.beceriler);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const anahtar = (liste) =>
    JSON.stringify([...liste].sort((a, b) => a.id - b.id).map((b) => [b.id, b.seviye]));
  const degisti = anahtar(secili) !== anahtar(profil.beceriler);

  async function kaydet() {
    setKaydediliyor(true);
    try {
      await becerileriKaydet(secili);
      await onKaydet();
      toast.success("Becerilerin kaydedildi.");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setKaydediliyor(false);
    }
  }

  if (tumBeceriler.isPending) return <Yukleniyor />;

  return (
    <>
      <p className="soluk">
        Proje önerileri bu becerilere ve seviyelerine göre hesaplanır. 1: başlangıç, 5: uzman.
      </p>
      <BeceriSecici tumBeceriler={tumBeceriler.data ?? []} secili={secili} onChange={setSecili} />
      <button
        type="button"
        className="buton ust-bosluk"
        onClick={kaydet}
        disabled={!degisti || kaydediliyor}
      >
        {kaydediliyor ? "Kaydediliyor..." : "Becerileri Kaydet"}
      </button>
    </>
  );
}

export default function Profil() {
  const { profil, profilYenile, kullanici } = useOturum();
  const navigate = useNavigate();

  if (!profil)
    return (
      <div className="kapsayici">
        <Yukleniyor />
      </div>
    );

  async function sil() {
    const onay = window.confirm(
      "Hesabın ve tüm verilerin (profilin, becerilerin, oluşturduğun projeler, başvuruların ve mesajların) kalıcı olarak silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musun?",
    );
    if (!onay) return;
    try {
      await hesabiSil();
      toast.success("Hesabın silindi.");
      navigate("/", { replace: true });
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div className="kapsayici dar-sayfa">
      <div className="sayfa-baslik">
        <h1>Profilim</h1>
        <p>
          {ROL_ADI[profil.rol]} &middot; {kullanici.email}
        </p>
      </div>

      {profil.rol === "mentor" && profil.mentorDurumu === "pending" && (
        <p className="bilgi-kutusu alt-bosluk" role="status">
          Mentör hesabın <strong>yönetici onayı bekliyor</strong>. Onaylandıktan sonra mentörler
          listesinde görünür ve mentörlük talebi alabilirsin.
        </p>
      )}
      {profil.rol === "mentor" && profil.mentorDurumu === "rejected" && (
        <p className="uyari-kutusu alt-bosluk" role="status">
          Mentör başvurun onaylanmadı. Bilgilerini güncelleyip yöneticiyle iletişime geçebilirsin.
        </p>
      )}

      <section className="panel alt-bosluk" aria-labelledby="bilgiler-baslik">
        <h2 id="bilgiler-baslik">Profil Bilgileri</h2>
        <ProfilFormu profil={profil} onKaydet={profilYenile} />
      </section>

      <section className="panel alt-bosluk" aria-labelledby="beceriler-baslik">
        <h2 id="beceriler-baslik">
          {profil.rol === "mentor" ? "Uzmanlık Alanlarım" : "Becerilerim"}
        </h2>
        <BecerilerBolumu profil={profil} onKaydet={profilYenile} />
      </section>

      <section className="panel tehlikeli-bolge" aria-labelledby="hesap-baslik">
        <h2 id="hesap-baslik">Hesabı Sil</h2>
        <p className="soluk">
          KVKK kapsamında hesabını ve tüm kişisel verilerini kalıcı olarak silebilirsin.
        </p>
        <button type="button" className="buton buton-tehlike" onClick={sil}>
          Hesabımı Sil
        </button>
      </section>
    </div>
  );
}
