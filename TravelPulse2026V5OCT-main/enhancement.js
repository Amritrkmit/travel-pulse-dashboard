
/* ================================================================
   TRAVEL PULSE ENHANCEMENT LAYER
   New charts: Q3 destination funnel, Q8a booking sequence waterfall,
   Q10a USD-normalised budget histogram, Q20 hotel star rating,
   Q4 trip nights donut, destination word cloud, future activities.
   All existing charts also re-sorted and max-axis fixed.
   ================================================================ */

/* ------ USD conversion rates (approximate 2026) ------ */
const USD_FX = {
  'Australia':0.63,'Bahrain':2.65,'Brazil':0.18,'Canada':0.73,'China':0.138,
  'Egypt':0.02,'France':1.08,'Germany':1.08,'India':0.012,'Indonesia':0.000063,
  'Italy':1.08,'Japan':0.0067,'Jordan':1.41,'Kenya':0.0077,'Malaysia':0.224,
  'Netherlands':1.08,'Nigeria':0.00062,'Qatar':0.274,'Russian Federation':0.011,
  'Saudi Arabia':0.267,'Singapore':0.743,'Korea, Republic of (South Korea)':0.00073,
  'Spain':1.08,'Switzerland':1.12,'Thailand':0.028,'Turkey':0.028,
  'United Arab Emirates':0.272,'United Kingdom':1.27,
  'United States of America':1.0,'South Africa':0.054,'Ireland':1.08
};

/* ------ Q3 Destination Funnel ------ */
function renderDestinationFunnel(sel) {
  const el = document.querySelector(sel); if (!el) return;
  const rows = activeRows();
  const stageLabels = [
    {key:'yet', label:'Not yet started', match:'yet to start'},
    {key:'research', label:'Researching', match:'researching'},
    {key:'planning', label:'Planning itinerary', match:'planning my itin'},
    {key:'arranging', label:'Making arrangements', match:'making travel'},
    {key:'booked', label:'Already booked', match:'already booked'}
  ];

  // Count top destinations
  const destCount = new Map();
  rows.forEach(r => {
    (Array.isArray(r.Q3) ? r.Q3 : []).forEach(dest => {
      const d = (dest||'').trim().replace(/\b\w/g,c=>c.toUpperCase());
      if (d.length > 1) destCount.set(d, (destCount.get(d)||0)+1);
    });
  });
  const topDests = [...destCount.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([d])=>d);

  // For each dest, get funnel
  const funnelData = topDests.map(dest => {
    const dr = rows.filter(r => Array.isArray(r.Q3) && r.Q3.some(x=>x&&x.toLowerCase().includes(dest.toLowerCase())));
    return {
      dest,
      total: dr.length,
      stages: stageLabels.map(s => ({
        label: s.label,
        pct: dr.length ? dr.filter(r=>r.planningStage&&r.planningStage.toLowerCase().includes(s.match)).length/dr.length : 0
      }))
    };
  });

  const stageColors = ['#3F3F3F','#230B54','#530095','#FF5635','#00B5AC'];
  const w = Math.max(500, el.offsetWidth||650), h = Math.max(320, topDests.length*38+80);
  const m = {t:16,r:16,b:60,l:130}, iw=w-m.l-m.r, ih=h-m.t-m.b;

  d3.select(sel).selectAll('*').remove();
  const svg = d3.select(sel).append('svg').attr('width',w).attr('height',h);
  const g = svg.append('g').attr('transform',`translate(${m.l},${m.t})`);

  const y = d3.scaleBand().domain(topDests).range([0,ih]).padding(0.28);
  const x = d3.scaleLinear().domain([0,1]).range([0,iw]);

  // Stacked bars
  funnelData.forEach(fd => {
    let xoff = 0;
    fd.stages.forEach((s,si) => {
      const bw = x(s.pct);
      g.append('rect')
        .attr('x',xoff).attr('y',y(fd.dest)).attr('width',Math.max(0,bw)).attr('height',y.bandwidth())
        .attr('fill',stageColors[si]).attr('rx',si===0?4:0)
        .on('mousemove',(e)=>showTip(e,{label:`${fd.dest} · ${s.label}`,value:s.pct},true))
        .on('mouseleave',hideTip);
      if (bw > 22) {
        g.append('text').attr('x',xoff+bw/2).attr('y',y(fd.dest)+y.bandwidth()/2+4)
          .attr('text-anchor','middle').attr('font-size',9).attr('fill','#fff').attr('font-weight',700)
          .text(d3.format('.0%')(s.pct));
      }
      xoff += bw;
    });
    // total label
    g.append('text').attr('x',-8).attr('y',y(fd.dest)+y.bandwidth()/2+4)
      .attr('text-anchor','end').attr('font-size',10).attr('fill','#354056')
      .text(`${fd.dest} (n=${fd.total})`);
  });

  // Legend
  const leg = svg.append('g').attr('transform',`translate(${m.l},${h-m.b+14})`);
  stageLabels.forEach((s,si) => {
    const lx = si*(iw/stageLabels.length);
    leg.append('rect').attr('x',lx).attr('y',0).attr('width',10).attr('height',10).attr('fill',stageColors[si]).attr('rx',2);
    leg.append('text').attr('x',lx+14).attr('y',9).attr('font-size',8).attr('fill','#6f637c').text(s.label);
  });

  g.append('g').attr('class','axis').attr('transform',`translate(0,${ih})`).call(d3.axisBottom(x).ticks(4).tickFormat(d3.format('.0%')));
}

/* ------ Q8a Booking Sequence Waterfall ------ */
function renderBookingSequence(sel) {
  const el = document.querySelector(sel); if (!el) return;
  const rows = activeRows();
  const items = ['Flights','Visa','Hotel / accommodation',
    'Local transport','Activities & tours','Travel insurance'];
  const shortItems = ['Flights','Visa','Hotel','Transport','Activities','Insurance'];

  const data = items.map((item,i) => {
    const ranks = rows.map(r=>Array.isArray(r.Q8a)&&r.Q8a[i]?r.Q8a[i]:null).filter(Boolean);
    return {
      label: shortItems[i],
      full: item,
      first: rows.length ? rows.filter(r=>Array.isArray(r.Q8a)&&r.Q8a[i]===1).length/rows.length : 0,
      avgRank: ranks.length ? ranks.reduce((a,b)=>a+b,0)/ranks.length : 0
    };
  });

  const w = Math.max(400, el.offsetWidth||600), h = 280;
  const m = {t:20,r:20,b:60,l:40}, iw=w-m.l-m.r, ih=h-m.t-m.b;
  d3.select(sel).selectAll('*').remove();
  const svg = d3.select(sel).append('svg').attr('width',w).attr('height',h);
  const g = svg.append('g').attr('transform',`translate(${m.l},${m.t})`);

  const x = d3.scaleBand().domain(data.map(d=>d.label)).range([0,iw]).padding(0.28);
  const maxFirst = d3.max(data,d=>d.first)||0.6;
  const y = d3.scaleLinear().domain([0,maxFirst*1.15]).range([ih,0]);

  g.append('g').attr('class','gridline').call(d3.axisLeft(y).ticks(4).tickSize(-iw).tickFormat('')).select('.domain').remove();

  g.selectAll('rect.bar').data(data).join('rect').attr('class','bar')
    .attr('x',d=>x(d.label)).attr('y',d=>y(d.first))
    .attr('width',x.bandwidth()).attr('height',d=>Math.max(0,ih-y(d.first))).attr('rx',4)
    .attr('fill',(d,i)=>i===0?'#530095':'#00B5AC')
    .on('mousemove',(e,d)=>showTip(e,{label:`${d.full} — first booked`,value:d.first},false))
    .on('mouseleave',hideTip);

  g.selectAll('text.val').data(data).join('text').attr('class','val')
    .attr('x',d=>x(d.label)+x.bandwidth()/2).attr('y',d=>Math.max(14,y(d.first)-5))
    .attr('text-anchor','middle').attr('font-size',10).attr('font-weight',800).attr('fill','#354056')
    .text(d=>fmt(d.first));

  // Avg rank line
  const y2 = d3.scaleLinear().domain([1,6]).range([0,ih]);
  const line = d3.line().x(d=>x(d.label)+x.bandwidth()/2).y(d=>y2(d.avgRank));
  g.append('path').datum(data).attr('d',line).attr('fill','none').attr('stroke','#FF5635').attr('stroke-width',2).attr('stroke-dasharray','4,3');
  g.selectAll('circle.avg').data(data).join('circle').attr('class','avg')
    .attr('cx',d=>x(d.label)+x.bandwidth()/2).attr('cy',d=>y2(d.avgRank)).attr('r',4)
    .attr('fill','#FF5635').attr('stroke','#fff').attr('stroke-width',1.5)
    .on('mousemove',(e,d)=>showTip(e,{label:`${d.full} — avg rank`,value:d.avgRank.toFixed(1)},true))
    .on('mouseleave',hideTip);

  const gx = g.append('g').attr('class','axis').attr('transform',`translate(0,${ih})`).call(d3.axisBottom(x).tickSize(0));
  gx.select('.domain').remove();
  g.append('g').attr('class','axis').call(d3.axisLeft(y).ticks(4).tickFormat(fmt));

  // Legend
  const leg = svg.append('g').attr('transform',`translate(${m.l},${h-14})`);
  leg.append('rect').attr('width',10).attr('height',10).attr('fill','#530095').attr('rx',2);
  leg.append('text').attr('x',14).attr('y',9).attr('font-size',9).attr('fill','#6f637c').text('% booked first');
  leg.append('line').attr('x1',110).attr('x2',122).attr('y1',5).attr('y2',5).attr('stroke','#FF5635').attr('stroke-width',2).attr('stroke-dasharray','4,3');
  leg.append('circle').attr('cx',116).attr('cy',5).attr('r',3).attr('fill','#FF5635');
  leg.append('text').attr('x',126).attr('y',9).attr('font-size',9).attr('fill','#6f637c').text('avg booking rank');
}

