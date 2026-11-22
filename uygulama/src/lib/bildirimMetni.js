// Bildirim türünü kullanıcıya gösterilecek cümleye çevirir
export function bildirimMetni(tur, veri = {}) {
  const proje = veri.project_title ? `"${veri.project_title}"` : "projen";
  switch (tur) {
    case "new_application":
      return `${veri.name ?? "Bir öğrenci"}, ${proje} projesine başvurdu.`;
    case "application_accepted":
      return `${proje} projesine yaptığın başvuru kabul edildi. Takıma hoş geldin!`;
    case "application_rejected":
      return `${proje} projesine yaptığın başvuru kabul edilmedi.`;
    case "mentor_request":
      return `${proje} projesi için mentörlük talebi aldın.`;
    case "mentor_request_accepted":
      return `${veri.name ?? "Mentör"}, ${proje} projesine mentörlük yapmayı kabul etti.`;
    case "mentor_request_rejected":
      return `${veri.name ?? "Mentör"}, ${proje} projesi için mentörlük talebini kabul etmedi.`;
    case "meeting_planned":
      return `${proje} projesi için yeni bir görüşme planlandı.`;
    case "mentor_approved":
      return "Mentör hesabın onaylandı. Artık mentörler listesinde görünüyorsun.";
    case "mentor_rejected":
      return "Mentör başvurun onaylanmadı.";
    default:
      return "Yeni bir bildirimin var.";
  }
}

// Bildirime tıklanınca gidilecek sayfa
export function bildirimBaglantisi(tur, veri = {}) {
  if (tur === "mentor_request") return "/panelim";
  if (veri.project_id) return `/projeler/${veri.project_id}`;
  return "/panelim";
}
