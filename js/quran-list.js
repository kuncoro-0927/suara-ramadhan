import { $, pad } from "./utils.js";
import { getSurahList } from "./api.js";

const elList = $("surah-list");
const elStatus = $("surah-status");
const tpl = $("surah-item");

const elSearch = $("surah-search");
const elDropdown = $("surah-search-dropdown");
const tplSearch = $("surah-search-item");

let all = [];

const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/* ===== RENDER DAFTAR SURAH ===== */

function render(list) {
  elList.innerHTML = "";
  const frag = document.createDocumentFragment();

  list.forEach((s) => {
    const node = tpl.content.firstElementChild.cloneNode(true);

    const set = (f, v) => {
      const el = node.querySelector(`[data-f="${f}"]`);
      if (el) {
        el.textContent = v ?? "";
        el.title = v ?? "";
      }
    };

    node.href = `#surat-${s.nomor}`;

    set("nomor", pad(s.nomor));
    set("latin", s.latin ?? "-");
    set("arab", s.arab ?? "");
    set("arti", s.arti ?? "");
    set("ayat", s.ayat ? `${s.ayat} ayat` : "");

    frag.appendChild(node);
  });

  elList.appendChild(frag);
  elStatus.textContent = list.length ? "" : "Surat tidak ditemukan.";
}

/* ===== DROPDOWN PENCARIAN ===== */

function renderDropdown(list) {
  elDropdown.innerHTML = "";

  if (!list.length) {
    const empty = document.createElement("p");

    empty.className = "px-4 py-3 text-sm text-biru-tua";
    empty.textContent = "Surat tidak ditemukan.";

    elDropdown.appendChild(empty);
    elDropdown.classList.remove("hidden");
    return;
  }

  const frag = document.createDocumentFragment();

  list.slice(0, 8).forEach((s) => {
    // Clone template dari HTML
    const link = tplSearch.content.firstElementChild.cloneNode(true);

    link.href = `#surat-${s.nomor}`;

    const set = (field, value) => {
      const el = link.querySelector(`[data-f="${field}"]`);
      if (el) el.textContent = value ?? "";
    };

    set("nomor", pad(s.nomor));
    set("latin", s.latin ?? "-");
    set("meta", `${s.arti ?? ""} · ${s.ayat} ayat`);
    set("arab", s.arab ?? "");

    link.addEventListener("click", () => {
      elSearch.value = "";
      elDropdown.classList.add("hidden");
    });

    frag.appendChild(link);
  });

  elDropdown.appendChild(frag);
  elDropdown.classList.remove("hidden");
}

/* ===== EVENT PENCARIAN ===== */

elSearch?.addEventListener("input", () => {
  const raw = elSearch.value.trim();
  const q = norm(raw);

  if (!q) {
    elDropdown.classList.add("hidden");
    return;
  }

  const results = all.filter(
    (s) =>
      norm(s.latin).includes(q) ||
      norm(s.arti).includes(q) ||
      String(s.nomor) === raw,
  );

  renderDropdown(results);
});

elSearch?.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    elDropdown.classList.add("hidden");
    elSearch.blur();
  }

  if (e.key === "Enter") {
    const first = elDropdown.querySelector("a");
    if (first) first.click();
  }
});

// Tutup dropdown ketika klik di luar
document.addEventListener("click", (e) => {
  if (!elSearch?.contains(e.target) && !elDropdown?.contains(e.target)) {
    elDropdown?.classList.add("hidden");
  }
});

/* ===== INISIALISASI ===== */

(async function init() {
  elStatus.textContent = "Memuat daftar surat...";

  try {
    all = await getSurahList();
    render(all);
  } catch (err) {
    console.error(err);
    elStatus.textContent = "Gagal memuat daftar surat. Coba lagi nanti.";
  }
})();
