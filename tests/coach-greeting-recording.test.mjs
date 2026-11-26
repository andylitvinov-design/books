import './my-coach-greeting-mp3-store.test.mjs'
import test from 'node:test'
import {coachIntroAudioPath,coachSessionOpeningAudioPath} from '../lib/personal-coaching/direct-coach-intro-audio.mjs'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import ffmpeg from 'ffmpeg-static'
import {encodeCoachGreetingMp3} from '../lib/coaching/coach-greeting-mp3.mjs'
import {geminiCoachTtsConfig,normalizeGeminiCoachTtsInput,validCoachWav} from '../lib/coaching/gemini-coach-tts.mjs'
import {approvedGeminiVoice} from '../lib/coaching/gemini-voice-catalog.mjs'
import {COACH_OPENING_PUBLIC_IDS,coachOpeningIntro,coachSessionOpeningLine} from '../lib/coaching/coach-opening-protocol.mjs'
import {getCoachPresentation} from '../lib/coaching/persona-presentations.mjs'
import {coachSpokenText} from '../lib/coaching/coach-spoken-text.mjs'
import {isMp3Bytes,readSavedCoachGreeting,saveCoachGreetingOnce} from '../lib/coaching/coach-greeting-mp3-store.mjs'

const source=readFileSync(new URL('../app/api/coaching/intro/[locale]/[coach]/route.js',import.meta.url),'utf8')
const config={supabaseUrl:'https://test.supabase.co',secretKey:'sb_secret_test'}
const free={HH_GEMINI_FREE_API_KEY:'AIza'+'A'.repeat(35),
  HH_MY_COACH_GEMINI_TTS_FREE_ENABLED:'true',HH_MY_COACH_GEMINI_FREE_TIER_CONFIRMED:'true',
  HH_MY_COACH_GEMINI_FREE_DATA_APPROVED:'true'}
function wavFixture(){
  const samples=24000,bytes=Buffer.alloc(44+samples*2)
  bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVE',8)
  bytes.write('fmt ',12);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20)
  bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(24000,24);bytes.writeUInt32LE(48000,28)
  bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34)
  bytes.write('data',36);bytes.writeUInt32LE(samples*2,40)
  for(let i=0;i<samples;i++)bytes.writeInt16LE(Math.round(6000*Math.sin(i*2*Math.PI*440/24000)),44+i*2)
  return bytes
}
let fixture
async function encodedFixture(){return fixture??=await encodeCoachGreetingMp3(wavFixture())}

