import { supabase, sonuc } from "../lib/supabase";

export async function becerileriGetir() {
  const satirlar = sonuc(await supabase.from("skills").select("id, name, category").order("name"));
  return satirlar.map((s) => ({ id: s.id, ad: s.name, kategori: s.category }));
}
