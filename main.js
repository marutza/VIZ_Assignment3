/* ============================================================
   The Boyband Blueprint — radial formula index
   Data → aggregate → geometry → interaction
   ============================================================ */

const SVG_NS = "http://www.w3.org/2000/svg";
const CX = 480;
const CY = 480;

const RING_METRICS = [
  { key: "hairColor", label: "hair colour", radius: 196, color: "#b33b2b" },
  { key: "hairLength", label: "hair length", radius: 164, color: "#cf962d" },
  { key: "shirt", label: "shirt colour", radius: 132, color: "#2d6c82" },
  { key: "bottom", label: "trouser colour", radius: 100, color: "#5b7c4d" }
];

const DOT_TOTAL = 234;

const HAIR_COLORS = [
  ["black", "#17191d"],
  ["brown", "#7d4b2d"],
  ["blonde", "#d9a93f"],
  ["red", "#b9472f"],
  ["other", "#9d998d"],
  ["undocumented", "#ddd5c6"]
];

const ERA_COLORS = {
  "1960s": "#c04a32",
  "1970s": "#d4862c",
  "1980s": "#2d6a84",
  "1990s": "#705289",
  "Undated": "#938f84"
};

const ERAS = ["1960s", "1970s", "1980s", "1990s", "Undated"];

const state = {
  bands: [],
  order: "chrono",
  era: "all",
  lowOnly: false,
  spotlight: false,
  selected: null,
  hovered: null,
  visible: []
};

/* ---------- helpers ---------- */

const $ = (selector) => document.querySelector(selector);
const mod = (n, m) => ((n % m) + m) % m;
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const mean = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

