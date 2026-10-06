/* ================================================================
   SMART FILTER ENGINE v5
   
   5 filters: Source Market | Age | Income | Segment | Traveler Type
   Marital Status, Children, Trip Companion → shown as charts
   ================================================================ */

/* ── Region → Market mapping ─────────────────────────────────── */
const REGION_MARKET_MAP = {
  "Europe":        ["France","Germany","Ireland","Italy","Netherlands",
                    "Russian Federation","Spain","Switzerland","United Kingdom"],
  "ME":            ["Bahrain","Jordan","Qatar","Saudi Arabia","Turkey",
                    "United Arab Emirates"],
  "Asia":          ["China","India","Indonesia","Japan",
                    "Korea, Republic of (South Korea)","Malaysia",
                    "Singapore","Thailand"],
  "Africa":        ["Egypt","Kenya","Nigeria","South Africa"],
  "North America": ["Canada","United States of America"],
  "Oceania":       ["Australia"],
  "LATAM":         ["Brazil"]
};

/* ── Marital statuses that mean "no partner" → hide Children ─── */
const NO_PARTNER = new Set([
  "Single, never married",
  "Divorced",
  "Separated",
  "Widowed"
]);

/* ── Income classification: computed once on DATA load ──────── */
let INCOME_MAP = {};   // record index → "Low" | "Medium" | "High"

/* WeakMap: record object → array index, for O(1) income lookup */
let RECORD_INDEX_MAP = null;

function buildIncomeMap(records) {
  /* Build index map first */
  RECORD_INDEX_MAP = new Map();
  records.forEach((r, i) => RECORD_INDEX_MAP.set(r, i));

  function extractNum(s) {
    s = String(s || "");
    const nums = (s.match(/[\d]+/g) || [])
      .map(Number).filter(n => n < 1e9);
    if (!nums.length) return null;
    if (/or more|above/i.test(s)) return Math.max(...nums) * 1.5;
    if (/less than/i.test(s))     return Math.min(...nums) * 0.5;
    return nums.reduce((a,b)=>a+b,0) / nums.length;
  }

  /* Group by market, sort by numeric value, assign tercile */
  const byMarket = {};
  records.forEach((r, idx) => {
    const v = extractNum(r.Income);
    if (v == null) return;
    (byMarket[r.Market] = byMarket[r.Market] || []).push({ v, idx });
  });

  Object.values(byMarket).forEach(arr => {
    arr.sort((a,b) => a.v - b.v);
    const nb = arr.length;
    arr.forEach(({ idx }, i) => {
      const p = i / nb;
      INCOME_MAP[idx] = p < 0.33 ? "Low" : p < 0.67 ? "Medium" : "High";
    });
  });
}

/* ── Cascade: should Children be visible? ─────────────────────── */
function shouldShowChildren() {
  const sel = filterSelections["Marital Status"] || [];
  /* No selection → show (we don't know marital status → safe to show) */
  if (!sel.length) return true;
  /* Show only if at least one selected status implies a partner */
  return sel.some(s => !NO_PARTNER.has(s));
}

/* ── Source Market options ───────────────────────────────────── */
function marketOptions() {
  if (!DATA) return [];
  return DATA.filterOptions.Market || [];
}

/* ── Class label by current tab ──────────────────────────────── */
function classLabel() {
  if (typeof currentTab === "undefined") return "Class";
  if (currentTab === "airline") return "Cabin class";
  if (currentTab === "hotel")   return "Hotel class";
  return "Class";
}

/* ── Class options (same values, tab doesn't change options) ─── */
function classOptions() {
  if (!DATA) return [];
  const field = (typeof currentTab !== "undefined" && currentTab === "hotel")
    ? "accommodation" : "cabinClass";
  return [...new Set(DATA.records.map(r => r[field]).filter(Boolean))].sort();
}

