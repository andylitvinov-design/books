import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { auditDesignSnapshot, solidContrast, DESIGN_CASES } from '../scripts/holistic-light-design-qa.mjs';

const fixture = () => ({
  route: '/ru/holistic-support/mandala',
  pathname: '/ru/holistic-support/mandala',
  viewport: { width: 390, height: 844, scrollWidth: 390 },
  landmarks: [
    { tag: 'main', box: { w: 390, h: 900 }, style: { background: 'rgb(252, 249, 242)' } },
    { tag: 'h1', box: { w: 320, h: 38 }, style: { fontSize: '32px' } },
    { tag: 'button', label: 'Создать видео', box: { x: 15, y: 500, w: 340, h: 56 },
      style: { color: 'rgb(255, 255, 255)', background: 'rgb(6, 122, 103)' } },
  ],
  pageErrors: [],
});
const specs = { route: '/ru/holistic-support/mandala', width: 390, variant: 'video-studio' };

test('light / studio defaults provide a measurable noncritical guest baseline', () => {
  const result = auditDesignSnapshot(fixture(), specs);
  assert.equal(result.status, 'REVIEW_REQUIRED', 'machine audit never claims visual approval');
  assert.equal(result.critical.length, 0);
  assert.equal(result.metrics.smallTapTargets, 0);
  assert.ok(solidContrast('rgb(255, 255, 255)', 'rgb(6, 122, 103)') >= 4.5);
  assert.ok(solidContrast('rgb(255, 255, 255)', 'rgba(6, 122, 103, 0)') === null);
});
test('document overflow and wrong view cannot be approved', () => {
  const page = fixture();
  page.viewport.scrollWidth = 425;
  page.pathname = '/ru/app/practice';
  const result = auditDesignSnapshot(page, specs);
  assert.deepEqual(result.critical.map(x => x.code).sort(), ['HORIZONTAL_OVERFLOW', 'VIEW_IDENTITY']);
});
test('real opaque control contrast is a critical accessibility defect', () => {
  const page = fixture();
  page.landmarks[2].style = { color: 'rgb(240, 240, 240)', background: 'rgb(250, 250, 250)' };
  const result = auditDesignSnapshot(page, specs);
  assert.ok(result.critical.some(x => x.code === 'SOLID_CONTROL_CONTRAST'));
});
test('small touch targets and excessive green cast are advisory, not silent approval', () => {
  const page = fixture();
  page.landmarks.push(
    { tag: 'a', label: 'More', box: { x: 4, y: 50, w: 24, h: 22 }, style: {} },
    { tag: 'section', box: { w: 390, h: 240 }, style: { background: 'rgb(208, 229, 206)' } },
    { tag: 'article', box: { w: 380, h: 240 }, style: { background: 'rgb(200, 225, 195)' } },
  );
  const result = auditDesignSnapshot(page, specs);
  assert.ok(result.warnings.some(x => x.code === 'SMALL_TAP_TARGETS'));
  assert.ok(result.warnings.some(x => x.code === 'SAGE_GREEN_WASH'));
  assert.equal(result.status, 'REVIEW_REQUIRED');
});
test('tokens, narrow-screen rules, i18n public cases and owner design spec are linked', () => {
  const tokens = readFileSync(new URL('../app/holistic-light-tokens.css', import.meta.url), 'utf8');
  const doc = readFileSync(new URL('../docs/design/HOLISTIC_LIGHT_DESIGN_BIBLE.md', import.meta.url), 'utf8');
  for (const literal of ['#fbf5e9', '#fffcf7', '#067a67', '#fff9f3', '#02774b', '#eaf7f7', '#fcecf2',
    'data-hh-design="warm-sunrise"', 'max-width: 350px', 'focus-visible']) assert.ok(tokens.includes(literal), literal);
  for (const locale of ['ru', 'en', 'es']) assert.ok(DESIGN_CASES.some(x => x.route.startsWith('/' + locale + '/')));
  assert.ok(DESIGN_CASES.some(x => x.browser === 'webkit' && x.width === 320));
  assert.match(doc, /holistichouse\.vercel\.app|holistic-light/i);
  assert.match(doc, /85–89|85-89|85–100/);
});


