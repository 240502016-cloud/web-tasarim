import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useOturum } from "../baglam/OturumBaglami";
import { kullanicininProjeleri } from "../api/projeler";
import { basvuruDurumuDegistir, benimBasvurularim } from "../api/basvurular";
import { onerilenProjeler } from "../api/eslesme";
import PuanRozeti from "../bilesenler/PuanRozeti";
import ProjeKarti from "../bilesenler/ProjeKarti";
import { BosDurum, Yukleniyor } from "../bilesenler/Durumlar";
import { BASVURU_DURUMU } from "../lib/dogrulama";
import { useIslem } from "../lib/useIslem";

const BASVURU_SINIFI = {
  pending: "durum-devam",
  accepted: "durum-acik",
  rejected: "durum-bitti",
  withdrawn: "durum-bitti",
};

function Basvurularim({ profil }) {
  const { calistir, calisiyor } = useIslem();
  const basvurular = useQuery({
    queryKey: ["basvurularim", profil.id],
    queryFn: () => benimBasvurularim(profil.id),
  });

  if (basvurular.isPending) return <Yukleniyor />;
  if (!basvurular.data.length) {
    return (
      <BosDurum>
        Henüz bir projeye başvurmadın. <Link to="/projeler">Projelere göz at</Link>.
      </BosDurum>
    );
  }

  return (
    <div className="tablo-kapsayici">
      <table className="tablo">
        <thead>
          <tr>
            <th scope="col">Proje</th>
            <th scope="col">Tarih</th>
            <th scope="col">Durum</th>
            <th scope="col">
              <span className="ekran-okuyucu">İşlem</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {basvurular.data.map((b) => (
            <tr key={b.id}>
              <td>{b.proje ? <Link to={`/projeler/${b.proje.id}`}>{b.proje.baslik}</Link> : "Silinmiş proje"}</td>
              <td>{format(new Date(b.olusturulma), "d MMM yyyy", { locale: tr })}</td>
              <td>
                <span className={`durum ${BASVURU_SINIFI[b.durum]}`}>{BASVURU_DURUMU[b.durum]}</span>
              </td>
              <td>
                {b.durum === "pending" && (
                  <button
                    type="button"
                    className="metin-dugmesi"
                    disabled={calisiyor}
                    onClick={() => calistir(() => basvuruDurumuDegistir(b.id, "withdrawn"), "Başvuru geri çekildi.")}
                  >
                    Geri çek
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Onerilenler({ profil }) {
  const oneriler = useQuery({
    queryKey: ["onerilen-projeler", profil.id],
    queryFn: onerilenProjeler,
  });

  if (oneriler.isPending) return <Yukleniyor />;
  if (!oneriler.data.length) {
    return (
      <BosDurum>
        {profil.beceriler.length
          ? "Şu an becerilerine uyan açık proje yok. Yeni projeler eklendikçe burada görünecek."
          : "Öneri alabilmek için profiline becerilerini ekle."}
      </BosDurum>
    );
  }

  return (
    <div className="izgara">
      {oneriler.data.map((o) => (
        <ProjeKarti key={o.proje.id} proje={o.proje} ek={<PuanRozeti oneri={o} />} />
      ))}
    </div>
  );
}

function Projelerim({ profil }) {
  const projeler = useQuery({
    queryKey: ["projelerim", profil.id],
    queryFn: () => kullanicininProjeleri(profil.id),
  });

  if (projeler.isPending) return <Yukleniyor />;
  if (!projeler.data.length) {
    return <BosDurum>Henüz bir projede yer almıyorsun.</BosDurum>;
  }

  function rolu(p) {
    if (p.sahipId === profil.id) return "Lider";
    if (p.mentorId === profil.id) return "Mentör";
    return "Üye";
  }

  return (
    <div className="izgara">
      {projeler.data.map((p) => (
        <ProjeKarti key={p.id} proje={p} ek={<p className="rol-etiketi">Rolün: {rolu(p)}</p>} />
      ))}
    </div>
  );
}

export default function Panelim() {
  const { profil } = useOturum();
  if (!profil) return <div className="kapsayici"><Yukleniyor /></div>;

  const aktif = !profil.askida && (profil.rol !== "mentor" || profil.mentorDurumu === "approved");

  return (
    <div className="kapsayici">
      <div className="sayfa-baslik baslik-satiri">
        <div>
          <h1>Merhaba, {profil.adSoyad.split(" ")[0]}</h1>
          <p>Projelerin, başvuruların ve sana özel öneriler burada.</p>
        </div>
        {aktif && (
          <Link to="/projeler/yeni" className="buton">
            Proje Oluştur
          </Link>
        )}
      </div>

      {profil.beceriler.length === 0 && profil.rol !== "admin" && (
        <p className="bilgi-kutusu alt-bosluk">
          Henüz beceri eklemedin. Sana uygun projelerin önerilebilmesi için{" "}
          <Link to="/profil">profiline becerilerini ekle</Link>.
        </p>
      )}
      {profil.rol === "mentor" && profil.mentorDurumu === "pending" && (
        <p className="bilgi-kutusu alt-bosluk">Mentör hesabın yönetici onayı bekliyor.</p>
      )}

      {profil.rol === "student" && (
        <section className="bolum-blok sol" aria-labelledby="oneriler">
          <h2 id="oneriler">Sana Önerilen Projeler</h2>
          <p className="soluk">Becerilerine ve seviyelerine göre en uygun açık projeler.</p>
          <Onerilenler profil={profil} />
        </section>
      )}

      <section className="bolum-blok sol" aria-labelledby="projelerim">
        <h2 id="projelerim">Projelerim</h2>
        <Projelerim profil={profil} />
      </section>

      {profil.rol === "student" && (
        <section className="bolum-blok sol" aria-labelledby="basvurularim">
          <h2 id="basvurularim">Başvurularım</h2>
          <Basvurularim profil={profil} />
        </section>
      )}
    </div>
  );
}