/* ------ Q10a USD Budget Histogram ------ */
function renderBudgetHistogram(sel) {
  const el = document.querySelector(sel); if (!el) return;
  const rows = activeRows();
  const budgets = rows.map(r => {
    const v = r.Q10a, rate = USD_FX[r.Market];
    if (!v || !rate) return null;
    const usd = v * rate;
    return (usd >= 100 && usd <= 100000) ? usd : null;
  }).filter(Boolean);

  if (!budgets.length) { d3.select(sel).html('<div class="empty-chart">No budget data.</div>'); return; }

  const bins = [
    {label:'<$500',lo:0,hi:500},{label:'$500–1k',lo:500,hi:1000},
    {label:'$1–2k',lo:1000,hi:2000},{label:'$2–3.5k',lo:2000,hi:3500},
    {label:'$3.5–5k',lo:3500,hi:5000},{label:'$5–7.5k',lo:5000,hi:7500},
    {label:'$7.5–10k',lo:7500,hi:10000},{label:'$10–20k',lo:10000,hi:20000},
    {label:'>$20k',lo:20000,hi:Infinity}
  ];
  const data = bins.map(b => ({label:b.label, value:budgets.filter(v=>v>=b.lo&&v<b.hi).length/budgets.length}));
  const mean = budgets.reduce((a,b)=>a+b,0)/budgets.length;
  const median = [...budgets].sort((a,b)=>a-b)[Math.floor(budgets.length/2)];

  const w = Math.max(400,el.offsetWidth||600), h = 240;
  const m = {t:24,r:16,b:44,l:46}, iw=w-m.l-m.r, ih=h-m.t-m.b;
  d3.select(sel).selectAll('*').remove();

  // Stats above chart
  const stats = d3.select(sel).append('div').style('display','flex').style('gap','16px').style('margin-bottom','8px');
  [{label:'Mean',val:`$${Math.round(mean).toLocaleString()}`},{label:'Median',val:`$${Math.round(median).toLocaleString()}`},{label:'n',val:budgets.length}].forEach(s=>{
    const c=stats.append('div').style('font-size','11px');
    c.append('span').style('color','#8a7e98').style('font-size','9px').text(s.label+' ');
    c.append('strong').style('color','#530095').text(s.val);
  });

  const svg = d3.select(sel).append('svg').attr('width',w).attr('height',h);
  const g = svg.append('g').attr('transform',`translate(${m.l},${m.t})`);
  const x = d3.scaleBand().domain(data.map(d=>d.label)).range([0,iw]).padding(0.2);
  const y = d3.scaleLinear().domain([0,d3.max(data,d=>d.value)*1.2]).range([ih,0]);

  g.append('g').attr('class','gridline').call(d3.axisLeft(y).ticks(4).tickSize(-iw).tickFormat('')).select('.domain').remove();
  g.selectAll('rect').data(data).join('rect')
    .attr('x',d=>x(d.label)).attr('y',d=>y(d.value))
    .attr('width',x.bandwidth()).attr('height',d=>Math.max(0,ih-y(d.value))).attr('rx',4)
    .attr('fill',(d,i)=>i===3||i===4?'#530095':'#00B5AC')
    .on('mousemove',(e,d)=>showTip(e,d)).on('mouseleave',hideTip);
  g.selectAll('text.val').data(data).join('text').attr('class','val')
    .attr('x',d=>x(d.label)+x.bandwidth()/2).attr('y',d=>Math.max(11,y(d.value)-4))
    .attr('text-anchor','middle').attr('font-size',9).attr('font-weight',800).attr('fill','#354056')
    .text(d=>d.value>0.02?fmt(d.value):'');
  const gx=g.append('g').attr('class','axis').attr('transform',`translate(0,${ih})`).call(d3.axisBottom(x).tickSize(0));
  gx.select('.domain').remove();
  gx.selectAll('text').attr('font-size',8.5);
  g.append('g').attr('class','axis').call(d3.axisLeft(y).ticks(4).tickFormat(fmt));
}

/* ------ Q20 Hotel Star Rating Donut ------ */
function renderHotelStarRating(sel) {
  const el = document.querySelector(sel); if (!el) return;
  const data = q('Q20').filter(d=>d.value>0.005&&!d.label.includes('apply')).sort((a,b)=>b.value-a.value);
  donut(sel, data, 'Star rating');
}

/* ------ Q4 Trip Nights ------ */
function renderTripNights(sel) {
  const el = document.querySelector(sel); if(!el) return;
  const data = q('Q4').filter(d=>d.value>0.005).sort((a,b)=>{
    const order=['1–2 nights','3–4 nights','5–6 nights','7–8 nights','9–10 nights','10+ nights'];
    return order.indexOf(a.label)-order.indexOf(b.label);
  });
  horizontalBars(sel, data, {height: Math.max(200, data.length*28+55)});
}

/* ------ Key Travel Associations Word Cloud ------ */
const TRAVEL_ASSOCIATION_RULES = [
  { match: /nature|landscapes|waterfall|lake|national park/i, words: ['Nature', 'Landscape', 'Waterfalls'], color: '#16a34a' },
  { match: /food|dining|cuisine|restaurant|nightlife/i, words: ['Food', 'Fine Dining', 'Nightlife'], color: '#530095' },
  { match: /beach|marine|snorkeling|sailing|coast/i, words: ['Beach', 'Marine', 'Coastal'], color: '#0284c7' },
  { match: /adventure|ziplin|skiing|snow|theme park/i, words: ['Adventure', 'Theme Parks', 'Snow Sports'], color: '#FF5635' },
  { match: /mountain|highland|hiking|cable car|scenic/i, words: ['Mountains', 'Hills', 'Hiking'], color: '#059669' },
  { match: /wildlife|safari|birdwatch/i, words: ['Wildlife', 'Safaris'], color: '#0d9488' },
  { match: /heritage|culture|monument|unesco|palace|histor/i, words: ['Culture', 'Heritage', 'History'], color: '#d97706' },
  { match: /wellness|spa|yoga|retreat|relax/i, words: ['Wellness', 'Relaxation', 'Spa'], color: '#7c3aed' },
  { match: /desert|camel|stargaz/i, words: ['Desert', 'Sunset', 'Stargazing'], color: '#ea580c' },
  { match: /art|music|festival|concert/i, words: ['Music Festivals', 'Art & Culture'], color: '#db2777' },
  { match: /family|friend|companion/i, words: ['Family', 'Friends'], color: '#2563eb' },
  { match: /luxury|cruise|yacht/i, words: ['Luxury Cruises', 'Resorts'], color: '#4f46e5' },
  { match: /agent|tour operator/i, words: ['Travel Agents'], color: '#d97706' }
];

/* ------ Authentic Word Cloud Engine (Horizontal & Vertical Packed) ------ */
/* ================================================================
   REPLACE the whole existing renderOrganicWordCloud(...) function in
   enhancement.js with this one (delete the old function including its
   spiral fallback). renderAssocWordCloud / renderDestWordCloud stay as-is
   except for the 2 small edits listed in the notes.
   Look: one huge centred word, dense interlocking layout, condensed bold
   UPPERCASE font, vertical words, blue -> green gradient (left to right).
   Filtering, tooltips and the selected-word highlight are preserved.
   ================================================================ */