test('sunlit neutral canvas across public page families preserves opt-in accents', () => {
  const tokens = readFileSync(new URL('../app/holistic-light-tokens.css', import.meta.url), 'utf8');
  const globals = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
  for (const pair of ['--hh-light-canvas: #fbf5e9', '--hh-light-surface: #fffcf7', '--hh-light-surface-soft: #f5ecdc']) {
    assert.ok(tokens.includes(pair), pair);
  }
  assert.match(globals, /background: var\(--hh-light-canvas\)/);
  assert.match(globals, /--background: 40 69% 95%/);
  for (const path of [
    'mandala-meditation', 'mandala-video-mobile', 'holistic-support-mobile', 'practice-showcase',
    'meditation-practice-app', 'meditation-writer-preview', 'personal-service-landing',
    'public-growth-courses', 'growth-studio', 'home-personal-space', 'free-entry-landing',
  ]) {
    const css = readFileSync(new URL('../components/' + path + '.module.css', import.meta.url), 'utf8');
    assert.ok(css.includes('var(--hh-light-canvas)') || css.includes('var(--hh-light-surface)'), path + ' must inherit warm neutral tokens');
  }
  // Interactive/category mint and warmer one-off Business/My Course palettes stay available.
  assert.match(tokens, /--hh-light-primary-soft: #e6f6f1/);
  assert.match(tokens, /\[data-hh-design="warm-sunrise"\]/);
});


test('Ideas Voice warm-peach palette is scoped and meets readable emerald contrast', () => {
  const read = name => readFileSync(new URL('../'+name, import.meta.url), 'utf8');
  const panel = read('components/mandala-affirmation-voice.module.css');
  const studio = read('components/mandala-video-mobile.module.css');
  const page = read('components/mandala-meditation.module.css');
  const bible = read('docs/design/HOLISTIC_LIGHT_DESIGN_BIBLE.md');
  const runtime = read('components/mandala-free-video-studio.tsx');
  assert.ok(bible.includes('10.12. Ideas → Voice'));
  assert.match(page,/\.page\[data-mandala-mode="video"\]:has\(\[data-active-workspace="phrases"\] \[data-ideas-subtab="voice"\]\)/);
  assert.match(page,/linear-gradient\(165deg,#FFF7F3 0%,#FFF4EC 55%,#FFF0E8 100%\)/);
  assert.match(studio,/\.studio\[data-active-workspace="phrases"\] \[data-ideas-subtab="voice"\]\{/);
  for (const value of ['#FFFCFA','#FFF9F5','#EADFD9','#142B3D','#14523F','#5D6A71','#087E61','#006B4B']) {
    assert.ok(studio.includes(value), 'missing palette token '+value);
  }
  assert.match(panel,/:global\(\[data-ideas-subtab="voice"\]\) \.panel \.selectedPhrase/);
  assert.match(panel,/:global\(\[data-ideas-subtab="voice"\]\) \.panel \.voiceCardSelect\[aria-pressed="true"\]/);
  assert.match(panel,/:global\(\[data-ideas-subtab="voice"\]\) \.panel \.action/);
  assert.ok(runtime.includes('<div data-ideas-subtab="voice" data-ideas-voice-mode={ideasVoiceMode}>'),
    'voice modes remain inside the existing voice pane and keep their own scoped design contract');
  assert.ok(runtime.includes('data-ideas-active-tab={ideasSubtab}'),
    'Ideas navigation state remains separately available for Personalization and Concept');
  assert.ok(runtime.includes('<MandalaAffirmationVoice locale={locale}'),
    'retain the single provider-backed affirmation voice component and its real state');
  assert.ok(solidContrast('rgb(255, 255, 255)','rgb(8, 126, 97)') >= 4.5,
    'white CTA text on deep emerald must meet WCAG AA');
  assert.ok(solidContrast('rgb(255, 255, 255)','rgb(2, 160, 101)') < 4.5,
    'do not use vivid mint green under regular-size white text');
});


test('all Video Studio workspaces share one warm neutral contract without erasing meaning', () => {
  const read = name => readFileSync(new URL('../'+name, import.meta.url), 'utf8');
  const studio = read('components/mandala-video-mobile.module.css');
  const page = read('components/mandala-meditation.module.css');
  const video = read('components/mandala-free-video-studio.tsx');
  const bible = read('docs/design/HOLISTIC_LIGHT_DESIGN_BIBLE.md');
  assert.ok(bible.includes('10.13. Video Studio'));
  for (const id of ['video','phrases','editor','effects','pro','ready']) {
    assert.ok(video.includes('{id:"'+id+'"'), id+' must remain one real workspace');
  }
  for (const [key,color] of [
    ['canvas','#FFF7F3'],['edge','#FFF0E8'],['surface','#FFFCFA'],
    ['inset','#FFF9F5'],['border','#EADFD9'],['divider','#EEE6E0'],
    ['ink','#142B3D'],['forest','#14523F'],['muted','#5D6A71'],
    ['primary','#087E61'],['deep','#006B4B'],['selected','#EAF5EC']
  ]) {
    assert.ok(studio.includes('--hh-studio-'+key+':'+color),
      'missing single inherited Studio token '+key);
  }
  assert.match(page,/\.page\[data-mandala-mode="video"\]:has\(\[data-active-workspace\]\)/,
    'all video workspaces inherit the same canvas, not Photo Mandala');
  assert.ok(studio.includes('[data-auto-video-director]'),
    'the real Goal Auto Director must not keep olive default chrome');
  assert.ok(studio.includes('.quickVideoNav button:not([aria-pressed="true"])'));
  assert.ok(studio.includes('.quickVideoNav button[aria-pressed="true"]'));
  for (const path of [
    'mandala-video-ideas','mandala-multitrack-timeline',
    'mandala-hypnocorrection-mobile','mandala-pro-enhance',
    'mandala-video-ready','mandala-video-effect-journey',
    'mandala-guided-course','mandala-cinematic-director',
    'mandala-free-video-generator','mandala-cloud-voice-studio',
    'mandala-stories-characters'
  ]) {
    const styleModule = read('components/'+path+'.module.css');
    assert.ok(styleModule.includes('Design Bible §10.13'),path+' lacks scoped palette');
    assert.ok(styleModule.includes(':global([data-mandala-mode="video"])'),
      path+' must not globally recolor unrelated component instances');
    assert.ok(styleModule.includes('var(--hh-studio-surface'),
      path+' does not consume semantic surface');
    assert.ok(styleModule.includes('var(--hh-studio-border'),
      path+' does not consume semantic neutral stroke');
  }
  assert.ok(studio.includes('.quickThemeRail button[data-tone="relationships"]'),
    'the original Love category remains color coded');
  assert.ok(read('components/mandala-multitrack-timeline.module.css').includes('.audioBlock'),
    'Montage retains a separate audio media lane');
  assert.ok(solidContrast('rgb(255, 255, 255)','rgb(8, 126, 97)')>=4.5,
    'ordinary selected tab/CTA label meets AA');
});
