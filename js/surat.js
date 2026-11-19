import { $, pad } from "./utils.js";
import { getSurahList, getAyatChunk, AYAT_PER_HALAMAN } from "./api.js";

const tpl = $("ayat-item");
const elList = $("ayat-list");
const elStatus = $("ayat-status");

// penanda di bawah daftar; saat terlihat, kelompok ayat berikutnya dimuat
const sentinel = document.createElement("div");
sentinel.className = "h-8";
elList.after(sentinel);

let reqId = 0;
let observer;
let state = null; // { nomor, total, next, loading, myReq }

function renderHead(s) {
  $("sh-arab").textContent = s.arab;
  $("sh-latin").textContent = `${s.latin}`;
  $("sh-meta").textContent = [s.arti, s.tipe, `${s.ayat} ayat`]
    .filter(Boolean)
    .join(" · ");

  const audio = $("sh-audio");
  audio.pause();
  audio.src = s.audio || "";
  audio.classList.toggle("hidden", !s.audio);
  document.title = `${s.latin} · Al-Qur'an`;
}

function renderNav(all, s) {
  const set = (el, x, label) => {
    el.classList.toggle("hidden", !x);
    if (x) {
      el.href = `#surat-${x.nomor}`;
      el.textContent = label(x);
    }
  };
  set(
    $("nav-prev"),
    all.find((x) => x.nomor === s.nomor - 1),
    (x) => `← ${x.latin}`,
  );
  set(
    $("nav-next"),
    all.find((x) => x.nomor === s.nomor + 1),
    (x) => `${x.latin} →`,
  );
}

function appendAyat(rows) {
  const frag = document.createDocumentFragment();
  rows.forEach((a) => {
    const node = tpl.content.firstElementChild.cloneNode(true);
    const set = (f, v) => {
      const el = node.querySelector(`[data-f="${f}"]`);
      if (el) el.textContent = v ?? "";
    };
    set("nomor", a.nomor);
    set("arab", a.arab);
    set("latin", a.latin); // opsional: hanya terisi bila template punya data-f="latin"
    set("arti", a.arti);
    frag.appendChild(node);
  });
  elList.appendChild(frag);
}

// sentinel masih dekat layar? lanjut muat (observer hanya memicu saat posisi berubah)
const nearViewport = () =>
  sentinel.getBoundingClientRect().top < window.innerHeight + 600;

async function loadMore(st) {
  if (st !== state || st.loading || st.next > st.total) return;
  st.loading = true;

  const from = st.next;
  const to = Math.min(from + AYAT_PER_HALAMAN - 1, st.total);
  elStatus.textContent = "Memuat ayat...";
  elStatus.onclick = null;

  try {
    const rows = await getAyatChunk(st.nomor, from, to);
    if (st !== state) return; // pengguna sudah pindah surat
    appendAyat(rows);
    st.next = to + 1;
    elStatus.textContent = "";
  } catch (err) {
    if (st !== state) return;
    console.error(err);
    elStatus.textContent = "Gagal memuat ayat. Ketuk di sini untuk coba lagi.";
    elStatus.onclick = () => loadMore(st);
    st.loading = false;
    return;
  }

  st.loading = false;
  if (st.next > st.total) return observer?.disconnect();
  if (nearViewport()) loadMore(st);
}

export function stopAudio() {
  $("sh-audio").pause();
}

export async function showSurah(nomor) {
  const myReq = ++reqId;
  observer?.disconnect();
  state = null;
  elList.replaceChildren();
  elStatus.textContent = "Memuat...";
  elStatus.onclick = null;

  try {
    const all = await getSurahList();
    if (myReq !== reqId) return;
    const s = all.find((x) => x.nomor === nomor);
    if (!s) throw new Error("Surat tidak ditemukan");
    renderHead(s);
    renderNav(all, s);

    const st = (state = { nomor, total: s.ayat, next: 1, loading: false });
    observer = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && loadMore(st),
      { rootMargin: "600px" },
    );
    observer.observe(sentinel);
    loadMore(st); // kelompok pertama langsung dimuat
  } catch (err) {
    if (myReq !== reqId) return;
    console.error(err);
    elStatus.textContent = "Gagal memuat surat. Coba lagi nanti.";
  }
}
