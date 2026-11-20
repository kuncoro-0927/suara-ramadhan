const navInner = document.getElementById("navInner");
const links = document.querySelectorAll(".nav-link");
const sections = [...links].map((l) =>
  document.getElementById(l.dataset.target),
);
const STATE_CLASSES = ["text-gold", "text-krem", "text-biru-tua"];

function setColor(link, ...classes) {
  link.classList.remove(...STATE_CLASSES);
  link.classList.add(...classes);
}

const getActiveIndex = () => {
  // section aktif = yang bagian atasnya sudah lewat 40% tinggi layar
  const line = window.innerHeight * 0.4;
  let active = -1;
  sections.forEach((sec, i) => {
    if (sec && sec.getBoundingClientRect().top <= line) active = i;
  });
  return active;
};
const onScroll = () => {
  const scrolled = window.scrollY > 10;

  // pill utama
  navInner.classList.toggle("bg-krem", scrolled);
  navInner.classList.toggle("bg-transparent", !scrolled);
  navInner.classList.toggle("border-white/40", scrolled);
  navInner.classList.toggle("border-transparent", !scrolled);
  navInner.classList.toggle("backdrop-blur-2xl", scrolled);
  navInner.classList.toggle("shadow-md", scrolled);
  navInner.classList.toggle("max-w-[680px]", scrolled);
  navInner.classList.toggle("max-w-full", !scrolled);
  navInner.classList.toggle("px-6", scrolled);
  navInner.classList.toggle("px-12", !scrolled);

  // warna teks di luar menu (logo)
  navInner.classList.toggle("text-biru-tua", scrolled);
  navInner.classList.toggle("text-krem", !scrolled);

  // warna menu
  const activeIdx = scrolled ? getActiveIndex() : -1;
  links.forEach((link, i) => {
    if (!scrolled) setColor(link, "text-krem");
    else if (i === activeIdx) setColor(link, "text-gold");
    else setColor(link, "text-biru-tua");
  });
};

// klik menu -> scroll halus ke section
links.forEach((link) => {
  link.addEventListener("click", () => {
    document
      .getElementById(link.dataset.target)
      ?.scrollIntoView({ behavior: "smooth" });
  });
});

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onScroll);
onScroll();
