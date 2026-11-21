import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const studio=read("components/mandala-free-video-studio.tsx");
const director=read("components/mandala-auto-video-director.tsx");
const mirror=read("components/mandala-magic-mirror-goal.tsx");
const mirrorCss=read("components/mandala-magic-mirror-goal.module.css");
const mobile=read("components/mandala-video-mobile.module.css");
const personal=read("components/mandala-video-personalization.tsx");
const browser=read("scripts/verify-affirmation-voice-browser.mjs");

test("approved Magic Mirror is a mobile skin over one authentic video player and Canvas/MP4",()=>{
 assert.match(studio,/MandalaMagicMirrorTitle/);
 assert.match(studio,/MandalaMagicMirrorGoal/);
 assert.match(studio,/data-video-therapy-intro="ready"/);
 assert.match(studio,/ref=\{introVideoRef\}/);
 assert.match(studio,/poster="\/images\/video-studio-presentation-ru\.jpg"/);
 assert.equal((studio.match(/data-mandala-cinematic-canvas/g)||[]).length,1);
 assert.equal((studio.match(/<MandalaAutoVideoDirector/g)||[]).length,1);
 assert.match(mobile,/\.previewStage \.heroWithRail:after/);
 assert.match(mobile,/Preserve the two functional Intro \/ My Video actions/);
 assert.match(mobile,/data-hh-mirror-advanced="false"/);
 assert.match(mirrorCss,/@media\(max-width:359px\)/);
});

test("photographic cards and typed own wish enter original 4x4x4 category → topic, not Ideas directly",()=>{
 for(const label of ["For Me","For Business","Для себя","Для бизнеса","Para mí","Para mi negocio"])
  assert.ok(mirror.includes(label),label);
 assert.equal((mirror.match(/categoryId:"(goals-money|love-relationships|energy-confidence|stress-anxiety)"/g)||[]).length,8);
 assert.match(mirror,/data-hh-mirror-wish/);
 assert.match(mirror,/onContinue\(selected\.theme,selected\.categoryId,goalText\)/);
 assert.match(mirror,/clearAutoPrompt\(\);setSelectedId\(item\.id\)/);
 assert.match(studio,/mirrorStartRef\.current\?\.\(selectedTheme,categoryId,goalText\)/);
 assert.match(studio,/setVideoScenarioOpen\(true\)/);
 assert.match(studio,/mirrorDetailedWish=\{mirrorDetailedWish\}/);
 assert.match(studio,/mirrorStartRef=\{mirrorStartRef\}/);
 assert.match(director,/mirrorStartRef\?:\{current:/);
 assert.match(director,/chooseCategory\(nextTheme,categoryId,confirmedWish\)/);
 assert.match(director,/setGoalCategoryAnswered\(true\);setGoalQuizStep\(2\)/);
 assert.match(director,/setRequestDrafts\(previous=>previous\.self===mirrorDetailedWish/);
 assert.doesNotMatch(mirror,/fetch\(|localStorage|navigator\.sendBeacon|createQuickVideo\(/);
 assert.match(browser,/data-hh-mirror-more-goals/);
 assert.match(browser,/data-hh-mirror-next/);
 assert.match(browser,/data-video-goal-quiz-progress/);
});
test("preserve protected purpose-first Goal and adaptive Personalization to Concept",()=>{
 assert.match(studio,/useState<"personalization"\|"goal"\|"concept">\("goal"\)/);
 assert.match(studio,/disabled=\{!chosenIdeaGoal\} onClick=\{\(\)=>setIdeasSubtab\("personalization"\)\}/);
 assert.match(studio,/applyPurposePhrases\(chosenIdeaGoal\.type,ideasProfile\.supportNeed\|\|""\)/);
 for(const line of ['goalType==="leisure"','["desired","energy","name"]',
   '["current","desired","support","energy","name"]',
   '["current","desired","meaning","energy","name"]',
   'data-personalization-kind="energy-current" hidden={stage!=="energy"}',
   'data-video-personalization-energy={score}'])
   assert.ok(personal.includes(line),line);
 assert.match(personal,/className=\{css\.energyScale\}/);
 assert.match(personal,/energyStart:value\.energy>=1\?value\.energy:undefined/);
});
