import test from "node:test";
import assert from "node:assert/strict";
import {getMyTubeTaxonomy,auditMyTubeTaxonomy} from "../lib/mandala/mytube-content-taxonomy.mjs";
import expansion from "../data/video-catalog/state-transition-scenarios-v1.json" with {type:"json"};
import {auditMyTubeCreativeChoices} from "../lib/mandala/mytube-creative-choices.mjs";
import {STATE_DEFINITIONS,TRANSITION_TEMPLATES,EXTRA_SCENARIO_MOTIFS,
  auditStateTransitionRegistry} from "../lib/mandala/state-transition/state-catalog.mjs";
import {auditStateTransitionCatalog,listStateTransitionScenarios,normalizeStates,
  planTransitions,recommendScenario,resolveMotifAndStyle} from "../lib/mandala/state-transition/scenario-engine.mjs";

const request=(current,desired,locale="ru",topicId="life-purpose",preferences={})=>({
 schemaVersion:"state-transition-request-v1",locale,topicId,
 current:{stateId:current,intensity:"medium"},
 desired:{stateId:desired,intensity:"medium"},
 preferences,
});
test("64 original topics and 256 legacy IDs are preserved; 256 new editorial scenarios make 512",()=>{
 const baseline=auditMyTubeTaxonomy();
 assert.equal(baseline.ok,true,baseline.errors.join("\n"));
 const creative=auditMyTubeCreativeChoices();
 assert.equal(creative.ok,true,creative.errors.join("\n"));
 const audit=auditStateTransitionCatalog();
 assert.equal(audit.ok,true,audit.errors.slice(0,15).join("\n"));
 assert.deepEqual([audit.counts.topics,audit.counts.legacyScenarios,
   audit.counts.newScenarios,audit.counts.scenarios],[64,256,256,512]);
 assert.equal(audit.counts.newPendingHumanReview,256);
 assert.equal(audit.counts.approvedNewMediaBindings,0);
});
test("48 canonical states, 12 clusters, valid vectors and directed stage graphs",()=>{
 const audit=auditStateTransitionRegistry();
 assert.deepEqual(audit.errors,[]);
 assert.deepEqual([audit.counts.states,audit.counts.clusters],[48,12]);
 assert.equal(STATE_DEFINITIONS.length,48);
 for(const path of TRANSITION_TEMPLATES){
   assert.ok(path.stages.length>=2&&path.stages.length<=5);
   assert.equal(path.edges.length,path.stages.length-1);
   assert.equal(new Set(path.stages).size,path.stages.length);
 }
});
test("every topic has eight distinct stories / four beats / five motifs across RU EN ES",()=>{
 for(const category of getMyTubeTaxonomy().categories)
 for(const subcategory of category.subcategories)
 for(const topic of subcategory.topics){
   for(const locale of ["ru","en","es"]){
     const rows=listStateTransitionScenarios(topic.id,locale);
     assert.equal(rows.length,8,topic.id+":"+locale);
     assert.equal(new Set(rows.map(x=>x.scenarioId)).size,8);
     assert.equal(new Set(rows.map(x=>x.creativeBrief)).size,8,topic.id+":"+locale);
     assert.equal(new Set(rows.map(x=>x.label)).size,8);
     for(const row of rows){
       assert.equal(row.beats.length,4);
       assert.equal(new Set(row.beats).size,4);
       assert.equal(row.motifIds.length,5);
       assert.equal(new Set(row.motifIds).size,5);
       assert.ok(row.compatibleStyleIds.length>=2);
       assert.equal(row.canExport,false);
       assert.equal(row.mediaBindingStatus,"unbound");
     }
   }
 }
});
test("golden transitions differ by source state even with the same desired confidence",()=>{
 const cases=[
  ["anxiety","confidence","grounding"],
  ["shame","confidence","acceptance"],
  ["helplessness","confidence","agency"],
  ["fatigue","vitality","restoration"],
  ["confusion","clarity","clarification"],
  ["loneliness","closeness","connection"],
  ["anger","boundaries","boundary"],
  ["stuck","freedom","freedom"],
  ["sadness","hope","hope"],
  ["worry","calm","grounding"],
 ];
 for(const locale of ["ru","en","es"])
 for(const [from,to,expected] of cases){
   const value=recommendScenario(request(from,to,locale));
   assert.equal(value.status,"ok",locale+":"+from+"->"+to);
   assert.equal(value.path?.templateId,expected,locale+":"+from+"->"+to);
   assert.equal(value.recommendations[0]?.transitionTemplateId,expected);
   assert.ok(value.recommendations.length>=1&&value.recommendations.length<=3);
   assert.equal(value.recommendations[0]?.fourBeats.length,4);
   assert.equal(value.recommendations[0]?.safeToAutoExport,false);
   assert.equal(value.recommendations[0]?.mediaStatus,"needs_verified_media");
 }
 const top=["anxiety","shame","helplessness"].map(x=>
   recommendScenario(request(x,"confidence")).recommendations[0].scenarioId);
 assert.equal(new Set(top).size,3,top.join(","));
});
test("same input deterministically yields identical output, never client-visible clinical percentages",()=>{
 const input=request("anxiety","confidence");
 assert.deepEqual(recommendScenario(input),recommendScenario(input));
 const result=recommendScenario(input);
 assert.equal(result.modelMode,"deterministic_offline");
 assert.match(result.recommendationId,/^stse-[0-9a-f]{8}$/);
 assert.equal(result.recommendations[0].scoreBreakdown.mediaAvailability,0);
 assert.ok(!JSON.stringify(result).includes("probability"));
});
test("uncertainty is not guessed, free-text high-risk input is never sent to a model",()=>{
 assert.equal(recommendScenario({
   ...request("anxiety","calm"),current:{text:"пустота"}}).status,"unmapped_state");
 assert.equal(recommendScenario({
   ...request("anxiety","calm"),current:{text:"хочу умереть"}}).status,"safety_support");
 assert.equal(recommendScenario({...request("anxiety","calm"),topicId:"fake"}).status,"invalid_topic");
 assert.equal(recommendScenario({...request("anxiety","calm"),preferences:{styleId:"unknown"}}).status,"incompatible_style");
 assert.equal(recommendScenario({...request("anxiety","calm"),preferences:{excludedMotifIds:["not_a_motif"]}}).status,"invalid_motif");
});
test("high activation avoids intense imagery, and motif selection cannot imply licensed footage",()=>{
 const input=request("anxiety","confidence","en");
 input.current.intensity="high";
 const result=recommendScenario(input);
 assert.equal(result.status,"ok");
 for(const rec of result.recommendations){
   assert.ok(!rec.suggestedMotifIds.includes("fire"));
   assert.ok(!rec.suggestedMotifIds.includes("cave"));
   assert.ok(!rec.suggestedMotifIds.includes("stars"));
   const selection=resolveMotifAndStyle(rec,result.path);
   assert.equal(selection.mediaStatus,"needs_verified_media");
 }
});
test("state normalization and path search do not persist original user text",()=>{
 const result=normalizeStates({current:{text:"Тревога"},desired:{text:"Спокойствие"}},"ru");
 assert.equal(result.status,"ok");
 assert.deepEqual(result.current.ids,["anxiety"]);
 assert.deepEqual(result.desired.ids,["calm"]);
 const paths=planTransitions(result);
 assert.ok(paths.length>=1&&paths.length<=3);
 assert.ok(paths[0].edges.length>0);
 assert.equal("text" in result.current,false);
 assert.equal("text" in result.desired,false);
});
test("motif pools exist for each new editorial route without claiming verified images",()=>{
 for(const key of [5,6,7,8]){
   const choices=EXTRA_SCENARIO_MOTIFS[key];
   assert.equal(choices.length,5);
   assert.equal(new Set(choices).size,5);
 }
});