function harness({env=free,lookupError=false,writeError=false,synthError=false}={}){
  const objects=new Map(),rates=[],syntheses=[],encodings=[]
  let writes=0,fishCalls=0
  class AppError extends Error{constructor(code,status){super(code);this.code=code;this.status=status}}
  const fetcher=async(url,init={})=>{
    if(url.startsWith('https://api.fish.audio/')){fishCalls++;throw Error('NO_FISH_FALLBACK')}
    assert.ok(url.startsWith(config.supabaseUrl+'/storage/v1/object/'))
    const key=url.split('hh-coach-greetings/')[1]
    if(init.method==='POST'){
      writes++
      assert.equal(init.headers['x-upsert'],'false')
      if(writeError)return Response.json({error:'backend unavailable'},{status:503})
      if(objects.has(key))return Response.json({statusCode:'409',error:'Duplicate'},{status:400})
      objects.set(key,Buffer.from(init.body))
      return Response.json({Key:key})
    }
    if(lookupError)return Response.json({error:'denied'},{status:403})
    const audio=objects.get(key)
    if(!audio)return Response.json({statusCode:'404',error:'not_found',code:'NoSuchKey'},{status:400})
    const range=init.headers.Range
    if(range==='bytes=0-1')return new Response(audio.subarray(0,2),{status:206,headers:{
      'Content-Type':'audio/mpeg','Content-Length':'2','Content-Range':`bytes 0-1/${audio.length}`}})
    if(range)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${audio.length}`}})
    return new Response(audio,{headers:{'Content-Type':'audio/mpeg','Content-Length':String(audio.length)}})
  }
  const deps={NextResponse:Response,URL,Buffer,AbortSignal,process:{env},
    getAppConfig:()=>config,consumeRate:async(_c,bucket,limit,seconds)=>rates.push({bucket,limit,seconds}),
    safeError:error=>({code:error.code||'INTERNAL_ERROR',status:error.status||500}),AppError,
    getCoachPresentation,coachOpeningIntro,coachSessionOpeningLine,coachSpokenText,
    readSavedCoachGreeting:(c,id,locale,_fetch,range,version)=>readSavedCoachGreeting(c,id,locale,fetcher,range,version),
    saveCoachGreetingOnce:(c,id,locale,audio,_fetch,version)=>saveCoachGreetingOnce(c,id,locale,audio,fetcher,version),isMp3Bytes,
    approvedGeminiVoice,geminiCoachTtsConfig,normalizeGeminiCoachTtsInput,
    synthesizeGeminiCoachTts:async({config:vendor,input})=>{
      syntheses.push(input);assert.equal(vendor.provider,'gemini_tts_free')
      if(synthError)throw Error('VENDOR_UNAVAILABLE')
      return wavFixture()
    },
    encodeCoachGreetingMp3:async wav=>{encodings.push(wav);return encodedFixture()},
    googleChirpConfig:()=>null,myCoachFishVoice:()=>null,myCoachFishConfig:()=>null,
    fetch:fetcher,
  }
  const runnable=source.replace(/^import [\s\S]*? from ['"][^'"]+['"]\n/gm,'').replace(/^export /gm,'')
  const GET=new Function(...Object.keys(deps),runnable+'\nreturn GET')(...Object.values(deps))
  const request=(id='genie',locale='ru',headers={})=>new Request(
    `https://holistichouse.vercel.app/api/coaching/intro/${locale}/${id}?v=2`,{headers})
  return {GET,request,objects,rates,syntheses,encodings,get writes(){return writes},get fishCalls(){return fishCalls}}
}

test('real PCM WAV becomes a decodable MP3 with non-silent samples and full duration',async()=>{
  assert.equal(validCoachWav(wavFixture()),true)
  const mp3=await encodedFixture()
  assert.equal(isMp3Bytes(mp3),true)
  assert.notEqual(mp3.toString('ascii',0,4),'RIFF','renaming WAV is not MP3 encoding')
  const decoded=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-f','mp3','-i','pipe:0',
    '-f','s16le','-ac','1','-ar','24000','pipe:1'],{input:mp3,timeout:8000,maxBuffer:200000})
  assert.equal(decoded.status,0,decoded.stderr?.toString())
  assert.ok(decoded.stdout.length>=48000&&decoded.stdout.length<=52000)
  let peak=0
  for(let i=0;i<decoded.stdout.length;i+=2)peak=Math.max(peak,Math.abs(decoded.stdout.readInt16LE(i)))
  assert.ok(peak>4000,'encoded track retains actual sound')
  await assert.rejects(encodeCoachGreetingMp3(Buffer.from('not a WAV')),/INVALID_WAV/)
  await assert.rejects(encodeCoachGreetingMp3(wavFixture().subarray(0,200)),/INVALID_WAV/)
})

test('all eight public coaches record their selected RU/EN voice and replay identical saved bytes',async()=>{
  const h=harness()
  for(const locale of ['ru','en'])for(const id of COACH_OPENING_PUBLIC_IDS){
    const canonical=new Request('https://holistichouse.vercel.app'+coachIntroAudioPath(id,locale))
    const first=await h.GET(canonical)
    assert.equal(first.status,200,id+'/'+locale)
    assert.equal(first.headers.get('content-type'),'audio/mpeg')
    assert.equal(first.headers.get('accept-ranges'),'bytes')
    const bytes=Buffer.from(await first.arrayBuffer())
    const before=h.syntheses.length,rateCount=h.rates.length,writeCount=h.writes
    const repeat=await h.GET(canonical)
    assert.equal(repeat.status,200)
    assert.deepEqual(Buffer.from(await repeat.arrayBuffer()),bytes)
    assert.equal(h.syntheses.length,before,'replay makes no TTS call')
    assert.equal(h.rates.length,rateCount,'replay consumes no TTS budget')
    assert.equal(h.writes,writeCount,'replay never rewrites the saved track')
    const input=h.syntheses.at(-1)
    assert.equal(input.voiceName,approvedGeminiVoice(id,locale))
    assert.equal(input.text,getCoachPresentation(id,locale).text,'audio matches the visible greeting')
  }
  assert.equal(h.objects.size,16)
  assert.equal(h.syntheses.length,16)
  assert.equal(h.encodings.length,16)
  assert.equal(h.fishCalls,0)
  assert.ok(h.rates.filter(x=>x.bucket.op==='my-coach-gemini_tts_free-global-day')
    .every(x=>x.limit===24&&x.seconds===86400),'private and public TTS share the unchanged daily cap')
})

test('saved byte ranges and unsatisfiable ranges never trigger new speech',async()=>{
  const h=harness();h.objects.set('v2/ru/genie.mp3',await encodedFixture())
  const partial=await h.GET(h.request('genie','ru',{Range:'bytes=0-1'}))
  assert.equal(partial.status,206)
  assert.match(partial.headers.get('content-range'),/^bytes 0-1\/\d+$/)
  assert.equal((await partial.arrayBuffer()).byteLength,2)
  const invalid=await h.GET(h.request('genie','ru',{Range:'bytes=9999999-'}))
  assert.equal(invalid.status,416)
  assert.match(invalid.headers.get('content-range'),/^bytes \*\/\d+$/)
  assert.equal((await invalid.arrayBuffer()).byteLength,0)
  assert.equal(h.syntheses.length,0)
})

