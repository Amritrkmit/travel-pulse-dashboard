/* ================================================================

   DESTINATION SENTIMENT ENGINE v3  —  dest-sentiment-engine.js



   Data source : Destination_Markets_Travel_Experience CSV

   Chunked into: data/dest-world-map.json  (25 destinations, overall)

                 data/dest-{name}.json     (per-destination wave + source)



   Formula     : Score = ((Positive − Negative) / Total) × 100



   Map keys:

     • #destSentimentMap   – D3 world map (self-contained, no renderGlobalMap)

     • #dSentimentWaveWrap – 4 wave gauge cards (injected below map)

     • #destSourcePolarityTbody – source market breakdown table

     • #destPolarityDonut  – donut chart

     • #destMapInsight     – right panel



   State:

     _dWorldData   – [{dest, pos, neu, neg, score, waves:{}}] from world-map chunk

     _dChunkCache  – url → Promise<chunk>

     _dSelCountry  – currently selected GeoJSON country name (or null)

   ================================================================ */



/* ── State ──────────────────────────────────────────────────────── */

let _dWorldData  = null;

let _dChunkCache = {};

let _dSelCountry = null;

let _dViewData = null;

let _dActiveSourceMarket = null;

let _dAutoSourceMarket = null;

const _D_DESTINATION_DISPLAY_THRESHOLD = 15;
const _dHasDisplayCount = d => d && Number(d.total) > _D_DESTINATION_DISPLAY_THRESHOLD;



/* ── GeoJSON ↔ CSV name aliases ─────────────────────────────────── */

const _D2G = {           /* CSV Destination → GeoJSON name */

  'UK':'United Kingdom','USA':'United States of America',

  'UAE':'United Arab Emirates','South Korea':'South Korea',

  'Hong Kong':'Hong Kong S.A.R.',   /* GeoJSON calls it Hong Kong S.A.R. */


  'Russia':'Russia',

};

const _G2D = {};

Object.entries(_D2G).forEach(([d,g]) => { _G2D[g] = d; });

/* ── Tolerant destination-name resolver ────────────────────────────
   Data spellings (UAE, UK, USA, Srilanka, Lithunia, cyprus, Cape verde, Macedonia, bahamas,
   Tanzania, Hong Kong ...) are matched to the GeoJSON country name ignoring case, spaces,
   punctuation and accents. Region labels (Europe, Asia, Middle East ...) resolve to null. */
