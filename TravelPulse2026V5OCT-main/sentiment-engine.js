/* ================================================================

   SENTIMENT ENGINE v3  —  Source Overview  (sentiment-engine.js)



   Score formula: ((Positive − Negative) / Total) × 100  → [-100, +100]

   Display:  score shown as integer, e.g. 53 not 53.0%

   ================================================================ */



/* ── State ─────────────────────────────────────────────────────── */

let _sentCache   = {};

let _sentData    = null;

let _sentMarket  = null;

let _sentCountry = null;



/* ── Source-market name normalisation ──────────────────────────── */

const _SRC_ALIAS = {

  'United Kingdom':'United Kingdom',

  'United States of America':'United States of America',

  'United Arab Emirates':'United Arab Emirates',

  'Korea, Republic of (South Korea)':'Korea, Republic of (South Korea)',

  'Russian Federation':'Russian Federation',

};

const _GEO_TO_SOURCE_MARKET = {

  'South Korea':'Korea, Republic of (South Korea)',

  'Russia':'Russian Federation',

};

function _sourceMarketFromGeo(geoName) {

  return _GEO_TO_SOURCE_MARKET[geoName] || geoName;

}

function _isSourceMarket(geoName) {

  const market = _sourceMarketFromGeo(geoName);

  const options = (typeof DATA !== 'undefined' && DATA?.filterOptions?.Market)

    ? DATA.filterOptions.Market

    : (typeof MARKETS !== 'undefined' ? MARKETS : []);

  return options.includes(market) ? market : null;

}

function _sentKey(market) {

  if (!market || market === 'All') return 'All';

  return _SRC_ALIAS[market] || market;

}

function _selectedSourceMarkets() {

  const selected = (typeof filterSelections !== 'undefined' && filterSelections.Market) ? filterSelections.Market : [];

  return Array.isArray(selected) ? selected.filter(Boolean) : [];

}

function _sourceMarketToGeo(market) {

  const aliases = {

    'Korea, Republic of (South Korea)': 'South Korea',

    'Russian Federation': 'Russia',

  };

  return aliases[market] || market;

}

function _mergeSentimentChunks(chunks, label) {

  const merged = { source: label || 'Selected source markets', by_dest: [], wave_totals: {} };

  const byDest = {};

  function addWave(target, waveName, vals) {

    target[waveName] = target[waveName] || { pos: 0, neu: 0, neg: 0, total: 0, score: null };

    target[waveName].pos += vals.pos || 0;

    target[waveName].neu += vals.neu || 0;

    target[waveName].neg += vals.neg || 0;

    target[waveName].total += vals.total || ((vals.pos || 0) + (vals.neu || 0) + (vals.neg || 0));

  }

  chunks.filter(Boolean).forEach(chunk => {

    (chunk.by_dest || []).forEach(entry => {

      const dest = entry.dest;

      if (!dest) return;

      byDest[dest] = byDest[dest] || { dest, pos: 0, neu: 0, neg: 0, total: 0, score: null, waves: {} };

      byDest[dest].pos += entry.pos || 0;

      byDest[dest].neu += entry.neu || 0;

      byDest[dest].neg += entry.neg || 0;

      byDest[dest].total += entry.total || ((entry.pos || 0) + (entry.neu || 0) + (entry.neg || 0));

      Object.entries(entry.waves || {}).forEach(([waveName, vals]) => addWave(byDest[dest].waves, waveName, vals));

    });

    Object.entries(chunk.wave_totals || {}).forEach(([waveName, vals]) => addWave(merged.wave_totals, waveName, vals));

  });

  merged.by_dest = Object.values(byDest).map(entry => {

    entry.score = calcScore(entry.pos, entry.neu, entry.neg);

    Object.values(entry.waves).forEach(w => { w.score = calcScore(w.pos, w.neu, w.neg); });

    return entry;

  });

  Object.values(merged.wave_totals).forEach(w => { w.score = calcScore(w.pos, w.neu, w.neg); });

  return merged;

}

