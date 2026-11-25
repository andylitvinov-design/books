import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {suggestVideoConcept,videoConceptIsValid} from "../lib/mandala/auto-video-concept.mjs";
import {getVideoCreativeDirections,applyVideoCreativeDirection} from "../lib/mandala/video-creative-directions.mjs";
import {getMyTubeTopic} from "../lib/mandala/mytube-content-taxonomy.mjs";
import {
 derivePsychologicalBrief,generateThreePremises,makeSixShotStoryboard,
 reviewConceptQuality,reviseConcept
} from "../lib/mandala/cinematic-concept-v3.mjs";
import {buildConceptShotSketch} from "../lib/mandala/video-concept-semantic.mjs";
import {buildAlignedStorySceneGuides} from "../lib/mandala/storyboard-content-alignment.mjs";
import {describeStoryboardSceneGraphic} from "../lib/mandala/storyboard-scene-graphic.mjs";
import {conceptSceneAlignment} from "../lib/mandala/video-story-review.mjs";
import {selectVideoStoryFamily,listAuthoredFilmPlots} from "../lib/mandala/film-story-atlas-v3.mjs";

const locales=["ru","en","es"];
const topics=[
 ["personal-growth","Personal Growth"],["self-confidence","Self Confidence"],
 ["procrastination","Procrastination"],["career-growth","Career Growth"],
 ["income-growth","Income Growth"],["money-mindset","Money Mindset"],
 ["financial-stability","Financial Stability"],["stress-relief","Stress Relief"],
 ["chronic-stress","Chronic Stress"],["work-stress","Work Stress"],
 ["burnout","Emotional Burnout"],["low-mood","Low Mood"],
 ["life-purpose","Life Purpose"],["life-transitions","Life Transitions"],
 ["goal-setting","Goal Setting"],["emotional-intimacy","Emotional Intimacy"],
 ["couple-communication","Communication in Relationships"],
 ["rebuilding-trust","Rebuilding Trust"],["dating","Dating"],
 ["fear-intimacy","Fear of Intimacy"],
];
const personalization={
 currentState:"Tired · Uncertain · Tense",desiredState:"Safe · Joyful · Connected",
 focus:"Growth · Freedom · Connection",
 currentIds:["fatigue","uncertain","tension"],
 desiredIds:["safe","joyful","connected"],
 focusIds:["growth","freedom","connection"],energyStart:4,energyTarget:8
};
const inspect=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("v3 corpus: 20 distinct topics × 3 locales produce two quality-gated, different stories",()=>{
 let reviewed=0;
 for(const [topicId,goal] of topics){
  assert.ok(getMyTubeTopic(topicId),"canonical topic missing: "+topicId);
  for(const locale of locales){
   const base=suggestVideoConcept({
    locale,goal,theme:"life",selectedTopicId:topicId,personalization
   });
   const choices=getVideoCreativeDirections(base,locale);
   assert.equal(choices.length,2,locale+":"+topicId+" must not fall back to arrow catalog");
   assert.equal(new Set(choices.map(x=>x.id)).size,2,locale+":"+topicId+": direction ids");
   assert.equal(new Set(choices.map(x=>x.symbol)).size,2,locale+":"+topicId+": symbols");
   assert.equal(new Set(choices.map(x=>x.centralAction)).size,2,locale+":"+topicId+": actions");
   assert.equal(new Set(choices.map(x=>x.endingImage)).size,2,locale+":"+topicId+": endings");
   for(const direction of choices){
    assert.equal(direction.review.status,"pass",topicId+":"+locale+":"+direction.id+
      " "+JSON.stringify(direction.review.hardFailures));
    assert.ok(direction.review.score>=28);
    assert.equal(direction.review.qualityScope,"structural_only_not_human_editorial_review");
    assert.ok(direction.pitch.length>=35);
    assert.ok(direction.idea.length>=60);
    assert.ok(direction.story.length>=500);
    assert.ok(direction.storyboard.length===6);
    assert.equal(direction.conceptScenes.length,6);
    assert.equal(direction.story.split("\n\n").length,6,"six separately written scenes");
    assert.ok(direction.conceptScenes.every((scene,index)=>
      scene.id===direction.storyboard[index].sceneId&&
      scene.action===direction.storyboard[index].visualAction&&
      direction.story.includes(scene.narrative)),
      "storyboard must depict the same events in the same order");
    assert.doesNotMatch(direction.idea+" "+direction.story,
      /→|The story opens with|Something begins to change|Then comes the turning point|Over 30 seconds|шесть кадров|4\/10/i);
    assert.ok(direction.storyboard.every((shot,index)=>
      shot.startSeconds===index*5&&shot.endSeconds===(index+1)*5&&
      shot.sourceStatus==="editorial_unverified"&&shot.sourceVerified===false));
    assert.equal(new Set(direction.storyboard.map(s=>s.visualAction)).size,6);
    assert.notEqual(direction.centralAction,direction.endingImage);
    const chosen=applyVideoCreativeDirection(base,direction);
    assert.ok(videoConceptIsValid(chosen),topicId+":"+locale);
    assert.equal(chosen.baseSignature,base.signature);
    assert.equal(chosen.conceptText,direction.story);
    assert.deepEqual(chosen.conceptScenes,direction.conceptScenes);
    assert.equal(chosen.mainMessage,direction.idea);
    assert.equal(chosen.creativeSchemaVersion,"hh-creative-concept-v3");
    assert.equal(chosen.mediaBindingStatus,"editorial_only_unverified");
    assert.deepEqual(chosen.emotionalProgram,direction.emotionalBeats);
    assert.equal(chosen.parameters.visualWorld.value,direction.world);
    const sketch=buildConceptShotSketch(chosen,30);
    assert.equal(sketch.length,6);
    assert.deepEqual(sketch.map(x=>x.beat),direction.storyboard.map(s=>s.visualAction));
    const guides=buildAlignedStorySceneGuides({
     locale,goal:chosen.goal,concept:chosen,count:6,phrases:[]
    });
    assert.ok(guides.scenes.every((x,index)=>
      x.visual===direction.storyboard[index].visualAction&&
      x.sourceSceneId===direction.storyboard[index].sceneId&&x.requiresLiteralMatch===true));
    assert.equal(conceptSceneAlignment(chosen).aligned,true,
      "all six visible actions must occur in the selected screenplay in order");
    for(const [index,guide] of guides.scenes.entries()){
      const graphic=describeStoryboardSceneGraphic({
        action:guide.visual,visualSubject:chosen.storyboard[index].visualSubject,
        keywords:chosen.storyboard[index].keywords
      });
      assert.equal(graphic.sourceAction,chosen.storyboard[index].action);
      assert.equal(graphic.visualStatus,"editorial_scene_sketch_unverified");
      assert.ok(graphic.cueIds.length<=2);
    }
    for(const seconds of [20,30,42,60]){
      const resized=buildConceptShotSketch(chosen,seconds);
      assert.equal(resized.length,chosen.conceptScenes.length);
      assert.equal(resized[0].startSeconds,0);
      assert.equal(resized.at(-1).endSeconds,seconds);
      assert.deepEqual(resized.map(x=>x.sceneId),chosen.conceptScenes.map(x=>x.id));
      const montage=buildAlignedStorySceneGuides({
        locale,goal:chosen.goal,concept:chosen,count:Math.ceil(seconds/5),phrases:[]
      }).scenes;
      assert.deepEqual(montage.map(x=>x.visual),chosen.conceptScenes.map(x=>x.action));
      assert.deepEqual(montage.map(x=>x.sourceSceneId),chosen.conceptScenes.map(x=>x.id));
    }
    reviewed++;
   }
  }
 }
 assert.equal(reviewed,120,"20 topics × three languages × two directions");
});

