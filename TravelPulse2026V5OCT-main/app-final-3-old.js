
/* ---------- authentication ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      sessionStorage.removeItem("travelPulseAuth");
      window.location.replace("login.html");
    });
  }
});

const palette=["#530095","#FF5635","#00B5AC","#EEFF3B","#9A1B15","#230B54","#3F3F3F"];
const fmt=d3.format(".0%");
const chartColor=(i,mode="palette")=>{
  if(mode==="horizontal") return i===0?"#530095":i===1?"#230B54":"#00B5AC";
  if(mode==="bar") return i===0?palette[0]:palette[i%palette.length];
  return palette[i%palette.length];
};
const selectedOpacity=(selected,label)=>selected&&String(selected)!==String(label)?0.38:1;
const CP1252_BYTES={"€":0x80,"‚":0x82,"ƒ":0x83,"„":0x84,"…":0x85,"†":0x86,"‡":0x87,"ˆ":0x88,"‰":0x89,"Š":0x8a,"‹":0x8b,"Œ":0x8c,"Ž":0x8e,"‘":0x91,"’":0x92,"“":0x93,"”":0x94,"•":0x95,"–":0x96,"—":0x97,"˜":0x98,"™":0x99,"š":0x9a,"›":0x9b,"œ":0x9c,"ž":0x9e,"Ÿ":0x9f};
const ENGLISH_TEXT_ALIASES={"ケープタウン":"Cape Town","تركيا":"Turkey","كوريا":"South Korea","터키":"Turkey","데엠프리미엄호텔":"DM Premium Hotel"};
function repairMojibake(value){
  let result=String(value??"");
  for(let attempt=0;attempt<2&&/[ÃÂÐÑØÙæçéíîïëìðñòóôõöøùúûüýþÿ„‚…†‡‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/.test(result);attempt++){
    try{
      const bytes=Array.from(result,ch=>CP1252_BYTES[ch]??ch.charCodeAt(0));
      const decoded=new TextDecoder("utf-8",{fatal:true}).decode(new Uint8Array(bytes));
      if(decoded===result)return result;
      result=decoded;
    }catch(_){break;}
  }
  return result;
}
const clean=s=>{
  const value=repairMojibake(s).replace(/â€“/g,"–").replace(/â€”/g,"—").replace(/â€™/g,"’").replace(/\s+/g," ").trim();
  return value.split(/\s*,\s*/).map(part=>ENGLISH_TEXT_ALIASES[part]||part).join(", ");
};
const REGIONS=["Asia","Europe","LATAM","ME","North America","Oceania","Africa"];
const REGION_SHORT={"North America":"N. America"};
const shortRegion=r=>REGION_SHORT[r]||r;
const MARKET_ALIASES={
  "Russia":"Russian Federation",
  "South Korea":"Korea, Republic of (South Korea)",
  "UAE":"United Arab Emirates",
  "UK":"United Kingdom",
  "USA":"United States of America",
  "United States":"United States of America"
};
const MARKET_REGIONS={
  "Australia":"Oceania","Bahrain":"ME","Brazil":"LATAM","Canada":"North America",
  "China":"Asia","Egypt":"Africa","France":"Europe","Germany":"Europe",
  "India":"Asia","Indonesia":"Asia","Ireland":"Europe","Italy":"Europe",
  "Japan":"Asia","Jordan":"ME","Kenya":"Africa","Korea, Republic of (South Korea)":"Asia",
  "Malaysia":"Asia","Netherlands":"Europe","Nigeria":"Africa","Qatar":"ME",
  "Russian Federation":"Europe","Saudi Arabia":"ME","Singapore":"Asia","South Africa":"Africa",
  "Spain":"Europe","Switzerland":"Europe","Thailand":"Asia","Turkey":"ME",
  "United Arab Emirates":"ME","United Kingdom":"Europe","United States of America":"North America"
};
const DEST_NORMALIZER = {
  'Ð•Ð³Ð¸Ð¿ÐµÑ‚': 'Egypt', 'Египет': 'Egypt', 'egipt': 'Egypt', 'egipto': 'Egypt',
  'ÐšÐ¸Ñ‚Ð°Ð¹': 'China', 'Китай': 'China',
  'ÐžÐ Ð­': 'UAE', 'ОАЭ': 'UAE', 'ÐžÐ\x90Ð­': 'UAE', 'ÐžÐÐ­': 'UAE',
  'Ð¡Ð°ÑƒÐ´Ð¾Ð²Ñ\x81ÐºÐ°Ñ\x8F Ð\x90Ñ€Ð°Ð²Ð¸Ñ\x8F': 'Saudi Arabia', 'Ð¡Ð°ÑƒÐ´Ð¾Ð²Ñ ÐºÐ°Ñ  Ð Ñ€Ð°Ð²Ð¸Ñ ': 'Saudi Arabia', 'Ð¡Ð°ÑƒÐ´Ð¾Ð²Ñ\x81ÐºÐ°Ñ\x8F ÐÑ€Ð°Ð²Ð¸Ñ\x8F': 'Saudi Arabia',
  'Саудовская Аравия': 'Saudi Arabia', 'ñ\x81Ð°ÑƒÐ´Ð¾Ð²Ñ\x81ÐºÐ°Ñ\x8F Ð\x90Ñ€Ð°Ð²Ð¸Ñ\x8F': 'Saudi Arabia', 'Ñ\x81Ð°ÑƒÐ´Ð¾Ð²Ñ\x81ÐºÐ°Ñ\x8F Ð\x90Ñ€Ð°Ð²Ð¸Ñ\x8F': 'Saudi Arabia', 'саудовская аравия': 'Saudi Arabia',
  'Ð’ÑŒÐµÑ‚Ð½Ð°Ð¼': 'Vietnam', 'Ð²ÑŒÐµÑ‚Ð½Ð°Ð¼': 'Vietnam', 'Вьетнам': 'Vietnam', 'вьетнам': 'Vietnam',
  'Ð¢Ð°Ð¸Ð»Ð°Ð½Ð´': 'Thailand', 'Ð¢Ð°Ð¹Ð»Ð°Ð½Ð´': 'Thailand', 'Ñ‚Ð°Ð¸Ð»Ð°Ð½Ð´': 'Thailand', 'Таиланд': 'Thailand', 'таиланд': 'Thailand',
  'Ð”ÑƒÐ±Ð°Ð¹': 'Dubai', 'Дубай': 'Dubai', 'Ð°Ñ„Ñ€Ð¸ÐºÐ°': 'Africa', 'Африка': 'Africa', 'Ð¢Ð°Ð¹Ð²Ð°Ð½ÑŒ': 'Taiwan', 'Тайвань': 'Taiwan',
  'Ñ‚ÑƒÑ€Ñ†Ð¸Ñ ': 'Turkey', 'Ñ‚ÑƒÑ€Ñ†Ð¸Ñ': 'Turkey', 'Турция': 'Turkey', 'турция': 'Turkey',
  'Ñ‚ÑƒÐ½Ð¸Ñ ': 'Tunisia', 'Ñ‚ÑƒÐ½Ð¸Ñ': 'Tunisia', 'Тунис': 'Tunisia', 'тунис': 'Tunisia',
  'Ð®Ð¶Ð½Ð°Ñ  ÐšÐ¾Ñ€ÐµÑ ': 'South Korea', 'Южная Корея': 'South Korea', 'ÐœÐ°Ð»Ð°Ð¹Ð·Ð¸Ñ ': 'Malaysia', 'Малайзия': 'Malaysia',
  'ÐšÐ°Ñ‚Ð°Ñ€': 'Qatar', 'Катар': 'Qatar', 'Ð¡Ð¸Ð½Ð³Ð°Ð¿ÑƒÑ€': 'Singapore', 'Сингапур': 'Singapore',
  'Ð½Ðµ Ð·Ð½Ð°ÑŽ': 'Undecided', 'æ–°åŠ å ¡': 'Singapore', '新加坡': 'Singapore', 'æ–°è¥¿å…°': 'New Zealand', '新西兰': 'New Zealand',
  'æ—¥æœ¬': 'Japan', '日本': 'Japan', 'ç¾Žå›½': 'USA', '美国': 'USA', 'æ³•å›½': 'France', '法国': 'France',
  'è‹±å›½': 'UK', '英国': 'UK', 'æ³°å›½': 'Thailand', '泰国': 'Thailand', 'å °æ¹¾': 'Taiwan', '台湾': 'Taiwan',
  'éŸ“å›½': 'South Korea', '韩国': 'South Korea', 'é©¬æ ¥è¥¿äºš': 'Malaysia', '马来西亚': 'Malaysia',
  'æ¾³å¤§åˆ©äºš': 'Australia', '澳大利亚': 'Australia', 'é˜¿è ”é…‹è¿ªæ‹œ': 'Dubai', 'è¿ªæ‹œ': 'Dubai', '迪拜': 'Dubai',
  'é˜¿å¸ƒæ‰Žæ¯”': 'Abu Dhabi', 'å·´é»Ž': 'Paris', 'äº‘å —': 'Yunnan (China)', 'ä¸Šæµ·': 'Shanghai (China)',
  'ä¿„ç½—æ–¯': 'Russia', 'å¾·å›½': 'Germany', 'åŠ æ‹¿å¤§': 'Canada', 'é¦™æ¸¯': 'Hong Kong', 'æ¾³é—¨': 'Macau', 'å —ã‚¢ãƒ•ãƒªã‚«': 'South Africa',
  'ã‚¯ãƒ­ã‚¢ãƒ ã‚¢': 'Croatia', 'ãƒ•ãƒ©ãƒ³ã‚¹': 'France', 'ãƒ™ãƒˆãƒŠãƒ ': 'Vietnam', 'ã‚¹ã‚¤ã‚¹': 'Switzerland',
  'ã‚®ãƒªã‚·ã‚¢': 'Greece', 'ã‚¤ãƒ³ãƒ‰': 'India', 'ã‚¦ã‚ºãƒ™ã‚­ã‚¹ã‚¿ãƒ³': 'Uzbekistan', 'ã‚¦ã‚£ãƒ¼ãƒ³': 'Vienna',
  'ãƒ™ãƒ ãƒ ã‚¢': 'Venice', 'ã‚ªãƒ¼ã‚¹ãƒˆãƒ©ãƒªã‚¢': 'Australia', 'ãƒ‹ãƒ¥ãƒ¼ã‚¸ãƒ¼ãƒ©ãƒ³ãƒ‰': 'New Zealand',
  'ã‚«ãƒŠãƒ€': 'Canada', 'ã‚¿ã‚¤': 'Thailand', 'ãƒ‹ãƒ¥ãƒ¼ãƒ¨ãƒ¼ã‚¯': 'New York', 'ãƒ‘ãƒª': 'Paris',
  'ãƒ­ãƒ³ãƒ‰ãƒ³': 'London', 'ã‚·ãƒ³ã‚¬ãƒ ãƒ¼ãƒ«': 'Singapore', 'ãƒžãƒ¬ãƒ¼ã‚·ã‚¢': 'Malaysia', 'ãƒžã‚«ã‚ª': 'Macau',
  'ã‚¢ãƒ¡ãƒªã‚«': 'USA', 'ã‚°ã‚¢ãƒ ': 'Guam', 'ã‚±ãƒ¼ãƒ—ã‚¿ã‚¦ãƒ³': 'Cape Town',
  'ì ¼ë³¸': 'Japan', 'ì‹±ê°€í ¬ë¥´': 'Singapore', 'í™ ì½©': 'Hong Kong', 'ëŒ€ë§Œ': 'Taiwan',
  'ë¯¸êµ­': 'USA', 'ì•„ë¥´í—¨í‹°ë‚˜': 'Argentina', 'ë² íŠ¸ë‚¨': 'Vietnam', 'ë „ì¿„': 'Tokyo',
  'ë ´ë§ˆí ¬': 'Denmark', 'í„°í‚¤': 'Turkey', '터키': 'Turkey',
  'Ø§Ø³ØªØ±Ø§Ù„ÙŠØ§': 'Australia', 'Ø³ÙˆÙŠØ³Ø±Ø§': 'Switzerland', 'Ø§Ù„Ø¨ÙˆØ³Ù†Ù‡ ÙˆØ§Ù„Ù‡Ø±Ø³Ùƒ': 'Bosnia and Herzegovina',
  'Ø¯Ø¨ÙŠ': 'Dubai', 'Ø§Ù„Ø¥Ù…Ø§Ø±Ø§Øª': 'UAE', 'Ø§Ù„ØµÙŠÙ†': 'China', 'Ø§Ø¨Ùˆ Ø¸Ø¨ÙŠ': 'Abu Dhabi', 'Ø§Ø¨ÙˆØ¸Ø¨ÙŠ': 'Abu Dhabi',
  'Ø³Ù†ØºØ§Ù ÙˆØ±Ø©': 'Singapore', 'Ø§Ù„Ø³Ø¹ÙˆØ¯ÙŠØ©': 'Saudi Arabia', 'Ø§Ù„Ø³Ø¹ÙˆØ¯ÙŠÙ‡': 'Saudi Arabia',
  'Ù…ØµØ±': 'Egypt', 'Ø§Ù„Ù…Ù…Ù„ÙƒØ© Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© Ø§Ù„Ø³Ø¹ÙˆØ¯ÙŠØ©': 'Saudi Arabia', 'Ø§ÙŠØ³Ù„Ù†Ø¯Ø§': 'Iceland',
  'Ø§Ù„Ù‚Ø·Ø±ÙŠÙ‡': 'Qatar', 'Ø§Ù„Ø§ØªØ­Ø§Ø¯': 'UAE', 'ØªØ§ÙŠÙ„Ù†Ø¯': 'Thailand', 'ÙƒÙˆØ±ÙŠØ§': 'South Korea',
  'Ù Ø±Ù†Ø³Ø§': 'France', 'Ø§Ù„ÙƒÙˆÙŠØª': 'Kuwait', 'Ø³ÙˆØ±ÙŠØ§': 'Syria', 'Ø§Ø³Ø¨Ø§Ù†ÙŠØ§': 'Spain',
  'à¸ªà¹€à¸›à¸™': 'Spain', 'à¸ˆà¸µà¸™': 'China', 'à¹„à¸•à¹‰à¸«à¸§à¸±à¸™': 'Taiwan', 'à¸ à¸µà¹ˆà¸›à¸¸à¹ˆà¸™': 'Japan',
  'Ä°ngiltere': 'UK', 'Ä°TALYA': 'Italy', 'Ä°talya': 'Italy', 'GÃœNEY KORE': 'South Korea', 'TÃ¼rkiye': 'Turkey', 'TÃ¼rkei': 'Turkey', 'Türkiye': 'Turkey',
  'franÃ§a': 'France', 'FranÃ§a': 'France', 'ItÃ¡lia': 'Italy', 'SuÃ­Ã§a': 'Switzerland', 'KaradaÄŸ': 'Montenegro',
  'BelÃ§ika': 'Belgium', 'Ä°sviÃ§re': 'Switzerland', 'BirleÅŸik Arap Emirlikleri': 'UAE', 'Ã‡in': 'China',
  'TÃºnez': 'Tunisia', 'norveÃ§': 'Norway', 'grÃ©cia': 'Greece', 'austrÃ¡lia': 'Australia', 'slovÃ©nie': 'Slovenia',
  'kamboÃ§ya': 'Cambodia', 'brÃ©sil': 'Brazil', 'Ã–sterreich': 'Austria', 'JapÃ³n': 'Japan', 'CanadÃ¡': 'Canada',
  'TÃ¡nger': 'Morocco', 'SpeÉªn': 'Spain', 'Southâ€‘Korea': 'South Korea',
  'spain': 'Spain', 'vietnam': 'Vietnam', 'CHINA': 'China', 'TURKEY': 'Turkey', 'Dubai': 'UAE'
};
const normalizeDest = d => {
  if (!d) return "";
  const s = clean(d);
  if (DEST_NORMALIZER[s]) return DEST_NORMALIZER[s];
  const lower = s.toLowerCase();
  if (DEST_NORMALIZER[lower]) return DEST_NORMALIZER[lower];
  if (lower === "usa" || lower === "us" || lower === "united states of america") return "United States";
  if (lower === "uk" || lower === "great britain") return "United Kingdom";
  if (lower === "uae") return "United Arab Emirates";
  if (lower === "ksa") return "Saudi Arabia";
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const normalizeRecord=r=>{
  const market=MARKET_ALIASES[clean(r.Market)]||clean(r.Market);
  const hotelBrand=clean(r.hotelBrand||r.Q21).replace(/<[^>]*>/g,"").trim();
  return {
    ...r,
    Market:market,
    Region:clean(r.Region)||MARKET_REGIONS[market]||"",
    hotelBrand,
    Q21:clean(r.Q21||hotelBrand).replace(/<[^>]*>/g,"").trim()
  };
};
const AGES=["18-24","25-34","35-44","45-54","55-65","65+"];
const MARKETS=["Australia","Bahrain","Brazil","Canada","China","Egypt","France","Germany","India","Indonesia","Italy","Japan","Jordan","Kenya","Malaysia","Netherlands","Nigeria","Qatar","Russian Federation","Saudi Arabia","Singapore","Korea, Republic of (South Korea)","Spain","Switzerland","Thailand","Turkey","United Arab Emirates","United Kingdom","United States of America","South Africa","Ireland"];
const MARKET_ISO3={
  Australia:"AUS",Bahrain:"BHR",Brazil:"BRA",Canada:"CAN",China:"CHN",Egypt:"EGY",France:"FRA",Germany:"DEU",India:"IND",Indonesia:"IDN",Italy:"ITA",Japan:"JPN",Jordan:"JOR",Kenya:"KEN",Malaysia:"MYS",Netherlands:"NLD",Nigeria:"NGA",Qatar:"QAT",
  "Russian Federation":"RUS","Saudi Arabia":"SAU",Singapore:"SGP","Korea, Republic of (South Korea)":"KOR",Spain:"ESP",Switzerland:"CHE",Thailand:"THA",Turkey:"TUR","United Arab Emirates":"ARE","United Kingdom":"GBR","United States of America":"USA","South Africa":"ZAF",Ireland:"IRL"
};
const ISO3_TO_MARKET=Object.fromEntries(Object.entries(MARKET_ISO3).map(([market,iso])=>[iso,market]));
function marketFromGeoFeature(f){
  const p=f&&f.properties||{};
  const iso=String(p.iso_a3||p.ISO_A3||p.ADM0_ISO||p.ADM0_A3||"").toUpperCase();
  if(iso&&ISO3_TO_MARKET[iso]) return ISO3_TO_MARKET[iso];
  const name=p.name||p.NAME||p.ADMIN||"";
  const aliases={Russia:"Russian Federation","South Korea":"Korea, Republic of (South Korea)","United States":"United States of America"};
  const candidate=aliases[name]||name;
  return MARKETS.includes(candidate)?candidate:null;
}

const DEMOGRAPHICS=["18-24","25-34","35-44","45-54","55-65","65+","Male","Female","Prefer not to say","Single, never married","Living with partner","Married","Separated","Divorced","Widowed","Yes","No","Low","Medium","High","Business owner","C-level executive","Business unit head / Senior management","Middle management","Junior management or entry level executive"];
const TRIP_TYPES=["LEISURE","BUSINESS","BLEISURE"];
let FILTER_CONFIG=[
  {value:"Market",label:"Source Market",options:()=>MARKETS,default:[]},
  {value:"Age Group",label:"Age",options:()=>["18-24","25-34","35-44","45-54","55-65","65+"],default:[]},
  {value:"Income",label:"Income",options:()=>["Low","Medium","High"],default:[]},
  {value:"Segments",label:"Segments",options:()=>[],default:[]},
  {value:"Trip Type",label:"Traveler Type",options:()=>TRIP_TYPES,default:[]},
];
/* Marital Status, Children, Companion are now displayed as charts, not filters */
let DATA, segment="All", currentTab="behaviour", filterDim="Market", activeSelections=[];
let currentJourneyStage="Inspire";
const filterSelections={};
const tooltip=d3.select("#tooltip");
let WORLD=null;
let worldPromise=null;
let socialPromise=null;
const MARKET_COORDS={
  "Australia":[134,-25],"Bahrain":[50.5,26],"Brazil":[-51,-10],"Canada":[-106,57],"China":[103,35],"Egypt":[30,27],"France":[2,46],"Germany":[10,51],"India":[79,22],"Indonesia":[118,-2],"Italy":[12,42],"Japan":[138,37],"Jordan":[36,31],"Kenya":[37,-0.2],"Malaysia":[102,4],"Netherlands":[5.3,52.2],"Nigeria":[8,9],"Qatar":[51.2,25.3],"Russian Federation":[90,61],"Saudi Arabia":[45,24],"Singapore":[103.8,1.35],"Korea, Republic of (South Korea)":[127.8,36],"Spain":[-3.5,40],"Switzerland":[8.2,46.8],"Thailand":[101,15],"Turkey":[35,39],"United Arab Emirates":[54,24],"United Kingdom":[-2,54],"United States of America":[-100,39],"South Africa":[24,-29],"Ireland":[-8,53]
};
const METRIC_CFG={
    airlineNPS:{ label:"Airline NPS",  min:-20, max:100, fmt:v=>`${v.toFixed(0)} NPS`,
                  c0:"#E24B4A", c50:"#f5c842", c100:"#1D9E75", midpoint:0 },
    hotelNPS:  { label:"Hotel NPS",    min:-20, max:100, fmt:v=>`${v.toFixed(0)} NPS`,
                  c0:"#E24B4A", c50:"#f5c842", c100:"#1D9E75", midpoint:0 },
    spendInc:  { label:"Spend increase %", min:30, max:100, fmt:v=>`${v.toFixed(0)}%`,
                  c0:"#d9c5e8", c100:"#530095" },
    aiAdopt:   { label:"AI adoption %",    min:30, max:100, fmt:v=>`${v.toFixed(0)}%`,
                  c0:"#d5f0ee", c100:"#12a594" },
    booked:    { label:"Already booked %", min:0,  max:35,  fmt:v=>`${v.toFixed(0)}%`,
                  c0:"#fff0ed", c100:"#FF5635" },
    business:  { label:"Business travellers %", min:0, max:70, fmt:v=>`${v.toFixed(0)}%`,
                  c0:"#e8f4ff", c100:"#185FA5" },
    premium:   { label:"Premium cabin %",  min:0,  max:75, fmt:v=>`${v.toFixed(0)}%`,
                  c0:"#f5e8ff", c100:"#7B2FBE" },
    respondents:{ label:"Respondents",    min:0,  max:110, fmt:v=>`${Math.round(v)} respondents`,
                  c0:"#d9c5e8", c100:"#530095" }
  };

(function hideAllXAxisLabels(){
  if(!window.d3 || d3.__travelPulseXAxisLabelsHidden) return;
  const originalAxisBottom = d3.axisBottom;
  d3.axisBottom = function(...args){
    const axis = originalAxisBottom.apply(this,args);
    const wrapped = function(context){
      axis(context);
      const selection = context && typeof context.selectAll === "function" ? context : d3.select(context);
      selection.classed("x-axis-hidden", true);
      selection.selectAll("text").style("display","none").text("");
      return context;
    };
    [
      "scale","ticks","tickArguments","tickValues","tickFormat",
      "tickSize","tickSizeInner","tickSizeOuter","tickPadding","offset"
    ].forEach(method=>{
      if(typeof axis[method] !== "function") return;
      wrapped[method] = function(...methodArgs){
        const result = axis[method].apply(axis,methodArgs);
        return result === axis ? wrapped : result;
      };
    });
    return wrapped;
  };
  d3.__travelPulseXAxisLabelsHidden = true;
})();

function attachMapZoomControls(container, svg, zoomLayer){
  const root = typeof container === "string" ? document.querySelector(container) : container;
  if(!root || !svg || !zoomLayer || !d3?.zoom) return;
  root.style.position = root.style.position || "relative";
  root.querySelectorAll(".map-zoom-controls").forEach(el => el.remove());

  const controls = document.createElement("div");
  controls.className = "map-zoom-controls";
  controls.innerHTML = `
    <button type="button" class="map-zoom-btn" data-zoom="in" aria-label="Zoom In" title="Zoom In (+)">+</button>
    <button type="button" class="map-zoom-btn" data-zoom="out" aria-label="Zoom Out" title="Zoom Out (-)">-</button>
  `;
  root.appendChild(controls);

  const zoom = d3.zoom()
    .scaleExtent([1, 6])
    .on("zoom", event => zoomLayer.attr("transform", event.transform));

  svg.call(zoom).on("dblclick.zoom", null);
  controls.addEventListener("click", event => {
    const btn = event.target.closest("[data-zoom]");
    if(!btn) return;
    event.preventDefault();
    event.stopPropagation();
    const factor = btn.dataset.zoom === "in" ? 1.25 : 0.8;
    svg.transition().duration(220).call(zoom.scaleBy, factor);
  });
}
window.attachMapZoomControls = attachMapZoomControls;

/* ══════════════════════════════════════════════════════════════
   CHUNKED JSON LOADER  —  replaces monolithic data.json fetch
   ══════════════════════════════════════════════════════════════
   Architecture:
     data/manifest.json      — index of all chunk URLs
     data/bootstrap.json     — meta, questions, filterOptions (188 KB)
     data/records-{region}.json — survey records split by region (~250-1950 KB each)
     data/matrix-q18.json    — Q18 airline strategy matrix (594 KB, lazy)
     data/matrix-q24.json    — Q24 hotel strategy matrix  (55 KB, lazy)
     data/social-{market}.json — social records per market (lazy on social tab)

   Load order:
     1. bootstrap.json  → enough to init filters & show overview KPIs
     2. All 6 region record chunks loaded in parallel immediately after
     3. matrix-q18/q24  → loaded lazily when Airline/Hotel tabs open
     4. social-{market} → loaded lazily when Social tab opens
   ══════════════════════════════════════════════════════════════ */

const _chunkCache  = {};   // URL → Promise<parsed JSON>
const _matrixLoaded = { Q18: false, Q24: false };
let   _socialLoaded = new Set();
let   _manifest     = null;
const _scriptCache  = {};
const PRECOMPUTED_TAB_KEY={
  overview:"source_market",
  market:"source_market",
  destination:"destination_market",
  behaviour:"travel_behaviour",
  airline:"airline",
  hotel:"hotels"
};
let PRECOMPUTED={filters:null,tabs:{},ready:false};
let _precomputedLoading={};

function loadScriptOnce(src) {
  if (_scriptCache[src]) return _scriptCache[src];
  _scriptCache[src] = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-lazy-src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.defer = true;
    script.dataset.lazySrc = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(script);
  });
  return _scriptCache[src];
}

function ensureOptionalScriptsForTab(tabName) {
  const jobs = [];
  if (tabName === "overview") {
    jobs.push(loadScriptOnce("sentiment-engine.js?v=20261001_v3"));
    jobs.push(loadScriptOnce("https://cdnjs.cloudflare.com/ajax/libs/d3-cloud/1.2.5/d3.layout.cloud.min.js")
      .then(() => loadScriptOnce("enhancement.js?v=20260928_v47")));
  } else if (tabName === "destination") {
    jobs.push(loadScriptOnce("dest-sentiment-engine.js?v=20261001_v3"));
  } else if (tabName === "social") {
    jobs.push(loadScriptOnce("enhancement.js?v=20260928_v47"));
  }
  return jobs.length ? Promise.allSettled(jobs) : Promise.resolve([]);
}

function fetchChunk(url) {
  if (!_chunkCache[url]) {
    _chunkCache[url] = fetch(url).then(r => {
      if (!r.ok) throw new Error(`Chunk ${url} HTTP ${r.status}`);
      return r.json();
    });
  }
  return _chunkCache[url];
}

function ensurePrecomputedTab(tabKey){
  if(!tabKey || PRECOMPUTED.tabs[tabKey]) return Promise.resolve(PRECOMPUTED.tabs[tabKey]);
  const url=_manifest?.precomputed?.[tabKey];
  if(!url) return Promise.resolve(null);
  if(_precomputedLoading[tabKey]) return _precomputedLoading[tabKey];
  _precomputedLoading[tabKey]=fetchChunk(`${url}?v=20261001_precompute`).then(data=>{
    PRECOMPUTED.tabs[tabKey]=data;
    return data;
  }).catch(err=>{
    console.warn(`Precomputed ${tabKey} load failed:`,err);
    return null;
  }).finally(()=>{
    delete _precomputedLoading[tabKey];
  });
  return _precomputedLoading[tabKey];
}

function loadPrecomputedData(manifest){
  const paths=manifest?.precomputed||{};
  const initialKeys=["filters",PRECOMPUTED_TAB_KEY[currentTab]||"travel_behaviour"].filter(Boolean);
  const entries=initialKeys.map(key=>[key,paths[key]]).filter(([,url])=>url);
  if(!entries.length) { PRECOMPUTED.ready=true; return Promise.resolve(PRECOMPUTED); }
  return Promise.all(entries.map(([key,url])=>
    fetchChunk(`${url}?v=20261001_precompute`).then(data=>[key,data]).catch(err=>{
      console.warn(`Precomputed ${key} load failed:`,err);
      return [key,null];
    })
  )).then(results=>{
    results.forEach(([key,data])=>{
      if(!data) return;
      if(key==="filters") PRECOMPUTED.filters=data;
      else PRECOMPUTED.tabs[key]=data;
    });
    PRECOMPUTED.ready=true;
    return PRECOMPUTED;
  });
}

const yieldToBrowser = () => new Promise(resolve => setTimeout(resolve, 0));

async function loadRecordChunksInBackground() {
  if (!_manifest || DATA.recordsReady) return;
  const urls = Object.values(_manifest.chunks.records || {});
  const allRecords = [];
  for (const url of urls) {
    const chunk = await fetchChunk(url);
    allRecords.push(...((chunk.records || []).map(normalizeRecord)));
    await yieldToBrowser();
  }
  DATA.records = allRecords;
  DATA.recordsReady = true;
  DATA.meta.totalRespondents = allRecords.length;
  invalidateRowCache();
  d3.select("#baseN").text(`n = ${allRecords.length.toLocaleString()}`);
  if (typeof buildFilterControlsCascade === "function") buildFilterControlsCascade();
  const bar = document.querySelector(".loading-records");
  if (bar) bar.remove();
  renderActive();
}

function loadManifestAndBootstrap() {
  return fetchChunk("data/manifest.json").then(manifest => {
    _manifest = manifest;
    return Promise.all([fetchChunk(manifest.chunks.bootstrap),loadPrecomputedData(manifest)]);
  }).then(([boot]) => {
    /* Build the DATA shell from bootstrap — no records yet */
    DATA = {
      ...boot,
      records:      [],
      recordsReady: false,
      socialRecords: [],
      matrixIndex:  { Q18: [], Q24: [] },
    };
    DATA.meta = { ...boot.meta };
    init();
    d3.select("#baseN").text(`n = ${(DATA.meta.totalRespondents || 0).toLocaleString()}`);

    /* Show loading indicator */
    const el = document.querySelector("main");
    if (el && !el.querySelector(".loading-records")) {
      const bar = document.createElement("div");
      bar.className = "loading-records";
      bar.style.cssText = "position:fixed;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#530095,#00B5AC);z-index:9999;animation:loadPulse 1s ease infinite alternate";
      document.body.appendChild(bar);
      if (!document.querySelector("#loadPulseStyle")) {
        const st = document.createElement("style");
        st.id = "loadPulseStyle";
        st.textContent = "@keyframes loadPulse{from{opacity:.4}to{opacity:1}}";
        document.head.appendChild(st);
      }
    }

    /* Render immediately from bootstrap summaries, then load row-level records in the background. */
    renderActive();
    setTimeout(()=>loadRecordChunksInBackground().catch(err=>console.error("Record chunk load error:",err)), 80);
  }).catch(err => {
    console.error("Chunk load error:", err);
    const el = document.querySelector("main");
    if (el) el.insertAdjacentHTML("afterbegin",
      `<div class="insight-banner" style="margin:20px"><span class="insight-tag">DATA ERROR</span><span>Could not load data. Please run through a local HTTP server. (${err.message})</span></div>`);
  });
}

/* Lazy-load matrix chunks when Airline or Hotel tab opens */
function ensureMatrixLoaded(key) {
  if (!_manifest) return Promise.resolve();
  const url = _manifest.chunks.matrix[key];
  if (!url || _matrixLoaded[key]) return Promise.resolve();
  return fetchChunk(url).then(chunk => {
    DATA.matrixIndex = DATA.matrixIndex || {};
    DATA.matrixIndex[key] = chunk[key] || [];
    _matrixLoaded[key] = true;
  }).catch(err => console.warn(`Matrix ${key} load failed:`, err));
}

/* Lazy-load social chunks per market when Social tab opens */
function loadSocialData() {
  if (!_manifest) { socialPromise = Promise.resolve([]); return socialPromise; }

  /* Determine which markets to load based on active filters */
  const activeMarkets = (filterSelections["Market"] || []);
  const socialMap = _manifest.social || {};
  const urls = activeMarkets.length
    ? activeMarkets.map(m => socialMap[m]).filter(Boolean)
    : Object.values(socialMap);

  /* Only fetch markets not yet loaded */
  const toFetch = urls.filter(url => !_socialLoaded.has(url));

  if (!toFetch.length) {
    return Promise.resolve(DATA.socialRecords);
  }

  if (socialPromise) {
    return socialPromise.then(() => loadSocialData());
  }

  socialPromise = Promise.all(toFetch.map(url => fetchChunk(url))).then(chunks => {
    const newRecords = chunks.flat();
    toFetch.forEach(url => _socialLoaded.add(url));
    /* Merge, avoiding duplicates */
    const existing = new Set(DATA.socialRecords.map(r => r.url || JSON.stringify(r).slice(0,60)));
    const merged = [...DATA.socialRecords, ...newRecords.filter(r => !existing.has(r.url || JSON.stringify(r).slice(0,60)))];
    DATA.socialRecords = merged;
    renderActive();
    return DATA.socialRecords;
  }).catch(err => {
    console.error("Social data load error:", err);
    const chart = document.getElementById("socialSentimentChart");
    if (chart) chart.innerHTML = '<div class="empty-chart">Social data could not be loaded.</div>';
    return [];
  }).finally(() => {
    socialPromise = null;
  });
  return socialPromise;
}

/* switchTab lazy-load hooks injected directly into the original below */

/* Start loading */
loadManifestAndBootstrap();

function loadWorld(){
  if(worldPromise)return worldPromise;
  worldPromise=fetch("world.geojson?v=20260928").then(r=>r.ok?r.json():null).catch(()=>null);
  worldPromise.then(w=>{WORLD=w; if(currentTab!=="social")renderActive();});
  return worldPromise;
}

let hotelSentimentData=null;
let hotelSentimentPromise=null;
let hotelPeriodSentimentData=null;
let hotelPeriodSentimentPromise=null;

function loadHotelSentimentData(){
  if(hotelSentimentData) return Promise.resolve(hotelSentimentData);
  if(hotelSentimentPromise) return hotelSentimentPromise;
  hotelSentimentPromise=fetchChunk("data/hotel-sentiment-overview.json?v=20261001_v3")
    .then(data=>{
      hotelSentimentData=data;
      if(currentTab==="hotel") renderActive();
      return data;
    })
    .catch(err=>{
      console.warn("Hotel sentiment data load failed:",err);
      return null;
    });
  return hotelSentimentPromise;
}

function loadHotelPeriodSentimentData(){
  if(hotelPeriodSentimentData) return Promise.resolve(hotelPeriodSentimentData);
  if(hotelPeriodSentimentPromise) return hotelPeriodSentimentPromise;
  hotelPeriodSentimentPromise=fetchChunk("data/hotel-period-sentiment.json?v=20261001_v1")
    .then(data=>{
      hotelPeriodSentimentData=data;
      if(currentTab==="hotel") renderActive();
      return data;
    })
    .catch(err=>{
      console.warn("Hotel period sentiment data load failed:",err);
      return null;
    });
  return hotelPeriodSentimentPromise;
}

function hotelSentimentColor(score){
  if(!Number.isFinite(score)) return "#ddd8ee";
  return d3.scaleLinear()
    .domain([-100,-50,-10,20,60,100])
    .range(["#e4003a","#ff7900","#ffd400","#17b800","#008a00","#006f00"])
    .clamp(true)(score);
}

function hotelSentimentScoreText(score){
  if(!Number.isFinite(score)) return "n.a.";
  return `${score>0?"+":""}${score.toFixed(1)}%`;
}

function appendSentimentScaleLegend(el){
  if(!el) return;
  const leg=document.createElement("div");
  leg.className="sentiment-scale-legend";
  leg.innerHTML=`
    <strong>Sentiment:</strong>
    <span class="sentiment-scale-bar"></span>
    <span class="sentiment-scale-negative">Negative (-100)</span>
    <span class="sentiment-scale-neutral">Neutral (0)</span>
    <span class="sentiment-scale-positive">Positive (+100)</span>
    <span class="sentiment-scale-no-data"><i></i>No data</span>`;
  el.appendChild(leg);
}

function drawSentimentGauge(el,score,opt={}){
  if(!el) return;
  d3.select(el).selectAll("*").remove();
  const w=Math.max(opt.minWidth||210,el.clientWidth||opt.width||230);
  const h=opt.height||176;
  const cx=w/2, cy=106, r=Math.min(opt.radius||82,w*.36);
  const svg=d3.select(el).append("svg")
    .attr("width",w).attr("height",h)
    .attr("viewBox",`0 0 ${w} ${h}`)
    .style("display","block")
    .style("overflow","visible");
  const arc=d3.arc().innerRadius(r*.62).outerRadius(r*.92);
  const scoreToAngle=v=>((Math.max(-100,Math.min(100,v))+100)/200)*Math.PI-Math.PI/2;
  const xy=(angle,rad)=>[Math.sin(angle)*rad,-Math.cos(angle)*rad];
  const segments=[
    [-100,-50,"#e4003a"],
    [-50,-10,"#ff7900"],
    [-10,20,"#ffd400"],
    [20,60,"#17b800"],
    [60,100,"#008a00"]
  ];
  const g=svg.append("g").attr("transform",`translate(${cx},${cy})`);
  segments.forEach(seg=>{
    g.append("path")
      .attr("d",arc({startAngle:scoreToAngle(seg[0]),endAngle:scoreToAngle(seg[1])}))
      .attr("fill",seg[2])
      .attr("stroke","#fff")
      .attr("stroke-width",1.5);
  });
  [-100,-50,0,50,100].forEach(tick=>{
    const [tx,ty]=xy(scoreToAngle(tick),r+13);
    svg.append("text")
      .attr("x",cx+tx)
      .attr("y",cy+ty+4)
      .attr("text-anchor","middle")
      .attr("font-size",12)
      .attr("fill","#5f5669")
      .text(tick);
  });
  if(Number.isFinite(score)){
    const [nx,ny]=xy(scoreToAngle(score),r*.72);
    g.append("line")
      .attr("x1",0).attr("y1",0)
      .attr("x2",nx).attr("y2",ny)
      .attr("stroke","#e4003a")
      .attr("stroke-width",2.2)
      .attr("stroke-linecap","round");
    g.append("circle").attr("r",9).attr("fill","#fff").attr("stroke","#e4003a").attr("stroke-width",4);
    g.append("circle").attr("r",3).attr("fill","#e4003a");
  }
  const scoreLabel=Number.isFinite(score)?`${Math.round(score)>0?"+":""}${Math.round(score)}`:"—";
  svg.append("text")
    .attr("x",cx).attr("y",150)
    .attr("class","sentiment-meter-value")
    .attr("text-anchor","middle")
    .text(scoreLabel);
}
window.drawSentimentGauge=drawSentimentGauge;

function selectedHotelSentimentMarket(){
  const selected=filterSelections.Market||[];
  return selected.length===1?selected[0]:"All";
}

function mergeSentimentMarkets(data, selectedMarkets, itemKey, topKey){
  const chosen=(selectedMarkets||[]).map(m=>data.markets?.[m]).filter(Boolean);
  if(!chosen.length) return null;
  const summary={positive:0,neutral:0,negative:0,total:0,score:null};
  const byItem={};
  chosen.forEach(market=>{
    summary.positive+=market.positive||0;
    summary.neutral+=market.neutral||0;
    summary.negative+=market.negative||0;
    summary.total+=market.total||0;
    (market[topKey]||[]).forEach(item=>{
      const name=item[itemKey];
      if(!name) return;
      byItem[name]=byItem[name]||{[itemKey]:name,positive:0,neutral:0,negative:0,total:0,score:null};
      byItem[name].positive+=item.positive||0;
      byItem[name].neutral+=item.neutral||0;
      byItem[name].negative+=item.negative||0;
      byItem[name].total+=item.total||0;
    });
  });
  summary.score=summary.total?((summary.positive-summary.negative)/summary.total*100):null;
  summary[topKey]=Object.values(byItem)
    .map(item=>({...item,score:item.total?((item.positive-item.negative)/item.total*100):null}))
    .sort((a,b)=>b.total-a.total)
    .slice(0,5);
  return summary;
}

const SENTIMENT_PERIODS=[
  {key:"Wave 1",label:"Jan-Feb 2026",range:"Jan 2026 - Feb 2026"},
  {key:"Wave 2",label:"Mar 2026",range:"Mar 2026"},
  {key:"Wave 3",label:"Apr-May 2026",range:"Apr 2026 - May 2026"},
  {key:"Wave 4",label:"Jun-Jul 2026",range:"Jun 2026 - Jul 2026"}
];
const CURRENT_SENTIMENT_PERIOD=SENTIMENT_PERIODS[3];
const MANUAL_BRAND_ALIASES={
  "InterContinental Hotels Group (IHG)":["intercontinental","ihg","holiday inn","crowne plaza"],
  "Marriott International":["marriott","ritz-carlton","ritz carlton","sheraton","westin","st. regis","st regis"],
  "Hyatt Hotels":["hyatt"],
  "Hilton":["hilton","waldorf astoria","doubletree","conrad"],
  "Accor":["accor","ibis","novotel","sofitel","pullman","mercure"],
  "Qatar Airways":["qatar airways"],
  "Singapore Airlines":["singapore airlines"],
  "American Airlines":["american airlines"],
  "British Airways":["british airways"],
  "Air India":["air india"],
  "Cathay Pacific":["cathay pacific","cathay"],
  "Japan Airlines":["japan airlines","jal"],
  "Thai Airways":["thai airways"],
  "Malaysia Airlines":["malaysia airlines"],
  "Korean Air":["korean air"],
  "Emirates":["emirates"],
  "Etihad Airways":["etihad"],
  "Lufthansa":["lufthansa"],
  "Qantas":["qantas"],
  "Ryanair":["ryanair"],
  "IndiGo":["indigo"]
};

function normalizeBrandToken(value){
  return clean(value||"").toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g," ").trim();
}
function brandAliases(name){
  const manual=(MANUAL_BRAND_ALIASES[name]||[]).map(normalizeBrandToken).filter(Boolean);
  const base=normalizeBrandToken(name);
  const withoutGroup=base
    .replace(/\bhotels?\b/g,"")
    .replace(/\bairlines?\b/g,"")
    .replace(/\bairways?\b/g,"")
    .replace(/\binternational\b/g,"")
    .replace(/\bgroup\b/g,"")
    .replace(/\s+/g," ")
    .trim();
  return [...new Set([base,withoutGroup,...manual].filter(v=>v&&v.length>2))];
}
function sentimentCountFromLabel(label){
  const value=String(label||"").toLowerCase();
  if(value.includes("positive")) return "positive";
  if(value.includes("negative")) return "negative";
  if(value.includes("neutral")) return "neutral";
  return "neutral";
}
function emptyPeriodStats(){
  return SENTIMENT_PERIODS.reduce((acc,p)=>{
    acc[p.key]={positive:0,neutral:0,negative:0,total:0,score:null};
    return acc;
  },{});
}
function finalizePeriodStat(stat){
  stat.total=(stat.positive||0)+(stat.neutral||0)+(stat.negative||0);
  stat.score=stat.total?((stat.positive-stat.negative)/stat.total*100):null;
  return stat;
}
function normalizedSentimentText(score){
  if(!Number.isFinite(score)) return "—";
  const rounded=Math.round(score);
  return `${rounded>0?"+":""}${rounded}`;
}
function socialRowsForCurrentMarketSelection(){
  const rows=DATA?.socialRecords||[];
  const selected=filterSelections.Market||[];
  if(!selected.length) return rows;
  const selectedSet=new Set(selected);
  return rows.filter(r=>selectedSet.has(MARKET_ALIASES[clean(r.sourceMarket)]||clean(r.sourceMarket)));
}
function buildBrandPeriodStats(name){
  const stats=emptyPeriodStats();
  const aliases=brandAliases(name);
  if(!aliases.length) return stats;
  const rows=socialRowsForCurrentMarketSelection();
  rows.forEach(row=>{
    const period=stats[row.wave];
    if(!period) return;
    const text=normalizeBrandToken(row.snippet||"");
    if(!text||!aliases.some(alias=>new RegExp(`(^| )${alias.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}( |$)`).test(text))) return;
    period[sentimentCountFromLabel(row.sentiment)]++;
  });
  SENTIMENT_PERIODS.forEach(p=>finalizePeriodStat(stats[p.key]));
  return stats;
}
function compileBrandAliasMatchers(items,nameKey){
  return (items||[]).map(item=>{
    const name=item?.[nameKey];
    const matchers=brandAliases(name).map(alias=>new RegExp(`(^| )${alias.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}( |$)`));
    return {name,matchers};
  }).filter(entry=>entry.name&&entry.matchers.length);
}
function buildBrandPeriodStatsMap(items,nameKey){
  const output={};
  const compiled=compileBrandAliasMatchers(items,nameKey);
  compiled.forEach(entry=>{ output[entry.name]=emptyPeriodStats(); });
  if(!compiled.length) return output;
  socialRowsForCurrentMarketSelection().forEach(row=>{
    const wave=row.wave;
    if(!SENTIMENT_PERIODS.some(p=>p.key===wave)) return;
    const text=normalizeBrandToken(row.snippet||"");
    if(!text) return;
    const bucket=sentimentCountFromLabel(row.sentiment);
    compiled.forEach(entry=>{
      if(entry.matchers.some(rx=>rx.test(text))){
        output[entry.name][wave][bucket]++;
      }
    });
  });
  Object.values(output).forEach(stats=>{
    SENTIMENT_PERIODS.forEach(p=>finalizePeriodStat(stats[p.key]));
  });
  return output;
}
function selectedWaveDistribution(){
  const stats=emptyPeriodStats();
  socialRowsForCurrentMarketSelection().forEach(row=>{
    const period=stats[row.wave];
    if(!period) return;
    period[sentimentCountFromLabel(row.sentiment)]++;
  });
  SENTIMENT_PERIODS.forEach(p=>finalizePeriodStat(stats[p.key]));
  const grandTotal=SENTIMENT_PERIODS.reduce((sum,p)=>sum+(stats[p.key].total||0),0);
  if(!grandTotal){
    const even=1/SENTIMENT_PERIODS.length;
    return SENTIMENT_PERIODS.reduce((acc,p)=>{acc[p.key]=even;return acc;},{});
  }
  return SENTIMENT_PERIODS.reduce((acc,p)=>{
    acc[p.key]=(stats[p.key].total||0)/grandTotal;
    return acc;
  },{});
}
function fallbackPeriodStatsFromItem(item){
  const stats=emptyPeriodStats();
  const distribution=selectedWaveDistribution();
  const total=item?.total||0;
  if(!total) return stats;
  const posShare=(item.positive||0)/total;
  const negShare=(item.negative||0)/total;
  const neuShare=(item.neutral||0)/total;
  let assignedTotal=0;
  let assignedPos=0;
  let assignedNeg=0;
  let assignedNeu=0;
  SENTIMENT_PERIODS.forEach((period,idx)=>{
    const isLast=idx===SENTIMENT_PERIODS.length-1;
    const periodTotal=isLast?Math.max(0,total-assignedTotal):Math.max(1,Math.round(total*(distribution[period.key]||0)));
    assignedTotal+=periodTotal;
    const positive=isLast?Math.max(0,(item.positive||0)-assignedPos):Math.round(periodTotal*posShare);
    const negative=isLast?Math.max(0,(item.negative||0)-assignedNeg):Math.round(periodTotal*negShare);
    let neutral=isLast?Math.max(0,(item.neutral||0)-assignedNeu):Math.round(periodTotal*neuShare);
    const overflow=positive+negative+neutral-periodTotal;
    if(overflow>0) neutral=Math.max(0,neutral-overflow);
    const filled=positive+negative+neutral;
    if(filled<periodTotal) neutral+=periodTotal-filled;
    assignedPos+=positive;
    assignedNeg+=negative;
    assignedNeu+=neutral;
    stats[period.key]={positive,neutral,negative,total:periodTotal,score:null,isEstimated:true};
    finalizePeriodStat(stats[period.key]);
  });
  return stats;
}
function mergePeriodStatsWithFallback(actualStats,item){
  const fallback=fallbackPeriodStatsFromItem(item);
  const merged=emptyPeriodStats();
  SENTIMENT_PERIODS.forEach(period=>{
    const actual=actualStats?.[period.key];
    merged[period.key]=actual&&actual.total ? actual : fallback[period.key];
  });
  return merged;
}
function addPeriodCounts(target,source){
  if(!source) return;
  target.positive+=(source.positive||source.pos||0);
  target.neutral+=(source.neutral||source.neu||0);
  target.negative+=(source.negative||source.neg||0);
}
function findPeriodBrandRecord(brands,name){
  if(!brands||!name) return null;
  if(brands[name]) return brands[name];
  const wanted=normalizeBrandToken(name);
  const aliases=new Set(brandAliases(name));
  for(const [brand,record] of Object.entries(brands)){
    const normalized=normalizeBrandToken(brand);
    if(normalized===wanted||aliases.has(normalized)) return record;
  }
  return null;
}
function buildExactPeriodStatsMap(periodData,items,nameKey){
  const output={};
  (items||[]).forEach(item=>{ if(item?.[nameKey]) output[item[nameKey]]=emptyPeriodStats(); });
  if(!periodData||!items?.length) return output;
  const selected=filterSelections.Market||[];
  const sources=selected.length
    ? selected.map(m=>periodData.markets?.[m]).filter(Boolean)
    : [periodData.overall].filter(Boolean);
  items.forEach(item=>{
    const name=item?.[nameKey];
    if(!name) return;
    const stats=emptyPeriodStats();
    sources.forEach(source=>{
      const brandRecord=findPeriodBrandRecord(source?.brands,name);
      const waves=brandRecord?.waves||{};
      SENTIMENT_PERIODS.forEach(period=>{
        addPeriodCounts(stats[period.key],waves[period.key]);
      });
    });
    SENTIMENT_PERIODS.forEach(period=>finalizePeriodStat(stats[period.key]));
    output[name]=stats;
  });
  return output;
}
function periodScoreCell(stat){
  if(!stat||!stat.total) return '<span class="period-score-empty">—</span>';
  return `<span class="period-score-value">${normalizedSentimentText(stat.score)}</span><small>n=${stat.total.toLocaleString()}</small>`;
}
function periodSocialUrlsForSelection(){
  const activeMarkets=filterSelections.Market||[];
  const socialMap=_manifest?.social||{};
  return activeMarkets.length?activeMarkets.map(m=>socialMap[m]).filter(Boolean):Object.values(socialMap);
}
function periodSocialReadyForSelection(){
  const urls=periodSocialUrlsForSelection();
  return !!urls.length&&urls.every(url=>_socialLoaded.has(url));
}
function maybeLoadPeriodSentimentForActiveTab(){
  if(currentTab==="hotel") loadHotelPeriodSentimentData();
  if(currentTab==="airline") loadAirlinePeriodSentimentData();
}

function hotelSentimentSelection(data){
  const selected=filterSelections.Market||[];
  if(selected.length===1&&data.markets?.[selected[0]]) return {market:selected[0],summary:data.markets[selected[0]]};
  if(selected.length>1){
    const summary=mergeSentimentMarkets(data,selected,"hotel","topHotels");
    if(summary) return {market:`${selected.length} selected markets`,summary};
  }
  return {market:"All",summary:data.overall};
}

function renderHotelSentimentOverview(){
  const mapEl=document.getElementById("hotelSentimentMap");
  const insightEl=document.getElementById("hotelSentimentMapInsight");
  const gridEl=document.getElementById("hotelSentimentGaugeGrid");
  if(!mapEl||!insightEl||!gridEl) return;

  if(!hotelSentimentData){
    mapEl.innerHTML='<div class="empty-chart">Loading hotel sentiment map…</div>';
    insightEl.innerHTML='<div class="map-focus-hint">Loading hotel sentiment scores from the attached sheet.</div>';
    gridEl.innerHTML='<div class="empty-chart">Loading hotel gauges…</div>';
    loadHotelSentimentData();
    return;
  }

  renderHotelSentimentMap(hotelSentimentData);
  renderHotelSentimentInsight(hotelSentimentData);
  renderHotelSentimentGauges(hotelSentimentData);
}

function renderHotelSentimentMap(data){
  const sel="#hotelSentimentMap";
  const el=document.querySelector(sel);
  if(!el) return;
  if(!WORLD){
    el.innerHTML='<div class="empty-chart">Loading world map…</div>';
    loadWorld();
    return;
  }

  const w=Math.max(680,el.clientWidth||760);
  const h=Math.max(500,el.clientHeight||520);
  d3.select(sel).selectAll("*").remove();

  const svg=d3.select(sel).append("svg")
    .attr("width",w).attr("height",h)
    .attr("viewBox",`0 0 ${w} ${h}`)
    .style("display","block");

  let countries=null;
  if(WORLD.type==="FeatureCollection") countries=WORLD;
  else if(window.topojson&&WORLD.objects?.countries) countries=topojson.feature(WORLD,WORLD.objects.countries);

  const projection=d3.geoNaturalEarth1();
  if(countries?.features?.length){
    const fitFeatures=countries.features.filter(f=>f.properties?.name!=="Antarctica");
    projection.fitExtent([[18,22],[w-18,h-56]],{type:"FeatureCollection",features:fitFeatures});
  } else {
    projection.scale(Math.min(w/6.2,h/3.05)).translate([w/2,h/2+2]);
  }

  const path=d3.geoPath(projection);
  svg.insert("path", ":first-child")
    .datum({type:"Sphere"})
    .attr("d", d3.geoPath(projection))
    .attr("fill", "#f7f5fb")
    .attr("stroke", "none")
    .style("pointer-events", "none");
  const g=svg.append("g");
  attachMapZoomControls(el, svg, g);
  const GEO_NAME={"Russian Federation":"Russia","Korea, Republic of (South Korea)":"South Korea"};
  const geoName=m=>GEO_NAME[m]||m;
  const TINY=new Set(); // Bahrain and Singapore are real GeoJSON polygons
  const selectedMarkets=filterSelections.Market||[];
  const selectedSet=new Set(selectedMarkets);
  const hasMarketSelection=selectedMarkets.length>0;
  const SELECTED_MARKET_FILL=null; // preserve metric/sentiment fill
  const SELECTED_MARKET_STROKE="#530095";
  const marketOpacity=market=>!hasMarketSelection||selectedSet.has(market)?1:.18;
  const marketFilter=market=>{
    if(!hasMarketSelection) return null;
    return selectedSet.has(market) ? "drop-shadow(0 3px 7px rgba(83,0,149,.30))" : null;
  };
  const geoToMarket={};
  MARKETS.forEach(m=>{ if(!TINY.has(m)) geoToMarket[geoName(m)]=m; });

  function marketScore(market){
    return data.markets?.[market]?.score;
  }
  function marketTotal(market){
    return data.markets?.[market]?.total||0;
  }
  function marketFill(market){
    const score=marketScore(market);
    return Number.isFinite(score)?hotelSentimentColor(score):"#ddd8ee";
  }
  const displayedMarketFill=market=>marketFill(market);
  function polyArea(feat){
    const geom=feat.geometry;
    if(!geom) return 0;
    const shoelace=ring=>Math.abs(ring.reduce((s,p,i,a)=>{const n=a[(i+1)%a.length];return s+p[0]*n[1]-n[0]*p[1];},0))/2;
    if(geom.type==="Polygon") return shoelace(geom.coordinates[0]);
    if(geom.type==="MultiPolygon") return Math.max(...geom.coordinates.map(p=>shoelace(p[0])));
    return 0;
  }

  if(countries?.features?.length){
    const allSorted=[...countries.features].sort((a,b)=>polyArea(b)-polyArea(a));
    const marketFeatures=countries.features.filter(f=>(marketFromGeoFeature(f)||geoToMarket[f.properties.name])).sort((a,b)=>polyArea(b)-polyArea(a));

    g.append("g").attr("class","world-land").selectAll("path")
      .data(allSorted).join("path")
      .attr("d",path)
      .attr("fill",f=>{
        const market=(marketFromGeoFeature(f)||geoToMarket[f.properties.name]);
        if(!market) return "#e8e2f4";
        return displayedMarketFill(market);
      })
      .attr("opacity",f=>{
        const market=(marketFromGeoFeature(f)||geoToMarket[f.properties.name]);
        return market ? marketOpacity(market) : (hasMarketSelection ? .28 : 1);
      })
      .attr("stroke","#fff").attr("stroke-width",0.3)
      .style("pointer-events","none");

    g.append("g").attr("class","market-layer").selectAll("path")
      .data(marketFeatures).join("path")
      .attr("d",path)
      .attr("fill",f=>{
        const market=(marketFromGeoFeature(f)||geoToMarket[f.properties.name]);
        return displayedMarketFill(market);
      })
      .attr("opacity",f=>marketOpacity((marketFromGeoFeature(f)||geoToMarket[f.properties.name])))
      .attr("stroke",f=>selectedSet.has((marketFromGeoFeature(f)||geoToMarket[f.properties.name]))?SELECTED_MARKET_STROKE:"#fff")
      .attr("stroke-width",f=>selectedSet.has((marketFromGeoFeature(f)||geoToMarket[f.properties.name]))?2.8:0.6)
      .style("cursor","pointer")
      .style("filter",f=>marketFilter((marketFromGeoFeature(f)||geoToMarket[f.properties.name])))
      .on("click",(e,f)=>{const market=(marketFromGeoFeature(f)||geoToMarket[f.properties.name]); if(market) selectMarketFromMap(market);})
      .on("mousemove",(e,f)=>{
        const market=(marketFromGeoFeature(f)||geoToMarket[f.properties.name]);
        const score=marketScore(market);
        if(!Number.isFinite(score)){hideTip();return;}
        showTip(e,{label:market,value:`Score: ${hotelSentimentScoreText(score)}  (n=${marketTotal(market).toLocaleString()})`},true);
      })
      .on("mouseleave",hideTip);

    g.append("g").attr("class","world-borders").selectAll("path")
      .data(allSorted).join("path")
      .attr("d",path)
      .attr("fill","none")
      .attr("stroke","rgba(255,255,255,0.6)")
      .attr("stroke-width",0.4)
      .style("pointer-events","none");
  }

  const tinyList=[]; // no synthetic BH/SG markers; use real polygons
  g.append("g").selectAll("g").data(tinyList).join("g")
    .attr("transform",m=>{const p=projection(MARKET_COORDS[m]);return`translate(${p[0]},${p[1]})`;})
    .style("cursor","pointer")
    .attr("opacity",m=>marketOpacity(m))
    .style("filter",m=>marketFilter(m))
    .call(s=>{
      s.append("circle").attr("r",5)
        .attr("fill",m=>displayedMarketFill(m))
        .attr("stroke",m=>selectedSet.has(m)?SELECTED_MARKET_STROKE:"#fff").attr("stroke-width",m=>selectedSet.has(m)?2.4:1.2);
      s.append("text").attr("x",6).attr("y",3).attr("font-size",7).attr("fill","#444")
        .text(m=>m==="Singapore"?"SG":"BH");
    })
    .on("click",(e,m)=>selectMarketFromMap(m))
    .on("mousemove",(e,m)=>{
      const score=marketScore(m);
      if(!Number.isFinite(score)){hideTip();return;}
      showTip(e,{label:m,value:`Score: ${hotelSentimentScoreText(score)}  (n=${marketTotal(m).toLocaleString()})`},true);
    })
    .on("mouseleave",hideTip);

  appendSentimentScaleLegend(el);
}

function renderHotelSentimentInsight(data){
  const root=document.getElementById("hotelSentimentMapInsight");
  if(!root) return;
  const {market,summary}=hotelSentimentSelection(data);
  const label=market==="All"?"All Markets":market;
  const top=summary.topHotels?.[0];
  const pos=summary.positive||0, neu=summary.neutral||0, neg=summary.negative||0, total=summary.total||1;
  root.innerHTML=`
    <div class="map-focus-name">${escapeHtml(label)}</div>
    <div class="map-focus-metric">${hotelSentimentScoreText(summary.score)}</div>
    <div class="map-focus-label">Hotel sentiment score · ${summary.total.toLocaleString()} mentions</div>
    <div class="hotel-sentiment-mix">
      <div><strong>${Math.round(pos/total*100)}%</strong><span>Positive</span></div>
      <div><strong>${Math.round(neu/total*100)}%</strong><span>Neutral</span></div>
      <div><strong>${Math.round(neg/total*100)}%</strong><span>Negative</span></div>
    </div>
    <div class="map-focus-hint">${top?`Top hotel by mentions: <b>${escapeHtml(top.hotel)}</b> (${top.total.toLocaleString()} records, ${hotelSentimentScoreText(top.score)} score).`:"Click any country on the map to focus on a source market."}</div>
  `;
}

function renderHotelSentimentGauges(data){
  const grid=document.getElementById("hotelSentimentGaugeGrid");
  const title=document.getElementById("hotelSentimentGaugeTitle");
  if(!grid) return;
  maybeLoadPeriodSentimentForActiveTab();
  const {market,summary}=hotelSentimentSelection(data);
  const label=market==="All"?"All Markets":market;
  if(title) title.textContent=`Hotel Current Period Sentiment — ${label}`;
  const hotels=summary.topHotels||[];
  if(!hotels.length){
    grid.innerHTML='<div class="empty-chart">No hotel sentiment records available for this market.</div>';
    return;
  }
  const periodStatsByHotel=buildExactPeriodStatsMap(hotelPeriodSentimentData,hotels,"hotel");
  grid.innerHTML=hotels.map((item,i)=>{
    const periods=periodStatsByHotel[item.hotel]||emptyPeriodStats();
    const current=periods[CURRENT_SENTIMENT_PERIOD.key];
    const gaugeScore=current.total?current.score:item.score;
    const gaugeTotal=current.total?current.total:item.total;
    const pos=current.total?current.positive:item.positive;
    const neu=current.total?current.neutral:item.neutral;
    const neg=current.total?current.negative:item.negative;
    const tablePeriods=periods;
    const dataNote=hotelPeriodSentimentData?(current.total?"":" · no current-period records"):" · loading period records";
    return `
    <article class="hotel-sentiment-gauge-card hotel-sentiment-meter-card period-sentiment-card">
      <div class="hotel-sentiment-gauge-rank">#${i+1}</div>
      <h3 title="${escapeHtml(item.hotel)}">${escapeHtml(item.hotel)}</h3>
      <div class="period-current-label">Current · ${CURRENT_SENTIMENT_PERIOD.label}</div>
      <div id="hotelSentimentGauge${i}" class="hotel-sentiment-gauge"></div>
      <div class="hotel-sentiment-strip" aria-label="Sentiment mix">
        <i class="pos" style="width:${gaugeTotal?pos/gaugeTotal*100:0}%"></i>
        <i class="neu" style="width:${gaugeTotal?neu/gaugeTotal*100:0}%"></i>
        <i class="neg" style="width:${gaugeTotal?neg/gaugeTotal*100:0}%"></i>
      </div>
      <div class="hotel-sentiment-counts hotel-sentiment-percent-counts">
        <span><b>${gaugeTotal?Math.round(pos/gaugeTotal*100):0}%</b> Pos</span>
        <span><b>${gaugeTotal?Math.round(neu/gaugeTotal*100):0}%</b> Neu</span>
        <span><b>${gaugeTotal?Math.round(neg/gaugeTotal*100):0}%</b> Neg</span>
      </div>
      <div class="hotel-sentiment-n">n = ${gaugeTotal.toLocaleString()}${dataNote}</div>
      <table class="period-score-table" aria-label="${escapeHtml(item.hotel)} previous period scores">
        <thead><tr><th>${SENTIMENT_PERIODS[0].label}</th><th>${SENTIMENT_PERIODS[1].label}</th><th>${SENTIMENT_PERIODS[2].label}</th></tr></thead>
        <tbody><tr>
          <td>${periodScoreCell(tablePeriods["Wave 1"])}</td>
          <td>${periodScoreCell(tablePeriods["Wave 2"])}</td>
          <td>${periodScoreCell(tablePeriods["Wave 3"])}</td>
        </tr></tbody>
      </table>
    </article>
  `}).join("");
  hotels.forEach((item,i)=>{
    const periods=periodStatsByHotel[item.hotel]||emptyPeriodStats();
    const current=periods[CURRENT_SENTIMENT_PERIOD.key];
    const score=current.total?current.score:item.score;
    renderHotelSentimentMeterGauge(`#hotelSentimentGauge${i}`,score);
  });
}

function renderHotelSentimentMeterGauge(sel,score){
  const el=document.querySelector(sel);
  drawSentimentGauge(el,score);
}

let airlineSentimentData=null;
let airlineSentimentPromise=null;
let airlinePeriodSentimentData=null;
let airlinePeriodSentimentPromise=null;

function loadAirlineSentimentData(){
  if(airlineSentimentData) return Promise.resolve(airlineSentimentData);
  if(airlineSentimentPromise) return airlineSentimentPromise;
  airlineSentimentPromise=fetchChunk("data/airline-sentiment-overview.json?v=20261001_v4")
    .then(data=>{
      airlineSentimentData=data;
      if(currentTab==="airline") renderActive();
      return data;
    })
    .catch(err=>{
      console.warn("Airline sentiment data load failed:",err);
      return null;
    });
  return airlineSentimentPromise;
}

function loadAirlinePeriodSentimentData(){
  if(airlinePeriodSentimentData) return Promise.resolve(airlinePeriodSentimentData);
  if(airlinePeriodSentimentPromise) return airlinePeriodSentimentPromise;
  airlinePeriodSentimentPromise=fetchChunk("data/airline-period-sentiment.json?v=20261001_v1")
    .then(data=>{
      airlinePeriodSentimentData=data;
      if(currentTab==="airline") renderActive();
      return data;
    })
    .catch(err=>{
      console.warn("Airline period sentiment data load failed:",err);
      return null;
    });
  return airlinePeriodSentimentPromise;
}

function selectedAirlineSentimentMarket(){
  const selected=filterSelections.Market||[];
  return selected.length===1?selected[0]:"All";
}

function airlineSentimentSelection(data){
  const selected=filterSelections.Market||[];
  if(selected.length===1&&data.markets?.[selected[0]]) return {market:selected[0],summary:data.markets[selected[0]]};
  if(selected.length>1){
    const summary=mergeSentimentMarkets(data,selected,"airline","topAirlines");
    if(summary) return {market:`${selected.length} selected markets`,summary};
  }
  return {market:"All",summary:data.overall};
}

function renderAirlineSentimentOverview(){
  const mapEl=document.getElementById("airlineSentimentMap");
  const insightEl=document.getElementById("airlineSentimentMapInsight");
  const gridEl=document.getElementById("airlineSentimentGaugeGrid");
  if(!mapEl||!insightEl||!gridEl) return;

  if(!airlineSentimentData){
    mapEl.innerHTML='<div class="empty-chart">Loading airline sentiment map…</div>';
    insightEl.innerHTML='<div class="map-focus-hint">Loading airline sentiment scores from the attached sheet.</div>';
    gridEl.innerHTML='<div class="empty-chart">Loading airline gauges…</div>';
    loadAirlineSentimentData();
    return;
  }

  renderAirlineSentimentMap(airlineSentimentData);
  renderAirlineSentimentInsight(airlineSentimentData);
  renderAirlineSentimentGauges(airlineSentimentData);
}

function renderAirlineSentimentMap(data){
  const sel="#airlineSentimentMap";
  const el=document.querySelector(sel);
  if(!el) return;
  if(!WORLD){
    el.innerHTML='<div class="empty-chart">Loading world map…</div>';
    loadWorld();
    return;
  }

  const w=Math.max(680,el.clientWidth||760);
  const h=Math.max(500,el.clientHeight||520);
  d3.select(sel).selectAll("*").remove();

  const svg=d3.select(sel).append("svg")
    .attr("width",w).attr("height",h)
    .attr("viewBox",`0 0 ${w} ${h}`)
    .style("display","block");

  let countries=null;
  if(WORLD.type==="FeatureCollection") countries=WORLD;
  else if(window.topojson&&WORLD.objects?.countries) countries=topojson.feature(WORLD,WORLD.objects.countries);

  const projection=d3.geoNaturalEarth1();
  if(countries?.features?.length){
    const fitFeatures=countries.features.filter(f=>f.properties?.name!=="Antarctica");
    projection.fitExtent([[18,22],[w-18,h-56]],{type:"FeatureCollection",features:fitFeatures});
  } else {
    projection.scale(Math.min(w/6.2,h/3.05)).translate([w/2,h/2+2]);
  }

  const path=d3.geoPath(projection);
  svg.insert("path", ":first-child")
    .datum({type:"Sphere"})
    .attr("d", d3.geoPath(projection))
    .attr("fill", "#f7f5fb")
    .attr("stroke", "none")
    .style("pointer-events", "none");
  const g=svg.append("g");
  attachMapZoomControls(el, svg, g);
  const GEO_NAME={"Russian Federation":"Russia","Korea, Republic of (South Korea)":"South Korea"};
  const geoName=m=>GEO_NAME[m]||m;
  const TINY=new Set(); // Bahrain and Singapore are real GeoJSON polygons
  const selectedMarkets=filterSelections.Market||[];
  const selectedSet=new Set(selectedMarkets);
  const hasMarketSelection=selectedMarkets.length>0;
  const SELECTED_MARKET_FILL=null; // preserve metric/sentiment fill
  const SELECTED_MARKET_STROKE="#530095";
  const marketOpacity=market=>!hasMarketSelection||selectedSet.has(market)?1:.18;
  const marketFilter=market=>{
    if(!hasMarketSelection) return null;
    return selectedSet.has(market) ? "drop-shadow(0 3px 7px rgba(83,0,149,.30))" : null;
  };
  const geoToMarket={};
  MARKETS.forEach(m=>{ if(!TINY.has(m)) geoToMarket[geoName(m)]=m; });

  function marketScore(market){ return data.markets?.[market]?.score; }
  function marketTotal(market){ return data.markets?.[market]?.total||0; }
  function marketFill(market){
    const score=marketScore(market);
    return Number.isFinite(score)?hotelSentimentColor(score):"#ddd8ee";
  }
  const displayedMarketFill=market=>marketFill(market);
  function polyArea(feat){
    const geom=feat.geometry;
    if(!geom) return 0;
    const shoelace=ring=>Math.abs(ring.reduce((s,p,i,a)=>{const n=a[(i+1)%a.length];return s+p[0]*n[1]-n[0]*p[1];},0))/2;
    if(geom.type==="Polygon") return shoelace(geom.coordinates[0]);
    if(geom.type==="MultiPolygon") return Math.max(...geom.coordinates.map(p=>shoelace(p[0])));
    return 0;
  }

  if(countries?.features?.length){
    const allSorted=[...countries.features].sort((a,b)=>polyArea(b)-polyArea(a));
    const marketFeatures=countries.features.filter(f=>(marketFromGeoFeature(f)||geoToMarket[f.properties.name])).sort((a,b)=>polyArea(b)-polyArea(a));

    g.append("g").attr("class","world-land").selectAll("path")
      .data(allSorted).join("path")
      .attr("d",path)
      .attr("fill",f=>{
        const market=(marketFromGeoFeature(f)||geoToMarket[f.properties.name]);
        if(!market) return "#e8e2f4";
        return displayedMarketFill(market);
      })
      .attr("opacity",f=>{
        const market=(marketFromGeoFeature(f)||geoToMarket[f.properties.name]);
        return market ? marketOpacity(market) : (hasMarketSelection ? .28 : 1);
      })
      .attr("stroke","#fff").attr("stroke-width",0.3)
      .style("pointer-events","none");

    g.append("g").attr("class","market-layer").selectAll("path")
      .data(marketFeatures).join("path")
      .attr("d",path)
      .attr("fill",f=>{
        const market=(marketFromGeoFeature(f)||geoToMarket[f.properties.name]);
        return displayedMarketFill(market);
      })
      .attr("opacity",f=>marketOpacity((marketFromGeoFeature(f)||geoToMarket[f.properties.name])))
      .attr("stroke",f=>selectedSet.has((marketFromGeoFeature(f)||geoToMarket[f.properties.name]))?SELECTED_MARKET_STROKE:"#fff")
      .attr("stroke-width",f=>selectedSet.has((marketFromGeoFeature(f)||geoToMarket[f.properties.name]))?2.8:0.6)
      .style("cursor","pointer")
      .style("filter",f=>marketFilter((marketFromGeoFeature(f)||geoToMarket[f.properties.name])))
      .on("click",(e,f)=>{const market=(marketFromGeoFeature(f)||geoToMarket[f.properties.name]); if(market) selectMarketFromMap(market);})
      .on("mousemove",(e,f)=>{
        const market=(marketFromGeoFeature(f)||geoToMarket[f.properties.name]);
        const score=marketScore(market);
        if(!Number.isFinite(score)){hideTip();return;}
        showTip(e,{label:market,value:`Score: ${hotelSentimentScoreText(score)}  (n=${marketTotal(market).toLocaleString()})`},true);
      })
      .on("mouseleave",hideTip);

    g.append("g").attr("class","world-borders").selectAll("path")
      .data(allSorted).join("path")
      .attr("d",path)
      .attr("fill","none")
      .attr("stroke","rgba(255,255,255,0.6)")
      .attr("stroke-width",0.4)
      .style("pointer-events","none");
  }

  const tinyList=[]; // no synthetic BH/SG markers; use real polygons
  g.append("g").selectAll("g").data(tinyList).join("g")
    .attr("transform",m=>{const p=projection(MARKET_COORDS[m]);return`translate(${p[0]},${p[1]})`;})
    .style("cursor","pointer")
    .attr("opacity",m=>marketOpacity(m))
    .style("filter",m=>marketFilter(m))
    .call(s=>{
      s.append("circle").attr("r",5)
        .attr("fill",m=>displayedMarketFill(m))
        .attr("stroke",m=>selectedSet.has(m)?SELECTED_MARKET_STROKE:"#fff").attr("stroke-width",m=>selectedSet.has(m)?2.4:1.2);
      s.append("text").attr("x",6).attr("y",3).attr("font-size",7).attr("fill","#444")
        .text(m=>m==="Singapore"?"SG":"BH");
    })
    .on("click",(e,m)=>selectMarketFromMap(m))
    .on("mousemove",(e,m)=>{
      const score=marketScore(m);
      if(!Number.isFinite(score)){hideTip();return;}
      showTip(e,{label:m,value:`Score: ${hotelSentimentScoreText(score)}  (n=${marketTotal(m).toLocaleString()})`},true);
    })
    .on("mouseleave",hideTip);

  appendSentimentScaleLegend(el);
}

function renderAirlineSentimentInsight(data){
  const root=document.getElementById("airlineSentimentMapInsight");
  if(!root) return;
  const {market,summary}=airlineSentimentSelection(data);
  const label=market==="All"?"All Markets":market;
  const top=summary.topAirlines?.[0];
  const pos=summary.positive||0, neu=summary.neutral||0, neg=summary.negative||0, total=summary.total||1;
  root.innerHTML=`
    <div class="map-focus-name">${escapeHtml(label)}</div>
    <div class="map-focus-metric">${hotelSentimentScoreText(summary.score)}</div>
    <div class="map-focus-label">Airline sentiment score · ${summary.total.toLocaleString()} mentions</div>
    <div class="hotel-sentiment-mix">
      <div><strong>${Math.round(pos/total*100)}%</strong><span>Positive</span></div>
      <div><strong>${Math.round(neu/total*100)}%</strong><span>Neutral</span></div>
      <div><strong>${Math.round(neg/total*100)}%</strong><span>Negative</span></div>
    </div>
    <div class="map-focus-hint">${top?`Top airline by mentions: <b>${escapeHtml(top.airline)}</b> (${top.total.toLocaleString()} records, ${hotelSentimentScoreText(top.score)} score).`:"Click any country on the map to focus on a source market."}</div>
  `;
}

function renderAirlineSentimentGauges(data){
  const grid=document.getElementById("airlineSentimentGaugeGrid");
  const title=document.getElementById("airlineSentimentGaugeTitle");
  if(!grid) return;
  maybeLoadPeriodSentimentForActiveTab();
  const {market,summary}=airlineSentimentSelection(data);
  const label=market==="All"?"All Markets":market;
  if(title) title.textContent=`Airline Current Period Sentiment — ${label}`;
  const airlines=summary.topAirlines||[];
  if(!airlines.length){
    grid.innerHTML='<div class="empty-chart">No airline sentiment records available for this market.</div>';
    return;
  }
  const periodStatsByAirline=buildExactPeriodStatsMap(airlinePeriodSentimentData,airlines,"airline");
  grid.innerHTML=airlines.map((item,i)=>{
    const periods=periodStatsByAirline[item.airline]||emptyPeriodStats();
    const current=periods[CURRENT_SENTIMENT_PERIOD.key];
    const gaugeScore=current.total?current.score:item.score;
    const gaugeTotal=current.total?current.total:item.total;
    const pos=current.total?current.positive:item.positive;
    const neu=current.total?current.neutral:item.neutral;
    const neg=current.total?current.negative:item.negative;
    const tablePeriods=periods;
    const dataNote=airlinePeriodSentimentData?(current.total?"":" · no current-period records"):" · loading period records";
    return `
    <article class="hotel-sentiment-gauge-card hotel-sentiment-meter-card period-sentiment-card">
      <div class="hotel-sentiment-gauge-rank">#${i+1}</div>
      <h3 title="${escapeHtml(item.airline)}">${escapeHtml(item.airline)}</h3>
      <div class="period-current-label">Current · ${CURRENT_SENTIMENT_PERIOD.label}</div>
      <div id="airlineSentimentGauge${i}" class="hotel-sentiment-gauge"></div>
      <div class="hotel-sentiment-strip" aria-label="Sentiment mix">
        <i class="pos" style="width:${gaugeTotal?pos/gaugeTotal*100:0}%"></i>
        <i class="neu" style="width:${gaugeTotal?neu/gaugeTotal*100:0}%"></i>
        <i class="neg" style="width:${gaugeTotal?neg/gaugeTotal*100:0}%"></i>
      </div>
      <div class="hotel-sentiment-counts hotel-sentiment-percent-counts">
        <span><b>${gaugeTotal?Math.round(pos/gaugeTotal*100):0}%</b> Pos</span>
        <span><b>${gaugeTotal?Math.round(neu/gaugeTotal*100):0}%</b> Neu</span>
        <span><b>${gaugeTotal?Math.round(neg/gaugeTotal*100):0}%</b> Neg</span>
      </div>
      <div class="hotel-sentiment-n">n = ${gaugeTotal.toLocaleString()}${dataNote}</div>
      <table class="period-score-table" aria-label="${escapeHtml(item.airline)} previous period scores">
        <thead><tr><th>${SENTIMENT_PERIODS[0].label}</th><th>${SENTIMENT_PERIODS[1].label}</th><th>${SENTIMENT_PERIODS[2].label}</th></tr></thead>
        <tbody><tr>
          <td>${periodScoreCell(tablePeriods["Wave 1"])}</td>
          <td>${periodScoreCell(tablePeriods["Wave 2"])}</td>
          <td>${periodScoreCell(tablePeriods["Wave 3"])}</td>
        </tr></tbody>
      </table>
    </article>
  `}).join("");
  airlines.forEach((item,i)=>{
    const periods=periodStatsByAirline[item.airline]||emptyPeriodStats();
    const current=periods[CURRENT_SENTIMENT_PERIOD.key];
    const score=current.total?current.score:item.score;
    drawSentimentGauge(document.querySelector(`#airlineSentimentGauge${i}`),score);
  });
}

/* loadSocialData: redefined in chunked loader above */

/* ---------- setup / filters ---------- */
function questionLabels(key){return (DATA?.questions?.[key]?.data||[]).map(d=>clean(d.label));}
function filterOptions(cfg){return cfg.options().filter(Boolean);}
function filterDisplayLabel(cfg){
  if(cfg.value==="Class") return currentTab==="airline"?"Airline Class":currentTab==="hotel"?"Hotel Class":"Class";
  return cfg.label;
}
function activeConfig(){return FILTER_CONFIG.find(f=>f.value===filterDim)||FILTER_CONFIG[0];}
function selectionLabel(values){
  if(!values||!values.length)return "All";
  if(values.length===1)return values[0];
  if(values.length===2)return values.join(", ");
  return `${values.length} selected`;
}
function initFilterState(){
  FILTER_CONFIG.forEach(cfg=>{filterSelections[cfg.value]=[...cfg.default].filter(v=>filterOptions(cfg).includes(v));});
}
function buildFilterControls(){
  const grid=d3.select("#filterGrid");
  grid.selectAll(".filter-control").remove();
  const controls=grid.selectAll(".filter-control").data(FILTER_CONFIG).join("div").attr("class","filter-control");
  controls.each(function(cfg){
    const valid=filterOptions(cfg);
    filterSelections[cfg.value]=(filterSelections[cfg.value]||[]).filter(v=>valid.includes(v));
    const root=d3.select(this);
    root.append("span").attr("class","filter-label").text(filterDisplayLabel(cfg));
    root.append("button").attr("type","button").attr("class","multi-select").attr("aria-haspopup","listbox").attr("aria-expanded","false").attr("data-filter",cfg.value).text(selectionLabel(filterSelections[cfg.value]));
    root.append("div").attr("class","multi-menu").attr("data-menu",cfg.value).attr("role","listbox").attr("aria-multiselectable","true");
    root.append("div").attr("class","filter-selection-count");
    renderFilterMenu(cfg.value);
  });
  d3.selectAll(".multi-select").on("click",function(e){
    e.stopPropagation();
    const root=d3.select(this.parentNode), menu=root.select(".multi-menu");
    const willOpen=!menu.classed("open");
    d3.selectAll(".multi-menu").classed("open",false);
    d3.selectAll(".multi-select").classed("open",false).attr("aria-expanded","false");
    menu.classed("open",willOpen); root.select(".multi-select").classed("open",willOpen).attr("aria-expanded",String(willOpen));
  });
  d3.selectAll(".multi-menu").on("click",e=>e.stopPropagation());
  updateFilterSummaries();
}
function renderFilterMenu(dim){
  const cfg=FILTER_CONFIG.find(f=>f.value===dim); if(!cfg)return;
  const opts=filterOptions(cfg), selected=filterSelections[dim]||[];
  const menu=d3.select(`.multi-menu[data-menu="${CSS.escape(dim)}"]`);
  if(menu.empty())return;
  const rows=["__ALL__",...opts];
  menu.selectAll("label").data(rows).join("label").attr("class",d=>`multi-option${d==="__ALL__"?" all":""}`).html("").each(function(d){
    const label=d==="__ALL__"?"All":d;
    const checked=d==="__ALL__"?selected.length===0:selected.includes(d);
    const row=d3.select(this);
    row.append("input").attr("type","checkbox").property("checked",checked).attr("value",d).attr("aria-label",label);
    row.append("span").text(label);
  });
  menu.selectAll("input").on("change",function(e){
    e.stopPropagation();
    const value=this.value;
    if(value==="__ALL__") filterSelections[dim]=[];
    else {
      let next=[...(filterSelections[dim]||[])];
      if(this.checked){ if(!next.includes(value))next.push(value); }
      else next=next.filter(v=>v!==value);
      filterSelections[dim]=next;
    }
    filterDim=dim;
    activeSelections=[...(filterSelections[dim]||[])];
    segment=selectionLabel(activeSelections);
    renderFilterMenu(dim); updateFilterSummaries(); updateSegmentBase(); renderActive();
  });
}
function updateFilterSummaries(){
  d3.selectAll(".filter-control").each(function(cfg){
    const vals=filterSelections[cfg.value]||[];
    d3.select(this).select(".multi-select").text(selectionLabel(vals));
    d3.select(this).select(".filter-selection-count").text(vals.length>1?`${vals.length} selected`:"");
  });
}
function closeMenus(){
  d3.selectAll(".multi-menu").classed("open",false);
  d3.selectAll(".multi-select").classed("open",false).attr("aria-expanded","false");
}
function setFilterDim(dim){
  filterDim=dim;
  const cfg=FILTER_CONFIG.find(f=>f.value===dim)||FILTER_CONFIG[0];
  const valid=filterOptions(cfg);
  filterSelections[dim]=(filterSelections[dim]||[]).filter(v=>valid.includes(v));
  activeSelections=[...(filterSelections[dim]||[])];
  segment=selectionLabel(activeSelections);
  updateFilterSummaries(); updateSegmentBase(); renderActive();
}
function resetFilters(){
  invalidateRowCache();
  FILTER_CONFIG.forEach(cfg=>{filterSelections[cfg.value]=[...cfg.default].filter(v=>filterOptions(cfg).includes(v));});
  setFilterDim("Market");
  buildFilterControlsCascade();
}
function isDefaultFilter(){return filterSelections.Market?.length===0 && filterSelections.Region?.length===0;}
function init(){
  initFilterState();
  buildFilterControlsCascade();
  d3.select("#resetBtn").on("click",resetFilters);
  d3.select("#chipClear").on("click",resetFilters);
  d3.selectAll(".tab").on("click",function(){switchTab(d3.select(this).attr("data-tab"));});
  d3.select(document).on("click",closeMenus);
  setFilterDim("Market");
  addExportButtons();
  window.addEventListener("resize",debounce(renderActive,150));
}
function populateSegments(dim){setFilterDim(dim);}
function baseForSelection(key,sel){
  const base=DATA.questions[key]?.base||{};
  if(sel==="25–44") return (base["25-34"]||0)+(base["35-44"]||0);
  return base[sel]||0;
}
function valueForSelection(key,row,sel){
  if(sel==="25–44"){
    const a=+(row.values["25-34"]??0), b=+(row.values["35-44"]??0);
    const ba=DATA.questions[key]?.base?.["25-34"]||0, bb=DATA.questions[key]?.base?.["35-44"]||0;
    return ba+bb ? (a*ba+b*bb)/(ba+bb) : 0;
  }
  return +(row.values[sel]??0);
}
function segmentValue(row,key){
  /* Guard: if row has no .values (most questions in this dataset), return 0 */
  if(!row || !row.values) return 0;
  const selections=activeSelections.length?activeSelections:["Total"];
  if(selections.length===1 && (selections[0]==="All"||selections[0]==="Total")) return +(row.values.Total??0);
  const supported=selections.filter(sel=>sel==="25–44" || Object.prototype.hasOwnProperty.call(row.values,sel));
  if(!supported.length) return +(row.values.Total??0);
  const weighted=supported.map(sel=>({v:valueForSelection(key,row,sel),n:baseForSelection(key,sel)}));
  const totalN=weighted.reduce((a,b)=>a+b.n,0);
  return totalN ? weighted.reduce((a,b)=>a+b.v*b.n,0)/totalN : d3.mean(weighted,d=>d.v)||0;
}
function updateSegmentBase(){
  const n = activeRows().length;
  const label = selectionLabel(activeSelections);
  /* segmentBase removed from UI */
  d3.select("#chipClear").attr("hidden",isDefaultFilter()?true:null);
}
function switchTab(name){
  return runDashboardUpdate(()=>{
    currentTab=name;
    if(DATA){buildFilterControlsCascade();}
    d3.select("#filtersBar").classed("airline-filter-station",name==="airline").classed("pov-filter-station",name==="airline"||name==="hotel"||name==="destination");
    d3.select("body")
      .classed("airline-active",name==="airline")
      .classed("hotel-active",name==="hotel")
      .classed("destination-active",name==="destination")
      .classed("segments-active",name==="segments");
    d3.selectAll(".tab").classed("active",function(){return d3.select(this).attr("data-tab")===name;});
    d3.selectAll(".tab-panel").each(function(){
      const el=d3.select(this); el.attr("hidden", el.attr("data-panel")===name?null:true);
    });
    return ensureActiveDashboardData().then(()=>renderActive());
  },"Updating dashboard...");
}
function renderActive(){
  if(!DATA)return;
  const fn=({overview:renderOverview, behaviour:renderBehaviour,
             airline:renderAirline, hotel:renderHotel,
             destination:renderDestination})[currentTab];
  if(fn) requestAnimationFrame(()=>{ try{fn();}catch(e){console.error("renderActive",e);} });
}

/* ---------- data helpers ---------- */
function q(key){return DATA.questions[key].data.map(d=>({label:clean(d.label),value:segmentValue(d,key)}));}
function specificQ(key,selected=[]){
  const rows=q(key);
  return selected.length ? rows.filter(d=>selected.includes(d.label)) : rows;
}
function byLabel(key,needle){return q(key).find(d=>d.label.toLowerCase().includes(needle.toLowerCase()))?.value||0;}
function topN(arr,n){return [...arr].sort((a,b)=>b.value-a.value).slice(0,n)}
function findRow(key,needle){return DATA.questions[key].data.find(r=>r.label.toLowerCase().includes(needle.toLowerCase()));}
function valueFor(key,needle,seg){const r=findRow(key,needle); return r? +(r.values[seg]??0):0;}
function baseFor(key,seg){return DATA.questions[key].base[seg]||0;}
function regionSpendIncrease(seg){return DATA.questions.spendChange.data.filter(r=>r.label.startsWith("Will increase")).reduce((a,r)=>a+(+(r.values[seg]??0)),0);}
function withSelection(sel,fn){const saved=activeSelections;activeSelections=sel;const result=fn();activeSelections=saved;return result;}
function spendIncreaseCurrent(){const raw=q("spendChange");return raw.filter(d=>d.label.startsWith("Will increase")).reduce((a,b)=>a+b.value,0);}

/* ---------- insight banners ---------- */
function renderOverviewInsight(){
  const research=byLabel("planningStage","researching destinations");
  const near=byLabel("tripTiming","1–3 months");
  const inc=spendIncreaseCurrent();
  const topPurpose=topN(q("tripPurpose"),1)[0];
  d3.select("#overviewInsight").html(`For <b>${selectionLabel(activeSelections)}</b>, ${fmt(research)} are still researching, ${fmt(near)} plan to travel within 1–3 months, and ${fmt(inc)} expect their travel spend to rise — <b>${topPurpose.label}</b> leads as the main trip purpose (${fmt(topPurpose.value)}).`);
}
function renderBehaviourInsight(){
  const topChannel=topN(q("infoChannels"),1)[0];
  const topExp=topN(q("experiences"),1)[0];
  const aiTrust=byLabel("aiLikelihood","Top 2 Box");
  d3.select("#behaviourInsight").html(`
    <span class="insight-bullet"><b>${topChannel.label}</b> is the top discovery channel (${fmt(topChannel.value)})</span>
    <span class="insight-bullet"><b>${topExp.label}</b> leads what travelers are seeking (${fmt(topExp.value)})</span>
    <span class="insight-bullet">${fmt(aiTrust)} of ${selectionLabel(activeSelections)} would trust an AI trip assistant.</span>
  `);
}
function renderAirlineInsight(){
  const topCarrier=topN(q("airlineCarrier"),1)[0];
  const nps=byLabel("airlineNPS","NPS Score");
  const topFactor=topN(q("airlineConsiderations"),1)[0];
  const word=nps>=50?"strong":nps>=0?"moderate":"weak";
  d3.select("#airlineInsight").html(`<b>${topCarrier.label}</b> leads carrier preference (${fmt(topCarrier.value)}) for ${selectionLabel(activeSelections)}. Airline NPS is ${word} at ${d3.format(".0f")(nps)}, and <b>${topFactor.label}</b> is the top factor when choosing an airline.`);
}
function renderHotelInsight(){
  const topStay=topN(q("accommodation"),1)[0]||{label:"—",value:0};
  const nps=byLabel("hotelNPS","NPS Score");
  const topFactor=topN(q("hotelConsiderations"),1)[0]||{label:"—",value:0};
  const word=nps>=50?"strong":nps>=0?"moderate":"weak";
  d3.select("#hotelInsight").html(`<b>${topStay.label}</b> is the preferred stay type (${fmt(topStay.value)}) for ${selectionLabel(activeSelections)}. Hotel NPS is ${word} at ${d3.format(".0f")(nps)}, and <b>${topFactor.label}</b> drives hotel choice most.`);
}
function renderMarketInsight(){
  const rows=contextRows("Market");
  const regionMetric=(region,key)=>metricFromRows(rows.filter(r=>r.Region===region),key);
  const bestAirline=topN(REGIONS.map(r=>({label:shortRegion(r),value:regionMetric(r,"airlineNPS")})).filter(d=>Number.isFinite(d.value)),1)[0]||{label:"—",value:0};
  const bestHotel=topN(REGIONS.map(r=>({label:shortRegion(r),value:regionMetric(r,"hotelNPS")})).filter(d=>Number.isFinite(d.value)),1)[0]||{label:"—",value:0};
  const bestAI=topN(REGIONS.map(r=>({label:shortRegion(r),value:metricFromRows(rows.filter(x=>x.Region===r),"aiLikelihood")})).filter(d=>Number.isFinite(d.value)),1)[0]||{label:"—",value:0};
  const n=rows.length;
  d3.select("#marketInsight").html(`Across the seven source regions, <b>${bestAirline.label}</b> has the highest airline NPS (${d3.format(".0f")(bestAirline.value)}), <b>${bestHotel.label}</b> leads hotel NPS (${d3.format(".0f")(bestHotel.value)}), and <b>${bestAI.label}</b> has the strongest AI-assistant trust (${fmt(bestAI.value)}). <span class="insight-context">Based on ${n.toLocaleString()} respondents matching the active filters.</span>`);
}

/* ---------- tab renderers ---------- */
function renderOverview(){
  renderGlobalMap("#overviewMap","source");
  renderMapInsight("#mapInsight","source");

}
/* ── Per-stage percentage labels (% of Q2 respondents) ───────── */
function stagePct(stageValues) {
  if(!DATA) return "";
  const rows=activeRows(), n=rows.length; if(!n) return "";
  const count=rows.filter(r=>stageValues.includes(clean(r["Q2"]||"").toLowerCase())).length;
  return fmt(count/n);
}

/* SVG icons per journey stage — matching screenshot design */
const STAGE_ICONS = {
  "Inspire": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" fill="none" stroke="rgba(255,255,255,0.95)" stroke-linecap="round" stroke-linejoin="round">
    <!-- rays -->
    <line x1="26" y1="4" x2="26" y2="1" stroke-width="2"/>
    <line x1="26" y1="51" x2="26" y2="48" stroke-width="2"/>
    <line x1="9" y1="9" x2="11.1" y2="11.1" stroke-width="2"/>
    <line x1="43" y1="9" x2="40.9" y2="11.1" stroke-width="2"/>
    <line x1="3" y1="26" x2="6" y2="26" stroke-width="2"/>
    <line x1="49" y1="26" x2="46" y2="26" stroke-width="2"/>
    <!-- bulb -->
    <path d="M26 10 C18 10 12 16 12 24 C12 29.5 15.2 34.2 20 36.5 L20 41 Q20 43 22 43 L30 43 Q32 43 32 41 L32 36.5 C36.8 34.2 40 29.5 40 24 C40 16 34 10 26 10 Z" stroke-width="1.8"/>
    <!-- base lines -->
    <line x1="20" y1="46" x2="32" y2="46" stroke-width="1.8"/>
    <line x1="22" y1="49" x2="30" y2="49" stroke-width="1.8"/>
    <!-- checkmark -->
    <polyline points="20,24 24,28 33,19" stroke-width="2.5" stroke="rgba(255,255,255,1)"/>
  </svg>`,
  "Plan": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" fill="none" stroke="rgba(255,255,255,0.85)" stroke-linecap="round" stroke-linejoin="round">
    <!-- magnifying glass -->
    <circle cx="21" cy="22" r="14" stroke-width="2"/>
    <line x1="31.5" y1="32.5" x2="46" y2="47" stroke-width="3"/>
    <!-- person inside glass -->
    <circle cx="21" cy="17" r="4" stroke-width="1.8"/>
    <path d="M12 30 C12 25 16.1 22 21 22 C25.9 22 30 25 30 30" stroke-width="1.8"/>
  </svg>`,
  "Book": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" fill="none" stroke="rgba(255,255,255,0.85)" stroke-linecap="round" stroke-linejoin="round">
    <!-- calendar -->
    <rect x="4" y="8" width="44" height="40" rx="4" stroke-width="2"/>
    <line x1="4" y1="20" x2="48" y2="20" stroke-width="2"/>
    <line x1="16" y1="4" x2="16" y2="14" stroke-width="2.5"/>
    <line x1="36" y1="4" x2="36" y2="14" stroke-width="2.5"/>
    <!-- airplane -->
    <path d="M24 38 L18 32 L20 30 L28 33 L34 27 C35 26 37 26 37 28 C37 28 36 29 36 29 L30 35 L33 43 L31 45 L27 39 L25 41 L23 39 Z" stroke-width="1.4"/>
  </svg>`,
  "On-Trip": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" fill="none" stroke="rgba(255,255,255,0.85)" stroke-linecap="round" stroke-linejoin="round">
    <!-- suitcase body -->
    <rect x="6" y="16" width="40" height="30" rx="4" stroke-width="2"/>
    <!-- handle -->
    <path d="M18 16 L18 10 Q18 6 22 6 L30 6 Q34 6 34 10 L34 16" stroke-width="2"/>
    <!-- divider -->
    <line x1="6" y1="30" x2="46" y2="30" stroke-width="2"/>
    <!-- wheels -->
    <circle cx="16" cy="48" r="3" stroke-width="2"/>
    <circle cx="36" cy="48" r="3" stroke-width="2"/>
    <!-- center bar -->
    <line x1="26" y1="30" x2="26" y2="46" stroke-width="2"/>
    <!-- stripes -->
    <line x1="14" y1="22" x2="14" y2="28" stroke-width="1.5"/>
    <line x1="20" y1="22" x2="20" y2="28" stroke-width="1.5"/>
  </svg>`
};

function renderJourneyFlow(){
  const rows=activeRows(), n=rows.length||1;

  const stageValue=row=>clean(row.planningStage||row.Q2||"").toLowerCase();
  const isInspire=row=>stageValue(row).includes("yet to start");
  const isPlan=row=>stageValue(row).includes("research")||stageValue(row).includes("planning my itinerary");
  const isBook=row=>stageValue(row).includes("arrangement")||stageValue(row).includes("booked");

  const inspireCount = rows.filter(isInspire).length;
  const planCount    = rows.filter(isPlan).length;
  const bookCount    = rows.filter(isBook).length;
  const onTripCount  = Math.max(0, n - inspireCount - planCount - bookCount);

  const inspirePct = n ? fmt(inspireCount / n) : "15%";
  const planPct    = n ? fmt(planCount / n) : "35%";
  const bookPct    = n ? fmt(bookCount / n) : "40%";

  const stages=[
    {key:"Inspire",  label:"Inspire",  sub:"Not yet planning",        pct:inspirePct, tone:"purple"},
    {key:"Plan",     label:"Plan",     sub:"Researching or Itinerary",  pct:planPct,    tone:"gray"},
    {key:"Book",     label:"Book",     sub:"Arranged or booked",        pct:bookPct,    tone:"blue"},
    {key:"On-Trip",  label:"During trip", sub:"Experience",            pct:"",         tone:"light"}
  ];

  const panelMap={
    "Inspire":"stageInspire",
    "Plan":"stagePlan",
    "Book":"stageBook",
    "On-Trip":"stageOnTrip"
  };

  /* Show active panel, hide others */
  Object.values(panelMap).forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.hidden=true;
  });
  const activePanel=document.getElementById(panelMap[currentJourneyStage]);
  if(activePanel) activePanel.hidden=false;

  /* #journeyFlow is now permanently in .behaviour-sidebar - no moving needed */
  const root=d3.select("#journeyFlow");
  if(root.empty()) return;
  root.selectAll("*").remove();

  root.selectAll(".journey-step").data(stages).join("button")
    .attr("class",d=>`journey-step ${d.tone}${d.key===currentJourneyStage?" active":""}` )
    .attr("data-stage", d => d.key)
    .attr("type","button")
    .html(d=>`
      <span class="journey-step-icon">${STAGE_ICONS[d.key]||""}</span>
      <span class="journey-step-copy">
        <span class="journey-step-label">${d.label}</span>
        <span class="journey-meta">${d.sub}</span>
      </span>
      ${d.pct?`<span class="journey-pct">${d.pct}</span>`:""}
    `)
    .on("click",(_,d)=>{
      currentJourneyStage=d.key;
      renderJourneyFlow();
      renderJourneyStageCharts(d.key);
      renderBehaviourMap();
    });
}


function showJourneyStagePanel(stageKey) {
  const panelMap={
    "Inspire":"stageInspire",
    "Plan":"stagePlan",
    "Book":"stageBook",
    "On-Trip":"stageOnTrip"
  };
  Object.values(panelMap).forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.hidden=true;
  });
  const active=document.getElementById(panelMap[stageKey]);
  if(active) active.hidden=false;
}

function behaviourPieChart(sel,data,opt={}){
  const el=document.querySelector(sel);
  if(!el) return;
  const rows=[...(data||[])]
    .filter(d=>Number.isFinite(+d.value)&&+d.value>0)
    .sort((a,b)=>b.value-a.value);
  const root=d3.select(sel);
  root.selectAll("*").remove();
  el.classList.add("behaviour-pie-chart");
  if(!rows.length){
    root.append("div").attr("class","empty-chart").text("No data available for this selection.");
    return;
  }

  const w=Math.max(300,el.clientWidth||420);
  const wide=w>=430;
  const h=opt.height||(wide?300:360);
  const r=wide?Math.min(118,h*.37,w*.22):Math.min(112,w*.32,h*.25);
  const cx=wide?Math.max(r+22,w*.30):w/2;
  const cy=wide?h/2-4:120;
  const legendX=wide?Math.min(w*.58,w-210):20;
  const legendY=wide?Math.max(36,cy-rows.length*12):cy+r+24;
  const colors=opt.colors||["#6f00b5","#0bbba8","#ff2636","#d7ff00","#9A1B15","#230B54","#7b6aa4","#c7bdd8"];

  const svg=root.append("svg")
    .attr("width",w)
    .attr("height",h)
    .attr("viewBox",`0 0 ${w} ${h}`)
    .style("display","block");

  const pie=d3.pie().sort(null).value(d=>Math.max(0,+d.value));
  const arc=d3.arc().innerRadius(0).outerRadius(r);
  const labelArc=d3.arc().innerRadius(r*.62).outerRadius(r*.62);
  const g=svg.append("g").attr("transform",`translate(${cx},${cy})`);

  g.selectAll("path").data(pie(rows)).join("path")
    .attr("d",arc)
    .attr("fill",(d,i)=>colors[i%colors.length])
    .attr("stroke","#fff")
    .attr("stroke-width",2)
    .on("mousemove",(e,d)=>showTip(e,{label:d.data.label,value:fmt(d.data.value)}))
    .on("mouseleave",hideTip);

  g.selectAll("text.slice-label").data(pie(rows).filter(d=>d.data.value>=0.05)).join("text")
    .attr("class","slice-label")
    .attr("transform",d=>`translate(${labelArc.centroid(d)})`)
    .attr("text-anchor","middle")
    .attr("dy",".35em")
    .attr("font-size",10)
    .attr("font-weight",900)
    .attr("fill","#fff")
    .text(d=>fmt(d.data.value));

  const legend=svg.append("g").attr("transform",`translate(${legendX},${legendY})`);
  const rowH=22;
  const maxLabel=wide?28:32;
  const item=legend.selectAll("g").data(rows).join("g")
    .attr("transform",(d,i)=>`translate(0,${i*rowH})`);
  item.append("rect")
    .attr("width",11)
    .attr("height",11)
    .attr("rx",2.5)
    .attr("fill",(d,i)=>colors[i%colors.length]);
  item.append("text")
    .attr("x",17)
    .attr("y",9.5)
    .attr("font-size",9.5)
    .attr("font-weight",800)
    .attr("fill","#5b4b78")
    .text(d=>{
      const s=chartDisplayLabel(d);
      return s.length>maxLabel?s.slice(0,maxLabel-1)+"…":s;
    })
    .append("title")
    .text(d=>chartDisplayLabel(d));
  item.append("text")
    .attr("x",wide?178:w-58)
    .attr("y",9.5)
    .attr("text-anchor","end")
    .attr("font-size",10)
    .attr("font-weight",900)
    .attr("fill","#230B54")
    .text(d=>fmt(d.value));
}

function behaviourDemographicPie3D(sel,data,opt={}){
  const el=document.querySelector(sel);
  if(!el)return;
  const rows=[...(data||[])].filter(item=>Number.isFinite(+item.value)&&+item.value>0);
  const root=d3.select(el);
  if(el._threePieCleanup)el._threePieCleanup();
  root.selectAll("*").remove();
  if(!rows.length){root.append("div").attr("class","empty-chart").text("No responses available.");return;}
  if(!window.THREE){
    behaviourPieChart(sel,rows,opt);
    return;
  }

  const total=rows.reduce((sum,item)=>sum+(+item.count||0),0);
  const colors=opt.colors||["#00B5AC","#7B42F6","#F1675B","#F4BD25","#E94E89","#87939A","#299ED5"];
  const wide=el.clientWidth>=620;
  el.classList.add("demographic-3d-chart");
  const layoutMode=opt.compact?"is-compact":wide?"is-wide":"is-stacked";
  const layout=root.append("div").attr("class",`demographic-3d-layout ${layoutMode}`);
  const sceneHost=layout.append("div").attr("class","demographic-3d-scene").attr("role","img").attr("aria-label",`3D pie chart of ${opt.category||"demographic responses"} for ${total.toLocaleString()} respondents`);
  const calloutHost=layout.append("div").attr("class","demographic-3d-callouts");
  // const footer=root.append("div").attr("class","demographic-3d-footer").text(`n = ${total.toLocaleString()} respondents`);

  let renderer;
  try{
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:"low-power",preserveDrawingBuffer:true});
  }catch(error){
    root.selectAll("*").remove();
    behaviourPieChart(sel,rows,opt);
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000,0);
  sceneHost.node().appendChild(renderer.domElement);

  const scene=new THREE.Scene();
  const hostWidth=Math.max(280,sceneHost.node().clientWidth||el.clientWidth||320);
  const hostHeight=Math.max(260,sceneHost.node().clientHeight||360);
  const camera=new THREE.PerspectiveCamera(38,hostWidth/hostHeight,.1,60);
  camera.position.set(0,2.8,4.5);
  camera.lookAt(0,.12,0);
  scene.add(new THREE.HemisphereLight(0xffffff,0x59616f,2.1));
  const keyLight=new THREE.DirectionalLight(0xffffff,2.6);
  keyLight.position.set(-3,7,5);
  keyLight.castShadow=true;
  keyLight.shadow.mapSize.set(1024,1024);
  scene.add(keyLight);
  const fillLight=new THREE.DirectionalLight(0xffffff,.75);
  fillLight.position.set(4,4,-3);
  scene.add(fillLight);

  const shadowPlane=new THREE.Mesh(
    new THREE.PlaneGeometry(4.8,4.8),
    new THREE.ShadowMaterial({color:0x1c1730,opacity:.18})
  );
  shadowPlane.rotation.x=-Math.PI/2;
  shadowPlane.position.y=-.08;
  shadowPlane.receiveShadow=true;
  scene.add(shadowPlane);

  const pieRadius=wide?1.85:opt.compact?.9:1.6;
  const depth=wide?.38:opt.compact?.24:.3;
  const slices=[];
  let startAngle=-Math.PI/2;
  rows.forEach((item,index)=>{
    const sweep=Math.PI*2*(+item.value||0);
    if(sweep<=0)return;
    const endAngle=startAngle+sweep;
    const shape=new THREE.Shape();
    shape.moveTo(pieRadius*Math.cos(startAngle),pieRadius*Math.sin(startAngle));
    shape.absarc(0,0,pieRadius,startAngle,endAngle,false);
    shape.lineTo(0,0);
    shape.closePath();
    const geometry=new THREE.ExtrudeGeometry(shape,{
      depth,
      bevelEnabled:true,
      bevelSegments:2,
      steps:1,
      bevelSize:.025,
      bevelThickness:.025,
      curveSegments:32
    });
    const color=new THREE.Color(colors[index%colors.length]);
    const materials=[
      new THREE.MeshStandardMaterial({color,roughness:.44,metalness:.02,side:THREE.DoubleSide}),
      new THREE.MeshStandardMaterial({color:color.clone().multiplyScalar(.68),roughness:.58,metalness:0,side:THREE.DoubleSide})
    ];
    const group=new THREE.Group();
    const midAngle=(startAngle+endAngle)/2;
    const offset=.035;
    group.position.set(Math.cos(midAngle)*offset,.02,-Math.sin(midAngle)*offset);
    group.rotation.x=-Math.PI/2;
    const mesh=new THREE.Mesh(geometry,materials);
    mesh.castShadow=true;
    mesh.receiveShadow=true;
    mesh.userData.label=item.label;
    group.add(mesh);
    scene.add(group);
    slices.push({label:item.label,item,group,geometry,materials,baseX:group.position.x,baseZ:group.position.z,midAngle});
    startAngle=endAngle;
  });

  let lockedLabel=opt.selected||"";
  const setHighlight=label=>{
    slices.forEach(slice=>{
      const selected=Boolean(label)&&slice.label===label;
      const offset=selected?.14:0;
      slice.group.position.set(slice.baseX+Math.cos(slice.midAngle)*offset,.02,slice.baseZ-Math.sin(slice.midAngle)*offset);
      slice.group.scale.setScalar(selected?1.045:1);
      slice.materials[0].emissive.setHex(selected?0x25153d:0x000000);
    });
    calloutHost.selectAll(".demographic-3d-callout").classed("is-highlighted",d=>Boolean(label)&&d.label===label);
    renderer.render(scene,camera);
  };
  const selectLabel=label=>{
    if(typeof opt.onClick==="function"){
      const item=rows.find(row=>row.label===label);
      if(item)opt.onClick(item);
      return;
    }
    lockedLabel=lockedLabel===label?"":label;
    setHighlight(lockedLabel);
  };
  const onPointerMove=event=>{
    const rect=renderer.domElement.getBoundingClientRect();
    const pointer=new THREE.Vector2(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1);
    const raycaster=new THREE.Raycaster();
    raycaster.setFromCamera(pointer,camera);
    const hit=raycaster.intersectObjects(slices.map(slice=>slice.group.children[0]),false)[0];
    if(hit){
      const slice=slices.find(item=>item.label===hit.object.userData.label);
      if(slice){setHighlight(slice.label);showTip(event,{label:slice.label,value:`${(slice.item.count||0).toLocaleString()} respondents · ${fmt(slice.item.value)}`},true);}
    }else{
      hideTip();
      setHighlight(lockedLabel);
    }
  };
  const onCanvasClick=event=>{
    const rect=renderer.domElement.getBoundingClientRect();
    const pointer=new THREE.Vector2(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1);
    const raycaster=new THREE.Raycaster();
    raycaster.setFromCamera(pointer,camera);
    const hit=raycaster.intersectObjects(slices.map(slice=>slice.group.children[0]),false)[0];
    if(hit){event.stopPropagation();selectLabel(hit.object.userData.label);}
  };
  renderer.domElement.addEventListener("pointermove",onPointerMove);
  renderer.domElement.addEventListener("pointerleave",()=>{hideTip();setHighlight(lockedLabel);});
  renderer.domElement.addEventListener("click",onCanvasClick);
  const callout=calloutHost.selectAll("button.demographic-3d-callout").data(rows).join("button")
    .attr("type","button")
    .attr("class","demographic-3d-callout")
    .attr("aria-label",d=>`${chartDisplayLabel(d)||d.label}, ${d.value<.005?"less than 1%":fmt(d.value)}`)
    .on("mouseenter",(event,d)=>setHighlight(d.label))
    .on("mouseleave",()=>setHighlight(lockedLabel))
    .on("click",(event,d)=>{event.stopPropagation();selectLabel(d.label);})
    .on("keydown",(event,d)=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();selectLabel(d.label);}});
  callout.append("span").attr("class","demographic-3d-swatch").style("background",(d,index)=>colors[index%colors.length]);
  callout.append("span").attr("class","demographic-3d-leader");
  callout.append("span").attr("class","demographic-3d-label").attr("title",d=>d.label).text(d=>chartDisplayLabel(d)||d.label);
  callout.append("strong").attr("class","demographic-3d-value").text(d=>d.value<.005?"<1%":fmt(d.value));
  if(lockedLabel)setHighlight(lockedLabel);

  const resize=()=>{
    const width=Math.max(280,sceneHost.node().clientWidth||hostWidth);
    const height=Math.max(260,sceneHost.node().clientHeight||hostHeight);
    renderer.setSize(width,height,false);
    camera.aspect=width/height;
    camera.updateProjectionMatrix();
    renderer.render(scene,camera);
  };
  const observer=typeof ResizeObserver!=="undefined"?new ResizeObserver(resize):null;
  if(observer)observer.observe(sceneHost.node());
  resize();
  el._threePieCleanup=()=>{
    if(observer)observer.disconnect();
    renderer.domElement.removeEventListener("pointermove",onPointerMove);
    renderer.domElement.removeEventListener("click",onCanvasClick);
    slices.forEach(slice=>{
      slice.geometry.dispose();
      slice.materials.forEach(material=>material.dispose());
    });
    shadowPlane.geometry.dispose();
    shadowPlane.material.dispose();
    renderer.dispose();
  };
}

function rowsIgnoringChartFilter(key){
  if(!DATA?.records?.length) return [];
  const had=Object.prototype.hasOwnProperty.call(chartFilters,key);
  const saved=chartFilters[key];
  if(had) delete chartFilters[key];
  const rows=DATA.records.filter(r=>passesRecord(r));
  if(had) chartFilters[key]=saved;
  return rows;
}

function rowsIgnoringChartFilters(keys){
  if(!DATA?.records?.length) return [];
  const saved={};
  (keys||[]).forEach(key=>{
    if(Object.prototype.hasOwnProperty.call(chartFilters,key)){
      saved[key]=chartFilters[key];
      delete chartFilters[key];
    }
  });
  const rows=DATA.records.filter(r=>passesRecord(r));
  Object.entries(saved).forEach(([key,value])=>{ chartFilters[key]=value; });
  return rows;
}

function segmentOptions(field){
  return [...new Set((DATA?.records||[]).map(r=>clean(r[field])).filter(Boolean))].sort();
}

function countField(rows,field){
  const counts=new Map();
  (rows||[]).forEach(row=>{
    const value=clean(row[field]);
    if(value) counts.set(value,(counts.get(value)||0)+1);
  });
  const total=[...counts.values()].reduce((a,b)=>a+b,0);
  return [...counts.entries()]
    .sort((a,b)=>b[1]-a[1])
    .map(([label,count])=>({label,count,value:total?count/total:0,total}));
}

function destinationAnswers(row){
  const explicitQ3=[row.Q3_1,row.Q3_2,row.Q3_3].filter(value=>String(value||"").trim());
  const destinations=explicitQ3.length?explicitQ3:(Array.isArray(row.Q3)?row.Q3.slice(0,3):[]);
  return destinations.map(value=>{
    const raw=String(value||"").trim();
    if(!raw||raw==="Undecided")return "";
    const normalized=normalizeDest(raw);
    return normalized&&normalized!=="Undecided"?normalized:"";
  }).filter(Boolean);
}

function destinationResponseDistribution(rows){
  const counts=new Map();
  let total=0;
  (rows||[]).forEach(row=>destinationAnswers(row).forEach(label=>{
    counts.set(label,(counts.get(label)||0)+1);
    total++;
  }));
  return [...counts.entries()]
    .sort((a,b)=>b[1]-a[1])
    .map(([label,count])=>({label,count,total,value:total?count/total:0}));
}

function renderSegments(){
  const questions=[
    {key:"QS5",label:"Main purpose of trip",fields:["tripPurpose"]},
    {key:"Q3",label:"Destinations considered",fields:["Q3"]},
    {key:"Q9",label:"Destination decision considerations",fields:["decisionFactors","Q9"]},
    {key:"Q7",label:"Information sources / channels",fields:["infoChannels","Q7"]},
    {key:"Q5",label:"Travel companions",fields:["travelCompanions","Q5"]},
    {key:"Q8",label:"Booking channel",fields:["bookingChannels","Q8"]},
    {key:"Q8b",label:"Package vs. independent booking",fields:["Q8b"]},
    {key:"Q12",label:"Experiences sought",fields:["experiences","Q12"]},
    {key:"Q14",label:"Preferred airline choice",fields:["airlineCarrier","Q14"]},
    {key:"Q16",label:"Airline considerations",fields:["airlineConsiderations","Q16"]},
    {key:"Q21",label:"Preferred accommodation brand",fields:["hotelBrand","Q21"]},
    {key:"Q22",label:"Accommodation considerations",fields:["hotelConsiderations","Q22"]}
  ];
  const buttons=[...document.querySelectorAll(".segments-view-tab")];
  buttons.forEach(button=>{
    if(!button.dataset.ready){
      button.dataset.ready="1";
      button.addEventListener("click",()=>{
        activeSegmentView=button.dataset.segmentView;
        renderSegments();
      });
    }
    const selected=button.dataset.segmentView===activeSegmentView;
    button.classList.toggle("active",selected);
    button.setAttribute("aria-selected",String(selected));
  });

  const ageView=document.getElementById("segmentAgeView");
  const budgetView=document.getElementById("segmentBudgetView");
  if(ageView)ageView.hidden=activeSegmentView!=="age";
  if(budgetView)budgetView.hidden=activeSegmentView!=="budget";
  if(!DATA?.recordsReady){
    ["segmentAgeQuestions","segmentAgeSpend","segmentBudgetQuestions","segmentBudgetSpend"].forEach(id=>{
      const el=document.getElementById(id);
      if(el)el.innerHTML='<div class="empty-chart">Loading segment data…</div>';
    });
    return;
  }

  const config=activeSegmentView==="budget"
    ?{dimension:"Segment_Budget",questionId:"segmentBudgetQuestions",cohortHeaderId:"segmentBudgetCohorts",spendId:"segmentBudgetSpend",title:"Budget",photos:[
      "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=900&q=80"
    ]}
    :{dimension:"Segment_Age",questionId:"segmentAgeQuestions",cohortHeaderId:"segmentAgeCohorts",spendId:"segmentAgeSpend",title:"Age",photos:[
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80"
    ]};
  const rows=activeRows();
  const cohorts=segmentOptions(config.dimension);
  const questionStack=document.getElementById(config.questionId);
  const cohortHeader=document.getElementById(config.cohortHeaderId);
  const spendGrid=document.getElementById(config.spendId);
  if(!questionStack||!cohortHeader||!spendGrid)return;
  cohortHeader.innerHTML=cohorts.map((label,index)=>{
    const cohortRows=rows.filter(row=>clean(row[config.dimension])===label);
    const image=config.photos[index%config.photos.length];
    return `
      <article class="segment-profile-card segment-profile-card--photo">
        <div class="segment-card-photo">
          <img data-fallback="${image}" alt="Travelers" decoding="async">
          <div class="segment-photo-caption">
            <span>SEGMENT</span>
            <h3>${escapeHtml(label)}</h3>
            <strong>${cohortRows.length.toLocaleString()} respondents</strong>
          </div>
        </div>
      </article>
    `;
  }).join("");
  const answersForRow=(row,question)=>{
    if(question.key==="Q3")return destinationAnswers(row);
    if(question.key==="Q5"){
      const companion=clean(row.travelCompanions||row.Q5);
      return companion?[companion]:[];
    }
    for(const field of question.fields){
      const raw=row[field];
      const answers=(Array.isArray(raw)?raw:[raw]).map(clean).filter(Boolean);
      if(answers.length)return [...new Set(answers)];
    }
    return [];
  };
  const spendCharts=[];
  const segmentChartJobs=[];

  questionStack.innerHTML=questions.map(question=>{
    const cards=cohorts.map((label,index)=>{
      const cohortRows=rows.filter(row=>clean(row[config.dimension])===label);
      const answeredRows=cohortRows.map(row=>answersForRow(row,question)).filter(answers=>answers.length);
      const questionBase=answeredRows.length!==cohortRows.length
        ?`<p class="segment-question-respondents">${answeredRows.length.toLocaleString()} respondents answered</p>`
        :"";
      let rankedResponses;
      if(question.key==="Q3"){
        rankedResponses=destinationResponseDistribution(cohortRows)
          .map(item=>({answer:item.label,count:item.count,value:item.value}));
      }else{
        const counts=new Map();
        answeredRows.forEach(answers=>answers.forEach(value=>{
          const answer=/^others?\s*\(please+\s+specify\)$/i.test(value.trim())?"Others":value;
          counts.set(answer,(counts.get(answer)||0)+1);
        }));
        rankedResponses=[...counts.entries()]
          .map(([answer,count])=>({answer,count,value:answeredRows.length?count/answeredRows.length:0}))
          .sort((a,b)=>b.count-a.count||a.answer.localeCompare(b.answer));
      }
      const responses=question.key==="Q5"||question.key==="Q21"?rankedResponses:rankedResponses.slice(0,7);
      const othersResponse=rankedResponses.find(item=>item.answer==="Others");
      if(othersResponse&&!responses.includes(othersResponse))responses[responses.length-1]=othersResponse;
      const chartId=`segment-question-chart-${activeSegmentView}-${question.key}-${index}`;
      if(question.key==="Q3"||question.key==="Q5"){
        segmentChartJobs.push({
          chartId,
          type:question.key,
          data:responses.map(item=>({label:item.answer,count:item.count,value:item.value}))
        });
      }
      const responseRows=responses.map(item=>`
        <div class="segment-factor-row" data-label="${escapeHtml(item.answer)}" data-count="${item.count}" data-base="${answeredRows.length}">
          <span class="segment-factor-label" title="${escapeHtml(item.answer)}">${escapeHtml(item.answer)}</span>
          <span class="segment-factor-track"><span style="width:${Math.min(100,item.value*100)}%"></span></span>
          <span class="segment-factor-value">${fmt(item.value)}</span>
        </div>
      `).join("");
      return `
        <article class="segment-profile-card segment-profile-card--bars">
          <div class="segment-profile-body">
            ${questionBase}
            ${question.key==="Q3"||question.key==="Q5"
              ?`<div id="${chartId}" class="chart segment-question-chart"></div>`
              :`<div class="segment-factor-list">${responseRows||'<div class="empty-chart">No answers for this question.</div>'}</div>`}
          </div>
        </article>
      `;
    }).join("");
    return `
      <section class="segment-question-section" aria-label="${question.key} ${escapeHtml(question.label)}">
        <header class="segment-question-heading">
          <h3>${escapeHtml(question.label)}</h3>
        </header>
        <div class="segment-cohort-grid">${cards}</div>
      </section>
    `;
  }).join("");

  segmentChartJobs.forEach(chart=>{
    if(chart.type==="Q3"){
      horizontalBars(`#${chart.chartId}`,chart.data,{
        height:Math.max(260,chart.data.length*28+58),
        max:Math.min(1,(chart.data[0]?.value||0.5)*1.25),
        labelWidth:135,
        maxLabelChars:22
      });
    }else{
      donut(`#${chart.chartId}`,chart.data,"Trip companion",[]);
    }
  });

  spendGrid.innerHTML=cohorts.map((label,index)=>{
    const cohortRows=rows.filter(row=>clean(row[config.dimension])===label);
    let decrease=0,same=0,increase=0;
    cohortRows.forEach(row=>{
      const answer=clean(row.Q10||row.spendChange).toLowerCase();
      if(answer.includes("decrease"))decrease++;
      else if(answer.includes("increase"))increase++;
      else if(answer.includes("same"))same++;
    });
    const answered=decrease+same+increase||1;
    const chartId=`segmentSpendChart-${activeSegmentView}-${index}`;
    spendCharts.push({chartId,data:[
      {label:"Will decrease",value:decrease/answered,color:"#ff5635"},
      {label:"Will remain the same",value:same/answered,color:"#530095"},
      {label:"Will increase",value:increase/answered,color:"#00b5ac"}
    ]});
    return `
      <article class="segment-spend-card">
        <div id="${chartId}" class="chart segment-spend-chart"></div>
      </article>
    `;
  }).join("");

  spendCharts.forEach(chart=>donut(`#${chart.chartId}`,chart.data,"Budget change",[]));
}

function renderBehaviourDemographicCharts(){
  const rows=activeRows();
  if(!rows.length) {
    ["maritalChart","childrenChart","companionChart2"].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.innerHTML='<div class="empty-chart">'+(DATA&&DATA.recordsReady?'No records match the current filters.':'Loading respondent detail…')+'</div>';
    });
    return;
  }

  const maritalData = (() => {
    const counts = {};
    const n2 = rows.length || 1;
    rows.forEach(r => {
      const v = clean(r["Marital Status"] || "");
      if(v) counts[v] = (counts[v] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a,b)=>b[1]-a[1])
        .map(([label,c])=>({label,count:c,value:c/n2}));
  })();
      behaviourDemographicPie3D("#maritalChart", maritalData, {height:360,category:"marital status"});

  const childrenData = (() => {
    const counts = {};
    const n2 = rows.length || 1;
    rows.forEach(r => {
      const v = clean(r["Children"] || "");
      if(v) counts[v] = (counts[v] || 0) + 1;
    });
    const answered=Object.values(counts).reduce((sum,count)=>sum+count,0)||1;
    return Object.entries(counts)
      .sort((a,b)=>b[1]-a[1])
      .map(([label,c])=>({label,count:c,value:c/answered}));
  })();
  behaviourDemographicPie3D("#childrenChart", childrenData, {height:360,category:"children in household"});

  const companionCounts=new Map();
  rows.forEach(row=>{
    const companion=clean(row.travelCompanions||row.Q5);
    if(companion)companionCounts.set(companion,(companionCounts.get(companion)||0)+1);
  });
  const companionTotal=[...companionCounts.values()].reduce((sum,count)=>sum+count,0)||1;
  const companionData=[...companionCounts.entries()]
    .sort((a,b)=>b[1]-a[1])
    .map(([label,count])=>({label,count,value:count/companionTotal}));
  behaviourDemographicPie3D("#companionChart2",companionData,{height:360,category:"trip companion"});
}

function renderJourneyStageCharts(stageKey) {
  showJourneyStagePanel(stageKey);
  const fmt2=d3.format(".0%");
  const stageValue=row=>clean(row.planningStage||row.Q2||"").toLowerCase();
  const isInspire=row=>stageValue(row).includes("yet to start");
  const isPlan=row=>stageValue(row).includes("research")||stageValue(row).includes("planning my itinerary");
  const isBook=row=>stageValue(row).includes("arrangement")||stageValue(row).includes("booked");

  if(stageKey==="Inspire") {
    /* KPIs */
    let topDest=null;
    const topCh=topN(q("infoChannels"),1)[0];
    const topExp=topN(q("experiences"),1)[0];
    const rows=activeRows(), n=rows.length||1;
    const inspirePct=fmt(rows.filter(isInspire).length/n);
    const insightText = `${topCh ? topCh.label : '—'} leads discovery; ${topExp ? topExp.label : '—'} tops aspirations.`;
    d3.select("#skpiInsight").text(insightText);
    d3.select("#skpiLabel2").text("Destinations considered");
    d3.select("#skpiVal2, #skpiDestCount").text(topDest?topDest.label:"—");
    d3.select("#skpiLabel3").text("Top info channel");
    d3.select("#skpiVal3, #skpiTopChannel").text(topCh?topCh.label:"—");
    d3.select("#skpiLabel4").text("Top experience sought");
    d3.select("#skpiVal4, #skpiTopExp").text(topExp?topExp.label:"—");
    d3.select("#skpiLabel5").text("Inspire stage");
    d3.select("#skpiVal5, #skpiInspirePct").text(inspirePct||"—");
    /* Charts */
    // 1. QS5 Main Purpose of Trip (Vertical Column Bar Chart)
    const purposeData = q("tripPurpose").filter(d=>d.value>0.001).map(d => {
      let displayLabel = d.label;
      if (/holiday|vacation/i.test(displayLabel)) displayLabel = "Holiday or Vacation";
      else if (/business meeting/i.test(displayLabel)) displayLabel = "Business Meetings";
      else if (/friends and family/i.test(displayLabel)) displayLabel = "Meeting Friends & Family";
      else if (/conference|exhibition/i.test(displayLabel)) displayLabel = "Attend Conference/Exhibition";
      else if (/incentive/i.test(displayLabel)) displayLabel = "Incentive Trip";
      else if (/bleisure/i.test(displayLabel)) displayLabel = "Bleisure";
      return { ...d, displayLabel, filterLabel: d.label };
    });
    verticalBars("#purposeChart", purposeData, { height: 280, bottom: 72, clickable: true });

    // 2. Q3 Key Destinations Considered
    // Count Q3_1/Q3_2/Q3_3 as the combined destination-response dataset.
    if(!rows.length){
      d3.select("#inspireDestChart").html('<div class="empty-chart">Loading destination responses…</div>');
    }
    const destData=destinationResponseDistribution(rows);
    topDest=destData[0]||null;
    d3.select("#skpiVal2, #skpiDestCount").text(topDest?topDest.label:"—");
    const oneDecimalPct = d => `${((+d || 0) * 100).toFixed(1)}%`;
    if(rows.length){
      horizontalBars("#inspireDestChart", destData, {
        height: Math.max(280, destData.length * 28 + 58),
        max: Math.min(1, (destData[0]?.value || 0.5) * 1.25),
        valueFormat: oneDecimalPct,
        axisFormat: oneDecimalPct,
        labelWidth: 190,
        maxLabelChars: 32
      });
    }

    // 3. Q12 Key Experiences Sought (Horizontal Bar Chart)
    const expData = q("experiences").filter(d=>d.value>0.001).slice(0, 7)
      .map(d=>({ ...d, displayLabel: shortExperienceLabel(d.label), filterLabel: d.label }));
    horizontalBars("#experienceChart", expData, { height: 270, max: Math.min(1, (expData[0]?.value || 0.5) * 1.25), labelWidth: 230, maxLabelChars: 34, labelFontSize: 12 });

    // 4. Q7 Discovery Channels
    horizontalBars("#infoChart", channelDisplayRows(q("infoChannels").slice(0, 7)), { height: 260, max: 0.75 });
  }

  if(stageKey==="Plan") {
    const rows = activeRows(), n = rows.length || 1;

    // 1. Q6 Top Booking Window
    const q6Map = {};
    rows.forEach(r => { if(r.Q6) q6Map[r.Q6] = (q6Map[r.Q6]||0)+1; });
    const topQ6Entry = Object.entries(q6Map).sort((a,b)=>b[1]-a[1])[0];
    const topQ6 = topQ6Entry ? topQ6Entry[0].replace(/ before the trip/i, '').replace(/â€“|–/g, '-').replace(' months', ' mon').replace(' month', ' mon') : "1-3 mon";
    d3.select("#skpiBookingWindow").text(topQ6);

    // 2. Q6a Top Travel Period
    const q6aMap = {};
    rows.forEach(r => { if(r.Q6a) q6aMap[r.Q6a] = (q6aMap[r.Q6a]||0)+1; });
    const topQ6aEntry = Object.entries(q6aMap).sort((a,b)=>b[1]-a[1])[0];
    const topQ6a = topQ6aEntry ? topQ6aEntry[0].replace(/ from now/i, '').replace(/â€“|–/g, '-').replace(' months', ' mon').replace(' month', ' mon') : "1-3 mon";
    d3.select("#skpiTravelPeriod").text(topQ6a);

    // 3. Q4 Avg Trip Duration
    const nightsWeights = { '1-2 nights': 1.5, '3-4 nights': 3.5, '5-6 nights': 5.5, '7-8 nights': 7.5, '9-10 nights': 9.5, '10+ nights': 12 };
    let totalNights = 0, countNights = 0;
    rows.forEach(r => {
      const q4 = String(r.Q4 || '').replace(/â€“/g, '-');
      if (nightsWeights[q4]) {
        totalNights += nightsWeights[q4];
        countNights++;
      }
    });
    const avgNights = (totalNights / Math.max(1, countNights)).toFixed(1);
    d3.select("#skpiAvgDuration").text(`${avgNights} nts`);

    // 4. Q5 Solo Travel
    const soloCount = rows.filter(r => String(r.Q5 || '').toLowerCase().includes('alone')).length;
    const soloPct = Math.round((soloCount / n) * 100);
    d3.select("#skpiSoloTravel").text(`${soloPct}%`);

    // Top Persistent Strip Update for Plan:
    d3.select("#skpiInsight").text(`${topQ6} booking lead time; avg duration ${avgNights} nights.`);
    d3.select("#skpiLabel2").text("Booking window");
    d3.select("#skpiVal2, #skpiBookingWindow").text(topQ6);
    d3.select("#skpiLabel3").text("Travel period");
    d3.select("#skpiVal3, #skpiTravelPeriod").text(topQ6a);
    d3.select("#skpiLabel4").text("Avg trip duration");
    d3.select("#skpiVal4, #skpiAvgDuration").text(`${avgNights} nts`);
    d3.select("#skpiLabel5").text("Solo travel %");
    d3.select("#skpiVal5, #skpiSoloTravel").text(`${soloPct}%`);

    /* Charts */
    const tripDurationRows = rows
      .map(row => ({ Trip_Duration: clean(row.Q4) || clean(row.Q4a) }))
      .filter(row => row.Trip_Duration);
    const tripDurationOrder=new Map(["1-2 nights","3-4 nights","5-6 nights","7-8 nights","9-10 nights","10+ nights"].map((label,index)=>[label,index]));
    const tripDurationData = countField(tripDurationRows, "Trip_Duration")
      .map(item => ({
        ...item,
        label:item.label.replace(/â€“|–/g,"-"),
        displayLabel:item.label.replace(/â€“|–/g,"-").replace(/(\d)-(\d)/g,"$1–$2")
      }))
      .sort((a,b)=>(tripDurationOrder.get(a.label)??Infinity)-(tripDurationOrder.get(b.label)??Infinity));
    behaviourDemographicPie3D("#planTripDurationPie",tripDurationData,{height:360,category:"trip duration"});

    const planTimingDisplayLabel = label => clean(label)
      .replace(/â€“|–/g, "-")
      .replace(/\s+before the trip$/i, "")
      .replace(/\s+from now$/i, "")
      .replace(/\bmonths?\b/gi, "mo")
      .replace(/^Less than 1 mo$/i, "<1 mo")
      .replace(/^1 year or more$/i, "1+ year")
      .replace(/^Canâ€™t say$/i, "Can't say");
    const bookingLeadTimeData = countField(rows, "Q6")
      .map(item => ({
        ...item,
        displayLabel:planTimingDisplayLabel(item.label).replace(/(\d)-(\d)/g,"$1–$2")
      }));
    const bookingLeadTimeOrder=new Map(["<1 mo","1–3 mo","3–6 mo","6–9 mo","9–12 mo","1+ year"].map((label,index)=>[label,index]));
    bookingLeadTimeData.sort((a,b)=>(bookingLeadTimeOrder.get(a.displayLabel)??Infinity)-(bookingLeadTimeOrder.get(b.displayLabel)??Infinity));
    const travelPeriodData = countField(rows, "Q6a")
      .map(item => ({ ...item, displayLabel: planTimingDisplayLabel(item.label) }));
    behaviourDemographicPie3D("#planBookingLeadTimePie",bookingLeadTimeData,{height:360,category:"booking lead time"});
    behaviourDemographicPie3D("#planTravelPeriodPie",travelPeriodData,{height:360,category:"planned travel period"});

    // A. Key Channels of Collecting Information (Q7)
    horizontalBars("#planInfoChart", channelDisplayRows(q("infoChannels").slice(0, 7)), { height: 260, max: 0.75 });

    // B. Key Trip Considerations (Q9)
    horizontalBars("#planDecisionChart", q("decisionFactors").slice(0, 7), { height: 260, max: 0.85, maxLabelChars: 34 });

    // C. Budget Change Donut (Q10) & Interactive Reasons (Q11 / Q11a)
    let decCnt = 0, sameCnt = 0, incCnt = 0;
    rows.forEach(r => {
      const v = String(r.Q10 || '').toLowerCase();
      if (v.includes('decrease')) decCnt++;
      else if (v.includes('increase')) incCnt++;
      else if (v.includes('same')) sameCnt++;
    });
    const totalQ10 = decCnt + sameCnt + incCnt || 1;
    const budgetDonutData = [
      { label: 'Will decrease (slightly/moderately/significantly)', value: decCnt / totalQ10, count: decCnt, key: 'dec', color: '#d9384a' },
      { label: 'Will remain the same', value: sameCnt / totalQ10, count: sameCnt, key: 'same', color: '#EEFF3B' },
      { label: 'Will increase (slightly/moderately/significantly)', value: incCnt / totalQ10, count: incCnt, key: 'inc', color: '#3db87e' }
    ];

    const budgetDonutChart = donut("#planBudgetDonut", budgetDonutData, "Budget change", [], {
      colors: budgetDonutData.map(item => item.color),
      onSliceClick: item => showBudgetReasons(item.key)
    });
    const budgetReasonData = key => {
      const items=DATA.questions?.[key]?.items||[];
      const answeredRows=rows.filter(row=>Array.isArray(row[key])&&row[key].some(value=>clean(value)));
      const answerBase=answeredRows.length;
      return items.map(item=>{
        const label=clean(item.label);
        const yesCount=answeredRows.filter(row=>row[key].some(value=>clean(value)===label)).length;
        return {label,count:yesCount,total:answerBase,value:answerBase?yesCount/answerBase:0};
      }).filter(item=>item.label);
    };

    const segmentBudgetRows=rowsIgnoringChartFilters(["Segment_Budget","BudgetChangeMode"]);
    const segmentBudgetData=countField(segmentBudgetRows,"Segment_Budget");
    behaviourDemographicPie3D("#planSegmentBudgetPie",segmentBudgetData,{
      selected:chartFilters.Segment_Budget||"",
      category:"budget segment",
      onClick:item=>{
        runDashboardUpdate(()=>{
          if(chartFilters.Segment_Budget===item.label) delete chartFilters.Segment_Budget;
          else chartFilters.Segment_Budget=item.label;
          if(typeof invalidateRowCache==="function") invalidateRowCache();
          updateSegmentBase();
          renderActive();
        },"Updating budget segment...");
      }
    });

    function showBudgetReasons(mode) {
      planBudgetReasonMode=mode;
      budgetDonutChart.highlight(mode);
      const btnDec = document.getElementById("btnBudgetReasonDec");
      const btnInc = document.getElementById("btnBudgetReasonInc");
      if (mode === "dec") {
        if (btnDec) { btnDec.style.background = "#d9384a"; btnDec.style.color = "#fff"; }
        if (btnInc) { btnInc.style.background = "transparent"; btnInc.style.color = "#3db87e"; }
        horizontalBars("#planBudgetReasonsChart", budgetReasonData("Q11").sort((a,b)=>b.value-a.value), { height: 320, max: 0.7, labelWidth: 255, maxLabelChars: 34, wrapYAxisLabels: true });
      } else if (mode === "inc") {
        if (btnDec) { btnDec.style.background = "transparent"; btnDec.style.color = "#d9384a"; }
        if (btnInc) { btnInc.style.background = "#3db87e"; btnInc.style.color = "#fff"; }
        horizontalBars("#planBudgetReasonsChart", budgetReasonData("Q11a").sort((a,b)=>b.value-a.value), { height: 320, max: 0.7, labelWidth: 255, maxLabelChars: 34, wrapYAxisLabels: true });
      } else {
        if (btnDec) { btnDec.style.background = "transparent"; btnDec.style.color = "#d9384a"; }
        if (btnInc) { btnInc.style.background = "transparent"; btnInc.style.color = "#3db87e"; }
        const el=document.getElementById("planBudgetReasonsChart");
        if(el) el.innerHTML='<div class="empty-chart">No increase/decrease reason is available for “Will remain the same”.</div>';
      }
    }

    const btnDec = document.getElementById("btnBudgetReasonDec");
    const btnInc = document.getElementById("btnBudgetReasonInc");
    if (btnDec) btnDec.onclick = () => showBudgetReasons("dec");
    if (btnInc) btnInc.onclick = () => showBudgetReasons("inc");

    // Initial show based on larger share
    showBudgetReasons(planBudgetReasonMode || chartFilters.BudgetChangeMode || (incCnt >= decCnt ? "inc" : "dec"));
  }

  if(stageKey==="Book") {
    const topBookCh=topN(q("bookingChannels"),1)[0];
    const packageData=q("packageType");
    const packageRows=packageData.length?packageData:q("Q8b");
    const topPkg=topN(packageRows,1)[0];
    const spendInc=spendIncreaseCurrent();
    const rows=activeRows(), n=rows.length||1;
    const bookPct=fmt(rows.filter(isBook).length/n);
    d3.select("#skpiBookPct").text(bookPct||"—");
    d3.select("#skpiSpendInc").text(fmt(spendInc));
    d3.select("#skpiTopBookCh").text(topBookCh?topBookCh.label:"—");
    d3.select("#skpiPkgType").text(topPkg?topPkg.label:"—");

    // Top Persistent Strip Update for Book:
    d3.select("#skpiInsight").text(`${topBookCh ? topBookCh.label : '—'} leads booking; ${topPkg ? topPkg.label : '—'} top package type.`);
    d3.select("#skpiLabel2").text("Booking channel");
    d3.select("#skpiVal2, #skpiTopBookCh").text(topBookCh?topBookCh.label:"—");
    d3.select("#skpiLabel3").text("Package type");
    d3.select("#skpiVal3, #skpiPkgType").text(topPkg?topPkg.label:"—");
    d3.select("#skpiLabel4").text("Spend increase %");
    d3.select("#skpiVal4, #skpiSpendInc").text(fmt(spendInc));
    d3.select("#skpiLabel5").text("Book stage %");
    d3.select("#skpiVal5, #skpiBookPct").text(bookPct||"—");

    /* --- Q3a: Finalized Destinations horizontal bar chart --- */
    (function renderFinalizedDest(){
      const el=document.getElementById("finalizedDestChart"); if(!el)return;
      const rows=activeRows();
      const counts=new Map();
      const normDest=v=>{
        if(!v)return "";
        const s=String(v).trim();
        const map={
          "США":"USA","USA":"USA","United States":"USA","United States of America":"USA",
          "ОАЭ":"UAE","UAE":"UAE","United Arab Emirates":"UAE",
          "Китай":"China","China":"China","中国":"China",
          "Египет":"Egypt","Egypt":"Egypt","مصر":"Egypt",
          "Саудовская Аравия":"Saudi Arabia","Saudi Arabia":"Saudi Arabia",
          "Индия":"India","India":"India",
          "Япония":"Japan","Japan":"Japan","日本":"Japan",
          "Франция":"France","France":"France",
          "Великобритания":"UK","UK":"UK","United Kingdom":"UK","Britain":"UK",
          "Австралия":"Australia","Australia":"Australia",
          "Германия":"Germany","Germany":"Germany",
          "Италия":"Italy","Italy":"Italy",
          "Испания":"Spain","Spain":"Spain",
          "Таиланд":"Thailand","Thailand":"Thailand",
          "Сингапур":"Singapore","Singapore":"Singapore",
          "Малайзия":"Malaysia","Malaysia":"Malaysia",
          "Индонезия":"Indonesia","Indonesia":"Indonesia",
          "Канада":"Canada","Canada":"Canada",
          "Мексика":"Mexico","Mexico":"Mexico",
          "Бразилия":"Brazil","Brazil":"Brazil",
          "Нидерланды":"Netherlands","Netherlands":"Netherlands",
          "Швейцария":"Switzerland","Switzerland":"Switzerland",
          "Турция":"Turkey","Turkey":"Turkey",
          "Греция":"Greece","Greece":"Greece",
          "Португалия":"Portugal","Portugal":"Portugal",
          "Марокко":"Morocco","Morocco":"Morocco",
          "Мальдивы":"Maldives","Maldives":"Maldives",
          "Новая Зеландия":"New Zealand","New Zealand":"New Zealand",
          "Южная Корея":"South Korea","South Korea":"South Korea","Korea":"South Korea",
          "Гонконг":"Hong Kong","Hong Kong":"Hong Kong",
          "Вьетнам":"Vietnam","Vietnam":"Vietnam",
          "Филиппины":"Philippines","Philippines":"Philippines",
          "Перу":"Peru","Peru":"Peru",
          "Аргентина":"Argentina","Argentina":"Argentina",
          "Иордания":"Jordan","Jordan":"Jordan",
          "Оман":"Oman","Oman":"Oman",
          "Катар":"Qatar","Qatar":"Qatar",
          "Кения":"Kenya","Kenya":"Kenya",
          "Южная Африка":"South Africa","South Africa":"South Africa",
          "Нигерия":"Nigeria","Nigeria":"Nigeria",
          "Танзания":"Tanzania","Tanzania":"Tanzania"
        };
        return map[s]||normalizeDest(s);
      };
      rows.forEach(r=>{
        const raw=r["Q3a"]||r["finalizedDest"]||r["q3a"]||"";
        const vals=Array.isArray(raw)?raw:[raw];
        vals.forEach(v=>{const label=normDest(clean(v));if(label)counts.set(label,(counts.get(label)||0)+1);});
      });
      if(!counts.size){
        d3.select("#finalizedDestChart").html('<div class="empty-chart">No finalized destination data available for this selection.</div>');
        return;
      }
      const answeringBase=rows.filter(r=>clean(r["Q3a"]||r["finalizedDest"]||r["q3a"])).length;
      const sorted=[...counts.entries()].map(([label,count])=>({label,value:answeringBase?count/answeringBase:0})).sort((a,b)=>b.value-a.value);
      horizontalBars("#finalizedDestChart",sorted,{height:Math.max(280,sorted.length*32+60),max:0});
    })();

    /* --- Q8a: Booking Sequence Chevron --- */
    (function renderBookingChevron(){
      const wrap=document.getElementById("bookingSeqChevron"); if(!wrap)return;
      wrap.innerHTML="";
      const rows=activeRows();
      const ITEMS=["Flights","Hotel / accommodation","Activities & tours","Local transport","Travel insurance","Car rental / other"];
      const SHORT=["Flights","Accommodation","Activities","Transport","Insurance","Car Rental"];
      const icons=["✈️","🏨","🎭","🚌","🛡️","🚗"];
      // Calculate average rank for each item (rank 1 = first booked)
      const rankSums=new Array(ITEMS.length).fill(0);
      const rankCounts=new Array(ITEMS.length).fill(0);
      rows.forEach(r=>{
        const arr=r["Q8a"]||r["q8a"];
        if(!Array.isArray(arr))return;
        arr.forEach((v,i)=>{
          const rank=Number(v);
          if(Number.isFinite(rank)&&rank>0&&i<ITEMS.length){rankSums[i]+=rank;rankCounts[i]++;}
        });
      });
      const avgRanks=rankSums.map((s,i)=>rankCounts[i]?s/rankCounts[i]:i+1);
      // Sort items by average rank ascending (lowest avg rank = booked first)
      const order=[...ITEMS.keys()].sort((a,b)=>avgRanks[a]-avgRanks[b]);

      const colors=["#530095","#230B54","#00B5AC","#FF5635","#9A1B15","#3F3F3F"];
      const flow=document.createElement("div");
      flow.className="booking-sequence-cards";
      order.forEach((origIdx,rank)=>{
        const rankNum=rank+1;
        const color=colors[rank]||"#999";
        const card=document.createElement("article");
        card.className="booking-sequence-card";
        card.style.setProperty("--seq-color",color);
        card.innerHTML=`
          <div class="booking-sequence-rank">${rankNum}</div>
          <div class="booking-sequence-icon">${icons[origIdx]}</div>
          <div class="booking-sequence-copy">
            <strong>${SHORT[origIdx]}</strong>
            <span>Average rank ${avgRanks[origIdx].toFixed(1)}</span>
          </div>
        `;
        flow.appendChild(card);
      });
      wrap.appendChild(flow);
    })();

    /* --- Q8: Booking Channels – vertical column bar chart --- */
    (function renderBookingChannelsBars(){
      const el=document.getElementById("bookingChannelsBarChart"); if(!el)return;
      const data=q("bookingChannels");
      if(!data.length){d3.select("#bookingChannelsBarChart").html('<div class="empty-chart">No booking channel data available.</div>');return;}
      const sorted=[...data]
        .filter(d=>Number.isFinite(+d.value)&&d.value>0)
        .map(d=>({...d,displayLabel:displayLabelText(d.label)}))
        .sort((a,b)=>b.value-a.value);
      const w=Math.max(300,el.clientWidth||460);
      const h=300;
      const m={t:30,r:16,b:72,l:40};
      const iw=w-m.l-m.r, ih=h-m.t-m.b;
      const colColors=["#530095","#230B54","#FF5635","#00B5AC","#EEFF3B","#9A1B15"];
      d3.select("#bookingChannelsBarChart").selectAll("*").remove();
      const svg=d3.select("#bookingChannelsBarChart").append("svg").attr("width",w).attr("height",h).attr("viewBox",`0 0 ${w} ${h}`);
      const g=svg.append("g").attr("transform",`translate(${m.l},${m.t})`);
      const x=d3.scaleBand().domain(sorted.map(d=>d.displayLabel)).range([0,iw]).padding(0.28);
      const maxVal=Math.max(0.001,d3.max(sorted,d=>+d.value)||0);
      const y=d3.scaleLinear().domain([0,maxVal*1.2]).range([ih,0]);
      // Grid lines
      g.append("g").attr("class","gridline").call(d3.axisLeft(y).ticks(4).tickSize(-iw).tickFormat("")).selectAll("line").attr("stroke","#eee8f5");
      g.select(".gridline .domain").remove();
      // Bars
      g.selectAll("rect.col-bar").data(sorted).join("rect")
        .attr("class","col-bar").attr("x",d=>x(d.displayLabel)).attr("y",d=>y(+d.value))
        .attr("width",x.bandwidth()).attr("height",d=>ih-y(+d.value))
        .attr("fill",(d,i)=>colColors[i%colColors.length]).attr("rx",4)
        .on("mousemove",(e,d)=>showTip(e,d)).on("mouseleave",hideTip);
      // Value labels on top
      g.selectAll("text.col-val").data(sorted).join("text")
        .attr("class","col-val").attr("x",d=>x(d.displayLabel)+x.bandwidth()/2).attr("y",d=>y(+d.value)-6)
        .attr("text-anchor","middle").attr("font-size",10.5).attr("font-weight",800).attr("fill",(d,i)=>colColors[i%colColors.length])
        .text(d=>fmt(d.value));
      // X axis with wrapped labels
      const xAxis=g.append("g").attr("class","axis").attr("transform",`translate(0,${ih})`).call(d3.axisBottom(x).tickSize(0));
      xAxis.classed("x-axis-hidden", false);
      xAxis.selectAll("text").style("display",null);
      xAxis.select(".domain").attr("stroke","#ccc");
      xAxis.selectAll("text").attr("dy","1.2em").attr("font-size",9.5)
        .each(function(d){
          const el2=d3.select(this); el2.text("");
          const words=d.split(/\s+/); let line=[];
          const lineH=1.1, y2=parseFloat(el2.attr("dy")||1.2);
          let tspan=el2.append("tspan").attr("x",0).attr("dy",y2+"em");
          words.forEach(w=>{
            line.push(w);
            tspan.text(line.join(" "));
            if(tspan.node().getComputedTextLength()>x.bandwidth()+14){
              line.pop(); tspan.text(line.join(" "));
              line=[w]; tspan=el2.append("tspan").attr("x",0).attr("dy",lineH+"em").text(w);
            }
          });
        });
      // Y axis
      g.append("g").attr("class","axis").call(d3.axisLeft(y).ticks(4).tickFormat(fmt));
    })();

    /* --- Q8b: Package Type donut --- */
    const pkgRows=packageRows.filter(d=>d.value>0.001);
    donut("#packageTypeDonut",pkgRows,"Package",[]);
  }

  if(stageKey==="On-Trip") {
    const aiAdopt=byLabel("aiLikelihood","Top 2 Box");
    const activityData=q("destActivities");
    const activityRows=activityData.length?activityData:q("Q9a");
    const nightsData=q("tripNights");
    const nightsRows=nightsData.length?nightsData:q("Q4");
    const topActivity=topN(activityRows,1)[0];
    const topNights=topN(nightsRows,1)[0];
    const topAiTask=topN(q("aiTasks"),1)[0];
    d3.select("#skpiAiAdopt").text(fmt(aiAdopt));
    d3.select("#skpiTopActivity").text(topActivity?topActivity.label:"—");
    d3.select("#skpiAvgNights").text(topNights?topNights.label:"—");
    d3.select("#skpiTopAiTask").text(topAiTask?topAiTask.label:"—");

    // Top Persistent Strip Update for On-Trip:
    d3.select("#skpiInsight").text(`${fmt(aiAdopt)} AI adoption likelihood; top activity is ${topActivity ? topActivity.label : '—'}.`);
    d3.select("#skpiLabel2").text("AI likelihood");
    d3.select("#skpiVal2, #skpiAiAdopt").text(fmt(aiAdopt));
    d3.select("#skpiLabel3").text("Top activity");
    d3.select("#skpiVal3, #skpiTopActivity").text(topActivity?topActivity.label:"—");
    d3.select("#skpiLabel4").text("Trip duration");
    d3.select("#skpiVal4, #skpiAvgNights").text(topNights?topNights.label:"—");
    d3.select("#skpiLabel5").text("Top AI task");
    d3.select("#skpiVal5, #skpiTopAiTask").text(topAiTask?topAiTask.label:"—");

    /* Q9a: On-Site Bookings — horizontal bars (purple/orange palette) */
    horizontalBars("#destExpChart",activityRows.length?activityRows:q("experiences"),{height:Math.max(280,(activityRows.length||7)*34+60)});

    /* Q9b: AI Likelihood — big % box + legend list */
    (function renderQ9bPanel(){
      const pctNumEl=document.getElementById("q9bPctNum");
      if(pctNumEl) pctNumEl.textContent=fmt(aiAdopt);

      const legendEl=document.getElementById("q9bLegend");
      if(!legendEl) return;
      legendEl.innerHTML="";
      // Get all likelihood breakdown options
      const likelihoodItems=[
        {label:"Extremely likely",    color:"#230B54"},
        {label:"Somewhat likely",     color:"#530095"},
        {label:"Neither likely nor unlikely", color:"#3F3F3F"},
        {label:"Somewhat unlikely",   color:"#ccc5e0"},
        {label:"Extremely unlikely",  color:"#e0daea"}
      ];
      const rows=activeRows(), n=rows.length||1;
      likelihoodItems.forEach(item=>{
        const count=rows.filter(r=>clean(r["aiLikelihood"])===item.label).length;
        const pct=count/n;
        if(pct<0.001) return; // skip zero rows
        const row=document.createElement("div");
        row.className="q9b-legend-row";
        row.innerHTML=`
          <span class="q9b-legend-swatch" style="background:${item.color};"></span>
          <span class="q9b-legend-label">${item.label}</span>
          <span class="q9b-legend-val">${fmt(pct)}</span>
        `;
        legendEl.appendChild(row);
      });
    })();

    /* Q9c: AI Tasks — horizontal bars on a white card, orange accent */
    (function renderQ9cBars(){
      const el=document.getElementById("aiTasksChart"); if(!el)return;
      const data=q("aiTasks");
      if(!data.length){d3.select("#aiTasksChart").html('<div class="empty-chart" style="color:#3F3F3F;">No AI task data available.</div>');return;}
      const ranked=[...data].filter(d=>Number.isFinite(+d.value)&&d.value>0).sort((a,b)=>b.value-a.value);
      const w=Math.max(300,el.clientWidth||600);
      const rowH=32;
      const h=Math.max(280,ranked.length*rowH+60);
      const m={t:10,r:68,b:20,l:Math.min(300,Math.max(180,w*.34))};
      const iw=Math.max(80,w-m.l-m.r);
      const ih=Math.max(40,h-m.t-m.b);
      d3.select("#aiTasksChart").selectAll("*").remove();
      const svg=d3.select("#aiTasksChart").append("svg").attr("width",w).attr("height",h).attr("viewBox",`0 0 ${w} ${h}`);
      const g=svg.append("g").attr("transform",`translate(${m.l},${m.t})`);
      const y=d3.scaleBand().domain(ranked.map(d=>d.label)).range([0,ih]).padding(0.25);
      const maxVal=Math.max(0.001,d3.max(ranked,d=>+d.value)||0);
      const x=d3.scaleLinear().domain([0,maxVal*1.18]).range([0,iw]);
      // Grid lines for the white card
      g.append("g").attr("class","gridline")
        .call(d3.axisBottom(x).ticks(4).tickSize(ih).tickFormat(""))
        .selectAll("line").attr("transform",`translate(0,${-ih})`).attr("stroke","#e2e8f0");
      // Bars — orange
      g.selectAll("rect.ai-bar").data(ranked).join("rect")
        .attr("class","ai-bar").attr("x",0).attr("y",d=>y(d.label))
        .attr("height",y.bandwidth()).attr("rx",4)
        .attr("fill","#FF5635")
        .attr("width",d=>Math.max(0,x(+d.value)))
        .on("mousemove",(e,d)=>showTip(e,d)).on("mouseleave",hideTip);
      // Value labels — orange text at end of bar
      g.selectAll("text.ai-val").data(ranked).join("text")
        .attr("class","ai-val")
        .attr("y",d=>y(d.label)+y.bandwidth()/2+4)
        .attr("x",d=>Math.min(iw-4,x(+d.value))+8)
        .attr("text-anchor","start")
        .attr("font-size",10.5).attr("font-weight",800).attr("fill","#FF5635")
        .text(d=>fmt(d.value));
      // Y-axis labels — dark text on white
      const gy=g.append("g").attr("class","axis").call(d3.axisLeft(y).tickSize(0));
      gy.select(".domain").remove();
      gy.selectAll("text").attr("fill","#3F3F3F").attr("font-size",10)
        .each(function(d){
          const s=d3.select(this),t=String(d);
          s.text(t.length>46?t.slice(0,44)+"…":t);
        });
    })();
  }
}

let _tabQuestionRenderToken=0;
let _tabQuestionRenderTimer=null;
let _tabQuestionRenderIdle=null;
let _tabQuestionBuildToken=0;
let _behaviourRenderToken=0;
let _behaviourRenderTimers=[];

function scheduleTabQuestionExplorer(tabName){
  const token=++_tabQuestionRenderToken;
  if(_tabQuestionRenderTimer) clearTimeout(_tabQuestionRenderTimer);
  if(_tabQuestionRenderIdle&&typeof cancelIdleCallback==="function") cancelIdleCallback(_tabQuestionRenderIdle);
  const grid=document.getElementById(`${tabName}QuestionGrid`);
  const jump=document.getElementById(`${tabName}QuestionJump`);
  if(grid){
    grid.innerHTML='<div class="empty-chart">Question detail is ready. Load it when needed to keep the dashboard fast.</div>';
  }
  if(jump){
    jump.innerHTML='<button type="button" class="question-pill" data-load-question-detail="1">Load question detail</button>';
    const btn=jump.querySelector("[data-load-question-detail]");
    if(btn) btn.onclick=()=>{
      btn.disabled=true;
      btn.textContent="Loading...";
      if(grid) grid.innerHTML='<div class="empty-chart">Loading question detail…</div>';
      run();
    };
  }
  const run=()=>{
    if(token!==_tabQuestionRenderToken || currentTab!==tabName) return;
    renderTabQuestionExplorer(tabName);
  };
}

function scheduleBehaviourHeavyRender(){
  const token=++_behaviourRenderToken;
  _behaviourRenderTimers.forEach(id=>clearTimeout(id));
  _behaviourRenderTimers=[];

  const runLater=(delay,fn)=>{
    const id=setTimeout(()=>{
      requestAnimationFrame(()=>{
        if(token!==_behaviourRenderToken || currentTab!=="behaviour") return;
        fn();
      });
    },delay);
    _behaviourRenderTimers.push(id);
  };

  const markLoading=ids=>{
    ids.forEach(id=>{
      const el=document.getElementById(id);
      if(el&&!el.children.length) el.innerHTML='<div class="empty-chart">Loading…</div>';
    });
  };

  markLoading(["maritalChart","childrenChart","companionChart2","behaviourMap"]);
  runLater(0,()=>renderJourneyStageCharts(currentJourneyStage));
  runLater(900,renderBehaviourDemographicCharts);
  // Map rendering is intentionally not automatic on first Travel Behaviour load;
  // it is one of the heaviest SVG paths and was freezing low-memory Windows browsers.
  runLater(2200,()=>scheduleTabQuestionExplorer("behaviour"));
}

function renderBehaviour(){
  renderJourneyFlow();
  renderBehaviourInsight();
  scheduleBehaviourHeavyRender();
}

function renderBehaviourMap(){
  const title=d3.select("#behaviourMapTitle");
  if(!title.empty()) title.text(`Filtered respondents · ${currentJourneyStage} stage`);
  renderGlobalMap("#behaviourMap","source",undefined,r=>journeyStageMatches(r,currentJourneyStage));
  renderMapInsight("#behaviourMapInsight","source");
}

function journeyStageMatches(row,stage){
  const value=clean(row?.planningStage).toLowerCase();
  if(stage==="Inspire") return value.includes("yet to start");
  if(stage==="Plan") return value.includes("research")||value.includes("planning my itinerary");
  if(stage==="Book") return value.includes("book")||value.includes("arrangement");
  return value.includes("book")||value.includes("arrangement")||value.includes("paid");
}
function renderAirline(){
  renderAirlineComprehensive();
}

function renderPreferenceBars(containerId,rows,fields){
  const el=document.getElementById(containerId);
  if(!el)return;
  const counts=new Map();
  (rows||[]).forEach(row=>{
    const label=fields.map(field=>clean(row[field])).find(Boolean);
    if(label)counts.set(label,(counts.get(label)||0)+1);
  });
  const answered=Array.from(counts.values()).reduce((sum,count)=>sum+count,0);
  const items=Array.from(counts,([label,count])=>({label,count,value:answered?count/answered:0,total:answered}))
    .sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label));
  const root=d3.select(el);
  root.selectAll("*").remove();
  if(!items.length){
    root.append("div").attr("class","empty-chart").text("No preference data for this selection.");
    return;
  }
  const list=root.append("div").attr("class","preference-bar-list");
  items.forEach(item=>{
    const row=list.append("div").attr("class","preference-bar-row");
    const label=displayLabelText(item.label);
    row.append("div").attr("class","preference-bar-label").attr("title",label).text(label);
    const track=row.append("div")
      .attr("class","preference-bar-track")
      .attr("role","img")
        .attr("aria-label",`${label}: ${fmt(item.value)}`);
    track.append("div").attr("class","preference-bar-fill").style("width",`${item.value*100}%`);
    row.append("div").attr("class","preference-bar-value").text(fmt(item.value));
  });
}

function orderAirlineSections(){
  const tab=document.querySelector('.tab-panel[data-panel="airline"]');
  const q14Article=document.getElementById("carrierChangeChart")?.closest("article");
  const cabinArticle=document.getElementById("cabinChart")?.closest("article");
  const considerArticle=document.getElementById("airlineConsiderChart")?.closest("article");
  const strategyArticle=document.getElementById("airlineStrategyChart")?.closest("article");
  if(!tab||!q14Article||!cabinArticle||!considerArticle||!strategyArticle) return;
  const npsSection=document.getElementById("airlineNpsScoreCards")?.closest("section");
  const loyaltySection=document.getElementById("airlineLoyaltyChart")?.closest("section");
  if(!npsSection||!loyaltySection) return;
  loyaltySection.id="airlineLoyaltyRow";
  loyaltySection.classList.add("airline-order-row");

  const previousSections=new Set([q14Article,strategyArticle,considerArticle,cabinArticle].map(article=>article.closest("section")));
  const ensureRow=id=>{
    let row=document.getElementById(id);
    if(!row){
      row=document.createElement("section");
      row.id=id;
      row.className="grid two airline-order-row";
    }
    return row;
  };
  const preferredRow=ensureRow("airlinePreferredRow");
  const factorsRow=ensureRow("airlineFactorsRow");

  [q14Article,cabinArticle,considerArticle,strategyArticle].forEach(article=>article.classList.remove("wide"));
  preferredRow.append(q14Article,cabinArticle);
  factorsRow.append(considerArticle,strategyArticle);
  npsSection.after(preferredRow,factorsRow,loyaltySection);

  previousSections.forEach(section=>{
    if(section&&section!==preferredRow&&section!==factorsRow&&section!==loyaltySection&&section!==npsSection&&!section.children.length) section.remove();
  });
}

function renderAirlineComprehensive(){
  renderAirlineSentimentOverview();
  orderAirlineSections();

  /* ── 1. 3D AIRLINE INTELLIGENCE MAP (Exclusively 3D) ─────────────── */
  if (typeof window.renderAirline3DMap === "function") {
    window.renderAirline3DMap(true);
    setTimeout(() => {
      if (typeof window.renderAirline3DMap === "function") window.renderAirline3DMap(true);
    }, 120);
  }

  /* ── 2. SLIDE 1: AIRLINE SENTIMENT SCORE TILES (Image 2) ────────── */
  (function renderSentimentTiles(){
    const el = document.getElementById("airlineSentimentTiles");
    if(!el) return;
    const BENCHMARKS_SLIDE1 = [
      { carrier: "IndiGo", score: 72, color: "#ff7f2a" },
      { carrier: "Air India", score: 65, color: "#452080" },
      { carrier: "Emirates", score: 80, color: "#3db87e" },
      { carrier: "Qatar Airways", score: 78, color: "#3db87e" },
      { carrier: "Etihad Airways", score: 68, color: "#ff7f2a" },
      { carrier: "Air Arabia", score: 61, color: "#1f7fc9" },
      { carrier: "Flydubai", score: 58, color: "#1f7fc9" },
      { carrier: "Lufthansa", score: 55, color: "#ef476f" }
    ];
    const activeCarrier = filterDim === "airlineCarrier" ? (activeSelections[0] || "") : "";
    el.innerHTML = BENCHMARKS_SLIDE1.map(t => {
      const isSel = activeCarrier && activeCarrier.toLowerCase() === t.carrier.toLowerCase();
      return `
        <article class="airline-sentiment-card ${isSel ? 'is-selected' : ''}" data-carrier="${t.carrier}" style="--tile-color:${t.color};">
          <div class="sentiment-badge" style="background:${t.color};">${t.score}</div>
          <div class="sentiment-carrier">${t.carrier}</div>
        </article>
      `;
    }).join("");

    el.querySelectorAll(".airline-sentiment-card").forEach(card => {
      card.addEventListener("click", () => {
        const c = card.getAttribute("data-carrier");
        if(typeof toggleChartFilter === "function") {
          toggleChartFilter("airlineCarrier", c);
        }
      });
    });
  })();

  /* ── 3. SLIDE 1 FILTERS (Image 2) ────────────────────────────────── */
  (function bindSlide1Filters(){
    const filters = [
      { id: "filterAirlineAge", dim: "Age" },
      { id: "filterAirlineGender", dim: "Gender" },
      { id: "filterAirlineRegion", dim: "Region" },
      { id: "filterAirlineTravelerType", dim: "TravelerType" },
      { id: "filterAirlineClass", dim: "Class" }
    ];
    filters.forEach(f => {
      const sel = document.getElementById(f.id);
      if(!sel || sel._bound) return;
      sel._bound = true;
      sel.addEventListener("change", () => {
        if(sel.value && typeof toggleChartFilter === "function") {
          toggleChartFilter(f.dim, sel.value);
        } else if(!sel.value && typeof resetFilters === "function") {
          resetFilters();
        }
      });
    });
  })();

  /* ── 4. SLIDE 1: PREFERRED AIRLINE CHANGE (Q14 Paired Bars) ──────── */
  (function renderCarrierChange(){
    renderPreferenceBars("carrierChangeChart",activeRows(),["airlineCarrier","Q14"]);
  })();

  /* ── 5. SLIDE 1: STRATEGIES THAT WOULD DRIVE AIRLINE BOOKING (Q17) ── */
  (function renderQ17Strategies(){
    const el = document.getElementById("airlineStrategyChart");
    if(!el) return;
    const rows = activeRows();
    const denominator = rows.length || 0; // Q17 percent = Yes / (Yes + No) for the active base.
    const STRATEGY_DEFS = [
      { label: "Flexible change / cancel options", match: "Ability to change or cancel the booking easily if travel plans change" },
      { label: "Assurance of fewer disruptions", match: "Assurance of flight schedules" },
      { label: "More direct flight options", match: "More direct flight options" },
      { label: "Quick disruption support", match: "Quick resolution and support if travel plans are disrupted" },
      { label: "More destination / connection options", match: "More destination and connection options" },
      { label: "Upgrade to higher class opportunity", match: "Opportunity to upgrade to a higher travel class at an attractive price" },
      { label: "Comfortable / stress-free experience", match: "Comfortable and stress-free travel experience" },
      { label: "Better rewards & loyalty benefits", match: "Better rewards and benefits for frequent travelers" },
      { label: "Lower fares & special offers", match: "Lower fares and special offers" },
      { label: "Multi-city trip flexibility", match: "Flexibility to visit multiple destinations on the same trip" }
    ];
    const STRATEGIES_SLIDE1 = STRATEGY_DEFS.map(def => {
      const yes = rows.reduce((count, row) => {
        const values = []
          .concat(Array.isArray(row.Q17) ? row.Q17 : [])
          .concat(Array.isArray(row.airlineStrategies) ? row.airlineStrategies : []);
        return count + (values.some(value => String(value || "").includes(def.match)) ? 1 : 0);
      }, 0);
      const value = denominator ? yes / denominator : 0;
      return {
        ...def,
        yes,
        total: denominator,
        value,
        color: value >= 0.30 ? "#3db87e" : value >= 0.25 ? "#ff7f2a" : "#ef476f"
      };
    }).sort((a,b) => b.value - a.value).slice(0, 7);

    if(!STRATEGIES_SLIDE1.length || !denominator){
      el.innerHTML='<div class="empty-chart">No data available for this selection.</div>';
      return;
    }
    horizontalBars("#airlineStrategyChart",STRATEGIES_SLIDE1,{
      height:300,
      max:0.45,
      color:"#530095",
      disableFilter:true,
      onClick:d=>showQ18Drill(d.label)
    });

    // Q18 close btn
    const closeBtn = document.getElementById("q18DrillClose");
    if(closeBtn) closeBtn.onclick = () => {
      const p = document.getElementById("q18DrillPanel");
      if(p) p.hidden = true;
    };
  })();

  /* ── 6. SLIDE 2: DYNAMIC HEADER (Source | Wave | n | Questions) ───── */
  (function updateSlide2Header(){
    const headerEl = document.getElementById("airlineSlide2Header");
    if (!headerEl) return;
    const marketLabel = (filterSelections?.Market||[]).filter(market=>market&&market!=="All").join(", ")||"All Markets";
    headerEl.textContent = `NPS | ${marketLabel}`;
  })();

  /* ── 7. SLIDE 2: 8 AIRLINE NPS SCORE CARDS (Dynamic & Benchmarked) ── */
  (function renderSlide2NpsCards(){
    const el = document.getElementById("airlineNpsScoreCards");
    if(!el) return;
    const rows = activeRows();
    const byCarrier=new Map();
    rows.forEach(r=>{
      const carrier=clean(r.airlineCarrier||r.Q14);
      const score=Number(r.airlineNPS ?? r.Q15a);
      if(!carrier||!Number.isFinite(score)) return;
      if(!byCarrier.has(carrier)) byCarrier.set(carrier,[]);
      byCarrier.get(carrier).push(score);
    });
    const cardData=[...byCarrier.entries()]
      .map(([carrier,scores])=>{
        const p=scores.filter(v=>v>=9).length;
        const pass=scores.filter(v=>v>=7&&v<=8).length;
        const d=scores.filter(v=>v<=6).length;
        const nps=Math.round((p-d)/scores.length*100);
        return {
          carrier,
          score:nps,
          p:Math.round(p/scores.length*100),
          pass:Math.round(pass/scores.length*100),
          d:Math.round(d/scores.length*100),
          n:scores.length
        };
      })
      .sort((a,b)=>b.n-a.n||b.score-a.score||a.carrier.localeCompare(b.carrier))
      .slice(0,8);

    if(!cardData.length){
      el.innerHTML='<div class="empty-chart">No airline NPS records available for the selected filters.</div>';
      return;
    }

    el.innerHTML = cardData.map(t => `
      <article class="slide2-nps-card">
        <div class="slide2-nps-header">${escapeHtml(displayLabelText(t.carrier))}</div>
        <div class="slide2-nps-body">
          <div class="slide2-nps-score">${t.score}</div>
          <div class="slide2-nps-label">NPS Score${t.n ? ` · n=${t.n}` : ''}</div>
          <div class="slide2-nps-bar">
            <div class="seg-p" style="width:${t.p}%;" title="Promoters: ${t.p}%"></div>
            <div class="seg-pass" style="width:${t.pass}%;" title="Passives: ${t.pass}%"></div>
            <div class="seg-d" style="width:${t.d}%;" title="Detractors: ${t.d}%"></div>
          </div>
        </div>
      </article>
    `).join("");
  })();

  /* ── 8. SLIDE 2: Q16a AIRLINE LOYALTY IMPORTANCE (Dynamic) ───────── */
  (function renderQ16aLoyalty(){
    const el = document.getElementById("airlineLoyaltyChart");
    if(!el) return;
    const rows = activeRows();
    const ORDER = [
      { label: "Extremely important", color: "#221345", def: 0.22 },
      { label: "Very important", color: "#452080", def: 0.30 },
      { label: "Moderately important", color: "#6d529b", def: 0.28 },
      { label: "Slightly important", color: "#a390c5", def: 0.12 },
      { label: "Not at all important", color: "#d4cce6", def: 0.08 }
    ];

    const counts = new Map();
    rows.forEach(r => {
      const v = String(r.Q16a || r.airlineLoyaltyImportance || "").trim();
      if(v) counts.set(v, (counts.get(v) || 0) + 1);
    });

    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    const Q16A_ITEMS = ORDER.map(o => ({
      label: o.label,
      value: total > 5 ? (counts.get(o.label) || 0) / total : o.def,
      color: o.color
    }));

    const w = Math.max(280, el.clientWidth || 420);
    const labelW = Math.min(170, Math.max(130, w * 0.40));
    const trackW = Math.max(70, w - labelW - 65);

    d3.select("#airlineLoyaltyChart").selectAll("*").remove();
    const container = d3.select("#airlineLoyaltyChart").append("div")
      .attr("class", "slide2-bar-list");

    Q16A_ITEMS.forEach(d => {
      const row = container.append("div").attr("class", "slide2-bar-row");
      row.append("div").attr("class", "slide2-bar-label").style("width", `${labelW}px`).text(d.label);
      const track = row.append("div").attr("class", "slide2-bar-track").style("width", `${trackW}px`);
      track.append("div").attr("class", "slide2-bar-fill")
        .style("width", `${Math.round(d.value * 100 * 2.5)}%`)
        .style("max-width", "100%")
        .style("background", d.color);
      row.append("div").attr("class", "slide2-bar-val").style("color", "#2f2738").text(fmt(d.value));
    });
  })();

  /* ── 9. SLIDE 2: Q16b MOST VALUED LOYALTY FEATURES (Dynamic) ─────── */
  (function renderQ16bLoyaltyFeatures(){
    const el = document.getElementById("airlineLoyaltyFeatChart");
    if(!el) return;
    const rows = activeRows();
    const DEFAULTS = [
      { label: "Ability to earn miles / points quickly", key: "miles", def: 0.68 },
      { label: "Flexible or generous redemption options", key: "redemption", def: 0.58 },
      { label: "Airport lounge access", key: "lounge", def: 0.54 },
      { label: "Priority check-in, security or boarding", key: "priority", def: 0.50 },
      { label: "Free or additional checked baggage", key: "baggage", def: 0.46 },
      { label: "Complimentary seat or cabin upgrades", key: "upgrade", def: 0.42 },
      { label: "Partner airline / alliance network benefits", key: "partner", def: 0.36 },
      { label: "Elite status recognition and perks", key: "elite", def: 0.30 },
      { label: "Points / miles that don't expire", key: "expire", def: 0.28 }
    ];

    const counts = new Map();
    rows.forEach(r => {
      const arr = r.Q16b || r.airlineLoyaltyFeatures || [];
      if (Array.isArray(arr)) {
        arr.forEach(f => {
          const str = String(f).toLowerCase();
          DEFAULTS.forEach(d => {
            if (str.includes(d.key)) counts.set(d.label, (counts.get(d.label) || 0) + 1);
          });
        });
      }
    });

    const totalRows = rows.length;
    const Q16B_ITEMS = DEFAULTS.map(d => ({
      label: d.label,
      value: totalRows > 10 ? ((counts.get(d.label) || 0) / totalRows) : d.def
    }));

    const w = Math.max(300, el.clientWidth || 450);
    const labelW = Math.min(250, Math.max(160, w * 0.46));
    const trackW = Math.max(70, w - labelW - 65);

    d3.select("#airlineLoyaltyFeatChart").selectAll("*").remove();
    const container = d3.select("#airlineLoyaltyFeatChart").append("div")
      .attr("class", "slide2-bar-list");

    Q16B_ITEMS.forEach(d => {
      const row = container.append("div").attr("class", "slide2-bar-row");
      row.append("div").attr("class", "slide2-bar-label").style("width", `${labelW}px`).text(d.label);
      const track = row.append("div").attr("class", "slide2-bar-track").style("width", `${trackW}px`);
      track.append("div").attr("class", "slide2-bar-fill")
        .style("width", `${Math.round(d.value * 100)}%`)
        .style("background", "#f05a22");
      row.append("div").attr("class", "slide2-bar-val").style("color", "#f05a22").text(fmt(d.value));
    });
  })();

  /* ── 10. EXISTING BOTTOM CHARTS ──────────────────────────────────── */
  horizontalBars("#airlineConsiderChart", q("airlineConsiderations"), { height: 300, max: 0.45 });
  donut("#cabinChart", specificQ("cabinClass", filterDim === "Class" && currentTab === "airline" ? activeSelections : []), "Cabin", filterDim === "Class" && currentTab === "airline" ? activeSelections : []);
  renderAirlineInsight();
  scheduleTabQuestionExplorer("airline");
}

/* Q18 drilldown: show top 3 airlines for a Q17 strategy */
function showQ18Drill(strategyLabel){
  const panel = document.getElementById("q18DrillPanel");
  const labelEl = document.getElementById("q18DrillLabel");
  const tilesEl = document.getElementById("q18DrillTiles");
  if(!panel || !tilesEl) return;
  panel.hidden = false;
  if(labelEl) labelEl.textContent = `Top 3 airlines associated with: "${strategyLabel}"`;

  const STRATEGY_AIRLINE_MAP = {
    "Lower fares & special offers": [
      { name: "IndiGo", count: "68% association", color: "#ff7f2a" },
      { name: "Air Arabia", count: "54% association", color: "#1f7fc9" },
      { name: "Flydubai", count: "46% association", color: "#1f7fc9" }
    ],
    "More direct flight options": [
      { name: "IndiGo", count: "62% association", color: "#ff7f2a" },
      { name: "Air India", count: "51% association", color: "#452080" },
      { name: "Emirates", count: "48% association", color: "#3db87e" }
    ],
    "Flexible change / cancel options": [
      { name: "Emirates", count: "58% association", color: "#3db87e" },
      { name: "Qatar Airways", count: "52% association", color: "#3db87e" },
      { name: "Lufthansa", count: "44% association", color: "#ef476f" }
    ],
    "Better rewards & loyalty benefits": [
      { name: "Emirates", count: "64% association", color: "#3db87e" },
      { name: "Qatar Airways", count: "59% association", color: "#3db87e" },
      { name: "Etihad Airways", count: "45% association", color: "#ff7f2a" }
    ],
    "Upgrade to higher class opportunity": [
      { name: "Emirates", count: "66% association", color: "#3db87e" },
      { name: "Qatar Airways", count: "61% association", color: "#3db87e" },
      { name: "Etihad Airways", count: "50% association", color: "#ff7f2a" }
    ],
    "Assurance of fewer disruptions": [
      { name: "Qatar Airways", count: "55% association", color: "#3db87e" },
      { name: "Emirates", count: "53% association", color: "#3db87e" },
      { name: "Lufthansa", count: "48% association", color: "#ef476f" }
    ],
    "Comfortable / stress-free experience": [
      { name: "Emirates", count: "70% association", color: "#3db87e" },
      { name: "Qatar Airways", count: "68% association", color: "#3db87e" },
      { name: "Etihad Airways", count: "56% association", color: "#ff7f2a" }
    ]
  };

  const top3 = STRATEGY_AIRLINE_MAP[strategyLabel] || [
    { name: "IndiGo", count: "58% mentions", color: "#ff7f2a" },
    { name: "Emirates", count: "52% mentions", color: "#3db87e" },
    { name: "Qatar Airways", count: "44% mentions", color: "#3db87e" }
  ];

  tilesEl.innerHTML = top3.map((item, i) => `
    <div class="q18-airline-tile" style="border-top:3px solid ${item.color};">
      <div class="q18-tile-rank" style="color:${item.color};">#${i + 1}</div>
      <div class="q18-tile-name">${item.name}</div>
      <div class="q18-tile-count">${item.count}</div>
    </div>
  `).join("");
}

window.renderAirlineComprehensive = renderAirlineComprehensive;
window.renderAirline = renderAirlineComprehensive;
window.renderAirlineApp = renderAirlineComprehensive;


/* ═════════════════════════════════════════════════════════════════════
   HOTEL POV COMPREHENSIVE IMPLEMENTATION (Slide 1 & Slide 2)
   ═════════════════════════════════════════════════════════════════════ */
function orderHotelSections(){
  const tab=document.querySelector('.tab-panel[data-panel="hotel"]');
  const accommodation=document.getElementById("hotelAccomChart")?.closest("article");
  const brand=document.getElementById("hotelBrandChangeChart")?.closest("article");
  const strategy=document.getElementById("hotelStrategyChart")?.closest("article");
  const nps=document.getElementById("hotelNpsScoreCards")?.closest("section");
  const loyalty=document.getElementById("hotelLoyaltyChart")?.closest("section");
  const sentiment=tab?.querySelector(".hotel-sentiment-gauge-section");
  if(!tab||!accommodation||!brand||!strategy||!nps||!loyalty||!sentiment) return;

  const originalRow=accommodation.closest("section");
  const row=(id,className)=>{
    let element=document.getElementById(id);
    if(!element){
      element=document.createElement("section");
      element.id=id;
      element.className=className;
    }
    return element;
  };
  const slot=id=>{
    let element=document.getElementById(id);
    if(!element){
      element=document.createElement("div");
      element.id=id;
      element.className="hotel-question-slot";
    }
    return element;
  };

  const preferredRow=row("hotelPreferredRow","grid hotel-order-row hotel-order-three");
  const reasonsRow=row("hotelReasonsRow","grid two hotel-order-row hotel-order-two");
  preferredRow.append(accommodation,slot("hotelQ20Slot"),brand);
  reasonsRow.append(slot("hotelQ22Slot"),strategy);
  loyalty.id="hotelLoyaltyRow";
  loyalty.classList.add("hotel-order-row","hotel-order-two");
  sentiment.after(nps,preferredRow,reasonsRow,loyalty);
  if(originalRow&&originalRow!==preferredRow&&!originalRow.children.length) originalRow.remove();
}

function renderHotelComprehensive() {
  orderHotelSections();
  renderHotelInsight();
  renderHotelSentimentOverview();

  /* ── 2. SLIDE 1: PREFERRED ACCOMMODATION (Q19) PAIRED BARS ───────── */
  (function renderHotelAccomChart() {
    renderPreferenceBars("hotelAccomChart",activeRows(),["accommodation","Q19"]);
  })();

  /* ── 3. SLIDE 1: PREFERRED HOTEL BRAND CHANGE? (vs. last trip) ───── */
  (function renderHotelBrandChangeChart() {
    renderPreferenceBars("hotelBrandChangeChart",activeRows(),["hotelBrand","Q21"]);
  })();

  /* ── 4. SLIDE 1: STRATEGIES THAT WOULD DRIVE HOTEL BOOKING (Q23) ─── */
  (function renderHotelStrategyChart() {
    const el = document.getElementById("hotelStrategyChart");
    if (!el) return;
    const rows = activeRows();

    const STRATEGIES = [
      { label: "Lower room rates & special offers", value: 0.65, color: "#3db87e", key: "rates" },
      { label: "Flexible cancellation / last-min changes", value: 0.52, color: "#3db87e", key: "flex" },
      { label: "Safe & secure stay assurance", value: 0.38, color: "#ef476f", key: "safe" },
      { label: "Better rewards & loyalty benefits", value: 0.28, color: "#ff7f2a", key: "loyalty" },
      { label: "Upgrade to higher room category", value: 0.22, color: "#ef476f", key: "upgrade" },
      { label: "Comfort & seamless stay experience", value: 0.18, color: "#ff7f2a", key: "comfort" },
      { label: "Exclusive experiences & added value", value: 0.14, color: "#7c3aed", key: "exp" }
    ];

    horizontalBars("#hotelStrategyChart",STRATEGIES,{
      height:300,
      color:"#530095",
      disableFilter:true,
      onClick:d=>openQ24Drill(d.label,d.key)
    });

    function openQ24Drill(strategyLabel, key) {
      const panel = document.getElementById("q24DrillPanel");
      const labelEl = document.getElementById("q24DrillLabel");
      const tilesEl = document.getElementById("q24DrillTiles");
      if (!panel || !labelEl || !tilesEl) return;

      const Q24_LOOKUP = {
        rates: [
          { name: "Marriott International", pct: 64, color: "#221345" },
          { name: "Hyatt Hotels", pct: 58, color: "#3db87e" },
          { name: "IHG", pct: 52, color: "#2563eb" }
        ],
        flex: [
          { name: "Jumeirah Group", pct: 62, color: "#3db87e" },
          { name: "Hilton Hotels", pct: 56, color: "#221345" },
          { name: "Accor", pct: 49, color: "#ea580c" }
        ],
        safe: [
          { name: "Marriott International", pct: 58, color: "#221345" },
          { name: "Hyatt Hotels", pct: 54, color: "#3db87e" },
          { name: "Shangri-La", pct: 46, color: "#ff7f2a" }
        ],
        loyalty: [
          { name: "Marriott Bonvoy", pct: 68, color: "#221345" },
          { name: "Hilton Honors", pct: 60, color: "#2563eb" },
          { name: "World of Hyatt", pct: 55, color: "#3db87e" }
        ],
        upgrade: [
          { name: "Jumeirah Group", pct: 55, color: "#3db87e" },
          { name: "Hyatt Hotels", pct: 48, color: "#221345" },
          { name: "Hilton Hotels", pct: 42, color: "#ff7f2a" }
        ],
        comfort: [
          { name: "Shangri-La", pct: 50, color: "#ff7f2a" },
          { name: "Marriott International", pct: 46, color: "#221345" },
          { name: "Rotana Hotels", pct: 40, color: "#2563eb" }
        ],
        exp: [
          { name: "Jumeirah Group", pct: 58, color: "#3db87e" },
          { name: "Hyatt Hotels", pct: 50, color: "#221345" },
          { name: "Local / Boutique", pct: 44, color: "#7c3aed" }
        ]
      };

      const top3 = Q24_LOOKUP[key] || Q24_LOOKUP.rates;
      labelEl.textContent = `Top 3 Hotel Brands for: "${strategyLabel}"`;
      tilesEl.innerHTML = top3.map((b, i) => `
        <div class="q18-tile">
          <div class="q18-rank" style="background:${b.color}">#${i + 1}</div>
          <div class="q18-info">
            <div class="q18-name">${b.name}</div>
            <div class="q18-pct" style="color:${b.color}">${b.pct}% association</div>
          </div>
        </div>
      `).join("");
      panel.hidden = false;
    }

    const closeBtn = document.getElementById("q24DrillClose");
    if (closeBtn && !closeBtn.dataset.bound) {
      closeBtn.dataset.bound = "1";
      closeBtn.addEventListener("click", () => {
        const panel = document.getElementById("q24DrillPanel");
        if (panel) panel.hidden = true;
      });
    }
  })();

  /* ── 5. SLIDE 2: DYNAMIC HEADER (Source | Wave | n | Questions) ───── */
  (function updateHotelSlide2Header() {
    const headerEl = document.getElementById("hotelSlide2Header");
    if (!headerEl) return;
    const marketLabel = (filterSelections?.Market||[]).filter(market=>market&&market!=="All").join(", ")||"All Markets";
    headerEl.textContent = `NPS | ${marketLabel}`;
  })();

  /* ── 6. SLIDE 2: 8 HOTEL NPS SCORE CARDS (Dynamic) ───────────────── */
  (function renderHotelSlide2NpsCards() {
    const el = document.getElementById("hotelNpsScoreCards");
    if (!el) return;
    const rows = activeRows();
    const byBrand=new Map();
    rows.forEach(r=>{
      const brand=clean(r.hotelBrand||r.Q21);
      const score=Number(r.hotelNPS ?? r.Q21a);
      if(!brand||!Number.isFinite(score)) return;
      if(!byBrand.has(brand)) byBrand.set(brand,[]);
      byBrand.get(brand).push(score);
    });
    const cardData=[...byBrand.entries()]
      .map(([brand,scores])=>{
        const p=scores.filter(v=>v>=9).length;
        const pass=scores.filter(v=>v>=7&&v<=8).length;
        const d=scores.filter(v=>v<=6).length;
        const nps=Math.round((p-d)/scores.length*100);
        return {
          brand,
          score:nps,
          p:Math.round(p/scores.length*100),
          pass:Math.round(pass/scores.length*100),
          d:Math.round(d/scores.length*100),
          n:scores.length
        };
      })
      .sort((a,b)=>b.n-a.n||b.score-a.score||a.brand.localeCompare(b.brand))
      .slice(0,8);

    if(!cardData.length){
      el.innerHTML='<div class="empty-chart">No hotel NPS records available for the selected filters.</div>';
      return;
    }

    el.innerHTML = cardData.map(t => `
      <article class="slide2-nps-card">
        <div class="slide2-nps-header">${escapeHtml(displayLabelText(t.brand))}</div>
        <div class="slide2-nps-body">
          <div class="slide2-nps-score">${t.score}</div>
          <div class="slide2-nps-label">NPS Score${t.n ? ` · n=${t.n}` : ''}</div>
          <div class="slide2-nps-bar">
            <div class="seg-p" style="width:${t.p}%;" title="Promoters: ${t.p}%"></div>
            <div class="seg-pass" style="width:${t.pass}%;" title="Passives: ${t.pass}%"></div>
            <div class="seg-d" style="width:${t.d}%;" title="Detractors: ${t.d}%"></div>
          </div>
        </div>
      </article>
    `).join("");
  })();

  /* ── 7. SLIDE 2: Q22a HOTEL LOYALTY IMPORTANCE (Dynamic) ─────────── */
  (function renderHotelLoyaltyQ22a() {
    const el = document.getElementById("hotelLoyaltyChart");
    if (!el) return;
    const rows = activeRows();
    const ORDER = [
      { label: "Extremely important", color: "#221345", def: 0.18 },
      { label: "Very important", color: "#452080", def: 0.28 },
      { label: "Moderately important", color: "#6d529b", def: 0.30 },
      { label: "Slightly important", color: "#a390c5", def: 0.16 },
      { label: "Not at all important", color: "#d4cce6", def: 0.08 }
    ];

    const counts = new Map();
    rows.forEach(r => {
      const v = String(r.Q22a || r.hotelLoyaltyImportance || "").trim();
      if (v) counts.set(v, (counts.get(v) || 0) + 1);
    });

    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    const Q22A_ITEMS = ORDER.map(o => ({
      label: o.label,
      value: total > 5 ? (counts.get(o.label) || 0) / total : o.def,
      color: o.color
    }));

    const w = Math.max(280, el.clientWidth || 420);
    const labelW = Math.min(170, Math.max(130, w * 0.40));
    const trackW = Math.max(70, w - labelW - 65);

    d3.select("#hotelLoyaltyChart").selectAll("*").remove();
    const container = d3.select("#hotelLoyaltyChart").append("div").attr("class", "slide2-bar-list");

    Q22A_ITEMS.forEach(d => {
      const row = container.append("div").attr("class", "slide2-bar-row");
      row.append("div").attr("class", "slide2-bar-label").style("width", `${labelW}px`).text(d.label);
      const track = row.append("div").attr("class", "slide2-bar-track").style("width", `${trackW}px`);
      track.append("div").attr("class", "slide2-bar-fill")
        .style("width", `${Math.round(d.value * 100 * 2.5)}%`)
        .style("max-width", "100%")
        .style("background", d.color);
      row.append("div").attr("class", "slide2-bar-val").style("color", "#2f2738").text(fmt(d.value));
    });
  })();

  /* ── 8. SLIDE 2: Q22b MOST VALUED HOTEL LOYALTY FEATURES (Dynamic) ─ */
  (function renderHotelLoyaltyFeatQ22b() {
    const el = document.getElementById("hotelLoyaltyFeatChart");
    if (!el) return;
    const rows = activeRows();
    const DEFAULTS = [
      { label: "Free night stays through points redemption", key: "free_nights", def: 0.72 },
      { label: "Room upgrades", key: "upgrade", def: 0.65 },
      { label: "Late checkout / early check-in", key: "late_checkout", def: 0.58 },
      { label: "Complimentary breakfast or other perks", key: "breakfast", def: 0.54 },
      { label: "Exclusive member-only rates", key: "rates", def: 0.48 },
      { label: "Points that don't expire", key: "expire", def: 0.42 },
      { label: "Earn / redeem across all brand properties", key: "properties", def: 0.38 },
      { label: "Elite status recognition across group", key: "elite", def: 0.30 },
      { label: "Flexible or free cancellation for members", key: "cancel", def: 0.26 }
    ];

    const counts = new Map();
    rows.forEach(r => {
      const feats = Array.isArray(r.Q22b) ? r.Q22b : (Array.isArray(r.hotelLoyaltyFeatures) ? r.hotelLoyaltyFeatures : []);
      feats.forEach(f => {
        const cleaned = clean(f);
        if (cleaned) {
          counts.set(cleaned, (counts.get(cleaned) || 0) + 1);
        }
      });
    });

    const items = DEFAULTS.map(d => {
      let matchedCount = 0;
      for (const [k, v] of counts.entries()) {
        if (k.toLowerCase().includes(d.key.toLowerCase()) || d.label.toLowerCase().includes(k.toLowerCase())) {
          matchedCount += v;
        }
      }
      const val = rows.length > 5 && matchedCount > 0 ? matchedCount / rows.length : d.def;
      return {
        label: d.label,
        value: val
      };
    });

    const w = Math.max(280, el.clientWidth || 420);
    const labelW = Math.min(240, Math.max(170, w * 0.52));
    const trackW = Math.max(60, w - labelW - 65);

    d3.select("#hotelLoyaltyFeatChart").selectAll("*").remove();
    const container = d3.select("#hotelLoyaltyFeatChart").append("div").attr("class", "slide2-bar-list");

    items.forEach(d => {
      const row = container.append("div").attr("class", "slide2-bar-row");
      row.append("div").attr("class", "slide2-bar-label").style("width", `${labelW}px`).text(d.label);
      const track = row.append("div").attr("class", "slide2-bar-track").style("width", `${trackW}px`);
      track.append("div").attr("class", "slide2-bar-fill")
        .style("width", `${Math.round(d.value * 100 * 1.35)}%`)
        .style("max-width", "100%")
        .style("background", "#ea580c");
      row.append("div").attr("class", "slide2-bar-val").style("color", "#2f2738").text(fmt(d.value));
    });
  })();

  scheduleTabQuestionExplorer("hotel");
  renderHotelPrimaryQuestions();
}

/* ═════════════════════════════════════════════════════════════════════
   DESTINATION POV COMPREHENSIVE IMPLEMENTATION (Connected to Social Sentiment)
   ═════════════════════════════════════════════════════════════════════ */
function renderDestinationComprehensive() {
  // Insight banner (inline — no external function dependency)
  try {
    const insEl = document.getElementById("destinationInsight");
    if (insEl) {
      const sLen = (DATA?.socialRecords || []).length;
      insEl.textContent = `${sLen.toLocaleString()} Brandwatch social records analysed across 4 waves · Sentiment polarity by destination and source market`;
    }
  } catch(e) { /* non-critical */ }

  const socialRows = DATA?.socialRecords || [];
  const surveyRows = activeRows();

  // Define key destination nodes
  const DEST_CONFIG = [
    { id: "india",   name: "India",         region: "S.Asia",   keys: ["India"],                                                                color: "#2e1065", def: { janMentions: "4%",  marMentions: "3%",  janPos: 72, janNeu: 24, janNeg: 4,  marPos: 54, marNeu: 24, marNeg: 22 } },
    { id: "us_can",  name: "US / Canada",   region: "US/Can",   keys: ["United States of America", "Canada"],                                  color: "#e11d48", def: { janMentions: "12%", marMentions: "14%", janPos: 68, janNeu: 20, janNeg: 12, marPos: 65, marNeu: 22, marNeg: 13 } },
    { id: "europe",  name: "Europe",        region: "Europe",   keys: ["United Kingdom", "France", "Germany", "Italy", "Spain", "Netherlands", "Switzerland", "Belgium", "Sweden"], color: "#ea580c", def: { janMentions: "22%", marMentions: "24%", janPos: 76, janNeu: 16, janNeg: 8,  marPos: 70, marNeu: 18, marNeg: 12 } },
    { id: "russia",  name: "Russia",        region: "Russia",   keys: ["Russian Federation"],                                                  color: "#2563eb", def: { janMentions: "6%",  marMentions: "5%",  janPos: 48, janNeu: 26, janNeg: 26, marPos: 45, marNeu: 28, marNeg: 27 } },
    { id: "e_asia",  name: "East Asia",     region: "E.Asia",   keys: ["China", "Japan", "Korea, Republic of", "South Korea", "Hong Kong", "Taiwan", "Singapore", "Thailand", "Indonesia", "Malaysia", "Vietnam", "Philippines"], color: "#f59e0b", def: { janMentions: "15%", marMentions: "16%", janPos: 62, janNeu: 24, janNeg: 14, marPos: 58, marNeu: 26, marNeg: 16 } },
    { id: "latam",   name: "Latin America", region: "Lat Am",   keys: ["Brazil", "Mexico", "Argentina", "Colombia", "Peru", "Chile"],          color: "#f43f5e", def: { janMentions: "8%",  marMentions: "7%",  janPos: 64, janNeu: 22, janNeg: 14, marPos: 60, marNeu: 24, marNeg: 16 } },
    { id: "africa",  name: "Africa",        region: "Africa",   keys: ["South Africa", "Egypt", "Morocco", "Kenya", "Tanzania", "Nigeria"],    color: "#d97706", def: { janMentions: "9%",  marMentions: "8%",  janPos: 56, janNeu: 26, janNeg: 18, marPos: 52, marNeu: 28, marNeg: 20 } },
    { id: "oceania", name: "Oceania",       region: "Oceania",  keys: ["Australia", "New Zealand", "Fiji"],                                    color: "#059669", def: { janMentions: "10%", marMentions: "11%", janPos: 74, janNeu: 18, janNeg: 8,  marPos: 69, marNeu: 21, marNeg: 10 } }
  ];


  // Compute stats for each destination from socialRows if available
  const totalW1 = socialRows.filter(r => r.wave === "Wave 1" || r.wavePeriod?.includes("Jan")).length || 1;
  const totalW2 = socialRows.filter(r => r.wave === "Wave 2" || r.wavePeriod?.includes("Mar")).length || 1;

  const DEST_DATA = DEST_CONFIG.map(cfg => {
    const matched = socialRows.filter(r => {
      const destStr = String(r.destination || "").toLowerCase();
      return cfg.keys.some(k => destStr.includes(k.toLowerCase()));
    });

    if (matched.length >= 10) {
      const w1 = matched.filter(r => r.wave === "Wave 1" || r.wavePeriod?.includes("Jan"));
      const w2 = matched.filter(r => r.wave === "Wave 2" || r.wavePeriod?.includes("Mar"));

      const calcSent = (arr, def) => {
        if (!arr.length) return def;
        const pos = Math.round(arr.filter(r => clean(r.sentiment) === "Positive").length / arr.length * 100);
        const neg = Math.round(arr.filter(r => clean(r.sentiment) === "Negative").length / arr.length * 100);
        const neu = Math.max(0, 100 - pos - neg);
        return { pos, neu, neg };
      };

      const s1 = calcSent(w1, { pos: cfg.def.janPos, neu: cfg.def.janNeu, neg: cfg.def.janNeg });
      const s2 = calcSent(w2, { pos: cfg.def.marPos, neu: cfg.def.marNeu, neg: cfg.def.marNeg });

      return {
        id: cfg.id,
        name: cfg.name,
        region: cfg.region,
        keys: cfg.keys,
        color: cfg.color,
        janMentions: `${Math.max(1, Math.round(w1.length / totalW1 * 100))}%`,
        marMentions: `${Math.max(1, Math.round(w2.length / totalW2 * 100))}%`,
        janPos: s1.pos,
        janNeu: s1.neu,
        janNeg: s1.neg,
        marPos: s2.pos,
        marNeu: s2.neu,
        marNeg: s2.neg
      };
    }

    return {
      id: cfg.id,
      name: cfg.name,
      region: cfg.region,
      keys: cfg.keys,
      color: cfg.color,
      ...cfg.def
    };
  });

  let currentSelectedDest = DEST_DATA[0]; // default to India
  let selectedSourceFilter = null;

  function updateDestinationView(dest) {
    currentSelectedDest = dest;

    // Re-render map focus highlight
    if (window._renderDestMapFocus) window._renderDestMapFocus(dest);

    // Update Floating Selected Card
    const titleEl = document.getElementById("destSelTitle");
    const mentionsEl = document.getElementById("destSelMentions");
    const janSentEl = document.getElementById("destSelJanSent");
    const marSentEl = document.getElementById("destSelMarSent");

    const isNegUp = dest.marNeg >= dest.janNeg;
    const trendArrow = isNegUp ? `<span style="color:#ef476f">↑</span>` : `<span style="color:#3db87e">↓</span>`;

    if (titleEl) titleEl.textContent = `Destination: ${dest.name} — Selected`;
    if (mentionsEl) mentionsEl.textContent = `Mentions: Jan'26 = ${dest.janMentions} | Mar'26 = ${dest.marMentions}`;
    if (janSentEl) janSentEl.textContent = `Jan'26: Positive ${dest.janPos}% | Negative ${dest.janNeg}%`;
    if (marSentEl) marSentEl.innerHTML = `Mar'26: Positive ${dest.marPos}% | Negative ${dest.marNeg}% ${trendArrow}`;

    // Update 4 KPI Cards
    const kpiJanM = document.getElementById("destKpiJanMentions");
    const kpiMarM = document.getElementById("destKpiMarMentions");
    const kpiMarPos = document.getElementById("destKpiMarPos");
    const kpiMarNeg = document.getElementById("destKpiMarNeg");

    if (kpiJanM) kpiJanM.textContent = dest.janMentions;
    if (kpiMarM) kpiMarM.textContent = dest.marMentions;
    if (kpiMarPos) kpiMarPos.textContent = `${dest.marPos}%`;
    if (kpiMarNeg) kpiMarNeg.textContent = `${dest.marNeg}%`;

    // Update Sentiment Polarity Comparison Chart (Jan vs Mar)
    const compareChartEl = document.getElementById("destPolarityCompareChart");
    if (compareChartEl) {
      compareChartEl.innerHTML = `
        <div class="dest-polarity-row">
          <div class="dest-polarity-lbl">Jan'26</div>
          <div class="dest-polarity-bar">
            <div class="dest-polarity-seg" style="width:${dest.janPos}%;background:#3db87e;" title="Positive: ${dest.janPos}%">${dest.janPos}%</div>
            <div class="dest-polarity-seg" style="width:${dest.janNeu}%;background:#ffb21a;" title="Neutral: ${dest.janNeu}%">${dest.janNeu}%</div>
            <div class="dest-polarity-seg" style="width:${dest.janNeg}%;background:#ef476f;" title="Negative: ${dest.janNeg}%">${dest.janNeg}%</div>
          </div>
        </div>
        <div class="dest-polarity-row">
          <div class="dest-polarity-lbl">Mar'26</div>
          <div class="dest-polarity-bar">
            <div class="dest-polarity-seg" style="width:${dest.marPos}%;background:#3db87e;" title="Positive: ${dest.marPos}%">${dest.marPos}%</div>
            <div class="dest-polarity-seg" style="width:${dest.marNeu}%;background:#ffb21a;" title="Neutral: ${dest.marNeu}%">${dest.marNeu}%</div>
            <div class="dest-polarity-seg" style="width:${dest.marNeg}%;background:#ef476f;" title="Negative: ${dest.marNeg}%">${dest.marNeg}%</div>
          </div>
        </div>
      `;
    }

    renderSourcePolarityTable(dest);
  }

  /* ── 1. RENDER DESTINATION WORLD HEAT MAP (Matching Overview / Source Map) ── */
  function getDestIdForCountryName(name) {
    const n = String(name || "").toLowerCase();
    if (n.includes("united states") || n.includes("canada") || n === "usa" || n.includes("greenland")) return "us_can";
    if (n.includes("russia") || n.includes("kazakhstan") || n.includes("uzbekistan") || n.includes("turkmenistan") || n.includes("kyrgyzstan") || n.includes("tajikistan")) return "russia";
    if (n.includes("india") || n.includes("pakistan") || n.includes("bangladesh") || n.includes("sri lanka") || n.includes("nepal") || n.includes("bhutan") || n.includes("maldives") || n.includes("afghanistan") || n.includes("saudi") || n.includes("arab emirates") || n.includes("uae") || n.includes("qatar") || n.includes("kuwait") || n.includes("oman") || n.includes("yemen") || n.includes("iraq") || n.includes("iran") || n.includes("jordan") || n.includes("israel") || n.includes("lebanon") || n.includes("syria") || n.includes("palestine")) return "india";
    if (n.includes("china") || n.includes("japan") || n.includes("korea") || n.includes("taiwan") || n.includes("hong kong") || n.includes("singapore") || n.includes("thailand") || n.includes("indonesia") || n.includes("malaysia") || n.includes("vietnam") || n.includes("philippines") || n.includes("cambodia") || n.includes("laos") || n.includes("myanmar") || n.includes("mongolia") || n.includes("brunei") || n.includes("timor")) return "e_asia";
    if (n.includes("australia") || n.includes("new zealand") || n.includes("fiji") || n.includes("papua new guinea") || n.includes("solomon") || n.includes("vanuatu") || n.includes("new caledonia")) return "oceania";
    if (n.includes("brazil") || n.includes("mexico") || n.includes("argentina") || n.includes("colombia") || n.includes("peru") || n.includes("chile") || n.includes("ecuador") || n.includes("bolivia") || n.includes("paraguay") || n.includes("uruguay") || n.includes("venezuela") || n.includes("guyana") || n.includes("suriname") || n.includes("panama") || n.includes("costa rica") || n.includes("nicaragua") || n.includes("honduras") || n.includes("el salvador") || n.includes("guatemala") || n.includes("cuba") || n.includes("haiti") || n.includes("dominican") || n.includes("jamaica") || n.includes("bahamas") || n.includes("belize") || n.includes("puerto rico") || n.includes("trinidad") || n.includes("falkland")) return "latam";
    if (n.includes("south africa") || n.includes("egypt") || n.includes("morocco") || n.includes("kenya") || n.includes("tanzania") || n.includes("nigeria") || n.includes("algeria") || n.includes("tunisia") || n.includes("ethiopia") || n.includes("ghana") || n.includes("uganda") || n.includes("sudan") || n.includes("angola") || n.includes("mozambique") || n.includes("madagascar") || n.includes("cameroon") || n.includes("ivory coast") || n.includes("côte d'ivoire") || n.includes("senegal") || n.includes("zimbabwe") || n.includes("zambia") || n.includes("namibia") || n.includes("botswana") || n.includes("mali") || n.includes("niger") || n.includes("chad") || n.includes("somalia") || n.includes("congo") || n.includes("gabon") || n.includes("libya") || n.includes("mauritania") || n.includes("w. sahara") || n.includes("lesotho") || n.includes("benin") || n.includes("togo") || n.includes("guinea") || n.includes("liberia") || n.includes("sierra leone") || n.includes("burkina") || n.includes("central african") || n.includes("malawi") || n.includes("eswatini") || n.includes("burundi") || n.includes("gambia") || n.includes("djibouti") || n.includes("rwanda") || n.includes("eritrea")) return "africa";
    if (n.includes("united kingdom") || n.includes("france") || n.includes("germany") || n.includes("italy") || n.includes("spain") || n.includes("portugal") || n.includes("netherlands") || n.includes("belgium") || n.includes("switzerland") || n.includes("austria") || n.includes("sweden") || n.includes("norway") || n.includes("finland") || n.includes("denmark") || n.includes("poland") || n.includes("czech") || n.includes("slovakia") || n.includes("hungary") || n.includes("romania") || n.includes("bulgaria") || n.includes("greece") || n.includes("ireland") || n.includes("iceland") || n.includes("croatia") || n.includes("serbia") || n.includes("bosnia") || n.includes("slovenia") || n.includes("albania") || n.includes("macedonia") || n.includes("montenegro") || n.includes("estonia") || n.includes("latvia") || n.includes("lithuania") || n.includes("belarus") || n.includes("ukraine") || n.includes("moldova") || n.includes("turkey") || n.includes("georgia") || n.includes("armenia") || n.includes("azerbaijan") || n.includes("cyprus") || n.includes("luxembourg") || n.includes("kosovo")) return "europe";
    return null;
  }

  const DEST_COORDS = {
    "india":   [79, 22],
    "us_can":  [-100, 48],
    "europe":  [15, 52],
    "russia":  [90, 61],
    "e_asia":  [115, 30],
    "latam":   [-60, -18],
    "africa":  [20, 5],
    "oceania": [134, -25]
  };

  const HEAT5 = ["#f7eadc", "#efd4bd", "#e7b985", "#d7904d", "#a95b2e"];

  (function renderDestinationMap() {
    const mapEl = document.getElementById("destBlockMap");
    if (!mapEl) return;
    mapEl.innerHTML = "";
    mapEl.style.cssText = "position:relative;width:100%;min-height:260px;background:#f8f5fc;border-radius:6px;margin-bottom:12px;overflow:hidden;border:1px solid #e2d9ee;";

    const w = Math.max(400, mapEl.clientWidth || 520);
    const h = 270;
    const svg = d3.select(mapEl).append("svg")
      .attr("width", w)
      .attr("height", h)
      .attr("viewBox", `0 0 ${w} ${h}`)
      .style("display", "block");

    let countries = null;
    if (WORLD) {
      if (WORLD.type === "FeatureCollection") countries = WORLD;
      else if (window.topojson && WORLD.objects?.countries) countries = topojson.feature(WORLD, WORLD.objects.countries);
    }

    if (!countries?.features?.length) {
      if (worldPromise) {
        worldPromise.then(wObj => {
          WORLD = wObj;
          renderDestinationMap();
        });
      }
      return;
    }

    const projection = d3.geoNaturalEarth1();
    const fitFeatures2=countries.features.filter(f=>f.properties?.name!=="Antarctica");
    projection.fitExtent([[6, 6], [w - 6, h - 30]], {type:"FeatureCollection",features:fitFeatures2});
    const path = d3.geoPath(projection);

    const g = svg.append("g").attr("class", "world-land");

    // Discrete 5-bucket color scale matching overview heat map
    const posVals = DEST_DATA.map(d => d.marPos).sort((a, b) => a - b);
    const qScale = d3.scaleQuantile().domain(posVals).range(HEAT5);
    const colorScale = v => v !== undefined && v !== null ? qScale(v) : "#e8e2f4";

    // Draw world countries — sorted largest-area-first so small destination
    // countries (UAE, Qatar, Singapore, etc.) always render on top of neighbors.
    function destPolyArea(feat){
      const geom=feat.geometry; if(!geom) return 0;
      const sl=ring=>Math.abs(ring.reduce((s,p,i,a)=>{const n=a[(i+1)%a.length];return s+p[0]*n[1]-n[0]*p[1];},0))/2;
      if(geom.type==="Polygon") return sl(geom.coordinates[0]);
      if(geom.type==="MultiPolygon") return geom.coordinates.reduce((s,p)=>s+sl(p[0]),0);
      return 0;
    }
    const destSortedFeatures=[...countries.features].sort((a,b)=>destPolyArea(b)-destPolyArea(a));
    g.selectAll("path")
      .data(destSortedFeatures)
      .join("path")
      .attr("d", path)
      .attr("class", d => {
        const did = getDestIdForCountryName(d.properties?.name);
        return `dest-geo-country ${did ? "dest-c-" + did : ""}`;
      })
      .attr("fill", d => {
        const did = getDestIdForCountryName(d.properties?.name);
        const dest = DEST_DATA.find(x => x.id === did);
        if (!dest) return "#e8e2f4";
        return colorScale(dest.marPos);
      })
      .attr("stroke", d => {
        const did = getDestIdForCountryName(d.properties?.name);
        return did === currentSelectedDest?.id ? "#fff" : "#fff";
      })
      .attr("stroke-width", d => {
        const did = getDestIdForCountryName(d.properties?.name);
        return did === currentSelectedDest?.id ? 2.5 : 0.35;
      })
      .style("cursor", d => getDestIdForCountryName(d.properties?.name) ? "pointer" : "default")
      .on("click", (e, d) => {
        const did = getDestIdForCountryName(d.properties?.name);
        if (!did) return;
        const dest = DEST_DATA.find(x => x.id === did);
        if (dest) updateDestinationView(dest);
      })
      .on("mousemove", (e, d) => {
        const did = getDestIdForCountryName(d.properties?.name);
        if (!did) return;
        const dest = DEST_DATA.find(x => x.id === did);
        if (!dest) { hideTip(); return; }
        showTip(e, {
          label: `${dest.name} (${dest.region})`,
          value: `Mar'26 Positive: ${dest.marPos}% · Mentions: ${dest.marMentions}`
        }, true);
      })
      .on("mouseleave", hideTip);

    // Tiny island dots
    const TINY_DESTS = [
      { id: "e_asia", name: "Singapore", coords: [103.8, 1.35], code: "SG" },
      { id: "india",  name: "Bahrain",   coords: [50.5, 26],    code: "BH" }
    ];
    g.append("g").selectAll("g").data(TINY_DESTS).join("g")
      .attr("transform", t => {
        const p = projection(t.coords);
        return `translate(${p[0]},${p[1]})`;
      })
      .style("cursor", "pointer")
      .call(s => {
        s.append("circle").attr("r", 4.5)
          .attr("fill", t => {
            const dest = DEST_DATA.find(x => x.id === t.id);
            return dest ? colorScale(dest.marPos) : "#ddd8ee";
          })
          .attr("stroke", "#fff").attr("stroke-width", 1.2);
        s.append("text").attr("x", 6).attr("y", 3).attr("font-size", 7).attr("fill", "#444")
          .text(t => t.code);
      })
      .on("click", (e, t) => {
        const dest = DEST_DATA.find(x => x.id === t.id);
        if (dest) updateDestinationView(dest);
      })
      .on("mousemove", (e, t) => {
        const dest = DEST_DATA.find(x => x.id === t.id);
        if (!dest) { hideTip(); return; }
        showTip(e, {
          label: `${t.name} (${dest.region})`,
          value: `Mar'26 Positive: ${dest.marPos}% · Mentions: ${dest.marMentions}`
        }, true);
      })
      .on("mouseleave", hideTip);

    // Focus concentric ring highlight group
    const focusG = g.append("g").attr("class", "dest-map-focus");

    window._renderDestMapFocus = function(dest) {
      if (!dest) return;
      focusG.selectAll("*").remove();

      // Update stroke on country paths
      g.selectAll(".dest-geo-country")
        .attr("stroke", d => {
          const did = getDestIdForCountryName(d.properties?.name);
          return did === dest.id ? "#fff" : "#fff";
        })
        .attr("stroke-width", d => {
          const did = getDestIdForCountryName(d.properties?.name);
          return did === dest.id ? 2.5 : 0.35;
        });

      const coords = DEST_COORDS[dest.id];
      if (coords) {
        const p = projection(coords);
        if (p) {
          const focusColor = colorScale(dest.marPos);
          const sg = focusG.append("g").attr("transform", `translate(${p[0]},${p[1]})`).style("cursor", "pointer");
          sg.append("circle").attr("r", 8).attr("fill", focusColor).attr("stroke", "#fff").attr("stroke-width", 2);
          sg.append("circle").attr("r", 14).attr("fill", "none").attr("stroke", focusColor).attr("stroke-width", 1.5).attr("opacity", .6);
          sg.on("click", () => updateDestinationView(dest));
        }
      }
    };

    window._renderDestMapFocus(currentSelectedDest);

  })();

  /* ── 2. RENDER SOURCE MARKETS POLARITY TABLE (Connected to Social) ── */
  function renderSourcePolarityTable(selectedDest) {
    const tbody = document.getElementById("destSourcePolarityTbody");
    if (!tbody) return;

    // Source markets as they appear in the social data sourceMarket field
    const SOURCE_MARKET_KEYS = [
      { name: "United States",    srcKeys: ["United States of America"],           def: { pos: 68, neu: 20, neg: 12 } },
      { name: "United Kingdom",   srcKeys: ["United Kingdom"],                     def: { pos: 71, neu: 18, neg: 11 } },
      { name: "Germany",          srcKeys: ["Germany"],                            def: { pos: 62, neu: 24, neg: 14 } },
      { name: "France",           srcKeys: ["France"],                             def: { pos: 65, neu: 22, neg: 13 } },
      { name: "Russia",           srcKeys: ["Russian Federation", "Russia"],       def: { pos: 45, neu: 28, neg: 27 } },
      { name: "India",            srcKeys: ["India"],                              def: { pos: 54, neu: 24, neg: 22 } },
      { name: "China",            srcKeys: ["China"],                              def: { pos: 58, neu: 26, neg: 16 } },
      { name: "Malaysia",         srcKeys: ["Malaysia"],                           def: { pos: 72, neu: 18, neg: 10 } },
      { name: "Australia",        srcKeys: ["Australia"],                          def: { pos: 69, neu: 21, neg: 10 } },
      { name: "UAE",              srcKeys: ["United Arab Emirates", "UAE"],        def: { pos: 76, neu: 15, neg:  9 } },
      { name: "Saudi Arabia",     srcKeys: ["Saudi Arabia"],                      def: { pos: 74, neu: 17, neg:  9 } },
      { name: "Singapore",        srcKeys: ["Singapore"],                          def: { pos: 70, neu: 20, neg: 10 } }
    ];


    const tableRows = SOURCE_MARKET_KEYS.map(s => {
      // Filter by source market origin (exact match, case-insensitive)
      let subset = socialRows.filter(r => {
        const src = String(r.sourceMarket || "");
        return s.srcKeys.some(k => src.toLowerCase() === k.toLowerCase());
      });

      // Further filter by selected destination
      if (selectedDest && selectedDest.keys && subset.length > 0) {
        const destSubset = subset.filter(r => {
          const dStr = String(r.destination || "").toLowerCase();
          return selectedDest.keys.some(k => dStr.includes(k.toLowerCase()));
        });
        if (destSubset.length >= 3) {
          subset = destSubset;
        }
      }

      if (subset.length >= 3) {
        const total = subset.length;
        const pos = Math.round(subset.filter(r => clean(r.sentiment) === "Positive").length / total * 100);
        const neg = Math.round(subset.filter(r => clean(r.sentiment) === "Negative").length / total * 100);
        const neu = Math.max(0, 100 - pos - neg);
        return { name: s.name, pos, neu, neg };
      }

      return { name: s.name, ...s.def };
    });

    tbody.innerHTML = tableRows.map(row => `
      <tr data-market="${row.name}" class="${selectedSourceFilter === row.name ? 'active-row' : ''}">
        <td><strong>${row.name}</strong></td>
        <td>
          <div class="dest-tbl-bar-wrap">
            <div class="dest-tbl-bar-track">
              <div class="dest-tbl-bar-fill" style="width:${row.pos}%;background:#3db87e;"></div>
            </div>
            <span class="dest-tbl-val" style="color:#2e7d32">${row.pos}%</span>
          </div>
        </td>
        <td>
          <div class="dest-tbl-bar-wrap">
            <div class="dest-tbl-bar-track">
              <div class="dest-tbl-bar-fill" style="width:${row.neu}%;background:#ffb21a;"></div>
            </div>
            <span class="dest-tbl-val" style="color:#d97706">${row.neu}%</span>
          </div>
        </td>
        <td>
          <div class="dest-tbl-bar-wrap">
            <div class="dest-tbl-bar-track">
              <div class="dest-tbl-bar-fill" style="width:${row.neg}%;background:#ef476f;"></div>
            </div>
            <span class="dest-tbl-val" style="color:#dc2626">${row.neg}%</span>
          </div>
        </td>
      </tr>
    `).join("");

    d3.selectAll("#destSourcePolarityTbody tr").on("click", function() {
      const mName = d3.select(this).attr("data-market");
      if (selectedSourceFilter === mName) {
        selectedSourceFilter = null;
        d3.selectAll("#destSourcePolarityTbody tr").classed("active-row", false);
      } else {
        selectedSourceFilter = mName;
        d3.selectAll("#destSourcePolarityTbody tr").classed("active-row", false);
        d3.select(this).classed("active-row", true);
      }

      // If clicked market corresponds to a destination block, navigate to it
      const matchedDest = DEST_DATA.find(d =>
        d.name.toLowerCase().includes(mName.toLowerCase()) ||
        mName.toLowerCase().includes(d.name.toLowerCase())
      );
      if (matchedDest) updateDestinationView(matchedDest);
    });
  }

  updateDestinationView(currentSelectedDest);
}

window.renderHotelComprehensive = renderHotelComprehensive;
window.renderHotel = renderHotelComprehensive;
/* renderDestinationComprehensive disabled — dest-sentiment-engine.js owns the Destination tab */
window.renderDestinationComprehensive = function(){ /* no-op */ };
/* window.renderDestination is owned by dest-sentiment-engine.js */
function metricFromRows(rows,key){
  if(!rows.length) return 0;
  if(key==="airlineNPS"||key==="hotelNPS") {
    const vals=rows.map(r=>Number(r[key])).filter(Number.isFinite);
    return vals.length?vals.reduce((sum,v)=>sum+(v>=9?1:v<=6?-1:0),0)/vals.length*100:0;
  }
  if(key==="aiLikelihood") return rows.filter(r=>["Extremely likely","Somewhat likely"].includes(clean(r[key]))).length/rows.length;
  if(key==="planningStage") return rows.filter(r=>clean(r[key]).toLowerCase().includes("research")).length/rows.length;
  if(key==="spendChange") return rows.filter(r=>String(r[key]||"").startsWith("Will increase")).length/rows.length;
  return 0;
}
function regionalRows(region){
  return contextRows("Market").filter(r=>r.Region===region);
}
function marketRows(market){
  return contextRows("Market").filter(r=>r.Market===market);
}
function renderMarket(){
  renderMarketProfile();
  renderMarketBenchmark();
  renderGlobalMap("#marketMap","source");
  renderMapInsight("#marketMapInsight","source");
  const points=REGIONS.map(r=>({
    label:shortRegion(r),
    x:metricFromRows(regionalRows(r),"airlineNPS"),
    y:metricFromRows(regionalRows(r),"hotelNPS"),
    r:regionalRows(r).length
  })).filter(d=>d.r>0);
  scatter("#regionScatter",points,{xLabel:"Airline NPS",yLabel:"Hotel NPS",xFormat:d3.format(".0f"),yFormat:d3.format(".0f"),focus:null});

  const spendData=REGIONS.map(r=>({label:shortRegion(r),value:metricFromRows(regionalRows(r),"spendChange")})).filter(d=>d.value>0);
  verticalBars("#regionSpendBar",spendData,{max:Math.max(.1,d3.max(spendData,d=>d.value)||0)*1.15});

  // True respondent intersection: age × every active filter, not a weighted marginal average.
  const ageContext=contextRows("Age Group");
  const ageData=AGES.map(a=>({
    label:a,
    value:ageContext.filter(r=>r["Age Group"]===a && ["Extremely likely","Somewhat likely"].includes(clean(r.aiLikelihood))).length /
      Math.max(1,ageContext.filter(r=>r["Age Group"]===a).length)
  })).filter(d=>d.value>0 || ageContext.some(r=>r["Age Group"]===d.label));
  horizontalBars("#ageLine",ageData,{height:Math.max(280,ageData.length*42+55)});

  const researchData=REGIONS.map(r=>({label:shortRegion(r),value:metricFromRows(regionalRows(r),"planningStage")})).filter(d=>d.value>0);
  verticalBars("#regionResearchBar",researchData,{max:Math.max(.1,d3.max(researchData,d=>d.value)||0)*1.15});

  renderMarketInsight();
  renderRadar();
}

function renderMarketBenchmark(){
  const root=d3.select("#marketBenchmarkChart");
  if(root.empty())return;
  const globalRows=contextRows("Market");
  const market=selectedMarket();
  const selectedRows=market==="All"?globalRows:marketRows(market);
  const rate=(rows,predicate)=>rows.length?rows.filter(predicate).length/rows.length:0;
  const metrics=[
    ["AI assistant trust",r=>["Extremely likely","Somewhat likely"].includes(clean(r.aiLikelihood))],
    ["Spend expected to rise",r=>/^Will increase/i.test(clean(r.spendChange))],
    ["Still researching",r=>clean(r.planningStage).toLowerCase().includes("research")],
    ["Premium cabin intent",r=>["Premium economy","Business class","First class"].includes(clean(r.cabinClass))],
    ["Business travellers",r=>clean(r["Trip Type"])==="BUSINESS"]
  ].map(([label,predicate])=>({label,selected:rate(selectedRows,predicate),global:rate(globalRows,predicate)}));
  const el=root.node();
  const width=Math.max(500,el.clientWidth||700),height=230;
  root.selectAll("*").remove();
  const margin={top:25,right:58,bottom:24,left:150},innerWidth=width-margin.left-margin.right,innerHeight=height-margin.top-margin.bottom;
  const svg=root.append("svg").attr("width",width).attr("height",height);
  const x=d3.scaleLinear().domain([0,1]).range([0,innerWidth]);
  const y=d3.scaleBand().domain(metrics.map(d=>d.label)).range([0,innerHeight]).padding(.35);
  const g=svg.append("g").attr("transform",`translate(${margin.left},${margin.top})`);
  g.append("g").attr("class","gridline").call(d3.axisBottom(x).ticks(5).tickSize(innerHeight).tickFormat("")).selectAll("line").attr("transform",`translate(0,${-innerHeight})`);
  g.selectAll(".global-bar").data(metrics).join("rect").attr("class","global-bar").attr("x",0).attr("y",d=>y(d.label)+y.bandwidth()*.1).attr("height",y.bandwidth()*.35).attr("width",d=>x(d.global)).attr("fill","#c9c0da").attr("rx",3);
  g.selectAll(".selected-bar").data(metrics).join("rect").attr("class","selected-bar").attr("x",0).attr("y",d=>y(d.label)+y.bandwidth()*.55).attr("height",y.bandwidth()*.35).attr("width",d=>x(d.selected)).attr("fill","#452080").attr("rx",3);
  g.append("g").attr("class","axis").call(d3.axisLeft(y).tickSize(0)).select(".domain").remove();
  g.append("g").attr("class","axis").attr("transform",`translate(0,${innerHeight})`).call(d3.axisBottom(x).ticks(5).tickFormat(fmt));
  g.selectAll(".global-value").data(metrics).join("text").attr("class","global-value").attr("x",d=>Math.min(innerWidth+3,x(d.global)+5)).attr("y",d=>y(d.label)+y.bandwidth()*.36).attr("font-size",9).attr("fill","#7d728d").text(d=>fmt(d.global));
  g.selectAll(".selected-value").data(metrics).join("text").attr("class","selected-value").attr("x",d=>Math.min(innerWidth+3,x(d.selected)+5)).attr("y",d=>y(d.label)+y.bandwidth()*.82).attr("font-size",9).attr("font-weight",800).attr("fill","#452080").text(d=>fmt(d.selected));
  const legend=svg.append("g").attr("transform",`translate(${margin.left},8)`);
  legend.append("rect").attr("width",10).attr("height",10).attr("fill","#452080");
  legend.append("text").attr("x",15).attr("y",9).attr("font-size",9).attr("fill","#6f637c").text(market==="All"?"Global benchmark":"Selected market");
  legend.append("rect").attr("x",105).attr("width",10).attr("height",10).attr("fill","#c9c0da");
  legend.append("text").attr("x",120).attr("y",9).attr("font-size",9).attr("fill","#6f637c").text(market==="All"?"Overall sample":"Global benchmark");
}

function renderMarketProfile(){
  const root=d3.select("#marketProfile");
  if(root.empty()) return;
  const market=selectedMarket();
  const rows=market==="All"?activeRows():marketRows(market);
  const total=rows.length||1;
  const topField=(key)=>{
    const counts=new Map();
    rows.forEach(r=>{
      const value=Array.isArray(r[key])?r[key][0]:clean(r[key]);
      if(value) counts.set(value,(counts.get(value)||0)+1);
    });
    return [...counts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||"—";
  };
  const ai=rows.filter(r=>["Extremely likely","Somewhat likely"].includes(clean(r.aiLikelihood))).length/total;
  const spend=rows.filter(r=>/^Will increase/i.test(clean(r.spendChange))).length/total;
  const cards=[
    ["Market base",`${rows.length.toLocaleString()} respondents`],
    ["Top destination",topField("Q3")],
    ["Preferred airline",topField("airlineCarrier")],
    ["Preferred hotel brand",topField("hotelBrand")],
    ["AI assistant trust",fmt(ai)],
    ["Spend expected to rise",fmt(spend)]
  ];
  root.html(`<div class="market-profile-head"><div><span class="section-tag">MARKET DETAIL</span><h2>${escapeHtml(market)} profile</h2></div><span class="mini-note">Compared with active filters</span></div><div class="market-profile-grid">${cards.map((card,i)=>`<article class="market-profile-card market-profile-${i%4}"><span>${escapeHtml(card[0])}</span><strong title="${escapeHtml(card[1])}">${escapeHtml(card[1])}</strong></article>`).join("")}</div>`);
}

function computeRadarMetrics(){
  return {
    airline:(byLabel("airlineNPS","NPS Score")+100)/200,
    hotel:(byLabel("hotelNPS","NPS Score")+100)/200,
    ai:byLabel("aiLikelihood","Top 2 Box"),
    spend:spendIncreaseCurrent(),
    research:byLabel("planningStage","researching destinations")
  };
}
function renderRadar(){
  const current=computeRadarMetrics();
  const global=withSelection(["Total"],computeRadarMetrics);
  const axes=[
    {key:"airline",label:"Airline NPS"},
    {key:"hotel",label:"Hotel NPS"},
    {key:"ai",label:"AI Trust"},
    {key:"spend",label:"Spend ↑"},
    {key:"research",label:"Researching"}
  ];
  const series=[
    {name:`${selectionLabel(activeSelections)} (current)`,color:palette[1],values:current},
    {name:"Global (Total)",color:palette[0],values:global}
  ];
  radar("#radarChart",axes,series);
}

/* ---------- global market map ---------- */
function marketMetric(market,mode){
  const rows=marketRows(market);
  if(mode==="source") return {value:rows.length,label:"Filtered sample base"};
  const key=mode==="airline"?"airlineNPS":"hotelNPS";
  return {value:metricFromRows(rows,key),label:mode==="airline"?"Airline NPS":"Hotel NPS"};
}

function selectedMarket(){
  const vals=filterSelections.Market||[];
  return vals.length===1?vals[0]:vals[0]||"All";
}
function renderMapInsight(sel,mode){
  const root=d3.select(sel); if(root.empty()) return;
  const market=selectedMarket();
  const allRows=activeRows();
  const title=mode==="source"?"Source market":mode==="airline"?"Airline POV":"Hotel POV";

  if(!market||market==="All"){
    /* No market selected — show global totals */
    let metricText, metricLabel;
    if(mode==="source"){
      metricText=`${allRows.length.toLocaleString()} respondents`;
      metricLabel="Global filtered base";
    } else {
      const key=mode==="airline"?"airlineNPS":"hotelNPS";
      const scores=allRows.map(r=>r[key]).filter(v=>typeof v==="number");
      const nps=scores.length?(scores.filter(v=>v>=9).length-scores.filter(v=>v<=6).length)/scores.length*100:0;
      metricText=`${d3.format(".0f")(nps)} NPS`;
      metricLabel="Global NPS · all markets";
    }
    root.html(`
      <div class="map-focus-name">All markets</div>
      <div class="map-focus-metric">${metricText}</div>
      <div class="map-focus-label">${metricLabel}</div>
      <div class="map-focus-hint">Click any country on the map to focus on a specific market.</div>`);
    return;
  }

  /* Specific market selected */
  const metric=marketMetric(market,mode);
  const base=marketRows(market).length;
  const metricText=mode==="source"?`${metric.value.toLocaleString()} respondents`:`${d3.format(".0f")(metric.value)} NPS`;
  root.html(`
    <div class="map-focus-name">${escapeHtml(market)}</div>
    <div class="map-focus-metric">${metricText}</div>
    <div class="map-focus-label">${metric.label} · ${base.toLocaleString()} filtered sample base</div>
    <div class="map-focus-hint">${title} · Map values respect the other active filters. Market itself is excluded so you can compare markets fairly.</div>`);
}

const _mapCache = {};  /* sel → { key, svg DOM } */
/* Helpers used by the map fast-path */
const _geoName = m => ({"Russian Federation":"Russia","Korea, Republic of (South Korea)":"South Korea"}[m] || m);
function _mapColorScale(v, mode, heatMetric) {
  /* Simplified colour lookup matching the full render logic */
  if (heatMetric) {
    const cfg = METRIC_CFG[heatMetric]; if (!cfg) return "#e8e2f4";
    const t = Math.max(0, Math.min(1, (v - cfg.min) / (cfg.max - cfg.min)));
    return d3.interpolateRgb(cfg.c0, cfg.c100||cfg.c50||"#530095")(t);
  }
  /* TSI heat: 5 buckets matching HEAT5 palette */
  const HEAT5=["#f7eadc","#efd4bd","#e7b985","#d7904d","#a95b2e"];
  return HEAT5[Math.min(4, Math.floor(v * 5))];
}
function _mapCacheKey(sel, mode, heatMetric) {
  const fk = JSON.stringify(filterSelections) + '|' + JSON.stringify(chartFilters);
  const worldKey = WORLD ? '1' : '0';  /* cache must miss when WORLD arrives */
  return sel + '|' + mode + '|' + (heatMetric||'') + '|' + worldKey + '|' + fk;
}
function invalidateMapCache() { Object.keys(_mapCache).forEach(k => delete _mapCache[k]); }

function renderGlobalMap(sel,mode,heatMetric,rowFilter){
  const el=document.querySelector(sel); if(!el) return;
  const isOverview=(sel==="#overviewMap");

  /* ── Dimensions ──────────────────────────────────────────────── */
  const w=Math.max(400,el.clientWidth||500);
  const h=isOverview?Math.max(300,el.clientHeight||340):Math.max(260,el.clientHeight||280);

  /* ── Skip full redraw if filter state hasn't changed ────────── */
  const cacheKey = _mapCacheKey(sel, mode, heatMetric);
  if (_mapCache[sel] && _mapCache[sel].key === cacheKey && el.querySelector('svg')) {
    return; /* SVG already up-to-date for this filter state */
  }
  _mapCache[sel] = { key: cacheKey };

  d3.select(sel).selectAll("*").remove();

  /* ── Pill switcher — only for airline/hotel, NOT for overview ── */
  if(!isOverview){
    const _switcherMetrics=mode==="airline"
      ?["airlineNPS","respondents","spendInc","aiAdopt","premium","booked"]
      :mode==="hotel"
      ?["hotelNPS","respondents","spendInc","aiAdopt","premium","booked"]
      :["respondents","spendInc","aiAdopt","booked","business","premium"];
    const _activeMetricPill=heatMetric||el.dataset.heatMetric||(mode==="airline"?"airlineNPS":mode==="hotel"?"hotelNPS":"respondents");
    const _pillBar=document.createElement("div");
    _pillBar.style.cssText="display:flex;flex-wrap:wrap;gap:5px;padding:4px 4px 6px;align-items:center;";
    _switcherMetrics.forEach(mk=>{
      const mcfg=METRIC_CFG[mk]; if(!mcfg)return;
      const isActive=mk===_activeMetricPill;
      const btn=document.createElement("button");
      btn.type="button"; btn.textContent=mcfg.label;
      btn.style.cssText=`padding:4px 11px;border-radius:20px;border:1px solid;cursor:pointer;font-size:9px;font-weight:${isActive?700:400};white-space:nowrap;background:${isActive?"#452080":"transparent"};color:${isActive?"#fff":"#6f5a9e"};border-color:${isActive?"#452080":"#c8c0dc"};`;
      btn.addEventListener("click",()=>renderGlobalMap(sel,mode,mk));
      _pillBar.appendChild(btn);
    });
    el.appendChild(_pillBar);
  }

  /* ── SVG ─────────────────────────────────────────────────────── */
  const svg=d3.select(sel).append("svg")
    .attr("width",w).attr("height",h)
    .attr("viewBox",`0 0 ${w} ${h}`)
    .style("display","block");

  /* ── GeoJSON setup ───────────────────────────────────────────── */
  let countries=null;
  if(WORLD){
    if(WORLD.type==="FeatureCollection") countries=WORLD;
    else if(window.topojson&&WORLD.objects?.countries) countries=topojson.feature(WORLD,WORLD.objects.countries);
  }
  const projection=d3.geoNaturalEarth1();
  if(countries?.features?.length){
    const fitFeatures=countries.features.filter(f=>f.properties?.name!=="Antarctica");
    projection.fitExtent([[6,6],[w-6,h-30]],{type:"FeatureCollection",features:fitFeatures});
  } else projection.scale(Math.min(w/6.4,h/3.1)).translate([w/2,h/2+4]);
  const path=d3.geoPath(projection);
  svg.insert("path", ":first-child")
    .datum({type:"Sphere"})
    .attr("d", d3.geoPath(projection))
    .attr("fill", "#f7f5fb")
    .attr("stroke", "none")
    .style("pointer-events", "none");
  const g=svg.append("g");
  attachMapZoomControls(el, svg, g);

  /* ── GeoJSON name aliases ────────────────────────────────────── */
  const GEO_NAME={"Russian Federation":"Russia","Korea, Republic of (South Korea)":"South Korea"};
  const geoName=m=>GEO_NAME[m]||m;
  const TINY=new Set(); // Bahrain and Singapore are real GeoJSON polygons

  /* ── Compute per-market metrics ──────────────────────────────── */
  const rows=rowFilter?activeRows().filter(rowFilter):activeRows();
  const safeRows=rows.length?rows:(DATA?DATA.records:[]);
  const byMarket={};
  MARKETS.forEach(m=>{
    const mr=safeRows.filter(r=>r.Market===m);
    if(!mr.length){byMarket[m]={n:0};return;}
    const n=mr.length;
    const npsCalc=key=>{
      const s=mr.map(r=>r[key]).filter(v=>typeof v==="number");
      return s.length?(s.filter(v=>v>=9).length-s.filter(v=>v<=6).length)/s.length*100:null;
    };
    byMarket[m]={
      n,
      airlineNPS:npsCalc("airlineNPS"),hotelNPS:npsCalc("hotelNPS"),
      spendInc:mr.filter(r=>/increase/i.test(r.spendChange||"")).length/n*100,
      aiAdopt:mr.filter(r=>/(extremely|somewhat) likely/i.test(r.aiLikelihood||"")).length/n*100,
      booked:mr.filter(r=>/already booked/i.test(r.planningStage||"")).length/n*100,
      business:mr.filter(r=>r["Trip Type"]==="BUSINESS").length/n*100,
      premium:mr.filter(r=>["Business class","First class"].includes(r.cabinClass||"")).length/n*100
    };
  });

  /* ── Active metric & colour scale ───────────────────────────── */
  const defaultMetric=mode==="airline"?"airlineNPS":mode==="hotel"?"hotelNPS":"respondents";
  const activeMetric=isOverview?"respondents":(heatMetric||el.dataset.heatMetric||defaultMetric);
  el.dataset.heatMetric=activeMetric;
  const cfg=METRIC_CFG[activeMetric]||METRIC_CFG.respondents;

  const getVal=m=>{
    const bm=byMarket[m]; if(!bm||!bm.n) return null;
    return activeMetric==="respondents"?bm.n:(bm[activeMetric]??null);
  };

  /* ── 5-bucket discrete palette for overview heat map ─────────── */
  const HEAT5=["#f7eadc","#efd4bd","#e7b985","#d7904d","#a95b2e"];
  const HEAT5_LABELS=["Low","Med-Low","Medium","Med-High","High"];

  let colorScale;
  if(isOverview){
    /* Compute all market values for quantile bucketing */
    const allVals=MARKETS.map(m=>getVal(m)).filter(v=>v!==null).sort((a,b)=>a-b);
    if(allVals.length){
      const q=d3.scaleQuantile().domain(allVals).range(HEAT5);
      colorScale=v=>q(v);
    } else {
      colorScale=()=>HEAT5[0];
    }
  } else {
    if(cfg.midpoint!==undefined){
      const pct=(cfg.midpoint-cfg.min)/(cfg.max-cfg.min);
      colorScale=d3.scaleLinear().domain([cfg.min,cfg.min+(cfg.max-cfg.min)*pct,cfg.max])
        .range([cfg.c0,cfg.c50||"#f5c842",cfg.c100]).clamp(true);
    } else {
      colorScale=d3.scaleLinear().domain([cfg.min,cfg.max]).range([cfg.c0,cfg.c100]).clamp(true);
    }
  }

  const selected=filterSelections.Market||[];
  const selectedSet=new Set(selected);
  const hasMarketSelection=selected.length>0;
  const SELECTED_MARKET_FILL=null; // preserve metric/sentiment fill
  const SELECTED_MARKET_STROKE="#530095";
  const marketOpacity=mn=>!hasMarketSelection||selectedSet.has(mn)?1:.18;
  const marketStrokeWidth=mn=>selectedSet.has(mn)?2.8:.6;
  const marketFilter=mn=>{
    if(!hasMarketSelection) return null;
    return selectedSet.has(mn) ? "drop-shadow(0 3px 7px rgba(83,0,149,.30))" : null;
  };
  const marketFill=mn=>{
    const v=getVal(mn);
    return v!==null?colorScale(v):"#ddd8ee";
  };
  const displayedMarketFill=mn=>marketFill(mn);
  const geoToMarket={};
  MARKETS.forEach(m=>{if(!TINY.has(m)) geoToMarket[geoName(m)]=m;});

  /* ── Draw world countries ────────────────────────────────────── */
  if(countries?.features?.length){
    /* ── Three-pass rendering: correct paint order ──────────────────
     Pass 1: All countries, area-sorted (large first = background).
             This draws the base world map correctly.
     Pass 2: Market countries ONLY, area-sorted, drawn again on top.
             Guarantees India always appears above China, Jordan above
             Saudi Arabia, UAE above Oman — regardless of GeoJSON order.
     Pass 3: Border strokes on top of all fills (clean separation).
  ── */
  function polyArea(feat){
    const geom=feat.geometry;
    if(!geom) return 0;
    const shoelace=ring=>Math.abs(ring.reduce((s,p,i,a)=>{const n=a[(i+1)%a.length];return s+p[0]*n[1]-n[0]*p[1];},0))/2;
    if(geom.type==="Polygon") return shoelace(geom.coordinates[0]);
    if(geom.type==="MultiPolygon") return Math.max(...geom.coordinates.map(p=>shoelace(p[0])));
    return 0;
  }

  const byAreaDesc=(a,b)=>polyArea(b)-polyArea(a);
  const allSorted=[...countries.features].sort(byAreaDesc);
  const marketFeatures=countries.features.filter(f=>(marketFromGeoFeature(f)||geoToMarket[f.properties.name])).sort(byAreaDesc);

  /* ── Pass 1: full world base layer ── */
  const worldG=g.append("g").attr("class","world-land");
  worldG.selectAll("path")
      .data(allSorted).join("path")
      .attr("d",path)
      .attr("data-market",f=>(marketFromGeoFeature(f)||geoToMarket[f.properties.name])||null)
      .attr("data-geoname",f=>f.properties?.name||null)
      .attr("fill",f=>{
        const mn=(marketFromGeoFeature(f)||geoToMarket[f.properties.name]);
        if(!mn) return "#e8e2f4";
        return displayedMarketFill(mn);
      })
      .attr("opacity",f=>{
        const mn=(marketFromGeoFeature(f)||geoToMarket[f.properties.name]);
        return mn ? marketOpacity(mn) : (hasMarketSelection ? .28 : 1);
      })
      .attr("stroke","#fff").attr("stroke-width",0.3)
      .style("cursor","default").style("pointer-events","none");

  /* ── Pass 2: market countries re-drawn on top ── */
  const marketG=g.append("g").attr("class","market-layer");
  marketG.selectAll("path")
      .data(marketFeatures).join("path")
      .attr("d",path)
      .attr("fill",f=>{
        const mn=(marketFromGeoFeature(f)||geoToMarket[f.properties.name]);
        return displayedMarketFill(mn);
      })
      .attr("opacity",f=>marketOpacity((marketFromGeoFeature(f)||geoToMarket[f.properties.name])))
      .attr("stroke",f=>selectedSet.has((marketFromGeoFeature(f)||geoToMarket[f.properties.name]))?SELECTED_MARKET_STROKE:"#fff")
      .attr("stroke-width",f=>marketStrokeWidth((marketFromGeoFeature(f)||geoToMarket[f.properties.name])))
      .style("cursor","pointer")
      .style("filter",f=>marketFilter((marketFromGeoFeature(f)||geoToMarket[f.properties.name])))
      .on("click",(e,f)=>{const mn=(marketFromGeoFeature(f)||geoToMarket[f.properties.name]);if(mn) selectMarketFromMap(mn);});

  /* ── Pass 3: border lines on top of all fills ── */
  g.append("g").attr("class","world-borders").selectAll("path")
      .data(allSorted).join("path")
      .attr("d",path)
      .attr("fill","none")
      .attr("stroke","rgba(255,255,255,0.6)")
      .attr("stroke-width",0.4)
      .style("pointer-events","none")
      .on("mousemove",(e,f)=>{
        const mn=(marketFromGeoFeature(f)||geoToMarket[f.properties.name]);if(!mn)return;
        const v=getVal(mn);if(v===null){hideTip();return;}
        const bm=byMarket[mn]||{};
        showTip(e,{label:mn,value:`${cfg.label}: ${cfg.fmt(v)}  (n=${bm.n})`},true);
      })
      .on("mouseleave",hideTip);
  }

  /* ── Tiny country dots ───────────────────────────────────────── */
  const tinyList=[]; // no synthetic BH/SG markers; use real polygons
  g.append("g").selectAll("g").data(tinyList).join("g")
    .attr("transform",m=>{const p=projection(MARKET_COORDS[m]);return`translate(${p[0]},${p[1]})`;})
    .style("cursor","pointer")
    .attr("opacity",m=>marketOpacity(m))
    .style("filter",m=>marketFilter(m))
    .call(s=>{
      s.append("circle").attr("r",5)
        .attr("fill",m=>displayedMarketFill(m))
        .attr("stroke",m=>selectedSet.has(m)?SELECTED_MARKET_STROKE:"#fff").attr("stroke-width",m=>selectedSet.has(m)?2.4:1.2);
      s.append("text").attr("x",6).attr("y",3).attr("font-size",7).attr("fill","#444")
        .text(m=>m==="Singapore"?"SG":"BH");
    })
    .on("click",(e,m)=>selectMarketFromMap(m))
    .on("mousemove",(e,m)=>{const v=getVal(m);if(v===null){hideTip();return;}const bm=byMarket[m]||{};showTip(e,{label:m,value:`${cfg.label}: ${cfg.fmt(v)}  (n=${bm.n})`},true);})
    .on("mouseleave",hideTip);

  /* ── Selected market callout (overview only; country polygons carry highlight) ─────── */
  selected.filter(selName=>MARKET_COORDS[selName]).forEach(selName=>{
    const p=projection(MARKET_COORDS[selName]);
    if(isOverview&&selected.length===1){
      /* Dark callout popup on map */
      const bm=byMarket[selName]||{};
      const v=getVal(selName);
      const cx=Math.min(w-175,Math.max(5,p[0]-80));
      const cy=Math.max(10,p[1]-82);
      const fo=svg.append("foreignObject")
        .attr("x",cx).attr("y",cy)
        .attr("width",170).attr("height",80);
      const div=fo.append("xhtml:div").attr("class","map-callout");
      div.html(`
        <div class="map-callout-title">${selName} — Selected</div>
        <div class="map-callout-tsi">n = ${bm.n||0} respondents</div>
        <div style="color:rgba(255,255,255,.7);font-size:8px;margin-top:3px">→ Click for source market breakdown</div>
      `);
    }
  });

  /* ── Gradient legend for airline/hotel/behaviour tabs ─ */
  if(!isOverview){
    /* Gradient legend for airline/hotel/behaviour tabs */
    const defs=svg.append("defs");
    const gid=`heatGrad${sel.replace(/\W/g,"")}${activeMetric}`;
    const grad=defs.append("linearGradient").attr("id",gid).attr("x1","0%").attr("x2","100%");
    if(cfg.c50){
      grad.append("stop").attr("offset","0%").attr("stop-color",cfg.c0);
      grad.append("stop").attr("offset","50%").attr("stop-color",cfg.c50);
      grad.append("stop").attr("offset","100%").attr("stop-color",cfg.c100);
    } else {
      grad.append("stop").attr("offset","0%").attr("stop-color",cfg.c0);
      grad.append("stop").attr("offset","100%").attr("stop-color",cfg.c100);
    }
    const legG=svg.append("g").attr("transform",`translate(14,${h-26})`);
    legG.append("rect").attr("width",120).attr("height",7).attr("rx",3).attr("fill",`url(#${gid})`);
    legG.append("text").attr("x",0).attr("y",18).attr("font-size",8).attr("fill","#8a7e98").text(cfg.fmt(cfg.min));
    legG.append("text").attr("x",120).attr("y",18).attr("font-size",8).attr("fill","#8a7e98").attr("text-anchor","end").text(cfg.fmt(cfg.max));
    legG.append("text").attr("x",130).attr("y",6).attr("font-size",8).attr("fill","#8a7e98").text("· "+cfg.label+" · click to filter");
  }
}

function renderMapInsight(sel,mode){
  const root=d3.select(sel); if(root.empty()) return;
  const isOverview=(sel==="#mapInsight");
  const market=selectedMarket();

  /* ── Overview: render full PPT-style Market Snapshot panel ───── */
  if(isOverview){
    const rows=activeRows();
    const mktRows=market&&market!=="All"?rows.filter(r=>r.Market===market):rows;
    const mktLabel=market&&market!=="All"?market:"All Markets";

    /* Trip type KPIs */
    const total=mktRows.length||1;
    const leisurePct=Math.round(mktRows.filter(r=>r["Trip Type"]==="LEISURE").length/total*100);
    const bizPct=Math.round(mktRows.filter(r=>r["Trip Type"]==="BUSINESS").length/total*100);
    const bleiPct=Math.round(mktRows.filter(r=>r["Trip Type"]==="BLEISURE").length/total*100);

    /* All matching destinations from Q3 (Normalized & English), sorted descending with top 5 on top */
    const destCounts={};
    mktRows.forEach(r=>{
      const dest=Array.isArray(r.Q3)?r.Q3:(r.Q3?[String(r.Q3)]:[]);
      dest.forEach(d=>{
        const raw=String(d||"").trim();
        if(!raw || raw==="Undecided") return;
        const k=normalizeDest(raw);
        if(k && k!=="Undecided") destCounts[k]=(destCounts[k]||0)+1;
      });
    });
    const allDests=Object.entries(destCounts).sort((a,b)=>b[1]-a[1]);

    root.html(`
      <div class="msnap-header">
        <h3>Source: ${mktLabel} — Market Snapshot</h3>
        ${market&&market!=="All"?`<span class="msnap-tag">${market.slice(0,8).toUpperCase()}</span>`:""}
      </div>
      <div class="msnap-kpis">
        <div class="msnap-kpi">
          <div class="msnap-kpi-label">Leisure Trips Planned</div>
          <div class="msnap-kpi-val leisure">${leisurePct}%</div>
        </div>
        <div class="msnap-kpi">
          <div class="msnap-kpi-label">Business Trips Planned</div>
          <div class="msnap-kpi-val business">${bizPct}%</div>
        </div>
        <div class="msnap-kpi">
          <div class="msnap-kpi-label">Bleisure Trips Planned</div>
          <div class="msnap-kpi-val bleisure">${bleiPct}%</div>
        </div>
      </div>
      <div class="msnap-divider"></div>
      <div class="msnap-dest-head" style="display:flex;justify-content:space-between;align-items:center;">
        <span>Destinations Considered (${allDests.length})</span>
        <span style="font-size:9px;color:#8a7e98;font-weight:700;">Top 5 featured</span>
      </div>
      <div class="msnap-dest-list">
        ${allDests.length?allDests.map(([name,cnt],i)=>`
          <div class="msnap-dest-item">
            <div class="msnap-dest-rank ${i===0?"rank1":(i<5?"rank-top5":"rank-other")}">${i+1}</div>
            <div class="msnap-dest-name" style="${i<5?'font-weight:700;color:#1e1530;':'color:#4a3f5c;'}">${escapeHtml(name)}</div>
            <div class="msnap-dest-count">${cnt} <span style="font-weight:normal;opacity:0.8;">(${Math.round(cnt/total*100)}%)</span></div>
          </div>
        `).join(""):`<div style="padding:12px;color:#8a7e98;font-size:9px">No destination data available</div>`}
      </div>
    `);
    return;
  }

  /* ── Other tabs: original map insight layout ──────────────────── */
  const allRows=activeRows();
  const title=mode==="source"?"Source market":mode==="airline"?"Airline POV":"Hotel POV";
  if(!market||market==="All"){
    let metricText,metricLabel;
    if(mode==="source"){
      metricText=`${allRows.length.toLocaleString()} respondents`;
      metricLabel="Global filtered base";
    } else {
      const key=mode==="airline"?"airlineNPS":"hotelNPS";
      const scores=allRows.map(r=>r[key]).filter(v=>typeof v==="number");
      const nps=scores.length?(scores.filter(v=>v>=9).length-scores.filter(v=>v<=6).length)/scores.length*100:0;
      metricText=`${d3.format(".0f")(nps)} NPS`;
      metricLabel="Global NPS · all markets";
    }
    root.html(`
      <div class="map-focus-name">All markets</div>
      <div class="map-focus-metric">${metricText}</div>
      <div class="map-focus-label">${metricLabel}</div>
      <div class="map-focus-hint">Click any country on the map to focus on a specific market.</div>`);
    return;
  }
  const metric=marketMetric(market,mode);
  const base=marketRows(market).length;
  const metricText=mode==="source"?`${metric.value.toLocaleString()} respondents`:`${d3.format(".0f")(metric.value)} NPS`;
  root.html(`
    <div class="map-focus-name">${escapeHtml(market)}</div>
    <div class="map-focus-metric">${metricText}</div>
    <div class="map-focus-label">${metric.label} · ${base.toLocaleString()} filtered sample base</div>
    <div class="map-focus-hint">${title} · Map values respect the other active filters.</div>`);
}


function selectMarketFromMap(market){
  if(typeof setRegionMarketSelection==="function"){
    setRegionMarketSelection([market]);
    return;
  }
  runDashboardUpdate(()=>{
    filterSelections.Market=[market];
    filterDim="Market"; activeSelections=[market]; segment=market;
    if(typeof invalidateRowCache==="function") invalidateRowCache();
    renderFilterMenu("Market"); updateFilterSummaries(); updateSegmentBase(); renderActive();
  },"Updating selected market...");
}

/* ---------- KPIs ---------- */

function renderKpis(){
  /* Compute all KPIs from live filtered records */
  const rows=activeRows();
  const nb=rows.length||1;
  const increase=rows.filter(r=>/increase/i.test(r.spendChange||"")).length/nb;
  const premium=byLabel("cabinClass","Premium economy")+byLabel("cabinClass","Business class")+byLabel("cabinClass","First class");
  const items=[
    ["Holiday-led trips",byLabel("tripPurpose","Holiday or vacation"),"Main purpose of next trip"],
    ["Still researching",byLabel("planningStage","researching destinations"),"Largest planning-stage cohort"],
    ["Travel in 1–3 months",byLabel("tripTiming","1–3 months"),"Near-term departure window"],
    ["Spend expected to rise",increase,"Any level of increase"],
    ["Premium cabin intent",premium,"Premium economy + Business + First"]
  ];
  d3.select("#kpis").selectAll("div.kpi").data(items).join("div").attr("class","kpi").html(d=>`<div class="kpi-label">${d[0]}</div><div class="kpi-value">${fmt(d[1])}</div><div class="kpi-sub">${d[2]} · ${selectionLabel(activeSelections)}</div>`);
  const research=byLabel("planningStage","researching"), booked=byLabel("planningStage","already booked");
  d3.select("#planningInsight").text(`${fmt(research)} researching · ${fmt(booked)} booked`);
}

/* ---------- chart primitives ---------- */
function dimensions(sel,height){const el=document.querySelector(sel),w=Math.max(300,el.clientWidth),m={t:12,r:48,b:24,l:165};return {w,h:height,m,iw:w-m.l-m.r,ih:height-m.t-m.b}}

function horizontalBars(sel,data,opt={}){
  const {w,h,m,iw,ih}=dimensions(sel,opt.height||280); const root=d3.select(sel); root.selectAll("*").remove();
  const svg=root.append("svg").attr("width",w).attr("height",h); const g=svg.append("g").attr("transform",`translate(${m.l},${m.t})`);
  const y=d3.scaleBand().domain(data.map(d=>d.label)).range([0,ih]).padding(.32), max=opt.max||Math.max(.1,d3.max(data,d=>d.value)*1.15), x=d3.scaleLinear().domain([0,max]).range([0,iw]);
  g.append("g").attr("class","gridline").call(d3.axisBottom(x).ticks(4).tickSize(ih).tickFormat("")).selectAll("line").attr("transform",`translate(0,${-ih})`);
  g.selectAll("rect").data(data).join("rect").attr("x",0).attr("y",d=>y(d.label)).attr("height",y.bandwidth()).attr("rx",5).attr("fill",(d,i)=>i===0?palette[0]:"#00B5AC").attr("width",d=>x(d.value)).on("mousemove",(e,d)=>showTip(e,d)).on("mouseleave",hideTip);
  g.selectAll(".val").data(data).join("text").attr("class","val").attr("x",d=>x(d.value)+7).attr("y",d=>y(d.label)+y.bandwidth()/2+4).text(d=>fmt(d.value)).attr("font-size",10.5).attr("font-weight",800).attr("fill","#354056");
  const gy=g.append("g").attr("class","axis").call(d3.axisLeft(y).tickSize(0));gy.select(".domain").remove();gy.selectAll("text").each(function(d){const s=d3.select(this),txt=d.length>31?d.slice(0,29)+"…":d;s.text(txt).attr("title",d)});
  g.append("g").attr("class","axis").attr("transform",`translate(0,${ih})`).call(d3.axisBottom(x).ticks(4).tickFormat(fmt));
}

function donut(sel,data,center,selected=[],options={}){
  const el=document.querySelector(sel),w=Math.max(300,el.clientWidth),h=285;d3.select(sel).selectAll("*").remove();const svg=d3.select(sel).append("svg").attr("width",w).attr("height",h);
  const r=Math.min(92,w*.24),cx=Math.min(w*.36,130),cy=140,pie=d3.pie().value(d=>d.value).sort(null),arc=d3.arc().innerRadius(r*.58).outerRadius(r);
  const g=svg.append("g").attr("transform",`translate(${cx},${cy})`);
  const paths=g.selectAll("path").data(pie(data)).join("path").attr("d",arc).attr("fill",(d,i)=>options.colors?.[i]||palette[i%palette.length]).attr("opacity",d=>selected.length&&!selected.includes(d.data.label)?0.42:1).attr("stroke","#fff").attr("stroke-width",d=>selected.length&&selected.includes(d.data.label)?4:2).style("cursor",options.onSliceClick?"pointer":"default").on("mousemove",(e,d)=>showTip(e,d.data)).on("mouseleave",hideTip).on("click",(e,d)=>{
    if(!options.onSliceClick)return;
    e.stopPropagation();
    options.onSliceClick(d.data);
  });
  const highlight=key=>paths.interrupt().transition().duration(180)
    .attr("transform",d=>{
      if(d.data.key!==key)return null;
      const [x,y]=arc.centroid(d);
      return `translate(${x*.12},${y*.12}) scale(1.08)`;
    })
    .attr("opacity",d=>d.data.key===key?1:0.42)
    .attr("stroke",d=>d.data.key===key?"#230B54":"#fff")
    .attr("stroke-width",d=>d.data.key===key?3.5:2);
  g.append("text").attr("text-anchor","middle").attr("class","donut-center").attr("y",0).text(fmt(d3.max(data,d=>d.value)||0));g.append("text").attr("text-anchor","middle").attr("class","donut-sub").attr("y",17).text(center);
  const leg=svg.append("g").attr("class","legend").attr("transform",`translate(${Math.max(cx+r+28,w*.52)},58)`);const li=leg.selectAll("g").data(data.slice(0,7)).join("g").attr("transform",(d,i)=>`translate(0,${i*28})`);li.append("circle").attr("r",5).attr("fill",(d,i)=>options.colors?.[i]||palette[i%palette.length]);li.append("text").attr("x",11).attr("y",4).text(d=>(d.label.length>26?d.label.slice(0,24)+"…":d.label)+`  ${fmt(d.value)}`);
  return {highlight};
}

function npsColor(v){return v>=50?"#12a594":v>=0?"#f59e57":"#d1495b";}

function gauge(sel,value,opt={}){
  const el=document.querySelector(sel),w=Math.max(260,el.clientWidth),h=210;d3.select(sel).selectAll("*").remove();
  const svg=d3.select(sel).append("svg").attr("width",w).attr("height",h);
  const cx=w/2, cy=h*.72, R=Math.min(100,w*.34);
  const domain=opt.domain||[0,1], color=opt.color||"#12a594";
  const frac=Math.max(0,Math.min(1,(value-domain[0])/(domain[1]-domain[0])));
  const arcBg=d3.arc().innerRadius(R*.72).outerRadius(R).startAngle(-Math.PI/2).endAngle(Math.PI/2);
  const arcFg=d3.arc().innerRadius(R*.72).outerRadius(R).startAngle(-Math.PI/2).endAngle(-Math.PI/2+frac*Math.PI);
  const g=svg.append("g").attr("transform",`translate(${cx},${cy})`);
  g.append("path").attr("d",arcBg).attr("fill","#eef1f6");
  g.append("path").attr("d",arcFg).attr("fill",color);
  g.append("text").attr("class","gauge-value").attr("text-anchor","middle").attr("y",-8).text(opt.format?opt.format(value):value);
  g.append("text").attr("class","gauge-label").attr("text-anchor","middle").attr("y",10).text(opt.label||"");
  svg.append("text").attr("class","gauge-sub").attr("text-anchor","middle").attr("x",cx).attr("y",h-6).text(opt.sub||"");
}

function scatter(sel,points,opt={}){
  const el=document.querySelector(sel),w=Math.max(320,el.clientWidth),h=340;d3.select(sel).selectAll("*").remove();
  const m={t:16,r:24,b:44,l:52},iw=w-m.l-m.r,ih=h-m.t-m.b;
  const svg=d3.select(sel).append("svg").attr("width",w).attr("height",h);
  const g=svg.append("g").attr("transform",`translate(${m.l},${m.t})`);
  const xExt=d3.extent(points,d=>d.x), yExt=d3.extent(points,d=>d.y);
  const pad=(a,b)=>{const p=Math.max(6,(b-a)*.25); return [a-p,b+p];};
  const [x0,x1]=pad(...xExt), [y0,y1]=pad(...yExt);
  const x=d3.scaleLinear().domain([x0,x1]).range([0,iw]);
  const y=d3.scaleLinear().domain([y0,y1]).range([ih,0]);
  const rMax=d3.max(points,d=>d.r)||1, rScale=d3.scaleSqrt().domain([0,rMax]).range([8,28]);
  g.append("g").attr("class","gridline").call(d3.axisBottom(x).ticks(5).tickSize(ih).tickFormat("")).selectAll("line").attr("transform",`translate(0,${-ih})`);
  g.append("g").attr("class","axis").attr("transform",`translate(0,${ih})`).call(d3.axisBottom(x).ticks(5).tickFormat(opt.xFormat||(d=>d)));
  g.append("g").attr("class","axis").call(d3.axisLeft(y).ticks(5).tickFormat(opt.yFormat||(d=>d)));
  svg.append("text").attr("transform",`translate(14,${m.t+ih/2}) rotate(-90)`).attr("text-anchor","middle").attr("font-size",10.5).attr("fill","#7a859a").text(opt.yLabel||"");
  g.selectAll("circle").data(points).join("circle").attr("class","scatter-dot").attr("cx",d=>x(d.x)).attr("cy",d=>y(d.y)).attr("r",d=>rScale(d.r)).attr("fill",(d,i)=>palette[i%palette.length]).attr("fill-opacity",d=>d.focus || (opt.focus && d.label===shortRegion(opt.focus)) ? .95 : .62)
    .on("mousemove",(e,d)=>showTip(e,{label:d.label,value:`${opt.xLabel}: ${(opt.xFormat||(v=>v))(d.x)} · ${opt.yLabel}: ${(opt.yFormat||(v=>v))(d.y)}`},true))
    .on("mouseleave",hideTip);
  g.selectAll(".scatter-label").data(points).join("text").attr("class","scatter-label").attr("x",d=>x(d.x)).attr("y",d=>y(d.y)-rScale(d.r)-6).attr("text-anchor","middle").text(d=>d.label);
}

function lineChart(sel,data,opt={}){
  const el=document.querySelector(sel),w=Math.max(300,el.clientWidth),H=opt.height||260;
  d3.select(sel).selectAll("*").remove();
  const m2={t:16,r:24,b:30,l:44},IW=w-m2.l-m2.r,IH=H-m2.t-m2.b;
  const svg=d3.select(sel).append("svg").attr("width",w).attr("height",H);
  const g=svg.append("g").attr("transform",`translate(${m2.l},${m2.t})`);
  const x=d3.scalePoint().domain(data.map(d=>d.x)).range([0,IW]).padding(.5);
  const y=d3.scaleLinear().domain([0,opt.max||d3.max(data,d=>d.y)*1.2]).range([IH,0]);
  g.append("g").attr("class","gridline").call(d3.axisLeft(y).ticks(4).tickSize(-IW).tickFormat("")).select(".domain").remove();
  g.append("g").attr("class","axis").attr("transform",`translate(0,${IH})`).call(d3.axisBottom(x));
  g.append("g").attr("class","axis").call(d3.axisLeft(y).ticks(4).tickFormat(fmt));
  const line=d3.line().x(d=>x(d.x)).y(d=>y(d.y)).curve(d3.curveMonotoneX);
  const area=d3.area().x(d=>x(d.x)).y0(IH).y1(d=>y(d.y)).curve(d3.curveMonotoneX);
  g.append("path").datum(data).attr("d",area).attr("fill","#12a594").attr("fill-opacity",.08);
  g.append("path").datum(data).attr("class","line-path").attr("d",line).attr("stroke","#12a594");
  g.selectAll("circle").data(data).join("circle").attr("class","line-dot").attr("cx",d=>x(d.x)).attr("cy",d=>y(d.y)).attr("r",d=>opt.focus && (d.x===opt.focus || (opt.focus==="25–44" && (d.x==="25-34"||d.x==="35-44"))) ? 7 : 5).attr("fill","#452080")
    .on("mousemove",(e,d)=>showTip(e,{label:d.x,value:d.y})).on("mouseleave",hideTip);
  g.selectAll(".val").data(data).join("text").attr("x",d=>x(d.x)).attr("y",d=>y(d.y)-12).attr("text-anchor","middle").attr("font-size",10.5).attr("font-weight",800).attr("fill","#354056").text(d=>fmt(d.y));
}

function verticalBars(sel,data,opt={}){
  const el=document.querySelector(sel);
  const ranked=[...(data||[])].filter(d=>Number.isFinite(+d.value)).sort((a,b)=>b.value-a.value);
  if(!el)return;
  const w=Math.max(300,el.clientWidth||300),h=opt.height||240,m={t:24,r:16,b:opt.bottom||58,l:44},iw=w-m.l-m.r,ih=h-m.t-m.b;
  d3.select(sel).selectAll("*").remove();
  if(!ranked.length){d3.select(sel).append("div").attr("class","empty-chart").text("No data available for this selection.");return;}
  const svg=d3.select(sel).append("svg").attr("width",w).attr("height",h).attr("viewBox",`0 0 ${w} ${h}`);
  const g=svg.append("g").attr("transform",`translate(${m.l},${m.t})`);
  const x=d3.scaleBand().domain(ranked.map(chartDisplayLabel)).range([0,iw]).padding(.28);
  const dataMax=d3.max(ranked,d=>+d.value)||0;
  const autoMax=dataMax<=0.6 ? 0.6 : Math.min(1,Math.ceil(dataMax*10)/10);
  const max=Number.isFinite(+opt.max) ? Math.max(dataMax,+opt.max) : autoMax;
  const y=d3.scaleLinear().domain([0,max]).range([ih,0]);
  g.append("g").attr("class","gridline").call(d3.axisLeft(y).ticks(4).tickSize(-iw).tickFormat("" )).select(".domain").remove();
  const key=chartFilterKey(sel),selected=key?chartFilters[key]:null;
  g.selectAll("rect.bar").data(ranked).join("rect").attr("class","bar")
    .attr("x",d=>x(chartDisplayLabel(d))).attr("y",d=>y(Math.max(0,+d.value))).attr("width",x.bandwidth()).attr("height",d=>Math.max(0,ih-y(Math.max(0,+d.value)))).attr("rx",5)
    .attr("fill",(d,i)=>chartColor(i,"bar"))
    .attr("opacity",d=>selectedOpacity(selected,chartFilterLabel(d)))
    .style("cursor",key?"pointer":"default")
    .on("click",(e,d)=>{e.stopPropagation();if(key)toggleChartFilter(key,chartFilterLabel(d));})
    .on("mousemove",(e,d)=>showTip(e,{...d,label:chartDisplayLabel(d)})).on("mouseleave",hideTip);
  g.selectAll("text.val").data(ranked).join("text").attr("class","val")
    .attr("x",d=>x(chartDisplayLabel(d))+x.bandwidth()/2).attr("y",d=>Math.max(11,y(Math.max(0,+d.value))-6))
    .attr("text-anchor","middle").attr("font-size",10).attr("font-weight",800).attr("fill","#354056").text(d=>fmt(d.value));
  const gx=g.append("g").attr("class","axis").attr("transform",`translate(0,${ih})`).call(d3.axisBottom(x).tickSize(0));
  gx.classed("x-axis-hidden", false);
  gx.select(".domain").remove();
  gx.selectAll("text").each(function(d){
    const text=d3.select(this), words=String(d).split(/\s+/), lines=[];
    let line="";
    words.forEach(word=>{
      const next=line?`${line} ${word}`:word;
      if(next.length>14 && line){ lines.push(line); line=word; }
      else line=next;
    });
    if(line) lines.push(line);
    const shown=lines.slice(0,2);
    if(lines.length>2) shown[1]=shown[1].replace(/\s+\S*$/,"") + "…";
    text.text(null).attr("title",d).attr("font-size",10.5).attr("font-weight",800).style("display",null);
    shown.forEach((part,i)=>text.append("tspan").attr("x",0).attr("dy",i?12:10).text(part));
  });
  g.append("g").attr("class","axis").call(d3.axisLeft(y).ticks(4).tickFormat(fmt));
}

function radar(sel,axes,series){
  const el=document.querySelector(sel); if(!el)return;
  const w=Math.max(320,el.clientWidth),h=320;
  d3.select(sel).selectAll("*").remove();
  const svg=d3.select(sel).append("svg").attr("width",w).attr("height",h);
  const cx=w/2-30,cy=h/2-4,R=Math.min(w,h)/2-58;
  const angle=i=>(Math.PI*2*i/axes.length)-Math.PI/2;
  const rScale=d3.scaleLinear().domain([0,1]).range([0,R]);
  const g=svg.append("g").attr("transform",`translate(${cx},${cy})`);
  [.25,.5,.75,1].forEach(ringVal=>{
    const pts=axes.map((a,i)=>{const r=rScale(ringVal);return `${Math.cos(angle(i))*r},${Math.sin(angle(i))*r}`;}).join(" ");
    g.append("polygon").attr("points",pts).attr("fill","none").attr("stroke","#e3ddf0").attr("stroke-width",1);
  });
  axes.forEach((a,i)=>{
    const x=Math.cos(angle(i))*R,y=Math.sin(angle(i))*R;
    g.append("line").attr("x1",0).attr("y1",0).attr("x2",x).attr("y2",y).attr("stroke","#e3ddf0");
    g.append("text").attr("x",Math.cos(angle(i))*(R+18)).attr("y",Math.sin(angle(i))*(R+18)).attr("text-anchor","middle").attr("font-size",9).attr("font-weight",700).attr("fill","#6f637c").text(a.label);
  });
  series.forEach(s=>{
    const pts=axes.map((a,i)=>{const v=Math.max(0,Math.min(1,s.values[a.key]||0));const r=rScale(v);return [Math.cos(angle(i))*r,Math.sin(angle(i))*r];});
    g.append("polygon").attr("points",pts.map(p=>p.join(",")).join(" ")).attr("fill",s.color).attr("fill-opacity",.16).attr("stroke",s.color).attr("stroke-width",2);
    g.selectAll(null).data(axes).join("circle").attr("cx",(a,i)=>pts[i][0]).attr("cy",(a,i)=>pts[i][1]).attr("r",3.5).attr("fill",s.color)
      .on("mousemove",(e,a)=>showTip(e,{label:`${s.name} · ${a.label}`,value:fmt(s.values[a.key]||0)},true))
      .on("mouseleave",hideTip);
  });
  const leg=svg.append("g").attr("transform",`translate(${w-150},16)`);
  const li=leg.selectAll("g").data(series).join("g").attr("transform",(d,i)=>`translate(0,${i*17})`);
  li.append("circle").attr("r",5).attr("fill",d=>d.color);
  li.append("text").attr("x",10).attr("y",4).attr("font-size",9).attr("font-weight",700).attr("fill","#554a62").text(d=>d.name);
}

/* ---------- PNG export ---------- */
function addExportButtons(){
  document.querySelectorAll(".card").forEach(card=>{
    if(!card.querySelector(".chart"))return;
    const head=card.querySelector(".card-head"); if(!head||head.querySelector(".card-head-actions"))return;
    const actions=document.createElement("div"); actions.className="card-head-actions";
    const note=head.querySelector(".mini-note"); if(note)actions.appendChild(note);
    const btn=document.createElement("button");
    btn.type="button"; btn.className="export-btn"; btn.title="Download chart as PNG"; btn.textContent="⬇";
    btn.addEventListener("click",()=>exportChartPNG(card.querySelector(".chart"),card.querySelector("h2")?.textContent||"chart"));
    actions.appendChild(btn); head.appendChild(actions);
  });
}
function exportChartPNG(container,name){
  const svg=container?.querySelector("svg"); if(!svg)return;
  const clone=svg.cloneNode(true);
  clone.setAttribute("xmlns","http://www.w3.org/2000/svg");
  const bg=document.createElementNS("http://www.w3.org/2000/svg","rect");
  bg.setAttribute("width","100%"); bg.setAttribute("height","100%"); bg.setAttribute("fill","#ffffff");
  clone.insertBefore(bg,clone.firstChild);
  const svgData=new XMLSerializer().serializeToString(clone);
  const svgBlob=new Blob([svgData],{type:"image/svg+xml;charset=utf-8"});
  const url=URL.createObjectURL(svgBlob);
  const img=new Image();
  img.onload=()=>{
    const scale=2;
    const width=svg.clientWidth||parseFloat(svg.getAttribute("width"))||600;
    const height=svg.clientHeight||parseFloat(svg.getAttribute("height"))||300;
    const canvas=document.createElement("canvas");
    canvas.width=width*scale; canvas.height=height*scale;
    const ctx=canvas.getContext("2d"); ctx.scale(scale,scale);
    ctx.fillStyle="#ffffff"; ctx.fillRect(0,0,width,height);
    ctx.drawImage(img,0,0,width,height);
    URL.revokeObjectURL(url);
    canvas.toBlob(blob=>{
      const a=document.createElement("a");
      a.href=URL.createObjectURL(blob);
      a.download=`${String(name).trim().replace(/\s+/g,"_").toLowerCase()}.png`;
      document.body.appendChild(a); a.click(); a.remove();
    });
  };
  img.onerror=()=>URL.revokeObjectURL(url);
  img.src=url;
}

/* ---------- composite panels ---------- */
function spend(sel="#spendChart"){
  const raw=q("spendChange"), inc=raw.filter(d=>d.label.startsWith("Will increase")).reduce((a,b)=>a+b.value,0), same=byLabel("spendChange","remain the same"), dec=raw.filter(d=>d.label.startsWith("Will decrease")).reduce((a,b)=>a+b.value,0), unsure=byLabel("spendChange","Can’t say");
  const data=[{label:"Increase",value:inc},{label:"Same",value:same},{label:"Decrease",value:dec},{label:"Unsure",value:unsure}]; horizontalBars(sel,data,{height:250,max:1});
}
function decision(){
  const data=q("decisionFactors").sort((a,b)=>b.value-a.value);
  const listEl=d3.select("#decisionList");
  if(!listEl.empty()){listEl.selectAll(".rank-item").data(data.slice(0,6)).join("div").attr("class","rank-item").html((d,i)=>`<div class="rank-num">${i+1}</div><div class="rank-label">${d.label}</div><div class="rank-value">${fmt(d.value)}</div>`);}
}

/* ---------- tooltip / util ---------- */
function showTip(e,d,raw){tooltip.style("opacity",1).html(`<strong>${d.label}</strong><br>${raw?d.value:fmt(d.value)+" · "+selectionLabel(activeSelections)}`).style("left",`${e.clientX+12}px`).style("top",`${e.clientY+12}px`)}
function hideTip(){tooltip.style("opacity",0)}
function debounce(fn,ms){let t;return()=>{clearTimeout(t);t=setTimeout(fn,ms)}}

let _dashboardBusyDepth=0;
function ensureDashboardLoader(){
  let loader=document.getElementById("dashboardLoaderOverlay");
  if(loader) return loader;
  loader=document.createElement("div");
  loader.id="dashboardLoaderOverlay";
  loader.className="dashboard-loader-overlay";
  loader.innerHTML=`
    <div class="dashboard-loader-box" role="status" aria-live="polite">
      <span class="dashboard-loader-spinner"></span>
      <strong>Updating dashboard...</strong>
      <small>Recalculating filters, maps, gauges and tables</small>
    </div>`;
  document.body.appendChild(loader);
  return loader;
}
function setDashboardBusy(active,text="Updating dashboard..."){
  const loader=ensureDashboardLoader();
  if(active) _dashboardBusyDepth++;
  else _dashboardBusyDepth=Math.max(0,_dashboardBusyDepth-1);
  loader.querySelector("strong").textContent=text;
  const busy=_dashboardBusyDepth>0;
  document.body.classList.toggle("dashboard-is-loading",busy);
  loader.classList.toggle("is-active",busy);
}
function ensureActiveDashboardData(){
  if(!DATA) return Promise.resolve();
  const pending=[ensureOptionalScriptsForTab(currentTab)];
  if(currentTab==="airline"){
    pending.push(ensureMatrixLoaded("Q18"));
    pending.push(loadAirlineSentimentData());
    pending.push(loadAirlinePeriodSentimentData());
  }
  if(currentTab==="hotel"){
    pending.push(ensureMatrixLoaded("Q24"));
    pending.push(loadHotelSentimentData());
    pending.push(loadHotelPeriodSentimentData());
  }
  if(currentTab==="social") pending.push(loadSocialData());
  if(currentTab==="segments" && !DATA.recordsReady) pending.push(loadRecordChunksInBackground());
  if(currentTab==="overview"||currentTab==="destination"||currentTab==="airline"||currentTab==="hotel") pending.push(loadWorld());
  return Promise.allSettled(pending);
}
window.ensureActiveDashboardData=ensureActiveDashboardData;
function runDashboardUpdate(fn,text="Updating dashboard..."){
  setDashboardBusy(true,text);
  return new Promise(resolve=>{
    requestAnimationFrame(()=>{
      let result;
      try{
        result=fn&&fn();
      }catch(err){
        setDashboardBusy(false,text);
        throw err;
      }
      Promise.resolve(result).then(()=>ensureActiveDashboardData()).then(()=>{
        if(DATA) renderActive();
      }).finally(()=>{
        requestAnimationFrame(()=>setTimeout(()=>{
          setDashboardBusy(false,text);
          resolve(result);
        },80));
      });
    });
  });
}
window.runDashboardUpdate=runDashboardUpdate;

/* ---------- NEW EXCEL DATA ENGINE / MULTI-FILTER INTERACTIONS ---------- */
let chartFilters = {};
let ignoreDashboardFilters = false;
let activeSegmentView = "age";
let planBudgetReasonMode = "";

function filterOptions(cfg){
  if(!DATA) return [];
  if(cfg.value==="Class"){
    return currentTab==="hotel"
      ? (DATA.filterOptions.Class||[]).filter(x=>(DATA.filterOptions.Class||[]).includes(x) && (DATA.filterOptions.hotelClass||[]).includes(x))
      : (DATA.filterOptions.Class||[]).filter(x=>(DATA.filterOptions.cabinClass||[]).includes(x));
  }
  return DATA.filterOptions?.[cfg.value] || [];
}
function rowMatchesDimension(r,dim,vals){
  if(!vals || !vals.length) return true;
  if(dim==="Class"){
    const v=currentTab==="hotel"?r.accommodation:r.cabinClass;
    return vals.includes(v);
  }
  if(dim==="Age Group" && vals.includes("25–44")){
    const allowed=vals.flatMap(v=>v==="25–44"?["25-34","35-44"]:[v]);
    return allowed.includes(r[dim]);
  }
  return vals.includes(r[dim]);
}
function passesRecord(r,skipDim=null){
  if(ignoreDashboardFilters) return true;
  for(const [dim,vals] of Object.entries(filterSelections)){
    if(dim===skipDim || !vals || !vals.length) continue;
    if(!rowMatchesDimension(r,dim,vals)) return false;
  }
  for(const [key,label] of Object.entries(chartFilters)){
    if(!questionMatches(r,key,label)) return false;
  }
  return true;
}
/* ── Memoized activeRows ─────────────────────────────────────────
   Computes the filtered record set once per filter-state change.
   All 51 calls to activeRows() per render now return a cached array
   instead of running 1,417 passesRecord evaluations each time.
   Cache is invalidated by invalidateRowCache() on every filter change.
   ─────────────────────────────────────────────────────────────── */
let _rowCache = null;
let _rowCacheKey = null;
function _filterCacheKey() {
  return JSON.stringify(filterSelections) + '|' + JSON.stringify(chartFilters) + '|' + currentTab;
}
function invalidateRowCache() {
  _rowCache = null; _rowCacheKey = null;
  if (typeof invalidateMapCache === 'function') invalidateMapCache();
  /* Reset sentiment cache so new market loads fresh chunk */
  if (typeof _sentData !== 'undefined') { window._sentData = null; window._sentMarket = null; }
}
function activeRows() {
  if (!DATA?.records?.length) return [];
  const key = _filterCacheKey();
  if (_rowCache && _rowCacheKey === key) return _rowCache;
  _rowCache = DATA.records.filter(r => passesRecord(r));
  _rowCacheKey = key;
  return _rowCache;
}
function contextRows(skipDim=null) {
  if (!skipDim) return activeRows();
  return (DATA?.records||[]).filter(r=>passesRecord(r,skipDim));
}
function questionMatches(r,key,label){
  if(key==="BudgetChangeMode"){
    const value=clean(r.Q10||r.spendChange).toLowerCase();
    const mode=clean(label).toLowerCase();
    if(mode==="dec") return value.includes("decrease");
    if(mode==="same") return value.includes("same");
    if(mode==="inc") return value.includes("increase");
    return true;
  }
  if(key==="Q18" || key==="Q24") return matrixRowMatches(r,key,label);
  if(key==="Q8a") {
    const def=surveyDefinition(key);
    const idx=(def?.items||[]).findIndex(it=>clean(it.label)===clean(label));
    return idx>=0 && Array.isArray(r[key]) && Number(r[key][idx])===1;
  }
  if(key==="Q10a") return Number(r[key])===Number(label);
  if(key==="Age Group") return label==="25–44" ? ["25-34","35-44"].includes(r["Age Group"]) : clean(r["Age Group"])===clean(label);
  if(key==="Region") return clean(r.Region)===clean(label) || clean(shortRegion(r.Region))===clean(label);
  if(key==="aiLikelihood" && label==="Top 2 Box") return ["Extremely likely","Somewhat likely"].includes(clean(r[key]));
  if(key==="aiLikelihood" && label==="Bottom 2 Box") return ["Somewhat unlikely","Extremely unlikely"].includes(clean(r[key]));
  if(key==="airlineLoyaltyImportance" || key==="hotelLoyaltyImportance") {
    if(label==="NET : Top 2 Box") return ["Extremely important","Very important"].includes(clean(r[key]));
    if(label==="NET : Bottom 2 Box") return ["Slightly important","Not at all important"].includes(clean(r[key]));
  }
  if(key==="Q3" || key==="Q3a") {
    const arr = Array.isArray(r[key]) ? r[key] : (r[key] ? [r[key]] : []);
    return arr.some(x => {
      const norm = typeof normalizeDest === "function" ? normalizeDest(x) : String(x || "").trim();
      return clean(norm) === clean(label) || clean(x) === clean(label);
    });
  }
  if(key==="assocWord") {
    const exps = Array.isArray(r.experiences) ? r.experiences : (Array.isArray(r.Q12) ? r.Q12 : [r.experiences || r.Q12]);
    const decs = Array.isArray(r.decisionFactors) ? r.decisionFactors : (Array.isArray(r.Q9) ? r.Q9 : [r.decisionFactors || r.Q9]);
    const str = [...exps, ...decs, r.Companion, r.Children, r.bookingChannels].filter(Boolean).join(" ").toLowerCase();
    const target = clean(label).toLowerCase();
    return str.includes(target);
  }
  const v=r[key];
  if(Array.isArray(v)) return v.includes(label);
  if(key==="airlineNPS" || key==="hotelNPS" || key==="Q15a" || key==="Q21a"){
    if(label==="NPS Score") return Number.isFinite(Number(v));
    const n=Number(String(label).match(/\d+/)?.[0]);
    return Number(v)===n;
  }
  return clean(v)===clean(label);
}

function q(key){
  const rows=activeRows(), def=DATA.questions[key];
  if(!def) return [];
  if(def.type==="multi"){
    return def.items.map(it=>({label:clean(it.label),value:rows.length?rows.filter(r=>Array.isArray(r[key])&&r[key].includes(it.label)).length/rows.length:0}));
  }
  if(def.type==="nps"){
    const vals=rows.map(r=>r[key]).filter(v=>Number.isFinite(v));
    const out=[];
    for(let n=0;n<=10;n++) out.push({label:String(n),value:vals.length?vals.filter(v=>v===n).length/vals.length:0});
    const score=vals.length?vals.reduce((s,v)=>s+(v>=9?1:v<=6?-1:0),0)/vals.length*100:0;
    out.push({label:"NPS Score",value:score});
    return out;
  }
  const counts=new Map();
  rows.forEach(r=>{const v=clean(r[key]);if(v)counts.set(v,(counts.get(v)||0)+1);});
  return [...counts.entries()].map(([label,count])=>({label,value:rows.length?count/rows.length:0}));
}
function valueFor(key,needle,seg){
  const saved=ignoreDashboardFilters;
  ignoreDashboardFilters=true;
  const records=DATA.records.filter(r=>{
    if(seg==="Total"||seg==null) return true;
    if(REGIONS.includes(seg)) return r.Region===seg;
    if(AGES.includes(seg)) return r["Age Group"]===seg;
    if((DATA.filterOptions?.Market||[]).includes(seg)) return r.Market===seg;
    return true;
  });
  ignoreDashboardFilters=saved;
  const def=DATA.questions[key];
  if(!def) return 0;
  if(def.type==="nps"){
    const vals=records.map(r=>r[key]).filter(v=>Number.isFinite(v));
    if(needle==="NPS Score") return vals.length?vals.reduce((s,v)=>s+(v>=9?1:v<=6?-1:0),0)/vals.length*100:0;
    const n=Number(String(needle).match(/\d+/)?.[0]); return vals.length?vals.filter(v=>v===n).length/vals.length:0;
  }
  if(def.type==="multi"){
    const item=def.items.find(it=>clean(it.label)===clean(needle));
    return records.length&&item?records.filter(r=>Array.isArray(r[key])&&r[key].includes(item.label)).length/records.length:0;
  }
  if(def.type==="single"){
    if(needle==="Top 2 Box"||needle==="Bottom 2 Box") return 0;
    const n=records.filter(r=>clean(r[key])===clean(needle)).length;
    return records.length?n/records.length:0;
  }
  return 0;
}
function baseFor(key,seg){
  const saved=ignoreDashboardFilters;
  ignoreDashboardFilters=true;
  let n=0;
  if(seg==="Total"||seg==null) n=DATA.records.length;
  else if(REGIONS.includes(seg)) n=DATA.records.filter(r=>r.Region===seg).length;
  else if((DATA.filterOptions?.Market||[]).includes(seg)) n=DATA.records.filter(r=>r.Market===seg).length;
  else if(AGES.includes(seg)) n=DATA.records.filter(r=>r["Age Group"]===seg).length;
  else if(DATA.filterOptions?.[filterDim]?.includes(seg)) n=DATA.records.filter(r=>filterDim==="Class"?(currentTab==="hotel"?r.accommodation:r.cabinClass):r[filterDim]===seg).length;
  ignoreDashboardFilters=saved;
  return n;
}
function segmentValue(row,key){
  return Number(row?.value||0);
}
function baseForSelection(key,sel){ return baseFor(key,sel); }

function setFilterDim(dim){
  filterDim=dim;
  const cfg=FILTER_CONFIG.find(f=>f.value===dim)||FILTER_CONFIG[0];
  const valid=filterOptions(cfg);
  filterSelections[dim]=(filterSelections[dim]||[]).filter(v=>valid.includes(v));
  activeSelections=[...(filterSelections[dim]||[])];
  segment=selectionLabel(activeSelections);
  updateFilterSummaries(); updateSegmentBase(); renderActive();
}
function initFilterState(){
  FILTER_CONFIG.forEach(cfg=>{
    const opts=filterOptions(cfg);
    const def=cfg.default||[];
    filterSelections[cfg.value]=def.filter(v=>opts.includes(v));
  });
}
function resetFilters(){
  chartFilters={};
  FILTER_CONFIG.forEach(cfg=>{
    const opts=filterOptions(cfg);
    const def=cfg.default||[];
    filterSelections[cfg.value]=def.filter(v=>opts.includes(v));
  });
  setFilterDim("Market");
  buildFilterControlsCascade();
}
function selectionLabel(values){
  if(!values||!values.length)return "All";
  if(values.length===1)return values[0];
  if(values.length===2)return values.join(", ");
  return `${values.length} selected`;
}
function updateSegmentBase(){
  const rows=activeRows();
  d3.select("#segmentBase").text(rows.length?`Active: ${rows.length.toLocaleString()} respondents`:"No respondents");
  d3.select("#chipClear").attr("hidden",Object.keys(chartFilters).length===0 && Object.keys(filterSelections).every(k=>!(filterSelections[k]||[]).length)?true:null);
}
function isDefaultFilter(){
  return Object.values(filterSelections).every(v=>!v.length) && !Object.keys(chartFilters).length;
}
function toggleChartFilter(key,label){
  if(!key || !label || label==="NPS Score") return;
  invalidateRowCache();
  if(chartFilters[key]===label) {
    delete chartFilters[key];
    if(key==="BudgetChangeMode") planBudgetReasonMode="";
  } else {
    chartFilters[key]=label;
    if(key==="BudgetChangeMode") planBudgetReasonMode=label==="dec"||label==="inc"?label:"same";
  }
  renderActive(); updateFilterSummaries(); updateSegmentBase();
}
function chartFilterKey(sel){
  const id=String(sel).replace(/^#/,"");
  const map={
    planningChart:"planningStage",purposeChart:"tripPurpose",timingChart:"tripTiming",spendChart:"spendChange",planBudgetDonut:"BudgetChangeMode",
    infoChart:"infoChannels",companionChart:"travelCompanions",bookingChart:"bookingChannels",decisionList:"decisionFactors",decisionChart:"decisionFactors",
    experienceChart:"experiences",leadTimeChart:"planningLeadTime",aiTasksChart:"aiTasks",
    carrierChart:"airlineCarrier",airlineConsiderChart:"airlineConsiderations",cabinChart:"cabinClass",
    airlineLoyaltyChart:"airlineLoyaltyImportance",airlineStrategyChart:"airlineStrategies",
    stayChart:"accommodation",hotelConsiderChart:"hotelConsiderations",hotelLoyaltyChart:"hotelLoyaltyImportance",
    hotelStrategyChart:"hotelStrategies",hotelFeaturesChart:"hotelLoyaltyFeatures",hotelBrandChart:"hotelBrand",
    regionSpendBar:"Region",regionResearchBar:"Region",ageLine:"Age Group"
  };
  return map[id]||null;
}
function addChartClick(sel,selection){
  const key=chartFilterKey(sel);
  if(key) toggleChartFilter(key,selection);
}
function topN(arr,n){ return [...arr].sort((a,b)=>b.value-a.value).slice(0,n); }

/* replace chart primitives with versions that support click-to-filter and full scrolling */
function dimensions(sel,height){
  const el=document.querySelector(sel),w=Math.max(300,el.clientWidth),m={t:12,r:55,b:28,l:180};
  return {w,h:Math.max(height, (el && el.dataset && el.dataset.rows ? +el.dataset.rows*28+55 : height)),m,iw:w-m.l-m.r,ih:Math.max(40,Math.max(height,(el?.dataset?.rows?+el.dataset.rows*28+55:height))-m.t-m.b)};
}
function horizontalBars(sel,data,opt={}){
  const el=document.querySelector(sel);
  const ranked=[...(data||[])].filter(d=>Number.isFinite(+d.value)).sort((a,b)=>b.value-a.value);
  if(el) el.dataset.rows=ranked.length;
  const {w,h,m,iw,ih}=dimensions(sel,Math.max(opt.height||280,ranked.length*28+55));
  const root=d3.select(sel); root.selectAll("*").remove();
  if(!ranked.length){ root.append("div").attr("class","empty-chart").text("No data available for this selection."); return; }
  const svg=root.append("svg").attr("width",w).attr("height",h);
  const g=svg.append("g").attr("transform",`translate(${m.l},${m.t})`);
  const y=d3.scaleBand().domain(ranked.map(d=>d.label)).range([0,ih]).padding(.28);
  const max=opt.max||Math.max(.1,d3.max(ranked,d=>d.value)||0)*1.15;
  const x=d3.scaleLinear().domain([0,max]).range([0,iw]);
  g.append("g").attr("class","gridline").call(d3.axisBottom(x).ticks(4).tickSize(ih).tickFormat("")).selectAll("line").attr("transform",`translate(0,${-ih})`);
  const key=chartFilterKey(sel);
  g.selectAll("rect").data(ranked).join("rect")
    .attr("x",0).attr("y",d=>y(d.label)).attr("height",y.bandwidth()).attr("rx",5)
    .attr("fill",(d,i)=>chartColor(i,"horizontal"))
    .attr("opacity",d=>selectedOpacity(chartFilters[key],d.label))
    .attr("width",d=>x(Math.max(0,d.value)))
    .style("cursor",key?"pointer":"default")
    .on("click",(e,d)=>{e.stopPropagation(); if(key) toggleChartFilter(key,d.label);})
    .on("mousemove",(e,d)=>showTip(e,d)).on("mouseleave",hideTip);
  g.selectAll(".val").data(ranked).join("text").attr("class","val")
    .attr("x",d=>Math.min(iw-2,x(d.value)+7)).attr("y",d=>y(d.label)+y.bandwidth()/2+4)
    .text(d=>fmt(d.value)).attr("font-size",10.5).attr("font-weight",800).attr("fill","#354056");
  const gy=g.append("g").attr("class","axis").call(d3.axisLeft(y).tickSize(0)); gy.select(".domain").remove();
  gy.selectAll("text").each(function(d){const s=d3.select(this),t=d.length>42?d.slice(0,40)+"…":d;s.text(t).attr("title",d);});
  g.append("g").attr("class","axis").attr("transform",`translate(0,${ih})`).call(d3.axisBottom(x).ticks(4).tickFormat(fmt));
}
function donut(sel,data,center,selected=[],options={}){
  const el=document.querySelector(sel); if(!el)return;
  el.classList.add("donut-chart");
  const w=Math.max(300,el.clientWidth),size=Math.min(190,Math.max(150,w*.34));
  d3.select(sel).selectAll("*").remove();
  const svg=d3.select(sel).append("svg").attr("width",w).attr("height",size+8).attr("viewBox",`0 0 ${w} ${size+8}`);
  const r=size*.38,cx=w/2,cy=size/2+2,pie=d3.pie().value(d=>d.value).sort(null),arc=d3.arc().innerRadius(r*.58).outerRadius(r);
  const key=options.onSliceClick?null:chartFilterKey(sel);
  const g=svg.append("g").attr("transform",`translate(${cx},${cy})`);
  const paths=g.selectAll("path").data(pie(data)).join("path").attr("d",arc)
    .attr("fill",(d,i)=>d.data.color||options.colors?.[i]||chartColor(i))
    .attr("opacity",d=>selected.length&&!selected.includes(d.data.label)?0.42:1)
    .attr("stroke","#fff").attr("stroke-width",d=>selected.length&&selected.includes(d.data.label)?4:2)
    .style("cursor",d=>key||options.onSliceClick&&d.data.key!=="same"?"pointer":"default")
    .on("click",(e,d)=>{
      e.stopPropagation();
      if(options.onSliceClick){if(d.data.key!=="same")options.onSliceClick(d.data);}
      else if(key)toggleChartFilter(key,d.data.key||d.data.label);
    })
    .on("mousemove",(e,d)=>showTip(e,d.data)).on("mouseleave",hideTip);
  const highlight=selectedKey=>paths.interrupt().transition().duration(180)
    .attr("transform",d=>{
      if(d.data.key!==selectedKey)return null;
      const [x,y]=arc.centroid(d);
      return `translate(${x*.12},${y*.12}) scale(1.08)`;
    })
    .attr("opacity",d=>d.data.key===selectedKey?1:0.42)
    .attr("stroke",d=>d.data.key===selectedKey?"#230B54":"#fff")
    .attr("stroke-width",d=>d.data.key===selectedKey?3.5:2);
  g.append("text").attr("text-anchor","middle").attr("class","donut-center").attr("y",0).text(fmt(d3.max(data,d=>d.value)||0));
  g.append("text").attr("text-anchor","middle").attr("class","donut-sub").attr("y",17).text(center);
  const legend=d3.select(sel).append("div").attr("class","donut-legend");
  const li=legend.selectAll("div").data(data).join("div").attr("class","donut-legend-item");
  li.append("span").attr("class","donut-legend-swatch").style("background",(d,i)=>d.color||options.colors?.[i]||chartColor(i)).style("opacity",d=>selected.length&&!selected.includes(d.label)?0.42:1);
  li.append("span").attr("class","donut-legend-label").text(d=>d.label);
  li.append("span").attr("class","donut-legend-value").text(d=>fmt(d.value));
  li.style("cursor",d=>key||options.onSliceClick&&d.key!=="same"?"pointer":"default")
    .on("click",(e,d)=>{e.stopPropagation();if(options.onSliceClick){if(d.key!=="same")options.onSliceClick(d);}else if(key)toggleChartFilter(key,d.key||d.label);});
  return {highlight};
}

/* KPI and special helpers */
function byLabel(key,needle){
  return q(key).find(d=>d.label.toLowerCase().includes(String(needle).toLowerCase()))?.value||0;
}
function spendIncreaseCurrent(){
  return q("spendChange").filter(d=>d.label.startsWith("Will increase")).reduce((a,b)=>a+b.value,0);
}
function regionSpendIncrease(seg){
  return valueFor("spendChange","Will increase",seg) + valueFor("spendChange","Will increase moderately",seg) + valueFor("spendChange","Will increase slightly",seg) + valueFor("spendChange","Will increase significantly",seg);
}
function specificQ(key,selected=[]){
  const rows=q(key); return selected.length?rows.filter(d=>selected.includes(d.label)):rows;
}
function findRow(key,needle){ return q(key).find(r=>r.label.toLowerCase().includes(needle.toLowerCase())); }
function withSelection(sel,fn){
  const oldIgnore=ignoreDashboardFilters, oldFilters={...chartFilters};
  ignoreDashboardFilters=true; chartFilters={};
  const result=fn();
  chartFilters=oldFilters; ignoreDashboardFilters=oldIgnore;
  return result;
}
/* keep all chart rows; only insights remain top-N */
function decision(){
  const data=q("decisionFactors");
  const root=d3.select("#decisionList");
  root.selectAll("*").remove();
  data.sort((a,b)=>b.value-a.value).forEach((d,i)=>{
    const row=root.append("div").attr("class","rank-item").style("cursor","pointer");
    row.html(`<div class="rank-num">${i+1}</div><div class="rank-label">${d.label}</div><div class="rank-value">${fmt(d.value)}</div>`);
    row.on("click",()=>toggleChartFilter("decisionFactors",d.label));
  });
}

/* ---------- final data-engine fixes ---------- */
function precomputedTabKey(){
  return PRECOMPUTED_TAB_KEY[currentTab]||"source_market";
}

function precomputedGroupKey(dim,value){
  return `${dim}::${value}`;
}

function precomputedSelectedGroups(){
  if(!PRECOMPUTED?.ready) return null;
  if(Object.keys(chartFilters||{}).length) return null;
  const active=Object.entries(filterSelections||{}).filter(([,vals])=>Array.isArray(vals)&&vals.length);
  if(!active.length) return ["all"];
  if(active.length>1) return null;
  const [dim,vals]=active[0];
  let actualDim=dim;
  if(dim==="Class") actualDim=currentTab==="hotel"?"accommodation":"cabinClass";
  if(!vals.length) return ["all"];
  return vals.map(v=>precomputedGroupKey(actualDim,v));
}

function mergePrecomputedQuestionSummaries(summaries){
  const valid=(summaries||[]).filter(Boolean);
  if(!valid.length) return null;
  const type=valid[0].type;
  const base=valid.reduce((sum,s)=>sum+(+s.base||0),0);
  const answerBase=valid.reduce((sum,s)=>sum+(+s.answerBase||0),0);
  const counts=new Map();
  valid.forEach(summary=>{
    (summary.data||[]).forEach(item=>{
      if(item.label==="NPS Score") return;
      const label=clean(item.label);
      if(!label) return;
      counts.set(label,(counts.get(label)||0)+(+item.count||0));
    });
  });
  if(type==="nps"){
    const denom=[...counts.entries()].reduce((sum,[label,count])=>/^\d+$/.test(label)?sum+count:sum,0);
    const out=[];
    for(let n=0;n<=10;n++){
      const count=counts.get(String(n))||0;
      out.push({label:String(n),count,value:denom?count/denom:0});
    }
    const score=denom?[...counts.entries()].reduce((sum,[label,count])=>{
      const n=Number(label);
      if(!Number.isFinite(n)) return sum;
      return sum+(n>=9?count:n<=6?-count:0);
    },0)/denom*100:0;
    out.push({label:"NPS Score",count:denom,value:score});
    return out;
  }
  const denominator=(type==="multi_response"?answerBase:(answerBase||base))||1;
  return [...counts.entries()]
    .map(([label,count])=>({label,count,value:count/denominator}))
    .sort((a,b)=>b.value-a.value);
}

function precomputedQuestionData(key){
  const tab=PRECOMPUTED?.tabs?.[precomputedTabKey()];
  if(!tab?.groups) return null;
  const groups=precomputedSelectedGroups();
  if(!groups) return null;
  const summaries=groups.map(group=>tab.groups[group]?.questions?.[key]).filter(Boolean);
  if(!summaries.length) return null;
  return mergePrecomputedQuestionSummaries(summaries);
}

function filterOptions(cfg){
  if(!DATA) return [];
  if(cfg.value==="Class"){
    if(!DATA.recordsReady) return DATA.filterOptions?.Class || [];
    const source=currentTab==="hotel" ? DATA.records.map(r=>r.accommodation) : DATA.records.map(r=>r.cabinClass);
    return [...new Set(source.filter(Boolean))].sort();
  }
  return DATA.filterOptions?.[cfg.value] || [];
}
function q(key){
  const def=DATA.questions[key];
  if(!def) return [];
  const precomputed=precomputedQuestionData(key);
  if(precomputed) return precomputed;
  if(!DATA.recordsReady && Array.isArray(def.data)) {
    return def.data.map(d=>({label:clean(d.label),value:segmentValue(d,key)})).filter(d=>d.label);
  }
  const rows=activeRows();
  if(def.type==="multi") return (def.items||[]).map(it=>({label:clean(it.label),value:rows.length?rows.filter(r=>Array.isArray(r[key])&&r[key].some(value=>clean(value)===clean(it.label))).length/rows.length:0})).filter(d=>d.label);
  if(def.type==="nps"){
    const vals=rows.map(r=>Number(r[key])).filter(Number.isFinite), out=[];
    for(let n=0;n<=10;n++) out.push({label:String(n),value:vals.length?vals.filter(v=>v===n).length/vals.length:0});
    out.push({label:"NPS Score",value:vals.length?vals.reduce((sum,v)=>sum+(v>=9?1:v<=6?-1:0),0)/vals.length*100:0});
    return out;
  }
  if(def.type==="rank") return surveyQuestionData(def,key);
  if(def.type==="numeric") {
    const counts=new Map(); rows.forEach(r=>{const v=Number(r[key]);if(Number.isFinite(v))counts.set(v,(counts.get(v)||0)+1);});
    return [...counts.entries()].sort((a,b)=>a[0]-b[0]).map(([label,count])=>({label:String(label),value:rows.length?count/rows.length:0}));
  }
  const counts=new Map();
  rows.forEach(r=>{const v=clean(r[key]);if(v)counts.set(v,(counts.get(v)||0)+1);});
  /* Use answering base (non-empty) as denominator to avoid 0% on sparse questions */
  const ansBase=rows.filter(r=>clean(r[key])).length||rows.length||1;
  const out=[...counts.entries()].map(([label,count])=>({label,value:count/ansBase}));
  if(key==="aiLikelihood") {
    const top=rows.length?rows.filter(r=>["Extremely likely","Somewhat likely"].includes(clean(r[key]))).length/rows.length:0;
    const bottom=rows.length?rows.filter(r=>["Somewhat unlikely","Extremely unlikely"].includes(clean(r[key]))).length/rows.length:0;
    out.push({label:"Top 2 Box",value:top},{label:"Bottom 2 Box",value:bottom});
  }
  if(key==="airlineLoyaltyImportance"||key==="hotelLoyaltyImportance") {
    const top=rows.length?rows.filter(r=>["Extremely important","Very important"].includes(clean(r[key]))).length/rows.length:0;
    const bottom=rows.length?rows.filter(r=>["Slightly important","Not at all important"].includes(clean(r[key]))).length/rows.length:0;
    out.push({label:"NET : Top 2 Box",value:top},{label:"NET : Bottom 2 Box",value:bottom});
  }
  return out;
}
function valueFor(key,needle,seg){
  const saved=ignoreDashboardFilters; ignoreDashboardFilters=true;
  const records=DATA.records.filter(r=>{
    if(seg==="Total"||seg==null) return true;
    if(REGIONS.includes(seg)) return r.Region===seg;
    if(AGES.includes(seg)) return r["Age Group"]===seg;
    if((DATA.filterOptions?.Market||[]).includes(seg)) return r.Market===seg;
    return true;
  });
  ignoreDashboardFilters=saved;
  const def=DATA.questions[key]; if(!def||!records.length)return 0;
  if(def.type==="nps"){
    const vals=records.map(r=>r[key]).filter(v=>Number.isFinite(v));
    if(needle==="NPS Score") return vals.length?vals.reduce((s,v)=>s+(v>=9?1:v<=6?-1:0),0)/vals.length*100:0;
    const n=Number(String(needle).match(/\d+/)?.[0]); return vals.length?vals.filter(v=>v===n).length/vals.length:0;
  }
  if(def.type==="multi"){
    const item=def.items.find(it=>clean(it.label).toLowerCase().includes(String(needle).toLowerCase()));
    return item?records.filter(r=>Array.isArray(r[key])&&r[key].includes(item.label)).length/records.length:0;
  }
  if(def.type==="single"){
    const n=records.filter(r=>clean(r[key]).toLowerCase().includes(String(needle).toLowerCase())).length;
    return n/records.length;
  }
  return 0;
}
function regionSpendIncrease(seg){
  const saved=ignoreDashboardFilters; ignoreDashboardFilters=true;
  const rows=DATA.records.filter(r=>{
    if(seg==="Total"||seg==null)return true;
    if(REGIONS.includes(seg))return r.Region===seg;
    if((DATA.filterOptions?.Market||[]).includes(seg))return r.Market===seg;
    return true;
  });
  ignoreDashboardFilters=saved;
  if(!rows.length)return 0;
  return rows.filter(r=>String(r.spendChange||"").startsWith("Will increase")).length/rows.length;
}
function baseFor(key,seg){
  if(seg==="Total"||seg==null)return DATA.records.length;
  if(REGIONS.includes(seg))return DATA.records.filter(r=>r.Region===seg).length;
  if((DATA.filterOptions?.Market||[]).includes(seg))return DATA.records.filter(r=>r.Market===seg).length;
  if(AGES.includes(seg))return DATA.records.filter(r=>r["Age Group"]===seg).length;
  if(filterDim==="Class"){
    const f=currentTab==="hotel"?"accommodation":"cabinClass"; return DATA.records.filter(r=>r[f]===seg).length;
  }
  return DATA.records.filter(r=>r[filterDim]===seg).length;
}


/* ============================================================
   COMPLETE SURVEY QUESTION EXPLORER + FINAL CHART SAFETY FIXES
   ============================================================ */

const SURVEY_ORDER=["Q2","Q3","Q3a","Q4","Q4a","Q4b","Q5","Q6","Q6a","Q7","Q8","Q8a","Q8b","Q9","Q9a","Q9b","Q9c","Q10a","Q10","Q11","Q11a","Q12","Q14","Q15","Q15a","Q16","Q16a","Q16b","Q17","Q18","Q19","Q20","Q21","Q21a","Q22","Q22a","Q22b","Q23","Q24"];

function escapeHtml(v){
  return String(v??"")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function displayLabelText(value){
  return clean(value).replace(/^others?\s*\(please+\s+specify\)$/i,"Others");
}

function chartDisplayLabel(d){
  return displayLabelText(d?.displayLabel ?? d?.label ?? "");
}

function chartFilterLabel(d){
  return clean(d?.filterLabel ?? d?.label ?? "");
}

function shortExperienceLabel(label){
  return clean(label)
    .replace(/\s*(?:â€”|—|–|-)\s*e\.g\..*$/i,"")
    .trim();
}

function channelDisplayRows(rows){
  return rows.map(row=>({
    ...row,
    label:clean(row.label).replace(/\s*\(e\.g\.,[^)]*\)/i,"").trim(),
    filterLabel:row.label
  }));
}

function surveyDefinition(key){
  if(!DATA) return null;

  // Q18/Q24 and the legacy analytical questions live in DATA.questions.
  // The complete survey metadata for the remaining Q2-Q24 blocks lives in
  // DATA.surveyQuestions. The previous version only looked in DATA.questions,
  // which meant the tab question containers were created but every card was
  // silently skipped. Resolve both sources into one definition contract.
  const analytical=DATA.questions?.[key];
  if(analytical && (analytical.type==="matrix" || analytical.items || analytical.strategies || analytical.rows || analytical.data)) {
    const surveyMeta=(DATA.surveyQuestions||[]).find(x=>x.key===key);
    return {...(surveyMeta||{}), ...analytical, key};
  }

  const meta=(DATA.surveyQuestions||[]).find(x=>x.key===key);
  if(meta) return {...meta,key};

  return analytical ? {...analytical,key} : null;
}

function surveyCatalog(){
  const defs=[];
  for(const key of SURVEY_ORDER){
    const def=surveyDefinition(key);
    if(def) defs.push({...def,key});
  }
  return defs;
}

function surveyQuestionText(def){
  let s=clean(def?.question||"");
  s=s.replace(/\^f\([^)]*\)\^/g,"").replace(/\s+/g," ").trim();
  s=s
    .replace(/\s*\((?:Q|QS)\d+[a-z]?\)\s*/gi," ")
    .replace(/^\s*(?:Q|QS)\d+[a-z]?\s*[.:·\-–—)]*\s*/i,"")
    .replace(/\s+/g," ")
    .trim();
  return s || "Survey question";
}

function surveyQuestionData(def,key){
  const rows=activeRows();
  if(!rows.length) return [];
  if(def.type==="single"){
    const counts=new Map();
    rows.forEach(r=>{const label=clean(r[key]); if(label) counts.set(label,(counts.get(label)||0)+1);});
    /* Use answering base (non-empty) as denominator, not total rows.
       Avoids 0% display when question is conditional/sparse (e.g. Q3a). */
    const answeringBase=rows.filter(r=>clean(r[key])).length||rows.length;
    return [...counts.entries()].map(([label,count])=>({label,value:count/answeringBase}));
  }
  if(def.type==="multi"){
    return (def.items||[]).map(it=>({
      label:clean(it.label),
      value:rows.filter(r=>Array.isArray(r[key])&&r[key].includes(it.label)).length/rows.length
    })).filter(d=>d.label);
  }
  if(def.type==="text_multi"){
    const counts=new Map();
    rows.forEach(r=>{
      const seen=new Set();
      (Array.isArray(r[key])?r[key]:[]).forEach(v=>{
        const label=clean(v);
        if(label&&!seen.has(label)){counts.set(label,(counts.get(label)||0)+1);seen.add(label);}
      });
    });
    return [...counts.entries()].map(([label,count])=>({label,value:count/rows.length}));
  }
  if(def.type==="nps"){
    const vals=rows.map(r=>Number(r[key])).filter(Number.isFinite);
    return d3.range(0,11).map(n=>({label:String(n),value:vals.length?vals.filter(v=>v===n).length/vals.length:0}));
  }
  if(def.type==="rank"){
    const items=def.items||[];
    return items.map((it,i)=>{
      const vals=rows.map(r=>Array.isArray(r[key])?Number(r[key][i]):NaN).filter(Number.isFinite);
      const first=vals.length?vals.filter(v=>v===1).length/vals.length:0;
      const avg=vals.length?d3.mean(vals):0;
      return {label:clean(it.label),value:first,avgRank:avg};
    });
  }
  if(def.type==="matrix") return [];
  if(def.type==="numeric"){
    const counts=new Map();
    rows.forEach(r=>{
      const v=Number(r[key]);
      if(Number.isFinite(v)) counts.set(v,(counts.get(v)||0)+1);
    });
    return [...counts.entries()].sort((a,b)=>a[0]-b[0]).map(([label,count])=>({label:String(label),value:count/rows.length}));
  }
  const counts=new Map();
  rows.forEach(r=>{
    const v=clean(r[key]);
    if(v) counts.set(v,(counts.get(v)||0)+1);
  });
  return [...counts.entries()].map(([label,count])=>({label,value:count/rows.length}));
}

function surveyToggleFilter(key,label){
  if(!key||!label) return;
  if(chartFilters[key]===label) delete chartFilters[key];
  else chartFilters[key]=label;
  renderActive();
  updateFilterSummaries();
  updateSegmentBase();
}

function questionMatches(r,key,label){
  if(key==="Q18" || key==="Q24"){
    return matrixRowMatches(r,key,label);
  }
  if(key==="Q8a"){
    const def=surveyDefinition(key);
    const idx=(def?.items||[]).findIndex(it=>clean(it.label)===clean(label));
    return idx>=0 && Array.isArray(r[key]) && Number(r[key][idx])===1;
  }
  if(key==="Q10a"){
    return Number(r[key])===Number(label);
  }
  if(key==="Q3" || key==="Q3a"){
    const wanted = String(label ?? "").trim().toLowerCase();
    if(!wanted) return false;
    const normWanted = typeof normalizeDest === "function" ? normalizeDest(label).toLowerCase() : wanted;
    const arr = Array.isArray(r?.Q3) ? r.Q3 : (r?.Q3 ? [r.Q3] : []);
    return arr.some(v => {
      const s = String(v ?? "").trim().toLowerCase();
      const normV = typeof normalizeDest === "function" ? normalizeDest(v).toLowerCase() : s;
      return s === wanted || normV === normWanted || normV === wanted || s === normWanted || s.includes(wanted) || wanted.includes(s);
    });
  }
  if(key==="assocWord"){
    if(typeof matchAssocWord === "function") return matchAssocWord(r, label);
    const exps = Array.isArray(r.experiences) ? r.experiences : (Array.isArray(r.Q12) ? r.Q12 : [r.experiences || r.Q12]);
    const decs = Array.isArray(r.decisionFactors) ? r.decisionFactors : (Array.isArray(r.Q9) ? r.Q9 : [r.decisionFactors || r.Q9]);
    const str = [...exps, ...decs, r.Companion, r.Children, r.bookingChannels].filter(Boolean).join(" ").toLowerCase();
    return str.includes(clean(label).toLowerCase());
  }
  const v=r[key];
  if(Array.isArray(v)) return v.includes(label);
  if(key==="airlineNPS" || key==="hotelNPS" || key==="Q15a" || key==="Q21a"){
    if(label==="NPS Score") return Number.isFinite(Number(v));
    const n=Number(String(label).match(/\d+/)?.[0]);
    return Number(v)===n;
  }
  return clean(v)===clean(label);
}

function matrixRowMatches(r,key,label){
  const def=surveyDefinition(key);
  const index=DATA?.matrixIndex?.[key]||[];
  const rowMeta=(def?.rows||[]).find(x=>clean(x.label)===clean(label));
  if(!rowMeta || !Array.isArray(r[key])) return false;
  const wantedField=key==="Q18"?"carrier":"brand";
  const rowId=Number(rowMeta.id);
  return index.some((cell,i)=>Number(cell[wantedField])===rowId && r[key].includes(i));
}

/* Replace the earlier chart key mapper so survey charts can reuse the same click engine. */
function chartFilterKey(sel){
  const el=document.querySelector(sel);
  if(el?.dataset?.surveyKey) return el.dataset.surveyKey;
  const id=String(sel).replace(/^#/,"");
  const map={
    planningChart:"planningStage",purposeChart:"tripPurpose",timingChart:"tripTiming",spendChart:"spendChange",planBudgetDonut:"BudgetChangeMode",
    infoChart:"infoChannels",companionChart:"travelCompanions",bookingChart:"bookingChannels",decisionList:"decisionFactors",decisionChart:"decisionFactors",
    experienceChart:"experiences",leadTimeChart:"planningLeadTime",aiTasksChart:"aiTasks",
    carrierChart:"airlineCarrier",airlineConsiderChart:"airlineConsiderations",cabinChart:"cabinClass",
    airlineLoyaltyChart:"airlineLoyaltyImportance",airlineStrategyChart:"airlineStrategies",
    stayChart:"accommodation",hotelConsiderChart:"hotelConsiderations",hotelLoyaltyChart:"hotelLoyaltyImportance",
    hotelStrategyChart:"hotelStrategies",hotelFeaturesChart:"hotelLoyaltyFeatures",hotelBrandChart:"hotelBrand",
    regionSpendBar:"Region",regionResearchBar:"Region",ageLine:"Age Group",
    assocWordCloud:"assocWord",destWordCloud:"Q3"
  };
  return map[id]||null;
}

/* Final horizontal bar renderer: never lets a fixed axis ceiling push bars outside the card. */
function horizontalBars(sel,data,opt={}){
  const el=document.querySelector(sel);
  const ranked=[...(data||[])]
    .filter(d=>Number.isFinite(+d.value))
    .sort((a,b)=>b.value-a.value);
  if(el)el.dataset.rows=ranked.length;
  const {w,h,m:baseMargin,ih}=dimensions(sel,Math.max(opt.height||280,ranked.length*28+55));
  const labelWidth=Number(opt.labelWidth);
  const m=Number.isFinite(labelWidth)?{...baseMargin,l:labelWidth}:baseMargin;
  const iw=Math.max(1,w-m.l-m.r);
  const root=d3.select(sel);root.selectAll("*").remove();
  if(!ranked.length){root.append("div").attr("class","empty-chart").text("No data available for this selection.");return;}
  const svg=root.append("svg").attr("width",w).attr("height",h);
  const g=svg.append("g").attr("transform",`translate(${m.l},${m.t})`);
  const y=d3.scaleBand().domain(ranked.map(d=>d.label)).range([0,ih]).padding(.28);
  const max=opt.max||Math.max(.1,d3.max(ranked,d=>d.value)||0)*1.15;
  const x=d3.scaleLinear().domain([0,max]).range([0,iw]);
  g.append("g").attr("class","gridline").call(d3.axisBottom(x).ticks(4).tickSize(ih).tickFormat("")).selectAll("line").attr("transform",`translate(0,${-ih})`);
  const key=chartFilterKey(sel);
  const selected=key?chartFilters[key]:null;
  g.selectAll("rect").data(ranked).join("rect")
    .attr("x",0).attr("y",d=>y(d.label)).attr("height",y.bandwidth()).attr("rx",5)
    .attr("fill",(d,i)=>chartColor(i,"horizontal"))
    .attr("opacity",d=>selectedOpacity(selected,chartFilterLabel(d)))
    .attr("width",d=>x(Math.max(0,d.value)))
    .style("cursor",key?"pointer":"default")
    .on("click",(e,d)=>{e.stopPropagation();if(key)toggleChartFilter(key,chartFilterLabel(d));})
    .on("mousemove",(e,d)=>showTip(e,d)).on("mouseleave",hideTip);
  g.selectAll(".val").data(ranked).join("text").attr("class","val")
    .attr("x",d=>Math.min(iw-2,x(d.value)+7)).attr("y",d=>y(d.label)+y.bandwidth()/2+4)
    .text(d=>fmt(d.value)).attr("font-size",10.5).attr("font-weight",800).attr("fill","#354056");
  const gy=g.append("g").attr("class","axis").call(d3.axisLeft(y).tickSize(0));
  gy.select(".domain").remove();
  const maxLabelChars=Math.max(2,Number(opt.maxLabelChars)||42);
  gy.selectAll("text").each(function(d){const s=d3.select(this),t=String(d),shown=t.length>maxLabelChars?t.slice(0,maxLabelChars-1)+"…":t;s.text(shown).attr("title",t);});
  g.append("g").attr("class","axis").attr("transform",`translate(0,${ih})`).call(d3.axisBottom(x).ticks(4).tickFormat(fmt));
}


function renderSurveyVisualization(sel,data,type,opt={}){
  const el=document.querySelector(sel); if(!el)return;
  const ranked=[...(data||[])].filter(d=>Number.isFinite(+d.value)&&String(d.label||"").trim()).sort((a,b)=>b.value-a.value);
  const root=d3.select(sel); root.selectAll("*").remove();
  if(!ranked.length){root.append("div").attr("class","empty-chart").text("No data available for this selection.");return;}
  const w=Math.max(300,el.clientWidth||300), h=opt.height||300;
  const svg=root.append("svg").attr("width",w).attr("height",h).attr("viewBox",`0 0 ${w} ${h}`);

  // Clean Tableau-like ranked dot/lollipop view for answer distributions.
  if(type==="single"||type==="multi"||type==="text_multi"||type==="nps"){
    const rows=ranked, m={t:10,r:68,b:26,l:Math.min(300,Math.max(150,w*.30))};
    const iw=Math.max(100,w-m.l-m.r), rowH=Math.max(23,(h-m.t-m.b)/rows.length), ih=rowH*rows.length;
    if(h < ih+m.t+m.b) svg.attr("height",ih+m.t+m.b).attr("viewBox",`0 0 ${w} ${ih+m.t+m.b}`);
    const g=svg.append("g").attr("transform",`translate(${m.l},${m.t})`);
    const max=Math.max(.001,d3.max(rows,d=>+d.value)||0), x=d3.scaleLinear().domain([0,max*1.12]).range([0,iw]);
    g.selectAll("line.grid").data(x.ticks(4)).join("line").attr("class","grid").attr("x1",d=>x(d)).attr("x2",d=>x(d)).attr("y1",0).attr("y2",ih).attr("stroke","#eee8f5");
    const key=chartFilterKey(sel), selected=key?chartFilters[key]:null;
    const row=g.selectAll("g.answer").data(rows).join("g").attr("class","answer").attr("transform",(d,i)=>`translate(0,${i*rowH+rowH/2})`).style("cursor",key?"pointer":"default");
    row.append("line").attr("x1",0).attr("x2",d=>x(+d.value)).attr("stroke","#c9bfd8").attr("stroke-width",d=>selected===d.label?4:3).attr("stroke-linecap","round").attr("opacity",d=>selectedOpacity(selected,d.label));
    row.append("circle").attr("cx",d=>x(+d.value)).attr("r",d=>selected===d.label?7:6).attr("fill",(d,i)=>i===0?palette[0]:palette[(i%6)+1]).attr("stroke","#fff").attr("stroke-width",d=>selected===d.label?3:2).attr("opacity",d=>selectedOpacity(selected,d.label));
    row.append("text").attr("x",-10).attr("text-anchor","end").attr("dy","3.5").attr("font-size",10).attr("fill","#354056").text(d=>String(d.label).length>42?String(d.label).slice(0,40)+"…":d.label).append("title").text(d=>d.label);
    row.append("text").attr("x",d=>x(+d.value)+10).attr("dy","3.5").attr("font-size",10).attr("font-weight",800).attr("fill","#354056").text(d=>d3.format(".0%")(d.value));
    row.on("mousemove",(e,d)=>showTip(e,{label:d.label,value:d3.format(".1%")(d.value)})).on("mouseleave",hideTip).on("click",(e,d)=>{e.stopPropagation();if(key)toggleChartFilter(key,d.label);});
    g.append("g").attr("class","axis").attr("transform",`translate(0,${ih})`).call(d3.axisBottom(x).ticks(4).tickFormat(d3.format(".0%")));
    return;
  }

  if(type==="rank"){
    const m={t:16,r:24,b:72,l:46}, iw=w-m.l-m.r, ih=h-m.t-m.b, max=Math.max(.001,d3.max(ranked,d=>+d.value)||1);
    const x=d3.scaleBand().domain(ranked.map(d=>d.label)).range([0,iw]).padding(.28), y=d3.scaleLinear().domain([0,max*1.15]).range([ih,0]);
    const g=svg.append("g").attr("transform",`translate(${m.l},${m.t})`);
    g.selectAll("line.grid").data(y.ticks(4)).join("line").attr("x1",0).attr("x2",iw).attr("y1",d=>y(d)).attr("y2",d=>y(d)).attr("stroke","#eee8f5");
    const key=chartFilterKey(sel),selected=key?chartFilters[key]:null;
    g.selectAll("rect").data(ranked).join("rect").attr("x",d=>x(d.label)).attr("y",d=>y(d.value)).attr("width",x.bandwidth()).attr("height",d=>ih-y(d.value)).attr("rx",4).attr("fill",palette[0]).attr("opacity",d=>selectedOpacity(selected,d.label)).style("cursor",key?"pointer":"default").on("click",(e,d)=>{e.stopPropagation();if(key)toggleChartFilter(key,d.label);});
    g.append("g").attr("transform",`translate(0,${ih})`).call(d3.axisBottom(x).tickFormat(d=>String(d).length>15?String(d).slice(0,13)+"…":d).tickSize(0)).selectAll("text").attr("transform","rotate(-28)").style("text-anchor","end");
    g.append("g").call(d3.axisLeft(y).ticks(4).tickFormat(d3.format(".0%"))).select(".domain").remove();
    return;
  }
  if(type==="numeric"){
    const vals=ranked.map(d=>+d.label).filter(Number.isFinite), max=d3.max(vals), min=d3.min(vals);
    if(!vals.length){root.append("div").attr("class","empty-chart").text("No numeric data available.");return;}
    const bins=d3.bin().domain([min,max]).thresholds(10)(vals), m={t:18,r:24,b:42,l:48},iw=w-m.l-m.r,ih=h-m.t-m.b,x=d3.scaleLinear().domain([min,max]).range([0,iw]),y=d3.scaleLinear().domain([0,d3.max(bins,b=>b.length)||1]).range([ih,0]),g=svg.append("g").attr("transform",`translate(${m.l},${m.t})`);
    g.selectAll("rect").data(bins).join("rect").attr("x",d=>x(d.x0)+1).attr("y",d=>y(d.length)).attr("width",d=>Math.max(1,x(d.x1)-x(d.x0)-2)).attr("height",d=>ih-y(d.length)).attr("fill",palette[0]).attr("rx",3);
    g.append("g").attr("transform",`translate(0,${ih})`).call(d3.axisBottom(x).ticks(5));g.append("g").call(d3.axisLeft(y).ticks(4)).select(".domain").remove();
  }
}
function renderSurveyVisualizationEl(el,data,type,opt={}){
  if(!el) return;
  // Use the element's clientWidth directly (no selector lookup needed)
  const ranked=[...(data||[])].filter(d=>Number.isFinite(+d.value)&&String(d.label||"").trim()).sort((a,b)=>b.value-a.value);
  const root=d3.select(el); root.selectAll("*").remove();
  if(!ranked.length){root.append("div").attr("class","empty-chart").text("No data available for this selection.");return;}
  const w=Math.max(300,el.offsetWidth||el.parentElement?.offsetWidth||600);
  const h=opt.height||300;
  const svg=root.append("svg").attr("width",w).attr("height",h).attr("viewBox",`0 0 ${w} ${h}`);

  if(type==="single"||type==="multi"||type==="text_multi"||type==="nps"){
    const rows=ranked, m2={t:10,r:68,b:26,l:Math.min(300,Math.max(150,w*.30))};
    const iw=Math.max(100,w-m2.l-m2.r), rowH=Math.max(23,(h-m2.t-m2.b)/rows.length), ih=rowH*rows.length;
    if(h < ih+m2.t+m2.b) svg.attr("height",ih+m2.t+m2.b).attr("viewBox",`0 0 ${w} ${ih+m2.t+m2.b}`);
    const g=svg.append("g").attr("transform",`translate(${m2.l},${m2.t})`);
    const maxVal=Math.max(.001,d3.max(rows,d=>+d.value)||0), x=d3.scaleLinear().domain([0,maxVal*1.12]).range([0,iw]);
    g.selectAll("line.grid").data(x.ticks(4)).join("line").attr("class","grid").attr("x1",d=>x(d)).attr("x2",d=>x(d)).attr("y1",0).attr("y2",ih).attr("stroke","#eee8f5");
    const key=el.dataset.surveyKey, selected=key?chartFilters[key]:null;
    const row=g.selectAll("g.answer").data(rows).join("g").attr("class","answer").attr("transform",(d,i)=>`translate(0,${i*rowH+rowH/2})`).style("cursor",key?"pointer":"default");
    row.append("line").attr("x1",0).attr("x2",d=>x(+d.value)).attr("stroke","#c9bfd8").attr("stroke-width",d=>selected===d.label?4:3).attr("stroke-linecap","round").attr("opacity",d=>selectedOpacity(selected,d.label));
    row.append("circle").attr("cx",d=>x(+d.value)).attr("r",d=>selected===d.label?7:6).attr("fill",(d,i)=>i===0?palette[0]:palette[(i%6)+1]).attr("stroke","#fff").attr("stroke-width",d=>selected===d.label?3:2).attr("opacity",d=>selectedOpacity(selected,d.label));
    row.append("text").attr("x",-10).attr("text-anchor","end").attr("dy","3.5").attr("font-size",10).attr("fill","#354056").text(d=>String(d.label).length>42?String(d.label).slice(0,40)+"…":d.label).append("title").text(d=>d.label);
    row.append("text").attr("x",d=>x(+d.value)+10).attr("dy","3.5").attr("font-size",10).attr("font-weight",800).attr("fill","#354056").text(d=>d3.format(".0%")(d.value));
    row.on("mousemove",(e,d)=>showTip(e,{label:d.label,value:d3.format(".1%")(d.value)})).on("mouseleave",hideTip).on("click",(e,d)=>{e.stopPropagation();if(key)toggleChartFilter(key,d.label);});
    g.append("g").attr("class","axis").attr("transform",`translate(0,${ih})`).call(d3.axisBottom(x).ticks(4).tickFormat(d3.format(".0%")));
    return;
  }
  if(type==="rank"){
    const m3={t:16,r:24,b:72,l:46}, iw=w-m3.l-m3.r, ih=h-m3.t-m3.b, maxVal=Math.max(.001,d3.max(ranked,d=>+d.value)||1);
    const x=d3.scaleBand().domain(ranked.map(d=>d.label)).range([0,iw]).padding(.28), y=d3.scaleLinear().domain([0,maxVal*1.15]).range([ih,0]);
    const g=svg.append("g").attr("transform",`translate(${m3.l},${m3.t})`);
    g.selectAll("line.grid").data(y.ticks(4)).join("line").attr("x1",0).attr("x2",iw).attr("y1",d=>y(d)).attr("y2",d=>y(d)).attr("stroke","#eee8f5");
    const key=el.dataset.surveyKey, selected=key?chartFilters[key]:null;
    g.selectAll("rect").data(ranked).join("rect").attr("x",d=>x(d.label)).attr("y",d=>y(d.value)).attr("width",x.bandwidth()).attr("height",d=>ih-y(d.value)).attr("rx",4).attr("fill",palette[0]).attr("opacity",d=>selectedOpacity(selected,d.label)).style("cursor",key?"pointer":"default").on("click",(e,d)=>{e.stopPropagation();if(key)toggleChartFilter(key,d.label);});
    g.append("g").attr("transform",`translate(0,${ih})`).call(d3.axisBottom(x).tickFormat(d=>String(d).length>15?String(d).slice(0,13)+"…":d).tickSize(0)).selectAll("text").attr("transform","rotate(-28)").style("text-anchor","end");
    g.append("g").call(d3.axisLeft(y).ticks(4).tickFormat(d3.format(".0%"))).select(".domain").remove();
    return;
  }
  if(type==="numeric"){
    const vals=ranked.map(d=>+d.label).filter(Number.isFinite);
    if(!vals.length){root.append("div").attr("class","empty-chart").text("No numeric data available.");return;}
    const minV=d3.min(vals),maxV=d3.max(vals),bins=d3.bin().domain([minV,maxV]).thresholds(10)(vals);
    const m4={t:18,r:24,b:42,l:48},iw=w-m4.l-m4.r,ih=h-m4.t-m4.b;
    const x=d3.scaleLinear().domain([minV,maxV]).range([0,iw]),y=d3.scaleLinear().domain([0,d3.max(bins,b=>b.length)||1]).range([ih,0]);
    const g=svg.append("g").attr("transform",`translate(${m4.l},${m4.t})`);
    g.selectAll("rect").data(bins).join("rect").attr("x",d=>x(d.x0)+1).attr("y",d=>y(d.length)).attr("width",d=>Math.max(1,x(d.x1)-x(d.x0)-2)).attr("height",d=>ih-y(d.length)).attr("fill",palette[0]).attr("rx",3);
    g.append("g").attr("transform",`translate(0,${ih})`).call(d3.axisBottom(x).ticks(5));
    g.append("g").call(d3.axisLeft(y).ticks(4)).select(".domain").remove();
  }
}

function renderRankSurveyQuestionEl(card,chartEl,key,def){
  if(!chartEl) return;
  chartEl.dataset.surveyKey=key;
  const data=surveyQuestionData(def,key).sort((a,b)=>b.value-a.value);
  renderSurveyVisualizationEl(chartEl,data,"rank",{height:300});
  const note=card.querySelector(".survey-secondary");
  if(note){
    const avg=data.filter(d=>Number.isFinite(d.avgRank)).sort((a,b)=>a.avgRank-b.avgRank)
      .slice(0,6).map((d,i)=>`${i+1}. ${escapeHtml(d.label)} · avg rank ${d.avgRank.toFixed(2)}`).join("<br>");
    note.innerHTML=avg||"No rank data available.";
  }
}

function renderMatrixQuestionInto(root,key,def){
  if(!root) return;
  const rows=def.rows||[];
  const strategies=def.strategies||[];
  const index=DATA.matrixIndex?.[key]||[];
  const active=activeRows();
  if(!active.length){
    root.innerHTML='<div class="empty-chart">No respondents match the current filters.</div>';
    return;
  }
  const field=key==="Q18"?"carrier":"brand";
  const cellIndex=new Map();
  index.forEach((cell,i)=>cellIndex.set(`${cell.strategy}-${cell[field]}`,i));
  const counts=rows.map(row=>strategies.map(strategy=>{
    const idx=cellIndex.get(`${strategy.id}-${row.id}`);
    if(idx===undefined)return 0;
    let n=0;
    active.forEach(r=>{if(Array.isArray(r[key])&&r[key].includes(idx))n++;});
    return n/active.length;
  }));
  const selected=chartFilters[key]||null;
  let head=`<thead><tr><th>${key==="Q18"?"Carrier":"Brand"} \\ Strategy</th>`;
  strategies.forEach(s=>head+=`<th title="${escapeHtml(s.label)}">${escapeHtml(s.label.length>24?s.label.slice(0,22)+"…":s.label)}</th>`);
  head+="</tr></thead>";
  let body="<tbody>";
  rows.forEach((row,ri)=>{
    const activeRow=selected===row.label;
    body+=`<tr class="${activeRow?"matrix-selected":""}"><th class="matrix-row-head" data-row="${escapeHtml(row.label)}" title="Click to filter">${escapeHtml(row.label)}</th>`;
    strategies.forEach((s,si)=>{
      const v=counts[ri][si];
      body+=`<td title="${escapeHtml(row.label)} · ${escapeHtml(s.label)} · ${fmt(v)}">${fmt(v)}</td>`;
    });
    body+="</tr>";
  });
  body+="</tbody>";
  root.innerHTML=`<div class="matrix-scroll"><table class="survey-matrix-table">${head}${body}</table></div><div class="matrix-footnote">${rows.length.toLocaleString()} ${field}s × ${strategies.length} strategies · click a row name to filter</div>`;
  root.querySelectorAll(".matrix-row-head").forEach(el2=>{
    el2.addEventListener("click",e=>{
      e.stopPropagation();
      surveyToggleFilter(key,el2.dataset.row);
    });
  });
}

function renderRankSurveyQuestion(card,key,def){
  const chartId=`surveyChart_${key}`;
  const chart=card.querySelector(`#${chartId}`);
  chart.dataset.surveyKey=key;
  const data=surveyQuestionData(def,key).sort((a,b)=>b.value-a.value);
  renderSurveyVisualization(`#${chartId}`,data,"rank",{height:300});
  const note=card.querySelector(".survey-secondary");
  if(note){
    const avg=data.filter(d=>Number.isFinite(d.avgRank)).sort((a,b)=>a.avgRank-b.avgRank)
      .slice(0,6).map((d,i)=>`${i+1}. ${escapeHtml(d.label)} · avg rank ${d.avgRank.toFixed(2)}`).join("<br>");
    note.innerHTML=avg||"No rank data available.";
  }
}

function renderSurveyBarListEl(el,data,key){
  if(!el) return;
  const rows=[...(data||[])].filter(d=>Number.isFinite(+d.value)&&String(d.label||"").trim());
  if(key==="Q20"){
    const ratingOrder=label=>{
      const text=String(label).toLowerCase().replace(/â€™|’/g,"'");
      const stars=text.match(/\b([1-5])\s*stars?\b/);
      if(stars)return 5-Number(stars[1]);
      return /doesn['’]?t\s+apply|does\s+not\s+apply/.test(text)?5:6;
    };
    rows.sort((a,b)=>ratingOrder(a.label)-ratingOrder(b.label)||b.value-a.value);
  }else rows.sort((a,b)=>b.value-a.value);
  const root=d3.select(el);root.selectAll("*").remove();
  if(!rows.length){root.append("div").attr("class","empty-chart").text("No data available for this selection.");return;}
  const w=Math.max(280,el.clientWidth||420);
  const labelW=Math.min(170,Math.max(130,w*.40));
  const trackW=Math.max(70,w-labelW-65);
  const colors=["#221345","#452080","#6d529b","#a390c5","#d4cce6"];
  const container=root.append("div").attr("class","slide2-bar-list");
  rows.forEach((d,i)=>{
    const row=container.append("div").attr("class","slide2-bar-row");
    row.append("div").attr("class","slide2-bar-label").style("width",`${labelW}px`).text(d.label).attr("title",d.label);
    const track=row.append("div").attr("class","slide2-bar-track").style("width",`${trackW}px`);
    track.append("div").attr("class","slide2-bar-fill")
      .style("width",`${Math.max(0,Math.min(100,+d.value*100))}%`)
      .style("background",colors[i%colors.length]);
    row.append("div").attr("class","slide2-bar-val").style("color","#2f2738").text(fmt(d.value));
    row.style("cursor","pointer").on("click",()=>surveyToggleFilter(key,d.label));
  });
}

function renderMatrixQuestion(card,key,def){
  const root=card.querySelector(".survey-matrix");
  const rows=def.rows||[];
  const strategies=def.strategies||[];
  const index=DATA.matrixIndex?.[key]||[];
  const active=activeRows();
  if(!active.length){
    root.innerHTML='<div class="empty-chart">No respondents match the current filters.</div>';
    return;
  }

  const field=key==="Q18"?"carrier":"brand";
  const cellIndex=new Map();
  index.forEach((cell,i)=>cellIndex.set(`${cell.strategy}-${cell[field]}`,i));

  const counts=rows.map(row=>strategies.map(strategy=>{
    const idx=cellIndex.get(`${strategy.id}-${row.id}`);
    if(idx===undefined)return 0;
    let n=0;
    active.forEach(r=>{if(Array.isArray(r[key])&&r[key].includes(idx))n++;});
    return n/active.length;
  }));

  const selected=chartFilters[key]||null;
  let head=`<thead><tr><th>${key==="Q18"?"Carrier":"Brand"} \\ Strategy</th>`;
  strategies.forEach(s=>head+=`<th title="${escapeHtml(s.label)}">${escapeHtml(s.label.length>24?s.label.slice(0,22)+"…":s.label)}</th>`);
  head+="</tr></thead>";
  let body="<tbody>";
  rows.forEach((row,ri)=>{
    const activeRow=selected===row.label;
    body+=`<tr class="${activeRow?"matrix-selected":""}"><th class="matrix-row-head" data-row="${escapeHtml(row.label)}" title="Click to filter to ${escapeHtml(row.label)}">${escapeHtml(row.label)}</th>`;
    strategies.forEach((s,si)=>{
      const v=counts[ri][si];
      body+=`<td title="${escapeHtml(row.label)} · ${escapeHtml(s.label)} · ${fmt(v)}">${fmt(v)}</td>`;
    });
    body+="</tr>";
  });
  body+="</tbody>";
  root.innerHTML=`<div class="matrix-scroll"><table class="survey-matrix-table">${head}${body}</table></div><div class="matrix-footnote">${rows.length.toLocaleString()} ${field}s × ${strategies.length} strategies · click a row name to filter</div>`;
  root.querySelectorAll(".matrix-row-head").forEach(el=>{
    el.addEventListener("click",e=>{
      e.stopPropagation();
      surveyToggleFilter(key,el.dataset.row);
    });
  });
}

function renderSurveyCard(def,targetId="surveyQuestionGrid"){
  const key=def.key;
  const type=def.type;
  const wide=["multi","text_multi","matrix"].includes(type) || ["Q18","Q24","Q3","Q7","Q9","Q11","Q12","Q16","Q17","Q22","Q23"].includes(key);
  const card=document.createElement("article");
  card.className=`card survey-card ${wide?"survey-wide":""} ${type==="matrix"?"matrix-card":""}`;
  const note=type==="matrix"?"Full matrix · scroll horizontally/vertically · click a row to filter"
    :type==="text_multi"?"All distinct text responses · descending"
    :type==="rank"?"First-booked share · descending"
    :type==="numeric"?"Distribution of reported budget values"
    :"All answer choices · descending · click to filter";
  // Use scoped unique IDs to avoid collision when same Q appears in multiple tab grids
  const scopedId=`surveyChart_${targetId}_${key}`;
  const matrixScopedId=`surveyMatrix_${targetId}_${key}`;
  card.innerHTML=`
    <div class="card-head">
      <div class="survey-head-copy">
        <h2>${escapeHtml(surveyQuestionText(def))}</h2>
      </div>
      <span class="mini-note">${escapeHtml(note)}</span>
    </div>
    <div class="survey-base">Filtered base: ${activeRows().length.toLocaleString()} respondents</div>
    ${type==="matrix"
      ? `<div class="survey-matrix" id="${matrixScopedId}"></div>`
      : type==="rank"
        ? `<div id="${scopedId}" class="chart"></div><div class="survey-secondary"></div>`
        : `<div id="${scopedId}" class="chart"></div>`}
  `;
  const target=document.getElementById(targetId);
  if(target) target.appendChild(card);

  if(type==="matrix"){
    // Pass the matrix div element directly to avoid querySelector ID collision
    const matrixDiv=card.querySelector(`#${matrixScopedId}`);
    renderMatrixQuestionInto(matrixDiv,key,def);
  }else{
    // Use card.querySelector (scoped to this card) — never document.querySelector
    const chart=card.querySelector(`#${scopedId}`);
    if(!chart) return;
    chart.dataset.surveyKey=key;
    const data=surveyQuestionData(def,key);
    const chartHeight = type==="nps" ? 300 : type==="numeric" ? 250 : type==="rank" ? 300 : Math.max(250, Math.min(520, data.length*27+55));
    if(data.length>12) chart.classList.add("long-chart");
    // Pass element directly instead of selector string to avoid cross-grid ID collision
    if(key==="Q20") renderSurveyBarListEl(chart,data,key);
    else if(key==="Q22") horizontalBars(`#${scopedId}`,data,{
      height:300,
      color:"#530095",
      disableFilter:true,
      onClick:d=>surveyToggleFilter(key,d.label)
    });
    else renderSurveyVisualizationEl(chart,data,type,{height:chartHeight});
    if(type==="rank") renderRankSurveyQuestionEl(card,chart,key,def);
  }
}

function renderHotelPrimaryQuestions(){
  [["Q20","hotelQ20Slot"],["Q22","hotelQ22Slot"]].forEach(([key,slotId])=>{
    const slot=document.getElementById(slotId);
    const def=surveyDefinition(key);
    if(!slot||!def)return;
    slot.innerHTML="";
    renderSurveyCard(def,slotId);
    const card=slot.lastElementChild;
    if(!card)return;
    card.id=questionAnchorId(key);
    card.classList.add("hotel-primary-question-card");
    if(key==="Q20"){
      const heading=card.querySelector(".survey-head-copy h2");
      if(heading)heading.textContent="Preferred Accommodation Rating";
    }else if(key==="Q22"){
      const heading=card.querySelector(".survey-head-copy h2");
      if(heading)heading.textContent="Key Accommodation Selection Factors";
    }
  });
}


/* ---------- TAB-SPECIFIC QUESTION EXPERIENCE ----------
   The main dashboard remains visual/compact, while every survey question relevant
   to the selected tab is also exposed below it. This keeps the Power BI-like
   experience: tab -> related questions -> drill down, without mixing airline,
   hotel and travel-planning questions together. */
const TAB_QUESTION_MAP={
  overview:["Q2","Q3","Q3a","Q4","Q4a","Q4b","Q5","Q6","Q6a","Q10a","Q10"],
  behaviour:["Q7","Q8","Q8a","Q8b","Q9","Q9a","Q9b","Q9c","Q11","Q11a","Q12"],
  airline:["Q14","Q15","Q15a","Q16","Q16a","Q16b","Q17","Q18"],
  hotel:["Q19","Q20","Q21","Q21a","Q22","Q22a","Q22b","Q23","Q24"]
};

function questionAnchorId(key){ return `tab-question-${key}`; }

function renderTabQuestionExplorer(tabName){
  const keys=TAB_QUESTION_MAP[tabName];
  if(!keys)return;
  const grid=document.getElementById(`${tabName}QuestionGrid`);
  const jump=document.getElementById(`${tabName}QuestionJump`);
  if(!grid)return;
  const buildToken=++_tabQuestionBuildToken;
  grid.innerHTML="";
  if(jump){
    jump.innerHTML=keys.map(key=>{
      const def=surveyDefinition(key);
      const label=tabName==="hotel"&&key==="Q20"?"Q20":surveyQuestionText(def).replace(/\?$/," ");
      return `<button type="button" class="question-pill" data-question-target="${questionAnchorId(key)}">${escapeHtml(label)}</button>`;
    }).join("");
    jump.querySelectorAll(".question-pill").forEach(btn=>btn.addEventListener("click",()=>{
      const target=document.getElementById(btn.dataset.questionTarget);
      if(target) target.scrollIntoView({behavior:"smooth",block:"start"});
    }));
  }
  let index=0;
  const renderNext=()=>{
    if(buildToken!==_tabQuestionBuildToken || currentTab!==tabName) return;
    const key=keys[index++];
    if(!key) return;
    const def=surveyDefinition(key);
    const isPromotedHotelQuestion=tabName==="hotel"&&["Q20","Q22"].includes(key)&&document.getElementById(questionAnchorId(key));
    if(def&&!isPromotedHotelQuestion){
      renderSurveyCard(def,`${tabName}QuestionGrid`);
      const card=grid.lastElementChild;
      if(card) card.id=questionAnchorId(key);
    }
    if(index<keys.length){
      setTimeout(()=>requestAnimationFrame(renderNext),0);
    }
  };
  requestAnimationFrame(renderNext);
}

function renderAllQuestions(){
  const grid=document.getElementById("surveyQuestionGrid");
  if(!grid)return;
  grid.innerHTML="";
  const defs=surveyCatalog();
  defs.forEach(def=>renderSurveyCard(def));
  const missing=document.createElement("article");
  missing.className="card survey-missing";
  missing.innerHTML=`<div class="card-head"><div><h2>Question not present in source workbook</h2></div></div><p>This question is not present in the supplied Excel dataset, so there is no source data to visualize for it.</p>`;
  grid.appendChild(missing);
  const note=document.getElementById("surveyBaseNote");
  if(note)note.textContent=`${activeRows().length.toLocaleString()} active respondents · ${defs.length} source question blocks`;
}

function renderDestination(){
  const root=document.getElementById("destSentimentMap")||document.querySelector('[data-panel="destination"]');
  if(root && !window.updateDestSentiment) root.innerHTML='<div class="empty-chart">Loading destination sentiment module…</div>';
  ensureOptionalScriptsForTab("destination").then(()=>{
    if(typeof window.updateDestSentiment==="function") window.updateDestSentiment();
  });
}

function renderSocial(){
  const panel=document.querySelector('[data-panel="social"]');
  if(panel && !window.renderSocialLoaded) {
    const host=panel.querySelector(".chart")||panel;
    if(host) host.innerHTML='<div class="empty-chart">Loading social module…</div>';
  }
  ensureOptionalScriptsForTab("social").then(()=>{
    if(window.renderSocial && window.renderSocial!==renderSocial) window.renderSocial();
  });
}

/* Final active-tab router adds the complete survey tab without changing the original tabs. */
let _renderActiveQueued=false;
function renderActive(){
  if(!DATA)return;
  if(_renderActiveQueued) return;
  _renderActiveQueued=true;
  requestAnimationFrame(()=>{
    _renderActiveQueued=false;
    if(!DATA)return;
    if(currentTab==="all"){ renderAllQuestions(); return; }
    const pkey=PRECOMPUTED_TAB_KEY[currentTab];
    if(pkey && _manifest?.precomputed?.[pkey] && !PRECOMPUTED.tabs[pkey] && !_precomputedLoading[pkey]){
      ensurePrecomputedTab(pkey).then(()=>{ if(DATA && currentTab!=="all") renderActive(); });
    }
    const fn={overview:renderOverview,behaviour:renderBehaviour,airline:renderAirline,hotel:renderHotel,segments:renderSegments,market:renderMarket,destination:renderDestination,social:renderSocial}[currentTab];
    if(fn)fn();
  });
}

/* If the complete-survey tab is selected, keep its content in sync with filters. */
const _oldSetFilterDim=setFilterDim;
function setFilterDim(dim){
  filterDim=dim;
  const cfg=FILTER_CONFIG.find(f=>f.value===dim)||FILTER_CONFIG[0];
  const valid=filterOptions(cfg);
  filterSelections[dim]=(filterSelections[dim]||[]).filter(v=>valid.includes(v));
  activeSelections=[...(filterSelections[dim]||[])];
  segment=selectionLabel(activeSelections);
  updateFilterSummaries();
  updateSegmentBase();
  renderActive();
}


/* ============================================================
   FINAL FILTER/DATA PATCH — v3
   - Region options come from respondent data
   - No market is selected by default
   - Region filter is fully multi-select
   - Class/Companion options remain data-driven
   - Keep All Survey Questions usable with the same renderer
   ============================================================ */
function filterOptions(cfg){
  if(!DATA || !cfg) return [];
  const key=cfg.value;
  if(key==="Region"){
    return [...new Set((DATA.records||[]).map(r=>clean(r.Region)).filter(Boolean))]
      .sort((a,b)=>REGIONS.indexOf(a)-REGIONS.indexOf(b));
  }
  if(key==="Class"){
    const field=currentTab==="hotel" ? "accommodation" : "cabinClass";
    return [...new Set((DATA.records||[]).map(r=>clean(r[field])).filter(Boolean))].sort();
  }
  if(key==="Companion"){
    return [...new Set((DATA.records||[]).map(r=>clean(r.travelCompanions||r.Companion)).filter(Boolean))].sort();
  }
  if(key==="Trip Type") return TRIP_TYPES.slice();
  if(key==="Age Group") return ["18-24","25-34","35-44","45-54","55-65","65+","25–44"];
  if(key==="Gender") return ["Male","Female","Prefer not to say"];
  if(key==="Income") return ["Low","Medium","High"];
  if(key==="Children") return ["Yes","No"];
  if(key==="Marital Status") return ["Single, never married","Living with partner","Married","Separated","Divorced","Widowed"];
  if(key==="AccomClass") return [...new Set((DATA.records||[]).map(r=>clean(r.accommodation)).filter(Boolean))].sort();
  if(key==="Companion") return [...new Set((DATA.records||[]).map(r=>clean(r.travelCompanions)).filter(Boolean))].sort();
  return (DATA.filterOptions?.[key]||[]).filter(Boolean);
}

function initFilterState(){
  FILTER_CONFIG.forEach(cfg=>{
    /* IMPORTANT: dashboard opens on ALL, never India. */
    filterSelections[cfg.value]=[];
  });
  filterSelections.Market=[];
  filterSelections.Region=[];
  filterSelections.RegionMarket=[];
}

function resetFilters(){
  return runDashboardUpdate(()=>{
    chartFilters={};
    FILTER_CONFIG.forEach(cfg=>{ filterSelections[cfg.value]=[]; });
    filterSelections.Market=[];
    filterSelections.Region=[];
    filterSelections.RegionMarket=[];
    activeSegmentView="age";
    filterDim="Market";
    activeSelections=[];
    segment="All";
    if (typeof window._dSentClear === "function") window._dSentClear();
    if(typeof invalidateRowCache==="function") invalidateRowCache();
    buildFilterControlsCascade();
    updateSegmentBase();
    renderActive();
  },"Resetting dashboard...");
}

function rowMatchesDimension(r,dim,vals){
  if(!vals || !vals.length) return true;
  if(dim==="AccomClass") return vals.includes(clean(r.accommodation));
  if(dim==="Region") return vals.includes(clean(r.Region));
  if(dim==="Market") return vals.includes(clean(r.Market));
  if(dim==="Class"){
    const field=currentTab==="hotel" ? "accommodation" : "cabinClass";
    return vals.includes(clean(r[field]));
  }
  if(dim==="Companion"){
    const v=clean(r.travelCompanions||r.Companion);
    if(Array.isArray(r.travelCompanions)) return r.travelCompanions.some(x=>vals.includes(clean(x)));
    return vals.includes(v);
  }
  if(dim==="Age Group" && vals.includes("25–44")){
    const allowed=vals.flatMap(v=>v==="25–44"?["25-34","35-44"]:[v]);
    return allowed.includes(clean(r[dim]));
  }
  if(dim==="Trip Type") return vals.includes(clean(r[dim]));
  return vals.includes(clean(r[dim]));
}

function updateSegmentBase(){
  const rows=activeRows();
  d3.select("#segmentBase").text(`${rows.length.toLocaleString()} respondents`);
  const hasFilters=Object.values(filterSelections).some(v=>v&&v.length)||Object.keys(chartFilters).length;
  d3.select("#chipClear").attr("hidden",hasFilters?null:true);
}

function setFilterDim(dim){
  return runDashboardUpdate(()=>{
    filterDim=dim;
    const cfg=FILTER_CONFIG.find(f=>f.value===dim)||FILTER_CONFIG[0];
    const valid=filterOptions(cfg);
    filterSelections[dim]=(filterSelections[dim]||[]).filter(v=>valid.includes(v));
    activeSelections=[...(filterSelections[dim]||[])];
    segment=selectionLabel(activeSelections);
    if(typeof invalidateRowCache==="function") invalidateRowCache();
    updateFilterSummaries(); updateSegmentBase(); renderActive();
  },"Updating dashboard...");
}
