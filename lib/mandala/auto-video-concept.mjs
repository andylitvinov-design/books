/**
 * Client-local, zero-provider concept suggestion for the existing Video Studio.
 * Editorial scenario and meaning choices are never evidence of licensed MP4.
 */
import {getMyTubeTaxonomy,listMyTubeScenarios,getMyTubeTopic} from "./mytube-content-taxonomy.mjs";
import {listMyTubeMeaningAxes,listMyTubeMeaningMotifs} from "./mytube-meaning-hierarchy.mjs";
import {listMyTubeStyles} from "./mytube-creative-choices.mjs";
import {enrichVideoConcept,synchronizeVideoConceptParameters} from "./video-concept-semantic.mjs";

const LANG=new Set(["ru","en","es"]);
const localeOf=locale=>LANG.has(locale)?locale:"ru";
const norm=value=>String(value||"").toLocaleLowerCase().normalize("NFKC").replace(/ё/g,"е").trim();
const hashInput=value=>{
  let h=2166136261;
  for(const ch of value){h=Math.imul(h^ch.charCodeAt(0),16777619);}
  return (h>>>0).toString(36);
};
const THEME_CATEGORY={
  money:"goals-money",goals:"goals-money",life:"goals-money",
  relationships:"love-relationships",love:"love-relationships",energy:"energy-confidence",health:"energy-confidence"
};
const DEFAULT_TOPIC={
  money:"money-psychology",goals:"goal-setting",life:"life-purpose",
  relationships:"emotional-intimacy",love:"emotional-intimacy",energy:"self-confidence",health:"body-awareness"
};
const CATEGORY_DEFAULT_TOPIC={
  "love-relationships":"emotional-intimacy",
  "goals-money":"goal-setting",
  "energy-confidence":"self-confidence",
  "stress-anxiety":"stress-relief"
};
const GENERIC_CATEGORY_GOAL=/^(?:love|love\s*(?:&|and)\s*relationships|любовь|любви|любовь\s+и\s+отношения|отношения|amor|amor\s+y\s+relaciones|relationships|energy|энергия|energia|money|деньги|dinero|stress|стресс|estres)$/u;
const STYLE_IDS=["nature","cinematic","symbolic","minimal","nature","cinematic"];
const MATCH_HINTS=[
  [/тревог|страх|паник|anxiet|fear|miedo|ansiedad/, "stress-anxiety"],
  [/отношен|любов|партнер|близост|relationship|love|amor|pareja/, "love-relationships"],
  [/деньг|финанс|бизнес|доход|money|income|business|dinero|negocio/, "goals-money"],
  [/уверенн|энерг|сила|устал|confidence|energy|vitalidad|confianza/, "energy-confidence"]
];
const MEANING_HINTS=[
  [/смысл|предназнач|meaning|purpose|sentido|propósito/,"meaning"],
  [/любов|близост|отношен|connection|love|relacion|amor/,"connection"],
  [/свобод|выбор|freedom|libertad/,"freedom"],
  [/достоин|принима|стыд|worth|accept|acept|dignidad/,"dignity"],
  [/развит|рост|growth|grow|desarrollo|crecer/,"growth"],
  [/уверенн|сила|действ|confidence|strength|fuerza|confianza/,"agency"],
  [/целост|integrat|integridad/,"wholeness"]
];
const WORDS=s=>new Set(norm(s).split(/[^\p{L}\p{N}]+/u).filter(w=>w.length>=4));
const scoreTopic=(topic,text)=>{
  const words=WORDS(text);
  let score=0;
  for(const lang of ["ru","en","es"]){
    for(const term of [topic.label[lang],...(topic.searchIntent[lang]||[])]){
      const phrase=norm(term);
      if(phrase.length>=4&&text.includes(phrase))score=Math.max(score,35+Math.min(phrase.length,35));
      let matched=0;
      for(const word of WORDS(phrase))if(words.has(word))matched++;
      // One shared word (e.g. "love") cannot prove a narrow story such as a breakup.
      if(matched>=2)score=Math.max(score,matched*9);
    }
  }
  return score;
};
const copy={
  ru:{default:"Пример: мягкое видео о внутренней опоре",message:"Встреча с собственной опорой",start:"Текущий запрос",target:"Желаемое состояние",arc:["Контакт","Опора","Движение","Интеграция"]},
  en:{default:"Example: a gentle video about inner support",message:"Finding inner support",start:"Current intention",target:"Desired state",arc:["Arrive","Support","Explore","Integrate"]},
  es:{default:"Ejemplo: vídeo suave sobre apoyo interior",message:"Encontrar apoyo interior",start:"Situación actual",target:"Estado deseado",arc:["Llegada","Apoyo","Movimiento","Integración"]}
};

