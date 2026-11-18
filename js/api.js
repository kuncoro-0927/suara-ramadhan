import { pad, ymd, nowInTz } from "./utils.js";

const API = "https://api.myquran.com/v3/sholat";

export async function getHari(loc, offset = 0) {
  const d = nowInTz(loc.tz);
  d.setDate(d.getDate() + offset);
  const date = ymd(d);

  const bulan = await getBulan(loc.id, date.slice(0, 7), loc.tz);
  const hari = bulan.find((h) => h.date === date);
  if (!hari) throw new Error("Jadwal tidak tersedia");
  return hari;
}

export async function cariKota(keyword) {
  const res = await fetch(`${API}/kabkota/cari/${encodeURIComponent(keyword)}`);
  if (!res.ok) throw new Error("Gagal cari kota");
  const json = await res.json();
  return json?.data ?? []; // [{ id, lokasi }]
}

// Endpoint bulanan dibatasi 5 req/menit, jadi di-cache di memori + localStorage
const mem = {};
export async function getBulan(kotaId, ym, tz) {
  const key = `${kotaId}|${ym}|${tz}`;
  if (mem[key]) return mem[key];

  try {
    const c = localStorage.getItem("bulan:" + key);
    if (c) return (mem[key] = JSON.parse(c));
  } catch {}

  const res = await fetch(`${API}/jadwal/${kotaId}/${ym}?tz=${tz}`);
  if (!res.ok) throw new Error("Gagal ambil jadwal");
  const json = await res.json();

  const raw = json?.data?.jadwal ?? json?.data ?? [];
  const arr = Array.isArray(raw) ? raw : Object.values(raw);

  const rows = arr.map((d, i) => ({
    ...d, // imsak, subuh, dzuhur, ashar, maghrib, isya, dst.
    date: /^\d{4}-\d{2}-\d{2}$/.test(d.date) ? d.date : `${ym}-${pad(i + 1)}`,
  }));

  mem[key] = rows;
  try {
    localStorage.setItem("bulan:" + key, JSON.stringify(rows));
  } catch {}
  return rows;
}
