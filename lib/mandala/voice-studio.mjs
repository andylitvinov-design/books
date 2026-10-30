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
});
export function voiceStudioReady(env) {
  return env?.HH_VOICE_STUDIO_ENABLED === "true" &&
    env?.HH_VOICE_STUDIO_FREE_TIER_CONFIRMED === "true" &&
    typeof env?.HH_VOICE_STUDIO_GEMINI_API_KEY === "string" &&
    env.HH_VOICE_STUDIO_GEMINI_API_KEY.length > 12;
}
export function findStudioVoice(id) {
  return VOICE_STUDIO_VOICES.find(voice=>voice.id===id) || null;
}
export function validateStudioRequest(body) {
  if(!body || typeof body!=="object" || Array.isArray(body))throw new Error("INVALID_BODY");
  if(Object.keys(body).some(key=>!["mode","voiceId","language","text","consent"].includes(key)))
    throw new Error("INVALID_FIELDS");
  const {mode,voiceId,language}=body;
  if(mode!=="sample"&&mode!=="custom")throw new Error("INVALID_MODE");
  const voice=findStudioVoice(voiceId);
  if(!voice)throw new Error("INVALID_VOICE");
  if(language!=="en"&&language!=="ru")throw new Error("INVALID_LANGUAGE");
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
    contents:[{role:"user",parts:[{
      text:validated.text,
      speech_metadata:{style:VOICE_STUDIO_DEFAULT_STYLE[validated.language]},
    }]}],
    generationConfig:{
      responseModalities:["AUDIO"],
      responseFormat:{audio:{mimeType:"AUDIO_WAV",sampleRate:24000}},
      speechConfig:{voiceConfig:{voice:validated.voice.provider}},
    },
  };
}
