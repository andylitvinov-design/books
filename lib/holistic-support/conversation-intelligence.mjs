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
const explicitClose=(text,locale)=>locale==='ru'
 ? /^(?:(?:спасибо[, ]+)?(?:даваи|даваите) закончим(?: здесь| на этом)?|спасибо за (?:беседу|разговор)[, ]+(?:пока|до встречи|до свидания))$/u.test(text)
 : locale==='en'&&/^(?:(?:thank you[, ]+|thanks[, ]+)?(?:lets|let us) (?:finish|stop|end)(?: here| now)?|(?:thanks|thank you) for (?:the|our) (?:chat|conversation)[, ]+(?:bye|goodbye|see you(?: (?:later|around))?))$/u.test(text);
const explicitNoAdvice=(text,locale)=>locale==='ru'
 ? /^(?:(?:продолжим|поговорим)(?: про [\p{L}\s]+)?[, ]+но без советов|(?:пожалуиста[, ]+)?(?:не даваи(?:те)?(?: мне)? совет(?:ов|ы)?|(?:мне )?не нужны советы|(?:мне )?не (?:надо|нужно) советов|(?:я )?не хочу советов|без советов)(?:[, ]+пожалуиста)?)$/u.test(text)
 : locale==='en'&&/^(?:(?:lets|let us) (?:stay on|talk about) [\p{L}\s]+[, ]+but (?:no|without) advice|(?:please[, ]+)?(?:(?:do not|dont) (?:give|offer) (?:me )?(?:any )?advice|(?:i )?(?:do not|dont) want (?:any )?advice|no advice)(?:[, ]+please)?)$/u.test(text);
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
const danger = /не хочу (?:больше )?жить|хочу умереть|покончу с собой|причинить себе вред|суицид|самоубийств|боль в груди|не могу дышать|трудно дышать|i want to die|(?:hurt|harm) myself|self harm|suicid|end my life|chest pain|cannot breathe|cant breathe|quiero morir|me quiero matar|dolor en el pecho|no puedo respirar/u;
const request = /\b(?:create|generate|make|find|show|download|book|write|build|choose)\b|создай|сгенерируй|сделай|найди|покажи|скачай|запиши|напиши|подбери|закажи|записаться|сколько стоит|how much|cuanto cuesta|precio|цена|(?:хочу|i want|quiero)\s+(?:создать|сделать|видео|ролик|медитац|тест|курс|create|make|a video|a meditation|a test|a course|crear|hacer|un video|una meditacion|una prueba)/u;
const explicitActionRefusal=/(?:^|[\s,;.!])(?:(?:пожалуйста[\s,]+)?не\s+(?:предлага[йи](?:те)?|показыва[йи](?:те)?|записыва[йи](?:те)?|отправля[йи](?:те)?|сохраня[йи](?:те)?|брониру[йи](?:те)?|рекоменду[йи](?:те)?)|(?:please\s+)?(?:do not|don't|dont|never)\s+(?:recommend|offer|show|book|send|save|suggest|schedule|share))(?=\s|[,.!?;:]|$)/iu;
export function hasExplicitActionRefusal(message){return typeof message==='string'&&explicitActionRefusal.test(message);}
function refusalFollowUp(text,lang){
 const parts=text.split(/[,;]/u);
 if(parts.length!==2)return null;
 const tail=parts[1].trim().replace(/[?!.,]+$/u,'').trim();
 if(lang==='ru'&&/^(?:но\s+)?расскажите?\s+(?:мне\s+)?(?:о|про)\s+консультации$/u.test(tail))
  return 'Что вы хотели бы узнать о консультации?';
 if(lang==='en'&&/^(?:but\s+)?tell me about (?:the |a )?consultation$/u.test(tail))
  return 'What would you like to know about the consultation?';
 if(lang==='ru'&&/^(?:но\s+)?(?:я\s+)?(?:просто\s+)?хочу поговорить (?:о|про) работе$/u.test(tail))
  return 'Что вы хотели бы обсудить о работе?';
 if(lang==='en'&&/^(?:but\s+)?i (?:just )?want to talk about work$/u.test(tail))
  return 'What would you like to discuss about work?';
 return null;
}
const correction = /\bactually\b|\bi meant\b|\bwhat i meant\b|\byou misunderstood\b|\bnot\s+[^,;.!?]{1,70},?\s+but\s+|точнее|вернее|я имел в виду|я имела в виду|ты меня не понял|не то|не об этом|не про|не о |я про |я об |no me refiero|quise decir|en realidad|no es eso|no se trata de|sino/u;
const mediumCorrection = /(?:no\s+(?:quiero\s+)?(?:video|vídeo|pel[ií]cula|meditaci[oó]n)|no\s+me\s+refiero\s+a\s+(?:video|vídeo|pel[ií]cula|meditaci[oó]n)|not\s+about\s+(?:a\s+)?(?:video|film|reel|meditation)|ne\s+(?:quiero\s+)?(?:video|pel[ií]cula|meditaci[oó]n)|не\s+(?:хочу\s+)?(?:видео|ролик|медитац\p{L}*)|не\s+(?:про|о)\s+(?:видео|ролик|медитац\p{L}*))[^,;.!?]{0,70}(?:but|sino|а|но)(?:\s+(?:about|sobre|про|о))?\s*(?:video|vídeo|film|reel|meditation|meditaci[oó]n|pel[ií]cula|видео|ролик|медитац\p{L}*)/iu;
const follow = /^(?:а\s+)?(?:и\s+)?(?:почему|зачем|как|что дальше|и что|а если|поясни|объясни|расскажи подробнее|что ты имеешь в виду|why|how|what next|and then|what do you mean|explain|tell me more|could you explain|por que|porque|como|que sigue|y si|explica|a que te refieres)(?:\b|$)/u;
const unsure = /^(?:не знаю|пока не знаю|не уверен(?:а)?|не понимаю пока|i don't know|i dont know|not sure|no idea|no se|no estoy seguro|no estoy segura)(?:\b|$)/u;
const reject = /^(?:нет|неа|не хочу|не подходит|не надо|другое|no|nope|not really|doesn't fit|doesnt fit|not that|otra cosa|otro|no quiero)(?:[.! ]|$)/u;
const yes = /^(?:да|ага|угу|хорошо|ок|окей|yes|yeah|sure|ok|okay|si|vale|claro)(?:[.! ]|$)/u;
const hello = /^(?:привет|приветик|здравствуй|здравствуйте|добрый день|доброе утро|добрый вечер|hi|hello|hey|hola|buenas)(?:[!. ]|$)/u;
const thanks = /^(?:спасибо|благодарю|спасибо большое|thanks|thank you|many thanks|gracias|muchas gracias)(?:[!. ]|$)/u;
const bye = /^(?:пока|до свидания|до встречи|стоп|хватит|закончим|bye|goodbye|see you|stop|basta|hasta luego|adios)(?:[!. ]|$)/u;
// Social gestures are not commands to select services or a therapy plan.
// Strict whole-turn matches preserve existing safety and domain workflows.
const socialCheckIn = /^(?:(?:привет|приветик|здравствуй|здравствуйте|hi|hello|hey)[,!\s]+)?(?:как (?:у тебя |у вас )?дела|как ты|как вы|как поживаешь|как поживаете|как жизнь|как настроение|что нового|how are you|how have you been|how are things|hows it going|how is it going|whats up)$/u;
// Shared NFD normalization converts Cyrillic й to и; accept normalized variants.
const socialInvitation = /^(?:можно (?:с тобо[йи]|с вами) (?:пообщаться|поговорить|поболтать)|могу (?:я )?(?:с тобо[йи]|с вами) (?:пообщаться|поговорить|поболтать)|можем (?:мы )?(?:просто )?(?:пообщаться|поговорить|поболтать)(?: с тобо[йи]| с вами)?|дава[йи] (?:просто )?(?:поговорим|поболтаем|пообщаемся)|хочу (?:просто )?(?:поговорить|пообщаться|поболтать)(?: с тобо[йи]| с вами)?|can (?:we|i) (?:just )?(?:talk|chat)(?: (?:with|to) you)?|could (?:we|i) (?:just )?(?:talk|chat)(?: (?:with|to) you)?|i (?:just )?want to (?:talk|chat)(?: with you)?|lets (?:just )?(?:talk|chat))$/u;
const feedback = /слишком длинн|короче|покороче|проще|не по теме|не то что я спросил|не то что я спрашивал|не отвечает на вопрос|непонятно объяснил|too long|shorter|simpler|not relevant|not what i asked|missed my question|that didn't help|that didnt help|demasiado largo|mas corto|no responde a mi pregunta|no era lo que pregunte/u;
const ambivalent = /(?:\bbut\b|\bhowever\b|\balthough\b|\bthough\b|\bpero\b|\bsin embargo\b|\baunque\b|(?:^|\s)(?:но|однако)(?:\s|$)).{0,140}(?:afraid|scared|worried|concerned|hesitat|doubt|unsure|nervous|miedo|preocup|duda|temo|боюсь|страшно|пережива|беспоко|сомнева|не уверен|тревож)/u;
const disclose = /(?:мне (?:сегодня |сеичас |последнее время )?(?:тяжело|грустно|одиноко|нелегко|не по себе|тревожно)|(?:сегодня|вчера|сеичас) (?:был[ао]? )?(?:тяжел|трудн|сложн|ужасн|непрост|напряженн|эмоциональн)[а-я]* день|день выдался (?:тяжел|трудн|сложн|непрост)[а-я]*|у меня был[ао]? (?:тяжел|трудн|сложн|непрост)[а-я]* день|все навалилось|я запутал(?:ся|ась)|я растерян|мне нужна поддержка|хочу просто поговорить|мне нужно выговориться|хочу выговориться|i (?:had|have) (?:a )?(?:rough|hard|difficult|long|stressful) day|today was (?:a )?(?:rough|hard|difficult|stressful)(?: day)?|it has been a (?:rough|hard|long) day|i (?:just )?(?:need|want) (?:someone to listen|to talk|to vent)|(?:i am|im) lonely|i feel (?:stuck|lonely|overwhelmed|lost|uneasy)|i'm feeling overwhelmed|im feeling overwhelmed|i need support|me siento (?:solo|sola|perdido|perdida|abrumado|abrumada|inquiet[oa])|hoy tuve un dia (?:dificil|duro|complicado)|hoy fue un dia (?:dificil|duro|complicado)|ha sido un dia (?:duro|dificil)|necesito apoyo|solo quiero hablar|necesito desahogarme)/u;

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
    // A user can end or reject a topic. Older mentions must not revive it.
    if(/^(?:стоп|хватит|закончим|сменить тему|другая тема|не (?:про|о|об)\s|stop|goodbye|change topic|switch topic|another topic|not about\s)(?:[\s.!?,;:]|$|\p{L})/u.test(t)) {
      // Explicit contrast has a positive replacement; reuse the same parser.
      if(/(?:\sа\s|\sbut\s)/u.test(t)){
        const corrected=understandConversationTurn({message:row.text,history:[]});
        return topics.find(item=>item.id===corrected.topic)||null;
      }
      return null;
    }
    if (!t || danger.test(t) || request.test(t)) continue;
    const found = topicOf(t);
    if (found) return found;
  }
  return null;
}
/** Latest user-stated topic, bounded by explicit reset or rejection. */
export function resolveRecentConversationTopic(history=[]){return topicFromHistory(history)?.id||null;}
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

/**
 * RU/EN companionship style inside existing Conversation Intelligence.
 * Last assistant turn is used only to avoid mechanical repetition; no storage.
 */
function socialReply(act,lang,text,history=[]) {
  const prior=Array.isArray(history)?history.slice(-6):[];
  const lastAssistant=[...prior].reverse().find(row=>row?.role==="assistant"&&typeof row.text==="string")?.text||"";
  const repeated=lastAssistant.includes("Спасибо, что интересуешься")||
    lastAssistant.includes("Спасибо, что интересуетесь")||
    lastAssistant.includes("Thanks for asking");
  const formal=lang==="ru"&&(
    /^(?:здравствуйте|добрый день|доброе утро|добрый вечер)|(?:^|\s)(?:вы|вам|вас|вами|поживаете)(?:\s|$)|у вас/u.test(text)||
    prior.some(row=>row?.role==="user"&&/^(?:здравствуйте|добрый день)/u.test(norm(row.text))));
  const ongoing=Boolean(lastAssistant);
  if(lang==="ru"){
    if(act==="greeting")return formal
      ?"Здравствуйте! 🙂 Рада вас видеть здесь. О чём хочется поговорить?"
      :"Привет! 🙂 Как проходит твой день?";
    if(act==="small_talk")return repeated
      ?"Я на связи 🙂 Можем просто поболтать, если хочется."
      :formal
        ?"Спасибо, что интересуетесь 🙂 Я на связи. А как проходит ваш день?"
        :"Спасибо, что интересуешься 🙂 Я здесь, можем поболтать. А у тебя как дела?";
    if(act==="chat_invitation")return ongoing
      ?formal
        ?"Конечно! Можем просто пообщаться. Я слушаю 🙂"
        :"Конечно! Давай просто поболтаем. Я слушаю 🙂"
      :formal
        ?"Конечно! 🙂 Можем просто пообщаться. О чём вам хочется поговорить?"
        :"Конечно! 🙂 Давай поболтаем. О чём тебе хочется поговорить?";
  }
  if(lang==="en"){
    if(act==="greeting")return "Hi! 🙂 How's your day going?";
    if(act==="small_talk")return repeated
      ?"I'm here 🙂 We can just chat, if you like."
      :"Thanks for asking 🙂 I'm here and happy to chat. How's your day going?";
    if(act==="chat_invitation")return ongoing
      ?"Of course! We can just talk. I'm listening 🙂"
      :"Of course! 🙂 We can just chat, no agenda. What's on your mind?";
  }
  return null;
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
  const correctionEvent=(lang==='ru'||lang==='en')?nativeDialogueEventFromUtterance({message:raw,locale:lang}):null;
  if(correctionEvent?.type==='clear_goal_statement')return {...empty,act:'forget_goal',confidence:1,evidence:'explicit_text',
    replyFallback:lang==='ru'?'Хорошо, не буду удерживать эту цель в текущем разговоре.':
      "Understood, I won't retain that goal in this conversation."};
  if(correctionEvent?.type==='set_goal_statement'&&correctionEvent.corrected)
    return {...empty,act:'correction',confidence:1,evidence:'explicit_text',
      replyFallback:lang==='ru'?`Спасибо за поправку. Я услышал: «${correctionEvent.value}»`:
        `Thanks for the correction. I heard: “${correctionEvent.value}”`};
  if(correctionEvent?.type==='set_goal'&&correctionEvent.corrected)
    return {...empty,act:'correction',confidence:1,evidence:'explicit_text',requiresClarification:true,
      replyFallback:lang==='ru'?'Понял, вы имели в виду консультацию, а не коучинг. Что вы хотели бы обсудить?':
        'Understood, you mean a consultation rather than coaching. What would you like to discuss?'};
  if(correctionEvent?.type==='set_topic'&&correctionEvent.newTopic){
    const labels={ru:{relationships:'отношения',work:'работу',energy:'энергию',meaning:'смысл',goals:'цели'},
      en:{relationships:'relationships',work:'work',energy:'energy',meaning:'meaning',goals:'goals'}};
    return {...empty,act:'topic_switch',confidence:1,evidence:'explicit_text',topic:correctionEvent.value,
      replyFallback:lang==='ru'?`Хорошо, меняем тему на ${labels.ru[correctionEvent.value]}. Я слушаю.`:
        `All right, let's switch to ${labels.en[correctionEvent.value]}. I'm listening.`};
  }
  if(explicitClose(text,lang))return {...empty,act:'goodbye',confidence:1,evidence:'explicit_close',
    replyFallback:lang==='ru'?'Хорошо, закончим. До встречи.':'All right, we can stop here. Take care.'};
  if(explicitNoAdvice(text,lang))return {...empty,act:'no_advice',confidence:1,evidence:'explicit_text',
    replyFallback:lang==='ru'?'Хорошо, продолжим без советов. Я слушаю.':"All right, we'll continue without advice. I'm listening."};
  if((lang==='ru'&&/^(?:поясни|объясни)(?: это)? одним предложением$/u.test(text))||
     (lang==='en'&&/^explain (?:that|it) in (?:a |one )?single sentence$/u.test(text)))
    return {...empty,act:'concise_explanation',confidence:1,evidence:'explicit_text',
      replyFallback:lang==='ru'?'Какую часть ответа пояснить?':'Which part of my answer would you like clarified?'};
  if((lang==='ru'||lang==='en')&&hasExplicitActionRefusal(raw)) {
    // Preserve explicitly recognized compound turns for the stateful router:
    // the refusal must not erase a corrected preference or a request to talk.
    const event=nativeDialogueEventFromUtterance({message:raw,locale:lang,state:{goal:{value:'consultation'}}});
    if(event.type==='cancel_to_talk'||event.type==='set_time'&&event.bookingDeferred)
      return {...empty,act:'direct_request',evidence:'explicit_text'};
    const next=refusalFollowUp(text,lang);
    return {...empty,act:'rejection',confidence:.98,evidence:'explicit_text',
      replyFallback:(lang==='ru'?'Понял, не буду этого делать.':'Understood, I will not do that.')+(next?' '+next:'')};
  }
  if(request.test(text)) return {...empty,act:"direct_request",evidence:"explicit_text"};
  // Polite requests are distinct from factual questions; neither grants
  // permission to take an external action.
  if((lang==='ru'&&/^(?:пожалуйста[, ]+)?(?:можете|можешь|не могли бы вы)\s+(?:объяснить|объясни|подсказать|помочь|рассказать)(?:\s|$)/u.test(text))||
     (lang==='en'&&/^(?:please\s+)?(?:can|could|would) you\s+(?:explain|help|tell me|describe)(?:\s|$)/u.test(text)))
    return {...empty,act:'direct_request',evidence:'explicit_text'};
  let act="unknown",confidence=0,evidence="none",topic=topicOf(text);
  if(socialInvitation.test(text)) {act="chat_invitation";confidence=1;evidence="explicit_text";}
  else if(socialCheckIn.test(text)) {act="small_talk";confidence=1;evidence="explicit_text";}
  else if(hello.test(text)) {act="greeting";confidence=1;evidence="explicit_text";}
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
  else if(disclose.test(text)||(lang==='ru'&&/^(?:у меня путаница|мне (?:сегодня |сеичас )?очень (?:одиноко|грустно|тяжело|тревожно))(?:\s+|$)/u.test(text))) {act="disclosure";confidence=.86;evidence="explicit_text";}
  else if((lang==='ru'||lang==='en')&&/[?？]/u.test(raw)) {act="question";confidence=.8;evidence="explicit_text";}
  else if(topic && raw.length<=45 && !/[?؟]/u.test(raw)) {act="topic_statement";confidence=.84;evidence="explicit_text";}
  if(["follow_up","affirmation","rejection"].includes(act)&&!topic) topic=context;
  return {version:CONVERSATION_INTELLIGENCE_VERSION,act,topic:topic?.id||null,
    contextTopic:context?.id||null,confidence,
    requiresClarification:["correction","follow_up","uncertainty","rejection"].includes(act),
    replyFallback:(lang==="ru"||lang==="en")&&["greeting","small_talk","chat_invitation"].includes(act)
      ?socialReply(act,lang,text,history):localized(act,lang,topic),evidence};
}

const consultationCorrection=/^(?:(?:ты меня не понял(?:а)?|you misunderstood|no me entendiste)[:, ]+)?(?:не коучинг[, ]+а консультац(?:ия|ию)|not coaching[, ]+but (?:a )?consultation|no coaching[, ]+sino (?:una )?consulta)[.!?]*$/u;
function explicitMeditationRefusal(message,locale){
 const text=norm(message).replace(/[?!.,¿¡]+$/u,'').trim();
 return locale==='ru'?/^(?:пожалуиста[, ]+)?(?:не предлагаи(?:те)? (?:мне )?(?:больше )?медитац(?:ию|ии)|(?:я )?не хочу медитац(?:ию|ии))$/u.test(text):
  locale==='en'?/^(?:please[, ]+)?(?:(?:do not|dont) (?:offer|suggest|recommend) (?:me )?(?:a |some )?meditations?(?: anymore)?|i (?:do not|dont) want (?:a |any )?meditations?(?: anymore)?)$/u.test(text):false;
}
function explicitMeditationRenewal(message,locale){
 const text=norm(message).replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/gu,' ').trim();
 return locale==='ru'?/^(?:(?:на самом деле|вообще то) )?(?:я )?хочу медитацию$/u.test(text):
  locale==='en'?/^(?:actually )?i (?:want|would like) (?:a )?meditation$/u.test(text):false;
}

/**
 * Produce a bounded event from explicit current words only. `state` must come
 * from the verified server-bound store, never from browser-provided history.
 * This function does not authorize or execute actions and is not a safety gate.
 */
export function nativeDialogueEventFromUtterance({message='',locale='en',state=null}={}){
 if(!locales.has(locale)||typeof message!=='string'||!message.trim()||message.length>limit)return {type:'ordinary'};
 const raw=norm(message).replace(/[?!.,¿¡]+$/u,'').trim();
 if(danger.test(raw))return {type:'ordinary'};
 if(explicitClose(raw,locale))return {type:'stop'};
 if(explicitNoAdvice(raw,locale))return {type:'refuse_advice'};
 const text=raw.replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/gu,' ').trim();
 if(state?.pendingAdviceConfirmation===true&&state?.declinedAdvice?.value==='advice'&&!/[?？]/u.test(message)){
  if(locale==='ru'&&/^(?:да|хорошо)$/u.test(text)||locale==='en'&&/^(?:yes|okay|ok)$/u.test(text))return {type:'allow_advice'};
  if(locale==='ru'&&/^(?:нет|не надо)$/u.test(text)||locale==='en'&&/^(?:no|no thanks)$/u.test(text))return {type:'retain_advice'};
 }
 if((locale==='ru'&&/^теперь (?:можешь|можете) дать совет$/u.test(text))||
    (locale==='en'&&/^now you can (?:offer|give) (?:me )?advice$/u.test(text)))return {type:'allow_advice'};
 if(state?.declinedAdvice?.value==='advice'&&((locale==='ru'&&/^(?:да )?(?:я )?хочу совет$/u.test(text))||
    (locale==='en'&&/^(?:yes )?i (?:do )?want (?:some )?advice$/u.test(text))))return {type:'allow_advice'};
 if(explicitMeditationRefusal(raw,locale))return {type:'refuse_meditation'};
 const clauses=raw.split(/[,;]/u);
 if(clauses.length===2&&clauses[1].trim()&&explicitMeditationRefusal(clauses[0].trim(),locale)){
  if(explicitMeditationRenewal(clauses[1],locale))return state?.declinedMeditation?.value==='meditation'?{type:'allow_meditation'}:{type:'ordinary'};
  return {type:'refuse_meditation',mixed:true};
 }
 if(state?.declinedMeditation?.value==='meditation'&&explicitMeditationRenewal(text,locale))return {type:'allow_meditation'};
 if(/^(?:стоп|хватит|закончим|до свидания|stop|goodbye|basta|adios)$/u.test(text))return {type:'stop'};
 if(/^(?:сменить тему|другая тема|change topic|switch topic|cambiar tema|otro tema)$/u.test(text))return {type:'new_question'};
 if((locale==='ru'&&/^(?:пожалуиста )?(?:(?:забудь(?:те)?|удали(?:те)?) (?:мою |эту )?цель|не сохраняи(?:те)? (?:мою |эту )?цель)$/u.test(text))||
    (locale==='en'&&/^(?:please )?(?:(?:forget|delete|clear) (?:my|the) (?:goal|objective)|(?:do not|dont) (?:save|remember|store) (?:my|the) goal)$/u.test(text)))
  return {type:'clear_goal_statement'};
 if((locale==='ru'&&/^какую цель мы (?:сеичас )?обсуждаем$/u.test(text))||
    (locale==='en'&&/^what goal are we discussing(?: now)?$/u.test(text)))return {type:'recall_goal'};
 if((locale==='ru'&&/^(?:а )?(?:можно|подоидет ли) (?:утром|днем|вечером)$/u.test(text))||
    (locale==='en'&&/^(?:could|can) we do it in the (?:morning|afternoon|evening)$/u.test(text)))return {type:'ask_time'};
 if((locale==='ru'&&/^(?:а )?сколько (?:это )?стоит$/u.test(text))||
    (locale==='en'&&/^how much (?:would|does) (?:it|that) cost$/u.test(text)))return {type:'ask_price'};
 if(state?.selectedChoiceId&&!/[?？]/u.test(message)&&((locale==='ru'&&/^(?:поясни|объясни)(?: это)? одним предложением$/u.test(text))||
   (locale==='en'&&/^explain (?:that|it) in (?:a |one )?single sentence$/u.test(text))))return {type:'explain_choice'};
 const switched=locale==='ru'?text.match(/^(?:(?:даваи |даваите )?(?:меняем|сменим|сменить) тему) (?:и )?(?:хочу )?(?:поговорить |поговорим )?(.+)$/u):
  locale==='en'?text.match(/^(?:(?:(?:lets|let us) )?change (?:the )?(?:topic|subject)|new topic) (?:and )?(?:i want to )?(?:talk )?(.+)$/u):null;
 if(switched){
  const detected=topicOf(switched[1])?.id;
  const value=detected==='work_money'?(/работ|карьер|work|career/u.test(switched[1])?'work':null):
    detected==='stress_energy'?(/энерги|energy/u.test(switched[1])?'energy':null):
    ({relationships:'relationships',meaning:'meaning',goals:'goals'})[detected];
  return value?{type:'set_topic',value,newTopic:true}:{type:'new_question'};
 }
 if(/^(?:нет )?не записываи(?:те)?(?: меня)? просто поговорим$|^(?:no )?(?:do not|dont) book(?: anything| me)? (?:lets )?(?:just )?talk$|^(?:no )?no reserves solo hablemos$/u.test(text))return {type:'cancel_to_talk'};
 if(!/[?？]/u.test(message)&&((locale==='ru'&&(/^(?:(?:нет|пожалуиста) )?не (?:записываи(?:те)?(?: меня)?|бронируи(?:те)?(?: ничего)?)(?: пока)?$/u.test(text)||
   /^(?:я )?(?:пока |еще )?не (?:хочу|готов|готова) записываться(?: пока)?$/u.test(text)))||
   (locale==='en'&&(/^(?:(?:no|please) )?(?:do not|dont) (?:book|schedule)(?: (?:anything|me|it))?(?: yet)?$/u.test(text)||
   /^(?:i (?:do not|dont) want|(?:im|i am) not ready) to (?:book|schedule)(?: (?:anything|an appointment))?(?: yet)?$/u.test(text)))))return {type:'decline_booking'};
 if(/^(?:спасибо но у меня другои вопрос|thank you but i have another question|gracias pero tengo otra pregunta)$/u.test(text))return {type:'new_question'};
 if(consultationCorrection.test(raw))return {type:'set_goal',value:'consultation'};
 if((locale==='ru'&&/^(?:точнее )?(?:мне )?нужна консультация не коучинг$/u.test(text))||
    (locale==='en'&&/^(?:correction )?(?:i mean )?(?:a )?consultation not coaching$/u.test(text)))
  return {type:'set_goal',value:'consultation',corrected:true};
 if(/^(?:хочу консультацию|мне нужна консультация|i want a consultation|i would like a consultation|quiero una consulta|necesito una consulta)$/u.test(text))return {type:'set_goal',value:'consultation'};
 const tentative=locale==='ru'?text.match(/^(?:я )?думаю о консультации (?:по|про|об?) (работе|отношениях|энергии|смысле|целях)$/u):
  locale==='en'?text.match(/^i (?:am|was) thinking about (?:a )?consultation (?:about|on) (work|relationships|energy|meaning|goals)$/u):null;
 if(tentative)return {type:'set_goal',value:'consultation',topic:({работе:'work',отношениях:'relationships',энергии:'energy',смысле:'meaning',целях:'goals',work:'work',relationships:'relationships',energy:'energy',meaning:'meaning',goals:'goals'})[tentative[1]]};
 const topicPhrases=[
  ['relationships',/^(?:про отношения|об отношениях|about relationships|sobre relaciones)$/u],
  ['work',/^(?:про работу|о работе|about work|sobre trabajo)$/u],
  ['energy',/^(?:про энергию|об энергии|about energy|sobre energia)$/u],
  ['meaning',/^(?:про смысл|о смысле|about meaning|sobre sentido)$/u],
  ['goals',/^(?:про цели|о целях|about goals|sobre metas)$/u],
 ];
 const rejected=text.match(/^(?:не (?:про|о|об) |not about |no sobre )(отношения|отношениях|работу|работе|энергию|энергии|смысл|смысле|цели|целях|relationships|work|energy|meaning|goals|relaciones|trabajo|energia|sentido|metas)$/u);
 if(rejected){
  const rejectedTopicId=({отношения:'relationships',отношениях:'relationships',relationships:'relationships',relaciones:'relationships',
   работу:'work',работе:'work',work:'work',trabajo:'work',энергию:'energy',энергии:'energy',energy:'energy',energia:'energy',
   смысл:'meaning',смысле:'meaning',meaning:'meaning',sentido:'meaning',цели:'goals',целях:'goals',goals:'goals',metas:'goals'})[rejected[1]];
  if(state?.topic?.value===rejectedTopicId)return {type:'clear_topic'};
 }
 const correction=text.match(/^(?:не (?:про|о|об) (?:отношения|отношениях|работу|работе|энергию|энергии|смысл|смысле|цели|целях) а |not about (?:relationships|work|energy|meaning|goals) but |no sobre (?:relaciones|trabajo|energia|sentido|metas) sino )(.+)$/u);
 const topicText=correction?correction[1]:text;
 const topic=topicPhrases.find(([,pattern])=>pattern.test(topicText));
 if(topic)return {type:'set_topic',value:topic[0]};
 if(correction && /^(?:про|о|об|about|sobre)\s+[\p{L}\p{N}]+(?:\s+[\p{L}\p{N}]+){0,3}$/u.test(topicText) && !request.test(topicText))
  return {type:'clear_topic'};
 if(state?.goal?.value==='consultation'){
  // A question about timing is not an asserted preference.
  if((locale==='ru'||locale==='en')&&/[?？]/u.test(message))return {type:'ordinary'};
  // A preference is not permission to reserve. Recognize both parts only
  // when the correction and the deferred booking are explicit in this turn.
  const deferred=locale==='ru'
   ?text.match(/^не (утром|днем|вечером) а (утром|днем|вечером) но (?:пока )?не записываи(?:те)?(?: меня)?(?: пока)?$/u)
   :locale==='en'?text.match(/^not (?:in the )?(morning|afternoon|evening) (?:but )?(?:in the )?(morning|afternoon|evening)s?(?: are better| is better)? but (?:please )?(?:do not|dont) book(?: anything| me)?(?: yet)?$/u):null;
  if(deferred&&deferred[1]!==deferred[2])return {type:'set_time',value:({утром:'morning',днем:'afternoon',вечером:'evening',morning:'morning',afternoon:'afternoon',evening:'evening'})[deferred[2]],bookingDeferred:true};
  // Whole-turn affirmative forms only: a question or a negation must not
  // silently become a saved preference or permission to make a booking.
  const conversational=!/[?？]/u.test(message)&&(locale==='ru'
   ?text.match(/^(?:по )?(утрам|дням|вечерам|утром|днем|вечером) мне (?:обычно )?(?:удобнее|подходит)$/u)
   :locale==='en'?text.match(/^(morning|afternoon|evening)s? (?:usually )?(?:work(?:s)? best|(?:are|is) (?:usually )?better)(?: for me)?$/u):null);
  if(conversational)return {type:'set_time',value:({утрам:'morning',утром:'morning',дням:'afternoon',днем:'afternoon',вечерам:'evening',вечером:'evening',morning:'morning',afternoon:'afternoon',evening:'evening'})[conversational[1]]};
  const preference=locale==='ru'?text.match(/^(?:мне )?(?:удобнее|подходит) (утром|днем|вечером)$/u):
   locale==='en'?text.match(/^(?:the )?(morning|afternoon|evening)s? (?:would work|works|is better)(?: for me)?$/u):null;
  if(preference)return {type:'set_time',value:({утром:'morning',днем:'afternoon',вечером:'evening',morning:'morning',afternoon:'afternoon',evening:'evening'})[preference[1]]};
  const timeCorrection=locale==='ru'?text.match(/^не (утром|днем|вечером) а (утром|днем|вечером)$/u):locale==='en'?text.match(/^not in the (morning|afternoon|evening) but in the (morning|afternoon|evening)$/u):null;
  if(timeCorrection&&timeCorrection[1]!==timeCorrection[2])return {type:'set_time',value:({утром:'morning',днем:'afternoon',вечером:'evening',morning:'morning',afternoon:'afternoon',evening:'evening'})[timeCorrection[2]]};
  const naturalCorrection=locale==='ru'?text.match(/^(утром|днем|вечером) мне (?:неудобно|не подходит) (?:а )?(утром|днем|вечером) (?:удобнее|подходит)$/u):
   locale==='en'?text.match(/^(morning|afternoon|evening)s? (?:do not|dont) work(?: for me)? (?:but )?(morning|afternoon|evening)s? (?:work(?:s)? better|are better)$/u):null;
  if(naturalCorrection&&naturalCorrection[1]!==naturalCorrection[2])return {type:'set_time',value:({утром:'morning',днем:'afternoon',вечером:'evening',morning:'morning',afternoon:'afternoon',evening:'evening'})[naturalCorrection[2]]};
  const rejectedTime=locale==='ru'?text.match(/^(утром|днем|вечером) (?:мне )?(?:неудобно|не подходит|не получится)$/u):
   locale==='en'?text.match(/^(?:(morning|afternoon|evening)s? (?:do not|dont) work(?: for me)?|i (?:cannot|cant) do the (morning|afternoon|evening))$/u):null;
  if(rejectedTime){
   const value=({утром:'morning',днем:'afternoon',вечером:'evening',morning:'morning',afternoon:'afternoon',evening:'evening'})[rejectedTime[1]||rejectedTime[2]];
   if(state.timePreference?.value===value)return {type:'clear_time',value};
  }
  if(/^(?:лучше утром|утром|лучше днем|днем|in the morning(?: please)?|morning(?: please)?|in the afternoon(?: please)?|afternoon(?: please)?|mejor por la manana|por la manana)$/u.test(text)){
   return {type:'set_time',value:/днем|afternoon/u.test(text)?'afternoon':'morning'};
  }
  if(/^(?:лучше вечером|вечером|in the evening(?: please)?|evening(?: please)?)$/u.test(text))return {type:'set_time',value:'evening'};
  if(/^(?:mejor por la tarde|por la tarde)$/u.test(text))return {type:'set_time',value:'afternoon'};
 }
 const ordinalChoices=[/^(?:(?:тогда )?(?:первый|первыи) вариант|(?:then )?(?:i prefer )?the first option|la primera opcion)$/u,
  /^(?:(?:тогда )?второи вариант|(?:then )?(?:i prefer )?the second option|la segunda opcion)$/u,
  /^(?:(?:тогда )?третии вариант|(?:then )?(?:i prefer )?the third option|la tercera opcion)$/u];
 const choiceIndex=ordinalChoices.findIndex(pattern=>pattern.test(text));
 if(choiceIndex>=0&&(locale==='es'||!/[?？]/u.test(message)))return {type:'choose',ordinal:choiceIndex+1};
 // A single, explicit first-person wish may be kept as an ephemeral goal;
 // never interpret a question, refusal, command or sensitive identifier as one.
 const original=message.trim();
 const corrected=locale==='ru'?original.match(/^(?:(?:нет|не это)[, ]+)?(?:точнее|на самом деле)[,: ]+((?:я\s+)?хочу\s+.+)$/iu):
  locale==='en'?original.match(/^(?:(?:no|not that)[, ]+)?(?:actually|i mean)[,: ]+(i\s+(?:want|would like)\s+.+)$/iu):null;
 const goalText=corrected?corrected[1]:original;
 const goalPrefix=locale==='ru'?/^(?:я\s+)?хочу\s+/iu:locale==='en'?/^i\s+(?:want|would like)\s+/iu:null;
 const negativeGoal=locale==='ru'?/^(?:я\s+)?хочу\s+не(?=\s|$)/iu:/^i\s+(?:want|would like)\s+(?:to\s+)?not\b/iu;
 const sensitive=/(?:парол|токен|паспорт|банковск|кредитн|password|passcode|api.?key|credit.?card|social security|\b\S+@\S+\b)/iu;
 const actionRequest=/(?:удал|стери|отправ|напиши|свяж|заброниру|оплат|верни деньги|\b(?:delete|erase|forget|send|contact|email|pay|book|schedule|refund|save|share)\b)/iu;
 if(goalPrefix?.test(goalText)&&!negativeGoal.test(goalText)&&goalText.length<=160&&
   !/[?？\r\n\u0000-\u001f;:]/u.test(goalText)&&!/[.!]\s+\S/u.test(goalText)&&
   !request.test(norm(goalText))&&!actionRequest.test(goalText)&&!sensitive.test(goalText))
  return corrected?{type:'set_goal_statement',value:goalText,corrected:true}:{type:'set_goal_statement',value:goalText};
 return {type:'ordinary'};
}