test('storage and provider failures return controlled errors without a paid or Fish retry',async()=>{
  for(const options of [{lookupError:true},{writeError:true},{synthError:true}]){
    const h=harness(options),response=await h.GET(h.request())
    assert.equal(response.status,503)
    assert.equal(response.headers.get('cache-control'),'private, no-store')
    assert.match((await response.json()).error,/MY_COACH_INTRO_(STORAGE|TTS)_UNAVAILABLE/)
    assert.equal(h.objects.size,0)
    assert.equal(h.syntheses.length,options.lookupError?0:1)
    assert.equal(h.fishCalls,0)
  }
})

test('public URL rejects injected text/cross-site requests and does not invent unselected voices',async()=>{
  const h=harness()
  for(const suffix of ['&text=private','&voiceName=Kore']){
    assert.equal((await h.GET(new Request(h.request().url+suffix))).status,400)
  }
  assert.equal((await h.GET(h.request('genie','ru',{'sec-fetch-site':'cross-site'}))).status,403)
  assert.equal((await h.GET(h.request('genie','es'))).status,503)
  assert.equal((await h.GET(h.request('lea','ru'))).status,503)
  assert.equal(h.syntheses.length,0)
  const disabled=harness({env:{}})
  assert.equal((await disabled.GET(disabled.request())).status,503)
  assert.equal(disabled.syntheses.length,0)
  disabled.objects.set('v2/ru/genie.mp3',await encodedFixture())
  assert.equal((await disabled.GET(disabled.request())).status,200,'saved audio survives provider deactivation')
})


test('Samir historical v3 recordings remain isolated, Puck RU and Orus EN',async()=>{
  const h=harness()
  const original=await encodedFixture()
  h.objects.set('v2/ru/genie.mp3',original)
  h.objects.set('v2/en/genie.mp3',original)
  for(const [locale,voiceName] of [['ru','Puck'],['en','Orus']]){
    const path=`/api/coaching/intro/${locale}/genie?v=3`
    assert.equal(coachIntroAudioPath('genie',locale),locale==='ru'?path:'/api/coaching/intro/en/genie?v=4')
    const url='https://holistichouse.vercel.app'+path
    const first=await h.GET(new Request(url))
    assert.equal(first.status,200)
    assert.equal(h.syntheses.at(-1).voiceName,voiceName)
    assert.ok(h.objects.has('v3/'+locale+'/genie.mp3'))
    const repeat=await h.GET(new Request(url))
    assert.deepEqual(Buffer.from(await repeat.arrayBuffer()),Buffer.from(await first.arrayBuffer()))
    assert.deepEqual(h.objects.get('v2/'+locale+'/genie.mp3'),original)
    assert.equal((await h.GET(h.request('genie',locale))).status,200)
  }
  assert.equal(h.syntheses.length,2)
  assert.equal(h.writes,2)
  assert.equal(h.fishCalls,0)
  assert.equal(coachIntroAudioPath('mira','ru'),'/api/coaching/intro/ru/mira?v=2')
  assert.equal(coachIntroAudioPath('genie','es'),'/api/coaching/intro/es/genie?v=2')
  for(const invalid of ['ru/mira','es/genie']){
    assert.equal((await h.GET(new Request('https://holistichouse.vercel.app/api/coaching/intro/'+invalid+'?v=3'))).status,400)
  }
  const disabled=harness({env:{}})
  assert.equal((await disabled.GET(new Request('https://holistichouse.vercel.app/api/coaching/intro/ru/genie?v=3'))).status,503)
  assert.equal(disabled.fishCalls,0)
})

