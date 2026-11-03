/**
 * Axis-aware content discovery (v1): advisory relevance only.
 * Safe caller MUST own, version-verify and authorize the private test results;
 * opt-in is mandatory, and no profile data may go to URLs, analytics, CRM,
 * messengers, external AI or public SSR. Never used for clinical predictions.
 */
export const AXIS_MATCH_MODEL_VERSION='axis-offer-v1';
export const LIFE_AREAS=Object.freeze(['business','relationships','energy_health','personal_growth']);
export const CONTENT_KINDS=Object.freeze(['video','course','service','test']);
export const SCORE_WEIGHTS=Object.freeze({explicit:45,measured:25,selfGap:15,preference:10,availability:5});
const AREA_SET=new Set(LIFE_AREAS), KIND_SET=new Set(CONTENT_KINDS);
const FACET=/^[a-z][a-z0-9_]*::[a-z][a-z0-9_]*$/, TOKEN=/^[a-z][a-z0-9_]{0,48}$/;
const REF=new Set(['published_norm','source_band','within_person']);
const POLARITY=new Set(['higher_resource','higher_load']);
const BAND=new Set(['below','above','within']);
const EFFECT=new Set(['relieve','develop','reinforce','explore']);
// Sensitive relationship/intimacy themes need separate affirmative opt-in even
// when an editor forgot to mark the whole content record as sensitive.
const SENSITIVE_FACETS=new Set(['connection::intimacy','connection::sexual_wellbeing']);
const arr=x=>Array.isArray(x)?x:[];
const unique=x=>[...new Set(x)];
const tags=x=>unique(arr(x).filter(s=>typeof s==='string'&&TOKEN.test(s)));
const fields=(x,ks)=>ks.every(k=>typeof x?.[k]==='string'&&x[k].length>0);
const timestamp=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
const inRange=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&Number.isFinite(a)&&Number.isFinite(b)&&b>a&&v>=a&&v<=b;

/** Four public areas: old 'goal'/'meaning' are part of personal growth. */
export function normalizeLifeAreas(values){
 const aliases={money:'business',work:'business',love:'relationships',energy:'energy_health',
  health:'energy_health',wellbeing:'energy_health',goals:'personal_growth',
  meaning:'personal_growth',identity:'personal_growth'};
 return unique(arr(values).map(x=>aliases[x]||x).filter(x=>AREA_SET.has(x)));
}
const facetOK=(x,known)=>typeof x==='string'&&FACET.test(x)&&known.has(x);
const gapOK=(x,known)=>facetOK(x?.facetRef,known)&&inRange(x.current,x.min,x.max)&&inRange(x.desired,x.min,x.max);

/**
 * Interpret a caller-verified EXACT instrument dimension and its genuine
 * source-specific reference. Never split arbitrary scales at 50% and never
 * call a descriptive trait a weakness.
 */
export function interpretMeasuredSignal(s,{now=Date.now(),knownFacetRefs=[]}={}){
 const known=new Set(knownFacetRefs);
 if(!s||s.optedIn!==true||s.trusted!==true||!facetOK(s.facetRef,known)||
    !fields(s,['definitionKey','definitionVersion','dimensionKey','resultId','instrumentLocale'])||
    !inRange(s.value,s.min,s.max)||!REF.has(s.referenceKind)||
    !POLARITY.has(s.polarity)||!BAND.has(s.band)||
    !timestamp(s.measuredAt)||!timestamp(s.validUntil)||
    Date.parse(s.measuredAt)>now||Date.parse(s.validUntil)<now||
    Date.parse(s.validUntil)<Date.parse(s.measuredAt))return null;
 const attention=s.band===(s.polarity==='higher_resource'?'below':'above');
 const resource=s.band===(s.polarity==='higher_resource'?'above':'below');
 return {facetRef:s.facetRef,level:attention?'attention':resource?'resource':'within_reference',
  value:s.value,min:s.min,max:s.max,band:s.band,referenceKind:s.referenceKind,
  definitionKey:s.definitionKey,definitionVersion:s.definitionVersion,
  dimensionKey:s.dimensionKey,resultId:s.resultId,instrumentLocale:s.instrumentLocale,
  measuredAt:s.measuredAt};
}
function measuredMap(client,knownFacetRefs,now){
 if(client.allowMeasuredPersonalization!==true)return new Map();
 const map=new Map();
 for(const original of arr(client.measurements)){
  const s=interpretMeasuredSignal(original,{now,knownFacetRefs});
  if(!s)continue;
  map.set(s.facetRef,[...(map.get(s.facetRef)||[]),s]);
 }
 for(const [key,items] of map){
  const meaning=new Set(items.map(x=>x.level).filter(x=>x!=='within_reference'));
  if(meaning.size>1){map.delete(key);continue;}
  items.sort((a,b)=>Date.parse(b.measuredAt)-Date.parse(a.measuredAt)||
    a.definitionKey.localeCompare(b.definitionKey));
  map.set(key,items[0]);
 }
 return map;
}
function eligible(item,client,areas){
 if(!item||typeof item.id!=='string'||!item.id||!KIND_SET.has(item.kind)||
   item.published!==true||item.rightsCleared!==true||
   item.editorialReviewed!==true||item.safetyApproved!==true||
   item.claimsRisk==='high')return false;
 if(item.free!==true&&client.allowPaid!==true)return false;
 if(client.allowSensitiveContent!==true&&(item.sensitive===true||
   arr(item.targets).some(t=>SENSITIVE_FACETS.has(t?.facetRef))))return false;
 const lang=['en','ru','es'].includes(client.language)?client.language:'en';
 if(!arr(item.kind==='video'?item.audioLanguages:item.languages).includes(lang))return false;
 if(client.maxDurationMinutes!=null&&item.kind==='video'&&
    (!Number.isFinite(item.verifiedDurationMinutes)||
     item.verifiedDurationMinutes>client.maxDurationMinutes))return false;
 if(tags(item.safetyFlags).some(f=>tags(client.avoidSafetyFlags).includes(f)))return false;
 if(areas.length&&!normalizeLifeAreas(item.lifeAreas).some(x=>areas.includes(x)))return false;
 return true;
}
/**
 * rank = explicit(45) + compatible source indicator(25) + chosen self gap(15)
 *      + format preference(10) + free access(5).
 * The result is a SORTING score, not a medical norm or probability of benefit.
 * All knownFacetRefs must come from the EXISTING profile registry.
 */
