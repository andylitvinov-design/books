/**
 * Speech/text -> canonical Video Studio creative brief.
 * Local, deterministic and zero-provider. Raw transcript is never stored or sent
 * to a second service. Suggestions are editorial, not evidence of existing MP4.
 */
import {classifyMyTubeRequest} from "./mytube-prompt-classifier.mjs";
import {getMyTubeTopic,listMyTubeScenarios} from "./mytube-content-taxonomy.mjs";
import {listMyTubeMeaningMotifs} from "./mytube-meaning-hierarchy.mjs";
import {getMyTubeStyle} from "./mytube-creative-choices.mjs";

export const VIDEO_CONCEPT_FIELD_LABELS=Object.freeze([
 ["intent","Цель","Goal","Objetivo"],
 ["purpose","Назначение","Purpose","Finalidad"],
 ["audience","Для кого","Audience","Destinatario"],
 ["categoryId","Категория","Category","Categoría"],
 ["subcategoryId","Подкатегория","Subcategory","Subcategoría"],
 ["topicId","Тема","Topic","Tema"],
 ["situation","Контекст","Context","Contexto"],
 ["currentState","Сейчас","Current state","Estado actual"],
 ["desiredState","Хочу","Desired state","Estado deseado"],
 ["meaningAxisId","Смысл","Meaning","Sentido"],
 ["mainMessage","Главная идея","Main message","Idea central"],
 ["motifId","Символ","Symbol","Símbolo"],
 ["scenarioId","Сценарий","Scenario","Guion"],
 ["plotMode","Тип сюжета","Plot mode","Tipo de trama"],
 ["archetype","Архетип","Archetype","Arquetipo"],
 ["beats","Четыре эпизода","Four beats","Cuatro episodios"],
 ["hook","Начало","Opening","Inicio"],
 ["centralAction","Ключевое событие","Central action","Acción central"],
 ["endingIntent","Итог","Ending","Final"],
 ["transitionPath","Эмоциональный переход","Emotional transition","Transición emocional"],
 ["startingTone","Начальное настроение","Opening tone","Tono inicial"],
 ["endingTone","Финальное настроение","Ending tone","Tono final"],
 ["intensity","Интенсивность","Intensity","Intensidad"],
 ["pace","Темп","Pace","Ritmo"],
 ["emotionalProgram","Эмоциональная программа","Emotional arc","Programa emocional"],
 ["method","Метод","Method","Método"],
 ["voiceTone","Тон голоса","Voice tone","Tono de voz"],
 ["styleId","Визуальный стиль","Visual style","Estilo visual"],
 ["visualWorld","Пространство и свет","Visual world","Espacio y luz"],
 ["characterAndPOV","Герой и ракурс","Character and POV","Personaje y punto de vista"],
 ["visualActions","Визуальные действия","Visual actions","Acciones visuales"],
 ["avoidImagery","Не показывать","Avoid imagery","Evitar imágenes"],
 ["references","Материалы","References","Referencias"],
 ["delivery","Формат, язык, длительность","Delivery","Formato, idioma y duración"],
 ["wordsAndVoice","Текст и голос","Words and voice","Texto y voz"],
 ["soundtrack","Музыка","Soundtrack","Música"],
 ["timelineBinding","Монтажный план","Timeline","Montaje"],
 ["creationMode","Режим создания","Creation mode","Modo de creación"],
].map(([id,ru,en,es])=>Object.freeze({id,ru,en,es})));
const LANG=new Set(["ru","en","es"]);
const localeOf=x=>LANG.has(x)?x:"ru";
const clean=(v,max=180)=>String(v??"").normalize("NFKC")
 .replace(/[\u0000-\u001f\u007f<>]/gu," ").replace(/\s+/gu," ").trim().slice(0,max);
