const berita = [
  {
    kategori: "Otomotif",
    judul:
      "Berapa Saldo E-Toll yang Dibutuhkan dari Semarang ke Jakarta untuk Arus Balik? Ini Rinciannya",
    gambar: "/assets/images/news/92730-gerbang-tol-kalikangkung-semarang.jpg",
    url: "#",
  },
  {
    kategori: "Lifestyle",
    judul:
      "Promo KFC Lebaran 2026: Super Besar 1 Mulai Rp23 Ribuan, Ada Bucket Hemat untuk Keluarga",
    gambar: "/assets/images/news/69388-promo-kfc-attack-chicken.jpg",
    url: "#",
  },
  {
    kategori: "Lifestyle",
    judul:
      "Cara Atur Jadwal Puasa Syawal dan Qadha agar Selesai Sebelum Masuk Bulan Dzulqa'dah, Wajib Catat",
    gambar: "/assets/images/news/kurma.jpg",
    url: "#",
  },
  {
    kategori: "Bisnis",
    judul:
      "EV Kian Diminati, Transaksi SPKLU PLN Tembus Rekor Tertinggi 18.088 Kali pada H+2 Idulfitri 1447 H",
    gambar: "/assets/images/news/95851-pln.jpg",
    url: "#",
  },

  {
    kategori: "Bisnis",
    judul:
      "EV Kian Diminati, Transaksi SPKLU PLN Tembus Rekor Tertinggi 18.088 Kali pada H+2 Idulfitri 1447 H",
    gambar: "/assets/images/news/95851-pln.jpg",
    url: "#",
  },

  {
    kategori: "Bisnis",
    judul:
      "EV Kian Diminati, Transaksi SPKLU PLN Tembus Rekor Tertinggi 18.088 Kali pada H+2 Idulfitri 1447 H",
    gambar: "/assets/images/news/95851-pln.jpg",
    url: "#",
  },

  {
    kategori: "Bisnis",
    judul:
      "EV Kian Diminati, Transaksi SPKLU PLN Tembus Rekor Tertinggi 18.088 Kali pada H+2 Idulfitri 1447 H",
    gambar: "/assets/images/news/95851-pln.jpg",
    url: "#",
  },
  // tambah berita lain di sini
];

const newstrack = document.getElementById("newsTrack");
const prev = document.getElementById("newsPrev");
const next = document.getElementById("newsNext");
const controls = document.getElementById("newsControls");
const newstpl = document.getElementById("newsCardTpl");

// Render kartu dari template
newstrack.replaceChildren(
  ...berita.map((b) => {
    const card = newstpl.content.cloneNode(true);

    card.querySelector("[data-url]").href = b.url;

    const img = card.querySelector("[data-img]");
    img.src = b.gambar;
    img.alt = b.judul;

    card.querySelector("[data-kategori]").textContent = b.kategori;
    card.querySelector("[data-judul]").textContent = b.judul;

    return card;
  }),
);

// Status tombol
function update() {
  const max = newstrack.scrollWidth - newstrack.clientWidth;

  // Semua berita muat di layar, sembunyikan tombol
  controls.classList.toggle("hidden", max <= 1);
  if (max <= 1) return;

  prev.disabled = newstrack.scrollLeft <= 1;
  next.disabled = newstrack.scrollLeft >= max - 1;
}

// Geser satu kartu per klik
const newsstep = () =>
  newstrack.firstElementChild.getBoundingClientRect().width + 24;
prev.addEventListener("click", () => newstrack.scrollBy({ left: -newsstep() }));
next.addEventListener("click", () => newstrack.scrollBy({ left: newsstep() }));

newstrack.addEventListener("scroll", update, { passive: true });
window.addEventListener("resize", update);
update();
