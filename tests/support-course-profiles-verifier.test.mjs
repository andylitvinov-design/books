import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Source-selected callbacks and inert JSX/locator doubles only. No browser,
// image reads, component imports, API calls, storage or real records.
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const mobile = read('components/holistic-support-mobile.tsx');
const profiles = read('components/holistic-support-course-profiles.tsx');
const filterSource = read('components/holistic-support-goal-filter.tsx');
const verifier = read('scripts/verify-holistic-support-mock-fidelity.mjs');
const sectors = ['energy', 'money', 'love', 'meaning'];
const parse = source => ts.createSourceFile('selected.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const all = (node, predicate) => {
  const found = []; const visit = child => { if (predicate(child)) found.push(child); ts.forEachChild(child, visit); };
  visit(node); return found;
};
const one = values => { assert.equal(values.length, 1); return values[0]; };
const named = (statements, name) => one(statements.filter(ts.isVariableStatement).flatMap(n => [...n.declarationList.declarations]).filter(n => n.name.getText() === name));
const attr = (node, name) => node.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.getText() === name);
const unwrap = node => ts.isParenthesizedExpression(node) ? unwrap(node.expression) : node;
const jsx = (tag, props, ...children) => ({ tag, props: props || {}, children: children.flat(Infinity).filter(x => x !== false && x != null) });
const nodes = node => node && typeof node === 'object' ? [node, ...node.children.flatMap(nodes)] : [];
const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : (node?.children || []).map(text).join('');
const deny = () => { throw Error('FORBIDDEN_IO'); };
const plain = value => JSON.parse(JSON.stringify(value));
const bridgeAssert = { ...assert, deepEqual: (a, b, message) => assert.deepEqual(plain(a), plain(b), message) };
function evaluate(expression, bindings = {}) {
  const compiled = ts.transpileModule('globalThis.result = (' + expression + ');', {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, jsxFactory: 'jsx', jsxFragmentFactory: 'Fragment' },
  }).outputText;
  const context = { jsx, Fragment: 'fragment', fetch: deny, localStorage: new Proxy({}, { get: deny }), sessionStorage: new Proxy({}, { get: deny }), ...bindings };
  vm.runInNewContext(compiled, context, { timeout: 1000 });
  return context.result;
}
function selected(input = mobile) {
  const file = parse(input); assert.equal(file.parseDiagnostics.length, 0);
  const fn = one(file.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'HolisticSupportMobile'));
  assert.ok(fn.modifiers.some(n => n.kind === ts.SyntaxKind.ExportKeyword));
  const result = one(fn.body.statements.filter(ts.isReturnStatement));
  assert.equal(fn.body.statements.at(-1), result, 'bind the actual component return');
  const pump = one(all(result, n => ts.isConditionalExpression(n) && n.condition.getText(file) === 'choice === "pump"'));
  const course = unwrap(pump.whenTrue);
  assert.ok(ts.isJsxSelfClosingElement(course)); assert.equal(course.tagName.getText(file), 'HolisticSupportCourseProfiles');
  const filter = one(all(result, n => ts.isJsxSelfClosingElement(n) && n.tagName.getText(file) === 'HolisticSupportGoalFilter'));
  assert.equal(attr(filter, 'preferredSector').initializer.expression.getText(file), 'profileSector');
  return { file, fn, result, course, filter };
}
const iconBindings = input => Object.fromEntries(all(parse(input), ts.isImportSpecifier).filter(n => n.parent.parent.parent.moduleSpecifier.text === 'lucide-react').map(n => [n.name.text, 'icon']));
function component(input = profiles) {
  const file = parse(input), fn = one(file.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'HolisticSupportCourseProfiles'));
  assert.equal(fn.body.statements.length, 3, 'two copy bindings and live JSX return only');
  const bindings = { ...iconBindings(input), Image: 'img', Link: 'a', styles: {} };
  bindings.content = evaluate(named(file.statements, 'content').initializer.getText(file));
  bindings.profiles = evaluate(named(file.statements, 'profiles').initializer.getText(file), bindings);
  return evaluate(fn.getText(file).replace(/^export\s+/, ''), bindings);
}
function parent(input = mobile, saved = {}) {
  const { file, fn, course, filter } = selected(input);
  const state = { activeCourseProfile: 'energy', profileSector: 'energy', choice: 'pump', playing: true, selectedId: 'synthetic', goalFilterOpen: false };
  const frames = [], applied = [];
  const bindings = { goalSavedSectors: saved, goalRecommendationFormats: ['tests', 'courses'],
    window: { requestAnimationFrame: callback => { frames.push(callback); return frames.length; } },
    applyGoalFilter: value => applied.push(plain(value)), setTheme: () => {}, setProgram: () => {}, setMaster: () => {},
  };
  for (const name of Object.keys(state)) bindings['set' + name[0].toUpperCase() + name.slice(1)] = value => { state[name] = typeof value === 'function' ? value(state[name]) : value; };
  for (const name of ['changeChoice', 'openCourseProfileFilter', 'showCourseProfileRecommendations']) {
    bindings[name] = evaluate(named(fn.body.statements, name).initializer.getText(file), bindings);
  }
  const props = () => Object.fromEntries(['onSelect', 'onTests', 'onFillProfile', 'onRecommendations'].map(name => [name, evaluate(attr(course, name).initializer.expression.getText(file), bindings)]));
  const close = evaluate(attr(filter, 'onClose').initializer.expression.getText(file), bindings);
  return { state, frames, applied, props, close, bindings };
}
function helper(input = verifier) {
  const file = parse(input);
  const get = name => one(file.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name));
  const calls = all(file, n => ts.isCallExpression(n) && n.expression.getText(file) === 'assertSupportCourseProfiles');
  assert.equal(calls.length, 1, 'browser journey invokes the actual helper once');
  let statement = calls[0]; while (statement && !ts.isExpressionStatement(statement)) statement = statement.parent;
  assert.ok(statement && ts.isAwaitExpression(statement.expression));
  const block = statement.parent;
  assert.ok(ts.isBlock(block) && ts.isTryStatement(block.parent) && block.parent.tryBlock === block, 'helper call lives directly in the measured try body');
  const position = block.statements.indexOf(statement);
  assert.equal(block.statements[position - 1].getText(file), `await root.locator('[data-support-tool="pump"]').click();`);
  assert.equal(named(block.statements, 'root').initializer.getText(file), 'page.locator("[data-holistic-mobile-alternative]")');
  assert.equal(calls[0].arguments.map(x => x.getText(file)).join(','), 'root,locale,label');
  const document = { documentElement: { clientWidth: 320, scrollWidth: 320 } };
  const tests = evaluate(get('assertSupportTestsLinks').getText(file), { assert: bridgeAssert });
  return evaluate(get('assertSupportCourseProfiles').getText(file), { assert: bridgeAssert, document, assertSupportTestsLinks: tests });
}
const originals = [
  ['maya', 'Майя', 'mysteries/maya-aztec/feathered-serpent', 6],
  ['egypt', 'Египет', 'mysteries/egypt/high-wisdom', 7],
  ['greek', 'Греция', 'mysteries/greece-rome/beauty-and-power', 12],
].map(([id, shortTitle, route, videoCount]) => ({ id, shortTitle, href: '/ru/academy/' + route, videoCount, poster: '/synthetic.png' }));
function locatorModel(locale, profileInput = profiles, mobileInput = mobile) {
  const host = parent(mobileInput), render = component(profileInput); let expanded = false;
  const selectedMobile = selected(mobileInput);
  const testsNode = one(all(selectedMobile.result, n => ts.isJsxElement(n) && attr(n.openingElement, 'data-support-tests-panel')));
  const testsBindings = { ...iconBindings(mobileInput), locale, Link: 'a', styles: {}, t: evaluate(named(selectedMobile.file.statements, 'copy').initializer.getText(selectedMobile.file))[locale] };
  function view() {
    let content;
    if (host.state.goalFilterOpen) content = jsx('form', { 'data-support-goal-filter': true },
      jsx('header', {}, jsx('button', { onClick: host.close })),
      jsx('button', { 'data-goal-sector': host.state.profileSector, 'aria-pressed': true }));
    else if (host.state.choice === 'tests') content = evaluate(testsNode.getText(selectedMobile.file), testsBindings);
    else content = render({ locale, active: host.state.activeCourseProfile, savedSectors: {}, courses: locale === 'ru' ? originals : [], ...host.props() });
    const root = jsx('main', {}, jsx('button', { 'data-support-tool': 'pump', onClick: () => { expanded = false; host.bindings.changeChoice('pump'); } }),
      jsx('button', { 'data-support-tool': 'tests', onClick: () => host.bindings.changeChoice('tests') }), content);
    for (const node of nodes(root)) if ('data-support-mystery-courses' in node.props) {
      if (expanded) node.props.open = true;
      one(nodes(node).filter(n => n.tag === 'summary')).props.onClick = () => { expanded = !expanded; };
    }
    return root;
  }
  const matches = (node, selector) => {
    const tag = selector.match(/^[a-z]+/); if (tag && node.tag !== tag[0]) return false;
    for (const [, key, value] of selector.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)) {
      if (!(key in node.props) || value !== undefined && String(node.props[key]) !== value) return false;
    }
    return true;
  };
  const select = (roots, selector) => selector.split(' ').reduce((list, part) => [...new Set(list.flatMap(n => nodes(n).slice(1).filter(x => matches(x, part))))], roots);
  const attribute = (node, key) => key in node.props ? (node.props[key] === true && !key.startsWith('aria-') ? '' : String(node.props[key])) : null;
  function locator(get) {
    return {
      locator: selector => locator(() => select(get(), selector)), count: async () => get().length,
      getAttribute: async key => attribute(one(get()), key),
      click: async () => { const n = one(get()); assert.equal(typeof n.props.onClick, 'function'); n.props.onClick(); },
      waitFor: async () => { assert.equal(get().length, 1); },
      boundingBox: async () => { one(get()); return { x: 1, width: 60, height: 100 }; },
      evaluate: async fn => fn(),
      evaluateAll: async fn => fn(get().map(n => ({ getAttribute: key => attribute(n, key) }))),
      allTextContents: async () => get().map(text),
      all: async () => get().map((_, i) => locator(() => [get()[i]])),
    };
  }
  return { root: locator(() => [view()]), host };
}
for (const locale of ['ru', 'en', 'es']) test('Courses browser acceptance is executable against actual ' + locale + ' JSX and parent callbacks', async () => {
  const { root, host } = locatorModel(locale); await helper()(root, locale, 'synthetic');
  assert.equal(host.state.choice, 'pump'); assert.equal(host.state.goalFilterOpen, false);
  assert.equal(host.state.playing, false); assert.deepEqual(host.applied, []);
});
test('actual parent recommendations require accepted local sector and preserve payload without writes', () => {
  const snapshot = { concerns: ['synthetic'], goals: [], ratings: {}, metrics: {} };
  for (const sector of sectors) {
    const empty = parent(); empty.props().onRecommendations(sector);
    assert.equal(empty.state.profileSector, sector); assert.equal(empty.state.goalFilterOpen, true);
    assert.equal(empty.state.playing, false); assert.deepEqual(empty.applied, []);
    empty.close(); assert.equal(empty.state.goalFilterOpen, false);
    const accepted = parent(mobile, { [sector]: snapshot }); accepted.props().onRecommendations(sector);
    assert.deepEqual(accepted.applied, [{ ...snapshot, sector, savedSectors: { [sector]: snapshot }, recommendationFormats: ['tests', 'courses'] }]);
    assert.equal(accepted.state.activeCourseProfile, sector);
  }
  const filter = parse(filterSource), fn = one(filter.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'HolisticSupportGoalFilter'));
  const initializer = named(fn.body.statements, 'initialSector').initializer.getText(filter);
  for (const sector of sectors) assert.equal(evaluate(initializer, { preferredSector: sector, initial: { sector: 'goals' } }), sector);
});
test('current Courses acceptance rejects missing identities, inert actions, wrong links and fabricated media counts', async () => {
  for (const [before, after] of [
    ['id: "meaning", Icon: Compass', 'id: "energy", Icon: Compass'],
    ['onClick={() => onSelect(id)}', 'onClick={() => {}}'],
    ['onClick={onTests}', 'onClick={() => {}}'],
    ['onClick={() => onFillProfile(active)}', 'onClick={() => {}}'],
    ['onClick={() => onRecommendations(active)}', 'onClick={() => {}}'],
    ['href={`/${locale}/academy`}', 'href={`/${locale}/academy?profile=private`}'],
    ['href={course.href}', 'href="/wrong-original"'],
    ['{course.videoCount} {t.videos}', '{99} {t.videos}'],
    ['courses.map(course =>', 'courses.slice(0, 2).map(course =>'],
  ]) {
    assert.ok(profiles.includes(before));
    await assert.rejects(async () => { const { root } = locatorModel('ru', profiles.replace(before, after)); await helper()(root, 'ru', 'mutant'); });
  }
});
test('parent callback regressions reject wrong sectors, auto-acceptance and storage or network side effects', async () => {
  for (const [before, after] of [
    ['setProfileSector(sector);', 'setProfileSector("goals");'],
    ['if (!saved) { openCourseProfileFilter(sector); return; }', 'if (!saved) { applyGoalFilter({ sector }); return; }'],
    ['setPlaying(false);\n    setGoalFilterOpen(true);', 'fetch("/api/app/courses", { method: "POST" }); setGoalFilterOpen(true);'],
    ['setPlaying(false);\n    setGoalFilterOpen(true);', 'localStorage.setItem("profile", "synthetic"); setGoalFilterOpen(true);'],
  ]) {
    assert.ok(mobile.includes(before));
    await assert.rejects(async () => { const { root } = locatorModel('ru', profiles, mobile.replace(before, after)); await helper()(root, 'ru', 'mutant'); });
  }
});

test('Courses helper must remain on the real measured browser path', () => {
  const call = 'await assertSupportCourseProfiles(root, locale, label);';
  assert.equal(verifier.split(call).length, 2);
  for (const replacement of ['', 'if (false) { ' + call + ' }', 'async function dead() { ' + call + ' }']) {
    assert.throws(() => helper(verifier.replace(call, replacement)), { code: 'ERR_ASSERTION' });
  }
});
