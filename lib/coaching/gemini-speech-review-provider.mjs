// Server-only candidate, deliberately no automatic paid fallback or storage.
// Google Unpaid Services terms prohibit sensitive, confidential or personal input.
// A private coaching recording can contain all three. Consent or an env flag
// cannot override provider terms. Keep the client-facing capability hard OFF;
// non-personal synthetic evaluation lives exclusively in the separate CLI.
export function geminiSpeechReviewEnabled(){
 return false
}
export function geminiSpeechReviewPayload(wav,locale){
 if(!Buffer.isBuffer(wav)||wav.length<3244||wav.length>384044||wav.length%2||wav.toString('ascii',0,4)!=='RIFF'||wav.toString('ascii',8,12)!=='WAVE'||wav.toString('ascii',12,16)!=='fmt '||wav.readUInt32LE(4)!==wav.length-8||wav.readUInt32LE(16)!==16||wav.readUInt16LE(20)!==1||wav.readUInt16LE(22)!==1||wav.readUInt32LE(24)!==16000||wav.readUInt16LE(34)!==16||wav.toString('ascii',36,40)!=='data'||wav.readUInt32LE(40)!==wav.length-44)throw Error('INVALID_AUDIO')
 const languages={ru:'ru-RU',en:'en-US',es:'es-ES'}
 if(!Object.hasOwn(languages,locale))throw Error('INVALID_LANGUAGE')
 return {model:'models/gemini-3.5-transcribe',store:false,stream:false,input:[{type:'audio',mime_type:'audio/wav',data:wav.toString('base64')}],generation_config:{transcription_config:{mode:{type:'verbatim'},language_codes:[languages[locale]]}}}
}
export function geminiSpeechReviewText(body){
 if(body?.status!=='completed'||!Array.isArray(body.steps))return ''
 const text=body.steps.filter(s=>s?.type==='model_output'&&Array.isArray(s.content)).flatMap(s=>s.content).filter(p=>p?.type==='text'&&typeof p.text==='string').map(p=>p.text).join(' ').replace(/\s+/gu,' ').trim()
 return text.length<=1200?text:''
}