const lower=v=>clean(v,10000).toLocaleLowerCase().replace(/ё/g,"е");
const safeSegments=wire=>Array.isArray(wire?.segments)?wire.segments.filter(s=>
 s&&typeof s.text==="string"&&Number.isFinite(s.startSeconds)&&
 Number.isFinite(s.endSeconds)&&s.endSeconds>s.startSeconds).slice(0,240):[];
const NEGATIVE=[
 ["water",/(?:без|не показывай|исключи|without|avoid|no|sin|evita)\s+(?:\S+\s+){0,2}(?:вод[ыуеы]|мор[ея]|океан|водопад|water|sea|ocean|river|agua|mar|oc[eé]ano)/iu],
 ["forest",/(?:без|не показывай|исключи|without|avoid|no|sin|evita)\s+(?:\S+\s+){0,2}(?:лес[а-я]*|forest|woods|bosque)/iu],
 ["mountain",/(?:без|не показывай|исключи|without|avoid|no|sin|evita)\s+(?:\S+\s+){0,2}(?:гор[уыае]|вершин|mountain|monta[nñ]a)/iu],
 ["dark",/(?:без|не показывай|исключи|without|avoid|no|sin|evita)\s+(?:\S+\s+){0,2}(?:темнот|мрак|dark|darkness|oscuridad)/iu],
 ["flashing",/(?:без|никаких|не показывай|не надо|не нужно|исключи|without|avoid|no|sin|evita)\s+(?:\S+\s+){0,2}(?:миган|мерцани|вспыш|flashing|flicker|destellos|parpadeo)/iu],
];
const PURPOSES=[
 ["celebration",/поздрав|с днем рожд|день рожд|юбиле|праздник|birthday|congratulat|anniversary|felicita|cumplea[nñ]os|celebrat/iu],
 ["presentation",/презентац|продукт|услуг|клиент|бизнес.план|объясн|presentation|showcase|pitch|product|service|presentaci[oó]n|producto|servicio/iu],
 ["practice",/медитац|расслаблен|практик|релакс|meditat|relax|mindful|meditaci[oó]n|relajaci[oó]n/iu],
 ["personal_support",/мне|я хочу|для себя|i want|for myself|quiero|para m[ií]/iu]
];
const AUDIENCES=[
 ["family",/мам[аеуы]|пап[аеуы]|родител|семь|сестре|брат[уа]|mother|mom|mum|father|dad|family|madre|padre|familia/iu],
 ["partner",/любим|жене|мужу|партнер|партнёр|boyfriend|girlfriend|partner|spouse|pareja|espos[ao]/iu],
 ["client",/клиент|заказчик|покупател|customer|client|audience|cliente/iu],
 ["public",/подписчик|зрител|всем|широкая аудитория|viewer|subscribers|public|espectadores|p[uú]blico/iu]
];
const MEANINGS=[
 ["connection",/любов|семь|близост|поблагодар|благодарност|забот|помощ|вместе|love|family|gratitude|thank|care|together|amor|familia|gracias|cari[nñ]o/iu],
 ["anchor",/спокойств|опор|безопасн|стабильност|устойчив|calm|support|safe|stable|seren|segurid|apoyo/iu],
 ["freedom",/свобод|освобод|выбор|freedom|choice|libertad|elecci[oó]n/iu],
 ["agency",/действ|сил[ау]|достиж|решени|уверен|action|power|strength|confidence|decision|acci[oó]n|fuerza|decisi[oó]n/iu],
 ["dignity",/уважен|принят|достоин|ценност|respect|accept|worth|dignity|respeto|acept|dignidad/iu],
 ["wholeness",/целост|единств|воссоедин|whole|integrat|unity|integridad|unidad/iu],
 ["meaning",/смысл|предназнач|призвани|purpose|meaning|prop[oó]sito|sentido/iu],
 ["growth",/развит|рост|новый этап|growth|progress|develop|crecer|desarroll|progres/iu]
];
const STYLES=[
 ["sacred",/храм|ритуал|священ|temple|ritual|sacred|templo|sagrado/iu],
 ["cosmic",/космос|звезд|вселенн|cosmos|space|galaxy|stars|cosmic|galaxia|estrellas/iu],
 ["urban",/город|офис|урбан|city|urban|office|ciudad|urbano|oficina/iu],
 ["cinematic",/кинематограф|эпич|как фильм|cinematic|movie style|film look|cinematogr[aá]fic/iu],
 ["meditative",/медитац|мягк|плавн|тихий|спокойн|meditat|gentle|slow|relax|calm|tranquil|meditaci[oó]n|suave|seren/iu],
 ["symbolic",/символ|метафор|аллегор|symbolic|metaphor|s[ií]mbolo|met[aá]fora/iu],
 ["minimal",/минимал|лаконич|minimal|simple|clean|sencill/iu],
 ["realistic",/реалист|документ|обычн|realistic|documentary|realista|documental/iu],
 ["nature",/лес|сад|дерев|природ|луга|forest|garden|nature|flowers|bosque|jard[ií]n|naturaleza/iu],
 ["abstract",/абстракт|геометр|abstract|geometry|abstracto|geometr[ií]a/iu]
];
const MOTIFS=[
 ["garden",/сад|garden|jard[ií]n/iu],
 ["rose",/роза|rose|rosa/iu],
 ["flower",/цветок|цветы|flower|flor/iu],
 ["house",/дом|home|house|casa/iu],
 ["nest",/гнезд|nest|nido/iu],
 ["bridge",/мост|bridge|puente/iu],
 ["tree",/дерев|tree|[aá]rbol/iu],
 ["sun",/солнц|sun\b|sol\b/iu],
 ["sunrise",/рассвет|sunrise|amanecer/iu],
 ["key",/ключ|key|llave/iu],
 ["path",/тропа|путь|path|trail|sendero/iu],
 ["mountain",/гор[ауеы]|mountain|monta[nñ]a/iu],
 ["stream",/руч[её]й|river|stream|arroyo|r[ií]o/iu],
 ["stars",/звезд|stars|estrellas/iu],
 ["hands",/ладон|руки|hands|manos/iu],
 ["horizon",/горизонт|horizon|horizonte/iu]
];
const hasPositive=(rx,text)=>rx.test(text);
// Negation scopes include coordinated objects, e.g. "без леса и воды".
const NEGATED_TERMS={
 water:/вод|мор[яеу]|океан|water|sea\b|ocean|river|agua|mar\b|oc[eé]ano/iu,
 forest:/лес|forest|woods|bosque/iu,
 mountain:/гор[а-я]*|вершин|mountain|monta[nñ]a/iu,
 dark:/темнот|мрак|dark|oscur|night/iu,
 flashing:/миган|мерц|вспыш|flashing|flicker|destellos|parpadeo/iu,
};
const excluded=raw=>{
 const scopes=[...raw.matchAll(/(?:без|никаких|не показывай|не надо|не нужно|исключи|without|avoid|no|sin|evita)\s+([^.,;!?]{1,110})/giu)]
  .map(m=>m[1].split(/\s+(?:но|вместо|instead|but|pero)\s+/iu)[0]);
 return NEGATIVE.filter(([id,rx])=>rx.test(raw)||scopes.some(x=>NEGATED_TERMS[id]?.test(x)))
  .map(([id])=>id);
};
const omitted=(id,avoid)=>avoid.includes(id)||id==="stream"&&avoid.includes("water")||
 id==="mountain"&&avoid.includes("mountain");
