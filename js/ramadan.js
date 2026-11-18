import { pad, fromYmd } from "./utils.js";
import { getBulan } from "./api.js";

export const RAMADAN_START = "2027-02-08"; // PERKIRAAN, sesuaikan dengan sidang isbat
export const RAMADAN_END = "2027-03-09"; // PERKIRAAN
export const HIJRI_YEAR = 1448;
export const MASEHI_YEAR = 2027;

function monthsBetween(startStr, endStr) {
  const s = fromYmd(startStr),
    e = fromYmd(endStr);
  const out = [];
  const cur = new Date(s.getFullYear(), s.getMonth(), 1);
  while (cur <= e) {
    out.push(`${cur.getFullYear()}-${pad(cur.getMonth() + 1)}`);
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

export async function getRamadanRows(loc) {
  const tz = loc.tz ?? "Asia/Jakarta";
  const bulan = await Promise.all(
    monthsBetween(RAMADAN_START, RAMADAN_END).map((ym) =>
      getBulan(loc.id, ym, tz),
    ),
  );
  return bulan
    .flat()
    .filter((r) => r.date >= RAMADAN_START && r.date <= RAMADAN_END)
    .sort((a, b) => a.date.localeCompare(b.date));
}
