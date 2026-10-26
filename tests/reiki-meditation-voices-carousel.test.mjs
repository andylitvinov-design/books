import assert from "node:assert/strict";
import test from "node:test";
import { assertCurrentReviewSequence, assertCurrentReviewGates } from "./helpers/reiki-current-contracts.mjs";
import { assertCurrentTestimonialSources } from "./helpers/reiki-testimonial-source-contract.mjs";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const curriculum = read("data/academy/energywork-ai-curriculum.ts");
const yggdrasil = read("data/academy/yggdrasil-testimonials.ts");
const learner = read("components/energywork-ai-learner.tsx");
const css = read("components/energywork-ai-learner.module.css");
const browser = read("scripts/verify-reiki-all-slides-browser.mjs");

test("Four meditation review screens retain their order among 64 active screens including the private photo step", () => {
  assertCurrentReviewSequence();
});

test("All five Yggdrasil and four independently sourced Tantra reviews are available", () => {
  assert.equal([...yggdrasil.matchAll(/id: "testimonial-[0-9]+"/g)].length, 5);
  assert.match(curriculum, /yggdrasilTextTestimonials\.map/);
  assert.match(curriculum, /testimonials: yggdrasilVoices/);
  assert.match(curriculum, /testimonials: tantraVoices/);
  const tantra = curriculum.split("const tantraVoices:")[1].split("export const energyworkPhases")[0];
  assert.deepEqual([...tantra.matchAll(/id: "([^"]+)"/g)].map(match => match[1]),
    ["margaret", "olga", "litten", "tantra-level-1"]);
  assert.match(curriculum, /These are supplied examples, not independently verified YouTube comments/);
  assert.match(curriculum, /Published learner experiences from the course, not this exact recording/);
  assert.match(curriculum, /Three anonymous examples from Kundalini Reiki sessions with other practitioners, not reviews of this exact video/);
});

test("Buttons switch quotes without navigating away or touching required student feedback", () => {
  assert.match(learner, /function MeditationVoices/);
  assert.match(learner, /data-meditation-review-carousel/);
  assert.match(learner, /data-review-prev/);
  assert.match(learner, /data-review-next/);
  assert.match(learner, /setActive\(\(index\) => \(index \+ 1\) % entries\.length\)/);
  assert.match(learner, /<MeditationVoices key=\{slide\.id\}/);
  assert.match(learner, /aria-live="polite" aria-atomic="true"/);
  assert.match(learner, /t\.voicesSource/);
  assert.doesNotMatch(learner, /showVideoComments|voicesComments/, "No review screen should expose a Video comments CTA");
  assertCurrentReviewGates();
  assert.match(browser, /Next switches quote in place/);
  assert.match(browser, /Previous restores quote/);
  assert.match(css, /\.voicesControls button:focus-visible/);
  assert.match(css, /grid-template-columns:44px/);
  assert.match(css, /REIKI REVIEW V4/);
  assert.match(css, /reiki-approved-sunrise-v3\.webp/);
  assert.match(learner, /styles\.voicesReferences/);
  assert.match(learner, /styles\.voiceDotActive/);
  assert.match(learner, /voicesArt = slide\.kind === "voices"/);
  assert.match(css, /A 30px visual circle with a full 44px tap target on iPhone/);
  const mobileReview = css.slice(css.indexOf("/* REIKI FULL TESTIMONIALS V1"));
  assert.match(mobileReview, /\.voicesControls \{\s*margin: 6px auto 0;/);
  assert.match(mobileReview, /inset: 7px;/);
  assert.match(browser, /const hasSourceLink = id === "tan-voices" \|\| id === "ygg-voices"/);
});

test("Full original Tantra Reiki testimonials survive without excerpt truncation", () => {
  const archive = JSON.parse(read("data/academy/tantra-reiki-full.generated.json"));
  const translations = JSON.parse(read("data/academy/tantra-reiki-ru-en.generated.json"));
  const english = archive.blocks.en;
  const russian = archive.blocks.ru;
  const tantra = curriculum.split("const tantraVoices:")[1].split("export const energyworkPhases")[0];
  const completeTexts = [
    english[89].text,
    english[84].text.replace(/^TESTIMONIAL: OLGA\s*/, ""),
    english[86].text + "\n\n" + english[87].text,
    [56, 57].map(index => translations.blocks.find(block => block.sourceIndex === index).text).join("\n\n"),
    russian.slice(61, 65).map(block => block.text).join("\n\n"),
    russian.slice(56, 58).map(block => block.text).join("\n\n"),
  ];
  for (const fullText of completeTexts) {
    assert.ok(tantra.includes(JSON.stringify(fullText)), "Original review must be published in full");
  }
  assertCurrentTestimonialSources();
});

test("Long reviews scroll inside a labelled, focusable region on mobile", () => {
  assert.match(learner, /data-review-fulltext role="region" tabIndex=\{0\} aria-label=\{t\.voicesFullText\}/);
  const fullReview = css.slice(css.indexOf("/* REIKI FULL TESTIMONIALS V1"));
  assert.match(fullReview, /\.voiceQuote p \{\s*flex: 1 1 auto;[\s\S]*?max-height: none;/);
  assert.match(fullReview, /overflow-y: auto;/);
  assert.match(fullReview, /-webkit-overflow-scrolling: touch;/);
  assert.match(fullReview, /white-space: pre-line;/);
  assert.match(fullReview, /\.voiceQuote p::-webkit-scrollbar/);
  assert.match(browser, /const first = await carousel\.locator\("blockquote p"\)\.innerText\(\)/);
});