/* ── 5 filters as requested ─────────────────────────────────── */
const SMART_FILTER_CONFIG = [
  {
    value:   "RegionMarket",
    label:   "Region / Country",
    options: () => [],
    default: []
  },
  {
    value:   "Age Group",
    label:   "Age",
    options: () => ["18-24","25-34","35-44","45-54","55-65","65+"],
    default: []
  },
  {
    value:   "Income",
    label:   "Income",
    options: () => ["Low","Medium","High"],
    default: []
  },
  {
    value:   "Class",
    get label() { return classLabel(); },
    options: classOptions,
    default: []
  },
  {
    value:   "Trip Type",
    label:   "Traveler Type",
    options: () => ["LEISURE","BUSINESS","BLEISURE"],
    labels:  { LEISURE:"Leisure", BUSINESS:"Business", BLEISURE:"Bleisure" },
    default: []
  },
];
/* Marital Status, Children, Trip Companion are now charts, not filters */

/* ── No cascades needed with 5-filter config ─────────────────── */
function enforceCascades() { /* no-op: Region and Marital removed */ }

function regionMarketGroups() {
  const validMarkets = new Set(marketOptions());
  const source = {};

  if (DATA && Array.isArray(DATA.records)) {
    DATA.records.forEach(r => {
      const region = String(r.Region || "").trim();
      const market = String(r.Market || "").trim();
      if (!region || !market || !validMarkets.has(market)) return;
      (source[region] = source[region] || new Set()).add(market);
    });
  }

  Object.entries(REGION_MARKET_MAP).forEach(([region, markets]) => {
    markets.forEach(market => {
      if (!validMarkets.has(market)) return;
      (source[region] = source[region] || new Set()).add(market);
    });
  });

  return Object.entries(source)
    .map(([region, markets]) => ({
      region,
      markets: [...markets].sort((a, b) => a.localeCompare(b))
    }))
    .filter(group => group.markets.length)
    .sort((a, b) => a.region.localeCompare(b.region));
}

function regionMarketSelectionLabel() {
  const selected = filterSelections.Market || [];
  if (!selected.length) return "All regions & countries";

  const selectedSet = new Set(selected);
  const fullRegions = regionMarketGroups()
    .filter(group => group.markets.every(m => selectedSet.has(m)))
    .map(group => group.region);

  if (fullRegions.length && fullRegions.reduce((n, r) => {
    const group = regionMarketGroups().find(g => g.region === r);
    return n + (group ? group.markets.length : 0);
  }, 0) === selected.length) {
    return fullRegions.length === 1 ? fullRegions[0] : `${fullRegions.length} regions selected`;
  }

  if (selected.length === 1) return selected[0];
  if (selected.length === 2) return selected.join(", ");
  return `${selected.length} countries selected`;
}

function applyRegionMarketSelection(markets) {
  const update = () => {
    const valid = new Set(marketOptions());
    filterSelections.Market = [...new Set(markets)].filter(m => valid.has(m));
    filterSelections.Region = [];
    filterSelections.RegionMarket = [];

    if (typeof invalidateRowCache === "function") invalidateRowCache();
    if (typeof invalidateMapCache === "function") invalidateMapCache();
    if (typeof filterDim !== "undefined") filterDim = "Market";
    if (typeof activeSelections !== "undefined") activeSelections = [...filterSelections.Market];
    if (typeof segment !== "undefined") {
      segment = typeof selectionLabel === "function" ? selectionLabel(activeSelections) : regionMarketSelectionLabel();
    }

    buildFilterControlsCascade();
    updateFilterSummaries();
    if (typeof updateSegmentBase === "function") updateSegmentBase();
    if (typeof renderActive === "function") renderActive();
  };
  if (typeof window.runDashboardUpdate === "function") {
    window.runDashboardUpdate(update, "Updating selected markets...");
  } else {
    update();
  }
}

function setRegionMarketSelection(markets) {
  applyRegionMarketSelection(markets || []);
}
window.setRegionMarketSelection = setRegionMarketSelection;

