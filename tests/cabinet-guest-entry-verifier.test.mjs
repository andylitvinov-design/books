import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { assertCabinetGuestEntry } from '../scripts/helpers/cabinet-guest-entry-verifier.mjs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const component = read('components/app/cabinet-guest-overview.jsx');
const workspace = read('components/app/app-workspace.jsx');
const caller = read('scripts/verify-es-public-site.mjs');
const helper = read('scripts/helpers/cabinet-guest-entry-verifier.mjs');
const diagnostics = read('tests/es-public-diagnostics.test.mjs');
const origin = 'https://127.0.0.1:3443';
const parse = source => {
  const ast = ts.createSourceFile('source.jsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
  assert.equal(ast.parseDiagnostics.length, 0, 'source must parse');
  return ast;
};
const printer = ts.createPrinter({ removeComments: true });
const printed = source => printer.printFile(parse(source));
const replaceOnce = (source, before, after) => {
  assert.equal(source.split(before).length - 1, 1, 'mutation must hit one actual source occurrence: ' + before);
  return source.replace(before, after);
};
const jsx = (type, props = {}) => typeof type === 'function' ? type(props) : ({ type, props });
const visible = props => !props.hidden && props['aria-hidden'] !== 'true' &&
  props.style?.display !== 'none' && props.style?.visibility !== 'hidden';
const text = value => Array.isArray(value) ? value.map(text).join('') :
  typeof value === 'string' || typeof value === 'number' ? String(value) :
    value && typeof value === 'object' && visible(value.props) ? text(value.props.children) : '';
const flatten = (tree, ancestors = []) => Array.isArray(tree) ? tree.flatMap(child => flatten(child, ancestors)) :
  tree && typeof tree === 'object' ? (() => {
    const node = { ...tree, ancestors, visible: ancestors.every(parent => visible(parent.props)) && visible(tree.props) };
    return [node, ...flatten(tree.props.children, [...ancestors, node])];
  })() : [];
const compiled = new Map();
function evaluate(source, supplied = {}) {
  const exports = {};
  if (!compiled.has(source)) compiled.set(source, ts.transpileModule(source, { fileName: 'source.jsx', compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText);
  const output = compiled.get(source);
  const modules = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/link': { default: 'link' },
    'lucide-react': Object.fromEntries([
      'Activity', 'ArrowRight', 'BookOpenCheck', 'ChartNoAxesCombined', 'ClipboardCheck',
      'FilePenLine', 'GraduationCap', 'LockKeyhole', 'ShieldCheck', 'Sparkles', 'Users',
    ].map(name => [name, 'icon-' + name])),
    './cabinet-guest-overview.module.css': { default: {} },
  };
  runInNewContext(output, { exports, ...supplied, require(name) {
    assert.ok(Object.hasOwn(modules, name), 'unmocked import forbidden: ' + name);
    return modules[name];
  } }, { timeout: 1000 });
  return exports;
}
function guestBranch(source) {
  const start = source.indexOf('  // Public Cabinet entry explains');
  const end = source.indexOf("  if (state !== 'ready')", start);
  assert.ok(start >= 0 && end > start, 'bounded actual guest branch must exist');
  const ast = parse(source.slice(start, end));
  const branches = ast.statements.filter(node => ts.isIfStatement(node) &&
    node.thenStatement.getText(ast).includes('<CabinetGuestOverview'));
  assert.equal(branches.length, 1, 'one actual portrait guest branch');
  return branches[0].getText(ast);
}
function fixture({ componentSource = component, workspaceSource = workspace, state = 'signed-out',
  page = 'portrait', stressSignup = false, busy = false, attempted = false, error = null } = {}) {
  const effects = [];
  const signin = () => effects.push('signin');
  const retry = () => effects.push('retry');
  const Overview = evaluate(componentSource).default;
  const supplied = { state, page, stressSignup, locale: 'en', busy, signin, load: retry,
    signinAttempted: { current: attempted }, error, message: () => 'Synthetic login failure', c: {},
    CabinetGuestOverview: Overview };
  // Execute the real JSX branch and real guest component, not a hand-written DOM.
  // No workspace hooks, bootstrap, auth endpoint, browser or account code runs.
  const tree = evaluate('export function render() { ' + guestBranch(workspaceSource) + '; return null; }', supplied).render();
  return { nodes: flatten(tree), effects, signin, retry };
}
const role = node => node.props.role || (node.type === 'button' ? 'button' :
  ['a', 'link'].includes(node.type) ? 'link' : /^h[1-6]$/.test(node.type) ? 'heading' : null);
const name = node => node.props['aria-label'] || text(node.props.children).trim();
class Locator {
  constructor(nodes) { this.nodes = nodes; }
  getByRole(wanted, options = {}) {
    const descendants = this.nodes.flatMap(parent => parent.document.filter(node => node.ancestors.includes(parent)));
    return new Locator([...new Set(descendants)].filter(node => role(node) === wanted &&
      (options.includeHidden || node.visible) &&
      (!options.level || node.type === 'h' + options.level) &&
      (options.name === undefined || (options.exact ? name(node) === options.name : name(node).includes(options.name)))));
  }
  filter({ hasText }) { return new Locator(this.nodes.filter(node => hasText.test(text(node.props.children)))); }
  or(other) { return new Locator([...new Set([...this.nodes, ...other.nodes])]); }
  async count() { return this.nodes.length; }
}
function pageFor(rendered) {
  for (const node of rendered.nodes) node.document = rendered.nodes;
  return { locator(selector) {
    if (selector === 'main.hh-app [data-cabinet-guest-overview="true"]') return new Locator(rendered.nodes.filter(node =>
      node.props['data-cabinet-guest-overview'] === 'true' && node.ancestors.some(parent =>
        parent.type === 'main' && parent.props.className.split(/\s+/).includes('hh-app'))));
    if (selector === '[data-subscription-settings], [data-course-testing-complete]') return new Locator(rendered.nodes.filter(node =>
      Object.hasOwn(node.props, 'data-subscription-settings') || Object.hasOwn(node.props, 'data-course-testing-complete')));
    throw Error('Unexpected selector: ' + selector);
  } };
}
const one = locator => { assert.equal(locator.nodes.length, 1, 'strict unique locator'); return locator.nodes[0]; };
const expectDouble = target => ({
  async toHaveCount(count) { await Promise.resolve(); assert.equal(target.nodes.length, count); },
  async toBeVisible() { await Promise.resolve(); assert.equal(one(target).visible, true); },
  async toBeEnabled() { await Promise.resolve(); assert.ok(!one(target).props.disabled); },
  async toHaveAttribute(key, value) { await Promise.resolve(); assert.equal(one(target).props[key], value); },
  async toHaveJSProperty(key, value) { await Promise.resolve(); assert.equal(one(target)[key], value); },
  async toHaveAccessibleName(value) { await Promise.resolve(); assert.equal(name(one(target)), value); },
  async toHaveURL(value) { await Promise.resolve(); assert.equal(target.url(), value); },
});
function assertRenderingSafety(rendered) {
  assert.deepEqual(rendered.effects, [], 'render and read-only verification must never call sign-in/retry');
  for (const node of rendered.nodes.filter(node => node.type === 'link'))
    assert.equal(node.props.prefetch, false, 'public links do not auto-load client pages');
  for (const node of rendered.nodes.filter(node => node.type === 'button')) {
    assert.equal(node.props.type, 'button');
    assert.ok([rendered.signin, rendered.retry].includes(node.props.onClick), 'retain explicit original handler binding');
  }
}
async function exercise(options = {}, verifier = assertCabinetGuestEntry) {
  const rendered = fixture(options);
  assertRenderingSafety(rendered);
  await verifier(pageFor(rendered), expectDouble);
  assertRenderingSafety(rendered);
}
function assertGuestSeparation(source = workspace) {
  for (const options of [{ state: 'ready' }, { page: 'course' }, { stressSignup: true }]) {
    const rendered = fixture({ ...options, workspaceSource: source });
    assert.equal(rendered.nodes.length, 0, 'no guest content for a private account or dedicated course entry');
    assert.deepEqual(rendered.effects, []);
  }
}
function assertReadOnlyHelper(source) {
  const ast = parse(source);
  const allowed = new Set(['page.locator', 'guest.getByRole', 'expect', 'signin.or', 'signin.count']);
  function visit(node, parent) {
    assert.ok(!ts.isImportDeclaration(node), 'helper must not import runtime/provider dependencies');
    assert.ok(!ts.isNewExpression(node), 'helper cannot construct runtime/network resources');
    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(ast);
      const property = ts.isPropertyAccessExpression(node.expression) ? node.expression.name.text : null;
      assert.ok(allowed.has(callee) || ['filter', 'toHaveCount', 'toBeVisible', 'toHaveAttribute', 'toBeEnabled'].includes(property),
        'helper call is not an allowed read/assertion: ' + callee);
      if (property?.startsWith('to')) assert.ok(ts.isAwaitExpression(parent), 'every assertion is awaited');
    }
    ts.forEachChild(node, child => visit(child, node));
  }
  visit(ast);
}
function integrationContract(source) {
  const ast = parse(diagnostics);
  const registrations = ast.statements.filter(ts.isExpressionStatement).map(node => node.expression)
    .filter(node => ts.isCallExpression(node) && node.expression.getText(ast) === 'test' &&
      node.arguments[0]?.text === 'integration retains fatal gate, original checks and navigation sequence exactly');
  assert.equal(registrations.length, 1);
  const callback = registrations[0].arguments[1].getText(ast);
  assert.equal(callback.split('import.meta.url').length - 1, 1);
  // Execute the existing frozen-hash assertion itself against each candidate.
  runInNewContext('(' + callback.replace('import.meta.url', 'sourceUrl') + ')()', { assert, createHash, URL,
    sourceUrl: new URL('./es-public-diagnostics.test.mjs', import.meta.url).href,
    readFileSync(url) { assert.ok(String(url).endsWith('/scripts/verify-es-public-site.mjs')); return source; } },
  { timeout: 1000, importModuleDynamically() { throw Error('No imports'); } });
}
function callerEntry(source) {
  const start = '        stage=`${engine} ${width} Spanish account navigation`;';
  const end = '        stage=`${engine} ${width} search`;';
  assert.equal(source.split(start).length - 1, 1);
  assert.equal(source.split(end).length - 1, 1);
  assert.equal(source.split("import { assertCabinetGuestEntry } from './helpers/cabinet-guest-entry-verifier.mjs';").length - 1, 1,
    'actual caller imports the actual helper');
  const entry = source.slice(source.indexOf(start) + start.length, source.indexOf(end));
  parse(entry);
  return entry;
}
async function exerciseCaller(source = caller, options = {}) {
  integrationContract(source);
  const rendered = fixture(options), entry = callerEntry(source), effects = [], guestChecks = [];
  assertRenderingSafety(rendered);
  const publicPage = pageFor(rendered);
  let arrived = false, reloaded = false, url = origin + '/es/client';
  const link = { type: 'a', props: { href: '/en/app', children: 'Gabinete' }, visible: true };
  const trigger = { type: 'summary', props: {}, visible: true };
  const menu = { type: 'details', props: {}, visible: true, open: false };
  const menuLocator = new Locator([menu]);
  menuLocator.getByRole = (wanted, choice) => {
    assert.equal(wanted, 'link'); assert.equal(choice.name, 'Gabinete'); assert.equal(choice.exact, true);
    assert.equal(Object.keys(choice).sort().join(','), 'exact,name');
    return new Locator([link]);
  };
  const page = { url: () => url,
    locator(selector) {
      if (selector === '.site-navigation details.site-main-menu') return menuLocator;
      if (selector === '.site-main-menu-trigger') return new Locator([trigger]);
      if (selector === '.site-main-menu-grid > a[data-nav-item="house"][href="/en/app"]') return new Locator([link]);
      assert.ok(arrived, 'guest assertions happen only after actual Cabinet navigation');
      if (selector === 'html') return new Locator([{ props: { lang: reloaded ? 'en' : 'es' } }]);
      return publicPage.locator(selector);
    },
    async reload() {
      assert.equal(guestChecks.length, 1, 'arrival check finishes before reload');
      await Promise.resolve(); reloaded = true; effects.push('reload');
    },
  };
  const run = runInNewContext('(async () => {' + entry + '})', { page, expect: expectDouble, origin,
    async click(locator) {
      await Promise.resolve();
      if (one(locator) === trigger) { menu.open = true; effects.push('menu'); return; }
      assert.equal(one(locator), link); assert.equal(menu.open, true);
      arrived = true; url = origin + '/en/app/portrait'; effects.push('account');
    },
    async settle() { await Promise.resolve(); },
    async assertCabinetGuestEntry(target, expectation) {
      assert.equal(target, page); assert.equal(expectation, expectDouble);
      assert.equal(url, origin + '/en/app/portrait');
      await assertCabinetGuestEntry(target, expectation);
      guestChecks.push(reloaded ? 'reload' : 'arrival');
    },
  }, { timeout: 1000 });
  await run();
  assert.deepEqual(effects, ['menu', 'account', 'reload']);
  assert.deepEqual(guestChecks, ['arrival', 'reload']);
  assertRenderingSafety(rendered);
}

test('helper permits only awaited read-only locators/assertions', () => assertReadOnlyHelper(helper));
for (const [label, options] of [
  ['ordinary signed-out', {}], ['service unavailable', { state: 'unavailable' }],
  ['neutral session-check failure', { state: 'error', error: {} }],
]) test('actual guest component and actual caller accept ' + label + ' without sign-in/writes', async () => {
  await exercise(options); await exerciseCaller(caller, options);
});
test('actual workspace guest branch excludes ready accounts, course and stress entry', () => {
  assertGuestSeparation();
  const route = read('app/[locale]/app/[[...path]]/page.jsx');
  assert.match(route, /if \(!\['en', 'ru'\]\.includes\(locale\)\) notFound\(\)/);
  assert.match(route, /if \(path\.length === 0\) redirect\('\/' \+ locale \+ '\/app\/portrait'\)/);
  assert.match(workspace, /const signinAttempted = useRef\(false\)/);
  assert.match(workspace, /const stressSignup = page === 'course' && searchParams\.get\('program'\) === 'stress'/);
  assert.match(workspace, /state === 'signed-out' && stressSignup &&\s*searchParams\.get\('entry'\) === 'quick' && !quickAuthAttempted\.current/);
  const branch = parse(guestBranch(workspace)).statements[0];
  assert.equal(printed(branch.expression.getText()),
    printed("state !== 'ready' && page === 'portrait' && !stressSignup"));
});
test('workspace forwards actual unavailable state and explicit original sign-in handler', () => {
  const verify = source => {
    for (const [state, count] of [['signed-out', 1], ['unavailable', 0]]) {
      const rendered = fixture({ state, workspaceSource: source });
      assert.equal(rendered.nodes.filter(node => node.type === 'button' && node.props.onClick === rendered.signin).length, count);
    }
  };
  verify(workspace);
  assert.throws(() => verify(replaceOnce(workspace, "unavailable={state === 'unavailable'}", 'unavailable={false}')));
});
for (const [label, before, after] of [
  ['signed-in isolation', "state !== 'ready' && page === 'portrait' && !stressSignup", "page === 'portrait' && !stressSignup"],
  ['portrait-only isolation', "state !== 'ready' && page === 'portrait' && !stressSignup", "state !== 'ready' && !stressSignup"],
  ['stress-entry isolation', "state !== 'ready' && page === 'portrait' && !stressSignup", "state !== 'ready' && page === 'portrait'"],
]) test('actual rendered branch rejects lost ' + label, () => {
  assert.throws(() => assertGuestSeparation(replaceOnce(workspace, before, after)));
});

const defects = [
  ['missing guest marker', { componentSource: replaceOnce(component, ' data-cabinet-guest-overview="true"', '') }],
  ['hidden guest region', { componentSource: replaceOnce(component, '<section className={styles.shell}', '<section hidden className={styles.shell}') }],
  ['duplicate guest region', { componentSource: replaceOnce(replaceOnce(component, '  return (\n    <section', '  const content = (\n    <section'), '  )\n}', '  )\n  return [content, content]\n}') }],
  ['wrong guest wrapper', { workspaceSource: replaceOnce(workspace, 'className="hh-app hh-app--cabinet-guest"', 'className="wrong-wrapper"') }],
  ['wrong heading', { componentSource: replaceOnce(component, "title: 'Discover where you are. Grow into what comes next.'", "title: 'Other heading'") }],
  ['wrong heading ID', { componentSource: replaceOnce(component, '<h1 id="cabinet-guest-title"', '<h1 id="wrong-title"') }],
  ['wrong region label target', { componentSource: replaceOnce(component, 'aria-labelledby="cabinet-guest-title"', 'aria-labelledby="wrong-title"') }],
  ['hidden heading', { componentSource: replaceOnce(component, '<h1 id="cabinet-guest-title"', '<h1 hidden id="cabinet-guest-title"') }],
  ['duplicate heading', { componentSource: replaceOnce(component, '<h1 id="cabinet-guest-title" className={styles.title}>{t.title}</h1>', '<h1 id="cabinet-guest-title" className={styles.title}>{t.title}</h1><h1 id="cabinet-guest-title">{t.title}</h1>') }],
  ['extra different heading', { componentSource: replaceOnce(component, '<h1 id="cabinet-guest-title" className={styles.title}>{t.title}</h1>', '<h1 id="cabinet-guest-title" className={styles.title}>{t.title}</h1><h1>Unexpected second title</h1>') }],
  ['wrong free-test route', { componentSource: replaceOnce(component, "selectedLocale + '/client/tests'", "selectedLocale + '/app/tests'") }],
  ['wrong free-test label', { componentSource: replaceOnce(component, "testsLink: 'Explore free tests'", "testsLink: 'Other action'") }],
  ['hidden free-test action', { componentSource: replaceOnce(component, "<Link href={'/' + selectedLocale + '/client/tests'}", "<Link hidden href={'/' + selectedLocale + '/client/tests'}") }],
  ['duplicate free-test action', { componentSource: replaceOnce(component, '<div className={styles.actions}>', '<div className={styles.actions}><Link href="/en/client/tests" prefetch={false}>{t.testsLink}</Link>') }],
  ['wrong legacy route', { componentSource: replaceOnce(component, "selectedLocale + '/client'}", "selectedLocale + '/app'}") }],
  ['wrong legacy label', { componentSource: replaceOnce(component, "legacy: 'Open the previous access page'", "legacy: 'Other access'") }],
  ['hidden legacy action', { componentSource: replaceOnce(component, "<Link href={'/' + selectedLocale + '/client'}", "<Link hidden href={'/' + selectedLocale + '/client'}") }],
  ['duplicate legacy action', { componentSource: replaceOnce(component, '<footer className={styles.footer}>', '<footer className={styles.footer}><Link href="/en/client" prefetch={false}>{t.legacy}</Link>') }],
  ['wrong sign-in label', { componentSource: replaceOnce(component, "signin: 'Open my Cabinet with Google'", "signin: 'Sign in with Google'") }],
  ['both auth states', { state: 'unavailable', componentSource: replaceOnce(component, '{!unavailable && <button', '{true && <button') }],
  ['hidden extra auth state', { state: 'unavailable', componentSource: replaceOnce(component, '{!unavailable && <button', '{true && <button hidden') }],
  ['neither auth state', { state: 'unavailable', componentSource: replaceOnce(component, '{unavailable && <p', '{false && <p') }],
  ['hidden sign-in', { componentSource: replaceOnce(component, '{!unavailable && <button type="button"', '{!unavailable && <button hidden type="button"') }],
  ['disabled sign-in', { componentSource: replaceOnce(component, 'disabled={busy}', 'disabled={true}') }],
  ['unexpected busy sign-in', { busy: true }],
  ['hidden unavailable notice', { state: 'unavailable', componentSource: replaceOnce(component, '{unavailable && <p className', '{unavailable && <p hidden className') }],
  ['wrong unavailable notice', { state: 'unavailable', componentSource: replaceOnce(component, "unavailable: 'Google sign-in is temporarily unavailable. You can still explore free tests and return later.'", "unavailable: 'Unrelated status'") }],
  ['login alert before consent', { attempted: true, error: {} }],
  ['private subscription control', { workspaceSource: replaceOnce(workspace, '<main className="hh-app hh-app--cabinet-guest">', '<main data-subscription-settings className="hh-app hh-app--cabinet-guest">') }],
  ['private course control', { workspaceSource: replaceOnce(workspace, '<main className="hh-app hh-app--cabinet-guest">', '<main data-course-testing-complete className="hh-app hh-app--cabinet-guest">') }],
  ['eager client-link load', { componentSource: replaceOnce(component, "className={styles.secondaryAction} prefetch={false}", "className={styles.secondaryAction} prefetch={true}") }],
  ['automatic sign-in on render', { componentSource: replaceOnce(component, 'const t = TEXT[selectedLocale]', 'const t = TEXT[selectedLocale]; onSignin()') }],
  ['detached sign-in handler', { componentSource: replaceOnce(component, 'onClick={onSignin}', 'onClick={() => {}}') }],
];
for (const [label, options] of defects) test('reject actual-source defect: ' + label, async () => {
  await assert.rejects(() => exercise(options));
});

const callerDefects = [
  ['missing arrival helper', source => source.replace('        await assertCabinetGuestEntry(page, expect);\n', '')],
  ['missing reload helper', source => source.replace("        await expect(page.locator('html')).toHaveAttribute('lang','en');\n        await assertCabinetGuestEntry(page, expect);", "        await expect(page.locator('html')).toHaveAttribute('lang','en');")],
  ['unawaited arrival helper', source => source.replace('await assertCabinetGuestEntry(page, expect);', 'assertCabinetGuestEntry(page, expect);')],
  ['third helper call', source => source.replace('await assertCabinetGuestEntry(page, expect);', 'await assertCabinetGuestEntry(page, expect);\n        await assertCabinetGuestEntry(page, expect);')],
  ['wrong account destination', source => source.replace("await expect(accountLink).toHaveAttribute('href','/en/app');", "await expect(accountLink).toHaveAttribute('href','/es/app');")],
  ['wrong canonical arrival', source => source.replace("await expect(page).toHaveURL(origin+'/en/app/portrait');", "await expect(page).toHaveURL(origin+'/en/app');")],
  ['missing reload', source => source.replace('await page.reload(); await settle();', 'await settle();')],
  ['missing reload locale', source => source.replace("        await expect(page.locator('html')).toHaveAttribute('lang','en');\n        await assertCabinetGuestEntry", '        await assertCabinetGuestEntry')],
  ['missing private-control guard', source => source.replace("        await expect(page.locator('[data-subscription-settings], [data-course-testing-complete]')).toHaveCount(0);\n", '')],
  ['automatic auth action', source => source.replace('await assertCabinetGuestEntry(page, expect);', "await page.getByRole('button', { name: 'Open my Cabinet with Google' }).click();\n        await assertCabinetGuestEntry(page, expect);")],
];
for (const [label, mutate] of callerDefects) test('frozen actual caller rejects: ' + label, async () => {
  const changed = mutate(caller); assert.notEqual(changed, caller);
  await assert.rejects(() => exerciseCaller(changed));
});
for (const [label, before, after] of [
  ['unawaited assertion', 'await expect(guest).toBeVisible();', 'expect(guest).toBeVisible();'],
  ['sign-in click', 'if (await signin.count()) await expect(signin).toBeEnabled();', 'if (await signin.count()) await signin.click();'],
]) test('read-only helper gate rejects: ' + label, () => {
  assert.throws(() => assertReadOnlyHelper(replaceOnce(helper, before, after)));
});
for (const [label, before, after, defect] of [
  ['weakened heading copy', "level: 1, name: 'Discover where you are. Grow into what comes next.', exact: true, includeHidden: true,", 'level: 1,', 'wrong heading'],
  ['lost link href check', "    await expect(link).toHaveAttribute('href', href);", '', 'wrong free-test route'],
  ['lost disabled guard', 'if (await signin.count()) await expect(signin).toBeEnabled();', '', 'disabled sign-in'],
  ['lost auth-state exclusivity', '  await expect(signin.or(unavailable)).toHaveCount(1);\n  await expect(signin.or(unavailable)).toBeVisible();', '', 'neither auth state'],
  ['lost alert guard', "  await expect(guest.getByRole('alert', { includeHidden: true })).toHaveCount(0);", '', 'login alert before consent'],
  ['lost private controls', "  await expect(page.locator('[data-subscription-settings], [data-course-testing-complete]')).toHaveCount(0);", '', 'private subscription control'],
]) test('negative controls detect helper mutation: ' + label, async () => {
  const changed = evaluate(replaceOnce(helper, before, after)).assertCabinetGuestEntry;
  const options = defects.find(([name]) => name === defect)[1];
  // The regression gate must reject a checker that accepts this known defect.
  const regressionGate = async verifier => {
    await exercise({}, verifier);
    await assert.rejects(() => exercise(options, verifier), 'required source defect was not detected');
  };
  await regressionGate(assertCabinetGuestEntry);
  await assert.rejects(() => regressionGate(changed), /required source defect was not detected/);
});
