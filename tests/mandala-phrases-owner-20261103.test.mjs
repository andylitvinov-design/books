import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const studio=source("components/mandala-free-video-studio.tsx");
const studioCss=source("components/mandala-video-mobile.module.css");
const phrases=source("components/mandala-hypno-compact.tsx");
const voice=source("components/mandala-affirmation-voice.tsx");
const recorder=source("components/mandala-local-voice-tracks.tsx");

test("approved six Studio tabs lead the wide video preview on mobile",()=>{
  assert.match(studio,/const workspaceTabs=\[\s*\{id:"video",Icon:Film\},\s*\{id:"phrases",Icon:Heart\},\s*\{id:"editor",Icon:Scissors\}/);
  assert.match(studio,/ru:\{video:"Цель",editor:"Монтаж",phrases:"Идеи"/);
  assert.equal((studio.match(/<nav className=\{videoStyles\.quickVideoNav\}/g)||[]).length,1);
  assert.ok(studio.indexOf("data-video-quick-controls")<studio.indexOf("data-video-live-stage"));
  assert.doesNotMatch(studio,/createPortal\(nav|effectsNavTarget|montageNavTarget/);
  const latest=studioCss.slice(studioCss.lastIndexOf("/* 04 Nov owner visual recovery"));
  assert.match(latest,/quickBuilder>\.quickVideoNav\s*\{[^}]*order:1!important/);
  assert.match(latest,/quickBuilder>\.previewStage\s*\{[^}]*order:2!important/);
  assert.match(latest,/aspect-ratio:16\/9!important/);
  assert.match(studio,/Как работают фразы поддержки/);
});

test("five phrase rows remain interactive, editable, and approval-gated",()=>{
  assert.match(phrases,/candidates\.map\(\(sentence,i\)=>/);
  assert.match(phrases,/data-hypno-phrase=\{i\}/);
  assert.match(phrases,/className=\{css\.phraseNumber\}/);
  assert.match(phrases,/className=\{css\.phraseEdit\}/);
  assert.match(phrases,/data-hypno-approve disabled=\{disabled\|\|safetyBlocked/);
  assert.match(phrases,/onClick=\{onApply\?\?onCreate\}/);
  assert.match(phrases,/data-hypno-select-tone/);
  assert.match(phrases,/data-hypno-select-focus/);
  assert.match(phrases,/data-hypno-select-length/);
});

test("exactly three voice modes reuse the existing export path",()=>{
  assert.match(voice,/\(\["female","male","own"\] as const\)/);
  assert.match(voice,/VOICE_STUDIO_VOICES\.filter/);
  assert.match(voice,/MandalaLocalVoiceTracks/);
  assert.match(recorder,/data-video-own-voice-record/);
  assert.match(recorder,/data-video-own-voice-track/);
  assert.match(recorder,/data-video-own-voice-attach/);
  assert.match(recorder,/navigator\.mediaDevices\.getUserMedia/);
  assert.match(recorder,/URL\.revokeObjectURL/);
  assert.match(studio,/clip\.source==="local"/);
  assert.match(studio,/nonLoop:true/);
  assert.match(studio,/onDetachLocal=\{file=>/);
});

test("Phrases hides redundant film and music settings without removing them from other tabs",()=>{
  assert.match(studioCss,/data-active-workspace="phrases"\]\s*\.phraseMusicSection/);
  assert.match(studioCss,/data-active-workspace="phrases"\]\s*\.phraseAudioSettings/);
  assert.match(studioCss,/data-active-workspace="phrases"\]\s*\[data-hypno-video-advanced\]/);
  assert.match(studio,/data-workspace-section="effects"/);
  assert.match(studio,/data-workspace-section="editor"/);
});