function renderRegionMarketMenu() {
  const menu = d3.select(`.multi-menu[data-menu="RegionMarket"]`);
  if (menu.empty()) return;

  const groups = regionMarketGroups();
  const selected = new Set(filterSelections.Market || []);
  const allMarkets = groups.flatMap(group => group.markets);

  menu.html("");
  menu.classed("region-market-menu", true);

  const actions = menu.append("div").attr("class", "region-market-actions");
  actions.append("button")
    .attr("type", "button")
    .attr("data-rm-action", "all")
    .text("Select all");
  actions.append("button")
    .attr("type", "button")
    .attr("data-rm-action", "clear")
    .text("Clear");

  const search = menu.append("input")
    .attr("class", "multi-search region-market-search")
    .attr("type", "search")
    .attr("placeholder", "Search region or country...")
    .attr("aria-label", "Search region or country");

  const list = menu.append("div").attr("class", "region-market-list");

  groups.forEach(group => {
    const groupSelected = group.markets.filter(m => selected.has(m)).length;
    const allChecked = groupSelected === group.markets.length;
    const someChecked = groupSelected > 0 && !allChecked;

    const wrap = list.append("div")
      .attr("class", "region-market-group")
      .attr("data-region", group.region.toLowerCase());

    const row = wrap.append("label")
      .attr("class", "region-market-row region-row");
    const regionInput = row.append("input")
      .attr("type", "checkbox")
      .attr("data-region", group.region)
      .property("checked", allChecked);
    if (regionInput.node()) regionInput.node().indeterminate = someChecked;
    row.append("span").attr("class", "region-name").text(group.region);
    row.append("em").text(`${groupSelected || group.markets.length} countries`);

    const countries = wrap.append("div").attr("class", "region-country-list");
    group.markets.forEach(market => {
      const countryRow = countries.append("label")
        .attr("class", "region-market-row country-row")
        .attr("data-country", market.toLowerCase());
      countryRow.append("input")
        .attr("type", "checkbox")
        .attr("data-market", market)
        .property("checked", selected.has(market));
      countryRow.append("span").text(market);
    });
  });

  actions.selectAll("button").on("click", function(e) {
    e.stopPropagation();
    const action = this.getAttribute("data-rm-action");
    applyRegionMarketSelection(action === "all" ? allMarkets : []);
  });

  search.on("input", function(e) {
    e.stopPropagation();
    const q = this.value.trim().toLowerCase();
    menu.selectAll(".region-market-group").style("display", function() {
      const node = d3.select(this);
      const region = node.attr("data-region") || "";
      const countries = node.selectAll(".country-row").nodes();
      let anyCountry = false;
      countries.forEach(label => {
        const hit = !q || (label.getAttribute("data-country") || "").includes(q);
        label.style.display = hit ? "flex" : "none";
        if (hit) anyCountry = true;
      });
      return !q || region.includes(q) || anyCountry ? "block" : "none";
    });
  });

  menu.selectAll("input[type='checkbox']").on("change", function(e) {
    e.stopPropagation();
    const next = new Set(filterSelections.Market || []);
    const region = this.getAttribute("data-region");
    const market = this.getAttribute("data-market");

    if (region) {
      const group = groups.find(g => g.region === region);
      if (group) group.markets.forEach(m => this.checked ? next.add(m) : next.delete(m));
    }
    if (market) {
      this.checked ? next.add(market) : next.delete(market);
    }

    applyRegionMarketSelection([...next]);
  });
}

/* ── Row matching (used by passesRecord) ──────────────────────── */
function smartMatch(r, dim, vals, recIdx) {
  if (!vals || !vals.length) return true;
  switch (dim) {
    case "Market":        return vals.includes(r.Market);
    case "RegionMarket":  return true;
    case "Region":        return vals.includes(r.Region);
    case "Trip Type":     return vals.includes(r["Trip Type"]);
    case "Age Group": {
      const exp = vals.flatMap(v => v === "25\u201344" ? ["25-34","35-44"] : [v]);
      return exp.includes(r["Age Group"]);
    }
    case "Gender":        return vals.includes(r.Gender);
    case "Income": {
      /* If map not built yet, don't filter (safer than excluding everyone) */
      if (Object.keys(INCOME_MAP).length === 0) return true;
      const group = INCOME_MAP[recIdx];
      return group ? vals.includes(group) : true;
    }
    case "Children":      return vals.includes(r.Children);
    case "Marital Status":return vals.includes(r["Marital Status"]);
    case "Companion": {
      const v = r.travelCompanions;
      return Array.isArray(v) ? v.some(x => vals.includes(x)) : vals.includes(v);
    }
    case "Class": {
      const field = (typeof currentTab !== "undefined" && currentTab === "hotel")
        ? "accommodation" : "cabinClass";
      return vals.includes(r[field]);
    }
    default: return vals.includes(r[dim]);
  }
}

