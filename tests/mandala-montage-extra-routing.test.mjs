import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {suggestBasicSupportPhrases} from "../lib/mandala/video-basic-support-phrases.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const studio=read("components/mandala-free-video-studio.tsx");
const extra=read("components/mandala-montage-extra-personal.tsx");
const ideas=read("components/mandala-video-ideas.tsx");
const browser=read("scripts/verify-affirmation-voice-browser.mjs");

test("top and Montage tab order is approved, one photographic Extra",()=>{
 const top=studio.slice(studio.indexOf("const workspaceTabs=["),studio.indexOf("] as const;",studio.indexOf("const workspaceTabs=[")));
 assert.deepEqual([...top.matchAll(/id:"([a-z]+)"/g)].map(x=>x[1]),
  ["video","editor","phrases","pro","ready","effects"]);
 const start=studio.indexOf("<nav className={videoStyles.montageQuickTools}");
 const end=studio.indexOf("</nav>",start);
 assert.ok(start>0&&end>start);
 assert.deepEqual([...studio.slice(start,end).matchAll(/id:"(effects|audio|promo|text|concept)",Icon:/g)].map(x=>x[1]),
  ["effects","audio","promo","text","concept"]);
 assert.match(studio,/montagePanel==="audio"\)\{\s*setMontagePanel\("promo"\)/);
 assert.equal((studio.match(/<MandalaMontageExtraPersonal /g)||[]).length,1);
 assert.doesNotMatch(studio,/<MandalaMontageTextChoice/);
 for(const id of ["simple","support","personal"])assert.ok(extra.includes('id:"'+id+'"'),id);
 for(const scene of ["sun-autumn-hills.jpg","heart-flow.jpg","sun-warm-ocean-dawn.jpg"])
  assert.ok(extra.includes(scene),scene);
 assert.match(studio,/data-video-extra-advanced-formats/);
 assert.match(extra,/useState<"simple"\|"support"\|"personal">\(selectedMode\|\|"simple"\)/);
 assert.match(studio,/selectedMode=\{extraTextChoice\}/);
 assert.match(extra,/aria-pressed={selected===card\.id}/);
 assert.match(extra,/data-selected={selected===card\.id}/);
 assert.match(extra,/onClick=\{\(\)=>setSelected\(card\.id\)\}/);
 assert.match(extra,/data-video-extra-continue/);
 assert.match(extra,/onClick=\{\(\)=>actions\[selected\]\(\)\}/);
 assert.doesNotMatch(extra,/onClick=\{actions\[card\.id\]\}/,
  "choosing an Extra photo card alone must never navigate, debit or render");

});

test("reopening Text after Emotional Support keeps the real editor (touch and click)",()=>{
 const begin=studio.indexOf("<nav className={videoStyles.montageQuickTools}");
 const end=studio.indexOf("</nav>",begin);
 assert.ok(begin>0&&end>begin);
 const nav=studio.slice(begin,end);
 assert.equal((nav.match(/if\(item\.id==="text"&&extraTextChoice==="support"\)setMontageTextStage\("edit"\)/g)||[]).length,2,
   "mobile touch and keyboard/click both keep selected Support in the Text editor");
 assert.doesNotMatch(nav,/setMontageTextStage\("choice"\)/,
   "the retired Text mode chooser was removed and must not blank the phrase editor");
 assert.match(studio,/extraTextChoice==="support"&&montageTextStage==="edit"/);
 assert.match(browser,/await expect\(page\.locator\('\[data-video-montage-text\] \[data-video-ideas-phrases\]'\)\)\.toBeVisible/);
});

test("after Standard, a personalized Concept requires a fresh explicit Extra→Personal choice",()=>{
 const i=browser.indexOf('const ideasTop=page.locator(');
 const j=browser.indexOf('const supportGoal=page.locator(',i);
 assert.ok(i>0&&j>i,"Personal goal change has a visible browser journey");
 const flow=browser.slice(i,j);
 assert.match(flow,/await enterVisibleStudioWorkspace\(page,"editor",browser\.browserType\(\)\.name\(\)\)/);
 assert.match(flow,/await enterPersonalAfterMontageExtra\(page,browser\.browserType\(\)\.name\(\)\)/);
 assert.match(flow,/await expect\(ideasGoalTab\)\.toHaveAttribute\("aria-pressed","true"\)/);
 assert.match(extra,/data-video-extra-continue/);
});

