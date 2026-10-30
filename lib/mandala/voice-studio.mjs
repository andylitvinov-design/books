/**
 * Holistic House Voice Studio · a free-tier-only voice experiment.
 * Pure shared contract. Do not place API credentials or personal data here.
 */
export const VOICE_STUDIO_MODEL = "gemini-3.8-flash-lite-tts";
export const VOICE_STUDIO_MAX_CHARS = 650;
export const VOICE_STUDIO_VOICES = Object.freeze([
  { id:"mark", provider:"Enceladus", gender:"male", pitch:"low",
    name:{ru:"Марк",en:"Mark",es:"Mark"},
    description:{ru:"Низкий, глубокий, воздушный",en:"Low, deep, airy",es:"Grave, profundo y sereno"} },
  { id:"alexander", provider:"Charon", gender:"male", pitch:"medium",
    name:{ru:"Александр",en:"Alexander",es:"Alexander"},
    description:{ru:"Средний, зрелый, спокойный",en:"Medium, mature, calm",es:"Medio, maduro y tranquilo"} },
  { id:"leon", provider:"Puck", gender:"male", pitch:"high",
    name:{ru:"Леон",en:"Leon",es:"Leon"},
    description:{ru:"Высокий, светлый, дружелюбный",en:"High, bright, friendly",es:"Agudo, luminoso y cordial"} },
  { id:"sofia", provider:"Gacrux", gender:"female", pitch:"low",
    name:{ru:"София",en:"Sofia",es:"Sofía"},
    description:{ru:"Низкий, мягкий, зрелый",en:"Low, soft, mature",es:"Grave, suave y madura"} },
  { id:"maya", provider:"Sulafat", gender:"female", pitch:"medium",
    name:{ru:"Майя",en:"Maya",es:"Maya"},
    description:{ru:"Средний, тёплый, обволакивающий",en:"Medium, warm, enveloping",es:"Medio, cálido y envolvente"} },
  { id:"alisa", provider:"Zephyr", gender:"female", pitch:"high",
    name:{ru:"Алиса",en:"Alice",es:"Alicia"},
    description:{ru:"Высокий, ясный, лёгкий",en:"High, clear, light",es:"Agudo, claro y ligero"} },
]);
export const VOICE_STUDIO_SAMPLE = Object.freeze({
  ru:"Почувствуйте, как вас поддерживает поверхность под телом. Можно ничего не менять. Побудьте здесь ещё немного. Впереди — спокойное пространство и мягкий свет.",
  en:"Notice how the surface beneath you offers support. There is nothing you need to change right now. Allow a quiet moment, and imagine gentle daylight ahead.",
});
export const VOICE_STUDIO_DEFAULT_STYLE = Object.freeze({
  ru:"Спокойная взрослая медитативная озвучка; тёплый естественный голос, медленное мягкое чтение, тактичные короткие паузы между предложениями; без театральной игры и шёпота. Читай только точный текст на русском.",
  en:"Calm, mature guided meditation; warm natural speaking voice, unhurried gentle pacing, subtle pauses between sentences; no dramatic acting or whispering. Read only the exact English transcript.",
  es:"Voz suave y natural para afirmaciones; ritmo pausado, pausas breves; leer solamente las frases exactas en español, sin comentarios.",
});
/**
 * Explicit reuse of an already-connected server-only Google credential.
 * Never access this variable from browser code or include it in API responses.
 * Reuse is opt-in: do not unintentionally share a billable project key.
 */
