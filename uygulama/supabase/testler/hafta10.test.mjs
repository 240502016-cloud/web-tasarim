// Hafta 10: kayıt kuralları, profil koruması ve RLS politikaları
import { test, before } from "node:test";
import assert from "node:assert/strict";
import {
  veritabaniOlustur,
  kullaniciEkle,
  olarak,
  ogrenciMeta,
  mentorMeta,
  mentoruOnayla,
  beceriId,
} from "./ortam.mjs";

let db, ogrenci, digerOgrenci, mentor, bekleyenMentor;

before(async () => {
  db = await veritabaniOlustur();
  ogrenci = await kullaniciEkle(db, "ayse@ogr.kocaelisaglik.edu.tr", ogrenciMeta("Ayşe Yılmaz"));
  digerOgrenci = await kullaniciEkle(
    db,
    "mehmet@ogr.kocaelisaglik.edu.tr",
    ogrenciMeta("Mehmet Kaya"),
  );
  mentor = await kullaniciEkle(db, "mentor@ornek.com", mentorMeta("Deniz Mentör"));
  bekleyenMentor = await kullaniciEkle(db, "yeni@ornek.com", mentorMeta("Yeni Mentör"));
  await mentoruOnayla(db, mentor);
});

test("öğrenci .edu.tr olmayan e-postayla kayıt olamaz", async () => {
  await assert.rejects(
    kullaniciEkle(db, "ogrenci@gmail.com", ogrenciMeta("Gmail Öğrenci")),
    /\.edu\.tr/,
  );
});

test("kayıtta profil oluşur; mentör beklemede başlar", async () => {
  const { rows } = await db.query(
    "select id, role, mentor_status, department from public.profiles where id = any($1) order by role",
    [[ogrenci, bekleyenMentor]],
  );
  const o = rows.find((r) => r.id === ogrenci);
  const m = rows.find((r) => r.id === bekleyenMentor);
  assert.equal(o.role, "student");
  assert.equal(o.department, "Bilgisayar Mühendisliği");
  assert.equal(m.role, "mentor");
  assert.equal(m.mentor_status, "pending");
});

test("kayıtta 'admin' rolü seçilemez", async () => {
  const id = await kullaniciEkle(db, "sahte@ogr.x.edu.tr", ogrenciMeta("Sahte", { role: "admin" }));
  const { rows } = await db.query("select role from public.profiles where id = $1", [id]);
  assert.equal(rows[0].role, "student");
});

test("kullanıcı kendi rolünü ve onay durumunu değiştiremez", async () => {
  await olarak(
    db,
    bekleyenMentor,
    "update public.profiles set role = 'admin', mentor_status = 'approved', full_name = 'Yeni Ad' where id = $1",
    [bekleyenMentor],
  );
  const { rows } = await db.query(
    "select role, mentor_status, full_name from public.profiles where id = $1",
    [bekleyenMentor],
  );
  assert.equal(rows[0].role, "mentor");
  assert.equal(rows[0].mentor_status, "pending");
  assert.equal(rows[0].full_name, "Yeni Ad"); // izin verilen alan değişti
});

test("kullanıcı başkasının profilini değiştiremez", async () => {
  const sonuc = await olarak(
    db,
    digerOgrenci,
    "update public.profiles set full_name = 'Hack' where id = $1",
    [ogrenci],
  );
  assert.equal(sonuc.affectedRows, 0);
});

test("ziyaretçi profilleri göremez, projeleri ve becerileri görebilir", async () => {
  assert.equal((await olarak(db, null, "select * from public.profiles")).rows.length, 0);
  assert.ok((await olarak(db, null, "select * from public.skills")).rows.length > 10);
  await olarak(db, null, "select * from public.projects"); // hata vermemeli
});

test("öğrenci proje oluşturur ve otomatik lider olur", async () => {
  const { rows } = await olarak(
    db,
    ogrenci,
    "insert into public.projects (owner_id, title, description, team_size) values ($1, 'Kütüphane Doluluk Takibi', 'Salonların doluluk oranını gösteren web sitesi.', 3) returning id",
    [ogrenci],
  );
  const uyeler = await db.query(
    "select profile_id, member_role from public.project_members where project_id = $1",
    [rows[0].id],
  );
  assert.deepEqual(uyeler.rows, [{ profile_id: ogrenci, member_role: "leader" }]);
});

test("başkası adına proje oluşturulamaz", async () => {
  await assert.rejects(
    olarak(
      db,
      digerOgrenci,
      "insert into public.projects (owner_id, title, description, team_size) values ($1, 'Sahte proje adı', 'Başkası adına açılmış bir proje açıklaması.', 3)",
      [ogrenci],
    ),
    /row-level security/,
  );
});

