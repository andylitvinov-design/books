import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");

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
