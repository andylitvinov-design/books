import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildPsychologyProgram} from "../lib/holistic-support/psychologist-mind.mjs";
import {prepareMeditationCreativeBrief} from "../lib/holistic-support/meditation-writer/brief.mjs";
import {buildEightDayCourseOutline} from "../lib/holistic-support/meditation-writer/eight-day-course.mjs";
import {reviewFreeMeditationQuality} from "../lib/holistic-support/meditation-writer/free-quality.mjs";
const GOALS={stress:"settle",relationships:"boundaries",self_worth:"confidence",meaning:"meaning"};
const prepare=(locale,focus)=>{
 const program=buildPsychologyProgram({locale,intent:{focus},safety:{status:"clear"},
   access:{authenticated:true,ownerScoped:true},consent:{resourceImagery:true}});
 const prepared=prepareMeditationCreativeBrief({program,consent:{resourceImagery:true},
   request:{locale,focus,intentionCode:GOALS[focus],durationMinutes:10,
     motifId:"comfortable_corner",styleId:"gentle_simple",clientPhrase:"PRIVATE_NAME"},sessionNumber:1});
 assert.equal(program.status,"ready");
 assert.equal(prepared.status,"brief_ready");
 assert.equal(prepared.brief.sessionNumber,1);
 assert.ok(program.sessions[0].methodIds.includes(prepared.brief.practice.methodId));
 return {program,prepared};
};
test("Eight-day plan contains exactly seven NEXT topics from Psychologist Mind in RU/EN/ES",()=>{
 for(const locale of ["ru","en","es"])for(const focus of Object.keys(GOALS)){
   const {program,prepared}=prepare(locale,focus);
   const plan=buildEightDayCourseOutline({program,prepared});
   assert.equal(plan.status,"ready",locale+" "+focus);
   assert.equal(plan.totalDays,8);
   assert.equal(plan.dayOne.approvedSkillId,prepared.brief.practice.methodId);
   assert.equal(plan.nextTopics.length,7);
   assert.deepEqual(plan.nextTopics.map(t=>t.day),[2,3,4,5,6,7,8]);
   assert.deepEqual(plan.nextTopics.map(t=>t.title),
     program.sessions.slice(1).map(s=>s.title));
   assert.ok(plan.nextTopics.every(t=>t.meditationGenerated===false &&
     t.requiresFreshPreflight===true && t.description.length>15));
   assert.equal(plan.additionalScriptsGenerated,false);
   assert.equal(plan.orderPlaced,false);
   assert.equal(JSON.stringify(plan).includes("PRIVATE_NAME"),false);
 }
});
test("Clinical/short/forged eight-session plans are rejected",()=>{
 const {program,prepared}=prepare("ru","stress");
 for(const override of [{status:"human_review_required"},
   {mode:"practitioner_draft"},
   {sessions:program.sessions.slice(0,7)},
   {focus:"relationships"},
   {sessions:program.sessions.map((s,i)=>
     i===2?{...s,clinicianMethodsRunnableByAI:true}:s)}])
   assert.equal(buildEightDayCourseOutline({
     program:{...program,...override},prepared}).status,"unavailable");
});
test("A future-session method must never masquerade as the generated first day",()=>{
 const {program,prepared}=prepare("ru","relationships");
 assert.equal(buildEightDayCourseOutline({program,prepared:{...prepared,
   brief:{...prepared.brief,sessionNumber:4}}}).status,"unavailable");
 assert.equal(buildEightDayCourseOutline({program,prepared:{...prepared,
   brief:{...prepared.brief,practice:{...prepared.brief.practice,
     methodId:"boundary_rehearsal"}}}}).status,"unavailable");
});
test("Incomplete, repetitive or too-short free-model text is never accepted",()=>{
 const draft={status:"draft_review_required",generationMode:"llm",modelUsed:true,
   segments:Array.from({length:7},()=>({text:"Original safe meditation section."})),
   review:{status:"draft_review_required",estimatedDurationSeconds:510,warnings:[]}};
 assert.equal(reviewFreeMeditationQuality({draft,plannedDurationSeconds:600}).ok,true);
 assert.equal(reviewFreeMeditationQuality({draft:{...draft,
   review:{...draft.review,estimatedDurationSeconds:120}},
   plannedDurationSeconds:600}).ok,false);
 assert.equal(reviewFreeMeditationQuality({draft:{...draft,
   review:{...draft.review,warnings:["REPEATED_SENTENCES"]}},
   plannedDurationSeconds:600}).ok,false);
 assert.equal(reviewFreeMeditationQuality({
   draft:{...draft,status:"template_ready"},plannedDurationSeconds:600}).ok,false);
});
test("One API call returns one meditation and seven future topics, no extra billing",()=>{
 const api=readFileSync(new URL("../app/api/holistic-support/meditation-writer/brief/route.js",import.meta.url),"utf8");
 const ui=readFileSync(new URL("../components/meditation-writer-preview.tsx",import.meta.url),"utf8");
 for(const item of ["buildEightDayCourseOutline","reviewFreeMeditationQuality",
   "coursePlan","problemFrame","desiredExperience","auth.verified()",
   "externalModelOptIn!==true","PRIVATE_HEADERS","sessionNumber:1"])
   assert.ok(api.includes(item),item);
 assert.ok(ui.includes('useState<"template"|"llm">("llm")'));
 assert.ok(ui.includes("problemFrame,desiredExperience"));
 assert.ok(ui.includes("data-meditation-course-topics"));
 assert.ok(ui.includes("preview.coursePlan?.nextTopics.map"));
 assert.ok(ui.includes("data-meditation-course-enquiry"));
 assert.ok(ui.includes("/services/imagery-therapy"));
 assert.ok(ui.includes("id=\"meditation-courses\""));
});
