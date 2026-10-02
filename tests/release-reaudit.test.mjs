import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const read = path => readFileSync(path, 'utf8');
test('language disclosure handles escape, outside focus and selected locale with cleanup', () => {
  const nav = read('components/site-navigation.tsx');
  for (const type of ['pointerdown', 'focusin', 'keydown']) {
    assert.ok(nav.includes(`addEventListener("${type}"`));
    assert.ok(nav.includes(`removeEventListener("${type}"`));
  }
  assert.match(nav, /event\.key !== "Escape"/);
  assert.match(nav, /querySelector<HTMLElement>\("summary"\)\?\.focus/);
  assert.match(nav, /if \(menuRef\.current\) menuRef\.current\.open = false/);
});
test('Maya hub changes its actual locale and reader destinations, not just the menu label', () => {
  const hub = read('app/books/maya-tradition/page.tsx');
  assert.match(hub, /localizedBookText\(volume, locale\)/);
  assert.match(hub, /lang=\$\{locale\}/);
  assert.match(hub, /generateMetadata/);
  assert.match(read('components/site-navigation.tsx'), /pathname === "\/books\/maya-tradition"/);
});
test('optional translation never blanks the source and can be cancelled and retried', () => {
  const reader = read('components/translated-reader-content.jsx');
  assert.match(reader, /useState\(html\)/);
  assert.doesNotMatch(reader, /setContent\(''\)/);
  assert.match(reader, /controller\.abort\(\)/);
  assert.match(reader, /translations\.length !== texts\.length/);
  assert.match(reader, /clearTimeout\(timeout\)/);
  assert.match(reader, /Retry English translation/);
  assert.match(reader, /lang=\{translated \? 'en' : 'ru'\}/);
});
test('consultation cannot fall back to a GET containing personal fields before hydration', () => {
  const form = read('components/personal-consultation-form.tsx');
  assert.match(form, /method="post"/);
  assert.match(form, /disabled=\{!interactive\}/);
  assert.match(form, /useState\(false\)/);
  assert.match(form, /event\.preventDefault\(\)/);
  assert.match(form, /setCustomValidity/);
  assert.match(form, /personal-consultation-form__resume/);
  assert.match(form, /not sent/);
});

// Exercise the real network-validation function without React, source rewriting or any external request.
const readerSource = read('components/translated-reader-content.jsx');
const batchSource = readerSource.slice(readerSource.indexOf('async function translateBatch('), readerSource.indexOf('export function TranslatedReaderContent'));
const { translateBatch } = await import('data:text/javascript,' + encodeURIComponent(batchSource + '\nexport { translateBatch };'));
test('translation rejects an incomplete response without losing positional correspondence', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ translations: [] }) }));
  await assert.rejects(translateBatch(['source'], new AbortController().signal), /Invalid translation response/);
});
test('translation rejects non-text response entries', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ translations: [null] }) }));
  await assert.rejects(translateBatch(['source'], new AbortController().signal), /Invalid translation response/);
});
test('translation preserves valid response order', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ translations: ['First', 'Second'] }) }));
  assert.deepEqual(await translateBatch(['one', 'two'], new AbortController().signal), ['First', 'Second']);
});
test('unmount cancellation aborts the real in-flight translation request', async t => {
  let requestSignal;
  t.mock.method(globalThis, 'fetch', (_url, options) => new Promise((_, reject) => {
    requestSignal = options.signal;
    options.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }));
  const controller = new AbortController();
  const pending = translateBatch(['source'], controller.signal);
  controller.abort();
  await assert.rejects(pending, /aborted/);
  assert.equal(requestSignal.aborted, true);
});
test('editing a prepared consultation invalidates the old handoff link', () => {
  assert.match(read('components/personal-consultation-form.tsx'), /onInput=\{\(\) => \{ if \(preparedUrl\) setPreparedUrl\(""\); \}\}/);
});
