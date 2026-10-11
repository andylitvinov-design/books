import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const read = (path) => readFile(path, "utf8");

test("Tantra Reiki preserves newly recovered source-unique passages in the correct page sections", async () => {
  const [raw, translation, journey, programme, story, reviews] = await Promise.all([
    read("data/academy/tantra-reiki-full.generated.json"),
    read("data/academy/tantra-reiki-ru-en.generated.json"),
    read("components/tantra-reiki-journey.tsx"),
    read("components/tantra-reiki-programme-modules.tsx"),
    read("components/tantra-reiki-story.tsx"),
    read("components/tantra-reiki-testimonials.tsx"),
  ]);
  const archive = JSON.parse(raw), sourceTranslation = JSON.parse(translation);
  assert.equal(archive.blocks.en.length, 102);
  assert.equal(archive.blocks.ru.length, 190);
  assert.equal(sourceTranslation.blocks.length, 190);

  assert.ok(archive.blocks.en[5].text.includes("Tantra Reiki of Osho"));
  assert.match(programme, /originalEnglishArchive\.blocks\.en\[5\]\.text/);
  assert.match(programme, /originalEnglishArchive\.blocks\.en\.slice\(6, 69\)/);

  const stageIndices = journey.match(/const originalSettingDescriptionIndices = \[([^\]]+)\] as const;/);
  assert.ok(stageIndices);
  const recovered = stageIndices[1].split(",").map((x) => x.trim() === "null" ? null : Number(x.trim()));
  assert.deepEqual(recovered, [null, null, null, null, 35, 38, 41, 44, 47]);
  for (const index of recovered.filter((x) => x !== null)) {
    assert.equal(archive.blocks.ru[index].type, "p");
    assert.ok(archive.blocks.ru[index].text.length >= 45);
    assert.equal(sourceTranslation.blocks[index].sourceIndex, index);
  }
  assert.match(journey, /tantraReikiArchive\.blocks\.ru\[sourceIndex\]\.text/);
  assert.match(journey, /originalRussianEnglishTranslation\.blocks\[sourceIndex\]\.text/);
  assert.match(journey, /tantra-journey__setting-description/);

  assert.ok(archive.blocks.en[93].text.toLowerCase().includes("love and connection"));
  assert.ok(archive.blocks.en[97].text.toLowerCase().includes("gods"));
  assert.match(story, /tantraReikiArchive\.blocks\.en\.slice\(93, 98\)/);
  assert.match(story, /id="tantra-original-event-themes"/);

  const school = story.match(/const historicalSchoolIndices = \[([^\]]+)\]/);
  const bio = story.match(/const historicalBiographyIndices = \[([^\]]+)\]/);
  assert.ok(school && bio);
  for (const index of [4, 75, 76, 77, 78, 81, 82]) {
    assert.ok(school[1].split(",").map(Number).includes(index));
  }
  for (const index of [158, 159, 160, 161, 162, 163, 164, 165, 166, 167]) {
    assert.ok(bio[1].split(",").map(Number).includes(index));
  }
  assert.match(story, /tantraReikiArchive\.blocks\.ru\[index\]/);
  assert.match(story, /englishTranslation\.blocks\[index\]/);
  assert.match(story, /id="tantra-original-academy-history"/);
  assert.match(story, /id="tantra-original-author-biography"/);

  assert.match(reviews, /name: "Litten", blocks: \[86, 87\]/);
  assert.match(reviews, /name: "Margaret", blocks: \[89\]/);
  assert.match(reviews, /tantraReikiArchive\.blocks\.en\[index\]\.text/);
  assert.match(reviews, /id="tantra-original-english-testimonials"/);
  assert.doesNotMatch(reviews, /name: "Olga"/);
  for (const index of [86, 87, 89]) assert.ok(archive.blocks.en[index].text.length >= 20);

  assert.match(programme, /new Set\(\[5, 6, 7, 8, 182\]\)/);
  assert.ok(archive.blocks.ru[181].text.includes(archive.blocks.ru[182].text));
});

test("Archive restoration keeps the single final registration and readable styling", async () => {
  const [page, css] = await Promise.all([
    read("components/academy-record-page.tsx"),
    read("app/academy.css"),
  ]);
  const stages = page.indexOf('<TantraReikiJourney locale={locale} />');
  const testimonials = page.indexOf('<TantraReikiTestimonials locale={locale} />');
  const readings = page.indexOf('<TantraReikiProgrammeModules locale={locale}');
  const teacher = page.indexOf('<TantraReikiTeacher locale={locale} />');
  const registration = page.indexOf('<TantraReikiLeadForms locale={locale} />');
  assert.ok(stages > 0 && stages < testimonials && testimonials < readings && readings < teacher && teacher < registration);
  assert.equal((page.match(/<TantraReikiLeadForms locale=/g) ?? []).length, 1);
  assert.match(css, /\.academy-reading-shell--tantra \.tantra-source-disclosure/);
  assert.match(css, /\.academy-reading-shell--tantra \.tantra-journey__setting-description/);
});