/* ── Override passesRecord from app-final.js ─────────────────── */
function passesRecord(r, skipDim) {
  if (typeof ignoreDashboardFilters !== "undefined" && ignoreDashboardFilters) return true;
  /* Use pre-built index map instead of O(n) indexOf */
  const idx = (typeof RECORD_INDEX_MAP !== "undefined" && RECORD_INDEX_MAP)
    ? RECORD_INDEX_MAP.get(r)
    : ((DATA && DATA.records) ? DATA.records.indexOf(r) : -1);
  for (const [dim, vals] of Object.entries(filterSelections)) {
    if (dim === skipDim || !vals || !vals.length) continue;
    if (!smartMatch(r, dim, vals, idx)) return false;
  }
  if (typeof chartFilters !== "undefined") {
    for (const [key, label] of Object.entries(chartFilters)) {
      if (typeof questionMatches === "function" && !questionMatches(r, key, label)) return false;
    }
  }
  return true;
}

/* ================================================================
   BUILD FILTER BAR
   5-column grid, 2 rows. Children cell is invisible (opacity 0,
   pointer-events none) when cascade hides it — keeps layout stable.
   ================================================================ */
function buildFilterControlsCascade() {
  const grid = d3.select("#filterGrid");
  grid.selectAll("*").remove();
  const regionSlot = d3.select("#segmentsRegionFilter");
  if (!regionSlot.empty()) regionSlot.selectAll("*").remove();

  SMART_FILTER_CONFIG.forEach(cfg => {
    const isHidden = cfg.hidden ? cfg.hidden() : false;
    const opts     = cfg.options();

    /* Always clean stale selections */
    if (cfg.value !== "RegionMarket") {
      filterSelections[cfg.value] = (filterSelections[cfg.value] || [])
        .filter(v => opts.includes(v));
    } else {
      filterSelections.RegionMarket = [];
      filterSelections.Market = (filterSelections.Market || [])
        .filter(v => marketOptions().includes(v));
    }

    const isCascaded = false;

    const host = cfg.value === "RegionMarket" && currentTab === "segments" && !regionSlot.empty()
      ? regionSlot
      : grid;
    const root = host.append("div")
      .attr("class", `filter-control${cfg.value === "RegionMarket" ? " filter-control--region-market" : ""}`)
      .style("visibility", isHidden ? "hidden" : null)
      .style("pointer-events", isHidden ? "none" : null);

    /* Label row */
    const labelSpan = root.append("span").attr("class", "filter-label");
    labelSpan.text(cfg.label);
    if (isCascaded) {
      labelSpan.append("span")
        .style("color","var(--orange)")
        .style("margin-left","3px")
        .style("font-size","7px")
        .text("↳");
    }

    /* Dropdown button */
    root.append("button")
      .attr("type","button")
      .attr("class","multi-select")
      .attr("aria-haspopup","listbox")
      .attr("aria-expanded","false")
      .attr("data-filter", cfg.value)
      .text(cfg.value === "RegionMarket"
        ? regionMarketSelectionLabel()
        : fmtSelection(filterSelections[cfg.value], cfg));

    /* Menu container */
    root.append("div")
      .attr("class","multi-menu")
      .attr("data-menu", cfg.value)
      .attr("role","listbox")
      .attr("aria-multiselectable","true");

    root.append("div").attr("class","filter-selection-count");
    renderSmartMenu(cfg.value);
  });

  /* Open/close handlers */
  d3.selectAll(".multi-select").on("click", function(e) {
    e.stopPropagation();
    const menu = d3.select(this.parentNode).select(".multi-menu");
    const open = !menu.classed("open");
    d3.selectAll(".multi-menu").classed("open", false);
    d3.selectAll(".multi-select").classed("open", false).attr("aria-expanded","false");
    menu.classed("open", open);
    d3.select(this).classed("open", open).attr("aria-expanded", String(open));
  });
  d3.selectAll(".multi-menu").on("click", e => e.stopPropagation());
  updateFilterSummaries();
}

