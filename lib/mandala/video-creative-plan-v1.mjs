/**
 * Video Studio CreativePlan: local and deterministic contract connecting
 * Client theme -> chosen goal -> narrative mechanism -> film -> 6 filmed actions.
 * A 4-beat MyTube plot is NOT the same as a six-shot Video Studio screenplay.
 * All external media, psychological outcomes and final MP4 remain unverified.
 */
import {getMyTubeTopic} from "./mytube-content-taxonomy.mjs";
import {assessFilmPersonalizationFit,rankFilmOptions,
  FILM_PERSONALIZATION_RANK_VERSION} from "./film-personalization-ranker.mjs";

export const VIDEO_CREATIVE_PLAN_VERSION="hh-video-creative-plan-v1";
export const SIX_SHOT_ROLES=Object.freeze([
  "recognition","obstacle","resource","turning_point","chosen_action","open_ending"
]);
export const SIX_SHOT_BEATS=Object.freeze([0,0,1,2,2,3]);
const GENRES=new Set(["shelter","reframe","journey","integration"]);
const CUES=Object.freeze({
  restful_pause:/\b(?:rest|pause|stop|break|quiet|slow)\b|отдых|пауз|замед|тише|останов|descans|pausa|reposo/iu,
  enjoyment:/\b(?:play|smile|laugh|enjoy|game|dance)\b|игра|улыб|радост|смех|sonre|jugar|divert|disfrut/iu,
  aesthetic_enjoyment:/\b(?:light|color|colour|flower|beauty|admire)\b|цвет|красот|свет|любу|flor|luz|belleza/iu,
  inspiration:/\b(?:draw|sketch|inspir|create|experiment)\b|вдохнов|эскиз|рису|пробу|inspir|dibuj|crear/iu,
  sensory_pause:/\b(?:pause|feel|touch|slow|breath|listen)\b|пауза|ладон|дыхан|почув|escuch|manos|pausa/iu,
  grounding:/\b(?:feet|floor|chair|hands|breath|ground)\b|пол|стул|ладон|дышан|опор|suelo|silla|manos|respir|apoyo/iu,
  validation:/\b(?:accept|acknowledge|allow|notice|listen)\b|принят|замеча|позвол|слуша|acept|escuch|reconoc/iu,
  resourcing:/\b(?:support|helper|friend|contact|resource)\b|помощ|поддерж|контакт|ресурс|apoyo|ayuda|recurso/iu,
  awareness:/\b(?:notice|observe|look|read|compare|question)\b|замеч|наблюд|сравни|читает|observ|mirar|compar/iu,
  cognitive_reframing:/\b(?:instead|replace|alternative|evidence|fact|different|erase|compare|rewrite)\b|вместо|факт|перепис|сравни|стира|исправ|en lugar|evidencia|hecho|borr|compar/iu,
  resource_development:/\b(?:finish|complete|prepare|practice|step|choose|build)\b|законч|заверш|готов|выбир|отмеча|paso|prepar|termin|elegir/iu,
  mental_rehearsal:/\b(?:rehears\w*|practic\w*|say aloud|try again|repeat\w*|spoken)\b|репетир|вслух|повторя|проговар|практику|ensay|repet|voz alta|practic/iu
});
const safe=x=>String(x??"").normalize("NFKC")
  .replace(/[\u0000-\u001f\u007f<>]/gu," ").replace(/\s+/gu," ").trim().slice(0,600);
const action=shot=>safe(shot?.action||shot?.visualAction||"");
const strHash=x=>{
 let h=2166136261;
 for(const c of String(x))h=Math.imul(h^c.charCodeAt(0),16777619);
 return (h>>>0).toString(36);
};
const topicOk=(base,goal)=>!goal?.topicId||goal.topicId===base?.topicId;
const sourceScenario=(topicId,scenarioId)=>{
 const t=getMyTubeTopic(topicId);
 const s=t?.topic.scenarios.find(x=>x.id===scenarioId);
 return s?{topic:t,scenario:s}:null;
};

