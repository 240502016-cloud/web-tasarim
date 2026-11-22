import { ornekProjeler } from "../veri/ornekVeri";

// 9. hafta: veri şimdilik örnek dosyadan geliyor.
export async function projeleriGetir() {
  return ornekProjeler;
}

export async function projeGetir(id) {
  const proje = ornekProjeler.find((p) => p.id === id);
  if (!proje) throw new Error("Proje bulunamadı.");
  return proje;
}
