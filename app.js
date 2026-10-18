// Quilt calculators. Every length is computed in inches; the unit toggle only converts input and display.
const CM = 2.54;
let unit = localStorage.getItem("unit") || "in";

const up8 = (x) => Math.ceil(x * 8 - 1e-9) / 8;
const yd8 = (inches) => Math.ceil((inches / 36) * 8 - 1e-9) / 8;
function frac(x) {
  const whole = Math.floor(x + 1e-9);
  const eighths = Math.round((x - whole) * 8);
  if (eighths === 8) return `${whole + 1}`;
  if (!eighths) return `${whole}`;
  const [n, d] = eighths % 4 === 0 ? [eighths / 4, 2] : eighths % 2 === 0 ? [eighths / 2, 4] : [eighths, 8];
  return whole ? `${whole} ${n}/${d}` : `${n}/${d}`;
}
const len = (inches) => (unit === "cm" ? `${(inches * CM).toFixed(1)} cm` : `${frac(up8(inches))}"`);
const fab = (inches) => {
  if (unit === "cm") return `${(Math.ceil(inches * CM / 10) / 10).toFixed(1)} m`;
  const y = yd8(inches);
  return `${frac(y)} yard${y <= 1 ? "" : "s"}`;
};
const usable = (wof) => Math.max(wof - 2, 1);
const money = (x) => `$${x.toFixed(2)}`;

