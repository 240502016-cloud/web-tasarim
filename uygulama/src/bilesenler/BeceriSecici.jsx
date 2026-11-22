import { useState } from "react";

const SEVIYE_ADLARI = ["", "Başlangıç", "Temel", "Orta", "İyi", "Uzman"];

// Beceri listesinden seçim yapıp her birine 1-5 arası seviye verilen alan.
// seviyeli=false ise (proje becerileri) yalnızca beceri seçilir.
export default function BeceriSecici({ tumBeceriler, secili, onChange, seviyeli = true, id = "beceri" }) {
  const [yeniBeceri, setYeniBeceri] = useState("");
  const [yeniSeviye, setYeniSeviye] = useState(3);

  const secilebilir = tumBeceriler.filter((b) => !secili.some((s) => s.id === b.id));

  function ekle() {
    const beceri = tumBeceriler.find((b) => b.id === Number(yeniBeceri));
    if (!beceri) return;
    onChange([...secili, { id: beceri.id, ad: beceri.ad, seviye: yeniSeviye }]);
    setYeniBeceri("");
  }

  return (
    <div className="beceri-secici">
      <div className="beceri-ekle">
        <select
          id={id}
          value={yeniBeceri}
          onChange={(e) => setYeniBeceri(e.target.value)}
          aria-label="Eklenecek beceri"
        >
          <option value="">Beceri seç...</option>
          {secilebilir.map((b) => (
            <option key={b.id} value={b.id}>
              {b.ad}
            </option>
          ))}
        </select>
        {seviyeli && (
          <select
            value={yeniSeviye}
            onChange={(e) => setYeniSeviye(Number(e.target.value))}
            aria-label="Seviye"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} - {SEVIYE_ADLARI[n]}
              </option>
            ))}
          </select>
        )}
        <button type="button" className="buton buton-kucuk" onClick={ekle} disabled={!yeniBeceri}>
          Ekle
        </button>
      </div>

      {secili.length === 0 ? (
        <p className="soluk">Henüz beceri eklenmedi.</p>
      ) : (
        <ul className="beceri-listesi">
          {secili.map((b) => (
            <li key={b.id}>
              <span>{b.ad}</span>
              {seviyeli && (
                <select
                  value={b.seviye}
                  aria-label={`${b.ad} seviyesi`}
                  onChange={(e) =>
                    onChange(
                      secili.map((s) => (s.id === b.id ? { ...s, seviye: Number(e.target.value) } : s)),
                    )
                  }
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} - {SEVIYE_ADLARI[n]}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                className="metin-dugmesi"
                onClick={() => onChange(secili.filter((s) => s.id !== b.id))}
                aria-label={`${b.ad} becerisini kaldır`}
              >
                Kaldır
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
