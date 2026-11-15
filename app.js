/* ===========================================================
   Fieldshift — illustrative crop-rotation decision support
   All climate/crop numbers below are SAMPLE DATA standing in
   for real NASA dataset pulls (see Data sources view).
   =========================================================== */

const STORAGE_KEY = "fieldshift_state_v1";

const DEFAULT_STATE = {
  farm: {
    name: "Taroudant farm",
    location: "Taroudant, Souss-Massa, Morocco",
    size: "3.5",
    soil: "Sandy loam",
    drainage: "Moderate",
    water: "Limited / seasonal irrigation",
    history: [
      { year: "2024", crop: "Durum wheat", note: "" },
      { year: "2023", crop: "Barley", note: "" },
    ],
  },
  priorities: { water: 3, soil: 3, erosion: 3, income: 3, pest: 3 },
  savedPlans: [],
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(DEFAULT_STATE), ...parsed };
  } catch (e) {
    return structuredClone(DEFAULT_STATE);
  }
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}

let state = loadState();

/* ---------------- Crop database (illustrative 0-5 scores) --------------- */
const CROPS = {
  wheat:    { name: "Durum wheat",  water: 3, nitrogen: 0, erosion: 2, organic: 2, market: 4, frost: 4, pest: 1, season: "Nov–Jun" },
  barley:   { name: "Barley",       water: 2, nitrogen: 0, erosion: 2, organic: 2, market: 3, frost: 5, pest: 2, season: "Nov–May" },
  chickpea: { name: "Chickpea",     water: 2, nitrogen: 5, erosion: 2, organic: 3, market: 4, frost: 3, pest: 4, season: "Nov–May" },
  faba:     { name: "Faba bean",    water: 2, nitrogen: 5, erosion: 3, organic: 3, market: 3, frost: 3, pest: 4, season: "Nov–May" },
  alfalfa:  { name: "Alfalfa (forage)", water: 4, nitrogen: 4, erosion: 5, organic: 4, market: 3, frost: 4, pest: 3, season: "Perennial" },
  olive:    { name: "Olive (tree row)", water: 1, nitrogen: 0, erosion: 4, organic: 2, market: 5, frost: 3, pest: 2, season: "Perennial" },
  vetch:    { name: "Vetch (cover crop)", water: 1, nitrogen: 4, erosion: 4, organic: 3, market: 1, frost: 3, pest: 3, season: "Oct–Feb" },
  sorghum:  { name: "Sorghum",      water: 2, nitrogen: 0, erosion: 3, organic: 3, market: 3, frost: 1, pest: 2, season: "May–Sep" },
  fallow:   { name: "Bare fallow",  water: 0, nitrogen: 0, erosion: 0, organic: 0, market: 0, frost: 2, pest: 0, season: "—" },
};