test("core film roles are pure, give auditable metadata, and do not infer personal history",()=>{
 assert.equal(selectVideoStoryFamily({topicId:"income-growth"}),"money");
 assert.equal(listAuthoredFilmPlots("growth").length,3);
 const base=suggestVideoConcept({
  locale:"en",goal:"Personal Growth",theme:"goals",
  selectedTopicId:"personal-growth",personalization
 });
 const brief=derivePsychologicalBrief(base,"en");
 assert.equal(brief.family,"growth");
 assert.equal(brief.currentState,personalization.currentState);
 assert.equal(brief.desiredState,personalization.desiredState);
 assert.ok(brief.doNotAssume.includes("diagnosis"));
 assert.ok(brief.doNotAssume.includes("relationship history"));
 const v3=generateThreePremises(base,"en");
 assert.equal(v3.schemaVersion,"hh-creative-concept-v3");
 assert.equal(v3.intentSignature,base.signature);
 assert.equal(v3.durationSeconds,30);
 assert.equal(v3.directions.length,2);
 assert.equal(v3.selectedDirectionId,null);
 assert.deepEqual(v3.userEditedFields,[]);
 assert.equal(v3.approvedMedia,false);
 const shots=makeSixShotStoryboard(listAuthoredFilmPlots("growth")[0],"en");
 assert.deepEqual(shots.map(x=>[x.startSeconds,x.endSeconds]),
  [[0,5],[5,10],[10,15],[15,20],[20,25],[25,30]]);
});