function renderOrganicWordCloud(sel, items, options = {}) {
  const el = document.querySelector(sel); if (!el) return;
  if (!items || !items.length) {
    d3.select(sel).html('<div class="empty-chart" style="padding:40px;text-align:center;color:#8a7e98;">No data available for current selection.</div>');
    return;
  }
  if (!(window.d3 && d3.layout && typeof d3.layout.cloud === 'function')) {
    d3.select(sel).html('<div class="empty-chart" style="padding:40px;text-align:center;color:#8a7e98;">Word cloud library not loaded.</div>');
    return;
  }

  const FONT = "'Oswald','Bebas Neue','Arial Narrow',sans-serif";
  const w = Math.max(options.minWidth || 360, el.offsetWidth || 500);
  const h = Math.max(options.height || 0, 320);
  const layoutWidth=options.square?Math.min(w,h):w;
  const layoutHeight=options.square?layoutWidth:h;
  const token = (el.__wcToken = (el.__wcToken || 0) + 1);

  const sorted = [...items].sort((a, b) => b.count - a.count);
  const maxC = sorted[0].count || 1;
  const minC = sorted[sorted.length - 1].count || 1;
  const topLen = Math.max(4, String(sorted[0].text).length);
  const maxFont = Math.min(
    layoutHeight * (options.maxHeightRatio || 0.42),
    (layoutWidth * (options.maxWidthRatio || 0.55)) / (topLen * 0.45),
    options.maxFont || Infinity
  );
  const minFont = options.minFont || 11;
  const ratio = c => (maxC === minC ? 1 : Math.pow((c - minC) / (maxC - minC), 0.6));

  const gradient = d3.scaleLinear()
    .domain([0, 0.3, 0.55, 0.8, 1])
    .range(['#0a4f8f', '#0f72b8', '#1596c4', '#3fc39c', '#a6e22e'])
    .clamp(true);

  const isSel = d => typeof chartFilters !== 'undefined' && d.filterKey && chartFilters[d.filterKey] === d.orig;
  const hasSel = typeof chartFilters !== 'undefined' && sorted.some(it => it.filterKey && chartFilters[it.filterKey]);

  function tipFor(e, d) {
    if (!d.item.tip) return;
    const what = d.filterKey === 'Q3' ? 'destination' : 'experience';
    const action = isSel(d)
      ? '<div style="font-size:10px;color:#ffb21a;margin-top:4px;font-weight:700;">✓ Active Filter (Click to clear)</div>'
      : ``;
    showTip(e, { label: d.item.tip.label || d.orig, value: `${d.item.tip.value || ''}${action}` }, true);
  }

  function draw(placed, bounds) {
    if (el.__wcToken !== token) return;
    d3.select(sel).selectAll('*').remove();
    const svg = d3.select(sel).append('svg')
      .attr('width', w).attr('height', h).attr('viewBox', `0 0 ${w} ${h}`)
      .style('display', 'block').style('width', '100%').style('overflow', 'hidden');

    // Scale/centre the packed cloud so it fills the card
    // Bounds computed from the placed words themselves (d3-cloud's own
    // `bounds` argument is unreliable), so the cloud is truly centred.
    let k = 1, cx = 0, cy = 0;
    if (placed.length) {
      const x0 = d3.min(placed, d => d.x + d.x0), x1 = d3.max(placed, d => d.x + d.x1);
      const y0 = d3.min(placed, d => d.y + d.y0), y1 = d3.max(placed, d => d.y + d.y1);
      const bw = x1 - x0, bh = y1 - y0;
      if (bw > 0 && bh > 0) k = Math.min((layoutWidth - 24) / bw, (layoutHeight - 24) / bh, 1.25);
      cx = (x0 + x1) / 2;
      cy = (y0 + y1) / 2;
    }
    const g = svg.append('g').attr('transform', `translate(${w / 2},${h / 2}) scale(${k}) translate(${-cx},${-cy})`);

    const xs = placed.map(d => d.x);
    const xMin = d3.min(xs), xMax = d3.max(xs);
    const posColor = d => gradient(xMax === xMin ? 0.5 : (d.x - xMin) / (xMax - xMin));

    const groups = g.selectAll('g.wc').data(placed).enter().append('g')
      .attr('class', d => `word-cloud-tag word-tag-group wc ${isSel(d) ? 'is-selected' : ''}`)
      .attr('transform', d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
      .style('cursor', 'pointer')
      .style('opacity', d => (isSel(d) || !hasSel) ? 1 : 0.35);

    groups.each(function (d) {
      const grp = d3.select(this), sel_ = isSel(d);
      grp.append('text')
        .attr('text-anchor', 'middle')
        .style('font-family', FONT)
        .style('font-weight', 700)
        .style('font-size', `${d.size}px`)
        .style('fill', sel_ ? '#fff' : posColor(d))
        .text(d.text);
      if (sel_) {
        const bw = d.text.length * d.size * 0.5 + 16, bh = d.size * 1.2 + 8;
        grp.insert('rect', 'text')
          .attr('x', -bw / 2).attr('y', -bh * 0.72).attr('width', bw).attr('height', bh)
          .attr('rx', 6).attr('fill', d.color || posColor(d)).attr('stroke', d.color || posColor(d)).attr('stroke-width', 2.5);
      }
    });

    groups
      .on('mouseenter', function (e, d) { d3.select(this).style('opacity', 1); tipFor(e, d); })
      .on('mousemove', (e, d) => tipFor(e, d))
      .on('mouseleave', function (e, d) {
        if (!isSel(d) && hasSel) d3.select(this).style('opacity', 0.35);
        hideTip();
      })
      .on('click', (e, d) => {
        e.stopPropagation(); hideTip();
        if (d.filterKey && typeof toggleChartFilter === 'function') toggleChartFilter(d.filterKey, d.orig);
      });
  }

  function layoutTry(scale, attempt) {
    if (el.__wcToken !== token) return;
    const words = sorted.map((it, i) => ({
      item: it,
      orig: it.text,
      text: String(it.text).toUpperCase(),
      filterKey: it.filterKey,
      size: Math.max(9, (minFont + ratio(it.count) * (maxFont - minFont)) * scale),
      rotate: options.randomOrientation
        ? (Math.random() < (options.verticalRatio ?? 0.35) ? -90 : 0)
        : (i === 0 ? 0 : (i % 3 === 1 ? -90 : 0))
    }));
    const cloud=d3.layout.cloud()
      .size([layoutWidth - 10, layoutHeight - 10])
      .words(words)
      .padding(options.padding ?? 2)
      .spiral(options.spiral || 'rectangular')
      .rotate(d => options.horizontalOnly ? 0 : d.rotate)
      .font(FONT)
      .fontWeight(700)
      .fontSize(d => d.size);
    if(options.random)cloud.random(Math.random);
    cloud
      .on('end', (placed, bounds) => {
        if (placed.length < words.length && attempt < (options.maxAttempts ?? 10)) layoutTry(scale * 0.92, attempt + 1);
        else draw(placed, bounds);
      })
      .start();
  }

  // Make sure the condensed font is loaded before measuring text
  const start = () => layoutTry(1, 0);
  if (document.fonts && document.fonts.load) {
    document.fonts.load('700 40px Oswald').then(start, start);
  } else start();
}

/* ================================================================
   2 SMALL EDITS in enhancement.js
   1) renderAssocWordCloud:  .slice(0, 22)  ->  .slice(0, 40)
      renderDestWordCloud:   .slice(0, 30)  ->  .slice(0, 45)
      (more words = the dense look of the reference image)
   2) In both calls change the options to:
      renderOrganicWordCloud(sel, items, { height: 340, minFont: 11 });
   ================================================================ */

/* ================================================================
   3 EDITS in index.html
   a) Replace the Google Fonts <link> with (adds Oswald):
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@600;700;800&family=Oswald:wght@500;600;700&display=swap" rel="stylesheet">
   b) Change both cloud containers' min-height:
      <div id="assocWordCloud" class="chart" style="min-height:340px"></div>
      <div id="destWordCloud"  class="chart" style="min-height:340px"></div>
   c) Bump cache version so browsers reload the JS:
      <script defer src="enhancement.js?v=20260928_wordcloud_dense"></script>
   ================================================================ */
function renderAssocWordCloud(sel) {
  const rows = activeRows();
  if (!rows.length) {
    d3.select(sel).html('<div class="empty-chart" style="padding:40px;text-align:center;color:#8a7e98;">No travel associations data for current selection.</div>');
    return;
  }

  const wordCounts = {};
  const wordColors = {};

  rows.forEach(r => {
    // 1. Experiences & Activities (Q12 / experiences)
    const exps = Array.isArray(r.experiences) ? r.experiences : (Array.isArray(r.Q12) ? r.Q12 : [r.experiences || r.Q12]);
    exps.filter(Boolean).forEach(exp => {
      TRAVEL_ASSOCIATION_RULES.forEach(rule => {
        if (rule.match.test(exp)) {
          rule.words.forEach((w, idx) => {
            const weight = idx === 0 ? 3 : 1;
            wordCounts[w] = (wordCounts[w] || 0) + weight;
            if (!wordColors[w]) wordColors[w] = rule.color;
          });
        }
      });
    });

    // 2. Decision Factors (Q9 / decisionFactors) & Companions
    const decs = Array.isArray(r.decisionFactors) ? r.decisionFactors : (Array.isArray(r.Q9) ? r.Q9 : []);
    decs.filter(Boolean).forEach(dec => {
      if (/family/i.test(dec) || (r.Children && /yes/i.test(r.Children))) {
        wordCounts['Family'] = (wordCounts['Family'] || 0) + 2;
        wordColors['Family'] = '#2563eb';
      }
      if (/friend/i.test(dec)) {
        wordCounts['Friends'] = (wordCounts['Friends'] || 0) + 1;
        wordColors['Friends'] = '#2563eb';
      }
      if (/relax/i.test(dec)) {
        wordCounts['Relaxation'] = (wordCounts['Relaxation'] || 0) + 2;
        wordColors['Relaxation'] = '#7c3aed';
      }
      if (/culture|custom/i.test(dec)) {
        wordCounts['Culture'] = (wordCounts['Culture'] || 0) + 1;
        wordColors['Culture'] = '#d97706';
      }
    });

    if (r.Companion && /family|children|spouse/i.test(r.Companion)) {
      wordCounts['Family'] = (wordCounts['Family'] || 0) + 2;
      wordColors['Family'] = '#2563eb';
    }
    if (r.Companion && /friend/i.test(r.Companion)) {
      wordCounts['Friends'] = (wordCounts['Friends'] || 0) + 1;
      wordColors['Friends'] = '#2563eb';
    }

    if (r.bookingChannels && /agent|operator/i.test(r.bookingChannels)) {
      wordCounts['Travel Agents'] = (wordCounts['Travel Agents'] || 0) + 1;
      wordColors['Travel Agents'] = '#d97706';
    }
  });

  const entries = Object.entries(wordCounts).sort((a,b)=>b[1]-a[1]).slice(0, 22);
  const items = entries.map(([word, cnt]) => {
    const pct = Math.min(100, Math.round((cnt / (rows.length * 3)) * 100));
    return {
      text: word,
      count: cnt,
      filterKey: 'assocWord',
      color: wordColors[word] || '#452080',
      tip: { label: `Key Association: ${word}`, value: `${cnt} score points · ${pct}% respondents` }
    };
  });

  const selectedWord = typeof chartFilters !== "undefined" ? chartFilters?.assocWord : null;
  if (selectedWord && !items.some(it => it.text === selectedWord)) {
    items.unshift({
      text: selectedWord,
      count: rows.length,
      filterKey: 'assocWord',
      color: '#452080',
      tip: { label: `Key Association: ${selectedWord}`, value: `Active filter · ${rows.length} respondents` }
    });
  }

  renderOrganicWordCloud(sel, items, { height: 250, minFont: 13, maxFont: 38 });
}

/* ------ Key Destinations Word Cloud (Q3 Countries/Cities) ------ */
function renderDestWordCloud(sel) {
  const rows = activeRows();
  if (!rows.length) {
    d3.select(sel).html('<div class="empty-chart" style="padding:40px;text-align:center;color:#8a7e98;">No destination data for current selection.</div>');
    return;
  }
  const destCount = new Map();
  rows.forEach(r => {
    (Array.isArray(r.Q3) ? r.Q3 : [r.Q3]).forEach(dest => {
      const raw = String(dest || "").trim();
      if (!raw || raw === "Undecided") return;
      const d = typeof normalizeDest === "function" ? normalizeDest(raw) : raw;
      if (d && d.length > 1 && d !== "Undecided") {
        destCount.set(d, (destCount.get(d) || 0) + 1);
      }
    });
  });

  const entries = [...destCount.entries()].sort((a,b)=>b[1]-a[1]).slice(0, 30);
  const colors = ['#530095','#FF5635','#00B5AC','#EEFF3B','#9A1B15','#230B54','#3F3F3F'];
  const items = entries.map(([dest, cnt], i) => {
    const pct = Math.round((cnt / rows.length) * 100);
    return {
      text: dest,
      count: cnt,
      filterKey: 'Q3',
      color: colors[i % colors.length],
      tip: { label: `Destination: ${dest}`, value: `${cnt} respondents · ${pct}% share` }
    };
  });

  const selectedDest = typeof chartFilters !== "undefined" ? chartFilters?.Q3 : null;
  if (selectedDest && !items.some(it => it.text === selectedDest)) {
    items.unshift({
      text: selectedDest,
      count: rows.length,
      filterKey: 'Q3',
      color: colors[0],
      tip: { label: `Destination: ${selectedDest}`, value: `Active filter · ${rows.length} respondents` }
    });
  }

  renderOrganicWordCloud(sel, items, { height: 340, minFont: 12, maxFont: 36 });
}

/* ------ Future Activities Bar ------ */
function renderFutureActivities(sel) {
  const el = document.querySelector(sel); if (!el) return;
  const data = q('futureActivities').filter(d=>d.label!=='None of the above'&&d.value>0);
  horizontalBars(sel, data, {height: Math.max(200, data.length*30+55)});
}

/* ------ Q9a Experiences at destination ------ */
function renderDestExperiences(sel) {
  const el = document.querySelector(sel); if (!el) return;
  horizontalBars(sel, q('Q9a'), {height: Math.max(240, q('Q9a').length*28+55)});
}

/* ------ Q8b Package type ------ */
function renderPackageType(sel) {
  const el = document.querySelector(sel); if (!el) return;
  donut(sel, q('Q8b').filter(d=>d.value>0.005), 'Package');
}

/* ================================================================
   OVERRIDE RENDER FUNCTIONS with enhanced versions
   ================================================================ */

let socialThemeWordCloudToken=0;
function renderSocialThemeWordCloud(sel){
  const el=document.querySelector(sel);
  if(!el)return;
  const token=++socialThemeWordCloudToken;
  const marketSelection=filterSelections.Market||[];
  const regionSelection=filterSelections.Region||[];
  if(!(DATA?.socialRecords||[]).length){
    d3.select(el).html('<div class="empty-chart" style="padding:40px;text-align:center;color:#8a7e98;">Loading social themes…</div>');
  }
  const load=typeof loadSocialData==="function"?loadSocialData():Promise.resolve(DATA?.socialRecords||[]);
  Promise.resolve(load).then(()=>{
    if(token!==socialThemeWordCloudToken||currentTab!=="overview")return;
    const rows=(DATA?.socialRecords||[]).filter(record=>{
      if(clean(record.wave).toLowerCase()!=="wave 4")return false;
      const market=MARKET_ALIASES[clean(record.sourceMarket)]||clean(record.sourceMarket);
      const region=clean(record.region);
      return (!marketSelection.length||marketSelection.includes(market))
        &&(!regionSelection.length||regionSelection.includes(region));
    });
    const counts=new Map();
    rows.forEach(record=>{
      const themes=Array.isArray(record.themes)?record.themes:[record.themes];
      new Set(themes.map(clean).filter(Boolean)).forEach(theme=>counts.set(theme,(counts.get(theme)||0)+1));
    });
    const items=[...counts.entries()]
      .sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))
      .map(([theme,count])=>({
        text:theme,
        count,
        tip:{label:`Social theme: ${theme}`,value:`${count.toLocaleString()} mentions`}
      }));
    if(!items.length){
      d3.select(el).html('<div class="empty-chart" style="padding:40px;text-align:center;color:#8a7e98;">No social themes for the selected source markets.</div>');
      return;
    }
    renderOrganicWordCloud(sel,items,{
      height:340,
      minFont:32,
      maxFont:54,
      maxWidthRatio:1,
      maxHeightRatio:1,
      minWidth:300,
      padding:2,
      horizontalOnly:true,
      spiral:"archimedean",
      random:true,
      maxAttempts:30
    });
  }).catch(error=>{
    if(token!==socialThemeWordCloudToken)return;
    console.error("Social theme cloud error:",error);
    d3.select(el).html('<div class="empty-chart" style="padding:40px;text-align:center;color:#8a7e98;">Social themes could not be loaded.</div>');
  });
}

