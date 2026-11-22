import { supabase, sonuc } from "../lib/supabase";
import { LISTE_ALANLARI, projeyiDonustur } from "./projeler";

function aciklama(satir) {
  return {
    puan: satir.score,
    uyanlar: satir.matched_skills,
    eksikler: satir.missing_skills ?? [],
    gerekliSayisi: satir.required_count,
  };
}

// Öğrenciye önerilen projeler, puan ve açıklamasıyla
export async function onerilenProjeler() {
  const oneriler = sonuc(await supabase.rpc("match_projects_for_student", { p_limit: 6 }));
  if (!oneriler.length) return [];

  const projeler = sonuc(
    await supabase.from("projects").select(LISTE_ALANLARI).in("id", oneriler.map((o) => o.project_id)),
  ).map(projeyiDonustur);

  return oneriler
    .map((o) => ({ proje: projeler.find((p) => p.id === o.project_id), ...aciklama(o) }))
    .filter((o) => o.proje);
}

export async function mentorOnerileri(projeId) {
  return sonuc(await supabase.rpc("match_mentors_for_project", { p_project: projeId })).map((m) => ({
    id: m.mentor_id,
    adSoyad: m.full_name,
    unvan: m.title,
    uzmanlik: m.expertise,
    aktifProje: m.active_projects,
    kapasite: m.mentor_capacity,
    ...aciklama(m),
  }));
}

export async function ogrenciOnerileri(projeId) {
  return sonuc(await supabase.rpc("match_students_for_project", { p_project: projeId })).map((o) => ({
    id: o.student_id,
    adSoyad: o.full_name,
    bolum: o.department,
    sinif: o.class_year,
    ...aciklama(o),
  }));
}
