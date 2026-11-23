/**
 * Contextual, offline phrase recommendations for the existing Ideas editor.
 * Goal > canonical topic > current film theme > neutral meaning-axis fallback.
 * Client text never leaves the browser. Suggestions are not approved captions
 * until the visitor selects them in the existing single Canvas/export editor.
 */
import {resolveVideoGoalTopic,VIDEO_GOAL_TOPICS} from "./video-goal-taxonomy.mjs";
import {getMyTubeTopic} from "./mytube-content-taxonomy.mjs";
import {suggestMeaningPhrases,MEANING_LINES,MEANING_DESIRED} from "./video-meaning-phrases.mjs";

const LOCALES=["ru","en","es"];
const THEME_CATEGORY=Object.freeze({
  relationships:"love",money:"business",goals:"business",health:"body",
  energy:"energy",life:"energy",
});
const AXIS=Object.freeze({
  love:["connection"],business:["agency"],body:["wholeness"],
  energy:["growth"],stress:["anchor"],
});
const DESIRED=Object.freeze({
  love:"connection",business:"confidence",body:"self_acceptance",
  energy:"vitality",stress:"calm",
});

// Short, first-party RU/EN/ES editorial copy fits the current 36-char
// Canvas editor without clipping. Nothing promises a romantic result,
// health cure, income, or another person's actions.
export const GOAL_IDEA_LINES=Object.freeze({
 ru:{
  love:["Я открываюсь любви бережно","Я заслуживаю любви и уважения","Я могу идти навстречу близости","Я даю доверию расти постепенно","Мне доступны тёплые отношения","Я могу дарить и принимать нежность","Любовь начинается с искренности","Я выбираю честный диалог","Я уважаю свои чувства в любви","Я открываюсь тёплому контакту","Мне важны взаимность и забота","Я могу строить близкие отношения"],
  business:["Я замечаю новые возможности","Я могу сделать шаг к своей цели","Я развиваю полезные навыки","Я выбираю ясный план действий","Мой труд имеет значение","Я могу спокойно принимать решения","Я учусь распоряжаться ресурсами","Мне можно просить о поддержке","Я укрепляю уверенность в деле","Я выбираю посильный следующий шаг"],
  energy:["Я замечаю то, что даёт силы","Я позволяю себе восстанавливаться","Во мне есть место вдохновению","Я выбираю свой жизненный ритм","Я могу наполнять день смыслом","Мне можно пробовать новое","Я замечаю маленькие радости","Я бережно отношусь к своей энергии","Я исследую новые возможности","Я встречаю день с любопытством"],
  body:["Я прислушиваюсь к своему телу","Я выбираю бережное отношение","Я могу замечать свои потребности","Мне можно отдыхать без спешки","Я ценю сигналы своего тела","Я нахожу посильный ритм","Я уделяю внимание самочувствию","Я могу заботиться о себе","Я выбираю мягкое движение","Я замечаю, что мне помогает"],
  stress:["Я даю себе время выдохнуть","Я могу найти спокойную опору","Мне можно двигаться медленно","Я выбираю один посильный шаг","Я могу делать паузы","Я замечаю безопасное вокруг","Мне можно попросить поддержки","Я бережно отношусь к себе","Я могу возвращаться к настоящему","Сегодня достаточно малого"],
 },
 en:{
  love:["I welcome love with openness","I deserve mutual care and respect","I can connect with an open heart","I let trust grow at its own pace","I welcome kind relationships","I can give and receive affection","Love starts with being myself","I choose honest, caring dialogue","I honor my needs in love","I make room for joyful closeness","I value warmth and tenderness","I can build a loving bond"],
  business:["I can notice new opportunities","I can take a step toward my goal","I can develop useful skills","I choose a clear plan of action","My work can have meaning","I can make thoughtful decisions","I can use my resources wisely","I may ask for help when needed","I grow more confident at work","I choose one manageable next step"],
  energy:["I notice what gives me energy","I make room for renewal","I welcome fresh inspiration","I can find my own rhythm","I can bring meaning to my day","I may explore something new","I notice small moments of joy","I care for my energy gently","I explore new possibilities","I greet this day with curiosity"],
  body:["I listen to my body's signals","I choose to treat myself gently","I can notice what I need","I make space to rest","My body's needs matter","I can find a comfortable pace","I pay attention to how I feel","I can take care of myself","I choose gentle movement","I notice what helps me"],
  stress:["I give myself time to exhale","I can find a calm point of support","I may move at a gentler pace","I choose one manageable step","I can pause when I need to","I notice what feels safe now","I may ask for support","I treat myself with kindness","I can return to this moment","Small steps can be enough today"],
 },
 es:{
  love:["Me abro al amor con suavidad","Merezco cariño y respeto mutuos","Puedo acercarme con el corazón","Dejo que crezca la confianza","Doy espacio a vínculos amables","Puedo dar y recibir ternura","El amor comienza siendo yo","Elijo un diálogo sincero","Respeto mis necesidades en amor","Doy espacio a la cercanía","Valoro el afecto y la ternura","Puedo construir vínculos de amor"],
  business:["Veo nuevas oportunidades","Puedo avanzar hacia mi meta","Desarrollo habilidades útiles","Elijo un plan de acción claro","Mi trabajo tiene significado","Tomo decisiones con calma","Cuido mis recursos disponibles","Puedo pedir ayuda cuando la necesito","Gano confianza en mi trabajo","Elijo el próximo paso posible"],
  energy:["Noto lo que me da energía","Doy espacio a recuperarme","Me abro a la inspiración","Encuentro mi propio ritmo","Doy sentido a este día","Puedo explorar algo nuevo","Noto pequeñas alegrías","Cuido mi energía con suavidad","Exploro nuevas posibilidades","Recibo el día con curiosidad"],
  body:["Escucho las señales de mi cuerpo","Me trato con suavidad","Puedo notar lo que necesito","Me doy espacio para descansar","Valoro lo que mi cuerpo me dice","Encuentro un ritmo cómodo","Atiendo cómo me siento","Puedo cuidarme cada día","Elijo moverme suavemente","Noto lo que me hace bien"],
  stress:["Me doy tiempo para exhalar","Puedo hallar un punto de calma","Puedo ir a un ritmo más suave","Elijo un paso que sí puedo dar","Puedo hacer pausas","Noto lo que me da seguridad","Puedo pedir apoyo","Me trato con amabilidad","Regreso al momento presente","Un pequeño paso basta hoy"],
 },
});
// The selected purpose determines grammatical person. It never substitutes
// an unverified feeling, diagnosis, outcome or a real person's identity.
export const GOAL_PURPOSE_LINES=Object.freeze({
 ru:{
  leisure:["Пора немного отдохнуть","Сейчас можно просто быть","Пусть время течёт медленно","Можно отпустить спешку","Пауза — это тоже забота","У этого мгновения свой ритм","Ничего не нужно доказывать","Можно насладиться тишиной","Вдох и мягкий выдох","Достаточно просто смотреть","Красота есть в мелочах","Здесь место для отдыха"],
  support:["Ты важен","Ты достоин доброты","Ты не обязан быть идеальным","Твои чувства имеют значение","Ты заслуживаешь заботы","Можно попросить поддержки","Ты достоин уважения","Ты можешь идти своим темпом","Тебя можно принимать","В твоей жизни есть место теплу","Ты можешь дать себе время","Тебе можно беречь себя"],
  change:["Я имею право быть собой","Я могу выбирать","Я учусь доверять себе","Я достоин уважения","Я могу менять свои взгляды","Я допускаю новые возможности","Я могу действовать по-своему","Я ценю свои потребности","Я выбираю посильный шаг","Я могу ошибаться и учиться","Я принимаю свою ценность","Я исследую свои убеждения"],
 },
 en:{
  leisure:["Time for a gentle pause","I can simply enjoy this moment","Let the day slow down","There's no rush right now","Rest can be enough","A moment at my own pace","Nothing to prove right now","I can enjoy some quiet","One gentle breath at a time","I can just watch and rest","Beauty lives in small things","A little space for rest"],
  support:["You matter","You deserve kindness","You need not be perfect","Your feelings matter","You deserve care","It's okay to ask for support","You deserve respect","You can move at your own pace","You can be yourself","You deserve moments of warmth","You can take your time","You are worth caring for"],
  change:["I can be myself","I have choices","I am learning to trust myself","I deserve respect","I can question old beliefs","I am open to other possibilities","I can act in my own way","My needs have value","I can take a manageable step","I can learn from mistakes","My worth is not up for debate","I can reconsider my assumptions"],
 },
 es:{
  leisure:["Es momento de descansar","Puedo disfrutar este instante","El día puede ir más despacio","No hay prisa ahora","Descansar también es cuidarme","Un momento a mi ritmo","No tengo nada que demostrar","Puedo disfrutar el silencio","Un respiro suave","Puedo mirar y descansar","Hay belleza en lo pequeño","Un lugar para descansar"],
  support:["Tú importas","Mereces amabilidad","No tienes que ser perfecto","Tus sentimientos importan","Mereces cuidado","Puedes pedir apoyo","Mereces respeto","Puedes ir a tu ritmo","Puedes ser tú mismo","Mereces momentos cálidos","Puedes tomarte tu tiempo","Mereces cariño y cuidado"],
  change:["Puedo ser quien soy","Tengo opciones","Aprendo a confiar en mí","Merezco respeto","Puedo revisar mis creencias","Me abro a otras posibilidades","Puedo actuar a mi modo","Mis necesidades importan","Puedo dar un paso posible","Puedo aprender de errores","Mi valor no depende de otros","Puedo cambiar de perspectiva"],
 }
});
export const SUPPORT_STYLE_LINES=Object.freeze({
 ru:{
  acceptance:["Ты можешь быть собой","Тебя не нужно исправлять"],
  care:["Ты достоин нежности","Тебе можно принимать заботу"],
  reassurance:["Сейчас можно сделать паузу","Ты можешь найти свою опору"],
  connection:["Ты заслуживаешь близости","Тебе можно быть не одному"],
  worth:["Ты достаточно хорош","Твоя ценность не под вопросом"],
  love:["Я тебя люблю","Ты достоин любви"],
 },
 en:{
  acceptance:["You can be yourself","You don't need to be fixed"],
  care:["You are worthy of tenderness","You may receive care"],
  reassurance:["You can pause now","You can find steady ground"],
  connection:["You deserve connection","You needn't do it all alone"],
  worth:["You are good enough","Your worth isn't in question"],
  love:["I love you","You are worthy of love"],
 },
 es:{
  acceptance:["Puedes ser tú mismo","No necesitas que te arreglen"],
  care:["Mereces ternura","Puedes recibir cuidado"],
  reassurance:["Puedes hacer una pausa","Puedes hallar apoyo"],
  connection:["Mereces cercanía","No tienes que hacerlo solo"],
  worth:["Eres suficiente","Tu valor no está en duda"],
  love:["Te quiero","Mereces amor"],
 }
});
const MYTUBE_TO_ID=Object.freeze({
 "love-relationships":"love","goals-money":"business",
 "stress-anxiety":"stress","energy-confidence":"energy"
});
const SPECIFIC=Object.freeze({
 ru:{
  "love-self":["Я могу любить и принимать себя","Я ценю себя без сравнения","Мои чувства достойны заботы"],
  "love-trust":["Я даю доверию расти постепенно","Я могу говорить о своих чувствах","Доверие уважает границы"],
  "love-boundaries":["Мои границы важны и в любви","Я могу говорить о своих нуждах","Близость не требует спешки"],
 },
 en:{
  "love-self":["I can love and accept myself","My worth needs no comparison","My feelings deserve care"],
  "love-trust":["I allow trust to grow slowly","I can share how I feel","Trust can honor boundaries"],
  "love-boundaries":["My boundaries matter in love","I can share my needs clearly","Closeness needs no rushing"],
 },
 es:{
  "love-self":["Puedo quererme y aceptarme","Mi valor no pide comparaciones","Mis sentimientos merecen cuidado"],
  "love-trust":["Dejo que crezca la confianza","Puedo expresar lo que siento","La confianza respeta límites"],
  "love-boundaries":["Mis límites importan en el amor","Puedo expresar mis necesidades","La cercanía no exige prisa"],
 },
});
const NO_EXCLUDED=/** @type {string[]} */ ([]);
const normalize=value=>typeof value==="string"?value.normalize("NFKC").toLocaleLowerCase()
  .replace(/\s+/g," ").trim().slice(0,800):"";

