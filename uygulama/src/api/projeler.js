import { supabase, sonuc } from "../lib/supabase";

// Ziyaretçiler profil tablosunu okuyamadığı için sahip/mentör bilgisi onlara boş (null) gelir
const LISTE_ALANLARI = `
  id, title, description, status, team_size, duration_weeks, created_at, owner_id, mentor_id,
  owner:profiles!projects_owner_id_fkey(id, full_name, department),
  mentor:profiles!projects_mentor_id_fkey(id, full_name, title),
  project_skills(skills(id, name)),
  project_members(profile_id, member_role, joined_at,
    profile:profiles(id, full_name, department, class_year))
`;

export function projeyiDonustur(satir) {
  const uyeler = (satir.project_members ?? [])
    .map((u) => ({
      id: u.profile_id,
      rol: u.member_role,
      katilma: u.joined_at,
      adSoyad: u.profile?.full_name ?? null,
      bolum: u.profile?.department ?? null,
      sinif: u.profile?.class_year ?? null,
    }))
    .sort((a, b) => (a.rol === "leader" ? -1 : b.rol === "leader" ? 1 : a.katilma.localeCompare(b.katilma)));

  return {
    id: satir.id,
    baslik: satir.title,
    aciklama: satir.description,
    durum: satir.status,
    takimBuyuklugu: satir.team_size,
    sureHafta: satir.duration_weeks,
    olusturulma: satir.created_at,
    sahipId: satir.owner_id,
    mentorId: satir.mentor_id,
    sahip: satir.owner ? { id: satir.owner.id, adSoyad: satir.owner.full_name, bolum: satir.owner.department } : null,
    mentor: satir.mentor ? { id: satir.mentor.id, adSoyad: satir.mentor.full_name, unvan: satir.mentor.title } : null,
    beceriler: (satir.project_skills ?? [])
      .map((ps) => ({ id: ps.skills.id, ad: ps.skills.name }))
      .sort((a, b) => a.ad.localeCompare(b.ad, "tr")),
    uyeler,
    uyeSayisi: uyeler.length,
  };
}

export async function projeleriGetir() {
  const satirlar = sonuc(
    await supabase.from("projects").select(LISTE_ALANLARI).order("created_at", { ascending: false }),
  );
  return satirlar.map(projeyiDonustur);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function projeGetir(id) {
  if (!UUID.test(id)) throw new Error("Proje bulunamadı.");
  const satir = sonuc(await supabase.from("projects").select(LISTE_ALANLARI).eq("id", id).maybeSingle());
  if (!satir) throw new Error("Proje bulunamadı.");
  return projeyiDonustur(satir);
}

// Bir kullanıcının üyesi ya da mentörü olduğu projeler
export async function kullanicininProjeleri(kullaniciId) {
  const uyelikler = sonuc(
    await supabase.from("project_members").select("project_id").eq("profile_id", kullaniciId),
  );
  const idler = uyelikler.map((u) => u.project_id);
  const filtre = idler.length
    ? `id.in.(${idler.join(",")}),mentor_id.eq.${kullaniciId}`
    : `mentor_id.eq.${kullaniciId}`;
  const satirlar = sonuc(
    await supabase.from("projects").select(LISTE_ALANLARI).or(filtre).order("created_at", { ascending: false }),
  );
  return satirlar.map(projeyiDonustur);
}
