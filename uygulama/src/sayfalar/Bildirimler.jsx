import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { bildirimleriGetir, okunduYap, tumunuOkunduYap } from "../api/bildirimler";
import { bildirimBaglantisi, bildirimMetni } from "../lib/bildirimMetni";
import { useIslem } from "../lib/useIslem";
import { BosDurum, HataMesaji, Yukleniyor } from "../bilesenler/Durumlar";

export default function Bildirimler() {
  const { calistir, calisiyor } = useIslem();
  const queryClient = useQueryClient();
  const bildirimler = useQuery({ queryKey: ["bildirimler"], queryFn: bildirimleriGetir });
  const okunmamis = (bildirimler.data ?? []).filter((b) => !b.okundu).length;

  return (
    <div className="kapsayici dar-sayfa">
      <div className="sayfa-baslik baslik-satiri">
        <div>
          <h1>Bildirimler</h1>
          <p>
            {okunmamis ? `${okunmamis} okunmamış bildirimin var.` : "Tüm bildirimlerini okudun."}
          </p>
        </div>
        {okunmamis > 0 && (
          <button
            type="button"
            className="buton buton-cizgili"
            disabled={calisiyor}
            onClick={() => calistir(tumunuOkunduYap)}
          >
            Tümünü okundu yap
          </button>
        )}
      </div>

      {bildirimler.isPending && <Yukleniyor />}
      {bildirimler.isError && <HataMesaji hata={bildirimler.error} />}
      {bildirimler.data?.length === 0 && <BosDurum>Henüz bildirimin yok.</BosDurum>}

      <ul className="bildirim-listesi">
        {bildirimler.data?.map((b) => (
          <li key={b.id} className={b.okundu ? undefined : "okunmamis"}>
            <Link
              to={bildirimBaglantisi(b.tur, b.veri)}
              onClick={() =>
                !b.okundu && okunduYap(b.id).then(() => queryClient.invalidateQueries())
              }
            >
              {!b.okundu && <span className="ekran-okuyucu">Okunmamış: </span>}
              {bildirimMetni(b.tur, b.veri)}
            </Link>
            <time dateTime={b.tarih} className="soluk">
              {formatDistanceToNow(new Date(b.tarih), { addSuffix: true, locale: tr })}
            </time>
          </li>
        ))}
      </ul>
    </div>
  );
}
