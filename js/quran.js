import { $ } from "./utils.js";
import "./quran-list.js"; // menjalankan daftar surat
import { showSurah, stopAudio } from "./surat.js";

const viewList = $("view-list");
const viewDetail = $("view-detail");
const LIST_TITLE = document.title;
let listScroll = 0;
let inDetail = false;

function route() {
  const m = location.hash.match(/^#surat-(\d{1,3})$/);
  const nomor = m ? Number(m[1]) : 0;

  if (nomor >= 1 && nomor <= 114) {
    if (!inDetail) listScroll = window.scrollY; // ingat posisi daftar
    inDetail = true;
    viewList.classList.add("hidden");
    viewDetail.classList.remove("hidden");
    window.scrollTo(0, 0);
    showSurah(nomor);
  } else {
    stopAudio();
    inDetail = false;
    viewDetail.classList.add("hidden");
    viewList.classList.remove("hidden");
    document.title = LIST_TITLE;
    requestAnimationFrame(() => window.scrollTo(0, listScroll));
  }
}

window.addEventListener("hashchange", route);
route(); // juga menangani kasus dibuka langsung dengan #surat-5
