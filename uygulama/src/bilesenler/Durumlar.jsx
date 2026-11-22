// Yükleniyor, hata ve boş sonuç durumları için ortak bileşenler

export function Yukleniyor({ metin = "Yükleniyor..." }) {
  return (
    <p className="durum-mesaji" role="status">
      {metin}
    </p>
  );
}

export function HataMesaji({ hata }) {
  return (
    <p className="durum-mesaji hata-mesaji" role="alert">
      {hata?.message || "Bir hata oluştu. Lütfen tekrar deneyin."}
    </p>
  );
}

export function BosDurum({ children }) {
  return <p className="bos-sonuc">{children}</p>;
}
