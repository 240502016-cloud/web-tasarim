// Örnek proje verisi. İleride bu veri Supabase'den gelecek.
const projeler = [
    { baslik: "Kampüs Etkinlik Uygulaması", aciklama: "Kulüp ve etkinlik duyurularını tek yerde toplayan mobil uygulama.", beceriler: ["Flutter", "Firebase"], durum: "acik", uye: 2, kapasite: 4, tarih: "2026-11-05" },
    { baslik: "Kütüphane Doluluk Takibi", aciklama: "Kütüphane salonlarının anlık doluluk oranını gösteren web sitesi.", beceriler: ["HTML / CSS", "JavaScript"], durum: "acik", uye: 1, kapasite: 3, tarih: "2026-11-03" },
    { baslik: "Ders Notu Öneri Sistemi", aciklama: "Öğrencilere derslerine göre kaynak ve not öneren sistem.", beceriler: ["Python", "Yapay Zeka"], durum: "acik", uye: 3, kapasite: 4, tarih: "2026-10-28" },
    { baslik: "Yemekhane Menü Uygulaması", aciklama: "Günlük menüyü ve kalori bilgisini gösteren, oylama yapılabilen uygulama.", beceriler: ["React", "JavaScript"], durum: "devam", uye: 4, kapasite: 4, tarih: "2026-10-20" },
    { baslik: "Staj İlanları Panosu", aciklama: "Bölümlere göre staj ilanlarını listeleyen ve hatırlatma gönderen site.", beceriler: ["React", "HTML / CSS"], durum: "acik", uye: 1, kapasite: 4, tarih: "2026-11-07" },
    { baslik: "Laboratuvar Randevu Sistemi", aciklama: "Bilgisayar laboratuvarları için saatlik randevu alma sistemi.", beceriler: ["JavaScript", "Python"], durum: "acik", uye: 2, kapasite: 3, tarih: "2026-10-30" },
    { baslik: "Kayıp Eşya Bildirimi", aciklama: "Kampüste kaybolan ve bulunan eşyaların fotoğraflı ilan sistemi.", beceriler: ["Flutter"], durum: "devam", uye: 3, kapasite: 3, tarih: "2026-10-15" },
    { baslik: "Sınav Takvimi Hatırlatıcı", aciklama: "Sınav tarihlerini takvime ekleyip hatırlatma gönderen web uygulaması.", beceriler: ["HTML / CSS", "JavaScript"], durum: "acik", uye: 1, kapasite: 2, tarih: "2026-11-08" },
    { baslik: "Servis Saatleri Takibi", aciklama: "Kampüs servislerinin saatlerini ve gecikmelerini gösteren uygulama.", beceriler: ["Flutter", "Firebase"], durum: "acik", uye: 2, kapasite: 3, tarih: "2026-11-01" },
    { baslik: "Akran Ders Destek Platformu", aciklama: "Üst sınıf öğrencilerinin alt sınıflara ders anlattığı randevu sistemi.", beceriler: ["React", "Python"], durum: "devam", uye: 3, kapasite: 5, tarih: "2026-10-22" },
];

const DURUM_YAZISI = { acik: "Açık", devam: "Devam ediyor" };

// Sayfadaki elemanlar
const aramaKutusu = document.getElementById("arama");
const beceriFiltresi = document.getElementById("beceri-filtresi");
const bosYerKutusu = document.getElementById("bos-yer");
const siralamaKutusu = document.getElementById("siralama");
const temizleButonu = document.getElementById("temizle");
const izgara = document.getElementById("proje-izgara");
const sonucSayisi = document.getElementById("sonuc-sayisi");
const bosSonuc = document.getElementById("bos-sonuc");
const kartSablonu = document.getElementById("kart-sablonu");

// Türkçe karakterlerle doğru küçük harfe çevirme ("İ" -> "i")
function kucukHarf(metin) {
    return metin.toLocaleLowerCase("tr");
}

