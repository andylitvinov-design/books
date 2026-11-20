import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildPersonalVideoGoalOptions,composePersonalVideoGoalIntent,goalScenarioPlan,VIDEO_GOAL_TYPES}
 from "../lib/mandala/video-personal-goal-composer.mjs";
import {rankFilmOptions} from "../lib/mandala/film-personalization-ranker.mjs";
import {getMyTubeTopic} from "../lib/mandala/mytube-content-taxonomy.mjs";

const source=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const base={theme:"life",selectedTopic:{topicId:"self-confidence"},
 profile:{current:["uncertain"],desired:["confident"],axes:["dignity"],energy:3,desiredLevel:7},
 profileConfirmed:true};

test("three goal families are the complete, distinct top-level structure",()=>{
 assert.deepEqual(VIDEO_GOAL_TYPES,["leisure","support","change"]);
 for(const locale of ["ru","en","es"]){
  const rest=buildPersonalVideoGoalOptions({...base,locale,
   wish:locale==="ru"?"Хочу отдохнуть":locale==="es"?"Quiero descansar":"I want to rest and relax"});
  assert.equal(rest.mode,"leisure");
  assert.equal(rest.goals.length,5);
  assert.ok(rest.goals.every(g=>g.type==="leisure"));
  assert.equal(new Set(rest.goals.map(g=>g.id)).size,5);
  const support=buildPersonalVideoGoalOptions({...base,locale,
   wish:locale==="ru"?"Нужна поддержка при тревоге":locale==="es"?"Necesito apoyo con ansiedad":"I need support with anxiety"});
  assert.equal(support.mode,"support");
  assert.equal(support.goals.slice(0,3).filter(g=>g.type==="support").length,3);
  const change=buildPersonalVideoGoalOptions({...base,locale,
   wish:locale==="ru"?"Преодолеть страх осуждения":locale==="es"?"Superar la fobia":"Overcome a phobia"});
  assert.equal(change.mode,"change");
  assert.equal(change.goals.slice(0,3).filter(g=>g.type==="change").length,3);
  for(const offer of [...rest.goals,...support.goals,...change.goals]){
   assert.ok(offer.copy[locale].title.length>=8);
   assert.ok(offer.copy[locale].intent.length>offer.copy[locale].title.length);
   assert.equal(offer.topicId,"self-confidence","Goal must never override selected quiz topic");
   assert.equal(offer.categoryId,getMyTubeTopic("self-confidence").category.id);
   assert.ok(["journey","shelter","reframe","integration"].includes(offer.scenarioStrategy));
  }
 }
});

test("unconfirmed default chips and sensitive profile never become diagnosed facts",()=>{
 const input={locale:"en",wish:"I want a beautiful story",theme:"life",
  profile:{current:["selfcritical"],desired:["confident"],axes:["dignity"],energy:1},
  profileConfirmed:false};
 const unconfirmed=buildPersonalVideoGoalOptions(input);
 assert.equal(unconfirmed.profileUsed,false);
 assert.ok(unconfirmed.goals.every(g=>!g.copy.en.intent.includes("self-critical")));
 const confirmed=buildPersonalVideoGoalOptions({...input,profileConfirmed:true});
 assert.notEqual(confirmed.contextKey,unconfirmed.contextKey);
 assert.equal(confirmed.profileUsed,true);
 assert.ok(unconfirmed.goals.every(g=>g.type==="leisure"),
  "An explicit rest/entertainment wish cannot be reclassified as therapy");
});
test("goal selection preserves the request, only consented quiz context and explicit purpose",()=>{
 const opts=buildPersonalVideoGoalOptions({...base,locale:"ru",
  wish:"Преодолеть страх осуждения"});
 const selected=opts.goals[0];
 const intent=composePersonalVideoGoalIntent("Мой исходный запрос",selected,"ru");
 assert.ok(intent.includes("Мой исходный запрос"));
 assert.ok(intent.includes(selected.copy.ru.title));
 assert.ok(intent.includes("dignity")||intent.includes("самоуважение"));
 const plan=goalScenarioPlan(selected,opts.contextKey);
 assert.equal(plan.id,selected.id);
 assert.equal(plan.topicId,"self-confidence");
 assert.equal(plan.contextKey,opts.contextKey);
 assert.equal(composePersonalVideoGoalIntent("Original",null,"en"),"Original");
});

