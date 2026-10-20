import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const learner = read("components/energywork-ai-learner.tsx");
const curriculum = read("data/academy/energywork-ai-curriculum.ts");
const css = read("components/energywork-ai-learner.module.css");
const approvedSunrise = "/images/holistic-house/reiki-approved-sunrise-v3.webp";

test("Flight lesson celebration retains the approved sunrise portrait, never Toltec ruins", () => {
  assert.ok(curriculum.includes('sun: "' + approvedSunrise + '"'));
  assert.doesNotMatch(curriculum, /toltec-tradition\.jpg/);
  assert.match(learner, /portraitArt = [^\n]*slide\.id === "flight-done"/);
  assert.match(learner, /unoptimized=\{portraitArt \|\| voicesArt\}/);
  assert.match(learner, /data-reiki-person=\{portraitArt \|\| voicesArt/);
});

test("Lesson 1 has warm, concise EN/RU congratulations without membership warnings", () => {
  assert.doesNotMatch(learner, /milestoneNote|Personal initiation and group membership are arranged separately/);
  assert.match(curriculum, /id: "flight-done"[\s\S]*?title: l\("Lesson 1 complete — well done!", "Первый урок пройден — отлично!"\)/);
  assert.match(curriculum, /body: l\("You've taken your first step\. Next, discover Tantra Reiki\."/);
  assert.match(learner, /slide\.id === "flight-done" \? t\.firstMilestoneLabel : t\.milestoneLabel/);
  assert.match(learner, /styles\.milestoneCard/);
});

test("Milestone uses one save-and-continue CTA, and shows the entire 756×478 photograph", () => {
  const v4 = css.slice(css.indexOf("LESSON 1 COMPLETION V4"));
  assert.ok(v4.startsWith("LESSON 1 COMPLETION V4"));
  assert.match(v4, /\[data-energywork-slide-id="flight-done"\] \.art \{[\s\S]*?aspect-ratio: 756 \/ 478/);
  assert.match(v4, /\[data-energywork-slide-id="flight-done"\] \.art img \{\s*object-fit: contain/);
  assert.match(v4, /@media \(max-width: 760px\)/);
  assert.match(v4, /@media \(max-width: 760px\) and \(max-height: 700px\)/);
  assert.doesNotMatch(learner, /data-energywork-save-progress|saveAndLeave/);
  assert.match(learner, /data-energywork-next/);
  assert.match(read("scripts/verify-reiki-all-slides-browser.mjs"), /expectFits\("flight-done"\)/);
});
