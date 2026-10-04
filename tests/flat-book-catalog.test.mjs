import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const source = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('direct book links keep the flat catalog while Library can open a selected collection', async () => {
  const [catalog, hub, home, spanish] = await Promise.all([
    source('components/book-catalog.tsx'),
    source('components/library-hub.tsx'),
    source('components/holistic-house-home.tsx'),
    source('components/spanish-book-showcase.tsx'),
  ]);

  assert.doesNotMatch(catalog, /getPopulatedCategories|activeCategory|catalog-filters/);
  assert.match(catalog, /section \? books\.filter\(\(book\) => book\.mediaSeries === section\) : books/);
  assert.match(catalog, /filterLibraryBooks\(sectionBooks, \{ query: deferredQuery \}\)/);
  assert.match(catalog, /featuredBookUrls\[locale\]/);

  assert.doesNotMatch(hub, /featuredBookUrls|library-edition/);
  assert.match(hub, /section=\$\{section\}/);
  assert.match(hub, /library-index-card/);
  assert.match(hub, /view=videos/);

  assert.match(home, /bookUrl: "\/en\/books"/);
  assert.match(home, /bookUrl: "\/ru\/books"/);
  assert.match(spanish, /featuredBookUrls\.en/);
});