function normalizeHair(value) {
  const v = (value || "").trim().toLowerCase();
  if (!v) return "undocumented";
  if (v === "strawberry blonde") return "blonde";
  if (["black", "brown", "blonde", "red"].includes(v)) return v;
  return "other";
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function birthYear(dob) {
  if (!dob) return null;
  const parts = dob.split("/");
  if (parts.length !== 3) return null;
  const year = Number(parts[2]);
  return Number.isFinite(year) && year > 1900 ? year : null;
}

function topShare(items, key) {
  const counts = new Map();
  let n = 0;
  items.forEach((item) => {
    const value = item[key];
    if (!value || value === "undocumented") return;
    counts.set(value, (counts.get(value) || 0) + 1);
    n += 1;
  });
  if (!n) return { ratio: 0, top: "undocumented", count: 0, n: 0 };
  let top = "undocumented";
  let count = 0;
  counts.forEach((c, value) => {
    if (c > count) { count = c; top = value; }
  });
  return { ratio: count / n, top, count, n };
}

function bandSummary(band) {
  const n = band.members.length;
  const parts = [];
  RING_METRICS.forEach(({ key, label }) => {
    const m = band.metrics[key];
    if (m.ratio >= 0.8) parts.push(`${m.count}/${m.n} share ${m.top} ${label}`);
  });
  if (!parts.length) return `${n} members, but no majority reaches 80%. A band of separate styling decisions.`;
  return parts.join("; ") + ".";
}

/* ---------- data ---------- */

async function loadData() {
  const rows = d3.csvParse(window.BOYS_CSV);
  const groups = d3.group(rows, (d) => d.band.trim());

  state.bands = Array.from(groups, ([band, members]) => {
    const years = members.map((m) => birthYear(m.dob)).filter(Boolean);
    const era = years.length ? `${Math.floor(median(years) / 10) * 10}s` : "Undated";
    const normalized = members.map((m) => ({
      band,
      name: m.name,
      dob: m.dob,
      year: birthYear(m.dob),
      height: Number(m.height) || null,
      hairColor: normalizeHair(m.hair_color),
      hairLength: (m.hair_length || "undocumented").trim().toLowerCase(),
      shirt: (m.shirt_color || "undocumented").trim().toLowerCase(),
      bottom: (m.bottom_color || "undocumented").trim().toLowerCase(),
      top: m.top_style || "",
      accessory: m.accessories || ""
    }));

    const metrics = {};
    RING_METRICS.forEach(({ key }) => { metrics[key] = topShare(normalized, key); });
    const available = RING_METRICS.map(({ key }) => metrics[key].ratio).filter((_, i) => metrics[RING_METRICS[i].key].n > 0);
    const score = Math.round(100 * (available.length ? mean(available) : 0));

    const documented = RING_METRICS.reduce(
      (sum, { key }) => sum + metrics[key].n,
         0
      );

    const possible = normalized.length * RING_METRICS.length;

    const coverage = possible
      ? Math.round((documented / possible) * 100)
      : 0;

        return {
          id: slug(band),
          band,
          era,
          years,
          medianYear: years.length ? median(years) : 9999,
          members: normalized,
          metrics,
          score,
          coverage,
          top10: false
        };
  });

  state.bands.sort((a, b) => a.medianYear - b.medianYear || a.band.localeCompare(b.band));
  const topScores = [...state.bands].sort((a, b) => b.score - a.score).slice(0, 10);
  topScores.forEach((band) => { band.top10 = true; });

  ERAS.forEach((era) => {
    const values = state.bands.filter((b) => b.era === era).map((b) => b.score);
    const target = era === "1960s" ? "#era-60" : era === "1990s" ? "#era-90" : null;
    if (target) $(target).textContent = Math.round(mean(values));
  });
}

/* ---------- static legends ---------- */

function buildLegends() {
  $("#hair-legend").innerHTML = HAIR_COLORS.map(([label, color]) =>
    `<li><i style="background:${color}"></i>${label}</li>`
  ).join("");

  const counts = d3.rollup(state.bands, (v) => v.length, (d) => d.era);
  $("#era-legend").innerHTML = ERAS.map((era) =>
    `<li><i style="background:${ERA_COLORS[era]}"></i>${era === "Undated" ? "No birth dates" : era} <small>(${counts.get(era) || 0})</small></li>`
  ).join("");

  $("#era-chips").innerHTML = `<button type="button" class="chip is-active" data-era="all">All <small>55</small></button>` +
    ERAS.map((era) => `<button type="button" class="chip" data-era="${era}">${era} <small>${counts.get(era) || 0}</small></button>`).join("");
}

/* ---------- geometry ---------- */

function arcPath(inner, outer, start, end) {
  return d3.arc().innerRadius(inner).outerRadius(Math.max(inner + 1, outer)).startAngle(start).endAngle(end)();
}

function slotAngles(count) {
  const slot = (Math.PI * 2) / count;
  const pad = Math.min(0.018, slot * 0.2);
  return (index) => ({
    start: index * slot + pad / 2,
    end: (index + 1) * slot - pad / 2,
    mid: -Math.PI / 2 + (index + 0.5) * slot
  });
}

const heightScale = d3.scaleLinear().domain([64, 78]).range([2.4, 7.4]).clamp(true);

function filteredBands() {
  let bands = state.era === "all"
    ? state.bands
    : state.bands.filter((band) => band.era === state.era);
  if (state.lowOnly) bands = bands.filter((band) => band.members.length <= 4);

  if (state.order === "rank") {
    return [...bands].sort((a, b) => b.score - a.score || a.band.localeCompare(b.band));
  }
  return [...bands].sort((a, b) => a.medianYear - b.medianYear || a.band.localeCompare(b.band));
}

function visibleTop10() {
  return new Set(state.visible.filter((b) => b.top10).map((b) => b.id));
}

/* ---------- chart ---------- */

function render() {
  hideTooltip();
  state.visible = filteredBands();
  const svg = d3.select("#chart");
  svg.selectAll("*").remove();

  if (!state.visible.length) {
    svg.append("text")
      .attr("class", "empty-note")
      .attr("x", CX).attr("y", CY)
      .attr("text-anchor", "middle")
      .text("No bands match these filters.");
    updateHub();
    updateSubtitle();
    renderRanking();
    return;
  }

  const defs = svg.append("defs");
  defs.append("pattern")
    .attr("id", "hatch")
    .attr("width", 4).attr("height", 4)
    .attr("patternUnits", "userSpaceOnUse")
    .attr("patternTransform", "rotate(45)")
    .append("line")
    .attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 4)
    .attr("stroke", "#c9c0ae").attr("stroke-width", 1);

  const root = svg.append("g").attr("class", "chart-root");

  // Radial scaffolding.
  const guides = root.append("g").attr("aria-hidden", "true");
  [62, 76, 100, 132, 164, 196, 220, 304].forEach((r) => {
    guides.append("circle").attr("cx", CX).attr("cy", CY).attr("r", r).attr("class", "axis-circle");
  });
  for (let i = 0; i < 72; i += 1) {
    const a = (i / 72) * Math.PI * 2;
    const r1 = 58;
    const r2 = i % 6 === 0 ? 66 : 62;
    guides.append("line")
      .attr("x1", CX + Math.cos(a) * r1).attr("y1", CY + Math.sin(a) * r1)
      .attr("x2", CX + Math.cos(a) * r2).attr("y2", CY + Math.sin(a) * r2)
      .attr("class", "axis-spoke");
  }

  // Ring labels, top-left quadrant.
  const angle = slotAngles(state.visible.length);
  const ringLabels = root.append("g").attr("aria-hidden", "true");
  const labelAt = -Math.PI / 2 - 0.58;
  RING_METRICS.forEach((metric, idx) => {
    const sx = CX + Math.cos(labelAt) * (metric.radius - 7);
    const sy = CY + Math.sin(labelAt) * (metric.radius - 7);
    const rot = (labelAt * 180) / Math.PI + 90;
    ringLabels.append("text")
      .attr("class", "ring-label")
      .attr("style", `fill:${metric.color}`)
      .attr("x", sx).attr("y", sy)
      .attr("text-anchor", "middle")
      .attr("transform", `rotate(${rot} ${sx} ${sy})`)
      .text(`${idx + 1} ${metric.label}`);
  });

  const bandLayer = root.append("g").attr("class", "bands");

  state.visible.forEach((band, index) => {
    const { start, end, mid } = angle(index);
    const group = bandLayer.append("g")
      .attr("class", "band")
      .attr("data-id", band.id)
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", `${band.band}, ${band.members.length} members${band.members.length <= 4 ? ", low confidence" : ""}, formula strength ${band.score} of 100`);

    // Invisible full-wedge hit target.
    group.append("path")
      .attr("class", "band-hit")
      .attr("transform", `translate(${CX} ${CY})`)
      .attr("d", arcPath(90, 344, start, end));

    // Spoke through the member column.
    group.append("line")
      .attr("class", "band-spoke")
      .attr("x1", CX + Math.cos(mid) * 216)
      .attr("y1", CY + Math.sin(mid) * 216)
      .attr("x2", CX + Math.cos(mid) * 296)
      .attr("y2", CY + Math.sin(mid) * 296);

    // Four ring tracks and fills, outside-in.
    RING_METRICS.forEach((metric) => {
      const m = band.metrics[metric.key];
      group.append("path")
        .attr("class", "ring-track")
        .attr("fill", metric.color)
        .attr("fill-opacity", 0.16)
        .attr("transform", `translate(${CX} ${CY})`)
        .attr("d", arcPath(metric.radius - 7, metric.radius + 7, start, end));
      if (m.ratio > 0) {
        group.append("path")
          .attr("class", "ring-fill")
          .attr("fill", metric.color)
          .attr("transform", `translate(${CX} ${CY})`)
          .attr("d", arcPath(metric.radius - 7, metric.radius + 7, start, start + (end - start) * m.ratio));
      }
      [0.25, 0.5, 0.75].forEach((t) => {
        const a = start + (end - start) * t;
        group.append("line")
          .attr("class", "ring-tick")
          .attr("x1", CX + Math.sin(a) * (metric.radius - 7))
          .attr("y1", CY - Math.cos(a) * (metric.radius - 7))
          .attr("x2", CX + Math.sin(a) * (metric.radius + 7))
          .attr("y2", CY - Math.cos(a) * (metric.radius + 7));
      });
    });

    // Member dots: visible hollow state for missing height.
    band.members.forEach((member, i) => {
      const r = 220 + i * 10.4;
      const px = CX + Math.cos(mid) * r;
      const py = CY + Math.sin(mid) * r;
      const color = (HAIR_COLORS.find(([label]) => label === member.hairColor) || HAIR_COLORS[5])[1];
      const missing = !member.height;
      group.append("circle")
        .attr("class", `member-dot${missing ? " is-missing" : ""}`)
        .attr("cx", px).attr("cy", py)
        .attr("fill", missing ? "#f2ede2" : color)
        .attr("r", missing ? 4.5 : heightScale(member.height));
      if (missing) {
        group.append("circle")
          .attr("class", "member-pip")
          .attr("cx", px).attr("cy", py)
          .attr("fill", color)
          .attr("r", 1.6);
      }
    });

    // Data arc: depth = member count.
    const depth = 304 + Math.max(12, band.members.length * 5.2);
    group.append("path")
      .attr("class", "band-arc")
      .attr("fill", ERA_COLORS[band.era])
      .attr("transform", `translate(${CX} ${CY})`)
      .attr("d", arcPath(304, depth, start, end));

    // Score and label outside.
    const sr = depth + 8;
    group.append("text")
      .attr("class", "score-label")
      .attr("x", CX + Math.cos(mid) * sr)
      .attr("y", CY + Math.sin(mid) * sr)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .text(`${band.score}${band.members.length <= 4 ? "○" : ""}`);

    const lr = 374;
    const lx = CX + Math.cos(mid) * lr;
    const ly = CY + Math.sin(mid) * lr;
    let rotation = (mid * 180) / Math.PI;
    let anchor = "start";
    if (Math.cos(mid) < 0) { rotation += 180; anchor = "end"; }
    group.append("text")
      .attr("class", "band-label")
      .attr("x", lx).attr("y", ly)
      .attr("text-anchor", anchor)
      .attr("dominant-baseline", "middle")
      .attr("transform", `rotate(${rotation} ${lx} ${ly})`)
      .text(band.band);

    // Events.
    group
      .on("pointerenter", (event) => { setHovered(band.id); showTooltip(event, band); })
      .on("pointermove", (event) => moveTooltip(event))
      .on("pointerleave", () => { setHovered(null); hideTooltip(); })
      .on("click", (event) => { event.stopPropagation(); selectBand(band.id); })
      .on("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectBand(band.id);
        }
      });
  });

  ringLabels.raise();

  const dotCount = root.selectAll(".member-dot").size();
  svg.attr("data-dot-count", dotCount).attr("data-dot-expected", state.visible.reduce((sum, band) => sum + band.members.length, 0));
  if (dotCount !== Number(svg.attr("data-dot-expected"))) {
    console.error(`Dot count mismatch: ${dotCount}`);
  }

  svg.on("click", () => closeDetail());

  applyEmphasis();
  updateHub();
  updateSubtitle();
  renderRanking();
}

