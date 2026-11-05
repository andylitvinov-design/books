import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
const page=readFileSync(new URL("../app/[locale]/holistic-support/mandala/page.tsx",import.meta.url),"utf8");
const pageCss=readFileSync(new URL("../components/mandala-meditation.module.css",import.meta.url),"utf8");
const browser=readFileSync(new URL("../scripts/verify-holistic-mandala-browser.mjs",import.meta.url),"utf8");
const director=readFileSync(new URL("../components/mandala-auto-video-director.tsx",import.meta.url),"utf8");

test("video entry is goal, topic, request and actionable next step",()=>{
 const keys=["data-video-director-goal-controls","data-video-director-topic-controls",
   "data-video-request-prompt","data-video-continue-scenarios","<MandalaAutoVideoDirector"];
 for(let i=1;i<keys.length;i++)
   assert.ok(studio.indexOf(keys[i])>studio.indexOf(keys[i-1]),keys[i]);
 assert.equal((studio.match(/data-video-request-prompt/g)||[]).length,1,"one input");
 assert.match(studio,/data-video-scenario-open=\{videoScenarioOpen\?"true":"false"\}/);
 assert.match(studio,/setVideoScenarioOpen\(true\)/);
 assert.match(studio,/onClick=\{openVideoScenarioStep\}/);
 assert.match(css,/data-video-scenario-open="false"[\s\S]*?data-auto-video-director\]\{display:none!important\}/);
});

test("first phone screen hides redundant profile/extra scenarios and respects real 16:9",()=>{
 assert.match(css,/max-width:335px/);
 assert.match(css,/aspect-ratio:16\/9!important/);
 assert.match(css,/\[data-video-profile-recommendation\]\{display:none!important\}/);
 assert.match(css,/\[data-auto-video-popular-topics\]\{display:none!important\}/);
 assert.match(css,/\[data-mytube-subcategories\]/);
 assert.match(css,/\[data-auto-video-goal-panel\]  > \[role="group"\]/);
});

test("one working recorder, one director, EN/RU/ES and consent are preserved",()=>{
 assert.equal((studio.match(/data-mandala-cinematic-canvas/g)||[]).length,1);
 assert.equal((studio.match(/<MandalaAutoVideoDirector/g)||[]).length,1);
 for(const token of ["createQuickVideo","applyAutoFilm","data-mandala-master-mp4",
   "data-video-photo-consent","data-video-quick-generate",
   "1. Выберите цель видео","1. Choose your video goal","1. Elige el objetivo del vídeo",
   "3. Опишите ваш запрос","3. Describe your request","3. Describe tu idea"])
   assert.ok(studio.includes(token),token);
});

test("only the first mobile screen is compact; original actions remain at step two",()=>{
 assert.match(page,/data-mandala-mode=\{photoMode \? "photo" : "video"\}/);
 assert.match(pageCss,/\.page\[data-mandala-mode="video"\][^\n]*data-mentalica-studio-mode/);
 assert.match(studio,/data-video-open-photo-mandala/);
 assert.match(studio,/holistic-support\/mandala\?mode=photo/);
 assert.match(css,/\.quickBrandPhoto\{/);
 assert.match(css,/data-video-scenario-open="false"[\s\S]*?data-video-practice-shortcuts/);
 assert.match(css,/data-video-procedural-options/);
 assert.match(css,/data-video-first-video-advanced/);
 assert.match(css,/data-video-quick-legacy/);
 assert.match(css,/data-workspace-section="video":not\(\[data-video-topic-section\]\)/);
 assert.doesNotMatch(css,/overflow:hidden!important[\s\S]{0,100}quickPromptContinue/);
 assert.match(browser,/const checkFirstScreen=async height/);
 assert.match(browser,/height of \[820,700\]/);
 assert.match(browser,/g\.cta\.bottom<=g\.visibleBottom-6/);
 assert.match(browser,/await continueButton\.click\(\)/);
});

test("single first-screen Continue runs the same local classifier as the second-step Design control",()=>{
 assert.match(studio,/document\.querySelector<HTMLButtonElement>\("\[data-video-request-design\]"\)/);
 assert.match(studio,/if\(designButton&&!designButton\.disabled\)designButton\.click\(\)/);
 assert.match(director,/data-video-request-design/);
 assert.match(director,/onClick=\{designFromRequest\}/);
 assert.match(director,/classifyMyTubeRequest\(goal,locale\)/);
 assert.match(css,/data-active-workspace="video"[\s\S]*?data-video-request-composer\]>\[data-video-request-design\]/);
 assert.match(css,/data-video-scenario-open="false"[\s\S]*?data-video-request-composer\]>\[data-video-request-analysis\]/);
 assert.match(browser,/await expect\(quick\.locator\("\[data-video-request-design\]"\)\)\.toBeHidden\(\)/);
 assert.match(browser,/await expect\(quick\.locator\("\[data-video-request-design\]"\)\)\.toBeHidden\(\)/);
});

test("owner 05-Nov: Goals is first, Ideas second and receives the ONLY green CTA",()=>{
 const tabs=studio.match(/const workspaceTabs=\[([\s\S]*?)\] as const;/)?.[1];
 assert.ok(tabs,"registered tab destinations");
 assert.deepEqual([...tabs.matchAll(/id:"([a-z]+)"/g)].map(x=>x[1]),
   ["video","phrases","editor","effects","practices","pro"]);
 for(const label of ['video:{tab:"Цели"','phrases:{tab:"Идеи"',
   'video:{tab:"Goals"','phrases:{tab:"Ideas"','video:{tab:"Objetivos"'])
   assert.ok(studio.includes(label),label);
 for(const small of ['video:"Цели"','phrases:"Идеи"','video:"Goals"',
   'phrases:"Ideas"','video:"Metas"'])
   assert.ok(studio.includes(small),small);
 assert.match(studio,/data-video-continue-ideas="true"/);
 assert.match(studio,/onClick=\{continueToIdeas\}/);
 assert.match(studio,/const continueToIdeas = \(\) => \{[\s\S]*?setActiveWorkspace\("phrases"\)/);
 assert.match(studio,/setStudioMode\("pump"\)/);
 assert.match(browser,/await expect\(ideasTab\)\.toHaveAttribute\("aria-pressed","true"\)/);
 assert.match(browser,/await expect\(quick\.locator\('\[data-video-quick-phrases\]'\)\)\.toBeVisible\(\)/);
 assert.match(browser,/await goalsTab\.click\(\)/);
});
test("owner 05-Nov: Studio Warm Peach brand palette has one vivid emerald CTA",()=>{
 for(const token of ["--hh-studio-canvas:#FFF7F3","--hh-studio-surface:#FFFCFA",
   "--hh-studio-border:#EADFD9","--hh-studio-emerald:#07885F",
   "--hh-studio-forest:#14523F","--hh-studio-ink:#142B3D"]){
   assert.ok(css.includes(token),token);
 }
 assert.match(pageCss,/\.page\[data-mandala-mode="video"\]\{[\s\S]*?#FFF7F3/);
 assert.match(css,/quickPromptContinue\{[\s\S]*?background:var\(--hh-studio-emerald\)!important/);
 assert.match(browser,/assert\.equal\(colors\.primary,"rgb\(7, 136, 95\)"/);
 assert.match(browser,/assert\.equal\(colors\.card,"rgb\(255, 252, 250\)"/);
 assert.match(css,/\[data-video-request-composer\]>\[data-video-request-design\]\{\s*display:none!important/);
});
