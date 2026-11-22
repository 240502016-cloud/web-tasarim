import { supabase, sonuc } from "../lib/supabase";

function mentoruDonustur(satir) {
  return {
    id: satir.id,
    adSoyad: satir.full_name,
    unvan: satir.title,
    uzmanlik: satir.expertise,
    deneyimYili: satir.experience_years,
    hakkinda: satir.bio,
    kapasite: satir.mentor_capacity,
    aktifProje: satir.active_projects,
    beceriler: satir.skills.map((b) => ({ id: b.id, ad: b.name, seviye: b.level })),
  };
}

// Onaylı mentörler. Ziyaretçiler için RLS nedeniyle boş liste döner.
export async function mentorleriGetir() {
  return sonuc(await supabase.rpc("list_mentors")).map(mentoruDonustur);
}

export async function mentorGetir(id) {
  const satirlar = sonuc(await supabase.rpc("list_mentors", { p_mentor: id }));
  if (!satirlar.length) throw new Error("Mentör bulunamadı.");
  return mentoruDonustur(satirlar[0]);
}

// Mentörün yürüttüğü projeler
export async function mentorunProjeleri(id) {
  const satirlar = sonuc(
    await supabase
      .from("projects")
      .select("id, title, status, team_size, project_members(count)")
      .eq("mentor_id", id)
      .in("status", ["open", "in_progress", "completed"])
      .order("created_at", { ascending: false }),
  );
  return satirlar.map((p) => ({
    id: p.id,
    baslik: p.title,
    durum: p.status,
    takimBuyuklugu: p.team_size,
    uyeSayisi: p.project_members[0]?.count ?? 0,
  }));
}
