const IMG = "./assets/images/the-reminder.jpg";
const Takis1 = "./assets/images/takis1.png";
const contents = {
  takis: [{ src: Takis1 }, { src: Takis1 }, { src: Takis1 }, { src: Takis1 }],
  skeptis: [{ src: Takis1 }, { src: Takis1 }],
  serasa: [{ src: Takis1 }, { src: Takis1 }],
  bersuaramadan: [
    {
      src: Takis1,
    },
    {
      src: Takis1,
    },
  ],
};
const labels = {
  takis: "Takis",
  skeptis: "Skeptis",
  serasa: "Serasa",
  bersuaramadan: "BersuaraMadan",
};

const tabsEl = document.getElementById("tabs");
const track = document.getElementById("track");
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");
const counter = document.getElementById("counter");
let current = "takis";

const tpl = document.getElementById("reminderCardTpl");

function renderCards() {
  track.replaceChildren(
    ...contents[current].map((c) => {
      const card = tpl.content.cloneNode(true);
      const img = card.querySelector("[data-img]");
      img.src = c.src;
      img.alt = c.alt ?? labels[current];
      return card;
    }),
  );
  track.scrollTo({ left: 0, behavior: "instant" });
  updateNav();
}

function renderTabs() {
  tabsEl.innerHTML = Object.keys(contents)
    .map((key) => {
      const active = key === current;
      const cls = active
        ? "bg-gold text-krem border-gold"
        : "border-white/20 text-krem hover:border-gold hover:text-gold";
      return `<button type="button" data-key="${key}" class="cursor-pointer rounded-full border px-4 py-2 text-sm leading-none transition ${cls}">${labels[key]}</button>`;
    })
    .join("");
}

function updateNav() {
  const max = track.scrollWidth - track.clientWidth;
  btnPrev.disabled = track.scrollLeft <= 4;
  btnNext.disabled = track.scrollLeft >= max - 4;

  const total = contents[current].length;
  const step = (track.children[0]?.offsetWidth || 288) + 20;
  const idx = Math.min(total, Math.round(track.scrollLeft / step) + 1);
  counter.textContent = `${idx} / ${total}`;
}

const step = () => (track.children[0]?.offsetWidth || 288) + 20;
btnPrev.addEventListener("click", () => track.scrollBy({ left: -step() }));
btnNext.addEventListener("click", () => track.scrollBy({ left: step() }));
track.addEventListener("scroll", updateNav, { passive: true });
window.addEventListener("resize", updateNav);

tabsEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-key]");
  if (!btn) return;
  current = btn.dataset.key;
  renderTabs();
  renderCards();
});

renderTabs();
renderCards();