function getSentimentDataForMarkets(markets) {

  const selected = Array.isArray(markets) ? markets.filter(Boolean) : [];

  if (!selected.length) return getSentimentData('All');

  if (selected.length === 1) return getSentimentData(selected[0]);

  const key = selected.map(_sentKey).sort().join('|');

  if (_sentMarket === key && _sentData) return Promise.resolve(_sentData);

  return Promise.all(selected.map(loadSentimentForMarket)).then(chunks => {

    _sentData = _mergeSentimentChunks(chunks, `${selected.length} selected source markets`);

    _sentMarket = key;

    return _sentData;

  });

}



/* ── Destination ↔ GeoJSON name ───────────────────────────────── */

const DEST_TO_GEO = {

  'UK':'United Kingdom','USA':'United States of America',

  'UAE':'United Arab Emirates','South Korea':'South Korea',

  'Russia':'Russia','Czech Republic':'Czechia',

};

const GEO_TO_DEST = {};

Object.entries(DEST_TO_GEO).forEach(([d,g])=>{ GEO_TO_DEST[g]=d; });

function destToGeo(d){ return DEST_TO_GEO[d]||d; }

function geoToDest(g){ return GEO_TO_DEST[g]||g; }



/* ════════════════════════════════════════════════════════════════

   SINGLE CENTRALISED FORMULA

   Score = ((Pos − Neg) / Total) × 100   range: -100 … +100

   ════════════════════════════════════════════════════════════════ */

function calcScore(pos, neu, neg) {

  const total = pos + neu + neg;

  if (!total) return null;

  return ((pos - neg) / total) * 100;

}



/* ── Map score → colour ─────────────────────────────────────────── */

/* Map score → continuous colour across the 5-zone palette.

   Uses the RAW score without normalisation — countries with even small

   differences in score get visually distinct colours.

   Colour stops match the gauge segments exactly:

     -100 = deep red  →  0 = yellow  →  +100 = deep green             */

function scoreToColour(score) {

  if (score === null || score === undefined || isNaN(score)) return '#d3d3d3';

  const s = Math.max(-100, Math.min(100, score));

  /* 5-stop scale matching gauge bands */

  const scale = d3.scaleLinear()

    .domain([-100, -50, -10, 20, 60, 100])

    .range(['#e4003a','#ff7900','#ffd400','#17b800','#008a00','#006f00'])

    .clamp(true);

  return scale(s);

}



/* Non-destination countries: medium grey (no data) */

const _NO_DATA_FILL = '#c8c8c8';



/* ════════════════════════════════════════════════════════════════

   DATA LOADING

   ════════════════════════════════════════════════════════════════ */

function loadSentimentForMarket(market) {

  const key = _sentKey(market);

  if (_sentCache[key]) return _sentCache[key];

  const manifest = (typeof _manifest !== 'undefined') ? _manifest : null;

  if (!manifest || !manifest.sentiment)

    return (_sentCache[key] = Promise.resolve(null));

  const url = manifest.sentiment[key];

  if (!url) return (_sentCache[key] = Promise.resolve(null));

  const fetcher = typeof fetchChunk==='function' ? fetchChunk(url)

                : fetch(url).then(r=>r.json());

  return (_sentCache[key] = fetcher.catch(()=>null));

}



function getSentimentData(market) {

  const key = _sentKey(market);

  if (_sentMarket===key && _sentData) return Promise.resolve(_sentData);

  return loadSentimentForMarket(market).then(chunk=>{

    _sentData=chunk; _sentMarket=key; return chunk;

  });

}



function _byGeoMap(data) {

  if (!data||!data.by_dest) return {};

  const m={};

  data.by_dest.forEach(d=>{ m[destToGeo(d.dest)]=d; });

  return m;

}



function _getWaves() {

  const manifest=(typeof _manifest!=='undefined')?_manifest:null;

  if (manifest&&manifest.waves) return manifest.waves;

  return {'Wave 1':'Wave 1','Wave 2':'Wave 2','Wave 3':'Wave 3','Wave 4':'Wave 4'};

}



/* ── Aggregate helpers ─────────────────────────────────────────── */

function _overallStats(data) {

  if (!data||!data.by_dest) return {pos:0,neu:0,neg:0,total:0,score:null};

  let pos=0,neu=0,neg=0;

  data.by_dest.forEach(d=>{pos+=d.pos;neu+=d.neu;neg+=d.neg;});

  const total=pos+neu+neg;

  return {pos,neu,neg,total,score:calcScore(pos,neu,neg)};

}



