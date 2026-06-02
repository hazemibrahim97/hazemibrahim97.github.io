"use strict";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let FRAME = null;       // reference_frame.json
let QUESTIONS = null;   // questions.json  [{id, text}]
let LLMS = [];          // llm_scores.json [{model, score, ...}]
let ANSWERS = {};       // llm_answers.json {model: {qid: 1|2|null}}
let BREAKDOWN = {};     // question_breakdown.json {qid: {overall, Party:[...], ...}}
let QTEXT = {};         // qid -> question text
let highlight = null;   // {label, score, percentile, kind:'you'|'model', answers?}

const CAT_COLORS = {
  Party: "var(--party)", Gender: "var(--gender)",
  Race: "var(--race)", Education: "var(--educ)",
};
const COL = {
  party: "#984ea3", gender: "#e41a1c", race: "#377eb8",
  educ: "#4daf4a", llm: "#ff7f00", you: "#111111",
};

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
async function boot() {
  const [frame, questions, llms, answers, breakdown] = await Promise.all([
    fetch("data/reference_frame.json").then((r) => r.json()),
    fetch("data/questions.json").then((r) => r.json()),
    fetch("data/llm_scores.json").then((r) => r.json()),
    fetch("data/llm_answers.json").then((r) => r.json()),
    fetch("data/question_breakdown.json").then((r) => r.json()),
  ]);
  FRAME = frame;
  QUESTIONS = questions;
  LLMS = llms.slice().sort((a, b) => a.score - b.score);
  ANSWERS = answers;
  BREAKDOWN = breakdown;
  QUESTIONS.forEach((q) => { QTEXT[q.id] = q.text; });
  render();
  buildLegend();
  buildLeaderboard();
  buildSelfTest();
  wireSelfTest();
  wireTabs();
  wireUpload();
}

// ---------------------------------------------------------------------------
// Scoring — must match build_ces24_frame.py exactly
//   filled = answers with missing -> 0  (Support=1, Oppose=2)
//   x_std  = (filled - mean) / scale
//   score  = sign * dot(x_std - pca_mean, loadings)
// ---------------------------------------------------------------------------
function projectAnswers(answersById) {
  const { questions, scaler_mean, scaler_scale, pca_mean, loadings, sign } = FRAME;
  let acc = 0;
  let nAnswered = 0;
  for (let i = 0; i < questions.length; i++) {
    const raw = answersById[questions[i]];      // 1, 2, or undefined
    const filled = raw === 1 || raw === 2 ? raw : 0;
    if (raw === 1 || raw === 2) nAnswered++;
    const xStd = (filled - scaler_mean[i]) / scaler_scale[i];
    acc += (xStd - pca_mean[i]) * loadings[i];
  }
  return { score: sign * acc, nAnswered };
}

function percentileOf(score) {
  const q = FRAME.respondent_quantiles; // length 101, q[p] = score at pth pct
  if (score <= q[0]) return 0;
  if (score >= q[q.length - 1]) return 100;
  for (let i = 0; i < q.length - 1; i++) {
    if (score >= q[i] && score < q[i + 1]) {
      const frac = (score - q[i]) / (q[i + 1] - q[i] || 1);
      return i + frac;
    }
  }
  return 100;
}

function encodeAnswer(label) {
  if (typeof label !== "string") return undefined;
  const s = label.trim().toLowerCase().replace(/[.!,;:]+$/, "");
  if (s.startsWith("support") || s.startsWith("agree") || ["yes", "yea", "y"].includes(s)) return 1;
  if (s.startsWith("oppose") || s.startsWith("disagree") || ["no", "nay", "n"].includes(s)) return 2;
  return undefined;
}

// ---------------------------------------------------------------------------
// Chart
// ---------------------------------------------------------------------------
const M = { top: 30, right: 20, bottom: 44, left: 64 };
const ZOOM_W = 300;        // right zoom panel width
const COL_X = { Party: 0, Gender: 1, Race: 2, Education: 3, LLM: 4 };

