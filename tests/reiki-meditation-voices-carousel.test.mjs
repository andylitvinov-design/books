import assert from "node:assert/strict";
import test from "node:test";
import { energyworkSequence } from "../data/academy/energywork-ai-schema.js";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const curriculum = read("data/academy/energywork-ai-curriculum.ts");
const yggdrasil = read("data/academy/yggdrasil-testimonials.ts");
const learner = read("components/energywork-ai-learner.tsx");
const css = read("components/energywork-ai-learner.module.css");
const browser = read("scripts/verify-reiki-all-slides-browser.mjs");

test("Four meditation review screens remain in the correct slots among 63 active screens", () => {
  const ids = [...curriculum.matchAll(/id: "(?:welcome|flight|presence|intention|boundaries|paths|ygg|tan|kun|init|end)-[^"]+"/g)];
  assert.equal(ids.length, 63);
  assert.ok(!energyworkSequence().includes("flight-save"));
  assert.equal(energyworkSequence()[energyworkSequence().indexOf("flight-done") + 1], "tan-01");
  const teacherSources = read("data/academy/reiki-practitioner-lesson-videos.ts");
  assert.deepEqual([...teacherSources.matchAll(/slideId: "([^"]+)", lesson: (\d+), youtubeId: "([^"]+)"/g)].map(m=>[m[1],Number(m[2]),m[3]]),[
    ["welcome-video",1,"lOo93GuzeJ0"],["tan-intro-video",2,"yH_M6If8VLk"],
    ["kun-intro-video",3,"KK1IgvDTrhU"],["ygg-intro-video",4,"y3MDcqwlC-w"],["paths-01",5,"FKa-wHl8aQI"],
  ]);
  assert.deepEqual(energyworkSequence().slice(0,3),["welcome-01","welcome-02","welcome-video"]);
  for(const prefix of ["tan","kun","ygg"])
    assert.equal(energyworkSequence().indexOf(prefix+"-intro-video")+1,energyworkSequence().indexOf(prefix+"-02"));
  assert.deepEqual(ids.map(match=>match[0].slice(5,-1)).sort(),[...energyworkSequence()].sort());
  for (const sequence of [["flight-02","flight-voices","flight-03"],
    ["tan-02","tan-voices","tan-03"],["kun-02","kun-voices","kun-03"],
    ["ygg-02","ygg-voices","ygg-03"]]) {
    let last = -1;
    for (const id of sequence) {
      const offset = energyworkSequence().indexOf(id);
      assert.ok(offset > last, id + " must remain after the corresponding meditation");
      last = offset;
    }
  }
});

test("All five Yggdrasil and four independently sourced Tantra reviews are available", () => {
  assert.equal([...yggdrasil.matchAll(/id: "testimonial-[0-9]+"/g)].length, 5);
  assert.match(curriculum, /yggdrasilTextTestimonials\.map/);
  assert.match(curriculum, /testimonials: yggdrasilVoices/);
  assert.match(curriculum, /testimonials: tantraVoices/);
  const tantra = curriculum.split("const tantraVoices:")[1].split("export const energyworkPhases")[0];
  assert.deepEqual([...tantra.matchAll(/id: "([^"]+)"/g)].map(match => match[1]),
    ["margaret", "olga", "litten", "tantra-level-1"]);
  assert.match(curriculum, /These are subjective reports about the course, not the exact meditation recording\./);
  assert.match(learner, /currentReview\?\.sourcePath \? \(/);
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
  assert.match(learner, /disabled=\{busy \|\| sync === "checking" \|\| sync === "unavailable" \|\|\s*\(slide\.id === "flight-done" && sync !== "ready" && !firstLessonConsent\) \|\|\s*experienceMissing \|\| feedbackMissing \|\| tantraStudyMissing \|\| otherStudyMissing\}/);
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
  assert.equal((tantra.match(/sourcePath: "reiki\/tantra-reiki"/g)||[]).length,4);
  assert.match(curriculum,/original Russian source where available, faithful translations for Margaret and Litten/);
});

test("Long reviews scroll inside a clearly labelled region on mobile", () => {
  assert.match(learner, /data-review-fulltext role="region" tabIndex=\{0\} aria-label=\{t\.voicesFullText\}/);
  assert.match(learner, /\{currentReview\.quote\[locale\]\}/);
  const fullQuoteRule=css.match(/\.page\[data-reiki-full-reviews="v1"\]\[data-reiki-current-kind="voices"\] \.voiceQuote p \{([^}]+)\}/)?.[1];
  assert.ok(fullQuoteRule);
  assert.match(fullQuoteRule,/overflow-y: auto/);
  assert.match(fullQuoteRule,/white-space: pre-line/);
  assert.match(fullQuoteRule,/max-height: none/);
  assert.match(css, /\.voiceQuote p::-webkit-scrollbar/);
  assert.match(css, /\.voiceQuote p:focus-visible/);
  const fullReview = css.slice(css.indexOf("/* REIKI FULL TESTIMONIALS V1"));
  assert.match(fullReview, /\.voiceQuote p \{\s*flex: 1 1 auto;[\s\S]*?max-height: none;/);
  assert.match(fullReview, /overflow-y: auto;/);
  assert.match(fullReview, /-webkit-overflow-scrolling: touch;/);
  assert.match(fullReview, /white-space: pre-line;/);
  assert.match(fullReview, /\.voiceQuote p::-webkit-scrollbar/);
  assert.match(browser, /const first = await carousel\.locator\("blockquote p"\)\.innerText\(\)/);
  assert.match(browser, /quotePadding: parseFloat\(getComputedStyle\(review\)\.paddingRight\)/);
});
