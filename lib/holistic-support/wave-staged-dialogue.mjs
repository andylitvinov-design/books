/**
 * Wave's bounded, first-party multi-stage dialogue, built on reviewed
 * Judgment Mind situations/steps. No model call, personal data, storage,
 * diagnosis, booking, payment or external action.
 */
import {planJudgmentTurn} from './judgment-mind.mjs';
export const WAVE_STAGED_DIALOGUE_VERSION='wave-staged-dialogue-v1';
const localeSet=new Set(['ru','en','es']),safe={status:'clear'};
const normalize=value=>String(value||'').toLocaleLowerCase().replace(/ё/gu,'е').normalize('NFD')
 .replace(/и\u0306/giu,'й').replace(/[\u0300-\u036f]/gu,'')
 .replace(/^[¿¡\s]+|[?!¿¡.,;:\s]+$/gu,'').replace(/[’']/gu,'')
 .replace(/\s+/gu,' ').trim();
const phrases={
 ru:{
  fit:'Подходит ли вам такой необязательный шаг?',
  listen:'Я услышал просьбу говорить без советов. Могу просто выслушать. Что сейчас для вас важнее?',
  resume:'Понял, теперь можно обсудить возможные шаги. Какую ситуацию хотите рассмотреть?',
  reask:(a,b)=>'Не хочу угадывать. Сейчас ближе «'+a+'» или «'+b+'»?',
  pause:'Понял. Не буду предлагать шаги. Можем просто поговорить, если хочется.',
  change:'Понял, прежнюю тему пока оставим. Что хотите обсудить теперь?',
  time:'Если сейчас нет времени, ничего делать немедленно не нужно. Можно вернуться к этому позже.',
  different:'Понял, этот шаг не подошёл. Хотите другой вариант или просто поговорить?',
  try:'Хорошо. Это только предложение, выполнять его необязательно. Если решите попробовать, расскажите, как прошло.',
  check:'Спасибо, что рассказали. Что оказалось полезным, а что не подошло?',
  positive:'Рад, что это оказалось полезным. Можно оставить этот способ одним из вариантов — без обязательств.',
  negative:'Спасибо за отклик. Не будем повторять то, что не помогло. Хотите рассказать, что не подошло?'
 },
 en:{
  fit:'Would that small, optional step suit you?',
  listen:'I remember you asked for no advice in this conversation. I can simply listen. What matters most right now?',
  resume:'Understood, we can consider options again. What situation would you like to explore?',
  reask:(a,b)=>"I don't want to guess. Is it closer to “"+a+"” or “"+b+"”?",
  pause:"Understood. I won't suggest steps. We can simply talk if you like.",
  change:'Understood, we can leave that topic aside. What would you like to discuss instead?',
  time:"If you don't have time now, you don't need to act immediately. We can return to it later.",
  different:"Understood, that step doesn't fit. Would you prefer another option or simply to talk?",
  try:"Okay. It's only a suggestion, not an obligation. If you try it, tell me how it went.",
  check:"Thanks for sharing. What felt useful, and what didn't fit?",
  positive:"I'm glad something about it was useful. You can keep it as an option without obligation.",
  negative:"Thanks for the feedback. We won't repeat a step that didn't help. Would you like to explore what didn't fit?"
 },
 es:{
  fit:'¿Te encajaría este paso pequeño y opcional?',
  listen:'Me pediste hablar sin consejos en esta conversación. Puedo escucharte. ¿Qué te importa ahora?',
  resume:'Entendido, podemos volver a explorar opciones. ¿Qué situación quieres comentar?',
  reask:(a,b)=>'No quiero suponer. ¿Se acerca más a «'+a+'» o a «'+b+'»?',
  pause:'Entendido. No propondré pasos. Podemos simplemente hablar si quieres.',
  change:'Entendido, dejamos ese tema. ¿De qué te gustaría hablar ahora?',
  time:'Si ahora no tienes tiempo, no necesitas hacer nada inmediatamente. Podemos retomarlo después.',
  different:'Entendido, ese paso no encaja. ¿Prefieres otra opción o simplemente hablar?',
  try:'De acuerdo. Es solo una sugerencia, sin obligación de hacerla. Si la pruebas, cuéntame cómo fue.',
  check:'Gracias por contarlo. ¿Qué te sirvió y qué no encajó?',
  positive:'Me alegra que algo fuera útil. Puedes conservarlo como opción, sin compromiso.',
  negative:'Gracias por decirlo. No repetiremos un paso que no ayudó. ¿Quieres contarme qué no encajó?'
 }
};
const synonyms={
 overload:{ru:[/много дел|много задач|нагрузк|завал/u,/сроч|срок|дедлайн|нет времени/u],
   en:[/many tasks|too many|workload|too much/u,/urgent|urgency|deadline|time pressure/u],
   es:[/muchas tareas|muchas cosas|carga|demasiad/u,/urgente|urgencia|plazo|poco tiempo/u]},
 starting:{ru:[/перв(?:ый|ого) шаг|с чего начать|не знаю как начать/u,/времен|некогда|расписани/u],
   en:[/first step|where to start|beginning/u,/find time|schedule|not enough time/u],
   es:[/primer paso|como empezar|por donde/u,/encontrar tiempo|horario|no tengo tiempo/u]},
 conflict:{ru:[/услыш|выслуш|не слышит|не понимает/u,/контакт|помир|связ|восстанов/u],
   en:[/be heard|listen|understood|hear me/u,/reconnect|contact|make up|rebuild/u],
   es:[/escuch|entend/u,/retomar|contacto|reconcili/u]},
 loneliness:{ru:[/здесь|поговор|пообщ|выслуш/u,/близк|знаком|написать|связаться/u],
   en:[/talk here|chat here|listen|talk to you/u,/reach|someone|friend|contact/u],
   es:[/hablar aqui|charlar|escucha/u,/contactar|alguien|conocid|amigo/u]},
 self_criticism:{ru:[/конкретн|ситуац|факт/u,/поддерж|себя|сочувств/u],
   en:[/specific|event|fact/u,/self.support|kinder|compassion/u],
   es:[/concret|situacion|hecho/u,/apoyo|amabilidad/u]},
 uncertainty:{ru:[/данн|информац|сведени/u,/выбр|вариант|решени/u],
   en:[/information|facts|missing data/u,/choose|options|decide|decision/u],
   es:[/informacion|datos/u,/elegir|opciones|decidir/u]},
 fatigue:{ru:[/пауз|перерыв|отдохн|передыш/u,/поддерж|помощ|обсуд|поговор/u],
   en:[/pause|break|rest/u,/support|help|talk/u],
   es:[/pausa|descans|descanso/u,/apoyo|ayuda|hablar/u]},
 stress:{ru:[/ситуац|конкретн|одна проблем/u,/нагруз|накоп|много всего/u],
   en:[/situation|one issue|specific/u,/demands|buildup|many things/u],
   es:[/situacion|concret|un problema/u,/acumul|carga|muchas cosas/u]}
};
const seeds={
 ru:['Ничего не успеваю','Мне трудно начать','Мы поссорились','Мне одиноко','Я постоянно себя ругаю','Не знаю что делать','Я устал','Мне тревожно'],
 en:['I have too many tasks','I cannot start','We had an argument','I feel lonely','I keep blaming myself','I dont know what to do','I feel tired','I feel stressed'],
 es:['Tengo demasiadas tareas','Me cuesta empezar','Nos peleamos','Me siento solo','Me culpo por todo','No se que hacer','Estoy cansado','Estoy estresado']
};
const refuse={
 ru:/^(?:я не хочу советов|не хочу советов|без советов|не предлагай ничего|не надо советов|нет не надо|просто послушай|просто выслушай)$/u,
 en:/^(?:i dont want advice|no advice|dont give me advice|dont suggest anything|no thanks|just listen|please listen)$/u,
 es:/^(?:no necesito consejos|sin consejos|no quiero consejos|no propongas nada|no gracias|solo escucha|escuchame)$/u
};
const adviceResume={ru:/^(?:теперь хочу совет|теперь можно совет|давай обсудим шаг|можешь предложить вариант)$/u,
 en:/^(?:now i want advice|you can suggest options now|lets consider options)$/u,
 es:/^(?:ahora quiero consejos|puedes proponer opciones|volvamos a las opciones)$/u};
const topicReset={
 ru:/^(?:сменим тему|давай о другом|давайте о другом|другая тема|не об этом|поговорим о другом)$/u,
 en:/^(?:new topic|lets change topic|something else|not about that|switch topic)$/u,
 es:/^(?:otro tema|cambiemos de tema|hablemos de otra cosa|no sobre eso)$/u
};
const unsure={ru:/^(?:не знаю|пока не знаю|не уверен(?:а)?|сложно выбрать|не определился|не определилась)$/u,
 en:/^(?:i dont know|not sure|cant choose|cannot decide)$/u,
 es:/^(?:no se|no estoy segur[oa]|no puedo elegir|no se decidir)$/u};
const yes={ru:/^(?:да|хорошо|ладно|подходит|попробую|можно|ок|ага)$/u,
 en:/^(?:yes|okay|ok|sounds good|that works|ill try|sure)$/u,
 es:/^(?:si|vale|de acuerdo|me parece bien|lo intentare|claro)$/u};
const no={ru:/^(?:нет|не подходит|это не подходит|не хочу|другое|не помогло|не получилось)$/u,
 en:/^(?:no|not for me|that doesnt work|something else|didnt help)$/u,
 es:/^(?:no|no me sirve|no encaja|otro|otra cosa|no ayudo)$/u};
const tried={ru:/^(?:попробовал(?:а)?|сделал(?:а)?|я попробовал(?:а)?|получилось|не получилось|не помогло)$/u,
 en:/^(?:i tried|tried it|i did it|did it|it worked|didnt work|didnt help)$/u,
 es:/^(?:lo intente|lo hice|funciono|no funciono|no me sirvio)$/u};
const good={ru:/^(?:помогло|да помогло|было полезно|полезно|получилось|лучше)$/u,
 en:/^(?:it helped|helped|yes it helped|useful|it worked|worked)$/u,
 es:/^(?:me ayudo|me sirvio|fue util|funciono)$/u};
const bad={ru:/^(?:не помогло|не получилось|не подошло|не сработало)$/u,
 en:/^(?:didnt help|didnt work|not useful|not helpful)$/u,
 es:/^(?:no ayudo|no me sirvio|no funciono|no fue util)$/u};
const noTime={ru:/нет времени|некогда|не успеваю сейчас/u,
 en:/no time|dont have time|not enough time/u,
 es:/no tengo tiempo|sin tiempo|no me da tiempo/u};
const another={ru:/^(?:другой вариант|давай другой|что нибудь другое|другое решение)$/u,
 en:/^(?:another option|something else|different step|other idea)$/u,
 es:/^(?:otra opcion|otra idea|otro paso|algo diferente)$/u};
const make=(reply,phase,code=null)=>typeof reply==='string'&&reply.length<=750&&(reply.match(/[?？]/gu)||[]).length<=1
 ?{reply,phase,situationCode:code,confidence:'high',modelUsed:false,externalCalled:false,actionExecuted:false,memorySaved:false}:null;
const eligibleTurn=t=>t&&['user','assistant'].includes(t.role)&&typeof t.text==='string'&&t.text.length<=1000;
const plan=(message,locale)=>planJudgmentTurn({message,locale,safety:{status:'clear'}});
const step=(p,id,locale)=>{
 const choice=p.choices?.find(c=>c.id===id);
 if(!choice)return null;
 const selected=planJudgmentTurn({message:choice.label,locale,safety:{status:'clear'},pending:p.pending,choiceId:id});
 return selected?.state==='step_offered'?selected.reply+' '+phrases[locale].fit:null;
};
const reask=(p,lang)=>phrases[lang].reask(p.choices[0].label,p.choices[1].label);
function optionFrom(message,p,lang){
 const text=normalize(message);
 const matches=p.choices.map((choice,index)=>{
  const label=normalize(choice.label),hint=synonyms[p.situationCode]?.[lang]?.[index];
  return text===label||text.startsWith(label+' ')||text.endsWith(' '+label)||Boolean(hint?.test(text));
 });
 return matches[0]!==matches[1]?(matches[0]?'a':'b'):null;
}
function findQuestionAnchor(history,lang){
 for(let i=history.length-2;i>=0;i--){
  const u=history[i],a=history[i+1];
  if(u.role!=='user'||a.role!=='assistant')continue;
  const p=plan(u.text,lang);
  if(p?.state==='awaiting_choice'&&p.pending&&p.choices?.length===2&&p.reply===a.text)
   return {plan:p,index:i};
 }
 return null;
}
// When the client retains only six turns, the first question may have been
// pruned by the time an alternative is requested. Reconstruct provenance
// from the exact previously offered first-party step, not a guessed topic.
function alternateAfterTruncation(turns,lang){
 const offered=[...turns].reverse().find(t=>t.role==='assistant'&&t.text.endsWith(' '+phrases[lang].fit));
 if(!offered)return null;
 for(const seed of seeds[lang]){
  const p=plan(seed,lang);
  if(p?.state!=='awaiting_choice'||p.choices?.length!==2)continue;
  const a=step(p,'a',lang),b=step(p,'b',lang);
  if(offered.text===a)return {reply:b,code:p.situationCode};
  if(offered.text===b)return {reply:a,code:p.situationCode};
 }
 return null;
}
export function waveStagedDialogueTurn({message='',locale='ru',history=[]}={}){
 const lang=localeSet.has(locale)?locale:'en';
 if(typeof message!=='string'||!message.trim()||message.length>280||message.startsWith('/')||
  /[\r\n]|https?:\/\/|<[^>]*>/iu.test(message))return null;
 const text=normalize(message),c=phrases[lang];
 const turns=(Array.isArray(history)?history:[]).slice(-8).filter(eligibleTurn);
 const last=turns.at(-1),lastAssistant=last?.role==='assistant'?last.text:null;
 const current=plan(message,lang);
 // Upstream safety and Judgment Mind must both allow this nonclinical flow.
 if(current?.status==='handoff'||current?.state==='safety_handoff')return null;
 // A confirmed no-advice preference survives later turns in the bounded
 // conversation until the client explicitly requests advice again.
 const declineAt=turns.reduce((n,t,i)=>t.role==='user'&&refuse[lang].test(normalize(t.text))?i:n,-1);
 const resumedAt=turns.reduce((n,t,i)=>t.role==='user'&&adviceResume[lang].test(normalize(t.text))?i:n,-1);
 const noAdvice=declineAt>resumedAt;
 if(adviceResume[lang].test(text)&&noAdvice)return make(c.resume,'resume');
 if(refuse[lang].test(text))return make(c.pause,'pause');
 if(noAdvice&&current?.state==='awaiting_choice')return make(c.listen,'listen');
 if(topicReset[lang].test(text)&&lastAssistant)return make(c.change,'reframe');
 if(lastAssistant===c.check){
  if(good[lang].test(text))return make(c.positive,'complete');
  if(bad[lang].test(text)||no[lang].test(text))return make(c.negative,'reflect');
 }
 if(lastAssistant===c.try&&tried[lang].test(text))return make(c.check,'checkin');
 const anchor=findQuestionAnchor(turns,lang);
 if(anchor&&lastAssistant){
  const p=anchor.plan,code=p.situationCode;
  const a=step(p,'a',lang),b=step(p,'b',lang);
  const awaiting=lastAssistant===p.reply||lastAssistant===reask(p,lang);
  if(current?.state==='awaiting_choice'&&current.situationCode!==code)
   return make(current.reply,'clarify',current.situationCode);
  if(awaiting){
   if(refuse[lang].test(text)||no[lang].test(text))return make(c.pause,'pause',code);
   if(unsure[lang].test(text))return make(reask(p,lang),'clarify',code);
   const selected=optionFrom(message,p,lang);
   if(selected)return make(selected==='a'?a:b,'propose',code);
   if(noTime[lang].test(text))return make(c.time,'pause',code);
   if(!/[?？]/u.test(message)&&message.length<=100)return make(reask(p,lang),'clarify',code);
   return null;
  }
  if(lastAssistant===a||lastAssistant===b){
   if(refuse[lang].test(text))return make(c.pause,'pause',code);
   if(noTime[lang].test(text))return make(c.time,'pause',code);
   if(bad[lang].test(text)||no[lang].test(text))return make(c.different,'alternate',code);
   if(tried[lang].test(text))return make(c.check,'checkin',code);
   if(yes[lang].test(text))return make(c.try,'try',code);
   return null;
  }
  if(lastAssistant===c.different){
   if(refuse[lang].test(text)||no[lang].test(text))return make(c.pause,'pause',code);
   if(another[lang].test(text)){
    const previous=[...turns.slice(anchor.index+2)].reverse().find(t=>t.role==='assistant'&&(t.text===a||t.text===b));
    if(previous)return make(previous.text===a?b:a,'propose',code);
   }
   return null;
  }
 }
 if(lastAssistant===c.different&&another[lang].test(text)){
  const other=alternateAfterTruncation(turns,lang);
  if(other?.reply)return make(other.reply,'propose',other.code);
 }
 if(current?.state==='awaiting_choice'&&current.pending&&current.choices?.length===2)
  return make(current.reply,'clarify',current.situationCode);
 return null;
}
