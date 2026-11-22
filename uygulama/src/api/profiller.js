import { supabase, sonuc } from "../lib/supabase";

// Veritabanı satırını (İngilizce sütun adları) arayüzde kullanılan biçime çevirir
export function profiliDonustur(satir) {
  if (!satir) return null;
  return {
    id: satir.id,
    adSoyad: satir.full_name,
    rol: satir.role,
    bolum: satir.department,
    sinif: satir.class_year,
    unvan: satir.title,
    uzmanlik: satir.expertise,
    deneyimYili: satir.experience_years,
    kapasite: satir.mentor_capacity,
    mentorDurumu: satir.mentor_status,
    hakkinda: satir.bio ?? "",
    askida: satir.is_suspended,
    olusturulma: satir.created_at,
    beceriler: (satir.profile_skills ?? []).map((ps) => ({
      id: ps.skills.id,
      ad: ps.skills.name,
      seviye: ps.level,
    })),
  };
}

const PROFIL_ALANLARI = "*, profile_skills(level, skills(id, name))";

export async function profilGetir(id) {
  const satir = sonuc(
    await supabase.from("profiles").select(PROFIL_ALANLARI).eq("id", id).maybeSingle(),
  );
  return profiliDonustur(satir);
}

export async function profilGuncelle(id, veri) {
  const degisiklik = {
    full_name: veri.adSoyad,
    bio: veri.hakkinda || null,
  };
  if (veri.rol === "student") {
    degisiklik.department = veri.bolum || null;
    degisiklik.class_year = veri.sinif ? Number(veri.sinif) : null;
  } else if (veri.rol === "mentor") {
    degisiklik.title = veri.unvan || null;
    degisiklik.expertise = veri.uzmanlik || null;
    degisiklik.experience_years = veri.deneyimYili;
    degisiklik.mentor_capacity = veri.kapasite;
  }
  sonuc(await supabase.from("profiles").update(degisiklik).eq("id", id));
}

// beceriler: [{ id, seviye }]
export async function becerileriKaydet(beceriler) {
  sonuc(
    await supabase.rpc("set_my_skills", {
      p_skills: beceriler.map((b) => ({ skill_id: b.id, level: b.seviye })),
    }),
  );
}

export async function hesabiSil() {
  sonuc(await supabase.rpc("delete_my_account"));
  await supabase.auth.signOut();
}
