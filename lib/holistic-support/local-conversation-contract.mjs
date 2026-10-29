/**
 * Holistic Mind 3.0 -- local-only generative dialogue contract.
 *
 * No network calls, storage, private profile, scores or provider credentials.
 * Caller may pass bounded current-tab conversation ONLY after the visitor
 * actively enables browser inference. Replies are never used as tool calls,
 * memories, diagnoses, offer IDs, or verified claims.
 */
export const LOCAL_DIALOGUE_VERSION = "holistic-local-dialogue-v3";
const LANG = new Set(["en", "ru", "es"]);
const TOPIC = new Set(["energy", "money", "love", "meaning", "goals"]);
const FORMAT = new Set(["video", "audio", "test", "course", "service"]);
const STATUS = new Set(["recommend", "clarify", "no_match"]);
const ROLE = new Set(["visitor", "agent"]);
const LIMIT_TURNS = 12;
const clean = value => typeof value === "string"
  ? value.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").replace(/\s+/g, " ").trim() : "";
const bounded = (n,low,high) => Number.isFinite(n)?Math.round(Math.min(high,Math.max(low,n))):null;
const removeMarkup = text => text.replace(/<[^>]*>|&(?:#\d+|[a-z]+);/giu,"").trim();
const LOCAL_REPLY_BLOCK = /https?:\/\/|www\.|@[\w.-]+|\b(?:\d{2,}|usd|eur)\b|[$€£]|\b(?:diagnos(?:e|is|ed)?|prescrib(?:e|ing)|clinical treatment|cure(?:s|d)?|guarantee|appointments?\s+booked|booked\s+session)\b|диагноз|диагностир|вылеч|исцел(?:ю|ит|им|ение)|назнач(?:у|аю|ить)\s+(?:препарат|лекарств|лечени)|гарантир|записал(?:а)?\s+вас|резервир|устед\s+reservad|diagn[oó]stic|tratamiento\s+cl[ií]nic|cura(?:mos|r[eé]|ci[oó]n)|garantiz/iu;
const OUTPUT_COMMAND = /(?:ignore\s+(?:all\s+)?previous|system\s+prompt|developer\s+message|assistant\s+instructions|role\s*[:=]|you\s+are\s+now|забудь\s+инструкц|игнорируй\s+правил|инструкция\s+систем)/iu;
const SENSITIVE_OFFER = /\b(?:suicide|suicid|self.harm|psychosis|trauma\s+processing|emdr|hypnotherapy)\b|самоубий|суицид|самоповрежден|психоз|переработк[аи]\s+травм|гипнотерап|покончить\s+с\s+собой/iu;
const INVENTED_RESOURCE = /\b(?:here\s+is\s+(?:the|a)\s+(?:video|recording)|i\s+found\s+(?:the|a)\s+(?:video|session)|your\s+test\s+result(?:s)?|you\s+(?:scored|have)\s+\d+)\b|(?:вот|наш[её]л[а]?)\s+(?:вам\s+)?(?:[а-яё]+\s+){0,3}(?:запись|ролик|видео|тест|сесси)|(?:по\s+вашим\s+тестам|ваш\s+результат\s+теста)|encontr[eé]\s+(?:un\s+)?(?:video|audio)|resultados?\s+de\s+tu\s+test/iu;
const stopChars = value => removeMarkup(clean(value)).slice(0,650);

/**
 * History is owned by current-tab React state. We never include the assistant's
 * initial greeting in a falsely attributed clinical or historical record.
 * Reserve space for the newest user turn.
 */
export function prepareLocalConversation({
  history=[],currentMessage="",decision={},locale="en",
}={}) {
  const status=STATUS.has(decision?.status)?decision.status:null;
  const safeMessage=clean(currentMessage).slice(0,700);
  if(!status || !safeMessage || clean(currentMessage).length>4000) return null;
  const previous=Array.isArray(history)?history:[];
  const turns=previous.slice(-LIMIT_TURNS).flatMap(row => {
    if(!row || !ROLE.has(row.role)) return [];
    const text=clean(row.text).slice(0,600);
    if(!text)return [];
    return [{role:row.role==="agent"?"assistant":"user",content:text}];
  });
  turns.push({role:"user",content:safeMessage});
  const selectedLocale=LANG.has(decision?.state?.locale)?decision.state.locale:
    LANG.has(locale)?locale:"en";
  const formats=Array.isArray(decision?.state?.excluded)
    ? [...new Set(decision.state.excluded.filter(x=>FORMAT.has(x)))].slice(0,5) : [];
  const goal=TOPIC.has(decision?.state?.topic)?decision.state.topic:null;
  const format=FORMAT.has(decision?.state?.format)?decision.state.format:null;
  return {
    version:LOCAL_DIALOGUE_VERSION,
    locale:selectedLocale,
    request:{
      mode:status,
      topic:goal,
      preferredFormat:format,
      excludedFormats:formats,
      minutes:bounded(decision?.state?.maxDurationMin,1,180),
      brevity:decision?.state?.brevity==="short"?"short":
        decision?.state?.brevity==="detailed"?"detailed":"normal",
      address:decision?.state?.address==="informal"?"informal":
        decision?.state?.address==="formal"?"formal":"neutral",
      // This source-only status is a trusted decision. No titles/URLs are
      // supplied to the model, so it cannot invent a catalog citation.
      hasApprovedMatches:status==="recommend"&&Array.isArray(decision.suggestions)&&
        decision.suggestions.length>0,
    },
    turns:turns.slice(-LIMIT_TURNS),
  };
}

/**
 * All model text is untrusted. Rejections leave the deterministic answer
 * intact; no partial token is ever rendered before final validation.
 * It may support a conversation, but it NEVER establishes a clinical or
 * editorial fact, entitlement, price, duration, booking or stored preference.
 */
export function acceptLocalConversationReply(candidate,{request,locale}={}) {
  if(!request || !STATUS.has(request.mode) || !LANG.has(locale))return null;
  if(typeof candidate!=="string" || candidate.length>1200 || candidate.length<8 ||
      /<\/?[a-z][^>]*>|```|\[INST\]|\[\/INST\]/iu.test(candidate)) return null;
  const value=stopChars(candidate);
  if(value.length<8 || value.length>520 ||
    LOCAL_REPLY_BLOCK.test(value) || OUTPUT_COMMAND.test(value) ||
    SENSITIVE_OFFER.test(value) || INVENTED_RESOURCE.test(value) ||
    /\b(?:as\s+an?\s+human|i'm\s+your\s+therapist|i\s+am\s+a\s+psychologist)\b|я\s+(?:человек|ваш\s+психотерапевт)/iu.test(value))return null;
  if(request.mode==="no_match" && !/[?？]$/.test(value)) return null;
  // Resource matches are always rendered as verified cards by the caller.
  // A generative response must be reflective, not a claimed prescription.
  return value;
}
