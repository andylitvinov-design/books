import test from "node:test";
import assert from "node:assert/strict";
import {getMyTubeTaxonomy,auditMyTubeTaxonomy} from "../lib/mandala/mytube-content-taxonomy.mjs";
import {suggestVideoConcept} from "../lib/mandala/auto-video-concept.mjs";
import {getVideoCreativeDirections,applyVideoCreativeDirection} from "../lib/mandala/video-creative-directions.mjs";
import {buildAlignedStorySceneGuides} from "../lib/mandala/storyboard-content-alignment.mjs";
import {buildConceptShotSketch} from "../lib/mandala/video-concept-semantic.mjs";
import {
 auditCompleteFilmScreenplays,getCompleteFilmScreenplay,listCompleteFilmScreenplays,
 listScreenplayIds,FILM_SCREENPLAY_COUNT
} from "../lib/mandala/film-screenplay-256.mjs";
import {film256EditorialOverrideIds} from "../lib/mandala/film-256-editorial-overrides.mjs";
import {FILM_TOPIC_PROPS} from "../lib/mandala/film-256-props.mjs";

const locales=["ru","en","es"];
const catalog=getMyTubeTaxonomy();
const topics=catalog.categories.flatMap(category=>category.subcategories.flatMap(subcategory=>
 subcategory.topics.map(topic=>({category,subcategory,topic}))));
const scenarioIds=topics.flatMap(({topic})=>topic.scenarios.map(s=>s.id));

test("the canonical inventory stays 64 topics x 4 scenarios, with no imaginary media",()=>{
 assert.equal(auditMyTubeTaxonomy().ok,true);
 assert.equal(topics.length,64);
 assert.equal(scenarioIds.length,256);
 assert.equal(new Set(scenarioIds).size,256);
 assert.equal(FILM_SCREENPLAY_COUNT,256);
 assert.deepEqual(new Set(listScreenplayIds()),new Set(scenarioIds));
 assert.equal(Object.keys(FILM_TOPIC_PROPS).length,64);
 for(const {topic} of topics)assert.equal(FILM_TOPIC_PROPS[topic.id].length,4);
});

test("every one of 256 original scenario IDs has a complete RU/EN/ES 30-second screenplay",()=>{
 for(const locale of locales){
  const audit=auditCompleteFilmScreenplays(locale);
  assert.deepEqual(audit.errors,[],locale+": "+JSON.stringify(audit.errors.slice(0,8)));
  assert.equal(audit.total,256);
  const scripts=scenarioIds.map(id=>getCompleteFilmScreenplay(id,locale));
  assert.equal(new Set(scripts.map(x=>x.title)).size,256);
  assert.equal(new Set(scripts.map(x=>x.story)).size,256);
  assert.ok(scripts.every(x=>x.review.status==="pass"&&x.review.score>=28));
  for(const script of scripts){
   assert.ok(script.story.length>350);
   assert.equal(script.sourceStages.length,4);
   assert.equal(script.conceptScenes.length,6);
   assert.equal(script.storyboard.length,6);
   assert.equal(new Set(script.storyboard.map(shot=>shot.visualAction)).size,6);
   assert.deepEqual(script.conceptScenes.map(scene=>scene.action),
    script.storyboard.map(shot=>shot.action),"The film, not stock footage, owns the actions");
   assert.deepEqual(script.conceptScenes.map(scene=>scene.id),
    script.storyboard.map(shot=>shot.sceneId));
   assert.deepEqual(script.storyboard.map(shot=>[shot.startSeconds,shot.endSeconds]),
    [[0,5],[5,10],[10,15],[15,20],[20,25],[25,30]]);
   assert.ok(script.storyboard.every(shot=>
    shot.sourceVerified===false&&shot.sourceStatus==="editorial_unverified"&&
    script.sourceStages[shot.sourceBeatIndex]===shot.sourceBeat));
   assert.doesNotMatch(script.idea+" "+script.story,
    /→|(?:the story opens with|something begins to change|then comes the turning point)/i);
   assert.ok(script.symbol&&script.activeSymbol?.name===script.symbol);
   assert.equal(script.mediaBindingStatus,"editorial_only_unverified");
   assert.equal(script.sourceStatus,"editorial_unverified");
  }
 }
});

test("each localized shot retains the same plot beat for action, title and emotional arc",()=>{
 for(const locale of locales)for(const id of scenarioIds){
  const film=getCompleteFilmScreenplay(id,locale);
  assert.deepEqual(film.storyboard.map(shot=>shot.sourceBeatIndex),[0,0,1,2,3,3]);
  assert.deepEqual(film.storyboard.map(shot=>shot.sourceBeat),film.conceptScenes.map(scene=>scene.sourceBeat));
  assert.deepEqual(buildConceptShotSketch(film).map(shot=>shot.stageIndex),
   film.storyboard.map(shot=>shot.sourceBeatIndex));

  for(const {scene,originalBeat} of film.specificBeatActions){
   const shot=film.storyboard[scene-1];
   assert.equal(shot.sourceBeat,originalBeat,locale+":"+id+":scene:"+scene);
   assert.equal(shot.title,originalBeat);
   assert.equal(shot.emotionalFunction,film.emotionalBeats[shot.sourceBeatIndex]);
   assert.equal(film.conceptScenes[scene-1].sourceBeat,originalBeat);
  }
 }
});

