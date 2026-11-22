import { supabase, sonuc } from "../lib/supabase";

function basvuruyuDonustur(satir) {
  return {
    id: satir.id,
    mesaj: satir.message,
    durum: satir.status,
    olusturulma: satir.created_at,
    karar: satir.decided_at,
    ogrenci: satir.student
      ? {
          id: satir.student.id,
          adSoyad: satir.student.full_name,
          bolum: satir.student.department,
          sinif: satir.student.class_year,
          beceriler: (satir.student.profile_skills ?? []).map((ps) => ({
            id: ps.skills.id,
            ad: ps.skills.name,
            seviye: ps.level,
          })),
        }
      : null,
    proje: satir.project
      ? { id: satir.project.id, baslik: satir.project.title, durum: satir.project.status }
      : null,
  };
}

export async function basvuruGonder(projeId, ogrenciId, mesaj) {
  sonuc(
    await supabase
      .from("applications")
      .insert({ project_id: projeId, student_id: ogrenciId, message: mesaj }),
  );
}

// durum: "accepted" | "rejected" | "withdrawn"
export async function basvuruDurumuDegistir(id, durum) {
  const satirlar = sonuc(
    await supabase.from("applications").update({ status: durum }).eq("id", id).select("id"),
  );
  if (!satirlar.length) throw new Error("Bu işlem için yetkin yok.");
}

// Proje liderinin gördüğü başvurular (başvuranın becerileriyle)
export async function projeBasvurulari(projeId) {
  const satirlar = sonuc(
    await supabase
      .from("applications")
      .select(
        `id, message, status, created_at, decided_at,
         student:profiles!applications_student_id_fkey(id, full_name, department, class_year,
           profile_skills(level, skills(id, name)))`,
      )
      .eq("project_id", projeId)
      .order("created_at", { ascending: false }),
  );
  return satirlar.map(basvuruyuDonustur);
}

// Öğrencinin kendi başvuruları
export async function benimBasvurularim(ogrenciId) {
  const satirlar = sonuc(
    await supabase
      .from("applications")
      .select("id, message, status, created_at, decided_at, project:projects(id, title, status)")
      .eq("student_id", ogrenciId)
      .order("created_at", { ascending: false }),
  );
  return satirlar.map(basvuruyuDonustur);
}
