// Veritabanı testleri için Supabase benzeri ortam.
// Docker gerektirmez: PGlite (WebAssembly ile çalışan PostgreSQL) üzerinde
// supabase/migrations içindeki SQL dosyalarını sırayla çalıştırır.
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const GOC_KLASORU = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

// Supabase'de hazır gelen parçaların en küçük taklidi
const SUPABASE_TAKLIDI = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique,
    raw_user_meta_data jsonb,
    created_at timestamptz default now()
  );
  -- Supabase'de auth.uid(), istekteki JWT'nin "sub" alanını döndürür
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;

  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated;

  create publication supabase_realtime;
`;

export async function veritabaniOlustur() {
  const db = new PGlite();
  await db.exec(SUPABASE_TAKLIDI);
  for (const dosya of readdirSync(GOC_KLASORU).filter((d) => d.endsWith(".sql")).sort()) {
    try {
      await db.exec(readFileSync(join(GOC_KLASORU, dosya), "utf8"));
    } catch (e) {
      throw new Error(`${dosya} çalıştırılamadı: ${e.message}`);
    }
  }
  return db;
}

// Supabase Auth'a kayıt olmayı taklit eder (auth.users'a ekleme -> profil tetikleyicisi)
export async function kullaniciEkle(db, eposta, meta) {
  const { rows } = await db.query(
    "insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id",
    [eposta, meta],
  );
  return rows[0].id;
}

// Sorguyu, API'den gelen bir istek gibi çalıştırır:
// kullaniciId verilirse "authenticated" rolüyle, null ise ziyaretçi ("anon") olarak.
export async function olarak(db, kullaniciId, sql, parametreler = []) {
  return db.transaction(async (tx) => {
    await tx.query(`set local role ${kullaniciId ? "authenticated" : "anon"}`);
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [kullaniciId ?? ""]);
    return tx.query(sql, parametreler);
  });
}

// Yönetici paneli / SQL editörü gibi tam yetkili işlem
export async function yonetimle(db, sql, parametreler = []) {
  return db.query(sql, parametreler);
}

export const ogrenciMeta = (ad, ek = {}) => ({
  role: "student",
  full_name: ad,
  department: "Bilgisayar Mühendisliği",
  class_year: "3",
  ...ek,
});

export const mentorMeta = (ad, ek = {}) => ({
  role: "mentor",
  full_name: ad,
  title: "Yazılım Mühendisi",
  expertise: "Web Geliştirme",
  experience_years: 5,
  mentor_capacity: 2,
  ...ek,
});

// Mentörü yönetici onaylamış gibi işaretler
export async function mentoruOnayla(db, mentorId) {
  await db.query("update public.profiles set mentor_status = 'approved' where id = $1", [mentorId]);
}

export async function beceriId(db, ad) {
  const { rows } = await db.query("select id from public.skills where name = $1", [ad]);
  return rows[0].id;
}
