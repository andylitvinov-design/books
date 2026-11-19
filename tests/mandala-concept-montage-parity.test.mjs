import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {suggestVideoConcept} from "../lib/mandala/auto-video-concept.mjs";
import {getVideoCreativeDirections,applyVideoCreativeDirection} from "../lib/mandala/video-creative-directions.mjs";
import {buildAlignedStorySceneGuides} from "../lib/mandala/storyboard-content-alignment.mjs";
import {buildConceptShotSketch} from "../lib/mandala/video-concept-semantic.mjs";

const source=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("relationship film: Ideas' six approved actions become the six Montage guides, without changing their order",()=>{
 const base=suggestVideoConcept({locale:"en",goal:"Ready for a Relationship",
   theme:"relationships",selectedTopicId:"ready-relationship"});
 const directions=getVideoCreativeDirections(base,"en");
 assert.ok(directions.length>=1,"Creative Director must supply a film");
 const selected=applyVideoCreativeDirection(base,directions[0]);
 assert.equal(selected.storyboard?.length,6,"A selected film is exactly six shots");
 const guides=buildAlignedStorySceneGuides({locale:"en",goal:selected.goal,
   phrases:[],concept:selected,count:6,pace:"slow"});
 assert.equal(guides.scenes.length,6);
 assert.deepEqual(guides.scenes.map(scene=>scene.visual),
   selected.storyboard.map(shot=>shot.action));
 assert.deepEqual(guides.scenes.map(scene=>scene.index),[1,2,3,4,5,6]);
 assert.ok(guides.scenes.every(scene=>scene.requiresLiteralMatch===true));
});

test("owner screenshot: Making Room for Love remains one 30-second six-shot film in Montage",()=>{
 const base=suggestVideoConcept({locale:"en",goal:"Ready for a Relationship",
   theme:"relationships",selectedTopicId:"ready-relationship"});
 const film=getVideoCreativeDirections(base,"en").find(d=>d.id==="space");
 assert.ok(film,"The actual selected concept must exist");
 assert.equal(film.title,"Making Room for Love");
 const selected=applyVideoCreativeDirection(base,film);
 const storyboard=buildAlignedStorySceneGuides({
   locale:"en",goal:selected.goal,concept:selected,count:6,phrases:[],pace:"slow"
 }).scenes;
 const timed=buildConceptShotSketch(selected,30);
 assert.deepEqual(timed.map(shot=>[shot.number,shot.startSeconds,shot.endSeconds]),
   [[1,0,5],[2,5,10],[3,10,15],[4,15,20],[5,20,25],[6,25,30]]);
 assert.deepEqual(storyboard.map(scene=>scene.index),[1,2,3,4,5,6]);
 assert.deepEqual(storyboard.map(scene=>scene.title),[
   "The long way home","The second chair","A gentle look back",
   "A place for memories","An invitation","The door opens"
 ]);
 const visual=storyboard.map(scene=>scene.visual);
 for(const [index,word] of ["suitcase","chair","photograph","shelf","invitation","morning"].entries())
   assert.match(visual[index],new RegExp(word,"i"),"A shot must depict its own scripted action "+(index+1));
 assert.deepEqual(visual,film.storyboard.map(shot=>shot.action));
 assert.ok(storyboard.every(scene=>scene.requiresLiteralMatch===true));
 const ui=source("components/mandala-automatic-storyboard.tsx");
 assert.match(ui,/data-video-story-selected-title/);
 assert.match(ui,/data-storyboard-selected-direction/);
 assert.match(ui,/data-storyboard-scene-action/);
 assert.match(ui,/const eligible=filmedProposalReady&&!v3RequiresActionProof/);
 assert.match(ui,/const visibleCount=manualFiveReady\?5:guides\.scenes\.length/);
 assert.doesNotMatch(ui,/Math\.min\(5,guides\.scenes\.length\)/);
});

test("Story UI displays the full authored screenplay and does not let stock titles replace script actions",()=>{
 const ui=source("components/mandala-automatic-storyboard.tsx");
 assert.match(ui,/const visibleCount=manualFiveReady\?5:guides\.scenes\.length/);
 assert.doesNotMatch(ui,/Math\.min\(5,guides\.scenes\.length\)/);
 assert.match(ui,/const guide=guides\.scenes\[index\]/);
 assert.match(ui,/data-storyboard-scene-action/);
 assert.match(ui,/data-storyboard-scene-time/);
 assert.match(ui,/\{guide\.visual\}/);
 assert.match(ui,/data-storyboard-aligned-to-concept/);
 assert.match(ui,/const defaultFilm=useMemo/);
 assert.match(ui,/sameIntent\(draftConcept\)/);
});