test("public scenario selection excludes unpublished editorial drafts unless explicitly requested",()=>{
 const all=listStateTransitionScenarios("life-purpose","ru");
 const publicSet=listStateTransitionScenarios("life-purpose","ru",{includeEditorialDrafts:false});
 assert.equal(all.length,8);
 assert.equal(publicSet.length,4);
 assert.ok(publicSet.every(s=>!s.newExpansion && /-s[1-4]$/.test(s.scenarioId)));
 for(const locale of ["ru","en","es"]){
   const input=request("anxiety","confidence",locale);
   const safe=recommendScenario(input);
   assert.equal(safe.status,"ok");
   assert.ok(safe.recommendations.length>=1&&safe.recommendations.length<=3);
   assert.ok(safe.recommendations.every(row=>/-s[1-4]$/.test(row.scenarioId)));
   assert.ok(safe.recommendations.every(row=>row.safeToAutoExport===false));
   const preview=recommendScenario({...input,preferences:{includeEditorialDrafts:true}});
   assert.equal(preview.status,"ok");
   assert.ok(preview.recommendations.every(row=>row.mediaStatus==="needs_verified_media"));
 }
});
test("energy and draft-preview parameters are strictly bounded, with no new media approval",()=>{
 const base=request("fatigue","vitality");
 assert.equal(recommendScenario({...base,preferences:{energy:"extreme"}}).status,"invalid_energy");
 assert.equal(recommendScenario({...base,preferences:{includeEditorialDrafts:"yes"}}).status,"invalid_editorial_preview");
 const low=recommendScenario({...base,preferences:{energy:"low"}});
 const high=recommendScenario({...base,preferences:{energy:"high"}});
 assert.equal(low.status,"ok");
 assert.equal(high.status,"ok");
 assert.notEqual(low.recommendationId,high.recommendationId);
 assert.ok(low.recommendations.every(row=>row.scoreBreakdown.mediaAvailability===0));
 assert.ok(!low.recommendations.some(row=>row.safeToAutoExport));
});

