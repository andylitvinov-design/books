/**
 * Ali · shared conversational mode switch, editorial policy only.
 * All roles run inside ONE Holistic Intelligence. This module does NOT execute
 * language models, record data, book, sell, diagnose or grant permissions.
 *
 * Inputs from a public request (including messages, history and selectedGoal)
 * are UNTRUSTED. Only the authenticated host may set sessionRoleVerified and
 * validatedPsychologistConsent after verifying its signed session and opt-in.
 */
export const ALI_MODE_SWITCH_VERSION='ali-shared-mode-switch-v1';
export const ALI_DIALOGUE_ROLES=Object.freeze([
  'secretary','sales','coach','secretary_psychologist',
]);
const validRoles=new Set(ALI_DIALOGUE_ROLES);
const locales=new Set(['ru','en','es']);
const goals=new Set(['energy','relationships','money','goals','meaning']);
const safe=x=>typeof x==='string'?x.toLocaleLowerCase().normalize('NFKC')
  .replace(/ё/gu,'е').replace(/[’']/gu,"'").replace(/\s+/gu,' ').trim().slice(0,1800):'';

const urgent=/(?:суицид|самоубийств|не хочу жить|хочу умереть|убить себя|не могу дышать|боль в груди|трудно дышать|(?:i want to die|suicid|kill myself|hurt myself|chest pain|cannot breathe|can't breathe)|(?:quiero morir|suicid|dolor en el pecho|no puedo respirar))/iu;
// Recognized personal disclosure is not an invitation to sell or diagnose.
const emotionalDisclosure=/(?:мне (?:тревожно|страшно|грустно|одиноко|тяжело|плохо|обидно)|я (?:расстроен[а]?|боюсь|переживаю|в отчаянии)|i (?:feel|am) (?:anxious|sad|scared|lonely|upset|overwhelmed)|me siento (?:triste|ansios[oa]|sol[oa])|estoy (?:triste|preocupad[oa]))/iu;
const stop=/^(?:\/stop|стоп|хватит|закончим|закончить разговор|не хочу продолжать|пока|до свидания|stop|end chat|finish chat|goodbye|bye|cancel|cancelar|basta|parar|terminemos)(?:[.!…\s]*)$/iu;
const switchTopic=/(?:сменим тему|сменить тему|давай(?:те)? о другом|поговорим о другом|новая тема|другая тема|не об этом|change (?:the )?(?:subject|topic)|switch topics|new topic|something else|not about that|cambiar de tema|otro tema|hablemos de otra cosa)/iu;
const noSales=/(?:без продаж|не продава(?:й|йте)|не предлагай(?:те)? (?:мне )?(?:услуг|консультац|покуп)|не хочу (?:ничего )?(?:покупать|заказывать)|мне не нужны услуги|don't (?:sell|pitch)|do not (?:sell|pitch)|no (?:sales|offers|services)|sin ofertas|no quiero (?:servicios|ofertas))/iu;
// The absence of an advice request is NOT a request to leave an opt-in session.
const noAdviceOnly=/(?:без советов|не надо давать советы|не советуй(?:те)?|просто ответь|только факты|no advice|without advice|just answer|facts only|sin consejos|solo datos|no me des consejos)/iu;
const explicitNoCoaching=/(?:не хочу коучинг|без коучинга|no coaching|don't coach me|do not coach me|not looking for coaching|no quiero coaching)/iu;
const optOutPsychologist=/(?:не хочу (?:режим психолога|психологический режим|психологическую беседу|психолога)|без психолога|no psychologist|no psychology mode|stop psychologist mode|no quiero psic[oó]logo|no quiero modo psic[oó]logo)/iu;
const noCoach=/(?:не хочу (?:коучинг|советов|совет|упражнен|обсуждать чувства)|не надо давать советы|без коучинга|без советов|просто ответь|только факты|не советуй(?:те)?|(?:no coaching|don't coach me|do not coach me|no advice|just answer|facts only|not looking for coaching|sin consejos|no quiero coaching|solo datos))/iu;
const bookingDecline=/(?:не хочу записываться|не надо записывать|не надо бронировать|i (?:do not|don't) want to book|no quiero reservar)/iu;
const booking=/(?:запиши(?:те)? меня|записат(?:ь|ься)|хочу записаться|брон(?:ь|ирова)|оформ(?:ить|и|ите) (?:заявк|заказ)|готов(?:а)? (?:оплатить|записаться)|оплат(?:а|ить)|(?:book (?:me|now|an appointment|a session)|(?:can i|how do i|how can i) (?:book|schedule|pay)|(?:want|ready) to (?:book|pay|order)|reserve|schedule (?:a|my) session|quiero reservar|cómo reservar|como reservar|pagar|reservar cita))/iu;
const secretaryFaq=/(?:сколько (?:это )?стоит|цена|цену|цене|стоимост|прайс|подписк|кабинет|войти|доступ|ошибка|не работает|не открыва|техническ|часы работы|где (?:мой|моя|найти)|where (?:is my|can i find)|price|pricing|how much|(?:what(?:'s| is) the cost)|cost of|payment|subscription|account|login|sign in|error|not working|technical support|precio|cuanto cuesta|cuánto cuesta|cuál es el precio|acceso|iniciar sesión|suscripci[oó]n)/iu;
const ellipticalPrice=/^(?:а )?(?:цена|цену|ценник|по цене|сколько|сколько стоит|и сколько стоит|а сколько|how much|price|and the price|cost|precio|cuánto|cuanto)[?.! ]*$/iu;
const service=/\b(?:services?|sessions?|consultations?|therap(?:y|ist)|courses?|reiki|homeopath(?:y|ic)?|constellations?|specialist|practitioner|coaching (?:session|service)|servicios?|sesion(?:es)?|sesión|consulta(?:s)?|terapia|curso(?:s)?|reiki|constelaci[oó]n|psicoterapia)\b|услуг|консультац|сесси|сеанс|курсы?|мастер|специалист|психотерап|образн|гомеопат|расстанов|рейки|опор[ауы]|практик/iu;
const salesDiscovery=/(?:какие (?:у вас )?услуг|что (?:вы )?предлага|интересу(?:ет|юсь)|хочу узнать|просто уточня|расскажите (?:о|про)|как проходит|что входит|для чего|кому подходит|подбер|посовет|рекоменд|сравн|отлича|что выбрать|что лучше|what (?:do you offer|services do you)|interested in|just (?:asking|inquiring|checking)|tell me about|how does .* work|what is included|help me choose|which service|recommend|compare (?:these|services)|me interesa|quiero saber|solo pregunto|qué ofrecen|que ofrecen|cómo funciona|como funciona|recomiend|comparar)/iu;
// A client asking what Holistic House offers is explicitly exploring services,
// even if the word "service" is omitted from that first contact.
const openOfferQuestion=/(?:что (?:вы )?предлага(?:ете|ешь)|what do you offer|what can you offer|qu[eé] ofrecen|que ofrecen)/iu;
const salesObjection=/(?:дорог[оаи]|не по карману|не потяну|не могу позволить|слишком высокая цена|нет времени|слишком долго|не доверяю|нет отзывов|сомневаюсь|не подходит|не подойдет|боюсь идти|поможет ли|эффективн|будет ли результат|я подумаю|надо подумать|пока не готов[а]?|не уверен[а]?,? что (?:мне )?(?:поможет|подойдет|подходит)|не знаю, подходит ли|not sure it's for me|expensive|too pricey|can't afford|not ready|think about it|need to think|no time|too busy|not sure it works|not for me|doesn't fit|will it work|does it help|muy caro|no tengo tiempo|lo pensar[eé]|no estoy list[oa]|no conf[ií]o|no es para m[ií])/iu;
const positivePrice=/(?:недорого|совсем не дорого|цена подходит|not expensive|affordable price|no es caro|precio razonable)/iu;
const coachSpecific=/(?:мо[яю] цел[ьи]|сво[ею] цель|цель на|цел[ье]й|хочу (?:разобраться со своей целью|разобраться в отношениях|поработать над целью|изменить привычк|найти мотивац|начать коучинг|попробовать коучинг)|хочу (?:поговорить с|пообщаться с) коучем|помоги разобраться с моей целью|коучинг-сессия|поработать как коуч|прокрастинац|мне сложно выбрать, хочу разобраться|i feel stuck with my goal|my goals?|i want to understand my goals|set goals?|help me (?:work on|clarify) my goal|let's do coaching|start (?:a )?coaching (?:conversation|session)|coach me|help me (?:build|achieve) (?:a |my )?goal|me gustar[ií]a hacer coaching|quiero coaching|mi objetivo|ay[uú]dame con mi meta|trabajar en mi objetivo)/iu;
// Concrete planning, choice or desired change — NOT vague distress or shyness.
const coachPlanning=/(?:мне сложно выбрать, куда двигаться|мне трудно решиться на перемены|тяжело принимать решения|не знаю, чего хочу|не знаю чего хочу|я застрял[а]? и не знаю|i (?:can't|cannot) decide between|i want to (?:write|improve|build|change|start|learn|become) (?:a |my |the |our )?[\p{L}\s]{2,80}|i'm struggling with motivation|i am struggling with motivation|quiero cambiar mi vida|quiero mejorar mi vida)/iu;
const psychRequest=/(?:секретарь.психолог|психологический режим|режим психолога|психологический секретарь|поговорить поглубже с (?:ali|али)|хочу (?:глубокую|более глубокую) (?:беседу|разговор)|(?:deep|deeper) (?:psychological|intake) (?:chat|conversation)|psychologist mode|modo psic[oó]logo|conversaci[oó]n psicol[oó]gica)/iu;
const followUp=/^(?:да|ага|угу|нет|ок|окей|хорошо|конечно|подробнее|подробней|а подробнее|ещ[её]|продолжи|дальше|что дальше|как|почему|зачем|что|а если|и что|yes|no|ok|okay|sure|tell me more|more details|go on|continue|what next|and then|why|how|what about that|sí|si|vale|claro|m[aá]s detalles|contin[uú]a|y luego|a ver)[?.!… ]*$/iu;
const conversational=/^(?:привет|здравствуйте|добрый день|hello|hi|hey|hola|buenas)(?:[.! ]*)$/iu;

/** Only USER-authored context after the latest reset can anchor a follow-up. */
function currentUserSegment(history){
  const turns=Array.isArray(history)?history.slice(-14):[];
  const active=[];
  for(const turn of turns){
    if(turn?.role!=='user'||typeof turn.text!=='string')continue;
    const t=safe(turn.text);
    if(!t)continue;
    if(stop.test(t)||switchTopic.test(t)||noSales.test(t)||noCoach.test(t)||
       (emotionalDisclosure.test(t)&&!coachSpecific.test(t)&&!coachPlanning.test(t))){active.length=0;continue;}
    active.push(t);
  }
  return active.slice(-6);
}
function priorRole(segment){
  for(const t of [...segment].reverse()){
    if(booking.test(t)||secretaryFaq.test(t)||ellipticalPrice.test(t))
      return 'secretary';
    if(service.test(t)&&salesDiscovery.test(t))return 'sales';
    if((coachSpecific.test(t)||coachPlanning.test(t))&&!service.test(t))return 'coach';
    if(service.test(t))return 'secretary';
  }
  return null;
}
function priorService(segment){return segment.some(t=>service.test(t));}
/**
 * Turn-level role advice. A direct factual question is a temporary handoff,
 * not a durable mode change. Only an authenticated host can persist role state.
 */
export function decideAliDialogueMode({
 message='',history=[],locale='en',selectedGoal=null,
 currentRole=null,requestedRole=null,
 sessionRoleVerified=false,validatedPsychologistConsent=false,
}={}){
 const lang=locales.has(locale)?locale:'en';
 const text=safe(message);
 const past=currentUserSegment(history);
 const trusted=sessionRoleVerified===true&&validRoles.has(currentRole)?currentRole:null;
 const requested=sessionRoleVerified===true&&validRoles.has(requestedRole)?requestedRole:null;
 const previous=trusted||priorRole(past)||'secretary';
 const withDecision=(role,reason,confidence='high',transition='turn',extra={})=>
   ({version:ALI_MODE_SWITCH_VERSION,locale:lang,role,reason,confidence,
     previousRole:previous,
     transition:['reset','safety','one_turn'].includes(transition)?transition:
       previous===role?'hold':'switch',
     requiresConsent:false,...extra});
 const urgentNow=urgent.test(text);
 if(urgentNow)return withDecision('secretary','safety_handoff','high','safety',{safetyHandoff:true});
 if(stop.test(text))return withDecision('secretary','client_stop','high','reset');
 if(switchTopic.test(text))return withDecision('secretary','topic_change','high','reset');
 if(optOutPsychologist.test(text))
   return withDecision('secretary','psychologist_declined','high','reset');
 if(noSales.test(text)||noCoach.test(text)){
   if(trusted==='secretary_psychologist'&&validatedPsychologistConsent===true)
     return withDecision('secretary_psychologist','respect_boundaries_without_mode_exit','high','hold',
       {noSales:noSales.test(text),noAdvice:noAdviceOnly.test(text)});
   if(trusted==='coach'&&noAdviceOnly.test(text)&&!explicitNoCoaching.test(text))
     return withDecision('coach','no_advice_requested','high','hold',{noAdvice:true});
   return withDecision('secretary','client_boundary','high','reset');
 }
 if(!text)return withDecision('secretary','empty','low','hold');
 if(booking.test(text)&&!bookingDecline.test(text))
   return withDecision('secretary','booking_handoff','high','one_turn');
 if(secretaryFaq.test(text)||ellipticalPrice.test(text))
   return withDecision('secretary','factual_handoff','high','one_turn');
 if((requested==='secretary_psychologist'||trusted==='secretary_psychologist')&&
   validatedPsychologistConsent!==true)
   return withDecision('secretary','psychologist_consent_required','high','reset',
     {requiresConsent:true,offeredRole:'secretary_psychologist'});
 if(requested==='secretary_psychologist'&&validatedPsychologistConsent===true)
   return withDecision('secretary_psychologist','explicit_psychologist_opt_in','high','switch');
 // A consented psychologist interview must not silently turn into a pitch
 // because the client mentions a service, budget, or hesitation.
 if(trusted==='secretary_psychologist'&&validatedPsychologistConsent===true){
   if(requested==='coach')return withDecision('coach','verified_coaching_switch','high','switch');
   if(service.test(text)&&salesDiscovery.test(text))
     return withDecision('secretary','psychologist_service_question','high','one_turn');
   return withDecision('secretary_psychologist','consented_psychologist_continuity','high','hold');
 }
 if(psychRequest.test(text)){
   return withDecision('secretary','psychologist_consent_required','high','hold',
     {requiresConsent:true,offeredRole:'secretary_psychologist'});
 }
 // Standalone fear/sadness after a sales exchange does not imply interest
 // in another offer or a coaching session. Let the host's Empathy Mind listen.
 if(emotionalDisclosure.test(text)&&
    !coachSpecific.test(text)&&!coachPlanning.test(text)&&trusted!=='coach')
   return withDecision('secretary','emotional_support_not_sales','high','reset');
 if(!positivePrice.test(text)&&salesObjection.test(text)&&
     (service.test(text)||priorService(past)))
   return withDecision('sales','contextual_service_objection','high','switch');
 if((service.test(text)||openOfferQuestion.test(text))&&salesDiscovery.test(text))
   return withDecision('sales','explicit_service_exploration','high','switch');
 if((coachSpecific.test(text)||coachPlanning.test(text))&&!noCoach.test(text))
   return withDecision('coach','explicit_goal_dialogue','high','switch');
 if(requested==='coach')return withDecision('coach','selected_coaching','high','switch');
 if(service.test(text))
   return withDecision('secretary','service_information','moderate','one_turn');
 if(followUp.test(text)){
   const follow=priorRole(past)||trusted;
   if(follow&&follow!=='secretary_psychologist')
     return withDecision(follow,'user_context_follow_up','moderate','hold');
   if(follow==='secretary_psychologist'&&validatedPsychologistConsent===true)
     return withDecision(follow,'consented_context_follow_up','moderate','hold');
 }
 if(conversational.test(text))
   return withDecision('secretary','social_greeting','high','hold');
 // A selected goal is an explicit UI preference, not evidence of an illness.
 if(goals.has(selectedGoal))return withDecision('coach','selected_goal','moderate','switch');
 // Coach has its own explicit session. Sales should never stick to a
 // completely new personal topic merely because an earlier turn was Sales.
 if(trusted==='coach')
   return withDecision('coach','verified_coach_continuity','moderate','hold');
 return withDecision('secretary','conservative_default','moderate','hold');
}
