import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { projeleriGetir } from "../api/projeler";
import ProjeKarti from "../bilesenler/ProjeKarti";

export default function AnaSayfa() {
  const navigate = useNavigate();
  const projeler = useQuery({ queryKey: ["projeler"], queryFn: projeleriGetir });

  const oneCikanlar = (projeler.data ?? [])
    .filter((p) => p.durum === "open" && p.uyeSayisi < p.takimBuyuklugu)
    .slice(0, 3);

  function ara(e) {
    e.preventDefault();
    const metin = new FormData(e.currentTarget).get("ara").trim();
    navigate(metin ? `/projeler?ara=${encodeURIComponent(metin)}` : "/projeler");
  }

  return (
    <>
      <section className="giris">
        <div className="kapsayici">
          <h1>Doğru proje, doğru ekip, doğru mentör</h1>
          <p>
            Öğrencileri ilgi alanlarına uygun projelerle ve deneyimli mentörlerle buluşturan
            eşleştirme platformu.
          </p>
          <form className="arama" onSubmit={ara} role="search">
            <input
              type="search"
              name="ara"
              aria-label="Proje veya beceri ara"
              placeholder="Proje veya beceri ara (ör. web, mobil, yapay zeka)"
            />
            <button type="submit" className="buton">
              Ara
            </button>
          </form>
          <div className="giris-butonlar">
            <Link to="/kayit" className="buton">
              Öğrenci Olarak Katıl
            </Link>
            <Link to="/kayit?rol=mentor" className="buton buton-cizgili">
              Mentör Olarak Katıl
            </Link>
          </div>
        </div>
      </section>

      <div className="kapsayici">
        <section className="bolum-blok">
          <h2>Nasıl Çalışır?</h2>
          <div className="adimlar">
            <div className="adim">
              <span className="adim-no">1</span>
              <h3>Profilini Oluştur</h3>
              <p>Bölümünü ve becerilerini seviyeleriyle birlikte ekle.</p>
            </div>
            <div className="adim">
              <span className="adim-no">2</span>
              <h3>Eşleşmeleri Gör</h3>
              <p>Becerilerine en uygun projeler puanlarıyla birlikte önerilir.</p>
            </div>
            <div className="adim">
              <span className="adim-no">3</span>
              <h3>Projeye Başla</h3>
              <p>Takımına katıl, mentörünle görüş ve projeni geliştir.</p>
            </div>
          </div>
        </section>

        {oneCikanlar.length > 0 && (
          <section className="bolum-blok">
            <h2>Takım Arkadaşı Arayan Projeler</h2>
            <div className="izgara">
              {oneCikanlar.map((p) => (
                <ProjeKarti key={p.id} proje={p} />
              ))}
            </div>
            <p className="tumunu-gor">
              <Link to="/projeler" className="buton buton-cizgili">
                Tüm Projeler
              </Link>
            </p>
          </section>
        )}
      </div>
    </>
  );
}
