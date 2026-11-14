// A Web Speech recognition instance has only one language.
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
export function chooseDictationLanguage({locale='en',selection='auto',browserLanguages=[],lastTranscript=''}={}){
 const selected=hint(selection)
 if(selected)return LANGS[selected]
 if(String(lastTranscript).trim())return LANGS[detectedSpeechLocale(lastTranscript,locale)]
 const browser=(Array.isArray(browserLanguages)?browserLanguages:[]).map(hint).find(Boolean)
 return LANGS[browser||hint(locale)||'en']
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

/* iOS 27 Safari WebKit #321436: subsequent SpeechRecognition sessions can
   appear active but never deliver results, especially after media playback.
   A completed speechSynthesis utterance between naturally ended sessions is
   a documented workaround; never apply this to desktop or other browsers. */
export function ios27NeedsSpeechRecovery(navigatorLike={}){
 const ua=String(navigatorLike?.userAgent||'')
 const ios=/(?:iPhone|iPad|iPod)/i.test(ua)||
   (navigatorLike?.platform==='MacIntel'&&Number(navigatorLike?.maxTouchPoints)>1)
 return ios&&/\bVersion\/27(?:\.\d+)*\b/i.test(ua)&&/Safari\//i.test(ua)
}
