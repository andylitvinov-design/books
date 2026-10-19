import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import postcss from 'postcss';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const css = read('components/energywork-ai-learner.module.css');
const learner = read('components/energywork-ai-learner.tsx');
const verifier = read('scripts/verify-reiki-all-slides-browser.mjs');
const { parse } = createRequire(import.meta.url)('next/dist/compiled/babel/parser');
const prefix = '.page[lang="ru"][data-course-portrait="v3"] .welcomeSlide ';

function assertRussianSpacing(source) {
  const rules = {};
  postcss.parse(source).walkRules(rule => {
    if (!rule.selector.startsWith(prefix)) return;
    assert.equal(rule.parent.type, 'atrule');
    assert.equal(rule.parent.name, 'media');
    assert.equal(rule.parent.params.replace(/\s/g, ''), '(max-width:760px)and(max-height:700px)', 'No wider or taller-screen layout change');
    assert.equal(rule.selectors.length, 1, 'Do not include another locale or slide');
    const key = rule.selector.slice(prefix.length);
    assert.equal(rules[key], undefined, 'A single exact override per target');
    rules[key] = Object.fromEntries(rule.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]));
  });
  assert.deepEqual(rules, {
    '.slideMain': { padding: '8px 9px' },
    '.content h1': { 'margin-bottom': '6px' },
    '.welcomeReward': { 'margin-top': '4px', padding: '5px 11px' },
    '.welcomeSystems': { margin: '4px 0 0' },
    '.benefits': { 'margin-top': '4px', padding: '5px 4px' },
  });
  // This is a 29 px non-text spacing budget, not a browser geometry result.
  assert.equal((20 - 16) + (10 - 6) + (6 - 4) + (18 - 10) + (7 - 4) + (8 - 4) + (14 - 10), 29);
}

test('Russian short-phone welcome reduces only empty spacing and retains readable content', () => {
  assertRussianSpacing(css);
  assert.match(learner, /<main className=\{styles\.page\} lang=\{locale\}/);
  assert.match(learner, /<h1 id="energywork-slide-title">\{slide\.title\[locale\]\}<\/h1>/);
  assert.match(learner, /<p className=\{styles\.description\}>\{slide\.body\[locale\]\}<\/p>/);
  assert.match(learner, /energyworkPathChoices\.map\(\(choice\) => <li key=\{choice\.id\}>\{choice\.title\[locale\]\}<\/li>\)/);
  for (const key of ['shortLessons', 'shortLessonsDetail', 'practicalTasks', 'practicalTasksDetail', 'privateProgress', 'privateProgressDetail']) assert.ok(learner.includes('{t.' + key + '}'));
  assert.match(css, /\.welcomeSlide \.benefits strong \{\s*font-size: clamp\(10\.5px, 2\.95vw, 11\.5px\)/);
  assert.match(css, /\.welcomeSlide \.benefits small \{\s*font-size: 9px;\s*line-height: 1\.16/);
});

for (const [name, from, to] of [
  ['old reward padding', 'padding: 5px 11px;', 'padding: 9px 11px;'],
  ['old benefit padding', 'padding: 5px 4px;', 'padding: 7px 4px;'],
  ['old heading gap', 'margin-bottom: 6px;', 'margin-bottom: 10px;'],
  ['hidden benefits', 'padding: 5px 4px;', 'padding: 5px 4px; display: none;'],
  ['clipped benefits', 'padding: 5px 4px;', 'padding: 5px 4px; max-height: 30px; overflow: hidden;'],
  ['smaller type', 'padding: 5px 4px;', 'padding: 5px 4px; font-size: 7px;'],
  ['English override', '[lang="ru"]', '[lang="en"]'],
  ['shared locale override', '[lang="ru"]', ''],
  ['tall viewport override', '(max-height: 700px)', '(max-height: 900px)'],
]) test('Russian spacing contract rejects ' + name, () => {
  assert.ok(css.includes(from));
  assert.throws(() => assertRussianSpacing(css.replaceAll(from, to)), assert.AssertionError);
});

function checkWelcome(dimensions) {
  const matches = [];
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'FunctionDeclaration' && node.id?.name === 'expectFits') matches.push(node);
    for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') visit(value);
  };
  visit(parse(verifier, { sourceType: 'module' }));
  assert.equal(matches.length, 1);
  const page = { locator: () => ({ evaluate: async () => structuredClone(dimensions) }) };
  const expect = () => ({ toHaveAttribute: async (name, id) => { assert.equal(name, 'data-energywork-slide-id'); assert.equal(id, 'welcome-01'); } });
  const node = matches[0];
  return new Function('page', 'locale', 'assert', 'expect', 'return (' + verifier.slice(node.start, node.end) + ')')(page, 'ru', assert, expect)('welcome-01');
}

// Exact failing a579 hosted geometry, observed in Chromium and WebKit.
const clipped = { used: 376, space: 349, width: 375, height: 625, justify: 'safe center', panelTop: 122, panelBottom: 471.25,
  benefit: { top: 405.765625, bottom: 488.296875, height: 82.53125 },
  lastChoice: null, selectedGuidance: null, milestoneBadge: null,
  reviewPortrait: { top: 416.765625, bottom: 434.765625, height: 18 } };

test('unchanged native verifier rejects the actual Russian benefit cutoff and missing benefits', async () => {
  await assert.rejects(checkWelcome(clipped), /welcome benefit card must not be cut off/);
  await assert.rejects(checkWelcome({ ...clipped, benefit: null }), /welcome benefits are present/);
});

test('native welcome boundary and scroll budget remain strict', async () => {
  const boundary = { ...clipped, benefit: { ...clipped.benefit, bottom: 474.25 } };
  await checkWelcome(boundary);
  await assert.rejects(checkWelcome({ ...boundary, benefit: { ...boundary.benefit, bottom: 474.251 } }), /must not be cut off/);
  await assert.rejects(checkWelcome({ ...boundary, used: 385 }), /must not require excessive inner scrolling/);
  await assert.rejects(checkWelcome({ ...boundary, justify: 'start' }), /should balance short teaching content vertically/);
  assert.ok(verifier.includes('await expectFits("welcome-01")'));
  assert.match(verifier, /setViewportSize\(\{width:375,height:625\}\)/);
});
