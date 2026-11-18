import { $, title, tzDariBujur } from "./utils.js";
import { cariKota } from "./api.js";

const KEY = "kota";
export const DEFAULT_LOC = {
  q: "jakarta",
  name: "Kota Jakarta",
  tz: "Asia/Jakarta",
};
const listeners = new Set();

/* ===== STATE ===== */
export function getSavedLocation() {
  try {
    const l = JSON.parse(localStorage.getItem(KEY));
    return l?.id ? l : null;
  } catch {
    return null;
  }
}

export function onLocationChange(fn) {
  listeners.add(fn);
}

// simpan + beri tahu semua halaman/skrip yang mendengarkan
export async function setLocation(loc) {
  if (!loc.id) {
    const k = (await cariKota(loc.q))[0];
    if (!k) throw new Error("Kota tidak ditemukan");
    loc = { ...loc, id: k.id };
  }
  localStorage.setItem(KEY, JSON.stringify(loc));
  listeners.forEach((fn) => fn(loc));
}

// sinkron antar tab
window.addEventListener("storage", (e) => {
  if (e.key !== KEY) return;
  const l = getSavedLocation();
  if (l) listeners.forEach((fn) => fn(l));
});

/* ===== MODAL ===== */
const modal = $("loc-modal");

const setStatus = (msg) => {
  const el = $("modal-status");
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle("hidden", !msg);
};

export const openModal = () => {
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  $("loc-input").focus();
};

const closeModal = () => {
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  $("loc-results").innerHTML = "";
  $("loc-input").value = "";
  setStatus("");
};

$("btn-open-modal")?.addEventListener("click", openModal);
$("btn-close-modal")?.addEventListener("click", closeModal);
modal?.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal && !modal.classList.contains("hidden"))
    closeModal();
});

/* ===== GPS ===== */
export function detectLocation(fromModal = false) {
  const fallback = () => setLocation(DEFAULT_LOC).catch(console.error);

  if (!navigator.geolocation) {
    if (fromModal) setStatus("Browser tidak mendukung geolocation");
    else fallback();
    return;
  }
  if (fromModal) setStatus("Mencari lokasimu...");

  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      const { latitude: lat, longitude: lon } = coords;
      const tz = tzDariBujur(lon);

      let kota = null;
      try {
        const r = await (
          await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=id`,
          )
        ).json();
        for (const nama of [r.city, r.locality]) {
          if (!nama) continue;
          kota = (await cariKota(nama.replace(/^(kota|kabupaten)\s+/i, "")))[0];
          if (kota) break;
        }
      } catch {}

      if (!kota) {
        if (fromModal)
          setStatus("Lokasimu belum cocok dengan data. Cari kota manual ya.");
        else fallback();
        return;
      }

      await setLocation({ id: kota.id, name: title(kota.lokasi), tz });
      if (fromModal) closeModal();
    },
    () => {
      if (fromModal)
        setStatus("Izin lokasi ditolak. Cari kota secara manual ya.");
      else fallback();
    },
    { timeout: 8000 },
  );
}

$("btn-gps")?.addEventListener("click", () => detectLocation(true));

/* ===== CARI KOTA ===== */
async function zonaKota(lokasi) {
  try {
    const [r] = await (
      await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(lokasi + ", Indonesia")}&format=json&limit=1&countrycodes=id`,
      )
    ).json();
    if (r) return tzDariBujur(+r.lon);
  } catch {}
  return "Asia/Jakarta";
}

async function searchCity() {
  const q = $("loc-input").value.trim();
  if (!q) return;

  const list = $("loc-results");
  list.innerHTML = "";
  setStatus("Mencari...");

  try {
    const res = (await cariKota(q)).slice(0, 8);
    if (!res.length) return setStatus("Kota tidak ditemukan");
    setStatus("");

    res.forEach((item) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "w-full text-left rounded-xl px-3 py-2 text-sm hover:bg-white/15 transition cursor-pointer";
      btn.textContent = title(item.lokasi);

      btn.addEventListener("click", async () => {
        setStatus("Memuat...");
        const tz = await zonaKota(item.lokasi);
        await setLocation({ id: item.id, name: title(item.lokasi), tz });
        closeModal();
      });

      li.appendChild(btn);
      list.appendChild(li);
    });
  } catch {
    setStatus("Gagal mencari kota, coba lagi");
  }
}

$("btn-search")?.addEventListener("click", searchCity);
$("loc-input")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchCity();
});
$("btn-gps-main")?.addEventListener("click", () => {
  openModal(); // supaya status "Mencari lokasimu..." / error terlihat
  detectLocation(true); // sukses -> modal menutup sendiri
});
