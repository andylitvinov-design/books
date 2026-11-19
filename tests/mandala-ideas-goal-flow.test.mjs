import test from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {IDEA_GOAL_PAGES,getVideoIdeaGoal,composeVideoIdeaGoalIntent} from "../lib/mandala/video-idea-goals.mjs";
import {getMyTubeTopic} from "../lib/mandala/mytube-content-taxonomy.mjs";
import {suggestVideoConcept} from "../lib/mandala/auto-video-concept.mjs";

const load=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const studio=load("components/mandala-free-video-studio.tsx");
const picker=load("components/mandala-video-idea-goal.tsx");
const goalCss=load("components/mandala-video-idea-goal.module.css");
const mobile=load("components/mandala-video-mobile.module.css");
const personal=load("components/mandala-video-personalization.tsx");
const browser=load("scripts/verify-affirmation-voice-browser.mjs");
const list=IDEA_GOAL_PAGES.flat();

test("Ideas Goal shows three large photo choices per page and nine canonical scenario topics",()=>{
 assert.deepEqual(IDEA_GOAL_PAGES.map(group=>group.length),[3,3,3]);
 assert.deepEqual(list.slice(0,3).map(x=>x.id),["calm","love","energy"]);
 assert.equal(new Set(list.map(x=>x.id)).size,9);
 for(const goal of list){
  const topic=getMyTubeTopic(goal.topicId);
  assert.ok(topic,"Missing topic: "+goal.topicId);
  assert.equal(topic.category.id,goal.categoryId);
  assert.equal(topic.subcategory.id,goal.subcategoryId);
  for(const lang of ["en","ru","es"]){
   for(const name of ["title","detail","intent"])
    assert.ok(goal.copy[lang][name].length>=8,goal.id+" / "+lang+" / "+name);
  }
 }
 for(const photo of ["calm-sea","wildflower-dance","sunbeam-flow","mountain-air","wealth-sunrise",
   "meadow-morning","fern-awakening","mossy-stream","coastal-freedom"]){
  assert.ok(goalCss.includes(photo+".jpg"),photo);
  assert.ok(existsSync(new URL("../public/videos/holistic-house/film-collection-v2/"+photo+".jpg",import.meta.url)),photo);
 }
 assert.match(picker,/data-video-ideas-goal-choice/);
 assert.match(picker,/aria-pressed=\{pressed\}/);
 assert.match(picker,/data-video-ideas-more-goals/);
 assert.match(picker,/data-video-ideas-goals-next/);
 assert.match(picker,/data-video-ideas-goals-prev/);
 assert.match(picker,/disabled=\{disabled\|\|!selected\}/);
 assert.match(mobile,/\.ideasGoalPane\[hidden\]\{display:none!important\}/);
 assert.match(mobile,/\.ideasSubtabs\{display:grid;grid-template-columns:repeat\(3/);
});

test("Personalization advances to Goal; choice advances to Concept; unchanged renderer does not auto-render",()=>{
 assert.equal((studio.match(/data-video-ideas-tab="/g)||[]).length,3);
 assert.equal((studio.match(/<MandalaVideoIdeaGoal /g)||[]).length,1);
 assert.equal((studio.match(/<MandalaVideoConcept /g)||[]).length,1);
 assert.match(studio,/setIdeasProfileConfirmed\(true\);setIdeasSubtab\("goal"\)/);
 assert.match(studio,/data-video-ideas-goal-panel hidden=\{ideasSubtab!=="goal"\}/);
 assert.match(studio,/onContinue=\{\(\)=>setIdeasSubtab\("concept"\)\}/);
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

test("Calm, Love and Energy produce distinct catalogued concepts without overwriting visitor answers",()=>{
 const signatures=new Set(),topics=new Set();
 for(const goal of list.slice(0,3)){
  const prompt=composeVideoIdeaGoalIntent("My video request","en",goal.id);
  assert.ok(prompt.includes("My video request"));
  assert.ok(prompt.includes(goal.copy.en.intent));
  const concept=suggestVideoConcept({locale:"en",goal:prompt,theme:"energy",
    selectedTopicId:goal.topicId,creativeBrief:goal.copy.en.intent,
    personalization:{energyStart:3,energyTarget:8,currentState:"Tired",desiredState:"Calm"}});
  assert.equal(concept.topicId,goal.topicId);
  assert.equal(concept.categoryId,goal.categoryId);
  assert.ok(concept.hasPersonalInput);
  signatures.add(concept.signature);topics.add(concept.topicId);
  for(const locale of ["ru","en","es"])
   assert.equal(composeVideoIdeaGoalIntent("",locale,goal.id),goal.copy[locale].intent);
 }
 assert.equal(signatures.size,3);
 assert.equal(topics.size,3);
 assert.equal(composeVideoIdeaGoalIntent("Keep original","en",null),"Keep original");
 assert.equal(getVideoIdeaGoal("unknown"),null);
});
