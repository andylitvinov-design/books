import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const studio=read("components/mandala-free-video-studio.tsx");
const mirror=read("components/mandala-magic-mirror-goal.tsx");
const mirrorCss=read("components/mandala-magic-mirror-goal.module.css");
const mobile=read("components/mandala-video-mobile.module.css");
const personal=read("components/mandala-video-personalization.tsx");

test("Magic Mirror is one mobile skin over existing owner introduction and local renderer",()=>{
 assert.match(studio,/MandalaMagicMirrorTitle/);
 assert.match(studio,/MandalaMagicMirrorGoal/);
 assert.match(studio,/data-hh-mirror-advanced=\{mirrorAdvanced\?"true":"false"\}/);
 assert.match(studio,/data-video-therapy-intro="ready"/);
 assert.match(studio,/ref=\{introVideoRef\}/);
 assert.match(studio,/poster="\/images\/video-studio-presentation-ru\.jpg"/);
 assert.equal((studio.match(/data-mandala-cinematic-canvas/g)||[]).length,1);
 assert.equal((studio.match(/<MandalaAutoVideoDirector/g)||[]).length,1);
 assert.match(mobile,/\.studio\[data-active-workspace="video"\] \.previewStage \.heroWithRail:after/);
 assert.match(mobile,/data-hh-mirror-advanced="false"/);
 assert.match(mobile,/Preserve the two functional Intro \/ My Video actions/);
 assert.match(mobile,/\.previewStage \.heroRail button\{/);
 assert.match(mirrorCss,/@media\(max-width:359px\)/);
});
test("Four photographic goals and own prompt coexist, Life and Business are not recipient uploads",()=>{
 assert.equal((mirror.match(/id:"(energy|love|peace|abundance)"/g)||[]).length,4);
 assert.equal((mirror.match(/id:"(growth|team|focus|leadership)"/g)||[]).length,4);
 for(const text of ["For Me","For Business","Для себя","Для бизнеса","Para mí","Para mi negocio"])
  assert.ok(mirror.includes(text),text);
 assert.match(mirror,/data-hh-mirror-wish/);
 assert.match(mirror,/onWishChange\(selected\.request\[locale\]\)/);
 assert.match(mirror,/onContinue\(\)/);
 assert.match(mirror,/data-hh-mirror-more-goals/);
 assert.match(studio,/setIdeasSubtab\("personalization"\)/);
 assert.match(studio,/setMirrorDetailedWish\(wish\)/);
 assert.match(studio,/setVideoScenarioOpen\(true\)/);
 assert.match(studio,/mirrorDetailedWish=\{mirrorDetailedWish\}/);
 const director=read("components/mandala-auto-video-director.tsx");
 assert.match(director,/mirrorDetailedWish\?:string\|null/);
 assert.match(director,/setRequestDrafts\(previous=>previous\.self===mirrorDetailedWish/);
 assert.match(mirror,/clearAutoPrompt\(\);setSelectedId\(item\.id\)/);
 assert.doesNotMatch(studio,/\{activeWorkspace==="video"\?<></,
   "returning from Ideas must not reset the selected photo or audience");
 assert.match(studio,/activateQuickWorkspace\("phrases"\)/);
 assert.doesNotMatch(mirror,/fetch\(|localStorage|navigator\.sendBeacon|createQuickVideo\(/);
});
test("Third personalization prompt is current energy, with five steps and opt-in name",()=>{
 assert.match(personal,/type QuizStep=1\|2\|3\|4\|5;/);
 assert.match(personal,/data-personalization-kind="energy-current" hidden=\{quizStep!==3\}/);
 assert.match(personal,/data-personalization-kind="energy-desired" hidden=\{quizStep!==4\}/);
 assert.match(personal,/data-video-personalization-name-question hidden=\{quizStep!==5\}/);
 assert.doesNotMatch(personal,/data-personalization-kind="strength"/);
 assert.match(personal,/axes:\[\]/);
});
