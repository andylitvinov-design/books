import {FREE_DIAGNOSTIC_MODE,FREE_DIAGNOSTIC_FIELDS,
  FREE_DIAGNOSTIC_PHASES,freeDiagnosticCopy} from './ali-free-diagnostic-library.mjs';
import {planAliFreeReaction} from './ali-free-diagnostic-reactions.mjs';
export {FREE_DIAGNOSTIC_MODE,FREE_DIAGNOSTIC_PHASES,FREE_DIAGNOSTIC_FIELDS};
export const FREE_DIAGNOSTIC_VERSION='ali-free-diagnostic-v1';

// All classifications are ephemeral, based on what the visitor actually wrote.
// No medical diagnosis, mental-state inference from images, or third-party APIs.
const STOP=/^(?:\/(?:stop|cancel|unsubscribe)|стоп|остановить|stop|parar|detener)(?:\s|$)/iu;
const CRISIS=/(?:суицид|покончи.{0,15}с собой|хочу умереть|убью себя|не могу дышать|боль в груди|suicid|kill myself|want to die|cannot breathe|chest pain|quiero morir|no puedo respirar|dolor en el pecho)/iu;
const UNSURE=/^(?:не знаю|сложно сказать|не уверен[а]?|i (?:don'?t|do not) know|not sure|hard to say|no s[eé]|no estoy segur[oa])[.!…\s]*$/iu;
const SKIP=/^(?:пропустить|пропущу|не хочу отвечать|skip(?: question)?|pass|omitir|saltar|no quiero responder)[!.\s]*$/iu;
const HOLD=/^(?:хватит|не хочу продолжать|не хочу углубляться|достаточно вопросов|enough|no more questions|don'?t want to continue|no quiero continuar|no m[aá]s preguntas)[!.\s]*$/iu;
const GREETING=/^(?:hi|hello|hey|привет|здравствуйте|добрый день|hola|buenas)[!.\s🌿]*$/iu;
 // Short assent, punctuation and delivery claims are not a stated goal,
 // problem or support need. A Telegram receipt is verified elsewhere.
const ACK_ONLY=/^(?:да|давайте|угу|конечно|yes|yep|yeah|sure|sí|si|…|\.\.\.)[!.\s]*$/iu;
const MATERIAL_CLAIM=/(?:\b(?:i|we) (?:already |have )?(?:sent|submitted|uploaded|attached|completed|filled in)\b.{0,65}\b(?:drawing|picture|photo|form|questionnaire)\b|(?:я (?:уже )?(?:отправил[аи]?|выслал[аи]?|прикрепил[аи]?|заполнил[аи]?)).{0,65}(?:рисун|фот|анкет|форм)|(?:ya (?:envi[eé]|rellen[eé]|complet[eé])).{0,65}(?:dibujo|foto|formulario|cuestionario))/iu;
const SITUATION_ONLY=/^(?:у меня (?:проблем|конфликт)|мы (?:часто )?ссоримся|i (?:have|am having) (?:a )?(?:problem|conflict)|tengo (?:un )?problema)/iu;
const FORM_INQUIRY=/(?:(?:нужн|обязатель|можно|как|куда|где|когда|ссылк).{0,45}(?:анкет|форм)|(?:анкет|форм).{0,35}(?:нужн|обязатель|позже|ссылк|заполнить|отправить)|(?:where|how|when|can i|do i|is it).{0,45}(?:form|questionnaire)|(?:form|questionnaire).{0,30}(?:required|later|link)|(?:d[oó]nde|c[oó]mo|necesito|puedo|cu[aá]ndo).{0,45}(?:formulario|cuestionario))/iu;
const DRAWING_INQUIRY=/(?:(?:нужн|обязатель|можно|как|куда|где|когда).{0,45}(?:рисун|нарис)|(?:рисун|нарис).{0,30}(?:нужн|обязатель|куда|позже|отправить)|(?:where|how|when|can i|do i|should i).{0,45}(?:drawing|sketch)|(?:drawing|sketch).{0,30}(?:required|later|send)|(?:puedo|necesito|c[oó]mo).{0,45}(?:dibujo|dibujar))/iu;
const RECEIPT_INQUIRY=/(?:(?:получили|получил|дошёл|дошел|пришло).{0,45}(?:рисун|фот|анкет|форм)|(?:рисун|фот|анкет|форм).{0,40}(?:получили|дошёл|дошел|пришло)|(?:did you (?:get|receive)|have you received|did it arrive).{0,50}(?:drawing|photo|picture|form|questionnaire)|(?:recibiste|recibieron).{0,45}(?:dibujo|foto|formulario|cuestionario))/iu;
const VAGUE=/^(?:help(?: me)?(?: please| pls)?(?: lol)?|моя жизнь|помогите(?: пожалуйста)?|нужна помощь|i need help|i want help|i need a diagnostic|my happening life|my life|ayuda|necesito ayuda|quiero ayuda|хочу помощи|мне нужна диагностика)[!.\s]*$/iu;
const FIRST=/^(?:sorry.{0,75}(?:first time|new to this)|извините.{0,55}(?:первый раз|впервые)|perd[oó]n.{0,60}primera vez)[!.…\s]*$/iu;
const REFERRAL=/(?:\b(?:got|found|received|followed)\b.{0,65}\b(?:link|meet\s*up|eventbrite|telegram|website|site|app)\b|(?:приш[её]л|наш[её]л|получил[а]?).{0,50}(?:ссылк|митап|meetup|сайт)|(?:encontr[eé]|recib[ií]).{0,60}(?:enlace|meet\s*up|sitio))/iu;
const NEGATIVE=/(?:negative events?|everything (?:is|seems) (?:going )?wrong|i'?m failing|struggling|overwhelmed|lost in life|anxious|worried|stressed|sad|afraid|just lost|breakup|divorce|много негативн|неприятност|всё плохо|неудач|отчаян|растерян|тревож|пережив|грустно|страшно|потерял|уволили|расстал|me siento perdid|estoy triste|estresad|preocupad|todo va mal|muchos problemas)/iu;
const GOAL_WORDS=/(?:want to|would like|i wish|my goal|i need to|хочу|хотел[ао] бы|моя цель|важно понять|quiero|me gustar[ií]a|mi meta|deseo)/iu;
const READY_CORRECTION=/^(?:нет,? не так|это не так|исправ|поправ|no,? that'?s wrong|not correct|correct that|change that|corrige|no es correcto)/iu;
const RESET=/^(?:начать заново|сначала|другая ситуация|сменим тему|start over|restart|different topic|let'?s switch topics|empezar de nuevo|otro tema)[!.\s]*$/iu;
const NO_ADVICE=/^(?:без советов|не давайте советов|просто выслушай|no advice|please just listen|don'?t advise|sin consejos|solo escuchar)[!.\s]*$/iu;
const HUMAN=/(?:хочу (?:сразу )?(?:к|со) (?:мастеру|специалистом|человеком)|нужен живой специалист|human (?:please|practitioner|therapist)|talk to (?:a )?(?:human|person|practitioner)|speak to (?:a )?(?:human|person)|hablar con (?:una )?persona|hablar con profesional)/iu;
const PHOTO=/(?:photo ?scan|photo ?reading|scan my photo|(?:check|chk) my energy|провер.{0,15}энерг|диагност.{0,15}по фото|по фотографии определить|lectura de foto|leer mi energ[ií]a)/iu;
const IDENTITY=/(?:are you (?:a )?(?:therapist|psychic|physic|doctor|human)|you are (?:a )?(?:therapist|physic|psychic)|ты (?:врач|психолог|экстрасенс)|вы (?:врач|психотерапевт|экстрасенс)|eres (?:un )?(?:m[eé]dico|terapeuta|vidente))/iu;
const PRIVACY=/(?:privacy|confidential|where.{0,15}(?:data|answers)|who (?:will|can) see|конфиденциал|кто увидит|где хранятся|данные|privacidad|confidencial|qui[eé]n ver[aá])/iu;
const FREE=/(?:is it free|is this free|how much|сколько стоит|это бесплатно|бесплатная ли|es gratis|cu[aá]nto cuesta)/iu;
const TIME=/(?:how long|how many questions|сколько вопросов|сколько времени|cu[aá]ntas preguntas|cu[aá]nto tiempo)/iu;
const NEED=/(?:what (?:details|information) (?:do|would) you (?:exactly )?need|what (?:details|information) would you exactly need|what do you need|что (?:мне )?(?:нужно|надо) (?:написать|указать|рассказать)|какие вопросы|qu[eé] informaci[oó]n necesitas)/iu;
const QUESTION_START=/^(?:почему|как|что|когда|где|зачем|можно ли|вы|ты|what|why|how|when|where|are you|can i|could you|do you|is this|will you|qu[eé]|por qu[eé]|c[oó]mo|cu[aá]ndo|puedo|eres)(?:[\s?!]|$)/iu;
const FIELD_PATTERNS=Object.freeze({
 goal:/^(?:\d[).:\-]?\s*)?(?:(?:my|моя|мой|mi)\s+)?(?:goal(?:\/desire)?|desire|цель|желание|meta|deseo)\s*(?:[:\-—]|is|это|es)\s*(.+)$/iu,
 challenge:/^(?:\d[).:\-]?\s*)?(?:(?:my|моя|мой|mi)\s+)?(?:challenge|obstacle|problem|трудность|препятствие|проблема|obst[aá]culo|dificultad|problema)\s*(?:[:\-—]|is|это|es)\s*(.+)$/iu,
 situation:/^(?:\d[).:\-]?\s*)?(?:(?:my|моя|mi)\s+)?(?:currently|now|current situation|сейчас|ситуация|ahora|situaci[oó]n actual)\s*(?:[:\-—]|is|это|es)\s*(.+)$/iu,
 impact:/^(?:impact|effect|влияние|как влияет|efecto|impacto)\s*(?:[:\-—]|is|это|es)\s*(.+)$/iu,
 attempts:/^(?:tried|already tried|пробовал[а]?|делал[а]?|intent[eé]|he intentado)\s*(?:[:\-—]|is|это|es)\s*(.+)$/iu,
 support:/^(?:support|helps|поддержка|помогает|apoyo|ayuda)\s*(?:[:\-—]|is|это|es)\s*(.+)$/iu,
});
const lang=x=>['ru','en','es'].includes(x)?x:'en';
const stageValid=x=>FREE_DIAGNOSTIC_PHASES.includes(x)?x:'goal';
const LIMIT=360;
function safeSlots(value){
 const out={};
 for(const key of FREE_DIAGNOSTIC_FIELDS)
   if(typeof value?.[key]==='string'&&value[key].trim())
     out[key]=value[key].trim().slice(0,key==='source'?180:LIMIT);
 return out;
}
function namedParts(message){
 const found={};
 for(const line of message.split(/[\n;]+/).map(x=>x.trim()).filter(Boolean)){
   for(const [key,p] of Object.entries(FIELD_PATTERNS)){
     const hit=p.exec(line);
     if(hit?.[1]?.trim())found[key]=hit[1].trim().slice(0,LIMIT);
   }
 }
 return found;
}
// Three required facts must match the protected CRM handoff guard: goal,
// obstacle, CURRENT SITUATION. Support remains an optional extra field.
// Already-started six-stage legacy interviews remain resumable.
const CORE_PATH=Object.freeze(['goal','challenge','situation','ready']);
const nextStage=(current,slots)=>{
 const stage=stageValid(current);
 const path=CORE_PATH.includes(stage)?CORE_PATH:FREE_DIAGNOSTIC_PHASES;
 for(let i=path.indexOf(stage)+1;i<path.length;i++){
   const key=path[i];
   if(key==='ready'||!slots[key])return key;
 }
 return 'ready';
};
function question(stage,locale,turns=[],alternative=0){
 const items=freeDiagnosticCopy(locale).questions[stage];
 if(!items?.length)return null;
 const prev=(Array.isArray(turns)?turns:[]).filter(t=>t?.role==='assistant')
   .slice(-6).map(t=>String(t.text||''));
 return items.slice(alternative).find(q=>!prev.some(text=>text.includes(q)))||
   items.find(q=>!prev.some(text=>text.includes(q)))||items[Math.min(alternative,items.length-1)];
}
const combine=(intro,next)=>[intro,next].filter(Boolean).join(' ').slice(0,320);
const MATERIAL_COPY=Object.freeze({
 ru:Object.freeze({
  form:'После подтверждения заявки вы получите ссылку на короткую анкету. Получение ответов подтвердим только после её отправки.',
  drawing:'Позже можно будет добавить рисунок «Я — Цель — Проблема». Он добровольный, а получение файла нужно отдельно проверить.',
  bot_identity:'Я Ali, цифровой помощник Holistic House. Андрею передам только согласованную вами заявку.',
  receipt:'Одного сообщения об отправке недостаточно, чтобы подтвердить получение файла или анкеты. Отметка появится только после проверки.'}),
 en:Object.freeze({
  form:'After you approve your request, you will get a short questionnaire link. We can confirm its receipt only after the answers are submitted.',
  drawing:'You can add a “Me — Goal — Problem” drawing later. It is optional, and the actual upload needs to be verified.',
  bot_identity:'I’m Ali, the Holistic House digital assistant. Only a request you approve will go to Andrey.',
  receipt:'A message saying you sent a file or form does not confirm receipt. It is marked received only after verification.'}),
 es:Object.freeze({
  form:'Tras aprobar tu solicitud recibirás un enlace a un cuestionario breve. Solo confirmaremos su recepción cuando envíes las respuestas.',
  drawing:'Más adelante puedes añadir un dibujo «Yo — Meta — Problema». Es opcional y hay que comprobar que el archivo llegó.',
  bot_identity:'Soy Ali, asistente digital de Holistic House. Solo se enviará a Andrey una solicitud que apruebes.',
  receipt:'Decir que enviaste un archivo o formulario no confirma su recepción. Se marca como recibido solo después de comprobarlo.'}),
});
/** Capture only an explicitly stated, non-procedural outcome in a first sentence.
 * Do not treat "I want to book" or "I want to ask" as a diagnostic goal. */
function explicitGoalClause(value){
 const first=String(value||'').split(/[.!?]\s+|\n/u)[0].trim();
 if(first.length<15||first.length>210||first.includes('?'))return null;
 if(!/^(?:я (?:очень )?хочу|мне хотелось бы|я бы хотел[а]?|i (?:really )?want to|i(?:'d| would) like to|quiero|me gustar[ií]a)\s+\S.{5,}$/iu.test(first))return null;
 if(/\b(?:book|speak|talk|call|ask|know|fill|send|upload|submit|schedule)\b|(?:записаться|спросить|узнать|отправить|выслать|заполнить|поговорить|связаться)|(?:reservar|hablar|enviar|rellenar|saber)/iu.test(first))return null;
 return first.slice(0,LIMIT);
}
function faq(text,locale){
 const c=freeDiagnosticCopy(locale);
 if(PHOTO.test(text))return c.photo;
 if(IDENTITY.test(text))return c.identity;
 if(PRIVACY.test(text))return c.privacy;
 if(FREE.test(text))return c.free;
 if(TIME.test(text))return c.time;
 if(NEED.test(text))return c.need;
 if(HUMAN.test(text))return c.human;
 return null;
}
const feeling=(message,copy)=>FIRST.test(message)?copy.firstTime:
  NEGATIVE.test(message)?copy.difficult:copy.acknowledge;
/**
 * Each input is the single already-consented user turn, or an authenticated
 * inline skip action. Stage, retryStage and slots are encrypted by the caller.
 * Comments in a short FAQ NEVER consume the current question.
 */
export function aliFreeDiagnosticTurn({message='',locale='ru',stage='goal',
 slots={},turns=[],retryStage=null,action=null}={}){
 const l=lang(locale),copy=freeDiagnosticCopy(l),text=String(message||'').trim().slice(0,1200);
 const phase=stageValid(stage),data=safeSlots(slots);
 if(STOP.test(text)||CRISIS.test(text))return null;
 if(action==='skip'||SKIP.test(text)){
   const next=nextStage(phase,data);
   return {stage:next,slots:data,retryStage:null,kind:'skip',
     reply:combine(copy.skip,next==='ready'?copy.ready:question(next,l,turns))};
 }
 if(RESET.test(text))return {stage:'goal',slots:{},retryStage:null,kind:'reset',
   reply:combine(copy.reset,question('goal',l,turns))};
 if(HOLD.test(text))return {stage:'ready',slots:data,retryStage:null,kind:'hold',
   reply:copy.hold};
 if(NO_ADVICE.test(text))return {stage:phase,slots:data,retryStage:null,kind:'boundary',
   reply:combine(copy.noAdvice,question(phase,l,turns))};
 if(READY_CORRECTION.test(text)){
   // The last explicit client correction wins, without erasing unrelated facts.
   const correction=text.replace(/^(?:нет,?\s*не так|это не так|исправ(?:ьте|ь)?|поправ(?:ьте|ь)?|no,?\s*that's wrong|not correct|correct that|change that|corrige|no es correcto)\s*[:.,!—-]?\s*/iu,'');
   const changed=namedParts(correction);
   const goal=explicitGoalClause(correction);
   if(goal&&!changed.goal)changed.goal=goal;
   if(Object.keys(changed).length){
     Object.assign(data,changed);
     const next=CORE_PATH.find(key=>key!=='ready'&&!data[key])||'ready';
     return {stage:next,slots:data,retryStage:null,kind:'correction',
       reply:next==='ready'?copy.ready:combine(copy.acknowledge,question(next,l,turns))};
   }
   return {stage:phase,slots:data,retryStage:null,kind:'correction',
     reply:copy.correction};
 }
 if(ACK_ONLY.test(text))return {stage:phase,slots:data,retryStage,kind:'acknowledgment',
   reply:combine(copy.short,phase==='ready'?null:question(phase,l,turns))};
 if(MATERIAL_CLAIM.test(text)||RECEIPT_INQUIRY.test(text))
   return {stage:phase,slots:data,retryStage,kind:'material_claim',
     reply:MATERIAL_COPY[l].receipt};
 // A question, expressed feeling, objection or boundary is not evidence
 // that the current phase has been answered. Choose an unused short template
 // and return to the same question only when the person wants to continue.
 const reaction=planAliFreeReaction({
   message:text,locale:l,turns,goalLike:GOAL_WORDS.test(text),
 })||(FORM_INQUIRY.test(text)?{id:'form',kind:'faq',resume:true}
     :DRAWING_INQUIRY.test(text)?{id:'drawing',kind:'faq',resume:true}:null);
 if(reaction){
   // A mixed message can both answer a question and ask about the service.
   // Preserve explicit evidence, answer the question, then ask only what is missing.
   const facts=reaction.kind==='boundary'?{}:namedParts(text);
   const goal=reaction.kind==='boundary'?null:explicitGoalClause(text);
   if(goal&&!facts.goal)facts.goal=goal;
   const evidence=Object.keys(facts).length>0;
   if(evidence)Object.assign(data,facts);
   const next=evidence?(CORE_PATH.find(key=>key!=='ready'&&!data[key])||'ready'):phase;
   const answer=MATERIAL_COPY[l][reaction.id]||reaction.reply;
   return {stage:next,slots:data,retryStage:evidence?null:retryStage,
     kind:'reaction',reactionId:reaction.id,
     reply:combine(answer,reaction.resume&&next!=='ready'
       ?question(next,l,turns):evidence&&next==='ready'?copy.ready:null)};
 }
 const answer=faq(text,l);
 if(answer&&(text.length<280||!GOAL_WORDS.test(text)))return {
   stage:phase,slots:data,retryStage,kind:'faq',
   reply:combine(answer,phase==='ready'?null:question(phase,l,turns))};
 if(REFERRAL.test(text)&&!GOAL_WORDS.test(text)){
   data.source ||=text.slice(0,180);
   return {stage:phase,slots:data,retryStage,kind:'referral',
     reply:combine(copy.referral,question(phase,l,turns))};
 }
 if(GREETING.test(text)||VAGUE.test(text)||FIRST.test(text))
   return {stage:phase,slots:data,retryStage,kind:'opening',
     reply:combine(FIRST.test(text)?copy.firstTime:copy.short,question(phase,l,turns))};
 if(UNSURE.test(text)){
   if(retryStage===phase){
     const next=nextStage(phase,data);
     return {stage:next,slots:data,retryStage:null,kind:'uncertain_skip',
       reply:combine(copy.unsure,next==='ready'?copy.ready:question(next,l,turns))};
   }
   return {stage:phase,slots:data,retryStage:phase,kind:'uncertain_rephrase',
     reply:combine(copy.unsure,question(phase,l,turns,1))};
 }
 const labeled=namedParts(text);
 Object.assign(data,labeled);
 if(phase==='ready'){
   if(!Object.keys(labeled).length)data.notes=text.slice(0,LIMIT);
   return {stage:'ready',slots:data,retryStage:null,kind:'addition',reply:copy.more};
 }
 if(QUESTION_START.test(text)&&/[?？]$/.test(text)&&text.length<240)
   return {stage:phase,slots:data,retryStage,kind:'question',
     reply:combine(copy.need,question(phase,l,turns))};
 if(phase==='goal'&&(NEGATIVE.test(text)||SITUATION_ONLY.test(text))&&!GOAL_WORDS.test(text)){
   data.situation ||=text.slice(0,LIMIT);
   return {stage:'goal',slots:data,retryStage:null,kind:'distress',
     reply:combine(copy.difficult,question('goal',l,turns,1))};
 }
 if(!Object.keys(labeled).length)
   data[phase]=text.slice(0,LIMIT);
 const covered=['goal','challenge','situation','impact','attempts','support']
   .some(key=>Boolean(data[key]));
 if(!covered)return {stage:phase,slots:data,retryStage:null,kind:'clarify',
   reply:combine(copy.short,question(phase,l,turns,1))};
 const next=Object.keys(labeled).length
   ?CORE_PATH.find(key=>key!=='ready'&&!data[key])||'ready'
   :nextStage(phase,data);
 return {stage:next,slots:data,retryStage:null,kind:next==='ready'?'complete':'progress',
   reply:next==='ready'?copy.ready:combine(feeling(text,copy),question(next,l,turns))};
}
/** Client-visible factual draft, not analysis or an automatic CRM handoff. */
export function aliFreeDiagnosticSummary({locale='ru',slots={}}={}){
 const copy=freeDiagnosticCopy(lang(locale)),data=safeSlots(slots);
 if(!['goal','challenge','situation','impact','attempts','support','notes']
   .some(key=>data[key]))return null;
 return [copy.summary,...FREE_DIAGNOSTIC_FIELDS.filter(key=>data[key])
   .map(key=>copy.labels[key]+': '+data[key])].join('\n').slice(0,900);
}
export function aliFreeDiagnosticFirst(locale='ru'){return freeDiagnosticCopy(lang(locale)).first;}
export function aliFreeDiagnosticIntro(locale='ru'){return freeDiagnosticCopy(lang(locale)).intro;}
export function aliFreeDiagnosticEmpty(locale='ru'){return freeDiagnosticCopy(lang(locale)).empty;}
export function aliFreeDiagnosticReady(stage){return stageValid(stage)==='ready';}
