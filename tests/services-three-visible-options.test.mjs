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
    practice: "reiki", study: "courses", videos: "video", business: "business",
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
  const visibleFirst = ["consultation", "homeopathy", "services", "business", "browse", "courses"];
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

test("Support keeps its four-question first screen and renders ten compact categories below it", () => {
  const uniform = read("components/services-support-uniform.module.css");
  assert.match(page, /<ServicesAssistQuiz locale=\{locale\}/);
  const idsInPage = [...page.matchAll(/<ServicesCompactPanel id="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(idsInPage.slice(0, 10),
    ["consultation","homeopathy","services","business","browse","courses","video","coach","reiki","reading"]);
  assert.equal(idsInPage.length,14, "Ten service groups and four informational sections");
  assert.ok(!idsInPage.includes("magical"), "Ritual extras belong in Shamanica / optional reading formats");
  assert.ok(page.indexOf("<ServicesPersonalConsultationMobile") > page.indexOf('<ServicesCompactPanel id="consultation">'),
    "Legacy diagnostics are optional content, not an extra giant top-level section");
  assert.ok(page.indexOf("<ServicesMagicalHelpMobile") > page.indexOf('<ServicesCompactPanel id="reading">'),
    "Published legacy formats are preserved for people who open the reading disclosure");
  assert.match(uniform, /data-services-unified-catalog/);
  assert.match(uniform, /grid-template-columns:76px minmax\(0,1fr\)/);
  assert.match(uniform, /min-height:44px!important/);
  assert.match(uniform, /@media \(max-width:350px\)/);
  assert.match(uniform, /@media \(min-width:761px\)/);
});

test("collapsed legacy panels truly hide while compact category contract remains", () => {
  assert.match(catalog, /visibility:"hidden"/);
  assert.match(catalog, /position:"absolute"/);
  assert.match(read("scripts/verify-public-services-production.mjs"), /Oversized service category/);
  assert.match(read("scripts/verify-public-services-production.mjs"), /Three offers must stack vertically/);
});


test("large legacy consultation mounts only on explicit detail or #consultation deep link", () => {
  assert.match(catalog, /\(id === "consultation" \|\| id === "directory"\) && !expanded \? null : children/);
  const browser = read("scripts/verify-public-services-production.mjs");
  assert.match(browser, /locator\("\[data-assist-personal-consultation\]"\)\)\.toHaveCount\(0\)/);
  assert.match(browser, /services#consultation/);
  assert.match(browser, /await expect\(consultation\)\.toBeVisible\(\)/);
});


test("the legacy directory is not an extra visible order form until opened", () => {
  assert.match(catalog, /id === "directory"/);
  const browser = read("scripts/verify-public-services-production.mjs");
  assert.ok(browser.includes('[data-services-unified-catalog] [data-service-lead-capture]:visible'));
  assert.match(browser, /locator\('\[data-services-unified-panel="directory"\]'\)/);
  assert.match(browser, /await expect\(directory\.locator\('\[data-service-lead-capture\]'\)\)\.toHaveCount\(0\)/);
  assert.match(browser, /await visible\(directory\.locator\('\[data-services-directory-invitation\]'\)\)/);
});


test("Spanish and shared Support expose the same ten categories, without duplicate lead capture", () => {
  const es=read("app/es/services/page.tsx");
  const expected=["consultation","homeopathy","services","business","browse","courses","video","coach","reiki","reading"];
  const order = text => [...text.matchAll(/<ServicesCompactPanel id="([^"]+)"/g)].map(m => m[1]).slice(0,10);
  assert.deepEqual(order(es),expected);
  assert.deepEqual(order(page),expected);
  for(const text of [es,page]){
    assert.doesNotMatch(text, /<CompactLeadCapture/);
    assert.match(text, /<ServicesDirectoryInvitation/);
  }
  assert.match(es, /<ServicesAssistQuiz locale="es" \/>/);
});

test("mobile 10×3 Support card rail uses symmetric safe margins, not a short right edge", () => {
  const uniform=read("components/services-support-uniform.module.css");
  assert.match(uniform,/width:calc\(100% - 8px\)!important/);
  assert.doesNotMatch(uniform,/width:calc\(100% - 32px\)!important/);
  assert.match(uniform,/max-width:none!important/);
  const browser=read("scripts/verify-public-services-production.mjs");
  assert.match(browser,/Compact service cards must reach phone right margin/);
  assert.match(browser,/Math\.abs\(bounds\.left - rightMargin\) <= 3/);
  assert.match(browser,/services-" \+ locale \+ "-three-horizontal-offers-390\.png/);
});
