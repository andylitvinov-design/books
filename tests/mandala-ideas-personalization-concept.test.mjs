import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {suggestMeaningPhrases} from "../lib/mandala/video-meaning-phrases.mjs";
import {appendPersonalVideoClosingPhrase,personalVideoClosingPhrase,normalizePersonalVideoName}
  from "../lib/mandala/video-goal-idea-phrases.mjs";
import {planIdeaSelection} from "../lib/mandala/video-idea-selection.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const studio=read("components/mandala-free-video-studio.tsx");
const personal=read("components/mandala-video-personalization.tsx");
const ideas=read("components/mandala-video-ideas.tsx");
const css=read("components/mandala-video-personalization.module.css");
const mobile=read("components/mandala-video-mobile.module.css");
const browser=read("scripts/verify-affirmation-voice-browser.mjs");

test("Ideas has three real substages and the same single Scenario/Concept generator",()=>{
  assert.equal((studio.match(/data-video-ideas-tab="/g)||[]).length,3);
  for(const tab of ["personalization","goal","concept"]){
    assert.ok(studio.includes('data-video-ideas-tab="'+tab+'"'),tab);
    assert.ok(studio.includes('data-video-ideas-'+tab+'-panel'),tab+" panel");
  }
  for(const label of ["Персонализация","Personalization","Personalización","Цель","Goal","Objetivo","Сценарий","Scenario","Guion"])
    assert.ok(studio.includes(label),label);
  assert.equal((studio.match(/<MandalaVideoPersonalization /g)||[]).length,1);
  assert.equal((studio.match(/<MandalaVideoIdeaGoal /g)||[]).length,1);
  assert.match(studio,/setIdeasProfileConfirmed\(true\);setIdeasSubtab\("goal"\)/);
  assert.equal((studio.match(/<MandalaVideoConcept /g)||[]).length,1);
  assert.match(studio,/id:"concept",Icon:Film/,
    "Montage retains its own independent video-storyboard destination");
  assert.match(studio,/data-video-montage-open-storyboard/);
  assert.match(studio,/data-video-montage-open-storyboard[\s\S]*?setMontagePanel\("concept"\)/,
    "Montage storyboard shortcut never switches to Ideas");
  assert.match(studio,/setApprovedVideoConcept\(approved\)/);
  assert.match(studio,/setActiveWorkspace\("editor"\);setMontagePanel\("effects"\)/);
  assert.match(studio,/onGenerate=\{createQuickVideo\}/);
  assert.match(studio,/onClick=\{goToMontageFromIdeas\}/);
  assert.equal((studio.match(/<MandalaVideoIdeas locale/g)||[]).length,1);
});

test("Personalization recovers the approved three-question photo cards for RU EN ES",()=>{
  for(const label of ["Как я чувствую себя сейчас?","How do I feel now?","¿Cómo me siento ahora?",
    "Как я хотел бы себя чувствовать?","How would I like to feel?","¿Cómo me gustaría sentirme?",
    "Что я хочу укрепить?","What would I like to strengthen?","¿Qué me gustaría fortalecer?"])
    assert.ok(personal.includes(label),label);
  for(const kind of ["current","desired","strength"])
    assert.ok(personal.includes('data-personalization-kind="'+kind+'"'),kind);
  for(const id of ["energy","desired-level","choice","axis","mood"])
    assert.ok(personal.includes('data-video-personalization-'+id),id);
  assert.match(personal,/onChange\(old=>\(\{\.\.\.old,\[side\]:\[id\]\}\)\)/);
  assert.match(personal,/onChange\(old=>\(\{\.\.\.old,axes:\[id\]\}\)\)/);
  assert.match(personal,/advanceTo\(side==="current"\?2:3\)/);
  assert.match(personal,/advanceTo\(4\)/);
  assert.doesNotMatch(personal,/selected\.length>=3|old\.axes\.length>=3|onClick=\{goNext\}/);
  assert.match(personal,/onContinue/);
  assert.match(personal,/onBack/);
  for(const photo of ["morning-dew.jpg","wealth-sunrise.jpg","mountain-air.jpg"]){
    assert.ok(css.includes(photo),photo);
    assert.ok(existsSync(new URL("../public/videos/holistic-house/film-collection-v2/"+photo,import.meta.url)),photo);
  }
  assert.ok(css.includes('data-personalization-kind="strength"'));
  assert.ok(css.includes('@media(max-width:370px)'));
});

test("Changing personal answers recomputes the original localized phrase editor without uploading data",()=>{
  assert.match(studio,/profile=\{ideasProfile\}/);
  assert.match(studio,/onChange=\{setIdeasProfile\}/);
  assert.match(ideas,/profileKey=JSON\.stringify\(profile\?\?null\)/);
  assert.match(ideas,/profile\?\.current\?\.length\?profile\.current\.map\(goalCurrentMeaningId\)/);
  assert.match(ideas,/profile\?\.desired\?\.length\?profile\.desired\.map\(goalDesiredMeaningId\)/);
  assert.match(ideas,/remembered&&isIdeaEditorSnapshot\(remembered,signature\)/);
  assert.match(ideas,/ideasDraft:\{\.\.\.plan\.editor,locale:outputLocale\}/);
  assert.equal((ideas.match(/data-video-ideas-compact/g)||[]).length,1);
  const relationship=suggestMeaningPhrases("en",["connection"],"loneliness","connection",4,6,0,7);
  assert.ok(relationship.some(line=>line.includes("connection")||line.includes("contact")));
  assert.ok(!relationship.every(line=>line.includes("ground")));
  for(const op of ["fetch(","navigator.sendBeacon(","localStorage.setItem("])
    assert.ok(!personal.includes(op),"private profile does not leave browser: "+op);
});

test("Preserve one voice recorder, optional effects and compact mobile layout",()=>{
  assert.equal((studio.match(/<MandalaAffirmationVoice locale/g)||[]).length,1);
  assert.match(studio,/data-video-ideas-advanced-voice/);
  assert.match(studio,/data-video-phrase-audio-shortcut hidden=\{ideasSubtab!=="personalization"\}/);
  assert.match(studio,/data-video-montage-text hidden=\{montagePanel!=="text"\}/);
  assert.match(studio,/data-video-ideas-voice-mode="my-voice"/);
  assert.match(mobile,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
  assert.match(mobile,/@media\(max-width:359px\)/);
  assert.match(mobile,/\.ideasConceptPane\[hidden\]\{display:none!important\}/);
  for(const marker of ['data-video-ideas-tab="personalization"',
    'data-video-ideas-tab="concept"',"data-video-ideas-advanced-voice",
    "data-personalization-kind","data-video-montage-style"])
    assert.ok(browser.includes(marker),marker);
  assert.match(browser,/for\(const width of \[320,354,390,430\]\)/);
});


test("Concept uses canonical selected filters and numeric energy, while WebKit phrase clicks win over delayed bootstrap",()=>{
  const auto=read("components/mandala-auto-video-director.tsx");
  const concept=read("components/mandala-video-concept.tsx");
  const engine=read("lib/mandala/auto-video-concept.mjs");
  const semantic=read("lib/mandala/video-concept-semantic.mjs");
  assert.match(auto,/if\(!onConceptTopicChange\)return;/);
  assert.match(auto,/onConceptTopicChange\(current&&current\.category\.id===selectedCategoryId/);
  assert.match(auto,/const label=found\.topic\.label\[locale\]/);
  assert.doesNotMatch(auto,/requestDraft\.trim\(\)\|\|found\.topic\.label\[locale\]/);
  assert.match(studio,/onConceptTopicChange=\{setSelectedConceptTopic\}/);
  assert.match(studio,/selectedTopic=\{selectedConceptTopic\}/);
  assert.match(concept,/selectedTopicId:selectedTopic\?\.topicId/);
  assert.match(personal,/energyStart:value\.energy,energyTarget:value\.desiredLevel/);
  assert.match(engine,/selectedTopicId:explicitTopic\?\.topic\.id/);
  assert.match(semantic,/put\(p,"pace",dynamic\?"dynamic"/);
  const applyStart=ideas.indexOf("const apply=(candidates:string[],indices:number[],outputLocale:VideoLocale=captionLocale)=>");
  const projectionStart=ideas.indexOf("const plan=planIdeaSelection",applyStart);
  assert.ok(applyStart>=0&&projectionStart>applyStart);
  assert.match(ideas.slice(applyStart,projectionStart),/lastApplied\.current=signature/);
  assert.match(browser,/await unselectedToggle\.click\(\)/);
  assert.match(browser,/toHaveAttribute\('aria-pressed','true'\)/);
});

test("Preferred name appears in last suggested AND fifth selected video phrase in RU/EN/ES",()=>{
  const sample=[
    "I can pause","I can choose","I am learning","I can rest",
    "I can grow","My pace matters","A gentler day is possible",
  ];
  for(const [locale,name,expected] of [
    ["ru","Андрей","Андрей, я в тебя верю"],
    ["en","Andy","Andy, I believe in you"],
    ["es","Andrés","Andrés, creo en ti"],
  ]){
    assert.equal(personalVideoClosingPhrase(locale,name),expected);
    const suggested=appendPersonalVideoClosingPhrase(sample,locale,name);
    assert.equal(suggested.length,7);
    assert.equal(suggested.at(-1),expected);
    const chosen=[0,1,2,3,suggested.length-1];
    const plan=planIdeaSelection(suggested,chosen,suggested,"profile-with-name");
    assert.equal(plan.settingsPatch.presetOverride.at(-1),expected);
    assert.equal(plan.editor.chosen.at(-1),6);
  }
  assert.deepEqual(appendPersonalVideoClosingPhrase(sample,"en",""),sample,
    "blank name keeps the existing seven proposals unchanged");
  assert.equal(personalVideoClosingPhrase("en","<b>Mary Jane</b>"),"Mary Jane, I believe in you");
  assert.equal(normalizePersonalVideoName("Alice 123"),"Alice");
  assert.ok(personalVideoClosingPhrase("en","A".repeat(70)).length<=36,
    "the full supportive closing must fit the current subtitle/voice limit");
  assert.ok(personalVideoClosingPhrase("ru","Александра-Екатерина").endsWith("я в тебя верю"));
});

test("Name question stays in browser and personal closing follows the existing video projection",()=>{
  assert.match(personal,/name:"",current:\["fatigue"\]/);
  assert.match(personal,/data-video-personalization-name-question/);
  assert.match(personal,/data-video-personalization-name type="text"/);
  for(const line of ["Как вас зовут?","What is your name?","¿Cómo te llamas?"])
    assert.ok(personal.includes(line),line);
  assert.match(ideas,/personalClosingPhrase=personalVideoClosingPhrase\(captionLocale,profile\?\.name\)/);
  assert.match(ideas,/appendPersonalVideoClosingPhrase\(pool,captionLocale,profile\?\.name\)/);
  assert.match(ideas,/initialChosen=personalClosingPhrase\?/);
  assert.match(personal,/const name=event\.currentTarget\.value;/);
  assert.match(ideas,/priorClosing=personalVideoClosingPhrase\(captionLocale,profile\?\.name\)/);
  assert.match(ideas,/nextClosing=personalVideoClosingPhrase\(next,profile\?\.name\)/);
  assert.match(ideas,/translateVideoGoalPhrase\(line,captionLocale,next\)/);
  assert.match(ideas,/data-video-text-language=\{language\}/);
  assert.match(browser,/const preferredName=locale===/);
  assert.match(browser,/data-video-personalization-name/);
  assert.match(browser,/const selectedClosing=montageIdeas.locator/);
  assert.match(ideas,/ideasDraft:\{\.\.\.plan\.editor,locale:outputLocale\}/);
  assert.match(ideas,/options\[options\.length-1\]===personalClosingPhrase/);
  assert.match(ideas,/ideasDraft:\{\.\.\.plan\.editor,locale:outputLocale\}/);
  assert.ok(css.includes(".nameCard input:focus-visible"));
  const summary=personal.slice(personal.indexOf("export function summarizeVideoGoalProfile"),
    personal.indexOf("export function MandalaVideoPersonalization"));
  assert.ok(!summary.includes("value.name"),
    "the preferred name never enters the concept/service personalization summary");
});

test("Personalization has six one-question screens and preserves chosen answers through Back",()=>{
 assert.match(personal,/type QuizStep=1\|2\|3\|4\|5\|6/);
 assert.match(personal,/useState<QuizStep>\(1\)/);
 assert.match(personal,/data-video-personalization-step=\{quizStep\}/);
 assert.match(personal,/data-video-personalization-progress/);
 assert.match(personal,/\[1,2,3,4,5,6\] as const/);
 assert.match(personal,/\{quizStep\} \/ 6/);
 for(const stage of [1,2,3,4,5,6])assert.ok(personal.includes('hidden={quizStep!=='+stage+'}'));
 for(const kind of ["current","desired","strength","energy-current","energy-desired"])
   assert.ok(personal.includes('data-personalization-kind="'+kind+'"'),kind);
 assert.ok(personal.indexOf('data-personalization-kind="strength"')<
   personal.indexOf('data-personalization-kind="energy-current"'));
 assert.ok(personal.indexOf('data-personalization-kind="energy-current"')<
   personal.indexOf('data-personalization-kind="energy-desired"'));
 assert.ok(personal.indexOf('data-personalization-kind="energy-desired"')<
   personal.indexOf('data-video-personalization-name-question'),"name stays sixth");
 assert.match(personal,/\{quizStep===6\?<button[^\n]+data-video-personalization-clarify-continue/);
 assert.match(personal,/onClick=\{onContinue\}/);
 assert.doesNotMatch(personal,/forward:"Continue"|forward:"Продолжить"|forward:"Continuar"/);
 assert.match(personal,/if\(quizStep===1\)\{onBack\(\);return;\}/);
 assert.match(personal,/quizRef\.current\?\.scrollIntoView/);
 assert.match(css,/\.card\[hidden\],\.nameCard\[hidden\]\{display:none!important\}/);
 assert.match(personal,/data-video-personalization-name type="text"/);
 for(const word of ["previous","next","quizStep"])assert.ok(personal.includes(word));
});

test("Energy now and desired energy each require one button from 1 to 10 and auto-advance",()=>{
 assert.match(personal,/const energyScores=\[1,2,3,4,5,6,7,8,9,10\] as const/);
 assert.match(personal,/data-video-personalization-energy-options="current"/);
 assert.match(personal,/data-video-personalization-energy-options="desired"/);
 assert.match(personal,/data-video-personalization-energy=\{score\}/);
 assert.match(personal,/data-video-personalization-desired-level=\{score\}/);
 assert.match(personal,/aria-pressed=\{value\.energy===score\}/);
 assert.match(personal,/aria-pressed=\{value\.desiredLevel===score\}/);
 assert.match(personal,/onClick=\{\(\)=>chooseEnergy\("energy",score\)\}/);
 assert.match(personal,/onClick=\{\(\)=>chooseEnergy\("desiredLevel",score\)\}/);
 assert.match(personal,/advanceTo\(field==="energy"\?5:6\)/);
 assert.match(personal,/onChange\(old=>\(\{\.\.\.old,\[field\]:score\}\)\)/);
 assert.doesNotMatch(personal,/type="range"/);
 for(const line of ["Сколько энергии у меня сейчас?","Сколько энергии я хочу иметь?",
  "How much energy do I have now?","How much energy would I like?",
  "¿Cuánta energía tengo ahora?","¿Cuánta energía quiero tener?"])
   assert.ok(personal.includes(line),line);
 assert.match(css,/\.energyGrid\{display:grid;grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(css,/\.energyGrid button\{[^}]*min-height:54px/);
 assert.match(css,/\.energyGrid button\[aria-pressed="true"\]/);
 assert.match(css,/@media\(max-width:370px\)/);
});

test("Ideas phone view uses one static photo and three real subtabs",()=>{
  assert.match(studio,/data-video-ideas-photo/);
  assert.match(studio,/src="\/images\/holistic-house\/support-mock-hero\.webp"/);
  for(const label of ["Ваше видео — ваша история","Your video, your story","Tu vídeo, tu historia"])
    assert.ok(studio.includes(label),label);
  assert.match(studio,/data-ideas-step=\{activeWorkspace==="phrases"\?ideasSubtab:undefined\}/);
  assert.match(mobile,/\.previewStage>\.heroWithRail\{display:none!important\}/);
  assert.match(mobile,/\.previewStage>\.ideasPhotoHero\{/);
  assert.match(mobile,/data-ideas-step="personalization"\] \[data-video-ideas-open-montage-text\]/);
  assert.match(css,/@media\(max-width:759px\)/);
  assert.match(studio,/setIdeasProfileConfirmed\(true\);setIdeasSubtab\("goal"\)/);
});
