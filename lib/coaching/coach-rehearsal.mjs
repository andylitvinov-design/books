// Shared Director-owned authored rehearsal mode. No inference, provider, persistence or clinical claims.
const scenarios=[
 [
  "boundaries",
  [
   "Personal boundaries",
   "Person making a request",
   "You are the person setting a limit.",
   "Could you take this on today?",
   "I was counting on you. Is there anything you can offer?",
   "When should I ask again?",
   "What if it is urgent?",
   "I cannot take that on today. I can offer a shorter check-in tomorrow."
  ],
  [
   "Личные границы",
   "Человек с просьбой",
   "Вы обозначаете свою границу.",
   "Можешь взяться за это сегодня?",
   "Я рассчитывал на тебя. Что ты всё-таки можешь предложить?",
   "Когда можно обратиться снова?",
   "А если это срочно?",
   "Сегодня я не могу взять это на себя. Завтра могу предложить короткое обсуждение."
  ],
  [
   "Límites personales",
   "Persona que pide algo",
   "Tú estableces un límite.",
   "¿Puedes ocuparte de esto hoy?",
   "Contaba contigo. ¿Qué sí puedes ofrecer?",
   "¿Cuándo puedo volver a preguntar?",
   "¿Y si es urgente?",
   "Hoy no puedo encargarme de esto. Mañana puedo ofrecer una breve conversación."
  ]
 ],
 [
  "feedback",
  [
   "Giving feedback",
   "Colleague",
   "You are giving feedback.",
   "You wanted to discuss my work. What happened?",
   "I see it differently. Can you give an example?",
   "What change would be useful?",
   "How can we agree on a fair next step?",
   "When the deadline changed, I was unsure what to prioritize. Could we agree on a shared plan?"
  ],
  [
   "Обратная связь",
   "Коллега",
   "Вы даёте обратную связь.",
   "Ты хотел обсудить мою работу. Что произошло?",
   "Я вижу это иначе. Можешь привести пример?",
   "Какое изменение было бы полезно?",
   "Как согласовать справедливый следующий шаг?",
   "Когда срок изменился, мне стало неясно, что в приоритете. Можем согласовать общий план?"
  ],
  [
   "Dar retroalimentación",
   "Colega",
   "Tú das retroalimentación.",
   "Querías hablar de mi trabajo. ¿Qué pasó?",
   "Lo veo de otra manera. ¿Puedes dar un ejemplo?",
   "¿Qué cambio sería útil?",
   "¿Cómo acordamos un siguiente paso justo?",
   "Cuando cambió el plazo, no supe qué priorizar. ¿Podemos acordar un plan?"
  ]
 ],
 [
  "salary",
  [
   "Salary conversation",
   "Manager",
   "You are the employee asking for a review.",
   "What would you like to discuss?",
   "What evidence supports your request?",
   "What outcome would be acceptable if we cannot agree today?",
   "How could we review this at a later date?",
   "I'd like to review my compensation based on these results and agree on the next decision date."
  ],
  [
   "Разговор о зарплате",
   "Руководитель",
   "Вы сотрудник, который просит пересмотреть оплату.",
   "Что вы хотели обсудить?",
   "Какие результаты подтверждают вашу просьбу?",
   "Какой итог устроит вас, если сегодня не договоримся?",
   "Как мы можем вернуться к вопросу позже?",
   "Я хотел бы обсудить оплату с учётом этих результатов и согласовать дату следующего решения."
  ],
  [
   "Conversación salarial",
   "Responsable",
   "Tú solicitas una revisión salarial.",
   "¿Qué te gustaría hablar?",
   "¿Qué resultados respaldan tu petición?",
   "¿Qué resultado aceptarías si hoy no llegamos a un acuerdo?",
   "¿Cómo podríamos revisarlo más adelante?",
   "Quisiera revisar mi salario según estos resultados y acordar una fecha de decisión."
  ]
 ],
 [
  "conflict",
  [
   "Relationship disagreement",
   "Partner",
   "You are opening a respectful conversation.",
   "You seem to want to talk. What is important to you?",
   "I experienced that differently. What would you like me to understand?",
   "What can we try differently next time?",
   "What if we need some time before continuing?",
   "I would like us to discuss what happened without blaming each other. Can we agree on a time?"
  ],
  [
   "Конфликт в отношениях",
   "Партнёр",
   "Вы начинаете уважительный разговор.",
   "Ты хочешь поговорить. Что для тебя важно?",
   "Я воспринимал это иначе. Что ты хочешь, чтобы я понял?",
   "Что мы можем попробовать иначе в следующий раз?",
   "А если нам нужно время перед продолжением?",
   "Я хотел бы обсудить случившееся без взаимных обвинений. Можем выбрать время?"
  ],
  [
   "Desacuerdo de pareja",
   "Pareja",
   "Tú inicias una conversación respetuosa.",
   "Quieres hablar. ¿Qué es importante para ti?",
   "Lo viví de otra manera. ¿Qué quieres que comprenda?",
   "¿Qué podemos intentar de otra forma?",
   "¿Y si necesitamos tiempo antes de seguir?",
   "Quisiera hablar de lo ocurrido sin culparnos. ¿Podemos acordar un momento?"
  ]
 ],
 [
  "negotiation",
  [
   "Negotiation",
   "Business counterpart",
   "You are negotiating a proposal.",
   "What are you proposing?",
   "I have a different budget or constraint. What options are there?",
   "What conditions could work for both sides?",
   "What should we confirm before making a commitment?",
   "I understand that budget matters. We can discuss two options with clear scope and trade-offs."
  ],
  [
   "Переговоры",
   "Деловой партнёр",
   "Вы обсуждаете предложение.",
   "Что вы предлагаете?",
   "У меня другой бюджет или ограничение. Какие есть варианты?",
   "Какие условия могли бы устроить обе стороны?",
   "Что важно проверить перед обязательством?",
   "Понимаю, что бюджет важен. Давайте обсудим два варианта с ясными условиями и компромиссами."
  ],
  [
   "Negociación",
   "Contraparte comercial",
   "Tú negocias una propuesta.",
   "¿Qué propones?",
   "Tengo otro presupuesto o límite. ¿Qué opciones hay?",
   "¿Qué condiciones podrían funcionar para ambos?",
   "¿Qué debemos confirmar antes de comprometernos?",
   "Entiendo que importa el presupuesto. Podemos hablar de dos opciones con condiciones claras."
  ]
 ],
 [
  "interview",
  [
   "Job interview",
   "Interviewer",
   "You are the candidate.",
   "Tell me about your relevant experience.",
   "Describe a challenge and what you actually did.",
   "What would you like to learn about this role?",
   "What would you do if priorities changed?",
   "In one project I faced a specific challenge, took these actions and learned from the result."
  ],
  [
   "Собеседование",
   "Интервьюер",
   "Вы кандидат.",
   "Расскажите о релевантном опыте.",
   "Опишите сложность и то, что вы действительно сделали.",
   "Что вы хотели бы узнать об этой роли?",
   "Как вы поступите, если приоритеты изменятся?",
   "В одном проекте я столкнулся с конкретной трудностью, предпринял такие действия и извлёк урок из результата."
  ],
  [
   "Entrevista de trabajo",
   "Entrevistador",
   "Tú eres la persona candidata.",
   "Cuéntame tu experiencia relevante.",
   "Describe un reto y lo que realmente hiciste.",
   "¿Qué te gustaría saber sobre este puesto?",
   "¿Qué harías si cambian las prioridades?",
   "En un proyecto afronté un reto concreto, tomé estas acciones y aprendí del resultado."
  ]
 ]
];
export const REHEARSAL_VERSION=1;
const feedbackCopy={"en":{"question":"You asked a question in this reply.","own":"You put a response into your own words."},"ru":{"question":"В этой реплике вы задали вопрос.","own":"Вы сформулировали ответ своими словами."},"es":{"question":"Hiciste una pregunta en esta respuesta.","own":"Formulaste una respuesta con tus propias palabras."}};
// Only authored counterpart prompts. Never interpolate the client's words into speech.
const adaptiveCopy={
  "en": {
    "boundaries": [
      "Which part of the request would you like me to clarify?",
      "We can consider a smaller request. What, if anything, could you offer?"
    ],
    "feedback": [
      "Which part of my perspective would you like me to explain?",
      "Let us focus on one observable example. What happened?"
    ],
    "salary": [
      "Which part of the review process should we clarify first?",
      "We do not need a number yet. What result would you like us to review?"
    ],
    "conflict": [
      "What would you like to understand about my point of view?",
      "We can slow down. What is one thing you would like me to understand?"
    ],
    "negotiation": [
      "Which part of the proposed conditions would you like to clarify?",
      "We can consider options before committing. Which constraint is important?"
    ],
    "interview": [
      "Which aspect of this role would you like me to clarify?",
      "You can choose a simple example from your experience. What did you do?"
    ]
  },
  "ru": {
    "boundaries": [
      "Какую часть моей просьбы вам хотелось бы уточнить?",
      "Можно рассмотреть меньшую просьбу. Что, если вообще что-то, вы могли бы предложить?"
    ],
    "feedback": [
      "Какую часть моей точки зрения вам хотелось бы прояснить?",
      "Давайте обсудим один конкретный пример. Что произошло?"
    ],
    "salary": [
      "Какую часть процесса пересмотра оплаты важно уточнить сначала?",
      "Необязательно сразу называть сумму. Какие результаты вы хотели бы обсудить?"
    ],
    "conflict": [
      "Что вам хотелось бы понять в моей точке зрения?",
      "Мы можем не торопиться. Какую одну вещь вам важно, чтобы я понял?"
    ],
    "negotiation": [
      "Какую часть предложенных условий вы хотели бы уточнить?",
      "Можно рассмотреть варианты до принятия обязательств. Какое ограничение для вас важно?"
    ],
    "interview": [
      "Какую сторону этой должности вы хотели бы уточнить?",
      "Можно выбрать простой пример из вашего опыта. Что вы сделали?"
    ]
  },
  "es": {
    "boundaries": [
      "¿Qué parte de mi petición te gustaría aclarar?",
      "Podemos considerar una petición más pequeña. ¿Qué podrías ofrecer, si quieres?"
    ],
    "feedback": [
      "¿Qué parte de mi perspectiva te gustaría que explicara?",
      "Centrémonos en un ejemplo observable. ¿Qué ocurrió?"
    ],
    "salary": [
      "¿Qué parte del proceso de revisión te gustaría aclarar primero?",
      "No necesitamos una cifra aún. ¿Qué resultado te gustaría revisar?"
    ],
    "conflict": [
      "¿Qué te gustaría comprender de mi punto de vista?",
      "Podemos ir despacio. ¿Qué es lo que más te gustaría que comprendiera?"
    ],
    "negotiation": [
      "¿Qué parte de las condiciones propuestas te gustaría aclarar?",
      "Podemos considerar opciones antes de comprometernos. ¿Qué limitación es importante?"
    ],
    "interview": [
      "¿Qué aspecto de este puesto te gustaría aclarar?",
      "Puedes elegir un ejemplo sencillo de tu experiencia. ¿Qué hiciste?"
    ]
  }
};
const uncertaintyCopy={"en":"You explicitly said you were unsure. Consider naming one concrete point you can answer.","ru":"Вы прямо обозначили неуверенность. Можно назвать один конкретный пункт, на который вы готовы ответить.","es":"Expresaste explícitamente una duda. Puedes nombrar un punto concreto que estés dispuesto a responder."};

