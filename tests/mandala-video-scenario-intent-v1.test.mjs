import test from "node:test";
import assert from "node:assert/strict";
import {listMyTubeScenarios,getMyTubeTopic} from "../lib/mandala/mytube-content-taxonomy.mjs";
import {selectVideoScenario,rankVideoScenarioChoices,VIDEO_SCENARIO_FIT_VERSION} from "../lib/mandala/video-scenario-fit.mjs";
import {suggestVideoConcept,videoConceptIsValid} from "../lib/mandala/auto-video-concept.mjs";
import {rankFilmOptions} from "../lib/mandala/film-personalization-ranker.mjs";
import {analyzeMusicShape,planMusicVisualBeats,suggestMusicVideoDirections} from "../lib/mandala/music-mv-director.mjs";

test("client intent determines authored story variant in RU, EN and ES",()=>{
 const samples=[
  ["everyday-overload","ru","В офисе наваливаются просьбы, хочу научиться говорить нет.","everyday-overload-s4"],
  ["relationship-problems","en","I want to repair a small rupture after our argument","relationship-problems-s3"],
  ["find-love","es","quiero conocer una pareja sin prisa, poco a poco","find-love-s4"],
  ["low-energy","en","I need to ask for help and share the load; I am exhausted","low-energy-s3"],
  ["money-mindset","en","I want to understand price and value without shame","money-mindset-s2"]
 ];
 for(const [topicId,locale,goal,expected] of samples){
  const alternatives=listMyTubeScenarios(topicId,locale);
  const topicLabel=getMyTubeTopic(topicId)?.topic?.label[locale];
  const match=selectVideoScenario(alternatives,{goal,topicLabel});
  assert.equal(match?.scenario.id,expected,topicId+":"+locale);
  assert.equal(match?.confidence,"high",topicId+":"+locale);
  assert.equal(new Set(rankVideoScenarioChoices(alternatives,{goal}).map(x=>x.scenarioId)).size,4);
 }
});

test("one proposed film combines written and spoken wishes without claiming source footage",()=>{
 const brief={locale:"en",theme:"relationships",selectedTopicId:"relationship-problems",
  goal:"I want to repair a small rupture after our argument"};
 const film=suggestVideoConcept(brief);
 assert.ok(videoConceptIsValid(film));
 assert.equal(film.scenarioId,"relationship-problems-s3");
 assert.deepEqual(film.sceneOutline,listMyTubeScenarios("relationship-problems","en")[2].sceneOutline);
 assert.equal(film.scenarioFit?.version,VIDEO_SCENARIO_FIT_VERSION);
 assert.equal(film.scenarioFit?.mediaVerified,false);
 const combined=suggestVideoConcept({...brief,speechTranscript:{
  text:"We argue about the same thing. I would like to listen more carefully."}});
 assert.equal(combined.topicId,"relationship-problems");
 assert.ok(combined.scenarioFit.sources.includes("voice"));
 assert.ok(combined.scenarioFit.sources.includes("goal"));
 assert.equal(combined.mediaBindingStatus,"editorial_only_unverified");
});

test("explicit visual bans outrank any storyboard match",()=>{
 const options=[
  {id:"forest",archetype:"journey",label:"Forest path",sceneOutline:["Walk in a forest"]},
  {id:"room",archetype:"shelter",label:"Quiet room",sceneOutline:["A quiet city room"]}
 ];
 const found=selectVideoScenario(options,{
  goal:"Без леса, хочу тихую комнату",avoidImagery:["forest"]});
 assert.equal(found.scenario.id,"room");
 const film=suggestVideoConcept({locale:"ru",theme:"health",
  goal:"Хочу спокойствия без леса",selectedTopicId:"stress-relief"});
 assert.ok(film.avoidImagery.includes("forest"));
});

test("approved film shortlist prioritizes specific intent; generic topic remains unchanged",()=>{
 const shots=[{id:"first",scenarioId:"t-s1"},{id:"specific",scenarioId:"t-s3"}];
 assert.equal(rankFilmOptions(shots,{scenarioId:"t-s3",scenarioFit:{confidence:"high"}})[0].id,"specific");
 assert.equal(rankFilmOptions(shots,{scenarioId:"t-s3",scenarioFit:{confidence:"low"}})[0].id,"first");
});

test("music alone yields a six-shot 30-second acoustic arc, not fictional lyrics",()=>{
 const seconds=30,rate=8000,ch=new Float32Array(seconds*rate);
 for(let i=0;i<ch.length;i++)
  ch[i]=[.05,.09,.42,.02][Math.min(3,Math.floor(i/(rate*seconds/4)))]*Math.sin(i*.22);
 const shape=analyzeMusicShape([ch],rate,seconds);
 assert.equal(shape.derivedFrom,"audio_signal_not_semantic_content");
 for(const locale of ["ru","en","es"]){
  const beats=planMusicVisualBeats(shape,{locale});
  assert.deepEqual(beats.map(x=>[x.startSeconds,x.endSeconds]),
   [[0,5],[5,10],[10,15],[15,20],[20,25],[25,30]]);
  assert.ok(beats.every(x=>x.mediaVerified===false&&x.visualSubjectVerified===false));
  const ideas=suggestMusicVideoDirections({shape,theme:"life",locale});
  assert.equal(ideas.length,3);
  assert.ok(ideas.every(x=>x.subjectSource==="selected_theme_only"&&
   x.inferredLyrics===false&&x.storyboard.length===6&&x.needsSourceReview));
 }
});