// Hafta 13: mentörlük talepleri, görüşmeler, mesajlar ve bildirimler
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

let db, lider, uye, yabanci, mentor, mentor2, projeId, digerProje;

const talepGonder = (proje, kime, kim = lider) =>
  olarak(db, kim, "insert into public.mentor_requests (project_id, mentor_id, message) values ($1, $2, 'Projemize mentörlük yapar mısınız?') returning id", [proje, kime]);

const bildirimler = async (kim) =>
  (await olarak(db, kim, "select type, payload from public.notifications order by created_at")).rows;

before(async () => {
  db = await veritabaniOlustur();
  lider = await kullaniciEkle(db, "lider@ogr.x.edu.tr", ogrenciMeta("Proje Lideri"));
  uye = await kullaniciEkle(db, "uye@ogr.x.edu.tr", ogrenciMeta("Takım Üyesi"));
  yabanci = await kullaniciEkle(db, "yabanci@ogr.x.edu.tr", ogrenciMeta("Yabancı Öğrenci"));
  mentor = await kullaniciEkle(db, "mentor@ornek.com", mentorMeta("Deniz Mentör", { mentor_capacity: 1 }));
  mentor2 = await kullaniciEkle(db, "mentor2@ornek.com", mentorMeta("İkinci Mentör"));
  await mentoruOnayla(db, mentor);
  await mentoruOnayla(db, mentor2);

  const react = await beceriId(db, "React");
  const ac = async (ad) =>
    (await olarak(db, lider, "select public.create_project($1, 'Mentörlük testleri için örnek proje açıklaması.', 3::smallint, null, $2) as id", [ad, [react]])).rows[0].id;
  projeId = await ac("Kampüs Uygulaması");
  digerProje = await ac("İkinci Proje");

  const { rows } = await olarak(db, uye, "insert into public.applications (project_id, student_id, message) values ($1, $2, 'Takıma katılmak istiyorum.') returning id", [projeId, uye]);
  await olarak(db, lider, "update public.applications set status = 'accepted' where id = $1", [rows[0].id]);
});

test("başvuru ve kabul bildirim oluşturur", async () => {
  const liderin = await bildirimler(lider);
  assert.equal(liderin[0].type, "new_application");
  assert.equal(liderin[0].payload.name, "Takım Üyesi");
  const uyenin = await bildirimler(uye);
  assert.deepEqual(uyenin.map((b) => b.type), ["application_accepted"]);
});

test("yalnızca proje lideri mentörlük talebi gönderebilir; onaysız mentöre gönderilemez", async () => {
  await assert.rejects(talepGonder(projeId, mentor, uye), /row-level security/);
  const onaysiz = await kullaniciEkle(db, "onaysiz@ornek.com", mentorMeta("Onaysız Mentör"));
  await assert.rejects(talepGonder(projeId, onaysiz), /onaylı mentörlere/);
});

test("talep mentöre bildirim olarak düşer; aynı mentöre ikinci talep gönderilemez", async () => {
  await talepGonder(projeId, mentor);
  await talepGonder(projeId, mentor2);
  await assert.rejects(talepGonder(projeId, mentor), /bekleyen bir talebin/);
  assert.deepEqual((await bildirimler(mentor)).map((b) => b.type), ["mentor_request"]);
});

test("talebi başkası yanıtlayamaz; mentör kabul edince projeye atanır", async () => {
  const { rows } = await db.query("select id from public.mentor_requests where mentor_id = $1", [mentor]);
  await assert.rejects(olarak(db, mentor2, "select public.respond_mentor_request($1, true)", [rows[0].id]), /yetkin yok/);
  await olarak(db, mentor, "select public.respond_mentor_request($1, true)", [rows[0].id]);

  const proje = await db.query("select mentor_id from public.projects where id = $1", [projeId]);
  assert.equal(proje.rows[0].mentor_id, mentor);
  // İkinci mentöre giden talep otomatik iptal olur
  const diger = await db.query("select status from public.mentor_requests where mentor_id = $1", [mentor2]);
  assert.equal(diger.rows[0].status, "cancelled");
  assert.ok((await bildirimler(lider)).some((b) => b.type === "mentor_request_accepted"));
});

