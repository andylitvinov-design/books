/**
 * Offline dialogue-act understanding. Explicit evidence only; no diagnoses,
 * trait inference, persistence, consent, content selection or side effects.
 * Safety and domain decisions remain with their existing trusted hosts.
 */
export const CONVERSATION_INTELLIGENCE_VERSION = "hi-conversation-intelligence-v1";
const locales = new Set(["ru","en","es"]);
const limit = 3000;
const norm = s => String(s ?? "").toLocaleLowerCase().replace(/ё/g,"е")
  .normalize("NFD").replace(/[\u0300-\u036f]/gu,"").replace(/[’']/gu,"")
  .replace(/\s+/gu," ").trim();
const topics = [
 ["relationships",/любов|отношен|близост|партнер|партн|семь|расстав|love|relationship|partner|family|breakup|amor|relacion|pareja|familia/u,
  ["отношения","relationships","las relaciones"]],
 ["work_money",/работ|карьер|бизнес|деньг|доход|зарплат|клиент|work|career|business|money|income|salary|job|trabajo|negocio|dinero|ingreso/u,
  ["работа и деньги","work and money","el trabajo y el dinero"]],
 ["stress_energy",/стресс|тревог|устал|выгора|нет сил|энерги|напряжен|stress|anxiety|tired|burnout|energy|overwhelmed|estres|ansiedad|cansad|agotad|energia/u,
  ["стресс и силы","stress and energy","el estrés y la energía"]],
 ["meaning",/смысл|призвани|направлен|ценност|purpose|meaning|direction|values|sentido|proposito|direccion|valores/u,
  ["смысл и направление","meaning and direction","el sentido y la dirección"]],
 ["goals",/цел[ьи]|план|мотивац|прокрастин|goal|plan|motivation|procrastinat|meta|motivacion/u,
  ["цели и планы","goals and plans","las metas y los planes"]],
 ["confidence",/уверенн|самооценк|стыд|неловк|confidence|self.?worth|self.?esteem|shame|autoestima|confianza|verguenza/u,
  ["уверенность и самооценка","confidence and self-worth","la confianza y la autoestima"]],
 ["sleep",/сон|спать|бессон|sleep|insomnia|dormir|insomnio|sueno/u,
  ["сон","sleep","el sueño"]],
].map(([id,re,label])=>({id,re,label}));
const danger = /не хочу жить|хочу умереть|покончу с собой|суицид|самоубийств|боль в груди|не могу дышать|трудно дышать|i want to die|kill myself|suicid|end my life|chest pain|cannot breathe|cant breathe|quiero morir|me quiero matar|dolor en el pecho|no puedo respirar/u;
const request = /\b(?:create|generate|make|find|show|download|book|write|build|choose)\b|создай|сгенерируй|сделай|найди|покажи|скачай|запиши|напиши|подбери|закажи|записаться|сколько стоит|how much|cuanto cuesta|precio|цена|(?:хочу|i want|quiero)\s+(?:создать|сделать|видео|ролик|медитац|тест|курс|create|make|a video|a meditation|a test|a course|crear|hacer|un video|una meditacion|una prueba)/u;
const correction = /\bactually\b|\bi meant\b|\bwhat i meant\b|\byou misunderstood\b|not\s+about\s+[^,;.!?]{1,70},?\s+but\s+about\s+|точнее|вернее|я имел в виду|я имела в виду|ты меня не понял|не то|не об этом|не про|не о |я про |я об |no me refiero|quise decir|en realidad|no es eso|no se trata de|sino/u;
const mediumCorrection = /(?:no\s+(?:quiero\s+)?(?:video|vídeo|pel[ií]cula|meditaci[oó]n)|no\s+me\s+refiero\s+a\s+(?:video|vídeo|pel[ií]cula|meditaci[oó]n)|not\s+about\s+(?:a\s+)?(?:video|film|reel|meditation)|ne\s+(?:quiero\s+)?(?:video|pel[ií]cula|meditaci[oó]n)|не\s+(?:хочу\s+)?(?:видео|ролик|медитац\p{L}*)|не\s+(?:про|о)\s+(?:видео|ролик|медитац\p{L}*))[^,;.!?]{0,70}(?:but|sino|а|но)(?:\s+(?:about|sobre|про|о))?\s*(?:video|vídeo|film|reel|meditation|meditaci[oó]n|pel[ií]cula|видео|ролик|медитац\p{L}*)/iu;
const follow = /^(?:а\s+)?(?:и\s+)?(?:почему|зачем|как|что дальше|и что|а если|поясни|объясни|расскажи подробнее|что ты имеешь в виду|why|how|what next|and then|what do you mean|explain|tell me more|could you explain|por que|porque|como|que sigue|y si|explica|a que te refieres)(?:\b|$)/u;
const unsure = /^(?:не знаю|пока не знаю|не уверен(?:а)?|не понимаю пока|i don't know|i dont know|not sure|no idea|no se|no estoy seguro|no estoy segura)(?:\b|$)/u;
const reject = /^(?:нет|неа|не хочу|не подходит|не надо|другое|no|nope|not really|doesn't fit|doesnt fit|not that|otra cosa|otro|no quiero)(?:[.! ]|$)/u;
const yes = /^(?:да|ага|угу|хорошо|ок|окей|yes|yeah|sure|ok|okay|si|vale|claro)(?:[.! ]|$)/u;
const hello = /^(?:привет|приветик|здравствуй|здравствуйте|добрый день|доброе утро|добрый вечер|hi|hello|hey|hola|buenas)(?:[!. ]|$)/u;
const thanks = /^(?:спасибо|благодарю|спасибо большое|thanks|thank you|many thanks|gracias|muchas gracias)(?:[!. ]|$)/u;
const bye = /^(?:пока|до свидания|до встречи|стоп|хватит|закончим|bye|goodbye|see you|stop|basta|hasta luego|adios)(?:[!. ]|$)/u;
const feedback = /слишком длинн|короче|покороче|проще|не по теме|не то что я спросил|не то что я спрашивал|не отвечает на вопрос|непонятно объяснил|too long|shorter|simpler|not relevant|not what i asked|missed my question|that didn't help|that didnt help|demasiado largo|mas corto|no responde a mi pregunta|no era lo que pregunte/u;
const ambivalent = /(?:\bbut\b|\bhowever\b|\balthough\b|\bthough\b|\bpero\b|\bsin embargo\b|\baunque\b|(?:^|\s)(?:но|однако)(?:\s|$)).{0,140}(?:afraid|scared|worried|concerned|hesitat|doubt|unsure|nervous|miedo|preocup|duda|temo|боюсь|страшно|пережива|беспоко|сомнева|не уверен|тревож)/u;
const disclose = /мне (?:сегодня )?(?:тяжело|грустно|одиноко|нелегко)|сегодня был[ао]? (?:тяжел|трудн|сложн)[а-я]* день|я запутал(?:ся|ась)|я растерян|мне нужна поддержка|i (?:had|have) (?:a )?(?:rough|hard|difficult) day|i feel (?:stuck|lonely|overwhelmed)|i'm feeling overwhelmed|im feeling overwhelmed|i feel lost|i need support|me siento (?:solo|sola|perdido|perdida|abrumado|abrumada)|hoy tuve un dia dificil|necesito apoyo/u;

function topicOf(text) { return topics.find(t => t.re.test(text)) || null; }
/** Returns a bounded, deterministic topic ID from explicit text only. */
export function resolveConversationTopic(value="") {
  const found=topicOf(norm(value));
  return found?.id || null;
}
function topicFromHistory(history) {
  if (!Array.isArray(history)) return null;
  for (const row of history.slice(-6).reverse()) {
    if (row?.role !== "user" || typeof row.text !== "string") continue;
    const t = norm(row.text);
    if (!t || danger.test(t) || request.test(t)) continue;
    const found = topicOf(t);
    if (found) return found;
  }
  return null;
}
function localized(act,lang,topic) {
  const label = topic ? topic.label[lang==="ru"?0:lang==="es"?2:1] : "";
  const copy = {
   ru:{
    correction:label?"Понял, речь о теме «"+label+"». Буду ориентироваться на неё. Что именно хотите разобрать?":"Понял, я неверно уловил смысл. Сформулируйте, пожалуйста, что важно — я перестрою ответ.",
    follow_up:label?"Продолжим тему «"+label+"». Какую часть моего предыдущего ответа вы хотите уточнить?":"Конечно. Какую именно часть моего предыдущего ответа вы хотите уточнить?",
    ambivalence:"Похоже, здесь одновременно есть желание и сомнение. Не буду выбирать за вас. Что сейчас важнее исследовать?",
    disclosure:"Спасибо, что рассказали. Не буду торопиться с советами. Сейчас полезнее, чтобы я просто выслушал, или помочь разобраться?",
    feedback:"Понял, мой ответ не попал в запрос. Попробую иначе и учту вашу поправку. Что именно нужно изменить?",
    rejection:"Понял, не будем настаивать. Что подошло бы вам вместо этого?",
    affirmation:"Понял. Можем продолжить обсуждение; короткое «да» само по себе не означает согласие на действие.",
    uncertainty:"Можно пока не знать. Давайте начнём с того, что сейчас больше всего занимает ваши мысли.",
    greeting:"Здравствуйте! Я здесь. Что сейчас хотелось бы обсудить?",
    thanks:"Пожалуйста. Рад, если это оказалось полезным.",
    goodbye:"Хорошо, остановимся здесь. Буду здесь, когда захотите продолжить."
   },
   en:{
    correction:label?"Understood — you're talking about "+label+". I'll follow that direction. What would you like to explore?":"Understood — I missed your meaning. Please restate what matters, and I'll adjust.",
    follow_up:label?"Let's stay with "+label+". Which part of my previous reply would you like me to clarify?":"Of course. Which part of my previous reply would you like me to clarify?",
    ambivalence:"It sounds like there is both a wish to move forward and some hesitation. I won't choose for you. Which side feels more important to explore first?",
    disclosure:"Thank you for telling me. I won't rush into advice. Would it help more to be heard, or to think this through together?",
    feedback:"I see — my answer missed what you were asking. I'll adjust. What should I change?",
    rejection:"Understood. I won't push that direction. What would fit better?",
    affirmation:"Got it. We can continue discussing this; a brief 'yes' does not trigger actions or changes.",
    uncertainty:"It's okay not to know yet. What has been taking up the most space in your thoughts?",
    greeting:"Hello! I'm here. What would you like to talk about?",
    thanks:"You're welcome. I'm glad it was useful.",
    goodbye:"All right, let's pause here. We can continue whenever you're ready."
   },
   es:{
    correction:label?"Entendido: hablas de "+label+". Seguiré esa dirección. ¿Qué te gustaría explorar?":"Entendido, no capté bien lo que querías decir. Reformula lo importante y ajustaré mi respuesta.",
    follow_up:label?"Sigamos con "+label+". ¿Qué parte de mi respuesta anterior quieres que aclare?":"Claro. ¿Qué parte de mi respuesta anterior quieres que aclare?",
    ambivalence:"Parece que hay tanto ganas de avanzar como cierta duda. No voy a decidir por ti. ¿Qué lado te gustaría explorar primero?",
    disclosure:"Gracias por contármelo. No me apresuraré a dar consejos. ¿Te ayudaría más que te escuche o que lo pensemos juntos?",
    feedback:"Entiendo: mi respuesta no atendió lo que preguntabas. La ajustaré. ¿Qué debería cambiar?",
    rejection:"Entendido. No insistiré en esa opción. ¿Qué te encajaría mejor?",
    affirmation:"De acuerdo. Podemos seguir conversando; un «sí» breve no activa acciones ni cambios.",
    uncertainty:"Está bien no saberlo todavía. ¿Qué es lo que más ocupa tus pensamientos ahora?",
    greeting:"¡Hola! Estoy aquí. ¿De qué te gustaría hablar?",
    thanks:"De nada. Me alegra que haya sido útil.",
    goodbye:"De acuerdo, paramos aquí. Podemos continuar cuando quieras."
   }
  };
  return copy[lang]?.[act] || null;
}

/** Returns a bounded conversational act. It is not a safety classifier. */
export function understandConversationTurn({message="",history=[],locale="en"}={}) {
  const lang = locales.has(locale) ? locale : "en";
  const raw = typeof message==="string" ? message.trim() : "";
  const text = norm(raw).replace(/[?!.,¿¡]+$/u,"").trim();
  const context = topicFromHistory(history);
  const empty = {version:CONVERSATION_INTELLIGENCE_VERSION,act:"unknown",topic:null,
    contextTopic:context?.id||null,confidence:0,requiresClarification:false,
    replyFallback:null,evidence:"none"};
  if(!text) return {...empty,act:"empty"};
  if(raw.length>limit) return {...empty,act:"over_limit"};
  // Preserve upstream safety and direct-request ownership.
  if(danger.test(text)) return {...empty,act:"safety_sensitive",evidence:"explicit_text"};
  if(request.test(text)) return {...empty,act:"direct_request",evidence:"explicit_text"};
  let act="unknown",confidence=0,evidence="none",topic=topicOf(text);
  if(hello.test(text)) {act="greeting";confidence=1;evidence="explicit_text";}
  else if(thanks.test(text)) {act="thanks";confidence=1;evidence="explicit_text";}
  else if(bye.test(text)) {act="goodbye";confidence=1;evidence="explicit_text";}
  else if(feedback.test(text)) {act="feedback";confidence=.98;evidence="explicit_text";}
  else if(correction.test(text) && !mediumCorrection.test(text)) {
    act="correction";confidence=.9;evidence="explicit_text";
    const pivot=text.match(/не\s+(?:про|о)\s+[^,;.!?]{1,70},?\s+а\s+|not about\s+[^,;.!?]{1,70},?\s+but\s+|not\s+[^,;.!?]{1,70},?\s+but\s+|no me refiero a\s+[^,;.!?]{1,70},?\s+sino a\s+|no\s+sobre\s+[^,;.!?]{1,70},?\s+sino\s+sobre\s+|sino a\s+|no\s+(?:sobre|de)\s+[^,;.!?]{1,70},?\s+sino\s+(?:sobre\s+)?|i meant\s+|actually\s+|quise decir\s+|en realidad\s+|я\s+(?:имел|имела)\s+в\s+виду\s+(.{1,100})$/u);
    if(pivot) {
      const tail = pivot[1] || text.slice(pivot.index + pivot[0].length);
      topic=topicOf(tail);
    }
  }
  else if(ambivalent.test(text)) {act="ambivalence";confidence=.88;evidence="explicit_text";}
  else if(follow.test(text)) {act="follow_up";confidence=.82;evidence=context?"recent_user_topic":"current_text";}
  else if(reject.test(text)) {act="rejection";confidence=.95;evidence="explicit_text";}
  else if(yes.test(text)) {act="affirmation";confidence=.95;evidence="explicit_text";}
  else if(unsure.test(text)) {act="uncertainty";confidence=.9;evidence="explicit_text";}
  else if(disclose.test(text)) {act="disclosure";confidence=.86;evidence="explicit_text";}
  else if(topic && raw.length<=45 && !/[?؟]/u.test(raw)) {act="topic_statement";confidence=.84;evidence="explicit_text";}
  if(["follow_up","affirmation","rejection"].includes(act)&&!topic) topic=context;
  return {version:CONVERSATION_INTELLIGENCE_VERSION,act,topic:topic?.id||null,
    contextTopic:context?.id||null,confidence,
    requiresClarification:["correction","follow_up","uncertainty","rejection"].includes(act),
    replyFallback:localized(act,lang,topic),evidence};
}
