import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import postcss from 'postcss';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const css = read('components/energywork-ai-learner.module.css');
const verifier = read('scripts/verify-reiki-all-slides-browser.mjs');
const { parse } = createRequire(import.meta.url)('next/dist/compiled/babel/parser');
const prefix = '.page[lang="ru"][data-course-portrait="v3"] [data-energywork-slide-kind="video"] ';
const videoIds = ['flight-02', 'tan-02', 'kun-02', 'ygg-02'];

function loadData(path) {
  const exports = {};
  const compiled = ts.transpileModule(read('data/academy/' + path + '.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  runInNewContext(compiled, { exports, require: name => {
    assert.equal(name, './yggdrasil-testimonials');
    return loadData('yggdrasil-testimonials');
  } });
  return exports;
}
const slides = JSON.parse(JSON.stringify(loadData('energywork-ai-curriculum').energyworkSlides()));
const videos = JSON.parse(JSON.stringify(loadData('english-guided-meditations').englishGuidedMeditations));

function assertVideoSpacing(source) {
  const rules = {};
  postcss.parse(source).walkRules(rule => {
    if (!rule.selector.startsWith(prefix)) return;
    assert.equal(rule.parent.type, 'atrule');
    assert.equal(rule.parent.name, 'media');
    assert.equal(rule.parent.params.replace(/\s/g, ''), '(max-width:760px)and(max-height:700px)');
    assert.equal(rule.selectors.length, 1);
    const key = rule.selector.slice(prefix.length);
    assert.equal(rules[key], undefined);
    rules[key] = Object.fromEntries(rule.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]));
  });
  assert.deepEqual(rules, { '.video': { padding: '3px 9px' }, '.slideMain': { gap: '6px' } });
}

test('all four unchanged RU video lessons share the narrowed spacing rule and approved sources', () => {
  assertVideoSpacing(css);
  const selected = slides.filter(slide => slide.kind === 'video');
  assert.equal(slides.length, 53);
  assert.deepEqual(selected.map(slide => slide.id), videoIds);
  assert.deepEqual(selected.map(slide => videos.find(video => video.key === slide.videoKey)?.youtubeId),
    ['HqfixazXqRY', 'w2BN-HYmHUk', '_IOX0E8N-To', '80xZ7jN6o2Y']);
  for (const slide of selected) {
    assert.ok(slide.title.ru.length > 10 && slide.body.ru.length > 20);
    assert.equal(slide.question, undefined);
    assert.equal(slide.image, undefined);
  }
  assert.match(read('components/energywork-ai-learner.tsx'), /slide\.kind === "video" \? \(\s*<div className=\{styles\.video\}>/);
  assert.match(css, /\.video :global\(\.academy-video-frame\), \.video :global\(\.academy-video-poster\) \{[^}]*aspect-ratio: 16 \/ 9/);
  assert.match(read('components/academy-video-player.tsx'), /onClick=\{\(\) => setPlaying\(true\)\}/);
});

for (const [name, from, to] of [
  ['old padding', 'padding: 3px 9px;', 'padding: 9px;'],
  ['old gap', 'gap: 6px;', 'gap: 9px;'],
  ['English scope', '[lang="ru"]', '[lang="en"]'],
  ['all slide kinds', '[data-energywork-slide-kind="video"]', '[data-energywork-slide-id]'],
  ['smaller type', 'padding: 3px 9px;', 'padding: 3px 9px; font-size: 9px;'],
  ['hidden content', 'padding: 3px 9px;', 'padding: 3px 9px; overflow: hidden; max-height: 100px;'],
]) test('video spacing rejects ' + name, () => {
  assert.ok(css.includes(from));
  assert.throws(() => assertVideoSpacing(css.replaceAll(from, to)), assert.AssertionError);
});

function shortVideo(source, dimensions, events) {
  const matches = [];
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'FunctionDeclaration' && node.id?.name === 'inspectShortVideo') matches.push(node);
    for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') visit(value);
  };
  visit(parse(source, { sourceType: 'module' }));
  assert.equal(matches.length, 1);
  const locator = selector => ({ selector, locator,
    evaluate: async () => { events.push(['measure']); return structuredClone(dimensions); },
  });
  const page = { locator, setViewportSize: async size => events.push(['viewport', size]) };
  const expect = target => ({
    toHaveAttribute: async (name, id) => { assert.equal(target.selector, '[data-energywork-slide-id]'); assert.equal(name, 'data-energywork-slide-id'); events.push(['id', id]); },
    toBeVisible: async () => { assert.equal(target.selector, '.academy-video-poster'); events.push(['poster']); },
    toHaveCount: async count => { assert.equal(target.selector, 'iframe'); assert.equal(count, 0); events.push(['no-autoplay']); },
  });
  const node = matches[0];
  const fn = new Function('expect', 'assert', 'engineName', 'console', 'return (' + source.slice(node.start, node.end) + ')')(
    expect, assert, 'synthetic', { log: (...args) => events.push(['log', ...args]) });
  return (id, locale = 'ru', width = 320) => fn(page, locale, id, width);
}

const boundary = { used: 422, space: 387, justify: 'safe center', posterWidth: 320, posterHeight: 180, width: 375, height: 625 };
function assertJourneyCall(source) {
  assert.equal(source.split('await inspectShortVideo(page,locale,id,width);').length - 1, 1);
  assert.match(source, /await inspect\(page,\{locale,width,index,id,screenshot:capture\}\);\s*await inspectShortVideo\(page,locale,id,width\);\s*journey\.push\(id\)/);
}

test('existing EN/RU journeys audit all four videos at375×625 and restore their exact original widths', async () => {
  assertJourneyCall(verifier);
  for (const [locale, width] of [['en', 390], ['ru', 320]]) {
    const events = [];
    const inspect = shortVideo(verifier, boundary, events);
    for (const slide of slides) await inspect(slide.id, locale, width);
    assert.deepEqual(events.filter(event => event[0] === 'id').map(event => event[1]), videoIds);
    assert.deepEqual(events.filter(event => event[0] === 'viewport').map(event => event[1]),
      videoIds.flatMap(() => [{ width: 375, height: 625 }, { width, height: 844 }]));
    assert.equal(events.filter(event => event[0] === 'poster').length, 4);
    assert.equal(events.filter(event => event[0] === 'no-autoplay').length, 4);
  }
});

test('coverage rejects a missing journey call or omitted video identity', async () => {
  assert.throws(() => assertJourneyCall(verifier.replace('await inspectShortVideo(page,locale,id,width);', '')), assert.AssertionError);
  for (const id of videoIds) {
    const events = [];
    const inspect = shortVideo(verifier.replace('"' + id + '"', '"missing-video"'), boundary, events);
    for (const slide of slides) await inspect(slide.id);
    assert.notDeepEqual(events.filter(event => event[0] === 'id').map(event => event[1]), videoIds);
  }
});

test('actual429px failure and one-pixel-over boundary remain failures for every shared video', async () => {
  for (const id of videoIds) {
    await shortVideo(verifier, boundary, [])(id);
    for (const used of [429, 423]) await assert.rejects(shortVideo(verifier, { ...boundary, used }, [])(id), /must not require excessive inner scrolling/);
  }
});

test('new native matrix rejects unbalanced content, a tiny poster or a changed aspect ratio', async () => {
  for (const dimensions of [
    { ...boundary, justify: 'start' },
    { ...boundary, posterWidth: 32, posterHeight: 18 },
    { ...boundary, posterHeight: 150 },
  ]) await assert.rejects(shortVideo(verifier, dimensions, [])('flight-02'), assert.AssertionError);
});
