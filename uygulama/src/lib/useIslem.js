import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

// Butonlara bağlanan işlemler için: çalışırken butonu kilitler, sonucu bildirir,
// başarılı olursa ekrandaki verileri yeniler.
export function useIslem() {
  const queryClient = useQueryClient();
  const [calisiyor, setCalisiyor] = useState(false);

  async function calistir(islem, basariMesaji) {
    setCalisiyor(true);
    try {
      await islem();
      if (basariMesaji) toast.success(basariMesaji);
      await queryClient.invalidateQueries();
      return true;
    } catch (e) {
      toast.error(e.message);
      return false;
    } finally {
      setCalisiyor(false);
    }
  }

  return { calistir, calisiyor };
}
