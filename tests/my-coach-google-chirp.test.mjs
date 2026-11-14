import {test} from 'node:test'
import assert from 'node:assert/strict'
import {generateKeyPairSync,verify} from 'node:crypto'
import {readFileSync} from 'node:fs'
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
 assert.deepEqual(googleChirpVoice('es','sofia'),{languageCode:'es-ES',name:'es-ES-Chirp3-HD-Aoede'})
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
test('hard-bounded first-party cost policy and existing owner-only My Coach UI',()=>{
 assert.equal(GOOGLE_TTS_MAX_CHARS,500)
 assert.equal(GOOGLE_TTS_GLOBAL_DAILY_LIMIT,40)
 assert.ok(GOOGLE_TTS_MONTHLY_UPPER_BOUND<1000000)
 const api=read('app/api/app/my-coach/voice/synthesize/route.js')
 const speech=read('components/my-coach-speech-loop.jsx')
 const ui=read('components/my-coach-live-dialogue.jsx')
 for(const needle of ['requireSameOrigin(request,config)','auth.verified()',
   'GOOGLE_TTS_GLOBAL_DAILY_LIMIT,86400','raw.provider!==provider',
   'normalizeGoogleChirpInput','synthesizeGoogleChirp','PRIVATE_HEADERS'])
   assert.ok(api.includes(needle),needle)
 for(const needle of ['cloudProvider={cloudProvider}','Google Chirp 3 HD','cloudAgreed',
   'checked={cloudAgreed}','startCoachingMp3Playback','providerCopy.disclosure'])
   assert.ok(ui.includes(needle),needle)
 for(const needle of ['cloudControllerRef.current?.abort()','cloudPlayerRef.current?.cancel()',
   "cloudProvider==='google_chirp3_hd'","silence();changePhase('idle')"])
   assert.ok(speech.includes(needle),needle)
 assert.ok(ui.includes('replayControllerRef.current?.abort();replayPlayerRef.current?.cancel();setReplayBlocked(false);setReplaying(false);setCloudAgreed(false)'))
 assert.ok(ui.includes("document.addEventListener('visibilitychange',onHidden)"))
 assert.ok(ui.includes("window.addEventListener('pagehide',stopReplay)"))
 assert.ok(speech.includes('(!cloudAgreed||!cloudAvailable)&&(cloudControllerRef.current||cloudPlayerRef.current)'))
 assert.doesNotMatch(ui,/service_account|HH_GOOGLE_TTS_SERVICE_ACCOUNT_JSON/)
 assert.doesNotMatch(speech,/texttospeech\.googleapis\.com|oauth2\.googleapis\.com/)
 assert.doesNotMatch(speech,/new\s+window\.SpeechSynthesisUtterance\(reply\)/)
 assert.ok(speech.includes('iosCueSatisfiedRef.current=false'))
 assert.doesNotMatch(ui,/new\s+window\.SpeechSynthesisUtterance/)
 assert.ok(speech.includes('showTextOnly()'))
})
