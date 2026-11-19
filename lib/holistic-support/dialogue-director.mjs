/**
 * Wave Dialogue Director: one pure, non-clinical planning layer for existing minds.
 * No database, model, I/O, authorization, diagnosis, booking or CRM writes.
 * Completeness measures explicit conversational evidence, not model confidence.
 */
export const DIALOGUE_DIRECTOR_VERSION='wave-dialogue-director-v1';
export const DIALOGUE_STAGES=Object.freeze(['contact','understand','explore','recommend','handoff']);
const langs=new Set(['ru','en','es']);
const clean=s=>String(s||'').trim().toLocaleLowerCase().replace(/ё/g,'е');
const cue={
 danger:/(?:суицид|самоубийств|хочу умереть|не хочу жить|убью себя|боль в груди|не могу дышать|suicid|kill myself|want to die|chest pain|cannot breathe|quiero morir|dolor en el pecho|no puedo respirar)/iu,
 command:/(?:^\/|https?:\/\/|<[^>]*>)/iu,
 stop:/^(?:стоп|хватит|закончим|не хочу продолжать|stop|enough|cancel|end conversation|parar|basta)[\s.!?]*$/iu,
 unsure:/^(?:не знаю|не уверен[а]?|сложно сказать|i don'?t know|not sure|hard to say|no s[eé]|no estoy segur[oa])[\s.!?]*$/iu,
 skip:/^(?:пропустить|пропущу|skip|pass|omitir|saltar)[\s.!?]*$/iu,
 greet:/^(?:привет|приветик|здравствуйте|добрый день|hello|hi|hey|hola|buenas)[\s.!?]*$/iu,
 correction:/(?:нет[,!. ]+не |точнее[,!. ]+|на самом деле|дело не в |меняем тему|другая тема|no[,!. ]+actually|i meant|not about|change the subject|en realidad|no se trata de|cambiemos de tema)/iu,
 noAdvice:/(?:не (?:хочу|нужно|надо) советов|без советов|просто (?:выслушай|послушай)|не советуй|no advice|without advice|just listen|don't give me advice|do not give me advice|sin consejos|solo escucha)/iu,
 yesAdvice:/(?:хочу совет|дай совет|что (?:мне )?делать|give me advice|what should i do|dame consejos|que debo hacer)/iu,
 noSale:/(?:не (?:хочу|предлагай|надо|нужны) (?:мне )?(?:услуг|сесси|консультац|продаж)|не записывай|не готов[а]? записываться|без продаж|don't (?:sell|pitch|book)|do not (?:sell|book)|not ready to book|no sales|sin ventas|no quiero reservar)/iu,
 yesSale:/(?:хочу записаться|готов[а]? записаться|помоги записаться|i (?:want|would like|am ready) to book|please book|quiero reservar|quiero una cita)/iu,
 booking:/(?:хочу записаться|запиши(?:те)? меня|запись на (?:сесси|консультац)|готов[а]? записаться|i (?:want|would like) to book|book (?:me|a session)|quiero reservar|quiero una cita)/iu,
 faq:/(?:сколько стоит|цен[аыуе]|стоимост|как оплатить|как зарегистр|как записаться|где (?:найти|посмотреть)|какие (?:есть|у вас) услуги|how much|what(?:'s| is) the (?:price|cost)|how (?:do|can) i (?:book|pay|sign up)|where (?:can i|are)|cu[aá]nto cuesta|precio|como (?:reservar|pagar))/iu,
 action:/(?:оплати|отправь|удали|сгенерируй|сделай заказ|переведи деньги|pay for|send my|delete my|generate a|transfer money|paga|borra|envia)/iu,
 goal:/(?:хочу(?=\s|[,!.?]|$)|хочется(?=\s|[,!.?]|$)|хотел(?:а|ось) бы|мне нужно(?=\s|[,!.?]|$)|моя цель|желание|i (?:want|need|would like|hope)(?:\s|$)|i'd like|my goal|quiero\b|me gustar[ií]a|necesito\b|mi objetivo)/iu,
 nonGoal:/(?:не хочу|i don't want|do not want|no quiero)/iu,
 vagueGoal:/^(?:i need help|help me please|мне нужна помощь|помогите мне|necesito ayuda)[\s.!?]*$/iu,
 serviceOnly:/(?:хочу записаться|хочу консультац|i want to book|i need a session|quiero reservar)/iu,
 changeGoal:/(?:измен|налад|понять|разобра|спокой|уверен|выбрат|improve|change|understand|clarify|decide|feel better|mejorar|cambiar|entender)/iu,
 issue:/(?:у меня|мне (?:тяжело|сложно|трудно|плохо|страшно|грустно|тревожно)|я (?:боюсь|устал|не могу|переживаю)|сейчас|в последнее время|в отношениях|на работе|не получа|сложност|проблем|ссор|дело не в|i (?:feel|have|am|can't|cannot|struggle)|my (?:relationship|job|work|life)|currently|now is|it is hard|things are|i'm having|not about|me siento|tengo|me cuesta|estoy|mi (?:pareja|trabajo|vida)|no se trata de)/iu,
 obstacle:/(?:\bно\b|не могу|не получа|не удае|мешает|трудно|сложно|боюсь|из-за|пережива|конфликт|ссор|but\b|because\b|can't\b|cannot\b|hard\b|difficult|struggl|\bstuck\b|застря|застопор|estancad|atascad|afraid|worried|conflict|pero\b|porque\b|dif[ií]cil|miedo|no puedo)/iu,
 attempt:/(?:уже пробовал|уже пробовала|мне помог|мы пробовали|i (?:have )?tried|i attempted|has helped|ya intent[eé]|he probado)/iu,
 constraint:/(?:бесплатн|не дороже|бюджет|онлайн|очно|по видеосвязи|письменн|без видео|free\b|budget|online|in.person|video call|without video|under ?(?:€|eur)|gratis|presencial|en l[ií]nea)/iu
};
const questions=Object.freeze({
 ru:{contact:['С чего вам хотелось бы начать — что сейчас важно?','Что хотелось бы прояснить в первую очередь?','О какой ситуации хочется рассказать?'],
  understand:['Что вам хотелось бы изменить в этой ситуации?','Если станет немного лучше, что изменится первым?','Какого результата хотелось бы достичь?'],
  explore:['Что сейчас больше всего мешает желаемому изменению?','Когда трудность особенно заметна?','Что из происходящего кажется самым сложным?'],
  handoff:['На какую именно консультацию хотите записаться?','Какую опубликованную услугу вы выбрали?','Какая консультация вас заинтересовала?'],
  listen:'Хорошо, без советов и предложений. Можете рассказать, что сейчас важно.',
  unsure:'Можем продолжить разговор без выбора решения.',
  repeat:'Можно пропустить этот вопрос или рассказать о том, что сейчас важнее.'},
 en:{contact:['Where would you like to begin?','What would you most like to clarify?','What situation would you like to talk about?'],
  understand:['What would you like to change about this?','If things improved a little, what would change first?','What outcome would matter most to you?'],
  explore:['What is making that change difficult?','When does this feel especially hard?','Which part feels most difficult?'],
  handoff:['Which consultation would you like to request?','Which published service have you chosen?','Which consultation interests you?'],
  listen:'Of course. No advice or offers. You can share what feels important.',
  unsure:'We can keep talking without choosing a solution.',
  repeat:'You can skip this question or share what matters most.'},
 es:{contact:['¿Por dónde te gustaría empezar?','¿Qué te gustaría aclarar primero?','¿Qué situación quieres contarme?'],
  understand:['¿Qué te gustaría cambiar en esta situación?','Si mejorara un poco, ¿qué cambiaría primero?','¿Qué resultado sería más importante para ti?'],
  explore:['¿Qué está dificultando ese cambio?','¿Cuándo se vuelve especialmente difícil?','¿Qué parte te resulta más complicada?'],
  handoff:['¿Qué consulta te gustaría solicitar?','¿Qué servicio publicado elegiste?','¿Qué consulta te interesa?'],
  listen:'Claro. Sin consejos ni ofertas. Puedes contarme lo que sea importante.',
  unsure:'Podemos seguir conversando sin elegir una solución.',
  repeat:'Puedes omitir esta pregunta o contarme qué es más importante.'}
});
const boundedRows=(history,message)=>[...(Array.isArray(history)?history:[]).slice(-16).filter(
 x=>x&&['user','assistant'].includes(x.role)&&typeof x.text==='string'&&x.text.length<=1200),
 {role:'user',text:message}];
function evidenceFrom(rows){
 const all=rows.filter(x=>x.role==='user').map(x=>clean(x.text));
 const resetIndex=all.findLastIndex(s=>cue.correction.test(s));
 const clients=resetIndex>=0?all.slice(resetIndex):all;
 const evidence={situation:false,goal:false,challenge:false,attempts:false,constraints:false};
 for(const s of clients){
  if(s.length<11||s.split(/\s+/u).length<3||cue.greet.test(s)||cue.unsure.test(s)||
    cue.skip.test(s)||cue.stop.test(s)||cue.faq.test(s)||cue.action.test(s))continue;
  evidence.situation ||=cue.issue.test(s);
  evidence.goal ||=cue.goal.test(s)&&!cue.nonGoal.test(s)&&!cue.vagueGoal.test(s)&&
    (!cue.serviceOnly.test(s)||cue.changeGoal.test(s));
  evidence.challenge ||=cue.obstacle.test(s);
  evidence.attempts ||=cue.attempt.test(s);
  evidence.constraints ||=cue.constraint.test(s);
 }
 return evidence;
}
function activeRefusal(rows,negative,resume){
 let value=false;
 for(const x of rows){if(x.role!=='user')continue;
  if(resume.test(x.text))value=false;
  if(negative.test(x.text))value=true;
 }
 return value;
}
function nextQuestion(stage,lang,rows){
 const seen=rows.filter(x=>x.role==='assistant').slice(-6).map(x=>clean(x.text));
 return questions[lang][stage].find(q=>!seen.some(text=>text.includes(clean(q))))||null;
}
export function planDialogueDirectorTurn({message='',locale='ru',history=[],roleHint='secretary',
 psychologistConsent=false,selectedService=false,safety={status:'clear'}}={}){
 const lang=langs.has(locale)?locale:'en',raw=typeof message==='string'?message.trim():'';
 const role=roleHint==='secretary_psychologist'&&psychologistConsent===true?
  'secretary_psychologist':roleHint==='coach'?'coach':'secretary';
 const limits={maxQuestions:1,maxOffers:2,canBook:false,canPay:false,canSendToCRM:false,canInferDiagnosis:false};
 const basic={version:DIALOGUE_DIRECTOR_VERSION,role,locale:lang,stage:'contact',
  evidence:{situation:false,goal:false,challenge:false,attempts:false,constraints:false,selectedService:selectedService===true},
  completenessPercent:0,nextAction:'defer',nextQuestion:null,nativeReply:null,
  noAdvice:false,noSales:false,bookingRequested:false,limits};
 if(!raw||raw.length>1200||safety?.status!=='clear'||cue.danger.test(raw)||cue.command.test(raw))
  return {...basic,reason:'protected_or_unsupported'};
 const rows=boundedRows(history,raw),e=evidenceFrom(rows);
 e.selectedService=selectedService===true;
 const noAdvice=activeRefusal(rows,cue.noAdvice,cue.yesAdvice);
 const noSales=activeRefusal(rows,cue.noSale,cue.yesSale);
 const bookingRequested=cue.booking.test(raw)&&!cue.noSale.test(raw);
 const completenessPercent=Math.min(100,(e.situation?35:0)+(e.goal?35:0)+
   (e.challenge?15:0)+(e.constraints||e.selectedService?15:0));
 const base={...basic,evidence:e,completenessPercent,noAdvice,noSales,bookingRequested};
 if(cue.stop.test(raw))return {...base,stage:'handoff',nextAction:'stop',reason:'client_stopped'};
 if(cue.greet.test(raw)||cue.skip.test(raw)||cue.action.test(raw))
  return {...base,reason:'specialist_workflow'};
 if(cue.faq.test(raw)&&!bookingRequested)return {...base,reason:'answer_factual_first'};
 if(cue.yesAdvice.test(raw)&&!bookingRequested)return {...base,reason:'explicit_advice_request'};
 if(noAdvice&&!bookingRequested)return {...base,stage:'explore',nextAction:'listen',
  nativeReply:questions[lang].listen,reason:'advice_declined'};
 if(cue.unsure.test(raw)&&rows.filter(x=>x.role==='user'&&cue.unsure.test(clean(x.text))).length>1)
  return {...base,nextAction:'listen',nativeReply:questions[lang].unsure,reason:'repeated_uncertainty'};
 if(bookingRequested&&e.selectedService)return {...base,stage:'handoff',
  nextAction:'verified_booking_flow',reason:'explicit_service_and_booking'};
 let stage='contact';
 if(bookingRequested)stage='handoff';
 else if(!e.situation&&!e.goal)stage='contact';
 else if(!e.goal&&!e.selectedService)stage='understand';
 else if(!e.situation&&!e.selectedService)stage='explore';
 else if((role==='secretary_psychologist'||role==='coach')&&!e.challenge)stage='explore';
 else if(noSales)return {...base,stage:'explore',nextAction:'listen',reason:'sales_declined'};
 else if(e.selectedService)return {...base,stage:'handoff',nextAction:'verified_service_flow'};
 else return {...base,stage:'recommend',nextAction:'rank_two_verified_options',reason:'sufficient_context'};
 const question=nextQuestion(stage,lang,rows);
 if(!question)return {...base,stage,nextAction:'listen',nativeReply:questions[lang].repeat,
  reason:'question_variants_exhausted'};
 const nativeAllowed=stage==='understand'&&e.situation&&!e.goal&&raw.length<=280&&
  !cue.unsure.test(raw)&&!bookingRequested&&!noSales&&!noAdvice;
 return {...base,stage,nextAction:'clarify',nextQuestion:question,
  nativeReply:nativeAllowed?question:null,
  reason:stage==='handoff'?'service_not_selected':'missing_client_evidence'};
}
/** Never echo source text in an API status or diagnostic payload. */
export function publicDialogueDirectorState(plan){
 if(plan?.version!==DIALOGUE_DIRECTOR_VERSION)return null;
 return {version:plan.version,stage:plan.stage,role:plan.role,
  completenessPercent:plan.completenessPercent,evidence:plan.evidence,
  nextAction:plan.nextAction,questionSuggested:Boolean(plan.nextQuestion),limits:plan.limits};
}
