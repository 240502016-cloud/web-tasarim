import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { projeGetir, uyeCikar } from "../api/projeler";
import { useOturum } from "../baglam/OturumBaglami";
import { HataMesaji, Yukleniyor } from "../bilesenler/Durumlar";
import BasvuruKutusu from "../bilesenler/proje/BasvuruKutusu";
import BasvuruListesi from "../bilesenler/proje/BasvuruListesi";
import ProjeYonetimi from "../bilesenler/proje/ProjeYonetimi";
import { MentorOnerileri, OgrenciOnerileri } from "../bilesenler/proje/Oneriler";
import MentorTalepleri from "../bilesenler/proje/MentorTalepleri";
import Gorusmeler from "../bilesenler/proje/Gorusmeler";
import TakimSohbeti from "../bilesenler/proje/TakimSohbeti";
import { DURUM_SINIFI, DURUM_YAZISI, basHarfler } from "../lib/metin";
import { useIslem } from "../lib/useIslem";
import SikayetDugmesi from "../bilesenler/SikayetDugmesi";

export default function ProjeDetay() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { kullanici, profil } = useOturum();
  const { calistir, calisiyor } = useIslem();
  const sorgu = useQuery({ queryKey: ["proje", id], queryFn: () => projeGetir(id) });

  if (sorgu.isPending)
    return (
      <div className="kapsayici">
        <Yukleniyor />
      </div>
    );
  if (sorgu.isError)
    return (
      <div className="kapsayici">
        <HataMesaji hata={sorgu.error} />
      </div>
    );

  const proje = sorgu.data;
  const bosYer = Math.max(0, proje.takimBuyuklugu - proje.uyeSayisi);

  // Giriş yapan kullanıcının bu projedeki rolü
  const sahip = Boolean(profil) && profil.id === proje.sahipId;
  const uye = Boolean(profil) && proje.uyeler.some((u) => u.id === profil.id && u.rol === "member");
  const ogrenci = profil?.rol === "student";
  const projeMentoru = Boolean(profil) && proje.mentorId === profil.id;
  const ekipte = sahip || uye || projeMentoru;

  async function uyeyiCikar(u) {
    if (!window.confirm(`${u.adSoyad} takımdan çıkarılsın mı?`)) return;
    await calistir(() => uyeCikar(proje.id, u.id), "Üye takımdan çıkarıldı.");
  }

  async function ayril() {
    if (!window.confirm("Bu projeden ayrılmak istediğine emin misin?")) return;
    if (await calistir(() => uyeCikar(proje.id, profil.id), "Projeden ayrıldın."))
      navigate("/panelim");
  }

  return (
    <div className="kapsayici">
      <nav className="konum" aria-label="Bulunduğunuz yer">
        <Link to="/projeler">Projeler</Link>
        <span aria-hidden="true">/</span>
        <span>{proje.baslik}</span>
      </nav>

      <div className="detay-duzeni">
        <article className="detay-icerik">
          <span className={`durum ${DURUM_SINIFI[proje.durum]}`}>{DURUM_YAZISI[proje.durum]}</span>
          <h1>{proje.baslik}</h1>
          <p className="ozet metin-satirlari">{proje.aciklama}</p>

          <section className="bolum">
            <h2>Gerekli Beceriler</h2>
            <div className="etiketler">
              {proje.beceriler.map((b) => (
                <span key={b.id}>{b.ad}</span>
              ))}
            </div>
          </section>

          <section className="bolum">
            <h2>Proje Bilgileri</h2>
            <dl className="bilgi-listesi">
              {proje.sureHafta && (
                <>
                  <dt>Tahmini süre</dt>
                  <dd>{proje.sureHafta} hafta</dd>
                </>
              )}
              <dt>Oluşturulma</dt>
              <dd>{format(new Date(proje.olusturulma), "d MMMM yyyy", { locale: tr })}</dd>
              {proje.sahip && (
                <>
                  <dt>Proje lideri</dt>
                  <dd>{proje.sahip.adSoyad}</dd>
                </>
              )}
            </dl>
          </section>

          <section className="bolum">
            <h2>Takım</h2>
            <ul className="kisi-listesi">
              {proje.uyeler.map((u) => (
                <li key={u.id}>
                  <span className="avatar" aria-hidden="true">
                    {u.adSoyad ? basHarfler(u.adSoyad) : "?"}
                  </span>
                  <div className="esnek-buyu">
                    <strong>{u.adSoyad ?? "Takım üyesi"}</strong>
                    <small>
                      {u.rol === "leader" ? "Proje lideri" : "Üye"}
                      {u.bolum && ` · ${u.bolum}`}
                      {u.sinif && `, ${u.sinif}. sınıf`}
                    </small>
                  </div>
                  {sahip && u.rol === "member" && (
                    <button
                      type="button"
                      className="metin-dugmesi tehlike"
                      disabled={calisiyor}
                      onClick={() => uyeyiCikar(u)}
                    >
                      Çıkar
                    </button>
                  )}
                </li>
              ))}
              {bosYer > 0 && (
                <li className="bos-yer">
                  <span className="avatar" aria-hidden="true">
                    +
                  </span>
                  <div>
                    <strong>Boş yer</strong>
                    <small>{bosYer} kişi daha aranıyor</small>
                  </div>
                </li>
              )}
            </ul>
          </section>

          <section className="bolum">
            <h2>Mentör</h2>
            {proje.mentor ? (
              <ul className="kisi-listesi">
                <li>
                  <span className="avatar" aria-hidden="true">
                    {basHarfler(proje.mentor.adSoyad)}
                  </span>
                  <div>
                    <strong>
                      <Link to={`/mentorler/${proje.mentor.id}`}>{proje.mentor.adSoyad}</Link>
                    </strong>
                    <small>{proje.mentor.unvan}</small>
                  </div>
                </li>
              </ul>
            ) : (
              <p className="soluk">Bu projenin henüz mentörü yok.</p>
            )}
            {sahip && <MentorTalepleri proje={proje} />}
          </section>

          {sahip && <BasvuruListesi proje={proje} />}
          {sahip && !proje.mentor && proje.durum !== "completed" && proje.durum !== "cancelled" && (
            <MentorOnerileri
              proje={proje}
              eylem={(m) => (
                <Link to={`/mentorler/${m.id}?proje=${proje.id}`} className="buton buton-kucuk">
                  Talep Gönder
                </Link>
              )}
            />
          )}
          {sahip && proje.durum === "open" && bosYer > 0 && <OgrenciOnerileri proje={proje} />}
          {ekipte && (
            <Gorusmeler proje={proje} profil={profil} planlayabilir={sahip || projeMentoru} />
          )}
          {ekipte && <TakimSohbeti proje={proje} profil={profil} />}
        </article>

        <aside className="panel yan-kutu">
          <h2>Takım Doluluğu</h2>
          <progress value={proje.uyeSayisi} max={proje.takimBuyuklugu}>
            {proje.uyeSayisi} / {proje.takimBuyuklugu}
          </progress>
          <p className="soluk">
            <strong>
              {proje.uyeSayisi} / {proje.takimBuyuklugu}
            </strong>{" "}
            kişi &middot; {bosYer > 0 ? `${bosYer} yer boş` : "takım dolu"}
          </p>

          {!kullanici && (
            <p className="bilgi-kutusu">
              Başvurmak için{" "}
              <Link to="/giris" state={{ geri: `/projeler/${proje.id}` }}>
                giriş yap
              </Link>
              .
            </p>
          )}

          {sahip && <ProjeYonetimi proje={proje} />}
          {ogrenci && !sahip && !uye && <BasvuruKutusu proje={proje} profil={profil} />}
          {profil && !sahip && (
            <div className="ust-bosluk">
              <SikayetDugmesi profil={profil} tur="project" hedefId={proje.id} />
            </div>
          )}
          {uye && (
            <div className="ayrik-form">
              <p>Bu projenin takımındasın.</p>
              <button
                type="button"
                className="metin-dugmesi tehlike"
                onClick={ayril}
                disabled={calisiyor}
              >
                Projeden ayrıl
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