function renderQ2PlanningStage(sel){
  const el=document.querySelector(sel);
  if(!el)return;
  const stages=[
    {match:/yet to start planning/i,label:"Not started",color:"#530095"},
    {match:/researching destinations/i,label:"Researching",color:"#2563a6"},
    {match:/planning my itinerary/i,label:"Planning itinerary",color:"#00a6a0"},
    {match:/making travel arrangements/i,label:"Arranging travel",color:"#78bd45"},
    {match:/already booked/i,label:"Booked",color:"#f0a63a"}
  ];
  const counts=new Map();
  activeRows().forEach(record=>{
    const answer=clean(record.Q2||record.planningStage);
    if(answer)counts.set(answer,(counts.get(answer)||0)+1);
  });
  const items=stages.map(stage=>{
    const answer=[...counts.keys()].find(value=>stage.match.test(value));
    return answer?{...stage,answer,count:counts.get(answer)}:null;
  }).filter(Boolean)
    .sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label));
  const total=items.reduce((sum,item)=>sum+item.count,0);
  const root=d3.select(el);root.selectAll("*").remove();
  if(!items.length||!total){root.append("div").attr("class","empty-chart").text("No Q2 responses for the selected filters.");return;}
  const selected=chartFilters?.Q2;
  const table=root.append("div").attr("class","q2-stage-table");
  table.append("div").attr("class","q2-stage-table-head")
    .html("<span>Travel planning stage</span><span>Respondents</span><span>Share</span>");
  const rows=table.selectAll("button.q2-stage-row").data(items).join("button")
    .attr("type","button")
    .attr("class","q2-stage-row")
    .classed("is-selected",d=>selected===d.answer)
    .attr("title",d=>`${d.answer} · ${d.count.toLocaleString()} respondents · ${fmt(d.count/total)}`)
    .on("click",(event,d)=>{event.stopPropagation();surveyToggleFilter("Q2",d.answer);});
  const copy=rows.append("span").attr("class","q2-stage-copy");
  copy.append("strong").text(d=>d.label);
  copy.append("small").text(d=>`${d.count.toLocaleString()} respondents`);
  const tracks=rows.append("span").attr("class","q2-stage-track");
  tracks.append("span").attr("class","q2-stage-fill")
    .style("width",d=>`${d.count/total*100}%`)
    .style("background",d=>d.color);
  rows.append("strong").attr("class","q2-stage-share").text(d=>fmt(d.count/total));
}

function renderOverview(){
  renderGlobalMap('#overviewMap','source');
  renderMapInsight('#mapInsight','source');

  const market = filterSelections.Market?.length === 1 ? filterSelections.Market[0] : "All Markets";

  /* Update titles immediately */
  const destTitleEl = document.getElementById("destWordCloudTitle");
  if (destTitleEl) {
    const activeStage = typeof chartFilters !== "undefined" ? chartFilters?.Q2 : null;
    destTitleEl.textContent = activeStage
      ? `Travel Planning — ${market} (Filtered: ${activeStage})`
      : `Travel Planning — ${market}`;
  }
  const socialThemeTitle=document.getElementById("socialThemeWordCloudTitle");
  if(socialThemeTitle)socialThemeTitle.textContent=`Key Travel Associations — ${market}`;

  /* Defer word clouds — CPU-intensive layout runs after browser paints */
  const _schedWC = typeof requestIdleCallback !== "undefined" ? requestIdleCallback : (fn => setTimeout(fn, 50));
  _schedWC(() => renderQ2PlanningStage('#q2PlanningStageChart'), { timeout: 2000 });
  _schedWC(() => renderSocialThemeWordCloud('#socialThemeWordCloud'), { timeout: 2000 });

  /* Sentiment engine: recolour map + wave charts.
     180ms delay ensures the D3 map SVG paths are in the DOM. */
  setTimeout(() => {
    if (typeof updateOverviewSentiment === 'function') updateOverviewSentiment();
  }, 180);
}

