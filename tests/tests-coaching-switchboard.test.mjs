import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const ui = read("components/tests-coaching-switchboard.tsx");
const css = read("components/tests-coaching-switchboard.module.css");
const legacy = read("components/ideas-discovery.tsx");

test("Four-path hub is the canonical public first screen in EN/RU/ES", () => {
  assert.match(legacy, /<TestsCoachingSwitchboard locale=\{locale\} templeContent=\{<>/);
  assert.match(legacy, /aria-labelledby="tests-coaching-title"/);
  assert.match(ui, /const pathOrder: Path\[\] = \["profile", "temple", "coaching", "support"\]/);
  assert.match(ui, /data-tests-coaching-path=\{key\}/);
  assert.match(ui, /aria-expanded=\{path === key\}/);
  assert.match(ui, /aria-controls="tests-coaching-detail"/);
  assert.match(ui, /hidden=\{!path\}/);
  for (const label of ["Tests & Coaching", "Тесты и коучинг", "Tests y coaching"]) {
    assert.ok(ui.includes(label), "missing localized heading: " + label);
  }
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /max-width:360px/);
  assert.match(css, /focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
});

test("Profile selector provides type, editable scale set and real cleared test handoffs", () => {
  for (const type of ["personal", "relationships", "business", "whole"]) {
    assert.match(ui, new RegExp("  " + type + ": \\["));
  }
  assert.match(ui, /data-profile-builder/);
  assert.match(ui, /aria-pressed=\{profileKind === kind\}/);
  assert.match(ui, /type="checkbox" checked=\{scales.includes\(key\)\}/);
  assert.match(ui, /onClick=\{\(\) => setScales\(\[\.\.\.scaleOrder\]\)\}/);
  const catalog = read("data/assessments/catalog.js");
  const entries = ui.slice(ui.indexOf("const startableTests:"), ui.indexOf("const defaultScales:"));
  const keys = [...entries.matchAll(/:\s*"([a-z0-9-]+)"/g)].map(match => match[1]);
  assert.equal(keys.length, 5);
  assert.equal(new Set(keys).size, 5);
  for (const key of keys) {
    const pos = catalog.indexOf("key: '" + key + "'");
    assert.ok(pos > 0, "missing test in public catalog: " + key);
    const record = catalog.slice(pos, pos + 1200);
    assert.match(record, /startable: true/);
    assert.match(record, /rightsStatus: 'cleared'/);
    assert.match(record, /guestEligible: true/);
  }
  assert.match(ui, /client\?startTests=\$\{startableTests\[scale\]\}/);
  assert.match(ui, /\/client\/tests/);
  assert.match(ui, /\/app/);
});

test("Temple insight stays private in browser; coaching and support reuse their shipped routes", () => {
  assert.match(ui, /data-tests-coaching-temple/);
  assert.match(legacy, /getHexagram\(result\.hexagram\)/);
  assert.match(legacy, /drawRandomHexagram\(\)/);
  assert.match(ui, /\/academy\/coaching\/greek/);
  assert.match(ui, /\/academy\/coaching\/egyptian/);
  assert.match(ui, /\/coaching/);
  assert.match(ui, /\/services#consultation/);
  assert.match(ui, /\/courses\/antistress/);
  assert.match(ui, /data-tests-coaching-support/);
  assert.match(ui, /setStage\("practice"\)/);
  assert.match(ui, /setStage\("done"\)/);
  for (const term of ["fetch(", "localStorage", "sessionStorage", "sendBeacon", "XMLHttpRequest", "gtag(", "fbq("]) {
    assert.ok(!ui.includes(term), "public question or scale data must not leave browser via " + term);
  }
});

test("TSX parses cleanly and all CSS classes are declared", () => {
  const source = ts.createSourceFile("tests-coaching-switchboard.tsx", ui, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.deepEqual(source.parseDiagnostics.map(item => item.messageText), []);
  const used = [...new Set([...ui.matchAll(/styles\.([a-zA-Z][a-zA-Z0-9]*)/g)].map(m => m[1]))];
  const available = new Set([...css.matchAll(/\.([a-zA-Z][a-zA-Z0-9]*)/g)].map(m => m[1]));
  assert.deepEqual(used.filter(value => !available.has(value)), []);
});
