import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Tantra Reiki landing orders live events, nine levels, meditation, testimonials and themed readings", async () => {
  const page = await readFile("components/academy-record-page.tsx", "utf8");
  const testimonials = await readFile("components/tantra-reiki-testimonials.tsx", "utf8");
  assert.match(page, /className="tantra-course-hero"/);
  assert.match(page, /id="tantra-levels"/);
  assert.match(page, /<TantraReikiProgrammeModules locale=\{locale\} publicBlocks=\{publicBlocks\}/);
  assert.match(page, /<TantraReikiTestimonials locale=\{locale\} \/>/);
  assert.match(testimonials, /id="tantra-testimonials"/);
  assert.match(page, /className="tantra-course-hero__visual"/);
  assert.match(page, /className="tantra-course-hero__cta"/);
  assert.match(page, /Ask for dates & format/);
  const levels = page.indexOf("<TantraReikiJourney locale=");
  const meditation = page.indexOf('<EnglishGuidedMeditations focus="tantra-reiki"');
  const reviews = page.indexOf("<TantraReikiTestimonials locale=");
  const readings = page.indexOf("<TantraReikiProgrammeModules locale=");
  const teacher = page.indexOf("<TantraReikiTeacher locale=");
  const forms = page.indexOf("<TantraReikiLeadForms locale=");
  assert.ok(levels > 0 && levels < meditation && meditation < reviews && reviews < readings && readings < teacher && teacher < forms);
  assert.doesNotMatch(page, /className="tantra-media-library"/);
});

test("Historic content is modularized while participant videos remain dedicated to testimonials", async () => {
  const page = await readFile("components/academy-record-page.tsx", "utf8");
  const review = await readFile("components/tantra-reiki-testimonials.tsx", "utf8");
  assert.match(page, /<TantraReikiProgrammeModules/);
  assert.match(review, /html5Videos\.ru\.map/);
  assert.match(review, /youtubeId="qM_nFUkYJ1k"/);
  assert.match(review, /locale === "ru"/);
  assert.match(page, /sourceImages\.map/);
});

test("Reiki landing refresh has responsive language and Tantra layouts", async () => {
  const css = await readFile("app/academy.css", "utf8");
  assert.match(css, /Reiki Yggdrasil bilingual video library \+ Tantra Reiki landing refresh/);
  assert.match(css, /\.yggdrasil-language-badge--ru/);
  assert.match(css, /\.yggdrasil-english-guide/);
  assert.match(css, /\.tantra-course-hero/);
  assert.match(css, /\.tantra-source-strip/);
});
