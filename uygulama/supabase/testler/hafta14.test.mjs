// Hafta 14: şikâyetler ve yönetici yetkileri
import { test, before } from "node:test";
import assert from "node:assert/strict";
import {
  veritabaniOlustur,
  kullaniciEkle,
  olarak,
  ogrenciMeta,
  mentorMeta,
  beceriId,
} from "./ortam.mjs";

let db, yonetici, lider, yabanci, mentor, projeId, mesajId;

before(async () => {
  db = await veritabaniOlustur();
  yonetici = await kullaniciEkle(db, "yonetici@x.edu.tr", ogrenciMeta("Platform Yöneticisi"));
  // İlk yönetici SQL editöründen atanır (auth.uid() boş => koruma tetikleyicisi engellemez)
  await db.query("update public.profiles set role = 'admin' where id = $1", [yonetici]);
  lider = await kullaniciEkle(db, "lider@ogr.x.edu.tr", ogrenciMeta("Proje Lideri"));
  yabanci = await kullaniciEkle(db, "yabanci@ogr.x.edu.tr", ogrenciMeta("Yabancı Öğrenci"));
  mentor = await kullaniciEkle(db, "mentor@ornek.com", mentorMeta("Bekleyen Mentör"));

  const react = await beceriId(db, "React");
  projeId = (
    await olarak(
      db,
      lider,
      "select public.create_project('Şikâyet Testi Projesi', 'Şikâyet ve yönetim testleri için örnek proje.', 3::smallint, null, $1) as id",
      [[react]],
    )
  ).rows[0].id;
  mesajId = (
    await olarak(
      db,
      lider,
      "insert into public.messages (project_id, sender_id, content) values ($1, $2, 'Uygunsuz bir mesaj örneği') returning id",
      [projeId, lider],
    )
  ).rows[0].id;
});

test("yönetici mentörü onaylar, mentöre bildirim gider; öğrenci onaylayamaz", async () => {
  await olarak(db, yabanci, "update public.profiles set mentor_status = 'approved' where id = $1", [
    mentor,
  ]);
  let r = await db.query("select mentor_status from public.profiles where id = $1", [mentor]);
  assert.equal(r.rows[0].mentor_status, "pending");

  await olarak(
    db,
    yonetici,
    "update public.profiles set mentor_status = 'approved' where id = $1",
    [mentor],
  );
  r = await db.query("select mentor_status from public.profiles where id = $1", [mentor]);
  assert.equal(r.rows[0].mentor_status, "approved");
  const b = await olarak(db, mentor, "select type from public.notifications");
  assert.deepEqual(
    b.rows.map((x) => x.type),
    ["mentor_approved"],
  );
});

test("ekip dışındaki kullanıcı bir mesajı şikâyet edemez; proje şikâyet edilebilir", async () => {
  await assert.rejects(
    olarak(
      db,
      yabanci,
      "insert into public.reports (reporter_id, target_type, target_id, reason) values ($1, 'message', $2, 'Bu mesaj uygunsuz.')",
      [yabanci, mesajId],
    ),
    /şikâyet edemezsin/,
  );
  await olarak(
    db,
    yabanci,
    "insert into public.reports (reporter_id, target_type, target_id, reason) values ($1, 'project', $2, 'Bu proje reklam içeriyor.')",
    [yabanci, projeId],
  );
});

test("şikâyetleri yalnızca yönetici görür; içerik kopyası saklanır", async () => {
  assert.equal((await olarak(db, yabanci, "select * from public.reports")).rows.length, 0);
  const { rows } = await olarak(
    db,
    yonetici,
    "select snapshot, snapshot_owner from public.reports",
  );
  assert.equal(rows.length, 1);
  assert.match(rows[0].snapshot, /Şikâyet Testi Projesi/);
  assert.equal(rows[0].snapshot_owner, lider);
});

test("yönetici kullanıcıyı askıya alır; askıdaki kullanıcı proje açamaz ve mesaj yazamaz", async () => {
  await olarak(db, yonetici, "update public.profiles set is_suspended = true where id = $1", [
    lider,
  ]);
  await assert.rejects(
    olarak(
      db,
      lider,
      "insert into public.messages (project_id, sender_id, content) values ($1, $2, 'Askıdayken mesaj')",
      [projeId, lider],
    ),
    /row-level security/,
  );
  await assert.rejects(
    olarak(
      db,
      lider,
      "insert into public.projects (owner_id, title, description, team_size) values ($1, 'Askıda proje', 'Askıdaki kullanıcının açtığı proje.', 2)",
      [lider],
    ),
    /row-level security/,
  );
  await olarak(db, yonetici, "update public.profiles set is_suspended = false where id = $1", [
    lider,
  ]);
});

test("yönetici ekip mesajlarını okuyamaz (yalnızca şikâyet edilen kopyayı görür)", async () => {
  assert.equal((await olarak(db, yonetici, "select * from public.messages")).rows.length, 0);
});

test("yönetici fonksiyonlarını yalnızca yönetici çağırabilir", async () => {
  await assert.rejects(olarak(db, lider, "select public.admin_stats()"), /yalnızca yöneticiler/);
  await assert.rejects(
    olarak(db, lider, "select * from public.admin_list_users()"),
    /yalnızca yöneticiler/,
  );
  const k = await olarak(db, yonetici, "select email, role from public.admin_list_users()");
  assert.ok(k.rows.some((r) => r.email === "mentor@ornek.com"));
  const s = (await olarak(db, yonetici, "select public.admin_stats() as s")).rows[0].s;
  assert.equal(s.mentors, 1);
  assert.equal(s.open_reports, 1);
  assert.equal(s.projects_by_status.open, 1);
  assert.deepEqual(s.top_skills, [{ name: "React", count: 1 }]);
});

test("yönetici uygunsuz projeyi kaldırabilir", async () => {
  await olarak(db, yonetici, "delete from public.projects where id = $1", [projeId]);
  assert.equal(
    (await db.query("select 1 from public.projects where id = $1", [projeId])).rows.length,
    0,
  );
});