/** Reuse the same canonical taxonomy as the Goal page, even for EN text in
 * a RU UI, while allowing the selected legacy theme when the goal is empty. */
/** @param {{locale?:string,request?:string,theme?:string,selectedTopicId?:string|null}} [input] */
export function resolveVideoIdeaContext({locale="ru",request="",theme="energy",selectedTopicId=null}={}){
 const lang=LOCALES.includes(locale)?locale:"ru";
 const text=normalize(request);
 let matched=null;
 if(text)for(const language of [lang,...LOCALES.filter(value=>value!==lang)]){
  const candidate=resolveVideoGoalTopic({request:text,locale:language});
  if(candidate.status==="matched"){matched=candidate;break;}
  // "Любовь" may match two Love subtopics equally. The category is still
  // certain: keep Love and leave the more specific topic unassigned.
  if(candidate.status==="ambiguous"&&candidate.suggestedTopicIds?.length){
   const choices=candidate.suggestedTopicIds.map(id=>VIDEO_GOAL_TOPICS.find(topic=>topic.id===id)?.categoryId);
   if(choices.every(category=>Boolean(category)&&category===choices[0])){
    matched={categoryId:choices[0],topicId:null};
    break;
   }
  }
 }
 const explicit=selectedTopicId?getMyTubeTopic(selectedTopicId):null;
 const categoryId=(explicit&&MYTUBE_TO_ID[explicit.category.id])||matched?.categoryId||THEME_CATEGORY[theme]||null;
 const topicId=explicit?.topic.id||matched?.topicId||null;
 return {
  categoryId,topicId,
  axisIds:AXIS[categoryId]||["anchor"],
  desiredId:DESIRED[categoryId]||"calm",
  // A new request or selected film category must invalidate stale auto-drafts.
  key:[lang,text,categoryId||"neutral",topicId||"",theme,selectedTopicId||""].join("|"),
  source:matched?"goal_request":categoryId?"selected_theme":"neutral",
 };
}

