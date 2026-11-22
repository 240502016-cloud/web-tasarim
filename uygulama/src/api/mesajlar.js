import { supabase, sonuc } from "../lib/supabase";

export function mesajiDonustur(satir) {
  return {
    id: satir.id,
    gonderenId: satir.sender_id,
    gonderen: satir.sender?.full_name ?? null,
    icerik: satir.content,
    tarih: satir.created_at,
  };
}

// Son 100 mesaj, eskiden yeniye
export async function mesajlariGetir(projeId) {
  const satirlar = sonuc(
    await supabase
      .from("messages")
      .select(
        "id, sender_id, content, created_at, sender:profiles!messages_sender_id_fkey(full_name)",
      )
      .eq("project_id", projeId)
      .order("created_at", { ascending: false })
      .limit(100),
  );
  return satirlar.map(mesajiDonustur).reverse();
}

export async function mesajGonder(projeId, gonderenId, icerik) {
  sonuc(
    await supabase
      .from("messages")
      .insert({ project_id: projeId, sender_id: gonderenId, content: icerik.trim() }),
  );
}

// Projeye yeni mesaj geldiğinde geriCagir çalışır. Dönen fonksiyon aboneliği kapatır.
export function mesajlariDinle(projeId, geriCagir) {
  const kanal = supabase
    .channel(`mesajlar-${projeId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `project_id=eq.${projeId}` },
      (olay) => geriCagir(olay.new),
    )
    .subscribe();
  return () => supabase.removeChannel(kanal);
}
