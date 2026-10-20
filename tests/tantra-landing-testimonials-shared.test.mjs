import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const reviews = read("components/tantra-learner-review-cards.tsx");
const main = read("components/tantra-reiki-testimonials.tsx");
const practitioner = read("components/reiki-referral-landing.tsx");
const quotes = read("data/academy/energywork-ai-curriculum.ts");
const css = read("components/tantra-learner-review-cards.module.css");
const courseCss = read("components/reiki-referral-landing.module.css");

test("Both public landings reuse four complete existing course testimonials with no duplicate source text", () => {
  assert.match(quotes, /export const tantraVoices: EnergyworkTestimonial\[\] = \[/);
  for (const id of ["margaret", "olga", "litten", "tantra-level-1"]) {
    assert.match(quotes, new RegExp('id: "' + id + '"'));
  }
  assert.match(reviews, /import \{ tantraVoices \} from "@\/data\/academy\/energywork-ai-curriculum"/);
  assert.match(reviews, /tantraVoices\.map\(\(review, index\) =>/);
  assert.match(reviews, /review\.quote\[reviewLanguage\]/);
  assert.match(reviews, /review\.attribution\[reviewLanguage\]/);
  assert.match(reviews, /data-review-count=\{tantraVoices\.length\}/);
  assert.match(main, /<TantraLearnerReviewCards locale=\{locale\} headingId="tantra-testimonials-heading" \/>/);
  assert.match(practitioner, /<TantraLearnerReviewCards locale=\{locale\} headingId="reiki-practitioner-testimonials-heading" context="practitioner" \/>/);
});

test("Original video testimonials, translation disclosure and programme-source links remain available", () => {
  assert.match(main, /<TantraVideoTestimonials/);
  assert.match(main, /videos=\{tantraReikiArchive\.html5Videos\.ru\}/);
  assert.match(main, /id="tantra-testimonials"/);
  assert.match(practitioner, /id="reiki-practitioner-testimonials"/);
  assert.match(reviews, /locale === "es" \? "en" : locale/);
  assert.match(reviews, /Los textos se muestran en inglés/);
  assert.match(reviews, /review\.sourcePath \+ "#tantra-full-source"/);
  assert.match(reviews, /not reviews of the entire five-lesson Reiki Practitioner course/);
});

test("Long quotes remain readable in mobile one-column layout and are never line-clamped", () => {
  assert.match(css, /\.grid \{ display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 730px\)/);
  assert.match(css, /\.grid \{ grid-template-columns: 1fr; \}/);
  assert.match(css, /white-space: pre-line;/);
  assert.match(css, /overflow-wrap: anywhere;/);
  assert.doesNotMatch(css, /line-clamp|text-overflow:\s*ellipsis/);
  assert.match(courseCss, /\.reviews \{ margin-top:/);
});