test("kapasitesi dolan mentöre yeni talep gönderilemez", async () => {
  await assert.rejects(talepGonder(digerProje, mentor), /kapasitesi dolu/);
});

test("lider bekleyen talebini geri alabilir, başkası alamaz", async () => {
  const { rows } = await talepGonder(digerProje, mentor2);
  await assert.rejects(olarak(db, uye, "select public.cancel_mentor_request($1)", [rows[0].id]), /yetkin yok/);
  await olarak(db, lider, "select public.cancel_mentor_request($1)", [rows[0].id]);
  const r = await db.query("select status from public.mentor_requests where id = $1", [rows[0].id]);
  assert.equal(r.rows[0].status, "cancelled");
});

test("mentör görüşme planlar, ekip bildirim alır; üye görüşme planlayamaz", async () => {
  await olarak(db, mentor, "insert into public.meetings (project_id, created_by, starts_at, meeting_url) values ($1, $2, now() + interval '2 days', 'https://meet.google.com/abc-defg-hij')", [projeId, mentor]);
  assert.ok((await bildirimler(uye)).some((b) => b.type === "meeting_planned"));
  assert.ok((await bildirimler(lider)).some((b) => b.type === "meeting_planned"));
  assert.ok(!(await bildirimler(mentor)).some((b) => b.type === "meeting_planned"));
  await assert.rejects(
    olarak(db, uye, "insert into public.meetings (project_id, created_by, starts_at) values ($1, $2, now() + interval '1 day')", [projeId, uye]),
    /row-level security/,
  );
  await assert.rejects(
    olarak(db, mentor, "insert into public.meetings (project_id, created_by, starts_at, meeting_url) values ($1, $2, now(), 'http://guvensiz.com')", [projeId, mentor]),
    /check constraint/,
  );
});

test("görüşmeleri yalnızca ekip görür", async () => {
  assert.equal((await olarak(db, uye, "select * from public.meetings")).rows.length, 1);
  assert.equal((await olarak(db, yabanci, "select * from public.meetings")).rows.length, 0);
});

test("ekip mesajlarını yalnızca ekip (mentör dahil) okur ve yazar", async () => {
  const yaz = (kim, metin) =>
    olarak(db, kim, "insert into public.messages (project_id, sender_id, content) values ($1, $2, $3)", [projeId, kim, metin]);
  await yaz(lider, "Merhaba ekip!");
  await yaz(uye, "Merhaba, toplantı saatini gördüm.");
  await yaz(mentor, "Görüşmede kod incelemesi yapalım.");
  await assert.rejects(yaz(yabanci, "Ben de katılabilir miyim?"), /row-level security/);
  await assert.rejects(yaz(uye, "   "), /check constraint/);

  assert.equal((await olarak(db, uye, "select * from public.messages")).rows.length, 3);
  assert.equal((await olarak(db, yabanci, "select * from public.messages")).rows.length, 0);
});

test("kullanıcı yalnızca kendi bildirimini okundu yapabilir, içeriğini değiştiremez", async () => {
  const { rows } = await olarak(db, uye, "select id from public.notifications limit 1");
  await olarak(db, uye, "update public.notifications set read_at = now() where id = $1", [rows[0].id]);
  await assert.rejects(
    olarak(db, uye, "update public.notifications set type = 'sahte' where id = $1", [rows[0].id]),
    /permission denied/,
  );
  const baskasi = await olarak(db, yabanci, "update public.notifications set read_at = now() where id = $1", [rows[0].id]);
  assert.equal(baskasi.affectedRows, 0);
  await assert.rejects(olarak(db, uye, "select public.notify($1, 'sahte', '{}')", [yabanci]), /permission denied/);
});