function renderSentimentPulse(){
  const rows=activeRows();
  const scoreMix=field=>{
    const scores=rows.map(r=>Number(r[field])).filter(Number.isFinite);
    const total=scores.length;
    return {
      total,
      nps:total?scores.reduce((sum,v)=>sum+(v>=9?1:v<=6?-1:0),0)/total*100:0,
      promoters:total?scores.filter(v=>v>=9).length/total:0,
      passives:total?scores.filter(v=>v>=7&&v<=8).length/total:0,
      detractors:total?scores.filter(v=>v<=6).length/total:0
    };
  };
  const airline=scoreMix('airlineNPS'), hotel=scoreMix('hotelNPS');
  const spend=rows.length?rows.filter(r=>/^Will increase/i.test(clean(r.spendChange))).length/rows.length:0;
  const ai=rows.length?rows.filter(r=>/^(Extremely|Somewhat) likely$/i.test(clean(r.aiLikelihood))).length/rows.length:0;
  const kpis=[
    ['Airline NPS',`${Math.round(airline.nps)}`,'Q15a'],
    ['Hotel NPS',`${Math.round(hotel.nps)}`,'Q21a'],
    ['Spend increasing',fmt(spend),'Q10'],
    ['AI adoption',fmt(ai),'Q9b']
  ];
  const kpiRoot=document.querySelector('#sentimentPulseKpis');
  if(kpiRoot)kpiRoot.innerHTML=kpis.map((item,i)=>`<article class="sentiment-pulse-kpi sentiment-pulse-kpi-${i}"><span>${item[0]}</span><strong>${item[1]}</strong><small>${item[2]} · n=${rows.length.toLocaleString()}</small></article>`).join('');
  const chart=document.querySelector('#sentimentPulseChart');
  if(!chart)return;
  const groups=[{label:'Airline',...airline},{label:'Hotel',...hotel}];
  d3.select(chart).selectAll('*').remove();
  if(!rows.length){d3.select(chart).append('div').attr('class','empty-chart').text('No sentiment data for this selection.');return;}
  const width=Math.max(420,chart.clientWidth||720), height=190, margin={top:18,right:24,bottom:34,left:80}, innerWidth=width-margin.left-margin.right, innerHeight=height-margin.top-margin.bottom;
  const svg=d3.select(chart).append('svg').attr('width',width).attr('height',height);
  const g=svg.append('g').attr('transform',`translate(${margin.left},${margin.top})`);
  const x=d3.scaleLinear().domain([0,1]).range([0,innerWidth]), y=d3.scaleBand().domain(groups.map(d=>d.label)).range([0,innerHeight]).padding(.35), sub=d3.scaleBand().domain(['promoters','passives','detractors']).range([0,y.bandwidth()]).padding(.16);
  const colors={promoters:'#00B5AC',passives:'#EEFF3B',detractors:'#9A1B15'};
  g.append('g').attr('class','axis').call(d3.axisLeft(y).tickSize(0)).select('.domain').remove();
  groups.forEach(row=>['promoters','passives','detractors'].forEach(key=>{
    const barWidth=x(row[key]);
    const barY=y(row.label)+sub(key);
    g.append('rect').attr('x',0).attr('y',barY).attr('width',barWidth).attr('height',sub.bandwidth()).attr('fill',colors[key]).attr('rx',2)
      .on('mousemove',event=>showTip(event,{label:`${row.label} · ${key[0].toUpperCase()+key.slice(1)}`,value:`${fmt(row[key])} · n=${row.total}`},true))
      .on('mouseleave',hideTip);
    const labelAtEnd=barWidth>innerWidth-42;
    g.append('text').attr('class','sentiment-value').attr('x',labelAtEnd?innerWidth-4:barWidth+7).attr('y',barY+sub.bandwidth()/2+3)
      .attr('text-anchor',labelAtEnd?'end':'start').attr('font-size',9).attr('font-weight',800).attr('fill','#354056')
      .text(fmt(row[key]));
  }));
  g.append('g').attr('class','axis').attr('transform',`translate(0,${innerHeight})`).call(d3.axisBottom(x).ticks(5).tickFormat(fmt));
  const legend=svg.append('g').attr('transform',`translate(${margin.left},4)`);
  [['Promoters','promoters'],['Passives','passives'],['Detractors','detractors']].forEach(([label,key],i)=>{legend.append('rect').attr('x',i*92).attr('width',9).attr('height',9).attr('fill',colors[key]);legend.append('text').attr('x',i*92+13).attr('y',8).attr('font-size',8).attr('fill','#6f637c').text(label);});
}

function renderSocial(){
  const all=DATA?.socialRecords||[];
  const picker=document.querySelector('#socialWaveSelect');
  if(picker&&!picker.dataset.bound){picker.dataset.bound='1';picker.addEventListener('change',renderSocial);}
  const wave=picker?.value||'all';
  const rows=wave==='all'?all:all.filter(r=>clean(r.wave)===wave);
  const countBy=(field,limit=10)=>[...d3.rollup(rows,v=>v.length,r=>clean(r[field])).entries()]
    .filter(d=>d[0]).sort((a,b)=>b[1]-a[1]).slice(0,limit).map(d=>({label:d[0],value:d[1]/Math.max(1,rows.length)}));
  const sentiment=countBy('sentiment',3), positive=rows.filter(r=>clean(r.sentiment)==='Positive').length, negative=rows.filter(r=>clean(r.sentiment)==='Negative').length;
  const kpis=[['Social mentions',rows.length.toLocaleString(),'Brandwatch'],['Positive',fmt(positive/Math.max(1,rows.length)),'Sentiments'],['Neutral',fmt(rows.filter(r=>clean(r.sentiment)==='Neutral').length/Math.max(1,rows.length)),'Sentiments'],['Negative',fmt(negative/Math.max(1,rows.length)),'Sentiments']];
  const root=document.querySelector('#socialKpis');
  if(root)root.innerHTML=kpis.map((x,i)=>`<article class="social-kpi"><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[2]}</small></article>`).join('');
  d3.select('#socialInsight').text(`${rows.length.toLocaleString()} Brandwatch records · ${wave==='all'?'all waves':wave} · ${fmt((rows.length-negative)/Math.max(1,rows.length))} non-negative conversation`);
  horizontalBars('#socialSentimentChart',sentiment,{height:180,max:Math.max(.1,(sentiment[0]?.value||.1)*1.15)});
  horizontalBars('#socialThemeChart',countBy('themes'),{height:Math.max(230,countBy('themes').length*28+55),max:Math.max(.1,(countBy('themes')[0]?.value||.1)*1.15)});
  horizontalBars('#socialDestinationChart',countBy('destination'),{height:Math.max(230,countBy('destination').length*28+55),max:Math.max(.1,(countBy('destination')[0]?.value||.1)*1.15)});
  horizontalBars('#socialMarketChart',countBy('sourceMarket'),{height:Math.max(230,countBy('sourceMarket').length*28+55),max:Math.max(.1,(countBy('sourceMarket')[0]?.value||.1)*1.15)});
  renderSocialWaveChart(rows);
}

function renderSocialWaveChart(activeRows){
  const el=document.querySelector('#socialWaveChart'); if(!el)return;
  const source=DATA?.socialRecords||[], waves=[...new Set(source.map(r=>clean(r.wave)).filter(Boolean))].sort();
  const values=waves.map(w=>{const rows=source.filter(r=>clean(r.wave)===w), total=rows.length||1;return {wave:w,Positive:rows.filter(r=>clean(r.sentiment)==='Positive').length/total,Neutral:rows.filter(r=>clean(r.sentiment)==='Neutral').length/total,Negative:rows.filter(r=>clean(r.sentiment)==='Negative').length/total};});
  const width=Math.max(420,el.clientWidth||650),height=210,margin={top:20,right:18,bottom:42,left:60},iw=width-margin.left-margin.right,ih=height-margin.top-margin.bottom;
  d3.select(el).selectAll('*').remove(); const svg=d3.select(el).append('svg').attr('width',width).attr('height',height),g=svg.append('g').attr('transform',`translate(${margin.left},${margin.top})`);
  const x=d3.scaleBand().domain(waves).range([0,iw]).padding(.25),y=d3.scaleLinear().domain([0,1]).range([ih,0]),colors={Positive:'#00B5AC',Neutral:'#EEFF3B',Negative:'#9A1B15'};
  g.append('g').attr('class','axis').attr('transform',`translate(0,${ih})`).call(d3.axisBottom(x)); g.append('g').attr('class','axis').call(d3.axisLeft(y).ticks(4).tickFormat(fmt));
  values.forEach(row=>{let offset=0;['Positive','Neutral','Negative'].forEach(key=>{const h=row[key];g.append('rect').attr('x',x(row.wave)).attr('y',y(offset+h)).attr('width',x.bandwidth()).attr('height',y(offset)-y(offset+h)).attr('fill',colors[key]);offset+=h;});});
  const legend=svg.append('g').attr('transform',`translate(${margin.left},5)`);['Positive','Neutral','Negative'].forEach((key,i)=>{legend.append('rect').attr('x',i*78).attr('width',9).attr('height',9).attr('fill',colors[key]);legend.append('text').attr('x',i*78+13).attr('y',8).attr('font-size',8).attr('fill','#6f637c').text(key);});
}

function renderAirline(){
  if (typeof window.renderAirlineComprehensive === 'function') {
    window.renderAirlineComprehensive();
  } else if (typeof window.renderAirlineApp === 'function') {
    window.renderAirlineApp();
  }
}

function renderHotel(){
  if (typeof window.renderHotelComprehensive === 'function') {
    window.renderHotelComprehensive();
  } else {
    renderHotelInsight();
  }
}

function renderDestination(){
  /* Delegate to dest-sentiment-engine.js which owns the Destination POV tab */
  if (typeof updateDestSentiment === 'function') {
    updateDestSentiment();
  } else if (typeof window.renderDestinationComprehensive === 'function') {
    window.renderDestinationComprehensive();
  }
}

function renderNpsMix(sel,field,scoreField,label){
  const picker=document.querySelector(`#${sel.slice(1)}Type`);
  if(picker&&!picker.dataset.bound){picker.dataset.bound='1';picker.addEventListener('change',()=>renderNpsMix(sel,field,scoreField,label));}
  renderNpsMixChart(sel,field,scoreField,label,picker?.value||'grouped');
}