/* ---------- emphasis ---------- */

function setHovered(id) {
  state.hovered = id;
  applyEmphasis();
  document.querySelectorAll(".rank-row").forEach((row) => {
    row.classList.toggle("is-hot", row.dataset.id === id);
  });
}

function applyEmphasis() {
  const top10 = visibleTop10();
  const focus = new Set([state.hovered, state.selected].filter(Boolean));
  const slot = (Math.PI * 2) / Math.max(1, state.visible.length);

  d3.selectAll(".band").each(function () {
    const id = this.dataset.id;
    const g = d3.select(this);
    const isFocus = focus.has(id);
    const out = (focus.size && !isFocus) || (state.spotlight && !top10.has(id) && !isFocus);
    g.classed("dim", out);
    g.classed("hot", state.hovered === id);
    g.classed("is-selected-band", state.selected === id);
    g.attr("aria-pressed", state.selected === id ? "true" : "false");

    const index = state.visible.findIndex((band) => band.id === id);
    const mid = -Math.PI / 2 + (index + 0.5) * slot;
    const push = state.selected === id ? 18 : 0;
    g.style("transform", `translate(${Math.cos(mid) * push}px, ${Math.sin(mid) * push}px)`);

    if (state.selected === id) {
      this.parentNode.appendChild(this);
    }

    if (state.selected === id) {
      const band = state.bands.find((b) => b.id === id);
      if (band) {
        const majority = new Set(RING_METRICS.map(({ key }) => band.metrics[key].top));
        g.selectAll(".member-dot").each(function (_, i) {
          const member = band.members[i];
          const off = RING_METRICS.some(({ key }) => member[key] !== band.metrics[key].top && member[key] !== "undocumented");
          d3.select(this).classed("is-off-formula", off && majority.size > 0);
        });
      }
    } else {
      g.selectAll(".member-dot").classed("is-off-formula", false);
    }
  });

  document.querySelectorAll(".rank-row").forEach((row) => {
    row.classList.toggle("is-selected", row.dataset.id === state.selected);
    row.classList.toggle("dim", state.spotlight && !top10.has(row.dataset.id));
  });

  if (state.selected) {
    requestAnimationFrame(() => positionPopover(state.selected));
  } else {
    $("#connector").classList.remove("is-on");
  }
}