function extractSpeechBeats(wire,raw){
 const seg=safeSegments(wire),duration=Number(wire?.durationSeconds);
 if(seg.length>=4&&Number.isFinite(duration)&&duration>0){
  const parts=Array.from({length:4},()=>[]);
  for(const item of seg){
   const midpoint=(item.startSeconds+item.endSeconds)/2;
   const bucket=Math.min(3,Math.floor(4*midpoint/duration));
   parts[bucket].push(clean(item.text,200));
  }
  if(parts.every(x=>x.length))return parts.map(x=>clean(x.join(" "),158));
 }
 const sentences=raw.split(/(?<=[.!?。])\s+/u).map(x=>clean(x,240)).filter(x=>x.length>8);
 if(sentences.length>=4){
  const parts=Array.from({length:4},()=>[]);
  sentences.forEach((s,i)=>parts[Math.min(3,Math.floor(i*4/sentences.length))].push(s));
  if(parts.every(x=>x.length))return parts.map(x=>clean(x.join(" "),158));
 }
 const words=raw.split(/\s+/u).filter(Boolean);
 if(words.length>=24){
  return Array.from({length:4},(_,i)=>
   clean(words.slice(Math.floor(i*words.length/4),Math.floor((i+1)*words.length/4)).join(" "),158));
 }
 return null;
}
const matched=(text,rows)=>rows.find(([,rx])=>hasPositive(rx,text))?.[0]||null;
const firstSentence=raw=>clean(raw.split(/[.!?。](?:\s|$)/u)[0]||raw,170);
const currentDesired=(raw,kind)=>{
 const rx=kind==="current"?/(?:сейчас|пока|сегодня|currently|now|ahora)\s*[:\-–]?\s*([^.!?]{6,130})/iu:
  /(?:хочу|мечтаю|пожелаю|желаю|i want|i hope|quisiera|quiero|deseo)\s+([^.!?]{6,130})/iu;
 return clean(raw.match(rx)?.[1],125)||null;
};
function pickTopic(raw,original,purpose,locale){
 const forced=purpose==="celebration"?"family-relationships":
  purpose==="presentation"?"entrepreneurship":null;
 // A direct presentation / greeting is not a diagnosis. Prefer the
 // established content taxonomy only where a category really fits.
 if(forced&&getMyTubeTopic(forced))return {id:forced,confidence:"medium",reason:"content_purpose"};
 const prediction=classifyMyTubeRequest(raw,locale);
 return prediction&&prediction.confidence!=="low"&&getMyTubeTopic(prediction.topicId)?
  {id:prediction.topicId,confidence:prediction.confidence,reason:"taxonomy_classifier"}:
  {id:original.topicId,confidence:"low",reason:"editorial_fallback"};
}
const status=(value,source)=>value==null||value===""?"unknown":
 source==="owner"?"synchronized":
 source==="speech"?"extracted":"suggested";
