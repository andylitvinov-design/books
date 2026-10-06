import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { getRemedy, getRemedyDirectory } from '../data/remedies.js';
import { getSpanishRemedy, getSpanishRemedySlugs, getSpanishRemedyDirectory } from '../data/remedies-es.js';
import { books } from '../data/library.js';
const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
async function loadTs(path) { const { outputText } = ts.transpileModule(source(path), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }); return import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64')); }
test('Every public remedy has a source-matched complete Spanish translation', () => {
  const sourceSlugs = getRemedyDirectory('en').map(entry => entry.slug).sort(); const slugs = getSpanishRemedySlugs().sort(); assert.deepEqual(slugs, sourceSlugs); assert.ok(slugs.length >= 90);
  const corpus = JSON.parse(source('data/spanish-remedies.json'));
  for (const slug of slugs) {
    const original = getRemedy('en', slug), es = getSpanishRemedy(slug), row = corpus.entries[slug];
    assert.equal(es.locale, 'es'); assert.equal(es.canonical_latin_name, original.canonical_latin_name);
    assert.equal(row.sourceSha256, createHash('sha256').update(source(`content/remedies/en/${slug}.md`)).digest('hex'));
    for (const [field, translated] of Object.entries(row.fields)) {
      if (String(original[field] ?? '').trim()) assert.ok(translated.trim(), `${slug}/${field}`);
      else assert.equal(translated.trim(), '', `${slug}/${field}: empty source field stays empty`);
      assert.deepEqual(translated.match(/\d+(?:[.,:/-]\d+)*/g), original[field].match(/\d+(?:[.,:/-]\d+)*/g), `${slug}/${field}: numeric integrity`);
      assert.equal(translated.split('\n').length, original[field].split('\n').length, `${slug}/${field}: no missing lines`);
    }
    for (const key of ['primary_source_url', 'primary_image', 'source_author', 'related_slugs']) assert.equal(es[key], original[key]);
    assert.notEqual(es.description, original.description, slug);
  }
  const directory = getSpanishRemedyDirectory();
  assert.equal(directory.length, slugs.length);
  assert.equal(directory.find(entry => entry.slug === 'silicea').descriptionType, 'full-card');
  assert.equal(directory.find(entry => entry.slug === 'zincum-metallicum').descriptionType, 'source-excerpt');
  assert.equal(getSpanishRemedy('../../admin'), undefined);
});
test('All book catalog entries have real Spanish metadata without inventing Spanish editions', async () => {
  const { spanishBooks } = await loadTs('data/spanish-books.ts');
  assert.deepEqual(Object.keys(spanishBooks).sort(), books.map(book => book.id).sort());
  for (const book of books) for (const key of ['title', 'description', 'category']) assert.ok(spanishBooks[book.id][key].trim());
  const component = source('components/spanish-book-showcase.tsx'); assert.match(component, /Edición original/); assert.match(component, /target="_blank"/);
});
test('Public routes and navigation have genuine Spanish counterparts', async () => {
  const { publicCounterpart, hasSpanishCounterpart } = await loadTs('lib/public-locales.ts');
  for (const page of ['app/es/page.tsx', 'app/es/services/page.tsx', 'app/es/books/page.tsx', 'app/es/about/page.tsx', 'app/es/client/page.tsx', 'app/es/homeopathy/page.tsx', 'app/es/homeopathy/remedies/page.tsx', 'app/es/homeopathy/remedies/[slug]/page.tsx']) assert.ok(existsSync(new URL('../' + page, import.meta.url)), page);
  assert.equal(publicCounterpart('/', 'es'), '/es'); assert.equal(publicCounterpart('/es', 'en'), '/?lang=en');
  for (const suffix of ['about', 'services', 'books', 'library', 'client', 'homeopathy', 'homeopathy/remedies', 'homeopathy/remedies/aconitum']) assert.equal(publicCounterpart('/en/' + suffix, 'es'), '/es/' + suffix);
  assert.equal(hasSpanishCounterpart('/en/client/secret-selector'), false); assert.equal(hasSpanishCounterpart('/admin/videos'), false);
  for (const file of ['components/mobile-bottom-navigation.tsx', 'components/site-navigation.tsx']) { const text = source(file); assert.doesNotMatch(text, /Inicio \(EN\)|Remedios \(EN\)|Servicios \(EN\)/); }
});
test('Automatic corpus translation is labelled and does not become medical advice or raw HTML', () => {
  const page = source('app/es/homeopathy/remedies/[slug]/page.tsx'); assert.match(page, /Traducción automática/); assert.match(page, /no constituye una recomendación médica/); assert.match(page, /Abrir original en ruso/); assert.match(page, /target="_blank"/);
  assert.doesNotMatch(source('components/spanish-remedy-content.tsx'), /dangerouslySetInnerHTML/);
  assert.match(source('data/remedies.d.ts'), /Locale = "ru" \| "en"/);
  assert.doesNotMatch(source('app/sitemap.ts'), /['"]\/es\/client['"]/);
});
test('Language counterparts load on selection rather than speculative client-entry prefetch', () => {
  const navigation = source('components/site-navigation.tsx');
  assert.match(navigation, /<Link prefetch=\{false\}[^>]*href=\{counterpart\(next\)\}/);
  assert.match(navigation, /onClick=\{\(\) => selectLocale\(next\)\}/);
});


test('Spanish remedy search matches the canonical public finder interaction and labels', () => {
  const component = source('components/spanish-remedy-directory.tsx');
  assert.match(component, /remedies-search-block/);
  assert.match(component, /remedies-search-input/);
  assert.match(component, /remedies-search-results/);
  assert.match(component, /Descripción completa/);
  assert.match(component, /Descripción breve/);
  assert.match(component, /setLetter\(''\)/);
});
