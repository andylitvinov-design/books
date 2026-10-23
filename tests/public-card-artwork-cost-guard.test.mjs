import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import { books } from "../data/library.js";

const validArtworkGenerationChain = command => {
    const commands = command.split("&&").map(part => part.trim());
    return commands.every(part => /^node scripts\/[a-z0-9-]+\.mjs$/.test(part))
      && commands.filter(part => part === "node scripts/build-public-card-artwork.mjs").length === 1;
  };

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

test("all 31 reviewed public academy, Library and poster sources are pinned with two variants", () => {
  assert.equal(Object.keys(registry.images).length, 31);
  assert.equal(entries.length, 54);
  for (const [key, item] of Object.entries(registry.images)) {
    assert.ok(key.startsWith("/academy/") || key.startsWith("/images/holistic-house/") || key.startsWith("/library/") || key === "/media/remedies/arnica/message168-1.jpg");
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
  assert.match(generator, /Invalid pinned static artwork source/);
  assert.match(generator, /item\.source/);
  assert.match(generator, /\{ cause \}/);
  assert.match(generator, /Sha|sha/);
  assert.match(generator, /fileHashes\.size/);
  const config = JSON.parse(read("package.json"));
  for (const phase of ["prebuild", "predev"]) {
    assert.equal(validArtworkGenerationChain(config.scripts[phase]), true, phase + " must generate pinned artwork exactly once and fail closed");
  }
  assert.match(config.scripts["test:app"], /tests\/public-card-artwork-cost-guard\.test\.mjs/);
});

test("source registry does not include private or user-uploaded client material", () => {
  for (const item of entries) {
    assert.doesNotMatch(item.source, /(?:private|client|prescription|session|upload|admin)/i);
    assert.ok(item.bytes > 0 && item.bytes < 2_000_000, "Large image requires separate audit");
  }
});

test("every pinned WebP source has a complete declared RIFF body before build-time transcoding", () => {
  for (const item of entries.filter(entry => entry.source.toLowerCase().endsWith(".webp"))) {
    const bytes = readFileSync(new URL("../" + item.source, import.meta.url));
    assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF", item.source);
    assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP", item.source);
    assert.equal(bytes.readUInt32LE(4) + 8, bytes.length, "Incomplete WebP source: " + item.source);
  }
});


// A generation chain must not swallow errors via shell fallback or execute extra shell syntax.
test("artwork generation chain rejects missing/duplicate generators and shell failure swallowing", () => {
  const generator = "node scripts/build-public-card-artwork.mjs";
  assert.equal(validArtworkGenerationChain("node scripts/generate-soft-ocean-melody.mjs && " + generator), true);
  for (const command of [generator + " && node scripts/build-other.mjs || true", generator + "; true", generator + " && " + generator, "node scripts/build-other.mjs"]) {
    assert.equal(validArtworkGenerationChain(command), false, command);
  }
});
