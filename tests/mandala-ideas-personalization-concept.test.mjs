import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {suggestMeaningPhrases} from "../lib/mandala/video-meaning-phrases.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const studio=read("components/mandala-free-video-studio.tsx");
const personal=read("components/mandala-video-personalization.tsx");
const ideas=read("components/mandala-video-ideas.tsx");
const css=read("components/mandala-video-personalization.module.css");
const mobile=read("components/mandala-video-mobile.module.css");
const browser=read("scripts/verify-affirmation-voice-browser.mjs");

test("Ideas has exactly two real substages and the same single Concept generator",()=>{
  assert.equal((studio.match(/data-video-ideas-tab="/g)||[]).length,2);
  for(const tab of ["personalization","concept"]){
    assert.ok(studio.includes('data-video-ideas-tab="'+tab+'"'),tab);
    assert.ok(studio.includes('data-video-ideas-'+tab+'-panel'),tab+" panel");
  }
  for(const label of ["Персонализация","Personalization","Personalización","Концепция","Concept","Concepto"])
    assert.ok(studio.includes(label),label);
  assert.equal((studio.match(/<MandalaVideoPersonalization /g)||[]).length,1);
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
  assert.match(personal,/selected.length>=3/);
  assert.match(personal,/old.axes.length>=3/);
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
  assert.match(ideas,/ideasDraft:plan.editor/);
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
  const applyStart=ideas.indexOf("const apply=(candidates:string[],indices:number[])=>");
  const projectionStart=ideas.indexOf("const plan=planIdeaSelection",applyStart);
  assert.ok(applyStart>=0&&projectionStart>applyStart);
  assert.match(ideas.slice(applyStart,projectionStart),/lastApplied\.current=signature/);
  assert.match(browser,/await unselectedToggle\.click\(\)/);
  assert.match(browser,/toHaveAttribute\('aria-pressed','true'\)/);
});
