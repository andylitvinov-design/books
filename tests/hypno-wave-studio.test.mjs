import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildWaveNarrativeDraft} from "../lib/mandala/hypno-wave-engine.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Wave v2 is an optional on-device draft in the canonical approved Hypno editor",()=>{
  const ui=read("components/mandala-hypno-compact.tsx");
  const studio=read("components/mandala-free-video-studio.tsx");
  assert.match(ui,/data-hypno-wave-generate/);
  assert.match(ui,/data-hypno-wave-draft/);
  assert.match(ui,/data-hypno-wave-approve/);
  assert.match(ui,/data-hypno-wave-discard/);
  assert.match(ui,/currentText:problemNote,goalText:goalNote/);
  assert.match(ui,/if\(!waveDraft \|\| waveDraft\.status==="safety_handoff"/);
  assert.match(ui,/onClick=\{approveWave\}/);
  assert.match(ui,/presetOverride:waveDraft\.phrases/);
  assert.ok(ui.indexOf("const generateWave=()=>")<ui.indexOf("const approveWave=()=>"));
  assert.ok(ui.indexOf("data-hypno-wave-approve")<ui.indexOf("data-hypno-phrases"));
  assert.match(studio,/MandalaHypnoCompact/);
  assert.doesNotMatch(ui,/\bfetch\s*\(|XMLHttpRequest|navigator\.sendBeacon/);
});

test("changing the source notes invalidates unapproved Wave suggestions",()=>{
  const ui=read("components/mandala-hypno-compact.tsx");
  assert.match(ui,/setProblemNote\(event\.target\.value\);setWaveDraft\(null\)/);
  assert.match(ui,/setGoalNote\(event\.target\.value\);setWaveDraft\(null\)/);
  assert.match(ui,/setProblemIndex\(i\);setWaveDraft\(null\)/);
  assert.match(ui,/setGoalId\(id\);setWaveDraft\(null\)/);
  assert.match(ui,/disabled=\{disabled\|\|waveDraft\.status==="safety_handoff"/);
  assert.match(ui,/data-hypno-overview-enable/);
  assert.match(ui,/data-hypno-create-video/);
});

test("urgent notes produce only a non-clinical safety handoff, never video text",()=>{
  const urgent=buildWaveNarrativeDraft({
    locale:"en", theme:"health",problemIndex:0,goalId:"recovery",
    tone:"gentle",kind:"affirmation",focus:"calm",length:"medium",
    currentText:"I want to kill myself",goalText:"I want to rest",
    fallbackStrategy:"Non-clinical self-support",
    fallbackPhrases:["I have space for one calm step"]
  });
  assert.equal(urgent.status,"safety_handoff");
  assert.equal(urgent.phrases.length,0);
});
