import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const source = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('Books stay one flat searchable catalog without mandatory series folders', async () => {
  const [catalog, hub, page, home, carousel, spanish] = await Promise.all([
    source('components/book-catalog.tsx'),
    source('components/library-hub.tsx'),
    source('app/[locale]/books/page.tsx'),
    source('components/holistic-house-home.tsx'),
    source('components/home-section-carousel.tsx'),
    source('components/spanish-book-showcase.tsx'),
  ]);

  assert.doesNotMatch(catalog, /getPopulatedCategories|activeCategory|catalog-filters|BookSectionKey/);
  assert.match(catalog, /filterLibraryBooks\(books, \{ query: deferredQuery \}\)/);
  assert.match(catalog, /recommendedReadingPath/);
  assert.match(catalog, /materialRoleLabel/);
  assert.match(catalog, /featuredBookUrls\[locale\]/);

  assert.doesNotMatch(page, /parseBookSection|searchParams|section=/);
  assert.match(page, /<BookCatalog/);

  assert.doesNotMatch(hub, /section=\$\{section\}|bookSectionTitles|bookSectionLeads/);
  assert.match(hub, /\/books/);
  assert.match(hub, /\/homeopathy\/remedies/);
  assert.match(hub, /\/wu-xing/);
  assert.match(hub, /LibraryFeed/);

  // The public Ideas entry now lives on the homepage's six-section carousel.
  // The separately preserved /library path is verified through LibraryHub above.
  assert.match(home, /<HomeSectionCarousel locale=\{locale\}/);
  assert.match(carousel, /key: "ideas", href: "\/books"/);
  assert.match(carousel, /action: "Explore Ideas"/);
  assert.match(carousel, /action: "Открыть Идеи"/);
  assert.match(spanish, /featuredBookUrls\.en/);
});
