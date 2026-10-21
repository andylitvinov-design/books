import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { books, filterLibraryBooks } from '../data/library.js';

const source = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('Ideas shows three book categories before listing individual books', async () => {
  const [catalog, picker, css, sections, spanish] = await Promise.all([
    source('components/book-catalog.tsx'),
    source('components/book-category-picker.tsx'),
    source('components/book-category-picker.module.css'),
    source('data/library-sections.ts'),
    source('components/spanish-book-showcase.tsx'),
  ]);
  assert.match(catalog, /useState<BookSectionKey \| null>\(null\)/);
  assert.match(catalog, /<BookCategoryPicker[\s\S]*?activeCategory=\{activeCategory\}/);
  assert.match(catalog, /const showCatalog = Boolean\(activeCategory \|\| normalizedQuery\)/);
  assert.match(catalog, /showCatalog && \(hasResults/);
  assert.match(catalog, /filterLibraryBooks\(books, \{ query: deferredQuery \}\)/);
  assert.match(catalog, /matches\.filter\(book => book\.mediaSeries === activeCategory\)/);
  assert.match(catalog, /featuredBookUrls\[locale\]/);
  assert.match(picker, /bookSectionKeys\.map/);
  assert.match(picker, /bookSectionTitles\[locale\]\[category\]/);
  assert.match(picker, /aria-pressed=\{activeCategory === category\}/);
  assert.match(picker, /data-book-category=\{category\}/);
  assert.match(picker, /onSelect\(activeCategory === category \? null : category\)/);
  assert.match(picker, /role="status"/);
  assert.match(picker, /locale: PublicLocale/);
  assert.match(sections, /"alchemy", "dao", "maya"/);
  assert.match(spanish, /<BookCategoryPicker books=\{books\} locale="es"/);
  assert.match(spanish, /visibleBooks = activeCategory \? books\.filter/);
  assert.match(spanish, /\{activeCategory \? \(/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /min-height: 78px/);
  assert.match(css, /:focus-visible/);
});

test('all books belong to one restored category and original search still works', () => {
  const collections = ['alchemy', 'dao', 'maya'];
  for (const collection of collections) {
    assert.ok(books.some(book => book.mediaSeries === collection), collection);
  }
  assert.equal(books.filter(book => collections.includes(book.mediaSeries)).length, books.length);
  assert.equal(books.filter(book => book.mediaSeries === 'alchemy').length, 9);
  assert.equal(books.filter(book => book.mediaSeries === 'dao').length, 10);
  assert.equal(books.filter(book => book.mediaSeries === 'maya').length, 4);
  assert.ok(filterLibraryBooks(books, { query: 'ритуал' }).length > 0);
});

test('Ideas, its book readers and Library navigation remain available', async () => {
  const [page, hub, home, carousel] = await Promise.all([
    source('app/[locale]/books/page.tsx'),
    source('components/library-hub.tsx'),
    source('components/holistic-house-home.tsx'),
    source('components/home-section-carousel.tsx'),
  ]);
  assert.match(page, /<BookCatalog/);
  assert.match(hub, /\/books/);
  assert.match(hub, /\/homeopathy\/remedies/);
  assert.match(hub, /\/wu-xing/);
  assert.match(home, /<HomeSectionCarousel locale=\{locale\}/);
  assert.match(carousel, /key: "ideas", href: "\/books"/);
});
