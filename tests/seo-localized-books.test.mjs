import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { books } from "../data/library.js";
import { getSitemapEntries } from "../data/seo.js";
const origin = "https://holistichouse.vercel.app";
const file = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
test("localized sitemap uses existing catalog IDs, reciprocal EN RU ES pages and no truncated slugs", () => {
 const entries=getSitemapEntries(origin), byUrl=new Map(entries.map(x=>[x.url,x]));
 assert.equal(byUrl.size,entries.length);
 for(const book of books) {
   assert.ok(!byUrl.has(origin+"/books/"+book.id));
   for(const locale of ["en","ru","es"]) {
     const url=origin+"/"+locale+"/books/"+book.id, entry=byUrl.get(url);
     assert.ok(entry,url);
     assert.equal(entry.alternates.languages[locale],url);
     assert.equal(entry.alternates.languages["x-default"],origin+"/en/books/"+book.id);
   }
 }
 for(const path of ["/books/alchemy-","/ru/homeopat","/ru/homeopathy/remedies/carbo-vegetab","/en/homeopathy/remedies/aethusa-cyn"])
   assert.ok(!byUrl.has(origin+path),path);
});
test("book routes expose locale canonical and a genuine legacy 301", () => {
 assert.match(file("middleware.ts"),/NextResponse.redirect\(destination, 301\)/);
 const reader=file("app/[locale]/books/[bookId]/page.tsx");
 assert.match(reader,/generateStaticParams/);
 assert.match(reader,/x-default/);
 assert.match(reader,/revalidate = 3600/);
 assert.match(reader,/spanishBookText/);
 assert.match(reader,/se conserva en ruso/);
 assert.match(file("app/sitemap.ts"),/!pathname.startsWith\('\/books\/'\)/);
});

test("source sitemap excludes known 301 redirects without removing the canonical service", () => {
  const sitemap = file("app/sitemap.ts");
  for (const p of ["/en/services/psychohomeopathy", "/ru/services/psychohomeopathy",
      "/en/services/andy-litvinov/homeopathy-consultation", "/ru/services/andy-litvinov/homeopathy-consultation"]) {
    assert.ok(sitemap.includes("'" + p + "'"), p);
  }
  assert.match(sitemap, /knownServiceRedirects\.has\(pathname\)/);
  assert.match(sitemap, /alchemy-of-soul/);
});
test("localized book has one page-level H1 and nested manuscript H1 demoted", () => {
  const reader = file("app/[locale]/books/[bookId]/page.tsx");
  assert.match(reader, /<h1>\{display\.title\}<\/h1>/);
  assert.match(reader, /sourceHtml\.replace/);
  assert.match(reader, /h2\$1/);
});

test("legacy book paths default to English and respect explicit Russian/Spanish query language",()=>{
  const middleware=file("middleware.ts"), fallback=file("app/books/[bookId]/page.tsx");
  assert.match(middleware,/requested === 'ru' \|\| requested === 'es' \? requested : 'en'/);
  assert.match(fallback,/lang === "ru" \|\| lang === "es" \? lang : "en"/);
});

test("all book switches and fallback translation links use canonical locale routes",()=>{
 const book2=file("components/book-02-reference.tsx"), translated=file("components/translated-reader-content.jsx");
 assert.match(book2, /\/en\/books\/alchemy-homeopathy-remedies/);
 assert.match(book2, /\/ru\/books\/alchemy-homeopathy-remedies/);
 assert.ok(!book2.includes("?lang=en"));
 assert.match(translated, /href=\{russianHref\}/);
 assert.match(file("app/[locale]/books/[bookId]/page.tsx"), /russianHref=/);
});
