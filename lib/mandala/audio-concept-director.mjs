/**
 * Deterministic on-device editorial concept from a consented timed transcript
 * and a separately source-verified audio visual plan. Does not infer diagnoses,
 * invent speech, fetch media, authorize export or write to storage.
 */
import {classifyMyTubeRequest} from "./mytube-prompt-classifier.mjs";
import {getMyTubeTopic} from "./mytube-content-taxonomy.mjs";
import {requestedVisualSignals} from "./prompt-shot-director.mjs";
import {getMyTubeMotif,getMyTubeStyle} from "./mytube-creative-choices.mjs";

export const AUDIO_CONCEPT_DIRECTOR_VERSION="hh-audio-concept-v2";
const LOCALES=new Set(["ru","en","es"]);
const MOTIFS={
  forest:"forest",sun:"sun",morning:"sunrise",mountain:"mountain",
  water:"river",flowers:"flower",light:"lantern",path:"path",horizon:"horizon",
  gold:"sun",calm:"meadow",rest:"nest",confidence:"mountain",
  strength:"sun",trust:"hands",connection:"bridge",growth:"seed",
  clarity:"compass",freedom:"horizon"
};
const GENTLE=new Set(["calm","rest","trust","connection","flowers","water"]);
const ENERGETIC=new Set(["strength","confidence","sun","gold","growth","mountain"]);
const STYLE_WORDS=[
  ["sacred",/храм|ритуал|temple|ritual|sagrado|templo/iu],
  ["cosmic",/космос|зв[её]зд|cosmic|galaxy|stars|estrellas|c[oó]smic/iu],
  ["urban",/город|бизнес|офис|office|city|urban|negocio|ciudad|empresa/iu],
  ["meditative",/медитац|успоко|покой|relax|meditat|calm|meditaci[oó]n|tranquil/iu],
  ["realistic",/документал|репортаж|истори[юя]|documentary|interview|testimonial|entrevista/iu],
  ["cinematic",/кино|фильм|cinematic|cinema|pel[ií]cula/iu],
  ["symbolic",/символ|метафор|аллегори|symbol|metaphor|s[ií]mbolo|met[aá]fora/iu]
];
const copy={
 ru:{focus:"Смысл рассказа",first:"Вступление",middle:"Развитие",
  conclusion:"Завершение",unknown:"Определите основную тему вручную",
  topic:"Свободный рассказ"},
 en:{focus:"Message in the recording",first:"Opening",middle:"Development",
  conclusion:"Closing",unknown:"Choose a main topic manually",topic:"Original narration"},
 es:{focus:"Sentido del mensaje",first:"Inicio",middle:"Desarrollo",
  conclusion:"Cierre",unknown:"Elige un tema manualmente",topic:"Narración original"}
};
const clean=value=>String(value||"").replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim();

/**
 * @param {{transcript?:object,plan?:object,locale?:"ru"|"en"|"es"}} input
 * @returns {object|null}
 */
