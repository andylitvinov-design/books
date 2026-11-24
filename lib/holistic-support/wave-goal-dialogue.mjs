/** Deterministic, no-provider Wave goal menu. Caller owns safety and consent preflight. */
const COPY={
  "ru": {
    "topics": {
      "money": "финансы",
      "work": "работа и карьера",
      "relationships": "отношения",
      "energy": "ресурсы и энергия",
      "goals": "личная цель",
      "business": "бизнес"
    },
    "intro": "Давай поработаем над твоей целью",
    "question": "Что сейчас важнее для достижения цели?",
    "closing": "Можем начать с 1 пункта.",
    "stages": [
      "Понять, что происходит, и выбрать цель",
      "Прояснить и подкачать цель",
      "Укрепить свой ресурс",
      "Найти путь к цели",
      "Снять внутренние ступоры",
      "Найти новые возможности",
      "Ускорить движение к цели"
    ],
    "questions": [
      "Что сейчас происходит в этой сфере и что ты хотел бы изменить?",
      "Какой результат тебя действительно вдохновляет?",
      "Какие силы, навыки и поддержку ты можешь использовать?",
      "Какой результат ты хочешь получить и какой первый шаг уже возможен?",
      "Что сейчас мешает тебе сделать следующий шаг?",
      "Какие новые варианты ты ещё не рассматривал?",
      "Что ты уже делаешь и где хотел бы ускорить продвижение?"
    ],
    "money": [
      "Что сейчас происходит в твоей финансовой жизни и что ты больше всего хотел бы изменить?",
      "Какой финансовый результат тебя действительно вдохновляет?",
      "Какие способности, знания и ресурсы помогут тебе приблизиться к финансовой цели?",
      "Какой финансовый результат ты хочешь получить и какой первый шаг возможен?",
      "Что сейчас мешает тебе двигаться к финансовой цели?",
      "Какие новые возможности заработка или финансовой устойчивости ты ещё не рассматривал?",
      "Что ты уже делаешь для финансовой цели и где хотел бы ускорить продвижение?"
    ],
    "support": "Что сейчас особенно важно для тебя — чтобы тебя выслушали или помогли найти опору?",
    "understanding": "В какой ситуации ты хотел бы разобраться?"
  },
  "en": {
    "topics": {
      "money": "finances",
      "work": "work and career",
      "relationships": "relationships",
      "energy": "energy and resources",
      "goals": "a personal goal",
      "business": "business"
    },
    "intro": "Let's work on your goal",
    "question": "What matters most for achieving your goal right now?",
    "closing": "We can start with step 1.",
    "stages": [
      "Understand what is happening and choose a goal",
      "Clarify and strengthen your goal",
      "Strengthen your resources",
      "Find a path to your goal",
      "Work through inner blocks",
      "Find new opportunities",
      "Accelerate progress toward your goal"
    ],
    "questions": [
      "What is happening in this area and what would you like to change?",
      "What outcome would genuinely inspire you?",
      "What strengths, skills and support can you draw on?",
      "What outcome do you want, and what first step is possible?",
      "What is getting in the way of your next step?",
      "What options have you not explored yet?",
      "What are you already doing and where would you like to make faster progress?"
    ],
    "money": [
      "What is happening in your financial life, and what would you most like to change?",
      "What financial outcome would genuinely inspire you?",
      "What skills, knowledge and resources could help you reach your financial goal?",
      "What financial outcome do you want, and what first step is possible?",
      "What is getting in the way of your financial goal?",
      "What new income or financial stability opportunities have you not explored?",
      "What are you doing toward your financial goal and where would you like to make faster progress?"
    ],
    "support": "Would you most like to be heard, or to find some support right now?",
    "understanding": "What situation would you like to understand better?"
  },
  "es": {
    "topics": {
      "money": "finanzas",
      "work": "trabajo y carrera",
      "relationships": "relaciones",
      "energy": "energía y recursos",
      "goals": "una meta personal",
      "business": "negocio"
    },
    "intro": "Trabajemos en tu meta",
    "question": "¿Qué es lo más importante ahora para alcanzar tu meta?",
    "closing": "Podemos empezar por el punto 1.",
    "stages": [
      "Entender qué sucede y elegir una meta",
      "Aclarar y fortalecer tu meta",
      "Fortalecer tus recursos",
      "Encontrar un camino hacia tu meta",
      "Trabajar los bloqueos internos",
      "Encontrar nuevas oportunidades",
      "Acelerar el avance hacia tu meta"
    ],
    "questions": [
      "¿Qué sucede en esta área y qué te gustaría cambiar?",
      "¿Qué resultado te inspiraría de verdad?",
      "¿En qué fortalezas, habilidades y apoyos puedes contar?",
      "¿Qué resultado quieres y qué primer paso es posible?",
      "¿Qué dificulta tu siguiente paso?",
      "¿Qué opciones aún no has explorado?",
      "¿Qué haces ya y dónde te gustaría avanzar más rápido?"
    ],
    "money": [
      "¿Qué sucede en tu vida financiera y qué te gustaría cambiar primero?",
      "¿Qué resultado financiero te inspiraría de verdad?",
      "¿Qué habilidades, conocimientos y recursos podrían ayudarte con tu meta financiera?",
      "¿Qué resultado financiero buscas y qué primer paso es posible?",
      "¿Qué dificulta tu avance hacia la meta financiera?",
      "¿Qué nuevas opciones de ingresos o estabilidad financiera no has explorado?",
      "¿Qué haces ya para tu meta financiera y dónde te gustaría avanzar más rápido?"
    ],
    "support": "¿Necesitas que te escuchen o encontrar apoyo en este momento?",
    "understanding": "¿Qué situación te gustaría comprender mejor?"
  }
};
function normalizeWaveGoal(v){return String(v??"").normalize("NFKC").toLowerCase().replace(/ё/g,"е").replace(/[.!?,;:¡¿]+/g," ").replace(/\s+/g," ").trim();}

