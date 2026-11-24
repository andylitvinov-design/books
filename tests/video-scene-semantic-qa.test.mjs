import test from "node:test";
import assert from "node:assert/strict";
import {proposeGoalPhraseSlots,GOAL_PHRASE_SLOTS_VERSION}
 from "../lib/mandala/video-phrase-story-alignment.mjs";
import {assessScenePhotoMetadata,SCENE_PHOTO_SEMANTIC_VERSION}
 from "../lib/mandala/video-photo-action-fit.mjs";
import {buildAlignedStorySceneGuides}
 from "../lib/mandala/storyboard-content-alignment.mjs";
import {planDotStoryV3Photos}
 from "../lib/mandala/dot-story-v3-scene-photos.mjs";

test("only chosen Goal can redistribute chosen phrases; original order and exact wording remain intact",()=>{
 assert.equal(GOAL_PHRASE_SLOTS_VERSION,"hh-goal-phrase-slots-v1");
 const p=["Мне трудно назвать цену","Я могу опираться на факты","Я могу произнести цену"];
 const slots=proposeGoalPhraseSlots(p,{goalSelected:true});
 assert.equal(slots.length,6);
 assert.deepEqual([slots[0],slots[2],slots[4]],p);
 assert.deepEqual([slots[1],slots[3],slots[5]],[null,null,null]);
 assert.equal(proposeGoalPhraseSlots(p,{goalSelected:false}),null);
 assert.equal(proposeGoalPhraseSlots(p,{goalSelected:true,manualPlacements:true}),null);
 assert.equal(proposeGoalPhraseSlots(Array(7).fill("Explicit content"),{goalSelected:true}),null);
 assert.equal(proposeGoalPhraseSlots(["Guaranteed healing"],{goalSelected:true}),null);
 assert.deepEqual(proposeGoalPhraseSlots(["Мне трудно говорить"],{goalSelected:true})[0],
   "Мне трудно говорить");
 assert.deepEqual(proposeGoalPhraseSlots(["I can rest today"],{goalSelected:true})[2],
   "I can rest today");
});

test("storyboard keeps exactly six original visible actions; selected phrases occupy meaningful shot slots",()=>{
 const actions=[
  "A client asks for a clear quote about a completed work.",
  "The designer hides a blank price tag behind a notebook.",
  "The designer examines a written list of actual hours.",
  "They rehearse a spoken price once without apologizing.",
  "The price is stated to the client with a clear scope.",
  "The client asks for time and the answer stays open."
 ];
 const concept={topicId:"money-blocks",goalPlan:{id:"rehearse",
    mechanismId:"mental_rehearsal"},
  storyboard:actions.map((action,i)=>({
    action,sceneId:"money-blocks-s2:scene:"+(i+1),
    title:"Shot "+(i+1),keywords:["person","hands"],
    sourceBeatIndex:[0,0,1,2,2,3][i]
  })),hasPersonalInput:true};
 const phrases=["It is hard to say my price","I can check the facts","I can state my price"];
 const scenes=buildAlignedStorySceneGuides({locale:"en",goal:"Tell my price",
   phrases,concept,count:6}).scenes;
 assert.deepEqual(scenes.map(s=>s.visual),actions);
 assert.deepEqual(scenes.map(s=>s.sourcePhrase),
  [phrases[0],null,phrases[1],null,phrases[2],null]);
 assert.deepEqual(scenes.map(s=>s.sourceSceneId),
  actions.map((_,i)=>"money-blocks-s2:scene:"+(i+1)));
 assert.ok(scenes.every(s=>s.requiresLiteralMatch===true));
 const old=buildAlignedStorySceneGuides({locale:"en",goal:"Tell my price",
  phrases,concept:{...concept,goalPlan:null},count:6}).scenes;
 assert.deepEqual(old.map(x=>x.sourcePhrase),
   [...phrases,null,null,null],"no selected Goal means original source order");
});