export function voiceStudioKey(env) {
  if(env?.HH_VOICE_STUDIO_ENABLED !== "true" ||
    env?.HH_VOICE_STUDIO_FREE_TIER_CONFIRMED !== "true")return null;
  const dedicated=env.HH_VOICE_STUDIO_GEMINI_API_KEY;
  if(typeof dedicated==="string"&&dedicated.length>12)return dedicated;
  const approvedReuse=env.HH_VOICE_STUDIO_USE_EXISTING_COUNCIL_KEY==="true";
  const existing=env.HH_COUNCIL_GEMINI_API_KEY;
  return approvedReuse&&typeof existing==="string"&&existing.length>12?existing:null;
}
export function voiceStudioReady(env) {
  return Boolean(voiceStudioKey(env));
}
export function findStudioVoice(id) {
  return VOICE_STUDIO_VOICES.find(voice=>voice.id===id) || null;
}
export function validateStudioRequest(body) {
  if(!body || typeof body!=="object" || Array.isArray(body))throw new Error("INVALID_BODY");
  if(Object.keys(body).some(key=>!["mode","voiceId","language","text","consent"].includes(key)))
    throw new Error("INVALID_FIELDS");
  const {mode,voiceId,language}=body;
  if(mode!=="sample"&&mode!=="custom"&&mode!=="affirmations")throw new Error("INVALID_MODE");
  const voice=findStudioVoice(voiceId);
  if(!voice)throw new Error("INVALID_VOICE");
  if(language!=="en"&&language!=="ru"&&!(mode==="affirmations"&&language==="es"))throw new Error("INVALID_LANGUAGE");
  if(mode==="sample") {
    if("text" in body||"consent" in body)throw new Error("SAMPLE_MUST_BE_FIXED");
    return {mode,voice,language,text:VOICE_STUDIO_SAMPLE[language],consent:false};
  }
  if(body.consent!==true)throw new Error("CONSENT_REQUIRED");
  if(typeof body.text!=="string"||!body.text.trim())throw new Error("INVALID_TEXT");
  const text=body.text.trim();
  if(Array.from(text).length>VOICE_STUDIO_MAX_CHARS || /[<>]/u.test(text))
    throw new Error("TEXT_TOO_LONG_OR_MARKUP");
  return {mode,voice,language,text,consent:true};
}
export function buildStudioPayload(validated) {
  return {
    model:VOICE_STUDIO_MODEL,
    input:[{type:"user_input",content:[{
      type:"text",text:validated.text,
      annotations:[{type:"speech_metadata",style:VOICE_STUDIO_DEFAULT_STYLE[validated.language]}],
    }]}],
    response_format:{type:"audio"},
    generation_config:{speech_config:[{voice:validated.voice.provider}]},
  };
}

/** The REST response carries generated audio in model_output steps, not SDK convenience fields. */
export function extractStudioAudio(response) {
  if(!Array.isArray(response?.steps))return null;
  let audio=null;
  for(const step of response.steps) {
    if(step?.type!=="model_output" || !Array.isArray(step.content))continue;
    for(const part of step.content)
      if(part?.type==="audio")audio=typeof part.data==="string"?part.data:null;
  }
  return audio;
}

/** Extract spoken text from the existing locally authored meditation script.
 * Titles, clinical notes and timing markers are deliberately excluded. */
export function studioExcerpt(script) {
  if(typeof script!=="string")return "";
  const lines=script.slice(0,16000).split(/\n\s*\n/u)
    .map(x=>x.trim()).filter(Boolean)
    .filter(x=>!/^(PERSONAL MEDITATION|ПЕРСОНАЛЬНАЯ МЕДИТАЦИЯ|MEDITACIÓN PERSONAL|Context\s*·|Контекст\s*·|Contexto\s*·|Personal reflective script,|Текст для личной рефлексии,|Guion de reflexión personal,)/u.test(x))
    .filter(x=>!/^\[(Optional quiet pause|Пауза по желанию|Pausa opcional)/u.test(x));
  let result="";
  for(const raw of lines) {
    const clean=raw.replace(/\[(?:Optional quiet pause|Пауза по желанию|Pausa opcional)[^\]]*\]/gu,"").trim();
    if(!clean)continue;
    const room=VOICE_STUDIO_MAX_CHARS-Array.from(result).length-(result?2:0);
    if(room<24)break;
    const cut=Array.from(clean).slice(0,room).join("");
    result+=(result?"\n\n":"")+cut;
    if(cut.length<clean.length)break;
  }
  return result.trim();
}
