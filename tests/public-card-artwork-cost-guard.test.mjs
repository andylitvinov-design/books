import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import { books } from "../data/library.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const registry = JSON.parse(read("data/public-card-artwork.json"));
const entries = [...Object.values(registry.books), ...Object.values(registry.images)];

const browserUrls = JSON.parse(read("data/public-card-artwork-urls.json"));

test("browser-only artwork URL map matches pinned source manifest without leaking heavy source metadata", () => {
  assert.deepEqual(browserUrls.books,
    Object.fromEntries(Object.entries(registry.books).map(([key, value]) => [key, value.url])));
  assert.deepEqual(browserUrls.images,
    Object.fromEntries(Object.entries(registry.images).map(([key, value]) => [
      key, { thumb: value.thumb, feature: value.feature },
    ])));
  assert.ok(JSON.stringify(browserUrls).length < JSON.stringify(registry).length * 0.6);
  const helper = read("lib/public-card-artwork.ts");
  assert.match(helper, /public-card-artwork-urls\.json/);
  assert.doesNotMatch(helper, /import registry from "@\/data\/public-card-artwork\.json"/);
});

const sourceGitHash = source => {
  const bytes = readFileSync(new URL("../" + source, import.meta.url));
  return {
    hash: createHash("sha1").update("blob " + bytes.length + "\0").update(bytes).digest("hex"),
    bytes: bytes.length,
  };
};

test("all 23 published book covers have versioned public WebP outputs and unchanged source files", () => {
  assert.equal(Object.keys(registry.books).length, 23);
  for (const book of books) {
    const item = registry.books[book.id];
    assert.ok(item, "Missing generated cover for " + book.id);
    const folder = {
      alchemy: "source-books/book-1-alchemy-soul/media/",
      dao: "source-books/book-2-dao-books/photos/",
      maya: "source-books/book-3-maya-tradition/raw/photos/",
    }[book.mediaSeries];
    assert.equal(item.source, folder + book.cover);
    assert.match(item.url, /^\/images\/holistic-house\/static-card-media\/[a-f0-9]{16}-w720\.webp$/);
    assert.ok(item.url.includes(item.sha.slice(0, 16)));
    assert.deepEqual(sourceGitHash(item.source), { hash: item.sha, bytes: item.bytes });
  }
});

test("all 28 public academy and poster sources are pinned to original bytes and two responsive variants", () => {
  assert.equal(Object.keys(registry.images).length, 28);
  assert.equal(entries.length, 51);
  for (const [key, item] of Object.entries(registry.images)) {
    assert.ok(key.startsWith("/academy/") || key.startsWith("/images/holistic-house/") || key.startsWith("/library/"));
    assert.equal(item.source, "public" + key);
    assert.deepEqual(sourceGitHash(item.source), { hash: item.sha, bytes: item.bytes });
    for (const [name, width] of [["thumb", 256], ["feature", 960]]) {
      assert.equal(item[name], "/images/holistic-house/static-card-media/" + item.sha.slice(0, 16) + "-w" + width + ".webp");
    }
  }
});

test("card delivery bypasses runtime transforms without disabling book reader optimization", () => {
  const next = read("next.config.ts");
  assert.match(next, /source: "\/images\/holistic-house\/static-card-media\/:path\*"/);
  assert.match(next, /max-age=31536000, immutable/);
  assert.doesNotMatch(next, /images:\s*\{\s*unoptimized:\s*true/);
  assert.match(next, /minimumCacheTTL: 2678400/);
  const catalog = read("components/book-catalog.tsx");
  assert.match(catalog, /bookCoverArtworkUrl\(book\.id,/);
  assert.match(catalog, /unoptimized=\{hasBookCoverArtwork\(book\.id\)\}/);
  assert.match(read("components/catalog-showcase.tsx"), /cardArtworkUrl\(item\.image, "feature"\)/);
  assert.match(read("components/sitewide-antistress-banner.tsx"), /cardArtworkUrl\("\/images\/holistic-house\/course-focus-mountain-boy\.webp"\)/);
  const generator = read("scripts/build-public-card-artwork.mjs");
  assert.match(generator, /sharp\(original/);
  assert.match(generator, /Sha|sha/);
  assert.match(generator, /fileHashes\.size/);
  const config = JSON.parse(read("package.json"));
  assert.equal(config.scripts.prebuild, "node scripts/build-public-card-artwork.mjs");
  assert.equal(config.scripts.predev, "node scripts/build-public-card-artwork.mjs");
  assert.match(config.scripts["test:app"], /tests\/public-card-artwork-cost-guard\.test\.mjs/);
});

test("source registry does not include private or user-uploaded client material", () => {
  for (const item of entries) {
    assert.doesNotMatch(item.source, /(?:private|client|prescription|session|upload|admin)/i);
    assert.ok(item.bytes > 0 && item.bytes < 2_000_000, "Large image requires separate audit");
  }
});
