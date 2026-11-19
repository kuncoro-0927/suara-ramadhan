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

/* ===== AUDIO PER AYAT ===== */
const AUTO_LANJUT = true; // true: selesai satu ayat, lanjut otomatis ke ayat berikutnya
const audio = new Audio(); // satu pemutar dipakai bergantian oleh semua ayat
audio.preload = "none";
let cur = null; // { li, a } ayat yang sedang aktif
let dragging = false;

const mmss = (s) =>
  Number.isFinite(s)
    ? `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`
    : "0:00";

function resetRow(li) {
  if (!li) return;
  li.dataset.active = "false";
  li.dataset.playing = "false";
  li.querySelector("[data-play]")?.setAttribute("aria-pressed", "false");
  li.querySelector("[data-seek]").value = 0;
  li.querySelector("[data-cur]").textContent = "0:00";
  li.querySelector("[data-dur]").textContent = "0:00";
}

function setPlaying(v) {
  if (!cur) return;
  cur.li.dataset.playing = String(v);
  cur.li.querySelector("[data-play]").setAttribute("aria-pressed", String(v));
}

function gagalPutar(err) {
  if (err?.name === "AbortError") return; // diganti audio lain, bukan error
  console.error(err);
  resetRow(cur?.li);
  cur = null;
  const msg = "Audio ayat tidak bisa diputar.";
  elStatus.textContent = msg;
  setTimeout(() => {
    if (elStatus.textContent === msg) elStatus.textContent = "";
  }, 3000);
}

function toggleAyat(li, a) {
  if (cur?.li === li) {
    // tombol ayat yang sama: jeda / lanjut
    if (audio.paused) audio.play().catch(gagalPutar);
    else audio.pause();
    return;
  }
  $("sh-audio").pause(); // matikan audio satu surat penuh
  resetRow(cur?.li);
  cur = { li, a };
  li.dataset.active = "true";
  audio.src = a.audio;
  audio.play().catch(gagalPutar);
}

function bindAudio(li, a) {
  const btn = li.querySelector("[data-play]");
  const seek = li.querySelector("[data-seek]");
  if (!btn || !seek) return; // template tanpa tombol audio

  if (!a.audio) {
    btn.disabled = true;
    btn.title = "Audio tidak tersedia";
    return;
  }

  btn.setAttribute("aria-label", `Putar ayat ${a.nomor}`);
  btn.addEventListener("click", () => toggleAyat(li, a));

  seek.addEventListener("pointerdown", () => (dragging = true));
  seek.addEventListener("input", () => {
    if (cur?.li !== li || !Number.isFinite(audio.duration)) return;
    audio.currentTime = (seek.value / 100) * audio.duration;
    li.querySelector("[data-cur]").textContent = mmss(audio.currentTime);
  });
}

// ayat berikutnya; kalau belum termuat, tunggu kelompok berikutnya selesai dimuat
async function ayatBerikutnya(li) {
  for (let i = 0; i < 10; i++) {
    if (li.nextElementSibling) return li.nextElementSibling;
    if (!state || state.next > state.total) return null;
    await loadMore(state);
    if (!li.nextElementSibling) await new Promise((r) => setTimeout(r, 300));
  }
  return null;
}

window.addEventListener("pointerup", () => (dragging = false));
audio.addEventListener("play", () => setPlaying(true));
audio.addEventListener("pause", () => setPlaying(false));
audio.addEventListener("loadedmetadata", () => {
  if (cur)
    cur.li.querySelector("[data-dur]").textContent = mmss(audio.duration);
});
audio.addEventListener("timeupdate", () => {
  if (!cur || dragging || !Number.isFinite(audio.duration)) return;
  cur.li.querySelector("[data-seek]").value =
    (audio.currentTime / audio.duration) * 100;
  cur.li.querySelector("[data-cur]").textContent = mmss(audio.currentTime);
});
audio.addEventListener("error", () => gagalPutar(audio.error));
audio.addEventListener("ended", async () => {
  const li = cur?.li;
  if (!li) return;
  let next = AUTO_LANJUT ? await ayatBerikutnya(li) : null;
  // lewati ayat yang audionya tidak tersedia
  while (next && next.querySelector("[data-play]")?.disabled) {
    next = await ayatBerikutnya(next);
  }
  if (cur?.li !== li) return; // pengguna sudah memilih ayat lain
  resetRow(li);
  cur = null;
  if (next) {
    next.querySelector("[data-play]")?.click();
    next.scrollIntoView({ block: "center", behavior: "smooth" });
  }
});

// audio satu surat penuh dan audio per ayat tidak boleh bunyi bersamaan
$("sh-audio").addEventListener("play", () => audio.pause());

/* ===== TAMPILAN SURAT ===== */
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
    bindAudio(node, a);
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
  audio.pause();
  resetRow(cur?.li);
  cur = null;
}

export async function showSurah(nomor) {
  const myReq = ++reqId;
  stopAudio();
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