test("approved Personal Concept is stable on passive phrase-editor navigation",()=>{
 assert.match(studio,/preserveApprovedConcept=\{Boolean\(approvedVideoConcept\)&&personalPhrasesOpen\}/);
 assert.match(ideas,/preserveApprovedConcept\?:boolean/);
 const guard=ideas.indexOf('if(preserveApprovedConcept&&phraseMode==="personalized")');
 const snapshot=ideas.indexOf('if(remembered&&isIdeaEditorSnapshot(remembered,signature))');
 assert.ok(guard>0&&snapshot>guard,"current approved film precedes any stale eight-axis snapshot");
 const passive=ideas.slice(guard,snapshot);
 assert.match(passive,/linesForVideoAffirmations\(locale,theme,settings\)/);
 assert.match(passive,/setChosen\(committed\.map\(/);
 assert.doesNotMatch(passive,/onChange\(/,"passive Personal opening cannot rewrite Canvas captions");
 assert.match(browser,/await expect\(conceptRoot\)\.toHaveAttribute\("data-concept-approved","true"/);
 assert.doesNotMatch(browser,/if\(await conceptRoot\.getAttribute\("data-concept-approved"\)!=="true"\)/);
});

test("stale Goal actions cannot erase a visitor-selected Personal flow",()=>{
 const goto=studio.slice(studio.indexOf("const continueToMontage = () => {"),studio.indexOf("const generateExpressFromCurrent",studio.indexOf("const continueToMontage = () => {")));
 assert.match(goto,/if\(activeWorkspace!=="video"\)return/);
 assert.ok(goto.indexOf('if(activeWorkspace!=="video")return')<goto.indexOf("setExtraTextChoice(null)"));
 const mirror=studio.slice(studio.indexOf("onComplete={(path:MirrorResolution)=>{"),studio.indexOf("onExpand={()=>{",studio.indexOf("onComplete={(path:MirrorResolution)=>{")));
 assert.match(mirror,/if\(activeWorkspace!=="video"\)return false/);
 assert.ok(mirror.indexOf('if(activeWorkspace!=="video")return false')<mirror.indexOf("setExtraTextChoice(null)"));
 assert.match(studio,/data-video-extra-choice=\{extraTextChoice\|\|"none"\}/);
 assert.match(browser,/await expect\(studio\)\.toHaveAttribute\("data-video-extra-choice","personal"\)/);
 assert.match(studio,/if\(personalFlow&&extraTextChoice!=="personal"\)setExtraTextChoice\("personal"\)/);
});

test("Emotional Support alone opens updated Text; Personal stays in Personal",()=>{
 assert.match(studio,/onSupport=\{\(\)=>\{/);
 assert.match(studio,/setExtraTextChoice\("support"\);setMontageTextMode\("standard"\)/);
 assert.match(studio,/extraTextChoice==="support"&&montageTextStage==="edit"/);
 assert.match(studio,/requestText="" profile={undefined} languagePicker phraseMode="standard"/);
 assert.match(studio,/goalType="support" selectedTopicId={null}/);
 assert.match(studio,/data-video-text-hero/);
 assert.match(studio,/data-video-text-progress/);
 assert.match(studio,/data-video-personal-eight-axes-page/);
 assert.match(studio,/data-video-personal-phrases/);
 assert.match(studio,/const personalFlow=extraTextChoice==="personal"\|\|montageTextMode==="personalized"/);
 assert.match(studio,/setPersonalPhrasesOpen\(personalFlow\)/);
 assert.equal((studio.match(/<MandalaVideoIdeas key=/g)||[]).length,2,
  "shared Canvas with mutually-exclusive editing surfaces");
 assert.equal((studio.match(/<MandalaVideoConcept /g)||[]).length,1);
 assert.match(ideas,/if\(phraseMode==="standard"\)return suggestBasicSupportPhrases/);
 assert.match(ideas,/const candidates=phraseMode==="standard"\?/);
});

test("reviewed category phrases are deterministic, different for different themes, EN RU ES",()=>{
 for(const locale of ["en","ru","es"]){
  for(const theme of ["energy","life","money","relationships","health","goals"]){
   const phrases=suggestBasicSupportPhrases({locale,theme,limit:7});
   assert.equal(phrases.length,7,locale+" "+theme);
   assert.equal(new Set(phrases).size,7);
   assert.deepEqual(phrases,suggestBasicSupportPhrases({locale,theme,limit:7}));
   assert.ok(phrases.every(s=>Array.from(s).length<=36));
   const more=suggestBasicSupportPhrases({locale,theme,revision:1,excluded:phrases,limit:3});
   assert.ok(more.length>=1&&more.every(s=>!phrases.includes(s)));
  }
  assert.notDeepEqual(suggestBasicSupportPhrases({locale,theme:"relationships",limit:7}),
    suggestBasicSupportPhrases({locale,theme:"money",limit:7}));
 }
});

test("switching Simple or Standard removes old personal TTS, not user audio, and no paid calls occur on choice",()=>{
 for(const term of ["onSimple={()=>{","onSupport={()=>{"]){
  const start=studio.indexOf(term);
  const end=studio.indexOf("setMontagePanel(",start);
  assert.ok(start>0&&end>start);
  const flow=studio.slice(start,end);
  assert.match(flow,/setAttachedAudio\(current=>current\?\.kind==="file"&&current\.narration\?null:current\)/);
  assert.match(flow,/setHypnoSpeechSource\(null\);setHypnoSpeechText\(""\)/);
  assert.doesNotMatch(flow,/postVideoCreditAction|fetch\(|startFromHero\(|createQuickVideo\(/);
 }
 const guard=studio.indexOf("const blockUnpricedPersonalExport=()=>");
 assert.ok(guard>0);
 assert.match(studio,/if\(extraTextChoice!=="personal"&&montageTextMode!=="personalized"\)return false/);
 for(const fn of ["const startFromHero=()=>","const createQuickVideo = () =>",
  "const openReadyForGeneration = () =>","const generateExpressFromCurrent=()=>"]){
   const ix=studio.indexOf(fn);assert.ok(ix>0);
   assert.ok(studio.slice(ix,ix+170).includes("if(blockUnpricedPersonalExport())return false"),fn);
 }
});

test("real browser harness keeps rights, export, 44px controls, and Extra visible gestures",()=>{
 for(const token of ["MONTAGE_EXTRA_NO_HORIZONTAL_OVERFLOW_",
   "MONTAGE_EXTRA_3_TAPPABLE_CARDS_",
   "personalized-unpriced-export-fail-closed",
   "standard-mode-after-personalized-draft",
   "data-video-meaning-axes-screen",
   "Text controls must be at least 44x44",
   "ffprobe","encoded-audio-verified","data-video-extra-advanced-formats"])
   assert.ok(browser.includes(token),token);
 assert.doesNotMatch(browser,/\.click\(\{force:true\}\)/);
});
