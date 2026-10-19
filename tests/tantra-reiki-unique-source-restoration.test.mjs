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
  // Original event fragments remain safely archived; the low-value expandable
  // marketing disclosure is deliberately not displayed under the photo gallery.
  assert.doesNotMatch(story, /tantraReikiArchive\.blocks\.en\.slice\(93, 98\)/);
  assert.doesNotMatch(story, /id="tantra-original-event-themes"/);
  assert.doesNotMatch(story, /eventSourceTitle|eventSourceNote|translatedEventThemes/);
  assert.match(story, /className="tantra-festival-moments__gallery"/);
  assert.match(story, /eventPhotos\.map/);

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

  // PR #1160 restored all four complete archived reviews through one shared
  // source used by both the Tantra and Reiki Practitioner landings.
  const learnerCards = await read("components/tantra-learner-review-cards.tsx");
  const curriculum = await read("data/academy/energywork-ai-curriculum.ts");
  assert.match(reviews, /<TantraLearnerReviewCards locale=\{locale\}/);
  assert.match(learnerCards, /tantraVoices\.map\(\(review, index\) =>/);
  assert.match(learnerCards, /review\.quote\[reviewLanguage\]/);
  for (const id of ["margaret", "olga", "litten", "tantra-level-1"]) {
    assert.ok(curriculum.includes('id: "' + id + '"'), "Original learner account missing: " + id);
  }
  assert.match(curriculum, /testimonials: tantraVoices/);
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
