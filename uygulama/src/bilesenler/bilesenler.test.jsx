import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProjeKarti from "./ProjeKarti";
import MentorKarti from "./MentorKarti";
import PuanRozeti from "./PuanRozeti";

const proje = {
  id: "p1",
  baslik: "Kütüphane Doluluk Takibi",
  aciklama: "Salonların doluluk oranını gösteren web sitesi.",
  durum: "open",
  takimBuyuklugu: 3,
  uyeSayisi: 3,
  beceriler: [
    { id: 1, ad: "HTML / CSS" },
    { id: 2, ad: "JavaScript" },
  ],
};

describe("ProjeKarti", () => {
  test("başlık, durum, beceriler ve detay bağlantısı görünür", () => {
    render(<ProjeKarti proje={proje} />, { wrapper: MemoryRouter });
    expect(screen.getByRole("heading", { name: proje.baslik })).toBeInTheDocument();
    expect(screen.getByText("Açık")).toBeInTheDocument();
    expect(screen.getByText("JavaScript")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "İncele" })).toHaveAttribute("href", "/projeler/p1");
  });

  test("takım doluysa belirtilir", () => {
    render(<ProjeKarti proje={proje} />, { wrapper: MemoryRouter });
    expect(screen.getByText(/Takım: 3 \/ 3/)).toHaveTextContent("(dolu)");
  });
});

describe("MentorKarti", () => {
  test("kapasitesi dolu mentör işaretlenir", () => {
    const mentor = {
      id: "m1",
      adSoyad: "Deniz Kaya",
      unvan: "Yazılım Mühendisi",
      uzmanlik: "Web Geliştirme",
      deneyimYili: 6,
      kapasite: 2,
      aktifProje: 2,
      beceriler: [],
    };
    render(<MentorKarti mentor={mentor} />, { wrapper: MemoryRouter });
    expect(screen.getByText("DK")).toBeInTheDocument();
    expect(screen.getByText("Kapasite dolu")).toBeInTheDocument();
  });
});

describe("PuanRozeti", () => {
  test("puanı ve nedenini gösterir", () => {
    render(
      <PuanRozeti
        oneri={{ puan: 75, uyanlar: ["A", "B", "C"], eksikler: ["React"], gerekliSayisi: 4 }}
      />,
    );
    expect(screen.getByText("%75 uygun")).toHaveClass("puan-yuksek");
    expect(screen.getByText("4 gerekli beceriden 3 tanesine sahipsin")).toBeInTheDocument();
    expect(screen.getByText("Eksik: React")).toBeInTheDocument();
  });
});
