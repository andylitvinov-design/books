/** Source-bounded Consultant Mind for Holistic House: no new model, I/O or storage.
 * Explicit service questions only; an upstream authenticated safety gate is required.
 */
import { ASSIST_OFFER_CATALOG, inferAssistPreferences, rankAssistOffers, assistPriceLabel } from "./service-match.mjs";
import {nativeDialogueEventFromUtterance} from "../holistic-support/conversation-intelligence.mjs";
export const CONSULTANT_MIND_VERSION="hh-consultant-mind-v1";
const patterns=[
 ["homeopathy",/гомеопат|homeopath|homeopat/iu],
 ["constellation",/расстанов|constellat|constelac/iu],
 ["therapy",/образн|символдрам|психотерап|гипнотерап|imagery|psychotherap|hypnotherap|psicoterap|hipnoterap/iu],
 ["business",/бизнес|предпринимат|business|founder|negocio|emprendedor/iu],
 ["reiki",/рейки|reiki/iu],
 ["opora",/опора|opora/iu],
 ["review",/разбор ситуац|situation review|revisi[oó]n.*situaci[oó]n/iu],
 ["tests",/тест|опросник|questionnaire|self.check|\btests?\b|prueba/iu],
 ["mytube",/mytube|видеоролик|посмотреть видео|watch videos|ver videos/iu],
 ["academy",/академ|academy|academia/iu],
 ["aiCoach",/ии.коуч|ai coach|chatbot|coach de ia/iu],
];
const related=/услуг|консультац|сесси|сеанс|специалист|мастер|психотерап|образн|гомеопат|расстанов|рейки|курсы?|практик|терапи|коуч|разбор ситуац|service|session|consult|therapy|therapist|practitioner|reiki|course|coaching|support option|servicio|sesion|sesión|consulta|terapia|profesional|curso/iu;
const PRICE=/цен[аыуе]|стоимост|прайс|сколько (?:это )?стоит|€|\bprice\b|\bpricing\b|\bcost\b|how much|precio|cu[aá]nto cuesta/iu;
const QUALITY=/качеств|эффективн|отзыв|квалификац|доказател|результат|насколько хорош|quality|effective|reviews?|qualifications?|evidence|results?|calidad|eficaz|reseñas|resultados/iu;
const COMPARE=/сравн|отлича|разниц|что лучше|что выбрать|compare|difference|versus|\bvs\b|better|diferenc|comparar|mejor/iu;
const CHOOSE=/подбер|посовет|рекоменд|подходящ|какую услугу|хочу (?:записаться|консультац|сесси|курс)|ищу (?:специалист|консультац)|нужн[а-яё]* (?:специалист|консультац|сесси|курс)|recommend|which service|help me choose|looking for|suggest a|best option|recomiend|recomendar|elegir|busco una consulta/iu;
const DECLINE=/не (?:нужн[а-яё]*|хочу|предлагай[а-яё]*) (?:никак[а-яё]* )?(?:услуг|консультац|продаж|сесси)|no (?:services|selling|sales pitches)|don't sell|do not recommend services|sin ofertas/iu;
const UNSAFE=/суицид|самоубийств|убить себя|покончить с собой|хочу умереть|не хочу жить|боль в груди|не могу дышать|трудно дышать|suicid|kill myself|i want to die|end my life|chest pain|can(?:not|'?t) breathe|self.harm|quiero morir|me quiero matar|dolor en el pecho|no puedo respirar/iu;
const paths=Object.freeze({
 tests:"tests",review:"services/free-situation-review",opora:"courses/antistress",
 therapy:"services/imagery-therapy",constellation:"services/systemic-constellations",
 business:"services/business-consulting",reiki:"services/remote-energy-support",
 homeopathy:"services/alchemy-of-soul",academy:"academy/reiki",mytube:"mytube",
 aiCoach:"my-coach",masters:"masters",mandala:"holistic-support/mandala",talisman:"holistic-support/mobile",
});
const names={
 ru:{tests:"тесты самочувствия",review:"бесплатный разбор ситуации",opora:"курс ОПОРА",
 therapy:"образная психотерапия",constellation:"системные расстановки",business:"бизнес-консультация",
 reiki:"сессия Рейки",homeopathy:"психогомеопатия",masters:"каталог специалистов",
 academy:"Рейки Академию",mytube:"видео MyTube",aiCoach:"ИИ-коуча",mandala:"мандалу",talisman:"символический каталог"},
 en:{tests:"wellbeing check-ins",review:"a free situation review",opora:"the OPORA course",
 therapy:"guided imagery sessions",constellation:"systemic constellations",business:"business consulting",
 reiki:"a Reiki session",homeopathy:"psycho-homeopathy",masters:"the practitioner directory",
 academy:"Reiki Academy",mytube:"MyTube videos",aiCoach:"the AI coach",mandala:"a mandala",talisman:"the symbolic catalogue"},
 es:{tests:"pruebas de bienestar",review:"una revisión gratuita",opora:"el curso OPORA",
 therapy:"sesiones de imágenes guiadas",constellation:"constelaciones sistémicas",business:"consultoría de negocios",
 reiki:"sesiones de Reiki",homeopathy:"psicohomeopatía",masters:"el directorio de profesionales",
 academy:"la Academia Reiki",mytube:"videos MyTube",aiCoach:"el guía de IA",mandala:"un mandala",talisman:"el catálogo simbólico"},
};
const purposes={
 ru:{tests:"отследить своё состояние",review:"прояснить запрос без обязательной покупки",opora:"самостоятельно пройти короткие практики",
 therapy:"исследовать чувства и внутренние образы",constellation:"исследовать повторяющиеся сценарии",
 business:"прояснить деловое решение",reiki:"рассмотреть добровольную символическую практику",
 mytube:"посмотреть тематические ролики",academy:"освоить практики по программе",aiCoach:"обсудить цель с цифровым помощником"},
 en:{tests:"reflect on your current state",review:"clarify the question before paying",opora:"follow guided practices",
 therapy:"explore feelings and imagery",constellation:"explore recurring patterns",business:"clarify a business decision",
 reiki:"explore an optional symbolic practice",mytube:"watch themed videos",academy:"follow a learning program",
 aiCoach:"explore a goal with a digital guide"},
 es:{tests:"reflexionar sobre tu estado",review:"aclarar el objetivo sin pagar",opora:"seguir prácticas autónomas",
 therapy:"explorar emociones e imágenes",constellation:"explorar patrones",business:"aclarar una decisión empresarial",
 reiki:"conocer una práctica simbólica opcional",mytube:"ver videos temáticos",academy:"aprender con un programa",
 aiCoach:"conversar sobre un objetivo con una guía digital"},
};
const localized=(l,ru,en,es)=>l==="ru"?ru:l==="es"?es:en;
const hasService=s=>related.test(s)||patterns.some(([,re])=>re.test(s));
const matches=s=>patterns.map(([id,re])=>({id,index:s.search(re)})).filter(x=>x.index>=0).sort((a,b)=>a.index-b.index).map(x=>x.id);
const focusOf=s=>{
 if(/врач|диагноз|здоров|симптом|medical|health|salud|síntoma/iu.test(s))return "health";
 if(/отношен|партнер|любов|семь|relationship|partner|pareja|relaci/iu.test(s))return "relationships";
 if(/работ|карьер|деньг|бизнес|финанс|work|business|negocio|dinero/iu.test(s))return "work";
 if(/стресс|тревог|страх|выгоран|stress|anxiety|ansiedad|estrés/iu.test(s))return "stress";
 if(/устал|энерг|восстанов|reiki|рейки|energy|energía|cansancio/iu.test(s))return "energy";
 if(/цель|смысл|развити|purpose|meaning|growth|sentido|propósito/iu.test(s))return "growth";
 return "general";
};
const safeLocale=l=>["ru","en","es"].includes(l)?l:"en";
const title=(id,l)=>names[l][id]||id;
const suggestion=(id,l)=>({id:"service:"+id,kind:id==="tests"?"test":id==="mytube"?"video":
 ["academy","opora"].includes(id)?"course":"service",title:title(id,l),href:"/"+l+"/"+paths[id]});
/** Re-resolve a previously displayed suggestion against this same catalogue. */
export function resolveConsultantSuggestion(id,locale){
 if(typeof id!=="string"||!id.startsWith("service:"))return null;
 const key=id.slice("service:".length);
 if(!Object.hasOwn(paths,key))return null;
 return suggestion(key,safeLocale(locale));
}
/** Returns null for ordinary emotional support or unsolicited commerce. */
export function consultServiceQuestion({message="",locale="en",history=[]}={}){
 if(typeof message!=="string"||!message.trim()||message.length>3000)return null;
 const current=message.trim();
 if(UNSAFE.test(current)||DECLINE.test(current))return null;
 const l=safeLocale(locale);
 // Only user-authored messages in the six-turn window form the active context.
 // A stop, refusal or new topic is a hard boundary; assistant replies are DATA.
 const active=[];
 for(const turn of (Array.isArray(history)?history.slice(-6):[]).reverse()){
  if(turn?.role!=="user"||typeof turn.text!=="string")continue;
  const statement=turn.text.trim().slice(0,300);
  if(l!=="es"){
   const event=nativeDialogueEventFromUtterance({message:statement,locale:l});
   if(["stop","new_question","cancel_to_talk"].includes(event.type)||
     event.type==="set_topic"&&event.newTopic===true||
     DECLINE.test(statement)||
     (/^(?:не (?:про|о|об|хочу)|not about|(?:i )?(?:do not|don't) want)(?=\s|$)/iu.test(statement)&&hasService(statement)))break;
  }else if(/cambi(?:ar|emos|a)\s+(?:de\s+)?tema|no quiero (?:servicios|consultas)|(?:para|detente|cancelar)(?:[.!?]|$)/iu.test(statement))break;
  active.unshift(statement);
 }
 // Selection intent is broader than "подбери": "I need an online session"
 // must be heard as a service request, not a price FAQ due to a € sign.
 const selection=/\b(?:recommend|looking for|need|want|busco|necesito|quiero)\b|подбер|посовет|рекоменд|подходящ|хочу|ищу|нужн[а-яё]*/iu;
 const selectionIntent=text=>CHOOSE.test(text)||
   (selection.test(text)&&hasService(text));
 const earlier=active.find(hasService)||"";
 const short=current.length<=65&&(PRICE.test(current)||QUALITY.test(current)||COMPARE.test(current));
 const preferenceFollowUp=current.length<=120&&
   /(?:онлайн|видеосвяз|очно|заочно|бесплат|до\s*(?:€|\$|cad|usd|\d)|с человеком|самостоятельно|online|video call|in person|free|under\s*(?:€|\$|cad|usd|\d)|presencial|gratis|por escrito|hasta\s*(?:€|\$|cad|usd|\d))/iu.test(current)&&
   !/(?:привет|здравств|hello|hola|не хочу|don't|no quiero)/iu.test(current);
 const earlierChoose=active.some(selectionIntent);
 const followChoose=Boolean(earlierChoose&&preferenceFollowUp&&!selectionIntent(current));
 const useContext=Boolean(earlier&&matches(current).length===0&&
   (short||followChoose));
 const query=useContext?[...active,current].join(" "):current;
 if(!hasService(query))return null;
 const explicitPrice=/(?:сколько(?:\s+это)?\s+стоит|какова?\s+цен[аыуе]|(?:какая|узнать|подскажите)\s+стоимост|how much|what(?:'s| is)\s+the\s+(?:price|cost)|cu[aá]nto cuesta|cu[aá]l es el precio)/iu.test(current);
 const intent=followChoose?"choose":explicitPrice?"price":selectionIntent(current)?"choose":
   PRICE.test(current)?"price":QUALITY.test(current)?"quality":
   COMPARE.test(current)?"compare":null;
 if(!intent)return null;
 const ids=matches(query);
 const target=ids[0]||null,focus=focusOf(query);
 // Preference revisions must override earlier answers while retaining the
 // confirmed initial goal. No persisted memory, assistant text or cross-chat.
 const prefs=useContext?Object.assign({},...active.map(inferAssistPreferences),
   inferAssistPreferences(current)):inferAssistPreferences(current);
 if(prefs.budget==="otherCurrency"){
  const reply=localized(l,
   "Вы указали бюджет в CAD/USD или долларах. Я не буду считать его суммой в евро без курса и согласия. Укажите предел в € или выберите бесплатный вариант.",
   "You gave a CAD/USD budget. I won't treat dollars as euros or guess an exchange rate. Please give a EUR limit or choose a free option.",
   "Indicaste un presupuesto en CAD/USD. No convertiré dólares a euros sin un tipo de cambio verificado. Indica un límite en EUR o elige una opción gratuita.");
  return {status:"clarify",intent,locale:l,reply,suggestions:[],
    evidence:"currency-budget-not-verified",modelUsed:false};
 }
 const eligible=rankAssistOffers(focus,prefs,14).map(x=>x.id);
 const ranked=rankAssistOffers(focus,prefs,3).map(x=>x.id);
 const original=target&&target!=="homeopathy"&&eligible.includes(target)
  ?[target,...ranked.filter(x=>x!==target)].slice(0,3):ranked;
 // An explicitly requested personal consultation deserves a real matching
 // session first, not an unsolicited free asynchronous form. Free-only still wins.
 const asksForSession=/консультац|сесси|сеанс|appointment|consultation|session|consulta|sesión/iu.test(query);
 const firstSession=!target&&asksForSession&&prefs.mode==="human"&&
   prefs.budget!=="free" ? original.find(id=>
     ["therapy","constellation","business"].includes(id)):null;
 const recommendations=firstSession
   ?[firstSession,...original.filter(id=>id!==firstSession)].slice(0,3):original;
 const suggestions=[],add=id=>{
  if(id&&paths[id]&&!suggestions.some(x=>x.id==="service:"+id))suggestions.push(suggestion(id,l));
 };
 let reply="";
 if(intent==="price"){
  if(target){
   const cost=assistPriceLabel(target,l);
   reply=localized(l,"Для услуги «"+title(target,l)+"»: "+cost+". Итоговые условия и время подтвердят до записи; сообщение не оформляет оплату.",
    "For "+title(target,l)+": "+cost+". Final terms and availability are confirmed before booking; this message is not a payment.",
    "Para "+title(target,l)+": "+cost+". Se confirman las condiciones y el horario antes de reservar; no se realiza ningún pago.");
   add(target);
  }else{
   reply=localized(l,"Для опубликованных личных сессий: 30 минут — €50; 60 минут — €100. Цены Рейки и других предложений могут различаться. Какую услугу рассматриваете?",
    "Published personal sessions: 30 minutes €50; 60 minutes €100. Reiki and other services may have different rates. Which service are you considering?",
    "Sesiones personales publicadas: 30 minutos €50; 60 minutos €100. Reiki y otros servicios pueden costar distinto. ¿Qué servicio te interesa?");
   add("therapy");add("business");
  }
 }else if(intent==="quality"){
  reply=localized(l,"Качество "+(target?"услуги «"+title(target,l)+"»":"услуги")+
   " разумно оценивать по описанию метода, опыту специалиста, проверяемым отзывам и ограничениям. Достоверного процента успеха нет; результат не гарантируется.",
   "Assess "+(target?title(target,l):"a service")+" by its stated process, practitioner background, verifiable reviews and limitations. No verified success rate or guaranteed outcome is available.",
   "Valora "+(target?title(target,l):"un servicio")+" según su método, experiencia del profesional, opiniones verificables y límites. No hay tasa de éxito verificada ni resultado garantizado.");
  if(target==="homeopathy")reply+=" "+localized(l,
   "Гомеопатия не имеет надёжных доказательств эффективности при лечении болезней.",
   "Homeopathy lacks reliable evidence for treating disease.",
   "La homeopatía carece de evidencia fiable para tratar enfermedades.");
  add(target||"masters");
 }else if(intent==="compare"){
  const first=ids[0],second=ids[1];
  if(first&&second){
   reply=localized(l,title(first,l)+" — "+(purposes.ru[first]||"узнать о методе")+"; "+title(second,l)+" — "+
    (purposes.ru[second]||"узнать о методе")+". Сравните цель, формат и цену, а не обещания результата.",
    title(first,l)+" can help you "+(purposes.en[first]||"explore the method")+"; "+title(second,l)+
    " can help you "+(purposes.en[second]||"explore another method")+". Compare goals, format and verified cost, not outcome promises.",
    title(first,l)+" permite "+(purposes.es[first]||"conocer el método")+"; "+title(second,l)+
    " permite "+(purposes.es[second]||"conocer otra opción")+". Compara objetivos, modalidad y precios, no promesas.");
   add(first);add(second);
  }else{
   reply=localized(l,"Могу сравнить цель, формат, продолжительность, цену и ограничения. Какие две услуги рассматриваете?",
    "I can compare goals, format, duration, verified prices and limitations. Which two services are you considering?",
    "Puedo comparar objetivo, modalidad, duración, precios y límites. ¿Qué dos servicios consideras?");
   add(target);
  }
 }else if(focus==="general"&&!target){
  reply=localized(l,"Помогу выбрать без обязательной покупки. Какой результат вам важнее: прояснить ситуацию, освоить практику или поговорить со специалистом?",
   "I can help without pressure to buy. Do you want clarity, a self-guided practice, or a conversation with a specialist?",
   "Puedo ayudarte sin presión de compra. ¿Buscas claridad, una práctica autónoma o hablar con un profesional?");
 }else if(recommendations.length){
  const top=recommendations[0],why=purposes[l][top]||localized(l,"ознакомиться с подходом","explore this option","conocer la opción");
  reply=localized(l,"По вашему запросу можно рассмотреть вариант «"+title(top,l)+"»: "+why+". "+assistPriceLabel(top,l)+
   ". Ниже есть альтернативы — решение остаётся за вами.",
   "Based on your request, consider "+title(top,l)+" to "+why+". "+assistPriceLabel(top,l)+
   ". Alternatives are below; the decision is yours.",
   "Según tu solicitud, considera "+title(top,l)+" para "+why+". "+assistPriceLabel(top,l)+
   ". Hay alternativas; tú decides.");
  // One optional clarification at a time. A recommendation is offered early
  // instead of interrogating the client before showing anything useful.
  const missing=!prefs.mode?
    localized(l,"Вы предпочитаете помощь специалиста или самостоятельный формат?",
      "Would you prefer a specialist or a self-guided option?",
      "¿Prefieres un profesional o una opción autónoma?"):
    prefs.mode==="human"&&!prefs.channel?
    localized(l,"Вам удобнее очно, по видеосвязи или заочно?",
      "Would in-person, video call or written support suit you?",
      "¿Prefieres presencial, videollamada o por escrito?"):
    !prefs.budget?
    localized(l,"Есть комфортный бюджет или хотите начать бесплатно?",
      "Do you have a comfortable budget, or prefer to begin free?",
      "¿Tienes un presupuesto o prefieres empezar gratis?"):"";
  if(missing)reply+=" "+missing;
  recommendations.forEach(add);
 }else{
  reply=localized(l,"По указанным условиям нет подтверждённого предложения. Не буду выдавать неизвестную цену за доступную. Можно изменить формат или бюджет?",
   "No verified service fits those constraints. I won't treat an unknown price as affordable. Would you like to change the format or budget?",
   "No hay servicio verificado que cumpla esas condiciones. No presentaré un precio desconocido como asequible. ¿Cambiar modalidad o presupuesto?");
 }
 return {status:"clarify",intent,locale:l,reply,suggestions:suggestions.slice(0,3),
  evidence:"published-service-pages-and-assist-catalog",modelUsed:false};
}
