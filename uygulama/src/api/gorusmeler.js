import { supabase, sonuc } from "../lib/supabase";

function gorusmeyiDonustur(satir) {
  return {
    id: satir.id,
    projeId: satir.project_id,
    olusturan: satir.created_by,
    baslangic: satir.starts_at,
    sureDk: satir.duration_min,
    baglanti: satir.meeting_url,
    not: satir.note,
    proje: satir.project ? { id: satir.project.id, baslik: satir.project.title } : null,
  };
}

export async function projeGorusmeleri(projeId) {
  const satirlar = sonuc(
    await supabase.from("meetings").select("*").eq("project_id", projeId).order("starts_at"),
  );
  return satirlar.map(gorusmeyiDonustur);
}

// Kullanıcının ekibinde olduğu tüm projelerdeki yaklaşan görüşmeler (RLS süzer)
export async function yaklasanGorusmelerim() {
  const birSaatOnce = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const satirlar = sonuc(
    await supabase
      .from("meetings")
      .select("*, project:projects(id, title)")
      .gte("starts_at", birSaatOnce)
      .order("starts_at")
      .limit(10),
  );
  return satirlar.map(gorusmeyiDonustur);
}

export async function gorusmeEkle(projeId, olusturanId, veri) {
  sonuc(
    await supabase.from("meetings").insert({
      project_id: projeId,
      created_by: olusturanId,
      starts_at: new Date(veri.baslangic).toISOString(),
      duration_min: veri.sureDk,
      meeting_url: veri.baglanti || null,
      note: veri.not || null,
    }),
  );
}

export async function gorusmeSil(id) {
  const satirlar = sonuc(await supabase.from("meetings").delete().eq("id", id).select("id"));
  if (!satirlar.length) throw new Error("Bu görüşmeyi silme yetkin yok.");
}