export function rankOffersByClientAxes({client={},items=[],knownFacetRefs=[],now=Date.now(),limit=12}={}){
 const known=new Set(arr(knownFacetRefs).filter(x=>typeof x==='string'&&FACET.test(x)));
 const selected=unique(arr(client.selectedFacets).filter(x=>facetOK(x,known)));
 const topics=tags(client.selectedTopics),areas=normalizeLifeAreas(client.lifeAreas);
 const measurements=measuredMap(client,[...known],now);
 const gaps=new Map(arr(client.selfGoals).filter(x=>gapOK(x,known)).map(x=>[x.facetRef,x]));
 const rows=[],seen=new Set();
 for(const item of arr(items)){
  if(!eligible(item,client,areas)||seen.has(item.id))continue;
  seen.add(item.id);
  const targets=arr(item.targets).filter(t=>facetOK(t?.facetRef,known)&&
    EFFECT.has(t.effect)&&Number.isInteger(t.weight)&&t.weight>=1&&t.weight<=3);
  const targetRefs=new Set(targets.map(t=>t.facetRef));
  const chosen=selected.filter(x=>targetRefs.has(x));
  const matchedTopics=topics.filter(x=>tags(item.topics).includes(x));
  const matchedAreas=areas.filter(x=>normalizeLifeAreas(item.lifeAreas).includes(x));
  const explicit=selected.length?45*chosen.length/selected.length:
    topics.length?45*.65*matchedTopics.length/topics.length:
    areas.length?45*.25*matchedAreas.length/areas.length:0;
  const sources=targets.flatMap(target=>{
    const s=measurements.get(target.facetRef);
    if(!s)return [];
    const fits=s.level==='attention'&&['relieve','develop','explore'].includes(target.effect)||
      s.level==='resource'&&['reinforce','explore'].includes(target.effect);
    return fits?[{target,signal:s}]:[];
  });
  const measured=Math.min(25,sources.reduce((peak,x)=>Math.max(peak,
    x.signal.level==='attention'?15+x.target.weight*10/3:8+x.target.weight*7/3),0)+
    Math.max(0,sources.length-1)*2);
  const matchedGaps=[...targetRefs].flatMap(ref=>{
    const g=gaps.get(ref);
    if(!g)return [];
    const magnitude=Math.abs(g.desired-g.current)/(g.max-g.min);
    return magnitude>0?[{facetRef:ref,magnitude,current:g.current,desired:g.desired,
      min:g.min,max:g.max}]:[];
  });
  const selfGap=15*Math.min(1,matchedGaps.reduce((m,g)=>Math.max(m,g.magnitude),0));
  const preference=tags(client.formats).includes(item.kind)?10:0;
  const availability=item.free?5:0;
  const score=Math.max(0,Math.min(100,Math.round((explicit+measured+selfGap+
    preference+availability)*10)/10));
  if(!chosen.length&&!sources.length&&!matchedGaps.length&&
    !matchedTopics.length&&!matchedAreas.length)continue;
  const refs=unique([...chosen,...sources.map(x=>x.target.facetRef),
    ...matchedGaps.map(x=>x.facetRef)]);
  rows.push({id:item.id,kind:item.kind,item,score,
   rankClass:chosen.length&&sources.length?'goal_and_measured_axis':
      chosen.length?'goal_axis':sources.length?'measured_axis':
      matchedTopics.length?'topic':'life_area',
   scoring:{explicit:+explicit.toFixed(1),measured:+measured.toFixed(1),
     selfGap:+selfGap.toFixed(1),preference,availability},
   matchedAxes:refs.map(facetRef=>({facetRef,selected:chosen.includes(facetRef),
     measurement:measurements.get(facetRef)||null,
     selfGoal:matchedGaps.find(x=>x.facetRef===facetRef)||null,
     contentEffect:targets.find(t=>t.facetRef===facetRef)?.effect||null})),
   matchedTopics,matchedLifeAreas:matchedAreas,
   reasonType:sources.length?'source_axis_and_intent':chosen.length?'chosen_goal':
      matchedGaps.length?'chosen_gap':'topical_discovery'});
 }
 return rows.sort((a,b)=>b.score-a.score||Number(b.item.free)-Number(a.item.free)||
   a.id.localeCompare(b.id))
   .slice(0,Number.isInteger(limit)?Math.max(0,Math.min(30,limit)):12)
   .map((x,i)=>({...x,rank:i+1}));
}
