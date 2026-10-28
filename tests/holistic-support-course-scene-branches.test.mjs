import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Source-selected semantic checking and inert JSX only; not SSR or a browser.
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const home = read("components/holistic-support-mobile.tsx");
const profiles = read("components/holistic-support-course-profiles.tsx");
const parse = input => ts.createSourceFile("source.tsx", input, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const all = (node, predicate) => {
  const found = [];
  const visit = child => { if (predicate(child)) found.push(child); ts.forEachChild(child, visit); };
  visit(node); return found;
};
const one = values => { assert.equal(values.length, 1); return values[0]; };
const variables = statements => statements.filter(ts.isVariableStatement).flatMap(x => [...x.declarationList.declarations]);
const named = (statements, name) => one(variables(statements).filter(x => x.name.getText() === name));
const attr = (node, name) => node.attributes.properties.find(x => ts.isJsxAttribute(x) && x.name.getText() === name);
const jsx = (tag, props, ...children) => ({ tag, props: props || {}, children: children.flat(Infinity).filter(x => x !== false && x != null) });
const nodes = node => typeof node === "object" && node ? [node, ...node.children.flatMap(nodes)] : [];
const text = node => typeof node === "string" || typeof node === "number" ? String(node) : (node?.children || []).map(text).join("");
function evaluate(expression, bindings = {}) {
  const compiled = ts.transpileModule("globalThis.result = (" + expression + ");", {
    compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, jsxFactory: "jsx", jsxFragmentFactory: "Fragment" },
  }).outputText;
  const context = { ...bindings, jsx, Fragment: "fragment" };
  vm.runInNewContext(compiled, context, { timeout: 1000 });
  return context.result;
}
function selection(input = home) {
  const file = parse(input);
  assert.equal(file.parseDiagnostics.length, 0);
  const component = one(file.statements.filter(x => ts.isFunctionDeclaration(x) && x.name?.text === "HolisticSupportMobile"));
  const result = one(component.body.statements.filter(ts.isReturnStatement));
  const scene = named(component.body.statements, "scene");
  assert.equal(scene.initializer.getText(file), 'choice === "meditation"');
  const branch = one(all(result, x => ts.isConditionalExpression(x) && x.condition.getText(file) === "scene"));
  const pump = branch.parent;
  assert.ok(ts.isConditionalExpression(pump));
  assert.equal(pump.condition.getText(file), 'choice === "pump"');
  assert.ok(pump.whenFalse === branch);
  const course = one(all(pump.whenTrue, ts.isJsxSelfClosingElement));
  const unwrap = node => ts.isParenthesizedExpression(node) ? unwrap(node.expression) : node;
  assert.ok(unwrap(pump.whenTrue) === course, "Courses is the actual selected branch, not hidden nested JSX");
  assert.equal(course.tagName.getText(file), "HolisticSupportCourseProfiles");
  assert.equal(attr(course, "courses").initializer.expression.getText(file), "courses");
  return { file, component, scene, branch, pump };
}
function impossibleComparisons(input) {
  const { file, scene, branch, pump } = selection(input);
  const choice = one(file.statements.filter(x => ts.isTypeAliasDeclaration(x) && x.name.text === "Choice"));
  const selected = choice.getText(file) + '\ndeclare const choice: Choice;\ndeclare const React: any;\n' +
    'declare namespace JSX { interface IntrinsicElements { [name: string]: any } }\n' +
    "const scene = " + scene.initializer.getText(file) + ";\nconst selected = (" + pump.condition.getText(file) +
    ") ? null : scene ? " + branch.whenTrue.getText(file) + " : null;";
  const source = ts.createSourceFile("selected.tsx", selected, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const host = {
    getSourceFile: name => name === "selected.tsx" ? source : undefined,
    getDefaultLibFileName: () => "", writeFile: () => { throw Error("No emit"); },
    getCurrentDirectory: () => "", getDirectories: () => [],
    fileExists: name => name === "selected.tsx", readFile: name => name === "selected.tsx" ? selected : undefined,
    getCanonicalFileName: name => name, useCaseSensitiveFileNames: () => true, getNewLine: () => "\n",
  };
  const program = ts.createProgram(["selected.tsx"], { noEmit: true, noLib: true, noResolve: true, strict: false, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 }, host);
  // Other component bindings are intentionally absent: this is a targeted
  // control-flow regression, not a claim of a full repository typecheck.
  return program.getSemanticDiagnostics(source).filter(x => x.code === 2367)
    .map(x => ({ code: x.code, expression: selected.slice(x.start, x.start + x.length) }));
}
test("actual Courses branch is separate; meditation JSX has no impossible pump comparisons", () => {
  assert.deepEqual(impossibleComparisons(home), []);
  const { file, branch } = selection();
  const fragment = one(all(branch.whenTrue, ts.isJsxFragment));
  const offset = fragment.openingFragment.end;
  const mutant = home.slice(0, offset) + '{choice === "pump" ? null : null}' + home.slice(offset);
  assert.equal(parse(mutant).parseDiagnostics.length, 0);
  assert.deepEqual(impossibleComparisons(mutant), [{ code: 2367, expression: 'choice === "pump"' }]);
  assert.ok(branch.whenTrue.getText(file).includes("data-support-player"));
});
test("actual meditation program callback retains selection, pause and selected-video reset", () => {
  const { file, branch } = selection();
  const group = one(all(branch.whenTrue, x => ts.isJsxElement(x) && attr(x.openingElement, "data-support-filter")?.initializer?.text === "program"));
  const select = one(all(group, x => ts.isJsxElement(x) && x.openingElement.tagName.getText(file) === "select"));
  const handler = attr(select.openingElement, "onChange").initializer.expression;
  const calls = [];
  const bindings = Object.fromEntries(["setProgram", "setPlaying", "setSelectedId", "setMaster", "setTheme"].map(name => [name, value => calls.push([name, value])]));
  const callback = evaluate(handler.getText(file), { ...bindings, choice: "meditation" });
  for (const program of ["all", "sun", "reiki"]) {
    calls.length = 0; callback({ target: { value: program } });
    assert.deepEqual(calls, [["setProgram", program], ["setPlaying", false], ["setSelectedId", null]]);
  }
});

const iconNames = ["ArrowRight", "BookOpen", "CheckCircle2", "Coins", "Compass", "Heart", "HeartPulse", "ListChecks", "Sparkles"];
function profileComponent(input = profiles) {
  const file = parse(input);
  const fn = one(file.statements.filter(x => ts.isFunctionDeclaration(x) && x.name?.text === "HolisticSupportCourseProfiles"));
  assert.ok(fn.modifiers?.some(x => x.kind === ts.SyntaxKind.ExportKeyword));
  assert.equal(fn.body.statements.length, 3, "only two copy bindings and the actual JSX return");
  const bindings = { ...Object.fromEntries(iconNames.map(name => [name, "icon-" + name])), Image: "image", Link: "link", styles: {} };
  bindings.content = evaluate(named(file.statements, "content").initializer.getText(file));
  bindings.profiles = evaluate(named(file.statements, "profiles").initializer.getText(file), bindings);
  return evaluate(fn.getText(file).replace(/^export\s+/, ""), bindings);
}
// Public checked-in source fixtures, not records, uploads or external requests.
const route = parse(read("app/[locale]/holistic-support/mobile/page.tsx"));
const collections = evaluate(named(route.statements, "mysteryCollections").initializer.getText(route));
const curricula = JSON.parse(read("data/academy/psimaster-sources.generated.json"));
const media = JSON.parse(read("data/academy/psimaster-media.generated.json"));
const courses = Array.from(collections, entry => {
  const record = one(curricula.filter(x => x.logicalId === entry.programId && x.sourceLocale === "ru"));
  return { id: entry.id, shortTitle: entry.shortTitle, href: "/ru/academy/" + record.routeKey,
    poster: "/inert-course-poster.png", videoCount: media.filter(x => entry.videoIds.includes(x.logicalId)).length };
});
const sectors = ["energy", "money", "love", "meaning"];
function verifyProfiles(locale, input = profiles) {
  const render = profileComponent(input);
  for (const active of sectors) {
    const calls = [];
    const view = render({ locale, active, courses: locale === "ru" ? courses : [], savedSectors: {},
      onSelect: value => calls.push(["select", value]), onTests: () => calls.push(["tests"]),
      onFillProfile: value => calls.push(["fill", value]), onRecommendations: value => calls.push(["recommend", value]) });
    const allNodes = nodes(view);
    const buttons = allNodes.filter(x => x.props["data-support-profile"]);
    assert.deepEqual(buttons.map(x => x.props["data-support-profile"]), sectors);
    for (const button of buttons) {
      assert.equal(button.props["aria-pressed"], button.props["data-support-profile"] === active);
      button.props.onClick();
    }
    for (const action of ["test", "fill", "recommend"]) one(allNodes.filter(x => x.props["data-support-profile-" + action])).props.onClick();
    assert.deepEqual(calls, [...sectors.map(x => ["select", x]), ["tests"], ["fill", active], ["recommend", active]]);
    const links = allNodes.filter(x => x.tag === "link");
    assert.deepEqual(links.map(x => x.props.href), ["/" + locale + "/academy", "/" + locale + "/academy/reiki/tantra-reiki/discover", ...(locale === "ru" ? courses.map(x => x.href) : [])]);
    if (locale === "ru") {
      assert.equal(one(allNodes.filter(x => x.props["data-support-mystery-courses"])).tag, "details");
      for (const course of courses) assert.ok(text(one(links.filter(x => x.props.href === course.href))).includes(course.shortTitle));
    } else assert.equal(allNodes.filter(x => x.props["data-support-mystery-courses"]).length, 0);
  }
}
for (const locale of ["en", "ru", "es"]) test("actual " + locale + " Courses JSX retains four profiles, three actions and original Academy links", () => verifyProfiles(locale));
test("course/profile loss, wrong link and inert real CTA fail the selected JSX contract", () => {
  for (const [before, after] of [
    ['courses.map(course =>', 'courses.slice(0, 2).map(course =>'],
    ['href={`/${locale}/academy`}', 'href="/wrong-academy"'],
    ['onClick={onTests}', 'onClick={() => {}}'],
    ['id: "meaning", Icon: Compass', 'id: "energy", Icon: Compass'],
  ]) {
    assert.ok(profiles.includes(before));
    assert.throws(() => verifyProfiles("ru", profiles.replace(before, after)), { code: "ERR_ASSERTION" });
  }
});
test("original RU manifest pointers and media totals remain distinct from four profile sectors", () => {
  assert.deepEqual(courses.map(x => x.id), ["maya", "egypt", "greek"]);
  assert.deepEqual(courses.map(x => x.videoCount), [6, 7, 12]);
  assert.equal(media.length, 45); assert.equal(curricula.length, 22);
  const input = read("app/[locale]/holistic-support/mobile/page.tsx");
  assert.match(input, /if \(locale === "ru"\)/);
  assert.match(input, /findAcademyRecord\(entry\.programId, "ru"\)/);
  assert.match(input, /courses=\{originalMysteryCourses\}/);
  assert.match(input, /href: "\/ru\/academy\/" \+ curriculum\.routeKey/);
});
