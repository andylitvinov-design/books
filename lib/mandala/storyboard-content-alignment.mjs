/**
 * One source of truth for translating active Ideas/Text choices into filmed-story
 * scene subjects. Editorial only: no asset is verified by these descriptions.
 * No provider calls, saving user phrases, billing, or auto-publication.
 */
const clean=value=>String(value??"").normalize("NFKC").trim().slice(0,250);
const lower=value=>clean(value).toLocaleLowerCase().replace(/ё/g,"е");
const WORK=/(?:\b(?:business|work(?:ing)?|job|career|office|professional|skills?|projects?|client(?:s)?|customer(?:s)?|entrepreneur(?:ship)?|startup|teamwork|productivity|workplace)\b|бизнес|работ|карьер|професси|офис|клиент|навык|проект|команд|предпринимател|negocio|empresa|trabaj|empleo|carrera|oficina|habilidad|proyecto|cliente)/iu;
const OTHER=/(?:\b(?:relationship|romance|love|meditation|anxiety|panic|trauma|breathing)\b|отношени|любов|медитац|тревог|паник|травм|amor|relaci[oó]n|meditaci[oó]n|ansiedad)/iu;
const rule=(id,pattern,ru,en,es,keywords)=>Object.freeze({
 id,pattern,description:Object.freeze({ru,en,es}),keywords:Object.freeze(keywords)
});
const PROFESSIONAL_ACTIONS=Object.freeze([
 rule("opportunity",/opportun|возможност|шанс|oportunidad/iu,
  "Реальный специалист замечает новую возможность во время деловой встречи",
  "A professional discovers an opportunity during a real work conversation",
  "Un profesional descubre una oportunidad en una conversación de trabajo",
  ["people","meeting","client","office","collaboration"]),
 rule("skills",/skill|learn|train|develop|навык|обуч|учеб|развив|habilidad|aprender|formaci[oó]n/iu,
  "Человек осваивает практический навык за работой или на обучении",
  "A person learns a practical skill in a real workplace or training session",
  "Una persona aprende una habilidad práctica en el trabajo o en una formación",
  ["people","training","learning","computer","laptop","work"]),
 rule("plan",/plan|decisi|action|план|решени|действи|estrateg|organiz|paso/iu,
  "Крупный план работы над конкретным планом и следующими действиями",
  "A real desk-level view of organizing a clear plan and next actions",
  "Una vista real de la organización de un plan y de las próximas acciones",
  ["planning","desk","office","project","work","team"]),
 rule("meaning",/meaning|purpose|value|help|смысл|ценност|польз|помощ|sentido|prop[oó]sito|valor|ayudar/iu,
  "Осмысленная работа: сотрудничество с командой или помощь клиенту",
  "Meaningful work: colleagues collaborating or helping a client",
  "Trabajo con sentido: colegas que colaboran o ayudan a un cliente",
  ["collaboration","client","team","people","meeting","work"]),
 rule("goal",/goal|step|progress|цел[ьи]|шаг|достиж|мет[аы]|avance|progreso/iu,
  "Специалист делает конкретный шаг к рабочей цели",
  "A professional takes a concrete step toward a work goal",
  "Un profesional da un paso concreto hacia una meta de trabajo",
  ["people","work","project","office","progress","team"]),
 rule("work",/work|business|career|работ|дело|бизнес|карьер|trabaj|negocio/iu,
  "Настоящая рабочая сцена: люди, задачи и взаимодействие",
  "A real workplace scene with people, tasks and collaboration",
  "Una escena laboral real con personas, tareas y colaboración",
  ["people","work","office","collaboration","project","client"])
]);
const CLOSING=Object.freeze({
 ru:{title:"Следующий практический шаг",description:"Человек уверенно приступает к выбранной рабочей задаче"},
 en:{title:"One practical next step",description:"A person confidently starts a concrete work task"},
 es:{title:"Un próximo paso práctico",description:"Una persona empieza con confianza una tarea de trabajo"}
});
const WORK_SUBJECT=/(?:\b(?:professional|employee|colleague|worker|office|work|workplace|business|career|job|client|customer|meeting|team|collaboration|training|learning|computer|laptop|desk|planning|project|entrepreneur|startup)\b|работ|офис|бизнес|клиент|коллег|сотрудник|команд|обуч|проект|план)/iu;
const BANNED=Object.freeze({
 forest:/\b(?:forest|woods|trees|woodland)\b|лес|деревь/iu,
 water:/\b(?:water|ocean|sea|river|lake|waterfall)\b|вод|мор|океан|река/iu,
 mountain:/\b(?:mountain|mountains|cliff|ridge)\b|гор[а-я]|вершин/iu,
 dark:/\b(?:dark|night|darkness)\b|темнот|ночь/iu,
 flashing:/\b(?:flashing|strobe|flicker)\b|миган|вспыш/iu
});
export function isProfessionalVideoIntent({goal="",phrases=[]}={}){
 const goalText=lower(goal);
 if(WORK.test(goalText))return true;
 if(OTHER.test(goalText))return false;
 return Array.isArray(phrases)&&phrases.some(phrase=>WORK.test(lower(phrase)));
}
/** Each selected phrase gets its own shot; any unfilled last shot is an action-oriented close. */
export function buildAlignedStorySceneGuides({locale="en",goal="",phrases=[],concept=null,count=6,pace="slow"}={}){
 const language=["ru","en","es"].includes(locale)?locale:"en";
 const total=Number.isInteger(count)?Math.max(4,Math.min(12,count)):6;
 const chosen=Array.isArray(phrases)?phrases.filter(p=>typeof p==="string").map(clean).filter(Boolean).slice(0,10):[];
 const professional=isProfessionalVideoIntent({goal,phrases:chosen});
 const outline=Array.isArray(concept?.sceneOutline)?concept.sceneOutline:[];
 const scenes=Array.from({length:total},(_,index)=>{
  const phase=Math.min(3,Math.floor(index*4/total));
  const phrase=chosen[index]||"";
  const closing=professional&&index===total-1&&chosen.length<total;
  const action=professional?PROFESSIONAL_ACTIONS.find(rule=>rule.pattern.test(phrase)):null;
  const title=closing?CLOSING[language].title:phrase||
   (index<4?clean(outline[phase]):"")||
   (language==="ru"?"Шаг "+(index+1):language==="es"?"Paso "+(index+1):"Step "+(index+1));
  const description=closing?CLOSING[language].description:
   action?action.description[language]:
   professional?(language==="ru"?"Реальные люди и конкретное действие по рабочей цели":
     language==="es"?"Personas reales actuando hacia una meta de trabajo":
     "Real people taking an action toward a work goal"):
   clean(outline[phase])||title;
  const paced=professional&&pace==="dynamic"?
   (language==="ru"?"Энергичный кадр: ":language==="es"?"Toma dinámica: ":"Dynamic shot: ")+description:
   description;
  return Object.freeze({index:index+1,stage:phase+1,title,visual:paced,
   keywords:professional?(action?[...action.keywords]:["people","work","team","office"]):[],
   sourcePhrase:phrase||null});
 });
 return Object.freeze({professional,scenes,pace:pace==="dynamic"?"dynamic":"slow"});
}
/** Metadata is only a relevance gate; camera footage/rights are checked elsewhere. */
export function matchesFilmedStorySubject(scene,{professional=false,excludedVisuals=[]}={}){
 if(!scene||typeof scene!=="object")return false;
 const content=[...(scene.tags||[]),...(scene.motifs||[]),...(scene.categories||[]),
   scene.label?.en||"",scene.description?.en||""].map(String).join(" ").toLocaleLowerCase();
 if(Array.isArray(excludedVisuals)&&excludedVisuals.some(id=>
   Object.prototype.hasOwnProperty.call(BANNED,id)&&BANNED[id].test(content)))return false;
 return !professional||WORK_SUBJECT.test(content);
}
