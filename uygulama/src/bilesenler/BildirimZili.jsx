import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NavLink } from "react-router-dom";
import toast from "react-hot-toast";
import { bildirimleriDinle, okunmamisSayisi } from "../api/bildirimler";
import { bildirimMetni } from "../lib/bildirimMetni";

// Üst menüdeki okunmamış bildirim sayacı; yeni bildirimler anında gelir
export default function BildirimZili({ kullaniciId }) {
  const queryClient = useQueryClient();
  const sayi = useQuery({ queryKey: ["okunmamis", kullaniciId], queryFn: okunmamisSayisi });

  useEffect(() => {
    return bildirimleriDinle(kullaniciId, (yeni) => {
      toast(bildirimMetni(yeni.type, yeni.payload), { icon: "🔔" });
      queryClient.invalidateQueries();
    });
  }, [kullaniciId, queryClient]);

  const adet = sayi.data ?? 0;

  return (
    <NavLink to="/bildirimler" className="bildirim-zili">
      Bildirimler
      {adet > 0 && (
        <span className="sayac" aria-label={`${adet} okunmamış`}>
          {adet > 9 ? "9+" : adet}
        </span>
      )}
    </NavLink>
  );
}
