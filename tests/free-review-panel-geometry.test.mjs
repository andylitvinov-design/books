import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import postcss from 'postcss';
import { freeReviewPanelNames, readFreeReviewPanelGeometry, assertFreeReviewPanelGeometry } from '../scripts/helpers/free-review-panel-geometry.mjs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const css = read('app/[locale]/services/free-situation-review/review.module.css');
const verifier = read('scripts/verify-public-services-production.mjs');

function geometry(overrides = {}) {
  const element = (height = 700, top = 0) => ({
    scrollHeight: height, clientHeight: height,
    getBoundingClientRect: () => ({ height, top }),
  });
  const scenes = Array.from({ length: 4 }, (_, index) => element(550, 150 + index * 568));
  const root = { ...element(2404), querySelectorAll: selector => selector.startsWith('article') ? scenes : [element(), element(), element()] };
  const selectors = {
    '#situations': [root],
    'section[aria-labelledby="review-hero-title"]': [element()],
    'section[aria-labelledby="review-outcomes-title"]': [element()],
    '[data-personal-testimonials="all"]': [element()],
    'section[aria-labelledby="review-alchemy-title"]': [element()],
    'section[aria-labelledby="review-about-title"]': [element()],
    'section[aria-labelledby="review-faq-title"]': [element()],
    '#how-it-works': [element()],
    'section[aria-labelledby="review-final-title"]': [element()],
    ...overrides,
  };
  return JSON.parse(JSON.stringify(runInNewContext('(' + readFreeReviewPanelGeometry.toString() + ')()', {
    window: { innerHeight: 844 }, document: { querySelectorAll: selector => selectors[selector] || [] },
  })));
}

test('actual collector measures the intro and each of four owner scenes rather than their combined wrapper', () => {
  const report = geometry();
  assert.equal(report.situationSceneCount, 4);
  assert.deepEqual(report.panels.map(panel => panel.name), freeReviewPanelNames);
  assert.equal(report.panels.find(panel => panel.name === 'situations-intro').height, 150);
  assert.deepEqual(report.panels.filter(panel => panel.name.startsWith('situation-')).map(panel => panel.height), [550, 550, 550, 550]);
  assertFreeReviewPanelGeometry(report);
  assert.match(verifier, /import \{ readFreeReviewPanelGeometry, assertFreeReviewPanelGeometry \} from '\.\/helpers\/free-review-panel-geometry\.mjs'/);
  assert.equal(verifier.split('await page.evaluate(readFreeReviewPanelGeometry)').length - 1, 1);
  assert.match(verifier, /const panelGeometry = await page\.evaluate\(readFreeReviewPanelGeometry\);\s*assertFreeReviewPanelGeometry\(panelGeometry\)/);
  assert.match(verifier, /for \(const width of \[320, 360, 390, 1188\]\)/);
});

for (const name of freeReviewPanelNames) test(name + ': missing and oversized panels still fail the exact 754 px budget', () => {
  const report = geometry();
  const panel = report.panels.find(item => item.name === name);
  panel.height = 754;
  assertFreeReviewPanelGeometry(report);
  panel.height = 755;
  assert.throws(() => assertFreeReviewPanelGeometry(report), /fit within one viewport/);
  panel.height = 700; panel.count = 0;
  assert.throws(() => assertFreeReviewPanelGeometry(report), /exactly one panel/);
});

test('reported outcomes and steps overflow remains a hard failure', () => {
  for (const [name, height] of [['outcomes', 836], ['steps', 926], ['outcomes', 803], ['steps', 758]]) {
    const report = geometry();
    report.panels.find(panel => panel.name === name).height = height;
    assert.throws(() => assertFreeReviewPanelGeometry(report), /fit within one viewport/);
  }
});

test('missing or extra scenes, duplicate panels, reordered coverage, hidden and clipped content fail closed', () => {
  for (const mutate of [
    r => { r.situationSceneCount = 3; }, r => { r.situationSceneCount = 5; },
    r => { r.panels[0].count = 2; }, r => { r.panels.reverse(); },
    r => { r.panels.pop(); }, r => { r.panels[2].height = 0; },
    r => { r.panels[2].height = Infinity; }, r => { r.panels[2].clipped = true; },
    r => { r.panels[2].max = 1000; }, r => { r.viewportHeight = NaN; },
  ]) {
    const report = geometry(); mutate(report);
    assert.throws(() => assertFreeReviewPanelGeometry(report), assert.AssertionError);
  }
  assert.throws(() => assertFreeReviewPanelGeometry(geometry({ '#situations': [] })), /four distinct/);
  assert.throws(() => assertFreeReviewPanelGeometry(geometry({ '#how-it-works': [] })), /exactly one/);
  const clipped = { scrollHeight: 720, clientHeight: 700, getBoundingClientRect: () => ({ height: 700, top: 0 }) };
  assert.throws(() => assertFreeReviewPanelGeometry(geometry({ '#how-it-works': [clipped] })), /must not be clipped/);
});

