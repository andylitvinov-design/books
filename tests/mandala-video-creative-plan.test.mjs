import test from "node:test";
import assert from "node:assert/strict";
import {getMyTubeTaxonomy} from "../lib/mandala/mytube-content-taxonomy.mjs";
import {getCompleteFilmScreenplay} from "../lib/mandala/film-screenplay-256.mjs";
import {suggestVideoConcept,reviseVideoConcept} from "../lib/mandala/auto-video-concept.mjs";
import {getVideoCreativeDirections,applyVideoCreativeDirection}
  from "../lib/mandala/video-creative-directions.mjs";
import {rankFilmOptions} from "../lib/mandala/film-personalization-ranker.mjs";
import {VIDEO_CREATIVE_PLAN_VERSION,SIX_SHOT_ROLES,SIX_SHOT_BEATS,
  buildVideoCreativePlan,rankGoalCausalFilmDirections,
  assessGoalFilmCausality,videoCreativePlanIsCoherent}
  from "../lib/mandala/video-creative-plan-v1.mjs";

const locales=["ru","en","es"];
const stages=[0,0,1,2,2,3];
const goals={id:"rehearse",type:"change",mechanismId:"mental_rehearsal",
 scenarioStrategy:"journey",secondaryScenarioStrategy:"reframe",
 topicId:"money-blocks",contextKey:"confirmed-goal-key"};
const mock=(id,genre,rehearsal=false)=>({
 id:"film256-"+id,scenarioId:id,topicId:"money-blocks",genre,
 storyboard:Array.from({length:6},(_,i)=>({
   sceneId:id+":scene:"+(i+1),sourceBeatIndex:stages[i],
   sourceBeat:"Specific source scene "+stages[i],
   action:rehearsal&&i===3?
     "The worker rehearses the price aloud before the customer arrives.":
     "A person makes a small observable choice with the notebook at this stage number "+i
 }))
});

test("actual visible rehearsal can outrank a merely named journey",()=>{
 const vague=mock("money-blocks-s1","journey");
 const specific=mock("money-blocks-s2","shelter",true);
 const context={topicId:"money-blocks",goalPlan:goals};
 const ranked=rankGoalCausalFilmDirections([vague,specific],context);
 assert.equal(ranked.length,2);
 assert.equal(ranked[0].scenarioId,"money-blocks-s2");
 assert.equal(ranked[0].creativeGoalMatch.causalStatus,"editorial_action_evidence");
 assert.deepEqual(ranked[0].creativeGoalMatch.evidenceShots,[4]);
 assert.notEqual(ranked[0].genre,ranked[1].genre);
 assert.equal(ranked[0].creativeGoalMatch.psychologicalEffectVerified,false);
 assert.equal(assessGoalFilmCausality(vague,goals).status,"needs_editorial_review");
});

test("no confirmed Goal leaves the previous film ranking unchanged",()=>{
 const list=[mock("money-blocks-s1","journey"),mock("money-blocks-s2","shelter",true)];
 const context={topicId:"money-blocks"};
 assert.deepEqual(rankGoalCausalFilmDirections(list,context),rankFilmOptions(list,context));
});

test("a goal from a different canonical topic cannot select this topic's film",()=>{
 assert.deepEqual(rankGoalCausalFilmDirections([mock("money-blocks-s2","shelter",true)],
   {topicId:"money-blocks",goalPlan:{...goals,topicId:"couple-conflict"}}),[]);
 const p=buildVideoCreativePlan({topicId:"money-blocks",signature:"v1",
   goalPlan:{...goals,topicId:"couple-conflict"}},
   mock("money-blocks-s2","shelter",true),{locale:"en"});
 assert.equal(p.goal.topicConsistent,false);
 assert.equal(p.status,"needs_editorial_review");
 assert.equal(videoCreativePlanIsCoherent(p),false);
});

