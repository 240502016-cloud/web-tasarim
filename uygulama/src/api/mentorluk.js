import { supabase, sonuc } from "../lib/supabase";

function talebiDonustur(satir) {
  return {
    id: satir.id,
    mesaj: satir.message,
    durum: satir.status,
    olusturulma: satir.created_at,
    proje: satir.project
      ? {
          id: satir.project.id,
          baslik: satir.project.title,
          sahip: satir.project.owner ? { adSoyad: satir.project.owner.full_name } : null,
        }
      : null,
    mentor: satir.mentor ? { id: satir.mentor.id, adSoyad: satir.mentor.full_name } : null,
  };
}

export async function talepGonder(projeId, mentorId, mesaj) {
  sonuc(
    await supabase
      .from("mentor_requests")
      .insert({ project_id: projeId, mentor_id: mentorId, message: mesaj }),
  );
}

export async function talebeYanitVer(id, kabul) {
  sonuc(await supabase.rpc("respond_mentor_request", { p_request: id, p_accept: kabul }));
}

export async function talebiGeriAl(id) {
  sonuc(await supabase.rpc("cancel_mentor_request", { p_request: id }));
}

// Mentöre gelen bekleyen talepler
export async function gelenTalepler(mentorId) {
  const satirlar = sonuc(
    await supabase
      .from("mentor_requests")
      .select(
        "id, message, status, created_at, project:projects(id, title, owner:profiles!projects_owner_id_fkey(full_name))",
      )
      .eq("mentor_id", mentorId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  );
  return satirlar.map(talebiDonustur);
}

// Proje liderinin gönderdiği talepler
export async function projeTalepleri(projeId) {
  const satirlar = sonuc(
    await supabase
      .from("mentor_requests")
      .select(
        "id, message, status, created_at, mentor:profiles!mentor_requests_mentor_id_fkey(id, full_name)",
      )
      .eq("project_id", projeId)
      .order("created_at", { ascending: false }),
  );
  return satirlar.map(talebiDonustur);
}

// Proje lideri mentörü projeden çıkarır
export async function mentoruCikar(projeId) {
  const satirlar = sonuc(
    await supabase.from("projects").update({ mentor_id: null }).eq("id", projeId).select("id"),
  );
  if (!satirlar.length) throw new Error("Bu işlem için yetkin yok.");
}