export function buildWaveGoalMenu(topic="goals",locale="en"){const lang=Object.hasOwn(COPY,locale)?locale:"en";const c=COPY[lang];const key=Object.hasOwn(c.topics,topic)?topic:"goals";const intro=c.intro+" — "+c.topics[key]+".";return {topic:key,locale:lang,intro,question:c.question,closing:c.closing,stages:c.stages,reply:[intro,c.question,...c.stages.map((s,i)=>`${i+1}. ${s}`),c.closing].join("\n")};}

export function readWaveGoalMenu(text){for(const locale of Object.keys(COPY))for(const topic of Object.keys(COPY[locale].topics)){const menu=buildWaveGoalMenu(topic,locale);if(menu.reply===text)return menu;}return null;}

export const WAVE_GOAL_STAGE_IDS=Object.freeze(['goal-clarify','goal-vision','goal-resources','goal-plan','goal-blocks','goal-opportunities','goal-momentum']);
export function waveGoalTopic(message){return namedGoalTopic(normalizeWaveGoal(message));}
function namedGoalTopic(t){
 if(/^(?:(?:про|о|about|sobre) )?(?:деньги|денег|дай денег(?: пожалуйста)?|пожалуйста дай денег|мне нужны деньги|финансы|финансах|заработок|доходы?|money|give me money(?: please)?|i need money|finances|income|dinero|dame dinero(?: por favor)?|necesito dinero|finanzas|ingresos)$/.test(t)||/^(?:хочу (?:больше зарабатывать|увеличить доход|заработать больше)|i want to (?:earn more|increase my income)|quiero (?:ganar más|aumentar mis ingresos))$/.test(t))return "money";
 if(/^(?:работа|карьера|work|career|trabajo|carrera|хочу найти работу|i want to find a job|quiero encontrar trabajo)$/.test(t))return "work";
 if(/^(?:бизнес|business|negocio|хочу развить бизнес|i want to grow my business|quiero hacer crecer mi negocio)$/.test(t))return "business";
 if(/^(?:хочу улучшить отношения|i want to improve my relationships|quiero mejorar mis relaciones)$/.test(t))return "relationships";
 if(/^(?:цель|цели|найти и достичь цель|найти и достичь цели|достижение цели|хочу достичь цели|хочу начать коучинг|goals?|achieve a goal|coaching|metas?|objetivos?|alcanzar una meta)$/.test(t))return "goals";
 return null;
}

