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

test("all 23 original public book covers retain versioned WebP outputs and verified source hashes", () => {
  const originalBooks = books.filter(book => ["alchemy", "dao", "maya"].includes(book.mediaSeries));
  assert.equal(originalBooks.length, 23);
  assert.equal(Object.keys(registry.books).length, 23);
  for (const book of originalBooks) {
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

test("the eight additional manuals use only reviewed local SVG covers, never a billed runtime image transform", () => {
  const restored = books.filter(book => !["alchemy", "dao", "maya"].includes(book.mediaSeries));
  assert.equal(restored.length, 8);
  assert.deepEqual(
    Object.fromEntries(["egypt", "greek", "roman", "zoroastrian"].map(series => [
      series, restored.filter(book => book.mediaSeries === series).length,
    ])),
    { egypt: 2, greek: 3, roman: 1, zoroastrian: 2 },
  );
  for (const book of restored) {
    assert.ok(!Object.prototype.hasOwnProperty.call(registry.books, book.id));
    assert.equal(book.cover, "cover.svg");
    assert.match(book.mediaSeries, /^(egypt|greek|roman|zoroastrian)$/);
    const svg = read("public/media/" + book.mediaSeries + "/" + book.cover);
    assert.ok(svg.length > 50 && Buffer.byteLength(svg, "utf8") < 6000);
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="600" height="800"/);
    assert.doesNotMatch(svg, /<(?:script|foreignObject|image|iframe|style|use|animate|set)\b|\bon\w+\s*=|\b(?:href|src)\s*=|url\s*\(|<!doctype|<\?xml-stylesheet/i);
  }
  for (const file of [
    "components/book-catalog.tsx",
    "components/book-category-picker.tsx",
    "components/book-showcase.tsx",
    "components/spanish-book-showcase.tsx",
  ]) {
    const component = read(file);
    const variable = file.includes("category-picker") ? "cover" : "book";
    const bypass = "unoptimized={hasBookCoverArtwork(" + variable + ".id) || " + variable + ".cover.endsWith('.svg')}";
    assert.ok(component.includes(bypass), "Static SVG / source-backed card bypass required in " + file);
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
  assert.ok(catalog.includes("unoptimized={hasBookCoverArtwork(book.id) || book.cover.endsWith('.svg')}"));
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
  const pinnedGenerator = "node scripts/build-public-card-artwork.mjs";
  for (const phase of ["prebuild", "predev"]) {
    const commands = config.scripts[phase].split(" && ").map(command => command.trim());
    assert.equal(commands.filter(command => command === pinnedGenerator).length, 1,
      phase + " must generate exactly one set of reviewed hashed artwork");
  }
  assert.equal(config.scripts["build:static-artwork"], pinnedGenerator,
    "fast image acceptance must use the same pinned, full WebP generator as Next prebuild");
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

test("image-only QA generates and decodes all 85 pinned WebP while Core owns production PR Next build", () => {
  const workflow = read(".github/workflows/hh-static-image-cost-guard.yml");
  const core = read(".github/workflows/hh-pr-core-release.yml");
  const fast = "if: ${{ github.event_name == 'pull_request' && github.event.pull_request.base.ref == 'codex/public-book-library' }}";
  const outside = "if: ${{ github.event_name != 'pull_request' || github.event.pull_request.base.ref != 'codex/public-book-library' }}";
  assert.ok(workflow.includes('- name: Regenerate all content-pinned WebP on production PR\n        '+fast+'\n        run: npm run build:static-artwork'));
  assert.ok(workflow.includes('- name: Build real Next.js app with prebuilt static WebP\n        '+outside+'\n        run: npm run build'));
  assert.ok(workflow.includes('- name: Typecheck\n        '+outside+'\n        run: npx --no-install tsc --noEmit'));
  assert.match(workflow, /^  push:/m);
  assert.match(workflow, /^  workflow_dispatch:/m);
  assert.match(workflow, /node --test tests\/public-card-artwork-generated\.test\.mjs/);
  assert.match(workflow, /node --test tests\/public-card-artwork-cost-guard\.test\.mjs tests\/public-card-artwork-reuse-secondary\.test\.mjs/);
  assert.match(core, /^  hh-specialist:/m);
  // Unified protected gate replaces the obsolete release-ready wrapper.
  // The unified Scope job owns Core checks; the aggregate consumes Scope and Specialist results.
  assert.match(core, /^  hh-merge-check:\n    name: hh-merge-check\n    needs: \[scope, hh-specialist\]/m);
  // Draft PR must not get a fabricated red status. Ready PRs must still
  // pass the real Core+Specialist check before GitHub may merge.
  assert.match(core.split(/^  hh-merge-check:/m)[1],
    /^    if: \$\{\{ !cancelled\(\) && \(github\.event_name != 'pull_request' \|\| github\.event\.pull_request\.draft == false\) \}\}$/m);
  assert.match(core, /- name: Require real Core and specialist results from this workflow/);
  assert.match(core, /\[\[ "\$EVENT_NAME" == pull_request \]\]/);
  assert.match(core, /\[\[ "\$SCOPE_RESULT" == success && "\$SPECIALIST_RESULT" == success \]\]/);
  assert.match(core, /name: core-lint-types-build/);
  assert.match(core, /SCOPE_RESULT: \$\{\{ needs\.scope\.result \}\}/);
  assert.match(core, /ROUTE: \$\{\{ needs\.scope\.outputs\.route \}\}/);
  assert.match(core, /\[\[ "\$SCOPE_RESULT" == success && "\$SPECIALIST_RESULT" == success \]\]/);
  assert.doesNotMatch(core, /^  code:/m);
  assert.doesNotMatch(core, /CODE_RESULT|needs\.code/);
  assert.doesNotMatch(core, /^  release-ready:/m);
  assert.match(core, /run: npm run build/);
  assert.doesNotMatch(workflow, /continue-on-error:\s*true/);
});
