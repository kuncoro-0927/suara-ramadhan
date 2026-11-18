import { $, pad, ymd, nowInTz, TZ_LABEL } from "./utils.js";
import { getBulan } from "./api.js";
import {
  getSavedLocation,
  onLocationChange,
  detectLocation,
} from "./location.js";

let timer;
let reqId = 0;

async function getTimings(loc, offset) {
  const d = nowInTz(loc.tz);
  d.setDate(d.getDate() + offset);
  const date = ymd(d);

  const bulan = await getBulan(loc.id, date.slice(0, 7), loc.tz);
  const hari = bulan.find((h) => h.date === date);
  if (!hari) throw new Error("Jadwal tidak tersedia");
  return hari;
}

async function loadNext(loc) {
  clearInterval(timer);
  const myReq = ++reqId;
  $("loc-name").textContent = loc.name;

  let today, tomorrow;
  try {
    [today, tomorrow] = await Promise.all([
      getTimings(loc, 0),
      getTimings(loc, 1),
    ]);
  } catch {
    $("countdown").textContent = "--:--:--";
    $("event-label").textContent = "Gagal memuat jadwal";
    return;
  }
  if (myReq !== reqId) return;

  const tz = loc.tz;
  const tzLabel = TZ_LABEL[tz] ?? tz;

  const toDate = (dayOffset, str) => {
    const [h, m] = str.split(" ")[0].split(":").map(Number);
    const t = nowInTz(tz);
    t.setDate(t.getDate() + dayOffset);
    t.setHours(h, m, 0, 0);
    return t;
  };

  const events = [
    { name: "Imsak", time: toDate(0, today.imsak) },
    { name: "Maghrib", time: toDate(0, today.maghrib) },
    { name: "Imsak", time: toDate(1, tomorrow.imsak) },
  ];

  const tick = () => {
    const now = nowInTz(tz);
    const next = events.find((e) => e.time > now);
    if (!next) return loadNext(loc);

    $("event-name").textContent = next.name;
    $("event-label").textContent = `menuju waktu ${next.name.toLowerCase()}`;
    $("event-time").textContent =
      `${pad(next.time.getHours())}.${pad(next.time.getMinutes())} ${tzLabel}`;

    const s = Math.floor((next.time - now) / 1000);
    $("countdown").textContent = `${pad(Math.floor(s / 3600))}:${pad(
      Math.floor((s % 3600) / 60),
    )}:${pad(s % 60)}`;
  };

  tick();
  timer = setInterval(tick, 1000);
}

/* ===== INIT ===== */
onLocationChange(loadNext);
const saved = getSavedLocation();
saved ? loadNext(saved) : detectLocation();
