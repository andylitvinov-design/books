import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// The enabled small-text controls require 4.5:1. Read actual declarations,
// including every Today variant; disabled opacity is intentionally excluded.
const files = Object.fromEntries(['course-today', 'course-slide-player', 'course-quest'].map(name =>
  [name, readFileSync(new URL(`../components/app/${name}.module.css`, import.meta.url), 'utf8')]));
const rgb = hex => {
  const digits = hex.slice(1);
  const full = digits.length === 3 ? [...digits].map(c => c + c).join('') : digits;
  assert.match(full, /^[a-f0-9]{6}$/i);
  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16));
};
const luminance = channels => channels.map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4)
  .reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
const ratio = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
function rules(file, selector) {
  return [...files[file].matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, s]) => s.trim() === selector).map(([, , body]) => body);
}
function property(body, name) {
  const value = body.match(new RegExp(`(?:^|;)\\s*${name}:([^;]+)`))?.[1].replace(/!important/g, '').trim();
  assert.ok(value, `Missing ${name}`);
  return value;
}
function solid(value) { return rgb(value === 'white' ? '#fff' : value); }
function assertSpan(foreground, background, brightness = 1) {
  const stops = background.match(/#[a-f0-9]{3,6}\b/gi);
  assert.equal(stops?.length, 2, 'Expected the opaque two-stop gradient');
  const [a, b] = stops.map(rgb);
  const filtered = channels => channels.map(value => Math.min(255, value * brightness));
  const values = Array.from({ length: 1001 }, (_, i) => ratio(filtered(solid(foreground)), filtered(a.map((v, c) => Math.round(v + (b[c] - v) * i / 1000)))));
  const minimum = Math.min(...values);
  assert.ok(minimum >= 4.5, `Contrast ${minimum.toFixed(3)}:1 is below 4.5:1`);
}
const primary = rules('course-slide-player', '.primary')[0];
const todayBase = rules('course-today', '.shell .questHero button.todayPrimary')[0];
const cases = [
  ['lesson CTA', primary, property(primary, 'color')],
  ['Today base CTA', todayBase, property(todayBase, 'color')],
  ['Today hover CTA', rules('course-today', '.shell .questHero button.todayPrimary:hover')[0], property(todayBase, 'color')],
  ['Today V7 CTA', rules('course-today', '.shell[data-course-view=today] button.todayPrimary').find(body => body.includes('background:')), property(todayBase, 'color')],
  ['path preview CTA', rules('course-quest', '.pathPreview .primaryButton')[0], property(rules('course-quest', '.pathPreview .primaryButton')[0], 'color')],
];
for (const [name, body, foreground] of cases) test(`${name} maintains AA small-text contrast throughout its gradient`, () => assertSpan(foreground, property(body, 'background')));
for (const [selector, backdrop] of [['.helper', '.frame'], ['.rangeCaption', '.frame'], ['.footer>p', '.footer']]) {
  test(`${selector} maintains AA small-text contrast on its actual background`, () => {
    assertSpan(property(rules('course-slide-player', selector)[0], 'color'), property(rules('course-slide-player', backdrop)[0], 'background'));
  });
}

test('path preview hover retains AA contrast after its inherited brightness filter', () => {
  const hover = rules('course-quest', '.primaryButton:hover:not(:disabled)')[0];
  const filter = property(hover, 'filter');
  const amount = filter.match(/^brightness\(([.\d]+)\)$/);
  assert.ok(amount, 'Expected the inherited brightness filter');
  const preview = rules('course-quest', '.pathPreview .primaryButton')[0];
  assertSpan(property(preview, 'color'), property(preview, 'background'), Number(amount[1]));
});
