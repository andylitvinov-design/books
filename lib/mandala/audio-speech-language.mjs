// Transcription-only output-language check; no translation or provider retries.
const knownLanguages=Object.freeze({
  ru:"ru",russian:"ru",en:"en",english:"en",es:"es",spanish:"es"
});
export function normalizeSpeechLanguage(value){
  return knownLanguages[String(value||"").trim().toLowerCase()]||null;
}
export function isSpeechTranscriptLanguageMismatch({requested,detected,text}={}){
  const language=requested==="auto"?normalizeSpeechLanguage(detected):normalizeSpeechLanguage(requested);
  if(!language||typeof text!=="string")return false;
  const cyrillic=(text.match(/[\u0400-\u052f]/gu)||[]).length;
  const latin=(text.match(/[a-z\u00c0-\u024f]/giu)||[]).length;
  // Weak evidence and naturally mixed language must not cause false failure.
  if(cyrillic+latin<20)return false;
  return language==="ru"?latin>=20&&latin>cyrillic*5
    :cyrillic>=20&&cyrillic>latin*5;
}