test('v4 records all seven exact English coach voices, leaves historical bytes intact, and never substitutes a vendor',async()=>{
  const h=harness(),original=await encodedFixture()
  const expected={mira:'Sulafat',sofia:'Gacrux',alex:'Orus',max:'Charon',genie:'Achird',harry:'Orus',merlin:'Algenib'}
  for(const [id,voiceName] of Object.entries(expected)){
    h.objects.set('v2/en/'+id+'.mp3',original)
    const path=coachIntroAudioPath(id,'en')
    assert.equal(path,'/api/coaching/intro/en/'+id+'?v=4')
    const request=new Request('https://holistichouse.vercel.app'+path)
    const first=await h.GET(request)
    assert.equal(first.status,200,id)
    assert.equal(h.syntheses.at(-1).voiceName,voiceName,id)
    assert.equal(h.syntheses.at(-1).text,getCoachPresentation(id,'en').text)
    assert.ok(h.objects.has('v4/en/'+id+'.mp3'))
    const before=h.syntheses.length
    assert.deepEqual(Buffer.from(await (await h.GET(request)).arrayBuffer()),Buffer.from(await first.arrayBuffer()))
    assert.equal(h.syntheses.length,before)
    assert.deepEqual(h.objects.get('v2/en/'+id+'.mp3'),original)
    assert.equal(coachIntroAudioPath(id,'ru'),'/api/coaching/intro/ru/'+id+'?v='+(id==='genie'?3:['alex','max'].includes(id)?4:2))
    assert.equal(coachIntroAudioPath(id,'es'),'/api/coaching/intro/es/'+id+'?v=2')
  }
  assert.equal(h.syntheses.length,7)
  assert.equal(h.writes,7)
  for(const invalid of ['ru/mira','es/genie','en/lea']){
    assert.equal((await h.GET(new Request('https://holistichouse.vercel.app/api/coaching/intro/'+invalid+'?v=4'))).status,400)
  }
  const disabled=harness({env:{}})
  assert.equal((await disabled.GET(new Request('https://holistichouse.vercel.app/api/coaching/intro/en/mira?v=4'))).status,503)
  assert.equal(disabled.fishCalls,0)
})
test('missing old English archives retain the historical voice rather than recording v4 identity into an old URL',async()=>{
  const h=harness()
  for(const [id,voice] of Object.entries({mira:'Gacrux',max:'Orus',sofia:'Sulafat',alex:'Charon',harry:'Achird',genie:'Orus'})){
    assert.equal((await h.GET(h.request(id,'en'))).status,200)
    assert.equal(h.syntheses.at(-1).voiceName,voice)
  }
})

test('Russian Alex and Max record new immutable v4 tracks while old v2 retains historical voices',async()=>{
  const h=harness()
  for(const [id,voice,old] of [['alex','Enceladus','Alnilam'],['max','Alnilam','Orus']]){
    const legacy=await h.GET(h.request(id,'ru'))
    assert.equal(legacy.status,200)
    assert.equal(h.syntheses.at(-1).voiceName,old)
    const original=Buffer.from(await legacy.arrayBuffer())
    const path=coachIntroAudioPath(id,'ru')
    assert.equal(path,'/api/coaching/intro/ru/'+id+'?v=4')
    const request=new Request('https://holistichouse.vercel.app'+path)
    const first=await h.GET(request)
    assert.equal(first.status,200)
    assert.equal(h.syntheses.at(-1).voiceName,voice)
    assert.equal(h.syntheses.at(-1).text,getCoachPresentation(id,'ru').text)
    const bytes=Buffer.from(await first.arrayBuffer()), before=h.syntheses.length
    assert.deepEqual(Buffer.from(await (await h.GET(request)).arrayBuffer()),bytes)
    assert.equal(h.syntheses.length,before)
    assert.deepEqual(h.objects.get('v2/ru/'+id+'.mp3'),original)
    assert.ok(h.objects.has('v4/ru/'+id+'.mp3'))
    const disabled=harness({env:{}})
    assert.equal((await disabled.GET(request)).status,503)
    assert.equal(disabled.fishCalls,0)
  }
})

test('short in-session audio is cached separately, uses the approved voice and never replays the biography',async()=>{
  const h=harness()
  for(const id of COACH_OPENING_PUBLIC_IDS)for(const locale of ['ru','en']){
    const path=coachSessionOpeningAudioPath(id,locale)
    assert.equal(path,'/api/coaching/intro/'+locale+'/'+id+'?v=6')
    const request=new Request('https://holistichouse.vercel.app'+path)
    const line=coachSessionOpeningLine(id,locale)
    assert.ok(line.length<110)
    assert.equal((line.match(/\?/g)||[]).length,1)
    assert.notEqual(line,coachOpeningIntro(id,locale))
    const first=await h.GET(request)
    assert.equal(first.status,200,id+'/'+locale)
    const bytes=Buffer.from(await first.arrayBuffer())
    assert.equal(h.syntheses.at(-1).text,line)
    assert.equal(h.syntheses.at(-1).voiceName,approvedGeminiVoice(id,locale))
    assert.ok(h.objects.has('v6/'+locale+'/'+id+'.mp3'))
    const count=h.syntheses.length
    assert.deepEqual(Buffer.from(await (await h.GET(request)).arrayBuffer()),bytes)
    assert.equal(h.syntheses.length,count)
  }
  assert.equal(h.objects.size,16)
  assert.equal((await harness({env:{}}).GET(new Request('https://holistichouse.vercel.app'+coachSessionOpeningAudioPath('merlin','ru')))).status,503)
})

test('Merlin missing approved greeting never substitutes a different provider',async()=>{
  const h=harness({env:{}})
  const response=await h.GET(h.request('merlin','ru'))
  assert.equal(response.status,503)
  assert.equal(h.fishCalls,0)
})