function fieldMap(){
 return Object.fromEntries(VIDEO_CONCEPT_FIELD_LABELS.map(row=>[
  row.id,{value:null,status:"unknown",source:"unavailable"}
 ]));
}
const put=(record,id,value,source="editorial")=>{
 record[id]={value:value??null,status:status(value,source),source};
};
/**
 * @param {object} draft Existing, valid canonical concept proposal.
 * @param {{locale?:string,goal?:string,phrases?:string[],speechTranscript?:object|null,theme?:string}} input
 */
export function enrichVideoConcept(draft,{locale="ru",goal="",phrases=[],speechTranscript=null}={}){
 const l=localeOf(locale),audio=clean(speechTranscript?.text,10000);
 const plainGoal=clean(goal,800);
 const phraseText=Array.isArray(phrases)?phrases.filter(x=>typeof x==="string")
  .slice(0,6).map(x=>clean(x,180)).join(" "):"";
 const raw=audio||clean(plainGoal+" "+phraseText,2200),low=lower(raw);
 if(!raw)return {...draft,parameters:fieldMap(),semanticConfidence:"low",
   semanticPurpose:null,semanticAudience:null,avoidImagery:[],speechBeatsSource:"none"};
 const purpose=matched(low,PURPOSES)||(audio?"audio_visual":"personal_support");
 const audience=matched(low,AUDIENCES)||(purpose==="personal_support"?"self":null);
 const topicChoice=pickTopic(raw,draft,purpose,l),topic=getMyTubeTopic(topicChoice.id);
 const meaningId=matched(low,MEANINGS)||(
  purpose==="celebration"?"connection":purpose==="presentation"?"agency":draft.meaningAxisId);
 const axes=new Set(["anchor","connection","freedom","agency","dignity","wholeness","meaning","growth"]);
 const chosenMeaning=axes.has(meaningId)?meaningId:"anchor";
 const avoid=excluded(low);
 const validMotifs=listMyTubeMeaningMotifs(topicChoice.id,chosenMeaning,l)
  .filter(m=>!omitted(m.id,avoid));
 const explicit=matched(low,MOTIFS);
 const motif=validMotifs.find(m=>m.id===explicit)||validMotifs[0]||
  listMyTubeMeaningMotifs(topicChoice.id,chosenMeaning,l)[0];
 let preferredStyle=matched(low,STYLES);
 // Do not interpret a negative visual instruction as a positive style request.
 if(preferredStyle==="nature"&&avoid.includes("forest")&&
   !/природ|сад|дерев|луг|nature|garden|jard[ií]n|naturaleza/iu.test(low))
   preferredStyle=null;
 const styleId=preferredStyle&&getMyTubeStyle(preferredStyle)?
  preferredStyle:draft.styleId;
 const scenarios=listMyTubeScenarios(topicChoice.id,l);
 const targetArchetype=purpose==="celebration"?"integration":
  purpose==="practice"?"shelter":purpose==="presentation"?"journey":null;
 const scenario=scenarios.find(s=>s.archetype===targetArchetype)||scenarios[0];
 const realBeats=audio?extractSpeechBeats(speechTranscript,audio):null;
 const sceneOutline=realBeats||scenario.sceneOutline;
 const message=firstSentence(audio||plainGoal||raw);
 const emotionalProgram=purpose==="celebration"?
  ({ru:["Тёплое обращение","Благодарность","Радость встречи","Доброе пожелание"],
    en:["Warm opening","Gratitude","Shared joy","Kind wish"],
    es:["Apertura cálida","Gratitud","Alegría compartida","Buenos deseos"]})[l]:
  purpose==="presentation"?
  ({ru:["Интерес","Контекст","Ценность","Ясный вывод"],
    en:["Interest","Context","Value","Clear ending"],
    es:["Interés","Contexto","Valor","Cierre claro"]})[l]:
  draft.emotionalProgram;
 const result={...draft,
  source:audio?"audio_transcript":draft.source,
  goal:clean(plainGoal||message,240)||draft.goal,
  categoryId:topic.category.id,subcategoryId:topic.subcategory.id,topicId:topic.topic.id,
  meaningAxisId:chosenMeaning,motifId:motif?.id||draft.motifId,
  scenarioId:scenario.id,styleId,mainMessage:message||draft.mainMessage,
  sceneOutline:[...sceneOutline],emotionalProgram:[...emotionalProgram],
  hasPersonalInput:Boolean(audio||plainGoal||phraseText),
  inferredTopic:topicChoice.reason!=="editorial_fallback",
  semanticConfidence:topicChoice.confidence,
  semanticPurpose:purpose,semanticAudience:audience,
  avoidImagery:avoid,speechBeatsSource:realBeats?"transcript":"editorial_scenario",
 };
 // The draft signature is still tied to the user's input. No raw transcript
 // leaves ephemeral client state, nor is it written into a settings draft.
 const p=fieldMap();
 put(p,"intent",result.goal,audio?"speech":"editorial");
 put(p,"purpose",purpose,"editorial");
 put(p,"audience",audience,matched(low,AUDIENCES)?"speech":"editorial");
 put(p,"categoryId",result.categoryId,"editorial");
 put(p,"subcategoryId",result.subcategoryId,"editorial");
 put(p,"topicId",result.topicId,"editorial");
 put(p,"situation",audio?firstSentence(audio):null,audio?"speech":"editorial");
 put(p,"currentState",currentDesired(raw,"current"),"speech");
 put(p,"desiredState",currentDesired(raw,"desired"),"speech");
 put(p,"meaningAxisId",result.meaningAxisId,"editorial");
 put(p,"mainMessage",result.mainMessage,audio?"speech":"editorial");
 put(p,"motifId",result.motifId,"editorial");
 put(p,"scenarioId",result.scenarioId,"editorial");
 put(p,"plotMode",purpose==="celebration"?"relational_mirror":
  purpose==="presentation"?"grounded_dilemma":"symbolic_quest","editorial");
 put(p,"archetype",scenario.archetype,"editorial");
 put(p,"beats",result.sceneOutline,audio&&realBeats?"speech":"editorial");
 put(p,"hook",result.sceneOutline[0],"editorial");
 put(p,"centralAction",result.sceneOutline[2],"editorial");
 put(p,"endingIntent",result.sceneOutline[3],"editorial");
 put(p,"transitionPath",purpose==="practice"?"gentle":purpose==="celebration"?"warmth":"steady","editorial");
 put(p,"startingTone",emotionalProgram[0],"editorial");
 put(p,"endingTone",emotionalProgram[3],"editorial");
 put(p,"intensity",purpose==="practice"?"gentle":"balanced","editorial");
 put(p,"pace",purpose==="practice"?"gentle":"steady","editorial");
 put(p,"emotionalProgram",result.emotionalProgram,"editorial");
 put(p,"method",/(?:медитац|meditat|meditaci[oó]n)/iu.test(low)?"meditation":
  /(?:рейки|reiki)/iu.test(low)?"reiki":
  /(?:гипноз|hypnos|hipnosis)/iu.test(low)?"hypnosis":null,"speech");
 put(p,"voiceTone",purpose==="celebration"?"warm":
  purpose==="presentation"?"clear":"gentle","editorial");
 put(p,"styleId",result.styleId,"editorial");
 put(p,"visualWorld",getMyTubeStyle(result.styleId)?.description?.[l]||null,"editorial");
 put(p,"characterAndPOV",audience||null,audience?"speech":"editorial");
 put(p,"visualActions",result.sceneOutline,"editorial");
 put(p,"avoidImagery",avoid.length?avoid:null,"speech");
 // References, editor settings and real media have independent owners. Do
 // not fabricate settings/attachments/exports from the spoken transcript.
 for(const key of ["references","delivery","wordsAndVoice","soundtrack","timelineBinding","creationMode"]){
  p[key]={value:null,status:"synchronized",source:{
   references:"attachments",delivery:"settings",wordsAndVoice:"ideas_voice",
   soundtrack:"audio",timelineBinding:"editor",creationMode:"render_policy"}[key]};
 }
 return {...result,parameters:p};
}
/** Preserve manual cascade changes in the 38-field review without
 * guessing new audio or modifying the renderer's authoritative settings.
 */
export function synchronizeVideoConceptParameters(concept,changed=[]){
 if(!concept?.parameters)return concept;
 const p={...concept.parameters};
 const patch=(id,value)=>{p[id]={value:value??null,status:"manual",source:"editor"};};
 const canonical=["categoryId","subcategoryId","topicId","meaningAxisId","motifId","scenarioId",
   "styleId","mainMessage"];
 for(const key of canonical){
  if(p[key]?.value!==concept[key]){
   p[key]={value:concept[key]??null,status:changed.includes(key)?"manual":"suggested",
     source:changed.includes(key)?"editor":"editorial"};
  }else if(changed.includes(key))patch(key,concept[key]);
 }
 if(changed.some(k=>["categoryId","subcategoryId","topicId","scenarioId"].includes(k))){
  patch("beats",concept.sceneOutline);
  const scenario=listMyTubeScenarios(concept.topicId)
    .find(s=>s.id===concept.scenarioId);
  patch("archetype",scenario?.archetype||null);
  patch("hook",concept.sceneOutline[0]);
  patch("centralAction",concept.sceneOutline[2]);
  patch("endingIntent",concept.sceneOutline[3]);
 }
 return {...concept,parameters:p};
}
