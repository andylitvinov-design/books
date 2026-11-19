/**
 * Brief, evidence-bounded follow-up to a question just asked by Empathy Mind.
 * Only responds when the last assistant message contains one of our own exact
 * anchors. No inference of mental health, consent, appointment or treatment.
 */
export const EMPATHY_FOLLOWUP_VERSION='ali-empathy-followup-v1';
const LANGS=new Set(['ru','en','es']);
const normal=v=>String(v||'').toLowerCase().replace(/ё/gu,'е').normalize('NFD')
  .replace(/и\u0306/gu,'й').replace(/[\u0300-\u036f]/gu,'').replace(/\s+/gu,' ').trim();
const DANGER=/(?:не хочу жить|хочу умереть|суицид|самоубийств|не могу дышать|боль в груди|меня бьют|насилие|i want to die|kill myself|suicid|chest pain|cannot breathe|domestic violence|quiero morir|no puedo respirar|violencia domestica)/u;
const DIRECT=/(?:сколько стоит|какая цена|цен(?:а|е|у|ы)|стоимость|услуг(?:а|и|у|ой|ах)|консультац|запиши меня|записаться|хочу (?:видео|медитацию|курс|тест|купить)|создай|сгенерируй|оплати|заказ|не работает|how much|what is the price|i want to book|book a|make a video|create|generate|order|pay for|quiero reservar|cuanto cuesta|precio|crea un video|pagar)/u;
const STOP=/^(?:стоп|хватит|закончим|нет|не хочу продолжать|сменим тему|давай о другом|давайте о другом|stop|enough|no|change topic|something else|basta|no quiero continuar|otro tema)[!. ]*$/u;
const NEW_FEELING=/(?:^(?:мне (?:страшно|тревожно|стыдно|грустно|одиноко)|я (?:боюсь|злюсь|устал(?:а)?|устаю))|^(?:i'm|i am|i feel) (?:scared|afraid|angry|sad|lonely|tired|anxious)\b|^(?:me siento|estoy) (?:triste|solo|sola|cansado|cansada|enojado|enojada)\b)/u;
const ANCHOR={
 ru:{start:'с чем это сейчас больше связано',work:'чего вам сейчас больше хочется',relations:'что сейчас важнее — быть услышанным'},
 en:{start:'what is this most connected to',work:'what would help you more right now',relations:'what matters more right now — feeling heard'},
 es:{start:'con que se relaciona mas este cansancio',work:'que te ayudaria mas ahora',relations:'que importa mas ahora — sentirte escuchado'}
};
const SIGNALS={
 ru:{work:/работ|коллег|начальник|задач|дедлайн|требуют|давят/u,
   demands:/требу|давят|нагружа|постоянно просят|не оставляют в покое/u,
   relations:/отношен|семь|семьей|партнер|партнерша|близкие|ссор|дома/u,
   unsure:/^(?:не знаю|пока не знаю|не уверен(?:а)?|сложно сказать)[.! ]*$/u,
   rest:/отключаться|переключаться|отвлекаться|отпускать|расслабляться|не думать|оставлять работу|отдыхать/u,
   load:/уменьшить нагруз|меньше задач|снизить нагруз|убрать нагруз|меньше работать|меньше требован/u,
   listen:/услышал|услышан|выслушал|слушал|понимал/u},
 en:{work:/\b(?:work|job|boss|colleagues|deadlines|tasks|workplace)\b/u,
   demands:/demand|always ask|pressure|too much expected/u,
   relations:/relationship|partner|family|home|relatives/u,
   unsure:/^(?:i don'?t know|not sure|hard to say)[!. ]*$/u,
   rest:/switch off|unwind|stop thinking|disconnect|relax|leave work|rest after/u,
   load:/less work|reduce workload|fewer tasks|less pressure|lower workload/u,
   listen:/heard|listened|understood/u},
 es:{work:/trabajo|laboral|jefe|companeros|tareas|plazos/u,
   demands:/exigen|presion|todo el tiempo|piden demasiado/u,
   relations:/relacion|pareja|familia|casa|cercanos/u,
   unsure:/^(?:no se|no estoy segur[oa]|es dificil decirlo)[!. ]*$/u,
   rest:/desconectar|descansar|dejar de pensar|relajarme|olvidarme del trabajo/u,
   load:/reducir la carga|menos trabajo|menos tareas|menos presion/u,
   listen:/escuch|comprend/u}
};
const TEXT={
 ru:{work:'Похоже, работа сейчас забирает много сил.',demand:'Когда от вас постоянно чего-то требуют, это может выматывать.',
   workQuestion:'Чего вам сейчас больше хочется — уменьшить нагрузку или научиться отключаться после рабочего дня?',
   relation:'Похоже, отношения сейчас забирают много сил. Что сейчас важнее — быть услышанным или уменьшить напряжение между вами?',
   other:'Расскажите немного о том, что забирает силы. Можно коротко, как получается.',
   uncertain:'Необязательно сразу знать ответ. Можно просто поговорить о том, что происходит.',
   listenWork:'Понимаю, что работа сейчас забирает силы. Можно просто рассказать, что происходит, без советов и решений.',
   listenRelation:'Понимаю, что эта ситуация в отношениях непростая. Я могу просто выслушать, без советов.',
   rest:'Вы хотите, чтобы после рабочего дня оставалось место для себя, а не только для рабочих мыслей. Можем найти небольшой способ переключаться или сначала разобраться, что мешает отпускать работу. Что вам ближе?',
   load:'Важнее уменьшить то, что отнимает силы. Что сильнее перегружает — количество задач или постоянная срочность?',
   workClarify:'Чтобы не гадать: вам сейчас важнее изменить саму нагрузку или научиться отдыхать после работы?',
   heard:'Вам важно, чтобы ваши слова действительно услышали. В какие моменты особенно не хватает этого?',
   relationClarify:'Похоже, здесь важно найти больше спокойствия. Что сейчас труднее всего между вами?'},
 en:{work:'It sounds like work is taking a lot out of you.',demand:'Constant demands at work can be exhausting.',
   workQuestion:'What would help you more right now — reducing the load or switching off after work?',
   relation:'It sounds like relationships are draining you. What matters more right now — feeling heard or easing the tension?',
   other:'You can tell me a little more about what is draining you, in your own words.',
   uncertain:'You do not need an answer right away. We can simply talk about what is happening.',
   listenWork:'Work is taking a lot out of you. You can tell me about it without advice or pressure to decide anything.',
   listenRelation:'It sounds difficult in this relationship. I can listen without giving advice.',
   rest:'You want your evening to feel like your own, without work following you home. We can explore a small way to unwind or what keeps work on your mind. Which feels more helpful?',
   load:'You want to reduce what is draining you. Is it the number of tasks or the constant urgency that weighs more heavily?',
   workClarify:'Rather than guess, would you rather change the workload itself or find a way to rest after work?',
   heard:'Being heard matters to you. When do you most notice that your words are not reaching the other person?',
   relationClarify:'Finding more calm here seems important. What feels most difficult between you right now?'},
 es:{work:'Parece que el trabajo te está quitando mucha energía.',demand:'Tantas exigencias en el trabajo pueden agotar.',
   workQuestion:'¿Qué te ayudaría más ahora: reducir la carga o desconectar después del trabajo?',
   relation:'Parece que la relación te está agotando. ¿Qué importa más ahora — sentirte escuchado o bajar la tensión?',
   other:'Si quieres, cuéntame un poco más sobre lo que te quita energía, a tu manera.',
   uncertain:'No necesitas tener una respuesta ahora. Podemos hablar de lo que está pasando.',
   listenWork:'El trabajo te está quitando mucha energía. Puedes contarlo sin consejos ni decisiones.',
   listenRelation:'Parece una situación difícil en la relación. Puedo escucharte sin dar consejos.',
   rest:'Quieres que la tarde vuelva a ser tuya, sin llevarte el trabajo a casa en la cabeza. Podemos buscar una forma breve de desconectar o entender por qué cuesta dejarlo atrás. ¿Qué te serviría más?',
   load:'Quieres reducir lo que te agota. ¿Pesa más la cantidad de tareas o la urgencia constante?',
   workClarify:'Para no suponer, ¿te importa más cambiar la carga de trabajo o aprender a descansar después?',
   heard:'Es importante para ti sentirte escuchado. ¿Cuándo notas más que tus palabras no llegan?',
   relationClarify:'Parece importante encontrar más calma. ¿Qué es lo más difícil entre ustedes ahora?'}
};
function noAdviceBoundary(history,message,lang){
 const off={ru:/без советов|не хочу советов|просто выслушай|хочу выговориться/u,
   en:/no advice|without advice|just listen|want to vent/u,
   es:/sin consejos|no quiero consejos|solo escuchame/u}[lang];
 const on={ru:/дай совет|можешь предложить вариант|что мне делать/u,
   en:/give me advice|suggest options|what should i do/u,
   es:/dame un consejo|que me recomiendas/u}[lang];
 let blocked=false;
 for(const u of [...history,{role:'user',text:message}]){
  if(u?.role!=='user'||typeof u.text!=='string')continue;
  const s=normal(u.text);
  if(off.test(s))blocked=true;else if(on.test(s))blocked=false;
 }
 return blocked;
}
/** Return null unless this is a relevant continuation of our own recent question. */
export function followEmpathyConversation({message='',locale='ru',history=[],safety={status:'unknown'}}={}){
 if(safety?.status!=='clear'||typeof message!=='string'||!message.trim()||message.length>280)return null;
 const lang=LANGS.has(locale)?locale:'ru',text=normal(message);
 if(DANGER.test(text)||DIRECT.test(text)||STOP.test(text)||NEW_FEELING.test(text)||text.startsWith('/'))return null;
 const previous=Array.isArray(history)?history.slice(-8).filter(t=>
   ['assistant','user'].includes(t?.role)&&typeof t.text==='string'&&t.text.length<=1000):[];
 const last=previous.at(-1);
 if(last?.role!=='assistant')return null;
 const assistant=normal(last.text),a=ANCHOR[lang],s=SIGNALS[lang],c=TEXT[lang];
 let reply=null,phase=null;
 const listenOnly=noAdviceBoundary(previous,message,lang);
 if(assistant.includes(normal(a.start))){
  if(s.unsure.test(text))reply=c.uncertain;
  else if(s.work.test(text))reply=listenOnly?c.listenWork:
    (s.demands.test(text)?c.demand:c.work)+' '+c.workQuestion;
  else if(s.relations.test(text))reply=listenOnly?c.listenRelation:c.relation;
  else reply=listenOnly?c.uncertain:c.other;
  phase='source';
 }else if(assistant.includes(normal(a.work))){
  if(s.unsure.test(text))reply=c.uncertain;
  else if(listenOnly)reply=c.listenWork;
  else if(s.rest.test(text))reply=c.rest;
  else if(s.load.test(text))reply=c.load;
  else reply=c.workClarify;
  phase='goal';
 }else if(assistant.includes(normal(a.relations))){
  reply=listenOnly?c.listenRelation:s.listen.test(text)?c.heard:c.relationClarify;
  phase='relationship';
 }
 if(!reply||reply.length>700||(reply.match(/[?？]/gu)||[]).length>1)return null;
 return Object.freeze({version:EMPATHY_FOLLOWUP_VERSION,locale:lang,phase,reply,
  noAdvice:listenOnly,noAction:true,noDiagnosis:true,noPersistence:true});
}