function _countryStats(data,geoName) {

  if (!data||!data.by_dest) return null;

  const destName=geoToDest(geoName);

  const entry=data.by_dest.find(d=>d.dest===geoName||d.dest===destName);

  if (!entry) return null;

  return {pos:entry.pos,neu:entry.neu,neg:entry.neg,total:entry.total,

          score:calcScore(entry.pos,entry.neu,entry.neg),waves:entry.waves||{}};

}



/* _waveStats: always reads wave_totals from the relevant chunk.

   - No country selected: uses the currently loaded chunk's wave_totals

     (already the correct market's own data).

   - Country selected: _sentCountryChunk is set by refreshWaveCharts

     after loading that country's own chunk; use its wave_totals.          */

let _sentCountryChunk = null; /* chunk for the currently selected country */



function _waveStats(data, waveName, geoName) {

  if (!data) return {pos:0,neu:0,neg:0,total:0,score:null};

  /* Use the country's own chunk if loaded, else fall back to current data */

  const src = (geoName && _sentCountryChunk) ? _sentCountryChunk : data;

  const wt = src.wave_totals && src.wave_totals[waveName];

  if (!wt) return {pos:0,neu:0,neg:0,total:0,score:null};

  return {...wt, score:calcScore(wt.pos, wt.neu, wt.neg)};

}



/* ════════════════════════════════════════════════════════════════

   MAP — recolour countries

   ════════════════════════════════════════════════════════════════ */

function _tagMapPaths() {

  const c=document.querySelector('#overviewMap');

  if (!c) return;

  c.querySelectorAll('svg path').forEach(p=>{

    const d=p.__data__;

    if (d&&d.properties&&d.properties.name) p.dataset.geoname=d.properties.name;

  });

}



/* The Source Market Overview map must colour the SOURCE markets (Russia, Nigeria, ... every market that has
   respondents) - that is done by renderGlobalMap() in app-final.js. This script used to repaint the same map
   by DESTINATION sentiment, which left source markets with no destination data (Russia, Nigeria) grey and
   painted destination-only countries (Sri Lanka, Maldives ...). Set to true to restore the old behaviour. */
const OVERVIEW_PAINT_DESTINATION_SENTIMENT = false;