function renderNpsMixChart(sel,field,scoreField,label,mode){
  const el=document.querySelector(sel); if(!el)return;
  const groups=new Map();
  activeRows().forEach(r=>{
    const name=clean(r[field]), score=Number(r[scoreField]);
    if(!name||!Number.isFinite(score))return;
    const item=groups.get(name)||{label:name,promoters:0,passives:0,detractors:0,total:0};
    if(score>=9)item.promoters++; else if(score>=7)item.passives++; else item.detractors++;
    item.total++; groups.set(name,item);
  });
  const rows=[...groups.values()].sort((a,b)=>b.total-a.total).slice(0,10);
  d3.select(sel).selectAll('*').remove();
  if(!rows.length){d3.select(sel).append('div').attr('class','empty-chart').text('No comparison data for this selection.');return;}
  if(mode==='pie'){
    const totals=['promoters','passives','detractors'].map(key=>({label:key[0].toUpperCase()+key.slice(1),value:rows.reduce((n,r)=>n+r[key],0)}));
    donut(sel,totals,`${label} sentiment`); return;
  }
  if(mode==='line'){drawComparisonLine(sel,rows,d=>((d.promoters-d.detractors)/d.total*100),`${label} NPS`);return;}
  const width=Math.max(560,el.clientWidth||700), rowHeight=30, height=rows.length*rowHeight+42, margin={top:22,right:48,bottom:20,left:175};
  const innerWidth=width-margin.left-margin.right;
  const svg=d3.select(sel).append('svg').attr('width',width).attr('height',height);
  const g=svg.append('g').attr('transform',`translate(${margin.left},${margin.top})`);
  const y=d3.scaleBand().domain(rows.map(d=>d.label)).range([0,rows.length*rowHeight]).padding(.25);
  const sub=d3.scaleBand().domain(['promoters','passives','detractors']).range([0,y.bandwidth()]).padding(.18);
  const x=d3.scaleLinear().domain([0,1]).range([0,innerWidth]);
  g.append('g').attr('class','axis').call(d3.axisLeft(y).tickSize(0)).select('.domain').remove();
  rows.forEach(row=>{if(mode==='stacked'){let offset=0;[['promoters','#4eae68','Promoters'],['passives','#ffb21a','Passives'],['detractors','#ef476f','Detractors']].forEach(([key,color,title])=>{const pct=row[key]/row.total;g.append('rect').attr('x',x(offset)).attr('y',y(row.label)+y.bandwidth()*.2).attr('width',x(pct)).attr('height',y.bandwidth()*.6).attr('fill',color).attr('rx',2).on('mousemove',e=>showTip(e,{label:`${row.label} · ${title}`,value:`${fmt(pct)} · n=${row.total}`},true)).on('mouseleave',hideTip);offset+=pct;});}else{[['promoters','#4eae68','Promoters'],['passives','#ffb21a','Passives'],['detractors','#ef476f','Detractors']].forEach(([key,color,title])=>{const pct=row[key]/row.total;g.append('rect').attr('x',0).attr('y',y(row.label)+sub(key)).attr('width',x(pct)).attr('height',sub.bandwidth()).attr('fill',color).attr('rx',2).on('mousemove',e=>showTip(e,{label:`${row.label} · ${title}`,value:`${fmt(pct)} · n=${row.total}`},true)).on('mouseleave',hideTip);});}g.append('text').attr('x',Math.min(innerWidth+4,x(1)+4)).attr('y',y(row.label)+y.bandwidth()/2+4).attr('font-size',9).attr('font-weight',800).attr('fill','#452080').text(`n=${row.total}`);});
  const legend=svg.append('g').attr('transform',`translate(${margin.left},8)`);
  [['Promoters','#4eae68'],['Passives','#ffb21a'],['Detractors','#ef476f']].forEach(([text,color],i)=>{legend.append('rect').attr('x',i*92).attr('width',9).attr('height',9).attr('fill',color);legend.append('text').attr('x',i*92+13).attr('y',8).attr('font-size',8).attr('fill','#6f637c').text(text);});
}

function drawComparisonLine(sel,rows,valueFor,label){
  const el=document.querySelector(sel); if(!el)return;
  d3.select(sel).selectAll('*').remove();
  const width=Math.max(560,el.clientWidth||700),height=260,margin={top:28,right:45,bottom:55,left:48};
  const svg=d3.select(sel).append('svg').attr('width',width).attr('height',height);
  const g=svg.append('g').attr('transform',`translate(${margin.left},${margin.top})`),iw=width-margin.left-margin.right,ih=height-margin.top-margin.bottom;
  const values=rows.map(valueFor),x=d3.scalePoint().domain(rows.map(d=>d.label)).range([0,iw]).padding(.4),y=d3.scaleLinear().domain([d3.min(values.concat([0]))-5,d3.max(values.concat([0]))+5]).range([ih,0]);
  g.append('g').attr('class','gridline').call(d3.axisLeft(y).ticks(5).tickSize(-iw).tickFormat('')).select('.domain').remove();
  g.append('path').datum(rows).attr('fill','none').attr('stroke','#452080').attr('stroke-width',2.5).attr('d',d3.line().x(d=>x(d.label)).y(d=>y(valueFor(d))));
  g.selectAll('circle').data(rows).join('circle').attr('cx',d=>x(d.label)).attr('cy',d=>y(valueFor(d))).attr('r',5).attr('fill','#ff7f2a').attr('stroke','#fff').attr('stroke-width',2).on('mousemove',(e,d)=>showTip(e,{label:`${d.label} · ${label}`,value:`${d3.format('.0f')(valueFor(d))} · n=${d.total||'—'}`},true)).on('mouseleave',hideTip);
  g.append('g').attr('class','axis').call(d3.axisLeft(y).ticks(5).tickFormat(d=>`${d}%`)).select('.domain').remove();
  const xAxis=g.append('g').attr('class','axis').attr('transform',`translate(0,${ih})`).call(d3.axisBottom(x).tickSize(0));xAxis.select('.domain').remove();xAxis.selectAll('text').attr('transform','rotate(-35)').attr('text-anchor','end').attr('font-size',8);
}

function renderDestinationStageMix(top,rows){
  const picker=document.querySelector('#destinationStageMixType');
  if(picker&&!picker.dataset.bound){picker.dataset.bound='1';picker.addEventListener('change',()=>renderDestinationStageMix(top,rows));}
  const mode=picker?.value||'grouped';
  const el=document.querySelector('#destinationStageMix'); if(!el)return;
  const data=top.slice(0,8).map(dest=>{
    const matching=rows.filter(r=>Array.isArray(r.Q3)&&r.Q3.some(x=>clean(x).toLowerCase()===dest.label.toLowerCase()));
    const counts={research:0,planning:0,arranged:0,booked:0};
    matching.forEach(r=>{const stage=clean(r.planningStage).toLowerCase();if(stage.includes('booked'))counts.booked++;else if(stage.includes('arrangement'))counts.arranged++;else if(stage.includes('planning')||stage.includes('itinerary'))counts.planning++;else counts.research++;});
    return {label:dest.label,total:matching.length,...counts};
  }).filter(d=>d.total);
  d3.select('#destinationStageMix').selectAll('*').remove();
  if(!data.length){d3.select('#destinationStageMix').append('div').attr('class','empty-chart').text('No planning-stage data for this selection.');return;}
  if(mode==='pie'){
    donut('#destinationStageMix',['research','planning','arranged','booked'].map(key=>({label:key[0].toUpperCase()+key.slice(1),value:data.reduce((n,r)=>n+r[key],0)})),'Planning stage'); return;
  }
  if(mode==='line'){drawComparisonLine('#destinationStageMix',data,d=>d.booked/d.total*100,'Booked readiness');return;}
  const rowHeight=34;
  const labelWidth=Math.max(110,Math.min(155,(d3.max(data,d=>String(d.label||'').length)||0)*5.2+14));
  const width=Math.max(460,el.clientWidth||700), height=data.length*rowHeight+42, margin={top:22,right:48,bottom:20,left:labelWidth}, innerWidth=width-margin.left-margin.right;
  const svg=d3.select('#destinationStageMix').append('svg').attr('width',width).attr('height',height),g=svg.append('g').attr('transform',`translate(${margin.left},${margin.top})`);
  const y=d3.scaleBand().domain(data.map(d=>d.label)).range([0,data.length*rowHeight]).padding(.2),x=d3.scaleLinear().domain([0,1]).range([0,innerWidth]);
  g.append('g').attr('class','axis').call(d3.axisLeft(y).tickSize(0)).select('.domain').remove();
  const sub=d3.scaleBand().domain(['research','planning','arranged','booked']).range([0,y.bandwidth()]).padding(.1);
  const stages=[['research','#9b8dc1','Researching'],['planning','#452080','Planning'],['arranged','#ffb21a','Arrangements'],['booked','#4eae68','Booked']];
  data.forEach(row=>{if(mode==='stacked'){let offset=0;stages.forEach(([key,color,title])=>{const pct=row[key]/row.total;g.append('rect').attr('x',x(offset)).attr('y',y(row.label)+y.bandwidth()*.2).attr('width',x(pct)).attr('height',y.bandwidth()*.6).attr('fill',color).attr('rx',2).on('mousemove',e=>showTip(e,{label:`${row.label} · ${title}`,value:`${fmt(pct)} · n=${row.total}`},true)).on('mouseleave',hideTip);offset+=pct;});g.append('text').attr('class','stage-value').attr('x',innerWidth+8).attr('y',y(row.label)+y.bandwidth()/2+3).attr('font-size',8.5).attr('font-weight',800).attr('fill','#354056').text(fmt(row.booked/row.total));}else{stages.forEach(([key,color,title])=>{const pct=row[key]/row.total;g.append('rect').attr('x',0).attr('y',y(row.label)+sub(key)).attr('width',x(pct)).attr('height',sub.bandwidth()).attr('fill',color).attr('rx',2).on('mousemove',e=>showTip(e,{label:`${row.label} · ${title}`,value:`${fmt(pct)} · n=${row.total}`},true)).on('mouseleave',hideTip);g.append('text').attr('class','stage-value').attr('x',Math.min(innerWidth-4,x(pct)+6)).attr('y',y(row.label)+sub(key)+sub.bandwidth()/2+3).attr('text-anchor',x(pct)>innerWidth-34?'end':'start').attr('font-size',8.5).attr('font-weight',800).attr('fill','#354056').text(fmt(pct));});}});
  [['Researching','#9b8dc1'],['Planning','#452080'],['Arrangements','#ffb21a'],['Booked','#4eae68']].forEach(([text,color],i)=>{svg.append('rect').attr('x',margin.left+i*105).attr('y',8).attr('width',9).attr('height',9).attr('fill',color);svg.append('text').attr('x',margin.left+i*105+13).attr('y',16).attr('font-size',8).attr('fill','#6f637c').text(text);});
}

