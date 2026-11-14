import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const studio=read("components/mandala-free-video-studio.tsx");
const ready=read("components/mandala-video-ready.tsx");

test("Goal and every Montage Generate action open Ready without recording",()=>{
 const nav=studio.slice(studio.indexOf("const goToReadyForGeneration="),
  studio.indexOf("const createQuickVideo ="));
 assert.match(nav,/setReadyGenerationPending\(true\)/);
 assert.match(nav,/setActiveWorkspace\("ready"\)/);
 assert.doesNotMatch(nav,/createQuickVideo\(|createVideo\(|videoCreditRequest|renderFrame|setResult/);
 const goal=studio.slice(studio.indexOf("const generateFromGoal="),
  studio.indexOf("const openVideoScenarioStep"));
 assert.match(goal,/goalContinueRef\.current\?\.\(\)!==false/);
 assert.match(goal,/return goToReadyForGeneration\(\)/);
 assert.doesNotMatch(goal,/createQuickVideo|createVideo/);
 const text=studio.slice(studio.indexOf("<MandalaVideoIdeas locale"),
  studio.indexOf("status={notice}/>",studio.indexOf("<MandalaVideoIdeas locale"))+17);
 assert.match(text,/onGenerate=\{goToReadyForGeneration\}/);
 const footer=studio.slice(studio.indexOf('data-video-stage-actions="montage"'),
  studio.indexOf('data-video-narration-reapproval',studio.indexOf('data-video-stage-actions="montage"')));
 assert.match(footer,/data-video-quick-generate/);
 assert.match(footer,/onClick=\{goToReadyForGeneration\}/);
 assert.doesNotMatch(footer,/onClick=\{createQuickVideo\}/);
 const free=studio.slice(studio.indexOf("onChooseFree={()=>"),studio.indexOf("onChooseCharacter={()=>"));
 assert.match(free,/goToReadyForGeneration\(\)/);
 assert.doesNotMatch(free,/createQuickVideo\(|startFromHero\(|createVideo\(/);
 assert.match(studio,/data-video-stage-generate="goal"/);
 assert.match(studio,/data-free-video-create[^\n]*onClick=\{goToReadyForGeneration\}/);
});

test("Ready alone starts guarded generation and a prior result is preserved",()=>{
 assert.match(studio,/video=\{!readyGenerationPending&&result/);
 assert.match(studio,/verified=\{Boolean\(!readyGenerationPending&&result/);
 assert.match(studio,/setReadyGenerationPending\(false\)/);
 assert.match(studio,/onGenerateBasicVideo=\{\(\)=>\{/);
 assert.match(studio,/return createQuickVideo\(\)/);
 assert.match(ready,/onClick=\{generateSelectedVideo\} data-ready-generate/);
 assert.match(ready,/onGenerateBasicVideo\(\)/);
 assert.match(ready,/data-ready-save/);
 assert.match(ready,/data-ready-video-tiers/);
 assert.match(ready,/data-ready-state=\{completed\?"complete":"choose"\}/);
});