/* ---------------- Rotation strategies ---------------- */
const STRATEGIES = [
  {
    id: "current",
    name: "Current rotation (baseline)",
    sequence: ["wheat", "barley", "fallow"],
    rationale: "Continuous cereals with a bare fallow season — the rotation most farms in the region run by default, carried forward here as the comparison baseline.",
    evidence: "Landsat/MODIS NDVI composites show minimal canopy cover during the fallow window; GPM precipitation records indicate this window often coincides with the few erosive rainfall events of the year.",
    benefits: ["Familiar management and equipment", "Durum wheat has an established local market"],
    risks: ["Bare fallow leaves soil exposed to erosion during intense rain", "No nitrogen-fixing crop in the sequence — reliant on external fertilizer inputs", "Repeated cereals build up cereal-specific pests and diseases over time"],
    gaps: ["Actual fallow length and tillage practice were not provided for this field", "Local pest pressure history not available"],
  },
  {
    id: "water-conserving",
    name: "Water-conserving rotation",
    sequence: ["barley", "vetch", "sorghum"],
    rationale: "Replaces the bare fallow with a low-water cover crop and swaps in drought-tolerant cereals, aimed at fields where irrigation is limited or groundwater trends are declining.",
    evidence: "SMAP soil moisture anomalies and GRACE/GRACE-FO groundwater storage trends for the Souss-Massa basin point to a multi-year drying signal; ECOSTRESS land-surface temperature suggests rising heat stress in the dry season that barley and sorghum tolerate better than wheat alone.",
    benefits: ["Vetch cover crop reduces bare-field evaporation and adds some nitrogen", "Sorghum's deep roots improve infiltration and tolerate heat stress", "Lower overall irrigation demand across the sequence"],
    risks: ["Sorghum has low frost tolerance — a late cold snap could damage establishment", "Vetch has little direct market value; benefit is mostly agronomic", "Switching away from wheat may reduce short-term market income"],
    gaps: ["No field-level irrigation volume data to confirm actual water savings", "Local market demand for sorghum not assessed"],
  },
  {
    id: "soil-building",
    name: "Soil-building rotation",
    sequence: ["chickpea", "wheat", "faba"],
    rationale: "Alternates legumes with cereals to rebuild nitrogen and organic matter while breaking cereal pest and disease cycles, aimed at fields reporting declining soil health.",
    evidence: "MODIS/Landsat vegetation-stress indicators flagged in long-term NDVI trends are often associated with declining soil fertility; legume rotations are a standard response. SRTM-derived slope data for gently sloped fields suggests erosion risk here is moderate rather than severe, making a fertility-first sequence reasonable.",
    benefits: ["Two nitrogen-fixing legumes reduce dependence on synthetic fertilizer", "Rotating out of continuous cereal breaks pest and disease cycles", "Builds organic matter over multiple seasons"],
    risks: ["Legume prices can be more volatile than wheat in local markets", "Faba bean is moderately frost-sensitive during flowering", "Benefits accrue over several seasons, not immediately"],
    gaps: ["Baseline soil organic matter % not measured for this field", "No local data on legume disease pressure (e.g. Ascochyta)"],
  },
  {
    id: "diversified-income",
    name: "Diversified income rotation",
    sequence: ["olive", "alfalfa", "chickpea"],
    rationale: "Adds a drought-tolerant perennial tree row and a deep-rooted forage legume alongside a grain legume, aimed at farms prioritizing erosion control and income diversification over maximum annual yield.",
    evidence: "SRTM elevation and slope layers can flag erosion-prone margins where a perennial tree row is most valuable; NASA POWER long-term radiation and temperature averages support olive's suitability in this climate; alfalfa's year-round canopy reduces bare-soil months almost entirely.",
    benefits: ["Perennial olive rows stabilize soil on slopes and diversify income over the long term", "Alfalfa forage has strong erosion control and can support livestock income", "Chickpea rounds out the sequence with nitrogen fixing and grain income"],
    risks: ["Olive establishment requires multi-year investment before income starts", "Converting cropland to perennial rows reduces annual-crop flexibility", "Alfalfa has higher water demand than the other candidates here"],
    gaps: ["No livestock inventory provided to assess forage demand", "Tree-row spacing and slope-specific placement would need an on-site survey"],
  },
];

/* ---------------- Priority metadata ---------------- */
const PRIORITY_META = [
  { key: "water", label: "Conserve water", desc: "Favor crops and sequences with lower irrigation demand." },
  { key: "soil", label: "Build soil fertility", desc: "Favor nitrogen-fixing crops and organic matter contribution." },
  { key: "erosion", label: "Reduce erosion", desc: "Favor deep roots, ground cover, and reduced bare-field time." },
  { key: "income", label: "Market income", desc: "Favor crops with stronger local market value." },
  { key: "pest", label: "Break pest cycles", desc: "Favor rotations that interrupt repeated cereal pest pressure." },
];

