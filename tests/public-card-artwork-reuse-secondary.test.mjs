import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const urls = JSON.parse(read("data/public-card-artwork-urls.json"));
const modules = read("data/academy/yggdrasil-module-map.ts");

test("all seven Yggdrasil module covers reuse verified prebuilt 256px media", () => {
  const source = read("components/yggdrasil-program-landing.tsx");
  assert.match(source, /cardArtworkUrl\(module\.image\)/);
  assert.match(source, /unoptimized=\{hasCardArtwork\(module\.image\)\}/);
  assert.match(source, /alt=\{module\.title\[locale\]\}/);
  for (const [, uri] of modules.matchAll(/image: "(\/academy\/reiki-yggdrasil\/source\/[^"]+)"/g)) {
    assert.match(urls.images[uri]?.thumb || "", /\/static-card-media\/[a-f0-9]{16}-w256\.webp$/);
  }
  assert.equal((modules.match(/image: "\/academy\/reiki-yggdrasil\/source\//g) || []).length, 7);
});

test("Temple Studies has prebuilt verified hero and seven-stage picture fallback", () => {
  const source = read("components/temple-studies.tsx");
  const hero = "/library/maya-mysteries/media/post-244-1.jpg";
  assert.match(urls.images[hero]?.feature || "", /\/static-card-media\/[a-f0-9]{16}-w960\.webp$/);
  assert.match(source, /cardArtworkUrl\("\/library\/maya-mysteries\/media\/post-244-1\.jpg", "feature"\)/);
  assert.match(source, /cardArtworkUrl\(stage\.image, "feature"\)/);
  assert.match(source, /unoptimized=\{hasCardArtwork\(stage\.image\)\}/);
  assert.match(source, /<TempleInitiationChooser locale=\{locale\} \/>/);
  assert.match(source, /<TempleStudiesSideNavigation/);
});

test("Spanish book cards and homeopathy guide cards retain full source with hashed catalogue cover", () => {
  const spanish = read("components/spanish-book-showcase.tsx");
  const homeopathy = read("components/book-showcase.tsx");
  const books = JSON.parse(read("data/public-card-artwork-urls.json")).books;
  assert.equal(Object.keys(books).length, 23);
  for (const source of [spanish, homeopathy]) {
    assert.match(source, /bookCoverArtworkUrl\(book\.id,/);
    assert.match(source, /hasBookCoverArtwork\(book\.id\)/);
    assert.match(source, /book\.mediaSeries/);
    assert.match(source, /book\.cover/);
  }
  assert.match(spanish, /src="\/images\/holistic-house\/books-library\.webp" \/>/);
  assert.match(spanish, /priority unoptimized src="\/images\/holistic-house\/books-library\.webp"/);
  assert.match(homeopathy, /priority=\{index < 2\}/);
});

test("source-backed registered cards do not open the optimizer, original reader routes remain untouched", () => {
  const helper = read("lib/public-card-artwork.ts");
  assert.match(helper, /return images\[source\]\?\.\[size\] \?\? source/);
  assert.match(helper, /return books\[id\] \?\? fallback/);
  assert.doesNotMatch(read("next.config.ts"), /images:\s*\{\s*unoptimized:\s*true/);
  assert.doesNotMatch(read("components/book-showcase.tsx"), /fetch\(|\/api\/admin\//);
});

test("Library and Alchemy services reuse source-pinned 256/960px artwork without paid variants", () => {
  const paths = [
    "/images/holistic-house/books-library.webp",
    "/images/holistic-house/hero-olive-incense.webp",
    "/media/remedies/arnica/message168-1.jpg",
  ];
  for (const path of paths) {
    const item = urls.images[path];
    assert.match(item?.thumb ?? "", /^\/images\/holistic-house\/static-card-media\/[a-f0-9]{16}-w256\.webp$/);
    assert.match(item?.feature ?? "", /^\/images\/holistic-house\/static-card-media\/[a-f0-9]{16}-w960\.webp$/);
  }
  assert.equal(urls.images["/images/holistic-house/distance-homeopathy.webp"], undefined, "Corrupted WebP must never enter the build image registry");
  const catalog = read("components/catalog-showcase.tsx");
  assert.match(catalog, /cardArtworkUrl\(item\.image, "feature"\)/);
  assert.match(catalog, /unoptimized=\{hasCardArtwork\(item\.image\)\}/);
  const service = read("components/core-service-detail.tsx");
  assert.match(service, /cardArtworkUrl\(t\.image, "feature"\)/);
  assert.match(service, /unoptimized=\{hasCardArtwork\(t\.image\)\}/);
  assert.match(service, /<Image/);
});