test("Curated and v3 six-shot fiction are not auto-bound to clips based on vague metadata",()=>{
 const ui=source("components/mandala-automatic-storyboard.tsx");
 assert.match(ui,/const v3RequiresActionProof=Array\.isArray\(concept\.storyboard\)/);
 assert.match(ui,/const eligible=filmedProposalReady&&!v3RequiresActionProof/);
 assert.match(ui,/const applied=Boolean\(!v3RequiresActionProof/);
 assert.match(ui,/data-storyboard-clips=\{manualFiveReady\?fiveSceneShots/);
 assert.match(ui,/onChooseQuality\(sourceReady\)/);
 const studio=source("components/mandala-free-video-studio.tsx");
 const qualityStart=studio.indexOf("onChooseQuality={sourceReady=>{");
 const qualitySection=studio.slice(qualityStart,studio.indexOf("onOpenIdeas={()=>",qualityStart));
 assert.ok(qualityStart>0,"real Story-to-quality handler exists");
 assert.match(qualitySection,/setMontagePanel\("promo"\)/);
 assert.match(qualitySection,/setNotice\(sourceReady\?""/);
 assert.doesNotMatch(qualitySection,/if\(!sourceReady\)\{[\s\S]*?return;/,
   "missing physical footage cannot block non-billable quality navigation");
 assert.match(studio,/setMontagePanel\("concept"\)/);
 assert.match(studio,/draftConcept=\{draftVideoConcept\}/);
 assert.match(studio,/setAppliedStoryKey\(null\)/);
});

test("general Love still has six distinct visual actions; 5-cut mode is 20 seconds only",()=>{
 for(const locale of ["ru","en","es"]){
  const goal={ru:"Любовь",en:"Love",es:"Amor"}[locale];
  const base=suggestVideoConcept({locale,goal,theme:"relationships"});
  const direction=getVideoCreativeDirections({...base,semanticConfidence:"low"},locale)[0];
  assert.ok(direction,"category-only request must not fall back to four-arrow catalog");
  const chosen=applyVideoCreativeDirection(base,direction);
  const scenes=buildAlignedStorySceneGuides({locale,goal,concept:chosen,count:6,phrases:[]}).scenes;
  assert.deepEqual(scenes.map(x=>x.visual),chosen.storyboard.map(x=>x.action));
  assert.equal(new Set(scenes.map(x=>x.visual)).size,6);
 }
 const ui=source("components/mandala-video-concept.tsx");
 assert.match(ui,/data-video-concept-direction-hook/);
 assert.doesNotMatch(ui,/<span className=\{css\.directionIdea\}>\{direction\.idea\}<\/span>/);
 assert.match(ui,/concept\.creativeTitle&&directions\.length<2/);
 const story=source("components/mandala-automatic-storyboard.tsx");
 assert.match(story,/durationSeconds===20&&fiveSceneShots\?\.length===5/);
});

test("Selecting or editing any film in Ideas updates Montage's editorial source before approval",()=>{
 const ideas=source("components/mandala-video-concept.tsx");
 assert.match(ideas,/onDraftChange\?:\(concept:ApprovedVideoConcept\)=>void/);
 assert.match(ideas,/onDraftChange\?\.\(draftByDirection\[next\.signature\]\|\|next\)/);
 assert.match(ideas,/onDraftChange\?\.\(next\)/);
 const studio=source("components/mandala-free-video-studio.tsx");
 assert.match(studio,/setDraftVideoConcept\(draft\)/);
 assert.match(studio,/setDraftVideoConcept\(approved\)/);
 assert.match(studio,/draftConcept=\{draftVideoConcept\}/);
});


test("20 and 45 seconds keep exactly the authored scene count",()=>{
 const base=suggestVideoConcept({locale:"en",goal:"Ready for a Relationship",
   theme:"relationships",selectedTopicId:"ready-relationship"});
 const selected=applyVideoCreativeDirection(base,getVideoCreativeDirections(base,"en")[0]);
 for(const seconds of [20,45]){
  const shots=buildConceptShotSketch(selected,seconds);
  const guides=buildAlignedStorySceneGuides({
   locale:"en",goal:selected.goal,concept:selected,count:Math.ceil(seconds/5),phrases:[]
  }).scenes;
  assert.equal(shots.length,selected.storyboard.length);
  assert.equal(guides.length,selected.storyboard.length);
  assert.equal(shots.at(-1).endSeconds,seconds);
  assert.deepEqual(shots.map(s=>s.beat),selected.storyboard.map(s=>s.action));
  assert.deepEqual(guides.map(s=>s.visual),selected.storyboard.map(s=>s.action));
 }
});
