/**
 * Evidence-led editorial ranking of the four existing, authored MyTube scenarios.
 * User text/audio/brief have independent weights. Music waveforms are NOT words.
 * This module is local and pure: no provider, private storage or media approval.
 */
export const VIDEO_SCENARIO_FIT_VERSION="hh-video-scenario-fit-v1";
const MAX_TEXT=1200;
const clean=value=>String(value??"").normalize("NFKD").replace(/\p{M}/gu,"")
  .toLowerCase().replace(/ё/g,"е").replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim().slice(0,MAX_TEXT);
const root=word=>word.length>6?word.slice(0,6):word.length>4?word.slice(0,5):word;
const OMIT=new Set("хочу хочешь хочу чтобы просто мне меня мой моя мое мои из для ради вместо нужно надо можно сегодня сейчас есть быть делать video film movie movie video ролик видео клип картинка сюжет сцену сделать создать давай please want would need with this that from your about more less hacer quiero quisiera para con una unos mismo misma mi mis sus mas menos algo cuyo esto estos esas tener hacer hola porfavor".split(" "));
const tokens=text=>new Set(clean(text).split(" ").filter(x=>x.length>=3&&!OMIT.has(x)).map(root));
const matches=(value,pattern)=>pattern.test(clean(value));
const CUES=Object.freeze([
 ["shelter",/(?:отдых|расслаб|устал|спокой|нежн|мягк|безопас|защит|укрыт|береж|пауза|тих|восстанов|нет сил|slow|gentle|safety|safe|rest|quiet|recover|relax|pause|comfort|support|calma|descans|segur|suave|tranquil|pausa|apoyo)/iu,"gentle_resource"],
 ["reframe",/(?:переосмысл|иначе|новый взгляд|по другому|стыд|вин|ошиб|самокрит|предубежд|неудач|сомнен|перестать считать|reframe|different perspective|look again|shame|mistake|guilt|self critic|reconsider|reinterpret|perspectiva|culpa|ver de otro modo|repensar)/iu,"new_perspective"],
 ["integration",/(?:примен|внедр|научиться|практическ|план|границ|говорить нет|сказать нет|навык|решен|следующ.{0,6}шаг|реальн.{0,7}действ|put into practice|take action|next step|boundary|say no|habit|practical|decision|apply|implement|practicar|paso concreto|limites|decir que no|accion)/iu,"practical_step"],
 ["journey",/(?:начать|новый этап|путь|достичь|идти вперед|мечт|цель|открыть|попробовать|первый шаг|начал|start|begin|journey|move forward|try|dream|reach a goal|new chapter|empezar|camino|nuevo comienzo|probar|meta)/iu,"movement"]
]);
const SPECIAL=Object.freeze([
 [/говорит.{0,12}нет|сказат.{0,12}нет|say no|decir que no|decline another|отказат|refuse|rechazar/iu,"integration","assert_boundary",32],
 [/попросит.{0,15}помощ|разделит.{0,14}нагруз|share the load|ask for help|pedir ayuda|compartir la carga/iu,"reframe","shared_support",28],
 [/не тороп|без спешк|медленно сближ|take it slow|without rushing|sin prisa|poco a poco/iu,"shelter","slow_choice",26],
 [/сомнева.{0,15}цен|признан|стоимост|price and value|pricing|valor y precio/iu,"shelter","value_without_shame",15],
 [/один.{0,10}конкретн.{0,8}шаг|маленьк.{0,8}действ|small experiment|one small test|un pequeno paso/iu,"integration","one_safe_step",24]
]);
// Short cross-language equivalences connect a stated wish to a real authored
// plot beat, not merely to its broad "journey/shelter" archetype.
const STORY_EQUIVALENCES=Object.freeze([
 [/sin prisa|poco a poco|take it slow|without rushing|без спешки|не тороп/iu,
  /despacio|prisa|slow|rush|ritmo|спешк|тороп|tempos?/iu,34,"requested_slow_pace"],
 [/share the load|ask for help|попросить помощи|разделить нагрузку|pedir ayuda/iu,
  /helper|help|shared|support|помощ|поддерж|ayuda|apoyo/iu,23,"requested_support"],
 [/boundary|say no|decir que no|говорить нет|границ/iu,
  /boundary|limits|declin|saying no|границ|отказ|лимит|l[ií]mites/iu,26,"requested_boundary"],
 [/price and value|valor y precio|цена и ценность/iu,
  /price|value|pricing|стоимост|цен|precio|valor/iu,24,"requested_value"],
 [/repair|apolog|rupture|восстановить доверие|помир|reparar/iu,
  /repair|rupture|thread|apolog|восстанов|мир|reparaci[oó]n|disculp/iu,25,"requested_repair"]
]);
const AVOID_TERMS={
 water:/(?:вод[аыуе]|мор[ея]|океан|рек[аеиуы]|water|sea|ocean|river|agua|mar|oceano)/iu,
 forest:/(?:лес|дерев|forest|woods|trees|bosque|arbol)/iu,
 mountain:/(?:гор[аыуе]|горн|вершин|mountain|peak|montana)/iu,
 dark:/(?:темнот|мрак|dark|night|oscuridad|noche)/iu,
 flashing:/(?:миган|мерц|вспыш|flash|flicker|strobe|destellos)/iu
};
/** A negated visual instruction must never count as positive story interest. */
const removeNegatedClauses=value=>clean(value).replace(
 /(?:^|\s)(?:без|никаких|не показывай|не нужно|исключи|without|avoid|exclude|sin|evitar|no quiero)\s+(?:(?:\S+\s+){0,2})(?:вод[а-я]*|мор[яе]|океан[а-я]*|лес[а-я]*|дерев[а-я]*|гор[ауы]|горн[а-я]*|water|sea|ocean|river|forest|woods|mountain|agua|mar|bosque|montana)/giu," "
);
const safeSources=({goal="",creativeBrief="",transcriptText="",phrases=""}={})=>
 [{id:"goal",weight:5,text:goal},{id:"creative_brief",weight:4,text:creativeBrief},
  {id:"voice",weight:3,text:transcriptText},{id:"phrases",weight:1,text:phrases}]
  .filter(x=>typeof x.text==="string"&&x.text.trim())
  .map(x=>({...x,text:removeNegatedClauses(x.text)})).filter(x=>x.text);