/** Evidence means a concrete action has a relevant cue, never proven therapy. */
export function assessGoalFilmCausality(film,goalPlan=null){
 const mechanismId=String(goalPlan?.mechanismId||"");
 const re=CUES[mechanismId];
 if(!re)return Object.freeze({mechanismId:null,score:0,
  status:"no_explicit_mechanism",evidenceShots:Object.freeze([]),
  psychologicalEffectVerified:false});
 const found=(film?.storyboard||[]).map((s,i)=>re.test(action(s))?i+1:0)
   .filter(Boolean);
 const later=found.filter(i=>i>=3);
 const score=Math.min(56,(later.length?34:0)+Math.min(2,later.length)*9+
   (found.some(i=>i<3)?4:0));
 return Object.freeze({mechanismId,score,
   status:later.length?"editorial_action_evidence":"needs_editorial_review",
   evidenceShots:Object.freeze(found),psychologicalEffectVerified:false});
}

/**
 * The goal's actual mechanism and concrete later scenes can outrank a
 * merely labelled genre. Without an explicit Goal, preserve current ranking.
 */
export function rankGoalCausalFilmDirections(options,concept={}){
 if(!Array.isArray(options))return [];
 const goal=concept?.goalPlan;
 if(!goal||!GENRES.has(goal.scenarioStrategy))
   return rankFilmOptions(options,concept);
 if(!topicOk(concept,goal))return [];
 const specific=concept?.scenarioFit?.confidence==="high"&&
   typeof concept?.scenarioId==="string";
 const ranked=options.filter(o=>o?.id&&(!o.topicId||o.topicId===concept.topicId))
  .map((film,index)=>{
   const fit=assessFilmPersonalizationFit(film,concept);
   const causal=assessGoalFilmCausality(film,goal);
   const genreScore=film.genre===goal.scenarioStrategy?32:
     film.genre===goal.secondaryScenarioStrategy?14:0;
   const intentScore=specific&&film.scenarioId===concept.scenarioId?34:0;
   return {film,index,fit,causal,genreScore,intentScore,
     score:fit.score+causal.score+genreScore+intentScore};
  }).sort((a,b)=>b.score-a.score||a.index-b.index);
 const selected=[],ids=new Set(),genres=new Set();
 for(const entry of ranked){
   if(ids.has(entry.film.id))continue;
   if(selected.length&&entry.film.genre&&genres.has(entry.film.genre)&&
      ranked.some(x=>!ids.has(x.film.id)&&x.film.genre&&!genres.has(x.film.genre)))
       continue;
   ids.add(entry.film.id);
   if(entry.film.genre)genres.add(entry.film.genre);
   selected.push({...entry.film,
    creativeGoalMatch:{
     goalId:goal.id||null,mechanismId:entry.causal.mechanismId,
     causalStatus:entry.causal.status,evidenceShots:[...entry.causal.evidenceShots],
     score:entry.causal.score,psychologicalEffectVerified:false
    },
    matchFactors:[...new Set([
     ...(entry.genreScore?["selected_goal_strategy"]:[]),
     ...(entry.causal.evidenceShots.length?["visible_goal_action"]:[]),
     ...(entry.intentScore?["client_intent"]:[]),...entry.fit.factors])],
    personalizationRankVersion:FILM_PERSONALIZATION_RANK_VERSION});
   if(selected.length===2)break;
 }
 return selected;
}

/**
 * Canonical contract for one client-approved editorial direction.
 * Keeps four source beats and six visible scenes distinct. No invented
 * source media, unconfirmed affirmations or narrative transformation.
 */
