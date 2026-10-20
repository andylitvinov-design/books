import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { parse } from 'acorn';
import { positionContactChannelForHitTest } from '../scripts/helpers/contact-channel-positioning.mjs';
import { mountPublicConversion } from './helpers/public-conversion-ui-harness.mjs';
import { exercisePublicEnquiryUi, assertPublicEnquiryFixture } from '../scripts/helpers/public-enquiry-ui-verifier.mjs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

for (const locale of ['en', 'ru', 'es']) {
  for (const kind of ['tantra-initiation', 'yggdrasil-initiation', 'academy-tantra']) {
    test(locale + ' actual ' + kind + ' follows strict held-response save gate without opening messenger', async () => {
      const mounted = mountPublicConversion(locale, kind);
      const { page, expect } = mounted;
      const choosers = page.locator('[data-contact-channel-chooser]');
      await expect(choosers).toHaveCount(kind === 'tantra-initiation' ? 5 : 1);
      for (const index of kind === 'tantra-initiation' ? [0, 4] : [0]) {
        await exercisePublicEnquiryUi(page, choosers.nth(index), expect, { locale, kind, scopeIsChooser: true });
      }
      if (kind === 'yggdrasil-initiation') {
        await page.locator('button[data-intent="personal"]').click();
        await exercisePublicEnquiryUi(page, choosers, expect, { locale, kind, scopeIsChooser: true,
          requiredMessage: [locale === 'ru' ? 'ЛИЧНУЮ' : 'PERSONAL', '€100', '60'] });
      }
      assert.equal(mounted.fetchCount(), kind === 'academy-tantra' ? 4 : 8);
      assert.equal(mounted.externalClicks(), 0);
      assert.equal(mounted.intercepted(), false);
    });
  }

}

test('actual Temple chooser retains its selected tradition, deity and initiation through save gate', async () => {
  const mounted = mountPublicConversion('en', 'temple-initiation');
  const { page, expect } = mounted;
  await expect(page.locator('[data-contact-channel-chooser]')).toHaveCount(0);
  for (const step of ['tradition', 'deity', 'initiation']) await page.locator('[data-temple-step="' + step + '"]').locator('button').first().click();
  await exercisePublicEnquiryUi(page, page.locator('[data-contact-channel-chooser]'), expect,
    { locale: 'en', kind: 'temple-initiation', scopeIsChooser: true, requiredMessage: ['Greek', 'Aphrodite', 'Meditation–initiation'] });
  assert.equal(mounted.fetchCount(), 4);
  assert.equal(mounted.externalClicks(), 0);
});

for (const kind of ['tantra-initiation', 'yggdrasil-initiation', 'academy-tantra', 'temple-initiation']) {
  test(kind + ' fixture refuses a wrong public route and any external origin', () => {
    for (const url of ['https://holistichouse.vercel.app/en/academy', 'http://127.0.0.1:3100/en/services/dao-health-profile']) {
      assert.throws(() => assertPublicEnquiryFixture({ url: () => url }, kind, 'en'));
    }
  });
}

test('chooser CLI rejects live, external or unapproved fixture execution before loading browser', () => {
  const source = read('scripts/verify-contact-channel-chooser-browser.mjs');
  const guard = source.slice(source.indexOf('if (process.argv.includes'), source.indexOf('const require ='));
  for (const [argv, env] of [
    [['--live'], { HH_PUBLIC_QA_ENQUIRY_FIXTURE: '1' }],
    [[], { HH_PUBLIC_QA_ORIGIN: 'https://holistichouse.vercel.app', HH_PUBLIC_QA_ENQUIRY_FIXTURE: '1' }],
    [[], {}],
  ]) assert.throws(() => runInNewContext(guard, { process: { argv, env } }));
  runInNewContext(guard, { process: { argv: [], env: { HH_PUBLIC_QA_ENQUIRY_FIXTURE: '1' } } });
  for (const gate of ['b.width >= 100 && b.height >= 44', 'document.elementFromPoint', 'page.keyboard.press("Enter")',
    '[320,390,1188]', '["en","ru","es"]', 'runEngine("webkit",webkit)', 'networkGuard.assertNoUnexpectedRequests()', 'backendPersistenceVerified:false']) assert.ok(source.includes(gate), gate);
  assertChooserPositioningContract(source, read('scripts/helpers/contact-channel-positioning.mjs'));
  assert.doesNotMatch(source, /Where would you like to send your request/);
});

