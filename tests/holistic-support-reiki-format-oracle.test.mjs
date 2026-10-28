import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Selected real JSX and callbacks only: no React mount, hooks, fetch or provider.
const source = readFileSync(new URL("../components/holistic-support-master-gallery.tsx", import.meta.url), "utf8");
const keys = ["session", "initiation", "course"];
const labels = {
  en: ["Session", "Initiation", "Programme"],
  ru: ["Сессия", "Инициация", "Программа"],
  es: ["Sesión", "Iniciación", "Programa"],
};
const all = (node, predicate) => {
  const found = [];
  const visit = child => { if (predicate(child)) found.push(child); ts.forEachChild(child, visit); };
  visit(node);
  return found;
};
const one = values => { assert.equal(values.length, 1, "one live source binding"); return values[0]; };
const declarations = statements => statements.filter(ts.isVariableStatement).flatMap(x => Array.from(x.declarationList.declarations));
const named = (statements, name) => one(declarations(statements).filter(x => x.name.getText() === name));
const attr = (node, name) => node.attributes.properties.find(x => ts.isJsxAttribute(x) && x.name.getText() === name);
const jsx = (tag, props, ...children) => ({ tag, props: props || {}, children: children.flat(Infinity).filter(x => x !== false && x != null) });
const descendants = node => typeof node === "object" && node ? [node, ...node.children.flatMap(descendants)] : [];
const text = node => typeof node === "string" || typeof node === "number" ? String(node) : (node?.children || []).map(text).join("");
function evaluate(expression, bindings = {}) {
  const compiled = ts.transpileModule("globalThis.result = (" + expression + ");", {
    compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, jsxFactory: "jsx" },
  }).outputText;
  const context = { ...bindings, jsx };
  vm.runInNewContext(compiled, context, { timeout: 1000 });
  return context.result;
}
function selectors(input = source) {
  const file = ts.createSourceFile("gallery.tsx", input, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.equal(file.parseDiagnostics.length, 0);
  const component = one(file.statements.filter(x => ts.isFunctionDeclaration(x) && x.name?.text === "HolisticSupportMasterGallery"));
  assert.ok(component.modifiers?.some(x => x.kind === ts.SyntaxKind.ExportKeyword), "actual exported component");
  const statements = component.body.statements;
  const result = one(statements.filter(ts.isReturnStatement)).expression;
  const unwrap = node => ts.isParenthesizedExpression(node) ? unwrap(node.expression) : node;
  const returnRoot = unwrap(result);
  assert.ok(ts.isJsxElement(returnRoot));
  assert.ok(attr(returnRoot.openingElement, "data-support-master-viewer"));
  const stage = named(statements, "reikiStage");
  assert.ok(ts.isConditionalExpression(stage.initializer));
  assert.equal(stage.initializer.condition.getText(file), 'kind === "healing"');
  assert.equal(stage.initializer.whenFalse.getText(file), "null");
  // The rendered stage must be a direct child of the returned viewer, not a
  // descendant of a dead conditional, callback or hidden wrapper.
  one(Array.from(returnRoot.children).filter(x => ts.isJsxExpression(x) && x.expression?.getText(file) === "reikiStage"));
  const stageRoot = unwrap(stage.initializer.whenTrue);
  assert.ok(ts.isJsxElement(stageRoot));
  assert.ok(attr(stageRoot.openingElement, "data-support-reiki-central"));
  const field = one(all(stage.initializer.whenTrue, x => ts.isJsxElement(x) && attr(x.openingElement, "data-support-reiki-format")));
  const quick = one(all(result, x => ts.isJsxElement(x) && attr(x.openingElement, "data-support-reiki-quick-format")));
  assert.ok(ts.isBinaryExpression(quick.parent));
  assert.equal(quick.parent.left.getText(file), 'kind === "healing"');
  assert.equal(quick.parent.operatorToken.kind, ts.SyntaxKind.AmpersandAmpersandToken);
  assert.ok(ts.isJsxExpression(quick.parent.parent));
  assert.ok(quick.parent.parent.parent === returnRoot, "quick selector is a direct returned child");
  const filterSheet = field.parent;
  assert.ok(ts.isJsxElement(filterSheet));
  assert.ok(attr(filterSheet.openingElement, "data-support-reiki-filter"));
  const filterGate = filterSheet.parent;
  assert.ok(ts.isConditionalExpression(filterGate));
  assert.equal(filterGate.condition.getText(file), 'reikiTab === "filter"');
  assert.ok(filterGate.whenTrue === filterSheet, "filter sheet is the selected branch");
  assert.ok(ts.isJsxExpression(filterGate.parent));
  const activePanel = filterGate.parent.parent;
  assert.ok(ts.isJsxElement(activePanel));
  assert.ok(attr(activePanel.openingElement, "data-support-reiki-panel"));
  assert.ok(activePanel.parent === stageRoot, "panel is a direct stage child");
  for (const live of [returnRoot, stageRoot, activePanel, filterSheet, field, quick]) {
    for (const hidden of ["hidden", "inert", "aria-hidden"]) assert.equal(attr(live.openingElement, hidden), undefined);
  }
  const r = named(statements, "r");
  assert.equal(r.initializer.getText(file), "reikiUi[locale]");
  const choose = named(statements, "chooseReikiFormat");
  assert.ok(ts.isArrowFunction(choose.initializer));
  return { file, field, quick, choose, copy: named(file.statements, "reikiUi"), r };
}
function verify(input, locale) {
  const selected = selectors(input), { file } = selected;
  const reikiUi = evaluate(selected.copy.initializer.getText(file));
  const r = evaluate(selected.r.initializer.getText(file), { reikiUi, locale });
  assert.deepEqual(Object.keys(r.formats), keys, "three stable semantic formats");
  assert.deepEqual(Array.from(keys, key => r.formats[key]), labels[locale]);
  for (const [which, node] of [["filter", selected.field], ["quick", selected.quick]]) {
    for (const active of keys) {
      const calls = [];
      const setters = Object.fromEntries(["setReikiFormat", "setReikiPrice", "setReikiTime", "setReikiReport", "setReikiRole", "setReikiCertificate", "setMethod", "setSelectedId", "setOrderOpen", "setReikiTab"].map(name => [name, value => calls.push([name, value])]));
      const chooseReikiFormat = evaluate(selected.choose.initializer.getText(file), setters);
      const view = evaluate(node.getText(file), { r, reikiFormat: active, chooseReikiFormat, styles: {}, UserRound: "icon-user", Sparkles: "icon-sparkles", GraduationCap: "icon-course" });
      const buttons = descendants(view).filter(x => x.tag === "button");
      assert.equal(buttons.length, 3);
      assert.deepEqual(buttons.map(button => button.props.key), keys);
      assert.deepEqual(buttons.map(text), labels[locale]);
      for (const [index, button] of buttons.entries()) {
        assert.equal(button.props.type, "button");
        assert.equal(button.props["aria-pressed"], keys[index] === active);
        if (which === "quick") assert.equal(button.props["data-support-reiki-quick-kind"], keys[index]);
        calls.length = 0;
        button.props.onClick();
        assert.deepEqual(calls, [["setReikiFormat", keys[index]], ["setReikiPrice", "all"], ["setReikiTime", "any"], ["setReikiReport", "brief"], ["setReikiRole", "any"], ["setReikiCertificate", false], ["setMethod", ""], ["setSelectedId", null], ["setOrderOpen", false], ...(which === "quick" ? [["setReikiTab", "main"]] : [])]);
      }
    }
  }
}
for (const locale of ["en", "ru", "es"]) test("actual " + locale + " filter and quick JSX keep three labelled formats and bounded reset callbacks", () => verify(source, locale));

function mutate(before, after) {
  assert.ok(source.includes(before), "mutation targets actual source");
  return source.replace(before, after);
}
test("missing, duplicate or mislabelled course cannot satisfy the format oracle", () => {
  for (const [before, after] of [
    ['["session", "initiation", "course"] as const', '["session", "initiation"] as const'],
    ['["session", "initiation", "course"] as const', '["session", "initiation", "initiation"] as const'],
    ['course: "Программа"', 'course: "Сессия"'],
    ['course: "Программа"', 'course: "Курс обучения"'],
  ]) assert.throws(() => verify(mutate(before, after), "ru"), { code: "ERR_ASSERTION" });
});
test("wrong locale and inert or misrouted callbacks are rejected", () => {
  for (const [before, after] of [
    ['const r = reikiUi[locale]', 'const r = reikiUi["en"]'],
    ['chooseReikiFormat(value)}', 'chooseReikiFormat("session")}'],
    ['setReikiFormat(value);', 'setReikiFormat("session");'],
    ['chooseReikiFormat(value, true)', 'chooseReikiFormat(value, false)'],
    ['setOrderOpen(false);\n    if (showMain)', 'setOrderOpen(true);\n    if (showMain)'],
  ]) assert.throws(() => verify(mutate(before, after), "ru"), { code: "ERR_ASSERTION" });
});
test("selected format controls must remain in the live exported component return", () => {
  for (const [before, after] of [
    ['{reikiStage}', '{null}'],
    ['kind === "healing" && <div className={styles.reikiQuickFormat}', 'false && <div className={styles.reikiQuickFormat}'],
    ['reikiTab === "filter" ? <div className={styles.reikiFilterSheet}', 'false ? <div className={styles.reikiFilterSheet}'],
  ]) assert.throws(() => verify(mutate(before, after), "ru"), { code: "ERR_ASSERTION" });
});


test("valid stage and quick hidden ancestors cannot survive live-return binding", () => {
  const before = '{kind === "healing" && <div className={styles.reikiQuickFormat}';
  const end = '      </div>}\n      {consultations && <section';
  assert.equal(source.split(before).length, 2);
  assert.equal(source.split(end).length, 2);
  const hidden = source.replace(before, '{false && <>{kind === "healing" && <div className={styles.reikiQuickFormat}')
    .replace(end, '      </div>}</>}\n      {consultations && <section');
  for (const suppressed of [mutate("{reikiStage}", "{false && <>{reikiStage}</>}"), hidden]) {
    const parsed = ts.createSourceFile("hidden.tsx", suppressed, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    assert.equal(parsed.parseDiagnostics.length, 0, "negative is valid TSX, not a syntax failure");
    assert.throws(() => verify(suppressed, "ru"), { code: "ERR_ASSERTION" });
  }
});
