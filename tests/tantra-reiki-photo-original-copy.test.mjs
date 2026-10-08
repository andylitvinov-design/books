import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Each level prioritises its original author passage, not the editorial paraphrase", async () => {
  const [code, archived, en] = await Promise.all([
    readFile("components/tantra-reiki-journey.tsx", "utf8"),
    readFile("data/academy/tantra-reiki-full.generated.json", "utf8"),
    readFile("data/academy/tantra-reiki-ru-en.generated.json", "utf8"),
  ]);
  assert.match(code, /originalAuthorDescription\(locale, i\)\.map/);
  assert.doesNotMatch(code, /<p className="tantra-journey__description">\{copy\.intro\}<\/p>/);
  assert.match(code, /if \(locale === "es"\) return spanishAuthorDescriptions\[levelIndex\]/);
  assert.doesNotMatch(code, /tantra-journey__spanish-intro/);
  assert.match(code, /tantraReikiArchive\.blocks\.ru\[sourceIndex\]\.text/);
  assert.match(code, /originalRussianEnglishTranslation\.blocks\[sourceIndex\]\.text/);
  const source = JSON.parse(archived);
  const translated = JSON.parse(en);
  assert.equal(translated.blocks.length, source.blocks.ru.length);
  const blockMatch = code.match(/const authorStageBlockIndices = \[([\s\S]*?)\] as const;/);
  assert.ok(blockMatch);
  const indices = [...blockMatch[1].matchAll(/^  \[([^\]]+)\]/gm)].map((m) => m[1].split(",").map((n) => Number(n.trim())));
  assert.equal(indices.length, 9);
  for (const level of indices) {
    assert.ok(level.length >= 2);
    for (const index of level) {
      assert.ok(source.blocks.ru[index].text?.trim());
      assert.ok(translated.blocks[index].text?.trim());
    }
  }
});

test("Nine distinct stage images exclude old portrait and second-level image", async () => {
  const [code, page] = await Promise.all([
    readFile("components/tantra-reiki-journey.tsx", "utf8"),
    readFile("components/academy-record-page.tsx", "utf8"),
  ]);
  const begin = code.indexOf("const levelPhotos = [");
  const end = code.indexOf("] as const;", begin);
  const indices = [...code.slice(begin, end).matchAll(/tantraReikiArchive\.images\.ru\[(\d+)\]/g)].map((m) => Number(m[1]));
  assert.equal(indices.length, 9);
  assert.equal(new Set(indices).size, 9);
  assert.ok(!indices.includes(16), "old portrait must be gone");
  assert.notEqual(indices[1], 13, "level 2 photo must be replaced");
  assert.match(page, /tantraReikiFullArchive\.images\.ru\[12\]/);
  assert.match(code, /photo\.archive \?/);
  assert.match(code, /objectPosition: photo\.position/);
});

test("Original paragraphs and settings have a readable mobile editorial layout", async () => {
  const css = await readFile("app/academy.css", "utf8");
  assert.match(css, /\/\* Tantra Reiki: original author text is primary/);
  assert.match(css, /\.tantra-journey__author-text p/);
  assert.match(css, /\.tantra-journey__settings ul/);
  assert.match(css, /font-size: 17px/);
});
