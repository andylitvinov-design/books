import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const learner = read("components/energywork-ai-learner.tsx");
const curriculum = read("data/academy/energywork-ai-curriculum.ts");
const css = read("components/energywork-ai-learner.module.css");
const approvedSunrise = "/images/holistic-house/reiki-approved-sunrise-v3.webp";

test("Flight lesson celebration uses the approved sunrise portrait, never Toltec ruins", () => {
  assert.ok(curriculum.includes('sun: "' + approvedSunrise + '"'));
  assert.doesNotMatch(curriculum, /toltec-tradition\.jpg/);
  assert.match(learner, /portraitArt = [^\n]*slide\.id === "flight-done"/);
  assert.match(learner, /unoptimized=\{portraitArt \|\| voicesArt\}/);
  assert.match(learner, /data-reiki-person=\{portraitArt \|\| voicesArt/);
});

test("Milestones celebrate a lesson without a discouraging membership warning", () => {
  assert.doesNotMatch(learner, /milestoneNote|Personal initiation and group membership are arranged separately/);
  assert.match(curriculum, /id: "flight-done"[\s\S]*?body: l\("A lovely start! Next: Tantra Reiki\."/);
  assert.match(learner, /styles\.milestoneCard/);
});

test("Achievement ribbon and photo have dedicated mobile and short-height layouts", () => {
  assert.match(css, /Reiki lesson celebration: calm sunrise/);
  assert.match(css, /\[data-energywork-slide-kind="milestone"\] \.milestoneCard \{/);
  assert.match(css, /\[data-energywork-slide-kind="milestone"\] \.art \{\s*height: clamp\(106px, 17dvh, 150px\)/);
  assert.match(css, /@media \(max-width: 760px\) and \(max-height: 700px\)/);
  assert.match(css, /\[data-energywork-slide-kind="milestone"\] \.art \{\s*height: clamp\(88px, 14dvh, 110px\)/);
  assert.match(read("scripts/verify-reiki-all-slides-browser.mjs"), /expectFits\("flight-done"\)/);
});
