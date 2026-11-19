/**
 * Personal video brief v1: combines the visitor's exact own words with the
 * canonical MyTube hierarchy. Ephemeral in this editor only; never transmitted
 * to a third-party AI, persisted in an account or treated as a diagnosis.
 *
 * The four emotional beats are editorial direction, not clinical claims.
 * The physical renderer must separately validate approved non-repeating MP4s.
 */
import {getMyTubeCategory,getMyTubeTopic} from "./mytube-content-taxonomy.mjs";

const LOCALES=["ru","en","es"];
const CLEAN=value=>typeof value==="string"?
 value.normalize("NFKC").replace(/[\u0000-\u001f\u007f<>]/g," ").trim().slice(0,240):"";
const CUE_WORDS=Object.freeze({
 forest:{ru:["лес","дерев"],en:["forest","tree"],es:["bosque","árbol","arbol"]},
 water:{ru:["вода","воды","море","океан","река","озеро"],en:["water","sea","ocean","river","lake"],es:["agua","mar","océano","rio","río"]},
 sunrise:{ru:["солнц","рассвет","восход"],en:["sun","sunrise","dawn"],es:["sol","amanecer"]},
 mountain:{ru:["гор","скал"],en:["mountain","hill"],es:["montaña","montana"]},
 flower:{ru:["цвет","сад"],en:["flower","garden"],es:["flor","jardín","jardin"]},
 path:{ru:["путь","дорог","троп","шаг"],en:["path","road","trail","step"],es:["camino","sendero","paso"]},
 light:{ru:["свет","сиян","луч"],en:["light","glow","sunbeam"],es:["luz","brillo","rayo"]},
 people:{ru:["люд","вместе","партн","объят"],en:["people","together","partner","hug"],es:["gente","juntos","pareja","abrazo"]}
});
const CATEGORY_ARCS={
 "stress-anxiety":{from:{ru:"напряжение",en:"tension",es:"tensión"},to:{ru:"спокойствие и опора",en:"calm and grounding",es:"calma y apoyo"},
  beats:[["quiet","mist","soft"],["shelter","rest","grounding"],["tree","support","light"],["calm","open","horizon"]]},
 "love-relationships":{from:{ru:"дистанция или неопределённость",en:"distance or uncertainty",es:"distancia o incertidumbre"},to:{ru:"контакт и доверие",en:"connection and trust",es:"conexión y confianza"},
  beats:[["quiet","people","soft"],["space","trust","warm"],["connection","together","light"],["peace","garden","open"]]},
 "energy-confidence":{from:{ru:"усталость или сомнение",en:"fatigue or uncertainty",es:"cansancio o duda"},to:{ru:"уверенность и энергия",en:"confidence and energy",es:"confianza y energía"},
  beats:[["rest","quiet","mist"],["support","steady","grounding"],["light","growth","energy"],["path","horizon","strength"]]},
 "goals-money":{from:{ru:"неопределённость",en:"uncertainty",es:"incertidumbre"},to:{ru:"ясность и следующий шаг",en:"clarity and next step",es:"claridad y siguiente paso"},
  beats:[["quiet","path","morning"],["focus","steady","support"],["light","growth","opportunity"],["horizon","path","progress"]]}
};

const PERSONAL_TARGETS=[
 {id:"calm",pattern:/тревож|тревог|стресс|спокой|успоко|anxi|stress|calm|tranquil|ansiedad|calma|estr[eé]s/iu,
   labels:{ru:"спокойствие",en:"calm",es:"calma"}},
 {id:"confidence",pattern:/уверен|смел|confiden|valent|autoconfianza|seguridad en mí/iu,
   labels:{ru:"уверенность",en:"confidence",es:"confianza"}},
 {id:"connection",pattern:/близост|любов|довер|отношен|connection|closeness|trust|relationship|cercan|confianza en pareja|amor/iu,
   labels:{ru:"близость и доверие",en:"closeness and trust",es:"cercanía y confianza"}},
 {id:"strength",pattern:/энерг|сил|бодр|motivaci|energy|vitality|fuerza/iu,
   labels:{ru:"энергия",en:"energy",es:"energía"}},
 {id:"clarity",pattern:/ясност|фокус|решител|определен|clarity|focus|direction|claridad|enfoque/iu,
   labels:{ru:"ясность",en:"clarity",es:"claridad"}}
];

const ROLE_LABELS={
 ru:["Встреча с состоянием","Мягкая опора","Переход к желаемому","Закрепление"],
 en:["Meet the present","Gentle support","Move toward the goal","Integration"],
 es:["Reconocer el estado","Apoyo suave","Avanzar al objetivo","Integración"]
};
const matchVisual=(text,hint)=>Object.values(hint).some(terms=>
  terms.some(term=>text.includes(term.toLowerCase())));
