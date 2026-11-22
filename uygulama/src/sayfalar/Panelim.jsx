import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useOturum } from "../baglam/OturumBaglami";
import { kullanicininProjeleri } from "../api/projeler";
import { basvuruDurumuDegistir, benimBasvurularim } from "../api/basvurular";
import { onerilenProjeler } from "../api/eslesme";
import { gelenTalepler, talebeYanitVer } from "../api/mentorluk";
import { yaklasanGorusmelerim } from "../api/gorusmeler";
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

function GelenTalepler({ profil }) {
  const { calistir, calisiyor } = useIslem();
  const talepler = useQuery({
    queryKey: ["gelen-talepler", profil.id],
    queryFn: () => gelenTalepler(profil.id),
  });

  if (talepler.isPending) return <Yukleniyor />;
  if (!talepler.data.length) return <BosDurum>Bekleyen mentörlük talebin yok.</BosDurum>;

  return (
    <ul className="basvuru-listesi">
      {talepler.data.map((t) => (
        <li key={t.id} className="basvuru">
          <strong>
            <Link to={`/projeler/${t.proje.id}`} className="icerik-linki">
              {t.proje.baslik}
            </Link>
          </strong>
          <small className="soluk">
            {" "}
            &middot; Proje lideri: {t.proje.sahip?.adSoyad} &middot;{" "}
            {format(new Date(t.olusturulma), "d MMM", { locale: tr })}
          </small>
          <p className="metin-satirlari">{t.mesaj}</p>
          <div className="buton-satiri">
            <button
              type="button"
              className="buton buton-kucuk"
              disabled={calisiyor}
              onClick={() => calistir(() => talebeYanitVer(t.id, true), "Talebi kabul ettin; artık bu projenin mentörüsün.")}
            >
              Kabul Et
            </button>
            <button
              type="button"
              className="buton buton-kucuk buton-cizgili"
              disabled={calisiyor}
              onClick={() => calistir(() => talebeYanitVer(t.id, false), "Talep reddedildi.")}
            >
              Reddet
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function YaklasanGorusmeler() {
  const gorusmeler = useQuery({ queryKey: ["yaklasan-gorusmeler"], queryFn: yaklasanGorusmelerim });
  if (gorusmeler.isPending || !gorusmeler.data?.length) return null;

  return (
    <section className="bolum-blok sol" aria-labelledby="gorusmelerim">
      <h2 id="gorusmelerim">Yaklaşan Görüşmeler</h2>
      <ul className="gorusme-listesi panel">
        {gorusmeler.data.map((g) => (
          <li key={g.id}>
            <div className="esnek-buyu">
              <strong>{format(new Date(g.baslangic), "d MMMM EEEE, HH:mm", { locale: tr })}</strong>
              <small className="soluk">
                <Link to={`/projeler/${g.projeId}`} className="icerik-linki">
                  {g.proje?.baslik}
                </Link>{" "}
                &middot; {g.sureDk} dakika
              </small>
            </div>
            {g.baglanti && (
              <a href={g.baglanti} target="_blank" rel="noopener noreferrer" className="buton buton-kucuk">
                Katıl
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
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

      {profil.rol === "mentor" && profil.mentorDurumu === "approved" && (
        <section className="bolum-blok sol" aria-labelledby="talepler">
          <h2 id="talepler">Gelen Mentörlük Talepleri</h2>
          <GelenTalepler profil={profil} />
        </section>
      )}

      <YaklasanGorusmeler />

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
