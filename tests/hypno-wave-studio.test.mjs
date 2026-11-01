import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildWaveNarrativeDraft} from "../lib/mandala/hypno-wave-engine.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Wave v2 stages an on-device draft in the canonical Hypno editor",()=>{
  const ui=read("components/mandala-hypno-compact.tsx");
  const studio=read("components/mandala-free-video-studio.tsx");
  assert.match(ui,/data-hypno-model="wave"/);
  assert.match(ui,/currentText:problemNote,goalText:goalNote/);
  assert.match(ui,/if\(result.status==="safety_handoff"\)/);
  assert.match(ui,/phrases:\[\],selected:\[\]/);
  assert.match(ui,/data-hypno-approve/);
  const approve=ui.split('  function approvePhrases()')[1].split('  const selectedScene=')[0];
  assert.match(approve,/if\(!draft.selected.length\)return/);
  assert.match(approve,/presetOverride:draft.phrases/);
  assert.match(approve,/onChange\(next\)/);
  assert.match(studio,/MandalaHypnoCompact/);
  assert.match(ui,/body:JSON.stringify\(\{\.\.\.waveInput,externalModelOptIn:true\}\)/);
  assert.doesNotMatch(ui,/body:JSON.stringify\(\{\.\.\.waveInput,(?:problemNote|goalNote)/);
});

test("changing notes or selected inputs invalidates unapproved Wave suggestions",()=>{
  const ui=read("components/mandala-hypno-compact.tsx");
  assert.match(ui,/requestKey=JSON.stringify\(\[waveInput,problemNote,goalNote\]\)/);
  assert.match(ui,/draftState\?\.model===model&&draftState.key===requestKey\?draftState:null/);
  assert.match(ui,/const waveInput=\{locale,theme,problemIndex,goalId:extraGoal,tone,focus,kind,length\}/);
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
