import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const studio=read("components/mandala-free-video-studio.tsx");
const director=read("components/mandala-auto-video-director.tsx");
const policy=read("lib/mandala/auto-video-director.mjs");

test("Auto Video Director uses the original video workspace, player and recording",()=>{
  assert.ok(studio.includes("<MandalaAutoVideoDirector"));
  assert.ok(studio.includes("scenes={FREE_FILM_CATALOG}"));
  assert.ok(studio.includes("aspect={aspect}"));
  assert.ok(director.includes('aspect==="portrait"?"9:16":aspect==="square"?"1:1":"16:9"'));
  assert.ok(!director.includes("4 genuine MP4 clips · 16:9"));

  assert.ok(studio.includes("onApply={applyAutoFilm}"));
  assert.ok(studio.includes("showGoalInput={false}"));
  assert.ok(studio.includes('data-workspace-section="video"'));
  assert.ok(studio.includes("compileFreeFilmPreset(preset,locale,seconds"));
  assert.ok(studio.includes("setCinematicPlan(plan)"));
  assert.ok(studio.includes("MediaRecorder"));
  assert.equal((studio.match(/<MandalaAutoVideoDirector/g)||[]).length,1,"only one Auto Director");
});

test("one shared goal input, consented storyboard, explicit confirmation",()=>{
  assert.ok(director.includes("data-auto-video-shared-goal"));
  assert.ok(director.includes("showGoalInput ? ("));
  assert.ok(director.includes("data-auto-video-confirm"));
  assert.ok(director.includes("data-auto-video-goal={item.id}"));
  assert.ok(studio.includes("MandalaFirstVideoStart"));
  assert.ok(director.includes("scene.description[locale]"));
  assert.ok(director.includes("scene.tags.slice(0,3)"));
  assert.ok(director.includes("onClick={()=>onApply(chosen.id,length"));
});

test("free local-only planning never charges or exports the private goal",()=>{
  assert.ok(policy.includes("paidRenderApproved:false"));
  assert.ok(policy.includes("noExternalClientData:true"));
  assert.ok(!director.includes("fetch("));
  assert.ok(!policy.includes("localStorage"));
  assert.ok(!policy.includes("sessionStorage"));
});

test("Auto Director respects current 16:9, 9:16 or 1:1 selection rather than resetting the movie",()=>{
  assert.match(studio,/const applyAutoFilm=\(presetId:string,seconds:10\|15\|20\|30\|60,outputAspect:Aspect=aspect\)/);
  assert.match(studio,/compileFreeFilmPreset\(preset,locale,seconds,outputAspect\)/);
  assert.match(studio,/setAspect\(outputAspect\)/);
  assert.match(studio,/setCinematicPlan\(plan\)/);
});