/* ---------- popover placement ---------- */

function positionPopover(id) {
  const stage = $("#stage");
  const detail = $("#detail");
  const band = state.bands.find((b) => b.id === id);
  if (!band || detail.hidden || !stage.clientWidth) return;

  const index = state.visible.findIndex((b) => b.id === id);
  if (index < 0) return;
  const slot = (Math.PI * 2) / state.visible.length;
  const mid = -Math.PI / 2 + (index + 0.5) * slot;
  const scale = stage.clientWidth / 960;
  const depth = 304 + Math.max(12, band.members.length * 5.2);
  const ax = (CX + Math.cos(mid) * (depth + 5)) * scale;
  const ay = (CY + Math.sin(mid) * (depth + 5)) * scale;

  const w = detail.offsetWidth;
  const h = detail.offsetHeight;
  const gap = 28;
  const pad = 10;
  let left = Math.cos(mid) >= 0 ? ax - w - gap : ax + gap;
  let top = ay - h / 2;
  left = Math.max(pad, Math.min(left, stage.clientWidth - w - pad));
  top = Math.max(pad, Math.min(top, stage.clientHeight - h - pad));

  detail.style.left = `${left}px`;
  detail.style.top = `${top}px`;
  detail.style.transformOrigin = Math.cos(mid) >= 0 ? "right center" : "left center";

  if (window.innerWidth <= 680) return;

  const line = $("#connector-line");
  const dot = $("#connector-dot");
  const endX = Math.cos(mid) >= 0 ? left + w : left;
  const endY = top + Math.max(26, Math.min(ay - top, h - 26));
  line.setAttribute("x1", ax);
  line.setAttribute("y1", ay);
  line.setAttribute("x2", endX);
  line.setAttribute("y2", endY);
  dot.setAttribute("cx", ax);
  dot.setAttribute("cy", ay);
  $("#connector").classList.add("is-on");
}

