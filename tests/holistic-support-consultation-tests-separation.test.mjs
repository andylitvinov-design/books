import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const mobile = read("components/holistic-support-mobile.tsx");
const mobileCss = read("components/holistic-support-mobile.module.css");
const gallery = read("components/holistic-support-master-gallery.tsx");
const galleryCss = read("components/holistic-support-master-gallery.module.css");

test("consultation and tests are independent localized actions", () => {
  for(const label of ['consultation: "Consultation"', 'consultation: "Консультация"',
    'consultation: "Consulta"', 'testsShort: "Тесты"']) assert.ok(mobile.includes(label));
  assert.ok(mobile.includes('data-support-tool="tests"'));
  assert.ok(mobile.includes('data-support-tests-panel'));
  assert.ok(mobile.includes('document.getElementById("support-tests-panel")?.scrollIntoView('));
  assert.ok(mobile.includes('choice === "tests"'));
  assert.ok(mobile.includes('kind="consultation"'));
  assert.ok(gallery.includes('consultation: "Консультация"'));
  assert.ok(!mobile.includes('Тест / сессия'));
});
test("tests stage uses existing routes with no local photo or scores transferred", () => {
  for(const path of ["/client/tests","/personality-profiles","/tests"])
    assert.ok(mobile.includes(path), path);
  for(const path of ["app/[locale]/client/tests/page.tsx",
    "app/[locale]/personality-profiles/page.tsx","app/[locale]/tests/page.tsx"])
    assert.ok(read(path).includes("export default"), path);
  assert.ok(mobile.includes('aria-controls="support-tests-panel"'));
  assert.ok(mobile.includes('data-support-open-tests'));
  assert.ok(mobile.includes('Оценки и фото с этого экрана не передаются'));
  assert.ok(!mobile.includes("navigator.sendBeacon"));
});
test("compact scrolling service category chips retain names and filtering", () => {
  assert.ok(gallery.includes('aria-label={c.categories[category]}'));
  assert.ok(gallery.includes('{c.categoryShort[category]}'));
  assert.ok(gallery.includes("matchesConsultationCategory(offer, consultCategory)"));
  assert.ok(galleryCss.includes("overflow-wrap:normal; white-space:nowrap"));
  assert.ok(galleryCss.includes("min-height:44px"));
  assert.ok(mobileCss.includes(".toolShortcuts .mandalaShortcut"));
  assert.ok(mobileCss.includes(".profile > .testsShortcut"));
  assert.ok(mobileCss.includes("grid-column:1/-1"));
});
test("Mandala full-width shortcut and central Tests chip each preserve 44px touch targets", () => {
  const overrides = [...mobileCss.matchAll(/\.toolShortcuts \.mandalaShortcut\s*\{([^}]*)\}/g)]
    .map(([, styles]) => styles);
  assert.equal(overrides.length, 3, "base, mobile and 320px CSS each set a touch target");
  for(const styles of overrides) assert.match(styles, /(?:^|;)\s*min-height:\s*44px\b/,
    "Mandala button must not shrink below the 44px touch target");
  assert.match(mobileCss, /\.testsShortcut \{[\s\S]*?min-height: 44px;/);
  assert.match(mobileCss, /\.profile > \.testsShortcut \{[\s\S]*?min-height: 44px;/);
});
test("both changed TSX components parse without diagnostics", () => {
  for(const [name,source] of [["mobile",mobile],["gallery",gallery]]) {
    const result=ts.transpileModule(source,{fileName:name+".tsx",reportDiagnostics:true,
      compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
    assert.deepEqual((result.diagnostics??[]).filter(d=>d.category===ts.DiagnosticCategory.Error)
      .map(d=>ts.flattenDiagnosticMessageText(d.messageText," ")),[]);
  }
});

test("350–430px consultation labels fit; Goals→Tests opens one consistent tab", () => {
  for(const label of ['consultation: "Session"','consultation: "Сессия"',
    'consultation: "Sesión"']) assert.ok(mobile.includes('optionsCompact: {') && mobile.includes(label));
  assert.match(mobile, /<button type="button"\s+data-support-goal-action="tests" aria-pressed=\{choice === "tests"\}/);
  assert.match(mobile, /aria-controls="support-tests-panel" onClick=\{\(\) => changeChoice\("tests"\)\}/);
  assert.doesNotMatch(mobile, /<Link[^\n]*data-support-goal-action="tests"/);
  assert.ok(mobile.includes('data-support-open-tests'));
  assert.ok(mobile.includes('data-support-tests-personality'));
});
