import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Tantra Reiki retains a complete 1:1 English translation of every Russian source block", async () => {
  const [sourceText, translatedText] = await Promise.all([
    readFile("data/academy/tantra-reiki-full.generated.json", "utf8"),
    readFile("data/academy/tantra-reiki-ru-en.generated.json", "utf8"),
  ]);
  const source = JSON.parse(sourceText);
  const translated = JSON.parse(translatedText);
  assert.equal(translated.sourceLocale, "ru");
  assert.equal(translated.targetLocale, "en");
  assert.equal(translated.sourceUrl, source.sourceUrls.ru);
  assert.equal(translated.blocks.length, source.blocks.ru.length);
  assert.equal(translated.blocks.length, 190);
  source.blocks.ru.forEach((block, index) => {
    assert.equal(translated.blocks[index].sourceIndex, index, "source order changed at " + index);
    assert.equal(translated.blocks[index].type, block.type, "block type changed at " + index);
    assert.ok(translated.blocks[index].text.trim().length, "missing translation at " + index);
  });
});

test("Original author descriptions are displayed in all 9 level chapters with EN translation", async () => {
  const [journey, page] = await Promise.all([
    readFile("components/tantra-reiki-journey.tsx", "utf8"),
    readFile("components/academy-record-page.tsx", "utf8"),
  ]);
  assert.match(journey, /originalAuthorDescription\(locale, i\)\.map/);
  assert.match(journey, /tantra-journey__author-text/);
  assert.match(journey, /originalRussianEnglishTranslation\.blocks\[sourceIndex\]\.text/);
  assert.match(journey, /tantraReikiArchive\.blocks\.ru\[sourceIndex\]\.text/);
  const block = journey.match(/const authorStageBlockIndices = \[([\s\S]*?)\] as const;/);
  assert.ok(block, "missing original author block mapping");
  const levelIndices = [...block[1].matchAll(/^  \[([^\]]+)\]/gm)]
    .map((match) => match[1].split(",").map((part) => Number(part.trim())));
  assert.equal(levelIndices.length, 9);
  assert.ok(levelIndices.every((level) => level.length >= 2));
  assert.match(page, /Full English translation of Andrey’s original Russian text/);
  assert.match(page, /tantraReikiOriginalRuEnglish\.blocks\.map/);
  assert.match(page, /Original English course text · preserved without omissions/);
  assert.match(page, /renderBlocks\(publicBlocks\)/);
});

test("Archived medical and certification wording stays attributed rather than becoming a current promise", async () => {
  const page = await readFile("components/academy-record-page.tsx", "utf8");
  const archive = JSON.parse(await readFile("data/academy/tantra-reiki-ru-en.generated.json", "utf8"));
  assert.match(page, /Historical health, money and certification claims/);
  assert.match(page, /academy-archive-notice/);
  assert.match(archive.blocks[179].text, /The original text states/);
  assert.match(archive.blocks[180].text, /Traditional applications claimed/);
});
