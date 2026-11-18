import { $, pad, ymd, nowInTz, TZ_LABEL, formatTanggal } from "./utils.js";

import { getHari } from "./api.js";
import {
  getSavedLocation,
  onLocationChange,
  detectLocation,
} from "./location.js";
const elDate = $("today-date");
let dateKey = null;

// hanya render ulang saat tanggal berganti
function renderDate(tz) {
  if (!elDate) return;
  const k = ymd(nowInTz(tz));
  if (k === dateKey) return;
  dateKey = k;
  elDate.textContent = formatTanggal(tz);
}

const PRAYERS = ["imsak", "subuh", "dzuhur", "ashar", "maghrib", "isya"];
const LABEL = {
  imsak: "Imsak",
  subuh: "Subuh",
  dzuhur: "Dzuhur",
  ashar: "Ashar",
  maghrib: "Maghrib",
  isya: "Isya",
};

const clean = (s) => String(s).split(" ")[0]; // buang suffix zona bila ada
let timer;
let reqId = 0;

const cell = (p) => document.querySelector(`[data-prayer="${p}"]`);

function highlight(key) {
  document.querySelectorAll("[data-prayer-card]").forEach((c) => {
    const active = c.dataset.prayerCard === key;
    c.classList.toggle("text-gold", active);
    c.classList.toggle("font-semibold", active);
  });
}

async function load(loc) {
  clearInterval(timer);
  const myReq = ++reqId;

  $("selected-location").textContent = loc.name;
  PRAYERS.forEach((p) => {
    if (cell(p)) cell(p).textContent = "--:--";
  });
  dateKey = null;
  renderDate(loc.tz);

  let today, tomorrow;
  try {
    [today, tomorrow] = await Promise.all([getHari(loc, 0), getHari(loc, 1)]);
  } catch (err) {
    console.error(err);
    $("event-name").textContent = "Gagal memuat";
    $("event-time").textContent = "--.--";
    $("countdown").textContent = "--:--:--";
    return;
  }
  if (myReq !== reqId) return;

  PRAYERS.forEach((p) => {
    if (cell(p) && today[p]) cell(p).textContent = clean(today[p]);
  });

  const tz = loc.tz;
  const tzLabel = TZ_LABEL[tz] ?? tz;

  const toDate = (dayOffset, str) => {
    const [h, m] = clean(str).split(":").map(Number);
    const t = nowInTz(tz);
    t.setDate(t.getDate() + dayOffset);
    t.setHours(h, m, 0, 0);
    return t;
  };

  const events = [
    ...PRAYERS.filter((p) => today[p]).map((p) => ({
      key: p,
      time: toDate(0, today[p]),
      tomorrow: false,
    })),
    { key: "imsak", time: toDate(1, tomorrow.imsak), tomorrow: true },
  ];

  const tick = () => {
    const now = nowInTz(tz);
    renderDate(tz);
    const next = events.find((e) => e.time > now);
    if (!next) return load(loc); // hari berganti, muat ulang

    $("event-name").textContent = LABEL[next.key];
    $("event-time").textContent =
      `${pad(next.time.getHours())}.${pad(next.time.getMinutes())} ${tzLabel}`;
    $("event-label").textContent = next.tomorrow
      ? "besok"
      : `menuju waktu ${LABEL[next.key].toLowerCase()}`;
    highlight(next.tomorrow ? null : next.key);

    const s = Math.floor((next.time - now) / 1000);
    $("countdown").textContent =
      `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  };

  tick();
  timer = setInterval(tick, 1000);
}

/* ===== INIT ===== */
onLocationChange(load);
const saved = getSavedLocation();
saved ? load(saved) : detectLocation(); // hanya satu file yang boleh memanggil ini
