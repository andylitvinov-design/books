/**
 * Holistic Mind Language Agent 2.1 — deterministic safety/intent layer.
 *
 * Pure and browser-safe. NO networking, persistence, profile reads, credentials,
 * health inference or model-dependent authorization. Reuse the site's reviewed
 * safety recognizer and already-curated public catalog entries.
 *
 * Client text is processed ephemerally and NEVER included in the returned state.
 * The server is authoritative for any future profile or private-material reads.
 */
import { interpretSupportUtterance } from "./guide-dialogue.mjs";

export const LANGUAGE_AGENT_VERSION = "holistic-language-2.1";
const LOCALES = new Set(["en", "ru", "es"]);
const TOPICS = new Set(["energy", "money", "love", "meaning", "goals"]);
const FORMATS = new Set(["video", "audio", "test", "course", "service"]);
const defaultFormats = Object.freeze(["video", "audio", "test", "course", "service"]);
const maxTurns = 200;
const safeText = value => typeof value === "string" ? value.trim() : "";
const limitList = (arr, options, max = 15) => [...new Set(
  (Array.isArray(arr) ? arr : []).filter(x => typeof x === "string" && options.has(x))
)].slice(0, max);
const normalize = text => text.toLocaleLowerCase().replace(/ё/g, "е")
  // Unicode NFD decomposes Russian й into и + U+0306. Restore it before
  // stripping Latin accent marks, or "сейчас" becomes "сеичас" and explicit
  // topic corrections are silently missed.
  .normalize("NFD").replace(/и\u0306/gu, "й").replace(/[\u0300-\u036f]/g, "");
const presence = (text, re) => re.test(text);
const TOPIC_PATTERNS = [
  ["love", /отношени|партнер|близост|любов|семь[яеи]|relationship|partner|love|relacion|pareja|amor/u],
  ["energy", /устал|энерги|выгор|напряжен|стресс|тревож|сон|засып|stress|energy|tired|exhaust|sleep|anxio|estres|energia|cansad|sueno/u],
  ["money", /денег|деньг|финанс|зарплат|доход|работ|карьер|money|income|finance|salary|work|job|dinero|trabaj|empleo/u],
  ["meaning", /смысл|ценност|предназнач|призвани|meaning|values|purpose|sentido|proposito|valor(?:es)?/u],
  ["goals", /цел[ьиья]|план|концентрац|фокус|мотивац|откладыв|clarity|focus|motivat|goals?|plan|objetiv|metas?|concentracion/u],
];
const FORMAT_PATTERNS = {
  video: /видео|видос|ролик|посмотр|video|watch|mirar|ver video/u,
  audio: /аудио|звук|слушат|послушат|подкаст|аудиозапис|audio|listen|sound|escuchar|sonido/u,
  test: /тест|опросник|анкет|test|quiz|cuestionario|prueba/u,
  course: /курс|урок|обучени|course|lesson|curso|leccion/u,
  service: /сесси|консультац|специалист|мастер|session|consultation|appointment|consulta|sesion|profesional/u,
};
const NO = {
  video: /(?:(?<![а-яё])не\s+(?:хочу|надо|нужн[аоы]|предлагай|показывай)|без|никаких)\s+(?:мне\s+)?(?:видео|видос|ролик)|(?:видео|видос|ролик)[а-я]*\s+(?:(?<![а-яё])не\s+(?:хочу|надо|нужн[аоы]))|(?:no|without|not)\s+(?:more\s+|any\s+)?(?:videos?|watching)|(?:sin|no quiero|nada de|no)\s+(?:videos?)|(?<![а-яё])не\s+(?:видео|видос|ролик)/u,
  audio: /(?:(?<![а-яё])не\s+(?:хочу|надо|нужн[аоы])|без|никаких)\s+(?:мне\s+)?(?:аудио|звука|подкаст)|(?:no|without|not)\s+(?:any\s+)?(?:audio|listening)|(?:sin|no quiero)\s+(?:audio|sonido)/u,
  test: /(?:(?<![а-яё])не\s+(?:хочу|надо|нужн[аоы])|без)\s+(?:мне\s+)?(?:тест|опрос)|(?:no|without|not)\s+(?:any\s+|a\s+)?(?:tests?|quizzes)|(?:sin|no quiero)\s+(?:test|prueba)/u,
  course: /(?:(?<![а-яё])не\s+(?:хочу|надо|нужн[аоы])|без)\s+(?:курс|урок)|(?:no|without|not)\s+(?:any\s+|a\s+)?(?:course|lessons?)|(?:sin|no quiero)\s+curso/u,
  service: /(?:(?<![а-яё])не\s+(?:хочу|надо|нужн[аоы])|без)\s+(?:сесси|консультац)|(?:no|without|not)\s+(?:any\s+|a\s+)?(?:session|consultation)|(?:sin|no quiero)\s+(?:consulta|sesion)/u,
};
const RE_ALLOW = {
  video: /теперь\s+(?:можно|хочу)\s+видео|now\s+(?:i\s+want|videos?\s+are\s+ok)|ahora\s+(?:si|quiero)\s+video/u,
  audio: /теперь\s+(?:можно|хочу)\s+аудио|now\s+(?:i\s+want|audio\s+is\s+ok)|ahora\s+(?:si|quiero)\s+audio/u,
  test: /теперь\s+(?:можно|хочу)\s+тест|now\s+(?:i\s+want|tests?\s+are\s+ok)|ahora\s+(?:si|quiero)\s+test/u,
  course: /теперь\s+(?:можно|хочу)\s+курс|now\s+(?:i\s+want|courses?\s+are\s+ok)|ahora\s+(?:si|quiero)\s+curso/u,
  service: /теперь\s+(?:можно|хочу)\s+сесси|now\s+(?:i\s+want|sessions?\s+are\s+ok)|ahora\s+(?:si|quiero)\s+sesion/u,
};
const CHANGE = /передумал|вместо|лучше\s+(?:мне|давай)|смени(?:ть|м)|actually|instead|changed my mind|prefiero|mejor\s+que|en vez de/u;

