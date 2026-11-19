/**
 * P0 Wave Magic Director: one advisory, channel-neutral Alchemy Mind.
 * The authenticated host owns auth, safety, consent, stage, catalogue, CRM,
 * payment and booking. No request text is an authorization or an order.
 */
import {routeMindRole} from './mind-role-router.mjs';
import {planEmpathyTurn} from './empathy-mind.mjs';
export const WAVE_MAGIC_DIRECTOR_VERSION='wave-magic-director-v1';
const LANGS=new Set(['en','ru','es']);
const ID=/^[a-z][a-z0-9_-]*:[A-Za-z0-9_:-]{1,85}$/i;
const URL=/^\/(?:en|ru|es)\/[a-zA-Z0-9/_-]+$|^https:\/\/holistichouse\.vercel\.app\/(?:en|ru|es)\/[a-zA-Z0-9/_-]+$|^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/;
const STOP=/^(?:\/stop|стоп|отмена|хватит|stop|cancel|basta|cancelar|parar)[.!…\s]*$/iu;
const PAUSE=/^(?:я подумаю|не сейчас|пока не готов[а]?|i(?:'ll| will) think about it|not now|maybe later|ahora no)[.!…\s]*$/iu;
const NO_OFFERS=/(?:без продаж|не предлагай(?:те)? услуг|без советов|просто выслушай|don't sell|no sales|no advice|just listen|sin consejos|sin ofertas)/iu;
const FACT=/цен[аыуе]|сколько стоит|стоимост|не работает|как оплатить|price|how much|what is the cost|not working|precio|cu[aá]nto cuesta/iu;
const BOOK=/(?:хочу записаться|запиши(?:те)? меня|оформить (?:заявку|заказ)|готов(?:а)? записаться|можно(?: ли)?(?: сразу)? записаться|как записаться|book (?:me|a|an)|schedule (?:a|my)|want to book|(?:can|could) i (?:book|schedule)|how (?:do|can) i book|quiero reservar|puedo reservar|c[oó]mo reservo|reservar cita|agendar consulta)/iu;
const OPTIONS=/(?:какие (?:есть|у вас) (?:вариант|услуг|способ)|что (?:можно|вы) (?:предлага|попробовать)|подбер|посовет|рекоменд|хочу выбрать|с чего начать|what (?:are my options|do you offer)|what can i try|recommend|suggest|which service|help me choose|que ofrecen|opciones|recomiend|alternativas)/iu;
const CONFIRMED=new Set(['PREVIEW','CONFIRM_SEND','CRM_ACCEPTED','PRACTITIONER_CONFIRMATION']);
const copy={
 ru:{start:'С чего вам хотелось бы начать?',goal:'Что вам хотелось бы изменить?',service:'На какую услугу хотите записаться?',optIn:'Можем разобраться глубже, если вы согласны. Продолжим?',deeper:'Что в этой ситуации самое важное?'},
 en:{start:'What would you like to begin with?',goal:'What would you like to change?',service:'Which service would you like to request?',optIn:'We can explore this more deeply if you opt in. Would you like to continue?',deeper:'What matters most in this situation?'},
 es:{start:'¿Con qué te gustaría empezar?',goal:'¿Qué te gustaría cambiar?',service:'¿Qué servicio te gustaría solicitar?',optIn:'Podemos profundizar si das tu consentimiento. ¿Te gustaría continuar?',deeper:'¿Qué es lo más importante en esta situación?'}
};
const historyOf=turns=>(Array.isArray(turns)?turns:[]).slice(-12)
 .filter(x=>x&&['user','assistant'].includes(x.role)&&typeof x.text==='string')
 .map(x=>({role:x.role,text:x.text.slice(0,1000)}));
function chooseTwo(rows,lang){
 const out=[],seen=new Set();
 for(const row of Array.isArray(rows)?rows:[]){
  if(out.length===2)break;
  if(!row||row.status==='draft'||row.published===false||
     typeof row.id!=='string'||!ID.test(row.id)||seen.has(row.id)||
     !['service','test','practice','koan','specialist','course','video','audio'].includes(row.kind)||
     !row.id.startsWith(row.kind+':')||typeof row.title!=='string'||
     !row.title.trim()||row.title.length>150||typeof row.href!=='string'||
     !URL.test(row.href))continue;
  if(row.href.startsWith('/')&&!row.href.startsWith('/'+lang+'/'))continue;
  if(row.href.startsWith('https://holistichouse.vercel.app/')&&
     !row.href.startsWith('https://holistichouse.vercel.app/'+lang+'/'))continue;
  out.push(Object.freeze({id:row.id,kind:row.kind,title:row.title.trim(),href:row.href}));
  seen.add(row.id);
 }
 return Object.freeze(out);
}
/** This function is for the HOST to call with HOST-verified evidence only. */
export function planWaveMagicTurn({message='',locale='en',history=[],channel='web',
 safety={status:'unknown'},selectedGoal=null,currentRole=null,requestedRole=null,
 sessionRoleVerified=false,validatedPsychologistConsent=false,
 verifiedRecommendations=[],verifiedSelection=null,serverStage=null,
 serverStageVerified=false}={}){
 const lang=LANGS.has(locale)?locale:'en';
 const text=typeof message==='string'?message.trim().slice(0,3000):'';
 const safe=safety?.status==='clear',past=historyOf(history);
 const roleDecision=routeMindRole({message:text,locale:lang,history:past,
  selectedGoal,currentRole,requestedRole,sessionRoleVerified,validatedPsychologistConsent});
 const mode=safe?roleDecision.role:'secretary';
 const stop=STOP.test(text)||roleDecision.reason==='client_stop';
 const pause=PAUSE.test(text);
 const noOffers=stop||pause||NO_OFFERS.test(text)||roleDecision.reason==='client_boundary';
 const fact=FACT.test(text)||roleDecision.reason==='factual_handoff';
 const book=safe&&!noOffers&&BOOK.test(text)&&!/(?:не хочу|don't want|no quiero)/iu.test(text);
 const wantsOptions=safe&&!noOffers&&!fact&&!book&&
  (OPTIONS.test(text)||mode==='sales');
 const recommendations=wantsOptions?chooseTwo(verifiedRecommendations,lang):Object.freeze([]);
 const consentRequired=safe&&roleDecision.requiresConsent===true;
 const psych=mode==='secretary_psychologist'&&validatedPsychologistConsent===true;
 const empathy=safe&&!stop?planEmpathyTurn({message:text,locale:lang,history:past,
  role:mode,safety,consent:{psychologistMode:psych}}):null;
 const selection=verifiedSelection?.serverVerified===true&&
   typeof verifiedSelection.id==='string'&&ID.test(verifiedSelection.id)&&
   verifiedSelection.id.startsWith('service:')?
     Object.freeze({id:verifiedSelection.id}):null;
 let intent='conversation',dialogueStage='UNDERSTAND',nextAction='answer',question=null;
 if(!safe){intent='safety';dialogueStage='PAUSED';nextAction='host_safety_handoff';}
 else if(stop){intent='stop';dialogueStage='PAUSED';nextAction='pause';}
 else if(pause){intent='pause';dialogueStage='PAUSED';nextAction='pause';}
 else if(consentRequired){intent='optional_deepening';dialogueStage='OPTIONAL_DEEP_CONSENT';
  nextAction='request_psychologist_consent';question=copy[lang].optIn;}
 else if(book){intent='booking';dialogueStage=selection?'DRAFT_REQUEST':'SELECT';
  nextAction=selection?'verified_booking_intake':'select_verified_service';
  question=selection?null:copy[lang].service;}
 else if(fact){intent='factual_question';}
 else if(empathy?.noAdvice){intent='emotional_support';dialogueStage='CLARIFY';nextAction='listen';}
 else if(recommendations.length){intent='options';dialogueStage='OFFER_TWO';nextAction='offer_options';}
 else if(wantsOptions){intent='options';dialogueStage='CLARIFY';
  nextAction='ask_one_question';question=copy[lang].goal;}
 else if(psych){intent='voluntary_deepening';dialogueStage='CLARIFY';
  nextAction='ask_one_question';question=empathy?.question||copy[lang].deeper;}
 else if(mode==='coach'){intent='coaching_goal';dialogueStage='CLARIFY';
  nextAction='ask_one_question';question=empathy?.question||copy[lang].goal;}
 else if(empathy){intent='emotional_support';dialogueStage='CLARIFY';
  nextAction=empathy.noAdvice?'listen':'ask_one_question';question=empathy.question||null;}
 else if(!text){dialogueStage='CLARIFY';nextAction='ask_one_question';question=copy[lang].start;}
 // Server-confirmed CRM and checkout state is NOT inferred from a message.
 if(safe&&!stop&&!pause&&serverStageVerified===true&&CONFIRMED.has(serverStage)){
  dialogueStage=serverStage;nextAction='follow_server_checkout_state';question=null;
 }
 return Object.freeze({
  version:WAVE_MAGIC_DIRECTOR_VERSION,channel:channel==='telegram'?'telegram':'web',
  locale:lang,intent,mode,depth:psych?'deep_optional':mode==='coach'?'goal_work':'brief',
  dialogueStage,nextAction,question,emotionalMove:empathy?.move||'none',
  evidence:{reason:roleDecision.reason,confidence:roleDecision.confidence,
   explicitEmotion:empathy?.evidence||null},
  consentRequired,recommendations,selectionContext:selection,
  handoff:book?Object.freeze({kind:selection?'existing_service_intake':'verified_service_selection',
   maySubmit:false,requiresSeparateConfirmation:true}):null,
  constraints:Object.freeze({noDiagnosis:true,noAutomaticSale:true,noCRMWrite:true,
   noImplicitConsent:true,noInventedAvailability:true,noPaymentWithoutProvider:true,
   respectNoOffers:noOffers}),
  roleDecision
 });
}