/* ---------------- Dataset & glossary content ---------------- */
const DATASETS = [
  { name: "SMAP", full: "Soil Moisture Active Passive", desc: "Surface soil moisture and anomalies, used to flag drought stress and infiltration potential." },
  { name: "ECOSTRESS", full: "ECOsystem Spaceborne Thermal Radiometer", desc: "Land-surface temperature and evapotranspiration, used to spot heat stress hotspots." },
  { name: "GPM", full: "Global Precipitation Measurement", desc: "Rainfall intensity and timing, used to assess erosive-rain risk and water balance." },
  { name: "Landsat / MODIS", full: "Vegetation indices (e.g. NDVI)", desc: "Canopy greenness over time, used to detect vegetation stress and bare-field periods." },
  { name: "NASA POWER", full: "Prediction of Worldwide Energy Resources", desc: "Long-term temperature, radiation and rainfall averages for climate context." },
  { name: "GRACE / GRACE-FO", full: "Gravity Recovery and Climate Experiment", desc: "Changes in terrestrial water storage, used to track groundwater depletion trends." },
  { name: "SRTM", full: "Shuttle Radar Topography Mission", desc: "Elevation and slope, used to flag erosion-prone zones and drainage patterns." },
];

const GLOSSARY = [
  { term: "Evapotranspiration", def: "Water lost to the atmosphere from soil evaporation plus plant transpiration — a key driver of irrigation need." },
  { term: "Soil moisture anomaly", def: "How far current soil moisture sits from the long-term average for that time of year, used to flag unusual dryness or wetness." },
  { term: "NDVI", def: "Normalized Difference Vegetation Index — a satellite measure of canopy greenness, used as a proxy for vegetation health and stress." },
  { term: "Frost risk", def: "The likelihood of temperatures dropping low enough to damage crops, especially during flowering or establishment." },
  { term: "Water-balance indicator", def: "A simplified accounting of water in (rainfall, irrigation) versus water out (evapotranspiration, runoff) over a season." },
];

/* =========================================================
   Navigation
   ========================================================= */
const views = ["overview", "farm", "priorities", "compare", "map", "saved", "data"];

function goto(view) {
  views.forEach(v => {
    document.getElementById(`view-${v}`).classList.toggle("hidden", v !== view);
  });
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });
  document.querySelectorAll(".tab-link").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });
  document.getElementById("sidebar").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  if (view === "compare") renderCompare();
  if (view === "map") renderMap();
  if (view === "saved") renderSavedPlans();
}

document.addEventListener("click", (e) => {
  const navBtn = e.target.closest("[data-view]");
  if (navBtn) { goto(navBtn.dataset.view); return; }
  const gotoBtn = e.target.closest("[data-goto]");
  if (gotoBtn) { goto(gotoBtn.dataset.goto); return; }
});

document.getElementById("menuToggle").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("open");
});

/* =========================================================
   Overview: setup progress
   ========================================================= */
function farmComplete(field) {
  if (field === "soil") return !!(state.farm.soil && state.farm.drainage);
  if (field === "water") return !!state.farm.water;
  if (field === "history") return state.farm.history.length > 0;
  return false;
}
function refreshOverviewStatus() {
  let doneCount = 0;
  ["soil", "water", "history"].forEach(f => {
    const li = document.querySelector(`#farmChecklist li[data-check="${f}"]`);
    const ok = farmComplete(f);
    if (ok) doneCount++;
    li.classList.toggle("done", ok);
    li.querySelector(".status").textContent = ok ? "Provided" : "Not provided";
  });
  const tag = document.getElementById("setupTag");
  if (doneCount === 3) { tag.textContent = "Setup complete"; tag.className = "tag tag-ok"; }
  else if (doneCount > 0) { tag.textContent = `${doneCount}/3 complete`; tag.className = "tag tag-warn"; }
  else { tag.textContent = "Setup incomplete"; tag.className = "tag tag-warn"; }

  document.getElementById("stepTag-farm").textContent = doneCount === 3 ? "Complete" : doneCount > 0 ? "In progress" : "Not set";
  document.getElementById("stepTag-farm").className = "tag " + (doneCount === 3 ? "tag-ok" : "");
  const prioritiesSet = localStorage.getItem(STORAGE_KEY) && Object.values(state.priorities).some(v => v !== 3);
  document.getElementById("stepTag-priorities").textContent = prioritiesSet ? "Set" : "Not set";
  document.getElementById("stepTag-priorities").className = "tag " + (prioritiesSet ? "tag-ok" : "");
}

/* =========================================================
   Farm profile form
   ========================================================= */
