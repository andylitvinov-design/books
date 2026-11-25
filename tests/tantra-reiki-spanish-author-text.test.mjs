import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("All 9 Spanish Tantra Reiki stages display full translated original notes", async () => {
  const [journey, rawSource] = await Promise.all([
    readFile("components/tantra-reiki-journey.tsx", "utf8"),
    readFile("data/academy/tantra-reiki-full.generated.json", "utf8")
  ]);
  const archive = JSON.parse(rawSource);
  const translated = journey.match(/const spanishAuthorDescriptions: string\[\]\[\] = (\[[\s\S]*?\]);/);
  const indexMap = journey.match(/const authorStageBlockIndices = \[([\s\S]*?)\] as const;/);
  assert.ok(translated, "Missing author-sourced Spanish paragraphs");
  assert.ok(indexMap, "Missing 9-stage mapping to original Russian paragraphs");
  const spanish = JSON.parse(translated[1]);
  const stages = [...indexMap[1].matchAll(/^  \[([^\]]+)\]/gm)]
    .map((match) => match[1].split(",").map((num) => Number(num.trim())));
  assert.equal(spanish.length, 9);
  assert.equal(stages.length, 9);
  for (let level = 0; level < 9; level++) {
    assert.equal(spanish[level].length, stages[level].length, "Original author paragraph count lost for level " + (level + 1));
    for (const [index, paragraph] of spanish[level].entries()) {
      assert.ok(archive.blocks.ru[stages[level][index]].text?.trim(), "Missing RU source text");
      assert.ok(paragraph.trim().length >= 30, "Spanish source paragraph too short for level " + (level + 1));
    }
  }
  assert.match(journey, /if \(locale === "es"\) return spanishAuthorDescriptions\[levelIndex\]/);
  assert.match(journey, /originalAuthorDescription\(locale, i\)\.map/);
  assert.match(journey, /Texto original de Andrey · traducción del ruso/);
  assert.doesNotMatch(journey, /tantra-journey__spanish-intro/);
});

test("Spanish receives the same source-first layout as Russian and English", async () => {
  const [journey, css] = await Promise.all([
    readFile("components/tantra-reiki-journey.tsx", "utf8"),
    readFile("app/academy.css", "utf8")
  ]);
  assert.match(journey, /<div className="tantra-journey__author-text" lang=\{locale\}>/);
  assert.match(css, /\.tantra-journey__author-text p/);
  assert.match(css, /\.tantra-journey__photo/);
  assert.match(css, /aspect-ratio: 4 \/ 5/);
  assert.match(css, /\.tantra-journey__level \{ min-height: 0; \}/);
});