export function rehearsalCatalog(locale='en'){const i={en:1,ru:2,es:3}[locale]||1;return scenarios.map(s=>({id:s[0],title:s[i][0],counterpart:s[i][1],role:s[i][2],prompts:s[i].slice(3,7),example:s[i][7],version:REHEARSAL_VERSION}))}

function clean(value,max){if(typeof value!=='string'||!value.trim()||value.length>max)throw Error('INVALID_REHEARSAL_TEXT');return value.trim()}

export function rehearsalReplyCue(value,locale){
 if(typeof value!=='string')return 'none';
 if(/[?？]/u.test(value))return 'question';
 const pattern=locale==='ru'?/(?:не знаю|не уверен[а]?|затрудняюсь|не могу пока ответить)/iu:locale==='es'?/(?:no sé|no estoy segur[oa]|no lo tengo claro|no sé cómo responder)/iu:/\b(?:not sure|unsure|i don['’]t know|i do not know|i am uncertain|i['’]m uncertain)\b/iu;
 return pattern.test(value)?'uncertainty':'none';
}

export function createCoachRehearsal({scenarioId,locale='en',difficulty='standard',goal,adaptive=false}){if(!Object.hasOwn(feedbackCopy,locale)||!['standard','challenge'].includes(difficulty)||typeof adaptive!=='boolean'||!rehearsalCatalog(locale).some(s=>s.id===scenarioId))throw Error('INVALID_REHEARSAL_CONFIG');return {version:REHEARSAL_VERSION,scenarioId,locale,difficulty,goal:clean(goal,300),answers:[],adaptive}}

