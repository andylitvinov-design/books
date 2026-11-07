import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {MEANING_LINES,suggestMeaningPhrases} from "../lib/mandala/video-meaning-phrases.mjs";
const data=JSON.parse(readFileSync(new URL("../data/video-catalog/meaning-emotion-ideas-v1.json",import.meta.url),"utf8"));
const cmp=readFileSync(new URL("../components/mandala-video-ideas.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");
const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
test("eight exact canonical axes, all three languages, five safe unique phrases",()=>{
 const ids=data.axes.map(x=>x.id);
 assert.deepEqual(ids,["anchor","connection","freedom","agency","dignity","wholeness","meaning","growth"]);
 for(const lang of ["ru","en","es"]){
  assert.deepEqual(Object.keys(MEANING_LINES[lang]),ids);
  for(const id of ids){
   const phrases=suggestMeaningPhrases(lang,[id],"fatigue","calm",4,6);
   assert.equal(phrases.length,5);assert.equal(new Set(phrases).size,5);
   phrases.forEach(s=>assert.ok(Array.from(s).length<=36&&s.length>0,s));
  }
  const ref=suggestMeaningPhrases(lang,["anchor"],"fatigue","calm",4,6);
  for(const args of [[["agency"],"fatigue","calm",4,6],[["anchor"],"anxiety","calm",4,6],
    [["anchor"],"fatigue","hope",4,6],[["anchor"],"fatigue","calm",9,9]])
    assert.notDeepEqual(ref,suggestMeaningPhrases(lang,...args));
 }
});
test("compact Ideas screen uses actual selectors, sliders and one working Montage action",()=>{
 for(const marker of ["data-video-ideas-current","data-video-ideas-desired","data-video-ideas-state-score",
   "data-video-ideas-energy-score","data-video-meaning-axis","data-video-idea-phrase","data-video-ideas-create"])
  assert.ok(cmp.includes(marker),marker);
 assert.match(cmp,/listMeaningAxes\(locale\)/);
 assert.doesNotMatch(cmp,/fetch\(|appFetch\(|localStorage|sessionStorage|navigator\.sendBeacon/);
 assert.match(studio,/onCreate=\{goToMontageFromIdeas\}/);
 assert.match(studio,/const workspaceTabs=\[\s*\{id:"video",Icon:Film\},\s*\{id:"phrases",Icon:Heart\},\s*\{id:"editor",Icon:Scissors\}/);
});

test("Ideas CTA advances to Montage Style with no renderer, no audio library and no source gate",()=>{
 const start=studio.indexOf("const goToMontageFromIdeas = () => {");
 const end=studio.indexOf("const createQuickVideo = () => {",start);
 assert.ok(start>0&&end>start,"Ideas navigation handler");
 const action=studio.slice(start,end);
 assert.match(action,/setActiveWorkspace\("editor"\)/);
 assert.match(action,/setMontagePanel\("effects"\)/);
 assert.match(action,/scrollIntoView/);
 assert.doesNotMatch(action,/createQuickVideo\(|createVideo\(|startFromHero\(/);
 assert.match(studio,/onCreate=\{goToMontageFromIdeas\}\/>/);
 assert.match(cmp,/data-video-ideas-create[\s\S]*?disabled=\{disabled\|\|selectedCount<5\}/);
 assert.doesNotMatch(cmp,/canGenerate/,"moving to Montage must not depend on video readiness");
 assert.match(studio,/\{activeWorkspace==="video" \? <section className=\{videoStyles\.quickMusicSection\}/,
  "quick music must only mount in Goal");
 assert.doesNotMatch(css,/\[data-active-workspace="phrases"\]\s*\.quickBuilder>\[data-video-quick-audio-choices\]/,
  "mobile styles must not force Music & Voice into Ideas");
 assert.match(studio,/montagePanel==="audio" \?/,"Montage keeps its real audio editor");
});


test("approved seven-choice Ideas mock retains five-minimum, real canvas text size and voice handoff",()=>{
 for(const lang of ["ru","en","es"]){
  const seven=suggestMeaningPhrases(lang,["anchor"],"fatigue","calm",4,6,0,7);
  assert.equal(seven.length,7);
  assert.equal(new Set(seven).size,7);
  seven.forEach(value=>assert.ok(Array.from(value).length<=36));
 }
 for(const marker of ["data-video-ideas-size","data-video-ideas-text-size","data-video-idea-select",
  "data-video-ideas-selected-count","data-video-ideas-regenerate","data-video-ideas-own-phrase",
  "data-video-ideas-record","data-video-ideas-minimum","data-video-ideas-refine"])
  assert.ok(cmp.includes(marker),marker);
 assert.match(cmp,/selectedCount<5/);
 assert.match(studio,/onCreate=\{goToMontageFromIdeas\}/);
 assert.match(cmp,/presetOverride:preset,custom:picked\.slice\(5,10\)\.join/);
 const renderer=readFileSync(new URL("../lib/mandala/video-affirmations.ts",import.meta.url),"utf8");
 assert.match(renderer,/textScale\?: "small" \| "medium" \| "large"/);
 assert.match(renderer,/const textScale = settings\.textScale === "small"/);
 assert.match(studio,/onRecord=\{\(\)=>\{[\s\S]*?data-video-affirmation-gender="own"/);
 assert.match(studio,/data-video-own-voice-record/);
});


test("Ideas client crash guard: film Play never invokes iOS SpeechSynthesis and resets at the first phrase",()=>{
 assert.doesNotMatch(cmp,/SpeechSynthesisUtterance|speechSynthesis\./);
 assert.match(cmp,/onClick=\{\(\)=>editing===index\?moveDown\(index\):onPreview\(\)\}/);
 assert.match(cmp,/onResetPreview\(\);onChange\(old=>/);
 assert.match(studio,/onResetPreview=\{\(\)=>\{setPreviewPlaying\(false\);setPreviewSeekSeconds\(0\);setPreviewPlayhead\(0\);\}\}/);
 assert.match(studio,/if\(activeWorkspace==="phrases"\|\|previewSeekSeconds>=duration\)/);
 assert.match(studio,/if\(activeWorkspace!=="phrases"&&!previewPlaying\)startMovieSound/);
 assert.match(studio,/const playback=film\.play\(\)/);
});
test("Ideas uses original Canvas to show the first selected line and rise through the film",()=>{
 const paint=readFileSync(new URL("../lib/mandala/video-affirmations.ts",import.meta.url),"utf8");
 assert.match(paint,/motion\?: "rise"/);
 assert.match(paint,/if \(settings\.motion === "rise"\)/);
 assert.match(paint,/Math\.max\(1,totalSeconds\)\/lines\.length/);
 assert.match(paint,/const y=height\*\(0\.75-0\.48\*progress\)/);
 assert.match(paint,/ctx\.fillText\(part,width\*0\.5,lineY,maxWidth\)/);
 assert.match(cmp,/motion:"rise"/);
 assert.match(cmp,/enabled:picked\.length>0/);
 assert.match(studio,/data-hero-promo=\{creationMode!=="generated"&&!cinematicPlan&&!photoUrl&&!previewPlaying&&!recording&&activeWorkspace!=="phrases"/);
 assert.match(studio,/paintVideoAffirmations\(ctx,previewSeekSeconds,affirmationLines,affirmations,duration\)/);
 assert.equal((studio.match(/paintVideoAffirmations\(ctx,[^,]+,affirmationLines,affirmations,duration\)/g)||[]).length,5);
});
test("Ideas mobile screen uses compact accessible scroll, no overlapping Intro/My Video rail",()=>{
 const local=readFileSync(new URL("../components/mandala-video-ideas.module.css",import.meta.url),"utf8");
 for(const marker of ["data-video-ideas-scroll","data-video-ideas-size","data-video-ideas-create"])
  assert.ok(cmp.includes(marker));
 assert.match(local,/\.phraseList\{[^}]*max-height:clamp\([^}]*overflow-y:auto/);
 assert.match(local,/@media\(max-height:750px\) and \(max-width:759px\)/);
 assert.match(css,/data-active-workspace="phrases"[\s\S]*?\.previewStage \.heroRail,/);
 assert.match(css,/data-active-workspace="phrases"[\s\S]*?\.previewStage \.hero \.heroCanvas\{opacity:1!important/);
 assert.match(css,/data-active-workspace="phrases"[\s\S]*?\[data-video-phrase-audio-shortcut\]\{display:none!important/);
});