/* ---------- tooltip ---------- */

function showTooltip(event, band) {
  if (band.id === state.selected) { hideTooltip(); return; }
  const tt = $("#tooltip");
  const low = band.members.length <= 4;
  tt.innerHTML = `<strong>${band.band}</strong>${band.members.length} members${low ? " · <span class=\"tt-low\">low confidence</span>" : ""}<br><span class="tt-score">${band.score}/100 formula</span><br>click to inspect`;
  tt.classList.add("is-on");
  moveTooltip(event);
}

function moveTooltip(event) {
  const stage = $("#stage").getBoundingClientRect();
  const tt = $("#tooltip");
  const x = Math.min(event.clientX - stage.left, stage.width - 250);
  const y = Math.min(event.clientY - stage.top, stage.height - 100);
  tt.style.left = `${Math.max(0, x)}px`;
  tt.style.top = `${Math.max(0, y)}px`;
}

function hideTooltip() { $("#tooltip").classList.remove("is-on"); }

/* ---------- hub / subtitles ---------- */

function updateHub() {
  const hub = $("#hub");
  const avg = state.visible.length ? Math.round(mean(state.visible.map((b) => b.score))) : 0;
  if (!state.selected) {
    hub.classList.remove("is-selected");
    $("#hub-kicker").textContent = "THE DIAL";
    $("#hub-value").textContent = avg;
    $(".hub-label").textContent = "average formula strength";
    $("#hub-meta").textContent = `${state.visible.length} bands · ${state.visible.reduce((s, b) => s + b.members.length, 0)} members`;
    $(".hub-hint").innerHTML = "Hover to read a band.<br>Click to inspect its members.";
    return;
  }
  const band = state.bands.find((b) => b.id === state.selected);
  if (!band) return;
  hub.classList.add("is-selected");
  $("#hub-kicker").textContent = `${band.era.toUpperCase()} · ${band.members.length} MEMBERS`;
  $("#hub-value").textContent = band.score;
  $(".hub-label").textContent = "formula strength";
  $("#hub-meta").textContent = `${band.members.length <= 4 ? "LOW CONFIDENCE · " : ""}n=${band.members.length} · card open`;
  $(".hub-hint").innerHTML = "";
}