function _renderSentimentMap(data) {

  const c=document.querySelector('#overviewMap');

  if (!c) return;
  if (!OVERVIEW_PAINT_DESTINATION_SENTIMENT) {
    const oldLeg=document.getElementById('sentimentMapLegend'); if (oldLeg) oldLeg.remove();
    return;                                   /* keep renderGlobalMap's source-market colours */
  }

  const byGeo=_byGeoMap(data);

  const selectedMarkets = _selectedSourceMarkets();

  const selectedGeo = new Set(selectedMarkets.map(_sourceMarketToGeo));

  const hasSelection = selectedMarkets.length > 0;

  const SELECTED_FILL = '#f2a45a';

  const SELECTED_STROKE = '#8b4d2b';

  c.querySelectorAll('svg path[data-geoname]').forEach(p=>{

    const name=p.dataset.geoname;

    const d=byGeo[name];

    const selected = selectedGeo.has(name);

    /* Countries with data: scored colour. Countries with no data: grey. */

    p.setAttribute('fill', selected ? SELECTED_FILL : (d ? scoreToColour(d.score) : _NO_DATA_FILL));

    p.setAttribute('stroke', selected ? SELECTED_STROKE : (d ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.4)'));

    p.setAttribute('stroke-width', selected ? '2.5' : (d ? '0.4' : '0.3'));

    p.style.opacity = !hasSelection || selected ? '1' : '0.22';

    p.style.filter = !hasSelection ? '' : (selected ? 'drop-shadow(0 4px 9px rgba(139,77,43,.42))' : 'grayscale(.35) blur(.25px)');

  });

  _renderSentimentLegend();

}



function _renderSentimentLegend() {

  const wrapper=document.querySelector('.overview-map-left');

  if (!wrapper) return;

  let leg=document.getElementById('sentimentMapLegend');

  if (!leg) {

    leg=document.createElement('div');

    leg.id='sentimentMapLegend';

    leg.style.cssText='display:flex;align-items:center;gap:8px;padding:5px 10px;font-size:10px;color:#555;flex-wrap:wrap;background:#f8f5fc;border-top:1px solid #ede8f5;';

    wrapper.appendChild(leg);

  }

  leg.innerHTML=`

    <strong style="color:#333;margin-right:6px;">Sentiment:</strong>

    <span style="display:flex;align-items:center;gap:4px;">

      <span style="width:120px;height:10px;border-radius:3px;

        background:linear-gradient(to right,#e4003a,#ff7900,#ffd400,#17b800,#008a00,#006f00);

        display:inline-block;border:1px solid rgba(0,0,0,.08);"></span>

    </span>

    <span style="font-size:9px;color:#d9003a;">Negative (−100)</span>

    <span style="font-size:9px;color:#b8860b;">Neutral (0)</span>

    <span style="font-size:9px;color:#008a00;">Positive (+100)</span>

    <span style="display:flex;align-items:center;gap:3px;margin-left:8px;">

      <span style="width:12px;height:10px;border-radius:2px;background:#c8c8c8;display:inline-block;border:1px solid #bbb;"></span>

      <span style="font-size:9px;color:#888;">No data</span></span>`;

}



/* ════════════════════════════════════════════════════════════════

   TOOLTIP — country name + instruction only

   ════════════════════════════════════════════════════════════════ */

function _attachMapTooltips() {

  const container=document.querySelector('#overviewMap');

  if (!container) return;

  container.querySelectorAll('svg path[data-geoname]').forEach(path=>{

    const name=path.dataset.geoname;

    const fresh=path.cloneNode(true);

    path.parentNode.replaceChild(fresh,path);



    fresh.addEventListener('mousemove',e=>{

      const tip=document.getElementById('tooltip');

      if (!tip) return;

      tip.innerHTML=_isSourceMarket(name)
        ? `<strong>${name}</strong><br><em style="color:#888;font-size:10px;">Source market &middot; click to select</em>`
        : `<strong>${name}</strong><br><em style="color:#888;font-size:10px;">Click to view destination sentiment</em>`;

      tip.style.opacity=1;

      tip.style.left=`${e.clientX+14}px`;

      tip.style.top=`${e.clientY+10}px`;

    });

    fresh.addEventListener('mouseleave',()=>{

      const tip=document.getElementById('tooltip');

      if (tip) tip.style.opacity=0;

    });

    fresh.addEventListener('click',()=>{

      const sourceMarket = _isSourceMarket(name);

      if (sourceMarket && typeof selectMarketFromMap === 'function') {

        selectMarketFromMap(sourceMarket);

        return;

      }

      _selectCountry(_sentCountry===name?null:name);

    });

  });

}



function _selectCountry(geoName) {

  _sentCountry = geoName;

  _sentCountryChunk = null; /* reset until new chunk loads */



  /* Highlight selected country on map */

  document.querySelectorAll('#overviewMap svg path[data-geoname]').forEach(p => {

    const sel = p.dataset.geoname === geoName;

    p.style.strokeWidth = sel ? '2.5px' : '';

    p.style.stroke      = sel ? '#fff' : '';

    p.style.filter      = '';

  });



  const title = document.getElementById('sentimentPanelTitle');

  if (title) title.textContent = geoName ? `Sentiment — ${geoName}` : 'Sentiment — All Destinations';



  if (geoName) {

    /* CRITICAL FIX: load the CLICKED COUNTRY'S OWN source-market chunk.

       wave_totals in that chunk = the true per-wave sentiment for that market.

       Do NOT look up geoName inside the current chunk's by_dest (which gives

       "what this market says about geoName as a destination" — wrong). */

    const manifest = (typeof _manifest !== 'undefined') ? _manifest : null;

    const key = _sentKey(geoName);

    const url = manifest && manifest.sentiment && manifest.sentiment[key];

    if (url) {

      const fetcher = typeof fetchChunk === 'function' ? fetchChunk(url)

                    : fetch(url).then(r => r.json());

      fetcher.then(chunk => {

        _sentCountryChunk = chunk || null;

        refreshWaveCharts();

      }).catch(() => { _sentCountryChunk = null; refreshWaveCharts(); });

    } else {

      refreshWaveCharts(); /* not a source market — show overall */

    }

  } else {

    refreshWaveCharts();

  }

}



/* ════════════════════════════════════════════════════════════════

   GAUGE  — beautiful semicircle, score 0-100 range displayed as

            integer e.g. "53" not "53.0%"

   ════════════════════════════════════════════════════════════════ */

function _drawGauge(el, score) {

  if (typeof window.drawSentimentGauge === 'function') {

    window.drawSentimentGauge(el, score);

    return;

  }

  if (!el) return;

  d3.select(el).selectAll('*').remove();



  const W  = Math.max(160, el.clientWidth || 180);

  const H  = W * 0.62;

  const cx = W / 2;

  const cy = H * 0.88;   /* pivot near bottom */

  const R  = W * 0.40;

  const ri = R * 0.58;   /* inner radius → donut thickness */



  const svg = d3.select(el).append('svg')

    .attr('width', W).attr('height', H)

    .attr('viewBox', `0 0 ${W} ${H}`)

    .style('display','block').style('overflow','visible');



  /* ── Angle mapping: -π/2 = left (-100), +π/2 = right (+100) ── */

  const toAngle = v => (Math.max(-100,Math.min(100,v)) / 100) * (Math.PI/2);



  /* ── 5-segment coloured arc (always visible as background) ─── */

  /*  Zones: -100…-60 deep-red | -60…-20 orange | -20…+20 yellow

             +20…+60 light-green | +60…+100 green                */

  const SEGMENTS = [

    { from:-100, to:-50, fill:'#e4003a' },

    { from: -50, to:-10, fill:'#ff7900' },

    { from: -10, to: 20, fill:'#ffd400' },

    { from:  20, to: 60, fill:'#17b800' },

    { from:  60, to:100, fill:'#008a00' },

  ];



  const g = svg.append('g').attr('transform',`translate(${cx},${cy})`);



  SEGMENTS.forEach(seg => {

    const arcPath = d3.arc()

      .innerRadius(ri).outerRadius(R)

      .startAngle(toAngle(seg.from))

      .endAngle(toAngle(seg.to));

    g.append('path').attr('d', arcPath())

      .attr('fill', seg.fill);

  });



  /* ── Thin white dividers between segments ───────────────────── */

  [-60, -20, 20, 60].forEach(v => {

    const a  = toAngle(v);

    const ox = Math.sin(a), oy = -Math.cos(a);

    g.append('line')

      .attr('x1', ox*ri).attr('y1', oy*ri)

      .attr('x2', ox*R ).attr('y2', oy*R )

      .attr('stroke','#fff').attr('stroke-width', 1.5);

  });



  /* ── White donut hole ───────────────────────────────────────── */

  g.append('path').attr('d',

    d3.arc().innerRadius(0).outerRadius(ri-1)

      .startAngle(-Math.PI/2).endAngle(Math.PI/2)()

  ).attr('fill','#fff');



  /* ── Tick marks & labels at -100, -50, 0, +50, +100 ─────────── */

  [

    { v:-100, label:'-100' },

    { v: -50, label:'-50'  },

    { v:   0, label:'0'    },

    { v:  50, label:'50'   },

    { v: 100, label:'100'  },

  ].forEach(({v, label}) => {

    const a   = toAngle(v);

    const ox  = Math.sin(a), oy = -Math.cos(a);

    const len = 6;

    g.append('line')

      .attr('x1', ox*(R))    .attr('y1', oy*(R))

      .attr('x2', ox*(R+len)).attr('y2', oy*(R+len))

      .attr('stroke','#888').attr('stroke-width', 1.2);

    g.append('text')

      .attr('x', ox*(R+len+8)).attr('y', oy*(R+len+8)+3)

      .attr('text-anchor','middle')

      .attr('font-size', W*0.072).attr('fill','#666')

      .text(label);

  });



  /* ── Needle ─────────────────────────────────────────────────── */

  if (score !== null && !isNaN(score)) {

    const a   = toAngle(score);

    const ox  = Math.sin(a), oy = -Math.cos(a);

    const nL  = R * 0.82;   /* needle length */

    const bL  = ri * 0.25;  /* back-stub */



    /* Needle shape: thin triangle */

    const perpx = -oy * W*0.013, perpy = ox * W*0.013;

    const tipX  = ox*nL,   tipY  = oy*nL;

    const base1x = -ox*bL + perpx, base1y = -oy*bL + perpy;

    const base2x = -ox*bL - perpx, base2y = -oy*bL - perpy;



    const needlePath = `M${tipX},${tipY} L${base1x},${base1y} L${base2x},${base2y} Z`;

    g.append('path').attr('d', needlePath).attr('fill','#e53935');



    /* Pivot circle */

    g.append('circle').attr('r', W*0.045).attr('fill','#e53935');

    g.append('circle').attr('r', W*0.022).attr('fill','#fff');

  }



  /* ── Score label below gauge ────────────────────────────────── */

  const displayVal = score !== null && !isNaN(score)

    ? (score >= 0 ? '+' : '') + Math.round(score)

    : '—';

  const scoreCol = score === null ? '#bbb'

    : score <= -50 ? '#e4003a'

    : score <= -10 ? '#ff7900'

    : score <=  20 ? '#b8860b'

    : score <=  60 ? '#17b800'

    : '#008a00';



  /* Score below the gauge — clearly visible, no overlap with arc */

  const scoreFS = displayVal.length > 3 ? W * 0.13 : W * 0.16;

  svg.append('text')

    .attr('x', cx).attr('y', cy + H * 0.18)

    .attr('text-anchor','middle')

    .attr('font-family','Manrope,system-ui,sans-serif')

    .attr('font-size', scoreFS)

    .attr('font-weight', 800)

    .attr('fill', scoreCol)

    .text(displayVal);

}



/* ════════════════════════════════════════════════════════════════

   WAVE SECTION — container + 4 cards

   ════════════════════════════════════════════════════════════════ */

function _ensureWaveContainer() {

  let sec=document.getElementById('sentimentWaveSection');

  if (sec) return sec;



  const overview=document.querySelector('.tab-panel[data-panel="overview"] .overview-map-wrapper');

  if (!overview) return null;



  /* Header bar */

  const header=document.createElement('div');

  header.id='sentimentPanelHeader';

  header.style.cssText='display:flex;align-items:center;justify-content:space-between;padding:10px 14px 6px;border-bottom:1px solid #ede8f5;';

  header.innerHTML=`

    <div style="display:flex;align-items:center;gap:8px;">

      <span style="width:4px;height:18px;background:linear-gradient(180deg,#530095,#00B5AC);border-radius:2px;display:inline-block;"></span>

      <h3 id="sentimentPanelTitle" style="font:700 13px Manrope;color:#1a1a2e;margin:0;">Sentiment — All Destinations</h3>

    </div>

    <span id="sentimentClearBtn"

      style="font-size:10px;color:#888;cursor:pointer;display:none;padding:3px 8px;border:1px solid #ddd;border-radius:12px;background:#fafafa;transition:background .15s;"

      onmouseenter="this.style.background='#f0ebfa'" onmouseleave="this.style.background='#fafafa'"

      onclick="window._sentClear&&window._sentClear()">✕ Clear selection</span>`;



  sec=document.createElement('div');

  sec.id='sentimentWaveSection';

  sec.style.cssText='display:grid;grid-template-columns:repeat(4,1fr);gap:0;';



  const wrap=document.createElement('div');

  wrap.id='sentimentWaveWrap';

  wrap.style.cssText=[

    'background:#fff',

    'border:1px solid #ede8f5',

    'border-radius:10px',

    'overflow:hidden',

    'margin-top:8px',

    'box-shadow:0 2px 12px rgba(83,0,149,.08)',

  ].join(';');



  wrap.appendChild(header);

  wrap.appendChild(sec);

  overview.insertAdjacentElement('afterend',wrap);

  return sec;

}



function refreshWaveCharts() {

  if (!_sentData) return;



  const waves=_getWaves();

  const waveNames=Object.keys(waves).sort();

  const sec=_ensureWaveContainer();

  if (!sec) return;



  const clearBtn=document.getElementById('sentimentClearBtn');

  if (clearBtn) clearBtn.style.display=_sentCountry?'inline':'none';



  sec.innerHTML='';



  waveNames.forEach((waveName,idx)=>{

    const period=waves[waveName];

    const stats=_waveStats(_sentData,waveName,_sentCountry);



    /* ── Card shell ───────────────────────────────────────────── */

    const card=document.createElement('div');

    card.style.cssText=[

      'display:flex','flex-direction:column','align-items:center',

      'padding:14px 10px 12px',

      idx<waveNames.length-1 ? 'border-right:1px solid #f0ebfa' : '',

      'background:#fff',

      'transition:background .15s',

    ].join(';');



    /* Wave label pill */

    const lbl=document.createElement('div');

    lbl.style.cssText='font:800 11px Manrope;color:#530095;letter-spacing:.03em;text-transform:uppercase;margin-bottom:2px;';

    lbl.textContent=waveName;

    card.appendChild(lbl);



    /* Period sub-label */

    const per=document.createElement('div');

    per.style.cssText='font-size:9.5px;color:#aaa;margin-bottom:10px;letter-spacing:.01em;';

    per.textContent=period;

    card.appendChild(per);



    /* Gauge */

    const gaugeWrap=document.createElement('div');

    gaugeWrap.style.cssText='width:100%; display: contents;';

    card.appendChild(gaugeWrap);

    _drawGauge(gaugeWrap,stats.score);



    /* ── Breakdown bar ──────────────────────────────────────── */

    if (stats.total>0) {

      const pPos=(stats.pos/stats.total)*100;

      const pNeu=(stats.neu/stats.total)*100;

      const pNeg=(stats.neg/stats.total)*100;



      /* Stacked bar */

      const barWrap=document.createElement('div');

      barWrap.style.cssText='width:90%;height:6px;border-radius:3px;overflow:hidden;display:flex;margin:10px auto 6px;';

      barWrap.title=`Positive ${pPos.toFixed(1)}% · Neutral ${pNeu.toFixed(1)}% · Negative ${pNeg.toFixed(1)}%`;

      [['#008a16',pPos],['#cfd9e6',pNeu],['#d9003a',pNeg]].forEach(([col,pct])=>{

        const seg=document.createElement('div');

        seg.style.cssText=`width:${pct}%;background:${col};`;

        barWrap.appendChild(seg);

      });

      card.appendChild(barWrap);



      /* P / N / Neg labels */

      const row=document.createElement('div');

      row.style.cssText='display:flex;justify-content:center;gap:6px;flex-wrap:wrap;';

      [

        [`${Math.round(pPos)}%`,'Positive','#008a16',stats.pos],

        [`${Math.round(pNeu)}%`,'Neutral','#7b6f86',stats.neu],

        [`${Math.round(pNeg)}%`,'Negative','#d9003a',stats.neg],

      ].forEach(([pct,label,col,n])=>{

        const chip=document.createElement('div');

        chip.style.cssText='display:flex;flex-direction:column;align-items:center;';

        chip.title=`${label}: ${n.toLocaleString()} records`;

        chip.innerHTML=`<span style="font:700 10px Manrope;color:${col};">${pct}</span>`+

                       `<span style="font-size:8px;color:#bbb;">${label.slice(0,3)}</span>`;

        row.appendChild(chip);

      });

      card.appendChild(row);



      /* n= */

      const tot=document.createElement('div');

      tot.style.cssText='font-size:8px;color:#ccc;margin-top:4px;';

      tot.textContent=`n = ${stats.total.toLocaleString()}`;

      card.appendChild(tot);

    } else {

      const na=document.createElement('div');

      na.style.cssText='font-size:10px;color:#ccc;margin-top:14px;';

      na.textContent='No data';

      card.appendChild(na);

    }



    sec.appendChild(card);

  });

}



/* ════════════════════════════════════════════════════════════════

   MAIN ENTRY  — called from enhancement.js renderOverview()

   ════════════════════════════════════════════════════════════════ */

function updateOverviewSentiment() {

  const markets = _selectedSourceMarkets();

  const newKey = markets.length > 1
    ? markets.map(_sentKey).sort().join('|')
    : _sentKey(markets[0] || 'All');

  if (newKey!==_sentMarket) _sentCountry=null;

  getSentimentDataForMarkets(markets).then(data=>{

    if (!data) return;

    _tagMapPaths();

    _renderSentimentMap(data);

    _attachMapTooltips();

    refreshWaveCharts();

  });

}



window._sentClear=function(){

  _selectCountry(null);

  const t=document.getElementById('sentimentPanelTitle');

  if (t) t.textContent='Sentiment — All Destinations';

};