test("the screenshot's four motivation films are individually directed, not relabeled stock shots",()=>{
 assert.deepEqual(film256EditorialOverrideIds,[
  "motivation-drive-s1","motivation-drive-s2","motivation-drive-s3","motivation-drive-s4",
  "money-blocks-s1","money-blocks-s2","money-blocks-s3","money-blocks-s4",
  "couple-conflict-s1","couple-conflict-s2","couple-conflict-s3","couple-conflict-s4",
  "self-acceptance-s1","self-acceptance-s2","self-acceptance-s3","self-acceptance-s4",
  "low-self-esteem-s1","low-self-esteem-s2","low-self-esteem-s3","low-self-esteem-s4"
 ]);
 for(const locale of locales){
  const films=listCompleteFilmScreenplays("motivation-drive",locale);
  assert.equal(films.length,4);
  assert.ok(films.every(x=>x.editorialTreatment==="individually_directed"));
  assert.equal(new Set(films.map(x=>x.story)).size,4);
  assert.notEqual(films[0].storyboard[0].action,films[1].storyboard[0].action);
  assert.ok(films.every(x=>x.sourceStages.length===4&&x.review.status==="pass"));
 }
});

test("four complete films per topic are ranked to two, and matching plot reaches Montage verbatim",()=>{
 for(const locale of locales)for(const {category,topic} of topics){
  const p=suggestVideoConcept({
   locale,theme:"life",goal:topic.label[locale],selectedTopicId:topic.id,
   personalization:{
    currentState:"Uncertain",desiredState:"Calm",focus:"Growth",
    currentIds:["uncertain"],desiredIds:["calm"],focusIds:["growth"],
    energyStart:4,energyTarget:6
   }
  });
  const available=listCompleteFilmScreenplays(topic.id,locale,p);
  assert.equal(available.length,4,"four source-specific film candidates: "+topic.id);
  const selected=getVideoCreativeDirections(p,locale);
  // A named breathing/relaxation exercise remains in the existing guided
  // practice workflow; scripts are available in the library but not routed
  // as ordinary fiction without an explicit film request.
  if(["practice","presentation","celebration","audio_visual"].includes(p.semanticPurpose)){
   assert.equal(selected.length,0,topic.id+":"+locale+": preserve direct practice");
   continue;
  }
  assert.equal(selected.length,2,topic.id+":"+locale);
  assert.equal(new Set(selected.map(x=>x.id)).size,2);
  for(const direction of selected){
   const specialized=["ready-relationship","anxiety-no-reason"].includes(topic.id);
   if(!specialized){
    assert.ok(/-s[1-4]$/.test(direction.scenarioId));
    assert.equal(direction.originalCatalogId,direction.scenarioId);
    assert.equal(direction.topicId,topic.id);
    assert.equal(direction.categoryId,category.id);
   }else assert.ok(direction.storyboard?.length===6,
      "the previously hand-directed topic must stay available");
   const approved=applyVideoCreativeDirection(p,direction);
   assert.equal(approved.scenarioId,direction.scenarioId);
   assert.equal(approved.conceptText,direction.story);
   const sketch=buildConceptShotSketch(approved,30);
   const montage=buildAlignedStorySceneGuides({locale,goal:approved.goal,
      concept:approved,phrases:[],count:6}).scenes;
   assert.deepEqual(sketch.map(x=>x.beat),direction.storyboard.map(x=>x.action));
   assert.deepEqual(montage.map(x=>x.visual),direction.storyboard.map(x=>x.action));
   if(!specialized)assert.deepEqual(montage.map(x=>x.sourceSceneId),
     direction.storyboard.map(x=>x.sceneId));
  }
 }
});

test("sensitive scripts remain in the present, without forced reliving or guaranteed cure",()=>{
 for(const locale of locales)for(const topicId of ["childhood-trauma","inner-child",
   "rejection-wounds","panic-attacks","low-mood","apathy"]){
  const entries=listCompleteFilmScreenplays(topicId,locale);
  assert.equal(entries.length,4);
  assert.ok(entries.every(x=>x.storyboard.every(shot=>shot.sourceStatus==="editorial_unverified")));
  assert.ok(entries.every(x=>!/(?:guaranteed cure|cured forever|must forgive|debes perdonar|должен простить)/iu.test(x.story)));
 }
 const trauma=getCompleteFilmScreenplay("childhood-trauma-s4","en");
 assert.match(trauma.story,/closed|unopened/i);
 assert.doesNotMatch(trauma.story,/open the chest and relive/i);
});

test("the 256 catalog remains unchanged, and uploads/source footage stay unverified",()=>{
 assert.equal(catalog.status,"editorial_master_catalog_not_published");
 for(const locale of locales){
  const script=getCompleteFilmScreenplay("motivation-drive-s2",locale);
  assert.ok(script.conceptScenes.every((s,index)=>s.id===script.storyboard[index].sceneId));
  const expanded=buildConceptShotSketch({
   storyboard:script.storyboard.map(s=>({...s})),
   sceneOutline:script.sourceStages
  },60);
  assert.equal(expanded.length,6,"retiming cannot change screenplay scene count");
  assert.equal(expanded.at(-1).endSeconds,60);
 }
});
