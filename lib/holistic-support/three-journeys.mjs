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
 aiFormat:/^ии$|ии.?коуч|искусственн.{0,16}интеллект|^ai$|ai coach|coach de ia/iu,
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
export function threeJourneyTurn({path,message='',locale='en',history=[]}={}){
 if(!THREE_JOURNEY_PATHS.includes(path)||typeof message!=='string')return null;
 const words=normalize(message),t=texts[langs.has(locale)?locale:'en'];
 if(!words||R.stop.test(words)||R.task.test(words)||R.factual.test(words))return null;
 const blocked=noAdviceIn(history,words),noQuestion=R.noQuestions.test(words);
 const answer=(reply,stage=null,action=null)=>({version:THREE_JOURNEYS_VERSION,reply,stage,action});
 if(path==='therapy'){
   if(R.noAdvice.test(words))return answer(t.pause);
   if(noQuestion)return answer(t.noquestions);
   if(!blocked&&R.practice.test(words))return answer(t.therapyOptions,null,'practices');
   if(R.resources.test(words))return answer(t.tired);
   if(R.sadness.test(words))return answer(repeated(history,t.sad)?t.short:t.sad);
   if(R.hesitation.test(words))return answer(t.short);
   return answer(repeated(history,t.therapy)?t.short:t.therapy);
 }
 if(path==='consultation'){
   if(R.noAdvice.test(words))return answer(t.pause);
   if(noQuestion)return answer(t.noquestions);
   if(!blocked&&R.test.test(words))return answer(t.consultTests,null,'tests');
   if(!blocked&&R.diagnostic.test(words))return answer(t.consultDiagnostic,null,'diagnostic');
   if(!blocked&&R.coach.test(words))return answer(t.consultCoach,null,'coaches');
   if(R.uncertain.test(words)||R.hesitation.test(words))return answer(repeated(history,t.consultNoIdea)?t.short:t.consultNoIdea);
   const question=nextDistinct(journeyQuestions[langs.has(locale)?locale:'en'].consultation,history);
   return question?answer(question):null;
 }
 if(R.noAdvice.test(words))return answer(t.pause);
 if(noQuestion)return answer(t.noquestions);
 const programContext=Array.isArray(history)&&history.some(row=>
   row?.role==='assistant'&&typeof row.text==='string'&&
   row.text.includes(t.goalProgram.slice(0,28)));
 if(R.program.test(words)||programContext&&(R.humanFormat.test(words)||R.aiFormat.test(words)||R.mixFormat.test(words))){
   if(R.mixFormat.test(words))return answer(t.goalMixed,null,'program');
   if(R.humanFormat.test(words))return answer(t.goalHuman,null,'program');
   if(R.aiFormat.test(words))return answer(t.goalAI,null,'program');
   return answer(t.goalProgram,null,'program');
 }
 if(R.hesitation.test(words))return answer(repeated(history,t.goalUncertain)?t.short:t.goalUncertain,1);
 const step=R.fear.test(words)?5:R.resources.test(words)?3:R.options.test(words)?6:
   R.progress.test(words)?7:R.plan.test(words)?4:R.clarify.test(words)?2:
   R.goal.test(words)?2:R.uncertain.test(words)?1:null;
 if(step===null)return answer(t.goalQuestion,1);
 const variations=journeyQuestions[langs.has(locale)?locale:'en'].goal[step]||[];
 const q=nextDistinct([t['goal'+step],...variations],history);
 return q?answer(q,step):null;
}