function render() {
  const svg = document.getElementById("chart");
  const W = svg.clientWidth || +svg.getAttribute("width");
  const H = +svg.getAttribute("height");
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const mainRight = W - ZOOM_W - 30;
  const plotW = mainRight - M.left - M.right;
  const plotH = H - M.top - M.bottom;

  // Fixed y-range keeps the figure zoomed on where the markers actually fall
  // (group means span ~-2.5..3.3, LLMs ~-4.2..0.8). Extend only if a
  // highlighted result lands outside, so it never gets clipped.
  let lo = -4.5, hi = 4;
  if (highlight) {
    lo = Math.min(lo, highlight.score - 0.3);
    hi = Math.max(hi, highlight.score + 0.3);
  }
  const y = (s) => M.top + plotH * (1 - (s - lo) / (hi - lo));

  const colX = (i) => M.left + plotW * ((i + 0.5) / 5);

  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    (parent || svg).appendChild(e);
    return e;
  };

  // gridlines + y axis
  el("line", { x1: M.left, y1: y(0), x2: mainRight, y2: y(0),
    stroke: "#bbb", "stroke-dasharray": "4 4" });
  const ticks = niceTicks(lo, hi, 8);
  ticks.forEach((t) => {
    el("line", { x1: M.left, y1: y(t), x2: mainRight, y2: y(t),
      stroke: "#eee" });
    const tx = el("text", { x: M.left - 8, y: y(t) + 4, "text-anchor": "end",
      "font-size": 11, fill: "#666" });
    tx.textContent = t;
  });
  const yl = el("text", { x: 16, y: M.top + plotH / 2, "text-anchor": "middle",
    "font-size": 13, "font-weight": "bold", fill: "#1a1a1a",
    transform: `rotate(-90 16 ${M.top + plotH / 2})` });
  yl.textContent = "Ideology score  (liberal ←  → conservative)";

  // column dividers + labels
  ["Party", "Gender", "Race", "Education", "LLM"].forEach((name, i) => {
    el("line", { x1: colX(i), y1: M.top, x2: colX(i), y2: M.top + plotH,
      stroke: "#f0f0f0" });
    const t = el("text", { x: colX(i), y: H - 18, "text-anchor": "middle",
      "font-size": 13, "font-weight": "bold", fill: "#1a1a1a" });
    t.textContent = name;
  });

  // demographic markers + labels
  const groupColor = { Party: COL.party, Gender: COL.gender, Race: COL.race, Education: COL.educ };
  ["Party", "Gender", "Race", "Education"].forEach((cat, i) => {
    const items = FRAME.groups[cat];
    const placed = labelLayout(items.map((g) => y(g.score)), 13, M.top, M.top + plotH);
    items.forEach((g, k) => {
      triangle(el, colX(i), y(g.score), groupColor[cat], false, () =>
        tip(`${g.label}: ${g.score.toFixed(2)} (n=${g.n})`));
      const lab = el("text", { x: colX(i) + 9, y: placed[k] + 4,
        "font-size": 9.5, fill: groupColor[cat] });
      lab.textContent = g.label;
      if (Math.abs(placed[k] - y(g.score)) > 1)
        el("line", { x1: colX(i) + 5, y1: y(g.score), x2: colX(i) + 8, y2: placed[k],
          stroke: groupColor[cat], "stroke-width": 0.5 });
    });
  });

  // LLM column (clustered triangles, no labels here)
  const llmX = colX(4);
  LLMS.forEach((l) => {
    triangle(el, llmX, y(l.score), COL.llm, false,
      () => tip(`${l.model}: ${l.score.toFixed(2)} · ${l.respondent_percentile.toFixed(0)}th pct`),
      () => openDetail(l.model));
  });

  // ---- Zoom panel: its OWN y-scale over just the LLM range ----
  const zx = mainRight + 30;
  const zBoxW = ZOOM_W - 30;
  const zTri = zx + 10;
  const zLab = zx + 24;
  const zTop = M.top, zBot = M.top + plotH;

  // include the highlight in the zoom range if present
  const zScores = LLMS.map((l) => l.score);
  if (highlight) zScores.push(highlight.score);
  let zlo = Math.min(...zScores), zhi = Math.max(...zScores);
  // Zoom out a touch so the extreme models (e.g. Mistral Large) sit inside the
  // panel with breathing room instead of right on the edge.
  const zpad = Math.max((zhi - zlo) * 0.08, 0.3);
  zlo -= zpad; zhi += zpad;
  const zy = (s) => zTop + (zBot - zTop) * (1 - (s - zlo) / (zhi - zlo));

  el("rect", { x: zx, y: zTop, width: zBoxW, height: plotH,
    fill: "none", stroke: "#ccc", "stroke-dasharray": "4 3" });

  // connector trapezoid from LLM column range -> zoom box (shows the zoom).
  // Include the highlight so a more-extreme uploaded model stays inside the box.
  const boxScores = LLMS.map((l) => l.score);
  if (highlight) boxScores.push(highlight.score);
  const boxPad = 9;  // clear the triangle markers (half-height ~5) at each end
  const llmLoY = y(Math.max(...boxScores)) - boxPad;  // top (less neg)
  const llmHiY = y(Math.min(...boxScores)) + boxPad;  // bottom
  el("line", { x1: llmX + 7, y1: llmLoY, x2: zx, y2: zTop, stroke: "#bbb", "stroke-dasharray": "2 2" });
  el("line", { x1: llmX + 7, y1: llmHiY, x2: zx, y2: zBot, stroke: "#bbb", "stroke-dasharray": "2 2" });
  el("rect", { x: llmX - 9, y: llmLoY, width: 18, height: llmHiY - llmLoY,
    fill: "none", stroke: "#bbb" });

  // zoom y-axis ticks
  niceTicks(zlo, zhi, 6).forEach((t) => {
    el("line", { x1: zx, y1: zy(t), x2: zx + zBoxW, y2: zy(t), stroke: "#f0f0f0" });
    const tx = el("text", { x: zx - 4, y: zy(t) + 3.5, "text-anchor": "end",
      "font-size": 9, fill: "#999" });
    tx.textContent = t;
  });

  const zItems = LLMS.slice();           // already sorted ascending
  const zys = labelLayout(zItems.map((l) => zy(l.score)), 13, zTop, zBot);
  zItems.forEach((l, k) => {
    triangle(el, zTri, zy(l.score), COL.llm, false,
      () => tip(`${l.model}: ${l.score.toFixed(2)} · ${l.respondent_percentile.toFixed(0)}th pct`),
      () => openDetail(l.model));
    if (Math.abs(zys[k] - zy(l.score)) > 1)
      el("line", { x1: zTri + 5, y1: zy(l.score), x2: zLab - 2, y2: zys[k],
        stroke: COL.llm, "stroke-width": 0.5 });
    const t = el("text", { x: zLab, y: zys[k] + 3.5, "font-size": 9.5, fill: COL.llm });
    t.textContent = l.model;
    t.style.cursor = "pointer";
    t.addEventListener("click", () => openDetail(l.model));
  });

  // highlight (your model / you) on both panels
  if (highlight) {
    star(el, llmX, y(highlight.score), COL.you);
    star(el, zTri, zy(highlight.score), COL.you);
    el("line", { x1: zx, y1: zy(highlight.score), x2: zx + zBoxW, y2: zy(highlight.score),
      stroke: COL.you, "stroke-width": 1, "stroke-dasharray": "6 3", opacity: 0.5 });
    const t = el("text", { x: zLab, y: zy(highlight.score) - 6,
      "font-size": 11, "font-weight": "bold", fill: COL.you });
    t.textContent = "★ " + highlight.label;
  }
}