// The CLI delegates positioning to this exact helper; stability must still finish
// before native centering, and neither delegation nor centering relaxes the gates.
function assertChooserPositioningContract(source, helperSource) {
  const cli = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  const imported = cli.body.find(node => node.type === 'ImportDeclaration'
    && node.source.value === './helpers/contact-channel-positioning.mjs');
  assert.ok(imported?.specifiers.length === 1 && imported.specifiers[0].type === 'ImportSpecifier'
    && imported.specifiers[0].imported.name === 'positionContactChannelForHitTest'
    && imported.specifiers[0].local.name === 'positionContactChannelForHitTest',
  'Chooser CLI must import the exact positioning helper');
  const verifier = cli.body.find(node => node.type === 'FunctionDeclaration' && node.id.name === 'verifyChooser');
  const loop = verifier?.body.body.find(node => node.type === 'ForOfStatement');
  const loopSource = loop ? source.slice(loop.start, loop.end) : '';
  assert.ok(/^for \(const \[channel, link\] of \[\["whatsapp", wa\], \["telegram", tg\]\]\) \{\s+await positionContactChannelForHitTest\(link\);\s+const b = await link\.boundingBox\(\);/.test(loopSource),
    'Chooser CLI must await positioning of each exact link before measuring it');
  const helper = parse(helperSource, { ecmaVersion: 'latest', sourceType: 'module' });
  const exported = helper.body.length === 1 && helper.body[0];
  assert.ok(exported?.type === 'ExportNamedDeclaration'
    && /^export async function positionContactChannelForHitTest\(link\) \{\s+await link\.scrollIntoViewIfNeeded\(\);\s+await link\.evaluate\(anchor => \{\s+anchor\.scrollIntoView\(\{ block: 'center', inline: 'nearest', behavior: 'instant' \}\);\s+\}\);\s+\}$/.test(helperSource.slice(exported.start, exported.end)),
  'Positioning helper must await stability and exact native centering in order');
  const catchCall = loop.body.body.map(node => node.expression?.argument).find(node => {
    const call = node?.callee?.object;
    return call?.type === 'CallExpression' && call.callee.object?.name === 'page' && call.callee.property?.name === 'waitForFunction';
  });
  const predicate = catchCall?.callee.object.arguments[0];
  const statements = predicate?.body?.body || [];
  const hasPredicateStatement = expected => statements.some(node => source.slice(node.start, node.end) === expected);
  assert.ok(hasPredicateStatement('if (r.top < 0 || r.bottom > innerHeight) return false;'),
    'Chooser viewport predicate must reject any top or bottom clipping');
  assert.ok(hasPredicateStatement('const target = document.elementFromPoint(r.left + r.width / 2, r.bottom - 6);'),
    'Chooser hit test must retain the original interior point');
  assert.ok(hasPredicateStatement(`return Boolean(target?.closest('a[data-contact-channel="' + channel + '"]'));`),
    'Chooser hit test must require the intended channel');
  const diagnosticStatements = catchCall.arguments[0]?.body?.body || [];
  assert.ok(catchCall.callee.property.name === 'catch' && diagnosticStatements.length === 2
    && source.slice(diagnosticStatements[0].start, diagnosticStatements[0].end) === 'const diagnostic = await page.evaluate(collectContactChannelGeometry, { channel, panelId });'
    && source.slice(diagnosticStatements[1].start, diagnosticStatements[1].end) === 'throw new Error("Messenger channel obstructed: " + name + " " + JSON.stringify(diagnostic) + ": " + error.message);',
  'Chooser failure must collect geometry and rethrow the obstruction');
}

test('imported chooser helper awaits stability and native centering on the selected link', { timeout: 1000 }, async () => {
  const source = read('scripts/verify-contact-channel-chooser-browser.mjs');
  assertChooserPositioningContract(source, read('scripts/helpers/contact-channel-positioning.mjs'));
  const calls = [];
  let ready, centered, started;
  const stable = new Promise(resolve => { ready = resolve; });
  const nativeCompletion = new Promise(resolve => { centered = resolve; });
  const nativeStarted = new Promise(resolve => { started = resolve; });
  const anchor = { scrollIntoView(options) { calls.push(['native-center', options]); } };
  let completed = false;
  const work = positionContactChannelForHitTest({
    async scrollIntoViewIfNeeded() { calls.push(['stability-start']); await stable; calls.push(['stability-end']); },
    async evaluate(callback) {
      calls.push(['evaluate-exact-link']);
      runInNewContext('(' + callback.toString() + ')(anchor)', { anchor });
      started();
      await nativeCompletion;
    },
  }).then(() => { completed = true; });
  await Promise.resolve();
  assert.deepEqual(calls, [['stability-start']], 'Native scrolling must wait for locator stability');
  assert.equal(completed, false);
  ready();
  await nativeStarted;
  await Promise.resolve();
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    ['stability-start'], ['stability-end'], ['evaluate-exact-link'],
    ['native-center', { block: 'center', inline: 'nearest', behavior: 'instant' }],
  ]);
  assert.equal(completed, false, 'The caller must not continue before native centering completes');
  centered();
  await work;
  assert.equal(completed, true);
});