/** The first seven are on-topic. More adds remaining topic phrases, then
 * only meaning-axis context from the same goal; never unrelated topic filler. */
/** @param {{locale?:string,request?:string,theme?:string,axisIds?:string[]|null,current?:string,desired?:string|null,strength?:number,energy?:number,goalType?:"leisure"|"support"|"change"|null,supportNeed?:string|null,selectedTopicId?:string|null,revision?:number,limit?:number,excluded?:string[]}} [input] */
export function suggestVideoGoalPhrases({
 locale="ru",request="",theme="energy",axisIds=null,
 current="fatigue",desired=null,strength=4,energy=6,
 goalType=null,supportNeed=null,selectedTopicId=null,
 revision=0,limit=7,excluded=NO_EXCLUDED,
}={}){
 const context=resolveVideoIdeaContext({locale,request,theme,selectedTopicId});
 const lang=LOCALES.includes(locale)?locale:"ru";
 const axes=Array.isArray(axisIds)&&axisIds.length?axisIds:context.axisIds;
 const topic=SPECIFIC[lang][context.topicId]||[];
 const curated=GOAL_IDEA_LINES[lang][context.categoryId]||[];
 // Topic-specific phrases lead when available; keep the rest explicitly
 // related to the confirmed category instead of switching to 'anchor'.
 const purpose=GOAL_PURPOSE_LINES[lang][goalType]||null;
 const support=goalType==="support"?(SUPPORT_STYLE_LINES[lang][supportNeed]||[]):[];
 const allCurated=[...support,...(purpose||[]),...(goalType?[]:[...topic,...curated])]
   .filter((line,index,arr)=>arr.indexOf(line)===index);
 const rotation=Math.max(0,Number.isInteger(revision)?revision:0)%Math.max(allCurated.length,1);
 const rotated=[...allCurated.slice(rotation),...allCurated.slice(0,rotation)];
 const meaning=goalType==="support"||goalType==="leisure"?[]
   :suggestMeaningPhrases(lang,axes,current,desired||context.desiredId,
     strength,energy,revision,7);
 const selected=new Set(Array.isArray(excluded)?excluded:[]);
 return [...new Set([...rotated,...meaning])].filter(line=>
  !selected.has(line)&&typeof line==="string"&&line.trim().length>0&&
  Array.from(line).length<=36).slice(0,Math.max(1,Math.min(14,limit)));
}

