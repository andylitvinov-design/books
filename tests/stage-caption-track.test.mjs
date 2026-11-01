import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {STAGE_CAPTION_LIMIT,normalizeStageCaption,stageCaptionAt}
  from "../lib/mandala/stage-caption-track.mjs";

const shots=[
  {sceneId:"a",startSeconds:0,durationSeconds:5,overlayText:"Мой первый шаг"},
  {sceneId:"b",startSeconds:5,durationSeconds:7,overlayText:""},
  {sceneId:"c",startSeconds:12,durationSeconds:10,overlayText:"Я выбираю близость"},
  {sceneId:"d",startSeconds:22,durationSeconds:8,overlayText:"Спокойное завершение"},
];
const plan={version:"hh-free-film-v2",durationSeconds:30,shots};

test("no text without a deliberate caption and no leak beyond its own stage",()=>{
  assert.equal(stageCaptionAt(plan,-1),null);
  assert.equal(stageCaptionAt(plan,5),null);
  assert.equal(stageCaptionAt(plan,11.5),null);
  assert.equal(stageCaptionAt(plan,30),null);
  assert.equal(stageCaptionAt(null,1),null);
  assert.equal(stageCaptionAt(plan,NaN),null);
  assert.equal(stageCaptionAt({shots:[]},1),null);
  assert.equal(stageCaptionAt(plan,3).text,"Мой первый шаг");
  assert.equal(stageCaptionAt(plan,12.5).text,"Я выбираю близость");
  assert.equal(stageCaptionAt(plan,22.5).text,"Спокойное завершение");
});

test("caption opacity fades at the stage boundaries without changing timing",()=>{
  assert.equal(stageCaptionAt(plan,0).alpha,0);
  assert.equal(stageCaptionAt(plan,.3).alpha,1);
  assert.ok(stageCaptionAt(plan,4.9).alpha<.5);
  assert.equal(stageCaptionAt(plan,12).alpha,0);
  assert.equal(shots[2].startSeconds,12);
  assert.equal(shots[2].durationSeconds,10);
});

test("caption normalization bounds content and strips controls without changing local goal",()=>{
  assert.equal(STAGE_CAPTION_LIMIT,96);
  assert.equal(normalizeStageCaption("  Я   иду\nвперёд\u0000  "),"Я иду вперёд");
  assert.equal(normalizeStageCaption("  Ｈｅｌｌｏ　world  "),"Hello world");
  assert.equal(normalizeStageCaption("🌿".repeat(100)).length,STAGE_CAPTION_LIMIT*2);
  assert.equal(normalizeStageCaption("x".repeat(200)).length,STAGE_CAPTION_LIMIT);
  assert.equal(normalizeStageCaption(null),"");
});

test("mobile editor has real stage text inputs and uses one existing sound control",()=>{
  const ui=readFileSync(new URL("../components/mandala-auto-video-director.tsx",import.meta.url),"utf8");
  const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
  const types=readFileSync(new URL("../components/mandala-cinematic-director.tsx",import.meta.url),"utf8");
  assert.match(ui,/data-auto-video-text-track/);
  assert.match(ui,/data-auto-video-stage-caption=\{index\}/);
  assert.match(ui,/maxLength=\{STAGE_CAPTION_LIMIT\}/);
  assert.match(ui,/captionTexts:stageCaptions/);
  assert.match(ui,/data-auto-video-sound-track/);
  assert.match(studio,/paintStageCaptionOverlay\(ctx,0,cinematicPlan\)/);
  assert.match(studio,/paintStageCaptionOverlay\(ctx,frameSecond,cinematicPlan\)/);
  assert.match(studio,/paintStageCaptionOverlay\(ctx,frameTime,cinematicPlan\)/);
  assert.match(studio,/stageCaptionAt\(plan,cinematicPreviewSeconds\(plan,time\)\)/);
  assert.match(studio,/shot\.overlayText/);
  assert.match(studio,/captionTexts:readonly string\[\]/);
  assert.match(types,/overlayText\?:string/);
  assert.match(studio,/onOpenAudio=\{\(\)=>openQuickDetailed\("video-audio"\)\}/);
  assert.doesNotMatch(ui,/\bfetch\s*\(|\blocalStorage\b|sessionStorage/);
});
