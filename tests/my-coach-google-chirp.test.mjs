import {test} from 'node:test'
import assert from 'node:assert/strict'
import {generateKeyPairSync,verify} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {coachSpokenText} from '../lib/coaching/coach-spoken-text.mjs'
import {GOOGLE_PROVIDER,GOOGLE_TTS_MAX_CHARS,GOOGLE_TTS_MONTHLY_UPPER_BOUND,
 GOOGLE_TTS_GLOBAL_DAILY_LIMIT,googleChirpConfig,googleChirpVoice,
 normalizeGoogleChirpInput,googleChirpAssertion,synthesizeGoogleChirp
} from '../lib/coaching/my-coach-google-chirp.mjs'

const keys=generateKeyPairSync('rsa',{modulusLength:2048})
const projectId='holistic-voice-test'
const credentials={type:'service_account',project_id:projectId,
 client_email:'tts@holistic-voice-test.iam.gserviceaccount.com',
 private_key:keys.privateKey.export({format:'pem',type:'pkcs8'}),
 token_uri:'https://oauth2.googleapis.com/token'}
const enabled={HH_MY_COACH_GOOGLE_CHIRP_ENABLED:'true',
 HH_MY_COACH_GOOGLE_CHIRP_APPROVED:'true',HH_MY_COACH_GOOGLE_CHIRP_COST_APPROVED:'true',
 HH_GOOGLE_TTS_PROJECT_ID:projectId,
 HH_GOOGLE_TTS_SERVICE_ACCOUNT_JSON:JSON.stringify(credentials)}
const valid={provider:GOOGLE_PROVIDER,locale:'ru',personaId:'mira',
 text:'Что для вас сейчас важнее всего?',voiceConsent:true,cloudVoiceConsent:true}
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')

