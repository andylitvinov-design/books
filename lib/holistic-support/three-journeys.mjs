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
  short:'Podemos seguir conversando sin prisa, o puedo ofrecer dos pequeñas opciones. No tienes que decidir.',
 },
};
const normalize=value=>String(value||'').toLowerCase().normalize('NFKC').replace(/ё/gu,'е').replace(/\s+/gu,' ').trim();
const R={
 noAdvice:/без советов|не давай советы|не советуй|просто выслушай|no advice|without advice|just listen|sin consejos|solo esc[uú]chame/iu,
 allowAdvice:/дай совет|посоветуй|можешь предложить|что посоветуешь|give me advice|what do you recommend|puedes aconsejarme|dame un consejo/iu,
 noQuestions:/без вопросов|не задавай вопросов|no questions|don't ask questions|sin preguntas|no me preguntes/iu,
 task:/сколько стоит|какая цена|оплат|запиши меня|забронируй|зарегистрируй|как записаться|создай видео|не работает|how much|what price|book (?:me|a)|pay (?:now|for)|register me|generate a video|not working|cu[aá]nto cuesta|precio|reservar cita|pagar|genera un video|no funciona/iu,
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
const recentQuestion=(history)=>Array.isArray(history)?[...history].reverse().find(x=>x?.role==='assistant'&&typeof x.text==='string'&&R.question.test(x.text))?.text||'':'';
const repeated=(history,q)=>Boolean(q&&recentQuestion(history)?.includes(q.slice(0,22)));
export function threeJourneyOpening(path,locale='en'){
 return texts[langs.has(locale)?locale:'en'].intros[path]||null;
}
export function threeJourneyLabel(path,locale='en'){
 return texts[langs.has(locale)?locale:'en'].names[path]||null;
}
export function threeJourneyTurn({path,message='',locale='en',history=[]}={}){
 if(!THREE_JOURNEY_PATHS.includes(path)||typeof message!=='string')return null;
 const words=normalize(message),t=texts[langs.has(locale)?locale:'en'];
 if(!words||R.stop.test(words)||R.task.test(words))return null;
 const blocked=noAdviceIn(history,words),noQuestion=R.noQuestions.test(words);
 const answer=(reply,stage=null,action=null)=>({version:THREE_JOURNEYS_VERSION,reply,stage,action});
 if(path==='therapy'){
   if(blocked)return answer(t.pause);
   if(noQuestion)return answer(t.noquestions);
   if(R.practice.test(words))return answer(t.therapyOptions,null,'practices');
   if(R.resources.test(words))return answer(t.tired);
   if(R.sadness.test(words))return answer(t.sad);
   if(R.hesitation.test(words))return answer(t.short);
   return answer(t.therapy);
 }
 if(path==='consultation'){
   if(blocked)return answer(t.pause);
   if(noQuestion)return answer(t.noquestions);
   if(R.test.test(words))return answer(t.consultTests,null,'tests');
   if(R.diagnostic.test(words))return answer(t.consultDiagnostic,null,'diagnostic');
   if(R.coach.test(words))return answer(t.consultCoach,null,'coaches');
   if(R.uncertain.test(words)||R.hesitation.test(words))return answer(t.consultNoIdea);
   if(repeated(history,t.consultFollow))return answer(t.consultIntro);
   return answer(t.consultFollow);
 }
 if(blocked)return answer(t.pause);
 if(noQuestion)return answer(t.noquestions);
 if(R.program.test(words))return answer(t.goalProgram,null,'program');
 if(R.hesitation.test(words))return answer(t.goalUncertain,1);
 const step=R.fear.test(words)?5:R.resources.test(words)?3:R.options.test(words)?6:
   R.progress.test(words)?7:R.plan.test(words)?4:R.clarify.test(words)?2:
   R.goal.test(words)?2:R.uncertain.test(words)?1:null;
 if(step===null)return answer(t.goalQuestion,1);
 const q=t['goal'+step];
 if(repeated(history,q))return answer(t.short,step);
 return answer(q,step);
}
