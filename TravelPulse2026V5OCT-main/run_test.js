const { JSDOM } = require("jsdom");
const fs = require("fs");

const html = fs.readFileSync("index.html", "utf8");
const appFinal = fs.readFileSync("app-final.js", "utf8");
const smartFilters = fs.readFileSync("smart-filters.js", "utf8");
const enhancement = fs.readFileSync("enhancement.js", "utf8");
const data = fs.readFileSync("data.json", "utf8");

const dom = new JSDOM(html, { runScripts: "outside-only", url: "http://localhost:8090" });
const window = dom.window;

// Mock d3
window.d3 = {
  select: () => ({ selectAll: () => ({ remove: () => {} }), append: () => ({ attr: () => ({ attr: () => ({ attr: () => ({ style: () => ({}) }) }) }) }) }),
  scaleQuantile: () => ({ domain: () => ({ range: () => () => {} }) }),
  geoNaturalEarth1: () => ({ fitExtent: () => {}, scale: () => ({ translate: () => {} }) }),
  geoPath: () => () => {},
  max: () => 10,
  format: () => () => "fmt"
};
window.topojson = { feature: () => ({ features: [] }) };
window.WORLD = null;
window.DATA = JSON.parse(data);

try {
  window.eval(appFinal);
  window.eval(smartFilters);
  window.eval(enhancement);

  // simulate data load
  window.eval('renderOverview()');
  console.log("SUCCESS");
} catch (e) {
  console.log("ERROR:", e);
}