const _dNormKey = v => String(v==null?'':v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const _D_KEY_ALIASES = {
  uae:'United Arab Emirates', emirates:'United Arab Emirates', unitedarabemirates:'United Arab Emirates',
  uk:'United Kingdom', greatbritain:'United Kingdom', england:'United Kingdom', scotland:'United Kingdom', wales:'United Kingdom',
  usa:'United States of America', us:'United States of America', unitedstates:'United States of America', america:'United States of America',
  russianfederation:'Russia', korearepublicofsouthkorea:'South Korea', korea:'South Korea', republicofkorea:'South Korea',
  hongkong:'Hong Kong S.A.R.', hongkongsar:'Hong Kong S.A.R.', macau:'Macao S.A.R', macao:'Macao S.A.R',
  srilanka:'Sri Lanka', lithunia:'Lithuania', lituania:'Lithuania', macedonia:'North Macedonia', czechrepublic:'Czechia',
  capeverde:'Cabo Verde', bahamas:'The Bahamas', tanzania:'United Republic of Tanzania', serbia:'Republic of Serbia',
  congo:'Republic of the Congo', drcongo:'Democratic Republic of the Congo', democraticrepublicofcongo:'Democratic Republic of the Congo',
  swaziland:'eSwatini', timorleste:'East Timor', burma:'Myanmar', turkiye:'Turkey', cotedivoire:'Ivory Coast',
  vaticancity:'Vatican', holland:'Netherlands', thenetherlands:'Netherlands', palestinianterritories:'Palestine',
  bosniaherzegovina:'Bosnia and Herzegovina', bosnia:'Bosnia and Herzegovina', uzbek:'Uzbekistan'
};
const _D_REGION_LABELS = new Set(['europe','africa','asia','antarctica','middleeast','northamerica','southamerica','caribbean','oceania','latam','me']);
let _dGeoIdx = null, _dGeoIdxFor = null;
function _dGeoIndex() {
  const W = (typeof WORLD !== 'undefined') ? WORLD : null;
  if (!W || !W.features) return {};
  if (_dGeoIdx && _dGeoIdxFor === W) return _dGeoIdx;
  _dGeoIdx = {}; _dGeoIdxFor = W;
  W.features.forEach(f => { const n = f.properties && f.properties.name; if (n && !_dGeoIdx[_dNormKey(n)]) _dGeoIdx[_dNormKey(n)] = n; });
  return _dGeoIdx;
}
function _dD2G(d) {
  if (_D2G[d]) return _D2G[d];
  const key = _dNormKey(d);
  if (_D_KEY_ALIASES[key]) return _D_KEY_ALIASES[key];
  const idx = _dGeoIndex();
  if (idx[key]) return idx[key];
  return d;
}
function _dIsRegionLabel(d) { return _D_REGION_LABELS.has(_dNormKey(d)); }

function _dG2D(g) { return _G2D[g] || g; }

const _D_ISO3 = {
  Australia:'AUS', Bahrain:'BHR', Brazil:'BRA', Canada:'CAN', China:'CHN', Egypt:'EGY', France:'FRA', Germany:'DEU', India:'IND', Indonesia:'IDN', Italy:'ITA', Japan:'JPN', Jordan:'JOR', Kenya:'KEN', Malaysia:'MYS', Netherlands:'NLD', Nigeria:'NGA', Qatar:'QAT', Russia:'RUS', 'Russian Federation':'RUS', 'Saudi Arabia':'SAU', Singapore:'SGP', 'South Korea':'KOR', Spain:'ESP', Switzerland:'CHE', Thailand:'THA', Turkey:'TUR', 'United Arab Emirates':'ARE', UAE:'ARE', 'United Kingdom':'GBR', UK:'GBR', 'United States of America':'USA', USA:'USA', 'South Africa':'ZAF', Ireland:'IRL'
};
const _D_ISO_TO_DEST = Object.fromEntries(Object.entries(_D_ISO3).map(([name,iso])=>[iso,name]));
function _dFeatureGeoName(f){
  const p=f&&f.properties||{};
  const iso=String(p.iso_a3||p.ISO_A3||p.ADM0_ISO||p.ADM0_A3||'').toUpperCase();
  if(iso){
    if(iso==='USA') return 'United States of America';
    if(iso==='GBR') return 'United Kingdom';
    if(iso==='ARE') return 'United Arab Emirates';
    if(iso==='KOR') return 'South Korea';
    if(iso==='RUS') return 'Russia';
    const hit=Object.entries(_D_ISO3).find(([name,code])=>code===iso && !['USA','UK','UAE','Russian Federation'].includes(name));
    if(hit) return _dD2G(hit[0]);
  }
  return p.name||p.NAME||p.ADMIN||'';
}



/* ── safe filename key ───────────────────────────────────────────── */

function _dSafeKey(name) {

  return name.toLowerCase()

    .replace(/ /g,'_').replace(/,/g,'').replace(/**\(**/g,'').replace(/**\)**/g,'')

    .replace(/**\.**/g,'').replace(/**\/**/g,'_').replace(/'/g,'');

}



/* ════════════════════════════════════════════════════════════════

   FORMULA  (same as sentiment-engine.js)

   ════════════════════════════════════════════════════════════════ */

function _dCalcScore(pos, neu, neg) {

  const t = pos + neu + neg;

  return t ? ((pos - neg) / t) * 100 : null;

}



function _dScoreToColour(score) {

  if (score === null || score === undefined || isNaN(score)) return '#d3d3d3';

  const scale = d3.scaleLinear()

    .domain([-100,-50,-10,20,60,100])

    .range(['#e4003a','#ff7900','#ffd400','#17b800','#008a00','#006f00'])

    .clamp(true);

  return scale(Math.max(-100,Math.min(100,score)));

}



function _dGetWaves() {

  const m = (typeof _manifest !== 'undefined') ? _manifest : null;

  return (m && m.waves) ? m.waves

    : {'Wave 1':'Wave 1','Wave 2':'Wave 2','Wave 3':'Wave 3','Wave 4':'Wave 4'};

}



/* ════════════════════════════════════════════════════════════════

   DATA LOADING

   ════════════════════════════════════════════════════════════════ */

function _dFetch(url) {

  if (!_dChunkCache[url])

    _dChunkCache[url] = (typeof fetchChunk==='function' ? fetchChunk(url)

                        : fetch(url).then(r=>r.json())).catch(()=>null);

  return _dChunkCache[url];

}



function _dLoadWorldMap() {

  if (_dWorldData) return Promise.resolve(_dWorldData);

  const m = (typeof _manifest!=='undefined') ? _manifest : null;

  const url = m && m.dest_sentiment && m.dest_sentiment['__world_map__'];

  if (!url) return Promise.resolve([]);

  return _dFetch(url).then(d => {

    _dWorldData = (d && d.data) ? d.data : [];

    return _dWorldData;

  });

}



function _dLoadDestChunk(geoName) {

  const m = (typeof _manifest!=='undefined') ? _manifest : null;

  if (!m || !m.dest_sentiment) return Promise.resolve(null);

  let url = m.dest_sentiment[geoName] || m.dest_sentiment[_dG2D(geoName)];
  if (!url) { const k = Object.keys(m.dest_sentiment).find(k => k !== '__world_map__' && _dD2G(k) === geoName); if (k) url = m.dest_sentiment[k]; }

  return url ? _dFetch(url) : Promise.resolve(null);

}

function _dActiveData() {

  return _dViewData || _dWorldData || [];

}

function _dSelectedSourceMarket() {

  const selected = (typeof filterSelections !== 'undefined' && filterSelections.Market) ? filterSelections.Market : [];

  return selected && selected.length === 1 ? selected[0] : null;

}

function _dSelectedSourceMarkets() {

  const selected = (typeof filterSelections !== 'undefined' && filterSelections.Market) ? filterSelections.Market : [];

  return Array.isArray(selected) ? selected.filter(Boolean) : [];

}

function _dSourceKey(name) {

  const s = String(name || '').toLowerCase()

    .replace(/\([^)]*\)/g, ' ')

    .replace(/[^a-z0-9]+/g, ' ')

    .trim()

    .replace(/\s+/g, ' ');

  const aliases = {

    'usa': 'united states of america',

    'united states': 'united states of america',

    'uk': 'united kingdom',

    'uae': 'united arab emirates',

    'korea republic of south korea': 'south korea',

    'south korea': 'south korea',

    'russian federation': 'russia',

    'russia': 'russia',

  };

  return aliases[s] || s;

}

function _dEntryForSource(chunk, sourceMarket) {

  if (!chunk || !Array.isArray(chunk.by_source) || !sourceMarket) return null;

  const key = _dSourceKey(sourceMarket);

  return chunk.by_source.find(e => _dSourceKey(e.src) === key) || null;

}

function _dEntriesForSources(chunk, sourceMarkets) {

  if (!chunk || !Array.isArray(chunk.by_source) || !sourceMarkets || !sourceMarkets.length) return [];

  const wanted = new Set(sourceMarkets.map(_dSourceKey));

  return chunk.by_source.filter(e => wanted.has(_dSourceKey(e.src)));

}

function _dMergeSourceEntries(entries, label) {

  const out = { src: label || 'Selected source markets', pos: 0, neu: 0, neg: 0, total: 0, score: null, waves: {} };

  entries.forEach(entry => {

    out.pos += entry.pos || 0;

    out.neu += entry.neu || 0;

    out.neg += entry.neg || 0;

    out.total += entry.total || ((entry.pos || 0) + (entry.neu || 0) + (entry.neg || 0));

    Object.entries(entry.waves || {}).forEach(([wave, vals]) => {

      out.waves[wave] = out.waves[wave] || { pos: 0, neu: 0, neg: 0, total: 0, score: null };

      out.waves[wave].pos += vals.pos || 0;

      out.waves[wave].neu += vals.neu || 0;

      out.waves[wave].neg += vals.neg || 0;

      out.waves[wave].total += vals.total || ((vals.pos || 0) + (vals.neu || 0) + (vals.neg || 0));

    });

  });

  out.score = _dCalcScore(out.pos, out.neu, out.neg);

  Object.values(out.waves).forEach(w => { w.score = _dCalcScore(w.pos, w.neu, w.neg); });

  return out;

}

function _dSourceMarketToGeo(sourceMarket) {

  const aliases = {

    'Korea, Republic of (South Korea)': 'South Korea',

    'Russian Federation': 'Russia',

  };

  return _dD2G(aliases[sourceMarket] || sourceMarket);

}

function _dBuildSourceView(sourceMarket) {

  const sourceMarkets = Array.isArray(sourceMarket) ? sourceMarket.filter(Boolean) : (sourceMarket ? [sourceMarket] : []);

  if (!sourceMarkets.length) return Promise.resolve(_dWorldData || []);

  const base = _dWorldData || [];

  return Promise.all(base.map(d => _dLoadDestChunk(_dD2G(d.dest)).then(chunk => {

    const entries = _dEntriesForSources(chunk, sourceMarkets);

    const entry = _dMergeSourceEntries(entries, sourceMarkets.length === 1 ? sourceMarkets[0] : 'Selected source markets');

    if (!entries.length) return { dest: d.dest, pos: 0, neu: 0, neg: 0, total: 0, score: null, waves: {} };

    return {

      dest: d.dest,

      pos: entry.pos || 0,

      neu: entry.neu || 0,

      neg: entry.neg || 0,

      total: entry.total || ((entry.pos || 0) + (entry.neu || 0) + (entry.neg || 0)),

      score: Number.isFinite(entry.score) ? entry.score : _dCalcScore(entry.pos || 0, entry.neu || 0, entry.neg || 0),

      waves: entry.waves || {},

    };

  })));

}

function _dDestinationGeoForSource(sourceMarket) {

  const geo = sourceMarket ? _dSourceMarketToGeo(sourceMarket) : null;

  if (!geo || !_dWorldData) return null;

  return _dWorldData.some(d => _dD2G(d.dest) === geo) ? geo : null;

}



/* ════════════════════════════════════════════════════════════════

   SELF-CONTAINED WORLD MAP

   Same three-pass approach as Source Overview.

   Destination countries coloured by sentiment; others grey.

   ════════════════════════════════════════════════════════════════ */

function _dBuildByGeo() {

  const m = {};

  _dActiveData().forEach(d => { if (_dIsRegionLabel(d.dest)) return; m[_dD2G(d.dest)] = d; });

  return m;

}



function _dPolyArea(feat) {

  const g = feat.geometry; if (!g) return 0;

  const sl = ring => Math.abs(ring.reduce((s,p,i,a)=>{

    const n=a[(i+1)%a.length]; return s+p[0]*n[1]-n[0]*p[1];

  },0))/2;

  if (g.type==='Polygon') return sl(g.coordinates[0]);

  if (g.type==='MultiPolygon') return Math.max(...g.coordinates.map(p=>sl(p[0])));

  return 0;

}



function _dDrawMap() {

  const el = document.getElementById('destSentimentMap');

  if (!el || !_dWorldData) return;



  const WORLD_ref = (typeof WORLD!=='undefined') ? WORLD : null;

  if (!WORLD_ref) return;



  let countries = null;

  if (WORLD_ref.type==='FeatureCollection') countries = WORLD_ref;

  else if (window.topojson && WORLD_ref.objects && WORLD_ref.objects.countries)

    countries = topojson.feature(WORLD_ref, WORLD_ref.objects.countries);

  if (!countries || !countries.features || !countries.features.length) return;



  d3.select(el).selectAll('*').remove();



  const W = Math.max(680, (el.clientWidth || 760) - 36);   /* minus container side padding */

  const _fit = mapFitWorld(W);                              /* FIX: map fills the full width */

  const H = _fit.height + 10;



  const projection = _fit.projection;

  const path = d3.geoPath(projection);



  const svg = d3.select(el).append('svg')

    .attr('width',W).attr('height',H)

    .attr('viewBox',`0 0 ${W} ${H}`)

    .style('display','block');

  svg.insert('path', ':first-child')
    .datum({type:'Sphere'})
    .attr('d', d3.geoPath(projection))
    .attr('fill', '#f7f5fb')
    .attr('stroke', 'none')
    .style('pointer-events','none');

  const g = svg.append('g');
  if (typeof window.attachMapZoomControls === 'function') {
    window.attachMapZoomControls(el, svg, g);
  }



  const byGeo = _dBuildByGeo();

  const destSet = new Set(Object.keys(byGeo));

  const sourceMarkets = _dSelectedSourceMarkets();

  const sourceGeoSet = new Set(sourceMarkets.map(_dSourceMarketToGeo));

  const hasSourceSelection = sourceMarkets.length > 0;

  const SOURCE_SELECTED_FILL = null; // preserve sentiment/data fill

  const SOURCE_SELECTED_STROKE = '#530095';

  const sourceFill = (name, fallback) => fallback;

  const sourceOpacity = name => !hasSourceSelection || sourceGeoSet.has(name) ? 1 : .45;

  const sourceFilter = name => !hasSourceSelection ? null : (sourceGeoSet.has(name) ? null : null);

  const allSorted = [...countries.features].sort((a,b)=>_dPolyArea(b)-_dPolyArea(a));

  /* FIX: several GeoJSON features share one country name (France = FRA + French Guiana,
     Martinique, Guadeloupe, Reunion, Mayotte; New Zealand = NZL + Tokelau ...). Only the
     biggest feature per name is the real destination; the rest stay grey and are not clickable. */
  const _dTotalArea = f => {
    const g=f.geometry; if(!g) return 0;
    const sl=r=>Math.abs(r.reduce((s,p,i,a)=>{const n=a[(i+1)%a.length];return s+p[0]*n[1]-n[0]*p[1];},0))/2;
    if(g.type==='Polygon') return sl(g.coordinates[0]);
    if(g.type==='MultiPolygon') return g.coordinates.reduce((s,p)=>s+sl(p[0]),0);
    return 0;
  };
  const _dMainByName = new Map();
  countries.features.forEach(f=>{
    const n=f.properties&&f.properties.name; if(!n) return;
    const cur=_dMainByName.get(n);
    if(!cur || _dTotalArea(f)>_dTotalArea(cur)) _dMainByName.set(n,f);
  });
  const _dIsMain = f => !!(f.properties&&f.properties.name) && _dMainByName.get(f.properties.name)===f;
  const _dGeoOf  = f => _dIsMain(f) ? _dFeatureGeoName(f) : '';
  const destFeats = allSorted.filter(f=>_dIsMain(f)&&destSet.has(f.properties.name));

  const bgFeats   = allSorted.filter(f=>!destFeats.includes(f));



  /* Pass 1 — non-destination countries (muted grey) */

  g.append('g').attr('class','d-bg').selectAll('path')

    .data(bgFeats).join('path')

    .attr('d',path)

    .attr('data-dgeoname',f=>_dGeoOf(f))

    .attr('fill',f=>sourceFill(_dGeoOf(f),'#d8d4e0'))
    .attr('opacity',f=>sourceOpacity(_dGeoOf(f)))
    .attr('stroke',f=>sourceGeoSet.has(_dGeoOf(f))?SOURCE_SELECTED_STROKE:'#fff')
    .attr('stroke-width',f=>sourceGeoSet.has(_dGeoOf(f))?4:0.3)
    .style('filter',f=>sourceFilter(_dGeoOf(f)))

    .style('pointer-events','all');



  /* Pass 2 — destination countries coloured by score */

  g.append('g').attr('class','d-fg').selectAll('path')

    .data(destFeats).join('path')

    .attr('d',path)

    .attr('data-dgeoname',f=>_dGeoOf(f))

    .attr('fill',f=>{

      const name=_dGeoOf(f);

      return sourceFill(name, byGeo[name] ? _dScoreToColour(byGeo[name].score) : '#c8c8c8');

    })

    .attr('opacity',f=>sourceOpacity(_dGeoOf(f)))

    .attr('stroke',f=>sourceGeoSet.has(_dGeoOf(f))?SOURCE_SELECTED_STROKE:'#fff')
    .attr('stroke-width',f=>sourceGeoSet.has(_dGeoOf(f))?4:0.5)

    .style('filter',f=>sourceFilter(_dGeoOf(f)))

    .style('cursor','pointer');



  /* Pass 2b — marker dots for tiny destinations (Singapore, Hong Kong, Maldives, Malta ...) */
  const _dTinyFeats = destFeats.filter(f => path.area(f) < 45);
  g.append('g').attr('class','d-dots').selectAll('g').data(_dTinyFeats).join('g')
    .attr('class','map-dot')
    .attr('transform',f=>{const c=path.centroid(f);return `translate(${c[0]},${c[1]})`;})
    .append('circle')
    .attr('r',4.2)
    .attr('data-dgeoname',f=>_dGeoOf(f))
    .attr('fill',f=>{const n=_dGeoOf(f);return sourceFill(n, byGeo[n] ? _dScoreToColour(byGeo[n].score) : '#c8c8c8');})
    .attr('opacity',f=>sourceOpacity(_dGeoOf(f)))
    .attr('stroke','#fff').attr('stroke-width',1.3)
    .style('cursor','pointer');

  /* Pass 3 — border strokes */

  g.append('g').attr('class','d-borders').selectAll('path')

    .data(allSorted).join('path')

    .attr('d',path)

    .attr('fill','none')

    .attr('stroke','none').attr('stroke-width',0.35)

    .style('pointer-events','none');



  /* Tooltips + click on every path */

  el.querySelectorAll('svg [data-dgeoname]').forEach(p => {

    const name  = p.dataset.dgeoname;

    const isDest = destSet.has(name);

    p.addEventListener('mousemove', e => {

      const tip = document.getElementById('tooltip');

      if (!tip) return;

      tip.innerHTML = isDest

        ? `<strong>${name}</strong><br><em style="color:#888;font-size:10px;">Click to view sentiment scores</em>`

        : `<strong>${name}</strong><br><em style="color:#bbb;font-size:10px;">No destination data</em>`;

      tip.style.opacity=1;

      tip.style.left=`${e.clientX+14}px`;

      tip.style.top=`${e.clientY+10}px`;

    });

    p.addEventListener('mouseleave',()=>{

      const tip=document.getElementById('tooltip');

      if(tip) tip.style.opacity=0;

    });

    if (isDest) p.addEventListener('click',()=>_dSelectCountry(_dSelCountry===name?null:name));

  });

  /* zoom support: remember map context, then zoom to selected destination / source market(s) */
  window.__destMapCtx = { svg, path, countries, mainFeat:_dIsMain, geoOf:_dGeoOf, sourceGeoSet, hasSourceSelection };
  _dApplyMapZoom();

}

function _dApplyMapZoom() {
  const c = window.__destMapCtx;
  if (!c || typeof window.mapZoomToFeatures !== 'function') return;
  let names = [];
  if (_dSelCountry) names = [_dSelCountry];                 /* clicked destination wins */
  else if (c.hasSourceSelection) names = [...c.sourceGeoSet];   /* else source-market filter / region */
  const set = new Set(names);
  const feats = set.size ? c.countries.features.filter(f => c.mainFeat(f) && set.has(c.geoOf(f))) : [];
  window.mapZoomToFeatures(c.svg, c.path, feats);
}



/* ── Legend ─────────────────────────────────────────────────────── */

function _dRenderLegend() {

  const wrapper=document.getElementById('destMapLeft');

  if (!wrapper) return;

  let leg=document.getElementById('destSentimentLegend');

  if (!leg) {

    leg=document.createElement('div');

    leg.id='destSentimentLegend';

    wrapper.appendChild(leg);

  }

  leg.className='dest-sentiment-legend';

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

   COUNTRY SELECTION

   ════════════════════════════════════════════════════════════════ */

function _dSelectCountry(geoName) {

  _dSelCountry = geoName;



  /* Recolour map paths */

  const byGeo = _dBuildByGeo();

  document.querySelectorAll('#destSentimentMap svg [data-dgeoname]').forEach(p => {

    const name = p.dataset.dgeoname;

    if (name===geoName) {

      p.setAttribute('fill',byGeo[name] ? _dScoreToColour(byGeo[name].score) : '#c8c8c8');

      p.style.strokeWidth='2.5px'; p.style.stroke='#fff';

      p.style.filter='';

    } else if (byGeo[name]) {

      p.setAttribute('fill',_dScoreToColour(byGeo[name].score));

      p.style.strokeWidth=''; p.style.stroke=''; p.style.filter='';

    } else {

      p.style.strokeWidth=''; p.style.stroke=''; p.style.filter='';

    }

  });

  _dApplyMapZoom();   /* zoom to the clicked destination (or back out when deselected) */




  /* Update titles */

  const setTxt=(id,t)=>{const el=document.getElementById(id);if(el)el.textContent=t;};

  setTxt('dSentimentPanelTitle', geoName?`Destination Sentiment — ${geoName}`:'Destination Sentiment — All Destinations');

  setTxt('destSourceTableTitle', geoName?`Source Markets talking about ${geoName}`:'All Destinations — Score Summary');

  setTxt('destPolarityChartTitle', geoName?`Sentiment — ${geoName}`:'Sentiment Distribution — All Destinations');

  const cb=document.getElementById('dSentimentClearBtn');

  if(cb) cb.style.display=geoName?'inline':'none';



  if (geoName) {

    _dLoadDestChunk(geoName).then(chunk => {

      const sourceMarkets = _dSelectedSourceMarkets();

      const sourceEntries = _dEntriesForSources(chunk, sourceMarkets);

      const sourceEntry = sourceEntries.length
        ? _dMergeSourceEntries(sourceEntries, sourceMarkets.length === 1 ? sourceMarkets[0] : 'Selected source markets')
        : null;

      /* wave_totals = per-wave breakdown for this destination from CSV */

      _dRefreshWaveCharts(sourceEntry ? sourceEntry.waves : (chunk && chunk.wave_totals ? chunk.wave_totals : null));

      _dRenderSourceTable(sourceMarkets.length ? sourceEntries : (chunk && chunk.by_source ? chunk.by_source : []));

      /* Donut: sum wave_totals from THIS destination's CSV chunk for accuracy */

      const el = document.getElementById('destPolarityDonut');

      if (el && sourceEntry) {

        _dDrawDonut(el, sourceEntry.pos || 0, sourceEntry.neu || 0, sourceEntry.neg || 0);

      } else if (el && chunk && chunk.wave_totals) {

        let pos=0, neu=0, neg=0;

        Object.values(chunk.wave_totals).forEach(w => { pos+=w.pos; neu+=w.neu; neg+=w.neg; });

        _dDrawDonut(el, pos, neu, neg);

      }

    });

  } else {

    _dRefreshWaveChartsAll();

    _dRenderSourceTableAll();

    _dRenderDonutAll();

  }

}



/* ════════════════════════════════════════════════════════════════

   RIGHT INSIGHT PANEL

   ════════════════════════════════════════════════════════════════ */

function _dRenderInsightPanel() {

  const panel=document.getElementById('destMapInsight');

  const activeData = _dActiveData().filter(_dHasDisplayCount);

  if (!panel||!activeData.length) return;

  let pos=0,neu=0,neg=0;

  activeData.forEach(d=>{pos+=d.pos;neu+=d.neu;neg+=d.neg;});

  const total=pos+neu+neg;

  const score=_dCalcScore(pos,neu,neg);

  const sStr=score!==null?(score>=0?'+':'')+Math.round(score):'—';

  const sCol=score===null?'#888':score>5?'#008a16':score<-5?'#d9003a':'#888';



  panel.innerHTML=`<div class="dest-insight-panel">

    <div class="map-focus-name">${_dActiveSourceMarket ? `Destination Sentiment from ${_dActiveSourceMarket}` : 'Overall Destination Sentiment'}</div>

    <div class="map-focus-metric" style="color:${sCol};">${sStr}</div>

    <div class="map-focus-label">((Pos - Neg) / Total) x 100</div>

    <div class="hotel-sentiment-mix dest-sentiment-mix">

      ${[['Positive',pos,'#008a16'],['Neutral',neu,'#7b6f86'],['Negative',neg,'#d9003a']].map(([l,v,c])=>`

        <div>

          <strong style="color:${c};">${total?((v/total)*100).toFixed(1):0}%</strong>

          <span>${l}</span>

          <em>${v.toLocaleString()}</em>

        </div>`).join('')}

    </div>

    <div class="dest-sentiment-bar">

      ${total?`<i style="width:${(pos/total*100).toFixed(1)}%;background:#008a16;"></i>

               <i style="width:${(neu/total*100).toFixed(1)}%;background:#cfd9e6;"></i>

               <i style="width:${(neg/total*100).toFixed(1)}%;background:#d9003a;"></i>`:''}

    </div>

    <div class="dest-sentiment-note">n = ${total.toLocaleString()} | ${activeData.length} destinations</div>

    <div class="map-focus-hint">Click a country on the map to view its wave-by-wave breakdown.</div>

  </div>`;

}



/* ════════════════════════════════════════════════════════════════

   WAVE GAUGE CARDS  (reuses _drawGauge from sentiment-engine.js)

   ════════════════════════════════════════════════════════════════ */

function _dEnsureWaveContainer() {

  let sec=document.getElementById('dSentimentWaveSection');

  if (sec) return sec;



  const mapWrapper=document.querySelector('.tab-panel[data-panel="destination"] .overview-map-wrapper');

  if (!mapWrapper) return null;



  const header=document.createElement('div');

  header.style.cssText='display:flex;align-items:center;justify-content:space-between;padding:10px 14px 6px;border-bottom:1px solid #ede8f5;background:linear-gradient(135deg,#faf8ff,#f3f0fb);';

  header.innerHTML=`

    <div style="display:flex;align-items:center;gap:8px;">

      <span style="width:4px;height:18px;background:linear-gradient(180deg,#221345,#00B5AC);border-radius:2px;display:inline-block;"></span>

      <h3 id="dSentimentPanelTitle" style="font:700 13px Manrope;color:#1a1a2e;margin:0;">Destination Sentiment — All Destinations</h3>

    </div>

    <span id="dSentimentClearBtn" style="font-size:10px;color:#888;cursor:pointer;display:none;padding:3px 8px;border:1px solid #ddd;border-radius:12px;background:#fafafa;"

      onclick="window._dSentClear&&window._dSentClear()">✕ Clear selection</span>`;



  sec=document.createElement('div');

  sec.id='dSentimentWaveSection';

  sec.style.cssText='display:grid;grid-template-columns:repeat(4,1fr);gap:0;';



  const wrap=document.createElement('div');

  wrap.id='dSentimentWaveWrap';

  wrap.style.cssText='background:#fff;border:1px solid #ede8f5;border-radius:10px;overflow:hidden;margin-top:8px;box-shadow:0 2px 12px rgba(34,19,69,.08);';

  wrap.appendChild(header);

  wrap.appendChild(sec);

  mapWrapper.insertAdjacentElement('afterend',wrap);

  return sec;

}



function _dRenderWaveCards(waveTotals) {

  const sec=_dEnsureWaveContainer(); if (!sec) return;

  sec.innerHTML='';

  const waves=_dGetWaves();

  const waveNames=Object.keys(waves).sort();



  waveNames.forEach((wn,idx)=>{

    const wt = waveTotals && waveTotals[wn];

    const stats = wt

      ? {pos:wt.pos,neu:wt.neu,neg:wt.neg,total:wt.total,score:_dCalcScore(wt.pos,wt.neu,wt.neg)}

      : {pos:0,neu:0,neg:0,total:0,score:null};



    const card=document.createElement('div');

    card.style.cssText=[

      'display:flex','flex-direction:column','align-items:center',

      'padding:14px 10px 12px',

      idx<waveNames.length-1?'border-right:1px solid #f0ebfa':'','background:#fff',

    ].join(';');



    /* Wave label */

    const lbl=document.createElement('div');

    lbl.style.cssText='font:800 11px Manrope;color:#221345;letter-spacing:.03em;text-transform:uppercase;margin-bottom:2px;';

    lbl.textContent=wn;

    card.appendChild(lbl);



    /* Period */

    const per=document.createElement('div');

    per.style.cssText='font-size:9.5px;color:#aaa;margin-bottom:10px;';

    per.textContent=waves[wn];

    card.appendChild(per);



    /* Gauge — reuse from sentiment-engine.js */

    const gw=document.createElement('div');

    gw.style.cssText='width:100%; display: contents;';

    card.appendChild(gw);

    if (typeof _drawGauge==='function') _drawGauge(gw, stats.score);



    /* Breakdown */

    if (stats.total>0) {

      const pP=(stats.pos/stats.total)*100,pN=(stats.neu/stats.total)*100,pNg=(stats.neg/stats.total)*100;

      const bar=document.createElement('div');

      bar.style.cssText='width:90%;height:6px;border-radius:3px;overflow:hidden;display:flex;margin:10px auto 6px;';

      [['#008a16',pP],['#cfd9e6',pN],['#d9003a',pNg]].forEach(([col,pct])=>{

        const s=document.createElement('div'); s.style.cssText=`width:${pct}%;background:${col};`; bar.appendChild(s);

      });

      card.appendChild(bar);



      const row=document.createElement('div');

      row.style.cssText='display:flex;justify-content:center;gap:6px;flex-wrap:wrap;';

      [

        [`${Math.round(pP)}%`,'Positive','#008a16',stats.pos],

        [`${Math.round(pN)}%`,'Neutral', '#7b6f86',stats.neu],

        [`${Math.round(pNg)}%`,'Negative','#d9003a',stats.neg],

      ].forEach(([pct,lbl2,col,n])=>{

        const chip=document.createElement('div');

        chip.style.cssText='display:flex;flex-direction:column;align-items:center;';

        chip.title=`${lbl2}: ${n.toLocaleString()} records`;

        chip.innerHTML=`<span style="font:700 10px Manrope;color:${col};">${pct}</span>`

                      +`<span style="font-size:8px;color:#bbb;">${lbl2.slice(0,3)}</span>`;

        row.appendChild(chip);

      });

      card.appendChild(row);



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



function _dRefreshWaveCharts(waveTotals) { _dRenderWaveCards(waveTotals); }



function _dRefreshWaveChartsAll() {

  /* Sum per wave across all destinations in the active source-filtered view */

  const activeData = _dActiveData().filter(_dHasDisplayCount);

  if (!activeData.length) { _dRenderWaveCards(null); return; }

  const agg={};

  activeData.forEach(d=>{

    if (!d.waves) return;

    Object.entries(d.waves).forEach(([wn,wv])=>{

      if (!agg[wn]) agg[wn]={pos:0,neu:0,neg:0,total:0};

      agg[wn].pos+=wv.pos||0; agg[wn].neu+=wv.neu||0; agg[wn].neg+=wv.neg||0;

      agg[wn].total+=(wv.pos||0)+(wv.neu||0)+(wv.neg||0);

    });

  });

  _dRenderWaveCards(agg);

}



/* ════════════════════════════════════════════════════════════════

   SOURCE TABLE

   ════════════════════════════════════════════════════════════════ */

/* ── Polarity bar-row renderer (matches screenshot design) ───── */

function _dMakeBarRow(name, pos, neu, neg, total, isClickable, clickFn) {

  const pPos = total ? (pos/total*100) : 0;

  const pNeu = total ? (neu/total*100) : 0;

  const pNeg = total ? (neg/total*100) : 0;

  const BAR_MAX = 80; /* max bar width % of cell */



  const row = document.createElement('div');

  row.style.cssText = [

    'display:grid','grid-template-columns:180px 1fr 1fr 1fr',

    'padding:7px 16px','border-bottom:1px solid #f0ebfa',

    'align-items:center','background:#fff',

    isClickable ? 'cursor:pointer;' : '',

  ].join(';');



  /* Hover */

  if (isClickable) {

    row.addEventListener('mouseenter', () => row.style.background = '#faf8fd');

    row.addEventListener('mouseleave', () => row.style.background = '#fff');

    row.addEventListener('click', clickFn);

  }



  /* Name cell */

  const nameCell = document.createElement('div');

  nameCell.style.cssText = 'font:600 11px Manrope;color:#221345;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';

  nameCell.textContent = name;

  row.appendChild(nameCell);



  /* Bar cell factory */

  function barCell(pct, colour) {

    const cell = document.createElement('div');

    cell.style.cssText = 'display:flex;align-items:center;gap:6px;';

    const track = document.createElement('div');

    track.style.cssText = 'flex:0 0 auto;height:10px;border-radius:5px;background:#ede8f5;overflow:hidden;width:'+Math.round(BAR_MAX*(pct/100))+'%';

    const fill = document.createElement('div');

    fill.style.cssText = `height:100%;width:100%;background:${colour};border-radius:5px;`;

    track.appendChild(fill);

    const lbl = document.createElement('span');

    lbl.style.cssText = `font:700 10px Manrope;color:${colour};min-width:30px;`;

    lbl.textContent = pct >= 0.5 ? Math.round(pct)+'%' : '<1%';

    cell.appendChild(track);

    cell.appendChild(lbl);

    return cell;

  }



  row.appendChild(barCell(pPos, '#008a16'));   /* Positive — green */

  row.appendChild(barCell(pNeu, '#7b6f86'));   /* Neutral  — grey  */

  row.appendChild(barCell(pNeg, '#d9003a'));   /* Negative — red   */



  return row;

}



function _dRenderSourceTable(entries) {

  /* Source markets talking about a selected destination */

  const wrap = document.getElementById('destSourcePolarityTbody'); if (!wrap) return;

  wrap.innerHTML = '';

  const list = (entries || []).filter(e => e.total > 0);

  if (!list.length) {

    wrap.innerHTML = '<div style="padding:14px 16px;color:#aaa;font-size:10px;">No data</div>';

    return;

  }

  /* Update col header to say "Source Market" */

  const hdr = document.getElementById('destTableColHeader');

  if (hdr) hdr.querySelector('span').textContent = 'Source Market';



  list.forEach(e => {

    const row = _dMakeBarRow(e.src, e.pos, e.neu, e.neg, e.total, false, null);

    wrap.appendChild(row);

  });

}



function _dRenderSourceTableAll() {

  /* All destinations summary — clicking a row selects it on the map */

  const wrap = document.getElementById('destSourcePolarityTbody'); if (!wrap) return;

  const activeData = _dActiveData();

  if (!activeData.length) return;

  wrap.innerHTML = '';

  /* Update col header to say "Destination" */

  const hdr = document.getElementById('destTableColHeader');

  if (hdr) hdr.querySelector('span').textContent = 'Destination Market';



  const sorted = activeData.filter(_dHasDisplayCount).sort((a,b) => b.total - a.total);

  if (!sorted.length) {
    wrap.innerHTML = '<div style="padding:14px 16px;color:#aaa;font-size:10px;">No destinations above the display threshold</div>';
    return;
  }

  sorted.forEach(d => {

    const geo = _dD2G(d.dest);

    const row = _dMakeBarRow(d.dest, d.pos, d.neu, d.neg, d.total, true,

      () => _dSelectCountry(_dSelCountry === geo ? null : geo));

    /* Highlight if currently selected */

    if (_dSelCountry === geo) row.style.background = '#ede6f9';

    wrap.appendChild(row);

  });

}



/* ════════════════════════════════════════════════════════════════

   DONUT CHART

   ════════════════════════════════════════════════════════════════ */

function _dDrawDonut(el,pos,neu,neg) {

  if (!el) return;

  d3.select(el).selectAll('*').remove();

  const total=pos+neu+neg;

  if (!total) { d3.select(el).append('div').attr('class','empty-chart').text('No data.'); return; }

  const pData=[{label:'Positive',value:pos,colour:'#008a16'},{label:'Neutral',value:neu,colour:'#cfd9e6'},{label:'Negative',value:neg,colour:'#d9003a'}];

  const w=Math.max(260,el.clientWidth||300),h=200,r=Math.min(w/2,h/2)-16,cx=w*0.38,cy=h/2;

  const svg=d3.select(el).append('svg').attr('width',w).attr('height',h);

  const arc=d3.arc().innerRadius(r*0.52).outerRadius(r);

  const pie=d3.pie().sort(null).value(d=>d.value);

  const g=svg.append('g').attr('transform',`translate(${cx},${cy})`);

  g.selectAll('path').data(pie(pData)).join('path')

    .attr('d',arc).attr('fill',d=>d.data.colour).attr('stroke','#fff').attr('stroke-width',1.5);

  g.append('text').attr('text-anchor','middle').attr('dy','-0.2em')

    .attr('font-size',11).attr('font-weight',800).attr('fill','#333').text(total.toLocaleString());

  g.append('text').attr('text-anchor','middle').attr('dy','1.1em')

    .attr('font-size',8).attr('fill','#888').text('records');

  const leg=svg.append('g').attr('transform',`translate(${cx+r+14},${cy-36})`);

  pData.forEach((d,i)=>{

    const pct=((d.value/total)*100).toFixed(1);

    const row=leg.append('g').attr('transform',`translate(0,${i*26})`);

    row.append('rect').attr('width',10).attr('height',10).attr('rx',2).attr('fill',d.colour);

    row.append('text').attr('x',14).attr('y',9).attr('font-size',10).attr('fill','#333').text(d.label);

    row.append('text').attr('x',14).attr('y',20).attr('font-size',9).attr('fill','#666').text(`${pct}% (${d.value.toLocaleString()})`);

  });

}



function _dRenderDonutAll() {

  const el=document.getElementById('destPolarityDonut'); if (!el) return;

  const activeData = _dActiveData().filter(_dHasDisplayCount);

  if (!activeData.length) return;

  let pos=0,neu=0,neg=0;

  activeData.forEach(d=>{pos+=d.pos;neu+=d.neu;neg+=d.neg;});

  _dDrawDonut(el,pos,neu,neg);

}



/* ════════════════════════════════════════════════════════════════

   MAIN ENTRY

   ════════════════════════════════════════════════════════════════ */

function updateDestSentiment() {

  const el=document.getElementById('destSentimentMap');

  if (!el) return;



  /* Ensure WORLD geojson is loaded */

  const worldReady=(typeof WORLD!=='undefined'&&WORLD)

    ? Promise.resolve(WORLD)

    : (typeof loadWorld==='function' ? loadWorld() : Promise.resolve(null));



  Promise.all([worldReady, _dLoadWorldMap()]).then(([world,worldData])=>{

    if (!world) {

      /* Retry when WORLD arrives */

      if (typeof worldPromise!=='undefined'&&worldPromise)

        worldPromise.then(()=>updateDestSentiment());

      return;

    }

    if (!worldData||!worldData.length) return;



    const sourceMarkets = _dSelectedSourceMarkets();
    const sourceMarket = sourceMarkets.length === 1 ? sourceMarkets[0] : null;

    _dActiveSourceMarket = sourceMarkets.length === 1
      ? sourceMarkets[0]
      : (sourceMarkets.length ? `${sourceMarkets.length} selected source markets` : null);

    const autoGeo = _dDestinationGeoForSource(sourceMarket);

    if (sourceMarket && _dAutoSourceMarket !== sourceMarket) {

      _dSelCountry = autoGeo;

      _dAutoSourceMarket = sourceMarket;

    } else if (!sourceMarket && _dAutoSourceMarket) {

      _dSelCountry = null;

      _dAutoSourceMarket = null;

    }

    _dBuildSourceView(sourceMarkets).then(viewData => {

      _dViewData = sourceMarkets.length ? viewData : _dWorldData;

      _dDrawMap();

      _dRenderLegend();

      _dRenderInsightPanel();

      _dRefreshWaveChartsAll();

      _dRenderSourceTableAll();

      _dRenderDonutAll();

      if (_dSelCountry) _dSelectCountry(_dSelCountry);

    });

  });

}



/* ── Public API ─────────────────────────────────────────────────── */

window.renderDestination = function() { updateDestSentiment(); };

window._dSentClear = function() {
  _dAutoSourceMarket = null;
  _dActiveSourceMarket = null;
  _dViewData = _dWorldData;
  _dSelectCountry(null);
};