function checkedRehearsal(state){if(!state||state.version!==REHEARSAL_VERSION||!Object.hasOwn(feedbackCopy,state.locale)||!['standard','challenge'].includes(state.difficulty)||!Array.isArray(state.answers)||(state.adaptive!==undefined&&typeof state.adaptive!=='boolean'))throw Error('INVALID_REHEARSAL');const scenario=rehearsalCatalog(state.locale).find(s=>s.id===state.scenarioId);const limit=state.difficulty==='challenge'?4:3;if(!scenario||state.answers.length>limit)throw Error('INVALID_REHEARSAL');clean(state.goal,300);state.answers.forEach(a=>clean(a,800));return {scenario,limit}}

function adaptiveRehearsalPrompt(state,scenario,index){
 if(state.adaptive!==true||index===0)return scenario.prompts[index];
 const cue=rehearsalReplyCue(state.answers[index-1],state.locale);
 if(cue==='none'||state.answers.slice(0,index-1).some(a=>rehearsalReplyCue(a,state.locale)===cue))return scenario.prompts[index];
 return adaptiveCopy[state.locale][scenario.id][cue==='question'?0:1];
}

export function coachRehearsalView(state){const {scenario,limit}=checkedRehearsal(state);const index=state.answers.length;return {scenario,limit,index,done:index===limit,prompt:index===limit?null:adaptiveRehearsalPrompt(state,scenario,index)}}

