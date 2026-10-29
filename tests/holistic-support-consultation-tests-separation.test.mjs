import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

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
  assert.ok(gallery.includes('aria-label={c.categoryShort[category] === c.categories[category]'));
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
  assert.match(mobile, /<button type="button" className=\{styles\.testsShortcut\} data-support-tool="tests"\s+aria-pressed=\{choice === "tests"\} aria-controls="support-tests-panel"/);
  assert.match(mobile, /onClick=\{\(\) => changeChoice\("tests"\)\}/);
  assert.doesNotMatch(mobile, /<Link[^\n]*data-support-tool="tests"/);\n  assert.equal((mobile.match(/data-support-tool="tests"/g) || []).length, 1, "single accessible Tests shortcut");
  assert.ok(mobile.includes('data-support-open-tests'));
  assert.ok(mobile.includes('data-support-tests-personality'));
});

// Evaluate the actual category JSX with an inert element factory, not a hand-written label. No gallery
// mount, effects, browser, requests, private records or click handlers execute.
const galleryAst = ts.createSourceFile("gallery.tsx", gallery, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = new Map(), categoryButtons = [];
function collect(node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name))
    declarations.set(node.name.text, node.initializer);
  if (ts.isJsxElement(node) && node.openingElement.tagName.getText(galleryAst) === "button" &&
      node.openingElement.attributes.properties.some(attribute =>
        ts.isJsxAttribute(attribute) && attribute.name.getText(galleryAst) === "data-support-consultation-category"))
    categoryButtons.push(node);
  ts.forEachChild(node, collect);
}
collect(galleryAst);
assert.equal(galleryAst.parseDiagnostics.length, 0);
assert.equal(categoryButtons.length, 1);
const compile = expression => ts.transpileModule("(" + expression + ")", {
  compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const consultationCopy = vm.runInNewContext(compile(declarations.get("consultationUi").getText(galleryAst)), {});
let categoryArray = declarations.get("CONSULTATION_CATEGORIES");
while (ts.isAsExpression(categoryArray)) categoryArray = categoryArray.expression;
assert.ok(ts.isArrayLiteralExpression(categoryArray));
const categoryIds = categoryArray.elements.map(element => {
  assert.ok(ts.isObjectLiteralExpression(element));
  const id = element.properties.find(property => property.name?.getText(galleryAst) === "id");
  assert.ok(id && ts.isPropertyAssignment(id) && ts.isStringLiteral(id.initializer));
  return id.initializer.text;
});
assert.deepEqual(Object.keys(consultationCopy), ["en", "ru", "es"]);
assert.equal(categoryIds.length, 5);
function categoryButtonTree(jsx, locale, category) {
  const rejectClick = () => { throw new Error("click handler must remain inert"); };
  const React = { createElement: (type, props, ...children) =>
    ({ type, props: props || {}, children: children.flat() }) };
  const element = vm.runInNewContext(compile(jsx), {
    React, Icon: "svg", styles: { consultCategory: "category" },
    c: consultationCopy[locale], category, consultCategory: category,
    setConsultCategory: rejectClick, setSelectedId: rejectClick,
    setConsultPhotoIndex: rejectClick, setConsultDetailsOpen: rejectClick,
  });
  assert.equal(element.type, "button");
  assert.equal(element.props["aria-pressed"], true);
  const label = element.children.find(child => child.type === "span");
  assert.ok(label);
  assert.ok(label.children.every(child => typeof child === "string"));
  assert.equal(typeof element.props["aria-label"], "string");
  return { name: element.props["aria-label"], visible: label.children.join("") };
}
test("all 15 actual category JSX labels preserve visible text first and full category meaning", () => {
  for (const locale of Object.keys(consultationCopy)) for (const category of categoryIds) {
    const { name, visible } = categoryButtonTree(categoryButtons[0].getText(galleryAst), locale, category);
    assert.equal(visible, consultationCopy[locale].categoryShort[category]);
    assert.ok(name.startsWith(visible), locale + ":" + category);
    assert.ok(name.includes(consultationCopy[locale].categories[category]), locale + ":" + category);
  }
});
test("negative control rejects the previous names that hid Sessions and Empresas from voice commands", () => {
  const button = categoryButtons[0];
  const attribute = button.openingElement.attributes.properties.find(item =>
    ts.isJsxAttribute(item) && item.name.getText(galleryAst) === "aria-label");
  assert.ok(attribute);
  const previous = button.getText(galleryAst).replace(attribute.getText(galleryAst), "aria-label={c.categories[category]}");
  const mismatches = [];
  for (const locale of Object.keys(consultationCopy)) for (const category of categoryIds) {
    const { name, visible } = categoryButtonTree(previous, locale, category);
    if (!name.toLocaleLowerCase(locale).includes(visible.toLocaleLowerCase(locale))) mismatches.push(locale + ":" + category);
  }
  assert.deepEqual(mismatches, ["en:all", "es:business"]);
});
