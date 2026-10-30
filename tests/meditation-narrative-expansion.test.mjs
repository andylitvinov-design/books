import test from "node:test";
import assert from "node:assert/strict";
import { consultPsychologistMind, buildPsychologyProgram } from "../lib/holistic-support/psychologist-mind.mjs";
import { MEDITATION_IMAGE_ATLAS, listMeditationImages } from "../lib/holistic-support/meditation-image-atlas.mjs";
import { MEDITATION_METAPHORS, listMeditationMetaphors } from "../lib/holistic-support/meditation-metaphor-atlas.mjs";
import { MEDITATION_STORY_ARCS, selectMeditationNarrative, listMeditationNarrativeCatalog } from "../lib/holistic-support/meditation-story-architect.mjs";
import { composePersonalMeditation, composePersonalMeditationSeries } from "../lib/holistic-support/psychologist-meditation-composer.mjs";
import { MEDITATION_IMAGE_ATLAS as coreImages, MEDITATION_METAPHORS as coreMetaphors } from "../lib/holistic-support/holistic-intelligence.mjs";
const safe={safety:{status:"clear"}};
const program=buildPsychologyProgram({...safe,locale:"ru",intent:{focus:"stress"},consent:{resourceImagery:true}});
const ask=(task,extra={})=>consultPsychologistMind({task,locale:"ru",...safe,
  intent:{focus:"stress"},...extra});
const script=(intent={},preferences={},locale="ru")=>ask("meditation",{locale,
  intent:{focus:"stress",...intent},preferences,consent:{resourceImagery:true}});

