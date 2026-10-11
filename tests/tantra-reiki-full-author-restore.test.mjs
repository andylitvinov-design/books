import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("Complete author study returns for all nine Tantra Reiki levels with the original English lesson sequence", async () => {
  const [journey, modules, rawText, translatedText] = await Promise.all([
    read("components/tantra-reiki-journey.tsx"),
    read("components/tantra-reiki-programme-modules.tsx"),
    read("data/academy/tantra-reiki-full.generated.json"),
    read("data/academy/tantra-reiki-ru-en.generated.json"),
  ]);
  const archive = JSON.parse(rawText);
  const translated = JSON.parse(translatedText);
  assert.equal(archive.blocks.ru.length, 190, "Unabridged Russian source must be preserved");
  assert.equal(archive.blocks.en.length, 102, "Original English course must be preserved");
  assert.equal(translated.blocks.length, 190, "Unabridged translation must be preserved");
  const researchList = modules.match(/const originalResearchIndices = \[([\s\S]*?)\] as const;/);
  assert.ok(researchList, "Missing restored complete original author research");
  const authorIndices = [...researchList[1].matchAll(/\b\d+\b/g)].map((match) => Number(match[0]));
  const originalNineLevels = [
    [75, 76, 77],
    [86, 87],
    [89, 90, 91],
    [99, 100, 101, 102],
    [104, 105, 106, 107],
    [109],
    [125, 126],
    [128],
    [130, 131, 132],
  ];
  for (const [level, indices] of originalNineLevels.entries()) {
    for (const index of indices) {
      assert.ok(authorIndices.includes(index), "Stage " + (level + 1) + " lost original author paragraph " + index);
      assert.ok(archive.blocks.ru[index].text.length > 25);
      assert.equal(translated.blocks[index].sourceIndex, index);
    }
  }
  for (const index of [70, 71, 72, 73, 134, 135]) {
    assert.ok(authorIndices.includes(index), "Missing unique original research " + index);
  }
  assert.equal(new Set(authorIndices).size, authorIndices.length, "Original research must not contain scraper duplicates");
  const programmeMatch = journey.match(/const originalProgrammeStepIndices = \[([\s\S]*?)\] as const;/);
  assert.ok(programmeMatch, "Original nine-level learning plan absent");
  const stageStudyIndices = [...programmeMatch[1].matchAll(/\[([\d,\s]+)\]/g)]
    .map((match) => match[1].split(",").map((text) => Number(text.trim())));
  assert.deepEqual(stageStudyIndices, [[51,52],[53,54],[55,56],[59],[60],[61],[63],[64],[65]]);
  for (const indices of stageStudyIndices) {
    for (const index of indices) assert.ok(archive.blocks.en[index].text.trim());
  }
  assert.match(journey, /originalAuthorDescription\(locale, i\)\.map/);
  assert.match(journey, /originalProgrammeStudyStep\(locale, i\)/);
  assert.ok(journey.indexOf("tantra-journey__author-text") < journey.indexOf("tantra-journey__practice--restored"));
  assert.match(modules, /id="tantra-original-author-research"/);
  assert.match(modules, /id="tantra-original-master-programme"/);
  assert.match(modules, /originalEnglishArchive\.blocks\.en\.slice\(6, 69\)/);
  assert.match(journey, /#tantra-original-author-research/);
});

test("Restored original course is visible in every photographed stage and enrollment remains only at the end", async () => {
  const [journey, page, photos] = await Promise.all([
    read("components/tantra-reiki-journey.tsx"),
    read("components/academy-record-page.tsx"),
    read("data/academy/tantra-reiki-full.generated.json"),
  ]);
  const source = JSON.parse(photos);
  assert.equal(source.images.ru.length, 23);
  assert.match(journey, /stages\.map\(\(stage, i\) =>/);
  assert.match(journey, /className="tantra-journey__practice tantra-journey__practice--restored"/);
  assert.doesNotMatch(journey, /<p>\{copy\.practice\}<\/p>/);
  assert.match(journey, /originalProgrammeStepIndices/);
  assert.match(journey, /translatedProgrammeSteps/);
  const teacher = page.indexOf("<TantraReikiTeacher locale={locale} />");
  const registration = page.indexOf("<TantraReikiLeadForms locale={locale} />");
  const footer = page.indexOf('<footer className="academy-source-footer">');
  assert.ok(footer > 0 && teacher > footer && registration > teacher);
  assert.equal((page.match(/<TantraReikiLeadForms locale=/g) ?? []).length, 1);
});
