// Hafta 11: proje oluşturma ve başvuru akışı
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

let db, lider, ali, veli, can, mentor, projeId;

const basvur = (kim, mesaj = "Bu projede arayüz kısmında çalışmak istiyorum.") =>
  olarak(db, kim, "insert into public.applications (project_id, student_id, message) values ($1, $2, $3) returning id", [projeId, kim, mesaj]);

const durumu = async (id) => (await db.query("select status from public.applications where id = $1", [id])).rows[0].status;

before(async () => {
  db = await veritabaniOlustur();
  lider = await kullaniciEkle(db, "lider@ogr.x.edu.tr", ogrenciMeta("Proje Lideri"));
  ali = await kullaniciEkle(db, "ali@ogr.x.edu.tr", ogrenciMeta("Ali Demir"));
  veli = await kullaniciEkle(db, "veli@ogr.x.edu.tr", ogrenciMeta("Veli Şahin"));
  can = await kullaniciEkle(db, "can@ogr.x.edu.tr", ogrenciMeta("Can Aydın"));
  mentor = await kullaniciEkle(db, "mentor@ornek.com", mentorMeta("Deniz Mentör"));
  await mentoruOnayla(db, mentor);
});

test("create_project projeyi becerileriyle birlikte oluşturur", async () => {
  const beceriler = [await beceriId(db, "React"), await beceriId(db, "JavaScript")];
  const { rows } = await olarak(db, lider, "select public.create_project('Yemekhane Menü Uygulaması', 'Günlük menüyü gösteren ve oylama yapılabilen uygulama.', 3::smallint, 8::smallint, $1) as id", [beceriler]);
  projeId = rows[0].id;
  const b = await db.query("select count(*)::int as n from public.project_skills where project_id = $1", [projeId]);
  assert.equal(b.rows[0].n, 2);
});

test("becerisiz proje oluşturulamaz", async () => {
  await assert.rejects(
    olarak(db, lider, "select public.create_project('Becerisiz proje', 'Hiç beceri seçilmeden açılan proje denemesi.', 3::smallint, null, '{}'::int[])"),
    /En az bir gerekli beceri/,
  );
});

test("update_project yalnızca sahibine izin verir ve becerileri günceller", async () => {
  const css = await beceriId(db, "HTML / CSS");
  await olarak(db, lider, "select public.update_project($1, 'Yemekhane Menü Uygulaması', 'Günlük menüyü gösteren ve oylama yapılabilen web uygulaması.', 3::smallint, 10::smallint, $2)", [projeId, [css]]);
  const b = await db.query("select skill_id from public.project_skills where project_id = $1", [projeId]);
  assert.deepEqual(b.rows.map((r) => r.skill_id), [css]);
  await assert.rejects(
    olarak(db, ali, "select public.update_project($1, 'Ele geçirildi', 'Başkasının projesini değiştirme denemesi.', 3::smallint, 10::smallint, $2)", [projeId, [css]]),
    /yetkin yok/,
  );
});

test("mentör projeye başvuramaz; lider kendi projesine başvuramaz", async () => {
  await assert.rejects(
    olarak(db, mentor, "insert into public.applications (project_id, student_id, message) values ($1, $2, 'Mentör olarak başvuru denemesi')", [projeId, mentor]),
    /yalnızca öğrenciler/,
  );
  await assert.rejects(basvur(lider), /Zaten bu projenin takımındasın/);
});

test("öğrenci başvurur; ikinci kez başvuramaz; başkası adına başvuramaz", async () => {
  await basvur(ali);
  await assert.rejects(basvur(ali), /zaten başvurdun/);
  await assert.rejects(
    olarak(db, veli, "insert into public.applications (project_id, student_id, message) values ($1, $2, 'Başkası adına başvuru')", [projeId, can]),
    /row-level security/,
  );
});

test("başvuruyu yalnızca öğrencinin kendisi ve proje lideri görür", async () => {
  assert.equal((await olarak(db, ali, "select * from public.applications")).rows.length, 1);
  assert.equal((await olarak(db, lider, "select * from public.applications")).rows.length, 1);
  assert.equal((await olarak(db, veli, "select * from public.applications")).rows.length, 0);
});

test("öğrenci başvurusunu kabul edemez; lider kabul edince öğrenci takıma girer", async () => {
  const { rows } = await db.query("select id from public.applications where student_id = $1", [ali]);
  await assert.rejects(
    olarak(db, ali, "update public.applications set status = 'accepted' where id = $1", [rows[0].id]),
    /yalnızca proje lideri/,
  );
  await olarak(db, lider, "update public.applications set status = 'accepted' where id = $1", [rows[0].id]);
  const uye = await db.query("select member_role from public.project_members where project_id = $1 and profile_id = $2", [projeId, ali]);
  assert.equal(uye.rows[0].member_role, "member");
});

test("sonuçlanan başvuru tekrar değiştirilemez", async () => {
  const { rows } = await db.query("select id from public.applications where student_id = $1", [ali]);
  await assert.rejects(
    olarak(db, lider, "update public.applications set status = 'rejected' where id = $1", [rows[0].id]),
    /zaten sonuçlandı/,
  );
});

test("öğrenci bekleyen başvurusunu geri çekebilir; lider geri çekemez", async () => {
  const { rows } = await basvur(veli);
  await assert.rejects(
    olarak(db, lider, "update public.applications set status = 'withdrawn' where id = $1", [rows[0].id]),
    /yalnızca başvuran/,
  );
  await olarak(db, veli, "update public.applications set status = 'withdrawn' where id = $1", [rows[0].id]);
  assert.equal(await durumu(rows[0].id), "withdrawn");
});

test("takım dolunca bekleyen başvurular otomatik reddedilir ve yeni başvuru alınmaz", async () => {
  const veliBasvuru = (await basvur(veli)).rows[0].id; // geri çektikten sonra yeniden başvurabilir
  const canBasvuru = (await basvur(can)).rows[0].id;
  // 3 kişilik takım: lider + Ali + Veli => dolu
  await olarak(db, lider, "update public.applications set status = 'accepted' where id = $1", [veliBasvuru]);
  assert.equal(await durumu(canBasvuru), "rejected");
  await assert.rejects(basvur(can, "Yeniden deniyorum, takımda yer açılmış olabilir."), /Takım dolu/);
});

test("üye projeden ayrılabilir, lider ayrılamaz (lider kaydı silinemez)", async () => {
  await olarak(db, ali, "delete from public.project_members where project_id = $1 and profile_id = $2", [projeId, ali]);
  const r = await olarak(db, lider, "delete from public.project_members where project_id = $1 and profile_id = $2", [projeId, lider]);
  assert.equal(r.affectedRows, 0);
  const uyeler = await db.query("select profile_id from public.project_members where project_id = $1", [projeId]);
  assert.equal(uyeler.rows.length, 2);
});

test("lider projeyi 'devam ediyor' yapınca başvuru alınmaz", async () => {
  await olarak(db, lider, "update public.projects set status = 'in_progress' where id = $1", [projeId]);
  await assert.rejects(basvur(can, "Proje başladıktan sonra başvuru denemesi."), /başvuruya açık değil/);
});