const toneFromConfirmed=profile=>{
 if(!profile||profile.source!=="confirmed_answers")return [];
 const ids=new Set([...(profile.desiredIds||[]),...(profile.focusIds||[])]
  .filter(id=>typeof id==="string"));
 const rows=[];
 if([...ids].some(id=>["safe","calm","rested","supported","balanced","comforted","connected"].includes(id)))
  rows.push(["shelter",7,"confirmed_gentle_goal"]);
 if([...ids].some(id=>["clarity","meaning","wholeness"].includes(id)))
  rows.push(["reframe",5,"confirmed_clarity_goal"]);
 if([...ids].some(id=>["agency","confident","energetic","freedom","growth"].includes(id)))
  rows.push(["integration",5,"confirmed_action_goal"]);
 if(Number.isFinite(profile.energyStart)&&profile.energyStart<=3)
  rows.push(["shelter",6,"confirmed_low_energy"]);
 return rows;
};
const patternFromText=(input)=>CUES.filter(([,re])=>matches(input,re))
 .map(([archetype,,reason])=>[archetype,16,reason]);
/**
 * Score authored alternatives without changing their texts or claiming footage.
 * @param {Array<{id:string,archetype:string,label:string,sceneOutline:string[]}>} scenarios
 */
export function rankVideoScenarioChoices(scenarios,{goal="",creativeBrief="",transcriptText="",
 phrases="",topicLabel="",purpose="reflection",personalization=null,avoidImagery=[]}={}){
 if(!Array.isArray(scenarios)||scenarios.length<1||scenarios.length>8)return [];
 const sources=safeSources({goal,creativeBrief,transcriptText,phrases});
 const topicTokens=tokens(topicLabel);
 const focusSources=sources.map(x=>({...x,words:[...tokens(x.text)].filter(w=>!topicTokens.has(w))}));
 const body=sources.map(x=>x.text).join(" ").slice(0,3600);
 const cues=[...patternFromText(body),...toneFromConfirmed(personalization)];
 for(const [pattern,archetype,reason,weight] of SPECIAL){
  if(matches(body,pattern))cues.push([archetype,weight,reason]);
 }
 if(purpose==="practice")cues.push(["shelter",23,"practice_pacing"]);
 if(purpose==="celebration")cues.push(["integration",26,"celebration_closing"]);
 if(purpose==="presentation")cues.push(["journey",26,"presentation_action"]);
 const avoid=Array.isArray(avoidImagery)?avoidImagery.filter(id=>Object.hasOwn(AVOID_TERMS,id)):[];
 const matchesById=scenarios.map((scenario,index)=>{
  const scenarioText=[scenario.label,...(scenario.sceneOutline||[])].join(" ");
  const scenarioWords=tokens(scenarioText);
  const labelWords=tokens(scenario.label||"");
  const factors=[];let score=0;
  for(const src of focusSources){
   const common=src.words.filter(w=>scenarioWords.has(w));
   const exact=src.words.filter(w=>labelWords.has(w));
   if(common.length){
    score+=Math.min(36,common.length*src.weight*2)+Math.min(15,exact.length*src.weight*3);
    factors.push("source_"+src.id);
   }
  }
  for(const [archetype,weight,reason] of cues){
   if(scenario.archetype===archetype){score+=weight;factors.push(reason);}
  }
  for(const [wish,story,weight,reason] of STORY_EQUIVALENCES){
   if(matches(body,wish)&&matches(scenarioText,story)){
    // A matching film title is more specific than a passing motif in one beat.
    score+=matches(scenario.label,story)?weight*2:weight;
    factors.push(reason);
   }
  }
  // Specific exclusions are hard editorial mismatches, but never imply that a
  // different camera source is safe. The renderer still checks every shot.
  const forbidden=avoid.filter(id=>AVOID_TERMS[id].test(clean(scenarioText)));
  if(forbidden.length){score-=90*forbidden.length;factors.push("avoided_story_imagery");}
  return {scenarioId:scenario.id,archetype:scenario.archetype,score,
   reasons:[...new Set(factors)],index,avoidMismatch:forbidden.length>0};
 }).sort((a,b)=>b.score-a.score||a.index-b.index);
 const gap=matchesById.length>1?matchesById[0].score-matchesById[1].score:0;
 const hasSpecificLexical=focusSources.some(x=>x.words.length>0)&&
  matchesById[0].reasons.some(x=>x.startsWith("source_"));
 const hasCue=matchesById[0].reasons.some(x=>
  !x.startsWith("source_")&&
  !x.startsWith("confirmed_")&&x!=="avoided_story_imagery");
 const hasSpecificStory=matchesById[0].reasons.some(x=>x.startsWith("requested_"));
 const confidence=matchesById[0].avoidMismatch?"low":
  hasSpecificStory&&matchesById[0].score>=45&&gap>=6?"high":
  hasSpecificLexical&&matchesById[0].score>=22&&gap>=8?"high":
  hasCue&&matchesById[0].score>=19&&gap>=9?"medium":"low";
 return matchesById.map((row,i)=>({...row,
  confidence:i===0?confidence:"alternative",
  gap:i===0?gap:null,
  sources:sources.map(x=>x.id)}));
}
export function selectVideoScenario(scenarios,signals={}){
 const ranked=rankVideoScenarioChoices(scenarios,signals);
 const first=ranked[0];
 return first?{scenario:scenarios.find(s=>s.id===first.scenarioId),
  confidence:first.confidence,score:first.score,gap:first.gap,
  reasons:first.reasons,sources:first.sources,alternatives:ranked.slice(1).map(x=>x.scenarioId)}:null;
}