/* ================================================================
   GAP FIXES — Q11/Q11a spend strategies, Q16b loyalty features,
   TT traveller-type KPI tiles
   ================================================================ */

/* ------ TT Traveller-Type KPI tile ------ */
function renderTTKpi(sel, ttType, label) {
  const el = document.querySelector(sel); if (!el) return;
  const rows = activeRows();
  const total = rows.length || 1;
  const count = rows.filter(r => r['Trip Type'] === ttType).length;
  const pct = count / total;
  const colors = { LEISURE: '#530095', BUSINESS: '#FF5635', BLEISURE: '#00B5AC' };
  const color = colors[ttType] || '#530095';

  el.innerHTML = '';
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;height:90px;gap:4px;';
  div.innerHTML = `
    <div style="font-size:32px;font-weight:800;font-family:Manrope,sans-serif;color:${color};line-height:1">${d3.format('.1%')(pct)}</div>
    <div style="font-size:9px;color:#8a7e98;font-weight:700;text-transform:uppercase;letter-spacing:.05em">${count.toLocaleString()} of ${total.toLocaleString()} respondents</div>
    <div style="width:100%;max-width:120px;height:4px;background:#eee8f7;border-radius:2px;overflow:hidden;">
      <div style="height:100%;border-radius:2px;background:${color};width:${(pct*100).toFixed(1)}%"></div>
    </div>`;
  el.appendChild(div);
}

/* ------ Q11a Spend Increase strategies ------ */
function renderSpendIncrease(sel) {
  const el = document.querySelector(sel); if (!el) return;
  const rows = activeRows().filter(r => String(r.spendChange || '').startsWith('Will increase'));
  const base = rows.length;
  if (!base) { d3.select(sel).html('<div class="empty-chart">No respondents planning to increase spend in current filter.</div>'); return; }
  const def = DATA.questions['Q11a'];
  if (!def) return;
  const data = (def.items || []).map(it => ({
    label: it.label,
    value: rows.filter(r => Array.isArray(r['Q11a']) && r['Q11a'].includes(it.label)).length / base
  })).filter(d => d.value > 0 && !d.label.toLowerCase().startsWith('other'));
  data.sort((a, b) => b.value - a.value);
  // Add base note
  d3.select(sel).append('div')
    .style('font-size','9px').style('color','#8a7e98').style('padding','4px 6px')
    .text(`Base: ${base.toLocaleString()} respondents planning to increase spend`);
  horizontalBars(sel, data, { height: Math.max(300, data.length * 28 + 55) });
}

/* ------ Q11 Spend Reduction strategies ------ */
function renderSpendDecrease(sel) {
  const el = document.querySelector(sel); if (!el) return;
  const rows = activeRows().filter(r => String(r.spendChange || '').toLowerCase().includes('decrease'));
  const base = rows.length;
  if (!base) {
    d3.select(sel).html('<div class="empty-chart" style="padding:20px;text-align:center;font-size:10px;color:#8a7e98;">No respondents planning to decrease spend in current filter.<br><small>This question is conditional on Q10 = "Will decrease"</small></div>');
    return;
  }
  const def = DATA.questions['Q11'];
  if (!def) return;
  const data = (def.items || []).map(it => ({
    label: it.label,
    value: rows.filter(r => Array.isArray(r['Q11']) && r['Q11'].includes(it.label)).length / base
  })).filter(d => d.value > 0 && !d.label.toLowerCase().startsWith('other'));
  data.sort((a, b) => b.value - a.value);
  d3.select(sel).append('div')
    .style('font-size','9px').style('color','#8a7e98').style('padding','4px 6px')
    .text(`Base: ${base.toLocaleString()} respondents planning to decrease spend`);
  horizontalBars(sel, data, { height: Math.max(200, data.length * 28 + 55) });
}

/* ------ Q16b Airline Loyalty Features ------ */
function renderAirlineLoyaltyFeatures(sel) {
  const el = document.querySelector(sel); if (!el) return;
  const data = q('airlineLoyaltyFeatures')
    .filter(d => d.value > 0 && !d.label.toLowerCase().startsWith('other'))
    .sort((a, b) => b.value - a.value);
  horizontalBars(sel, data, { height: Math.max(280, data.length * 28 + 55) });
}

/* === Gap fixes called from existing render functions === */



/* ================================================================
   Q10 + Q3 INTERACTION FIXES
   - Q10 composite bars now filter against the real Q10 answers.
   - Q3 destination funnel is clickable by destination.
   - Funnel tooltips always show percentages.
   - Clicking a selected item again clears that chart filter.
   ================================================================ */

/* Helper to accurately match records for Key Travel Association words */
function matchAssocWord(r, label) {
  if (!r || !label) return false;
  const word = String(label).trim();
  const wordLower = word.toLowerCase();

  // 1. Check TRAVEL_ASSOCIATION_RULES
  const matchedRule = (typeof TRAVEL_ASSOCIATION_RULES !== "undefined" ? TRAVEL_ASSOCIATION_RULES : []).find(rule => 
    rule.words.some(w => w.toLowerCase() === wordLower)
  );

  const exps = Array.isArray(r.experiences) ? r.experiences : (Array.isArray(r.Q12) ? r.Q12 : [r.experiences || r.Q12]);
  const expMatches = matchedRule ? exps.some(exp => exp && matchedRule.match.test(exp)) : false;
  if (expMatches) return true;

  // 2. Specific word rules matching how words are added in renderAssocWordCloud
  const decs = Array.isArray(r.decisionFactors) ? r.decisionFactors : (Array.isArray(r.Q9) ? r.Q9 : [r.decisionFactors || r.Q9]);
  const companion = String(r.Companion || r.travelCompanions || "");
  const booking = String(r.bookingChannels || "");
  const children = String(r.Children || "");

  if (wordLower === "family") {
    if (decs.some(d => d && /family/i.test(d))) return true;
    if (/yes/i.test(children)) return true;
    if (/family|children|spouse|child/i.test(companion)) return true;
  }
  if (wordLower === "friends" || wordLower === "friend") {
    if (decs.some(d => d && /friend/i.test(d))) return true;
    if (/friend/i.test(companion)) return true;
  }
  if (wordLower === "relaxation" || wordLower === "relax" || wordLower === "wellness" || wordLower === "spa") {
    if (decs.some(d => d && /relax|wellness|spa/i.test(d))) return true;
  }
  if (wordLower === "culture" || wordLower === "heritage" || wordLower === "history") {
    if (decs.some(d => d && /culture|custom|heritage|history/i.test(d))) return true;
  }
  if (wordLower === "travel agents" || wordLower === "agent" || wordLower === "travel agent") {
    if (/agent|operator|agency/i.test(booking)) return true;
  }

  // 3. Fallback: text search across all relevant attributes
  const allText = [...exps, ...decs, companion, booking, children].filter(Boolean).join(" ").toLowerCase();
  return allText.includes(wordLower);
}

/* Q10 uses display labels (Increase/Same/Decrease/Unsure), while the
   underlying records contain the full Q10 answer text. */
function questionMatches(r, key, label) {
  if (key === "spendChange") {
    const v = String(r?.spendChange ?? "").trim().toLowerCase();
    const l = String(label ?? "").trim().toLowerCase();

    if (l === "increase") return v.startsWith("will increase");
    if (l === "same") return v.includes("remain the same");
    if (l === "decrease") return v.startsWith("will decrease");
    if (l === "unsure") return v.includes("can’t say") || v.includes("can't say");

    return v === l;
  }

  /* Q3 is free-text / multi-value. Match destination case-insensitively & normalized. */
  if (key === "Q3" || key === "Q3a") {
    const wanted = String(label ?? "").trim().toLowerCase();
    if (!wanted) return false;
    const normWanted = typeof normalizeDest === "function" ? normalizeDest(label).toLowerCase() : wanted;
    const arr = Array.isArray(r?.Q3) ? r.Q3 : (r?.Q3 ? [r.Q3] : []);
    return arr.some(v => {
      const s = String(v ?? "").trim().toLowerCase();
      const normV = typeof normalizeDest === "function" ? normalizeDest(v).toLowerCase() : s;
      return s === wanted || normV === normWanted || normV === wanted || s === normWanted || s.includes(wanted) || wanted.includes(s);
    });
  }

  /* Key Travel Associations word cloud filter */
  if (key === "assocWord") {
    return matchAssocWord(r, label);
  }

  /* Preserve the existing application's matching rules for everything else. */
  if (key === "Q18" || key === "Q24") return matrixRowMatches(r, key, label);
  if (key === "Q8a") {
    const def = surveyDefinition(key);
    const idx = (def?.items || []).findIndex(it => clean(it.label) === clean(label));
    return idx >= 0 && Array.isArray(r[key]) && Number(r[key][idx]) === 1;
  }
  if (key === "Q10a") return Number(r[key]) === Number(label);
  if (key === "Age Group") {
    return label === "25–44"
      ? ["25-34", "35-44"].includes(r["Age Group"])
      : clean(r["Age Group"]) === clean(label);
  }
  if (key === "Region") {
    return clean(r.Region) === clean(label) || clean(shortRegion(r.Region)) === clean(label);
  }
  if (key === "aiLikelihood" && label === "Top 2 Box") {
    return ["Extremely likely", "Somewhat likely"].includes(clean(r[key]));
  }
  if (key === "aiLikelihood" && label === "Bottom 2 Box") {
    return ["Somewhat unlikely", "Extremely unlikely"].includes(clean(r[key]));
  }
  if (key === "airlineLoyaltyImportance" || key === "hotelLoyaltyImportance") {
    if (label === "NET : Top 2 Box")
      return ["Extremely important", "Very important"].includes(clean(r[key]));
    if (label === "NET : Bottom 2 Box")
      return ["Slightly important", "Not at all important"].includes(clean(r[key]));
  }

  const v = r[key];
  if (Array.isArray(v)) {
    return v.some(item => clean(item) === clean(label) || String(item).toLowerCase() === String(label).toLowerCase());
  }

  if (key === "airlineNPS" || key === "hotelNPS" || key === "Q15a" || key === "Q21a") {
    if (label === "NPS Score") return Number.isFinite(Number(v));
    const n = Number(String(label).match(/\d+/)?.[0]);
    return Number(v) === n;
  }

  return clean(v) === clean(label);
}

