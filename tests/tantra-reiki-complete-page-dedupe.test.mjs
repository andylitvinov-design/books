import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(path, "utf8");

test("Tantra Reiki has one attunement location and one photo-context note across the nine-level journey", async () => {
  const [journey, readings, content] = await Promise.all([
    read("components/tantra-reiki-journey.tsx"),
    read("components/tantra-reiki-programme-modules.tsx"),
    read("data/academy/tantra-reiki-full.generated.json"),
  ]);
  assert.match(journey, /copy\.att\.map/);
  assert.match(journey, /stages\.map\(\(stage, i\) =>/);
  assert.match(journey, /photoContext/);
  assert.doesNotMatch(journey, /<figcaption>|href="https:\/\/t\.me\/AndyTherapist"/);
  assert.doesNotMatch(readings, /\[11,\s*48\]/);
  assert.equal((readings.match(/const detailedRanges[\s\S]*?=\s*\[([\s\S]*?)\];/)?.[1].match(/\[\d+,\s*\d+\]/g) ?? []).length, 3);
  const original = JSON.parse(content);
  assert.equal(original.blocks.ru.length, 190);
  assert.equal(original.blocks.en.length, 102);
  assert.equal(original.images.ru.length, 23);
  assert.equal(original.html5Videos.ru.length, 2);
});

test("Every learning outcome is distinct from its practical assignment in all three languages", async () => {
  const code = await read("components/tantra-reiki-journey.tsx");
  const stages = JSON.parse(code.match(/const stages = (\[[\s\S]*?\]) as const;/)[1]);
  const applications = JSON.parse(code.match(/const levelApplications: Record<PublicLocale, string\[\]> = (\{[\s\S]*?\});\s*const ui/)[1].replace(/\b(en|ru|es):(?=\s*\[)/g, '"$1":'));
  assert.equal(stages.length, 9);
  const normalize = (value) => value.toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}]/gu, "").trim();
  for (const locale of ["en", "ru", "es"]) {
    assert.equal(applications[locale].length, 9);
    for (const [index, item] of stages.entries()) {
      const outcome = normalize(applications[locale][index]);
      const exercise = normalize(item[locale].practice);
      assert.ok(outcome.length > 30);
      assert.ok(exercise.length > 30);
      assert.notEqual(outcome, exercise, locale + " duplicated at level " + (index + 1));
      assert.ok(!outcome.includes(exercise) && !exercise.includes(outcome), locale + " paraphrase reused as assignment");
    }
  }
});

test("Review, meditation and enrollment prose is not rendered twice; authentic media remain", async () => {
  const [reviews, meditation, page, story] = await Promise.all([
    read("components/tantra-reiki-testimonials.tsx"),
    read("components/english-guided-meditations.tsx"),
    read("components/academy-record-page.tsx"),
    read("components/tantra-reiki-story.tsx"),
  ]);
  assert.doesNotMatch(reviews, /reviewImages|tantra-review-gallery|tantra-review-archive/);
  assert.doesNotMatch(reviews, /tantra-review-quote__label/);
  assert.match(reviews, /sourceReviewGroups\.map/);
  assert.match(reviews, /html5Videos\.ru\.map/);
  assert.match(reviews, /youtubeId="qM_nFUkYJ1k"/);
  assert.match(story, /TantraReikiFestivalMoments/);
  assert.match(meditation, /\{!isTantraVideo \? <p>\{item\.description\}<\/p> : null\}/);
  assert.match(meditation, /<AcademyVideoPlayer youtubeId=\{item\.youtubeId\}/);
  const teacher = page.indexOf("<TantraReikiTeacher locale={locale} />");
  const registration = page.indexOf("<TantraReikiLeadForms locale={locale} />");
  const footer = page.indexOf('<footer className="academy-source-footer">');
  assert.ok(footer > 0 && footer < teacher && teacher < registration);
  assert.equal((page.match(/<TantraReikiLeadForms locale=/g) ?? []).length, 1);
  assert.equal((page.match(/<TantraReikiTeacher locale=/g) ?? []).length, 1);
});
