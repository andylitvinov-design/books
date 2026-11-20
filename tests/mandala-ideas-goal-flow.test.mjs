import test from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {buildPersonalVideoGoalOptions,composePersonalVideoGoalIntent,goalScenarioPlan}
 from "../lib/mandala/video-personal-goal-composer.mjs";
import {getMyTubeTopic} from "../lib/mandala/mytube-content-taxonomy.mjs";
import {suggestVideoConcept} from "../lib/mandala/auto-video-concept.mjs";

const load=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const studio=load("components/mandala-free-video-studio.tsx");
const picker=load("components/mandala-video-idea-goal.tsx");
const goalCss=load("components/mandala-video-idea-goal.module.css");
const mobile=load("components/mandala-video-mobile.module.css");
const personal=load("components/mandala-video-personalization.tsx");
const browser=load("scripts/verify-affirmation-voice-browser.mjs");

test("Ideas Goal shows three large photo cards and two alternatives with RU/EN/ES text",()=>{
 for(const locale of ["en","ru","es"]){
  const options=buildPersonalVideoGoalOptions({locale,wish:"I want to rest and relax",
    selectedTopic:{topicId:"recovery-after-load"},
    profile:{current:["fatigue"],desired:["rested"],axes:["anchor"],energy:2,desiredLevel:4},
    profileConfirmed:true});
  assert.equal(options.goals.length,5);
  assert.equal(new Set(options.goals.map(goal=>goal.id)).size,5);
  for(const goal of options.goals){
   const topic=getMyTubeTopic(goal.topicId);
   assert.ok(topic,"Missing topic: "+goal.topicId);
   assert.equal(topic.category.id,goal.categoryId);
   assert.equal(topic.subcategory.id,goal.subcategoryId);
   for(const key of ["title","detail","intent"])
    assert.ok(goal.copy[locale][key].length>=8,goal.id+" / "+locale+" / "+key);
  }
 }
 for(const photo of ["calm-sea","wildflower-dance","sunbeam-flow","mountain-air","wealth-sunrise",
   "meadow-morning","fern-awakening","mossy-stream","coastal-freedom"]){
  assert.ok(goalCss.includes(photo+".jpg"),photo);
  assert.ok(existsSync(new URL("../public/videos/holistic-house/film-collection-v2/"+photo+".jpg",import.meta.url)),photo);
 }
 assert.match(picker,/options\.goals\.slice\(0,3\)/);
 assert.match(picker,/options\.goals\.slice\(3,5\)/);
 assert.match(picker,/data-video-ideas-goal-choice/);
 assert.match(picker,/aria-pressed=\{pressed\}/);
 assert.match(picker,/data-video-ideas-more-goals/);
 assert.match(picker,/data-video-ideas-goals-next/);
 assert.match(picker,/data-video-ideas-goals-prev/);
 assert.match(picker,/disabled=\{disabled\|\|!selected\}/);
 assert.match(mobile,/\.ideasGoalPane\[hidden\]\{display:none!important\}/);
 assert.match(mobile,/\.ideasSubtabs\{display:grid;grid-template-columns:repeat\(3/);
});
test("Personalization → Goal → Concept uses one Storyboard and no duplicate video renderer",()=>{
 assert.equal((studio.match(/data-video-ideas-tab="/g)||[]).length,3);
 assert.equal((studio.match(/<MandalaVideoIdeaGoal /g)||[]).length,1);
 assert.equal((studio.match(/<MandalaVideoConcept /g)||[]).length,1);
 assert.match(studio,/setIdeasProfileConfirmed\(true\);setIdeasSubtab\("goal"\)/);
 assert.match(studio,/data-video-ideas-goal-panel hidden=\{ideasSubtab!=="goal"\}/);
 assert.match(studio,/onContinue=\{\(\)=>setIdeasSubtab\("concept"\)\}/);
 assert.match(studio,/selectedTopic:selectedConceptTopic/);
 assert.match(studio,/goalPlan:goalScenarioPlan\(chosenIdeaGoal,personalGoalOptions\.contextKey\)/);
 assert.match(studio,/goal=\{conceptGoalText\} theme=\{theme\} selectedTopic=\{conceptTopic\}/);
 assert.match(studio,/suggestVideoConcept\(\{\s*locale,goal:conceptGoalText/);
 assert.match(studio,/selectedTopicId:conceptTopic\?\.topicId/);
 assert.match(studio,/creativeBrief:conceptTopic\?\.brief/);
 assert.match(studio,/MandalaAutomaticStoryboard[\s\S]*?goal=\{conceptGoalText\}/);
 for(const text of ['next:"Choose your goal"','next:"Выбрать цель"','next:"Elegir objetivo"'])
  assert.ok(personal.includes(text),text);
 assert.match(browser,/data-video-ideas-goal-next/);
 assert.match(browser,/data-video-ideas-goals-prev/);
 assert.doesNotMatch(picker,/fetch\(|postVideoCreditAction|createQuickVideo|startRecording|localStorage/);
});
test("Changing therapeutic goal changes the Concept signature without changing canonical topic",()=>{
 const opts=buildPersonalVideoGoalOptions({
  locale:"en",wish:"Overcome my inner critic",theme:"energy",
  selectedTopic:{topicId:"self-confidence"},
  profile:{current:["selfcritical"],desired:["confident"],axes:["dignity"],energy:4,desiredLevel:7},
  profileConfirmed:true
 });
 const signatures=new Set(),ids=new Set(),mechanisms=new Set();
 for(const offer of opts.goals.slice(0,3)){
  const request=composePersonalVideoGoalIntent("Original client wish",offer,"en");
  assert.ok(request.includes("Original client wish"));
  const concept=suggestVideoConcept({
    locale:"en",goal:request,theme:"energy",selectedTopicId:offer.topicId,
    creativeBrief:offer.copy.en.intent,
    personalization:{currentIds:["selfcritical"],desiredIds:["confident"],focusIds:["dignity"],energyStart:4,energyTarget:7}
  });
  assert.equal(concept.topicId,"self-confidence");
  assert.ok(concept.hasPersonalInput);
  signatures.add(concept.signature);ids.add(concept.topicId);
  mechanisms.add(goalScenarioPlan(offer,opts.contextKey).mechanismId);
 }
 assert.equal(signatures.size,3);
 assert.equal(ids.size,1);
 assert.equal(mechanisms.size,3);
 assert.equal(composePersonalVideoGoalIntent("Keep original",null,"en"),"Keep original");
});
