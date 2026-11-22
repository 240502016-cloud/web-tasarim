import { Link } from "react-router-dom";

export default function Bulunamadi() {
  return (
    <div className="kapsayici ortala bos-sayfa">
      <h1>Sayfa bulunamadı</h1>
      <p className="soluk">Aradığın sayfa taşınmış ya da hiç var olmamış olabilir.</p>
      <Link to="/" className="buton">
        Ana Sayfaya Dön
      </Link>
    </div>
  );
}