test("256 revised editorial drafts use topic-specific four-beat anchors and curated motif roles, but remain unapproved",()=>{
 const atlas=getMyTubeTaxonomy();
 const originals=new Map();
 for(const category of atlas.categories)for(const sub of category.subcategories)for(const topic of sub.topics)
   originals.set(topic.id,topic);
 const motifs=new Set(),sourceBriefs={ru:new Set(),en:new Set(),es:new Set()};
 let revised=0;
 for(const group of expansion.topics){
   const topic=originals.get(group.topicId);
   assert.ok(topic,"unknown editorial topic "+group.topicId);
   assert.equal(group.scenarios.length,4);
   for(const scenario of group.scenarios){
     revised++;
     assert.equal(scenario.storyDerivation,"original_four_arcs_reframed_as_new_nonclinical_editorial_proposal");
     assert.equal(scenario.editorialReviewStatus,"needs_human_review");
     assert.equal(scenario.mediaBindingStatus,"unbound");
     assert.equal(scenario.published,false);
     assert.equal(scenario.motifEvidenceStatus,"editorial_visual_hint_not_frame_verified");
     assert.equal(scenario.motifIds.length,5);
     assert.equal(new Set(scenario.motifIds).size,5);
     for(const id of Object.values(scenario.motifBeatHints))assert.ok(scenario.motifIds.includes(id));
     motifs.add(scenario.motifIds.join("|"));
     for(const locale of ["ru","en","es"]){
       const beats=scenario.storyboard[locale];
       assert.equal(beats.length,4);
       assert.equal(new Set(beats).size,4);
       assert.equal(scenario.creativeBrief[locale],beats.join(" → "));
       assert.ok(!sourceBriefs[locale].has(scenario.creativeBrief[locale]));
       sourceBriefs[locale].add(scenario.creativeBrief[locale]);
       const legacyBeats=topic.scenarios.flatMap(x=>x.storyboard[locale]);
       assert.ok(beats.every(beat=>!legacyBeats.includes(beat)),
         scenario.id+" must be more than a copy of a legacy scene");
     }
   }
 }
 assert.equal(revised,256);
 assert.equal(motifs.size,256);
 for(const locale of ["ru","en","es"])assert.equal(sourceBriefs[locale].size,256);
});
