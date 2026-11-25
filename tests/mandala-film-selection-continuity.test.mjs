import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {suggestVideoConcept} from "../lib/mandala/auto-video-concept.mjs";
import {getVideoCreativeDirections,applyVideoCreativeDirection}
 from "../lib/mandala/video-creative-directions.mjs";
import {resolveSelectedVideoFilm,isCurrentVideoFilmIntent}
 from "../lib/mandala/video-story-selection.mjs";
import {buildAlignedStorySceneGuides} from "../lib/mandala/storyboard-content-alignment.mjs";
import {describeStoryboardSceneGraphic} from "../lib/mandala/storyboard-scene-graphic.mjs";

const source=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const baseFor=locale=>suggestVideoConcept({
 locale,goal:"Ready for a Relationship",theme:"relationships",
 selectedTopicId:"ready-relationship",
 personalization:{currentState:"Uncertain",desiredState:"Connected",
  focus:"Connection",currentIds:["uncertain"],desiredIds:["connected"],
  focusIds:["connection"],energyStart:4,energyTarget:7}
});

test("owner iPhone regression: choosing Being Real survives Ideas -> Story without approval",()=>{
 for(const locale of ["en","ru","es"]){
  const base=baseFor(locale),options=getVideoCreativeDirections(base,locale);
  const beingReal=options.find(x=>x.id==="real");
  const makingRoom=options.find(x=>x.id==="space");
  assert.ok(beingReal&&makingRoom,"both story choices must exist for "+locale);
  const selected=applyVideoCreativeDirection(base,beingReal);
  const first=applyVideoCreativeDirection(base,makingRoom);
  assert.equal(selected.creativeDirectionId,"real");
  assert.notEqual(selected.creativeTitle,first.creativeTitle);
  const handoff=resolveSelectedVideoFilm({
   base,locale,draft:selected,approved:null,selectedDirectionId:"real"
  });
  assert.equal(handoff.selectionMissing,false);
  assert.equal(handoff.source,"draft");
  assert.equal(handoff.directionId,"real");
  assert.equal(handoff.concept.creativeTitle,selected.creativeTitle);
  assert.notEqual(handoff.concept.creativeTitle,first.creativeTitle);
  assert.deepEqual(handoff.concept.storyboard.map(x=>x.action),
   beingReal.storyboard.map(x=>x.action));
  const shots=buildAlignedStorySceneGuides({
   locale,goal:base.goal,concept:handoff.concept,count:6,phrases:[]
  }).scenes;
  assert.equal(shots.length,6);
  assert.deepEqual(shots.map(x=>x.visual),beingReal.storyboard.map(x=>x.action));
 }
});

test("an explicit film choice wins over a stale draft, never silently resets to film one",()=>{
 const base=baseFor("en");
 const options=getVideoCreativeDirections(base,"en");
 const space=applyVideoCreativeDirection(base,options.find(x=>x.id==="space"));
 const real=applyVideoCreativeDirection(base,options.find(x=>x.id==="real"));
 const chosen=resolveSelectedVideoFilm({base,locale:"en",selectedDirectionId:"real",
  draft:space,approved:space});
 assert.equal(chosen.directionId,"real");
 assert.equal(chosen.concept.creativeTitle,real.creativeTitle);
 assert.equal(chosen.source,"selected");
 const missing=resolveSelectedVideoFilm({base,locale:"en",selectedDirectionId:"gone",
  draft:space,approved:real});
 assert.equal(missing.selectionMissing,true);
 assert.equal(missing.source,"selection_missing");
 assert.equal(missing.concept.signature,base.signature);
});

test("new client goal or personal preferences invalidate the previous film selection",()=>{
 const before=baseFor("en"),real=getVideoCreativeDirections(before,"en").find(x=>x.id==="real");
 const old=applyVideoCreativeDirection(before,real);
 const other=suggestVideoConcept({locale:"en",goal:"Develop my career",
  theme:"money",selectedTopicId:"career-growth"});
 assert.equal(isCurrentVideoFilmIntent(before,old),true);
 assert.equal(isCurrentVideoFilmIntent(other,old),false);
 const current=resolveSelectedVideoFilm({base:other,locale:"en",draft:old});
 assert.notEqual(current.concept.creativeTitle,old.creativeTitle);
 assert.notEqual(current.directionId,"real");
});

test("scripted Being Real scenes produce their own objects, never an unrelated clock or suitcase",()=>{
 for(const locale of ["en","ru","es"]){
  const base=baseFor(locale);
  const real=getVideoCreativeDirections(base,locale).find(x=>x.id==="real");
  const film=applyVideoCreativeDirection(base,real);
  const visuals=film.storyboard.map((shot,index)=>describeStoryboardSceneGraphic({
    action:shot.action,visualSubject:shot.visualSubject,keywords:shot.keywords
  }));
  assert.ok(visuals[0].cueIds.includes("phone"),
    "scene 1 must depict the phone vibrating by the kitchen window, not invented transport");
  assert.doesNotMatch(film.storyboard[0].action,/transport|commut|транспорт|transporte/i,
    "the screenplay opens by the kitchen window, not with an unrelated commute");
  assert.ok(visuals[1].cueIds.includes("phone"),
    "scene 2 must show the actual question on the phone");
  assert.ok(visuals[2].cueIds.includes("typing"),
    "scene 3 must show editing/typing the response");
  assert.ok(visuals[3].cueIds.includes("rain"),
    "scene 4 must show the rainy pause");
  assert.ok(!visuals[3].cueIds.includes("clock"),
    "watches the rain is not a watch/clock prop");
  assert.ok(visuals.every(x=>x.visualStatus==="editorial_scene_sketch_unverified"));
  for(let index=0;index<visuals.length;index++){
   assert.equal(visuals[index].sourceAction,film.storyboard[index].action);
   assert.ok(!visuals[index].cueIds.includes("luggage"));
  }
 }
});

test("the actual workspaces use one signature, one selected option, and expanded exact actions",()=>{
 const studio=source("components/mandala-free-video-studio.tsx");
 const ideas=source("components/mandala-video-concept.tsx");
 const montage=source("components/mandala-automatic-storyboard.tsx");
 assert.match(studio,/const sharedFilmBrief=useMemo/);
 assert.match(studio,/suggestedConcept=\{sharedFilmBrief\} selectedDirectionId=\{activeFilmDirectionId\}/);
 assert.equal((studio.match(/suggestedConcept=\{sharedFilmBrief\} selectedDirectionId=\{activeFilmDirectionId\}/g)||[]).length,2);
 assert.match(studio,/setChosenFilm\(draft\.creativeDirectionId/);
 assert.match(studio,/setChosenFilm\(approved\.creativeDirectionId/);
 assert.match(studio,/selectedTopic=\{selectedConceptTopic\}/);
 assert.doesNotMatch(studio,/selectedTopic=\{musicMvCreative\?\.selected\?/);
 assert.match(ideas,/const suggested=suggestedConcept\|\|localSuggested/);
 assert.match(ideas,/directions\.find\(d=>d\.id===selectedDirectionId\)/);
 assert.match(montage,/resolveSelectedVideoFilm<ApprovedVideoConcept>/);
 assert.match(montage,/data-storyboard-selection-missing/);
 assert.match(montage,/data-storyboard-selection-source=\{choice\.source\}/);
 assert.match(montage,/data-storyboard-scene-action aria-expanded=\{expandedScene===index\}/);
 assert.match(montage,/data-storyboard-expanded=\{expandedScene===index\}/);
});
