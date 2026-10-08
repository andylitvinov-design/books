import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const layout = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/public-wide-layout.css', import.meta.url), 'utf8');

test('shared public wide layout is imported after page-specific styles', () => {
  assert.match(layout, /import "\.\/public-wide-layout\.css";/);
  assert.ok(layout.indexOf('public-wide-layout.css') > layout.indexOf('sitewide-capture.css'));
});

test('desktop public route shells share a fluid canvas', () => {
  for (const shell of [
    'library-shell', 'catalog-shell', 'reader-shell', 'book-reference-shell',
    'homeopathy-shell', 'services-shell', 'about-shell', 'academy-reading-shell',
    'client-entry-shell', 'cabinet-landing-shell', 'shared-report-shell',
  ]) {
    assert.ok(css.includes('.' + shell), 'missing ' + shell);
  }
  assert.match(css, /max-width:\s*none;/);
  assert.match(css, /padding-inline:\s*var\(--hh-wide-page-gutter\)/);
  assert.match(css, /min-width:\s*768px/);
  assert.match(css, /min-width:\s*1024px/);
});

test('sidebar courses expand while preserving mobile and long-form reading layouts', () => {
  assert.match(css, /\.academy-reading-shell--wide \.academy-course-layout/);
  assert.match(css, /\.temple-inner/);
  assert.doesNotMatch(css, /(?:^|\n)\s*\.academy-reading\s*\{/);
  assert.doesNotMatch(css, /body\s*\{/);
});
