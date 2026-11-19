import { $, pad } from "./utils.js";
import { getSurahList } from "./api.js";

const elList = $("surah-list");
const elStatus = $("surah-status");
const tpl = $("surah-item");
const elSearch = $("surah-search");

let all = [];

const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

function render(list) {
  elList.innerHTML = "";
  const frag = document.createDocumentFragment();

  list.forEach((s) => {
    const node = tpl.content.firstElementChild.cloneNode(true);
    const set = (f, v) => {
      const el = node.querySelector(`[data-f="${f}"]`);
      el.textContent = v;
      el.title = v;
    };

    node.href = `#surat-${s.nomor}`; // <- satu-satunya yang berubah dari versi awal
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

elSearch?.addEventListener("input", () => {
  const raw = elSearch.value.trim();
  const q = norm(raw);
  if (!q) return render(all);
  render(
    all.filter(
      (s) =>
        norm(s.latin).includes(q) ||
        norm(s.arti).includes(q) ||
        String(s.nomor) === raw,
    ),
  );
});

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