test("all 256 films in three languages preserve the same 4→6 structure and unverified media",()=>{
 const taxonomy=getMyTubeTaxonomy();
 const rows=taxonomy.categories.flatMap(c=>c.subcategories.flatMap(s=>
   s.topics.flatMap(t=>t.scenarios.map(r=>({topicId:t.id,scenarioId:r.id})))));
 assert.equal(rows.length,256);
 for(const locale of locales)for(const row of rows){
   const film=getCompleteFilmScreenplay(row.scenarioId,locale);
   const base={topicId:row.topicId,scenarioId:row.scenarioId,
     signature:row.scenarioId+locale,
     personalizationSignals:{source:"not_confirmed",currentIds:["afraid"]}};
   const plan=buildVideoCreativePlan(base,film,{locale});
   assert.ok(plan,row.scenarioId+":"+locale);
   assert.equal(plan.version,VIDEO_CREATIVE_PLAN_VERSION);
   assert.equal(plan.story.durationSeconds,30);
   assert.equal(plan.story.scenes.length,6);
   assert.deepEqual(plan.story.scenes.map(x=>x.role),SIX_SHOT_ROLES);
   assert.deepEqual(plan.story.scenes.map(x=>x.sourceBeatIndex),SIX_SHOT_BEATS);
   assert.deepEqual(plan.story.scenes.map(x=>x.action),
     film.storyboard.map(x=>x.action));
   assert.equal(plan.personalization.confirmed,false);
   assert.deepEqual(plan.personalization.currentIds,[]);
   assert.equal(plan.story.plotVariantStatus,"no_explicit_mytube_plot_variant");
   assert.equal(plan.goal.explicitlySelected,false);
   assert.equal(plan.media.rightsVerified,false);
   assert.equal(plan.media.physicallyDecoded,false);
   assert.equal(plan.media.canClaimLiteralFootage,false);
   assert.equal(plan.psychologicalEffectVerified,false);
   assert.equal(videoCreativePlanIsCoherent(plan),true);
 }
});

test("an explicitly selected four-beat MyTube plot requires separate six-shot story approval",()=>{
 const film=getCompleteFilmScreenplay("money-blocks-s2","en");
 const base={topicId:"money-blocks",scenarioId:"money-blocks-s2",
  selectedPlotId:"money-blocks-s2-p3",signature:"explicit",goalPlan:goals,
  personalizationSignals:{source:"confirmed_answers",currentIds:["afraid"],
   desiredIds:["confident"],focusIds:["agency"]}};
 const plan=buildVideoCreativePlan(base,film,{locale:"en"});
 assert.equal(plan.story.plotVariantId,"money-blocks-s2-p3");
 assert.equal(plan.story.plotVariantStatus,"needs_four_to_six_beat_editorial_alignment");
 assert.deepEqual(plan.personalization.currentIds,["afraid"]);
 assert.equal(plan.goal.mechanismId,"mental_rehearsal");
 assert.equal(plan.media.canClaimLiteralFootage,false);
 const edited=buildVideoCreativePlan({...base,goalPlan:{...goals,id:"ground",
   mechanismId:"grounding"}},film,{locale:"en"});
 assert.notEqual(edited.id,plan.id,"a changed goal invalidates the storyboard contract");
});

test("selected film carries the one CreativePlan without changing Ideas → Montage shot actions",()=>{
 for(const locale of locales){
   const base=suggestVideoConcept({locale,goal:locale==="ru"?
     "Мне трудно назвать цену за работу":locale==="es"?
     "Me cuesta decir el precio de mi trabajo":"It is hard to state my price for work",
     selectedTopicId:"money-blocks",theme:"money"});
   const c={...base,goalPlan:goals};
   const candidates=getVideoCreativeDirections(c,locale);
   assert.equal(candidates.length,2,locale);
   assert.ok(candidates.every(x=>x.creativeGoalMatch?.goalId==="rehearse"));
   const chosen=candidates[0];
   const applied=applyVideoCreativeDirection(c,chosen);
   assert.ok(applied.creativePlan);
   assert.equal(applied.creativePlan.scenarioId,chosen.scenarioId);
   assert.deepEqual(applied.creativePlan.story.scenes.map(x=>x.action),
     applied.storyboard.map(x=>x.action));
   assert.equal(videoCreativePlanIsCoherent(applied.creativePlan),true);
   const changed=reviseVideoConcept(applied,{mainMessage:"New manually approved focus"},locale);
   assert.equal(changed.creativePlan,null,"an edited concept may not carry stale approval");
 }
});
