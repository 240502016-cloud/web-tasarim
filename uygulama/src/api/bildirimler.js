import { supabase, sonuc } from "../lib/supabase";

export async function bildirimleriGetir() {
  const satirlar = sonuc(
    await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
  );
  return satirlar.map((s) => ({
    id: s.id,
    tur: s.type,
    veri: s.payload,
    okundu: Boolean(s.read_at),
    tarih: s.created_at,
  }));
}

export async function okunmamisSayisi() {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function okunduYap(id) {
  sonuc(
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id),
  );
}

export async function tumunuOkunduYap() {
  sonuc(
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null),
  );
}

// Kullanıcıya yeni bildirim geldiğinde geriCagir çalışır (RLS yalnızca kendi bildirimlerini iletir)
export function bildirimleriDinle(kullaniciId, geriCagir) {
  const kanal = supabase
    .channel(`bildirimler-${kullaniciId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${kullaniciId}`,
      },
      (olay) => geriCagir(olay.new),
    )
    .subscribe();
  return () => supabase.removeChannel(kanal);
}
