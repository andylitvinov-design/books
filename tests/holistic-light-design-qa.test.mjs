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
  for (const literal of ['#fcf9f2', '#067a67', '#fff9f3', '#02774b', '#eaf7f7', '#fcecf2',
    'data-hh-design="warm-sunrise"', 'max-width: 350px', 'focus-visible']) assert.ok(tokens.includes(literal), literal);
  for (const locale of ['ru', 'en', 'es']) assert.ok(DESIGN_CASES.some(x => x.route.startsWith('/' + locale + '/')));
  assert.ok(DESIGN_CASES.some(x => x.browser === 'webkit' && x.width === 320));
  assert.match(doc, /holistichouse\.vercel\.app|holistic-light/i);
  assert.match(doc, /85–89|85-89|85–100/);
});