test('Google Chirp is completely OFF by default and requires verified cost, privacy and service account',()=>{
 assert.equal(googleChirpConfig({}),null)
 for(const key of ['HH_MY_COACH_GOOGLE_CHIRP_ENABLED',
   'HH_MY_COACH_GOOGLE_CHIRP_APPROVED','HH_MY_COACH_GOOGLE_CHIRP_COST_APPROVED'])
   assert.equal(googleChirpConfig({...enabled,[key]:'false'}),null,key)
 assert.equal(googleChirpConfig({...enabled,HH_GOOGLE_TTS_PROJECT_ID:'wrong-project'}),null)
 assert.equal(googleChirpConfig({...enabled,HH_GOOGLE_TTS_SERVICE_ACCOUNT_JSON:'broken'}),null)
 const config=googleChirpConfig(enabled)
 assert.equal(config.projectId,projectId)
 assert.equal(config.email,credentials.client_email)
 assert.ok(!JSON.stringify({projectId:config.projectId,email:config.email}).includes('PRIVATE KEY'))
})
test('fixed RU/EN/ES persona voices and strict independent Google Cloud consent',()=>{
 assert.deepEqual(googleChirpVoice('ru','mira'),{languageCode:'ru-RU',name:'ru-RU-Chirp3-HD-Aoede'})
 assert.deepEqual(googleChirpVoice('en','max'),{languageCode:'en-US',name:'en-US-Chirp3-HD-Charon'})
 assert.deepEqual(googleChirpVoice('es','sofia'),{languageCode:'es-ES',name:'es-ES-Chirp3-HD-Kore'})
 assert.equal(googleChirpVoice('fr','max'),null)
 assert.deepEqual(normalizeGoogleChirpInput(valid),{locale:'ru',personaId:'mira',text:valid.text})
 for(const invalid of [{...valid,cloudVoiceConsent:false},{...valid,voiceConsent:false},
   {...valid,provider:'fish_free'},{...valid,personaId:'custom-voice'},
   {...valid,random:'token'},{...valid,text:'x'.repeat(GOOGLE_TTS_MAX_CHARS+1)},
   {...valid,text:'-----BEGIN RSA PRIVATE KEY-----'},
   {...valid,text:'abc\u0000def'}])
   assert.throws(()=>normalizeGoogleChirpInput(invalid),/GOOGLE_CHIRP_INVALID/)
})
test('Google auth is OAuth2 service-account JWT, not an exposed browser key',()=>{
 const token=googleChirpAssertion(googleChirpConfig(enabled))
 const [header,payload,sig]=token.split('.')
 assert.equal(JSON.parse(Buffer.from(header,'base64url')).alg,'RS256')
 const claim=JSON.parse(Buffer.from(payload,'base64url'))
 assert.equal(claim.aud,'https://oauth2.googleapis.com/token')
 assert.ok(claim.exp-claim.iat<=1800)
 assert.equal(verify('RSA-SHA256',Buffer.from(header+'.'+payload),keys.publicKey,
   Buffer.from(sig,'base64url')),true)
})
test('uses only Google token + Chirp REST endpoints and validates returned MP3 bytes',async()=>{
 const mp3=Buffer.concat([Buffer.from('ID3'),Buffer.alloc(34,7)])
 const calls=[]
 const config=googleChirpConfig(enabled)
 const audio=await synthesizeGoogleChirp({config,input:normalizeGoogleChirpInput(valid),
  fetcher:async(url,options)=>{
   calls.push({url,options})
   if(url.includes('oauth2.googleapis.com'))return {ok:true,json:async()=>({
     access_token:'test_'+('z'.repeat(50)),token_type:'Bearer'})}
   return {ok:true,json:async()=>({audioContent:mp3.toString('base64')})}
  }})
 assert.ok(audio.equals(mp3))
 assert.deepEqual(calls.map(x=>x.url),['https://oauth2.googleapis.com/token',
   'https://texttospeech.googleapis.com/v1/text:synthesize'])
 assert.equal(JSON.parse(calls[1].options.body).voice.name,'ru-RU-Chirp3-HD-Aoede')
 assert.equal(JSON.parse(calls[1].options.body).audioConfig.audioEncoding,'MP3')
 assert.equal(calls[1].options.headers['x-goog-user-project'],projectId)
 assert.equal(calls[1].options.cache,'no-store')
 assert.equal(calls[1].options.redirect,'error')
})
test('hard-bounded first-party cost policy and single Play voice introduction',()=>{
 assert.ok(GOOGLE_TTS_MONTHLY_UPPER_BOUND<1000000)
 const api=read('app/api/app/my-coach/voice/synthesize/route.js')
 const speech=read('components/my-coach-speech-loop.jsx')
 const ui=read('components/my-coach-live-dialogue.jsx')
 for(const needle of ['requireSameOrigin(request,config)','auth.verified()',
   'GOOGLE_TTS_GLOBAL_DAILY_LIMIT,86400','raw.provider!==provider',
   'normalizeGoogleChirpInput','synthesizeGoogleChirp','PRIVATE_HEADERS'])
   assert.ok(api.includes(needle),needle)
 for(const needle of ['cloudProvider={cloudProvider}','cloudAgreed',
   'introduction={introduction}','onSessionStart={()=>setCloudAgreed(true)}',
   'startCoachingMp3Playback','voiceProviderDetails','Google Chirp'])
   assert.ok(ui.includes(needle),needle)
 for(const needle of ['cloudControllerRef.current?.abort()','cloudPlayerRef.current?.cancel()',
   "voiceProvider==='google_chirp3_hd'","silence();changePhase('idle')",
   'sessionStartRef.current?.()'])
   assert.ok(speech.includes(needle),needle)
 assert.ok(!ui.includes('checked={cloudAgreed}'))
 assert.ok(!ui.includes('<dialog'))
 assert.ok(ui.includes("document.addEventListener('visibilitychange',onHidden)"))
 assert.ok(ui.includes("window.addEventListener('pagehide',stopReplay)"))
 assert.ok(speech.includes('(!cloudAgreed||!cloudAvailable)&&(cloudControllerRef.current||cloudPlayerRef.current)'))
 assert.doesNotMatch(ui,/service_account|HH_GOOGLE_TTS_SERVICE_ACCOUNT_JSON/)
 assert.doesNotMatch(speech,/texttospeech\.googleapis\.com|oauth2\.googleapis\.com/)
 assert.ok(speech.includes('iosCueSatisfiedRef.current=false'))
 assert.ok(speech.includes('introPlayerRef.current=startDirectCoachIntroAudio'))
 assert.ok(speech.includes('coachIntroAudioPath(personaId,lang)'))
 assert.ok(!speech.includes('speakOnDevice()'))
})
test('one explicit Play gesture authorizes the configured natural voice, not a checkbox',()=>{
 const ui=read('components/my-coach-live-dialogue.jsx')
 const voice=read('components/my-coach-speech-loop.jsx')
 assert.ok(ui.includes('const [cloudAgreed,setCloudAgreed]=useState(false)'))
 assert.ok(ui.includes('introduction={introduction}'))
 assert.ok(ui.includes('onSessionStart={()=>setCloudAgreed(true)}'))
 assert.ok(ui.includes('voiceProviderDetails'))
 assert.ok(ui.includes('Fish may use the text to train models'))
 assert.ok(ui.includes('Fish может использовать текст для обучения моделей'))
 assert.ok(!ui.includes('checked={cloudAgreed}'))
 assert.ok(!ui.includes('voiceModalNatural'))
 assert.ok(!ui.includes('naturalVoiceRow'))
 assert.ok(!ui.includes('<dialog'))
 assert.ok(voice.includes("if(!introStartedRef.current){"))
 assert.ok(voice.includes('sessionStartRef.current?.()'))
 assert.ok(voice.includes('(naturalVoice||voiceAgreed)&&voiceAvailable'))
 assert.ok(voice.includes('startCoachingMp3Playback'))
 assert.ok(voice.includes('voiceConsent:true,cloudVoiceConsent:true'))
 assert.ok(voice.includes('trainingUseConsent:true'))
 assert.ok(ui.includes('const result=await sendMessage(draft.trim())'))
 assert.ok(ui.includes('replayCoachReply(result.reply)'))
 assert.ok(ui.includes('className={styles.replayControl} onClick={()=>replayCoachReply()}'))
 assert.doesNotMatch(ui,/new MediaRecorder|localStorage|sessionStorage/)
})
test('free Fish spoken turns have one bounded vendor call and no paid model fallback',()=>{
 const route=read('app/api/app/my-coach/voice/synthesize/route.js')
 const fish=read('lib/coaching/my-coach-fish-voice.mjs')
 assert.match(route,/signal:AbortSignal\.any\(\[request\.signal,AbortSignal\.timeout\(15000\)\]\)/)
 assert.match(route,/model:vendor\.model/)
 assert.match(route,/my-coach-fish-minute/)
 assert.match(route,/my-coach-fish-day/)
 assert.match(fish,/model:'s2\.1-pro-free'/)
 assert.doesNotMatch(route,/s2\.1-pro'|s2-pro'|setTimeout\(\(\)=>fetch/)
});

test('fixed public Play greeting chooses cost-gated Google when configured; never pays twice',async()=>{
 const route=read('app/api/coaching/intro/[locale]/[coach]/route.js')
 assert.ok(route.includes('const chirp=googleChirpConfig()'))
 assert.ok(route.includes('coachSpokenText(intro.text).text'))
 assert.ok(route.includes("{op:'my-coach-google-global'},GOOGLE_TTS_GLOBAL_DAILY_LIMIT,86400"),
   'public editorial greeting shares the existing private 40/day hard budget')
 assert.ok(route.includes("const vendor=myCoachFishConfig()"))
 assert.doesNotMatch(route,/readBody\(|request\.json\(|input\.text|raw\.text|createRequestAuth/,
   'public request never accepts private text, recordings, identity or client voice IDs')
 const source=route.slice(route.indexOf('const CACHE_HEADERS={'))
  .replace('export async function GET(request){','async function GET(request){')+'\nGET'
 const request={url:'https://holistichouse.vercel.app/api/coaching/intro/ru/mira',
  headers:{get:()=> 'same-origin'},signal:new AbortController().signal}
 const recorded=[]
 let googleEnabled=true,fishCalls=0,googleFails=false
 class ResponseStub{
  constructor(body,{status=200,headers={}}={}){this.body=body;this.status=status;this.headers=headers}
  static json(value,options){return new ResponseStub(value,options)}
 }
 class FakeError extends Error{constructor(code,status){super(code);this.status=status}}
 const sandbox={
  NextResponse:ResponseStub,getAppConfig:()=>({}),
  consumeRate:async(_config,actor,limit,interval)=>{recorded.push({actor,limit,interval})},
  safeError:error=>({code:error.message,status:error.status||500}),AppError:FakeError,
  getCoachPresentation:()=>({text:'Здравствуйте! Я Мира. '+('Расскажите, что для вас важно сегодня. '.repeat(22))}),
  myCoachFishVoice:()=>'approved-reference-id',myCoachFishConfig:()=>({key:'placeholder',model:'free'}),
  googleChirpConfig:()=>googleEnabled?{projectId:'isolated-test-project'}:null,
  normalizeGoogleChirpInput,synthesizeGoogleChirp:async({config,input})=>{
   assert.equal(config.projectId,'isolated-test-project')
   assert.equal(input.locale,'ru');assert.equal(input.personaId,'mira')
   assert.ok(input.text.length<=500)
   assert.ok(new TextEncoder().encode(input.text).length<=1600)
   assert.ok(input.text.includes('Здравствуйте! Я Мира.'))
   if(googleFails)throw Error('GOOGLE_TTS_FAILED')
   return Buffer.from('ID3-SYNTHETIC-ONLY')
  },
  coachSpokenText,GOOGLE_PROVIDER,GOOGLE_TTS_GLOBAL_DAILY_LIMIT,
  AbortSignal,URL,Buffer,fetch:async()=>{fishCalls++;return {ok:true,headers:{get:()=> 'audio/mpeg'},
   body:Buffer.from('fish-synthetic')}}
 }
 const GET=runInNewContext(source,sandbox,{timeout:1000})
 const google=await GET(request)
 assert.equal(google.status,200)
 assert.equal(google.headers['Content-Type'],'audio/mpeg')
 assert.equal(google.headers['Content-Length'],String('ID3-SYNTHETIC-ONLY'.length))
 assert.equal(fishCalls,0,'configured Google never sends greeting to Fish')
 assert.deepEqual(recorded.map(r=>r.actor.op),[
  'my-coach-google-public-intro-minute','my-coach-google-public-intro-day',
  'my-coach-google-global'])
 assert.deepEqual(recorded.map(r=>r.limit),[12,24,40])
 assert.ok(GOOGLE_TTS_MONTHLY_UPPER_BOUND<1000000)
 googleFails=true
 const failed=await GET(request)
 assert.equal(failed.status,503,'Google failure fails closed')
 assert.equal(fishCalls,0,'no undisclosed provider/training fallback')
 googleEnabled=false
 const fish=await GET(request)
 assert.equal(fish.status,200,'approved Fish remains available while free pilot runs')
 assert.equal(fishCalls,1)
 const invalid=await GET({...request,url:request.url+'?text=secret'})
 assert.equal(invalid.status,400,'arbitrary text in query never becomes public TTS')
})
