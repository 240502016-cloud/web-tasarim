// seed.sql (örnek veri) hatasız yüklenir ve tutarlı bir demo ortamı oluşturur
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { veritabaniOlustur, olarak } from "./ortam.mjs";

let db;
const tekDeger = async (sql) => Object.values((await db.query(sql)).rows[0])[0];

before(async () => {
  db = await veritabaniOlustur({ ornekVeri: true });
});

test("örnek kullanıcılar, rolleri ve profilleri oluşur", async () => {
  const { rows } = await db.query(
    "select role, count(*)::int as n from public.profiles group by role order by role",
  );
  assert.deepEqual(rows, [
    { role: "student", n: 4 },
    { role: "mentor", n: 3 },
    { role: "admin", n: 1 },
  ]);
  assert.equal(await tekDeger("select count(*)::int from auth.identities"), 8);
  assert.equal(
    await tekDeger("select count(*)::int from public.profiles where mentor_status = 'pending'"),
    1,
  );
});

test("projeler, takımlar ve mentörlük tutarlı", async () => {
  assert.equal(await tekDeger("select count(*)::int from public.projects"), 5);
  const yemekhane = (
    await db.query(
      "select id, mentor_id from public.projects where title = 'Yemekhane Menü Uygulaması'",
    )
  ).rows[0];
  assert.ok(yemekhane.mentor_id);
  assert.equal(
    await tekDeger(
      `select count(*)::int from public.project_members where project_id = '${yemekhane.id}'`,
    ),
    2,
  );
  assert.equal(await tekDeger("select count(*)::int from public.messages"), 3);
});

test("örnek öğrenciye eşleştirme önerisi çıkar", async () => {
  const mehmet = await tekDeger("select id from public.profiles where full_name = 'Mehmet Kaya'");
  const { rows } = await olarak(
    db,
    mehmet,
    "select p.title, m.score from public.match_projects_for_student() m join public.projects p on p.id = m.project_id",
  );
  assert.ok(rows.length > 0);
  // Mehmet'in kendi projesi (Ders Notu) önerilmez
  assert.ok(!rows.some((r) => r.title === "Ders Notu Öneri Sistemi"));
});
