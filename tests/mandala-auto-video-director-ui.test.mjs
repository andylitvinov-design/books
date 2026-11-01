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

test("changing a shared video goal or theme invalidates stale Auto Director confirmation",()=>{
  assert.match(director,/const \[proposalContext,setProposalContext\]=useState/);
  assert.match(director,/proposalContext\?\.goal===goal&&/);
  assert.match(director,/proposalContext\.theme===theme/);
  assert.match(director,/activePresetId!==null&&activePresetId===chosen\?\.id/);
  assert.match(director,/aria-pressed=\{showProposal&&selectedGoalId===item\.id\}/);
  assert.match(director,/setProposalContext\(\{goal,theme\}\)/);
  assert.match(director,/setProposalContext\(\{goal:nextGoal,theme\}\)/);
  assert.match(director,/\{showProposal\?<div className=\{css\.result\}/);
  assert.match(studio,/onGoalChange=\{next=>\{setWish\(graphemeInput\(next\)\)/);
});

import {graphemeInput,graphemeTrim} from "../lib/mandala/personal-video-intent.mjs";

test("iPhone goal editor retains spaces during typing, while captions can trim final text",()=>{
  assert.equal(graphemeInput("Любовь "), "Любовь ");
  assert.equal(graphemeInput("Любовь и близость "), "Любовь и близость ");
  assert.equal(graphemeTrim("Любовь и близость "), "Любовь и близость");
  assert.equal(graphemeInput("Hello world "), "Hello world ");
});

test("Auto Director is after the actual music section and has four tappable alternatives",()=>{
  assert.ok(studio.indexOf('data-video-director-after-music') > studio.indexOf('data-video-quick-audio-choices'));
  assert.ok(studio.indexOf('data-video-director-after-music') > studio.indexOf('id="video-hero"'));
  assert.match(director,/data-auto-video-choices/);
  assert.match(director,/data-auto-video-story=\{item\.id\}/);
  assert.match(director,/aria-pressed=\{chosen\.id===item\.id\}/);
  assert.equal((studio.match(/<MandalaAutoVideoDirector/g)||[]).length,1);
});

test("Six visible Video Studio tabs stay in one compact row and goal CTAs reuse lower director",()=>{
  const css=read("components/mandala-video-mobile.module.css");
  assert.ok(studio.includes("compactWorkspaceTabs[locale][item.id]"));
  assert.ok(css.includes(".studio .quickVideoNav{grid-template-columns:repeat(6,minmax(0,1fr))"));
  assert.ok(!css.includes(".studio .quickVideoNav{grid-template-columns:repeat(3"));
  assert.ok(studio.includes("data-video-quick-propose"));
  assert.ok(studio.includes("data-video-quick-goal-edit"));
  assert.ok(studio.includes('querySelector<HTMLButtonElement>("[data-auto-video-suggest]")'));
  assert.ok(studio.includes('querySelector<HTMLInputElement>("[data-first-video-wish]")'));
});