// Projelerdeki tüm becerilerden filtre kutucuklarını oluşturur
function beceriSecenekleriniOlustur() {
    const beceriler = [...new Set(projeler.flatMap(p => p.beceriler))]
        .sort((a, b) => a.localeCompare(b, "tr"));

    beceriler.forEach(beceri => {
        const etiket = document.createElement("label");
        const kutu = document.createElement("input");
        kutu.type = "checkbox";
        kutu.value = beceri;
        etiket.append(kutu, " " + beceri);
        beceriFiltresi.append(etiket);
    });
}

// Formdaki seçimlere göre filtrelenmiş ve sıralanmış listeyi döndürür
function filtrelenmisProjeler() {
    const aranan = kucukHarf(aramaKutusu.value.trim());
    const seciliBeceriler = [...beceriFiltresi.querySelectorAll("input:checked")].map(k => k.value);
    const durum = document.querySelector('input[name="durum"]:checked').value;
    const sadeceBosYer = bosYerKutusu.checked;

    const sonuc = projeler.filter(p => {
        const metinUyuyor = !aranan
            || kucukHarf(p.baslik).includes(aranan)
            || kucukHarf(p.aciklama).includes(aranan);
        // Seçilen becerilerden en az birini isteyen projeler
        const beceriUyuyor = seciliBeceriler.length === 0
            || seciliBeceriler.some(b => p.beceriler.includes(b));
        const durumUyuyor = durum === "tumu" || p.durum === durum;
        const bosYerUyuyor = !sadeceBosYer || p.uye < p.kapasite;

        return metinUyuyor && beceriUyuyor && durumUyuyor && bosYerUyuyor;
    });

    const siralama = siralamaKutusu.value;
    if (siralama === "yeni") {
        sonuc.sort((a, b) => b.tarih.localeCompare(a.tarih));
    } else if (siralama === "bos-yer") {
        sonuc.sort((a, b) => (b.kapasite - b.uye) - (a.kapasite - a.uye));
    } else {
        sonuc.sort((a, b) => a.baslik.localeCompare(b.baslik, "tr"));
    }
    return sonuc;
}

// Şablondan bir proje kartı üretir (textContent kullanıldığı için HTML enjekte edilemez)
function kartOlustur(proje) {
    const kart = kartSablonu.content.cloneNode(true);

    const durum = kart.querySelector(".durum");
    durum.textContent = DURUM_YAZISI[proje.durum];
    durum.classList.add(proje.durum === "acik" ? "durum-acik" : "durum-devam");

    kart.querySelector(".kart-baslik").textContent = proje.baslik;
    kart.querySelector(".kart-aciklama").textContent = proje.aciklama;

    const etiketler = kart.querySelector(".etiketler");
    proje.beceriler.forEach(beceri => {
        const etiket = document.createElement("span");
        etiket.textContent = beceri;
        etiketler.append(etiket);
    });

    const takim = kart.querySelector(".kart-takim");
    takim.textContent = `Takım: ${proje.uye} / ${proje.kapasite}`;
    if (proje.uye >= proje.kapasite) {
        takim.classList.add("takim-dolu");
        takim.textContent += " (dolu)";
    }
    return kart;
}

// Listeyi ekrana çizer
function listeyiGoster() {
    const liste = filtrelenmisProjeler();

    izgara.replaceChildren(...liste.map(kartOlustur));
    sonucSayisi.textContent = `${liste.length} proje bulundu`;
    bosSonuc.hidden = liste.length > 0;
}

function filtreleriTemizle() {
    aramaKutusu.value = "";
    beceriFiltresi.querySelectorAll("input").forEach(k => { k.checked = false; });
    document.querySelector('input[name="durum"][value="tumu"]').checked = true;
    bosYerKutusu.checked = false;
    siralamaKutusu.value = "yeni";
    listeyiGoster();
}

// Olaylar: her değişiklikte liste anında güncellenir
beceriSecenekleriniOlustur();
document.querySelector(".filtre-paneli").addEventListener("input", listeyiGoster);
siralamaKutusu.addEventListener("change", listeyiGoster);
temizleButonu.addEventListener("click", filtreleriTemizle);

listeyiGoster();
