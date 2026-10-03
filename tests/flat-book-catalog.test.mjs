import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const source = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('all book links funnel into one flat catalog without category filters', async () => {
  const [catalog, hub, home, spanish] = await Promise.all([
    source('components/book-catalog.tsx'),
    source('components/library-hub.tsx'),
    source('components/holistic-house-home.tsx'),
    source('components/spanish-book-showcase.tsx'),
  ]);

  assert.doesNotMatch(catalog, /getPopulatedCategories|activeCategory|catalog-filters/);
  assert.match(catalog, /filterLibraryBooks\(books, \{ query: deferredQuery \}\)/);
  assert.match(catalog, /featuredBookUrls\[locale\]/);

  assert.doesNotMatch(hub, /featuredBookUrls|library-edition/);
  assert.match(hub, /All available books and reading materials are collected in one catalog/);
  assert.match(hub, /Все доступные книги и материалы для чтения собраны в одном каталоге/);

  assert.match(home, /bookUrl: "\/en\/books"/);
  assert.match(home, /bookUrl: "\/ru\/books"/);
  assert.match(spanish, /featuredBookUrls\.en/);
});