function fmtSelection(vals, cfg) {
  if (cfg && cfg.value === "RegionMarket") return regionMarketSelectionLabel();
  if (!vals || !vals.length) return "All";
  const lbl = v => (cfg.labels && cfg.labels[v]) ? cfg.labels[v] : v;
  if (vals.length === 1) return lbl(vals[0]);
  if (vals.length === 2) return vals.map(lbl).join(", ");
  return `${vals.length} selected`;
}

function renderSmartMenu(dim) {
  if (dim === "RegionMarket") {
    renderRegionMarketMenu();
    return;
  }
  const cfg = SMART_FILTER_CONFIG.find(f => f.value === dim);
  if (!cfg) return;
  const opts     = cfg.options();
  const selected = filterSelections[dim] || [];
  const menu     = d3.select(`.multi-menu[data-menu="${CSS.escape(dim)}"]`);
  if (menu.empty()) return;

  const search = menu.selectAll("input.multi-search").data([dim]).join("input")
    .attr("class", "multi-search")
    .attr("type", "search")
    .attr("placeholder", "Type to find an option...")
    .attr("aria-label", `Search ${cfg.label || dim}`)
    .property("value", "");
  search.on("input", function(e) {
    e.stopPropagation();
    const query = this.value.trim().toLowerCase();
    menu.selectAll("label.multi-option").style("display", function() {
      return !query || d3.select(this).select("span").text().toLowerCase().includes(query) ? "flex" : "none";
    });
  });

  menu.selectAll("label")
    .data(["__ALL__", ...opts])
    .join("label")
    .attr("class", d => `multi-option${d === "__ALL__" ? " all" : ""}`)
    .html("")
    .each(function(d) {
      const text    = d === "__ALL__" ? "All"
        : ((cfg.labels && cfg.labels[d]) ? cfg.labels[d] : d);
      const checked = d === "__ALL__" ? !selected.length : selected.includes(d);
      d3.select(this).append("input")
        .attr("type","checkbox").property("checked", checked)
        .attr("value", d).attr("aria-label", text);
      d3.select(this).append("span").text(text);
    });
  menu.node().insertBefore(search.node(), menu.node().firstChild);

  menu.selectAll("input[type='checkbox']").on("change", function(e) {
    e.stopPropagation();
    const checked = this.checked;
    const val = this.value;
    const update = () => {
      if (val === "__ALL__") {
        filterSelections[dim] = [];
      } else {
        let next = [...(filterSelections[dim] || [])];
        checked ? (!next.includes(val) && next.push(val))
                : (next = next.filter(v => v !== val));
        filterSelections[dim] = next;
      }
      invalidateRowCache();
      enforceCascades();
      if (typeof filterDim     !== "undefined") filterDim     = dim;
      if (typeof activeSelections !== "undefined") activeSelections = [...(filterSelections[dim] || [])];
      if (typeof segment       !== "undefined") segment = typeof selectionLabel === "function"
        ? selectionLabel(activeSelections) : "All";

      buildFilterControlsCascade();
      updateFilterSummaries();
      if (typeof updateSegmentBase === "function") updateSegmentBase();
      if (typeof renderActive      === "function") renderActive();
    };
    if (typeof window.runDashboardUpdate === "function") {
      window.runDashboardUpdate(update, "Updating filters...");
    } else {
      update();
    }
  });
}

/* ── Safe updateFilterSummaries (no D3 datum dependency) ──────── */
function updateFilterSummaries() {
  d3.selectAll(".multi-select").each(function() {
    const dim = d3.select(this).attr("data-filter");
    if (!dim) return;
    const cfg  = SMART_FILTER_CONFIG.find(f => f.value === dim);
    const vals = dim === "RegionMarket" ? (filterSelections.Market || []) : (filterSelections[dim] || []);
    d3.select(this).text(dim === "RegionMarket" ? regionMarketSelectionLabel() : fmtSelection(vals, cfg || {}));
  });
  d3.selectAll(".filter-control").each(function() {
    const btn = d3.select(this).select(".multi-select");
    const dim = btn.attr("data-filter");
    if (!dim) return;
    const vals = dim === "RegionMarket" ? (filterSelections.Market || []) : (filterSelections[dim] || []);
    d3.select(this).select(".filter-selection-count")
      .text(vals.length > 1 ? `${vals.length} countries selected` : "");
  });
}

