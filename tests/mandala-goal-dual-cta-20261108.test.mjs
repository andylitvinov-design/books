import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const studio=read("components/mandala-free-video-studio.tsx");
const css=read("components/mandala-video-mobile.module.css");
const shell=read("components/mandala-meditation.module.css");
const page=read("app/[locale]/holistic-support/mandala/page.tsx");

test("Goal reuses one existing Generate and one separate personalization action",()=>{
 const goal=studio.slice(studio.indexOf("data-video-goal-topic-title"),studio.indexOf("data-video-ihelp-backdrop"));
 assert.equal((goal.match(/data-video-stage-generate="goal"/g)||[]).length,1);
 assert.equal((goal.match(/data-video-continue-scenarios/g)||[]).length,1);
 assert.ok(goal.indexOf("data-video-director-topic-controls")<goal.indexOf('data-video-stage-generate="goal"'));
 assert.ok(goal.indexOf('data-video-stage-generate="goal"')<goal.indexOf("data-video-continue-scenarios"));
 assert.match(goal,/data-video-stage-generate="goal"[\s\S]*?onClick=\{generateFromGoal\}/);
 assert.match(goal,/data-video-continue-scenarios[\s\S]*?onClick=\{continueToIdeas\}/);
 for(const label of ["Generate video","Proceed to personalization","Создать видео","Перейти к персонализации",
   "Generar vídeo","Continuar a personalización"]) assert.ok(goal.includes(label),label);
 assert.doesNotMatch(goal,/data-video-goal-generate|onClick=\{createQuickVideo\}/,"no duplicate renderer CTA");
});

test("Goal applies recipient scenes then opens Ready without recording; pricing is transparent",()=>{
 assert.match(studio,/const generateFromGoal=\(\)=>\{[\s\S]*?flushSync\(\(\)=>\{goalValid=goalContinueRef\.current\?\.\(\)!==false;\}\)/);
 assert.match(studio,/if\(!goalValid\)return false;[\s\S]*?return goToReadyForGeneration\(\)/);
 assert.doesNotMatch(studio,/freshGoalCreateRef/);
 assert.match(studio,/const createQuickVideo = \(\) => \{[\s\S]*?return startFromHero\(\)/);
 assert.match(studio,/void createVideo\(\)/);
 assert.match(studio,/creditCatalog\.priceCredits/);
 assert.equal((studio.match(/const generateFromGoal=/g)||[]).length,1);
});

test("320–430px has parallel readable controls, no bottom legacy blocks, intact Photo route",()=>{
 assert.match(css,/stageActionPair\[data-video-stage-actions="goal"\]\{[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/stageActionPair\[data-video-stage-actions="goal"\]>button\{[\s\S]*?min-height:68px/);
 assert.match(css,/stageActionPair\[data-video-stage-actions="goal"\]>\.quickGenerate small\{/);
 assert.match(css,/@media\(max-width:354px\)/);
 assert.match(css,/\[data-video-credit-status\]\{display:none!important\}/);
 for(const cls of [".voiceStudioLink",".advancedWorkbench",".caution"])
  assert.ok(shell.slice(shell.lastIndexOf("/* Video Studio ends")).includes(cls),cls);
 assert.match(shell,/\.caution\{display:none!important\}/);
 assert.match(page,/photoMode \? <MentalicaPhotoMandala/);
});