export function buildPersonalVideoBrief({
  clientWish="",categoryId="",subcategoryId="",topicId="",scenarioLabel="",
  plotLabel="",meaningLabel="",motifLabel="",locale="ru",excludedMotifs=[]
}={}){
 const lang=LOCALES.includes(locale)?locale:"ru";
 const request=CLEAN(clientWish);
 const category=getMyTubeCategory(categoryId);
 const found=topicId?getMyTubeTopic(topicId):null;
 const validTopic=found?.category.id===categoryId&&
   (!subcategoryId||found.subcategory.id===subcategoryId)?found:null;
 const sub=category?.subcategories.find(row=>row.id===subcategoryId)||
   validTopic?.subcategory||null;
 const arc=CATEGORY_ARCS[categoryId]||CATEGORY_ARCS["energy-confidence"];
 const lower=request.toLocaleLowerCase();
 const requestedEmotion=PERSONAL_TARGETS.find(row=>row.pattern.test(lower))||null;
 const targetEmotion=requestedEmotion?.labels[lang]||arc.to[lang];
 const excluded=new Set(Array.isArray(excludedMotifs)?excludedMotifs:[]);
 // Visual request is a preference, not a demand to fabricate unseen footage.
 const requestedVisualTags=Object.entries(CUE_WORDS)
   .filter(([id,cues])=>!excluded.has(id)&&
     !(excluded.has("forest")&&id==="forest")&&
     !(excluded.has("water")&&id==="water")&&matchVisual(lower,cues))
   .map(([id])=>id).slice(0,4);
 const stages=arc.beats.map((tags,index)=>{
   const visualTags=[...new Set([...tags,...(index===3&&requestedEmotion?[requestedEmotion.id]:[]),...requestedVisualTags])].slice(0,8);
   return {index:index+1,role:["orientation","support","development","integration"][index],
     title:ROLE_LABELS[lang][index],visualTags,
     // English visual tags are shared with the existing physical scene catalog.
     sceneQuery:visualTags.join(" "),
     emotionalDirection:index===0?arc.from[lang]:index===3?targetEmotion:
       index===1?ROLE_LABELS[lang][1]:ROLE_LABELS[lang][2]};
 });
 const hierarchy=[category?.label?.[lang],sub?.label?.[lang],
   validTopic?.topic.label?.[lang]].filter(Boolean);
 const notes=[CLEAN(meaningLabel),CLEAN(motifLabel),CLEAN(scenarioLabel),
   CLEAN(plotLabel)].filter(Boolean);
 const line=lang==="ru"?
   ["Пожелание клиента: "+(request||"не указано"),
    "Каталог: "+(hierarchy.join(" → ")||"не выбран"),
    "Дополнительные параметры: "+(notes.join(" · ")||"автоматически"),
    "Эмоциональный рельеф: "+arc.from[lang]+" → "+targetEmotion,
    ...stages.map(stage=>stage.index+". "+stage.title+": "+stage.sceneQuery),
    "Монтаж: проверенные неповторяющиеся MP4; без выдуманных кадров или обещаний лечения."]:
   lang==="es"?
   ["Deseo del cliente: "+(request||"no especificado"),"Catálogo: "+(hierarchy.join(" → ")||"sin elegir"),
    "Detalles: "+(notes.join(" · ")||"automático"),"Arco emocional: "+arc.from[lang]+" → "+arc.to[lang],
    ...stages.map(stage=>stage.index+". "+stage.title+": "+stage.sceneQuery),
    "Montaje: solo MP4 aprobados y únicos; sin promesas de tratamiento."]:
   ["Visitor's request: "+(request||"not provided"),"Catalog: "+(hierarchy.join(" → ")||"unselected"),
    "Details: "+(notes.join(" · ")||"automatic"),"Emotional arc: "+arc.from[lang]+" → "+arc.to[lang],
    ...stages.map(stage=>stage.index+". "+stage.title+": "+stage.sceneQuery),
    "Edit: approved unique MP4s only; no clinical claims or fabricated footage."];
 return {version:"hh-personal-video-brief-v1",clientWish:request,
   categoryId:category?.id||null,subcategoryId:sub?.id||null,
   topicId:validTopic?.topic.id||null,
   hierarchy,fromEmotion:arc.from[lang],toEmotion:targetEmotion,
   stages,visualTags:requestedVisualTags,prompt:line.join("\n"),
   localOnly:true,requiresLicensedMedia:true};
}
