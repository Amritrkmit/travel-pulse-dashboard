/* ============================================================================
   chart-premium.js  —  Escalent chart layer for Travel Pulse
   Loaded AFTER app-final.js. Replaces chart primitives (global function
   declarations) and routes every chart interaction through the EXISTING
   central filter state:

     click -> toggleChartFilter(key,label) -> chartFilters / filterSelections
           -> invalidateRowCache() -> activeRows() -> renderActive() -> charts

   No second filter state, no document-level listeners per chart, no
   per-render listeners on persistent nodes.
   ========================================================================== */
(function(){
"use strict";
if(typeof d3==="undefined"||typeof chartFilters==="undefined") return;

/* ---------- Escalent palette ---------- */
const C={purple:"#530095",turq:"#00B5AC",sienna:"#9A1B15",blue:"#230B54",mandarin:"#FF5635",chart:"#EEFF3B",grey:"#3F3F3F",pos:"#2E9E5B",neg:"#C62F2F"};
const SEQ=[C.purple,C.turq,C.blue,C.mandarin,C.sienna,C.grey,C.chart,"#8E4FC0","#66D3CD","#6A5A9C","#FF9A85","#7A7A7A"];
function semColor(label){
  const s=String(label==null?"":label).trim().toLowerCase();
  if(/^yes$|^yes[,\s-]|^will increase|^positive$|^inc$/.test(s)) return C.pos;
  if(/^no$|^no[,\s-]|^will decrease|^negative$|^dec$/.test(s)) return C.neg;
  if(/^will remain the same|^neutral$|^same$/.test(s)) return C.grey;
  return null;
}
function assignColors(rows){
  let i=0; return rows.map(r=>semColor(r.filterLabel||r.label)||semColor(r.key)||SEQ[(i++)%SEQ.length]);
}
const shade=(hex,k)=>{const c=d3.color(hex);return (k>=0?c.brighter(k):c.darker(-k)).formatHex();};
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const nfmt=n=>Math.round(n).toLocaleString();
const pctTxt=v=>(v*100).toFixed(1)+"%";
const baseN=()=>{try{return activeRows().length;}catch(e){return 0;}};
const uidOf=sel=>"pp"+String(sel).replace(/\W/g,"");
const dispLabel=d=>(typeof chartDisplayLabel==="function"?chartDisplayLabel(d):String(d.displayLabel??d.label??""));
const filtLabel=d=>(typeof chartFilterLabel==="function"?chartFilterLabel(d):String(d.filterLabel??d.label??""));
const stripTooltipCounts=value=>String(value??"")
  .replace(/\s*\(\s*(?:n|count)\s*[:=]\s*[\d,]+(?:\.\d+)?\s*\)/gi,"")
  .replace(/\b[\d,]+\s+(?:respondents?|score points?)\b\s*(?:[·,]\s*)?/gi,"")
  .replace(/(?:^|\s*[·,]\s*)(?:n|count|mentions?)\s*[:=]\s*[\d,]+(?:\.\d+)?/gi,"")
  .replace(/\bothers?\s*\(please+\s+specify\)/gi,"Others")
  .replace(/\s*[·,]\s*$/," ").trim();
const EMPTY_MSG="No records match the current filters.";

/* ---------- one consistent tooltip ---------- */
const tipEl=()=>document.getElementById("tooltip");
window.showTip=function(e,d,raw){
  const el=tipEl(); if(!el||!d) return;
  const v=d.value, title=esc(stripTooltipCounts(d.displayLabel||d.label||""));
  let body="";
  const isShare=typeof v==="number"&&Number.isFinite(v)&&Math.abs(v)<=1.0001&&!raw&&d.label!=="NPS Score";
  if(isShare){
    body=`<div class="tt-line">Percentage: <b>${pctTxt(v)}</b></div>`;
  }else if(typeof v==="string"){
    body=stripTooltipCounts(v).split(" · ").filter(Boolean).map(x=>`<div class="tt-line"><b>${esc(x)}</b></div>`).join("");
  }else if(Number.isFinite(+v)){
    body=`<div class="tt-line">Value: <b>${Number.isInteger(+v)?(+v):(+v).toFixed(1)}</b></div>`;
  }
  el.innerHTML=`<div class="tt-title">${title}</div>${body}`;
  el.style.opacity=1;
  const w=el.offsetWidth,h=el.offsetHeight,pad=8;
  let x=e.clientX+14,y=e.clientY+14;
  if(x+w>window.innerWidth-pad) x=e.clientX-w-14;
  if(y+h>window.innerHeight-pad) y=e.clientY-h-14;
  el.style.left=Math.max(pad,x)+"px"; el.style.top=Math.max(pad,y)+"px";
};
window.hideTip=function(){const el=tipEl(); if(el) el.style.opacity=0;};
if(!window.__ppTipInit){window.__ppTipInit=true;window.addEventListener("scroll",()=>window.hideTip(),{passive:true});}

/* ---------- central filter routing (adds the shared loader) ---------- */
window.toggleChartFilter=function(key,label){
  if(!key||label==null||label===""||label==="NPS Score") return;
  window.hideTip();
  return runDashboardUpdate(()=>{
    if(chartFilters[key]===label){
      delete chartFilters[key];
      if(key==="BudgetChangeMode") planBudgetReasonMode="";
    }else{
      chartFilters[key]=label;
      if(key==="BudgetChangeMode") planBudgetReasonMode=(label==="dec"||label==="inc")?label:"same";
    }
    invalidateRowCache();
    updateFilterSummaries(); updateSegmentBase();
  },"Updating dashboard...");
};
window.surveyToggleFilter=function(key,label){ return window.toggleChartFilter(key,label); };

/* extra selector -> filter-key mappings (chained onto the existing mapper) */
const EXTRA_KEYS={maritalChart:"Marital Status",childrenChart:"Children",companionChart2:"travelCompanions",
  planTripDurationPie:"TripDuration",planBookingLeadTimePie:"Q6",planTravelPeriodPie:"Q6a",packageTypeDonut:"Q8b"};
const _cfk=window.chartFilterKey;
window.chartFilterKey=function(sel){
  const id=String(sel).replace(/^#/,"");
  if(EXTRA_KEYS[id]) return EXTRA_KEYS[id];
  return _cfk(sel);
};
const _qm=window.questionMatches;
window.questionMatches=function(r,key,label){
  /* app-final.js declares questionMatches twice; the later copy dropped these cases. Restored here. */
  if(key==="TripDuration") return clean(r.Q4||r.Q4a)===clean(label);
  if(key==="BudgetChangeMode"){
    const v=clean(r.Q10||r.spendChange).toLowerCase(), mode=clean(label).toLowerCase();
    if(mode==="dec") return v.includes("decrease");
    if(mode==="same") return v.includes("same");
    if(mode==="inc") return v.includes("increase");
    return true;
  }
  if(key==="Age Group") return label==="25–44"?["25-34","35-44"].includes(r["Age Group"]):clean(r["Age Group"])===clean(label);
  if(key==="Region") return clean(r.Region)===clean(label)||(typeof shortRegion==="function"&&clean(shortRegion(r.Region))===clean(label));
  if(key==="aiLikelihood"&&label==="Top 2 Box") return ["Extremely likely","Somewhat likely"].includes(clean(r[key]));
  if(key==="aiLikelihood"&&label==="Bottom 2 Box") return ["Somewhat unlikely","Extremely unlikely"].includes(clean(r[key]));
  if(key==="airlineLoyaltyImportance"||key==="hotelLoyaltyImportance"){
    if(label==="NET : Top 2 Box") return ["Extremely important","Very important"].includes(clean(r[key]));
    if(label==="NET : Bottom 2 Box") return ["Slightly important","Not at all important"].includes(clean(r[key]));
  }
  if(key==="airlineCarrier") return clean(r.airlineCarrier||r.Q14)===clean(label);
  if(key==="accommodation") return clean(r.accommodation||r.Q19)===clean(label);
  if(key==="hotelBrand") return clean(r.hotelBrand||r.Q21)===clean(label);
  const SPECIAL=/^(Q18|Q24|Q8a|Q10a|Q3|Q3a|assocWord)$/;
  const v=r[key];
  /* array answers: compare cleaned text on both sides (labels are cleaned, stored values may carry mojibake) */
  if(Array.isArray(v)&&!SPECIAL.test(key)) return v.includes(label)||v.some(x=>clean(x)===clean(label));
  return _qm(r,key,label);
};

/* A chart never filters itself away: its own key is ignored while it draws, so
   the other categories stay visible (faded) and can be switched. */
const _q=window.q;
window.q=function(key){
  if(!DATA||!Object.prototype.hasOwnProperty.call(chartFilters,key)) return _q(key);
  const saved=chartFilters[key], c=_rowCache, k=_rowCacheKey;
  delete chartFilters[key];
  try{ return _q(key); }
  finally{ chartFilters[key]=saved; _rowCache=c; _rowCacheKey=k; }
};

/* ---------- shared SVG defs (gradients + soft shadows) ---------- */
function buildDefs(svg,uid,colors,mild){
  let defs=svg.select("defs"); if(defs.empty()) defs=svg.insert("defs",":first-child");
  defs.selectAll("*").remove();
  const sh=(id,dy,sd,op)=>{const f=defs.append("filter").attr("id",`${uid}-${id}`).attr("x","-25%").attr("y","-25%").attr("width","150%").attr("height","160%");
    f.append("feDropShadow").attr("dx",0).attr("dy",dy).attr("stdDeviation",sd).attr("flood-color",C.blue).attr("flood-opacity",op);};
  sh("sh",2.4,2.4,.26); sh("sh2",4,3.4,.34);
  [...new Set(colors)].forEach(c=>{
    const g=defs.append("linearGradient").attr("id",`${uid}-${c.slice(1)}`).attr("x1",0).attr("y1",0).attr("x2",0).attr("y2",1);
    g.append("stop").attr("offset","0%").attr("stop-color",shade(c,mild?.3:.55));
    g.append("stop").attr("offset","55%").attr("stop-color",c);
    g.append("stop").attr("offset","100%").attr("stop-color",shade(c,mild?-.12:-.35));
  });
}

/* ---------- compact donut with beside-list, connector labels, 3D depth ---------- */
const PIE_SPECS=(function(){
  const norm=s=>String(s).replace(/â€“|–/g,"-");
  const timing=l=>clean(l).replace(/â€“|–/g,"-").replace(/\s+before the trip$/i,"").replace(/\s+from now$/i,"")
    .replace(/\bmonths?\b/gi,"mo").replace(/^Less than 1 mo$/i,"<1 mo").replace(/^1 year or more$/i,"1+ year").replace(/^Canâ€™t say$/i,"Can't say");
  return {
    "#maritalChart":{key:"Marital Status",get:r=>clean(r["Marital Status"]||"")},
    "#childrenChart":{key:"Children",get:r=>clean(r.Children||"")},
    "#companionChart2":{key:"travelCompanions",get:r=>clean(r.travelCompanions||r.Q5)},
    "#planTripDurationPie":{key:"TripDuration",get:r=>clean(r.Q4)||clean(r.Q4a),display:norm},
    "#planBookingLeadTimePie":{key:"Q6",get:r=>clean(r.Q6),display:timing},
    "#planTravelPeriodPie":{key:"Q6a",get:r=>clean(r.Q6a),display:timing}
  };
})();

function premiumPie(sel,input,opt,selectedList){
  opt=opt||{};
  const el=document.querySelector(sel); if(!el) return {highlight(){}};
  const key=window.chartFilterKey(sel);
  const rows=(input||[]).filter(d=>d&&Number.isFinite(+d.value)&&+d.value>0).map(d=>({
    orig:d,label:String(d.label),displayLabel:dispLabel(d),filterLabel:filtLabel(d),key:d.key,
    value:+d.value,count:Number.isFinite(+d.count)?+d.count:null,total:d.total
  }));
  ["donut-chart","behaviour-pie-chart","demographic-3d-chart"].forEach(c=>el.classList.remove(c));
  if(typeof el._threePieCleanup==="function"){try{el._threePieCleanup();}catch(e){} el._threePieCleanup=null;}
  const w=Math.max(280,Math.floor(el.clientWidth||320));
  const fv=d=>String(d.key!=null&&d.key!==""?d.key:d.filterLabel);
  const sel0=new Set();
  (selectedList||[]).forEach(s=>sel0.add(String(s)));
  if(opt.selected) sel0.add(String(opt.selected));
  if(key&&chartFilters[key]!=null) sel0.add(String(chartFilters[key]));
  const isSel=d=>sel0.size&&(sel0.has(fv(d))||sel0.has(d.label)||sel0.has(d.filterLabel));
  const bn=baseN();
  rows.forEach(d=>{d.n=d.count!=null?d.count:d.value*(+d.total||bn);});
  const sig=JSON.stringify([rows.map(d=>[d.label,d.displayLabel,+d.value.toFixed(5),Math.round(d.n)]),[...sel0],w,!!key]);
  const state=el.__pp;
  const live=state&&el.contains(state.root);
  if(live&&state.sig===sig){ state.hi=null; applyState(state); return {highlight:k=>{state.hi=k;applyState(state);}}; }

  let root;
  if(live){ root=state.root; }
  else{ el.innerHTML=""; el.__pp=null; }
  if(!rows.length){
    el.innerHTML=`<div class="empty-chart">${EMPTY_MSG}</div>`; el.__pp=null; el.classList.add("pp-host"); return {highlight(){}};
  }
  el.classList.add("pp-host");
  const colors=assignColors(rows).map(c=>d3.interpolateRgb(c,"#ffffff")(.3)).map(c=>d3.color(c).formatHex());   /* softer, lighter pie palette */
  const uid=uidOf(sel);
  const R=sel==="#cabinChart"?Math.min(96,Math.max(78,(w-170)*.28)):Math.max(44,Math.min(58,(w-24)*.2)), padX=40, S={w:2*(R+padX),h:2*R+46};
  const cx=S.w/2, cy=S.h/2;
  let wrap,svg,legend;
  if(live){ wrap=state.wrap; svg=state.svg; legend=state.legend; svg.selectAll("g.pp-main").remove(); legend.selectAll("*").remove(); }
  else{
    wrap=d3.select(el).append("div").attr("class","pp-wrap");
    const host=wrap.append("div").attr("class","pp-chart");
    svg=host.append("svg").attr("class","pp-svg").attr("role","img");
    legend=wrap.append("div").attr("class","pp-legend");
  }
  svg.attr("viewBox",`0 0 ${S.w} ${S.h}`).attr("width",S.w).attr("height",S.h)
     .attr("aria-label",`${opt.category||"Distribution"} donut chart`);
  buildDefs(svg,uid,colors,true);
  const g=svg.append("g").attr("class","pp-main").attr("transform",`translate(${cx},${cy})`);
  const pie=d3.pie().sort(null).value(d=>d.value).padAngle(rows.length>1?.012:0);
  const arcs=pie(rows);
  const arc=d3.arc().innerRadius(R*.56).outerRadius(R).cornerRadius(2);
  const lab=arcs.map((a,i)=>{const m=(a.startAngle+a.endAngle)/2-Math.PI/2;return {a,i,m,cos:Math.cos(m),sin:Math.sin(m)};});
  const slices=g.append("g").attr("class","pp-slices").attr("filter",`url(#${uid}-sh)`);
  const sg=slices.selectAll("g.pp-slice").data(lab).join("g").attr("class","pp-slice");
  sg.append("path").attr("class","pp-depth").attr("d",l=>arc(l.a)).attr("transform","translate(0,4.5)").attr("fill",l=>shade(colors[l.i],-.45)).attr("opacity",.5);
  sg.append("path").attr("class","pp-top").attr("d",l=>arc(l.a)).attr("fill",l=>`url(#${uid}-${colors[l.i].slice(1)})`)
    .attr("stroke","#fff").attr("stroke-width",1.4);
  const total=rows.reduce((s,d)=>s+(d.count!=null?d.count:0),0);
  if(rows.every(d=>d.count!=null)&&total>0){
    g.append("text").attr("class","pp-center-n").attr("text-anchor","middle").attr("y",1).text(nfmt(total));
    g.append("text").attr("class","pp-center-s").attr("text-anchor","middle").attr("y",13).text(opt.center&&String(opt.center).length<=10?String(opt.center):"responses");
  }
  /* percentage labels outside with connector lines; vertical collision relaxation per side */
  const minGap=11.5, lim=S.h/2-7;
  const place=side=>{
    const L=lab.filter(l=>l.a.data.value>=.02&&(side>0?l.cos>=0:l.cos<0)).sort((x,y)=>x.sin-y.sin);
    L.forEach(l=>{l.y=Math.max(-lim,Math.min(lim,l.sin*(R+11)));});
    for(let k=1;k<L.length;k++) if(L[k].y-L[k-1].y<minGap) L[k].y=L[k-1].y+minGap;   /* push down */
    for(let k=L.length-1;k>=0;k--){                                                    /* pull back up from the bottom edge */
      if(L[k].y>lim) L[k].y=lim;
      if(k<L.length-1&&L[k+1].y-L[k].y<minGap) L[k].y=L[k+1].y-minGap;
    }
    return L;
  };
  const labelled=[...place(1),...place(-1)];
  const ll=g.append("g").attr("class","pp-labels");
  labelled.forEach(l=>{
    const s=l.cos>=0?1:-1;
    const p1=[l.cos*(R-1),l.sin*(R-1)], p2=[l.cos*(R+8),l.sin*(R+8)], p3=[s*(R+16),l.y], p4=[s*(R+20),l.y];
    ll.append("polyline").attr("class","pp-leader").attr("points",[p1,p2,p3,p4].map(p=>p.join(",")).join(" "));
    ll.append("text").attr("class","pp-pct").datum(l).attr("x",s*(R+23)).attr("y",l.y).attr("dy","0.35em").attr("text-anchor",s>0?"start":"end").text(pctTxt(l.a.data.value).replace(".0%","%"));
  });
  /* beside list: Category + Count + Percentage */
  const li=legend.selectAll("div.pp-row").data(lab).join("div").attr("class","pp-row").attr("title",l=>`${dispLabel({label:l.a.data.displayLabel})}: ${pctTxt(l.a.data.value)}`);
  li.append("span").attr("class","pp-sw").style("background",l=>colors[l.i]);
  li.append("span").attr("class","pp-nm").text(l=>dispLabel({label:l.a.data.displayLabel}).replace(/\//g,"/\u200b"));
  li.append("span").attr("class","pp-pc").text(l=>pctTxt(l.a.data.value));

  const st={root:wrap.node(),wrap,svg,legend,sg,li,lab,arc,R,sig,sel:isSel,hi:null,hover:-1};
  el.__pp=st;
  const interactive=!!(key||opt.onClick||opt.onSliceClick);
  const act=l=>{
    const d=l.a.data;
    if(key){ window.toggleChartFilter(key,fv(d)); return; }
    if(opt.onClick){ opt.onClick(d.orig); return; }
    if(opt.onSliceClick&&d.key!=="same") opt.onSliceClick(d.orig);
  };
  const enter=(l,e)=>{st.hover=l.i;applyState(st);if(e)window.showTip(e,{label:l.a.data.displayLabel,value:l.a.data.value,count:l.a.data.n});};
  const leave=()=>{st.hover=-1;applyState(st);window.hideTip();};
  sg.classed("is-click",interactive).on("mouseenter",(e,l)=>enter(l,e)).on("mousemove",(e,l)=>window.showTip(e,{label:l.a.data.displayLabel,value:l.a.data.value,count:l.a.data.n}))
    .on("mouseleave",leave).on("click",(e,l)=>{e.stopPropagation();if(interactive)act(l);});
  li.classed("is-click",interactive).on("mouseenter",(e,l)=>enter(l,null)).on("mouseleave",leave)
    .on("click",(e,l)=>{e.stopPropagation();if(interactive)act(l);});
  /* pie labels trigger the very same filter as the slice */
  ll.selectAll("text.pp-pct").style("cursor",interactive?"pointer":"default")
    .on("mouseenter",(e,l)=>enter(l,e)).on("mousemove",(e,l)=>window.showTip(e,{label:l.a.data.displayLabel,value:l.a.data.value,count:l.a.data.n}))
    .on("mouseleave",leave).on("click",(e,l)=>{e.stopPropagation();if(interactive)act(l);});
  applyState(st);
  return {highlight:k=>{st.hi=k;applyState(st);}};
}
function applyState(st){
  const any=st.lab.some(l=>st.sel(l.a.data));
  const ex=(l,dist)=>`translate(${(l.cos*dist).toFixed(2)}px,${(l.sin*dist).toFixed(2)}px)`;
  st.sg.each(function(l){
    const d=l.a.data, picked=st.sel(d), hov=st.hover===l.i, hi=st.hi!=null&&String(st.hi)===String(d.key!=null?d.key:d.filterLabel);
    const dist=picked?8:(hov||hi)?6:0;
    this.style.transform=dist?ex(l,dist):"none";
    this.style.opacity=any&&!picked?.34:1;
    this.classList.toggle("is-sel",!!picked); this.classList.toggle("is-hov",hov);
  });
  st.li.each(function(l){
    const picked=st.sel(l.a.data);
    this.classList.toggle("is-sel",!!picked); this.classList.toggle("is-dim",any&&!picked); this.classList.toggle("is-hov",st.hover===l.i);
  });
}

/* ---------- public pie/donut entry points (same signatures as before) ---------- */
window.donut=function(sel,data,center,selected,options){
  options=options||{};
  if(sel==="#planBudgetDonut"&&DATA&&DATA.records&&DATA.records.length){
    /* budget donut is built from the already-filtered rows; recompute ignoring its own filter so all 3 slices stay visible */
    const src=rowsIgnoringChartFilter("BudgetChangeMode"), cnt={dec:0,same:0,inc:0};
    src.forEach(r=>{const v=String(r.Q10||"").toLowerCase(); if(v.includes("decrease"))cnt.dec++; else if(v.includes("increase"))cnt.inc++; else if(v.includes("same"))cnt.same++;});
    const tot=cnt.dec+cnt.same+cnt.inc||1;
    data=(data||[]).map(d=>cnt[d.key]==null?d:{...d,count:cnt[d.key],value:cnt[d.key]/tot,total:tot});
  }
  return premiumPie(sel,data,{...options,center},Array.isArray(selected)?selected:[]);
};
window.behaviourPieChart=function(sel,data,opt){return premiumPie(sel,data,opt||{},[]);};
window.renderSegmentPie=function(sel,data,opt){return premiumPie(sel,data,opt||{},[]);};
window.behaviourDemographicPie3D=function(sel,data,opt){
  opt=opt||{}; const spec=PIE_SPECS[sel];
  if(spec&&DATA&&DATA.records&&DATA.records.length){
    const src=rowsIgnoringChartFilter(spec.key), counts=new Map();
    src.forEach(r=>{const v=spec.get(r); if(v) counts.set(v,(counts.get(v)||0)+1);});
    const tot=[...counts.values()].reduce((a,b)=>a+b,0)||1;
    const order=sel==="#planBookingLeadTimePie"
      ?["<1 mo","1–3 mo","3–6 mo","6–9 mo","9–12 mo","1+ year"]
      :sel==="#planTripDurationPie"
        ?["1–2 nights","3–4 nights","5–6 nights","7–8 nights","9–10 nights","10+ nights"]
        :null;
    const orderIndex=order?new Map(order.map((label,index)=>[label,index])):null;
    const formatLabel=label=>String(spec.display?spec.display(label):label).replace(/(\d)-(\d)/g,"$1–$2");
    data=[...counts.entries()].map(([label,count])=>({
      label,filterLabel:label,displayLabel:formatLabel(label),count,total:tot,value:count/tot
    }));
    data.sort((a,b)=>orderIndex
      ?(orderIndex.get(a.displayLabel)??Infinity)-(orderIndex.get(b.displayLabel)??Infinity)||b.count-a.count
      :b.count-a.count);
  }
  return premiumPie(sel,data,opt,[]);
};

/* ---------- HTML preference bars (carrier / accommodation / hotel brand): now clickable + cross-filtered ---------- */
const PREF_KEYS={carrierChangeChart:"airlineCarrier",hotelAccomChart:"accommodation",hotelBrandChangeChart:"hotelBrand"};
window.renderPreferenceBars=function(containerId,rows,fields){
  const el=document.getElementById(containerId); if(!el) return;
  const key=PREF_KEYS[containerId]||null;
  const src=(key&&Object.prototype.hasOwnProperty.call(chartFilters,key))?rowsIgnoringChartFilter(key):(rows||[]);
  const counts=new Map();
  src.forEach(row=>{const l=fields.map(f=>clean(row[f])).find(Boolean); if(l) counts.set(l,(counts.get(l)||0)+1);});
  const answered=[...counts.values()].reduce((a,b)=>a+b,0);
  const items=[...counts].map(([label,count])=>({label,count,value:answered?count/answered:0,total:answered}))
    .sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label));
  const selVal=key?chartFilters[key]:null;
  const sig=JSON.stringify([items.map(i=>[i.label,i.count]),selVal]);
  if(el.__pref===sig&&el.firstChild) return;
  const root=d3.select(el); root.selectAll("*").remove(); el.__pref=sig; el.classList.add("pp-host");
  if(!items.length){root.append("div").attr("class","empty-chart").text(src.length?"No preference data for this selection.":EMPTY_MSG);return;}
  const list=root.append("div").attr("class","preference-bar-list");
  list.selectAll("div.preference-bar-row").data(items).join("div").attr("class","preference-bar-row pp-pref")
    .classed("is-click",!!key).classed("is-sel",d=>selVal===d.label).style("opacity",d=>selVal!=null&&selVal!==d.label?.4:1)
    .each(function(d){
      const row=d3.select(this);
      row.append("div").attr("class","preference-bar-label").attr("title",dispLabel(d)).text(dispLabel(d));
      const tr=row.append("div").attr("class","preference-bar-track").attr("role","img").attr("aria-label",`${dispLabel(d)}: ${fmt(d.value)}`);
      tr.append("div").attr("class","preference-bar-fill").style("width",`${d.value*100}%`);
      row.append("div").attr("class","preference-bar-value").text(fmt(d.value));
    })
    .on("mousemove",(e,d)=>window.showTip(e,d)).on("mouseleave",()=>window.hideTip())
    .on("click",(e,d)=>{e.stopPropagation(); if(key) window.toggleChartFilter(key,d.label);});
};

/* ---------- bars ---------- */
function wrap2(text,cpl){
  const words=String(text).split(/\s+/), lines=[]; let cur="";
  words.forEach(wd=>{const nx=cur?cur+" "+wd:wd; if(nx.length>cpl&&cur){lines.push(cur);cur=wd;}else cur=nx;});
  if(cur) lines.push(cur);
  if(lines.length<=2) return {lines,cut:false};
  let second=lines.slice(1).join(" ");
  if(second.length>cpl) second=second.slice(0,Math.max(1,cpl-1)).replace(/\s+\S*$/,"")+"…";
  return {lines:[lines[0],second],cut:true};
}
const valTxt=d=>d.label==="NPS Score"?d3.format("+.0f")(d.value):fmt(d.value);
const BAR_BLUE="#530095";
function barColor(d,i){return semColor(filtLabel(d))||BAR_BLUE;}

window.horizontalBars=function(sel,data,opt){
  opt=opt||{};
  const el=document.querySelector(sel); if(!el) return;
  const ranked=[...(data||[])].filter(d=>Number.isFinite(+d.value)).sort((a,b)=>b.value-a.value);
  const root=d3.select(el);
  if(!ranked.length){root.selectAll("*").remove();el.__bars=null;root.append("div").attr("class","empty-chart").text("No data available for this selection.");return;}
  const w=Math.max(280,Math.floor(el.clientWidth||320));
  const key=opt.disableFilter?null:window.chartFilterKey(sel), selVal=key?chartFilters[key]:null, bn=baseN();
  const clickable=!!key||typeof opt.onClick==="function";
  const sig=JSON.stringify(["h",ranked.map(d=>[dispLabel(d),+(+d.value).toFixed(5)]),selVal,w,opt.max,opt.labelWidth,opt.height,clickable,opt.color]);
  if(el.__bars&&el.__bars.sig===sig&&el.contains(el.__bars.svgNode)) return;
  const names=ranked.map(dispLabel), cpx=5.7;
  const maxLen=d3.max(names,s=>s.length)||10;
  const lwReq=Number.isFinite(+opt.labelWidth)?+opt.labelWidth:Math.max(110,Math.min(maxLen*cpx+14,260));
  const lw=Math.min(lwReq,Math.floor(w*.46));
  const m={t:6,r:46,b:24,l:lw}, iw=Math.max(40,w-m.l-m.r);
  const rowH=Math.max(30,Math.min(38,((opt.height||0)-30)/ranked.length||30));
  const ih=ranked.length*rowH, h=m.t+ih+m.b;
  const cpl=Math.max(8,Math.floor((lw-14)/cpx));
  let svg=el.__bars&&el.contains(el.__bars.svgNode)?d3.select(el.__bars.svgNode):null;
  if(!svg){ root.selectAll("*").remove(); svg=root.append("svg").attr("class","pp-bars"); }
  svg.selectAll("*").remove();
  svg.attr("width",w).attr("height",h).attr("viewBox",`0 0 ${w} ${h}`);
  const uid=uidOf(sel);
  const cols=ranked.map(d=>semColor(filtLabel(d))||opt.color||BAR_BLUE);
  buildDefs(svg,uid,cols,!!opt.gradient);
  const g=svg.append("g").attr("transform",`translate(${m.l},${m.t})`);
  const dmax=d3.max(ranked,d=>+d.value)||.1;
  const x=d3.scaleLinear().domain([0,Number.isFinite(+opt.max)?Math.max(+opt.max,dmax*1.02):Math.max(.1,dmax*1.15)]).range([0,iw]);
  const y=d3.scaleBand().domain(ranked.map((d,i)=>i)).range([0,ih]).padding(.26);
  g.append("g").attr("class","gridline").call(d3.axisBottom(x).ticks(4).tickSize(ih).tickFormat("")).call(a=>a.select(".domain").remove());
  const bh=Math.min(y.bandwidth(),22), off=(y.bandwidth()-bh)/2, rx=3;
  const rowsG=g.append("g").attr("filter",`url(#${uid}-sh)`).selectAll("g.pp-bar").data(ranked).join("g").attr("class","pp-bar")
    .classed("is-click",clickable).classed("is-sel",d=>selVal!=null&&selVal===filtLabel(d)).style("opacity",d=>selVal!=null&&selVal!==filtLabel(d)?.35:1);
  rowsG.append("rect").attr("class","pp-depth").attr("x",1.5).attr("y",(d,i)=>y(i)+off+2.8).attr("height",bh).attr("rx",rx)
    .attr("width",d=>Math.max(2,x(Math.max(0,+d.value)))).attr("fill",(d,i)=>shade(cols[i],-.9)).attr("opacity",.5);
  rowsG.append("rect").attr("class","pp-top").attr("x",0).attr("y",(d,i)=>y(i)+off).attr("height",bh).attr("rx",rx)
    .attr("width",d=>Math.max(2,x(Math.max(0,+d.value)))).attr("fill",(d,i)=>opt.gradient?`url(#${uid}-${cols[i].slice(1)})`:cols[i]);
  rowsG.append("text").attr("class","pp-val").attr("x",d=>Math.min(iw+m.r-34,x(Math.max(0,+d.value))+7)).attr("y",(d,i)=>y(i)+off+bh/2).attr("dy","0.35em").text(valTxt);
  /* wrapped y labels (max 2 lines, full text in title) */
  const lg=g.append("g").attr("class","pp-ylab").selectAll("text").data(ranked).join("text").attr("x",-9).attr("text-anchor","end")
    .attr("y",(d,i)=>y(i)+off+bh/2).classed("is-click",clickable)
    .style("font-weight",d=>selVal!=null&&selVal===filtLabel(d)?800:null);
  lg.each(function(d,i){
    const t=d3.select(this), r=wrap2(names[i],cpl), n=r.lines.length;
    r.lines.forEach((ln,k)=>t.append("tspan").attr("x",-9).attr("dy",k===0?(n===1?"0.35em":"-0.2em"):"1.12em").text(ln));
    t.append("title").text(names[i]);
  });
  g.append("g").attr("class","axis").attr("transform",`translate(0,${ih})`).call(d3.axisBottom(x).ticks(4).tickFormat(fmt)).call(a=>a.select(".domain").remove());
  /* hover/click on the whole row hit-area */
  g.append("g").selectAll("rect.pp-hit").data(ranked).join("rect").attr("class","pp-hit").attr("x",-m.l).attr("y",(d,i)=>y(i)-y.step()*y.paddingInner()/2)
    .attr("width",m.l+iw+m.r).attr("height",y.step()).attr("fill","transparent").classed("is-click",clickable)
    .on("mousemove",(e,d)=>window.showTip(e,{...d,label:dispLabel(d)})).on("mouseenter",(e,d)=>{rowsG.filter(r=>r===d).classed("is-hov",true);})
    .on("mouseleave",(e,d)=>{rowsG.filter(r=>r===d).classed("is-hov",false);window.hideTip();})
    .on("click",(e,d)=>{e.stopPropagation();if(opt.onClick)opt.onClick(d);else if(key)window.toggleChartFilter(key,filtLabel(d));});
  el.__bars={sig,svgNode:svg.node()}; el.classList.add("pp-host");
};

window.verticalBars=function(sel,data,opt){
  opt=opt||{};
  const el=document.querySelector(sel); if(!el) return;
  const ranked=[...(data||[])].filter(d=>Number.isFinite(+d.value)).sort((a,b)=>b.value-a.value);
  const root=d3.select(el);
  if(!ranked.length){root.selectAll("*").remove();el.__bars=null;root.append("div").attr("class","empty-chart").text("No data available for this selection.");return;}
  const w=Math.max(280,Math.floor(el.clientWidth||320)), h=opt.height||240;
  const key=window.chartFilterKey(sel), selVal=key?chartFilters[key]:null;
  const sig=JSON.stringify(["v",ranked.map(d=>[dispLabel(d),+(+d.value).toFixed(5)]),selVal,w,opt.max,opt.height,opt.bottom,!!key]);
  if(el.__bars&&el.__bars.sig===sig&&el.contains(el.__bars.svgNode)) return;
  const m={t:22,r:12,b:opt.bottom||46,l:42}, iw=w-m.l-m.r, ih=h-m.t-m.b;
  let svg=el.__bars&&el.contains(el.__bars.svgNode)?d3.select(el.__bars.svgNode):null;
  if(!svg){ root.selectAll("*").remove(); svg=root.append("svg").attr("class","pp-bars"); }
  svg.selectAll("*").remove();
  svg.attr("width",w).attr("height",h).attr("viewBox",`0 0 ${w} ${h}`);
  const uid=uidOf(sel), cols=ranked.map(barColor);
  buildDefs(svg,uid,cols);
  const g=svg.append("g").attr("transform",`translate(${m.l},${m.t})`);
  const x=d3.scaleBand().domain(ranked.map((d,i)=>i)).range([0,iw]).padding(.3);
  const dmax=d3.max(ranked,d=>+d.value)||0;
  const auto=dmax<=.6?.6:Math.min(1,Math.ceil(dmax*10)/10);
  const max=Number.isFinite(+opt.max)?Math.max(dmax,+opt.max):auto;
  const y=d3.scaleLinear().domain([0,max]).range([ih,0]);
  g.append("g").attr("class","gridline").call(d3.axisLeft(y).ticks(4).tickSize(-iw).tickFormat("")).call(a=>a.select(".domain").remove());
  const bw=Math.min(x.bandwidth(),56), ox=(x.bandwidth()-bw)/2, rx=3;
  const grp=g.append("g").attr("filter",`url(#${uid}-sh)`).selectAll("g.pp-bar").data(ranked).join("g").attr("class","pp-bar")
    .classed("is-click",!!key).classed("is-sel",d=>selVal!=null&&selVal===filtLabel(d)).style("opacity",d=>selVal!=null&&selVal!==filtLabel(d)?.35:1);
  const bH=d=>Math.max(2,ih-y(Math.max(0,+d.value)));
  grp.append("rect").attr("class","pp-depth").attr("x",(d,i)=>x(i)+ox+2.5).attr("y",d=>ih-bH(d)+2.5).attr("width",bw).attr("height",bH).attr("rx",rx).attr("fill",(d,i)=>shade(cols[i],-.9)).attr("opacity",.5);
  grp.append("rect").attr("class","pp-top").attr("x",(d,i)=>x(i)+ox).attr("y",d=>ih-bH(d)).attr("width",bw).attr("height",bH).attr("rx",rx).attr("fill",(d,i)=>cols[i]);
  grp.append("text").attr("class","pp-val").attr("text-anchor","middle").attr("x",(d,i)=>x(i)+x.bandwidth()/2).attr("y",d=>Math.max(11,ih-bH(d)-6)).text(valTxt);
  const cpl=Math.max(7,Math.floor(x.step()/5.6));
  const gx=g.append("g").attr("class","axis pp-xlab").attr("transform",`translate(0,${ih+4})`).selectAll("text").data(ranked).join("text")
    .attr("x",(d,i)=>x(i)+x.bandwidth()/2).attr("text-anchor","middle").classed("is-click",!!key)
    .style("font-weight",d=>selVal!=null&&selVal===filtLabel(d)?800:null);
  gx.each(function(d){const t=d3.select(this),nm=dispLabel(d),r=wrap2(nm,cpl);
    r.lines.forEach((ln,k)=>t.append("tspan").attr("x",+t.attr("x")).attr("dy",k?"1.1em":"0.8em").text(ln)); t.append("title").text(nm);});
  g.append("g").attr("class","axis").call(d3.axisLeft(y).ticks(4).tickFormat(fmt)).call(a=>a.select(".domain").remove());
  g.append("g").selectAll("rect.pp-hit").data(ranked).join("rect").attr("class","pp-hit").attr("x",(d,i)=>x(i)-x.step()*x.paddingInner()/2).attr("y",-m.t+8)
    .attr("width",x.step()).attr("height",ih+m.t+m.b-8).attr("fill","transparent").classed("is-click",!!key)
    .on("mousemove",(e,d)=>window.showTip(e,{...d,label:dispLabel(d)})).on("mouseenter",(e,d)=>{grp.filter(r=>r===d).classed("is-hov",true);})
    .on("mouseleave",(e,d)=>{grp.filter(r=>r===d).classed("is-hov",false);window.hideTip();})
    .on("click",(e,d)=>{e.stopPropagation();if(key)window.toggleChartFilter(key,filtLabel(d));});
  el.__bars={sig,svgNode:svg.node()}; el.classList.add("pp-host");
};

/* ======================================================================
   WORD CLOUD (no external library) + varied chart types for Segments tab
   ====================================================================== */
const CLOUD_COL=[C.purple,C.turq,C.blue,C.mandarin,C.sienna,C.grey];
const SEG_COL=[C.purple,C.turq,C.blue,C.mandarin,C.sienna,C.grey,"#8E4FC0","#66D3CD","#6A5A9C","#FF9A85"];
const _cv=document.createElement("canvas").getContext("2d");
const FONT_STACK="Manrope,'DM Sans',Arial,sans-serif";
function measure(txt,size){_cv.font=`800 ${size}px ${FONT_STACK}`;return _cv.measureText(txt).width;}

function wordCloud(el,items,o){
  o=o||{};
  const w=Math.max(260,Math.floor(el.clientWidth||o.w||360)), h=o.h||280;
  const root=d3.select(el); root.selectAll("*").remove();
  if(!items.length){root.append("div").attr("class","empty-chart").text(EMPTY_MSG);return;}
  const sorted=[...items].sort((a,b)=>b.value-a.value).slice(0,o.max||40);
  const vmax=sorted[0].value||1, vmin=sorted[sorted.length-1].value||0;
  const fMax=Math.min(h*.2,o.maxFont||34), fMin=o.minFont||11;
  const sizeOf=v=>fMin+(vmax===vmin?1:Math.sqrt((v-vmin)/(vmax-vmin)))*(fMax-fMin);
  const placed=[];
  const hit=(b)=>placed.some(p=>!(b.x1<p.x0||b.x0>p.x1||b.y1<p.y0||b.y0>p.y1));
  sorted.forEach((it,i)=>{
    let size=sizeOf(it.value);
    for(let attempt=0;attempt<12;attempt++){
      const tw=measure(it.label,size)+6, th=size*1.08+3;
      let ok=false;
      for(let t=0;t<2200;t+=1){
        const ang=t*.35, rad=2+t*.22;
        const x=Math.cos(ang)*rad*(w/h>1.6?1.9:1.45), y=Math.sin(ang)*rad*.8;
        const b={x0:x-tw/2,x1:x+tw/2,y0:y-th/2,y1:y+th/2};
        if(Math.abs(b.x0)>w/2-4||Math.abs(b.x1)>w/2-4||Math.abs(b.y0)>h/2-4||Math.abs(b.y1)>h/2-4) continue;
        if(!hit(b)){placed.push({...b,it,size,x,y,i});ok=true;break;}
      }
      if(ok) break; size*=.9; if(size<8) break;
    }
  });
  const uid=uidOf("#"+(el.id||"wc"));
  const svg=root.append("svg").attr("class","pp-cloud").attr("width",w).attr("height",h).attr("viewBox",`${-w/2} ${-h/2} ${w} ${h}`);
  buildDefs(svg,uid,[]);
  const selVal=o.selected, any=selVal!=null&&selVal!=="";
  const g=svg.append("g").attr("filter",`url(#${uid}-sh)`);
  g.selectAll("text").data(placed).join("text").attr("class","pp-word").classed("is-click",!!o.onClick)
    .classed("is-sel",d=>any&&String(selVal)===String(d.it.filterLabel||d.it.label))
    .attr("x",d=>d.x).attr("y",d=>d.y).attr("dy","0.35em").attr("text-anchor","middle")
    .style("font-size",d=>d.size+"px").style("fill",d=>CLOUD_COL[d.i%CLOUD_COL.length])
    .style("opacity",d=>any&&String(selVal)!==String(d.it.filterLabel||d.it.label)?.28:1)
    .text(d=>d.it.label)
    .on("mousemove",(e,d)=>window.showTip(e,{label:d.it.label,value:d.it.value,count:d.it.count,total:d.it.base}))
    .on("mouseleave",()=>window.hideTip())
    .on("click",(e,d)=>{e.stopPropagation();if(o.onClick)o.onClick(d.it);});
}

/* Behaviour tab: Key Destinations Considered -> word cloud, filter key Q3 */
EXTRA_KEYS.inspireDestChart="Q3";
function destRows(data){
  if(chartFilters.Q3==null||!DATA||!DATA.records) return data;
  const src=rowsIgnoringChartFilter("Q3"), counts={}; let tot=0;
  src.forEach(r=>{
    const ex=[r.Q3_1,r.Q3_2,r.Q3_3].filter(v=>String(v||"").trim());
    (ex.length?ex:(Array.isArray(r.Q3)?r.Q3.slice(0,3):[])).forEach(d=>{
      const raw=String(d||"").trim(); if(!raw||raw==="Undecided") return;
      const k=typeof normalizeDest==="function"?normalizeDest(raw):raw;
      if(k&&k!=="Undecided"){counts[k]=(counts[k]||0)+1;tot++;}
    });
  });
  return Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([label,count])=>({label,count,total:tot,value:tot?count/tot:0}));
}
const _hb=window.horizontalBars;
window.horizontalBars=function(sel,data,opt){ if(sel==="#inspireDestChart") data=destRows(data); return _hb(sel,data,opt); };

/* ---------- Segments tab: a different visual per question ---------- */
const SEG_TYPES={Q12:"bars",Q7:"bars",Q21:"bars",Q9:"lollipop",Q16:"lollipop",Q22:"lollipop",QS5:"ribbon",Q8b:"waffle",Q14:"waffle",Q5:"rose",Q8:"ribbon",Q3:"rose"};
const SEG_SOFT=SEG_COL.map(c=>d3.color(d3.interpolateRgb(c,"#ffffff")(.34)).formatHex());
const LIGHT_PURPLE=SEG_SOFT[0];
const tipOf=(e,d)=>window.showTip(e,{label:d.label,value:d.value,count:d.count,total:d.base});
function legendHTML(host,rows){
  const lg=host.append("div").attr("class","pp-legend seg-legend");
  const r=lg.selectAll("div.pp-row").data(rows).join("div").attr("class","pp-row").attr("title",d=>dispLabel(d));
  r.append("span").attr("class","pp-sw").style("background",(d,i)=>SEG_SOFT[i%SEG_SOFT.length]);
  r.append("span").attr("class","pp-nm").text(d=>dispLabel(d));
  r.append("span").attr("class","pp-pc").text(d=>pctTxt(d.value));
}
const SEGVIZ={
  bars(el,rows,w){ window.horizontalBars("#"+el.id,rows.map(d=>({...d,total:d.base})),{color:LIGHT_PURPLE,gradient:true,height:rows.length*32+30,labelWidth:Math.min(150,Math.floor(w*.42))}); },
  donut(el,rows){ premiumPie("#"+el.id,rows.map(d=>({...d,total:d.base})),{category:"Segment answers",center:"answers"},[]); },
  cloud(el,rows,w){ wordCloud(el,rows.map(d=>({...d,filterLabel:d.label})),{h:230,max:14,maxFont:26,minFont:11}); },
  ribbon(el,rows,w){
    const colors=["#0055A5","#00A99D","#FF5635","#6A3E9B","#E3A100","#368A58","#C44575"], rowH=30, headerH=22, height=rows.length*rowH, svgW=100;
    const wrap=d3.select(el).append("div").attr("class","seg-ribbon");
    const layout=wrap.append("div").attr("class","seg-ribbon-layout");
    const table=layout.append("div").attr("class","seg-ribbon-table").style("--ribbon-rows",rows.length);
    const questionKey=(el.closest(".segment-question-section")?.getAttribute("aria-label")||"").split(" ")[0];
    const head=table.append("div").attr("class","seg-ribbon-head");
    head.append("span").text(questionKey==="Q8"?"CHANNEL":"PURPOSE"); head.append("span").text("SHARE");
    const line=table.selectAll("div.seg-ribbon-row").data(rows).join("div").attr("class","seg-ribbon-row");
    line.append("span").attr("class","seg-ribbon-name").attr("title",d=>d.label).text(d=>d.label);
    line.append("span").attr("class","seg-ribbon-pct").text(d=>pctTxt(d.value));
    line.on("mousemove",tipOf).on("mouseleave",()=>window.hideTip());

    const total=d3.sum(rows,d=>d.count)||1;
    let cursor=0;
    const bands=rows.map((d,i)=>{
      const y0=cursor, y1=cursor+height*d.count/total;
      cursor=y1;
      return {data:d,index:i,y0,y1,color:colors[i%colors.length]};
    });
    const svg=layout.append("svg").attr("class","seg-ribbon-svg").attr("viewBox",`0 0 ${svgW} ${height+headerH}`).style("height",`${height+headerH}px`).attr("aria-hidden","true");
    svg.selectAll("path.seg-ribbon-flow").data(bands).join("path").attr("class","seg-ribbon-flow")
      .attr("d",(d,i)=>{const y0=i*rowH+headerH,y1=y0+rowH,dy0=d.y0+headerH,dy1=d.y1+headerH,x1=svgW*.36,x2=svgW*.58;return `M0,${y0} C${x1},${y0} ${x2},${dy0} ${svgW-8},${dy0} L${svgW-8},${dy1} C${x2},${dy1} ${x1},${y1} 0,${y1} Z`;})
      .attr("fill",d=>d.color).attr("opacity",.58)
      .on("mousemove",(event,d)=>tipOf(event,d.data)).on("mouseleave",()=>window.hideTip());
    svg.selectAll("rect.seg-ribbon-stack").data(bands).join("rect").attr("class","seg-ribbon-stack")
      .attr("x",svgW-8).attr("y",d=>d.y0+headerH).attr("width",8).attr("height",d=>Math.max(0,d.y1-d.y0))
      .attr("fill",d=>d.color).attr("stroke","#fff").attr("stroke-width",.7);
  },
  lollipop(el,rows,w){
    const lw=Math.min(Math.floor(w*.5),170), rh=32, h=rows.length*rh+8, iw=w-lw-52, cpl=Math.max(8,Math.floor((lw-10)/5.4));
    const svg=d3.select(el).append("svg").attr("class","pp-bars").attr("width",w).attr("height",h).attr("viewBox",`0 0 ${w} ${h}`);
    const uid=uidOf("#"+el.id), defs=svg.append("defs");
    const lg=defs.append("linearGradient").attr("id",uid+"-line").attr("gradientUnits","userSpaceOnUse").attr("x1",0).attr("x2",iw).attr("y1",0).attr("y2",0);
    lg.append("stop").attr("offset","0%").attr("stop-color","#E4D4F5"); lg.append("stop").attr("offset","100%").attr("stop-color",LIGHT_PURPLE);
    const rgd=defs.append("radialGradient").attr("id",uid+"-dot").attr("cx",".35").attr("cy",".3").attr("r",".8");
    rgd.append("stop").attr("offset","0%").attr("stop-color","#E9DAF8"); rgd.append("stop").attr("offset","100%").attr("stop-color","#9B6FD1");
    const x=d3.scaleLinear().domain([0,d3.max(rows,d=>d.value)*1.1||1]).range([0,iw]);
    const g=svg.append("g").attr("transform",`translate(${lw},4)`);
    const rg=g.selectAll("g.lp").data(rows).join("g").attr("class","lp pp-bar").attr("transform",(d,i)=>`translate(0,${i*rh+rh/2})`);
    rg.append("line").attr("x1",0).attr("x2",d=>x(d.value)).attr("stroke",`url(#${uid}-line)`).attr("stroke-width",6).attr("stroke-linecap","round");
    rg.append("circle").attr("cx",d=>x(d.value)).attr("r",9).attr("fill",(d,i)=>i===0?"#FFA58F":`url(#${uid}-dot)`).attr("stroke","#fff").attr("stroke-width",2.2).style("filter","drop-shadow(0 2px 2px rgba(35,11,84,.28))");
    rg.append("text").attr("class","pp-val").attr("x",d=>x(d.value)+15).attr("dy","0.35em").text(d=>fmt(d.value));
    rg.each(function(d){const t=d3.select(this).append("text").attr("class","pp-lab").attr("text-anchor","end").attr("x",-9),r=wrap2(d.label,cpl),n=r.lines.length;
      r.lines.forEach((ln,k)=>t.append("tspan").attr("x",-9).attr("dy",k===0?(n===1?"0.35em":"-0.2em"):"1.12em").text(ln));t.append("title").text(d.label);});
    rg.on("mousemove",tipOf).on("mouseleave",()=>window.hideTip());
  },
  bubble(el,rows,w){
    const h=190, root=d3.hierarchy({children:rows}).sum(d=>d.value||0);
    const nodes=d3.pack().size([w,h]).padding(4)(root).leaves();
    const uid=uidOf("#"+el.id);
    const svg=d3.select(el).append("svg").attr("class","pp-bars").attr("width",w).attr("height",h).attr("viewBox",`0 0 ${w} ${h}`);
    buildDefs(svg,uid,SEG_COL);
    const g=svg.append("g").attr("filter",`url(#${uid}-sh)`).selectAll("g.bb").data(nodes).join("g").attr("class","bb pp-bar").attr("transform",d=>`translate(${d.x},${d.y})`);
    g.append("circle").attr("r",d=>d.r).attr("fill",(d,i)=>`url(#${uid}-${SEG_COL[i%SEG_COL.length].slice(1)})`).attr("stroke","#fff").attr("stroke-width",1.5);
    g.each(function(d,i){
      const t=d3.select(this).append("text").attr("text-anchor","middle").attr("class","pp-bub");
      const cpl=Math.max(5,Math.floor(d.r*1.6/5.2)), lines=d.r>24?wrap2(d.data.label,cpl).lines:[];
      const all=[...lines.slice(0,d.r>40?2:1),fmt(d.data.value)];
      all.forEach((ln,k)=>t.append("tspan").attr("x",0).attr("dy",k===0?`${-(all.length-1)*.55}em`:"1.1em").text(ln));
      if(d.r<=14) t.style("display","none");
    });
    g.on("mousemove",(e,d)=>tipOf(e,d.data)).on("mouseleave",()=>window.hideTip());
    const order=nodes.map(n=>n.data); const lg=d3.select(el); 
    legendHTML(lg,nodes.map(n=>n.data));
  },
  rose(el,rows,w){
    const wrap=d3.select(el).append("div").attr("class","seg-stack"), n=rows.length, R=Math.min(w/2-10,92), h=2*R+12;
    const svg=wrap.append("svg").attr("class","pp-bars").attr("width",w).attr("height",h).attr("viewBox",`0 0 ${w} ${h}`);
    const uid=uidOf("#"+el.id); buildDefs(svg,uid,SEG_SOFT,true);
    const vmax=d3.max(rows,d=>d.value)||1, step=2*Math.PI/n;
    const arc=d3.arc().innerRadius(10).cornerRadius(3).padAngle(.03);
    svg.append("g").attr("transform",`translate(${w/2},${R+6})`).attr("filter",`url(#${uid}-sh)`).selectAll("path").data(rows).join("path").attr("class","pp-bar is-click")
      .attr("d",(d,i)=>arc({startAngle:i*step,endAngle:(i+1)*step,outerRadius:10+(R-10)*Math.sqrt(d.value/vmax)}))
      .attr("fill",(d,i)=>`url(#${uid}-${SEG_SOFT[i%SEG_SOFT.length].slice(1)})`).attr("stroke","#fff").attr("stroke-width",1)
      .on("mousemove",tipOf).on("mouseleave",()=>window.hideTip());
    legendHTML(wrap,rows);
  },
  radial(el,rows,w){
    const n=rows.length, R=Math.min(w/2-8,104), rw=Math.min(11,(R-10)/n-3), h=2*R+10;
    const svg=d3.select(el).append("svg").attr("class","pp-bars").attr("width",w).attr("height",h).attr("viewBox",`0 0 ${w} ${h}`);
    const uid=uidOf("#"+el.id); buildDefs(svg,uid,SEG_COL);
    const vmax=d3.max(rows,d=>d.value)||1, sweep=Math.PI*1.5;
    const g=svg.append("g").attr("transform",`translate(${w/2},${R+5})`);
    rows.forEach((d,i)=>{
      const ro=R-i*(rw+3), ri=ro-rw, col=SEG_COL[i%SEG_COL.length];
      const a=d3.arc().innerRadius(ri).outerRadius(ro).cornerRadius(rw/2);
      g.append("path").attr("d",a({startAngle:0,endAngle:sweep})).attr("fill","#efe9f6");
      g.append("path").attr("class","pp-bar is-click").attr("d",a({startAngle:0,endAngle:sweep*d.value/vmax})).attr("fill",`url(#${uid}-${col.slice(1)})`)
        .style("filter","drop-shadow(0 2px 2px rgba(35,11,84,.3))").on("mousemove",e=>tipOf(e,d)).on("mouseleave",()=>window.hideTip());
      const txt=(d.label.length>24?d.label.slice(0,23)+"…":d.label)+" · "+fmt(d.value);
      g.append("text").attr("class","pp-lab").attr("x",-6).attr("y",-(ro-rw/2)).attr("dy","0.35em").attr("text-anchor","end").style("font-size","9px").text(txt).append("title").text(d.label+" · "+fmt(d.value));
    });
  },
  waffle(el,rows,w){
    const wrap=d3.select(el).append("div").attr("class","pp-wrap seg-wrap"), cell=15, gap=2, S=10*(cell+gap);
    const tot=d3.sum(rows,d=>d.value)||1, cells=[]; let acc=0;
    rows.forEach((d,i)=>{const upto=Math.round((acc+d.value)/tot*100); for(let k=cells.length;k<upto;k++) cells.push(i); acc+=d.value;});
    while(cells.length<100) cells.push(rows.length-1);
    const uid=uidOf("#"+el.id), svg=wrap.append("div").attr("class","pp-chart").append("svg").attr("class","pp-svg").attr("width",S).attr("height",S).attr("viewBox",`0 0 ${S} ${S}`);
    buildDefs(svg,uid,SEG_SOFT,true);
    svg.append("g").attr("filter",`url(#${uid}-sh)`).selectAll("rect").data(cells).join("rect").attr("class","pp-bar")
      .attr("x",(d,i)=>(i%10)*(cell+gap)).attr("y",(d,i)=>(9-Math.floor(i/10))*(cell+gap)).attr("width",cell).attr("height",cell).attr("rx",4)
      .attr("fill",d=>`url(#${uid}-${SEG_SOFT[d%SEG_SOFT.length].slice(1)})`)
      .on("mousemove",(e,d)=>tipOf(e,rows[d])).on("mouseleave",()=>window.hideTip());
    legendHTML(wrap,rows);
  },
  treemap(el,rows,w){
    const h=230, root=d3.hierarchy({children:rows}).sum(d=>d.value||0).sort((a,b)=>b.value-a.value);
    const leaves=d3.treemap().size([w,h]).paddingInner(3).round(true)(root).leaves();
    const uid=uidOf("#"+el.id);
    const svg=d3.select(el).append("svg").attr("class","pp-bars").attr("width",w).attr("height",h).attr("viewBox",`0 0 ${w} ${h}`);
    buildDefs(svg,uid,SEG_COL);
    const g=svg.append("g").attr("filter",`url(#${uid}-sh)`).selectAll("g.tm").data(leaves).join("g").attr("class","tm pp-bar");
    g.append("rect").attr("x",d=>d.x0).attr("y",d=>d.y0).attr("width",d=>d.x1-d.x0).attr("height",d=>d.y1-d.y0).attr("rx",6)
      .attr("fill",(d,i)=>`url(#${uid}-${SEG_COL[i%SEG_COL.length].slice(1)})`);
    g.each(function(d){
      const bw=d.x1-d.x0,bh=d.y1-d.y0; if(bw<34||bh<22) return;
      const t=d3.select(this).append("text").attr("class","pp-bub").attr("text-anchor","start");
      const lines=bh>38?wrap2(d.data.label,Math.max(5,Math.floor((bw-10)/5.3))).lines.slice(0,bh>58?2:1):[];
      [...lines,fmt(d.data.value)].forEach((ln,k)=>t.append("tspan").attr("x",d.x0+6).attr("y",d.y0+14+k*12).text(ln));
    });
    g.on("mousemove",(e,d)=>tipOf(e,d.data)).on("mouseleave",()=>window.hideTip());
  }
};
function enhanceSegments(){
  document.querySelectorAll(".segment-question-section").forEach((sec,si)=>{
    const key=(sec.getAttribute("aria-label")||"").split(" ")[0], type=SEG_TYPES[key], fn=SEGVIZ[type];
    if(!fn) return;
    sec.querySelectorAll(".segment-profile-card--bars").forEach((card,ci)=>{
      const list=card.querySelector(".segment-factor-list"); if(!list) return;
      const rows=[...list.querySelectorAll(".segment-factor-row")].map(r=>{
        const c=+r.dataset.count, b=+r.dataset.base||1;
        return {label:(r.dataset.label||"").replace(/\s*\(e\.g\.,[^)]*\)/i,"").replace(/\s*(?:â€”|—|–)\s*e\.g\..*$/i,"").trim(),count:c,base:b,value:b?c/b:0};
      }).filter(r=>r.label&&r.value>0);
      if(!rows.length) return;
      const host=document.createElement("div"); host.className="seg-viz pp-host"; host.id=`segviz-${si}-${ci}`;
      list.replaceWith(host);
      card.classList.add("seg-card-viz");
      const w=Math.max(240,Math.floor(host.clientWidth||card.clientWidth-24||300));
      fn(host,rows,w);
    });
  });
}
const _rs=window.renderSegments;
if(typeof _rs==="function") window.renderSegments=function(){ const r=_rs.apply(this,arguments); try{enhanceSegments();}catch(e){console.warn("segment charts",e);} return r; };

(function(){const b=document.getElementById("segmentsResetBtn"); if(b&&!b.__bound){b.__bound=true;b.addEventListener("click",()=>{window.hideTip();runDashboardUpdate(()=>resetFilters(),"Resetting filters...");});}})();

/* ======================================================================
   Segments tab: country-based photos (pre-computed 960px WebP + manifest)
   segment-card-photo/<Country>/webp/{18-34,35-54,55-plus}.webp
   ====================================================================== */
const MARKET_FOLDER={"Korea, Republic of (South Korea)":"South Korea","Russian Federation":"Russia","United Arab Emirates":"UAE","United Kingdom":"UK","United States of America":"USA"};
let PHOTO_MAN=null, photoPromise=null, folderRegion=null, prefetched=false;
const PHOTO_PICKS=new Map();
function loadPhotoManifest(){
  if(!photoPromise) photoPromise=fetch("segment-card-photo/manifest.json").then(r=>r.ok?r.json():null).then(m=>{PHOTO_MAN=m;return m;}).catch(()=>null);
  return photoPromise;
}
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
function buildFolderRegion(){
  if(folderRegion||!DATA||!DATA.records) return;
  folderRegion={};
  DATA.records.forEach(r=>{const f=MARKET_FOLDER[r.Market]||r.Market; if(f&&!folderRegion[f]) folderRegion[f]=r.Region;});
}
function pickPhotos(){
  const man=PHOTO_MAN; if(!man) return null;
  buildFolderRegion();
  const folders=Object.keys(man), region=f=>(folderRegion||{})[f];
  let chosen=(filterSelections.Market||[]).map(m=>MARKET_FOLDER[m]||m).filter(f=>man[f]);
  if(!chosen.length&&(filterSelections.Region||[]).length){
    const rs=new Set(filterSelections.Region); chosen=folders.filter(f=>rs.has(region(f)));
  }
  const key=(typeof activeSegmentView!=="undefined"?activeSegmentView:"age")+"|"+JSON.stringify([...chosen].sort());
  if(PHOTO_PICKS.has(key)) return PHOTO_PICKS.get(key);
  let pool;
  if(chosen.length===1) pool=[chosen[0],chosen[0],chosen[0]];                 /* one country: all three segments from its folder */
  else{
    pool=shuffle(chosen).slice(0,3);
    if(pool.length<3){                                                         /* fill remaining slots from other, preferably same-region, countries */
      const used=new Set(pool), regs=new Set(pool.map(region));
      const rest=folders.filter(f=>!used.has(f));
      const near=shuffle(rest.filter(f=>regs.has(region(f)))), far=shuffle(rest.filter(f=>!regs.has(region(f))));
      const fill=[...near,...far]; while(pool.length<3&&fill.length) pool.push(fill.shift());
    }
    pool=shuffle(pool);
  }
  const picks=pool.map((f,i)=>man[f][i]);
  PHOTO_PICKS.set(key,picks); return picks;
}
function applySegmentPhotos(){
  const run=()=>{
    const picks=pickPhotos();
    ["#segmentAgeCohorts","#segmentBudgetCohorts"].forEach(id=>{
      document.querySelectorAll(id+" .segment-card-photo img").forEach((img,i)=>{
        const url=picks&&picks[i]?picks[i]:img.dataset.fallback;
        if(url&&img.getAttribute("src")!==url) img.src=url;
      });
    });
    if(PHOTO_MAN&&!prefetched){ prefetched=true;
      const all=Object.values(PHOTO_MAN).flat(), idle=window.requestIdleCallback||(f=>setTimeout(f,400));
      idle(()=>all.forEach((u,k)=>setTimeout(()=>{const im=new Image();im.decoding="async";im.src=u;},k*60)));
    }
  };
  if(PHOTO_MAN) run(); else loadPhotoManifest().then(run);
}
loadPhotoManifest();                                  /* start fetching the tiny manifest at page load */
const _rs2=window.renderSegments;
window.renderSegments=function(){ const r=_rs2.apply(this,arguments); try{applySegmentPhotos();}catch(e){console.warn("segment photos",e);} return r; };
})();
