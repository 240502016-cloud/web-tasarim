import { ornekMentorler } from "../veri/ornekVeri";

export async function mentorleriGetir() {
  return ornekMentorler;
}

export async function mentorGetir(id) {
  const mentor = ornekMentorler.find((m) => m.id === id);
  if (!mentor) throw new Error("Mentör bulunamadı.");
  return mentor;
}