/** Translate only reviewed, index-aligned editorial phrases locally. Unknown user
 * words are preserved verbatim rather than sent to a third party or guessed. */
export function translateVideoGoalPhrase(phrase,sourceLocale="en",targetLocale="ru"){
 if(sourceLocale===targetLocale||!LOCALES.includes(sourceLocale)||!LOCALES.includes(targetLocale))return phrase;
 for(const catalog of [GOAL_PURPOSE_LINES,SUPPORT_STYLE_LINES,GOAL_IDEA_LINES,SPECIFIC,MEANING_LINES,MEANING_DESIRED]){
  const original=catalog[sourceLocale];
  const translated=catalog[targetLocale];
  for(const key of Object.keys(original)){
   const source=original[key],target=translated[key];
   if(Array.isArray(source)){
    const index=source.indexOf(phrase);
    if(index>=0){const result=target?.[index];return typeof result==="string"&&Array.from(result).length<=36?result:phrase;}
   }else if(source===phrase){return typeof target==="string"&&Array.from(target).length<=36?target:phrase;}
  }
 }
 return phrase;
}

/**
 * A preferred first name is only used in the browser-side final phrase.
 * It is never sent with the Concept personalization summary or saved to CRM.
 * All variants fit the existing 36-character Canvas/narration limit.
 */