const farmFields = ["name", "location", "size", "soil", "drainage", "water"];
function initFarmForm() {
  farmFields.forEach(f => {
    document.getElementById(`f-${f}`).value = state.farm[f] || "";
  });
  renderHistoryList();

  document.getElementById("addHistoryBtn").addEventListener("click", () => {
    const year = document.getElementById("ch-year").value.trim();
    const crop = document.getElementById("ch-crop").value.trim();
    const note = document.getElementById("ch-note").value.trim();
    if (!year || !crop) return;
    state.farm.history.push({ year, crop, note });
    document.getElementById("ch-year").value = "";
    document.getElementById("ch-crop").value = "";
    document.getElementById("ch-note").value = "";
    renderHistoryList();
  });

  document.getElementById("saveFarmBtn").addEventListener("click", () => {
    farmFields.forEach(f => {
      state.farm[f] = document.getElementById(`f-${f}`).value;
    });
    saveState();
    refreshOverviewStatus();
    const confirm = document.getElementById("farmSaveConfirm");
    confirm.textContent = "Saved ✓";
    confirm.classList.add("show");
    setTimeout(() => confirm.classList.remove("show"), 2200);
  });
}
function renderHistoryList() {
  const wrap = document.getElementById("cropHistoryList");
  wrap.innerHTML = "";
  if (state.farm.history.length === 0) {
    wrap.innerHTML = `<p class="small muted">No seasons added yet.</p>`;
    return;
  }
  state.farm.history.slice().reverse().forEach((h) => {
    const realIndex = state.farm.history.indexOf(h);
    const row = document.createElement("div");
    row.className = "history-row";
    row.innerHTML = `<span><b>${escapeHtml(h.year)}</b> — ${escapeHtml(h.crop)}${h.note ? ` <span class="muted">(${escapeHtml(h.note)})</span>` : ""}</span>
      <button class="remove-btn" aria-label="Remove">&times;</button>`;
    row.querySelector(".remove-btn").addEventListener("click", () => {
      state.farm.history.splice(realIndex, 1);
      renderHistoryList();
    });
    wrap.appendChild(row);
  });
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* =========================================================
   Priorities
   ========================================================= */
function initPriorities() {
  const wrap = document.getElementById("prioritySliders");
  wrap.innerHTML = "";
  PRIORITY_META.forEach(p => {
    const row = document.createElement("div");
    row.className = "priority-item";
    row.innerHTML = `
      <div><div class="p-label">${p.label}</div><div class="p-desc">${p.desc}</div></div>
      <input type="range" min="0" max="5" step="1" value="${state.priorities[p.key]}" data-key="${p.key}" />
      <div class="p-val">${state.priorities[p.key]}</div>`;
    const input = row.querySelector("input");
    const valEl = row.querySelector(".p-val");
    input.addEventListener("input", () => { valEl.textContent = input.value; });
    wrap.appendChild(row);
  });

  document.getElementById("savePrioritiesBtn").addEventListener("click", () => {
    wrap.querySelectorAll("input[type=range]").forEach(input => {
      state.priorities[input.dataset.key] = Number(input.value);
    });
    saveState();
    refreshOverviewStatus();
    const confirm = document.getElementById("prioritiesSaveConfirm");
    confirm.textContent = "Saved ✓";
    confirm.classList.add("show");
    setTimeout(() => confirm.classList.remove("show"), 2200);
  });
  document.getElementById("resetPrioritiesBtn").addEventListener("click", () => {
    PRIORITY_META.forEach(p => { state.priorities[p.key] = 3; });
    initPriorities();
  });
}

/* =========================================================
   Compare / scoring
   ========================================================= */
function scoreCropForPriorities(crop, weights) {
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
  const waterScore = 5 - crop.water;        // lower water demand = better
  const soilScore = (crop.nitrogen + crop.organic) / 2;
  const sum =
    waterScore * weights.water +
    soilScore * weights.soil +
    crop.erosion * weights.erosion +
    crop.market * weights.income +
    crop.pest * weights.pest;
  return sum / totalWeight; // 0..5 scale
}
function scoreStrategy(strategy, weights) {
  const perCrop = strategy.sequence.map(cropId => scoreCropForPriorities(CROPS[cropId], weights));
  return perCrop.reduce((a, b) => a + b, 0) / perCrop.length;
}
function axisScoresForStrategy(strategy, weights) {
  // returns per-priority-axis average (for radar), ignoring weights (raw 0-5 potential)
  const axes = { water: 0, soil: 0, erosion: 0, income: 0, pest: 0 };
  strategy.sequence.forEach(cropId => {
    const c = CROPS[cropId];
    axes.water += 5 - c.water;
    axes.soil += (c.nitrogen + c.organic) / 2;
    axes.erosion += c.erosion;
    axes.income += c.market;
    axes.pest += c.pest;
  });
  const n = strategy.sequence.length;
  Object.keys(axes).forEach(k => axes[k] = axes[k] / n);
  return axes;
}

function renderCompare() {
  const weights = state.priorities;
  const summary = PRIORITY_META
    .filter(p => weights[p.key] !== 3)
    .map(p => `${p.label} (${weights[p.key]})`);
  document.getElementById("activePrioritiesSummary").textContent = summary.length ? summary.join(", ") : "even weights (default)";

  const scored = STRATEGIES.map(s => ({ ...s, score: scoreStrategy(s, weights) }));
  const maxScore = Math.max(...scored.map(s => s.score));

  renderRadar(scored, weights);

  const wrap = document.getElementById("strategyCards");
  wrap.innerHTML = "";
  scored.forEach(s => {
    const isBest = s.score === maxScore;
    const card = document.createElement("div");
    card.className = "strategy-card" + (isBest ? " best" : "");
    card.innerHTML = `
      <div class="strategy-head">
        <div class="strategy-title">
          <h3>${s.name}</h3>
          ${isBest ? '<span class="tag tag-ok">Best match for your priorities</span>' : ""}
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="score-pill ${s.score < 2.5 ? "low" : ""}">${s.score.toFixed(1)} / 5</span>
          <svg class="chevron" viewBox="0 0 24 24" width="18" height="18"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
      </div>
      <div class="sequence-row">
        ${s.sequence.map((cid, i) => `<span class="crop-chip">${CROPS[cid].name}${i < s.sequence.length - 1 ? '<span class="arrow">→</span>' : ""}</span>`).join("")}
      </div>
      <p class="small">${s.rationale}</p>
      <div class="strategy-detail">
        <div class="strategy-body">
          <div class="block"><h5>Supporting evidence</h5><p>${s.evidence}</p></div>
          <div class="block"><h5>Potential benefits</h5><ul>${s.benefits.map(b => `<li>${b}</li>`).join("")}</ul></div>
          <div class="block"><h5>Risks to weigh</h5><ul>${s.risks.map(b => `<li>${b}</li>`).join("")}</ul></div>
          <div class="block"><h5>Information gaps — needs local review</h5><ul>${s.gaps.map(b => `<li>${b}</li>`).join("")}</ul></div>
        </div>
        <button class="btn btn-ghost save-plan-btn" data-save="${s.id}">☆ Save this plan</button>
      </div>
    `;
    card.querySelector(".strategy-head").addEventListener("click", () => card.classList.toggle("open"));
    card.querySelector("[data-save]").addEventListener("click", (e) => {
      e.stopPropagation();
      savePlan(s.id);
    });
    wrap.appendChild(card);
  });
}

function savePlan(id) {
  if (!state.savedPlans.includes(id)) state.savedPlans.push(id);
  saveState();
  const strategy = STRATEGIES.find(s => s.id === id);
  alertInline(`"${strategy.name}" saved. View it under Reference → Saved plans.`);
}
function alertInline(msg) {
  const existing = document.getElementById("inlineToast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.id = "inlineToast";
  toast.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0b3d33;color:#fff;padding:12px 20px;border-radius:10px;font-size:13.5px;z-index:100;box-shadow:0 6px 20px rgba(0,0,0,0.2);";
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

function renderSavedPlans() {
  const wrap = document.getElementById("savedPlansList");
  wrap.innerHTML = "";
  if (state.savedPlans.length === 0) {
    wrap.innerHTML = `<div class="saved-empty">No plans saved yet. Save one from the Compare plans view.</div>`;
    return;
  }
  state.savedPlans.forEach(id => {
    const s = STRATEGIES.find(st => st.id === id);
    if (!s) return;
    const row = document.createElement("div");
    row.className = "saved-plan-row";
    row.innerHTML = `<div><b>${s.name}</b><div class="small muted">${s.sequence.map(c => CROPS[c].name).join(" → ")}</div></div>
      <button class="btn btn-ghost" data-remove>Remove</button>`;
    row.querySelector("[data-remove]").addEventListener("click", () => {
      state.savedPlans = state.savedPlans.filter(x => x !== id);
      saveState();
      renderSavedPlans();
    });
    wrap.appendChild(row);
  });
}

/* ---------------- Radar chart (SVG) ---------------- */
function renderRadar(scoredStrategies, weights) {
  const wrap = document.getElementById("radarWrap");
  const axes = PRIORITY_META;
  const size = 320, cx = size / 2, cy = size / 2, r = 110;
  const colors = ["#0e7c66", "#b45309", "#6b5bd1", "#1f7a99"];

  const angleFor = (i) => (Math.PI * 2 * i) / axes.length - Math.PI / 2;
  const pointFor = (i, value) => {
    const ang = angleFor(i);
    const rr = (value / 5) * r;
    return [cx + rr * Math.cos(ang), cy + rr * Math.sin(ang)];
  };

  let gridRings = "";
  [1, 2, 3, 4, 5].forEach(ring => {
    const pts = axes.map((_, i) => pointFor(i, ring).join(",")).join(" ");
    gridRings += `<polygon points="${pts}" fill="none" stroke="#e2e8e5" stroke-width="1"/>`;
  });
  let axisLines = "", labels = "";
  axes.forEach((a, i) => {
    const [x, y] = pointFor(i, 5.6);
    const [x0, y0] = pointFor(i, 0);
    axisLines += `<line x1="${x0}" y1="${y0}" x2="${x}" y2="${y}" stroke="#e2e8e5" stroke-width="1"/>`;
    labels += `<text x="${x}" y="${y}" font-size="10.5" fill="#52606d" text-anchor="middle" dominant-baseline="middle">${a.label}</text>`;
  });

  let polys = "";
  scoredStrategies.forEach((s, idx) => {
    const axesScores = axisScoresForStrategy(s, weights);
    const pts = axes.map((a, i) => pointFor(i, axesScores[a.key]).join(",")).join(" ");
    const color = colors[idx % colors.length];
    polys += `<polygon points="${pts}" fill="${color}" fill-opacity="0.08" stroke="${color}" stroke-width="2"/>`;
  });

  let legend = `<div style="display:flex;gap:14px;flex-wrap:wrap;justify-content:center;margin-top:10px;">`;
  scoredStrategies.forEach((s, idx) => {
    legend += `<span style="display:flex;align-items:center;gap:6px;font-size:12px;color:#52606d;">
      <span style="width:10px;height:10px;border-radius:3px;background:${colors[idx % colors.length]};display:inline-block;"></span>${s.name}
    </span>`;
  });
  legend += `</div>`;

  wrap.innerHTML = `<div>
    <svg viewBox="0 0 ${size} ${size}" width="340" height="340">${gridRings}${axisLines}${polys}${labels}</svg>
    ${legend}
  </div>`;
}

/* =========================================================
   Field map (illustrative SVG grid)
   ========================================================= */
const GRID_COLS = 5, GRID_ROWS = 4;
const BASE_ZONES = (() => {
  // seeded pseudo-random base risk values per zone per layer, stable across renders
  const zones = [];
  let seed = 42;
  function rand() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      zones.push({
        row: r, col: c,
        erosion: 0.15 + rand() * 0.6 + (r / GRID_ROWS) * 0.25, // slightly higher toward one edge
        water: 0.25 + rand() * 0.55,
        frost: 0.1 + rand() * 0.45 + (c === 0 ? 0.15 : 0),
      });
    }
  }
  return zones;
})();

function renderMap() {
  const svg = document.getElementById("fieldMap");
  const layer = document.querySelector('input[name="layer"]:checked').value;
  const rainPct = Number(document.getElementById("rainSlider").value);
  const tempDelta = Number(document.getElementById("tempSlider").value);

  const cellW = 400 / GRID_COLS, cellH = 300 / GRID_ROWS;
  let svgContent = "";

  BASE_ZONES.forEach(z => {
    let val = z[layer];
    // scenario adjustments: less rain -> more water stress & erosion risk from crusting; more heat -> more frost risk goes down, water stress up
    if (layer === "water") val += (-rainPct / 100) * 0.4 + (tempDelta / 5) * 0.25;
    if (layer === "erosion") val += (-rainPct / 100) * 0.15;
    if (layer === "frost") val -= (tempDelta / 5) * 0.35;
    val = Math.max(0, Math.min(1, val));

    const color = riskColor(val);
    const x = z.col * cellW, y = z.row * cellH;
    svgContent += `<rect x="${x + 1}" y="${y + 1}" width="${cellW - 2}" height="${cellH - 2}" fill="${color}" rx="4"></rect>`;
  });

  svg.innerHTML = svgContent;
  renderMapLegend(layer);
}
function riskColor(val) {
  // val 0 (low risk, green) -> 0.5 (amber) -> 1 (high risk, red)
  const stops = [
    [14, 124, 102],   // teal-green: low risk
    [217, 158, 33],   // amber: moderate
    [180, 35, 24],    // red: high risk
  ];
  const t = Math.max(0, Math.min(1, val)) * 2;
  const i = Math.min(1, Math.floor(t));
  const frac = t - i;
  const a = stops[i], b = stops[i + 1];
  const mix = a.map((c, k) => Math.round(c + (b[k] - c) * frac));
  return `rgb(${mix.join(",")})`;
}
function renderMapLegend(layer) {
  const labelMap = { erosion: "Erosion risk", water: "Water stress", frost: "Frost risk" };
  document.getElementById("mapLegend").innerHTML = `
    <span class="legend-item"><span class="legend-swatch" style="background:${riskColor(0.05)}"></span>Lower ${labelMap[layer].toLowerCase()}</span>
    <span class="legend-item"><span class="legend-swatch" style="background:${riskColor(0.55)}"></span>Moderate</span>
    <span class="legend-item"><span class="legend-swatch" style="background:${riskColor(0.95)}"></span>Higher ${labelMap[layer].toLowerCase()}</span>
  `;
}

function initMapControls() {
  document.querySelectorAll('input[name="layer"]').forEach(r => r.addEventListener("change", renderMap));
  const rainSlider = document.getElementById("rainSlider");
  const tempSlider = document.getElementById("tempSlider");
  rainSlider.addEventListener("input", () => {
    document.getElementById("rainSliderVal").textContent = `${rainSlider.value > 0 ? "+" : ""}${rainSlider.value}%`;
    renderMap();
  });
  tempSlider.addEventListener("input", () => {
    const v = Number(tempSlider.value);
    document.getElementById("tempSliderVal").textContent = `${v > 0 ? "+" : ""}${v.toFixed(1)}°C`;
    renderMap();
  });
}

/* =========================================================
   Data sources view
   ========================================================= */
function initDatasetGrid() {
  const grid = document.getElementById("datasetGrid");
  grid.innerHTML = DATASETS.map(d => `
    <div class="dataset-card">
      <h4>${d.name}</h4>
      <span class="ds-full">${d.full}</span>
      <p class="small">${d.desc}</p>
    </div>
  `).join("");

  const glossary = document.getElementById("glossaryList");
  glossary.innerHTML = GLOSSARY.map(g => `
    <div class="glossary-item"><dl><dt>${g.term}</dt><dd>${g.def}</dd></dl></div>
  `).join("");
}

/* =========================================================
   Init
   ========================================================= */
function removeHostBadge() {
  document.getElementById("nl-badge-frame")?.remove();
}
removeHostBadge();
window.addEventListener("load", removeHostBadge);
new MutationObserver(removeHostBadge).observe(document.documentElement, { childList: true, subtree: true });

document.addEventListener("DOMContentLoaded", () => {
  initFarmForm();
  initPriorities();
  initMapControls();
  initDatasetGrid();
  refreshOverviewStatus();
  goto("overview");
});
