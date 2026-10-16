import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getSitemapEntries } from "../data/seo.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("redirected legacy books index is not submitted for indexing", () => {
  const entries = getSitemapEntries("https://example.test");
  assert.ok(!entries.some(entry => entry.url === "https://example.test/books"));
  assert.ok(entries.some(entry => entry.url === "https://example.test/books/alchemy-homeopathy-foundations"));
});

test("Spanish homepage preserves one H1, free tools, testimonials and consistent author name", () => {
  const home = read("app/es/page.tsx");
  assert.equal((home.match(/<h1\b/g) || []).length, 1);
  assert.match(home, /Andrey Litvinov/);
  assert.doesNotMatch(home, /Andrii Litvinov/);
  for (const path of ["/es/client/tests", "/es/academy", "/es/library", "/es/about"]) {
    assert.ok(home.includes(path), path);
  }
  assert.match(home, /Testimonios reales/);
});

test("every sitemap entry is given stable lastModified and only existing peers become alternates", () => {
  const sitemap = read("app/sitemap.ts");
  assert.match(sitemap, /lastModified: entry.lastModified \?\? releaseDate/);
  assert.match(sitemap, /available\.has\(url\)/);
  assert.match(sitemap, /all\.delete\(base \+ '\/books'\)/);
  assert.match(sitemap, /'\/en\/books', '\/ru\/books'/);
  assert.match(sitemap, /'x-default'/);
});

test("remedy and book descriptions use complete localized metadata and social preview cards", () => {
  const helper = read("lib/public-seo-description.ts");
  assert.match(helper, /length <= 160/);
  assert.match(helper, /bookFallback\[locale\]/);
  for (const page of [
    "app/[locale]/homeopathy/remedies/[slug]/page.tsx",
    "app/es/homeopathy/remedies/[slug]/page.tsx",
  ]) {
    const source = read(page);
    assert.match(source, /remedySeoDescription/);
    assert.doesNotMatch(source, /description\.slice\(0,\s*155\)/);
  }
  const book = read("app/books/[bookId]/page.tsx");
  assert.match(book, /bookSeoDescription/);
  assert.match(book, /twitter:/);
});

test("404 screens are localized with navigation and noindex", () => {
  const ui = read("components/public-not-found.tsx");
  assert.match(ui, /Страница не найдена/);
  assert.match(ui, /Página no encontrada/);
  assert.match(ui, /Page not found/);
  for (const path of ["app/not-found.tsx", "app/[locale]/not-found.tsx", "app/es/not-found.tsx"]) {
    const source = read(path);
    assert.match(source, /index: false/);
  }
});