export function deriveAudioVideoConcept({transcript,plan,locale="ru"}={}){
  if(!transcript||!Array.isArray(transcript.segments))return null;
  const text=clean(transcript.text).slice(0,10000);
  if(!text)return null;
  const lang=LOCALES.has(locale)?locale:"ru";
  const t=copy[lang];
  const hasVideo=plan?.canExport===true&&Array.isArray(plan.shots)&&plan.shots.length>0;
  const shots=hasVideo?plan.shots:[];
  const excluded=new Set(Array.isArray(plan?.excludedMotifs)?plan.excludedMotifs:[]);
  if(/без\s+лес|without\s+(?:the\s+)?forest|sin\s+bosque/iu.test(text))excluded.add("forest");
  if(/без\s+(?:вод|мор|океан)|without\s+(?:the\s+)?(?:sea|ocean|water)|sin\s+(?:mar|agua|oc[eé]ano)/iu.test(text))excluded.add("water");
  const requestedMotifs=excluded;
  const lexical=[...new Set(transcript.segments.flatMap(segment=>
    requestedVisualSignals(clean(segment?.text||""),[...requestedMotifs])))];
  const allSignals=[...new Set([
    ...shots.flatMap(shot=>Array.isArray(shot.concepts)?shot.concepts:[]),
    ...lexical
  ].filter(id=>Object.hasOwn(MOTIFS,id)))];
  const verifiedSignals=[...new Set(shots.flatMap(shot=>
    Array.isArray(shot.matchedConcepts)?shot.matchedConcepts:[])
    .filter(id=>allSignals.includes(id)))];
  const allowable=signal=>
    !(requestedMotifs.has("water")&&signal==="water")&&
    !(requestedMotifs.has("forest")&&signal==="forest");
  const signals=allSignals.filter(allowable);
  const matches=verifiedSignals.filter(allowable);
  const priority=[...matches,...signals.filter(x=>!matches.includes(x))];
  const symbolId=priority.map(signal=>MOTIFS[signal]).find(id=>{
    if(requestedMotifs.has("forest")&&id==="forest")return false;
    if(requestedMotifs.has("water")&&id==="river")return false;
    return Boolean(getMyTubeMotif(id));
  })||null;
  const motif=symbolId?getMyTubeMotif(symbolId):null;

  const direct=STYLE_WORDS.find(([,re])=>re.test(text));
  const gentle=signals.filter(s=>GENTLE.has(s)).length;
  const energetic=signals.filter(s=>ENERGETIC.has(s)).length;
  const styleId=direct?.[0]||(gentle>energetic?"meditative":
    energetic>gentle?"cinematic":"symbolic");
  const style=getMyTubeStyle(styleId);
  const pace=gentle>energetic?"gentle":energetic>gentle?"dynamic":"steady";
  const mapped=classifyMyTubeRequest(text.slice(0,480),lang);
  // A keyword guess of low confidence may NOT be presented as a confirmed topic.
  const topic=mapped&&mapped.confidence!=="low"?getMyTubeTopic(mapped.topicId):null;
  const primarySentence=text.split(/(?<=[.!?。])\s+/u)[0]||text;
  const goal=Array.from(primarySentence).slice(0,140).join("");
  const stages=shots.map((shot,index)=>({
    index,sceneId:shot.sceneId,startSeconds:shot.startSeconds,
    endSeconds:shot.endSeconds,
    title:index===0?t.first:index===shots.length-1?t.conclusion:t.middle,
    spokenText:clean(shot.spokenText||"").slice(0,500),
    visualSignals:Array.isArray(shot.concepts)?shot.concepts.filter(allowable):[],
    needsReview:Boolean(shot.needsReview)
  }));
  return {
    version:AUDIO_CONCEPT_DIRECTOR_VERSION,
    source:hasVideo?"local_transcript_and_verified_storyboard":"local_transcript_only",
    locale:lang,goal:{text:goal,origin:"quoted_source_not_generated"},
    purpose:t.focus,
    category:topic?topic.category.label[lang]:t.topic,
    subcategory:topic?topic.subcategory.label[lang]:null,
    topic:topic?topic.topic.label[lang]:null,
    topicId:topic?.topic.id||null,
    confidence:topic?mapped.confidence:"unclassified",
    style:{id:style?.id||null,label:style?.label[lang]||null,
      origin:direct?"explicit_phrase":"keyword_heuristic",sourceVerified:false},
    symbol:motif?{id:motif.id,label:motif.label[lang],
      meaning:motif.meaning[lang],sourceVerified:false}:null,
    pace,aspect:"9:16",durationSeconds:hasVideo?plan.durationSeconds:transcript.durationSeconds,
    keywords:signals.map(id=>({id,seenInSelectedClips:matches.includes(id)})),
    stages,previewOnly:true,requiresReview:true,canExport:hasVideo,
    note:hasVideo?"Editorial suggestion only: source tags do not prove literal footage content.":
      "Concept extracted from transcript; no eligible real video footage verified yet."
  };
}
