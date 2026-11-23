// KOSTÜ'ye özel kayıt kuralları ve ziyaretçi gizliliği
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { veritabaniOlustur, kullaniciEkle, olarak, ogrenciMeta, mentorMeta } from "./ortam.mjs";

let db, ogrenci, uye;

// Testler hangi yıl çalışırsa çalışsın tutarlı olsun diye yıl hesaplanır
const simdi = new Date();
const BU_YIL = simdi.getFullYear() % 100;
const EGITIM_YILI = simdi.getMonth() >= 8 ? simdi.getFullYear() : simdi.getFullYear() - 1;
const AZAMI_SINIF_24 = Math.max(1, EGITIM_YILI - 2024 + 1);

before(async () => {
  db = await veritabaniOlustur();
  ogrenci = await kullaniciEkle(db, "240502016@kocaelisaglik.edu.tr", ogrenciMeta("Ayşe Yılmaz"));
  uye = await kullaniciEkle(db, "240502017@kocaelisaglik.edu.tr", ogrenciMeta("Mehmet Kaya"));
});

const ogrenciKaydi = (eposta, ek) => kullaniciEkle(db, eposta, ogrenciMeta("Deneme", ek));

test("öğrenci numarası 9 haneli ve KOSTÜ uzantılı olmalı", async () => {
  for (const eposta of [
    "ali@gmail.com",
    "240502016@ogr.kocaelisaglik.edu.tr",
    "240502016@itu.edu.tr",
    "99999999@kocaelisaglik.edu.tr", // 8 hane
    "2405020160@kocaelisaglik.edu.tr", // 10 hane
    "ali.veli@kocaelisaglik.edu.tr", // personel adresiyle öğrenci olunmaz
  ]) {
    await assert.rejects(ogrenciKaydi(eposta), /kocaelisaglik|9 haneli/, eposta);
  }
});

test("uydurma numaralar reddedilir", async () => {
  const gelecek = String(BU_YIL + 1).padStart(2, "0");
  await assert.rejects(ogrenciKaydi("999999999@kocaelisaglik.edu.tr"), /giriş yılı/);
  await assert.rejects(ogrenciKaydi(`${gelecek}0502001@kocaelisaglik.edu.tr`), /giriş yılı/);
  await assert.rejects(ogrenciKaydi("190502001@kocaelisaglik.edu.tr"), /giriş yılı/);
  await assert.rejects(ogrenciKaydi("240002001@kocaelisaglik.edu.tr"), /geçerli bir KOSTÜ/);
  await assert.rejects(ogrenciKaydi("240500001@kocaelisaglik.edu.tr"), /geçerli bir KOSTÜ/);
  await assert.rejects(ogrenciKaydi("240502000@kocaelisaglik.edu.tr"), /geçerli bir KOSTÜ/);
});

test("sınıf, giriş yılına göre mümkün olandan büyük olamaz", async () => {
  const buYilGirisli = `${String(BU_YIL).padStart(2, "0")}0502001@kocaelisaglik.edu.tr`;
  await assert.rejects(ogrenciKaydi(buYilGirisli, { class_year: "4" }), /en fazla/);
  const id = await ogrenciKaydi("240502018@kocaelisaglik.edu.tr", {
    class_year: String(AZAMI_SINIF_24),
  });
  assert.ok(id);
});

test("öğrenci sonradan sınıfını imkânsız bir değere çekemez", async () => {
  await assert.rejects(
    olarak(db, ogrenci, "update public.profiles set class_year = $1 where id = $2", [
      AZAMI_SINIF_24 + 1,
      ogrenci,
    ]),
    /en fazla/,
  );
  await olarak(db, ogrenci, "update public.profiles set class_year = 1 where id = $1", [ogrenci]);
});

test("mentör yalnız KOSTÜ personel e-postasıyla kayıt olur", async () => {
  await assert.rejects(kullaniciEkle(db, "deniz@firma.com", mentorMeta("Dış Mentör")), /KOSTÜ/);
  await assert.rejects(
    kullaniciEkle(db, "240502019@kocaelisaglik.edu.tr", mentorMeta("Öğrenci Mentör")),
    /personel/,
  );
  const id = await kullaniciEkle(db, "deniz.kaya@kocaelisaglik.edu.tr", mentorMeta("Deniz Kaya"));
  const { rows } = await db.query("select role, mentor_status from public.profiles where id = $1", [
    id,
  ]);
  assert.deepEqual(rows[0], { role: "mentor", mentor_status: "pending" });
});

test("e-posta sonradan KOSTÜ dışı bir adrese değiştirilemez", async () => {
  await assert.rejects(
    db.query("update auth.users set email = 'ayse@gmail.com' where id = $1", [ogrenci]),
    /KOSTÜ/,
  );
  // Şifre gibi başka alanların güncellenmesi etkilenmez
  await db.query("update auth.users set updated_at = now() where id = $1", [ogrenci]);
});

test("ziyaretçi takım doluluğunu görür ama üyelerin kimliğini göremez", async () => {
  const { rows } = await olarak(
    db,
    ogrenci,
    "insert into public.projects (owner_id, title, description, team_size) values ($1, 'Kampüs Etkinlikleri', 'Kampüsteki etkinlikleri tek yerde toplayan site.', 4) returning id",
    [ogrenci],
  );
  const proje = rows[0].id;
  await db.query("insert into public.project_members (project_id, profile_id) values ($1, $2)", [
    proje,
    uye,
  ]);

  const ziyaretci = await olarak(
    db,
    null,
    "select title, public.member_count(p) as uye_sayisi from public.projects p where id = $1",
    [proje],
  );
  assert.deepEqual(ziyaretci.rows, [{ title: "Kampüs Etkinlikleri", uye_sayisi: 2 }]);
  assert.equal((await olarak(db, null, "select * from public.project_members")).rows.length, 0);
  assert.equal((await olarak(db, null, "select * from public.profiles")).rows.length, 0);

  const girisli = await olarak(
    db,
    uye,
    "select * from public.project_members where project_id = $1",
    [proje],
  );
  assert.equal(girisli.rows.length, 2);
});

test("ziyaretçi hiçbir tabloya yazamaz", async () => {
  await assert.rejects(
    olarak(db, null, "insert into public.skills (name) values ('Sahte')"),
    /permission denied/,
  );
  await assert.rejects(olarak(db, null, "truncate public.projects cascade"), /permission denied/);
});
