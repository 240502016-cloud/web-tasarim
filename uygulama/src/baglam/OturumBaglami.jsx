import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { supabase, hataMetni } from "../lib/supabase";
import { profilGetir } from "../api/profiller";

const OturumBaglami = createContext(null);

// Giriş yapmış kullanıcıyı ve profilini tüm uygulamaya sağlar
export function OturumSaglayici({ children }) {
  const queryClient = useQueryClient();
  const [oturum, setOturum] = useState(undefined); // undefined: henüz bilinmiyor
  const [profil, setProfil] = useState(null);
  const [profilYukleniyor, setProfilYukleniyor] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setOturum(data.session));
    const { data } = supabase.auth.onAuthStateChange((_olay, yeniOturum) => {
      setOturum(yeniOturum);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const kullaniciId = oturum?.user?.id;

  const profilYenile = useCallback(async () => {
    if (!kullaniciId) {
      setProfil(null);
      setProfilYukleniyor(false);
      return;
    }
    setProfilYukleniyor(true);
    try {
      const p = await profilGetir(kullaniciId);
      if (p?.askida) {
        toast.error("Hesabın yönetici tarafından askıya alındı.");
        await supabase.auth.signOut();
        setProfil(null);
      } else {
        setProfil(p);
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setProfilYukleniyor(false);
    }
  }, [kullaniciId]);

  const oturumHazir = oturum !== undefined;

  useEffect(() => {
    if (!oturumHazir) return;
    profilYenile();
    // Kullanıcı değişince önbellekteki kişiye özel veriler yeniden yüklensin
    queryClient.invalidateQueries();
  }, [oturumHazir, profilYenile, queryClient]);

  async function girisYap(eposta, sifre) {
    const { error } = await supabase.auth.signInWithPassword({ email: eposta, password: sifre });
    if (error) throw new Error(hataMetni(error));
  }

  // Dönen değer true ise oturum açıldı, false ise e-posta doğrulaması bekleniyor
  async function kayitOl(veri) {
    const { data, error } = await supabase.auth.signUp({
      email: veri.eposta,
      password: veri.sifre,
      options: {
        emailRedirectTo: `${window.location.origin}/giris`,
        data:
          veri.rol === "student"
            ? {
                role: "student",
                full_name: veri.adSoyad,
                department: veri.bolum,
                class_year: veri.sinif,
              }
            : {
                role: "mentor",
                full_name: veri.adSoyad,
                title: veri.unvan,
                expertise: veri.uzmanlik,
                experience_years: veri.deneyimYili,
                mentor_capacity: veri.kapasite,
              },
      },
    });
    if (error) throw new Error(hataMetni(error));
    return Boolean(data.session);
  }

  async function cikisYap() {
    await supabase.auth.signOut();
    queryClient.clear();
  }

  const deger = {
    oturum,
    kullanici: oturum?.user ?? null,
    profil,
    yukleniyor: oturum === undefined || (Boolean(kullaniciId) && profilYukleniyor),
    girisYap,
    kayitOl,
    cikisYap,
    profilYenile,
  };

  return <OturumBaglami.Provider value={deger}>{children}</OturumBaglami.Provider>;
}

export function useOturum() {
  const baglam = useContext(OturumBaglami);
  if (!baglam) throw new Error("useOturum, OturumSaglayici içinde kullanılmalı.");
  return baglam;
}