/** @param {{locale?:string,goal?:string,theme?:string,phrases?:string[],styleIndex?:number,speechTranscript?:{text?:string,segments?:object[],durationSeconds?:number}|null,personalization?:{currentState?:string,desiredState?:string,focus?:string}|null}} input */
export function suggestVideoConcept({locale="ru",goal="",theme="energy",phrases=[],styleIndex=0,speechTranscript=null,personalization=null}={}){
  const l=localeOf(locale), safeGoal=String(goal||"").trim().slice(0,800);
  const phraseText=Array.isArray(phrases)?phrases.filter(x=>typeof x==="string").slice(0,6).join(" "):"";
  // The submitted goal outranks old/generated phrase suggestions.
  const search=norm(safeGoal||phraseText.slice(0,300));
  const categories=getMyTubeTaxonomy().categories;
  const hinted=MATCH_HINTS.find(([pattern])=>pattern.test(search))?.[1];
  const themeCategory=THEME_CATEGORY[theme]||"energy-confidence";
  const categoryId=hinted||themeCategory;
  const topics=categories.flatMap(c=>c.subcategories.flatMap(s=>s.topics.map(t=>({
    categoryId:c.id,subcategoryId:s.id,topic:t
  }))));
  const ranked=(GENERIC_CATEGORY_GOAL.test(search)?[]:
    topics.map(item=>({...item,score:scoreTopic(item.topic,search)})))
    .sort((a,b)=>b.score-a.score);
  const highest=ranked[0];
  const fallback=topics.find(item=>item.topic.id===DEFAULT_TOPIC[theme]&&item.categoryId===categoryId)||
    topics.find(item=>item.topic.id===CATEGORY_DEFAULT_TOPIC[categoryId])||
    topics.find(item=>item.categoryId===categoryId)||topics[0];
  const match=highest?.score>=9&&highest.categoryId===categoryId?highest:
    [...ranked].filter(item=>item.categoryId===categoryId)[0]?.score>=9?
    ranked.find(item=>item.categoryId===categoryId):fallback;
  const topicId=match.topic.id,category=categories.find(c=>c.id===match.categoryId);
  const subcategory=category.subcategories.find(s=>s.id===match.subcategoryId);
  const meaningId=MEANING_HINTS.find(([pattern])=>pattern.test(search))?.[1]||"anchor";
  const axes=listMyTubeMeaningAxes(topicId,l);
  const meaningAxisId=axes.some(a=>a.id===meaningId)?meaningId:"anchor";
  const motives=listMyTubeMeaningMotifs(topicId,meaningAxisId,l);
  const motifs=motives.filter(Boolean);
  const scenario=listMyTubeScenarios(topicId,l)[0];
  const styleId=STYLE_IDS[Math.max(0,Math.min(5,Number(styleIndex)||0))];
  const hasGoal=Boolean(safeGoal||phraseText.trim());
  const draft={
    schemaVersion:"hh-concept-auto-v2",
    signature:hashInput([safeGoal,phraseText,String(speechTranscript?.text||"").slice(0,10000),theme,styleId,l,JSON.stringify(personalization??null)].join("|")),
    source:hasGoal?"catalog_recommendation":"catalog_example",
    goal:safeGoal||copy[l].default,
    categoryId:category.id,subcategoryId:subcategory.id,topicId,
    meaningAxisId,motifId:motifs[0]?.id||"",scenarioId:scenario.id,
    styleId,
    mainMessage:hasGoal?scenario.label:copy[l].message,
    sceneOutline:[...scenario.sceneOutline],
    emotionalProgram:[...copy[l].arc],
    currentLabel:copy[l].start,desiredLabel:copy[l].target,
    mediaBindingStatus:"editorial_only_unverified",
    hasPersonalInput:hasGoal,
    inferredTopic:highest?.score>=9,
  };
  return enrichVideoConcept(draft,{locale:l,goal:safeGoal,phrases,speechTranscript,personalization});
}

export function reviseVideoConcept(current,patch,locale="ru"){
  const l=localeOf(locale),next={...current,...patch};
  const cats=getMyTubeTaxonomy().categories;
  const category=cats.find(c=>c.id===next.categoryId)||cats[0];
  const sub=category.subcategories.find(s=>s.id===next.subcategoryId)||category.subcategories[0];
  const topic=sub.topics.find(t=>t.id===next.topicId)||sub.topics[0];
  const axis=listMyTubeMeaningAxes(topic.id,l).find(x=>x.id===next.meaningAxisId)||
    listMyTubeMeaningAxes(topic.id,l)[0];
  const motives=listMyTubeMeaningMotifs(topic.id,axis.id,l).filter(Boolean);
  const motif=motives.find(m=>m.id===next.motifId)||motives[0];
  const scenarios=listMyTubeScenarios(topic.id,l);
  const scenario=scenarios.find(s=>s.id===next.scenarioId)||scenarios[0];
  const styles=listMyTubeStyles(l);
  const style=styles.find(s=>s.id===next.styleId)||styles[0];
  return synchronizeVideoConceptParameters({...next,categoryId:category.id,subcategoryId:sub.id,topicId:topic.id,
    meaningAxisId:axis.id,motifId:motif.id,scenarioId:scenario.id,styleId:style.id,
    sceneOutline:[...scenario.sceneOutline],mediaBindingStatus:"editorial_only_unverified"},Object.keys(patch));
}

export function videoConceptIsValid(concept){
  const x=getMyTubeTopic(concept?.topicId);
  if(!x||x.category.id!==concept.categoryId||x.subcategory.id!==concept.subcategoryId)return false;
  if(!listMyTubeMeaningAxes(concept.topicId).some(a=>a.id===concept.meaningAxisId))return false;
  if(!listMyTubeMeaningMotifs(concept.topicId,concept.meaningAxisId).some(m=>m.id===concept.motifId))return false;
  if(!listMyTubeScenarios(concept.topicId).some(s=>s.id===concept.scenarioId))return false;
  return listMyTubeStyles().some(s=>s.id===concept.styleId);
}
