import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const curriculum = read("data/academy/energywork-ai-curriculum.ts");
const yggdrasil = read("data/academy/yggdrasil-testimonials.ts");
const learner = read("components/energywork-ai-learner.tsx");
const css = read("components/energywork-ai-learner.module.css");
const browser = read("scripts/verify-reiki-all-slides-browser.mjs");

test("Four meditation review screens remain in the correct slots among 53 original steps", () => {
  const ids = [...curriculum.matchAll(/id: "(?:welcome|flight|presence|intention|boundaries|paths|ygg|tan|kun|init|end)-[^"]+"/g)];
  assert.equal(ids.length, 53);
  for (const sequence of [["flight-03","flight-voices","flight-04"],
    ["tan-03","tan-voices","tan-04"],["kun-03","kun-voices","kun-04"],
    ["ygg-03","ygg-voices","ygg-04"]]) {
    let last = -1;
    for (const id of sequence) {
      const offset = curriculum.indexOf('id: "' + id + '"');
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
  assert.match(curriculum, /Course reviews are NOT presented as reactions to this exact meditation recording/);
  assert.match(curriculum, /Explore comments on the original video, then share your own experience/);
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
  assert.match(learner, /t\.voicesComments/);
  assert.match(learner, /disabled=\{busy \|\| sync === "checking" \|\| experienceMissing \|\| feedbackMissing\}/);
  assert.match(browser, /Next switches quote in place/);
  assert.match(browser, /Previous restores quote/);
  assert.match(css, /\.voicesControls button:focus-visible/);
  assert.match(css, /grid-template-columns:44px/);
  assert.match(css, /REIKI REVIEW V4/);
  assert.match(css, /reiki-approved-sunrise-v3\.webp/);
  assert.match(learner, /styles\.voicesReferences/);
  assert.match(learner, /styles\.voiceDotActive/);
  assert.match(learner, /voicesArt = slide\.kind === "voices"/);
});