test("five chosen supportive phrases match six filmed actions, not list position",()=>{
 const phrases=[
  "I welcome love with openness","I deserve mutual care and respect",
  "I can connect with an open heart","I let trust grow at its own pace",
  "I welcome kind relationships"
 ];
 const shots=[
  ["The long way home","An exhausted commuter walks home."],
  ["The second chair","A small table for one now has a second chair."],
  ["A gentle look back","Hands open a case and touch an old photograph."],
  ["A place for memories","The case goes onto a shelf, making space in the room."],
  ["An invitation","A phone lights up with an invitation."],
  ["The door opens","Morning light touches two chairs as the door opens."]
 ];
 const storyboard=shots.map(([title,action],i)=>({
   title,action,sceneId:"space-s1:scene:"+(i+1),keywords:[],
   sourceBeatIndex:[0,0,1,2,2,3][i]
 }));
 const expected=[null,phrases[1],phrases[3],phrases[2],phrases[4],phrases[0]];
 const story=buildAlignedStorySceneGuides({
  locale:"en",goal:"Welcome supportive relationships",phrases,count:6,
  concept:{goalPlan:{id:"safe-openness",mechanismId:"resourcing"},storyboard}
 }).scenes;
 assert.deepEqual(story.map(scene=>scene.sourcePhrase),expected);
 assert.deepEqual(story.map(scene=>scene.visual),shots.map(shot=>shot[1]),
  "phrase alignment must never rewrite filmed actions");
 assert.equal(new Set(story.map(scene=>scene.sourcePhrase).filter(Boolean)).size,5);
 assert.deepEqual(proposeGoalPhraseSlots(phrases,{
  goalSelected:true,sceneActions:shots.map(shot=>shot.join(" · "))
 }),expected);
 assert.equal(proposeGoalPhraseSlots(phrases,{
  goalSelected:true,manualPlacements:true,sceneActions:shots.map(shot=>shot.join(" · "))
 }),null);
 assert.deepEqual(proposeGoalPhraseSlots(phrases,{
  goalSelected:true,sceneActions:shots.slice(0,5).map(shot=>shot.join(" · "))
 }),[...phrases,null],"incomplete shot proof must preserve existing order");
});
test("RU and ES matching uses only written cues and preserves user's exact phrases",()=>{
 const cases=[
  {phrases:["Я принимаю любовь с открытостью","Я заслуживаю взаимной заботы и уважения",
   "Я могу соединяться с открытым сердцем","Я позволяю доверию расти постепенно",
   "Я приветствую добрые отношения"],
   scenes:["Длинный путь домой","Второй стул","Старые фотографии",
    "Чемодан убирают на полку","Приглашение на телефон","Дверь открывается"]},
  {phrases:["Recibo el amor con apertura","Merezco cuidado mutuo y respeto",
   "Puedo conectar con el corazón abierto","Dejo que la confianza crezca despacio",
   "Doy la bienvenida a relaciones amables"],
   scenes:["El largo regreso","Dos sillas","Una foto antigua",
    "La maleta pasa a un estante","Una invitación por teléfono","La puerta se abre"]}
 ];
 for(const item of cases){
  const slots=proposeGoalPhraseSlots(item.phrases,{
    goalSelected:true,sceneActions:item.scenes});
  assert.deepEqual(slots,[null,item.phrases[1],item.phrases[3],
   item.phrases[2],item.phrases[4],item.phrases[0]]);
 }
});

test("visual object evidence is only a metadata hint, never scene or licence verification",()=>{
 assert.equal(SCENE_PHOTO_SEMANTIC_VERSION,"hh-scene-photo-semantic-v1");
 const beat="Two people pull opposite ends of a rope.";
 const wrong=assessScenePhotoMetadata(beat,{tags:["action:embrace","family"],
  source_title:"Family embracing in a room"});
 const candidate=assessScenePhotoMetadata(beat,{tags:["object:rope","people","team"],
  source_title:"People pulling rope outdoors"});
 assert.equal(wrong.status,"required_object_not_in_metadata");
 assert.equal(wrong.literalVisualVerified,false);
 assert.ok(wrong.scoreAdjustment<0);
 assert.equal(candidate.status,"object_hint_in_metadata");
 assert.ok(candidate.scoreAdjustment>0);
 assert.equal(candidate.literalVisualVerified,false);
 assert.equal(candidate.physicallyDecoded,false);
 const neutral=assessScenePhotoMetadata("A new perspective opens.",{tags:[]});
 assert.equal(neutral.status,"no_literal_object_extracted");
 assert.equal(neutral.scoreAdjustment,0);
});

test("Dot's original 5-source photo planner now prefers a rope cue over an unrelated high-score embrace",()=>{
 const plot={id:"couple-conflict-s2-p1",visualCues:[
  "Two people pull opposite ends of a rope.",
  "The rope is put down on the ground.",
  "The pair asks a question about their shared task.",
  "They coordinate a modest new action together."
 ]};
 const src=(scene_no,slot,num,tags,score)=>({
  plot_id:plot.id,scene_no,slot,asset_id:"pexels-"+num,
  origin_key:"pexels-"+num,match_score:score,
  match_kind:slot===1?"strong_tag_match":"partial_tag_match",
  editorial_review:"suggested",asset_status:"metadata_verified",
  source_kind:"pexels",
  image_url:"https://images.pexels.com/photos/"+num+
    "/pexels-photo-"+num+".jpeg?auto=compress&cs=tinysrgb&w=1280",
  source_page_url:"https://www.pexels.com/photo/verified-photo-"+num+"/",
  creator_name:"Source Creator "+num,license_code:"Pexels License",
  license_url:"https://www.pexels.com/license/",
  native_width:4000,native_height:3000,
  orientation:"landscape",quality_score:4,tags,
  source_title:"Reviewed photo reference "+num
 });
 const rows=Array.from({length:4},(_,j)=>{
  const scene_no=j+1;
  const candidates=Array.from({length:5},(_,k)=>src(scene_no,k+1,30000+j*10+k,
    ["category:love","people"],60-k));
  if(j===0){
   candidates[0].tags=["action:embrace","family"];
   candidates[0].match_score=88;
   candidates[1].tags=["object:rope","two people","action:pull"];
   candidates[1].match_score=67;
  }
  return candidates;
 }).flat();
 const plans=planDotStoryV3Photos(plot,rows,"landscape");
 assert.ok(plans.length>0);
 assert.equal(plans[0].photos[0].photoId,"pexels-30001");
 assert.equal(plans[0].photos[0].semanticStatus,"object_hint_in_metadata");
 assert.equal(plans[0].photos[0].literalVisualVerified,false);
 assert.equal(new Set(plans[0].photos.map(s=>s.originKey)).size,4);
 assert.ok(plans[0].photos.every(p=>p.verifiedStatus==="metadata_verified"));
 assert.deepEqual(planDotStoryV3Photos(plot,rows,"portrait"),[]);
});
