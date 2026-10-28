import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { TAOIST_TALISMANS } from "../lib/practitioners/taoist-talismans.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const viewer = read("components/holistic-support-talisman-viewer.tsx");
const styles = read("components/holistic-support-talisman-viewer.module.css");
const mobile = read("components/holistic-support-mobile.tsx");

test("Talisman categories are a horizontal, six-direction carousel on the existing Support screen", () => {
  assert.match(mobile, /<HolisticSupportTalismanViewer key=\{focus\}/);
  assert.match(viewer, /data-support-talisman-category-switcher/);
  assert.match(viewer, /data-support-talisman-categories-next onClick=\{scrollCategories\}/);
  assert.match(viewer, /aria-pressed=\{goal === id\}/);
  assert.match(viewer, /onClick=\{\(\) => chooseCategory\(id\)\}/);
  for (const key of ["energy", "money", "relationships", "goals", "balance", "calm"]) {
    assert.ok(viewer.includes('id: "' + key + '"'), "category " + key);
  }
  for (const label of ["Талисманы силы", "Талисманы денег", "Талисманы любви", "Талисманы цели",
    "Strength talismans", "Talismanes de amor"]) assert.ok(viewer.includes(label), label);
  assert.match(styles, /\.categoryRail \{[^}]*overflow-x: auto/);
  assert.match(styles, /scroll-snap-type: x mandatory/);
  assert.match(styles, /@media \(max-width:350px\)/);
  assert.match(styles, /height: 288px; min-height: 288px/);
  assert.match(styles, /height: 282px; min-height: 282px/);
  const mainCss = read("components/holistic-support-mobile.module.css");
  assert.match(mainCss, /\.toolButton\[data-support-tool="talisman"\]\[aria-pressed="true"\]/);
  assert.match(mainCss, /#9551da,#6934b3/);
  assert.match(viewer, /data-support-talisman-artwork/);
  assert.match(viewer, /className=\{styles\.artworkRing\}/);
  assert.match(styles, /\.artworkRing \{[^}]*border: 6px solid/);
  assert.match(styles, /\.artworkLabel \{/);
  assert.match(viewer, /heroTitle = selected\[locale\]\.title\.replace/);
  assert.match(viewer, /aria-expanded=\{allCategoriesOpen\}/);
  assert.match(viewer, /data-expanded=\{allCategoriesOpen \? "true" : "false"\}/);
  assert.match(styles, /\.categoryFrame\[data-expanded="true"\] \.categoryRail/);
});

test("Master, tradition and description controls are operable and honest about published data", () => {
  for (const key of ["master", "tradition", "description"]) {
    assert.ok(viewer.includes('data-support-talisman-filter="' + key + '"'), key);
  }
  assert.match(viewer, /aria-expanded=\{masterOpen\}/);
  assert.match(viewer, /id="talisman-master-note"/);
  assert.match(viewer, /setTradition\(event.target.value/);
  assert.match(viewer, /setProperty\(event.target.value/);
  assert.match(viewer, /\.filter\(item => property === "all" \|\| item.id === property\)/);
  assert.match(viewer, /t\.properties\[property\]/);
  assert.equal(TAOIST_TALISMANS.length, 3, "only three source-backed designs");
  assert.match(viewer, /Price and practitioner are never invented/);
  assert.doesNotMatch(viewer, /50,00|45,00|ready to ship|guaranteed cure/);
});

test("The primary Order button opens the existing consented quote cart, never fake checkout", () => {
  assert.match(viewer, /data-support-talisman-request onClick=\{request\}/);
  assert.match(viewer, /readBrowserTalismanCart\(\)/);
  assert.match(viewer, /saveBrowserTalismanCart/);
  assert.match(viewer, /setOrderOpen\(true\)/);
  assert.match(viewer, /<TaoistTalismanCart locale=\{locale\} inline/);
  for (const label of ["Request talisman", "Заказать талисман", "Solicitar talismán"]) {
    assert.ok(viewer.includes(label), label);
  }
  assert.doesNotMatch(viewer, /fetch\(|autoplay=1|navigator\.sendBeacon/);
  const parsed = ts.transpileModule(viewer, {
    fileName:"holistic-support-talisman-viewer.tsx", reportDiagnostics:true,
    compilerOptions:{ jsx:ts.JsxEmit.ReactJSX, target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.ESNext },
  });
  assert.deepEqual((parsed.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error)
    .map(d => ts.flattenDiagnosticMessageText(d.messageText, " ")), []);
});