test("onay bekleyen mentör proje oluşturamaz", async () => {
  await assert.rejects(
    olarak(
      db,
      bekleyenMentor,
      "insert into public.projects (owner_id, title, description, team_size) values ($1, 'Mentör projesi', 'Onaysız mentörün açmaya çalıştığı proje.', 3)",
      [bekleyenMentor],
    ),
    /row-level security/,
  );
});

test("proje sahibi mentörü kendisi atayamaz; başkası projeyi düzenleyemez", async () => {
  const { rows } = await db.query("select id from public.projects where owner_id = $1", [ogrenci]);
  const projeId = rows[0].id;
  await assert.rejects(
    olarak(db, ogrenci, "update public.projects set mentor_id = $1 where id = $2", [
      mentor,
      projeId,
    ]),
    /mentörlük talebi/,
  );
  const sonuc = await olarak(
    db,
    digerOgrenci,
    "update public.projects set title = 'Değiştirildi' where id = $1",
    [projeId],
  );
  assert.equal(sonuc.affectedRows, 0);
});

test("takım büyüklüğü üye sayısının altına indirilemez", async () => {
  // Proje 3 kişilik; lider + 2 üye ile takım dolu
  const { rows } = await db.query("select id from public.projects where owner_id = $1", [ogrenci]);
  const ucuncu = await kullaniciEkle(db, "ucuncu@ogr.x.edu.tr", ogrenciMeta("Üçüncü Üye"));
  await db.query(
    "insert into public.project_members (project_id, profile_id) values ($1, $2), ($1, $3)",
    [rows[0].id, digerOgrenci, ucuncu],
  );
  await assert.rejects(
    olarak(db, ogrenci, "update public.projects set team_size = 2 where id = $1", [rows[0].id]),
    /küçük olamaz/,
  );
  await db.query("delete from public.project_members where profile_id = $1", [ucuncu]);
});

test("set_my_skills yalnızca kendi becerilerini yazar", async () => {
  const react = await beceriId(db, "React");
  const css = await beceriId(db, "HTML / CSS");
  await olarak(db, ogrenci, "select public.set_my_skills($1)", [
    JSON.stringify([
      { skill_id: react, level: 4 },
      { skill_id: css, level: 5 },
    ]),
  ]);
  await olarak(db, ogrenci, "select public.set_my_skills($1)", [
    JSON.stringify([{ skill_id: react, level: 2 }]),
  ]);
  const { rows } = await db.query(
    "select skill_id, level from public.profile_skills where profile_id = $1",
    [ogrenci],
  );
  assert.deepEqual(rows, [{ skill_id: react, level: 2 }]);
  await assert.rejects(
    olarak(
      db,
      ogrenci,
      "insert into public.profile_skills (profile_id, skill_id, level) values ($1, $2, 3)",
      [digerOgrenci, css],
    ),
    /row-level security/,
  );
});

test("list_mentors yalnızca onaylı mentörleri döndürür; ziyaretçiye boş", async () => {
  const giris = await olarak(
    db,
    ogrenci,
    "select id, active_projects, skills from public.list_mentors()",
  );
  assert.deepEqual(
    giris.rows.map((r) => r.id),
    [mentor],
  );
  assert.equal(giris.rows[0].active_projects, 0);
  const ziyaretci = await olarak(db, null, "select id from public.list_mentors()");
  assert.equal(ziyaretci.rows.length, 0);
});

test("beceri listesini yalnızca yönetici değiştirebilir", async () => {
  await assert.rejects(
    olarak(db, ogrenci, "insert into public.skills (name) values ('Yeni Beceri')"),
    /row-level security/,
  );
  await db.query("update public.profiles set role = 'admin' where id = $1", [digerOgrenci]);
  await olarak(db, digerOgrenci, "insert into public.skills (name) values ('Yeni Beceri')");
  await db.query("update public.profiles set role = 'student' where id = $1", [digerOgrenci]);
});

test("hesap silinince profil ve projeleri de silinir", async () => {
  const id = await kullaniciEkle(db, "silinecek@ogr.x.edu.tr", ogrenciMeta("Silinecek Kişi"));
  await olarak(
    db,
    id,
    "insert into public.projects (owner_id, title, description, team_size) values ($1, 'Silinecek proje', 'Hesap silinince bu proje de gitmeli.', 2)",
    [id],
  );
  await olarak(db, id, "select public.delete_my_account()");
  assert.equal(
    (await db.query("select 1 from public.profiles where id = $1", [id])).rows.length,
    0,
  );
  assert.equal(
    (await db.query("select 1 from public.projects where owner_id = $1", [id])).rows.length,
    0,
  );
  await assert.rejects(olarak(db, null, "select public.delete_my_account()"), /permission denied/);
});