export function advanceCoachRehearsal(state,answer){const view=coachRehearsalView(state);if(view.done)throw Error('REHEARSAL_FINISHED');return {...state,answers:[...state.answers,clean(answer,800)]}}

export function coachRehearsalFeedback(state){const view=coachRehearsalView(state);if(!view.done)throw Error('REHEARSAL_INCOMPLETE');const questionIndex=state.answers.findIndex(a=>rehearsalReplyCue(a,state.locale)==='question');const uncertaintyIndex=state.adaptive===true?state.answers.findIndex(a=>rehearsalReplyCue(a,state.locale)==='uncertainty'):-1;const index=questionIndex>=0?questionIndex:uncertaintyIndex>=0?uncertaintyIndex:state.answers.length-1;return {source:'actual_client_reply',replyIndex:index,evidenceQuote:state.answers[index],strength:questionIndex>=0?feedbackCopy[state.locale].question:uncertaintyIndex>=0?uncertaintyCopy[state.locale]:feedbackCopy[state.locale].own,example:view.scenario.example,goal:state.goal}}

export function appendRehearsalDictation(draft,delta){if(typeof draft!=='string'||typeof delta!=='string'||!delta.trim())return typeof draft==='string'?draft.slice(0,800):'';const left=draft.trimEnd();return (left?left+' '+delta.trim():delta.trim()).slice(0,800)}
