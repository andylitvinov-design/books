import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('the first loading shell is a server fallback with the approved existing brand asset', () => {
  const page = read('app/loading.tsx');
  const logo = read('public/icons/holistic-house-teal.svg');
  assert.match(page, /export default function Loading\(/);
  assert.match(page, /data-hh-loading-splash/);
  assert.match(page, /role="status"/);
  assert.match(page, /aria-busy="true"/);
  assert.match(page, /src="\/icons\/holistic-house-teal\.svg"/);
  assert.match(page, /Holistic House/);
  assert.match(logo, /<svg[^>]+viewBox="0 0 192 192"/);
  assert.ok(Buffer.byteLength(logo) < 2048, 'the first-party logo must remain tiny');
  assert.doesNotMatch(page, /["']use client["']|setTimeout\(|setInterval\(|fetch\(|next\/image|useEffect|window\.|document\./);
});

test('loading disappears on route readiness, with no forced hold or inaccessible motion', () => {
  const page = read('app/loading.tsx');
  const css = read('app/loading.module.css');
  assert.match(page, /import styles from "\.\/loading\.module\.css"/);
  assert.match(css, /min-height:\s*100dvh/);
  assert.match(css, /background:\s*radial-gradient/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /animation:\s*none/);
  assert.doesNotMatch(css, /@import|url\(|position:\s*fixed|animation-delay|transition-delay/);
});
