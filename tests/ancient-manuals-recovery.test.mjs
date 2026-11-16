import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { books, searchBooks } from '../data/library.js';
import { normalizeSourceHtml } from '../data/source-parser.js';

const restoredIds = [
  "egypt-osiris-temple-magic",
  "egypt-maat-isis-attunements",
  "greek-temple-attunements",
  "greek-metaphysics-planning",
  "greek-dionysus-asclepius-course",
  "roman-imperial-temples",
  "zoroastrian-tradition-notes",
  "mithra-mysteries"
];

test('eight ancient tradition manuals extend 23 stable canonical books', () => {
  const ids=books.map(b=>b.id);
  assert.equal(ids.length,31);
  assert.deepEqual(ids.slice(-8),restoredIds);
  assert.equal(new Set(ids).size,ids.length);
  assert.ok(searchBooks('Осирис').some(b=>b.id==='egypt-osiris-temple-magic'));
});
test('each source preserves text, sections and original-document provenance', () => {
  for(const id of restoredIds){
    const book=books.find(b=>b.id===id);
    assert.ok(book && book.status==='published');
    assert.ok(existsSync(book.originalSourceFile),'Missing '+id);
    const html=readFileSync(book.originalSourceFile,'utf8');
    assert.ok(html.length>2500,id+' truncated');
    assert.match(html,/docs\.google\.com|drive\.google\.com/);
    assert.match(html,/Фото пока доступны в оригинальных документах/);
    const safe=normalizeSourceHtml(html,book.mediaSeries,book.id);
    assert.match(safe,/<h2/);
    assert.doesNotMatch(safe,/<script|<iframe|onerror=|javascript:/i);
    for(const chapter of book.chapters)assert.ok(safe.includes('id="'+chapter.id+'"'),'Missing chapter '+id+':'+chapter.id);
    assert.ok(existsSync('public/media/'+book.mediaSeries+'/'+book.cover));
  }
});
test('previous published Alchemy, Dao and Maya books are not duplicated', () => {
  assert.equal(books.filter(b=>b.mediaSeries==='alchemy').length,9);
  assert.equal(books.filter(b=>b.mediaSeries==='dao').length,10);
  assert.equal(books.filter(b=>b.mediaSeries==='maya').length,4);
});

test('published ancient manuals are traced into both locale and legacy book reader functions', () => {
  // A green build can still produce HTTP 500 on Vercel if dynamically read
  // manuscripts are missing from the server function filesystem (ENOENT).
  const nextConfig = readFileSync(new URL('../next.config.ts', import.meta.url), 'utf8');
  assert.match(nextConfig, /\.\.\.\["\/books\/\*", "\/\[locale\]\/books\/\*"\]\.map\(/,
    'Keep both canonical and legacy book reader route globs');
  let totalBytes = 0;
  for (const id of restoredIds) {
    const book = books.find(entry => entry.id === id);
    const source = book.originalSourceFile;
    assert.match(source, /^source-books\/book-[4-7]-[^/]+\/[a-z0-9_]+\.html$/);
    const directory = source.slice(0, source.lastIndexOf('/'));
    const glob = './' + directory + '/*.html';
    assert.ok(nextConfig.includes(JSON.stringify(glob)),
      'Vercel runtime trace missing ' + glob + ' for ' + id);
    totalBytes += readFileSync(source).byteLength;
  }
  assert.ok(totalBytes > 100_000 && totalBytes < 1_000_000,
    'Trace only the eight small public HTML manuals; no huge image/archive directories');
  const verifier = readFileSync(new URL('../scripts/verify-maya-reader-release.mjs', import.meta.url), 'utf8');
  assert.match(verifier, /export async function verifyAncientReaderBundles/);
  assert.ok(verifier.includes('.next/server/app/[locale]/books/[bookId]/page.js.nft.json'), 'Check localized book reader trace');
  assert.doesNotMatch(nextConfig, /"\.\/source-books\/\*\*\/\*"/,
    'Never copy the entire source archive into every Vercel function');
});
