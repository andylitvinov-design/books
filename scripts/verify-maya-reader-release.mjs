import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { books } from '../data/library.js';

export const volumes = [
  ['maya-egregor-gods', 'Maya_Aztec_Egregor_Gods.html'],
  ['maya-calendar', 'Maya_Calendar_Energies.html'],
  ['maya-exorcism', 'Maya_Exorcism_Settings_Energies.html'],
  ['maya-mysteries', 'Maya_Mysteries.html'],
];

// next start can see the whole checkout. Vercel can only see traced files.
// Checking real build output prevents a green local server hiding ENOENT in production.
export async function verifyBundle(root = process.cwd()) {
  const tracePath = path.resolve(root, '.next/server/app/books/[bookId]/page.js.nft.json');
  const trace = JSON.parse(await readFile(tracePath, 'utf8'));
  assert.ok(Array.isArray(trace.files), 'The book reader must have a server file trace');
  const included = new Set(trace.files.map(file => path.resolve(path.dirname(tracePath), file)));
  for (const [slug, name] of volumes) {
    const source = path.resolve(root, 'source-books/book-3-maya-tradition/outputs', name);
    assert.ok(included.has(source), `Runtime bundle is missing the source HTML for ${slug}`);
    const info = await stat(source);
    assert.ok(info.isFile() && info.size > 0, `Empty/missing HTML source for ${slug}`);
  }
  console.log('PASS: all four Maya HTML sources are present in the actual reader runtime trace');
}

// The eight author-restored manuals are read from disk at runtime.
// Check BOTH locale and legacy Vercel reader traces: a green build alone missed
// these documents and caused ENOENT / HTTP 500 in production.
export const ancientVolumeIds = Object.freeze([
  'egypt-osiris-temple-magic', 'egypt-maat-isis-attunements',
  'greek-temple-attunements', 'greek-metaphysics-planning',
  'greek-dionysus-asclepius-course', 'roman-imperial-temples',
  'zoroastrian-tradition-notes', 'mithra-mysteries',
]);

export async function verifyAncientReaderBundles(root = process.cwd()) {
  const archived = ancientVolumeIds.map(id => {
    const book = books.find(item => item.id === id);
    assert.ok(book && book.status === 'published', 'Missing published original ' + id);
    return book;
  });
  const tracePaths = [
    '.next/server/app/books/[bookId]/page.js.nft.json',
    '.next/server/app/[locale]/books/[bookId]/page.js.nft.json',
  ];
  for (const relativeTrace of tracePaths) {
    const tracePath = path.resolve(root, relativeTrace);
    const trace = JSON.parse(await readFile(tracePath, 'utf8'));
    assert.ok(Array.isArray(trace.files), 'Missing runtime trace in ' + relativeTrace);
    const files = new Set(trace.files.map(item => path.resolve(path.dirname(tracePath), item)));
    for (const book of archived) {
      const source = path.resolve(root, book.originalSourceFile);
      assert.ok(files.has(source),
        'Vercel ' + relativeTrace + ' is missing ' + book.id + ': ' + book.originalSourceFile);
      const file = await stat(source);
      assert.ok(file.isFile() && file.size > 2500, 'Invalid original HTML: ' + book.id);
    }
  }
  console.log('PASS: eight ancient manuals are included in BOTH real Vercel book reader traces');
}

export function assertPage(html, pathname, locale) {
  assert.ok(!/id=["']__next_error__["']/.test(html), `Server error document at ${pathname}`);
  assert.match(html, /<h1\b[^>]*>[^<]+/i, `Missing page heading at ${pathname}`);
  if (pathname === '/books/maya-tradition') {
    for (const [slug] of volumes) assert.ok(html.includes(`/en/books/${slug}`), `Missing hub link for ${slug}`);
  } else {
    assert.match(html, /<article\b[^>]*class=["'][^"']*\breader-article\b/i, `Missing rendered reader at ${pathname}`);
    assert.ok(new RegExp(`<main\\b[^>]*lang=["']${locale}["']`).test(html), `Wrong reader language at ${pathname}`);
  }
}

export async function verifyLive(origin = 'https://holistichouse.vercel.app') {
  const base = new URL(origin);
  assert.equal(base.protocol, 'https:', 'Hosted verification requires HTTPS');
  const routes = [
    ['/books/maya-tradition', 'en'],
    ...volumes.flatMap(([slug]) => [[`/en/books/${slug}`, 'en'], [`/ru/books/${slug}`, 'ru']]),
  ];
  // GitHub can finish its build before Vercel starts its queued production build.
  // Allow a bounded two-minute alias-settling window without accepting any failed route.
  const maxAttempts = 12;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const failures = [];
    for (const [route, locale] of routes) {
      try {
        const response = await fetch(new URL(route, base), { cache: 'no-store', signal: AbortSignal.timeout(20000) });
        assert.equal(response.status, 200, `HTTP ${response.status}`);
        const resolved = new URL(response.url);
        assert.equal(resolved.origin, base.origin, 'Unexpected external redirect');
        assert.equal(resolved.pathname, new URL(route, base).pathname, 'Unexpected route redirect');
        assertPage(await response.text(), resolved.pathname, locale);
        console.log(`PASS ${route}`);
      } catch (error) {
        failures.push(`${route}: ${error.message}`);
      }
    }
    if (!failures.length) { console.log('PASS: Maya hub and all four EN/RU readers (9 routes)'); return; }
    if (attempt === maxAttempts) throw new Error(failures.join('\n'));
    console.log(`Alias settling: retry ${attempt}; ${failures.length} route(s) not ready`);
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  assert.ok(args.length === 0 || (args.length === 1 && args[0] === '--live'), 'Use no arguments for the build trace or --live for production');
  if (args[0] === '--live') await verifyLive();
  else { await verifyBundle(); await verifyAncientReaderBundles(); }
}
