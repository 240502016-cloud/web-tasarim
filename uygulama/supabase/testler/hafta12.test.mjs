// Hafta 12: eşleştirme fonksiyonları
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

let db, lider, ogrenci, mentorWeb, mentorVeri, mentorDolu, projeWeb, projeVeri, projeMobil;
const b = {};

async function becerileriAyarla(kim, liste) {
  await olarak(db, kim, "select public.set_my_skills($1)", [
    JSON.stringify(liste.map(([ad, seviye]) => ({ skill_id: b[ad], level: seviye }))),
  ]);
}

async function projeAc(baslik, beceriler) {
  const { rows } = await olarak(
    db,
    lider,
    "select public.create_project($1, 'Eşleştirme testi için oluşturulmuş örnek proje.', 4::smallint, null, $2) as id",
    [baslik, beceriler.map((ad) => b[ad])],
  );
  return rows[0].id;
}

before(async () => {
  db = await veritabaniOlustur();
  for (const ad of ["HTML / CSS", "JavaScript", "React", "Python", "Yapay Zeka", "Flutter"]) {
    b[ad] = await beceriId(db, ad);
  }
  lider = await kullaniciEkle(db, "lider@ogr.x.edu.tr", ogrenciMeta("Proje Lideri"));
  ogrenci = await kullaniciEkle(db, "ogrenci@ogr.x.edu.tr", ogrenciMeta("Elif Arslan"));
  mentorWeb = await kullaniciEkle(db, "web@ornek.com", mentorMeta("Web Mentör"));
  mentorVeri = await kullaniciEkle(db, "veri@ornek.com", mentorMeta("Veri Mentör"));
  mentorDolu = await kullaniciEkle(
    db,
    "dolu@ornek.com",
    mentorMeta("Dolu Mentör", { mentor_capacity: 1 }),
  );
  for (const m of [mentorWeb, mentorVeri, mentorDolu]) await mentoruOnayla(db, m);

  // Gereksinim belgesindeki örnek: proje 4 beceri istiyor, öğrenci 3'ünü biliyor
  projeWeb = await projeAc("Web Projesi", ["HTML / CSS", "JavaScript", "React", "Python"]);
  projeVeri = await projeAc("Veri Projesi", ["Python", "Yapay Zeka"]);
  projeMobil = await projeAc("Mobil Projesi", ["Flutter"]);

  await becerileriAyarla(ogrenci, [
    ["HTML / CSS", 4],
    ["JavaScript", 3],
    ["Python", 4],
  ]);
  await becerileriAyarla(mentorWeb, [
    ["HTML / CSS", 5],
    ["JavaScript", 5],
    ["React", 5],
  ]);
  await becerileriAyarla(mentorVeri, [
    ["Python", 5],
    ["Yapay Zeka", 4],
  ]);
  await becerileriAyarla(mentorDolu, [
    ["React", 5],
    ["JavaScript", 5],
  ]);
  // Dolu mentörün kapasitesi (1) başka bir projeyle doldurulur
  await db.query("update public.projects set mentor_id = $1 where id = $2", [
    mentorDolu,
    projeMobil,
  ]);
});

test("öğrenciye uyan projeler puana göre sıralı önerilir, uymayan önerilmez", async () => {
  const { rows } = await olarak(db, ogrenci, "select * from public.match_projects_for_student()");
  assert.deepEqual(
    rows.map((r) => r.project_id),
    [projeWeb, projeVeri],
  );
  // Web: kapsama 3/4, seviye (4+3+4)/3/5 => 100 × (0,525 + 0,22) ≈ 75
  assert.equal(rows[0].score, 75);
  assert.deepEqual(rows[0].matched_skills, ["HTML / CSS", "JavaScript", "Python"]);
  assert.deepEqual(rows[0].missing_skills, ["React"]);
  assert.equal(rows[0].required_count, 4);
  // Veri: kapsama 1/2, seviye 4/5 => 100 × (0,35 + 0,24) = 59
  assert.equal(rows[1].score, 59);
});

test("başvurulan proje öneriden çıkar", async () => {
  await olarak(
    db,
    ogrenci,
    "insert into public.applications (project_id, student_id, message) values ($1, $2, 'Web projesine katılmak istiyorum.')",
    [projeWeb, ogrenci],
  );
  const { rows } = await olarak(
    db,
    ogrenci,
    "select project_id from public.match_projects_for_student()",
  );
  assert.deepEqual(
    rows.map((r) => r.project_id),
    [projeVeri],
  );
});

test("mentörler için proje önerisi boş döner", async () => {
  const { rows } = await olarak(db, mentorWeb, "select * from public.match_projects_for_student()");
  assert.equal(rows.length, 0);
});

test("projeye uygun mentörler önerilir; kapasitesi dolu mentör önerilmez", async () => {
  const { rows } = await olarak(db, lider, "select * from public.match_mentors_for_project($1)", [
    projeWeb,
  ]);
  assert.deepEqual(
    rows.map((r) => r.mentor_id),
    [mentorWeb, mentorVeri],
  );
  // Web mentör: 3/4 beceri, seviye 5 => 100 × (0,525 + 0,3) ≈ 83
  assert.equal(rows[0].score, 83);
  assert.ok(!rows.some((r) => r.mentor_id === mentorDolu));
});

test("öneri fonksiyonlarını yalnızca proje lideri çağırabilir", async () => {
  await assert.rejects(
    olarak(db, ogrenci, "select * from public.match_mentors_for_project($1)", [projeWeb]),
    /yalnızca proje lideri/,
  );
  await assert.rejects(
    olarak(db, ogrenci, "select * from public.match_students_for_project($1)", [projeWeb]),
    /yalnızca proje lideri/,
  );
});

test("lidere projeye uygun öğrenciler önerilir; başvuranlar ve üyeler hariç", async () => {
  const yeni = await kullaniciEkle(db, "yeni@ogr.x.edu.tr", ogrenciMeta("Yeni Öğrenci"));
  await becerileriAyarla(yeni, [
    ["Python", 3],
    ["Yapay Zeka", 2],
  ]);
  const veri = await olarak(db, lider, "select * from public.match_students_for_project($1)", [
    projeVeri,
  ]);
  assert.deepEqual(
    veri.rows.map((r) => r.student_id),
    [yeni, ogrenci],
  );
  // Elif web projesine başvurdu, bu yüzden web projesi için önerilmez
  const web = await olarak(
    db,
    lider,
    "select student_id from public.match_students_for_project($1)",
    [projeWeb],
  );
  assert.ok(!web.rows.some((r) => r.student_id === ogrenci));
});
