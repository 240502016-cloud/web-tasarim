// Giriş gerektiren sayfaların, veritabanından gelen gerçek biçimdeki veriyle
// hatasız çizildiğini ve role göre doğru bölümleri gösterdiğini test eder.
import { beforeAll, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { KIMLIK, girisYapmisOl, sahteSupabase } from "../test/sahteSupabase";
import { OturumSaglayici } from "../baglam/OturumBaglami";
import App from "../App";

vi.mock("../lib/supabase", () => ({
  supabase: sahteSupabase,
  hataMetni: (h) => h?.message ?? String(h),
  sonuc: ({ data, error }) => {
    if (error) throw error;
    return data;
  },
}));

beforeAll(() => {
  // Grafik kütüphanesi (yönetim paneli) jsdom'da olmayan ResizeObserver'ı kullanır
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

function ciz(adres, kullaniciId) {
  girisYapmisOl(kullaniciId);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[adres]}>
        <OturumSaglayici>
          <App />
        </OturumSaglayici>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("öğrenci", () => {
  test("Panelim: önerilen projeler puanıyla, projeleri ve başvuruları", async () => {
    ciz("/panelim", KIMLIK.ayse);
    expect(await screen.findByRole("heading", { name: "Merhaba, Ayşe" })).toBeInTheDocument();
    expect(await screen.findByText("%75 uygun")).toBeInTheDocument();
    expect(screen.getByText("2 gerekli beceriden 1 tanesine sahipsin")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Başvurularım" })).toBeInTheDocument();
    expect(await screen.findByText("Rolün: Lider")).toBeInTheDocument();
  });

  test("başvurduğu projede başvuru durumu ve geri çekme görünür, lider araçları görünmez", async () => {
    // Örnek veride Can bu projeye zaten başvurmuş (beklemede)
    ciz(`/projeler/${KIMLIK.proje}`, KIMLIK.can);
    expect(
      await screen.findByRole("heading", { name: "Kütüphane Doluluk Takibi" }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Başvurun" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Başvuruyu Geri Çek" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Proje Yönetimi" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Başvurular \(/)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Takım Sohbeti" })).not.toBeInTheDocument();
  });

  test("başvurmadığı açık projede başvuru formu görünür", async () => {
    ciz(`/projeler/${KIMLIK.proje}`, KIMLIK.mehmet);
    expect(await screen.findByRole("heading", { name: "Projeye Başvur" })).toBeInTheDocument();
    expect(screen.getByLabelText("Neden bu projede yer almak istiyorsun?")).toBeInTheDocument();
  });

  test("Profilim: bilgiler ve beceriler", async () => {
    ciz("/profil", KIMLIK.ayse);
    expect(await screen.findByRole("heading", { name: "Profilim" })).toBeInTheDocument();
    expect(screen.getByLabelText("Ad Soyad")).toHaveValue("Ayşe Yılmaz");
    expect(await screen.findByLabelText("JavaScript seviyesi")).toHaveValue("4");
  });
});

describe("proje lideri", () => {
  test("başvurular, mentör önerileri, görüşmeler ve takım sohbeti", async () => {
    ciz(`/projeler/${KIMLIK.proje}`, KIMLIK.ayse);
    expect(
      await screen.findByRole("heading", { name: "Başvurular (1 bekleyen)" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Veritabanı tarafında destek olabilirim.")).toBeInTheDocument();
    expect(screen.getByText("Gerekli becerilerden 1 / 2 tanesine sahip")).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Projene Uygun Mentörler" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("%65 uygun")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Proje Yönetimi" })).toBeInTheDocument();
    expect(await screen.findByText("Merhaba ekip!")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Görüşmeye katıl" })).toHaveAttribute(
      "href",
      "https://meet.google.com/abc",
    );
  });

  test("mentör profilinden talep formu", async () => {
    ciz(`/mentorler/${KIMLIK.deniz}`, KIMLIK.ayse);
    expect(await screen.findByRole("heading", { name: "Deniz Şahin" })).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Mentörlük Talebi Gönder" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Kütüphane Doluluk Takibi" })).toBeInTheDocument();
  });

  test("bildirimler", async () => {
    ciz("/bildirimler", KIMLIK.ayse);
    expect(
      await screen.findByText('Can Arslan, "Kütüphane Doluluk Takibi" projesine başvurdu.'),
    ).toBeInTheDocument();
    expect(screen.getByText("1 okunmamış bildirimin var.")).toBeInTheDocument();
  });
});

describe("yönetici", () => {
  test("yönetim paneli istatistikleri", async () => {
    ciz("/yonetim", KIMLIK.yonetici);
    expect(await screen.findByRole("heading", { name: "Yönetim Paneli" })).toBeInTheDocument();
    expect(await screen.findByText("Onaylı mentör")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Mentör Onayları" })).toBeInTheDocument();
  });

  test("öğrenci yönetim paneline giremez", async () => {
    ciz("/yonetim", KIMLIK.can);
    expect(await screen.findByRole("heading", { name: /Doğru proje/ })).toBeInTheDocument();
  });
});