function mobileRules(source) {
  const rules = {};
  postcss.parse(source).walkRules(rule => {
    if (rule.parent.type !== 'atrule' || rule.parent.name !== 'media' || rule.parent.params.replace(/\s/g, '') !== '(max-width:767px)') return;
    for (const selector of rule.selectors) {
      rules[selector] ??= {};
      for (const declaration of rule.nodes) if (declaration.type === 'decl') rules[selector][declaration.prop] = declaration.value;
    }
  });
  return rules;
}
function assertMobileBudget(source) {
  const rules = mobileRules(source);
  assert.deepEqual(rules['.outcomeImage'], { 'min-height': '96px', 'max-height': '96px' });
  assert.deepEqual(rules['.stepsImage'], { 'min-height': '96px', 'max-height': '96px' });
  assert.deepEqual(rules['.outcomeScene .outcomeGrid'], { gap: '6px', padding: '8px' });
  assert.deepEqual(rules['.outcomeScene .outcomeGrid article'], { padding: '9px 15px' });
  assert.deepEqual(rules['.outcomeScene .outcomeGrid p'], { 'grid-column': '1 / -1', 'font-size': '13px' });
  assert.deepEqual(rules['.outcomeScene .outcomeGrid article span'], { 'grid-row': 'auto' });
  assert.deepEqual(rules['.stepsScene .steps'], { gap: '6px', padding: '8px' });
  assert.deepEqual(rules['.stepsScene .steps li'], { display: 'grid', 'grid-template-columns': '24px minmax(0,1fr)', gap: '5px 8px', padding: '8px 14px' });
  assert.deepEqual(rules['.stepsScene .steps li > div'], { display: 'contents' });
  assert.deepEqual(rules['.stepsScene .steps p'], { 'grid-column': '1 / -1', 'font-size': '12.5px' });
  assert.equal(rules['.outcomeScene']['margin-top'], '12px');
  assert.equal(rules['.stepsScene']['margin-top'], '12px');
  assert.equal(rules['.stepsScene .steps h3']['font-size'], '20px');
  assert.equal(rules['.outcomeScene .outcomeGrid h3']['font-size'], '21px');
}

test('mobile budget uses spacing, a visible illustration and wider full-text rows without smaller type', () => {
  assertMobileBudget(css);
  assert.match(css, /\.page a:focus-visible,\.page summary:focus-visible/);
  assert.match(css, /\.sceneCopy a \{[^}]*min-height: 48px/);
});

for (const [name, from, to] of [
  ['tall outcome illustration', 'min-height: 96px; max-height: 96px;', 'min-height: 210px; max-height: 30svh;'],
  ['old scene gap', 'margin-top: 12px; border-radius: 20px;', 'margin-top: 18px; border-radius: 20px;'],
  ['old outer padding', '.outcomeScene .outcomeGrid { gap: 6px; padding: 8px; }', '.outcomeScene .outcomeGrid { gap: 6px; padding: 10px; }'],
  ['old card padding', '.outcomeScene .outcomeGrid article { padding: 9px 15px; }', '.outcomeScene .outcomeGrid article { padding: 11px 15px; }'],
  ['restored stacked step number', 'display: grid; grid-template-columns: 24px minmax(0,1fr);', 'display: flex; flex-direction: column;'],
  ['hidden illustration', 'min-height: 96px; max-height: 96px;', 'min-height: 96px; max-height: 96px; display: none;'],
  ['clipped copy', 'grid-column: 1 / -1; font-size: 13px;', 'grid-column: 1 / -1; font-size: 13px; max-height: 30px; overflow: hidden;'],
  ['smaller steps type', 'font-size: 12.5px;', 'font-size: 9px;'],
]) test('mobile contract rejects ' + name, () => {
  assert.ok(css.includes(from));
  assert.throws(() => assertMobileBudget(css.replaceAll(from, to)), assert.AssertionError);
});
