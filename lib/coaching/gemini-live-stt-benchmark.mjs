// Local synthetic-only benchmark. Do not import from any application route or client.
import {readFileSync,writeFileSync,openSync,closeSync,renameSync,unlinkSync,mkdirSync} from 'node:fs'
import {join} from 'node:path'
import {homedir} from 'node:os'
import {spawnSync} from 'node:child_process'
import {setTimeout as sleep} from 'node:timers/promises'

export const MODEL='models/gemini-3.5-transcribe-live'
export const LIMITS=Object.freeze({minute:2,day:20,tokens:8000,maxSeconds:15})
const endpoint='wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent'
const langs={ru:'ru-RU',en:'en-US',es:'es-ES'}
const voices={ru:'ru',en:'en-us',es:'es'}
const terms={ru:['Рейки','психотерапия','расстановки'],en:['Reiki','psychotherapy','constellations'],es:['Reiki','psicoterapia','constelaciones']}
export const LEDGER_DIR=join(homedir(),'.local','share','hh-coach-gemini-live-free')
const fail=code=>Error(code)
const validPcm=pcm=>Buffer.isBuffer(pcm)&&pcm.length>0&&pcm.length%2===0&&pcm.length<=32000*LIMITS.maxSeconds
export function freeLiveKey(env=process.env){
  // Dedicated non-billed project only. Never fall through to GOOGLE_API_KEY,
  // an existing coach key, a gateway, or an SDK's default credentials.
  if(env.HH_GEMINI_LIVE_STT_FREE_CONFIRMED!=='true'||env.HH_GEMINI_LIVE_STT_SYNTHETIC_ONLY!=='true'||env.HH_GEMINI_LIVE_STT_EXCLUSIVE_PROJECT!=='true')throw fail('FREE_TEST_NOT_AUTHORIZED')
  const key=env.HH_GEMINI_LIVE_STT_TEST_KEY
  if(typeof key!=='string'||!key.trim())throw fail('FREE_TEST_KEY_MISSING')
  return key
}
export function setupFrame(locale,{hints=false,vocabulary=false}={}){
  if(!Object.hasOwn(langs,locale))throw fail('INVALID_LANGUAGE')
  return {setup:{model:MODEL,generationConfig:{responseModalities:['TEXT']},
    inputAudioTranscription:{mode:'VERBATIM',languageCodes:hints?[langs[locale]]:[],...(vocabulary?{customVocabulary:terms[locale]}:{})},
    realtimeInputConfig:{automaticActivityDetection:{disabled:true}}}}
}
// Explicit one-time initialization. Never recreate/reset an absent or corrupt
// ledger during a run. Only one designated host and dedicated free project.
export function initLedger(dir=LEDGER_DIR){
  mkdirSync(dir,{recursive:true,mode:0o700})
  writeFileSync(join(dir,'quota.json'),'[]',{flag:'wx',mode:0o600})
}
export function reserveStart(pcm,{dir=LEDGER_DIR,now=Date.now()}={}){
  if(!validPcm(pcm)||!Number.isSafeInteger(now)||now<=0)throw fail('INVALID_PCM_OR_CLOCK')
  const lock=join(dir,'quota.lock'),file=join(dir,'quota.json'),next=join(dir,'quota.next')
  let fd
  try{fd=openSync(lock,'wx',0o600)}catch{throw fail('QUOTA_LOCK_UNAVAILABLE')}
  try{
    let rows
    try{rows=JSON.parse(readFileSync(file,'utf8'))}catch{throw fail('QUOTA_LEDGER_UNAVAILABLE')}
    if(!Array.isArray(rows)||rows.length>LIMITS.day||rows.some((r,i)=>!r||!Number.isSafeInteger(r.at)||r.at<=0||r.at>now||!Number.isSafeInteger(r.tokens)||r.tokens<=0||r.tokens>LIMITS.tokens||(i>0&&r.at<rows[i-1].at)))throw fail('QUOTA_LEDGER_INVALID')
    const day=rows.filter(r=>r.at>now-86400000)
    const minute=day.filter(r=>r.at>now-60000)
    // Include a 30s setup/stream margin in the token reservation window.
    const tokens=Math.ceil(pcm.length/32000*25)+100
    const recentTokens=day.filter(r=>r.at>now-90000).reduce((n,r)=>n+r.tokens,0)
    if(day.length>=LIMITS.day||minute.length>=LIMITS.minute||recentTokens+tokens>LIMITS.tokens)throw fail('FREE_QUOTA_EXHAUSTED')
    day.push({at:now,tokens})
    writeFileSync(next,JSON.stringify(day),{flag:'wx',mode:0o600})
    renameSync(next,file)
    return {remainingDay:LIMITS.day-day.length,remainingMinute:LIMITS.minute-minute.length-1}
  }finally{closeSync(fd);unlinkSync(lock)}
}
const childEnv=()=>({PATH:process.env.PATH||'/usr/bin:/bin',HOME:homedir(),LANG:'C.UTF-8',HF_HUB_OFFLINE:'1',TRANSFORMERS_OFFLINE:'1'})
// No microphone, uploads, arbitrary text arguments or recording paths.
// CLI selects a committed synthetic reference and synthesizes it locally.
export function synthesizeFixture(fixture){
  if(!fixture||!Object.hasOwn(voices,fixture.locale)||typeof fixture.reference!=='string'||!fixture.reference.trim()||fixture.reference.length>400)throw fail('INVALID_FIXTURE')
  const speech=spawnSync('espeak',['-v',voices[fixture.locale],'-s','155','--stdout','--stdin'],{input:fixture.reference,timeout:10000,maxBuffer:2e6,env:childEnv()})
  if(speech.status!==0||!speech.stdout?.length)throw fail('LOCAL_TTS_UNAVAILABLE')
  const raw=spawnSync('ffmpeg',['-v','error','-i','pipe:0','-f','s16le','-ac','1','-ar','16000','pipe:1'],{input:speech.stdout,timeout:10000,maxBuffer:2e6,env:childEnv()})
  if(raw.status!==0||!validPcm(raw.stdout))throw fail('INVALID_SYNTHETIC_PCM')
  return raw.stdout
}
// One bounded, manually segmented synthetic utterance per connection.
// No retry/reconnect here: every new start must reserve a new quota slot.
// Never log URLs, provider errors, credentials, frames or audio.
export async function streamSyntheticPcm(pcm,locale,{env=process.env,dir=LEDGER_DIR,hints=false,vocabulary=false,connect=url=>new WebSocket(url),pace=sleep,timeoutMs=30000}={}){
  const key=freeLiveKey(env),setup=setupFrame(locale,{hints,vocabulary})
  if(!validPcm(pcm))throw fail('INVALID_PCM')
  reserveStart(pcm,{dir})
  return new Promise((resolve,reject)=>{
    let ws,done=false,phase='opening',endAt=0,firstInterim=null,started=performance.now(),chain=Promise.resolve()
    const stop=(err,result)=>{
      if(done)return
      done=true;clearTimeout(timer)
      try{ws?.close()}catch{}
      if(err)reject(fail(err));else resolve(result)
    }
    const timer=setTimeout(()=>stop('STT_TIMEOUT'),timeoutMs)
    const send=body=>{
      if(done)return
      if(ws.readyState!==1||ws.bufferedAmount>65536)throw fail('STT_SOCKET_UNAVAILABLE')
      ws.send(JSON.stringify(body))
    }
    const audio=async()=>{
      send({realtimeInput:{activityStart:{}}})
      for(let i=0;i<pcm.length&&!done;i+=3200){
        const chunk=pcm.subarray(i,i+3200)
        send({realtimeInput:{audio:{mimeType:'audio/pcm;rate=16000',data:chunk.toString('base64')}}})
        await pace(chunk.length/32)
      }
      if(done)return
      phase='final';endAt=performance.now()
      send({realtimeInput:{activityEnd:{}}})
    }
    try{
      ws=connect(endpoint+'?key='+encodeURIComponent(key))
      ws.addEventListener('open',()=>{try{if(done){ws.close();return}phase='setup';send(setup)}catch{stop('STT_SOCKET_UNAVAILABLE')}})
      ws.addEventListener('message',event=>{
        chain=chain.then(async()=>{
          if(done)return
          let data=event.data
          if(typeof data!=='string')data=data instanceof ArrayBuffer?Buffer.from(data).toString('utf8'):await data.text()
          if(data.length>131072)throw fail('STT_PROTOCOL_ERROR')
          const msg=JSON.parse(data)
          if(msg.error||msg.goAway){stop('STT_PROVIDER_UNAVAILABLE');return}
          if(Object.hasOwn(msg,'setupComplete')&&phase==='setup'){
            phase='audio';void audio().catch(()=>stop('STT_SOCKET_UNAVAILABLE'));return
          }
          const content=msg.serverContent
          if(!content)return
          if(content.interimInputTranscription?.text&&firstInterim===null)firstInterim=Math.round(performance.now()-started)
          if(Object.hasOwn(content,'inputTranscription')){
            // Manual VAD should emit one final after activityEnd. Reject an
            // unexpected early segment rather than silently discarding speech.
            if(phase!=='final'){stop('STT_UNEXPECTED_FINAL');return}
            const text=content.inputTranscription?.text
            if(typeof text!=='string'||!text.trim()||text.length>12000){stop('STT_EMPTY_OR_INVALID');return}
            stop(null,{text:text.trim(),latencyMs:Math.round(performance.now()-started),endpointLatencyMs:Math.round(performance.now()-endAt),firstInterimMs:firstInterim})
          }
        }).catch(()=>stop('STT_PROTOCOL_ERROR'))
      })
      ws.addEventListener('error',()=>stop('STT_PROVIDER_UNAVAILABLE'))
      ws.addEventListener('close',()=>stop('STT_PROVIDER_CLOSED'))
    }catch{stop('STT_SOCKET_UNAVAILABLE')}
  })
}
// Local fallback only. Paths must point at preinstalled CTranslate2 models.
// No Groq/gateway/cloud fallback and no automatic weight downloads.
export function offlineWhisper(pcm,locale,env=process.env){
  if(!validPcm(pcm)||!Object.hasOwn(langs,locale))throw fail('INVALID_PCM_OR_LANGUAGE')
  const python="import sys,json,numpy as np\nfrom faster_whisper import WhisperModel\nx=np.frombuffer(sys.stdin.buffer.read(),dtype='<i2').astype('float32')/32768.0\nm=WhisperModel(sys.argv[1],device='cpu',compute_type='int8',local_files_only=True)\ns,_=m.transcribe(x,language=sys.argv[2],beam_size=5,vad_filter=False)\nprint(json.dumps({'text':' '.join(t.text.strip() for t in s)},ensure_ascii=False))"
  for(const [provider,path] of [['whisper-large-v3-local',env.HH_STT_LOCAL_LARGE_V3_DIR],['whisper-large-v3-turbo-local',env.HH_STT_LOCAL_TURBO_DIR]]){
    if(!path||!path.startsWith('/'))continue
    const started=performance.now()
    const result=spawnSync('python3',['-c',python,path,locale],{input:pcm,timeout:120000,maxBuffer:131072,env:childEnv()})
    if(result.status!==0)continue
    try{const text=JSON.parse(result.stdout.toString('utf8')).text;if(typeof text==='string'&&text.trim()&&text.length<=12000)return {provider,text:text.trim(),latencyMs:Math.round(performance.now()-started)}}catch{}
  }
  return null
}