/* Add Q3 and assocWord to the common chart-filter registry. */
function chartFilterKey(sel) {
  const el = document.querySelector(sel);
  if (el?.dataset?.surveyKey) return el.dataset.surveyKey;

  const id = String(sel).replace(/^#/, "");
  const map = {
    planningChart:"planningStage",
    purposeChart:"tripPurpose",
    timingChart:"tripTiming",
    spendChart:"spendChange",
    infoChart:"infoChannels",
    companionChart:"travelCompanions",
    bookingChart:"bookingChannels",
    decisionList:"decisionFactors",
    experienceChart:"experiences",
    leadTimeChart:"planningLeadTime",
    aiTasksChart:"aiTasks",
    carrierChart:"airlineCarrier",
    airlineConsiderChart:"airlineConsiderations",
    cabinChart:"cabinClass",
    airlineLoyaltyChart:"airlineLoyaltyImportance",
    airlineStrategyChart:"airlineStrategies",
    stayChart:"accommodation",
    hotelConsiderChart:"hotelConsiderations",
    hotelLoyaltyChart:"hotelLoyaltyImportance",
    hotelStrategyChart:"hotelStrategies",
    hotelFeaturesChart:"hotelLoyaltyFeatures",
    hotelBrandChart:"hotelBrand",
    regionSpendBar:"Region",
    regionResearchBar:"Region",
    ageLine:"Age Group",
    destFunnelChart:"Q3",
    destinationIntentChart:"Q3",
    destWordCloud:"Q3",
    assocWordCloud:"assocWord"
  };
  return map[id] || null;
}

/* Enhanced Segment Base display that explicitly lists any active chart filter */
function updateSegmentBase() {
  const rows = typeof activeRows === "function" ? activeRows() : [];
  const cfKeys = typeof chartFilters !== "undefined" ? Object.keys(chartFilters) : [];
  let filterSuffix = "";
  if (cfKeys.length > 0) {
    const parts = cfKeys.map(k => {
      const val = chartFilters[k];
      if (k === "assocWord") return `Association: ${val}`;
      if (k === "Q3" || k === "Q3a") return `Destination: ${val}`;
      return `${val}`;
    });
    filterSuffix = ` · Filtered by ${parts.join(", ")}`;
  }
  d3.select("#segmentBase").text(`${rows.length.toLocaleString()} respondents${filterSuffix}`);
  const hasFilters = (typeof filterSelections !== "undefined" && Object.values(filterSelections).some(v => v && v.length)) || (typeof chartFilters !== "undefined" && Object.keys(chartFilters).length);
  d3.select("#chipClear").attr("hidden", hasFilters ? null : true);
}

/* Q3 funnel: destination click + percentage tooltips. */
function renderDestinationFunnel(sel) {
  const el = document.querySelector(sel);
  if (!el) return;

  const rows = activeRows();
  const selected = chartFilters?.Q3 || null;

  const stageLabels = [
    {key:'yet',       label:'Not yet started',    match:'yet to start'},
    {key:'research',  label:'Researching',        match:'researching'},
    {key:'planning',  label:'Planning itinerary', match:'planning my itin'},
    {key:'arranging', label:'Making arrangements',match:'making travel'},
    {key:'booked',    label:'Already booked',     match:'already booked'}
  ];

  const destCount = new Map();
  rows.forEach(r => {
    (Array.isArray(r.Q3) ? r.Q3 : []).forEach(dest => {
      const raw = String(dest ?? "").trim();
      const d = raw.replace(/\b\w/g, c => c.toUpperCase());
      if (d.length > 1) destCount.set(d, (destCount.get(d) || 0) + 1);
    });
  });

  const topDests = [...destCount.entries()]
    .sort((a,b) => b[1] - a[1])
    .slice(0,8)
    .map(([d]) => d);

  const funnelData = topDests.map(dest => {
    const wanted = dest.toLowerCase();
    const dr = rows.filter(r =>
      Array.isArray(r.Q3) &&
      r.Q3.some(x => String(x ?? "").trim().toLowerCase() === wanted)
    );

    return {
      dest,
      total: dr.length,
      stages: stageLabels.map(s => ({
        label: s.label,
        pct: dr.length
          ? dr.filter(r =>
              String(r.planningStage ?? "").toLowerCase().includes(s.match)
            ).length / dr.length
          : 0
      }))
    };
  });

  const stageColors = ['#3F3F3F','#230B54','#530095','#FF5635','#00B5AC'];
  const w = Math.max(500, el.offsetWidth || 650);
  const h = Math.max(320, topDests.length * 38 + 80);
  const m = {t:16,r:16,b:60,l:130};
  const iw = w - m.l - m.r;
  const ih = h - m.t - m.b;

  d3.select(sel).selectAll('*').remove();

  if (!rows.length || !topDests.length) {
    d3.select(sel).append('div')
      .attr('class','empty-chart')
      .text('No data available for this selection.');
    return;
  }

  const svg = d3.select(sel)
    .append('svg')
    .attr('width', w)
    .attr('height', h)
    .attr('viewBox', `0 0 ${w} ${h}`);

  const g = svg.append('g')
    .attr('transform', `translate(${m.l},${m.t})`);

  const y = d3.scaleBand()
    .domain(topDests)
    .range([0, ih])
    .padding(0.28);

  const x = d3.scaleLinear()
    .domain([0,1])
    .range([0,iw]);

  funnelData.forEach(fd => {
    let xoff = 0;

    fd.stages.forEach((s,si) => {
      const bw = x(s.pct);

      const rect = g.append('rect')
        .attr('x', xoff)
        .attr('y', y(fd.dest))
        .attr('width', Math.max(0,bw))
        .attr('height', y.bandwidth())
        .attr('fill', stageColors[si])
        .attr('rx', si === 0 ? 4 : 0)
        .style('cursor', 'pointer')
        .attr('opacity', selected && selected !== fd.dest ? 0.45 : 1);

      rect
        .on('mousemove', e => {
          showTip(e, {
            label: `${fd.dest} · ${s.label}`,
            value: d3.format('.1%')(s.pct)
          }, true);
        })
        .on('mouseleave', hideTip)
        .on('click', e => {
          e.stopPropagation();
          toggleChartFilter('Q3', fd.dest);
        });

      if (bw > 22) {
        g.append('text')
          .attr('x', xoff + bw/2)
          .attr('y', y(fd.dest) + y.bandwidth()/2 + 4)
          .attr('text-anchor','middle')
          .attr('font-size',9)
          .attr('fill','#fff')
          .attr('font-weight',700)
          .style('pointer-events','none')
          .text(d3.format('.0%')(s.pct));
      }

      xoff += bw;
    });

    g.append('text')
      .attr('x', -8)
      .attr('y', y(fd.dest) + y.bandwidth()/2 + 4)
      .attr('text-anchor','end')
      .attr('font-size',10)
      .attr('fill', selected === fd.dest ? '#452080' : '#354056')
      .attr('font-weight', selected === fd.dest ? 800 : 400)
      .style('cursor','pointer')
      .text(`${fd.dest} (n=${fd.total})`)
      .on('mousemove', e => showTip(e, {
        label: fd.dest,
        value: d3.format('.1%')(fd.total / Math.max(rows.length,1))
      }, true))
      .on('mouseleave', hideTip)
      .on('click', e => {
        e.stopPropagation();
        toggleChartFilter('Q3', fd.dest);
      });
  });

  const leg = svg.append('g')
    .attr('transform', `translate(${m.l},${h-m.b+14})`);

  stageLabels.forEach((s,si) => {
    const lx = si * (iw/stageLabels.length);
    leg.append('rect')
      .attr('x',lx).attr('y',0)
      .attr('width',12).attr('height',12)
      .attr('fill',stageColors[si]).attr('rx',2);

    leg.append('text')
      .attr('x',lx+16).attr('y',10)
      .attr('font-size',9)
      .attr('fill','#6f637c')
      .text(s.label);
  });

  g.append('g')
    .attr('class','axis')
    .attr('transform',`translate(0,${ih})`)
    .call(d3.axisBottom(x).ticks(4).tickFormat(d3.format('.0%')));
}

/* Q3 word cloud: clicking a destination applies the same Q3 filter. */
/* ================================================================
   Q3 · DESTINATIONS CONSIDERED
   TRUE WORD-CLOUD LAYOUT
   - Large dominant word in centre
   - Smaller words around it
   - Horizontal + vertical + diagonal words
   - Collision-free spiral placement
   - Real survey frequencies
   - Tooltip shows %
   - Click destination to filter dashboard
   ================================================================ */
