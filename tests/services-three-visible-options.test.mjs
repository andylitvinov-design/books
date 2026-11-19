import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const catalog = read("components/services-unified-catalog.tsx");
const source = read("components/services-three-visible-options.tsx");
const css = read("components/services-three-visible-options.module.css");
const layout = read("components/services-unified-catalog.module.css");
const page = read("app/[locale]/services/page.tsx");

const ids = ["reiki","browse","reading","consultation","services","business","video","courses","coach","magical","homeopathy"];
const information = ["about","testimonials","mytube","directory"];

test("all eleven real service directions render three real offers immediately; no blank accordion required", () => {
  for (const [index, id] of ids.entries()) {
    const start = source.indexOf("  " + id + ": [");
    const next = source.indexOf("  " + ids[index + 1] + ": [");
    const end = next < 0 ? source.indexOf("\n};",start) : next;
    assert.ok(start >= 0 && end > start, "Missing group " + id);
    const segment = source.slice(start,end);
    assert.equal((segment.match(/\{ id:"/g)||[]).length,3,"Exactly 3 published choices: " + id);
    assert.equal((segment.match(/path:"/g)||[]).length,3,"Each option has its own destination: " + id);
    assert.equal((segment.match(/price:"/g)||[]).length,3,"Each option has a known or explicitly unknown price: " + id);
  }
  assert.match(catalog, /<ServicesThreeVisibleOptions locale=\{context\.locale\} id=\{id\}/);
  assert.match(catalog, /isThreeOptionGroup\(id\)/);
  assert.match(source, /data-services-three-visible=\{id\}/);
  assert.match(source, /data-services-offer-count=\{items\.length\}/);
  for (const id of information) assert.ok(catalog.includes('id="' + id + '"') || page.includes('id="' + id + '"'));
});

test("price badge uses published free/50/100 limits, never invented price or false booking", () => {
  for (const price of ['"free"','"express"','"full"','"from50"','"quote"'])
    assert.ok(source.includes(price), price);
  for (const price of ["Бесплатно","€50 · 30 мин","€100 · 60 мин","Цена уточняется","Price on request","Precio a consultar"])
    assert.ok(source.includes(price), price);
  assert.match(source, /data-service-price-kind=\{offer\.price\}/);
  assert.match(source, /data-service-price>\{price\}/);
  assert.match(css, /\.price\{position:absolute;top:0;right:0/);
});

test("each visible offer has own two actions, safe messenger context and full-width disclosure", () => {
  assert.match(source, /<ServicesCardActions locale=\{locale\} title=\{title\} description=\{description\}/);
  assert.match(source, /href=\{href\} request=\{description\} option=\{price\}/);
  assert.match(css, /\.actions\{grid-column:1\/-1;grid-row:2/);
  assert.match(css, /\.image\{position:relative/);
  assert.match(source, /<Image src=\{offer\.photo\} alt="" fill unoptimized loading="lazy"/);
  const actions=read("components/services-card-actions.tsx");
  assert.match(actions,/MandatoryMessengerActions/);
  assert.match(actions,/data-service-card-details/);
  assert.match(actions,/data-service-card-order/);
});

test("optional legacy details stay mounted; compact cards are always visible on mobile and desktop", () => {
  assert.match(catalog, /<button type="button" className=\{styles\.preview\}/);
  assert.match(catalog, /<div id=\{regionId\} className=\{styles\.content\}/);
  assert.match(catalog, /aria-controls=\{regionId\}\s+onClick=\{\(\) => context\.toggle\(id\)\}/);
  assert.match(layout, /\.grid\{grid-template-columns:minmax\(0,1fr\);gap:10px\}/);
  assert.match(layout, /@media\(min-width:761px\)/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|fetch\(|setTimeout\(/);
  assert.match(page, /<ServicesCompactPanel id="homeopathy"/);
  assert.match(page, /<ServicesCompactPanel id="reiki"/);
  assert.match(page, /<ServicesCompactPanel id="video"/);
});

const quizSource = read("components/services-assist-quiz.tsx");
const quickNavigation = read("lib/services-quick-categories.ts");
test("all six photograph category cards and business stay on the same Services page with visible 3-option targets", () => {
  const targets = {
    therapy: "consultation", homeopathy: "homeopathy", constellations: "services",
    practice: "reiki", study: "courses", videos: "video", business: "services",
  };
  for (const [key, panel] of Object.entries(targets)) {
    assert.ok(quickNavigation.includes(key + ': "' + panel + '"'), "Missing category-to-group link: " + key);
    assert.ok(page.includes('<ServicesCompactPanel id="' + panel + '"'), "Missing target group: " + panel);
  }
  assert.match(quizSource, /href=\{"#" \+ serviceGroupAnchor\(servicesCategoryTargets\[key\]\)\}/);
  assert.match(quizSource, /data-services-quiz-target=\{servicesCategoryTargets\[key\]\}/);
  assert.match(catalog, /id=\{serviceGroupAnchor\(id\)\} tabIndex=\{-1\}/);
  assert.doesNotMatch(quizSource, /\{categories\.map\(\(\{key,path/);
  assert.match(layout, /\.panel\[id\^="service-group-"\]\{scroll-margin-top/);
  const visibleFirst = ["consultation", "homeopathy", "services", "reiki", "courses", "video"];
  const positions = visibleFirst.map(key => page.indexOf('<ServicesCompactPanel id="' + key + '"'));
  assert.ok(positions.every(position => position >= 0));
  assert.ok(positions.every((position, index) => index === 0 || position > positions[index - 1]),
    "Six quick category groups must be shown first in a matching order");
  for (const key of ["about", "testimonials", "mytube", "directory"]) {
    assert.ok(page.includes('<ServicesCompactPanel id="' + key + '"'), "Retain informational panel " + key);
  }
  assert.match(source, /path:"services\/imagery-therapy"/);
  assert.match(source, /path:"services\/systemic-constellations"/);
  assert.match(source, /path:"services\/business-consulting"/);
});
