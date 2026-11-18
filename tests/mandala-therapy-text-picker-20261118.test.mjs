import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {buildShortMeditationOptions} from "../lib/mandala/short-meditation-options.mjs";
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