test("selected goal's story mechanism changes which ACTUAL film roles are recommended",()=>{
 const films=["journey","shelter","reframe","integration"].map((genre,i)=>({
  id:"film-"+i,genre,scenarioId:"self-confidence-s"+(i+1),
  fitProfile:{current:[],desired:[],focus:[],energy:"gentle"}
 }));
 const withPlan=(scenarioStrategy,secondaryScenarioStrategy)=>({
  goalPlan:{scenarioStrategy,secondaryScenarioStrategy},personalizationSignals:null
 });
 const resting=rankFilmOptions(films,withPlan("shelter","integration"));
 const rethinking=rankFilmOptions(films,withPlan("reframe","journey"));
 const acting=rankFilmOptions(films,withPlan("journey","reframe"));
 assert.deepEqual(resting.map(x=>x.genre),["shelter","integration"]);
 assert.deepEqual(rethinking.map(x=>x.genre),["reframe","journey"]);
 assert.deepEqual(acting.map(x=>x.genre),["journey","reframe"]);
 assert.ok(resting[0].matchFactors.includes("selected_goal_mechanism"));
});

test("One persisted Ideas Goal and one existing Concept/Storyboard, with 3+2 visible choice",()=>{
 const studio=source("components/mandala-free-video-studio.tsx");
 const ui=source("components/mandala-video-idea-goal.tsx");
 const ranker=source("lib/mandala/film-personalization-ranker.mjs");
 assert.equal((studio.match(/<MandalaVideoIdeaGoal /g)||[]).length,1);
 assert.equal((studio.match(/<MandalaVideoConcept /g)||[]).length,1);
 assert.match(studio,/selectedTopic:selectedConceptTopic/);
 assert.match(studio,/goalPlan:goalScenarioPlan\(chosenIdeaGoal,personalGoalOptions\.contextKey\)/);
 assert.match(studio,/key=\{personalGoalOptions\.contextKey\}/);
 assert.match(studio,/setIdeasSubtab\("goal"\)/);
 assert.match(studio,/setIdeasSubtab\("concept"\)/);
 assert.match(ui,/options\.goals\.slice\(0,3\)/);
 assert.match(ui,/options\.goals\.slice\(3,5\)/);
 assert.match(ui,/data-video-ideas-more-goals/);
 assert.match(ranker,/selected_goal_mechanism/);
 for(const op of ["fetch(","navigator.sendBeacon(","localStorage.setItem("])
  assert.ok(!ui.includes(op),op+" must not transmit the psychology quiz");
});

test("curated anxiety and relationship stories also honor the selected mechanism",()=>{
 const anxiety=[
  {id:"anxiety-platform"},{id:"anxiety-quiet"},{id:"anxiety-lamp"}
 ];
 assert.equal(rankFilmOptions(anxiety,{goalPlan:{
  scenarioStrategy:"shelter",secondaryScenarioStrategy:"integration"}})[0].id,
  "anxiety-quiet");
 assert.equal(rankFilmOptions(anxiety,{goalPlan:{
  scenarioStrategy:"journey",secondaryScenarioStrategy:"shelter"}})[0].id,
  "anxiety-platform");
 const relationship=[{id:"space"},{id:"real"},{id:"crossing"}];
 assert.equal(rankFilmOptions(relationship,{goalPlan:{
  scenarioStrategy:"reframe",secondaryScenarioStrategy:"integration"}})[0].id,"real");
 assert.equal(rankFilmOptions(relationship,{goalPlan:{
  scenarioStrategy:"integration",secondaryScenarioStrategy:"journey"}})[0].id,"space");
});
