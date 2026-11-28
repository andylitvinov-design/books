// A Web Speech recognition instance has only one language.
import {isSuspectShortRussianSpeech} from '../coaching/coach-speech-evidence.mjs'
const LANGS=Object.freeze({en:'en-GB',ru:'ru-RU',es:'es-ES'})
const hint=value=>{
 const s=String(value||'').toLowerCase()
 if(s==='ru'||s.startsWith('ru-'))return 'ru'
 if(s==='en'||s.startsWith('en-'))return 'en'
 if(s==='es'||s.startsWith('es-'))return 'es'
 return null
}
export function detectedSpeechLocale(text,fallback='en'){
 const value=String(text||'')
 if(/[\u0400-\u052f]/u.test(value))return 'ru'
 if(/[¿¡ñáéíóúü]/iu.test(value))return 'es'
 if(/[a-z]/iu.test(value))return fallback==='es'?'es':'en'
 return hint(fallback)||'en'
}
// ASR text is not an acoustic language detector. A lone word, number,
 // acronym or mixed-script phrase is insufficient to change the next mic hint.
 // Keep the last reliable multiword utterance; never store rejected fragments.
export function coachSpeechLanguageMemory(previous='',transcript=''){
 const value=String(transcript||'').normalize('NFC').trim()
 const words=value.match(/[\p{L}\p{M}]+/gu)||[]
 const cyr=/\p{Script=Cyrillic}/u.test(value),lat=/\p{Script=Latin}/u.test(value)
 if(words.length<2||cyr&&lat||!cyr&&!lat)return String(previous||'')
 return value
}
export function coachSpeechNeedsLanguageReview(text,{selection='auto',recognizedLanguage='',fallback='en'}={}){
 const selected=hint(selection)
 const language=selected||hint(recognizedLanguage)||hint(fallback)||'en'
 const value=String(text||'').normalize('NFC').trim().replace(/[.!?…,;:]+$/gu,'').trim()
 return isSuspectShortRussianSpeech(value,language)
}
export function chooseDictationLanguage({locale='en',selection='auto',browserLanguages=[],lastTranscript=''}={}){
 const selected=hint(selection)
 if(selected)return LANGS[selected]
 const reliable=coachSpeechLanguageMemory('',lastTranscript)
 if(reliable)return LANGS[detectedSpeechLocale(reliable,locale)]
 // On the first turn the visible coaching page locale wins over an English
 // iPhone UI; otherwise RU speech can be sent to ASR as English.
 const browser=(Array.isArray(browserLanguages)?browserLanguages:[]).map(hint).find(Boolean)
 return LANGS[hint(locale)||browser||'en']
}
/** Browser auto is a single-language hint, NOT audio-level bilingual ASR.
 * Manual EN/RU always wins, even if the provider returned wrong-script text. */
export function coachSpokenTurnLocale({selection='auto',recognizedLanguage='',transcript='',fallback='en'}={}){
 const selected=hint(selection)
 if(selected)return selected
 const current=hint(recognizedLanguage)||hint(fallback)||'en'
 if(!coachSpeechLanguageMemory('',transcript))return current
 return detectedSpeechLocale(transcript,current)
}

export function readDictationResults(results,maxLength=1200){
 const finals=[],interims=[]
 for(const row of Array.from(results||[])){
  const phrase=String(row?.[0]?.transcript||'').trim()
  if(!phrase)continue
  ;(row?.isFinal?finals:interims).push(phrase)
 }
 const join=parts=>parts.join(' ').replace(/\s+/gu,' ').trim()
 const limit=Number.isInteger(maxLength)&&maxLength>0?maxLength:1200
 const final=join(finals).slice(0,limit)
 const interim=join(interims).slice(0,limit)
 return {final,interim,visible:join([final,interim].filter(Boolean)).slice(0,limit)}
}

// A two-character reply can be an entire coaching turn ("Да", "No", "Sí").
// Reject punctuation/one-letter background noise but never cut meaningful short
// speech with abort() on iOS 27: the next recognizer may become permanently deaf.
export function hasCoachSpokenAnswer(value){
 const normalized=String(value||'').normalize('NFC').trim()
  .replace(/^[¿¡]+/gu,'').replace(/[.!?¡¿…,;:]+$/gu,'').trim().toLowerCase()
 if(!/[\p{L}\p{N}]/u.test(normalized))return false
 if(Array.from(normalized).length>=3)return true
 return /^(?:да|не|no|ok|sí|si|\d{1,2})$/u.test(normalized)
}

/* iOS 27 Safari WebKit #321436: subsequent SpeechRecognition sessions can
   appear active but never deliver results, especially after media playback.
   A completed speechSynthesis utterance between naturally ended sessions is
   a documented workaround; never apply this to desktop or other browsers. */
export function ios27NeedsSpeechRecovery(navigatorLike={}){
 const ua=String(navigatorLike?.userAgent||'')
 const ios=/(?:iPhone|iPad|iPod)/i.test(ua)||
   (navigatorLike?.platform==='MacIntel'&&Number(navigatorLike?.maxTouchPoints)>1)
 // Installed Safari PWAs can omit Version/27 from the user agent.
 const webkitSafari=/AppleWebKit\//i.test(ua)&&!/(?:CriOS|FxiOS|EdgiOS|OPiOS)\//i.test(ua)
 const ios27=/(?:\bVersion\/27(?:\.\d+)*\b|\b(?:iPhone OS|CPU OS) 27[_\.]\d+)/i.test(ua)
 return ios&&webkitSafari&&ios27
}
