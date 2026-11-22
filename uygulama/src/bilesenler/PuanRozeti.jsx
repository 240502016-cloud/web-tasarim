import { eslesmeAciklamasi, puanSinifi } from "../lib/eslesme";

// "%75 uygun" rozeti ve altında puanın nedeni
export default function PuanRozeti({ oneri, ozne }) {
  return (
    <div className="puan-alani">
      <span className={`puan-rozeti ${puanSinifi(oneri.puan)}`}>%{oneri.puan} uygun</span>
      <small className="soluk">{eslesmeAciklamasi(oneri, ozne)}</small>
      {oneri.eksikler.length > 0 && (
        <small className="soluk">Eksik: {oneri.eksikler.join(", ")}</small>
      )}
    </div>
  );
}