// Explicit corrections and "now" clauses take precedence over historical
// topics in the SAME turn. Without a correction, retain the existing
// conservative priority (e.g. "tired at work" is about exhaustion).
const TOPIC_PIVOT = /(?:теперь|сейчас|сегодня|а про|вместо|но про|rather than|but now|instead|actually|right now|currently|ahora|en vez de|sino|pero ahora)/gu;
function mentionedTopic(text) {
  const pivotMatches = [...text.matchAll(TOPIC_PIVOT)];
  if(pivotMatches.length) {
    const pivot = pivotMatches.at(-1);
    const tail = text.slice(pivot.index + pivot[0].length);
    const found = TOPIC_PATTERNS.flatMap(([id,re]) => {
      const global = new RegExp(re.source,re.flags.includes("g")?re.flags:re.flags+"g");
      return [...tail.matchAll(global)].map(hit=>({id,at:hit.index}));
    }).sort((a,b)=>a.at-b.at);
    // Last explicitly mentioned focus wins only after the correction marker.
    if(found.length) return found.at(-1).id;
  }
  return TOPIC_PATTERNS.find(([,re])=>presence(text,re))?.[0];
}

const STOP = /^(?:стоп|хватит|останови|прекратим|stop|pause|enough|parar|basta|detener)[!.\s]*$/u;
const COPY = {
  ru: {
    intro: "Я рядом как виртуальный помощник. Расскажите, какая тема важнее сейчас.",
    clarify: "Уточните, пожалуйста, с чего хотите начать: энергия, работа, отношения, цели или смыслы?",
    format: "Какой формат сейчас удобнее: видео, аудио, короткий тест, курс или информация о сессии?",
    match: "Вот проверенные материалы из нашей библиотеки, которые подходят вашему выбору. Вы можете открыть любой из них.",
    noMatch: "По вашим условиям я пока не вижу подтверждённого подходящего материала. Не буду предлагать случайную запись.",
    audioMissing: "В этой части сайта у меня пока нет подтверждённой подходящей аудиозаписи. Могу уточнить выбор или предложить другой разрешённый формат.",
    time: "Для этих материалов не подтверждена нужная длительность, поэтому я не буду обещать совпадение.",
    unsafe: "Если есть непосредственная опасность, обратитесь в местную экстренную службу или к человеку рядом. Я не заменяю экстренную помощь.",
    riskUnknown: "Я не смог безопасно обработать настолько длинное сообщение. Пожалуйста, сократите его или обратитесь к человеку, если нужна срочная помощь.",
    stopped: "Остановимся. Вы можете начать новую тему, когда захотите.",
    notPermitted: "Этот формат выключен вашим фильтром. Можно выбрать другой разрешённый вариант.",
    ask: "Что вам сейчас важнее — немного успокоиться или прояснить следующий шаг?",
    short: "Учту: буду отвечать короче.",
    thanks: "Понял ваш запрос. Можем продолжить с одного небольшого шага.",
  },
  en: {
    intro: "I'm your virtual guide. Tell me what matters most today.",
    clarify: "What would you like to start with: energy, work, relationships, goals, or meaning?",
    format: "Which format do you prefer: video, audio, a short test, a course, or information about sessions?",
    match: "Here are verified resources from our library that fit your choices. You can open any of them.",
    noMatch: "I can't verify a suitable resource under these conditions yet, so I won't suggest an arbitrary recording.",
    audioMissing: "I don't have a verified matching audio recording in this part of the site yet. We can refine your choice or select another permitted format.",
    time: "The required duration hasn't been verified for these resources, so I can't promise an exact match.",
    unsafe: "If you're in immediate danger, contact local emergency services or someone nearby. I cannot provide emergency assistance.",
    riskUnknown: "I couldn't safely review a message that long. Please shorten it, or contact human support if the situation is urgent.",
    stopped: "We can stop here. You can start a new topic whenever you'd like.",
    notPermitted: "This format is disabled in your filter. You can choose another permitted option.",
    ask: "Would it be more helpful to feel calmer or clarify your next step?",
    short: "Understood. I'll keep things brief.",
    thanks: "I understand the direction. We can continue with one manageable step.",
  },
  es: {
    intro: "Soy tu guía virtual. Cuéntame qué es lo más importante hoy.",
    clarify: "¿Por dónde quieres empezar: energía, trabajo, relaciones, objetivos o sentido?",
    format: "¿Qué prefieres: vídeo, audio, un test breve, un curso o información sobre sesiones?",
    match: "Estos recursos verificados de nuestra biblioteca encajan con tu elección. Puedes abrir el que prefieras.",
    noMatch: "Todavía no puedo verificar un recurso que cumpla esas condiciones, así que no sugeriré una grabación al azar.",
    audioMissing: "Aún no tengo una grabación de audio verificada para esa elección en esta sección. Podemos precisar la búsqueda o elegir otro formato permitido.",
    time: "La duración requerida no está verificada, así que no puedo asegurar una coincidencia exacta.",
    unsafe: "Si estás en peligro inmediato, contacta a los servicios de emergencia locales o a alguien cercano. No soy un servicio de emergencia.",
    riskUnknown: "No pude revisar de forma segura un mensaje tan largo. Acórtalo o contacta con una persona si necesitas ayuda urgente.",
    stopped: "Podemos detenernos aquí. Puedes cambiar de tema cuando quieras.",
    notPermitted: "Este formato está desactivado en tu filtro. Puedes elegir otro permitido.",
    ask: "¿Te ayudaría más encontrar calma o aclarar el siguiente paso?",
    short: "Entendido. Responderé brevemente.",
    thanks: "Entiendo la dirección. Podemos dar un pequeño paso.",
  },
};
// Editorial response style: no fabricated source details, claims or link changes.
const STYLE_SHORT=Object.freeze({
  ru:{
    topic:"Какая тема важнее: энергия, работа, отношения, цели или смыслы?",
    format:"Что удобнее: видео, аудио, тест, курс или сессия?",
    match:"Нашёл подходящие материалы в проверенной библиотеке.",
    noMatch:"Подтверждённых материалов пока нет. Можем уточнить выбор.",
    audio:"Подтверждённого аудио пока нет. Можем уточнить выбор.",
    notPermitted:"Этот формат выключен вашим фильтром.",
  },
  en:{
    topic:"Which area: energy, work, relationships, goals, or meaning?",
    format:"Which format: video, audio, test, course, or session?",
    match:"Here are verified matching resources.",
    noMatch:"No verified match yet. We can refine your choice.",
    audio:"No verified audio match yet. We can refine the search.",
    notPermitted:"This format is disabled in your filter.",
  },
  es:{
    topic:"¿Qué tema: energía, trabajo, relaciones, objetivos o sentido?",
    format:"¿Qué formato: vídeo, audio, test, curso o sesión?",
    match:"Estos recursos verificados encajan con tu solicitud.",
    noMatch:"Todavía no hay recursos verificados. Podemos precisar la búsqueda.",
    audio:"No hay audio verificado. Podemos precisar la búsqueda.",
    notPermitted:"Este formato está desactivado en tu filtro.",
  },
});
const STYLE_INFORMAL_RU=Object.freeze({
  topic:"Расскажи, что тебе ближе: энергия, работа, отношения, цели или смыслы?",
  format:"Что тебе удобнее: видео, аудио, тест, курс или информация о сессии?",
  match:"Вот проверенные материалы из нашей библиотеки по твоему запросу. Выбирай, что подходит.",
  noMatch:"Пока не вижу подтверждённого материала под твои условия. Можем немного уточнить.",
  audio:"Пока не вижу подходящей опубликованной аудиозаписи. Можем уточнить выбор.",
  notPermitted:"Этот формат сейчас выключен в твоём фильтре. Выбери другой.",
});
const DETAIL=Object.freeze({
  ru:"Учитываю только выбранную тему, допустимый формат и опубликованные записи; недостающую информацию не додумываю.",
  en:"I only use the selected topic, allowed format, and published records; I won't invent missing information.",
  es:"Solo uso el tema seleccionado, el formato permitido y recursos publicados; no invento información ausente.",
});
function speak(lang,stage,state,fallback) {
  if(state.brevity==="short")return STYLE_SHORT[lang]?.[stage]||fallback;
  if(lang==="ru"&&state.address==="informal")
    return STYLE_INFORMAL_RU[stage]||fallback;
  if(state.brevity==="detailed"&&["match","noMatch","audio"].includes(stage))
    return fallback+" "+DETAIL[lang];
  return fallback;
}
function detectLocale(text, current) {
  if (/[а-яё]/iu.test(text)) return "ru";
  if (/[¿¡ñáéíóúü]/iu.test(text) ||
    /\b(?:quiero|necesito|estoy|escuchar|trabajo|ayuda|relaciones|prefiero)\b/iu.test(text)) return "es";
  if (/\b(?:i|i'm|my|want|need|could|please|without|listen|help|work)\b/iu.test(text)) return "en";
  return LOCALES.has(current) ? current : "en";
}
function duration(text) {
  const range = text.match(/(?:^|[^\d])(\d{1,3})\s*[-–—]\s*(\d{1,3})\s*(?:мин[а-яё]*|min(?:utes?|utos?)?)(?=$|[\s.,!?])/u);
  const single = text.match(/(?:^|[^\d])(?:до\s+|up to\s+|under\s+|menos de\s+)?(\d{1,3})\s*(?:мин[а-яё]*|min(?:utes?|utos?)?)(?=$|[\s.,!?])/u);
  const value = range ? Number(range[2]) : single ? Number(single[1]) : undefined;
  return Number.isInteger(value) && value >= 1 && value <= 180 ? value : undefined;
}
function clearTextForUi(value) {
  return safeText(value).slice(0, 180).replace(/[\u0000-\u001f\u007f]/g, "");
}
function verifiedMedia(catalog, state) {
  const suggestions = [];
  const choice = state.format;
  if (!choice || state.excluded.includes(choice) || !state.allowed.includes(choice)) return [];
  if (choice === "video") {
    const aliases = {love:["love","relationships"],money:["business","money"],
      energy:["energy","health"],goals:["meaning","goals"],meaning:["meaning"]};
    for (const row of Array.isArray(catalog?.videos) ? catalog.videos : []) {
      if (!row || !/^[A-Za-z0-9_-]{11}$/.test(row.id) ||
        typeof row.title !== "string" || !row.title.trim() ||
        !Array.isArray(row.topics) || !aliases[state.topic]?.some(tag=>row.topics.includes(tag)) ||
        (row.sourceLanguage && row.sourceLanguage !== state.locale)) continue;
      // These are already server-curated/published videos passed by existing page.
      // Never trust a user-provided catalog as a production publication check.
      const time = Number(row.durationMinutes);
      if (state.maxDurationMin && (!Number.isFinite(time) || time > state.maxDurationMin)) continue;
      suggestions.push({id:"youtube:"+row.id,kind:"video",videoId:row.id,title:clearTextForUi(row.title)});
      if (suggestions.length >= 3) break;
    }
  }
  if (choice === "test") {
    for (const row of Array.isArray(catalog?.tests?.[state.topic]) ? catalog.tests[state.topic] : []) {
      if (!row || !/^[a-z0-9][a-z0-9-]{1,95}$/.test(row.key) ||
        !/^\/(?:en|ru)\/client\?startTests=[a-z0-9%-]+$/.test(row.href) ||
        !Number.isFinite(row.durationMinutes) || row.durationMinutes <= 0 ||
        (state.maxDurationMin && row.durationMinutes > state.maxDurationMin)) continue;
      suggestions.push({id:"test:"+row.key,kind:"test",title:clearTextForUi(row.title),href:row.href});
      if (suggestions.length >= 3) break;
    }
  }
  // Audio, course and session are intentionally absent unless their real
  // published/approved catalog records are supplied by a trusted adapter.
  if (choice === "audio") {
    for (const row of Array.isArray(catalog?.audio) ? catalog.audio : []) {
      if (!row || row.verifiedPublicManifest !== true || row.playable !== true ||
        typeof row.title !== "string" || row.locale !== state.locale ||
        !/^https:\/\/[a-z0-9]{20}\.supabase\.co\/storage\/v1\/object\/public\/hh-reiki-course-audio\/reiki-practitioner\/intros\/(?:flight|tantra|kundalini|yggdrasil|initiation)\/(?:en|ru)\/[a-f0-9]{32}\.(?:mp3|m4a|wav)$/.test(row.href) ||
        state.maxDurationMin) continue;
      suggestions.push({id:row.id,kind:"audio",title:clearTextForUi(row.title),href:row.href});
    }
  }
  return suggestions;
}
export function createLanguageSession({locale="en",seedTopic=null,enabledFormats=defaultFormats}={}) {
  return {
    version:LANGUAGE_AGENT_VERSION, locale:LOCALES.has(locale)?locale:"en",
    topic:TOPICS.has(seedTopic)?seedTopic:null,format:null,excluded:[],
    allowed:limitList(enabledFormats,FORMATS),maxDurationMin:null,
    brevity:"normal",address:"neutral",turns:0,
  };
}
export function turnLanguageAgent({text,previous=null,catalog={},locale="en"}={}) {
  const prior = previous && previous.version===LANGUAGE_AGENT_VERSION
    ? previous : createLanguageSession({locale});
  const input = safeText(text), n = normalize(input);
  const lang = detectLocale(input,prior.locale), t = COPY[lang];
  const next = {...prior,locale:lang,turns:Math.min(maxTurns,prior.turns+1)};
  if (!input) return {state:prior,status:"empty",text:"",suggestions:[],allowLocalRewrite:false};
  // The reviewed site recognizer scans windows; never skip a tail risk phrase.
  // Text longer than the preflight bound fails closed.
  if (input.length>4000) return {state:next,status:"safety_check_required",text:t.riskUnknown,
    suggestions:[],allowLocalRewrite:false};
  for (let i=0;i<input.length;i+=180) {
    if (interpretSupportUtterance(input.slice(i,i+240),lang).kind==="safety") {
      return {state:next,status:"safety_handoff",text:t.unsafe,suggestions:[],allowLocalRewrite:false};
    }
  }
  if (STOP.test(n)) return {state:next,status:"stopped",text:t.stopped,suggestions:[],allowLocalRewrite:false};
  const topic = mentionedTopic(n);
  if (topic) next.topic = topic;
  if (/сменить\s+тему|другая\s+тема|change\s+topic|another\s+topic|cambiar\s+tema|otro\s+tema/u.test(n)) {
    next.topic = null; next.format = null;
  }
  const excluded = new Set(prior.excluded);
  const explicit = Object.entries(FORMAT_PATTERNS).filter(([,re])=>presence(n,re)).map(([id])=>id);
  for (const format of defaultFormats) {
    if (NO[format].test(n)) excluded.add(format);
    else if (RE_ALLOW[format].test(n)) excluded.delete(format);
  }
  next.excluded = limitList([...excluded],FORMATS);
  const requested = explicit.filter(id=>!excluded.has(id));
  if (requested.length) next.format = CHANGE.test(n) && requested.length>1
    ? requested.slice().sort((a,b)=>n.search(FORMAT_PATTERNS[b])-n.search(FORMAT_PATTERNS[a]))[0]
    : requested[0];
  else if (explicit.length && !requested.length && CHANGE.test(n)) next.format = null;
  if (next.format && excluded.has(next.format)) next.format = null;
  const mins = duration(n);
  if (mins) next.maxDurationMin = mins;
  if (/(?:коротко|кратко|без подробностей|brief|be concise|short answer|responde breve|corto)/u.test(n)) next.brevity="short";
  if (/(?:подробно|детально|in detail|detailed|detalladamente)/u.test(n)) next.brevity="detailed";
  if (/(?:на ты|общайся на ты|tut[eé]ame|call me by my first name)/u.test(n)) next.address="informal";
  if (/(?:на вы|обращайся на вы|usted|formalmente)/u.test(n)) next.address="formal";
  const evidence = {
    explicitTopic:topic??null,explicitFormat:requested[0]??null,
    excluded:[...excluded],maxDurationMin:mins??null,
  };
  if (!next.topic) return {state:next,status:"clarify",text:speak(lang,"topic",next,t.clarify),suggestions:[],
    evidence,allowLocalRewrite:true};
  if (!next.format) return {state:next,status:"clarify",text:speak(lang,"format",next,t.format),suggestions:[],
    evidence,allowLocalRewrite:true};
  if (!next.allowed.includes(next.format)) return {state:next,status:"not_permitted",
    text:speak(lang,"notPermitted",next,t.notPermitted),suggestions:[],evidence,allowLocalRewrite:false};
  const suggestions = verifiedMedia(catalog,next);
  const response = suggestions.length ? t.match :
    next.format==="audio" ? t.audioMissing :
      next.maxDurationMin ? t.time+" "+t.noMatch : t.noMatch;
  const reply=speak(lang,suggestions.length?"match":next.format==="audio"?"audio":"noMatch",next,response);
  const changedFocus=Boolean(prior.topic && topic && prior.topic!==next.topic);
  const acknowledgment=changedFocus && next.brevity!=="short"
    ? ({ru:"Понял, теперь сосредоточимся на другой теме. ",en:"Got it, we'll focus on the new topic. ",es:"Entendido, nos centraremos en el nuevo tema. "})[lang]
    : "";
  return {state:next,status:suggestions.length?"recommend":"no_match",
    text:acknowledgment+reply,
    suggestions,evidence,allowLocalRewrite:suggestions.length>0};
}
