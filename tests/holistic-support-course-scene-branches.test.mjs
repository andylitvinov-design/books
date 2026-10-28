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
  // A click on Courses must reach the real original video player, not the
  // assessment profiles. Meditation must retain the same shared player.
  assert.equal(scene.initializer.getText(file), 'choice === "meditation" || choice === "pump"');
  const branch = one(all(result, x => ts.isConditionalExpression(x) && x.condition.getText(file) === "scene"));
  const videoJsx = branch.whenTrue.getText(file);
  assert.ok(videoJsx.includes("data-support-player"), "shared course/meditation player renders");
  assert.ok(videoJsx.includes('data-support-mystery-course={course.id}'), "original course chooser renders");
  assert.ok(videoJsx.includes("data-support-courses-panel"), "published Academy links render");
  const testsBranch = one(all(result, x => ts.isConditionalExpression(x) && x.condition.getText(file) === 'choice === "tests"'));
  const testsJsx = testsBranch.whenTrue.getText(file);
  assert.ok(testsJsx.includes("HolisticSupportCourseProfiles"), "four profiles render only inside Tests");
  assert.ok(testsJsx.includes("data-support-tests-panel"), "original test links remain");
  assert.ok(!testsJsx.includes("data-support-player"), "Tests must not show course video player");
  return { file, component, scene, branch, testsBranch };
}
test("Courses restores original live course videos; Tests alone shows four diagnostic profiles", () => {
  const { file, branch, testsBranch } = selection();
  assert.ok(branch.whenTrue.getText(file).includes('choice === "pump" ? t.watchLesson : t.play'));
  assert.ok(branch.whenTrue.getText(file).includes("activeMystery?.videoGroups.map"));
  assert.ok(testsBranch.whenTrue.getText(file).includes('/client/tests'));
  const mutant = home.replace('const scene = choice === "meditation" || choice === "pump";', 'const scene = choice === "meditation";');
  assert.throws(() => selection(mutant), {code: "ERR_ASSERTION"});
});
test("the selected original programme menu retains selection and playback reset", () => {
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
  calls.length = 0;
  evaluate(handler.getText(file), { ...bindings, choice: "pump" })({target:{value:"egypt"}});
  assert.deepEqual(calls,[["setProgram","egypt"],["setPlaying",false],["setSelectedId",null],["setMaster","all"],["setTheme","all"]]);
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
for (const locale of ["en", "ru", "es"]) test("actual " + locale + " Tests JSX retains four profiles, three actions and source Academy links", () => verifyProfiles(locale));
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