test('chooser positioning contract rejects missing helper, unawaited scrolling and relaxed geometry', () => {
  const source = read('scripts/verify-contact-channel-chooser-browser.mjs');
  const helperSource = read('scripts/helpers/contact-channel-positioning.mjs');
  // Every negative starts from a passing nominal source and names the exact
  // broken gate, so an earlier unrelated assertion cannot satisfy the control.
  assertChooserPositioningContract(source, helperSource);
  for (const [label, cliBefore, cliAfter, helperBefore, helperAfter, message] of [
    ['missing import', 'import { positionContactChannelForHitTest } from "./helpers/contact-channel-positioning.mjs";', '', null, null,
      'Chooser CLI must import the exact positioning helper'],
    ['commented import decoy', 'import { positionContactChannelForHitTest } from "./helpers/contact-channel-positioning.mjs";', '/* import { positionContactChannelForHitTest } from "./helpers/contact-channel-positioning.mjs"; */', null, null,
      'Chooser CLI must import the exact positioning helper'],
    ['wrong helper', './helpers/contact-channel-positioning.mjs', './helpers/unrelated-positioning.mjs', null, null,
      'Chooser CLI must import the exact positioning helper'],
    ['unawaited caller', 'await positionContactChannelForHitTest(link);', 'positionContactChannelForHitTest(link);', null, null,
      'Chooser CLI must await positioning of each exact link before measuring it'],
    ['missing helper body', null, null, helperSource, '',
      'Positioning helper must await stability and exact native centering in order'],
    ['unawaited stability', null, null, 'await link.scrollIntoViewIfNeeded();', 'link.scrollIntoViewIfNeeded();',
      'Positioning helper must await stability and exact native centering in order'],
    ['unawaited native centering', null, null, 'await link.evaluate(', 'link.evaluate(',
      'Positioning helper must await stability and exact native centering in order'],
    ['different native alignment', null, null, "block: 'center'", "block: 'nearest'",
      'Positioning helper must await stability and exact native centering in order'],
    ['fractional clipping tolerance', 'if (r.top < 0 || r.bottom > innerHeight) return false;', 'if (r.top < -1 || r.bottom > innerHeight + 1) return false;', null, null,
      'Chooser viewport predicate must reject any top or bottom clipping'],
    ['commented strict-predicate decoy', 'if (r.top < 0 || r.bottom > innerHeight) return false;', '/* if (r.top < 0 || r.bottom > innerHeight) return false; */ if (r.top < -1 || r.bottom > innerHeight + 1) return false;', null, null,
      'Chooser viewport predicate must reject any top or bottom clipping'],
    ['relocated hit point', 'document.elementFromPoint(r.left + r.width / 2, r.bottom - 6)', 'document.elementFromPoint(r.left + r.width / 2, r.bottom - 12)', null, null,
      'Chooser hit test must retain the original interior point'],
    ['bypassed intended-channel check', `return Boolean(target?.closest('a[data-contact-channel="' + channel + '"]'));`, 'return Boolean(target);', null, null,
      'Chooser hit test must require the intended channel'],
    ['swallowed obstruction', 'throw new Error("Messenger channel obstructed: " + name + " " + JSON.stringify(diagnostic) + ": " + error.message);', 'return diagnostic;', null, null,
      'Chooser failure must collect geometry and rethrow the obstruction'],
  ]) {
    const changedSource = cliBefore === null ? source : source.replace(cliBefore, cliAfter);
    const changedHelper = helperBefore === null ? helperSource : helperSource.replace(helperBefore, helperAfter);
    assert.ok(changedSource !== source || changedHelper !== helperSource, 'Mutation must change source: ' + label);
    assert.throws(() => assertChooserPositioningContract(changedSource, changedHelper), { code: 'ERR_ASSERTION', message }, label);
  }
});

test('academy fixture rejects a wrong course title at its first request', async () => {
  const mounted = mountPublicConversion('en', 'academy-tantra', 'wrong academy service');
  await assert.rejects(() => exercisePublicEnquiryUi(mounted.page, mounted.page.locator('[data-contact-channel-chooser]'), mounted.expect,
    { locale: 'en', kind: 'academy-tantra', scopeIsChooser: true }));
  assert.equal(mounted.fetchCount(), 1);
});

test('direct-chooser mode refuses a non-chooser scope instead of relaxing uniqueness', async () => {
  const mounted = mountPublicConversion('en', 'academy-tantra');
  await assert.rejects(() => exercisePublicEnquiryUi(mounted.page, mounted.page.locator('[data-academy-course-capture]'), mounted.expect,
    { locale: 'en', kind: 'academy-tantra', scopeIsChooser: true }));
  assert.equal(mounted.fetchCount(), 0);
});

for (const kind of ['tantra-initiation', 'yggdrasil-initiation', 'academy-tantra', 'temple-initiation']) {
  test(kind + ' rejects an arbitrary submitted service title rather than authorizing an open-ended fixture', async () => {
    const mounted = mountPublicConversion('en', kind, 'wrong service title');
    if (kind === 'temple-initiation') {
      for (const step of ['tradition', 'deity', 'initiation']) await mounted.page.locator('[data-temple-step="' + step + '"]').locator('button').first().click();
    }
    await assert.rejects(() => exercisePublicEnquiryUi(mounted.page, mounted.page.locator('[data-contact-channel-chooser]').first(), mounted.expect,
      { locale: 'en', kind, scopeIsChooser: true }));
    assert.equal(mounted.fetchCount(), 1);
    assert.equal(mounted.externalClicks(), 0);
    assert.equal(mounted.intercepted(), false);
  });
}