test("personalization changes the preferred film or its story—not only the approval signature",()=>{
 const base=suggestVideoConcept({
  locale:"en",goal:"Personal Growth",theme:"goals",
  selectedTopicId:"personal-growth",personalization
 });
 const changed=suggestVideoConcept({
  locale:"en",goal:"Personal Growth",theme:"goals",
  selectedTopicId:"personal-growth",
  personalization:{...personalization,
   currentState:"Uncertain",desiredState:"Calm",focus:"Freedom",focusIds:["freedom"],
   currentIds:["uncertain"],desiredIds:["calm"]}
 });
 const before=getVideoCreativeDirections(base,"en"),after=getVideoCreativeDirections(changed,"en");
 assert.notEqual(base.signature,changed.signature);
 assert.notEqual(before[0].id,after[0].id);
 assert.notEqual(before[0].story,after[0].story);
 assert.notEqual(before[0].symbol,after[0].symbol);
 const selected=applyVideoCreativeDirection(base,before[0]);
 assert.equal(selected.baseSignature,base.signature);
 assert.notEqual(selected.baseSignature,changed.signature,
   "old approval is not reusable after a change in confirmed goals");
});

test("quality gate rejects formulaic four-beat text, repetitive shots and unverified media",()=>{
 const base=suggestVideoConcept({locale:"en",goal:"Personal Growth",theme:"goals",
  selectedTopicId:"personal-growth",personalization});
 const good=getVideoCreativeDirections(base,"en")[0];
 const unsafe={...good,idea:"Tired → Calm → Happy",
  story:"The story opens with a feeling. Then comes the turning point."};
 const review=reviewConceptQuality(unsafe,{locale:"en",goal:base.goal});
 assert.equal(review.status,"revise");
 assert.ok(review.hardFailures.includes("formulaic_or_technical_copy"));
 const repaired=reviseConcept(unsafe,base,"en");
 assert.ok(repaired&&repaired.review.status==="pass",
   "bounded recomposition must replace the bad screenplay with a vetted authored one");
 assert.doesNotMatch(repaired.story,/The story opens with/i);
 const repeated={...good,storyboard:good.storyboard.map((s,i)=>
  i===1?{...s,visualAction:good.storyboard[0].visualAction}:s)};
 assert.equal(reviewConceptQuality(repeated,{locale:"en",goal:base.goal}).status,"revise");
 const fake={...good,mediaBindingStatus:"verified_mp4"};
 assert.ok(reviewConceptQuality(fake,{locale:"en",goal:base.goal}).hardFailures.includes("fabricated_media_verification"));
});

test("avoided imagery cannot leak into published story or storyboard",()=>{
 const base=suggestVideoConcept({
  locale:"en",goal:"Ready for a Relationship",theme:"relationships",
  selectedTopicId:"ready-relationship"
 });
 const excluded=getVideoCreativeDirections({...base,avoidImagery:["water","forest"]},"en");
 assert.equal(excluded.length,2);
 const texts=excluded.map(x=>[x.idea,x.story,x.world,
   ...(x.storyboard||[]).map(shot=>shot.action)].join(" "));
 for(const script of texts)assert.doesNotMatch(script,/forest|woods|rain|river|lake|ocean|water/i);
 const v3=generateThreePremises({...base,topicId:"life-purpose",avoidImagery:["water","forest"]},"en");
 assert.equal(v3.allReviews.length,3);
 for(const direction of v3.directions){
  assert.equal(direction.review.status,"pass");
 }
});

