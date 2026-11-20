import { $, ymd, fromYmd, nowInTz, pad } from "./utils.js";
import { getBulan } from "./api.js";
import { getSavedLocation, onLocationChange } from "./location.js";
import { getRamadanRows } from "./ramadan.js";
const COLS = ["imsak", "subuh", "dzuhur", "ashar", "maghrib", "isya"];

const elBody = $("imsakiyah-body");
const elLocs = document.querySelectorAll("[data-imsakiyah-location]");
const setLocText = (t) => elLocs.forEach((n) => (n.textContent = t));

const fmtDate = new Intl.DateTimeFormat("id-ID", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

let reqId = 0;

const showMessage = (msg) => {
  elBody.innerHTML = `<tr><td colspan="8" class="py-6 text-center text-xs">${msg}</td></tr>`;
};

function render(rows, tz) {
  const today = ymd(nowInTz(tz)); // hari ini menurut zona kota
  elBody.innerHTML = "";

  rows.forEach((r, i) => {
    const tr = document.createElement("tr");
    const isToday = r.date === today;
    tr.className =
      "border-t border-white/10 " +
      (isToday ? "bg-green-100/50 text-biru-tua font-medium" : "");
    if (isToday) tr.dataset.today = "true";

    tr.innerHTML = [
      `<td class="py-2 px-2 text-biru-tua">${i + 1}</td>`,
      `<td class="py-2 px-2 text-left whitespace-nowrap">${fmtDate.format(fromYmd(r.date))}</td>`,
      ...COLS.map((c) => `<td class="py-2 px-2">${r[c] ?? "--:--"}</td>`),
    ].join("");
    elBody.appendChild(tr);
  });

  elBody
    .querySelector("[data-today]")
    ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

async function load(loc) {
  const myReq = ++reqId;
  setLocText(loc.name);
  elBody.innerHTML = "";

  try {
    const tz = loc.tz ?? "Asia/Jakarta";
    const rows = await getRamadanRows(loc);
    if (myReq !== reqId) return;
    if (!rows.length) throw new Error("Data kosong");
    render(rows, tz);
  } catch (err) {
    console.error(err);
    showMessage("Gagal memuat jadwal. Coba lagi nanti.");
  }
}

/* ===== INIT ===== */
onLocationChange(load);
const saved = getSavedLocation();
if (saved) {
  load(saved);
} else {
  setLocText("Mendeteksi lokasi...");
  showMessage("Mendeteksi lokasi...");
}