const TOPIC_RESET=/^(?:стоп|сменить тему|сменим тему|новая тема|другая тема|начать сначала|stop|new topic|start over|otro tema|cambiar de tema)$/;
const MEDIA_REQUEST=/^(?:(?:хочу|давай|i want to|quiero) )?(?:(?:создать|создай|сделать|сделай|подобрать|подбери|найти|включи|create|make|find|play|crear|hacer|buscar) )?(?:видео|медитаци[юя]|практику|video|meditation|practice|vídeo|meditaci[oó]n)(?: |$)/;
export function waveHasMediaContext(history=[]){
 for(const row of [...history].reverse()){
  if(row.localOnly===true)continue;
  if(row.role==='assistant'&&readWaveGoalMenu(row.text))return false;
  if(row.role!=='user')continue;
  const text=normalizeWaveGoal(row.text);
  if(TOPIC_RESET.test(text))return false;
  if(MEDIA_REQUEST.test(text))return true;
  if(/^(?:найти и достичь|find and achieve|encontrar y alcanzar)/.test(text))return false;
 }
 return false;
}
export function waveDialoguePreferences(history=[]){
 const result={noAdvice:false,noQuestions:false};
 for(const row of history){
  if(row?.role!=='user'||row.localOnly===true)continue;
  const text=normalizeWaveGoal(row.text);
  if(TOPIC_RESET.test(text)){result.noAdvice=false;result.noQuestions=false;continue;}
  if(/без советов|не (?:хочу|надо) советов|не давай совет(?:ы|ов)|не советуй|не предлагай ничего|просто (?:выслушай|послушай)|no advice|without advice|i don['’]?t want advice|don['’]?t give me advice|don['’]?t suggest anything|just listen|please listen|sin consejos|no (?:quiero|necesito) consejos|no propongas nada|solo esc[uú]cha(?:me)?|esc[uú]chame/.test(text))result.noAdvice=true;
  else if(/дай совет|можешь посоветовать|теперь (?:хочу|можно) совет|давай обсудим шаг|можешь предложить вариант|give me advice|now i want advice|you can suggest options now|let['’]?s consider options|dame un consejo|ahora quiero consejos|puedes proponer opciones|volvamos a las opciones/.test(text))result.noAdvice=false;
  if(/без вопросов|не задавай (?:мне )?вопрос|no questions|don['’]?t ask questions|sin preguntas|no me preguntes/.test(text))result.noQuestions=true;
  else if(/можешь задать вопрос|давай вопросы|спроси меня|you can ask|ask me a question|puedes preguntar/.test(text))result.noQuestions=false;
 }
 return result;
}
export function waveGoalTopicFromHistory(history=[]){
 for(const row of [...history].reverse()){
  if(row.localOnly===true)continue;
  const menu=row.role==='assistant'?readWaveGoalMenu(row.text):null;
  if(menu&&menu.topic!=='goals')return menu.topic;
  if(row.role!=='user')continue;
  const text=normalizeWaveGoal(row.text);
  if(TOPIC_RESET.test(text)||MEDIA_REQUEST.test(text))break;
  const named=namedGoalTopic(text);
  if(named&&named!=='goals')return named;
  if(/деньг|денег|финанс|доход|money|income|financ|dinero|ingresos/.test(text))return 'money';
 }
 return null;
}
export function readWaveGoalStage(text){
 for(const locale of Object.keys(COPY))for(let i=0;i<7;i++){
  const c=COPY[locale];
  if(text===c.stages[i]+'. '+c.money[i])return {stage:i+1,topic:'money',locale};
  if(text===c.stages[i]+'. '+c.questions[i])return {stage:i+1,topic:'goals',locale};
 }
 return null;
}
/** Recover a selected step only within the current voluntary goal conversation. */
export function waveGoalStageFromHistory(history=[]){
 const rows=Array.isArray(history)?history.filter(row=>row&&row.localOnly!==true):[];
 for(let i=rows.length-1;i>=0;i--){
  const row=rows[i];
  if(row.role==='assistant'){
   const selected=readWaveGoalStage(row.text);
   if(selected)return {...selected,topic:selected.topic==='goals'?(waveGoalTopicFromHistory(rows.slice(0,i+1))||'goals'):selected.topic};
   if(readWaveGoalMenu(row.text))return null;
  }
  if(row.role!=='user')continue;
  const words=normalizeWaveGoal(row.text);
  if(TOPIC_RESET.test(words)||MEDIA_REQUEST.test(words)||
    /^(?:поговорить и снять напряжение|понять что происходит|talk and ease tension|understand what is happening|hablar y aliviar la tensión|entender qué está pasando)$/.test(words)||
    /^(?:хочу (?:просто )?поговорить|мне нужна поддержка|хочу понять|хочу разобраться|i need support|i want to (?:talk|understand)|quiero (?:hablar|entender)|necesito apoyo)(?: |$)/.test(words))return null;
 }
 return null;
}
export function isWaveGoalStageLabel(text){const normalized=normalizeWaveGoal(text);return Object.values(COPY).some(c=>c.stages.some(label=>normalizeWaveGoal(label)===normalized));}

/** @param {{message?:string,locale?:string,history?:Array<{role:string,text:string,localOnly?:boolean}>,allowNewGoal?:boolean}} [input] */
export function waveGoalDialogueTurn({message="",locale="en",history=[],allowNewGoal=true}={}){
 const t=normalizeWaveGoal(message),lang=Object.hasOwn(COPY,locale)?locale:"en",c=COPY[lang];const rows=Array.isArray(history)?history.filter(r=>r&&r.localOnly!==true):[];
 if(/^(?:поддержка|поговорить и снять напряжение|нужна поддержка|хочу поддержки|support|i need support|apoyo|necesito apoyo)$/.test(t))return {reply:c.support,kind:"support"};
 if(/^(?:понимание|понять что происходит|хочу разобраться|хочу понять что происходит|understanding|i want to understand|comprensión|quiero entender)$/.test(t))return {reply:c.understanding,kind:"understanding"};
 const preferences=waveDialoguePreferences([...rows,{role:'user',text:message}]);
 if(preferences.noAdvice||preferences.noQuestions)return null;
 if(waveHasMediaContext(rows)&&!(/^(?:хочу|дай денег|give me money|i want|dame dinero|quiero|найти и достичь)/.test(t)&&namedGoalTopic(t)))return null;
 const last=rows.at(-1);const menu=last?.role==="assistant"?readWaveGoalMenu(last.text):null;
 if(menu){
   const menuCopy=COPY[menu.locale];let i=menu.stages.findIndex(s=>normalizeWaveGoal(s)===t);
   const number=t.match(/^(?:пункт |шаг |step |point |paso |punto )?([1-7])(?: пункт| шаг| step| point| paso| punto)?$/);
   if(number)i=Number(number[1])-1;
   if(/^(?:да|давай|начнем|давай начнем|давай с первого|с первого|можем начать с 1 пункта|yes|let's start|start|sí|si|empecemos)$/.test(t))i=0;
   if(i>=0){const question=menu.topic==="money"?menuCopy.money[i]:menuCopy.questions[i];return {reply:menu.stages[i]+". "+question,kind:"stage",topic:menu.topic,stage:i+1,stageId:WAVE_GOAL_STAGE_IDS[i]};}
 }
 if(!allowNewGoal)return null;
 let topic=namedGoalTopic(t);
 const activeStage=waveGoalStageFromHistory(rows);
 // A short answer naming the same topic is an answer to the selected step.
 if(topic&&topic===activeStage?.topic&&
   !/^(?:хочу |дай денег|пожалуйста дай денег|мне нужны |i want |give me |i need |quiero |dame |necesito |найти и достичь |find and achieve |encontrar y alcanzar )/.test(t))return null;
 if(topic==="goals")topic=waveGoalTopicFromHistory(rows)||topic;
 if(!topic&&/^(?:я (?:ж |же )?сказал уже|я уже сказал|я уже говорил|i already said that|ya te lo dije)$/.test(t)){
   for(const row of rows.slice(-12).reverse()){if(row.role!=="user")continue;const previous=normalizeWaveGoal(row.text);if(/^(?:стоп|сменить тему|сменим тему|новая тема|другая тема|stop|new topic|otro tema|поддержка|понимание|support|understanding|apoyo|comprensión)$/.test(previous))break;if(/^(?:хочу |создай |create |quiero )?(?:видео|video|meditation|медитацию)(?: |$)/.test(previous))break;topic=namedGoalTopic(previous);if(topic)break;}
 }
 if(!topic)return null;
 return {reply:buildWaveGoalMenu(topic,lang).reply,kind:"menu",topic};
}
