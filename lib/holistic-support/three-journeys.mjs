/**
 * Holistic House • three voluntary dialogue journeys.
 * This is response guidance for the SAME Messenger, not a new chatbot,
 * a diagnosis, a therapy provider or a booking engine.
 * Authentication, safety, consent, storage and signed choices remain host-owned.
 * No client score, private notes, provider call or persistent state.
 */
export const THREE_JOURNEYS_VERSION='hh-three-journeys-v1-20261123';
export const THREE_JOURNEY_PATHS=Object.freeze(['therapy','consultation','goal']);
const langs=new Set(['ru','en','es']);
const texts={
 ru:{
  names:{therapy:'Поговорить',consultation:'Разобраться',goal:'Достичь цели'},
  intros:{
   therapy:'Я здесь, чтобы спокойно тебя выслушать. Не обязательно сейчас что-то решать. Что хочется рассказать?',
   consultation:'Давай разберёмся в ситуации без спешки. Можем поговорить, подобрать подходящий тест или бесплатный разбор. Что хочется понять в первую очередь?',
   goal:'Расскажи о своей цели своими словами. Если цель пока расплывчата, мы её проясним; если уже ясна — найдём ближайший полезный шаг.',
  },
  pause:'Хорошо, без советов, упражнений и предложений. Можешь продолжать в своём темпе.',
  noquestions:'Хорошо, без вопросов. Можешь продолжать, если хочется.',
  tired:'Ты говоришь, что сейчас мало сил. Здесь необязательно сразу превращать переживания в задачи. Можем просто поговорить.',
  sad:'Ты описываешь непростое переживание. Я слушаю. Что было особенно тяжёлым?',
  therapy:'Можем уделить этому время, не требуя от себя немедленного решения. Что сейчас важнее всего для тебя?',
  therapyOptions:'Можно попробовать мягкую практику или медитацию, если тебе это подходит. Никакого обязательства: ты сам выбираешь темп.',
  consultIntro:'Чтобы понять ситуацию, начнём с одного конкретного примера. Что происходит сейчас?',
  consultNoIdea:'Можно начать с работы, отношений или внутреннего состояния. Не обязательно сразу выбирать решение.',
  consultTests:'Для прояснения ситуации можно выбрать подходящий тест в нашей библиотеке. Он помогает сориентироваться, но не заменяет профессиональную диагностику.',
  consultDiagnostic:'Можно воспользоваться бесплатным разбором ситуации. Ты сам решишь, чем поделиться и нужно ли продолжать.',
  consultCoach:'Можно обсудить ситуацию с ИИ-коучем или обратиться к живому специалисту. Подбор формата не означает запись.',
  consultFollow:'Я помогу отделить саму ситуацию от предположений. Что для тебя сейчас в ней самое трудное?',
  goalQuestion:'С какой целью хочешь поработать? Достаточно одного предложения.',
  goalUncertain:'Начнём с самого простого: можем исследовать желание или взять один конкретный пример, чтобы сформулировать пробную цель.',
  goal2:'Направление уже намечено. Как поймёшь, что результат стал ближе?',
  goal3:'Прежде чем требовать от себя большего, посмотрим на ресурсы. На что уже можешь опереться?',
  goal4:'Можно разбить цель на небольшие действия. Какой первый шаг реально выполнить без перегрузки?',
  goal5:'Вижу препятствие, о котором ты говоришь. Что именно останавливает тебя в момент действия?',
  goal6:'Не обязательно идти только одним путём. Давай рассмотрим пару других, более безопасных вариантов.',
  goal7:'Можно посмотреть, что уже сработало, а что стоит изменить. Какой реальный сдвиг ты замечаешь?',
  goalProgram:'Для пути к цели можно рассмотреть 7 встреч, по одной на каждый этап: с ИИ-коучем, с живым специалистом или в смешанном формате. Это варианты программы, а не подтверждённая запись или оплата. Какой формат тебе интереснее?',
  goalHuman:'Ты выбрал работу с живым специалистом. Семь встреч могут охватить цель, смысл, ресурсы, план, препятствия, возможности и прогресс. Можно посмотреть доступные форматы консультаций; конкретная программа и расписание требуют отдельного подтверждения.',
  goalAI:'Ты выбрал ИИ-формат. Семь встреч могут последовательно пройти все этапы, но это пока сценарий программы, а не купленный курс. Можно начать с беседы с ИИ-коучем.',
  goalMixed:'В смешанном формате можно сочетать работу с ИИ и живые встречи на этапах, где нужен человеческий взгляд. Сначала уточним распределение семи встреч — ничего не записываем автоматически.',
  short:'Можем продолжить без спешки. Или я могу предложить два небольших варианта — выбирать необязательно.',
 },
 en:{
  names:{therapy:'Talk',consultation:'Understand',goal:'Reach a goal'},
  intros:{
   therapy:'I am here to listen at your pace. Nothing needs to be solved right now. What would you like to share?',
   consultation:'We can make sense of your situation at your pace. We could talk, explore a relevant test, or a free situation review. What would you like to understand?',
   goal:'Tell me about your goal in your own words. If it is unclear, we can clarify it; if it is clear, we can find the next useful step.',
  },
  pause:'Okay, no advice, exercises or offers. You can keep talking at your own pace.',
  noquestions:'Okay, no questions. You can continue whenever you like.',
  tired:'You are describing low energy. You do not need to turn that into a task right now. We can just talk.',
  sad:'You are describing a difficult experience. I am listening. What has been hardest?',
  therapy:'We can stay with this without rushing to fix it. What matters most to you right now?',
  therapyOptions:'We could look at a gentle practice or meditation if that appeals to you. You decide; there is no obligation.',
  consultIntro:'One concrete example may help us understand the situation. What is happening now?',
  consultNoIdea:'We could start with work, relationships, or how you are feeling. There is no need to choose a solution yet.',
  consultTests:'You can explore a relevant questionnaire in our tests library. It may help you reflect, but it is not a clinical diagnosis.',
  consultDiagnostic:'You could start with a free situation review. You control what you share and whether to go further.',
  consultCoach:'You can explore an AI coach or talk with a human professional. Looking at options does not book a session.',
  consultFollow:'We can separate what happened from assumptions about it. What is hardest about this situation?',
  goalQuestion:'What goal would you like to work on? One sentence is enough.',
  goalUncertain:'We can explore a wish or start with a concrete example to draft a possible goal.',
  goal2:'You have a direction in mind. What would tell you that you are getting closer?',
  goal3:'Before pushing harder, let us look at your resources. What can you already draw on?',
  goal4:'We can break this into small actions. What first step would feel manageable?',
  goal5:'You have named an obstacle. What tends to stop you at the moment of action?',
  goal6:'There may be more than one path. We could compare two safer alternatives.',
  goal7:'Let us look at what has worked and what needs adjusting. What actual progress have you noticed?',
  goalProgram:'We can explore a seven-meeting journey, with one meeting for each stage: AI coach, human specialist, or a mix. These are format options, not a confirmed booking or payment. Which interests you?',
  goalHuman:'You chose a human specialist. Seven meetings could cover the goal, meaning, resources, plan, obstacles, possibilities, and progress. You can explore available session formats; the exact program and schedule still require confirmation.',
  goalAI:'You chose an AI-led format. Seven meetings could explore the stages in sequence, but this is a program outline, not a purchased course. You can start by talking with an AI coach.',
  goalMixed:'A mixed format could combine AI work with human sessions where a human perspective is valuable. We would first agree how to divide the seven meetings, without automatically booking anything.',
  short:'We can keep talking without pressure, or I can suggest two small options. No need to decide.',
 },
 es:{
  names:{therapy:'Hablar',consultation:'Comprender',goal:'Lograr una meta'},
  intros:{
   therapy:'Estoy aquí para escucharte con calma. No hay que resolver nada ahora. ¿Qué te gustaría contar?',
   consultation:'Podemos comprender tu situación con calma. Hablar, explorar una prueba o una revisión gratuita. ¿Qué quieres comprender?',
   goal:'Cuéntame tu meta con tus palabras. Si no está clara, podemos definirla; si ya lo está, elegimos un paso útil.',
  },
  pause:'De acuerdo, sin consejos, ejercicios ni ofertas. Puedes seguir a tu ritmo.',
  noquestions:'De acuerdo, sin preguntas. Puedes continuar cuando quieras.',
  tired:'Estás contando que tienes poca energía. No hace falta convertirlo en una tarea. Podemos hablar.',
  sad:'Estás describiendo algo difícil. Te escucho. ¿Qué ha sido lo más duro?',
  therapy:'Podemos hablarlo sin prisa ni obligación de solucionarlo. ¿Qué es lo más importante ahora?',
  therapyOptions:'Podemos explorar una práctica suave o meditación, si te interesa. Tú eliges; no es obligatorio.',
  consultIntro:'Un ejemplo concreto puede ayudar. ¿Qué está ocurriendo ahora?',
  consultNoIdea:'Podemos empezar por el trabajo, las relaciones o tu estado emocional. No hace falta decidir una solución.',
  consultTests:'Puedes explorar un cuestionario de nuestra biblioteca. Ayuda a reflexionar, no es un diagnóstico clínico.',
  consultDiagnostic:'Puedes solicitar una revisión gratuita de la situación. Tú decides qué compartir y si continuar.',
  consultCoach:'Puedes hablar con un coach de IA o explorar la ayuda de un profesional humano. No implica reservar.',
  consultFollow:'Podemos separar los hechos de las suposiciones. ¿Qué es lo más difícil de esta situación?',
  goalQuestion:'¿Qué meta quieres trabajar? Basta una frase.',
  goalUncertain:'Podemos explorar un deseo o empezar por un ejemplo concreto para esbozar una meta.',
  goal2:'Ya tienes una dirección. ¿Qué señal te diría que estás avanzando?',
  goal3:'Antes de exigirte más, busquemos recursos. ¿Con qué apoyo cuentas?',
  goal4:'Podemos dividir la meta en acciones pequeñas. ¿Cuál sería un primer paso realista?',
  goal5:'Has mencionado un obstáculo. ¿Qué te detiene cuando intentas actuar?',
  goal6:'Puede haber más de un camino. Podemos comparar dos alternativas más seguras.',
  goal7:'Miremos lo que ha funcionado y lo que conviene ajustar. ¿Qué progreso real notas?',
  goalProgram:'Podemos explorar un programa de siete encuentros, uno por etapa: con coach de IA, profesional humano o formato mixto. Son opciones, no una reserva ni un pago. ¿Cuál te interesa?',
  goalHuman:'Elegiste un profesional humano. Siete sesiones pueden trabajar meta, sentido, recursos, plan, obstáculos, oportunidades y progreso. Puedes explorar los formatos disponibles; el programa y horario requieren confirmación.',
  goalAI:'Elegiste un formato con IA. Siete sesiones pueden recorrer las etapas, pero por ahora es un esquema, no un curso comprado. Puedes empezar con un coach de IA.',
  goalMixed:'Podemos combinar trabajo con IA y encuentros humanos cuando sea útil otra perspectiva. Primero definiríamos cómo repartir las siete sesiones, sin reservar nada automáticamente.',
  short:'Podemos seguir conversando sin prisa, o puedo ofrecer dos pequeñas opciones. No tienes que decidir.',
 },
};
const normalize=value=>String(value||'').toLowerCase().normalize('NFKC').replace(/ё/gu,'е').replace(/\s+/gu,' ').trim();
const R={
 noAdvice:/без советов|не давай советы|не советуй|просто выслушай|no advice|without advice|just listen|sin consejos|solo esc[uú]chame/iu,
 allowAdvice:/дай совет|посоветуй|можешь предложить|что посоветуешь|give me advice|what do you recommend|puedes aconsejarme|dame un consejo/iu,
 noQuestions:/без вопросов|не задавай вопросов|no questions|don't ask questions|sin preguntas|no me preguntes/iu,
 task:/сколько стоит|какая цена|оплат|запиши меня|забронируй|зарегистрируй|как записаться|создай видео|не работает|how much|what price|book (?:me|a)|pay (?:now|for)|register me|generate a video|not working|cu[aá]nto cuesta|precio|reservar cita|pagar|genera un video|no funciona/iu,
 factual:/^(?:кто (?:такой|такая)|что означает|что значит|объясни (?:термин|понятие)|what (?:is|does)|who (?:is|was)|explain (?:the |a )?(?:term|concept)|qu[eé] (?:es|significa)|qui[eé]n es)/iu,
 humanFormat:/жив(?:ой|ым|ого) (?:специалист|коуч)|человеческ|human (?:coach|specialist|session)|live specialist|profesional humano|coach humano/iu,
 aiFormat:/^(?:ии|ai)$|(?:с|через|в формате|con) ии?(?=\s|$|[.,!?])|(?:con|con el|con la) ia(?=\s|$|[.,!?])|ии.?коуч|искусственн.{0,16}интеллект|ai coach|(?:with|using) ai(?=\s|$|[.,!?])|coach de ia/iu,
 mixFormat:/микс|смешанн|комбинированн|mixed|hybrid|combinado|mixto/iu,
 stop:/^(?:стоп|хватит|закончим|новая тема|сменим тему|stop|cancel|bye|new topic|change topic|basta|adios|cambiar de tema)[.!?\s]*$/iu,
 practice:/медитац|практик|упражнен|расслаб|дыхател|хочу успоко|meditat|practice|exercise|relax|breath|meditaci[oó]n|pr[aá]ctica|respiraci[oó]n/iu,
 test:/\btest\b|тест|опросник|анкета|questionnaire|assessment|cuestionario|prueba/iu,
 diagnostic:/диагност|бесплатн.{0,25}разбор|разбор ситуац|free.{0,25}review|free assessment|diagnos|revisi[oó]n gratuita/iu,
 coach:/коуч|специалист|психолог|консультац|coach|human specialist|professional|consult|profesional|asesor/iu,
 program:/7.{0,12}(встреч|сесси|заняти)|семь встреч|программ|смешанн.{0,10}формат|7.{0,12}(meeting|session)|seven.{0,12}(meeting|session)|program|mixed format|siete.{0,10}sesiones|programa|formato mixto/iu,
 fear:/боюсь|страх|тревож|откладыв|сомнен|стыд|страшн|fear|afraid|scared|anxious|procrastinat|avoid|miedo|temor|ansied|pospon/iu,
 resources:/нет сил|устал|выгор|не хватает (сил|времени|денег|поддержки)|exhaust|overwhelm|burn.?out|no energy|lack of (time|support)|agotad|sin energ[ií]a|no tengo fuerzas/iu,
 plan:/план|с чего начать|как начать|первый шаг|пошагов|plan|how (?:to|do i) start|first step|pasos|por d[oó]nde empiezo/iu,
 options:/тупик|нет вариантов|другие возможност|все перепробовал|альтернатив|stuck|no options|alternatives|other ways|sin opciones|alternativas|atascad/iu,
 progress:/прогресс|ускор|двигаюсь|что уже получилось|результат|отчет|progress|speed up|move faster|milestone|avance|progreso|acelerar/iu,
 clarify:/уточн|ясност|конкрет|зачем|для чего|какую цель|clarif|specific|why this goal|aclarar|espec[ií]fic|para qu[eé]/iu,
 goal:/хочу|моя цель|мечта|стремлюсь|i want|my goal|i aim|i'd like|quiero|mi meta|me gustar[ií]a/iu,
 uncertain:/не знаю|не понимаю|не уверен|don't know|not sure|unclear|no s[eé]|no estoy segur/iu,
 sadness:/грустно|тяжело|одинок|плачу|расстроен|sad|lonely|crying|hard day|triste|solo|sola|llor/iu,
 hesitation:/^(?:да|нет|не знаю|угу|ага|ну|yes|no|not sure|i don't know|si|sí|vale|no sé)[.!?\s]*$/iu,
 question:/[?？]/u
};

const journeyQuestions={
 ru:{
  consultation:[
   'Какой недавний случай лучше всего показывает эту ситуацию?',
   'Что ты уже пробовал и какой результат получил?',
   'Какой ответ помог бы тебе почувствовать больше ясности?',
  ],
  goal:{
   1:['Какая сфера жизни сейчас больше всего просит перемен?','Что здесь важно тебе самому, а не окружающим?'],
   2:['Как узнаешь, что приблизился к желаемому результату?','Ради чего эта цель действительно важна тебе?','Что важно сохранить, пока идёшь к ней?'],
   3:['Какой твой прошлый опыт может сейчас помочь?','Кого или что можно попросить о поддержке?','Что стоит восстановить, прежде чем добавлять нагрузку?'],
   4:['Какое действие реально попробовать в ближайшие два дня?','Как выглядела бы минимальная версия этого шага?','Что может помешать и какой будет запасной вариант?'],
   5:['Когда препятствие сильнее всего проявляется?','Какой небольшой эксперимент был бы достаточно безопасным?','Это объективное ограничение или пока ожидание того, что случится?'],
   6:['Какие два альтернативных пути можно проверить без больших затрат?','Какой вариант легче всего отменить, если он не подойдёт?','Чьи знания могли бы помочь увидеть ещё один путь?'],
   7:['Что уже изменилось благодаря твоим действиям?','Какую часть плана стоит скорректировать на следующей неделе?','Какой один признак прогресса будет полезно замечать?'],
  }
 },
 en:{
  consultation:[
   'What recent example best illustrates the situation?',
   'What have you already tried, and what happened?',
   'What answer would help you feel more clear?',
  ],
  goal:{
   1:['Which part of life most needs change right now?','What matters to you here, rather than to others?'],
   2:['How would you recognize progress toward the result?','Why is this goal personally important?','What do you want to protect while pursuing it?'],
   3:['What past experience could support you now?','Who or what could help you?','What needs recovery before you take on more?'],
   4:['What action could you realistically try in the next two days?','What would the smallest version of that step be?','What could get in the way, and what is your backup?'],
   5:['When does this obstacle show up most strongly?','What small experiment would feel safe enough?','Is this a concrete constraint or a prediction?'],
   6:['What two alternative approaches could you test at low cost?','Which option is easiest to reverse?','Who might offer a useful outside perspective?'],
   7:['What has actually changed through your efforts?','What would you adjust in the plan next week?','What sign of progress would help you track it?'],
  }
 },
 es:{
  consultation:[
   '¿Qué ejemplo reciente muestra mejor esta situación?',
   '¿Qué has intentado y qué ocurrió?',
   '¿Qué respuesta te ayudaría a tener más claridad?',
  ],
  goal:{
   1:['¿Qué área de tu vida necesita más cambios?','¿Qué importa para ti, y no para otras personas?'],
   2:['¿Cómo reconocerás el avance hacia tu meta?','¿Por qué es importante para ti esta meta?','¿Qué quieres preservar mientras avanzas?'],
   3:['¿Qué experiencia anterior puede ayudarte?','¿Quién o qué podría apoyarte?','¿Qué necesitas recuperar antes de exigirte más?'],
   4:['¿Qué acción realista puedes intentar en dos días?','¿Cuál sería la versión mínima de ese paso?','¿Qué podría impedirlo y qué alternativa tendrías?'],
   5:['¿Cuándo aparece más ese obstáculo?','¿Qué experimento pequeño sería suficientemente seguro?','¿Es una limitación concreta o una predicción?'],
   6:['¿Qué dos caminos alternativos puedes probar con poco riesgo?','¿Qué opción sería más fácil de revertir?','¿Quién podría aportar otra perspectiva?'],
   7:['¿Qué ha cambiado realmente gracias a tus acciones?','¿Qué ajustarías del plan la semana próxima?','¿Qué indicador de progreso te ayudaría?'],
  }
 },
};
function nextDistinct(questions,history){
 const recent=(Array.isArray(history)?history:[]).filter(x=>x?.role==='assistant')
  .slice(-12).map(x=>normalize(x.text));
 return questions.find(q=>!recent.some(p=>p.includes(normalize(q))))||null;
}

const noAdviceIn=(history,message)=>{
 let blocked=false;
 for(const turn of [...(Array.isArray(history)?history:[]),{role:'user',text:message}]){
  if(turn?.role!=='user')continue;
  const words=normalize(turn.text);
  if(R.noAdvice.test(words))blocked=true;
  else if(R.allowAdvice.test(words))blocked=false;
 }
 return blocked;
};
const repeated=(history,q)=>Boolean(q&&!nextDistinct([q],history));
export function threeJourneyOpening(path,locale='en'){
 return texts[langs.has(locale)?locale:'en'].intros[path]||null;
}
export function threeJourneyLabel(path,locale='en'){
 return texts[langs.has(locale)?locale:'en'].names[path]||null;
}

/** Versioned behavior library: all final actions remain client-owned, never inferred. */
const REACT={
 ru:{
  unsure2:'Необязательно сейчас находить ответ. Можно описать один конкретный случай или просто остановиться на том, что уже стало яснее.',
  yes:'Я услышал твоё «да», но не хочу решать за тебя. Можно продолжить с этой темы своими словами.',
  no:'Хорошо, этот вариант не подходит. Не будем его продавливать. Можем остаться с тем, что сейчас важно.',
  repair:'Похоже, мой предыдущий ответ не попал в точку. Спасибо, что поправил. Давай опираться на твоё описание, а не на мои догадки.',
  questionBoundary:'Не буду задавать новые вопросы. Можешь говорить в своём темпе.',
  overQuestion:'Я уже достаточно расспрашивал. Пока понятно не всё, и это нормально. Можем рассмотреть то, что ты уже рассказал, без нового опроса.',
  greet:'Привет! Мы можем начать без спешки и обязательной темы.',
  thanks:'Пожалуйста. Можно на этом остановиться или продолжить, когда будет удобно.',
  whatNext:'Можем продолжить исследование, подытожить сказанное или посмотреть возможные варианты — выбираешь ты.',
  emotion:{
   fear:['Ты говоришь о страхе. Не будем торопиться с решениями. Что сейчас тревожит сильнее всего?','Страх может быть важным сигналом о том, что нужно учесть. Можем пока просто исследовать ситуацию.'],
   anger:['Ты говоришь, что злишься. Похоже, эта ситуация действительно задевает. Что именно произошло?','Мы можем дать место раздражению, не торопясь искать виноватых или решения.'],
   sad:['Ты говоришь, что тебе грустно. Я слушаю. Что сейчас ощущается самым тяжёлым?','Можно побыть с тем, что есть, без требования немедленно почувствовать себя лучше.'],
   lonely:['Похоже, тебе сейчас одиноко. Какой поддержки больше всего не хватает?','Когда не хватает контакта, важно не заставлять себя всё решать одному. Можем поговорить.'],
   fatigue:['Ты говоришь об усталости. Сейчас не обязательно искать новую задачу. Что больше всего забирает силы?','Можно немного снизить требования к себе и просто описать, что происходит.'],
   happy:['Звучит как радостная новость! Что тебе особенно хочется разделить?','Радостные моменты тоже заслуживают внимания. Можно просто порадоваться тому, что произошло.']
  },
  consultReflection:'Пока я услышал твою ситуацию, но не стану делать вывод о причине без дополнительных фактов.',
  consultChoice:'Есть несколько способов разобраться: поговорить на конкретном примере, подобрать тест или выбрать бесплатный разбор ситуации. Ничего не нужно решать сейчас.',
  consultCorrection:'Уточним: я мог неверно понять твою ситуацию. Давай сохраним только то, что ты сам считаешь точным.',
  goalChoice:'Мы можем прояснить цель, поискать ресурсы, разобрать препятствие или начать с плана. Какой из этих подходов сейчас полезнее?',
  goalResistance:'Похоже, предыдущий подход не сработал. Это информация, а не неудача. Можем изменить размер шага или попробовать другой путь.',
  goalDone:'Ты говоришь, что действие уже сделано. Что реально изменилось после этого?',
  goalReview:'Давай не приписывать себе ни успех, ни неудачу заранее. Какие изменения ты заметил в реальности?',
  programExplain:'Семь встреч — это семь тем: направление, ясная цель, ресурсы, план, препятствия, возможности и закрепление продвижения. Их можно обсуждать с ИИ, человеком или комбинировать. Это пока схема, не запись.',
  therapyHuman:'Если тебе нужна именно психотерапия, стоит обратиться к квалифицированному специалисту. Я могу помочь найти существующие варианты поддержки; запись будет только по твоему решению.',
  goalCoach:'Можно начать с разговора с ИИ-коучем или выбрать консультацию с живым специалистом. Посмотрим подходящие форматы, без автоматической записи.',
  goalSteps:'Наши 7 направлений: 1) найти цель, 2) прояснить её, 3) открыть ресурсы, 4) составить план, 5) разобраться с препятствиями, 6) найти возможности, 7) закреплять прогресс. Можно начать с любого.',
  goalPlanned:'Это пока намерение, а не выполненное действие. Можно сделать план настолько небольшим, чтобы он соответствовал твоим силам.',
 },
 en:{
  unsure2:'You do not have to have an answer now. We could look at one real example or leave things where they are for today.',
  yes:'I hear your yes, but I do not want to decide for you. You can continue in your own words.',
  no:'Okay, that option does not fit. We will not push it. We can stay with what matters to you now.',
  repair:'My earlier response may have missed your point. Thanks for correcting me. Let us use what you actually said, not my guesses.',
  questionBoundary:'I will not ask more questions. You can share at your own pace.',
  overQuestion:'I have asked enough questions. We can work with what you have already shared without another intake.',
  greet:'Hello! We can begin without a fixed topic or any pressure.',
  thanks:'You are welcome. We can stop here or continue whenever you prefer.',
  whatNext:'We can keep exploring, summarize what is clear, or consider options. It is your choice.',
  emotion:{
   fear:['You are describing fear. We do not need to rush toward a solution. What worries you most?','Fear may point to something important to consider. We can explore the situation without rushing.'],
   anger:['You say you are angry. Something about this has clearly affected you. What happened?','We can give the frustration some room without rushing to blame or solve anything.'],
   sad:['You say you feel sad. I am listening. What has felt hardest?','We can stay with what is here without needing you to feel better immediately.'],
   lonely:['You are describing loneliness. What kind of support do you miss most?','When connection is missing, you do not have to resolve everything alone. We can talk.'],
   fatigue:['You are feeling worn out. We need not turn that into another task. What is draining you?','We can lower the pressure and simply describe what is happening.'],
   happy:['That sounds like good news. What would you most like to share?','There is room to celebrate without turning this into a task.']
  },
  consultReflection:'I hear the situation you described, but I will not assume its cause without more facts.',
  consultChoice:'We could discuss a real example, look at a relevant questionnaire, or explore a free situation review. No need to choose immediately.',
  consultCorrection:'Let us clarify. I may have misunderstood; we can keep only what you consider accurate.',
  goalChoice:'We could clarify the goal, explore resources, work with an obstacle, or start planning. What feels most useful now?',
  goalResistance:'That approach does not seem to have helped. This is useful information, not failure. We can adjust the size of the step or look at another path.',
  goalDone:'You say you completed that action. What actually changed as a result?',
  goalReview:'Let us avoid calling it success or failure before checking. What changes have you noticed?',
  programExplain:'The seven meetings cover direction, clear goal, resources, plan, obstacles, options, and sustained progress. They can involve AI, a person, or both. This is an outline, not a booking.',
  therapyHuman:'If you need psychotherapy, a qualified human professional is the right place to look. I can help you explore existing support options, with no automatic booking.',
  goalCoach:'You can start with an AI coach or explore a session with a human professional. We can look at available formats without booking anything automatically.',
  goalSteps:'Our seven directions are: 1) find the goal, 2) clarify it, 3) locate resources, 4) make a plan, 5) explore obstacles, 6) find options, 7) sustain progress. You can start anywhere.',
  goalPlanned:'This is still an intention, not a completed action. We can make the plan small enough to fit your resources.',
 },
 es:{
  unsure2:'No hace falta encontrar una respuesta ahora. Podemos ver un ejemplo real o dejarlo aquí por hoy.',
  yes:'Escucho tu sí, pero no quiero decidir por ti. Puedes continuar con tus propias palabras.',
  no:'De acuerdo, esa opción no encaja. No insistiremos. Podemos centrarnos en lo que te importa ahora.',
  repair:'Parece que mi respuesta anterior no dio en el punto. Gracias por corregirme. Volvamos a tus palabras, sin suposiciones.',
  questionBoundary:'No haré más preguntas. Puedes hablar a tu ritmo.',
  overQuestion:'Ya he preguntado bastante. Podemos trabajar con lo que has compartido sin otro cuestionario.',
  greet:'¡Hola! Podemos empezar sin un tema fijo ni presión.',
  thanks:'De nada. Podemos terminar aquí o continuar cuando prefieras.',
  whatNext:'Podemos seguir explorando, resumir lo que sabemos o ver opciones. Tú eliges.',
  emotion:{
   fear:['Hablas de miedo. No tenemos que correr hacia una solución. ¿Qué es lo que más te preocupa?','El miedo puede señalar algo importante. Podemos explorar la situación sin prisa.'],
   anger:['Dices que estás enfadado. Esto parece haberte afectado. ¿Qué ocurrió?','Podemos dar espacio a la frustración sin buscar culpables ni soluciones inmediatas.'],
   sad:['Dices que te sientes triste. Te escucho. ¿Qué ha sido lo más difícil?','Podemos quedarnos con lo que hay sin exigirte sentirte mejor ahora.'],
   lonely:['Hablas de soledad. ¿Qué tipo de apoyo te hace más falta?','Cuando falta conexión, no hay que resolverlo todo solo. Podemos hablar.'],
   fatigue:['Dices que estás agotado. No hace falta añadir otra tarea. ¿Qué te quita energía?','Podemos reducir la presión y hablar de lo que está ocurriendo.'],
   happy:['¡Suena como una buena noticia! ¿Qué quieres compartir?','También hay espacio para celebrar sin convertirlo en una tarea.']
  },
  consultReflection:'Escucho lo que describes, pero no voy a suponer una causa sin más datos.',
  consultChoice:'Podemos hablar de un ejemplo, explorar un cuestionario o una revisión gratuita. No tienes que decidir ahora.',
  consultCorrection:'Quizás no entendí bien. Conservemos solo lo que tú consideras correcto.',
  goalChoice:'Podemos aclarar la meta, encontrar recursos, explorar un obstáculo o planificar. ¿Qué sería más útil ahora?',
  goalResistance:'Ese enfoque no parece haber ayudado. Es información, no un fracaso. Podemos ajustar el paso o probar otra vía.',
  goalDone:'Dices que ya realizaste esa acción. ¿Qué cambió realmente después?',
  goalReview:'No llamemos éxito ni fracaso a algo sin comprobarlo. ¿Qué cambios has notado?',
  programExplain:'Las siete sesiones tratan dirección, meta clara, recursos, plan, obstáculos, opciones y progreso. Pueden ser con IA, una persona o ambos. Es un esquema, no una reserva.',
  therapyHuman:'Si necesitas psicoterapia, conviene acudir a un profesional humano cualificado. Puedo ayudarte a explorar opciones existentes, sin hacer reservas automáticamente.',
  goalCoach:'Puedes empezar con un coach de IA o explorar una sesión con un profesional humano. Podemos ver los formatos disponibles sin reservar nada automáticamente.',
  goalSteps:'Los siete caminos son: 1) encontrar meta, 2) aclararla, 3) descubrir recursos, 4) planificar, 5) afrontar obstáculos, 6) explorar opciones, 7) sostener progreso. Puedes empezar por cualquiera.',
  goalPlanned:'Es una intención, no una acción completada. Podemos preparar un plan pequeño y realista.',
 }
};
const REACTION_RX={
 greet:/^(?:привет(?:ик)?|здравствуй|здравствуйте|добрый день|hello|hi|hey|hola|buenas)[.! ]*$/iu,
 thanks:/^(?:спасибо|благодарю|thanks|thank you|gracias)[.! ]*$/iu,
 shortYes:/^(?:да|ага|угу|согласен|yes|yeah|sure|sí|si|vale)[.! ]*$/iu,
 shortNo:/^(?:нет|неа|no|nope)[.! ]*$/iu,
 uncertain:/^(?:не знаю|не уверен|не уверена|понятия не имею|i don't know|not sure|no s[eé]|no estoy segur[oa])[.! ]*$/iu,
 correction:/^(?:нет[,! ]+(?:не|ты|вы)|не то|не так|я имел[а]? в виду|ты не понял|вы не поняли|это не то|no[,! ]+(?:i|not)|that's not what|you misunderstood|no era eso|no me entendiste)/iu,
 rejection:/не подходит|не хочу это|не помогло|уже пробовал|уже пробовала|не сработало|не работает (?:план|подход|способ)|(?:план|подход|способ) не работает|не нравится вариант|doesn't help|didn't work|not for me|i tried that|no me sirve|no funcion[oó]|ya prob[eé]/iu,
 noOffers:/не предлагай|без предложений|не рекламируй|не продавай|no offers|don't recommend anything|stop suggesting|sin ofertas|no me ofrezcas/iu,
 questionsResume:/можешь задать вопрос|давай вопросы|спроси меня|you can ask|ask me a question|puedes preguntar|hazme una pregunta/iu,
 actionDone:/(?:я (?:уже )?)?(?:сделал|сделала|выполнил|выполнила|попробовал|попробовала) (?:первый |этот |тот |один )?(?:шаг|действие|задачу|дело)|(?:i|we) (?:did|finished|tried) (?:the |my |it|a )|i have done|ya (?:lo hice|termin[eé]|prob[eé])/iu,
 askNext:/^(?:дальше|что дальше|продолжай|следующий шаг|what next|go on|continue|next step|qu[eé] sigue|continuar)[.!? ]*$/iu,
 explicitGoalStep:/(?:\bstep\s*([1-7])\b|(?:этап|шаг)\s*([1-7])\b|(?:paso|etapa)\s*([1-7])\b)/iu,
 stepsOverview:/(?:покажи|расскажи|назови|какие|все|перечисли).{0,22}(?:7|семь).{0,22}(?:этап|шаг)|(?:show|list|explain|what are).{0,24}(?:7|seven).{0,20}(?:steps|stages)|(?:muestra|enumera|cu[aá]les).{0,22}(?:7|siete).{0,20}(?:pasos|etapas)/iu,
 plannedAction:/(?:я (?:сделаю|начну|попробую)|завтра (?:начну|сделаю)|i(?:'ll| will) (?:do|try|start)|voy a (?:hacer|empezar|intentar))/iu,
 immediateAction:/(?:что (?:мне )?(?:делать|предпринять)|как (?:мне )?(?:приступить|действовать)|what should i do|how do i start|qu[eé] (?:debo|puedo) hacer|c[oó]mo empiezo)/iu,
 starting:/(?:не могу начать|трудно начать|откладываю|прокрастинирую|can't start|cannot start|procrastinat|no puedo empezar|pospongo)/iu,
 motivation:/(?:нет мотивац|мало мотивац|не хватает мотивац|нужна мотивац|нет энергии|motivation|lack of energy|falta de motivaci[oó]n|sin energ[ií]a)/iu,
 requestHuman:/(?:могу (?:ли )?(?:поговорить|связаться) с (?:живым |реальным )?(?:специалистом|психологом|человеком)|can i talk to (?:a )?(?:human|specialist|therapist)|puedo hablar con (?:un |una )?(?:persona|profesional|psic[oó]logo))/iu,
 surprise:/(?:удивительно|не ожидал|не ожидала|surprising|didn't expect|me sorprende)/iu,
 fear:/мне страшно|боюсь|страх|тревож|anxious|i am afraid|i'm afraid|scared|worried|tengo miedo|ansiedad|me preocupa/iu,
 anger:/злюсь|раздражает|сердит|бесит|angry|furious|irritated|frustrated|enojad|enfadad|me irrita/iu,
 lonely:/одинок|никому не нужен|не с кем поговорить|lonely|alone|no one to talk|soledad|me siento sol/iu,
 sad:/грустно|плачу|печально|расстроен|мне тяжело|sad|crying|down|heartbroken|triste|lloro|me siento mal/iu,
 fatigue:/устал|нет сил|выгор|измот|exhausted|overwhelmed|burnt out|drained|agotad|sin energ[ií]a/iu,
 happy:/радостно|счастлив|радуюсь|ура|good news|happy|excited|feliz|alegr[ií]a/iu,
 explicitTest:/(?:хочу|предложи|посоветуй|подбери|подобрать|выбрать|найти|пройти|давай|нужен|нужна).{0,30}(?:тест|опросник)|(?:test|questionnaire).{0,22}(?:take|suggest|find)|(?:want|need|find|take|suggest).{0,22}(?:test|questionnaire)|(?:quiero|necesito|recomienda).{0,30}(?:prueba|cuestionario)/iu,
 explicitReview:/(?:хочу|предложи|нужен|нужна|дай|сделаем).{0,32}(?:диагностик|разбор)|(?:free|want|need|request).{0,32}(?:review|assessment)|(?:quiero|necesito|hazme).{0,30}(?:revisi[oó]n|diagn[oó]stico)/iu,
 explicitCoach:/(?:хочу|нужен|нужна|подбери|помоги найти|поговорить с).{0,35}(?:коуч|специалист|психолог)|(?:want|need|find|talk to).{0,35}(?:coach|specialist|professional)|(?:quiero|necesito|busco).{0,35}(?:coach|profesional)/iu,
 explicitPractice:/(?:хочу|предложи|подбери|дай|нужна|нужно|давай|покажи).{0,35}(?:медитац|практик|упражнен)|(?:want|need|try|show|suggest|give me).{0,35}(?:meditation|practice|exercise)|(?:quiero|necesito|dame|sugiere).{0,35}(?:meditaci[oó]n|pr[aá]ctica|ejercicio)/iu,
 explicitProgram:/(?:7|семь|seven|siete).{0,30}(?:встреч|сесси|заняти|meeting|session|sesion)|(?:хочу|нужна|расскажи|интересует|выбираю).{0,35}программ|(?:want|need|show|explain).{0,35}(?:program|programme)|(?:quiero|necesito|expl[ií]came).{0,30}programa/iu,
 programExplanation:/(?:как (?:устроен[ао]?|проходит)|из чего состоит|что входит|какие этапы|explain|how does it work|what is included|c[oó]mo funciona|qu[eé] incluye).{0,65}(?:программ|семь|7|program|siete)|(?:программ|program).{0,50}(?:как|что входит|how|include|c[oó]mo)/iu,
 noQuestions:/без вопросов|не задавай вопросы|не задавай вопросов|no questions|don't ask questions|sin preguntas|no me preguntes/iu,
 askingOther:/^(?:что такое|кто такой|кто такая|объясни что|что значит|как работает|как записаться|сколько стоит|what is|who is|how does|how much|how can i book|qu[eé] es|qui[eé]n es|c[oó]mo funciona|cu[aá]nto cuesta)/iu,
 brokenTool:/(?:тест|опросник|test|prueba).{0,32}(?:не сработал|не открыл|завис|ошибка|ошибкой|не работает|didn't work|is broken|failed|error|no funcion)/iu,
 notReady:/(?:не готов(?:а)?|пока рано|сейчас не хочу|not ready|not now|todav[ií]a no|no estoy list[oa])/iu,
 askCalm:/(?:как (?:мне )?успокоиться|что (?:мне )?делать с тревогой|как расслабиться|how (?:do i|can i) calm down|how to relax|c[oó]mo tranquilizarme|c[oó]mo calmarme)/iu
};
function lastAssistant(history){
 return (Array.isArray(history)?history:[]).filter(x=>x?.role==='assistant'&&typeof x.text==='string').at(-1)?.text||'';
}
function lastUserTurns(history){
 return (Array.isArray(history)?history:[]).filter(x=>x?.role==='user'&&typeof x.text==='string').slice(-5).map(x=>normalize(x.text));
}
function adviceRefused(history,message){
 let blocked=false;
 for(const turn of [...(Array.isArray(history)?history:[]),{role:'user',text:message}]){
  if(turn?.role!=='user')continue;
  const raw=normalize(turn.text);
  if(R.noAdvice.test(raw)||REACTION_RX.noOffers.test(raw))blocked=true;
  else if(R.allowAdvice.test(raw))blocked=false;
 }
 return blocked;
}
function questionRefused(history,message){
 let blocked=false;
 for(const turn of [...(Array.isArray(history)?history:[]),{role:'user',text:message}]){
  if(turn?.role!=='user')continue;
  const raw=normalize(turn.text);
  if(REACTION_RX.noQuestions.test(raw))blocked=true;
  else if(REACTION_RX.questionsResume.test(raw))blocked=false;
 }
 return blocked;
}
function assistantQuestionStreak(history){
 return (Array.isArray(history)?history:[]).filter(x=>x?.role==='assistant').slice(-2)
  .filter(x=>typeof x.text==='string'&&/[?？]/u.test(x.text)).length>=2;
}
function reactionAnswer(phrase,kind,stage=null,action=null){
 return {version:THREE_JOURNEYS_VERSION,reply:phrase,stage,action,reaction:kind};
}
function emotionKey(words){
 return REACTION_RX.fear.test(words)?'fear':
   REACTION_RX.anger.test(words)?'anger':
   REACTION_RX.lonely.test(words)?'lonely':
   REACTION_RX.sad.test(words)?'sad':
   REACTION_RX.fatigue.test(words)?'fatigue':
   REACTION_RX.happy.test(words)?'happy':null;
}
function novelText(options,history,fallback){
 const answer=nextDistinct(options,history);
 return answer||fallback;
}
/**
 * @typedef {{role:'user'|'assistant',text:string}} JourneyTurn
 * @param {{path?:string|null,message?:string,locale?:string,history?:JourneyTurn[]}} [input]
 */
export function threeJourneyTurn({path,message='',locale='en',history=[]}={}){
 if(!THREE_JOURNEY_PATHS.includes(path)||typeof message!=='string')return null;
 const words=normalize(message),lang=langs.has(locale)?locale:'en';
 const t=texts[lang],v=REACT[lang],h=Array.isArray(history)?history.slice(-16):[];
 const planningFailure=/(?:план|подход|способ).{0,20}не работает|(?:plan|approach|method).{0,20}(?:isn't working|doesn't work)/iu.test(words);
 if(!words||R.stop.test(words)||(R.task.test(words)&&!planningFailure)||
    R.factual.test(words)||REACTION_RX.askingOther.test(words)||REACTION_RX.brokenTool.test(words))return null;
 const say=(p,kind='reflection',stage=null,action=null)=>reactionAnswer(p,kind,stage,action);
 const noAdvice=adviceRefused(h,words),noQuestions=questionRefused(h,words);
 const directQuestion=REACTION_RX.askingOther.test(words);
 if(directQuestion)return null;
 if(REACTION_RX.greet.test(words))return say(v.greet,'social');
 if(REACTION_RX.thanks.test(words))return say(v.thanks,'social');
 if(REACTION_RX.noQuestions.test(words))return say(v.questionBoundary,'no_questions');
 if(R.noAdvice.test(words)||REACTION_RX.noOffers.test(words))return say(t.pause,'no_advice');
 const requestedPractice=REACTION_RX.explicitPractice.test(words);
 const requestedTest=REACTION_RX.explicitTest.test(words);
 const requestedReview=REACTION_RX.explicitReview.test(words);
 const requestedCoach=REACTION_RX.explicitCoach.test(words)||REACTION_RX.requestHuman.test(words);
 const requestedProgram=REACTION_RX.explicitProgram.test(words);
 const lead=lastAssistant(h);
 const previous=lastUserTurns(h);
 const repeatedUncertainty=previous.filter(x=>REACTION_RX.uncertain.test(x)).length>=1;
 const actualEmotion=emotionKey(words);
 const isYes=REACTION_RX.shortYes.test(words);
 const isNo=REACTION_RX.shortNo.test(words);
 const correction=REACTION_RX.correction.test(words);
 const rejected=REACTION_RX.rejection.test(words);
 const askNext=REACTION_RX.askNext.test(words);
 const limitQuestions=assistantQuestionStreak(h)||noQuestions;
 // Strong user-side refusals/repairs override optional programs and marketing.
 if(correction)return say(path==='consultation'?v.consultCorrection:v.repair,'correction');
 if(rejected)return say(path==='goal'?v.goalResistance:v.no,'rejection');
 if(isNo||REACTION_RX.notReady.test(words))return say(v.no,'refusal');
 if(isYes)return say(v.yes,'affirmation');
 if(REACTION_RX.uncertain.test(words))
   return say(repeatedUncertainty?v.unsure2:(path==='goal'?t.goalUncertain:
     path==='consultation'?t.consultNoIdea:t.short),'uncertain',path==='goal'?1:null);
 if(askNext)return say(path==='goal'?v.goalChoice:v.whatNext,'navigate');
 if(noQuestions)return say(v.questionBoundary,'no_questions');
 // Therapy is not a diagnostic, sales or goal funnel.
 if(path==='therapy'){
   if(!noAdvice&&(requestedPractice||REACTION_RX.askCalm.test(words)))return say(t.therapyOptions,'resource',null,'practices');
   if(!noAdvice&&requestedCoach)return say(v.therapyHuman,'resource',null,'coaches');
   if(noAdvice)return say(actualEmotion?
     novelText(v.emotion[actualEmotion].filter(x=>!/[?？]/u.test(x)),h,t.pause):t.pause,'listening');
   if(actualEmotion){
     const options=v.emotion[actualEmotion];
     const noQuestionOption=options.find(x=>!/[?？]/u.test(x))||t.short;
     return say(novelText(limitQuestions?[noQuestionOption]:options,h,noQuestionOption),'reflect_emotion');
   }
   if(limitQuestions)return say(v.overQuestion,'reflect_without_question');
   return say(repeated(h,t.therapy)?t.short:t.therapy,'listen');
 }
 // Consultation is allowed to suggest tools only on a request for tools.
 if(path==='consultation'){
   if(noAdvice)return say(v.consultReflection,'listen_without_advice');
   if(requestedTest)return say(t.consultTests,'selected_resource',null,'tests');
   if(requestedReview)return say(t.consultDiagnostic,'selected_resource',null,'diagnostic');
   if(requestedCoach)return say(t.consultCoach,'selected_resource',null,'coaches');
   if(actualEmotion&&(!R.question.test(words)||!R.coach.test(words))){
     // Emotional material should first be heard, not converted to test offers.
     const options=v.emotion[actualEmotion];
     return say(novelText(limitQuestions?options.filter(x=>!/[?？]/u.test(x)):options,h,v.consultReflection),'emotion_first');
   }
   if(limitQuestions)return say(v.consultReflection,'reflect_without_question');
   const question=nextDistinct(journeyQuestions[lang].consultation,h);
   return say(question||v.consultChoice,question?'investigate':'offer_paths');
 }
 // Goal / 7-stage work.
 if(noAdvice)return say(v.goalReview,'listen_without_advice');
 if(requestedPractice)return say(t.therapyOptions,'selected_resource',null,'practices');
 if(requestedTest)return say(t.consultTests,'selected_resource',null,'tests');
 if(requestedReview)return say(t.consultDiagnostic,'selected_resource',null,'diagnostic');
 const programContext=h.some(row=>row?.role==='assistant'&&typeof row.text==='string'&&
   (row.text.includes(t.goalProgram.slice(0,24))||
    row.text.includes(v.programExplain.slice(0,24))));
 const programFormat=programContext&&(R.humanFormat.test(words)||R.aiFormat.test(words)||R.mixFormat.test(words));
 if(REACTION_RX.programExplanation.test(words))return say(v.programExplain,'program_information');
 if(REACTION_RX.stepsOverview.test(words))return say(v.goalSteps,'steps_overview');
 if(requestedProgram||programFormat){
   if(R.mixFormat.test(words))return say(t.goalMixed,'program_format',null,'program');
   if(R.humanFormat.test(words))return say(t.goalHuman,'program_format',null,'program');
   if(R.aiFormat.test(words))return say(t.goalAI,'program_format',null,'program');
   return say(t.goalProgram,'program_choice',null,'program');
 }
 if(requestedCoach)return say(v.goalCoach,'selected_resource',null,'coaches');
 if(REACTION_RX.actionDone.test(words))return say(v.goalDone,'review_progress',7);
 if(REACTION_RX.plannedAction.test(words))return say(v.goalPlanned,'planned_action',4);
 const chosen=REACTION_RX.explicitGoalStep.exec(words);
 const explicitStep=chosen?Number(chosen[1]||chosen[2]||chosen[3]):null;
 const stage=explicitStep||
   (R.fear.test(words)||REACTION_RX.starting.test(words)?5:
    R.resources.test(words)||REACTION_RX.motivation.test(words)?3:
    R.options.test(words)?6:R.progress.test(words)?7:
    R.plan.test(words)||REACTION_RX.immediateAction.test(words)?4:R.clarify.test(words)?2:
    R.goal.test(words)?2:R.uncertain.test(words)?1:null);
 if(actualEmotion&&!explicitStep&&!R.goal.test(words)&&
   (actualEmotion==='sad'||actualEmotion==='lonely'))return say(
   novelText(v.emotion[actualEmotion],h,v.goalReview),'emotion_first');
 if(stage===null)return say(limitQuestions?v.overQuestion:t.goalQuestion,'clarify_goal',1);
 if(limitQuestions)return say(v.overQuestion,'reflect_without_question',stage);
 const questions=[t['goal'+stage],...(journeyQuestions[lang].goal[stage]||[])];
 const question=nextDistinct(questions,h);
 return say(question||v.goalReview,question?'stage_question':'stage_review',stage);
}
