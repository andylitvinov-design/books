/**
 * Personal video director: transparent ranking of already authored film plots.
 *
 * Only visitor-confirmed personalization IDs are used. This is an editorial
 * relevance heuristic, NOT a psychological evaluation, a medical prediction,
 * or evidence that any video asset is available. Runs locally without APIs.
 */
export const FILM_PERSONALIZATION_RANK_VERSION="hh-film-personalization-v3";
export const FILM_OPTION_COUNT=2;
const M={
 "first-imperfect-line":{current:["selfcritical","uncertain","afraid"],desired:["confident","accepted","joyful"],focus:["growth","agency"],energy:"rise"},
 "small-proof":{current:["selfcritical","discouraged","stuck"],desired:["accepted","fulfilled","confident"],focus:["meaning","dignity","freedom"],energy:"gentle"},
 "borrowed-skill":{current:["stuck","discouraged","uncertain"],desired:["supported","connected","inspired"],focus:["connection","growth","support"],energy:"rise"},
 "visible-work":{current:["selfcritical","discouraged","uncertain"],desired:["confident","clarity","accepted"],focus:["agency","growth","dignity"],energy:"rise"},
 "one-learned-skill":{current:["stuck","discouraged","uncertain"],desired:["inspired","energetic","fulfilled"],focus:["growth","agency"],energy:"rise"},
 "price-on-paper":{current:["uncertain","afraid","selfcritical"],desired:["clarity","freedom","confident"],focus:["freedom","agency"],energy:"gentle"},
 "between-tasks":{current:["tension","fatigue","drained","irritated"],desired:["calm","rested","balanced","safe"],focus:["anchor","meaning"],energy:"gentle"},
 "one-thing":{current:["overwhelmed","stuck","uncertain"],desired:["clarity","calm","fulfilled"],focus:["agency","meaning"],energy:"gentle"},
 "request-for-help":{current:["loneliness","overwhelmed","discouraged"],desired:["supported","understood","connected","comforted"],focus:["connection","support"],energy:"gentle"},
 "borrowed-map":{current:["uncertain","stuck","selfcritical"],desired:["freedom","clarity","confident"],focus:["freedom","meaning"],energy:"rise"},
 "three-sparks":{current:["discouraged","stuck","fatigue"],desired:["inspired","fulfilled","energetic"],focus:["growth","agency"],energy:"rise"},
 "mosaic":{current:["selfcritical","uncertain","loneliness"],desired:["accepted","fulfilled","connected"],focus:["meaning","wholeness","connection"],energy:"gentle"},
 "honest-sentence":{current:["loneliness","sadness","uncertain"],desired:["understood","connected","supported"],focus:["connection","dignity"],energy:"gentle"},
 "two-cups":{current:["loneliness","fatigue","drained"],desired:["comforted","supported","connected","safe"],focus:["connection","support"],energy:"gentle"},
 "boundary-with-care":{current:["afraid","selfcritical","tension"],desired:["safe","freedom","accepted","balanced"],focus:["freedom","dignity"],energy:"gentle"},
 "one-true-choice":{current:["uncertain","stuck","overwhelmed"],desired:["clarity","freedom","calm"],focus:["agency","freedom"],energy:"gentle"},
 "small-request":{current:["overwhelmed","loneliness","uncertain"],desired:["supported","connected","understood"],focus:["connection","support"],energy:"gentle"},
 "clear-horizon":{current:["overwhelmed","uncertain","fatigue"],desired:["freedom","rested","clarity"],focus:["freedom","meaning"],energy:"gentle"},
 "space":{current:["loneliness","fatigue","discouraged"],desired:["accepted","connected","hopeful"],focus:["connection","meaning"],energy:"gentle"},
 "real":{current:["loneliness","uncertain","afraid"],desired:["connected","understood","supported"],focus:["connection","agency"],energy:"rise"},
 "crossing":{current:["stuck","uncertain","discouraged"],desired:["freedom","hopeful","inspired"],focus:["freedom","growth"],energy:"rise"},
 "anxiety-quiet":{current:["tension","afraid","uncertain"],desired:["calm","safe","balanced"],focus:["anchor","meaning"],energy:"gentle"},
 "anxiety-platform":{current:["overwhelmed","afraid","stuck"],desired:["freedom","clarity","confident"],focus:["freedom","agency"],energy:"rise"},
 "anxiety-lamp":{current:["loneliness","drained","sadness"],desired:["comforted","supported","safe"],focus:["connection","meaning"],energy:"gentle"}
};
const safeIds=x=>Array.isArray(x)?[...new Set(x.filter(id=>
 typeof id==="string"&&/^[a-z][a-z0-9_-]{1,35}$/.test(id)).slice(0,3))]:[];
