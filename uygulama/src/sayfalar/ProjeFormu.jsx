import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { becerileriGetir } from "../api/beceriler";
import { projeGetir, projeGuncelle, projeOlustur } from "../api/projeler";
import { projeSemasi } from "../lib/dogrulama";
import { useOturum } from "../baglam/OturumBaglami";
import FormAlani from "../bilesenler/FormAlani";
import BeceriSecici from "../bilesenler/BeceriSecici";
import { HataMesaji, Yukleniyor } from "../bilesenler/Durumlar";

function Form({ proje, tumBeceriler }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [beceriler, setBeceriler] = useState(proje?.beceriler ?? []);
  const [beceriHatasi, setBeceriHatasi] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(projeSemasi),
    defaultValues: proje
      ? {
          baslik: proje.baslik,
          aciklama: proje.aciklama,
          takimBuyuklugu: proje.takimBuyuklugu,
          sureHafta: proje.sureHafta ?? undefined,
        }
      : { takimBuyuklugu: 4 },
  });

  async function gonder(veri) {
    if (beceriler.length === 0) {
      setBeceriHatasi("En az bir gerekli beceri seç.");
      return;
    }
    setBeceriHatasi("");
    const gidecek = { ...veri, beceriIdleri: beceriler.map((b) => b.id) };
    try {
      let hedefId = proje?.id;
      if (proje) {
        await projeGuncelle(proje.id, gidecek);
        toast.success("Proje güncellendi.");
      } else {
        hedefId = await projeOlustur(gidecek);
        toast.success("Proje oluşturuldu. Artık başvuru alabilirsin.");
      }
      await queryClient.invalidateQueries();
      navigate(`/projeler/${hedefId}`);
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <form className="form panel" onSubmit={handleSubmit(gonder)} noValidate>
      <FormAlani id="baslik" etiket="Proje adı" hata={errors.baslik}>
        <input type="text" maxLength={120} {...register("baslik")} />
      </FormAlani>

      <FormAlani
        id="aciklama"
        etiket="Açıklama"
        hata={errors.aciklama}
        ipucu="Projenin amacını, ne yapılacağını ve takımdan beklentilerini anlat."
      >
        <textarea rows="7" maxLength={4000} {...register("aciklama")} />
      </FormAlani>

      <div className="iki-sutun">
        <div>
          <FormAlani
            id="takimBuyuklugu"
            etiket="Takım büyüklüğü (sen dahil)"
            hata={errors.takimBuyuklugu}
          >
            <input type="number" min="2" max="10" {...register("takimBuyuklugu", { valueAsNumber: true })} />
          </FormAlani>
        </div>
        <div>
          <FormAlani id="sureHafta" etiket="Tahmini süre (hafta)" hata={errors.sureHafta} ipucu="İsteğe bağlı">
            <input type="number" min="1" max="52" {...register("sureHafta", { valueAsNumber: true })} />
          </FormAlani>
        </div>
      </div>

      <label htmlFor="beceri">Gerekli beceriler</label>
      <BeceriSecici
        id="beceri"
        tumBeceriler={tumBeceriler}
        secili={beceriler}
        onChange={setBeceriler}
        seviyeli={false}
      />
      {beceriHatasi && (
        <small className="ipucu alan-hatasi" role="alert">
          {beceriHatasi}
        </small>
      )}

      <div className="buton-satiri ust-bosluk">
        <button type="submit" className="buton" disabled={isSubmitting}>
          {isSubmitting ? "Kaydediliyor..." : proje ? "Değişiklikleri Kaydet" : "Projeyi Oluştur"}
        </button>
        <Link to={proje ? `/projeler/${proje.id}` : "/projeler"} className="buton buton-cizgili">
          Vazgeç
        </Link>
      </div>
    </form>
  );
}

export default function ProjeFormu() {
  const { id } = useParams();
  const { profil } = useOturum();
  const tumBeceriler = useQuery({ queryKey: ["beceriler"], queryFn: becerileriGetir });
  const proje = useQuery({ queryKey: ["proje", id], queryFn: () => projeGetir(id), enabled: Boolean(id) });

  const aktif = profil && !profil.askida && (profil.rol !== "mentor" || profil.mentorDurumu === "approved");

  if (tumBeceriler.isPending || (id && proje.isPending)) {
    return <div className="kapsayici"><Yukleniyor /></div>;
  }
  if (tumBeceriler.isError || proje.isError) {
    return <div className="kapsayici"><HataMesaji hata={tumBeceriler.error ?? proje.error} /></div>;
  }
  if (id && proje.data.sahipId !== profil?.id && profil?.rol !== "admin") {
    return <Navigate to={`/projeler/${id}`} replace />;
  }

  return (
    <div className="kapsayici dar-sayfa">
      <div className="sayfa-baslik">
        <h1>{id ? "Projeyi Düzenle" : "Yeni Proje"}</h1>
        <p>
          {id
            ? "Proje bilgilerini ve aradığın becerileri güncelle."
            : "Projeni anlat; becerileri uyan öğrencilere önerilsin."}
        </p>
      </div>
      {!aktif && !id ? (
        <p className="bilgi-kutusu">
          Proje oluşturabilmek için hesabının aktif olması gerekiyor. Mentör hesapları yönetici
          onayından sonra proje açabilir.
        </p>
      ) : (
        <Form proje={id ? proje.data : null} tumBeceriler={tumBeceriler.data} />
      )}
    </div>
  );
}
