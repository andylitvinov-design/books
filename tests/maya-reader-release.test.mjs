import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { volumes, verifyBundle, assertPage } from '../scripts/verify-maya-reader-release.mjs';

async function fixture(t, includedCount = volumes.length, empty = false) {
  const root = await mkdtemp(path.join(tmpdir(), 'maya-bundle-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const traceDir = path.join(root, '.next/server/app/books/[bookId]');
  const sourceDir = path.join(root, 'source-books/book-3-maya-tradition/outputs');
  await mkdir(traceDir, { recursive: true });
  await mkdir(sourceDir, { recursive: true });
  for (const [, name] of volumes) await writeFile(path.join(sourceDir, name), empty ? '' : '<h1>Fixture</h1>');
  await writeFile(path.join(traceDir, 'page.js.nft.json'), JSON.stringify({ version: 1, files: volumes.slice(0, includedCount).map(([, name]) => path.relative(traceDir, path.join(sourceDir, name))) }));
  return root;
}

test('actual runtime trace containing the four source files passes', async t => {
  await verifyBundle(await fixture(t));
});
test('source files in the checkout do not compensate for an incomplete server bundle', async t => {
  await assert.rejects(verifyBundle(await fixture(t, 3)), /Runtime bundle is missing/);
});
test('empty source files cannot pass a trace check', async t => {
  await assert.rejects(verifyBundle(await fixture(t, 4, true)), /Empty\/missing/);
});
test('a real localized reader passes', () => {
  assertPage('<main class="reader-shell" lang="en"><h1>Calendar</h1><article class="reader-article">Content</article></main>', '/books/maya-calendar', 'en');
});
test('Next server error HTML cannot pass even if metadata contains a heading', () => {
  assert.throws(() => assertPage('<html id="__next_error__"><h1>Calendar</h1></html>', '/books/maya-calendar', 'en'), /Server error/);
});
test('a generic page without reader content fails', () => {
  assert.throws(() => assertPage('<main lang="en"><h1>Unavailable</h1></main>', '/books/maya-calendar', 'en'), /Missing rendered reader/);
});
test('wrong-language reader fails', () => {
  assert.throws(() => assertPage('<main lang="ru"><h1>Calendar</h1><article class="reader-article">Text</article></main>', '/books/maya-calendar', 'en'), /Wrong reader language/);
});
test('hub must link to every existing reader', () => {
  const links = volumes.map(([slug]) => `<a href="/books/${slug}?lang=en">Open</a>`).join('');
  assertPage(`<h1>Maya tradition</h1>${links}`, '/books/maya-tradition', 'en');
  assert.throws(() => assertPage('<h1>Maya tradition</h1>', '/books/maya-tradition', 'en'), /Missing hub link/);
});
