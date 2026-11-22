// Telefonda üst menüyü açıp kapatan düğme.
// JavaScript çalışmazsa menü her zaman açık kalır (sınıf yalnızca burada eklenir).
document.documentElement.classList.add("js");

const menuDugmesi = document.querySelector(".menu-dugmesi");
const anaMenu = document.getElementById("ana-menu");

if (menuDugmesi && anaMenu) {
    menuDugmesi.addEventListener("click", () => {
        const acik = menuDugmesi.getAttribute("aria-expanded") === "true";
        menuDugmesi.setAttribute("aria-expanded", String(!acik));
        anaMenu.classList.toggle("acik", !acik);
    });
}
