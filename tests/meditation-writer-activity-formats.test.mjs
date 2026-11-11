import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildPsychologyProgram,PSYCHOLOGIST_METHODS} from "../lib/holistic-support/psychologist-mind.mjs";
import {PSYCHOLOGY_VIDEO_SKILLS} from "../lib/holistic-support/psychologist-video-curricula.mjs";
import {buildPracticeFormats} from "../lib/holistic-support/meditation-writer/practice-director.mjs";
import {prepareMeditationCreativeBrief} from "../lib/holistic-support/meditation-writer/brief.mjs";
import {buildEightDayCourseOutline} from "../lib/holistic-support/meditation-writer/eight-day-course.mjs";
const GOALS={stress:"settle",relationships:"boundaries",self_worth:"confidence",meaning:"meaning"};
const make=(locale,focus)=>{
 const program=buildPsychologyProgram({locale,intent:{focus},safety:{status:"clear"},
   access:{authenticated:true,ownerScoped:true},consent:{resourceImagery:true}});
 const prepared=prepareMeditationCreativeBrief({program,consent:{resourceImagery:true},
   request:{locale,focus,intentionCode:GOALS[focus],durationMinutes:10,
     motifId:"comfortable_corner",styleId:"gentle_simple",clientPhrase:"PRIVATE_NOT_FOR_AI"},
   sessionNumber:1});
 assert.equal(program.status,"ready");
 assert.equal(prepared.status,"brief_ready");
 return {program,prepared};
};
test("three unique optional formats use only the permitted goal-matched skill in three languages",()=>{
 for(const locale of ["ru","en","es"])for(const focus of Object.keys(GOALS)){
  const {program}=make(locale,focus);
  const result=buildPracticeFormats({program,locale,goal:GOALS[focus]});
  assert.equal(result.status,"ready");
  assert.equal(result.externalModelUsed,false);
  assert.equal(PSYCHOLOGIST_METHODS[result.selectedMethodId].selfGuided,true);
  assert.notEqual(result.selectedMethodId,"goal_contract");
  const kinds=["practice","exercise","ritual"];
  assert.deepEqual(Object.keys(result.formats),kinds);
  for(const kind of kinds){
   const card=result.formats[kind],source=PSYCHOLOGY_VIDEO_SKILLS[card.methodId];
   assert.equal(card.steps.length,3);
   assert.equal(card.kind,kind);
   assert.equal(card.clinicalProtocol,false);
   assert.equal(card.efficacyClaim,false);
   assert.equal(card.optional,true);
   assert.equal(card.needsExplicitStart,true);
   source.steps[locale].forEach((instruction,i)=>
     assert.ok(card.steps[i].includes(instruction),kind+" "+locale+" "+focus));
  }
  assert.notEqual(result.formats.practice.title,result.formats.ritual.title);
  assert.equal(JSON.stringify(result).includes("PRIVATE_NOT_FOR_AI"),false);
 }
});
test("unready, clinical or disallowed models cannot become rituals",()=>{
 for(const model of [null,{status:"human_review_required",focus:"stress",mode:"self_guided"},
    {status:"ready",mode:"practitioner_draft",focus:"stress"}])
   assert.equal(buildPracticeFormats({program:model}).status,"unavailable");
 const {program}=make("ru","relationships");
 const picked=buildPracticeFormats({program,goal:"boundaries",
   avoidElements:["people"]});
 assert.equal(picked.status,"ready");
 assert.notEqual(picked.selectedMethodId,"boundary_rehearsal");
 assert.equal(picked.formats.ritual.clinicalProtocol,false);
});
test("each session has its OWN reviewed optional method, never future audio or treatment",()=>{
 for(const locale of ["ru","en","es"])for(const focus of Object.keys(GOALS)){
  const {program,prepared}=make(locale,focus);
  const outline=buildEightDayCourseOutline({program,prepared});
  assert.equal(outline.status,"ready");
  assert.equal(outline.programmeGenerated,true);
  assert.equal(outline.totalDays,8);
  assert.equal(outline.nextTopics.length,7);
  assert.equal(outline.generatedScripts,1);
  assert.equal(outline.additionalScriptsGenerated,false);
  assert.equal(outline.audioGenerated,false);
  const all=[outline.dayOne,...outline.nextTopics];
  assert.equal(outline.plannedPracticeCount,
    all.filter(day=>day.plannedPractice).length);
  for(const [i,day] of all.entries()){
   if(!day.plannedPractice)continue;
   const activity=day.plannedPractice;
   assert.ok(program.sessions[i].methodIds.includes(activity.methodId));
   assert.equal(PSYCHOLOGIST_METHODS[activity.methodId].selfGuided,true);
   assert.deepEqual(activity.steps,PSYCHOLOGY_VIDEO_SKILLS[activity.methodId].steps[locale]);
   assert.equal(activity.clinicalProtocol,false);
   assert.equal(activity.requiresFreshPreflight,true);
  }
 }
});
test("existing authenticated route and mobile view connect to one source, not a free-model ritual",()=>{
 const api=readFileSync(new URL("../app/api/holistic-support/meditation-writer/brief/route.js",import.meta.url),"utf8");
 const ui=readFileSync(new URL("../components/meditation-writer-preview.tsx",import.meta.url),"utf8");
 for(const text of ["auth.verified()","preflight(userText","buildEightDayCourseOutline",
   "buildPracticeFormats","activityFormats","PRIVATE_HEADERS"])
  assert.ok(api.includes(text),text);
 for(const text of ["data-meditation-activity-formats",'aria-pressed={activityKind===kind}',
   "preview.activityFormats.formats[activityKind]","topic.plannedPractice",
   "data-meditation-course-topics"])assert.ok(ui.includes(text),text);
 assert.equal(api.includes("provider:activityFormats"),false);
});