const CALCS = {
  backing(v) {
    const needW = v.w + 2 * v.over, needL = v.l + 2 * v.over, u = usable(v.wof);
    const panels = (need) => { let n = 1; while (n * u - (n - 1) < need) n++; return n; };
    const vert = panels(needW), horiz = panels(needL);
    const vertIn = vert * needL, horizIn = horiz * needW;
    const best = vertIn <= horizIn ? "Vertical seams" : "Horizontal seams";
    return [
      ["Backing size to cut", `${len(needW)} × ${len(needL)}`],
      ["Vertical seams", `${vert} panel${vert > 1 ? "s" : ""} of ${len(needL)}: ${fab(vertIn)}`],
      ["Horizontal seams", `${horiz} panel${horiz > 1 ? "s" : ""} of ${len(needW)}: ${fab(horizIn)}`],
      ["Buy", `${fab(Math.min(vertIn, horizIn))} (${best.toLowerCase()})`, true],
    ];
  },
  binding(v) {
    const total = 2 * (v.w + v.l) + v.extra, perStrip = usable(v.wof) - v.sw;
    const strips = Math.ceil(total / perStrip), bias = Math.ceil(Math.sqrt(total * v.sw)) + 1;
    return [
      ["Binding length needed", len(total)],
      ["Strips to cut", `${strips} strips × ${len(v.sw)} wide`],
      ["Folded binding width", len(v.sw / 2)],
      ["Bias binding: cut one square", `${len(bias)} × ${len(bias)}`],
      ["Buy (straight-grain)", fab(strips * v.sw), true],
    ];
  },
  size(v) {
    const pad = v.outer ? 2 * v.sash : 0;
    const w = v.across * v.block + (v.across - 1) * v.sash + pad + 2 * v.border;
    const l = v.down * v.block + (v.down - 1) * v.sash + pad + 2 * v.border;
    return [
      ["Blocks needed", `${v.across * v.down} (${v.across} across × ${v.down} down)`],
      ["Center before borders", `${len(w - 2 * v.border)} × ${len(l - 2 * v.border)}`],
      ["Finished quilt size", `${len(w)} × ${len(l)}`, true],
    ];
  },
  resize(v) {
    const ratio = v.newSize / v.orig, unitFin = v.newSize / v.grid;
    const newPiece = (v.piece - 0.5) * ratio + 0.5;
    return [
      ["Scale factor", `${(ratio * 100).toFixed(1)}%`],
      ["Each grid unit, finished", len(unitFin)],
      ["Each grid square, cut", len(unitFin + 0.5)],
      ["Your piece, new cut size", len(newPiece), true],
      ["Finished block with seam allowance", len(v.newSize + 0.5)],
    ];
  },
  border(v) {
    const cut = v.bw + 0.5, sides = 2 * (v.l + 0.5), tb = 2 * (v.w + 2 * v.bw + 0.5);
    const total = sides + tb, strips = Math.ceil(total / usable(v.wof));
    const lengthwise = Math.max(v.l, v.w + 2 * v.bw) + 1;
    return [
      ["Cut strips", `${len(cut)} wide`],
      ["Side borders (2)", `${len(v.l + 0.5)} long each`],
      ["Top and bottom borders (2)", `${len(v.w + 2 * v.bw + 0.5)} long each`],
      ["Width-of-fabric strips to cut", `${strips}`],
      ["Buy (pieced strips)", fab(strips * cut), true],
      ["Buy (lengthwise, no seams)", fab(lengthwise)],
      ["Finished size with border", `${len(v.w + 2 * v.bw)} × ${len(v.l + 2 * v.bw)}`],
    ];
  },
  batting(v) {
    const w = v.w + 2 * v.over, l = v.l + 2 * v.over;
    const packs = [["Crib", 45, 60], ["Twin", 72, 90], ["Full", 81, 96], ["Queen", 90, 108], ["King", 120, 120]];
    const fit = packs.find(([, a, b]) => (a >= w && b >= l) || (a >= l && b >= w));
    const roll = [90, 96, 120].find((r) => r >= Math.min(w, l));
    return [
      ["Batting size needed", `${len(w)} × ${len(l)}`],
      ["Smallest packaged batting that fits", fit ? `${fit[0]} (${len(fit[1])} × ${len(fit[2])})` : "Larger than king: piece two widths or buy by the yard"],
      ["By the yard", roll ? `${fab(Math.max(w, l))} of ${len(roll)} wide` : "Join two pieces"],
      ["Buy", fit ? `${fit[0]} size` : "By the yard", true],
    ];
  },
  yardage(v) {
    const perStrip = Math.floor(usable(v.wof) / v.pw);
    const strips = Math.ceil(v.count / Math.max(perStrip, 1));
    return [
      ["Pieces per width-of-fabric strip", `${perStrip}`],
      ["Strips to cut", `${strips} strips × ${len(v.pl)} tall`],
      ["Total fabric length", len(strips * v.pl)],
      ["Buy", fab(strips * v.pl * (1 + v.waste / 100)), true],
    ];
  },
  hst(v) {
    const t = v.trim ? 0.5 : 0, need = v.count;
    const two = up8(v.fin + 0.875 + t), four = up8(v.fin * 1.414 + 1.25 + t), eight = up8(2 * (v.fin + 0.875) + t * 2);
    return [
      ["2-at-a-time: cut squares", `${len(two)}, ${Math.ceil(need / 2)} of each fabric`],
      ["4-at-a-time: cut squares", `${len(four)}, ${Math.ceil(need / 4)} of each fabric`],
      ["8-at-a-time: cut squares", `${len(eight)}, ${Math.ceil(need / 8)} of each fabric`],
      ["Unfinished HST size", len(v.fin + 0.5), true],
    ];
  },
  sashing(v) {
    const cutW = v.sash + 0.5, cutL = v.block + 0.5, o = v.outer ? 1 : -1;
    const vert = (v.across + o) * v.down, horiz = (v.down + o) * v.across;
    const pieces = v.stones ? vert + horiz : vert;
    const stones = v.stones ? (v.across + o) * (v.down + o) : 0;
    const rowW = v.across * v.block + (v.across + o) * v.sash;
    const longStrips = v.stones ? 0 : v.down + o;
    const perStrip = Math.floor(usable(v.wof) / cutL);
    const wofStrips = Math.ceil(pieces / perStrip) + Math.ceil((longStrips * (rowW + 0.5)) / usable(v.wof));
    return [
      [v.stones ? "Sashing pieces" : "Short sashing pieces (between blocks)", `${pieces} at ${len(cutW)} × ${len(cutL)}`],
      ...(v.stones ? [["Cornerstones", `${stones} at ${len(cutW)} × ${len(cutW)}`]] : [["Long sashing strips (between rows)", `${longStrips} at ${len(cutW)} × ${len(rowW + 0.5)}`]]),
      ["Width-of-fabric strips to cut", `${wofStrips} at ${len(cutW)} wide`],
      ["Buy for sashing", fab(wofStrips * cutW), true],
    ];
  },
  onpoint(v) {
    const d = v.block * Math.SQRT2;
    const blocks = v.across * v.down + (v.across - 1) * (v.down - 1);
    const sideTri = 2 * (v.across - 1) + 2 * (v.down - 1);
    const sideSq = up8(d + 1.25), cornerSq = up8(d / 2 + 0.875);
    return [
      ["Block diagonal", unit === "cm" ? len(d) : `${d.toFixed(2)}"`],
      ["Blocks needed", `${blocks}`],
      ["Side setting triangles", `${sideTri}: cut ${Math.ceil(sideTri / 4)} squares at ${len(sideSq)}, then cut twice diagonally`],
      ["Corner triangles", `4: cut 2 squares at ${len(cornerSq)}, then cut once diagonally`],
      ["Quilt center size", `${len(v.across * d)} × ${len(v.down * d)}`, true],
    ];
  },
  cost(v) {
    const fabric = v.yards * v.ppy, quilting = v.w * v.l * v.longarm;
    const materials = fabric + v.batting + v.thread, labor = v.hours * v.rate;
    const total = materials + quilting + labor;
    return [
      ["Materials", money(materials)],
      ["Quilting service", money(quilting)],
      ["Your time", money(labor)],
      ["Total cost", money(total)],
      ["Suggested price (with " + v.markup + "% markup on materials)", money(total + materials * (v.markup / 100)), true],
    ];
  },
};