function updateSubtitle() {
  const total = state.visible.length;
  $("#chart-subtitle").innerHTML = `${total} band${total === 1 ? "" : "s"} · 0 = every look different · 100 = one repeated look · <span class="inline-conf">○</span> = low confidence`;
  const filters = [];
  if (state.era !== "all") filters.push(state.era);
  if (state.lowOnly) filters.push("low confidence only");
  $("#filter-status").textContent = filters.length
    ? `Filtered to ${filters.join(" + ")} · ${total} band${total === 1 ? "" : "s"}.`
    : `Showing all ${total} bands.`;
}

/* ---------- ranking ---------- */

function renderRanking() {
  const container = $("#ranking");
  container.hidden = false;
  container.innerHTML = "";

  const ranked = [...state.visible].sort((a, b) => b.score - a.score || a.band.localeCompare(b.band));
  ranked.forEach((band, index) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "rank-row";
    row.dataset.id = band.id;
    const low = band.members.length <= 4;
    row.innerHTML = `
      <span class="rank-no">${String(index + 1).padStart(2, "0")}</span>
      <span class="rank-body">
      <span class="rank-name">
        ${band.band}
        <span class="rank-n">
          n=${band.members.length} · ${band.coverage}% documented
        </span>
      </span>
        <span class="rank-bar"><i style="width:${band.score}%"></i></span>
      </span>
      <span class="confidence-dot ${low ? "is-low" : "is-solid"}" title="${low ? "Low confidence" : "Solid evidence"}" aria-label="${low ? "Low confidence" : "Solid evidence"}"></span>
      <span class="rank-val">${band.score}</span>`;
    row.addEventListener("pointerenter", () => setHovered(band.id));
    row.addEventListener("pointerleave", () => setHovered(null));
    row.addEventListener("click", () => selectBand(band.id));
    container.appendChild(row);
  });

  applyEmphasis();
}

/* ---------- detail ledger ---------- */

function selectBand(id) {
  const band = state.bands.find((b) => b.id === id);
  if (!band) return;
  hideTooltip();
  state.selected = id;
  $("#detail").hidden = false;
  $("#rail-sub").textContent = `Selected: ${band.band}. Click a row to switch.`;
  renderDetail(band);
  $("#close-detail").focus({ preventScroll: true });
  updateHub();
  applyEmphasis();
  renderRanking();
  requestAnimationFrame(() => positionPopover(id));
  if (window.innerWidth <= 1100) {
    $("#stage").scrollIntoView({ block: "center", behavior: "smooth" });
  }
}

function closeDetail() {
  const previous = state.selected;
  state.selected = null;
  state.hovered = null;
  $("#detail").hidden = true;
  $("#connector").classList.remove("is-on");
  $("#rail-sub").textContent = "Ranked by formula strength. Click any row to open a band.";
  hideTooltip();
  updateHub();
  renderRanking();
  applyEmphasis();
  if (previous) {
    const target = document.querySelector(`.band[data-id="${previous}"]`);
    if (target) target.focus({ preventScroll: true });
  }
}

function memberOffTraits(band, member) {
  return RING_METRICS
    .filter(({ key }) => member[key] !== "undocumented" && member[key] !== band.metrics[key].top)
    .map(({ key, label }) => ({ label, value: member[key] }));
}

