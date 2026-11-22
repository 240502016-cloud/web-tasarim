import { supabase, sonuc } from "../lib/supabase";

export async function kullanicilariGetir() {
  return sonuc(await supabase.rpc("admin_list_users")).map((k) => ({
    id: k.id,
    eposta: k.email,
    adSoyad: k.full_name,
    rol: k.role,
    mentorDurumu: k.mentor_status,
    unvan: k.title,
    uzmanlik: k.expertise,
    deneyimYili: k.experience_years,
    askida: k.is_suspended,
    kayit: k.created_at,
  }));
}

export async function istatistikleriGetir() {
  return sonuc(await supabase.rpc("admin_stats"));
}

async function profilGuncelle(id, degisiklik) {
  const satirlar = sonuc(
    await supabase.from("profiles").update(degisiklik).eq("id", id).select("id"),
  );
  if (!satirlar.length) throw new Error("Bu işlem için yetkin yok.");
}

export const mentorDurumuAyarla = (id, durum) => profilGuncelle(id, { mentor_status: durum });
export const askiyaAl = (id, askida) => profilGuncelle(id, { is_suspended: askida });

export async function sikayetleriGetir() {
  const satirlar = sonuc(
    await supabase
      .from("reports")
      .select(
        "*, reporter:profiles!reports_reporter_id_fkey(full_name), owner:profiles!reports_snapshot_owner_fkey(id, full_name, is_suspended)",
      )
      .order("created_at", { ascending: false }),
  );
  return satirlar.map((r) => ({
    id: r.id,
    tur: r.target_type,
    hedefId: r.target_id,
    neden: r.reason,
    icerik: r.snapshot,
    durum: r.status,
    tarih: r.created_at,
    sikayetEden: r.reporter?.full_name ?? "Silinmiş kullanıcı",
    sahip: r.owner
      ? { id: r.owner.id, adSoyad: r.owner.full_name, askida: r.owner.is_suspended }
      : null,
  }));
}

export async function sikayetSonuclandir(id, durum) {
  sonuc(
    await supabase
      .from("reports")
      .update({ status: durum, resolved_at: new Date().toISOString() })
      .eq("id", id),
  );
}

// Herhangi bir kullanıcının şikâyet göndermesi (FR-28)
export async function sikayetEt(sikayetEdenId, tur, hedefId, neden) {
  sonuc(
    await supabase
      .from("reports")
      .insert({ reporter_id: sikayetEdenId, target_type: tur, target_id: hedefId, reason: neden }),
  );
}

// Beceri listesi yönetimi (FR-31)
export async function beceriEkle(ad, kategori) {
  sonuc(
    await supabase.from("skills").insert({ name: ad.trim(), category: kategori?.trim() || null }),
  );
}

export async function beceriGuncelle(id, ad, kategori) {
  sonuc(
    await supabase
      .from("skills")
      .update({ name: ad.trim(), category: kategori?.trim() || null })
      .eq("id", id),
  );
}

export async function beceriSil(id) {
  sonuc(await supabase.from("skills").delete().eq("id", id));
}
