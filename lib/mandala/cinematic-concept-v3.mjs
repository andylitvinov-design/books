/**
 * HH Concept Intelligence v3: deterministic, offline, safety-first film director.
 * Roles are pure stages, NOT multiple model instances or clinical inference.
 * The story atlas supplies real actions; never use catalog's four-part arrow
 * strings as Main Idea, Concept Story or storyboard frames.
 */
import {listAuthoredFilmPlots,selectVideoStoryFamily} from "./film-story-atlas-v3.mjs";
import {rankFilmOptions,FILM_OPTION_COUNT} from "./film-personalization-ranker.mjs";

const LOCALES=new Set(["ru","en","es"]);
const langOf=l=>LOCALES.has(l)?l:"en";
const sanitize=(v,n=1200)=>String(v??"").normalize("NFKC")
 .replace(/[\u0000-\u001f\u007f<>]/gu," ").replace(/\s+/gu," ").trim().slice(0,n);
const normalize=t=>sanitize(t,2400).toLocaleLowerCase().replace(/[.,!?;:’'"]/g,"").trim();
const countWords=t=>sanitize(t,8000).split(/\s+/).filter(Boolean).length;
const phrases=Object.freeze({
 en:{scenes:["A first sign","The obstacle","A new perspective","A changed action","One small response","An open tomorrow"],
  fallback:"A personal exploration, offered as an editorial example rather than a claim about your life."},
 ru:{scenes:["Первый знак","Препятствие","Новый взгляд","Иное действие","Маленький отклик","Открытое завтра"],
  fallback:"Предложенная художественная трактовка, а не утверждение о вашей биографии."},
 es:{scenes:["Una primera señal","El obstáculo","Otra mirada","Una acción distinta","Una respuesta pequeña","Un mañana abierto"],
  fallback:"Una propuesta creativa, no una afirmación sobre tu vida."}
});
const danger=/\b(?:you are cured|guaranteed therapy|will be cured|everyone forgives|must forgive)\b|обязан[аы]? простить|должен терпеть|te curará|debes perdonar/iu;
const narrativeMarkup=/→|(?:the story opens with|something begins to change|then comes the turning point|the final image leaves room|over \d+ seconds|six distinct|six shots)|(?:история начинается с|дальше происходит поворот|шесть кадров|за \d+ секунд)|(?:la historia empieza con|llega el momento decisivo|fotogramas propuestos)/iu;
const FORBIDDEN=Object.freeze({
 forest:/\b(?:forest|woods|woodland)\b|лес(?:у|а|е|ом)?\b|bosqu(?:e|es)\b/iu,
 water:/\b(?:water|river|lake|sea|ocean|rain|rainy|raindrops|shore|waterfall)\b|вода|вод[еуы]|река|рек[еу]|мор[ея]|дожд[ьяе]|океан|озер|r[ií]o\b|lluvia|agua|mar\b|oc[eé]ano|lago/iu,
 mountain:/\b(?:mountain|ridge|peak|cliff)\b|гор[аыяе]|вершин|monta[nñ]a|cumbre/iu,
 dark:/\b(?:dark|darkness|night)\b|темнот|мрак|ноч[ьи]|oscuridad|noche/iu,
 flashing:/\b(?:flashing|strobe|flicker)\b|миган|вспыш|parpadeo|destellos/iu
});
const FAMILY_BRIEFS=Object.freeze({
 growth:{
  en:["The wish to grow meets the discomfort of an imperfect beginning.","A first try might feel too exposed.","Curiosity and permission to practice","Make one reversible attempt"],
  ru:["Желание расти встречается со страхом неидеального начала.","Первая попытка может казаться слишком уязвимой.","Любопытство и право учиться","Сделать одну обратимую попытку"],
  es:["El deseo de crecer se encuentra con un comienzo imperfecto.","Un primer intento puede parecer demasiado arriesgado.","Curiosidad y permiso para aprender","Intentar una acción pequeña"]
 },
 money:{
  en:["The wish for better earning meets the need for concrete evidence and conversation.","Speaking about money may feel uncomfortable.","Accurate information and a specific request","Prepare one real example or calculation"],
  ru:["Желание улучшить доход требует фактов и разговора, а не волшебного результата.","Разговор о деньгах может быть непростым.","Факты и ясная просьба","Подготовить один пример или расчёт"],
  es:["El deseo de ganar mejor requiere datos y una conversación, no resultados mágicos.","Hablar del dinero puede incomodar.","Información clara y una petición concreta","Preparar un ejemplo o cálculo real"]
 },
 stress:{
  en:["A busy day leaves little space for a chosen pause.","Continuous demands may make stopping difficult.","A boundary, a realistic next step or another person's presence","Pause without solving every task"],
  ru:["Напряжённый день оставляет мало пространства для выбранной паузы.","Постоянные дела могут затруднять остановку.","Граница, малый шаг или поддержка","Остановиться, не решая всё сразу"],
  es:["Un día exigente deja poco espacio para una pausa elegida.","Las tareas continuas pueden dificultar parar.","Un límite, un paso pequeño o apoyo","Hacer una pausa sin resolverlo todo"]
 },
 purpose:{
  en:["The wish for meaning meets too many borrowed answers.","Other people's expectations may crowd out curiosity.","Attention to actual interests and values","Explore one interest in real life"],
  ru:["Поиск смысла сталкивается с множеством чужих готовых ответов.","Чужие ожидания могут заслонять собственный интерес.","Внимание к настоящему любопытству","Исследовать один интерес на деле"],
  es:["La búsqueda de sentido se encuentra con demasiadas respuestas ajenas.","Las expectativas pueden ocultar la curiosidad propia.","Atención a intereses auténticos","Explorar una curiosidad real"]
 },
 intimacy:{
  en:["The wish for closeness meets the need for honesty and room to choose.","Fear of a difficult conversation may invite silence.","A gentle, mutual and consent-based gesture","Offer one honest invitation or boundary"],
  ru:["Желание близости встречается с потребностью в честности и свободном выборе.","Трудный разговор может провоцировать молчание.","Малый взаимный жест и уважение границ","Предложить честный контакт или границу"],
  es:["El deseo de cercanía requiere sinceridad y libertad de elegir.","Una conversación difícil puede fomentar el silencio.","Un gesto cuidadoso y mutuo","Ofrecer una invitación o límite sincero"]
 },
 generic:{
  en:["A human wish meets uncertainty about the first feasible action.","Too many options might make the next step unclear.","A modest choice and room to reconsider","Try one small action"],
  ru:["Человеческое желание встречается с неопределённостью первого шага.","Слишком много вариантов могут затруднять решение.","Малый выбор с возможностью передумать","Попробовать одно действие"],
  es:["Un deseo humano se encuentra con la incertidumbre del primer paso.","Demasiadas opciones pueden dificultar decidir.","Una elección pequeña y revisable","Intentar una acción"]
 }
});
const SHOT_TYPES=["medium","close-up","detail","medium","close-up","wide"];
const stageIndex=[0,0,1,2,2,3];

/** Psychologist Mind: an editorial hypothesis, never a diagnosis or biography. */
export function derivePsychologicalBrief(concept={},locale="en"){
 const l=langOf(locale),family=selectVideoStoryFamily(concept),copy=FAMILY_BRIEFS[family][l];
 const p=concept.parameters||{};
 return Object.freeze({
  theme:sanitize(concept.goal||concept.topicId||family,180),family,
  humanDilemma:copy[0],possibleBarrier:copy[1],resource:copy[2],
  microChoice:copy[3],
  currentState:sanitize(p.currentState?.value,180)||null,
  desiredState:sanitize(p.desiredState?.value,180)||null,
  focus:sanitize(concept.personalizationFocus,180)||null,
  desiredEmotionalShift:sanitize(p.desiredState?.value,180)||copy[2],
  doNotAssume:["diagnosis","biography","gender","family history","relationship history","guaranteed result"],
  inputSources:Object.freeze({
   topic:concept.semanticConfidence==="explicit"?"explicit":"inferred",
   currentState:p.currentState?.source||"unknown",
   desiredState:p.desiredState?.source||"unknown",
   focus:concept.personalizationFocus?"personalized":"unknown"
  })
 });
}
const PERSONAL_SCENE_CUES={
 en:{
  fatigue:"Their movements carry the quiet weight of a tiring day.",
  tension:"A tight pause interrupts the person's usual rhythm.",
  uncertainty:"There is a hesitation before the first attempt.",
  joy:"A small smile returns without needing everything to be resolved.",
  safety:"The person moves on without forcing the next step.",
  connection:"An opening toward another person remains possible.",
  calm:"Their movements grow a little more unhurried."
 },
 ru:{
  fatigue:"В движениях героя заметна тихая усталость после долгого дня.",
  tension:"Перед первым действием возникает короткая напряжённая пауза.",
  uncertainty:"Герой медлит перед первой попыткой, не зная, получится ли.",
  joy:"Появляется маленькая улыбка, не требующая идеального результата.",
  safety:"Человек движется дальше без необходимости себя торопить.",
  connection:"Возможность нового контакта остаётся открытой.",
  calm:"Движения становятся немного более спокойными."
 },
 es:{
  fatigue:"Los movimientos de la persona muestran el cansancio de un día largo.",
  tension:"Una breve pausa tensa rompe el ritmo habitual.",
  uncertainty:"La persona duda un instante antes del primer intento.",
  joy:"Regresa una pequeña sonrisa sin exigir un resultado perfecto.",
  safety:"La persona sigue sin obligarse a avanzar más deprisa.",
  connection:"Permanece abierta la posibilidad de conectar con alguien.",
  calm:"Sus movimientos se vuelven un poco más tranquilos."
 }
};
function cueKinds(brief){
 const now=normalize(brief?.currentState||"");
 const next=normalize(brief?.desiredState||"");
 const start=/tired|fatigu|устал|cansad|agotad/.test(now)?"fatigue":
  /tense|tension|напряж|tens/.test(now)?"tension":
  /uncertain|сомнен|неувер|duda|insegur/.test(now)?"uncertainty":null;
 const finish=/joy|happy|радост|alegr|feliz/.test(next)?"joy":
  /safe|безопасн|segur/.test(next)?"safety":
  /connect|близ|связ|conex|relaci/.test(next)?"connection":
  /calm|спокой|tranquil/.test(next)?"calm":null;
 return {start,finish};
}
/** Every scene paragraph comes from its own observable event; frame 1 holds
 * the setting and the last frame carries the open ending. */
function makeConceptScenes(plot,l,brief){
 const cues=cueKinds(brief);
 return plot.scenes.map((scene,index)=>{
  const first=index===0,last=index===plot.scenes.length-1;
  const action=sanitize(scene[l],360);
  const narrative=sanitize([
   first?plot.opening[l]:null,
   first&&cues.start?PERSONAL_SCENE_CUES[l][cues.start]:null,
   action,
   last?plot.closing[l]:null,
   last&&cues.finish?PERSONAL_SCENE_CUES[l][cues.finish]:null
  ].filter(Boolean).join(" "),850);
  return Object.freeze({id:plot.id+":scene:"+(index+1),index:index+1,action,narrative});
 });
}
/** Storyboard Director: exactly 6×5s, all actions are physically visible. */
export function makeSixShotStoryboard(plot,locale="en",conceptScenes=null){
 const l=langOf(locale);
 if(!plot||!Array.isArray(plot.scenes)||plot.scenes.length!==6)return [];
 // The storyboard does not invent events: each shot is a visual instruction
 // for one exact screenplay event, with a stable identity.
 const events=Array.isArray(conceptScenes)?conceptScenes:
  plot.scenes.map((scene,index)=>({
   id:plot.id+":scene:"+(index+1),action:sanitize(scene[l],360)
  }));
 if(events.length!==plot.scenes.length)return [];
 return events.map((scene,i)=>{
  const action=sanitize(scene.action,360);
  const subject=sanitize(plot.subjects[i],90);
  const keywords=[subject,...plot.keys].filter(Boolean).map(x=>String(x).toLowerCase())
   .filter(x=>/^[a-z][a-z0-9-]{1,32}$/.test(x));
  return Object.freeze({
   sceneId:scene.id,index:i+1,startSeconds:i*5,endSeconds:(i+1)*5,
   visualAction:action,visualSubject:subject,shotType:SHOT_TYPES[i],
   emotionalFunction:sanitize(plot.arc[stageIndex[i]][l],100),
   continuityKeys:[...plot.keys],searchKeywords:[...new Set(keywords)],
   sourceStatus:"editorial_unverified",sourceVerified:false,
   title:phrases[l].scenes[i],action,
   emotion:plot.arc[stageIndex[i]][l],keywords:[...new Set(keywords)]
  });
 });
}
/** Screenwriter Mind: the story is composed of independently authored events. */
export function writeFilmStory(plot,brief,locale="en",topicId="",variantIndex=0){
 const l=langOf(locale),conceptScenes=makeConceptScenes(plot,l,brief);
 const shots=makeSixShotStoryboard(plot,l,conceptScenes);
 if(!shots.length)return null;
 const centralAction=shots[3].visualAction;
 const endingImage=shots[5].visualAction;
 const contextualStory=conceptScenes.map(scene=>scene.narrative).join("\n\n");
 const emotionalBeats=plot.arc.map(x=>x[l]);
 return {
  id:"v3-"+plot.id,title:plot.title[l],mode:plot.genre,
  genre:plot.genre,styleId:plot.styleId,mainIdea:plot.idea[l],
  idea:plot.idea[l],pitch:plot.pitch[l],story:contextualStory,
  conceptStory:contextualStory,conceptScenes,
  symbol:plot.symbol[l],
  activeSymbol:{name:plot.symbol[l],functionInPlot:plot.pitch[l]},
  humanDilemma:brief.humanDilemma,possibleBarrier:brief.possibleBarrier,
  resource:brief.resource,microChoice:brief.microChoice,
  dramaticPremise:plot.pitch[l],character:"unnamed_adult_editorial",
  obstacle:brief.possibleBarrier,centralAction,
  turningPoint:shots[3].visualAction,endingImage,logline:plot.pitch[l],
  stages:[...emotionalBeats],arc:[...emotionalBeats],emotionalBeats,
  world:plot.opening[l],plotMode:plot.genre==="realistic"?"grounded_dilemma":"symbolic_quest",
  storyboard:shots,shots,
  // Scenario catalog IDs are a compatibility bridge, NOT a screenplay source.
  scenarioId:topicId?topicId+"-s"+(variantIndex%4+1):null,
  provenance:"v3_authored_composition",creativeSchemaVersion:"hh-creative-concept-v3",
  mediaBindingStatus:"editorial_only_unverified",sourceStatus:"editorial_unverified",
  psychologicalBrief:brief
 };
}
const visualText=film=>[film.idea,film.pitch,film.story,...film.storyboard.map(s=>s.visualAction)].join(" ");
function excludedIn(film,avoid=[]){
 const body=visualText(film);
 return [...new Set(avoid)].filter(x=>Object.hasOwn(FORBIDDEN,x)&&FORBIDDEN[x].test(body));
}
/**
 * Critic: auditable deterministic structural gate, not an aesthetic grade.
 * @param {any} film
 * @param {{locale?:string, goal?:string, avoidImagery?:string[]}} [options]
 */
export function reviewConceptQuality(film,{locale="en",goal="",avoidImagery=[]}={}){
 const l=langOf(locale),fails=[],parts={};
 if(!film){return {score:0,hardFailures:["missing_story"],status:"needs_input",parts:{}};}
 const story=film.story||"",idea=film.idea||"",shots=film.storyboard||[];
 // Automated scenes must be exactly the ones written into the narrative.
 // A user's manual narrative rewrite is reviewed separately with explicit consent.
 const scenes=film.conceptScenes;
 const sceneContract=!Array.isArray(scenes)||(scenes.length===shots.length&&
  scenes.every((scene,i)=>scene.id===shots[i]?.sceneId&&
   normalize(scene.action)===normalize(shots[i]?.visualAction)&&
   story.includes(scene.narrative)));
 if(!sceneContract)fails.push("concept_storyboard_scene_mismatch");
 const title=film.title||"",pitch=film.pitch||"";
 const noMarkup=!narrativeMarkup.test([idea,pitch,story].join(" "));
 if(!noMarkup)fails.push("formulaic_or_technical_copy");
 if(danger.test([idea,pitch,story].join(" ")))fails.push("unsafe_promise_or_coercion");
 if(!goal||!film.psychologicalBrief?.family)parts.goal=3;else parts.goal=5;
 const wc=countWords(idea);
 parts.mainIdea=(wc>=10&&wc<=44&&!idea.includes("→")&&noMarkup)?5:0;
 const storyWords=countWords(story);
 const storyMin=l==="en"?88:76;
 parts.dramaturgy=(storyWords>=storyMin&&storyWords<=190&&shots.length===6&&sceneContract&&
    normalize(shots[3]?.visualAction)!==normalize(shots[5]?.visualAction))?5:0;
 if(!parts.dramaturgy)fails.push("missing_story_actions_or_length");
 const differentActions=new Set(shots.map(x=>normalize(x.visualAction)));
 const explicit=shots.every(x=>typeof x.visualAction==="string"&&
    x.visualAction.length>=32&&typeof x.visualSubject==="string"&&
    x.visualSubject.length>1);
 parts.visualActions=(differentActions.size===6&&explicit)?5:0;
 if(!parts.visualActions)fails.push("repeated_or_abstract_shots");
 const arc=film.emotionalBeats||[];
 parts.emotionalTruth=arc.length===4&&
   new Set(arc.map(normalize)).size===4&&!danger.test(story)?5:0;
 if(!parts.emotionalTruth)fails.push("emotional_arc_unverified");
 parts.storyboard=shots.length===6&&shots.every((x,i)=>x.index===i+1&&
  x.startSeconds===i*5&&x.endSeconds===(i+1)*5&&
  x.sourceStatus==="editorial_unverified"&&x.sourceVerified===false)?5:0;
 if(!parts.storyboard)fails.push("timing_or_media_provenance_error");
 parts.cohesion=(film.activeSymbol?.name&&film.symbol===film.activeSymbol.name&&
  film.turningPoint!==film.endingImage&&title.split(/\s+/).length<=7&&
  Array.isArray(shots[0]?.continuityKeys)&&shots[0].continuityKeys.length>=2)?5:0;
 if(!parts.cohesion)fails.push("symbol_or_ending_incoherent");
 const banned=excludedIn(film,avoidImagery);
 if(banned.length)fails.push(...banned.map(x=>"excluded_imagery:"+x));
 // "No verification" is intentional; only actual source rights checks verify footage.
 if(film.mediaBindingStatus!=="editorial_only_unverified"||film.sourceStatus!=="editorial_unverified")
  fails.push("fabricated_media_verification");
 const score=Object.values(parts).reduce((sum,x)=>sum+x,0);
 return Object.freeze({score,hardFailures:[...new Set(fails)],
  status:!fails.length&&score>=28?"pass":fails.some(x=>x.startsWith("excluded_imagery"))?
   "needs_input":"revise",parts,qualityScope:"structural_only_not_human_editorial_review"});
}
function uniqueMechanisms(directions){
 const keys=new Set();
 for(const item of directions){
  const k=normalize(item.centralAction)+"|"+normalize(item.endingImage)+"|"+normalize(item.symbol);
  if(keys.has(k))return false;
  keys.add(k);
 }
 return true;
}
/** Creative Director: choose meaningfully distinct plot mechanisms. */
export function generateThreePremises(concept={},locale="en"){
 const l=langOf(locale),brief=derivePsychologicalBrief(concept,l);
 const plots=listAuthoredFilmPlots(brief.family);
 // The initial set contains three authored candidates; ranking is performed
 // only after scene-level quality review, using confirmed structured signals.
 const directions=plots.map((plot,index)=>{
  const film=writeFilmStory(plot,brief,l,concept.topicId,index);
  if(!film)return null;
  film.review=reviewConceptQuality(film,{
    locale:l,goal:concept.goal,avoidImagery:concept.avoidImagery||[]
  });
  return film;
 }).filter(Boolean);
 const passing=directions.filter(x=>x.review.status==="pass");
 return {
  schemaVersion:"hh-creative-concept-v3",
  intentSignature:concept.signature||"",
  locale:l,durationSeconds:30,
  psychologicalBrief:brief,
  directions:uniqueMechanisms(passing)?rankFilmOptions(passing,concept):[],
  selectedDirectionId:null,userEditedFields:[],
  allReviews:directions.map(x=>({id:x.id,review:x.review})),
  needsInput:passing.length<FILM_OPTION_COUNT,
  candidateCount:directions.length,approvedMedia:false
 };
}
/** Explicit revision is bounded: reject formulaic drafts; do not silently
 * replace an author's words with four catalog beats or fake a PASS score. */
export function reviseConcept(candidate,concept={},locale="en"){
 let current=candidate;
 for(let attempt=0;attempt<2;attempt++){
  const result=reviewConceptQuality(current,{
    locale,goal:concept.goal,avoidImagery:concept.avoidImagery||[]
  });
  if(result.status==="pass")return {...current,review:result};
  // Recompose from the same authored plot; no lexical synonym camouflage.
  const plot=listAuthoredFilmPlots(selectVideoStoryFamily(concept))
    .find(x=>"v3-"+x.id===current?.id);
  if(!plot)break;
  current=writeFilmStory(plot,derivePsychologicalBrief(concept,locale),locale,concept.topicId,
    listAuthoredFilmPlots(selectVideoStoryFamily(concept)).indexOf(plot));
 }
 return null;
}