function renderDetail(band) {
  $("#detail-name").textContent = band.band;
  $("#detail-era").textContent = `${band.era === "Undated" ? "Undated" : `Born ${band.era}`} · ${band.members.length} members`;
  $("#detail-score").textContent = band.score;
  $("#detail-count").textContent = `${band.members.length} people`;
  const low = band.members.length <= 4;
  $("#detail-conf").className = `detail-conf${low ? " is-low" : ""}`;
  $("#detail-conf").innerHTML = `<i class="confidence-dot ${low ? "is-low" : "is-solid"}"></i>${low ? "Low confidence" : "Solid evidence"} · n=${band.members.length}`;
  $("#detail-summary").textContent =
  `${bandSummary(band)} ` +
  `Data completeness: ${band.coverage}%. ` +
  `The formula score only uses documented values. ` +
  `Missing values are excluded from the agreement calculation.`;

  $("#detail-rings").innerHTML = RING_METRICS.map(({ key, label, color }) => {
    const m = band.metrics[key];
    return `<div class="detail-ring"><span>${label}<em>${m.count}/${m.n}</em></span><i><b style="width:${m.ratio * 100}%;background:${color}"></b></i></div>`;
  }).join("");

  const sorted = [...band.members].sort((a, b) => memberOffTraits(band, b).length - memberOffTraits(band, a).length);
  $("#member-list").innerHTML = sorted.map((member) => {
    const color = (HAIR_COLORS.find(([label]) => label === member.hairColor) || HAIR_COLORS[5])[1];
    const off = memberOffTraits(band, member);
    const traits = [
      member.hairLength !== "undocumented" ? member.hairLength : null,
      member.shirt !== "undocumented" ? member.shirt : null,
      member.bottom !== "undocumented" ? member.bottom : null
    ].filter(Boolean);
    return `<li>
      <span class="member-dot${member.height ? "" : " is-missing"}" style="background:${color}"></span>
      <span>
        <span class="member-name">${member.name}</span>
        <span class="member-traits">${traits.map((t) => `<span>${t}</span>`).join("")}${off.map(({ label }) => `<span class="is-off">${label}</span>`).join("")}</span>
      </span>
      <span class="member-meta">${member.year || "—"}<br>${member.height ? `${member.height}″` : "no height"}</span>
    </li>`;
  }).join("");
}

/* ---------- control wiring ---------- */

function setOrder(order) {
  state.order = order;
  document.querySelectorAll("[data-order]").forEach((button) => {
    const active = button.dataset.order === order;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  render();
}

function setEra(era) {
  state.era = era;
  document.querySelectorAll(".chip[data-era]").forEach((chip) => {
    chip.classList.toggle("is-active", chip.dataset.era === era);
  });
  if (state.selected) {
    const band = state.bands.find((b) => b.id === state.selected);
    if (band && era !== "all" && band.era !== era) closeDetail();
  }
  render();
}

function setLowOnly(enabled) {
  state.lowOnly = enabled;
  $("#low-confidence").setAttribute("aria-pressed", String(enabled));
  $("#low-confidence").classList.toggle("is-active", enabled);
  if (state.selected) {
    const band = state.bands.find((b) => b.id === state.selected);
    if (band && enabled && band.members.length > 4) closeDetail();
  }
  render();
}

function resetView() {
  state.spotlight = false;
  $("#spotlight").setAttribute("aria-pressed", "false");
  state.lowOnly = false;
  $("#low-confidence").setAttribute("aria-pressed", "false");
  $("#low-confidence").classList.remove("is-active");
  setEra("all");
  setOrder("chrono");
  closeDetail();
}

function wireControls() {
  document.querySelectorAll("[data-order]").forEach((button) => {
    button.addEventListener("click", () => setOrder(button.dataset.order));
  });

  $("#era-chips").addEventListener("click", (event) => {
    const chip = event.target.closest(".chip");
    if (chip) setEra(chip.dataset.era);
  });

  $("#low-confidence").addEventListener("click", () => setLowOnly(!state.lowOnly));

  $("#spotlight").addEventListener("click", () => {
    state.spotlight = !state.spotlight;
    $("#spotlight").setAttribute("aria-pressed", String(state.spotlight));
    applyEmphasis();
    if (state.spotlight) {
      $("#rail-sub").textContent = "The ten strongest formulas are spotlighted.";
    } else {
      $("#rail-sub").textContent = "Ranked by formula strength. Click any row to open a band.";
    }
  });

  $("#reset").addEventListener("click", resetView);
  $("#close-detail").addEventListener("click", closeDetail);
  if ("ResizeObserver" in window) {
    new ResizeObserver(() => {
      if (state.selected) positionPopover(state.selected);
    }).observe($("#detail"));
  }
  window.addEventListener("resize", () => {
    if (state.selected) positionPopover(state.selected);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.selected) closeDetail();
  });
}

/* ---------- boot ---------- */

async function init() {
  await loadData();
  buildLegends();
  wireControls();
  render();
}

init().catch((error) => {
  console.error(error);
  $("#chart-subtitle").textContent = "Data could not be loaded. Check that boys-data.js is next to index.html.";
});