test("iPhone Concept remains a single editor with safe-area, 2 cards, independent drafts and montage handoff",()=>{
 const ui=inspect("components/mandala-video-concept.tsx");
 const css=inspect("components/mandala-video-concept.module.css");
 const montage=inspect("components/mandala-automatic-storyboard.tsx");
 const studio=inspect("components/mandala-free-video-studio.tsx");
 const director=inspect("lib/mandala/video-creative-directions.mjs");
 assert.equal((studio.match(/<MandalaVideoConcept /g)||[]).length,1);
 assert.match(ui,/data-video-concept-direction=\{direction\.id\}/);
 assert.match(ui,/data-video-main-idea-edit/);
 assert.match(ui,/data-video-main-idea-input/);
 assert.match(ui,/data-video-concept-text-input/);
 assert.match(ui,/draftByDirection\[directed\.signature\]/);
 assert.match(ui,/creativeReady/);
 assert.match(ui,/const hasExplicitFilmIntent=Boolean\(goal\.trim\(\)\|\|selectedTopic\?\.topicId\|\|profile/);
 assert.match(ui,/const isStoryFilm=hasExplicitFilmIntent&&concept\.hasPersonalInput/);
 assert.match(ui,/data-video-concept-quality-needed/);
 assert.ok(ui.indexOf("data-video-concept-paragraph")<
   ui.indexOf("data-video-concept-shot-sketch"));
 assert.ok(ui.indexOf("data-video-concept-shot-sketch")<
   ui.indexOf("data-video-concept-all-parameters"));
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/textarea:focus/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(montage,/sameIntent\(approvedConcept\)/);
 assert.match(studio,/!approved\.storyboard\?\.length&&cinematicPlan/);
 assert.match(director,/generateThreePremises/);
 assert.doesNotMatch(director,/The story opens with|Something begins to change/);
});


test("quality review rejects a storyboard event differing from its source concept scene",()=>{
 const base=suggestVideoConcept({locale:"en",goal:"Personal Growth",theme:"life",
   selectedTopicId:"personal-growth",personalization});
 const good=getVideoCreativeDirections(base,"en")[0];
 const changed={...good,storyboard:good.storyboard.map((shot,i)=>
   i===2?{...shot,visualAction:"A random unrelated train travels through a tunnel."}:shot)};
 const verdict=reviewConceptQuality(changed,{locale:"en",goal:"Personal Growth"});
 assert.ok(verdict.hardFailures.includes("concept_storyboard_scene_mismatch"));
 assert.notEqual(verdict.status,"pass");
});


test("unfamiliar personal goals still receive authored films rather than arrow catalog copy",()=>{
 for(const locale of ["en","ru","es"]){
  const goal={
   en:"A fresh start with something I have never tried",
   ru:"Хочу попробовать нечто совершенно новое",
   es:"Quiero intentar algo nuevo en mi vida"
  }[locale];
  const base=suggestVideoConcept({locale,goal,theme:"life",personalization});
  const unknown={...base,hasPersonalInput:true,semanticConfidence:"low",topicId:"custom-topic"};
  const choices=getVideoCreativeDirections(unknown,locale);
  assert.equal(choices.length,2,"an unrecognized goal still gets two editorial options");
  assert.ok(choices.every(choice=>choice.review.status==="pass"&&
   choice.conceptScenes?.length===choice.storyboard.length));
  assert.ok(choices.every(choice=>!choice.story.includes("→")));
 }
});


test("storyboard camera plan reads actions from screenplay scenes, never reauthors them",()=>{
 const plot=listAuthoredFilmPlots("growth")[0];
 const original=makeSixShotStoryboard(plot,"en");
 const scenes=original.map(shot=>({id:shot.sceneId,action:shot.visualAction}));
 scenes[1]={...scenes[1],action:"The character folds the failed page and places it on the table."};
 const storyboard=makeSixShotStoryboard(plot,"en",scenes);
 assert.equal(storyboard.length,scenes.length);
 assert.deepEqual(storyboard.map(s=>s.sceneId),scenes.map(s=>s.id));
 assert.deepEqual(storyboard.map(s=>s.visualAction),scenes.map(s=>s.action));
 assert.notEqual(storyboard[1].visualAction,original[1].visualAction);
});
