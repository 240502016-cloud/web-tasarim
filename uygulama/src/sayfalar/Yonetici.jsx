import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  askiyaAl,
  beceriEkle,
  beceriGuncelle,
  beceriSil,
  istatistikleriGetir,
  kullanicilariGetir,
  mentorDurumuAyarla,
  sikayetSonuclandir,
  sikayetleriGetir,
} from "../api/yonetici";
import { becerileriGetir } from "../api/beceriler";
import { projeSil } from "../api/projeler";
import { useIslem } from "../lib/useIslem";
import { DURUM_YAZISI, kucukHarf } from "../lib/metin";
import { BosDurum, HataMesaji, Yukleniyor } from "../bilesenler/Durumlar";

const ROL_ADI = { student: "Öğrenci", mentor: "Mentör", admin: "Yönetici" };
const MENTOR_DURUMU = { pending: "Onay bekliyor", approved: "Onaylı", rejected: "Reddedildi" };

function Istatistikler() {
  const s = useQuery({ queryKey: ["istatistik"], queryFn: istatistikleriGetir });
  if (s.isPending) return <Yukleniyor />;
  if (s.isError) return <HataMesaji hata={s.error} />;

  const d = s.data;
  const durumVerisi = Object.entries(DURUM_YAZISI).map(([k, ad]) => ({
    ad,
    sayi: d.projects_by_status[k] ?? 0,
  }));
  const toplamProje = durumVerisi.reduce((t, x) => t + x.sayi, 0);
  const kartlar = [
    ["Öğrenci", d.students],
    ["Onaylı mentör", d.mentors],
    ["Proje", toplamProje],
    ["Eşleşme (kabul edilen başvuru)", d.accepted_applications],
    ["Mentörlü proje", d.mentored_projects],
    ["Açık şikâyet", d.open_reports],
  ];

  return (
    <>
      <div className="istatistik-kartlari">
        {kartlar.map(([ad, deger]) => (
          <div key={ad} className="istatistik">
            <strong>{deger}</strong>
            <span>{ad}</span>
          </div>
        ))}
      </div>
      <div className="grafikler">
        <figure className="panel">
          <figcaption>Duruma göre projeler</figcaption>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={durumVerisi}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="ad" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} width={32} />
              <Tooltip />
              <Bar dataKey="sayi" name="Proje" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </figure>
        <figure className="panel">
          <figcaption>Projelerde en çok aranan beceriler</figcaption>
          {d.top_skills.length === 0 ? (
            <p className="soluk">Henüz veri yok.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={d.top_skills} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Proje sayısı" fill="#7c3aed" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </figure>
      </div>
    </>
  );
}

function Kullanicilar({ sadeceBekleyenMentorler }) {
  const { calistir, calisiyor } = useIslem();
  const [ara, setAra] = useState("");
  const kullanicilar = useQuery({
    queryKey: ["yonetici-kullanicilar"],
    queryFn: kullanicilariGetir,
  });

  if (kullanicilar.isPending) return <Yukleniyor />;
  if (kullanicilar.isError) return <HataMesaji hata={kullanicilar.error} />;

  const metin = kucukHarf(ara.trim());
  const liste = kullanicilar.data.filter((k) =>
    sadeceBekleyenMentorler
      ? k.rol === "mentor" && k.mentorDurumu === "pending"
      : !metin || kucukHarf(k.adSoyad).includes(metin) || kucukHarf(k.eposta).includes(metin),
  );

  return (
    <>
      {!sadeceBekleyenMentorler && (
        <input
          type="search"
          className="alt-bosluk"
          aria-label="Kullanıcı ara"
          placeholder="Ad veya e-posta ile ara..."
          value={ara}
          onChange={(e) => setAra(e.target.value)}
        />
      )}
      {liste.length === 0 ? (
        <BosDurum>
          {sadeceBekleyenMentorler ? "Onay bekleyen mentör yok." : "Kullanıcı bulunamadı."}
        </BosDurum>
      ) : (
        <div className="tablo-kapsayici">
          <table className="tablo">
            <thead>
              <tr>
                <th scope="col">Ad Soyad</th>
                <th scope="col">E-posta</th>
                <th scope="col">Rol</th>
                <th scope="col">Bilgi</th>
                <th scope="col">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {liste.map((k) => (
                <tr key={k.id} className={k.askida ? "askida-satir" : undefined}>
                  <td>
                    {k.adSoyad}
                    {k.askida && <span className="durum durum-bitti">Askıda</span>}
                  </td>
                  <td>{k.eposta}</td>
                  <td>
                    {ROL_ADI[k.rol]}
                    {k.rol === "mentor" && (
                      <small className="soluk"> · {MENTOR_DURUMU[k.mentorDurumu]}</small>
                    )}
                  </td>
                  <td className="kucuk-yazi">
                    {k.rol === "mentor"
                      ? `${k.unvan ?? "-"}, ${k.uzmanlik ?? "-"}, ${k.deneyimYili ?? "?"} yıl`
                      : format(new Date(k.kayit), "d MMM yyyy", { locale: tr })}
                  </td>
                  <td>
                    <div className="buton-satiri">
                      {k.rol === "mentor" && k.mentorDurumu !== "approved" && (
                        <button
                          type="button"
                          className="buton buton-kucuk"
                          disabled={calisiyor}
                          onClick={() =>
                            calistir(
                              () => mentorDurumuAyarla(k.id, "approved"),
                              "Mentör onaylandı.",
                            )
                          }
                        >
                          Onayla
                        </button>
                      )}
                      {k.rol === "mentor" && k.mentorDurumu === "pending" && (
                        <button
                          type="button"
                          className="buton buton-kucuk buton-cizgili"
                          disabled={calisiyor}
                          onClick={() =>
                            calistir(
                              () => mentorDurumuAyarla(k.id, "rejected"),
                              "Mentör başvurusu reddedildi.",
                            )
                          }
                        >
                          Reddet
                        </button>
                      )}
                      {k.rol !== "admin" && (
                        <button
                          type="button"
                          className="metin-dugmesi tehlike"
                          disabled={calisiyor}
                          onClick={() =>
                            calistir(
                              () => askiyaAl(k.id, !k.askida),
                              k.askida ? "Askı kaldırıldı." : "Kullanıcı askıya alındı.",
                            )
                          }
                        >
                          {k.askida ? "Askıyı kaldır" : "Askıya al"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Sikayetler() {
  const { calistir, calisiyor } = useIslem();
  const sikayetler = useQuery({ queryKey: ["sikayetler"], queryFn: sikayetleriGetir });

  if (sikayetler.isPending) return <Yukleniyor />;
  if (sikayetler.isError) return <HataMesaji hata={sikayetler.error} />;
  const acik = sikayetler.data.filter((s) => s.durum === "open");
  if (!acik.length) return <BosDurum>Açık şikâyet yok.</BosDurum>;

  const TUR = { project: "Proje", profile: "Profil", message: "Mesaj" };

  return (
    <ul className="basvuru-listesi">
      {acik.map((s) => (
        <li key={s.id} className="basvuru">
          <p>
            <span className="durum durum-devam">{TUR[s.tur]}</span>{" "}
            <small className="soluk">
              {s.sikayetEden} tarafından ·{" "}
              {format(new Date(s.tarih), "d MMM HH:mm", { locale: tr })}
            </small>
          </p>
          <p>
            <strong>Neden:</strong> {s.neden}
          </p>
          <blockquote className="alinti metin-satirlari">{s.icerik}</blockquote>
          {s.sahip && <p className="kucuk-yazi">İçeriğin sahibi: {s.sahip.adSoyad}</p>}
          <div className="buton-satiri">
            {s.tur === "project" && (
              <>
                <Link to={`/projeler/${s.hedefId}`} className="buton buton-kucuk buton-cizgili">
                  Projeyi gör
                </Link>
                <button
                  type="button"
                  className="buton buton-kucuk buton-tehlike"
                  disabled={calisiyor}
                  onClick={() =>
                    window.confirm("Proje kalıcı olarak kaldırılsın mı?") &&
                    calistir(async () => {
                      await projeSil(s.hedefId);
                      await sikayetSonuclandir(s.id, "resolved");
                    }, "Proje kaldırıldı.")
                  }
                >
                  Projeyi kaldır
                </button>
              </>
            )}
            {s.sahip && !s.sahip.askida && (
              <button
                type="button"
                className="buton buton-kucuk buton-tehlike"
                disabled={calisiyor}
                onClick={() =>
                  calistir(async () => {
                    await askiyaAl(s.sahip.id, true);
                    await sikayetSonuclandir(s.id, "resolved");
                  }, `${s.sahip.adSoyad} askıya alındı.`)
                }
              >
                Sahibini askıya al
              </button>
            )}
            <button
              type="button"
              className="buton buton-kucuk buton-cizgili"
              disabled={calisiyor}
              onClick={() =>
                calistir(() => sikayetSonuclandir(s.id, "dismissed"), "Şikâyet kapatıldı.")
              }
            >
              Sorun yok, kapat
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Beceriler() {
  const { calistir, calisiyor } = useIslem();
  const beceriler = useQuery({ queryKey: ["beceriler"], queryFn: becerileriGetir });
  const [yeni, setYeni] = useState({ ad: "", kategori: "" });
  const [duzenlenen, setDuzenlenen] = useState(null);

  if (beceriler.isPending) return <Yukleniyor />;

  async function ekle(e) {
    e.preventDefault();
    if (await calistir(() => beceriEkle(yeni.ad, yeni.kategori), "Beceri eklendi.")) {
      setYeni({ ad: "", kategori: "" });
    }
  }

  return (
    <>
      <form className="beceri-ekle alt-bosluk" onSubmit={ekle}>
        <input
          aria-label="Beceri adı"
          placeholder="Beceri adı"
          required
          maxLength={40}
          value={yeni.ad}
          onChange={(e) => setYeni({ ...yeni, ad: e.target.value })}
        />
        <input
          aria-label="Kategori"
          placeholder="Kategori"
          maxLength={40}
          value={yeni.kategori}
          onChange={(e) => setYeni({ ...yeni, kategori: e.target.value })}
        />
        <button type="submit" className="buton buton-kucuk" disabled={calisiyor}>
          Ekle
        </button>
      </form>
      <p className="soluk kucuk-yazi">
        Bir beceriyi silmek, onu kullanıcı profillerinden ve projelerden de kaldırır. Aynı becerinin
        farklı yazımlarını birleştirmek için birini yeniden adlandırıp diğerini silebilirsin.
      </p>
      <ul className="beceri-listesi">
        {beceriler.data.map((b) =>
          duzenlenen?.id === b.id ? (
            <li key={b.id}>
              <input
                aria-label="Beceri adı"
                value={duzenlenen.ad}
                onChange={(e) => setDuzenlenen({ ...duzenlenen, ad: e.target.value })}
              />
              <input
                aria-label="Kategori"
                value={duzenlenen.kategori ?? ""}
                onChange={(e) => setDuzenlenen({ ...duzenlenen, kategori: e.target.value })}
              />
              <button
                type="button"
                className="metin-dugmesi"
                disabled={calisiyor}
                onClick={async () => {
                  if (
                    await calistir(
                      () => beceriGuncelle(b.id, duzenlenen.ad, duzenlenen.kategori),
                      "Beceri güncellendi.",
                    )
                  ) {
                    setDuzenlenen(null);
                  }
                }}
              >
                Kaydet
              </button>
            </li>
          ) : (
            <li key={b.id}>
              <span>{b.ad}</span>
              <span className="soluk">{b.kategori}</span>
              <span className="buton-satiri">
                <button type="button" className="metin-dugmesi" onClick={() => setDuzenlenen(b)}>
                  Düzenle
                </button>
                <button
                  type="button"
                  className="metin-dugmesi tehlike"
                  disabled={calisiyor}
                  onClick={() =>
                    window.confirm(`"${b.ad}" becerisi silinsin mi?`) &&
                    calistir(() => beceriSil(b.id), "Beceri silindi.")
                  }
                >
                  Sil
                </button>
              </span>
            </li>
          ),
        )}
      </ul>
    </>
  );
}

const SEKMELER = [
  ["istatistik", "Genel Bakış", Istatistikler],
  ["mentorler", "Mentör Onayları", () => <Kullanicilar sadeceBekleyenMentorler />],
  ["kullanicilar", "Kullanıcılar", () => <Kullanicilar />],
  ["sikayetler", "Şikâyetler", Sikayetler],
  ["beceriler", "Beceriler", Beceriler],
];

export default function Yonetici() {
  const [sekme, setSekme] = useState("istatistik");
  const Icerik = SEKMELER.find(([k]) => k === sekme)[2];

  return (
    <div className="kapsayici">
      <div className="sayfa-baslik">
        <h1>Yönetim Paneli</h1>
        <p>Mentör onayları, kullanıcılar, şikâyetler ve beceri listesi.</p>
      </div>
      <div className="sekmeler" role="tablist" aria-label="Yönetim bölümleri">
        {SEKMELER.map(([k, ad]) => (
          <button
            key={k}
            type="button"
            role="tab"
            id={`sekme-${k}`}
            aria-selected={sekme === k}
            aria-controls="sekme-icerigi"
            className={sekme === k ? "secili" : undefined}
            onClick={() => setSekme(k)}
          >
            {ad}
          </button>
        ))}
      </div>
      <section
        id="sekme-icerigi"
        role="tabpanel"
        aria-labelledby={`sekme-${sekme}`}
        className="ust-bosluk"
      >
        <Icerik />
      </section>
    </div>
  );
}