export function buildVideoCreativePlan(base,direction,{locale="ru"}={}){
 if(!base||!direction||!Array.isArray(direction.storyboard)||
    direction.storyboard.length!==6)return null;
 const language=["ru","en","es"].includes(locale)?locale:"ru";
 const scenarioId=direction.scenarioId||base.scenarioId;
 const canonical=sourceScenario(base.topicId,scenarioId);
 const goal=base.goalPlan||null,consistent=topicOk(base,goal);
 const actions=direction.storyboard.map(action);
 if(actions.some(x=>x.length<20)||new Set(actions).size!==6)return null;
 const beats=Array.isArray(direction.sourceStages)&&direction.sourceStages.length===4?
   direction.sourceStages:canonical?.scenario?.storyboard?.[language]||[];
 const scenes=actions.map((text,index)=>{
   const sourceBeatIndex=Number.isInteger(direction.storyboard[index].sourceBeatIndex)?
     direction.storyboard[index].sourceBeatIndex:SIX_SHOT_BEATS[index];
   return Object.freeze({
    sceneId:safe(direction.storyboard[index].sceneId||scenarioId+":scene:"+(index+1)),
    index:index+1,startSeconds:index*5,endSeconds:(index+1)*5,
    role:SIX_SHOT_ROLES[index],action:text,sourceBeatIndex,
    sourceBeat:safe(direction.storyboard[index].sourceBeat||
      beats[sourceBeatIndex]||""),
    phraseStatus:"not_selected",mediaStatus:"editorial_unverified",
    literalActionVerified:false
   });
 });
 const candidatePlot=typeof base.selectedPlotId==="string"&&
  base.selectedPlotId.startsWith(scenarioId+"-p")&&
  /^.+-p[1-6]$/.test(base.selectedPlotId)?base.selectedPlotId:null;
 const confirmed=base.personalizationSignals?.source==="confirmed_answers"?
  base.personalizationSignals:null;
 const id="cplan-"+strHash(JSON.stringify([
  VIDEO_CREATIVE_PLAN_VERSION,base.signature||"",goal?.contextKey||"",
  goal?.id||"",base.topicId,scenarioId,direction.id,...actions]));
 const reviewNeeded=!canonical||!consistent||scenes.some(x=>!x.sourceBeat);
 return Object.freeze({
  id,version:VIDEO_CREATIVE_PLAN_VERSION,locale:language,
  categoryId:canonical?.topic.category.id||null,
  subcategoryId:canonical?.topic.subcategory.id||null,
  topicId:base.topicId||null,scenarioId,
  filmId:direction.id||null,
  goal:Object.freeze({id:goal?.id||null,type:goal?.type||null,
    mechanismId:goal?.mechanismId||null,
    scenarioStrategy:goal?.scenarioStrategy||null,
    explicitlySelected:Boolean(goal?.id),topicConsistent:consistent}),
  personalization:Object.freeze({confirmed:Boolean(confirmed),
    currentIds:Object.freeze([...(confirmed?.currentIds||[])]),
    desiredIds:Object.freeze([...(confirmed?.desiredIds||[])]),
    focusIds:Object.freeze([...(confirmed?.focusIds||[])])}),
  causality:assessGoalFilmCausality(direction,goal),
  story:Object.freeze({source:"video_studio_six_shot",durationSeconds:30,
    plotVariantId:candidatePlot,
    plotVariantStatus:candidatePlot?"needs_four_to_six_beat_editorial_alignment":
     "no_explicit_mytube_plot_variant",
    scenes:Object.freeze(scenes)}),
  phrasePlan:Object.freeze([0,2,4].map((i,j)=>Object.freeze({
    sceneId:scenes[i].sceneId,role:["recognition","reframe_or_resource","chosen_action"][j],
    text:null,status:"not_selected"
  }))),
  media:Object.freeze({status:"editorial_only_unverified",
    rightsVerified:false,physicallyDecoded:false,literalActionsVerified:false,
    mp4PlaybackVerified:false,canClaimLiteralFootage:false}),
  status:reviewNeeded?"needs_editorial_review":"editorial_script_ready_media_unverified",
  psychologicalEffectVerified:false
 });
}
export function videoCreativePlanIsCoherent(plan){
 return Boolean(plan?.version===VIDEO_CREATIVE_PLAN_VERSION&&
  plan.goal?.topicConsistent&&plan.story?.scenes?.length===6&&
  plan.story.scenes.every((s,i)=>s.index===i+1&&s.startSeconds===i*5&&
    s.endSeconds===(i+1)*5&&s.role===SIX_SHOT_ROLES[i]&&
    s.mediaStatus==="editorial_unverified"&&s.action.length>=20)&&
  plan.media?.canClaimLiteralFootage===false&&
  plan.psychologicalEffectVerified===false);
}