function triangle(el, cx, cy, color, filled, onhover, onclick) {
  const s = 5;
  const t = el("path", {
    d: `M ${cx - s} ${cy - s} L ${cx + s} ${cy - s} L ${cx} ${cy + s} Z`,
    fill: filled ? color : "none", stroke: color, "stroke-width": 1.4,
  });
  t.style.cursor = "pointer";
  if (onhover) {
    t.addEventListener("mousemove", (e) => moveTip(e, onhover()));
    t.addEventListener("mouseleave", hideTip);
  }
  if (onclick) t.addEventListener("click", onclick);
}

function star(el, cx, cy, color) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 7 : 3;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  el("polygon", { points: pts.join(" "), fill: color, stroke: "#fff", "stroke-width": 0.6 });
}

// De-overlap labels while keeping order. Forward pass pushes each label down
// to >= prev+gap; backward pass pulls them up so the stack stays within
// [minY, maxY], so dense clusters can't run off the bottom of the panel.
function labelLayout(targets, gap, minY, maxY) {
  const idx = targets.map((t, i) => i).sort((a, b) => targets[a] - targets[b]);
  const out = new Array(targets.length);
  let prev = (minY != null ? minY : -Infinity) - gap;
  for (const i of idx) {
    out[i] = Math.max(targets[i], prev + gap);
    prev = out[i];
  }
  if (maxY != null) {
    prev = maxY + gap;
    for (let j = idx.length - 1; j >= 0; j--) {
      const i = idx[j];
      out[i] = Math.min(out[i], prev - gap);
      prev = out[i];
    }
  }
  return out;
}

