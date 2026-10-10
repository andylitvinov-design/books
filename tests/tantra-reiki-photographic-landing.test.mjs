import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Tantra Reiki: every level displays a distinct real archived photograph, not a diagram", async () => {
  const [journey, archiveRaw, css] = await Promise.all([
    readFile("components/tantra-reiki-journey.tsx", "utf8"),
    readFile("data/academy/tantra-reiki-full.generated.json", "utf8"),
    readFile("app/academy.css", "utf8"),
  ]);
  const archive = JSON.parse(archiveRaw);
  const photos = [...journey.matchAll(/src: tantraReikiArchive.images.(en|ru)\[(\d+)\]/g)]
    .map(([, locale, index]) => archive.images[locale][Number(index)]);
  assert.equal(photos.length, 9, "Nine separate stage photographs required");
  assert.equal(new Set(photos).size, 9, "Do not reuse the same picture for unrelated levels");
  for (const photo of photos) {
    assert.ok(photo.startsWith("https://www.psitrends.com/images/"), photo);
    assert.match(photo, /\.(?:jpg|jpeg|png)$/i);
    assert.doesNotMatch(photo, /Screenshot|diagram|symbol/i);
  }
  assert.match(journey, /className="tantra-journey__photo"/);
  assert.match(journey, /loading=\{i === 0 \? "eager" : "lazy"\}/);
  assert.doesNotMatch(journey, /className="tantra-journey__symbol"/);
  assert.match(css, /\.tantra-journey__photo img \{/);
  assert.match(css, /@media \(max-width: 700px\)/);
});

test("Tantra Reiki: nine concrete learning outcomes in all three supported locales", async () => {
  const journey = await readFile("components/tantra-reiki-journey.tsx", "utf8");
  for (const locale of ["en","ru","es"]) {
    const match = journey.match(new RegExp(`  ${locale}: \\[([\\s\\S]*?)\\n  \\]`));
    assert.ok(match, "No application text for " + locale);
    assert.equal((match[1].match(/^    "/gm) ?? []).length, 9, "Need 9 level descriptions for " + locale);
  }
  assert.match(journey, /levelApplications\[locale\]\[i\]/);
  assert.match(journey, /c\.application/);
  assert.match(journey, /c\.settings/);
  assert.match(journey, /copy\.practice/);
  assert.match(journey, /href="#tantra-course-hero-title"/);
  assert.doesNotMatch(journey, /href="https:\/\/t\.me\/AndyTherapist"/);
});

test("Tantra Reiki: sales hero and training contact remain visible above historical source", async () => {
  const page = await readFile("components/academy-record-page.tsx", "utf8");
  assert.match(page, /Feel the flow. Deepen connection. Learn to work with it/);
  assert.match(page, /className="tantra-course-hero__cta"/);
  assert.match(page, /Ask for dates & format/);
  assert.match(page, /className="tantra-course-hero__visual"/);
  assert.match(page, /tantraReikiFullArchive.images.ru\[12\]/);
  assert.match(page, /<TantraReikiJourney locale=\{locale\} \/>/);
  assert.match(page, /<TantraReikiProgrammeModules locale=\{locale\}/);
  assert.match(page, /<TantraReikiFestivalMoments locale=\{locale\}/);
  assert.match(page, /<TantraReikiTeacher locale=\{locale\}/);
});
