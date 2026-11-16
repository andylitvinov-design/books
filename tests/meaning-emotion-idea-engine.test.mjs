import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {getMyTubeTopic,getMyTubeTaxonomy} from "../lib/mandala/mytube-content-taxonomy.mjs";
import {getStateDefinition} from "../lib/mandala/state-transition/state-catalog.mjs";
import {recommendScenario} from "../lib/mandala/state-transition/scenario-engine.mjs";
import {reviewCreativeMeaningIdea} from "../lib/holistic-support/psychologist-mind.mjs";
import {MEANING_AXES,EMOTIONAL_VECTORS,MEANING_IDEAS,INCOMPATIBLE_FRAMES,
  listMeaningAxes,listEmotionalVectors,auditMeaningIdeaCatalog,
  recommendMeaningIdeas,confirmMeaningIdea} from "../lib/mandala/meaning-emotion/idea-engine.mjs";
import {buildMeaningFilmHandoff,suggestMeaningCaption}
  from "../lib/mandala/meaning-emotion/idea-film-handoff.mjs";

const locales=["ru","en","es"];
const axisIds=MEANING_AXES.map(x=>x.id);
const req=(v=EMOTIONAL_VECTORS[0],axisId="anchor",locale="ru",more={})=>({
 schemaVersion:"meaning-idea-request-v1",topicId:"life-purpose",locale,
 current:{stateId:v.currentStateId,intensity:null},
 desired:{stateId:v.desiredStateId},energy:null,
 meaningAxisId:axisId,preferences:{},consentScope:"this_video_only",...more,
});
const source=(path)=>readFileSync(new URL(path,import.meta.url),"utf8");
test("canonical axis/facet and state IDs; legacy 4×4×4 taxonomy remains unchanged",()=>{
 const result=auditMeaningIdeaCatalog();
 assert.deepEqual(result.errors,[],result.errors.slice(0,10).join("\n"));
 assert.equal(result.ok,true);
 assert.deepEqual([result.counts.meaningAxes,result.counts.facets,result.counts.emotionalVectors,
   result.counts.compatibleCells,result.counts.coveredCells,result.counts.distinctIdeaIds],
   [8,11,8,64,64,192]);
 assert.equal(result.counts.editorApprovedIdeas,0,"source-authored ideas are not falsely owner-approved");
 assert.equal(result.counts.sourceCuratedIdeas,192);
 assert.ok(INCOMPATIBLE_FRAMES.length>=7);
 assert.deepEqual(axisIds,["anchor","connection","freedom","agency","dignity",
   "wholeness","meaning","growth"]);
 for(const v of EMOTIONAL_VECTORS){
   assert.ok(getStateDefinition(v.currentStateId));
   assert.ok(getStateDefinition(v.desiredStateId));
 }
 for(const lang of locales){
   assert.equal(listMeaningAxes(lang).length,8);
   assert.equal(listEmotionalVectors(lang).length,8);
   for(const a of listMeaningAxes(lang)){
     assert.ok(a.label.length>2);
     assert.ok(a.description.length>15);
   }
 }
 const taxonomy=getMyTubeTaxonomy();
 assert.deepEqual([taxonomy.categories.length,
   taxonomy.categories.flatMap(c=>c.subcategories).length,
   taxonomy.categories.flatMap(c=>c.subcategories.flatMap(s=>s.topics)).length],
   [4,16,64]);
 assert.ok(getMyTubeTopic("life-purpose"));
});
test("every compatible cell provides three substantively distinct curated meanings in three locales",()=>{
 const all=new Set();
 for(const lang of locales){
   const localized=new Set();
   for(const v of EMOTIONAL_VECTORS)for(const axis of axisIds){
     const response=recommendMeaningIdeas(req(v,axis,lang));
     assert.equal(response.status,"ok",lang+":"+v.id+":"+axis);
     assert.equal(response.ideas.length,3,lang+":"+v.id+":"+axis);
     assert.equal(new Set(response.ideas.map(x=>x.premiseType)).size,3);
     for(const idea of response.ideas){
       assert.equal(idea.axisId,axis);
       assert.equal(idea.editorReviewStatus,"source_curated");
       assert.equal(idea.approvedByOwner,false);
       assert.ok(idea.ideaText.length>=35);
       assert.ok(!localized.has(idea.ideaText),lang+":"+idea.ideaId);
       localized.add(idea.ideaText);
       all.add(idea.ideaId);
       assert.ok(idea.rationaleCodes.includes("matches_selected_meaning_axis"));
       assert.equal(idea.intensityGuidance.intensityKnown,false);
       assert.equal(idea.intensityGuidance.energyKnown,false);
     }
   }
   assert.equal(localized.size,192);
 }
 assert.equal(all.size,192);
 assert.equal(MEANING_IDEAS.length,192);
});
test("at least 120 independent golden acceptance combinations incl intensity/energy",()=>{
 let accepted=0;
 for(const v of EMOTIONAL_VECTORS)for(const axis of axisIds)
 for(const setting of [
   {current:{stateId:v.currentStateId,intensity:null},energy:null},
   {current:{stateId:v.currentStateId,intensity:0},energy:10},
   {current:{stateId:v.currentStateId,intensity:10},energy:0}
 ]){
   const response=recommendMeaningIdeas(req(v,axis,"ru",setting));
   assert.equal(response.status,"ok");
   assert.equal(response.ideas.length,3);
   if(setting.energy===0){
     assert.equal(response.ideas[0].intensityGuidance.pace,"gentle");
     assert.equal(response.ideas[0].intensityGuidance.activationLimit,"low");
   }
   if(setting.current.intensity===0)
     assert.equal(response.ideas[0].intensityGuidance.intensityKnown,true);
   accepted++;
 }
 assert.equal(accepted,192,"192 real request variants, not a fabricated test count");
});
test("same emotional transition × different meanings is not one generic slogan",()=>{
 for(const lang of locales){
   const v=EMOTIONAL_VECTORS[0];
   const ideasByAxis=axisIds.map(axis=>recommendMeaningIdeas(req(v,axis,lang)).ideas[0].ideaText);
   assert.equal(new Set(ideasByAxis).size,8);
   const sameAxisDifferentVector=EMOTIONAL_VECTORS.map(x=>
     recommendMeaningIdeas(req(x,"anchor",lang)).ideas[0].ideaText);
   assert.equal(new Set(sameAxisDifferentVector).size,8);
 }
});
test("user absence of measurements stays null; ranking is deterministic and transparent",()=>{
 const input=req(EMOTIONAL_VECTORS[0],"freedom","en");
 const a=recommendMeaningIdeas(input);
 assert.deepEqual(a,recommendMeaningIdeas(input));
 assert.equal(a.modelUsed,false);
 assert.equal(a.customerScoreVisible,false);
 assert.deepEqual([a.normalizedInputs.currentIntensity,a.normalizedInputs.energy],[null,null]);
 assert.deepEqual(a.ideas.map(x=>x.premiseType),["recognition","possibility","reframe"]);
 const b=recommendMeaningIdeas({...input,preferences:{premiseType:"reframe"}});
 assert.equal(b.ideas[0].premiseType,"reframe");
 assert.equal(b.ideas.length,3);
 const energy=recommendMeaningIdeas({...input,current:{stateId:"anxiety",intensity:9},energy:1,
   preferences:{pace:"steady"}});
 assert.equal(energy.ideas[0].intensityGuidance.pace,"gentle");
 assert.equal(energy.ideas[0].intensityGuidance.activationLimit,"low");
});
test("no-axis, composed pairs, unknown text and excluded candidates fail closed",()=>{
 const v=EMOTIONAL_VECTORS[0];
 const choose=recommendMeaningIdeas(req(v,null,"ru"));
 assert.equal(choose.status,"choose_axis");
 assert.ok(choose.axisOptions.length>0&&choose.axisOptions.length<=3);
 assert.equal(choose.ideas.length,0);
 const unknown=recommendMeaningIdeas(req(v,"anchor","ru",{
   current:{stateId:"shame",intensity:null},desired:{stateId:"confidence"}}));
 assert.equal(unknown.status,"ok");
 assert.equal(unknown.ideas.length,3);
 assert.ok(unknown.ideas.every(x=>x.editorReviewStatus==="editorial_composed_preview"));
 assert.equal(unknown.normalizedInputs.vectorId,null);
 assert.equal(recommendMeaningIdeas(req(v,"anchor","ru",{
   current:{text:"совсем непонятное чувство"}})).status,"clarify");
 assert.equal(recommendMeaningIdeas(req(v,"fake")).status,"clarify");
 assert.equal(recommendMeaningIdeas(req(v,"anchor","xx")).status,"clarify");
 assert.equal(recommendMeaningIdeas(req(v,"anchor","ru",{
   topicId:"invented_topic"})).status,"clarify");
 assert.equal(recommendMeaningIdeas(req(v,"anchor","ru",{
   current:{stateId:"invented",intensity:null}})).status,"clarify");
 const first=recommendMeaningIdeas(req(v,"anchor")).ideas.map(x=>x.ideaId);
 const empty=recommendMeaningIdeas(req(v,"anchor","ru",{excludedIdeas:first}));
 assert.equal(empty.status,"no_safe_idea");
 assert.equal(empty.ideas.length,0);
 assert.equal(confirmMeaningIdea(req(v,"anchor"),{ideaId:"not_real"}),null);
 assert.equal(confirmMeaningIdea(req(v,"anchor"),{ideaId:
   recommendMeaningIdeas(req(v,"growth")).ideas[0].ideaId}),null);
});
test("negative and crisis paths; no forced reconciliation or self-harm framing",()=>{
 const v=EMOTIONAL_VECTORS[0];
 for(const raw of ["хочу умереть","kill myself","quiero morir","острая боль в груди"]){
   const result=recommendMeaningIdeas(req(v,"anchor","ru",{optionalContext:raw}));
   assert.equal(result.status,"safety_support");
   assert.equal(result.ideas.length,0);
 }
 for(const raw of ["must forgive","нужно терпеть насилие","trauma is a gift"]){
   const result=recommendMeaningIdeas(req(v,"anchor","en",{optionalContext:raw}));
   assert.equal(result.status,"no_safe_idea");
 }
 const custom="I have to tolerate abuse to deserve belonging.";
 const chosen=recommendMeaningIdeas(req(v,"connection","en")).ideas[0].ideaId;
 assert.equal(confirmMeaningIdea(req(v,"connection","en"),{
   ideaId:chosen,customIdeaText:custom}),null);
 assert.ok(INCOMPATIBLE_FRAMES.some(x=>x.frame==="forced_reconciliation"));
 assert.ok(INCOMPATIBLE_FRAMES.some(x=>x.frame==="forced_intimacy"));
 assert.ok(INCOMPATIBLE_FRAMES.some(x=>x.frame==="forced_activation_when_depleted"));
});
test("confirmation/edit/neutral are explicitly client-controlled; custom text never auto-renders",()=>{
 const input=req(EMOTIONAL_VECTORS[2],"dignity","en");
 const ranked=recommendMeaningIdeas(input);
 const id=ranked.ideas[0].ideaId;
 const brief=confirmMeaningIdea(input,{ideaId:id});
 assert.equal(brief.status,"confirmed");
 assert.equal(brief.confirmedIdeaId,id);
 assert.equal(brief.editorialReviewStatus,"source_curated");
 assert.equal(brief.ownerEditorialApproved,false);
 assert.equal(brief.customerConsent,"explicit_idea_confirmation");
 assert.equal(brief.rawContextStored,false);
 const text="I can acknowledge a mistake without reducing my human worth.";
 const custom=confirmMeaningIdea(input,{ideaId:id,customIdeaText:text});
 assert.equal(custom.ideaText,text);
 assert.equal(custom.userEdited,true);
 assert.equal(custom.editorialReviewStatus,"user_edited_unreviewed");
 assert.equal(confirmMeaningIdea(input,{ideaId:id,customIdeaText:"bad"}),null);
 const neutral=confirmMeaningIdea(input,{neutral:true});
 assert.equal(neutral.status,"neutral_confirmed");
 assert.equal(neutral.confirmedIdeaId,null);
 assert.equal(neutral.ideaText,null);
 assert.equal(neutral.customerConsent,"explicit_neutral");
});
test("Psychologist Mind uses a pure nonclinical bridge and refuses unconfirmed content",()=>{
 const brief=confirmMeaningIdea(req(EMOTIONAL_VECTORS[0],"freedom","es"),{
   ideaId:recommendMeaningIdeas(req(EMOTIONAL_VECTORS[0],"freedom","es")).ideas[0].ideaId});
 assert.equal(reviewCreativeMeaningIdea(null).status,"no_confirmed_idea");
 const review=reviewCreativeMeaningIdea(brief);
 assert.equal(review.status,"creative_supportive");
 assert.equal(review.clinicalTreatment,false);
 assert.equal(review.humanTherapyAuthorized,false);
 assert.equal(review.diagnosis,null);
 assert.equal(review.methodIds.length,0);
 assert.equal(review.sessionPlan,null);
 assert.deepEqual(review.processCodes,["acknowledge_present","notice_resource",
   "offer_small_choice","gentle_integration"]);
 const neutral=reviewCreativeMeaningIdea(confirmMeaningIdea(req(EMOTIONAL_VECTORS[0],"anchor"),{neutral:true}));
 assert.equal(neutral.status,"neutral_supportive_creative");
});
test("film handoff remains editorial and cannot certify physical clips or auto-publish",()=>{
 for(const lang of locales){
   const input=req(EMOTIONAL_VECTORS[0],"anchor",lang,{
     current:{stateId:"anxiety",intensity:9},energy:2});
   const rec=recommendMeaningIdeas(input).ideas[0];
   const brief=confirmMeaningIdea(input,{ideaId:rec.ideaId});
   const handoff=buildMeaningFilmHandoff(brief,{locale:lang});
   assert.equal(handoff.status,"editorial_only",lang+":"+JSON.stringify(handoff));
   assert.equal(handoff.renderReady,false);
   assert.equal(handoff.mayPublishVideo,false);
   assert.equal(handoff.mayChangeExistingMedia,false);
   assert.equal(handoff.psychologistMind?.clinicalTreatment,false);
   assert.ok(handoff.emotionalScenario?.stages.length>=2);
   assert.ok(handoff.filmScenario?.narrativeBeats.length===4);
   assert.equal(handoff.filmScenario?.mediaStatus,"needs_verified_media");
   const stse=recommendScenario({schemaVersion:"state-transition-request-v1",
     locale:lang,topicId:"life-purpose",
     current:{stateId:"anxiety",intensity:"high"},desired:{stateId:"confidence"},
     preferences:{pace:"gentle"}});
   assert.equal(stse.status,"ok");
   assert.ok(stse.recommendations.some(x=>x.scenarioId===handoff.filmScenario?.scenarioId));
   if(suggestMeaningCaption(handoff,96)!==null)
     assert.ok(suggestMeaningCaption(handoff,96).length<=96);
 }
 const neutral=confirmMeaningIdea(req(EMOTIONAL_VECTORS[0],"anchor"),{neutral:true});
 assert.equal(buildMeaningFilmHandoff(neutral).status,"neutral_supportive");
 assert.equal(buildMeaningFilmHandoff(null).status,"not_confirmed");
});
test("director wires one flagged inline selector to original four-MP4 render, preserving other tracks",()=>{
 const director=source("../components/mandala-auto-video-director.tsx");
 const selector=source("../components/mandala-meaning-idea-selector.tsx");
 const studio=source("../components/mandala-free-video-studio.tsx");
 assert.match(director,/const STSE_ENABLED=process\.env\.NEXT_PUBLIC_HH_STSE_ENABLED==="true"/);
 assert.match(director,/NEXT_PUBLIC_HH_MEANING_IDEA_ENABLED==="true"/);
 assert.match(director,/MEANING_ENABLED&&selectedTopicId/);
 assert.match(director,/onConfirmHandoff=/);
 assert.match(director,/const stageCaptions=manualStageCaptions\.map/);
 assert.match(director,/captionTexts:stageCaptions/);
 assert.match(director,/lastCaptionTaken/);
 assert.match(director,/const meaningCaptionTooLong/);
 assert.match(director,/lastCaptionTaken/);
 assert.match(director,/data-meaning-caption-preview/);
 assert.match(director,/data-meaning-caption-overflow/);
 assert.match(director,/onApply\(chosen\.id,length/);
 assert.match(studio,/onApply=\{applyAutoFilm\}/);
 assert.match(studio,/compileFreeFilmPreset\(preset,locale,seconds/);
 assert.match(selector,/data-meaning-current/);
 assert.match(selector,/data-meaning-desired/);
 assert.match(selector,/data-meaning-axis/);
 assert.match(selector,/data-meaning-neutral/);
 assert.match(selector,/data-meaning-suggest/);
 assert.match(selector,/data-meaning-confirm/);
 assert.match(selector,/sessionStorage/);
 assert.ok(!selector.includes("fetch("));
 assert.ok(!selector.includes("providerApi"));
 assert.ok(!selector.includes("localStorage"));
});
