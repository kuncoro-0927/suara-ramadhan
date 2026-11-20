import { $ } from "./utils.js";
import { fromYmd } from "./utils.js";
import { getSavedLocation } from "./location.js";
import { getRamadanRows, HIJRI_YEAR, MASEHI_YEAR } from "./ramadan.js";

/* ================= CONFIG: sesuaikan ================= */
const CFG = {
  logoLeft: "./images/suara-ramadhan.svg",
  logoRight: "/img/logo-kanan.png",
  patternOpacity: 0.05,
  patternFade: false, // true = memudar dari pojok kanan atas ke kiri bawah, seperti versi webmu
  colors: {
    bg: "#254545", // hijau tua (samakan dengan biru-tua di Tailwind-mu)
    gold: "#ddaa54",
    bgFrom: "#254545", // kiri: gelap
    bgTo: "#14634a",
    cream: "#fff9e5", // samakan dengan krem
  },
  fontTitle: "'Cinzel', Georgia, serif", // font judul di situsmu
  fontBody: "system-ui, 'Segoe UI', Arial, sans-serif",
};

const W = 794,
  H = 1123; // A4 pada 96 dpi

const COLS = ["imsak", "subuh", "dzuhur", "ashar", "maghrib", "isya"];
const HEAD = {
  imsak: "Imsak",
  subuh: "Subuh",
  dzuhur: "Dzuhur",
  ashar: "Ashar",
  maghrib: "Maghrib",
  isya: "Isya",
};
const GOLD_COLS = new Set(["imsak", "maghrib"]);

const fmtLong = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const clean = (s) => String(s ?? "").split(" ")[0] || "--:--";
const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

/* ================= LOAD LIBRARY (lazy) ================= */
const loaded = {};
function loadScript(src) {
  return (loaded[src] ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Gagal memuat " + src));
    document.head.appendChild(s);
  }));
}

/* ================= POSTER ================= */
function buildPoster(loc, rows) {
  const { bg, bgFrom, bgTo, gold, cream } = CFG.colors;
  const rowH = rows.length > 30 ? 25 : 27;

  const th = (key, label, w) => {
    const color = GOLD_COLS.has(key) ? gold : cream;
    return `<th style="width:${w};padding:0 4px 8px;font-size:13px;font-weight:700;color:${color};text-align:${key === "tanggal" ? "left" : "center"};">${label}</th>`;
  };

  const body = rows
    .map((r, i) => {
      const zebra = i % 2 ? "rgba(255,255,255,0.05)" : "transparent";
      const cells = COLS.map((c) => {
        const color = GOLD_COLS.has(c) ? gold : cream;
        const weight = GOLD_COLS.has(c) ? 600 : 400;
        return `<td style="text-align:center;color:${color};font-weight:${weight};">${esc(clean(r[c]))}</td>`;
      }).join("");
      return `
        <tr style="height:${rowH}px;background:${zebra};border-bottom:1px solid rgba(221,170,84,0.18);font-size:12.5px;">
          <td style="padding-left:6px;color:${cream};">${i + 1} Ramadhan ${HIJRI_YEAR} H</td>
          <td style="color:${cream};white-space:nowrap;">${fmtLong.format(fromYmd(r.date))}</td>
          ${cells}
        </tr>`;
    })
    .join("");

  const logo = (src, align) =>
    src
      ? `<img src="${src}" crossorigin="anonymous" style="display:block;height:52px;max-width:170px;object-fit:contain;margin-${align === "left" ? "right" : "left"}:auto;">`
      : `<div></div>`;

  const pattern = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"
       style="position:absolute;left:0;top:0;" aria-hidden="true">
    <defs>
      <pattern id="islamicPatternPdf" width="60" height="60" patternUnits="userSpaceOnUse">
        <g fill="none" stroke="${gold}" stroke-opacity="${CFG.patternOpacity}" stroke-width="1">
          <rect x="14" y="14" width="32" height="32" />
          <rect x="14" y="14" width="32" height="32" transform="rotate(45 30 30)" />
          <circle cx="0" cy="0" r="8" />
          <circle cx="60" cy="0" r="8" />
          <circle cx="0" cy="60" r="8" />
          <circle cx="60" cy="60" r="8" />
        </g>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#islamicPatternPdf)" />
  </svg>`;

  const el = document.createElement("div");
  el.style.cssText = `position:fixed;left:-10000px;top:0;width:${W}px;height:${H}px;`;
  el.innerHTML = `
<div style="position:relative;width:${W}px;height:${H}px;background:linear-gradient(90deg, ${bgFrom} 0%, ${bgTo} 100%);overflow:hidden;box-sizing:border-box;padding:40px 44px 28px;font-family:${CFG.fontBody};color:${cream};">
      ${pattern}
      <div style="position:relative;display:flex;flex-direction:column;height:100%;">

        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div style="flex:1;">${logo(CFG.logoLeft, "left")}</div>
          <div style="flex:1;">${logo(CFG.logoRight, "right")}</div>
        </div>

        <div style="text-align:center;margin:26px 0 22px;font-family:${CFG.fontTitle};color:${gold};">
          <div style="font-size:25px;font-weight:700;letter-spacing:1px;line-height:1.3;">JADWAL IMSAKIYAH RAMADHAN ${HIJRI_YEAR} H / ${MASEHI_YEAR} M</div>
          <div style="font-size:22px;font-weight:700;letter-spacing:1px;margin-top:4px;">${esc(loc.name.toUpperCase())}</div>
        </div>

        <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
          <thead>
            <tr>
              ${th("ramadhan", "Ramadhan", "21%")}
              ${th("tanggal", "Tanggal", "19%")}
              ${COLS.map((c) => th(c, HEAD[c], "10%")).join("")}
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>

        <div style="margin-top:auto;padding-top:14px;text-align:center;font-size:10px;color:${cream};opacity:0.7;">
          Awal Ramadhan mengikuti penetapan pemerintah (sidang isbat). Jadwal dapat berbeda sekitar 1–2 menit.
        </div>
      </div>
    </div>`;
  return el;
}

/* ================= PDF ================= */
async function downloadPDF() {
  const btn = $("btn-pdf");
  const label = btn.textContent;
  const loc = getSavedLocation();
  if (!loc) return alert("Pilih lokasi terlebih dahulu.");

  btn.disabled = true;
  btn.textContent = "Menyiapkan PDF...";
  let poster;

  try {
    const [rows] = await Promise.all([
      getRamadanRows(loc),
      loadScript(
        "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
      ),
      loadScript(
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
      ),
    ]);
    if (!rows.length) throw new Error("Data kosong");

    poster = buildPoster(loc, rows);
    document.body.appendChild(poster);

    // tunggu font & gambar siap
    await document.fonts?.ready;
    await Promise.all(
      [...poster.querySelectorAll("img")].map((i) =>
        i.decode().catch(() => {}),
      ),
    );

    const canvas = await window.html2canvas(poster.firstElementChild, {
      scale: 2.5,
      useCORS: true,
      backgroundColor: CFG.colors.bg,
      width: W,
      height: H,
    });

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, 210, 297);

    const slug = loc.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    pdf.save(`imsakiyah-ramadhan-${HIJRI_YEAR}h-${slug}.pdf`);
  } catch (err) {
    console.error(err);
    alert("Gagal membuat PDF. Coba lagi.");
  } finally {
    poster?.remove();
    btn.disabled = false;
    btn.textContent = label;
  }
}

$("btn-pdf")?.addEventListener("click", downloadPDF);
