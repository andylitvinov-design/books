import test from "node:test";
import assert from "node:assert/strict";
import {auditMyTubeTaxonomy} from "../lib/mandala/mytube-content-taxonomy.mjs";
import {listAuthoredFilmPlots,selectVideoStoryFamily} from "../lib/mandala/film-story-atlas-v3.mjs";
import {suggestVideoConcept} from "../lib/mandala/auto-video-concept.mjs";
import {getVideoCreativeDirections,applyVideoCreativeDirection} from "../lib/mandala/video-creative-directions.mjs";
import {
 FILM_OPTION_COUNT,FILM_PERSONALIZATION_RANK_VERSION,
 confirmedFilmSignals,assessFilmPersonalizationFit,rankFilmOptions
} from "../lib/mandala/film-personalization-ranker.mjs";

const profile=(currentIds,desiredIds,focusIds,energyStart=4,energyTarget=7)=>({
 currentState:"Confirmed current state",
 desiredState:"Confirmed desired state",
 focus:"Confirmed focus",
 currentIds,desiredIds,focusIds,energyStart,energyTarget
});
const topic=(locale,topicId,goal,personalization)=>suggestVideoConcept({
 locale,theme:"energy",goal,selectedTopicId:topicId,personalization
});
test("canonical inventory retains 256 editorial subjects while independent film layer adds scripts",()=>{
 const audit=auditMyTubeTaxonomy();
 assert.equal(audit.ok,true,JSON.stringify(audit.errors));
 assert.equal(audit.counts.scenarios,256);
 assert.equal(audit.counts.topics,64);
 assert.equal(["growth","money","stress","purpose","intimacy","generic"]
  .reduce((total,id)=>total+listAuthoredFilmPlots(id).length,0),18);
 assert.equal(FILM_OPTION_COUNT,2);
});
test("only confirmed structured profile fields can affect the editorial rank",()=>{
 const unknown={currentIds:["fatigue"],desiredIds:["rested"],focusIds:["anchor"],
  energyStart:1,energyTarget:3};
 assert.equal(confirmedFilmSignals({personalizationSignals:unknown}),null);
 const ignored=assessFilmPersonalizationFit({id:"v3-between-tasks"},
  {personalizationSignals:unknown});
 assert.deepEqual(ignored,{score:0,factors:["topic"],personalized:false});
 const real={personalizationSignals:{...unknown,source:"confirmed_answers"}};
 assert.deepEqual(confirmedFilmSignals(real).currentIds,["fatigue"]);
 const fit=assessFilmPersonalizationFit({id:"v3-between-tasks"},real);
 assert.ok(fit.score>10);
 assert.ok(fit.factors.includes("current")&&fit.factors.includes("desired"));
 assert.equal(assessFilmPersonalizationFit({id:"v3-between-tasks"},real).score,fit.score);
});
test("actual stress films change with current state, desired state and focus in EN/RU/ES",()=>{
 const samples=[
  profile(["fatigue","tension"],["calm","rested"],["anchor"],2,3),
  profile(["overwhelmed","uncertain"],["clarity","fulfilled"],["agency"],5,7),
  profile(["loneliness","overwhelmed"],["supported","connected"],["connection"],4,6)
 ];
 for(const locale of ["ru","en","es"]){
  const a=samples.map(p=>topic(locale,"stress-relief","Stress Relief",p));
  assert.ok(a.every(x=>x.personalizationSignals?.source==="confirmed_answers"));
  const results=a.map(x=>getVideoCreativeDirections(x,locale));
  assert.ok(results.every(x=>x.length===2));
  assert.equal(results[0][0].id,"film256-stress-relief-s2");
  assert.equal(results[1][0].id,"film256-stress-relief-s1");
  assert.equal(results[2][0].id,"film256-stress-relief-s2");
  assert.notDeepEqual(results[0].map(x=>x.id),results[1].map(x=>x.id));
  for(let i=0;i<results.length;i++)for(const choice of results[i]){
   assert.equal(choice.personalizationRankVersion,FILM_PERSONALIZATION_RANK_VERSION);
   assert.ok(choice.matchFactors.length>0);
   assert.equal(choice.storyboard.length,6);
   const directed=applyVideoCreativeDirection(a[i],choice);
   assert.equal(directed.creativeRankVersion,FILM_PERSONALIZATION_RANK_VERSION);
   assert.deepEqual(directed.creativeMatchFactors,choice.matchFactors);
   assert.deepEqual(directed.conceptScenes.map(s=>s.id),
    directed.storyboard.map(s=>s.sceneId));
  }
 }
});
test("growth options are selected from different authored stories for distinct profiles",()=>{
 const low=topic("en","personal-growth","Personal Growth",
  profile(["selfcritical"],["accepted"],["meaning"],3,4));
 const engaged=topic("en","personal-growth","Personal Growth",
  profile(["stuck","discouraged"],["supported","connected"],["connection"],4,8));
 const a=getVideoCreativeDirections(low,"en").map(x=>x.id);
 const b=getVideoCreativeDirections(engaged,"en").map(x=>x.id);
 assert.deepEqual(a,["film256-personal-growth-s3","film256-personal-growth-s2"]);
 assert.deepEqual(b,["film256-personal-growth-s4","film256-personal-growth-s2"]);
 assert.equal(new Set(a).size,2);
 assert.equal(new Set(b).size,2);
});
test("the input energy range participates in rank only after confirmation",()=>{
 const withEnergy={personalizationSignals:{source:"confirmed_answers",
  currentIds:[],desiredIds:[],focusIds:[],energyStart:1,energyTarget:3}};
 const fit=assessFilmPersonalizationFit({id:"v3-between-tasks"},withEnergy);
 assert.ok(fit.factors.includes("energy"));
 const without={personalizationSignals:{source:"confirmed_answers",
  currentIds:[],desiredIds:[],focusIds:[],energyStart:null,energyTarget:null}};
 assert.ok(!assessFilmPersonalizationFit({id:"v3-between-tasks"},without).factors.includes("energy"));
});
test("two results stay unique and sorted, without inventing a third when imagery is excluded",()=>{
 const a=topic("en","ready-relationship","Ready for a Relationship",
  profile(["loneliness","fatigue"],["connected","safe"],["connection"],3,6));
 const selections=getVideoCreativeDirections(a,"en");
 assert.equal(selections.length,2);
 assert.equal(new Set(selections.map(x=>x.id)).size,2);
 const filtered=getVideoCreativeDirections({...a,avoidImagery:["water","forest"]},"en");
 assert.ok(filtered.length<=2&&filtered.length>=1);
 const content=filtered.map(x=>[x.idea,x.story,...x.storyboard.map(y=>y.action)].join(" "));
 assert.ok(content.every(x=>!/rain|river|lake|ocean|forest|woods/iu.test(x)));
 assert.deepEqual(rankFilmOptions([{id:"one"},{id:"two"},{id:"two"}],{}).map(x=>x.id),
  ["one","two"]);
});


test("64-topic audit routes everyday fatigue to gentle scenes, motivation to growth",()=>{
 assert.equal(selectVideoStoryFamily({topicId:"motivation-drive",categoryId:"energy-confidence"}),"growth");
 assert.equal(selectVideoStoryFamily({topicId:"morning-energy",categoryId:"energy-confidence"}),"growth");
 for(const id of ["everyday-overload","evening-fatigue","mental-tiredness",
  "recovery-after-load","low-energy","mental-clarity","body-awareness","calm-presence"]){
  assert.equal(selectVideoStoryFamily({topicId:id,categoryId:"energy-confidence"}),"stress",id);
 }
 assert.equal(selectVideoStoryFamily({topicId:"chronic-stress",categoryId:"stress-anxiety"}),"stress");
 const fatigue=topic("en","evening-fatigue","Evening Fatigue",
  profile(["fatigue","drained"],["rested","calm"],["anchor"],2,4));
 const options=getVideoCreativeDirections(fatigue,"en");
 assert.equal(options.length,2);
 assert.equal(options[0].id,"film256-evening-fatigue-s2");
 assert.ok(options.every(x=>x.storyboard.length===6));
});
