import test from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {buildPersonalVideoGoalOptions,composePersonalVideoGoalIntent,goalScenarioPlan}
 from "../lib/mandala/video-personal-goal-composer.mjs";
import {getMyTubeTopic} from "../lib/mandala/mytube-content-taxonomy.mjs";
import {suggestVideoConcept} from "../lib/mandala/auto-video-concept.mjs";
import {suggestVideoGoalPhrases} from "../lib/mandala/video-goal-idea-phrases.mjs";

const load=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const studio=load("components/mandala-free-video-studio.tsx");
const picker=load("components/mandala-video-idea-goal.tsx");
const goalCss=load("components/mandala-video-idea-goal.module.css");
const mobile=load("components/mandala-video-mobile.module.css");
const personal=load("components/mandala-video-personalization.tsx");
const browser=load("scripts/verify-affirmation-voice-browser.mjs");

test("Goal is always Rest → Emotional Support → Change; taxonomy stays canonical",()=>{
 for(const locale of ["en","ru","es"]){
  for(const wish of ["I want to rest and relax","I need emotional support","Overcome my inner critic"]){
   const options=buildPersonalVideoGoalOptions({locale,wish,
    selectedTopic:{topicId:"recovery-after-load"}});
   assert.deepEqual(options.goals.map(goal=>goal.id),["rest","accept","reframe"]);
   assert.deepEqual(options.goals.map(goal=>goal.type),["leisure","support","change"]);
   assert.deepEqual(options.goals.map(goal=>goal.voicePerson),["none","second","first"]);
   for(const goal of options.goals){
    const topic=getMyTubeTopic(goal.topicId);
    assert.ok(topic,"Missing topic: "+goal.topicId);
    assert.equal(topic.category.id,goal.categoryId);
    assert.equal(topic.subcategory.id,goal.subcategoryId);
    for(const key of ["title","detail","intent"])
     assert.ok(goal.copy[locale][key].length>=8,goal.id+" / "+locale+" / "+key);
   }
  }
 }
 for(const photo of ["calm-sea","wildflower-dance","sunbeam-flow","mountain-air",
   "meadow-morning","fern-awakening","mossy-stream"]){
  assert.ok(goalCss.includes(photo+".jpg"),photo);
  assert.ok(existsSync(new URL("../public/videos/holistic-house/film-collection-v2/"+photo+".jpg",import.meta.url)),photo);
 }
 assert.match(picker,/const visible=options\.goals/);
 assert.doesNotMatch(picker,/data-video-ideas-more-goals|data-video-ideas-goals-prev|data-video-ideas-goals-next/);
 assert.match(picker,/data-video-ideas-goal-choice/);
 assert.match(picker,/aria-pressed=\{pressed\}/);
 assert.match(picker,/disabled=\{disabled\|\|!selected\}/);
 assert.match(mobile,/\.ideasGoalPane\[hidden\]\{display:none!important\}/);
 assert.match(mobile,/\.ideasSubtabs\{display:grid;grid-template-columns:repeat\(3/);
});

test("Personalization cannot reset an already selected goal",()=>{
 const base={locale:"en",wish:"I want love and trust",selectedTopic:{topicId:"self-confidence"}};
 const first=buildPersonalVideoGoalOptions(base);
 const refined=buildPersonalVideoGoalOptions({...base,profileConfirmed:true,
  profile:{current:["selfcritical"],desired:["confident"],axes:["dignity"],energy:3,desiredLevel:7,supportNeed:"care"}});
 assert.equal(first.contextKey,refined.contextKey);
 assert.deepEqual(refined.goals.map(x=>x.id),first.goals.map(x=>x.id));
 assert.ok(refined.goals.find(x=>x.id==="accept").copy.en.intent.includes("care and warmth"));
 assert.ok(refined.goals.find(x=>x.id==="reframe").copy.en.intent.includes("self-respect"));
});

test("Goal → personalized questions → Concept is one flow and one renderer",()=>{
 assert.equal((studio.match(/data-video-ideas-tab="/g)||[]).length,3);
 assert.ok(studio.indexOf('data-video-ideas-tab="goal"')<studio.indexOf('data-video-ideas-tab="personalization"'));
 assert.equal((studio.match(/<MandalaVideoIdeaGoal /g)||[]).length,1);
 assert.equal((studio.match(/<MandalaVideoPersonalization /g)||[]).length,1);
 assert.equal((studio.match(/<MandalaVideoConcept /g)||[]).length,1);
 assert.match(studio,/setIdeasSubtab\("goal"\);\s*setStudioMode\("pump"\)/);
 assert.match(studio,/onContinue=\{\(\)=>setIdeasSubtab\("personalization"\)\}/);
 assert.match(studio,/setIdeasProfileConfirmed\(true\)/);
 assert.match(studio,/setIdeasSubtab\("concept"\)/);
 assert.match(studio,/disabled=\{!chosenIdeaGoal\|\|!ideasProfileConfirmed\}/);
 assert.match(studio,/goalType=\{chosenIdeaGoal\?\.type\|\|"leisure"\}/);
 assert.match(personal,/personalizationStagesForGoal/);
 assert.match(studio,/goalPlan:goalScenarioPlan\(chosenIdeaGoal,personalGoalOptions\.contextKey\)/);
 assert.match(studio,/goal=\{conceptGoalText\} theme=\{theme\} selectedTopic=\{conceptTopic\}/);
 assert.match(studio,/MandalaAutomaticStoryboard[\s\S]*?goal=\{conceptGoalText\}/);
 assert.match(browser,/data-video-ideas-goal-next/);
 assert.doesNotMatch(picker,/fetch\(|postVideoCreditAction|createQuickVideo|startRecording|localStorage/);
});

test("Purpose switches wording, but never replaces the client's topic",()=>{
 const opts=buildPersonalVideoGoalOptions({
  locale:"en",wish:"Overcome my inner critic",theme:"energy",
  selectedTopic:{topicId:"self-confidence"},
  profile:{current:["selfcritical"],desired:["confident"],axes:["dignity"],energy:4,desiredLevel:7},
  profileConfirmed:true
 });
 const signatures=new Set(),ids=new Set(),mechanisms=new Set();
 for(const offer of opts.goals){
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

test("Second-person support, first-person self-belief, and rest are disjoint",()=>{
 for(const locale of ["ru","en","es"]){
  const args={locale,request:"I need to believe in myself",theme:"energy",selectedTopicId:"self-confidence"};
  const rest=suggestVideoGoalPhrases({...args,goalType:"leisure",limit:7});
  const support=suggestVideoGoalPhrases({...args,goalType:"support",supportNeed:"love",limit:7});
  const change=suggestVideoGoalPhrases({...args,goalType:"change",limit:7});
  assert.equal(rest.length,7);assert.equal(support.length,7);assert.equal(change.length,7);
  assert.equal(new Set([...rest,...support,...change]).size,21,"No cross-purpose captions: "+locale);
  for(const line of [...rest,...support,...change])
   assert.ok(line.trim()&&Array.from(line).length<=36,line+" ("+locale+")");
  assert.equal(support[0],{ru:"Я тебя люблю",en:"I love you",es:"Te quiero"}[locale]);
  assert.ok(change.some(x=>/^Я |^I |^Puedo |^Tengo |^Aprendo |^Merezco |^Me |^Mi /.test(x)));
 }
 assert.match(studio,/goalType:purpose,supportNeed,limit:5/);
 assert.match(studio,/enabled:purpose!=="leisure"/);
 assert.match(studio,/presetOverride:suggestions/);
});
