// Gemini Developer API candidate for non-private benchmark audio only.
// No runtime route imports this module. Free-tier data may improve Google products.
export const GEMINI_TRANSCRIBE_MODEL='gemini-3.5-transcribe'
const URL='https://generativelanguage.googleapis.com/v1beta/interactions'
const languages={ru:'ru-RU',en:'en-US',es:'es-ES'}
const glossary={ru:['психотерапия','расстановки','Рейки','гомеопатия','контрперенос'],en:['psychotherapy','constellations','Reiki','homeopathy','countertransference'],es:['psicoterapia','constelaciones','Reiki','homeopatía','contratransferencia']}
export function geminiTranscribePayload(wav,locale,{hints=false,vocabulary=false}={}){
  if(!Buffer.isBuffer(wav)||wav.length<44||wav.length>480044||wav.toString('ascii',0,4)!=='RIFF'||wav.toString('ascii',8,12)!=='WAVE')throw Error('INVALID_WAV')
  if(!Object.hasOwn(languages,locale))throw Error('INVALID_LANGUAGE')
  return {model:GEMINI_TRANSCRIBE_MODEL,store:false,stream:false,
    input:[{type:'audio',mime_type:'audio/wav',data:wav.toString('base64')}],
    generation_config:{transcription_config:{
      mode:{type:'verbatim'},
      language_codes:hints?[languages[locale]]:[],
      ...(vocabulary?{custom_vocabulary:glossary[locale]}:{})
    }}}
}
export function geminiTranscriptText(body){
  if(body?.status!=='completed'||!Array.isArray(body.steps))return null
  const text=body.steps.filter(s=>s?.type==='model_output'&&Array.isArray(s.content))
    .flatMap(s=>s.content).filter(p=>p?.type==='text'&&typeof p.text==='string').map(p=>p.text).join(' ').trim()
  return text&&text.length<=12000?text:null
}
export async function transcribeGeminiBenchmark(wav,locale,{env=process.env,fetcher=fetch,hints=false,vocabulary=false}={}){
  if(env.HH_GEMINI_TRANSCRIBE_FREE_BENCHMARK_CONFIRMED!=='true'||env.HH_GEMINI_TRANSCRIBE_SYNTHETIC_DATA_ACK!=='true'||!env.HH_GEMINI_TRANSCRIBE_BENCHMARK_KEY)throw Error('BENCHMARK_NOT_AUTHORIZED')
  const payload=geminiTranscribePayload(wav,locale,{hints,vocabulary})
  const response=await fetcher(URL,{method:'POST',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000),
    headers:{'Content-Type':'application/json','x-goog-api-key':env.HH_GEMINI_TRANSCRIBE_BENCHMARK_KEY},body:JSON.stringify(payload)})
  if(!response.ok)throw Error(response.status===429?'STT_QUOTA':'STT_PROVIDER_ERROR')
  return geminiTranscriptText(await response.json())
}