/* ── CSS: 5-column grid, stable Children placeholder ─────────── */
(function injectStyles() {
  const s = document.createElement("style");
  s.textContent = `
    /* Smart filter bar — 5+5 grid exactly matching screenshot */
    #filterGrid {
      display: grid !important;
      grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
      gap: 4px 7px !important;
      flex: 1 1 auto !important;
      min-width: 0 !important;
      align-items: end;
    }
    .filter-control {
      position: relative;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    .filter-label {
      display: block;
      font-size: 7.5px;
      color: #8a7e98;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .05em;
      margin-bottom: 3px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .multi-select {
      width: 100% !important;
      min-height: 28px;
      font-size: 9.5px;
      padding: 0 8px;
      border-radius: 4px;
      border: 1px solid #d4cce8;
      background: #f7f4fc;
      color: #452080;
      cursor: pointer;
      text-align: left;
    }
    .multi-select:hover { border-color: #9b8dc1; }
    .multi-select.open  { border-color: #452080; background: #fff; }
    .filter-selection-count { font-size: 7px; color: #9b8dc1; margin-top: 2px; min-height: 9px; }
    .filter-control:has(.multi-menu.open) { z-index: 60; }
    .filter-control--region-market .multi-menu {
      width: min(390px, calc(100vw - 32px));
      max-height: 430px;
      overflow: auto;
      padding: 8px;
    }
    .region-market-actions {
      display: flex;
      gap: 6px;
      margin-bottom: 7px;
    }
    .region-market-actions button {
      border: 1px solid #d4cce8;
      background: #fff;
      color: #452080;
      border-radius: 4px;
      padding: 5px 9px;
      font-size: 9px;
      font-weight: 700;
      cursor: pointer;
    }
    .region-market-actions button:hover {
      border-color: #452080;
      background: #f7f4fc;
    }
    .region-market-search { margin-bottom: 8px; }
    .region-market-group {
      border-top: 1px solid #eee8f7;
      padding: 6px 0;
    }
    .region-market-group:first-child { border-top: 0; }
    .region-market-row {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 5px 4px;
      border-radius: 4px;
      cursor: pointer;
      color: #32105f;
      font-size: 10px;
    }
    .region-market-row:hover { background: #f7f4fc; }
    .region-market-row input { accent-color: #530095; }
    .region-row {
      font-weight: 800;
      justify-content: flex-start;
    }
    .region-row em {
      margin-left: auto;
      font-size: 8px;
      font-style: normal;
      color: #8a7e98;
      font-weight: 700;
    }
    .region-country-list {
      padding-left: 18px;
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 1px;
    }
    .country-row span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    @media (max-width: 650px) {
      #filterGrid {
        grid-template-columns: minmax(0, 1fr) !important;
        width: 100%;
        flex-basis: 100%;
      }
      .multi-menu { max-width: calc(100vw - 24px); }
    }
  `;
  document.head && document.head.appendChild(s);
})();

/* ================================================================
   RE-INIT — runs after app-final.js, takes over filter system
   ================================================================ */
(function smartInit() {
  FILTER_CONFIG = SMART_FILTER_CONFIG;

  function boot() {
    /* Build income map once */
    if (DATA && DATA.records) buildIncomeMap(DATA.records);

    /* Ensure every new filter key has an entry */
    SMART_FILTER_CONFIG.forEach(cfg => {
      if (!filterSelections[cfg.value]) filterSelections[cfg.value] = [];
    });

    buildFilterControlsCascade();
    if (typeof updateSegmentBase === "function") updateSegmentBase();
    if (typeof renderActive      === "function") renderActive();
  }

  if (typeof DATA !== "undefined" && DATA) {
    boot();
  } else {
    /* DATA not yet loaded — patch window.init */
    const _orig = typeof init !== "undefined" ? init : null;
    if (_orig) {
      window.init = function() {
        _orig();
        FILTER_CONFIG = SMART_FILTER_CONFIG;
        boot();
      };
    }
  }
})();
