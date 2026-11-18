export const $ = (id) => document.getElementById(id);
export const pad = (n) => String(n).padStart(2, "0");
export const title = (s) =>
  s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export const TZ_LABEL = {
  "Asia/Jakarta": "WIB",
  "Asia/Pontianak": "WIB",
  "Asia/Makassar": "WITA",
  "Asia/Jayapura": "WIT",
};

// perkiraan zona waktu dari bujur (batas pulau kecil bisa meleset)
export const tzDariBujur = (lon) =>
  lon < 114.5 ? "Asia/Jakarta" : lon < 127 ? "Asia/Makassar" : "Asia/Jayapura";

// "sekarang" menurut zona kota, bukan zona perangkat
export const nowInTz = (tz) =>
  new Date(new Date().toLocaleString("en-US", { timeZone: tz }));

export const ymd = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromYmd = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const MASEHI = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const HIJRI = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

const BULAN_HIJRI = [
  "Muharram",
  "Safar",
  "Rabiul Awal",
  "Rabiul Akhir",
  "Jumadal Ula",
  "Jumadal Akhirah",
  "Rajab",
  "Sya'ban",
  "Ramadhan",
  "Syawal",
  "Dzulqa'dah",
  "Dzulhijjah",
];

// Koreksi bila kalender Hijriah Kemenag beda sehari dari hitungan Umm al-Qura (-1, 0, atau 1)
export const HIJRI_OFFSET = 0;

export function formatTanggal(tz) {
  const now = nowInTz(tz);

  const h = new Date(now);
  h.setDate(h.getDate() + HIJRI_OFFSET);
  const p = Object.fromEntries(
    HIJRI.formatToParts(h).map((x) => [x.type, x.value]),
  );

  return `${MASEHI.format(now)} · ${p.day} ${BULAN_HIJRI[p.month - 1]} ${p.year} H`;
}
