import { pad, ymd, nowInTz } from "./utils.js";

const API = "https://api.myquran.com/v3/sholat";
const QURAN = "https://api.myquran.com/v2/quran";

/* ================= AL-QUR'AN: DAFTAR SURAT ================= */
function normalizeSurah(s) {
  return {
    nomor: Number(s.number),
    latin: s.name_id,
    arab: s.name_short,
    arabPanjang: s.name_long,
    arti: s.translation_id,
    ayat: Number(s.number_of_verses),
    tipe: s.revelation_id, // "Makkiyyah"
    deskripsi: s.tafsir,
    audio: s.audio_url,
  };
}

function extractList(json) {
  const d = json?.data ?? json;
  return (Array.isArray(d) ? d : Object.values(d ?? {})).filter(
    (x) => x && typeof x === "object",
  );
}

export async function getSurahList() {
  const CK = "quran:surah-list:v4";
  try {
    const c = JSON.parse(localStorage.getItem(CK));
    if (c?.length === 114) return c;
  } catch {}

  const res = await fetch(`${QURAN}/surat/semua`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();

  const list = extractList(json).map(normalizeSurah);
  if (!list.length || !list[0].nomor || !list[0].latin) {
    console.warn("Struktur data tidak dikenali", json);
    throw new Error("Struktur data tidak dikenali");
  }

  list.sort((a, b) => a.nomor - b.nomor);
  if (list.length === 114) {
    try {
      localStorage.setItem(CK, JSON.stringify(list));
    } catch {}
  }
  return list;
}

/* ================= AL-QUR'AN: AYAT ================= */
const ADA_ARAB = /[\u0600-\u06FF]/;
export const AYAT_PER_HALAMAN = 25;

const normalizeAyat = (a) => ({
  nomor: Number(a.ayah),
  arab: a.arab,
  latin: (a.latin ?? "").trim(),
  arti: a.text,
  audio: a.audio,
  juz: a.juz ? Number(a.juz) : null,
  page: a.page ? Number(a.page) : null,
});

async function fetchAyatJson(path) {
  const res = await fetch(QURAN + path);
  if (!res.ok) throw new Error(`HTTP ${res.status} di ${path}`);
  const json = await res.json();
  const d = json?.data;
  return Array.isArray(d) ? d : d ? [d] : [];
}

// Format rentang yang dicoba. Hasilnya diverifikasi, lalu format yang berhasil diingat.
const RANGE_FORMATS = [
  (n, a, b) => `/ayat/${n}/${a}-${b}`,
  (n, a, b) => `/ayat/${n}/${a}/${b}`,
];
let rangeMode; // undefined = belum dicoba, -1 = tidak ada, angka = indeks format

async function fetchRange(n, from, to) {
  const want = to - from + 1;
  if (want === 1) return fetchAyatJson(`/ayat/${n}/${from}`);

  if (rangeMode !== -1) {
    const modes = rangeMode === undefined ? RANGE_FORMATS.keys() : [rangeMode];
    for (const i of modes) {
      try {
        const rows = await fetchAyatJson(RANGE_FORMATS[i](n, from, to));
        if (rows.length === want && Number(rows[0].ayah) === from) {
          if (rangeMode === undefined)
            console.log(
              "Format rentang ayat yang berhasil:",
              RANGE_FORMATS[i](1, 1, 7),
            );
          rangeMode = i;
          return rows;
        }
      } catch {}
    }
    if (rangeMode === undefined) {
      rangeMode = -1;
      console.log("Tidak ada endpoint rentang, ayat diambil satu per satu.");
    }
  }

  // cadangan: satu per satu, 5 paralel
  const out = [];
  for (let k = from; k <= to; k += 5) {
    const batch = [];
    for (let j = k; j < Math.min(k + 5, to + 1); j++) {
      batch.push(fetchAyatJson(`/ayat/${n}/${j}`).then((r) => r[0]));
    }
    out.push(...(await Promise.all(batch)));
  }
  return out;
}

/* ================= AUDIO AYAT: MYQURAN V3 ================= */

const QURAN_V3 = "https://api.myquran.com/v3/quran";

async function getAyatAudioV3(nomor, from, to) {
  const page = Math.floor((from - 1) / AYAT_PER_HALAMAN) + 1;

  const res = await fetch(
    `${QURAN_V3}/${nomor}?page=${page}&limit=${AYAT_PER_HALAMAN}`,
  );

  if (!res.ok) {
    throw new Error(`Gagal mengambil audio v3: HTTP ${res.status}`);
  }

  const json = await res.json();

  if (!json.status || !json.data?.ayahs) {
    throw new Error("Data audio MyQuran v3 tidak ditemukan");
  }

  return json.data.ayahs
    .filter((ayah) => {
      const nomorAyat = Number(ayah.ayah_number);
      return nomorAyat >= from && nomorAyat <= to;
    })
    .map((ayah) => ({
      nomor: Number(ayah.ayah_number),
      audio: ayah.audio_url,
    }));
}

export async function getAyatChunk(nomor, from, to) {
  const CK = `quran:ayat:v3-audio:${nomor}:${from}-${to}`;

  // Ambil cache terbaru jika tersedia
  try {
    const cached = JSON.parse(localStorage.getItem(CK));
    if (cached?.length) return cached;
  } catch {}

  // 1. Ambil teks Arab, latin, dan terjemahan dari v2
  const rowsV2 = (await fetchRange(nomor, from, to)).filter(Boolean);

  if (!rowsV2.length || !ADA_ARAB.test(rowsV2[0].arab ?? "")) {
    throw new Error("Ayat tidak ditemukan atau struktur berubah");
  }

  const rows = rowsV2.map(normalizeAyat);

  // 2. Ambil audio dari v3
  const audioRows = await getAyatAudioV3(nomor, from, to);

  const audioMap = new Map(audioRows.map((item) => [item.nomor, item.audio]));

  // 3. Gabungkan data v2 dan v3
  const result = rows.map((ayat) => ({
    ...ayat,
    audio: audioMap.get(ayat.nomor) || null,
  }));

  // 4. Simpan hasil gabungan
  try {
    localStorage.setItem(CK, JSON.stringify(result));
  } catch {}

  return result;
}

/* ================= JADWAL SHOLAT ================= */
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
