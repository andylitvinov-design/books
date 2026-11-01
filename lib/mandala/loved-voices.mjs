/**
 * Loved Ones Voices — pure, fail-closed contract.
 * Uploaded voice samples and Google voice keys must NEVER enter logs or storage.
 * No replication is permitted without a real recorded consent clip.
 */
export const LOVED_VOICE_MODEL = "gemini-3.8-flash-lite-tts";
export const LOVED_VOICE_LANGUAGES = Object.freeze(["ru", "en", "es"]);
export const LOVED_VOICE_MAX_TEXT = 240;
export const LOVED_VOICE_MAX_UPLOAD_BYTES = 3_400_000;
export const LOVED_VOICE_SAMPLE_LIMIT = 15 * 1024 * 1024;
export const LOVED_VOICE_CONSENT_PHRASES = Object.freeze({
  ru: "Я являюсь владельцем этого голоса и даю согласие Google на использование этого голоса для создания модели синтетического голоса.",
  en: "I am the owner of this voice and I consent to Google using this voice to create a synthetic voice model.",
  es: "Soy el propietario de esta voz y doy mi consentimiento para que Google la utilice para crear un modelo de voz sintética.",
});
const error = (code) => Object.assign(new Error(code), {code});
export function lovedVoiceKey(env = {}) {
  if(env.HH_LOVED_VOICES_ENABLED !== "true" ||
     env.HH_LOVED_VOICES_FREE_TIER_CONFIRMED !== "true" ||
     env.HH_LOVED_VOICES_GOOGLE_DATA_PROCESSING_APPROVED !== "true")
    return null;
  if(typeof env.HH_LOVED_VOICES_GEMINI_API_KEY === "string" &&
     env.HH_LOVED_VOICES_GEMINI_API_KEY.length > 12)
    return env.HH_LOVED_VOICES_GEMINI_API_KEY;
  if(env.HH_LOVED_VOICES_USE_COUNCIL_KEY === "true" &&
     typeof env.HH_COUNCIL_GEMINI_API_KEY === "string" &&
     env.HH_COUNCIL_GEMINI_API_KEY.length > 12)
    return env.HH_COUNCIL_GEMINI_API_KEY;
  return null;
}
export function approveLovedVoiceText(value, language) {
  if(!LOVED_VOICE_LANGUAGES.includes(language) || typeof value !== "string")
    throw error("LOVED_VOICE_INVALID_TEXT");
  const text = value.replace(/\r\n?/g, "\n").trim();
  const lines = text.split("\n");
  if(!text || [...text].length > LOVED_VOICE_MAX_TEXT || lines.length > 3 ||
     /[<>\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(text) ||
     /https?:\/\/|www\.|(?:\+?\d[\d ()-]{8,}\d)/iu.test(text))
    throw error("LOVED_VOICE_INVALID_TEXT");
  return lines.map(line => line.replace(/\s+/g, " ").trim()).filter(Boolean).join(" ");
}
/** Inspect actual RIFF bytes; MIME/extension supplied by browser is not trusted. */
export function inspectLovedVoiceWav(input, kind) {
  const bytes = input instanceof Uint8Array ? input :
    input instanceof ArrayBuffer ? new Uint8Array(input) : null;
  if(!bytes || bytes.byteLength < 48 || bytes.byteLength > 2_000_000)
    throw error("LOVED_VOICE_INVALID_WAV");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if(view.getUint32(0,false)!==0x52494646 ||
     view.getUint32(8,false)!==0x57415645 ||
     view.getUint32(4,true)+8!==bytes.byteLength)
    throw error("LOVED_VOICE_INVALID_WAV");
  let fmt = null, samples = null;
  for(let pos=12;pos+8<=bytes.byteLength;) {
    const name=view.getUint32(pos,false), size=view.getUint32(pos+4,true);
    const begin=pos+8, end=begin+size;
    if(end>bytes.byteLength)throw error("LOVED_VOICE_INVALID_WAV");
    if(name===0x666d7420) {
      if(size<16)throw error("LOVED_VOICE_INVALID_WAV");
      fmt={pcm:view.getUint16(begin,true),channels:view.getUint16(begin+2,true),
        rate:view.getUint32(begin+4,true),byteRate:view.getUint32(begin+8,true),
        block:view.getUint16(begin+12,true),bits:view.getUint16(begin+14,true)};
    }
    if(name===0x64617461)samples={begin,size};
    pos=end+(size&1);
  }
  if(!fmt || !samples || fmt.pcm!==1 || fmt.channels!==1 ||
     fmt.rate!==24000 || fmt.bits!==16 || fmt.block!==2 ||
     fmt.byteRate!==48000 || samples.size%2!==0)
    throw error("LOVED_VOICE_INVALID_WAV");
  const duration=samples.size/48000;
  const min=kind==="source"?10:kind==="consent"?2:0.3;
  const max=kind==="source"?30:kind==="consent"?22:60;
  if(duration<min || duration>max)throw error("LOVED_VOICE_INVALID_DURATION");
  let sum=0,peak=0;
  for(let pos=samples.begin;pos<samples.begin+samples.size;pos+=2) {
    const a=Math.abs(view.getInt16(pos,true)/32768);
    sum+=a*a;
    if(a>peak)peak=a;
  }
  const rms=Math.sqrt(sum/(samples.size/2));
  if(rms<0.0006 || peak<0.004)throw error("LOVED_VOICE_SILENT_AUDIO");
  return {durationSeconds:duration,peak,rms};
}