function read(form) {
  const v = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === "checkbox") v[el.name] = el.checked;
    else {
      let n = parseFloat(el.value);
      if (!isFinite(n) || n < 0) n = 0;
      v[el.name] = el.dataset.len !== undefined && unit === "cm" ? n / CM : n;
    }
  }
  return v;
}

function run(form) {
  const out = document.getElementById("result");
  const v = read(form);
  const bad = [...form.elements].some((el) => el.required && !(parseFloat(el.value) > 0));
  if (bad) { out.innerHTML = `<p class="hint">Fill in every box with a number above zero.</p>`; return; }
  const rows = CALCS[form.dataset.calc](v);
  out.innerHTML = `<dl>${rows.map(([k, val, hi]) => `<div class="${hi ? "hi" : ""}"><dt>${k}</dt><dd>${val}</dd></div>`).join("")}</dl>`;
}

function setUnit(next, form) {
  if (next === unit) return;
  for (const el of form.querySelectorAll("[data-len]")) {
    const n = parseFloat(el.value);
    if (isFinite(n)) el.value = next === "cm" ? +(n * CM).toFixed(2) : +(n / CM).toFixed(3);
  }
  unit = next;
  localStorage.setItem("unit", unit);
  document.querySelectorAll(".u").forEach((s) => (s.textContent = unit === "cm" ? "cm" : "in"));
  run(form);
}

const form = document.querySelector("form[data-calc]");
if (form) {
  const saved = unit; unit = "in";
  const toggle = document.querySelector("#unit");
  form.addEventListener("input", () => run(form));
  form.addEventListener("submit", (e) => { e.preventDefault(); run(form); });
  toggle.value = saved;
  toggle.addEventListener("change", () => setUnit(toggle.value, form));
  setUnit(saved, form);
  run(form);
}
