import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {buildShortMeditationOptions} from "../lib/mandala/short-meditation-options.mjs";
import {requiresRealMediaWebKit} from "../lib/ci/merge-check-light.mjs";
const source=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("Two complete local 30-second meditation choices in EN RU ES; no remote generation",()=>{
 for(const locale of ["en","ru","es"]){
  const draft=buildShortMeditationOptions({locale,theme:"energy",request:"",revision:0});
  assert.equal(draft.status,"ready");
  assert.equal(draft.options.length,2);
  assert.deepEqual(draft.options.map(item=>item.id),["a","b"]);
  assert.notEqual(draft.options[0].text,draft.options[1].text);
  for(const option of draft.options){
   assert.equal(option.seconds,30);
   assert.ok(option.title&&option.text);
   assert.ok(option.text.trim().split(/\s+/u).length<=75,
    "the default text must fit a short narration without cropping");
   assert.ok(option.text.length>=150);
  }
  const revised=buildShortMeditationOptions({locale,theme:"energy",request:"",revision:1});
  assert.notEqual(revised.options[0].text,draft.options[0].text);
  assert.notEqual(revised.options[1].text,draft.options[1].text);
 }
 const custom=buildShortMeditationOptions({locale:"en",theme:"relationships",request:"speaking kindly with my partner"});
 assert.equal(custom.status,"ready");
 assert.match(custom.options[0].text,/speaking kindly with my partner/i);
});
test("Existing crisis guard prevents revealing any A/B choices",()=>{
 const result=buildShortMeditationOptions({locale:"ru",theme:"energy",request:"хочу умереть"});
 assert.equal(result.status,"safety");
 assert.equal(result.options.length,0);
 assert.ok(result.message.length>10);
});
test("Approved mobile screenshot uses one text editor, 4 subtabs and original voice flow",()=>{
 const studio=source("components/mandala-therapy-studio.tsx");
 const picker=source("components/mandala-therapy-text-picker.tsx");
 const css=source("components/mandala-therapy-text-picker.module.css");
 const parent=source("components/mandala-free-video-studio.tsx");
 const styles=source("components/mandala-video-mobile.module.css");
 assert.doesNotMatch(studio,/data-therapy-format-switch/);
 assert.match(studio,/\["meditation","voice","practice","course"\]/);
 assert.match(studio,/data-therapy-subtab=\{id\}/);
 assert.match(studio,/editor\(true\)/);
 assert.match(studio,/MandalaTherapyTextPicker/);
 assert.match(studio,/approvedText\?/);
 assert.match(studio,/MandalaCloudVoiceStudio/);
 assert.match(picker,/data-therapy-full-script/);
 assert.match(picker,/data-therapy-text-option=\{option\.id\}/);
 assert.match(picker,/data-therapy-approve-text/);
 assert.match(picker,/setEdits\(current=>/);
 assert.match(picker,/onInvalidate\(\)/);
 assert.match(picker,/onApprove\(script\.trim\(\)\)/);
 assert.match(picker,/data-therapy-regenerate-local/);
 assert.match(picker,/data-therapy-customize-text/);
 assert.match(css,/overflow-y:auto/);
 assert.match(styles,/data-active-workspace="effects"[\s\S]*?\.previewStage \.heroWithRail>\.hero/);
 assert.match(parent,/onNarrationReady=\{attachMeditationNarration\}/);
 assert.match(studio,/data-therapy-advanced-effects/);
 for(const s of [picker,studio,source("lib/mandala/short-meditation-options.mjs")])
  assert.doesNotMatch(s,/\bfetch\s*\(|checkout\(|localStorage|window\.open\(/);
});

test("Selected canonical scenario feeds two RU options and the original approved cloud narrator",()=>{
 const parent=source("components/mandala-free-video-studio.tsx");
 const studio=source("components/mandala-therapy-studio.tsx");
 const picker=source("components/mandala-therapy-text-picker.tsx");
 assert.match(parent,/scenarioId=\{approvedVideoConcept\?\.scenarioId \?\? null\}/);
 assert.match(studio,/scenarioId=\{scenarioId\}/);
 assert.match(studio,/data-therapy-scenario-id=\{scenarioId\|\|undefined\}/);
 assert.match(studio,/data-therapy-approved-voice/);
 assert.match(picker,/buildShortMeditationOptions\(\{locale,theme,request,revision,scenarioId\}\)/);
 const chosen=buildShortMeditationOptions({scenarioId:"life-purpose-s1",locale:"ru",theme:"goals"});
 assert.equal(chosen.options.length,2);
 assert.match(chosen.options[0].text,/Чужая карта успеха/);
 assert.match(chosen.options[1].text,/Свои ценности на горизонте/);
});

test("Therapy A/B remains gated by BASE-classified real macOS WebKit media acceptance",()=>{
 const workflow=source(".github/workflows/holistic-support-mandala.yml");
 const start=workflow.indexOf("  voice-webkit-macos:");
 const preflight=workflow.slice(workflow.indexOf("  webkit_preflight:"),start);
 assert.ok(start>=0&&preflight.length>0,"Existing preflight and macOS job are retained");
 assert.match(preflight,/requiresRealMediaWebKit\(changed\)/);
 assert.match(preflight,/media_required/);
 const job=workflow.slice(start,start+3000);
 assert.match(job,/needs\.webkit_preflight\.outputs\.media_required == 'true'/);
 assert.match(job,/runs-on: macos-15/);
 assert.match(job,/needs: \[webkit_preflight\]/);
 assert.doesNotMatch(job,/startsWith\(github\.head_ref, 'feat\/therapy-'\)/,
  "actual media changes, not the branch prefix, must require WebKit");
 assert.equal(requiresRealMediaWebKit([
  {filename:"components/mandala-free-video-studio.tsx",status:"modified"},
  {filename:"components/mandala-therapy-studio.tsx",status:"modified"}
 ]),true,"the real Therapy component delta must trigger macOS media QA");
 assert.equal(requiresRealMediaWebKit([
  {filename:"docs/design/THERAPY_STUDIO_TEXT_PICKER_APPROVED_20261118.md",status:"modified"}
 ]),false,"documentation-only changes cannot falsely require an encoder");
 for(const command of [
  "node scripts/verify-affirmation-voice-browser.mjs",
  "node scripts/benchmarking/first-video-live-export.mjs",
  "node scripts/benchmarking/verify-original-motion-export.mjs"
 ])assert.ok(workflow.includes(command),"retained real media evidence: "+command);
});

test("Native browser verifies real encoded speech before Therapy can revoke its attachment",()=>{
 const webkit=source("scripts/verify-affirmation-voice-browser.mjs");
 const generation=webkit.indexOf('await readyGenerate.click()');
 const encoded=webkit.indexOf('phase(engine,"encoded-audio-verified")');
 const later=webkit.indexOf('phase(engine,"therapy-approved-short-text-to-voice")');
 assert.ok(generation>0&&encoded>generation&&later>encoded);
 assert.match(webkit,/READY_CHECKIN_RENDER_NOT_OBSERVED/);
 assert.match(webkit,/data-ready-sequential-checkin/);
 assert.match(webkit,/const audioTrack=streams.find/);
 assert.match(webkit,/pcm\.stdout\.some/);
});
