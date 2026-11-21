import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const page = readFileSync(new URL("../app/[locale]/holistic-support/mandala/page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../components/mandala-video-goal-refresh.css", import.meta.url), "utf8");
const studio = readFileSync(new URL("../components/mandala-free-video-studio.tsx", import.meta.url), "utf8");
const director = readFileSync(new URL("../components/mandala-auto-video-director.tsx", import.meta.url), "utf8");

test("Video Studio imports the route-scoped mobile Goal refresh", () => {
  assert.match(page, /import ["']@\/components\/mandala-video-goal-refresh\.css["']/);
  assert.match(page, /data-mandala-mode=\{photoMode \? "photo" : "video"\}/);
  assert.match(css, /@media \(max-width:759px\)/);
  assert.match(css, /\[data-mandala-mode="video"\] \[data-active-workspace="video"\]/);
  assert.doesNotMatch(css, /\[data-active-workspace="(?:editor|phrases|effects|pro|ready)"\]/);
});

test("Goal cards are readable and preserve the original director controls", () => {
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
  assert.match(css, /min-height:118px!important/);
  assert.match(css, /font-size:clamp\(14px,3\.95vw,16px\)!important/);
  assert.match(css, /min-height:46px!important/);
  assert.match(studio, /data-video-director-goal-controls/);
  assert.match(director, /data-auto-video-category=\{item\.id\}/);
  assert.match(director, /aria-pressed=\{selectedCategoryId===item\.id&&goalCategoryAnswered&&!requestNeedsChoice\}/);
});

test("Mobile tabs retain six working workspaces; the one video player remains intact", () => {
  assert.match(css, /\[data-video-quick-controls\] \{/);
  assert.match(css, /overflow-x:auto!important/);
  assert.match(css, /font:750 13px\/1\.16 Arial/);
  assert.match(css, /min-height:56px!important/);
  assert.match(css, /font-size:16px!important/);
  assert.match(studio, /data-video-quick-control=\{item\.id\}/);
  assert.match(studio, /data-video-preview-toggle/);
  assert.match(studio, /data-video-continue-scenarios/);
  assert.match(studio, /onClick=\{continueToIdeas\}/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});


test("Continue is hidden only in unfinished self quiz, never after switching to recipient",()=>{
  // WebKit real-user flow: finish 3-step self quiz, switch to 'others' (resets
  // step to 1), select Greeting/Birthday and tap Continue to Ideas once.
  // Old unqualified selector hid the enabled Continue in both audiences.
  assert.match(studio, /data-video-topic-section\s+data-video-goal-quiz-step=\{goalQuizState\.step\}\s+data-video-goal-quiz-audience=\{goalQuizState\.audience\}/);
  assert.match(css, /\[data-video-topic-section\]\[data-video-goal-quiz-step="1"\]\[data-video-goal-quiz-audience="self"\] \[data-video-stage-actions="goal"\]/);
  assert.doesNotMatch(css, /\[data-video-topic-section\]\[data-video-goal-quiz-step="1"\] \[data-video-stage-actions="goal"\]/);
  assert.match(director, /const resetAudienceStory=\(\)=>\{\s+setGoalQuizStep\(1\)/);
  assert.match(studio, /data-video-continue-scenarios[\s\S]*?onClick=\{continueToIdeas\}/);
});

test("Life/Work keeps recipient flow, but the obsolete audience switch cannot return",()=>{
  const webkit = readFileSync(new URL("../scripts/verify-affirmation-voice-browser.mjs", import.meta.url), "utf8");
  assert.match(director,/data-video-quick-scope=\{scope\}/);
  assert.match(director,/changeVideoAudience\(scope==="life"\?"self":"others"\)/);
  assert.match(webkit,/\[data-video-quick-scope="work"\]/);
  assert.match(webkit,/\[data-auto-video-audience\]'\)\)\.toHaveCount\(0\)/);
  assert.match(webkit,/await work\.tap\(\)/);
  assert.match(webkit,/data-video-recipient-catalog/);
  assert.match(webkit,/data-video-recipient-audio-transcribe/);
  assert.match(css,/\[data-video-goal-quiz-audience="self"\]/);
});
