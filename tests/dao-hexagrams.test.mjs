import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";
import { hexagrams, getHexagram, hexagramLines, archivePhotoFor, daoAuthorHexagramNumbers } from "../data/dao-hexagrams.mjs";
const authors = JSON.parse(readFileSync(new URL("../data/dao-hexagram-author.json", import.meta.url), "utf8"));
const root = new URL("../", import.meta.url);

test("I Ching holds 64 unique numbered symbols and 64 trigram pairs", () => {
  assert.equal(hexagrams.length, 64);
  assert.deepEqual(hexagrams.map((item) => item.number), Array.from({ length: 64 }, (_, i) => i + 1));
  assert.equal(new Set(hexagrams.map((item) => item.hanzi)).size, 64);
  assert.equal(new Set(hexagrams.map((item) => item.upper + "/" + item.lower)).size, 64);
  assert.deepEqual(hexagramLines(getHexagram(1)), Array(6).fill(true));
  assert.deepEqual(hexagramLines(getHexagram(2)), Array(6).fill(false));
  assert.equal(getHexagram(0), null);
  assert.equal(getHexagram(65), null);
});

test("verified author archive is 12 complete Russian texts with source provenance", () => {
  assert.equal(authors.length, 12);
  assert.deepEqual(authors.map((item) => item.number), [...daoAuthorHexagramNumbers].sort((a, b) => a - b));
  assert.equal(new Set(authors.map((item) => item.number)).size, 12);
  authors.forEach((entry) => {
    assert.equal(entry.originalLanguage, "ru");
    assert.ok(entry.text.length > 300, "short author text " + entry.number);
    assert.ok(!entry.text.includes("<br"), "unparsed HTML");
    assert.ok(entry.source === null || /^https:\/\/t\.me\/daomagic\/\d+$/.test(entry.source), "source URL");
    assert.equal(entry.photo === null, entry.number === 57);
    if (entry.postId) assert.ok(entry.source.endsWith("/" + entry.postId));
  });
});

test("all 64 cards resolve to checked-in first-party images", () => {
  const byNumber = new Map(authors.map((item) => [item.number, item]));
  hexagrams.forEach((item) => {
    const imagePath = archivePhotoFor(item, byNumber.get(item.number)?.photo);
    assert.match(imagePath, /^\/images\/dao-hexagrams\/post_\d+\.jpg$/);
    assert.ok(existsSync(new URL("public" + imagePath, root)), imagePath);
  });
});

test("localized index and detail routes exist without private document leaks", () => {
  for (const path of [
    "app/[locale]/dao/hexagrams/page.tsx",
    "app/[locale]/dao/hexagrams/[number]/page.tsx",
    "app/es/dao/hexagrams/page.tsx",
    "app/es/dao/hexagrams/[number]/page.tsx",
  ]) assert.ok(existsSync(new URL(path, root)), path);
  assert.ok(!JSON.stringify(authors).includes("docs.google.com/document/d/"), "Private original file IDs cannot be exposed");
});
