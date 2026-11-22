import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const extra=read("components/mandala-montage-extra-personal.tsx");
const studio=read("components/mandala-free-video-studio.tsx");
const ideas=read("components/mandala-video-ideas.tsx");
const css=read("components/mandala-video-personal-compact.module.css");
const browser=read("scripts/verify-affirmation-voice-browser.mjs");

test("owner-approved Extra contains one photographic 0/0/+50 XP selector in EN/RU/ES",()=>{
 for(const id of ["simple","support","personal"])assert.ok(extra.includes('id:"'+id+'"'),id);
 for(const photo of ["sun-autumn-hills.jpg","heart-flow.jpg","sun-warm-ocean-dawn.jpg"])
  assert.ok(extra.includes(photo),photo);
 for(const language of ["en:","ru:","es:"])assert.ok(extra.includes(language),language);
 for(const mode of ["simple","standard","personalized"])
  assert.ok(extra.includes('mode:"'+mode+'"'),mode);
 assert.match(extra,/data-video-extra-text-option={card\.id}/);
 assert.match(extra,/aria-pressed={selected===card\.id}/);
 assert.match(extra,/onClick=\{\(\)=>setSelected\(card\.id\)\}/);
 assert.match(extra,/data-video-extra-continue/);
 assert.match(extra,/onClick=\{\(\)=>actions\[selected\]\(\)\}/);
 assert.match(extra,/No credits are charged here/);
 assert.match(extra,/\+50 XP\*/);
 assert.doesNotMatch(extra,/fetch\(|postVideoCreditAction|localStorage/);
 assert.match(css,/\.extraChoices \.extraPhotoCard/);
 assert.match(css,/@media\(max-width:359px\)/);
 assert.match(css,/@media\(min-width:760px\)/);
});

test("Montage text type chooser is not duplicated after Extra; only Support opens Text",()=>{
 const start=studio.indexOf('montagePanel==="promo" ? <>');
 const end=studio.indexOf('montagePanel==="concept" ?',start);
 assert.ok(start>0&&end>start);
 const extraMarkup=studio.slice(start,end);
 assert.match(extraMarkup,/<MandalaMontageExtraPersonal/);
 assert.match(extraMarkup,/data-video-extra-advanced-formats/);
 assert.match(extraMarkup,/<MandalaMontageProOffer/);
 assert.doesNotMatch(studio,/<MandalaMontageTextChoice/);
 assert.match(studio,/extraTextChoice==="support"&&montageTextStage==="edit"/);
 assert.match(studio,/onSupport=\{\(\)=>\{/);
 assert.match(studio,/setMontagePanel\("text"\);setNotice\(""\)/);
 assert.match(studio,/onSimple=\{\(\)=>\{/);
 assert.match(studio,/setMontagePanel\("concept"\);setNotice\(""\)/);
});

test("standard 0 XP phrases are based on film category only, not user answers",()=>{
 assert.match(studio,/requestText="" profile={undefined} languagePicker phraseMode="standard"/);
 assert.match(studio,/goalType="support" selectedTopicId={null}/);
 assert.match(ideas,/if\(phraseMode==="standard"\)return suggestBasicSupportPhrases/);
 assert.match(ideas,/const candidates=phraseMode==="standard"\?/);
 assert.match(ideas,/const sourceBasic=phraseMode==="standard"/);
 assert.match(ideas,/const targetBasic=phraseMode==="standard"/);
 assert.match(studio,/setHypnoSpeechSource\(null\);setHypnoSpeechText\(""\)/);
});

test("Personal phrase editor mounts only after Concept approval and guards +50 XP",()=>{
 assert.match(studio,/setPersonalPhrasesOpen\(extraTextChoice==="personal"\)/);
 assert.match(studio,/data-video-personal-phrases/);
 assert.match(studio,/active=\{activeWorkspace==="phrases"&&ideasSubtab==="concept"\}/);
 assert.match(studio,/data-video-personal-eight-axes-page/);
 assert.match(studio,/data-video-text-premium-unavailable/);
 assert.match(studio,/if\(extraTextChoice!=="personal"&&montageTextMode!=="personalized"\)return false/);
 for(const fn of ["const startFromHero=()=>","const openReadyForGeneration = () =>",
                  "const createQuickVideo = () =>","const generateExpressFromCurrent=()=>"]){
  const i=studio.indexOf(fn);assert.ok(i>0,fn);
  assert.ok(studio.slice(i,i+210).includes("if(blockUnpricedPersonalExport())return false"),fn+" guarded");
 }
});

test("real macOS WebKit checks Extra photo cards, private editor and guards export",()=>{
 assert.match(browser,/MONTAGE_EXTRA_3_TAPPABLE_CARDS_/);
 assert.match(browser,/personalized-unpriced-export-fail-closed/);
 assert.match(browser,/standard-mode-after-personalized-draft/);
 assert.match(browser,/data-video-personal-phrases/);
 assert.match(browser,/data-video-text-direct-create/);
 assert.match(browser,/Text controls must be at least 44x44/);
 assert.match(browser,/start-media-recorder/);
 assert.match(browser,/ffprobe/);
});