function niceTicks(lo, hi, n) {
  const span = hi - lo;
  const step0 = span / n;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const norm = step0 / mag;
  const step = (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag;
  const start = Math.ceil(lo / step) * step;
  const out = [];
  for (let v = start; v <= hi; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------
const tooltipEl = () => document.getElementById("tooltip");
let _tipText = "";
function tip(text) { _tipText = text; return text; }
function moveTip(e, text) {
  const t = tooltipEl();
  t.textContent = text || _tipText;
  t.style.left = e.clientX + 12 + "px";
  t.style.top = e.clientY + 12 + "px";
  t.style.opacity = 1;
}
function hideTip() { tooltipEl().style.opacity = 0; }

// ---------------------------------------------------------------------------
// Legend / leaderboard
// ---------------------------------------------------------------------------
function buildLegend() {
  const L = document.getElementById("legend");
  const items = [
    ["Party", COL.party], ["Gender", COL.gender], ["Race", COL.race],
    ["Education", COL.educ], ["LLMs", COL.llm], ["Your result", COL.you],
  ];
  L.innerHTML = items.map(([n, c]) =>
    `<span><i style="background:${c}"></i>${n}</span>`).join("");
}

function buildLeaderboard() {
  const box = document.getElementById("leaderboard");
  // Most liberal (lowest score) first; rank 1 = most liberal.
  const ordered = LLMS.slice();
  // Include the user's uploaded model (unless its name matches an existing one).
  const isUpload = highlight && highlight.kind === "model" &&
    !LLMS.some((l) => l.model === highlight.label);
  if (isUpload) {
    ordered.push({ model: highlight.label, score: highlight.score,
      respondent_percentile: highlight.percentile, _mine: true });
  }
  ordered.sort((a, b) => a.score - b.score);
  const head = `<div class="q-row lb-head">
      <span style="width:30px">#</span>
      <span class="q-text">Model</span>
      <span style="width:52px;text-align:right" title="Ideology score (lower = more liberal)">Score</span>
      <span style="width:64px;text-align:right" title="Percentile among CES 2024 respondents">Pctile</span>
    </div>`;
  const rows = ordered.map((l, i) => {
    const hot = l._mine || (highlight && highlight.kind === "model" && highlight.label === l.model);
    return `<div class="q-row lb-row" data-model="${escapeHtml(l.model)}" style="${hot ? "background:#fff4e6" : ""}">
      <span style="width:30px;color:#999">${i + 1}</span>
      <span class="q-text">${escapeHtml(l.model)}${l._mine ? ' <span style="color:#ff7f00;font-weight:600">★ yours</span>' : ""}</span>
      <span style="width:52px;text-align:right;color:#666;font-variant-numeric:tabular-nums">${l.score.toFixed(2)}</span>
      <span style="width:64px;text-align:right;color:#999">${l.respondent_percentile.toFixed(0)}th</span>
    </div>`;
  }).join("");
  box.innerHTML = `
    <div class="lb-meta">${LLMS.length} tested models${isUpload ? " + yours" : ""} · rank 1 = most liberal · click a row for details</div>
    <div class="q-list lb-list">${head}${rows}</div>`;
  box.querySelectorAll(".lb-row").forEach((r) =>
    r.addEventListener("click", () => openDetail(r.dataset.model)));
}

// ---------------------------------------------------------------------------
// Detail drill-down (per-question answers + demographic support)
// ---------------------------------------------------------------------------
let detailCat = "Party";

function openDetail(model) {
  const answers = (highlight && highlight.label === model && highlight.answers)
    ? highlight.answers : ANSWERS[model];
  if (!answers) return;
  const meta = LLMS.find((l) => l.model === model) ||
    (highlight && highlight.label === model ? { score: highlight.score, respondent_percentile: highlight.percentile } : null);

  let overlay = document.getElementById("detail-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "detail-overlay";
    overlay.innerHTML = `<div class="detail-modal"><div class="detail-head"></div>
      <div class="detail-cats"></div><div class="detail-body"></div></div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
  }
  const head = overlay.querySelector(".detail-head");
  head.innerHTML = `
    <div>
      <div style="font-size:18px;font-weight:bold">${escapeHtml(model)}</div>
      <div class="sub" style="color:#666;font-size:13px">
        ${meta ? `score ${meta.score.toFixed(2)} · ${meta.respondent_percentile.toFixed(0)}th percentile of respondents` : ""}
      </div>
    </div>
    <button class="secondary" id="detail-close">Close</button>`;
  head.querySelector("#detail-close").addEventListener("click", () => overlay.remove());

  const cats = overlay.querySelector(".detail-cats");
  cats.innerHTML = ["Party", "Gender", "Race", "Education"].map((c) =>
    `<div class="tab ${c === detailCat ? "active" : ""}" data-cat="${c}">${c}</div>`).join("")
    + `<span class="note" style="margin-left:auto">Cells = % of group that answered Support</span>`;
  cats.querySelectorAll(".tab").forEach((t) =>
    t.addEventListener("click", () => { detailCat = t.dataset.cat; renderDetailBody(model, answers); cats.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", x === t)); }));

  renderDetailBody(model, answers);
}

function heatColor(pct) {
  // <50% support -> red, >50% -> blue; alpha grows with distance from 50%.
  const t = Math.max(0, Math.min(1, pct / 100));
  const [r, g, b] = t >= 0.5 ? [55, 126, 184] : [228, 60, 60];
  const a = 0.12 + 0.7 * Math.abs(t - 0.5) * 2;
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

// Left-to-right column order for the Party breakdown (liberal -> conservative).
const PARTY_ORDER = ["Strong Democrat", "Democratic Party", "Weak Democrat",
  "Neither", "Weak Republican", "Republican Party", "Strong Republican"];

function renderDetailBody(model, answers) {
  const body = document.getElementById("detail-overlay").querySelector(".detail-body");
  let groups = (BREAKDOWN[QUESTIONS[0].id][detailCat]).map((g) => g.label);
  if (detailCat === "Party") {
    groups = groups.slice().sort((a, b) => PARTY_ORDER.indexOf(a) - PARTY_ORDER.indexOf(b));
  }
  const header = `<tr>
      <th class="qcol">Question</th>
      <th class="acol">${escapeHtml(shortName(model))}</th>
      <th class="acol">All</th>
      ${groups.map((g) => `<th class="gcol" title="${escapeHtml(g)}">${escapeHtml(g)}</th>`).join("")}
    </tr>`;
  const rows = QUESTIONS.map((q) => {
    const bd = BREAKDOWN[q.id];
    const ans = answers[q.id];
    const chip = ans === 1 ? `<span class="chip sup">Support</span>`
      : ans === 2 ? `<span class="chip opp">Oppose</span>`
      : `<span class="chip na">—</span>`;
    const byLabel = {};
    bd[detailCat].forEach((g) => { byLabel[g.label] = g; });
    const cells = groups.map((g) => {
      const e = byLabel[g];
      if (!e) return `<td class="gcol"></td>`;
      const p = e.support_pct;
      return `<td class="gcol" style="background:${heatColor(p)}" title="${escapeHtml(g)}: ${p.toFixed(0)}% support (n=${e.n})">${p.toFixed(0)}</td>`;
    }).join("");
    return `<tr>
      <td class="qcol">${escapeHtml(q.text)}</td>
      <td class="acol">${chip}</td>
      <td class="acol gcol" style="background:${heatColor(bd.overall)}">${bd.overall.toFixed(0)}</td>
      ${cells}</tr>`;
  }).join("");
  body.innerHTML = `<div class="detail-scroll"><table class="detail-table">${header}${rows}</table></div>
    <p class="detail-foot">Blue = group leaned Support, red = leaned Oppose. Compare the model&rsquo;s answer to each group.</p>`;
}

function shortName(m) { return m.length > 14 ? m.slice(0, 13) + "…" : m; }

// ---------------------------------------------------------------------------
// Self-test
// ---------------------------------------------------------------------------
const selfAnswers = {};
function buildSelfTest() {
  const list = document.getElementById("q-list");
  list.innerHTML = QUESTIONS.map((q) => `
    <div class="q-row" data-qid="${q.id}">
      <span class="q-text">${escapeHtml(q.text)}</span>
      <span class="opts">
        <span class="opt" data-v="1">Support</span>
        <span class="opt" data-v="2">Oppose</span>
      </span>
    </div>`).join("");
  list.querySelectorAll(".opt").forEach((opt) => {
    opt.addEventListener("click", () => {
      const row = opt.closest(".q-row");
      const qid = row.dataset.qid;
      const v = +opt.dataset.v;
      row.querySelectorAll(".opt").forEach((o) => o.classList.remove("sel-support", "sel-oppose"));
      if (selfAnswers[qid] === v) {
        delete selfAnswers[qid];
      } else {
        selfAnswers[qid] = v;
        opt.classList.add(v === 1 ? "sel-support" : "sel-oppose");
      }
      updateSelfProgress();
    });
  });
  updateSelfProgress();
}

// Button handlers wired ONCE (separate from buildSelfTest, which rebuilds the
// question list and would otherwise stack duplicate listeners on these buttons).
function wireSelfTest() {
  document.getElementById("self-submit").addEventListener("click", () => {
    const { score, nAnswered } = projectAnswers(selfAnswers);
    if (nAnswered === 0) return;
    const pct = percentileOf(score);
    highlight = { label: "You", score, percentile: pct, kind: "you", answers: { ...selfAnswers } };
    render();
    buildLeaderboard();   // drop any stale uploaded-model row now that "you" is the highlight
    showResult("self-result", "You", score, pct, nAnswered);
  });
  document.getElementById("self-clear").addEventListener("click", () => {
    for (const k in selfAnswers) delete selfAnswers[k];
    buildSelfTest();
    if (highlight && highlight.kind === "you") { highlight = null; render(); buildLeaderboard(); }
    document.getElementById("self-result").innerHTML = "";
    updateSelfProgress();
  });
}
function updateSelfProgress() {
  const n = Object.keys(selfAnswers).length;
  document.getElementById("self-progress").textContent = `${n} / ${QUESTIONS.length} answered`;
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------
function wireUpload() {
  const dz = document.getElementById("dropzone");
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".csv,text/csv";
  input.style.display = "none";
  document.body.appendChild(input);

  dz.addEventListener("click", () => input.click());
  // Reset value after handling so re-selecting the SAME file fires `change` again.
  input.addEventListener("change", () => {
    if (input.files[0]) handleFile(input.files[0]);
    input.value = "";
  });
  dz.addEventListener("dragover", (e) => { e.preventDefault(); dz.classList.add("drag"); });
  dz.addEventListener("dragleave", () => dz.classList.remove("drag"));
  dz.addEventListener("drop", (e) => {
    e.preventDefault(); dz.classList.remove("drag");
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });

  // Live-update an uploaded result's label when the name field changes.
  const nameField = document.getElementById("model-name");
  if (nameField) nameField.addEventListener("input", refreshUploadHighlight);

  const tmpl = document.getElementById("download-template");
  if (tmpl) tmpl.addEventListener("click", (e) => { e.preventDefault(); downloadTemplate(); });
}

let uploadFallbackName = "";

// Re-apply the current name field to an already-uploaded model result.
function refreshUploadHighlight() {
  if (!highlight || highlight.kind !== "model") return;
  const name = document.getElementById("model-name").value.trim() || uploadFallbackName || "Your model";
  highlight.label = name;
  render();
  buildLeaderboard();
  showResult("upload-result", name, highlight.score, highlight.percentile,
    Object.keys(highlight.answers).length);
}

// Blank CSV: question_id + question filled, answer empty for the user to fill.
function downloadTemplate() {
  const esc = (s) => /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  const lines = ["question_id,question,answer"];
  QUESTIONS.forEach((q) => lines.push(`${esc(q.id)},${esc(q.text)},`));
  const blob = new Blob([lines.join("\n") + "\n"], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ideology_survey_template.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

function handleFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const answers = parseResults(reader.text || reader.result);
      const n = Object.keys(answers).length;
      if (n === 0) { showUploadError("Couldn't match any questions. Check the file format."); return; }
      uploadFallbackName = file.name.replace(/\.csv$/i, "");
      const name = document.getElementById("model-name").value.trim() || uploadFallbackName;
      const { score, nAnswered } = projectAnswers(answers);
      const pct = percentileOf(score);
      highlight = { label: name, score, percentile: pct, kind: "model", answers };
      render();
      buildLeaderboard();
      showResult("upload-result", name, score, pct, nAnswered);
    } catch (err) {
      showUploadError("Could not parse file: " + err.message);
    }
  };
  reader.readAsText(file);
}

// Accept either runner output (question_id / question / answer|result columns)
// or a generic 2-column Question,Answer CSV. Returns {qid: 1|2}.
function parseResults(text) {
  const rows = parseCSV(text);
  if (rows.length === 0) return {};
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const find = (...names) => header.findIndex((h) => names.includes(h));
  let idCol = find("question_id", "qid", "id");
  let qCol = find("question", "maintext", "prompt", "question_text", "text");
  let aCol = find("answer", "result", "response", "label");

  // Fallback: a bare 2-column file with no recognized header.
  const looksHeaderless = idCol < 0 && qCol < 0 && aCol < 0;
  let dataRows = rows.slice(1);
  if (looksHeaderless) { qCol = 0; aCol = 1; dataRows = rows; }
  if (aCol < 0) aCol = header.length - 1;
  if (idCol < 0 && qCol < 0) qCol = 0;

  // Build text->id matcher (longest text first, substring match).
  const qmap = QUESTIONS.map((q) => [q.text, q.id]).sort((a, b) => b[0].length - a[0].length);
  const validIds = new Set(QUESTIONS.map((q) => q.id));

  const out = {};
  for (const r of dataRows) {
    if (!r || r.length === 0) continue;
    const ans = encodeAnswer((r[aCol] || "").trim());
    if (ans === undefined) continue;
    let qid = null;
    if (idCol >= 0 && validIds.has((r[idCol] || "").trim())) {
      qid = r[idCol].trim();
    } else if (qCol >= 0) {
      const txt = (r[qCol] || "");
      const hit = qmap.find(([t]) => txt.includes(t));
      if (hit) qid = hit[1];
    }
    if (qid) out[qid] = ans;
  }
  return out;
}

// Minimal CSV parser (handles quoted fields with commas/quotes/newlines).
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", i = 0, inQ = false;
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQ = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQ = true; i++; continue; }
    if (c === ",") { row.push(field); field = ""; i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
    field += c; i++;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

// ---------------------------------------------------------------------------
// Result cards / misc
// ---------------------------------------------------------------------------
function showResult(elId, name, score, pct, nAnswered) {
  const moreLib = (100 - pct).toFixed(0);
  const llmPct = (LLMS.filter((l) => l.score < score).length / LLMS.length * 100).toFixed(0);
  document.getElementById(elId).innerHTML = `
    <div class="result-card">
      <div class="score" style="color:${COL.you}">${score.toFixed(2)}</div>
      <div class="sub">
        <strong>${escapeHtml(name)}</strong> &middot; more conservative than
        <strong>${pct.toFixed(0)}%</strong> of CES 2024 respondents and
        <strong>${llmPct}%</strong> of tested models.
        Answered ${nAnswered}/${FRAME.questions.length} questions.
      </div>
      <button class="secondary" style="margin-top:10px" onclick="openDetail('${name.replace(/'/g, "\\'")}')">
        See per-question answers
      </button>
    </div>`;
}
function showUploadError(msg) {
  document.getElementById("upload-result").innerHTML =
    `<div class="result-card" style="border-color:#e41a1c;color:#e41a1c">${escapeHtml(msg)}</div>`;
}

function wireTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const which = tab.dataset.tab;
      document.getElementById("tab-upload").style.display = which === "upload" ? "" : "none";
      document.getElementById("tab-self").style.display = which === "self" ? "" : "none";
    });
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

window.addEventListener("resize", () => { if (FRAME) render(); });
boot();