const PERSONAL_VIDEO_ENDINGS=Object.freeze({
  ru:", я в тебя верю",
  en:", I believe in you",
  es:", creo en ti",
});

export function normalizePersonalVideoName(input){
  if(typeof input!=="string")return "";
  const plain=input.normalize("NFKC").replace(/<[^>]*>/g," ")
    .replace(/[^\p{L}\p{M}\s'’\-]/gu," ")
    .replace(/\s+/g," ").trim().replace(/^[-'’\s]+|[-'’\s]+$/g,"");
  return Array.from(plain).slice(0,18).join("").replace(/[-'’\s]+$/g,"");
}

export function personalVideoClosingPhrase(locale,input){
  const name=normalizePersonalVideoName(input);
  if(!name)return "";
  const ending=PERSONAL_VIDEO_ENDINGS[LOCALES.includes(locale)?locale:"ru"];
  let clipped="";
  for(const char of name){
    if((clipped+char+ending).length>36)break;
    clipped+=char;
  }
  clipped=clipped.trim().replace(/[-'’\s]+$/g,"");
  return clipped?clipped+ending:"";
}

export function appendPersonalVideoClosingPhrase(lines,locale,name){
  const pool=Array.isArray(lines)?lines.filter(line=>typeof line==="string"&&line.trim()):[];
  const closing=personalVideoClosingPhrase(locale,name);
  return closing?[...pool.filter(line=>line!==closing).slice(0,6),closing]:pool.slice(0,7);
}
