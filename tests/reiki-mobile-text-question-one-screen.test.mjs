import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const learner = read("components/energywork-ai-learner.tsx");
const css = read("components/energywork-ai-learner.module.css");
const curriculum = read("data/academy/energywork-ai-curriculum.ts");
const compact = css.slice(css.indexOf("REIKI ONE-SCREEN TEXT QUESTIONS"));

test("only written reflection slides use the space-saving mobile question layout", () => {
  assert.match(learner, /data-reiki-text-question=\{slide\.kind === "reflection" && slide\.question\?\.type === "text" \? "true" : undefined\}/);
  assert.match(curriculum, /id: "tan-study-04"[\s\S]*?kind: "reflection", image: image\.tantra/);
  assert.match(curriculum, /id: "kun-study-v2-01"[\s\S]*?kind: "reflection", image: image\.kundalini/);
  assert.match(curriculum, /id: "ygg-study-v2-01"[\s\S]*?kind: "reflection", image: image\.tree/);
  assert.match(curriculum, /id: "ygg-study-v2-07"[\s\S]*?kind: "reflection", image: image\.tree/);
});

test("question image is hidden only on mobile, leaving text field and study guidance visible", () => {
  assert.ok(compact.startsWith("REIKI ONE-SCREEN TEXT QUESTIONS"));
  assert.match(compact, /@media screen and \(max-width: 760px\)/);
  assert.match(compact, /\[data-reiki-text-question="true"\] \.slideMain > \.art \{\s*display: none/);
  assert.match(compact, /\[data-reiki-text-question="true"\] \.slideMain > \.content \{[\s\S]*?width: 100%/);
  assert.match(compact, /\[data-reiki-text-question="true"\] \.textarea \{[\s\S]*?min-height: 68px/);
  assert.match(compact, /\[data-energywork-slide-id="tan-study-02"\] \.textarea/);
  assert.match(compact, /\.tantraStudyHelp \{/);
  assert.doesNotMatch(compact, /overflow-y:\s*hidden|\.video\s*\{\s*display:\s*none/);
});

test("short iPhones keep all five visible stage dots without forcing a nested scroll", () => {
  assert.match(compact, /@media screen and \(max-width: 760px\) and \(max-height: 700px\)/);
  assert.match(compact, /\.journeyLabel \{[\s\S]*?clip-path: inset\(50%\)/);
  assert.match(compact, /\.textarea \{[\s\S]*?height: clamp\(60px, 10dvh, 72px\)/);
  assert.match(learner, /<nav className=\{styles\.journey\} aria-label=\{t\.fiveLessons\}>/);
  assert.match(learner, /data-energywork-next/);
});
