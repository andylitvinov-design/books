/**
 * Contextual, offline phrase recommendations for the existing Ideas editor.
 * Goal > canonical topic > current film theme > neutral meaning-axis fallback.
 * Client text never leaves the browser. Suggestions are not approved captions
 * until the visitor selects them in the existing single Canvas/export editor.
 */
import {resolveVideoGoalTopic,VIDEO_GOAL_TOPICS} from "./video-goal-taxonomy.mjs";
import {suggestMeaningPhrases} from "./video-meaning-phrases.mjs";

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
export function resolveVideoIdeaContext({locale="ru",request="",theme="energy"}={}){
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
 const categoryId=matched?.categoryId||THEME_CATEGORY[theme]||null;
 const topicId=matched?.topicId||null;
 return {
  categoryId,topicId,
  axisIds:AXIS[categoryId]||["anchor"],
  desiredId:DESIRED[categoryId]||"calm",
  // A new request or selected film category must invalidate stale auto-drafts.
  key:[lang,text,categoryId||"neutral",topicId||"",theme].join("|"),
  source:matched?"goal_request":categoryId?"selected_theme":"neutral",
 };
}

/** The first seven are on-topic. More adds remaining topic phrases, then
 * only meaning-axis context from the same goal; never unrelated topic filler. */
export function suggestVideoGoalPhrases({
 locale="ru",request="",theme="energy",axisIds=null,
 current="fatigue",desired=null,strength=4,energy=6,
 revision=0,limit=7,excluded=NO_EXCLUDED,
}={}){
 const context=resolveVideoIdeaContext({locale,request,theme});
 const lang=LOCALES.includes(locale)?locale:"ru";
 const axes=Array.isArray(axisIds)&&axisIds.length?axisIds:context.axisIds;
 const topic=SPECIFIC[lang][context.topicId]||[];
 const curated=GOAL_IDEA_LINES[lang][context.categoryId]||[];
 // Topic-specific phrases lead when available; keep the rest explicitly
 // related to the confirmed category instead of switching to 'anchor'.
 const allCurated=[...topic,...curated].filter((line,index,arr)=>arr.indexOf(line)===index);
 const rotation=Math.max(0,Number.isInteger(revision)?revision:0)%Math.max(allCurated.length,1);
 const rotated=[...allCurated.slice(rotation),...allCurated.slice(0,rotation)];
 const meaning=suggestMeaningPhrases(lang,axes,current,desired||context.desiredId,
  strength,energy,revision,7);
 const selected=new Set(Array.isArray(excluded)?excluded:[]);
 return [...new Set([...rotated,...meaning])].filter(line=>
  !selected.has(line)&&typeof line==="string"&&line.trim().length>0&&
  Array.from(line).length<=36).slice(0,Math.max(1,Math.min(14,limit)));
}
