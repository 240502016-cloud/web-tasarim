import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { basvuruDurumuDegistir, basvuruGonder, benimBasvurularim } from "../../api/basvurular";
import { BASVURU_DURUMU, basvuruSemasi } from "../../lib/dogrulama";
import { useIslem } from "../../lib/useIslem";
import FormAlani from "../FormAlani";

// Öğrencinin proje sayfasındaki başvuru alanı
export default function BasvuruKutusu({ proje, profil }) {
  const { calistir, calisiyor } = useIslem();
  const basvurular = useQuery({
    queryKey: ["basvurularim", profil.id],
    queryFn: () => benimBasvurularim(profil.id),
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(basvuruSemasi) });

  if (basvurular.isPending) return null;

  // Bu projeye yapılan en son başvuru
  const sonBasvuru = basvurular.data?.find((b) => b.proje?.id === proje.id);
  const dolu = proje.uyeSayisi >= proje.takimBuyuklugu;

  if (sonBasvuru?.durum === "pending") {
    return (
      <div className="ayrik-form">
        <h2>Başvurun</h2>
        <p>
          Durum: <span className="durum durum-devam">{BASVURU_DURUMU.pending}</span>
        </p>
        <p className="soluk metin-satirlari">“{sonBasvuru.mesaj}”</p>
        <button
          type="button"
          className="buton buton-cizgili buton-tam"
          disabled={calisiyor}
          onClick={() =>
            calistir(
              () => basvuruDurumuDegistir(sonBasvuru.id, "withdrawn"),
              "Başvurun geri çekildi.",
            )
          }
        >
          Başvuruyu Geri Çek
        </button>
      </div>
    );
  }

  if (proje.durum !== "open" || dolu) {
    return (
      <p className="bilgi-kutusu ust-bosluk">
        {dolu ? "Takım dolu, bu projeye şu an başvuru alınmıyor." : "Bu proje başvuruya kapalı."}
      </p>
    );
  }

  async function gonder(veri) {
    const tamam = await calistir(
      () => basvuruGonder(proje.id, profil.id, veri.mesaj),
      "Başvurun gönderildi. Proje lideri değerlendirdiğinde bildirim alacaksın.",
    );
    if (tamam) reset();
  }

  return (
    <form className="form ayrik-form" onSubmit={handleSubmit(gonder)} noValidate>
      <h2>Projeye Başvur</h2>
      {sonBasvuru?.durum === "rejected" && (
        <p className="soluk">Önceki başvurun reddedildi. İstersen yeniden başvurabilirsin.</p>
      )}
      <FormAlani
        id="mesaj"
        etiket="Neden bu projede yer almak istiyorsun?"
        hata={errors.mesaj}
        ipucu="Becerilerini ve projeye nasıl katkı sağlayacağını kısaca anlat."
      >
        <textarea rows="5" maxLength={1000} {...register("mesaj")} />
      </FormAlani>
      <p className="ipucu">
        Başvurduğunda adın, bölümün ve becerilerin proje lideriyle paylaşılır.
      </p>
      <button type="submit" className="buton buton-tam" disabled={calisiyor}>
        {calisiyor ? "Gönderiliyor..." : "Başvuruyu Gönder"}
      </button>
    </form>
  );
}