test("44 imagery scenes include 32 original optional resources and 12 clinician references",()=>{
  assert.equal(MEDITATION_IMAGE_ATLAS.length,44);
  assert.equal(MEDITATION_IMAGE_ATLAS.filter(x=>x.selfGuided).length,32);
  assert.equal(MEDITATION_IMAGE_ATLAS.filter(x=>!x.selfGuided).length,12);
  assert.equal(new Set(MEDITATION_IMAGE_ATLAS.map(x=>x.id)).size,44);
  assert.ok(MEDITATION_IMAGE_ATLAS.filter(x=>!x.selfGuided).every(x=>
    x.prose===null&&x.clinicalReviewRequired));
});
test("48 metaphors include 40 original safe supports and 8 clinician references",()=>{
  assert.equal(MEDITATION_METAPHORS.length,48);
  assert.equal(MEDITATION_METAPHORS.filter(x=>x.selfGuided).length,40);
  assert.equal(new Set(MEDITATION_METAPHORS.map(x=>x.id)).size,48);
  assert.ok(MEDITATION_METAPHORS.every(x=>x.noFixedMeaning===true && x.diagnosis===null));
});
test("all 32 safe scenes, 40 metaphors and 12 arcs have usable RU EN ES text",()=>{
  for(const locale of ["ru","en","es"]){
    for(const item of MEDITATION_IMAGE_ATLAS.filter(x=>x.selfGuided))
      assert.ok(item.title[locale].length>2 && item.prose[locale].length>35);
    for(const item of MEDITATION_METAPHORS.filter(x=>x.selfGuided))
      assert.ok(item.title[locale].length>2 && item.prose[locale].length>35);
    for(const arc of MEDITATION_STORY_ARCS)
      for(const part of ["opening","question","transfer"])
        assert.ok(arc.text[locale][part].length>20);
  }
  assert.equal(MEDITATION_STORY_ARCS.length,12);
});
test("public catalogue never returns clinician scenes and metaphors by default",()=>{
  const images=listMeditationImages();
  const metaphors=listMeditationMetaphors();
  assert.equal(images.length,32);
  assert.equal(metaphors.length,40);
  assert.ok(images.every(x=>x.selfGuided&&!x.clinicalReviewRequired));
  assert.ok(metaphors.every(x=>x.selfGuided&&!x.clinicalReviewRequired));
  assert.equal(listMeditationImages({includeClinical:true}).length,44);
  assert.equal(listMeditationMetaphors({includeClinical:true}).length,48);
});
test("avoided water, height, people and darkness cannot appear in eligible catalog items",()=>{
  const avoidElements=["water","height","people","darkness"];
  const catalog=listMeditationNarrativeCatalog({avoidElements});
  for(const item of [...catalog.scenes,...catalog.metaphors])
    assert.equal(item.avoidTags.some(t=>avoidElements.includes(t)),false);
});
test("explicit client selection wins relevance while unknown or clinical IDs fail closed",()=>{
  const selected=selectMeditationNarrative({locale:"ru",goal:"meaning",
    sceneId:"wooden_table",metaphorId:"bookmark",arcId:"arrival_and_notice"});
  assert.equal(selected.status,"ready");
  assert.equal(selected.sceneId,"wooden_table");
  assert.equal(selected.metaphorId,"bookmark");
  assert.equal(selected.arcId,"arrival_and_notice");
  assert.equal(selected.selection.scene,"explicit_user_choice");
  assert.equal(selectMeditationNarrative({sceneId:"missing"}).status,"unknown_scene");
  assert.equal(selectMeditationNarrative({metaphorId:"missing"}).status,"unknown_metaphor");
  assert.equal(selectMeditationNarrative({arcId:"missing"}).status,"unknown_arc");
  assert.equal(selectMeditationNarrative({sceneId:"cave_threshold"}).status,"clinician_review_required");
  assert.equal(selectMeditationNarrative({metaphorId:"memory_door"}).status,"clinician_review_required");
});
test("avoided selected scene, metaphor and narrative arc produce a visible refusal",()=>{
  assert.equal(selectMeditationNarrative({sceneId:"daytime_shore",avoidElements:["water"]}).status,"preferences_conflict");
  assert.equal(selectMeditationNarrative({metaphorId:"river_current",avoidElements:["water"]}).status,"preferences_conflict");
  assert.equal(selectMeditationNarrative({arcId:"everyday_connection",avoidElements:["people"]}).status,"preferences_conflict");
});
test("catalogue maps optional money, work, change, creativity and rest goals to existing support themes",()=>{
  for(const goal of ["money","work","change","creativity","rest"]){
    const cat=listMeditationNarrativeCatalog({goal});
    assert.ok(cat.scenes.length>0);
    assert.ok(cat.metaphors.length>0);
    assert.ok(cat.arcs.length>0);
  }
});
test("deterministic selection uses session variation and avoids previously used IDs",()=>{
  const first=selectMeditationNarrative({goal:"settle",objective:"support"});
  const different=selectMeditationNarrative({goal:"settle",objective:"support",
    historySceneIds:[first.sceneId],historyMetaphorIds:[first.metaphorId]});
  assert.equal(first.status,"ready");
  assert.equal(different.status,"ready");
  assert.notEqual(first.sceneId,different.sceneId);
  assert.notEqual(first.metaphorId,different.metaphorId);
  assert.deepEqual(first,selectMeditationNarrative({goal:"settle",objective:"support"}));
});
test("three languages yield original narration with real chosen images, story arc and TTS chunks",()=>{
  for(const locale of ["ru","en","es"]){
    const result=script({intentionCode:"confidence",durationMinutes:10,
      sceneId:"seed_in_pot",metaphorId:"small_seed",storyArcId:"learning_from_attempt"}, {},locale);
    assert.equal(result.status,"script_ready");
    assert.equal(result.sceneId,"seed_in_pot");
    assert.equal(result.metaphorId,"small_seed");
    assert.equal(result.storyArcId,"learning_from_attempt");
    assert.ok(result.script.length>900);
    assert.equal(result.language,locale);
    assert.equal(result.voiceSegments.length,7);
    assert.ok(result.voiceSegments.every(x=>!x.text.includes("[")&&x.timingApproximate));
    assert.equal(result.plannedDurationSeconds,600);
    assert.equal(result.requiresTtsTimingVerification,true);
    assert.equal(result.audioAssetId,null);
    assert.equal(result.published,false);
  }
});
test("series drafts exactly eight scripts with fresh scene and metaphor combinations",()=>{
  const series=ask("meditation_series",{consent:{resourceImagery:true},
    intent:{focus:"stress",durationMinutes:9}});
  assert.equal(series.status,"series_draft_ready");
  assert.equal(series.sessionCount,8);
  assert.equal(series.scripts.length,8);
  assert.ok(series.uniqueSceneCount>=6);
  assert.ok(series.uniqueMetaphorCount>=6);
  assert.ok(series.scripts.every((s,i)=>s.sessionNumber===i+1&&s.status==="script_ready"&&
    s.audioAssetId===null&&s.published===false));
  assert.equal(series.requiresFreshSafetyCheckBeforeEachSession,true);
  assert.equal(series.saved,false);
  assert.equal(series.rendered,false);
});
test("series ignores caller-supplied session number and stays aligned to the eight program lessons",()=>{
  const series=composePersonalMeditationSeries(program,{
    consent:{resourceImagery:true},intent:{sessionNumber:8,variationIndex:1000}});
  assert.equal(series.status,"series_draft_ready");
  assert.deepEqual(series.scripts.map(x=>x.sessionNumber),[1,2,3,4,5,6,7,8]);
  assert.deepEqual(series.scripts.map(x=>x.sessionObjective),
    program.sessions.map(s=>s.objectiveCode));
});
test("no imagery consent or explicit opt-outs cannot be bypassed by a series request",()=>{
  assert.equal(ask("meditation_series").status,"imagery_consent_required");
  assert.equal(ask("meditation_series",{consent:{resourceImagery:true},
    preferences:{noImagery:true}}).status,"imagery_consent_required");
  assert.equal(ask("meditation_series",{intent:{focus:"trauma_support"},
    consent:{resourceImagery:true}}).status,"human_review_required");
});
test("unverified client cannot retrieve clinical motifs using includeClinical",()=>{
  const normal=ask("story_library",{intent:{focus:"stress",includeClinical:true}});
  assert.equal(normal.clinicalReferencesVisible,false);
  assert.equal(normal.scenes.length,32);
  assert.equal(normal.metaphors.length,40);
  const clinician=ask("story_library",{intent:{focus:"stress",mode:"practitioner_draft",
    includeClinical:true},access:{authenticated:true,ownerScoped:true,verifiedPractitioner:true}});
  assert.equal(clinician.clinicalReferencesVisible,true);
  assert.equal(clinician.scenes.length,44);
  assert.equal(clinician.metaphors.length,48);
});
test("meditation and catalogue obey preflight safety and clinical/trauma stop",()=>{
  for(const task of ["story_library","meditation","meditation_series"]){
    assert.equal(consultPsychologistMind({task,intent:{focus:"stress"}}).status,
      "safety_check_required");
    assert.equal(ask(task,{safety:{status:"urgent"}}).status,"safety_handoff");
    assert.equal(ask(task,{feedback:{worsening:true}}).status,"paused_for_review");
  }
});
test("explicit high intensity or clinical KIP references never generate meditations",()=>{
  assert.equal(script({motifId:"cave"}).status,"clinician_review_required");
  assert.equal(script({sceneId:"childhood_room"}).status,"clinician_review_required");
  assert.equal(script({metaphorId:"mythic_descent"}).status,"clinician_review_required");
});
test("avoid element preferences reject conflicting metaphors and scenes with no silent substitution",()=>{
  const blocked=script({sceneId:"daytime_shore"},{avoidElements:["water"]});
  assert.equal(blocked.status,"preferences_conflict");
  assert.equal(blocked.script,null);
  const blockedMeta=script({metaphorId:"river_current"},{avoidElements:["water"]});
  assert.equal(blockedMeta.status,"preferences_conflict");
  const safeDefault=script({intentionCode:"meaning"},{avoidElements:["darkness"]});
  assert.equal(safeDefault.status,"script_ready");
  assert.notEqual(safeDefault.motifId,"small_light");
});
test("raw user free text and malicious markup are not inserted into scripts or narration",()=>{
  const privateText="Сложно с деньгами. PRIVATE_CLIENT_DETAIL_449 <script>alert(1)</script>";
  const result=script({rawUtterance:privateText});
  assert.equal(result.status,"script_ready");
  assert.equal(result.intentionCode,"money");
  assert.ok(!JSON.stringify(result).includes("PRIVATE_CLIENT_DETAIL_449"));
  assert.ok(!result.script.includes("<script>"));
});
test("requested practical style yields no auto metaphor, poetic style changes actual text",()=>{
  const practical=script({}, {style:"practical"});
  const poetic=script({}, {style:"poetic"});
  assert.equal(practical.status,"script_ready");
  assert.equal(practical.metaphorId,null);
  assert.ok(practical.script.includes("нейтральных предметов"));
  assert.ok(poetic.script.includes("мягкими ориентирами"));
  assert.ok(poetic.metaphorId);
  const explicit=script({metaphorId:"bookmark"},{style:"practical"});
  assert.equal(explicit.metaphorId,"bookmark");
});
test("the atlas is available through the shared parent Holistic Intelligence module",()=>{
  assert.equal(coreImages.length,MEDITATION_IMAGE_ATLAS.length);
  assert.equal(coreMetaphors.length,MEDITATION_METAPHORS.length);
});
