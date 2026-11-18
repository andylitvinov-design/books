import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {buildShortMeditationChoices} from "../lib/mandala/short-meditation-choices.mjs";
import {meditationNarrationEstimate} from "../lib/mandala/meditation-narration.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("Two complete local scripts are ready before user generation, with 30-second-scale narration",()=>{
 for(const locale of ["ru","en","es"]){
  for(const theme of ["energy","money","relationships","goals","life","health"]){
   const result=buildShortMeditationChoices({locale,theme,focus:{goal:""}});
   assert.equal(result.safe,true,locale+" "+theme);
   assert.equal(result.durationSeconds,30);
   assert.equal(result.items.length,2);
   assert.notEqual(result.items[0].text,result.items[1].text);
   assert.ok(result.items.every(item=>item.title&&item.text.length>120));
   for(const item of result.items){
    const seconds=meditationNarrationEstimate(item.text,0.9);
    assert.ok(seconds>=12&&seconds<=40,locale+" "+theme+" "+item.id+" estimated "+seconds+"s");
    assert.doesNotMatch(item.text,/https?:\/\/|OpenRouter|Gemini|subscribe|pay to|диагноз/iu);
   }
  }
 }
});

test("Both options adapt to context and regenerate locally without external calls",()=>{
 const first=buildShortMeditationChoices({locale:"en",theme:"relationships",cycle:0});
 const newPair=buildShortMeditationChoices({locale:"en",theme:"relationships",cycle:1});
 const energy=buildShortMeditationChoices({locale:"en",theme:"energy",cycle:0});
 assert.notEqual(first.items[0].title,energy.items[0].title);
 assert.notEqual(first.items[0].text,energy.items[0].text);
 assert.notEqual(first.items[0].text,newPair.items[0].text);
 assert.notEqual(first.items[1].text,newPair.items[1].text);
 const personalized=buildShortMeditationChoices({
  locale:"ru",theme:"goals",focus:{goal:"Спокойно вести важный разговор"}
 });
 assert.match(personalized.items[0].text,/Спокойно вести важный разговор/);
 const src=read("lib/mandala/short-meditation-choices.mjs");
 assert.doesNotMatch(src,/\bfetch\s*\(|localStorage|sessionStorage|supabase|renderVideo|stripe|API_KEY/);
});

test("Safety response forbids meditation choice and course upsell for crisis content",()=>{
 for(const [locale,wish] of [["ru","хочу умереть"],["en","I want to die"],["es","quiero morir"]]){
  const result=buildShortMeditationChoices({locale,theme:"energy",wish});
  assert.equal(result.safe,false,locale);
  assert.equal(result.items.length,0);
  assert.ok(result.warning.length>60);
 }
});

test("Existing Therapy editor switches approved text to the actual Voice tab",()=>{
 const parent=read("components/mandala-free-video-studio.tsx");
 const host=read("components/mandala-therapy-studio.tsx");
 const editor=read("components/mandala-personal-meditation.tsx");
 const css=read("components/mandala-personal-meditation.module.css");
 const stageCss=read("components/mandala-video-mobile.module.css");
 assert.match(parent,/editor=\{\(isCourse,onApproved\)=><MandalaPersonalMeditation/);
 assert.match(parent,/onApproved=\{onApproved\}/);
 assert.match(host,/editor\(isCourse,text=>/);
 assert.match(host,/onMeditationApproved\?\.\(text\)/);
 assert.match(host,/setPane\("voice"\)/);
 assert.match(editor,/setShortApproval\(\{key:shortKey,index:shortTab,text:currentText\}\)/);
 assert.match(editor,/onApproved\?\.\(currentText\)/);
 assert.match(editor,/data-meditation-choices-ready=/);
 assert.match(editor,/data-meditation-choice=\{index\}/);
 assert.match(editor,/data-meditation-approve/);
 assert.match(editor,/data-meditation-script/);
 const voice=read("components/mandala-affirmation-voice.tsx");
 assert.match(parent,/approvedMeditationText=\{activeWorkspace==="effects"\?approvedMeditationText:""\}/);
 assert.match(voice,/approvedMeditationText\?:string/);
 assert.match(voice,/data-video-therapy-approved-meditation/);
 assert.match(editor,/onNarrationInvalidated\?\.\(\)/);
 assert.match(css,/\.shortBody\{[^}]*max-height:clamp/);
 assert.match(css,/\.shortText\{[^}]*white-space:pre-line/);
 assert.match(stageCss,/\[data-active-workspace="effects"\] \[data-video-live-stage\]\{display:none!important\}/);
 assert.doesNotMatch(host,/data-therapy-format-switch|data-therapy-format="/);
 assert.match(host,/"meditation","voice","practice","course"/);
});

test("An approved A/B narration is revoked when the goal or scenario changes",()=>{
 const parent=read("components/mandala-free-video-studio.tsx");
 assert.match(parent,/const meditationScenarioIdentity=JSON\.stringify\(\[/);
 assert.match(parent,/theme,wish,sceneName,caption,speed,brightness,meditationFocus,/);
 assert.match(parent,/if\(approvedScenarioRef\.current===meditationScenarioIdentity\)return/);
 assert.match(parent,/approvedScenarioRef\.current=meditationScenarioIdentity;\s*setApprovedMeditationText\(""\);/);
 assert.match(parent,/\(activeWorkspace==="effects"&&spoken===approvedMeditationText\)/);
});
