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
// Narrative sequence is decided by the concept before footage is searched.
// A selected affirmation is overlay text, not an instruction to replace the plot.
const SIX_BEAT_ROLES=Object.freeze({
  ru:["Завязка","Деталь","Поворот","Действие","Результат","Финал"],
  en:["Opening","Key detail","Turning point","Action","Response","Closing"],
  es:["Inicio","Detalle","Giro","Acción","Resultado","Cierre"]
});
// Translate concrete RU/EN/ES visual objects into the English keywords in the
// vetted video catalog. Feelings such as "growth" are not physical actions.
const ANCHORS=Object.freeze([
  ["door",/двер|door|puerta/iu],["hands",/рук|ладон|hands?|manos?/iu],
  ["keys",/ключ[иаи]?|keys?|llaves?/iu],["window",/окн[аоуе]|window|ventana/iu],
  ["room",/комнат|квартир|apartment|room|habitaci[oó]n|apartamento/iu],
  ["table",/стол[аеуы]?|table|mesa/iu],["cup",/чашк|кружк|cup|taza/iu],
  ["phone",/телефон|смартфон|phone|mobile|tel[eé]fono|m[oó]vil/iu],
  ["computer",/компьютер|computer|ordenador|computadora/iu],
  ["laptop",/ноутбук|laptop|port[aá]til/iu],
  ["meeting",/встреч|совещан|meeting|reuni[oó]n/iu],
  ["desk",/рабочи[йе] стол|desk|escritorio/iu],
  ["project",/проект|project|proyecto/iu],
  ["office",/офис|office|oficina/iu],
  ["train",/поезд|train|tren/iu],["station",/станци|вокзал|station|estaci[oó]n/iu],
  ["walking",/ид[её]т|шага|прогул|walk|caminar|paseo/iu],
  ["street",/улиц|street|calle/iu],["city",/город|city|ciudad/iu],
  ["sunlight",/солнечн|sunlight|luz solar/iu],
  ["sunrise",/рассвет|sunrise|amanecer/iu],
  ["forest",/лес[аеуы]?|forest|bosque/iu],
  ["ocean",/океан|ocean|oc[eé]ano/iu],
  ["mountain",/гор[аеыу]|вершин|mountain|monta[nñ]a/iu],
  ["flowers",/цвет[а-я]*|flowers?|flores?/iu]
]);
const visualAnchors=value=>ANCHORS.filter(([,pattern])=>pattern.test(value))
  .map(([name])=>name).slice(0,8);

export function isProfessionalVideoIntent({goal="",phrases=[]}={}){
 const goalText=lower(goal);
 // "I want to work on my relationship" is not a workplace story.
 const explicitWork=/(?:\b(?:salary|income|career|office|business|workplace|client|customer|employment|promotion)\b|зарплат|доход|карьер|офис|бизнес|клиент|повышен|salario|ingresos|carrera|oficina|negocio|cliente)/iu;
 if(OTHER.test(goalText)&&!explicitWork.test(goalText))return false;
 if(WORK.test(goalText))return true;
 return Array.isArray(phrases)&&phrases.some(phrase=>WORK.test(lower(phrase)));
}
/** Each selected phrase gets its own shot; any unfilled last shot is an action-oriented close. */
export function buildAlignedStorySceneGuides({locale="en",goal="",phrases=[],concept=null,count=6,pace="slow"}={}){
 const language=["ru","en","es"].includes(locale)?locale:"en";
 const total=Number.isInteger(count)?Math.max(4,Math.min(12,count)):6;
 const chosen=Array.isArray(phrases)?phrases.filter(p=>typeof p==="string").map(clean).filter(Boolean).slice(0,10):[];
 const professional=isProfessionalVideoIntent({goal,phrases:chosen});
 const outline=Array.isArray(concept?.sceneOutline)?concept.sceneOutline:[];
 // Author-approved 30s film direction is a six-shot visual specification.
 // Do not replace its actual actions with generic emotional labels.
 const storyboard=total===6&&Array.isArray(concept?.storyboard)&&
  concept.storyboard.length===6?concept.storyboard:null;
 const scenes=Array.from({length:total},(_,index)=>{
  if(storyboard){
   const shot=storyboard[index],phrase=chosen[index]||"";
   return Object.freeze({index:index+1,stage:Math.min(4,Math.floor(index*4/total)+1),
    title:clean(shot.title)||phrase,visual:clean(shot.action),
    keywords:[...new Set([
      ...(Array.isArray(shot.keywords)?shot.keywords.filter(x=>
        typeof x==="string"&&/^[a-z]{3,30}$/.test(x)):[]),
      ...visualAnchors(clean(shot.action))
    ])].slice(0,8),
    requiresLiteralMatch:true,sourcePhrase:phrase||null});
  }
  const phase=Math.min(3,Math.floor(index*4/total));
  const beat=clean(outline[phase]);
  const phrase=chosen[index]||"";
  const roleIndex=total===6?index:Math.min(5,Math.round(index*5/(total-1)));
  const role=SIX_BEAT_ROLES[language][roleIndex];
  const closing=professional&&index===total-1&&!beat&&chosen.length<total;
  const action=professional?PROFESSIONAL_ACTIONS.find(rule=>rule.pattern.test(beat))||
    PROFESSIONAL_ACTIONS.find(rule=>rule.pattern.test(phrase)):null;
  const title=closing?CLOSING[language].title:beat?
    clean(role+" · "+beat):phrase||role;
  const description=closing?CLOSING[language].description:
   action?action.description[language]:
   professional?(language==="ru"?"Реальные люди и конкретное действие по рабочей цели":
     language==="es"?"Personas reales actuando hacia una meta de trabajo":
     "Real people taking an action toward a work goal"):
   beat||title;
  const paced=professional&&pace==="dynamic"?
   (language==="ru"?"Энергичный кадр: ":language==="es"?"Toma dinámica: ":"Dynamic shot: ")+description:
   description;
  const keywords=professional?(action?[...action.keywords]:["people","work","team","office"]):
    visualAnchors(beat||description);
  return Object.freeze({index:index+1,stage:phase+1,title,visual:paced,
   keywords,requiresLiteralMatch:!professional&&keywords.length>0&&
     Boolean(concept?.hasPersonalInput)&&
     !["symbolic","abstract","nature","meditative"].includes(concept?.styleId),
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
