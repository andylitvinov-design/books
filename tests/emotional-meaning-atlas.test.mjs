import test from "node:test";
import assert from "node:assert/strict";
import {CURRENT_EMOTION_CLUSTERS,DESIRED_EMOTION_CLUSTERS,getEmotionalVectorByStates} from "../lib/mandala/meaning-emotion/emotional-vector-matrix.mjs";
import {MEANING_AXES,MEANING_IDEAS,EMOTIONAL_VECTORS,COMPOSED_MEANING_IDEAS,
 auditMatrixMeaningAtlas,recommendMeaningIdeas,confirmMeaningIdea} from "../lib/mandala/meaning-emotion/idea-engine.mjs";
import {buildMeaningFilmHandoff} from "../lib/mandala/meaning-emotion/idea-film-handoff.mjs";
const locales=["ru","en","es"];
const req=(c,d,axis,locale="ru")=>({schemaVersion:"meaning-idea-request-v1",topicId:"life-purpose",locale,
 current:{stateId:c.representativeStateId,intensity:7},desired:{stateId:d.representativeStateId},
 energy:4,meaningAxisId:axis,preferences:{},consentScope:"this_video_only"});
test("all 512 emotion × meaning cells contain 1536 unique authored ideas",()=>{
 const audit=auditMatrixMeaningAtlas();
 assert.deepEqual(audit.errors,[],audit.errors.slice(0,10).join("\n"));
 assert.equal(audit.counts.intersectionCells,512);
 assert.equal(audit.counts.composedIdeas,1536);
 assert.equal(COMPOSED_MEANING_IDEAS.length,1536);
 assert.equal(MEANING_IDEAS.length,192);
 assert.equal(EMOTIONAL_VECTORS.length,8);
 for(const locale of locales){
  const set=new Set(COMPOSED_MEANING_IDEAS.map(x=>x.semanticPremise[locale]));
  assert.equal(set.size,1536,locale);
 }
});
test("every 8×8×8 cluster/meaning combination provides 3 confirmable ideas in RU/EN/ES",()=>{
 let checked=0;
 for(const c of CURRENT_EMOTION_CLUSTERS)for(const d of DESIRED_EMOTION_CLUSTERS){
  const cell=getEmotionalVectorByStates(c.representativeStateId,d.representativeStateId);
  assert.ok(cell);
  for(const axis of MEANING_AXES)for(const locale of locales){
   const input=req(c,d,axis.id,locale);
   const result=recommendMeaningIdeas(input);
   assert.equal(result.status,"ok",locale+":"+cell.id+":"+axis.id);
   assert.equal(result.ideas.length,3);
   assert.equal(new Set(result.ideas.map(x=>x.premiseType)).size,3);
   assert.equal(result.normalizedInputs.emotionalVectorCellId,cell.id);
   assert.ok(result.ideas.every(x=>x.approvedByOwner===false));
   const confirmed=confirmMeaningIdea(input,{ideaId:result.ideas[0].ideaId});
   assert.equal(confirmed.status,"confirmed");
   assert.equal(confirmed.customerConsent,"explicit_idea_confirmation");
   assert.equal(confirmed.emotionalTransition.from,c.representativeStateId);
   assert.equal(confirmed.emotionalTransition.to,d.representativeStateId);
   assert.equal(confirmed.editorialReviewStatus,result.ideas[0].editorReviewStatus);
   assert.ok(confirmed.ideaText.length>=35);
   checked++;
  }
 }
 assert.equal(checked,1536);
});
test("existing exact 8×8×3 ideas retain IDs, status and preference",()=>{
 for(const v of EMOTIONAL_VECTORS)for(const axis of MEANING_AXES){
  const c=CURRENT_EMOTION_CLUSTERS.find(x=>x.stateIds.includes(v.currentStateId));
  const d=DESIRED_EMOTION_CLUSTERS.find(x=>x.stateIds.includes(v.desiredStateId));
  const input={...req(c,d,axis.id),current:{stateId:v.currentStateId,intensity:6},
   desired:{stateId:v.desiredStateId}};
  const result=recommendMeaningIdeas(input);
  assert.equal(result.status,"ok");
  assert.equal(result.ideas.length,3);
  assert.ok(result.ideas.every(x=>x.editorReviewStatus==="source_curated"));
  assert.ok(result.ideas.every(x=>MEANING_IDEAS.some(y=>y.id===x.ideaId)));
 }
});
test("crisis, coercion and unconfirmed IDs are rejected; no media permission inferred",()=>{
 const c=CURRENT_EMOTION_CLUSTERS[7],d=DESIRED_EMOTION_CLUSTERS[0];
 const input=req(c,d,"anchor");
 const crisis=recommendMeaningIdeas({...input,optionalContext:"хочу умереть"});
 assert.equal(crisis.status,"safety_support");assert.equal(crisis.ideas.length,0);
 const coercion=recommendMeaningIdeas({...input,optionalContext:"нужно терпеть насилие"});
 assert.equal(coercion.status,"no_safe_idea");assert.equal(coercion.ideas.length,0);
 const idea=recommendMeaningIdeas(input).ideas[0];
 assert.equal(confirmMeaningIdea(input,{ideaId:"mi64-forged"}),null);
 const confirmed=confirmMeaningIdea(input,{ideaId:idea.ideaId});
 const handoff=buildMeaningFilmHandoff(confirmed,{locale:"ru"});
 assert.equal(handoff.renderReady,false);
 assert.equal(handoff.mayPublishVideo,false);
 assert.equal(confirmMeaningIdea(input,{neutral:true}).status,"neutral_confirmed");
});
