import {getMyTubePreparedMeditationPair} from "./mytube-meditation-text-pairs.mjs";
import {buildPersonalMeditationScript,isMeditationSafetyResponse} from "./personal-meditation-script.mjs";

// First-party, local-only short drafts. A visit never calls a model, creates audio,
// stores a private request, or spends video credits.
const copy={
 en:{
  titles:["Calm & Inner Balance","Renewal & New Energy"],
  topics:{energy:"restoring your energy",money:"calm confidence with money",relationships:"kinder connections",goals:"your next meaningful step",life:"what gives life meaning",health:"gentle everyday wellbeing"},
  recall:"Gently remember what matters to you:",
  openA:["Take a slow breath and feel the ground supporting you.","Allow your breathing to settle, and notice the support beneath your feet.","Welcome one quiet breath; there is nothing you need to prove right now."],
  middleA:"Let your shoulders soften. Imagine a warm, gentle light near your heart. You do not have to solve everything today.",
  endA:"Make space for calm and balance. Breathe out slowly, and carry this quiet steadiness into your next small step.",
  openB:["Notice the next breath and picture the soft light of a new morning.","Imagine the first sunlight of a fresh day, arriving without hurry.","Let the air around you feel a little clearer with each easy breath."],
  middleB:"With each exhale, release a little of what feels heavy. Rest for a moment; new possibilities do not need to be forced.",
  endB:"Feel a little more space, curiosity, and strength returning. Let your next step be small, kind, and your own."
 },
 ru:{
  titles:["Спокойствие и равновесие","Обновление и новая энергия"],
  topics:{energy:"восстановление энергии",money:"спокойствие в денежных вопросах",relationships:"теплоту в отношениях",goals:"следующий важный шаг",life:"ощущение смысла",health:"бережное отношение к себе"},
  recall:"Мягко вспомните то, что сейчас важно:",
  openA:["Сделайте спокойный вдох и почувствуйте опору под собой.","Позвольте дыханию замедлиться и ощутите поддержку под ногами.","Сделайте один тихий вдох. Вам не нужно ничего доказывать прямо сейчас."],
  middleA:"Расслабьте плечи. Представьте мягкий тёплый свет рядом с сердцем. Сейчас не требуется решать всё сразу.",
  endA:"Оставьте немного места для спокойствия и равновесия. Медленно выдохните и возьмите с собой это ощущение устойчивости.",
  openB:["Заметьте следующий вдох и представьте мягкий свет нового утра.","Представьте первые лучи солнца, которые появляются без спешки.","Пусть с каждым спокойным вдохом вокруг становится немного светлее."],
  middleB:"С выдохом отпустите часть тяжести. Можно немного отдохнуть. Новые возможности не нужно торопить.",
  endB:"Почувствуйте, как возвращаются интерес, пространство и силы. Пусть следующий шаг будет небольшим и бережным."
 },
 es:{
  titles:["Calma y equilibrio interior","Renovación y nueva energía"],
  topics:{energy:"recuperar tu energía",money:"afrontar el dinero con calma",relationships:"cuidar tus vínculos",goals:"tu próximo paso importante",life:"encontrar sentido",health:"cuidar tu bienestar cotidiano"},
  recall:"Recuerda con amabilidad lo que hoy importa:",
  openA:["Respira despacio y siente el apoyo del suelo bajo tus pies.","Deja que tu respiración se calme y nota el apoyo que tienes ahora.","Recibe una respiración tranquila. No necesitas demostrar nada en este momento."],
  middleA:"Suelta los hombros. Imagina una luz cálida y suave cerca del corazón. No hace falta resolverlo todo hoy.",
  endA:"Deja un poco de espacio para la calma y el equilibrio. Exhala suavemente y lleva esta estabilidad a tu siguiente paso.",
  openB:["Observa tu respiración e imagina la luz suave de una nueva mañana.","Imagina los primeros rayos del sol, sin prisa y sin exigencias.","Deja que el aire se sienta un poco más claro con cada respiración."],
  middleB:"Con cada exhalación, suelta una pequeña parte del peso. Descansa un momento. No necesitas forzar las nuevas posibilidades.",
  endB:"Siente cómo vuelve algo de espacio, curiosidad y fuerza. Que tu siguiente paso sea pequeño, amable y tuyo."
 }
};
function safeGoal(request){
 const goal=String(request||"").replace(/\s+/gu," ").trim().replace(/[.!?。！？，,;:]+$/u,"");
 if(!goal||goal.length>65||goal.split(/\s+/u).length>8||/@|https?:|\d{3,}/iu.test(goal))return "";
 return goal;
}
/**
 * Local, consent-free meditation text options with an optional canonical film ID.
 * @param {{locale?:string,theme?:string,request?:string,revision?:number,scenarioId?:string|null}} [options]
 */
export function buildShortMeditationOptions({locale="en",theme="energy",request="",revision=0,scenarioId=null}={}){
 const lang=Object.prototype.hasOwnProperty.call(copy,locale)?locale:"en";
 const t=copy[lang];
 // Keep the existing crisis triage instead of replacing it with a cheerful draft.
 const check=buildPersonalMeditationScript({locale:lang,theme,wish:String(request||"")});
 if(isMeditationSafetyResponse(check,lang))return {status:"safety",message:check,options:[]};
 // The scenario-bound editorial pair is chosen locally and never sent automatically.
 const pair=revision===0?getMyTubePreparedMeditationPair(scenarioId,lang):null;
 if(pair)return {status:"ready",message:"",options:pair.options};
 const goal=safeGoal(request)||t.topics[theme]||t.topics.energy;
 const index=((Number(revision)||0)%3+3)%3;
 const focus=t.recall+" "+goal+".";
 return {status:"ready",message:"",options:[
  {id:"a",title:t.titles[0],seconds:30,text:[t.openA[index],t.middleA,focus,t.endA].join("\n\n")},
  {id:"b",title:t.titles[1],seconds:30,text:[t.openB[index],t.middleB,focus,t.endB].join("\n\n")}
 ]};
}