const bounded=x=>Number.isFinite(x)&&x>=0&&x<=10?x:null;
export function confirmedFilmSignals(concept={}){
 const raw=concept?.personalizationSignals;
 if(!raw||raw.source!=="confirmed_answers")return null;
 return {
  currentIds:safeIds(raw.currentIds),
  desiredIds:safeIds(raw.desiredIds),
  focusIds:safeIds(raw.focusIds),
  energyStart:bounded(raw.energyStart),
  energyTarget:bounded(raw.energyTarget)
 };
}
const countCommon=(a,b)=>a.filter(id=>b.includes(id)).length;
export function assessFilmPersonalizationFit(option,concept={}){
 const signals=confirmedFilmSignals(concept);
 const id=String(option?.id||"").replace(/^v3-/,"");
 const meta=M[id]||option?.fitProfile;
 const factors=[];
 if(!signals||!meta)return {score:0,factors:["topic"],personalized:false};
 let score=0;
 for(const [field,tag,weight] of [
  ["currentIds","current",6],["desiredIds","desired",7],["focusIds","focus",4]]){
  const slot=field==="currentIds"?"current":field==="desiredIds"?"desired":"focus";
  const n=countCommon(signals[field],meta[slot]||[]);
  if(n){score+=n*weight;factors.push(tag);}
 }
 const start=signals.energyStart,target=signals.energyTarget;
 if(start!==null&&target!==null){
  const gentle=start<=3||target<=start||
    signals.desiredIds.some(x=>["calm","safe","rested","balanced","comforted"].includes(x));
  const rising=target>=start+3&&target>=6;
  if(meta.energy==="gentle"&&gentle||meta.energy==="rise"&&rising&&!gentle){
   score+=3;factors.push("energy");
  }
 }
 return {score,factors:factors.length?factors:["topic"],personalized:true};
}
// Only explicit user words select one of four authored story forms.
// This editorial hint cannot override confirmed structured personalization.
const FILM_ARCHETYPES=Object.freeze(["journey","shelter","reframe","integration"]);
const optionArchetype=option=>{
 const named=String(option?.genre||option?.archetype||"");
 if(FILM_ARCHETYPES.includes(named))return named;
 const index=Number(String(option?.scenarioId||"").match(/-s([1-4])$/)?.[1]||0);
 return FILM_ARCHETYPES[index-1]||null;
};
/** Stable two-of-N selection. Never reinterpret a script or fabricate footage. */
export function rankFilmOptions(options,concept={},limit=FILM_OPTION_COUNT){
 if(!Array.isArray(options))return [];
 const isSpecific=concept?.scenarioFit?.confidence==="high"&&
   typeof concept?.scenarioId==="string";
 const explicit=FILM_ARCHETYPES.includes(concept?.requestIntentArchetype)?
   concept.requestIntentArchetype:null;
 const allowTextCue=Boolean(explicit&&!confirmedFilmSignals(concept));
 const scored=options.map((option,index)=>{
   const fit=assessFilmPersonalizationFit(option,concept);
   // Confirmed answers and high-evidence scenario matching outrank generic cues.
   const intent=isSpecific&&option?.scenarioId===concept.scenarioId?34:0;
   const requestMatch=allowTextCue&&optionArchetype(option)===explicit;
   return {option,index,fit,intent,requestMatch,
     total:fit.score+intent+(requestMatch?14:0)};
 }).sort((a,b)=>b.total-a.total||a.index-b.index);
 const seen=new Set();
 return scored.filter(({option})=>{
  const id=String(option?.id||"");
  if(!id||seen.has(id))return false;
  seen.add(id);return true;
 }).slice(0,Math.max(0,Math.min(FILM_OPTION_COUNT,limit)))
  .map(({option,fit,intent,requestMatch})=>({
   ...option,matchFactors:[...new Set([
    ...(intent?["client_intent"]:[]),...fit.factors,
    ...(requestMatch?["request_archetype"]:[])])],
   personalizationRankVersion:FILM_PERSONALIZATION_RANK_VERSION
  }));
}
