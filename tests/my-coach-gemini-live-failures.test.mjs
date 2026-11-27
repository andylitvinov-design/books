import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {greetingSwipeDirection,greetingCoachNeighbor} from '../lib/coaching/coach-greeting-swipe.mjs'
import {PUBLIC_COACH_RAIL_IDS} from '../lib/coaching/persona-registry.mjs'
import {
  geminiFreeLiveConfig,geminiFreeLiveUnavailableReason,
  normalizeGeminiFreeLiveStart,issueGeminiFreeLiveToken
} from '../lib/coaching/gemini-live-free.mjs'

const load=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const key='AIza'+'A'.repeat(36)
const enabled={
  HH_GEMINI_FREE_API_KEY:key,HH_MY_COACH_GEMINI_FREE_ENABLED:'true',
  HH_MY_COACH_GEMINI_FREE_TIER_CONFIRMED:'true',
  HH_MY_COACH_GEMINI_FREE_DATA_APPROVED:'true',
  HH_MY_COACH_GEMINI_LIVE_FREE_ENABLED:'true',HH_COACHING_BRAIN_ENABLED:'true',
  HH_COACHING_LIVE_VOICE_ENABLED:'true',HH_COACHING_LIVE_VOICE_APPROVED:'true'
}
const start=normalizeGeminiFreeLiveStart({
  personaId:'mira',locale:'en',settings:{},voiceName:'Sulafat',
  consent:true,voiceConsent:true,trainingUseConsent:true,
})
test('metadata readiness distinguishes an omitted Director flag without changing provider or paid gates',()=>{
  assert.equal(geminiFreeLiveUnavailableReason(enabled),null)
  assert.equal(geminiFreeLiveConfig(enabled)?.model,'gemini-3.1-flash-live-preview')
  const cases=[
    ['HH_COACHING_BRAIN_ENABLED','director_not_enabled'],
    ['HH_MY_COACH_GEMINI_LIVE_FREE_ENABLED','live_not_enabled'],
    ['HH_COACHING_LIVE_VOICE_APPROVED','live_voice_not_approved'],
  ]
  for(const [name,reason] of cases){
    const env={...enabled};delete env[name]
    assert.equal(geminiFreeLiveUnavailableReason(env),reason)
    assert.equal(geminiFreeLiveConfig(env),null)
  }
  const noFree={...enabled,HH_MY_COACH_GEMINI_FREE_ENABLED:'false'}
  assert.equal(geminiFreeLiveUnavailableReason(noFree),'free_model_unverified')
  assert.equal(geminiFreeLiveConfig({...enabled,HH_GEMINI_PAID_API_KEY:key}),null)
})
test('provider token errors return precise safe categories, never upstream body or token',async()=>{
  const config=geminiFreeLiveConfig(enabled)
  for(const [status,code] of [
    [400,'GEMINI_LIVE_PROVIDER_BAD_REQUEST'],
    [422,'GEMINI_LIVE_PROVIDER_BAD_REQUEST'],
    [401,'GEMINI_LIVE_AUTH_FAILURE'],
    [403,'GEMINI_LIVE_AUTH_FAILURE'],
    [404,'GEMINI_LIVE_PROVIDER_MODEL_UNAVAILABLE'],
    [429,'GEMINI_LIVE_RATE_LIMIT'],
    [500,'GEMINI_LIVE_PROVIDER_UNAVAILABLE'],
    [503,'GEMINI_LIVE_PROVIDER_UNAVAILABLE'],
  ]){
    const secretSentinel='SENSITIVE_DO_NOT_SHOW'
    await assert.rejects(issueGeminiFreeLiveToken(config,start,{
      now:Date.parse('2026-11-23T01:00:00Z'),
      pause:async()=>{},
      fetcher:async(_url,options)=>{
        assert.equal(options.method,'POST')
        const payload=JSON.parse(options.body)
        assert.ok(payload.bidiGenerateContentSetup)
        assert.equal(Object.hasOwn(payload,'liveConnectConstraints'),false)
        assert.ok(payload.fieldMask.split(',').includes('systemInstruction'))
        return {ok:false,status,async json(){throw Error(secretSentinel)}}
      },
    }),error=>error.message===code&&
       !error.message.includes(secretSentinel))
  }
})
test('G-L6 retries one server-owned Free token after transient 5xx without new model calls',async()=>{
  const config=geminiFreeLiveConfig(enabled)
  const bodies=[],headers=[],delays=[]
  const token=await issueGeminiFreeLiveToken(config,start,{
    now:Date.parse('2026-11-23T15:40:00Z'),
    pause:async ms=>{delays.push(ms)},
    fetcher:async(url,options)=>{
      assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/auth_tokens')
      headers.push(options.headers['x-goog-api-key'])
      const body=JSON.parse(options.body)
      assert.equal(body.uses,1)
      assert.equal(body.bidiGenerateContentSetup.model,'models/gemini-3.1-flash-live-preview')
      assert.match(body.bidiGenerateContentSetup.systemInstruction.parts[0].text,/coaching method/)
      assert.equal(body.fieldMask.split(',').includes('sessionResumption'),false)
      bodies.push(options.body)
      return bodies.length===1?{ok:false,status:503}:
        {ok:true,status:200,json:async()=>({name:'auth_tokens/recovered-one-use'})}
    },
  })
  assert.equal(token.token,'auth_tokens/recovered-one-use')
  assert.equal(bodies.length,2)
  assert.equal(bodies[0],bodies[1])
  assert.deepEqual(headers,[key,key])
  assert.equal(delays.length,1)
  assert.ok(delays[0]>=800&&delays[0]<1100)
  assert.ok(!JSON.stringify(token).includes(key))

  for(const status of [500,502,503,504]){
    let attempts=0,pauses=0
    await assert.rejects(issueGeminiFreeLiveToken(config,start,{
      pause:async()=>{pauses++},
      fetcher:async()=>{attempts++;return {ok:false,status}},
    }),{message:'GEMINI_LIVE_PROVIDER_UNAVAILABLE'})
    assert.equal(attempts,2,'bounded attempt count for '+status)
    assert.equal(pauses,1,'one wait for '+status)
  }
  for(const status of [400,401,403,404,422,429]){
    let attempts=0,pauses=0
    await assert.rejects(issueGeminiFreeLiveToken(config,start,{
      pause:async()=>{pauses++},
      fetcher:async()=>{attempts++;return {ok:false,status}},
    }))
    assert.equal(attempts,1,'non-retryable '+status)
    assert.equal(pauses,0)
  }
  const controller=new AbortController()
  let attempted=0
  await assert.rejects(issueGeminiFreeLiveToken(config,start,{
    signal:controller.signal,pause:async()=>{assert.fail('aborted session must not pause')},
    fetcher:async()=>{attempted++;controller.abort();return {ok:false,status:503}},
  }),{message:'GEMINI_LIVE_PROVIDER_UNAVAILABLE'})
  assert.equal(attempted,1)
  let transportAttempts=0
  await assert.rejects(issueGeminiFreeLiveToken(config,start,{
    pause:async()=>{assert.fail('transport error is not retried')},
    fetcher:async()=>{transportAttempts++;throw Error('private transport failure')},
  }),{message:'GEMINI_LIVE_TOKEN_UNAVAILABLE'})
  assert.equal(transportAttempts,1)
})

test('public authenticated token endpoint preserves fixed error codes and keeps keys out of logs',()=>{
  const route=load('app/api/app/[...path]/route.js')
  const service=load('lib/coaching/gemini-live-free.mjs')
  assert.match(route,/console\.warn\('HH_MY_COACH_LIVE_TOKEN_FAILURE',safeCode\)/)
  assert.match(route,/MY_COACH_GEMINI_LIVE_SETUP_REJECTED/)
  assert.match(route,/MY_COACH_GEMINI_LIVE_AUTH_FAILURE/)
  assert.match(route,/MY_COACH_GEMINI_LIVE_MODEL_UNAVAILABLE/)
  assert.match(route,/MY_COACH_GEMINI_LIVE_RATE_LIMIT/)
  assert.match(route,/gemini_live_reason:geminiFreeLiveUnavailableReason\(process\.env\)/)
  assert.doesNotMatch(route,/console\.(?:log|warn)\([^)]*(?:apiKey|providerResponse|response\.text)/)
  assert.doesNotMatch(service,/console\.(?:log|warn)/)
})
test('iPhone and desktop clients show actionable RU EN ES errors rather than generic unavailable',async()=>{
  const src=load('components/my-coach-gemini-live.jsx')
  const marker=src.indexOf('  const errorNotice=error=>')
  assert.ok(marker>0)
  const stop=src.indexOf('\n  const phaseChange=',marker)
  assert.ok(stop>marker)
  const body=src.slice(marker,stop)
  const t={
    rateLimit:'free quota',login:'login',
    providerAccess:'Google access denied (G-L1)',
    providerSetup:'Google setup rejected (G-L2)',
    providerModel:'model unavailable (G-L3)',
    providerUnavailable:'Google temporarily unavailable (G-L6)',
    setupInvalid:'setup mismatch (G-L7)',failure:'generic fallback',
  }
  const resolve=runInNewContext(body+'\nerrorNotice',{t},{timeout:1000})
  assert.equal(resolve(new Error('GEMINI_LIVE_PROVIDER_ACCESS')),t.providerAccess)
  assert.equal(resolve(new Error('GEMINI_LIVE_PROVIDER_SETUP')),t.providerSetup)
  assert.equal(resolve(new Error('GEMINI_LIVE_PROVIDER_MODEL')),t.providerModel)
  assert.equal(resolve(new Error('GEMINI_LIVE_PROVIDER_OUTAGE')),t.providerUnavailable)
  assert.equal(resolve(new Error('GEMINI_LIVE_SETUP_INVALID')),t.setupInvalid)
  assert.equal(resolve(new Error('GEMINI_LIVE_LIMIT')),t.rateLimit)
  assert.equal(resolve(new Error('GEMINI_LIVE_LOGIN')),t.login)
  assert.equal(resolve(new Error('private raw network failure')),t.failure)
  for(const suffix of ['G-L1','G-L2','G-L3','G-L4','G-L5','G-L6','G-L7'])
    assert.match(src,new RegExp(suffix))
  assert.match(src,/socket\.onclose=event=>/)
  assert.match(src,/event\?\.code===1008/)
  assert.match(src,/event\?\.code===1011/)
  assert.match(src,/if\(!sendSocket\(r,setup\)\)throw Error/)
  assert.doesNotMatch(src,/console\.(?:log|error)\([^)]*(?:token|socket\.url)/)
})
test('user-visible token failure stays in the existing voice request and a 429 remains bounded',async()=>{
  const src=load('components/my-coach-gemini-live.jsx')
  const fn=src.slice(src.indexOf('  async function getToken(r){'),
    src.indexOf('  async function begin(r,microphone){'))
  assert.ok(fn.startsWith('  async function getToken(r){'))
  const sample={personaId:'mira',locale:'en',settings:{},
    voiceName:'Sulafat',abort:{signal:{}}}
  for(const [response,expected] of [
    [{status:429,ok:false},'GEMINI_LIVE_LIMIT'],
    [{status:401,ok:false},'GEMINI_LIVE_LOGIN'],
    [{status:503,ok:false,json:async()=>({error:'MY_COACH_GEMINI_LIVE_AUTH_FAILURE'})},
      'GEMINI_LIVE_PROVIDER_ACCESS'],
    [{status:503,ok:false,json:async()=>({error:'MY_COACH_GEMINI_LIVE_SETUP_REJECTED'})},
      'GEMINI_LIVE_PROVIDER_SETUP'],
    [{status:503,ok:false,json:async()=>({error:'MY_COACH_GEMINI_LIVE_MODEL_UNAVAILABLE'})},
      'GEMINI_LIVE_PROVIDER_MODEL'],
    [{status:503,ok:false,json:async()=>({error:'MY_COACH_GEMINI_LIVE_PROVIDER_UNAVAILABLE'})},
      'GEMINI_LIVE_PROVIDER_OUTAGE'],
  ]){
    const token=runInNewContext(fn+'\ngetToken',{
      fetch:async(url,options)=>{
        assert.equal(url,'/api/app/my-coach/live-token')
        assert.equal(options.method,'POST')
        assert.equal(options.credentials,'same-origin')
        return response
      },
    },{timeout:1000})
    await assert.rejects(token(sample),x=>x.message===expected)
  }
})

test('Live Free token quota separates failed provider attempts from delivered sessions',async()=>{
  const {geminiLiveTokenQuota}=await import('../lib/coaching/gemini-live-quota.mjs')
  const actor='123e4567-e89b-42d3-a456-426614174000'
  const plan=geminiLiveTokenQuota(actor)
  assert.deepEqual(plan.attempts.map(x=>[x.limit,x.seconds]),[
    [4,3600],[8,86400],[40,86400]])
  assert.deepEqual(plan.successful.map(x=>[x.limit,x.seconds]),[
    [2,3600],[4,86400],[20,86400]])
  assert.deepEqual(plan.successful.map(x=>x.bucket.op),[
    'my-coach-live-free-actor-hour','my-coach-live-free-actor-day',
    'my-coach-live-free-global-day'])
  assert.equal(plan.attempts[0].bucket.actor,actor)
  assert.equal(plan.attempts[2].bucket.actor,undefined)
  assert.equal(new Set(plan.attempts.map(x=>x.bucket.op)).size,3)
  assert.ok(!plan.attempts.some(x=>
    plan.successful.some(y=>y.bucket.op===x.bucket.op)))
  assert.throws(()=>geminiLiveTokenQuota('not-a-uuid'))
  const route=load('app/api/app/[...path]/route.js')
  const start=route.indexOf("if (joined === 'my-coach/live-token')")
  const end=route.indexOf("if (joined === 'my-coach/live-checkpoint')",start)
  assert.ok(start>0&&end>start)
  const handler=route.slice(start,end)
  const attempted=handler.indexOf('await consumeRateBatch(config,liveQuota.attempts)')
  const mint=handler.indexOf('issueGeminiFreeLiveToken(vendor,start')
  const delivered=handler.indexOf('await consumeRateBatch(config,liveQuota.successful)')
  assert.ok(attempted>0&&mint>attempted&&delivered>mint)
  assert.ok(delivered>handler.indexOf("throw new AppError(safeCode,status)"))
  assert.doesNotMatch(handler,/await consumeRate\(config,\{op:'my-coach-live-free-actor/)
  const database=load('lib/app/database.js')
  assert.match(database,/export async function consumeRateBatch\(config, entries\)/)
  assert.match(database,/if\(!ok\)throw new AppError\('RATE_LIMITED',429\)/)
  assert.match(database,/return transaction\(config,null,async db=>/)
  assert.match(database,/for\(const row of entries\)/)
  assert.match(database,/operationHash\(row.bucket,config\)/)
  assert.match(database,/hh_app_inbox|inbox:true/)
})

test('only server-verified owner gets a bounded trial budget for all coach personas',async()=>{
  const {geminiLiveTokenQuota}=await import('../lib/coaching/gemini-live-quota.mjs')
  const actor='123e4567-e89b-42d3-a456-426614174000'
  const owner=geminiLiveTokenQuota(actor,{ownerTrial:true})
  const regular=geminiLiveTokenQuota(actor)
  assert.deepEqual(owner.attempts.map(x=>x.limit),[24,24,40])
  assert.deepEqual(owner.successful.map(x=>x.limit),[12,12,20])
  assert.deepEqual(regular.attempts.map(x=>x.limit),[4,8,40])
  assert.deepEqual(regular.successful.map(x=>x.limit),[2,4,20])
  assert.equal(owner.successful[2].bucket.op,regular.successful[2].bucket.op)
  assert.equal(owner.attempts[2].bucket.op,regular.attempts[2].bucket.op)
  assert.notEqual(owner.successful[0].bucket.op,regular.successful[0].bucket.op)
  assert.equal(owner.attempts[0].bucket.actor,actor)
  const route=load('app/api/app/[...path]/route.js')
  const section=route.slice(route.indexOf("if (joined === 'my-coach/live-token')"),
    route.indexOf("if (joined === 'my-coach/live-checkpoint')"))
  assert.match(section,/ownerTrial:practitionerEmailAllowed\(actor\)/)
  assert.match(route,/const actor=await auth\.verified\(\)/)
  assert.doesNotMatch(section,/ownerTrial:\s*(?:true|body\.|request\.)/)
  assert.match(section,/await consumeRateBatch\(config,liveQuota\.attempts\)/)
  assert.match(section,/await consumeRateBatch\(config,liveQuota\.successful\)/)
})

test('free first-party video greeting gates Live Play, not charge on preview',()=>{
  const gate=load('components/my-coach-greeting-gate.jsx')
  const dialogue=load('components/my-coach-live-dialogue.jsx')
  const gateCss=load('components/my-coach-greeting-gate.module.css')
  assert.match(gate,/coachIntroAudioPath\(personaId,lang\)/)
  assert.match(gate,/startDirectCoachIntroAudio\(url,/)
  assert.match(gate,/MyCoachMotionMedia personaId=\{personaId\}/)
  assert.match(gate,/MyCoachInlineProfile personaId=\{personaId\}/)
  assert.match(gate,/data-coach-greeting-start/)
  assert.match(gate,/data-coach-greeting-replay/)
  assert.match(gate,/phase==='complete'/)
  assert.match(gate,/data-coach-greeting-thematic/)
  assert.match(gate,/chooseSession\(readyTopic\|\|INTRODUCTORY_COACH_SESSION_ID\)/)
  assert.match(gate,/if\(!accountSaving\)\{topicDialog.current\?\.close\(\);void gate.begin\(\{id\}\);return\}/)
  assert.match(gate,/setReadyTopic\(action.id\)/)
  const auth=gate.slice(gate.indexOf('const gate=useGooglePageAction'),gate.indexOf('useEffect(()=>()=>'))
  assert.doesNotMatch(auth,/setPhase\('complete'\)/)
  assert.match(gate,/data-coach-topic-dialog/)
  assert.match(dialogue,/markCoachGreetingConnected\(personaId\)/)
  const marker=load('lib/coaching/coach-greeting-visit.mjs')
  assert.match(marker,/PUBLIC_COACH_PERSONA_IDS\.includes\(personaId\)/)
  assert.doesNotMatch(dialogue,/sessionStorage|localStorage|sendBeacon/)
  assert.doesNotMatch(marker,/setItem\([^)]*(?:transcript|providerToken|sessionText)/)
  assert.doesNotMatch(gate,/my-coach\/live-token|issueGeminiFreeLiveToken|speechRef|getUserMedia|XP.*deduct/)
  assert.match(dialogue,/data-coach-greeting-stage=\{greetingAccepted\?'session':'introduction'\}/)
  assert.match(dialogue,/!greetingAccepted&&<MyCoachGreetingGate/)
  assert.match(dialogue,/speechRef\.current\?\.startSession\?\.\(\)/)
  assert.match(dialogue,/greetingAccepted\?styles\.sessionScroll:styles\.sessionScrollAwaitingGreeting/)
  assert.match(gateCss,/min-height:calc\(100dvh - 65px\)/)
  assert.match(gateCss,/overflow-y:auto/)
})

test('intro hides all original dialogue siblings; voice failures expose safe stages',()=>{
 const css=load('components/my-coach-live-dialogue.module.css')
 const source=load('components/my-coach-gemini-live.jsx')
 assert.match(css,/data-coach-greeting-stage="introduction"\]\s*>\s*:not\(\.sessionTopbar\):not\(\[data-my-coach-greeting-gate\]\)/)
 assert.match(css,/display:none!important/)
 for(const [code,reason] of [['G-L8','microphoneRejected'],['G-L9','captureFailure'],['G-L10','tokenNetwork']]){
   assert.match(source,new RegExp(code.replace('-','\\-')))
   assert.match(source,new RegExp('GEMINI_LIVE_'))
   assert.ok(source.includes(reason))
 }
 assert.match(source,/stage='microphone'/)
 assert.match(source,/stage='capture'/)
 assert.match(source,/stage='token'/)
 assert.match(source,/catch\{throw Error\('GEMINI_LIVE_TOKEN_NETWORK'\)\}/)
 assert.match(source,/onSessionStart/)
})

test('iPhone Safari 27 restores real-time mic+speaker audio after muted greeting',async()=>{
 const mod=await import('../lib/personal-coaching/coach-ios-live-duplex.mjs')
 const {prepareCoachIos27LiveDuplex,activateCoachIos27LiveDuplex,
   restoreCoachIos27LiveDuplex}=mod
 const steps=[]
 const session={_type:'ambient',get type(){return this._type},
   set type(next){steps.push(next);this._type=next}}
 const ios={userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 27_2 like Mac OS X) AppleWebKit/605.1.15 Version/27.2 Mobile/15E148 Safari/604.1',
   audioSession:session}
 assert.equal(prepareCoachIos27LiveDuplex(ios),true)
 assert.equal(session.type,'auto')
 assert.equal(activateCoachIos27LiveDuplex(ios),true)
 assert.equal(session.type,'play-and-record')
 assert.equal(restoreCoachIos27LiveDuplex(ios),true)
 assert.equal(session.type,'auto')
 assert.deepEqual(steps,['auto','play-and-record','playback','auto'])
 assert.equal(prepareCoachIos27LiveDuplex({userAgent:'Android AppleWebKit/123',audioSession:session}),false)
 assert.equal(activateCoachIos27LiveDuplex({userAgent:'Android AppleWebKit/123',audioSession:session}),false)
 assert.equal(restoreCoachIos27LiveDuplex({userAgent:'Android AppleWebKit/123',audioSession:session}),false)
 assert.deepEqual(steps,['auto','play-and-record','playback','auto'])
 assert.equal(activateCoachIos27LiveDuplex({userAgent:ios.userAgent}),false)
 const denied={...ios,audioSession:{get type(){return 'ambient'},set type(value){throw Error('device unsupported')}}}
 assert.equal(prepareCoachIos27LiveDuplex(denied),false)
 assert.equal(activateCoachIos27LiveDuplex(denied),false)
 assert.equal(restoreCoachIos27LiveDuplex(denied),false)
 const live=load('components/my-coach-gemini-live.jsx')
 // Functions are declared in reverse source order: begin() precedes
 // startSession(). Assert ordering within each function independently.
 const start=live.slice(live.indexOf('function startSession()'),
   live.indexOf('function sendText('))
 const begin=live.slice(live.indexOf('async function begin(r,microphone)'),
   live.indexOf('function startSession()'))
 const b=start.indexOf('prepareCoachIos27LiveDuplex(navigator)')
 const mic=start.indexOf('microphone=navigator.mediaDevices.getUserMedia')
 const activate=begin.indexOf('activateCoachIos27LiveDuplex(navigator)')
 const token=begin.indexOf('const token=await getToken(r)')
 assert.ok(b>=0&&mic>b&&activate>=0&&token>activate)
 assert.match(live,/restoreCoachIos27LiveDuplex\(navigator\)/)
 assert.match(live,/getUserMedia\(\{/)
 assert.match(live,/new GeminiLivePcmPlayer\(context/)
})


test('duplex refresh makes a distinct guarded route transition on iOS WebKit',async()=>{
 const {refreshCoachLiveDuplex,restoreCoachIos27LiveDuplex}=await import('../lib/personal-coaching/coach-ios-live-duplex.mjs')
 const nextTask=()=>new Promise(resolve=>setTimeout(resolve,0))
 const writes=[]
 let category='ambient',active=true
 const session={get type(){return category},set type(value){category=value;writes.push(value)}}
 // The standalone UA has no Safari Version token and a frozen OS version.
 const standalone={userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',audioSession:session}
 const current=()=>active

 assert.equal(refreshCoachLiveDuplex(standalone,current,false),true)
 assert.deepEqual(writes,['play-and-record'],'wrong category is corrected immediately')
 assert.equal(refreshCoachLiveDuplex(standalone,current,false),true)
 assert.deepEqual(writes,['play-and-record'],'ordinary replies leave an already duplex route alone')
 await nextTask()
 assert.deepEqual(writes,['play-and-record'],'no extra transition on ordinary correction')
 writes.length=0
 assert.equal(refreshCoachLiveDuplex(standalone,current),true)
 assert.equal(refreshCoachLiveDuplex(standalone,current),true)
 assert.deepEqual(writes,['auto'],'overlapping requests share the pending task')
 await nextTask()
 assert.deepEqual(writes,['auto','play-and-record'])

 writes.length=0
 refreshCoachLiveDuplex(standalone,current)
 active=false
 await nextTask()
 assert.deepEqual(writes,['auto'],'background, paused or obsolete runner lost its route claim')
 assert.equal(refreshCoachLiveDuplex(standalone,current),false)
 assert.deepEqual(writes,['auto'])
 active=true

 const ipad={userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Safari/605.1.15',platform:'MacIntel',maxTouchPoints:5,audioSession:session}
 category='play-and-record'
 writes.length=0
 refreshCoachLiveDuplex(ipad,current)
 session.type='ambient'
 await nextTask()
 assert.deepEqual(writes,['auto','ambient'],'a later category choice wins')
 category='play-and-record'
 writes.length=0
 refreshCoachLiveDuplex(ipad,current)
 restoreCoachIos27LiveDuplex(ipad)
 await nextTask()
 assert.deepEqual(writes,['auto','playback','auto'],'teardown cancels recovery')

 writes.length=0
 for(const device of [
   {...ipad,maxTouchPoints:0},
   {...standalone,userAgent:'Mozilla/5.0 (Linux; Android) AppleWebKit/537.36 Chrome/144.0'},
   {...standalone,userAgent:standalone.userAgent+' CriOS/144.0'},
   {...standalone,userAgent:standalone.userAgent+' FxiOS/145.0'},
   {...standalone,userAgent:'iPhone Gecko/145 Firefox/145'},
   {...standalone,audioSession:undefined},
   {...standalone,get audioSession(){throw Error('unavailable')}},
 ])assert.equal(refreshCoachLiveDuplex(device,current),false)
 assert.deepEqual(writes,[])
})

test('greeting swipe follows public rail in both directions, ignores vertical, short and invalid gestures',()=>{
 const ids=PUBLIC_COACH_RAIL_IDS
 assert.equal(ids[0],'merlin')
 assert.equal(greetingSwipeDirection(-90,12),1)
 assert.equal(greetingSwipeDirection(90,-12),-1)
 for(const [dx,dy] of [[20,0],[0,100],[60,65],[90,80],[NaN,0]])assert.equal(greetingSwipeDirection(dx,dy),0)
 for(let i=0;i<ids.length;i++){
   assert.equal(greetingCoachNeighbor(ids,ids[i],1),ids[(i+1)%ids.length])
   assert.equal(greetingCoachNeighbor(ids,ids[i],-1),ids[(i+ids.length-1)%ids.length])
 }
 assert.equal(greetingCoachNeighbor(ids,'hidden',1),null)
 assert.equal(greetingCoachNeighbor(ids,'merlin',0),null)
})
test('greeting navigation cancels old audio before switching and never starts Live',()=>{
 const gate=load('components/my-coach-greeting-gate.jsx')
 const navigation=gate.slice(gate.indexOf('function switchCoach('),gate.indexOf('function beginSwipe('))
 assert.ok(navigation.includes('greetingCoachNeighbor(PUBLIC_COACH_RAIL_IDS,personaId,direction)'))
 assert.ok(navigation.includes('coachSessionHref(lang,nextId)'))
 assert.ok(navigation.indexOf('audioRun.current++')<navigation.indexOf('player.current?.cancel?.()'))
 assert.ok(navigation.indexOf('player.current?.cancel?.()')<navigation.indexOf('router.push(href+'))
 assert.doesNotMatch(navigation,/onStart\?\.|startSession\(|playGreeting\(|fetch\(/)
 assert.ok(gate.includes('onTouchCancel')&&gate.includes('onTouchEnd')&&gate.includes('onClickCapture'))
 assert.ok(load('components/my-coach-greeting-gate.module.css').includes('touch-action:pan-y pinch-zoom'))
 assert.ok(load('components/public-coaching-discovery.jsx').includes("MyCoachLiveDialogue key={selectedPersona.id+':'+(personaSelection?.methodId||'standard')}"))
})

test('approved cinematic greeting retains course and controls before, during and after greeting',()=>{
 const gate=load('components/my-coach-greeting-gate.jsx'),css=load('components/my-coach-greeting-gate.module.css')
 const slot=gate.slice(gate.indexOf('data-coach-greeting-cta-slot'),gate.indexOf('data-coach-greeting-course={program}'))
 assert.match(slot,/phase==='complete'&&/)
 assert.match(slot,/<ClarityStartLink locale=\{lang\} coachId=\{personaId\}/)
 assert.match(gate,/onEnd:\(\)=>\{if\(audioRun.current===generation\).*setPhase\('complete'\)/)
 assert.match(gate,/function fail\(\).*setPhase\('preview'\)/)
 assert.match(gate,/if\(!audio\?\.ended\|\|!Number.isFinite\(audio.duration\)/)
 assert.match(gate,/phase==='preview'\|\|phase==='paused'/)
 assert.match(gate,/data-coach-greeting-course-previous/)
 assert.match(gate,/data-coach-greeting-course-next/)
 assert.match(gate,/router.push\(href\+'&greetingProgram='\+encodeURIComponent\(program\)\)/)
 assert.match(gate,/if\(phase!=='complete'\|\|chosen.current\|\|switching.current\|\|gate.busy\)return/)
 for(const marker of ['data-coach-greeting-tiles','data-coach-greeting-player','data-coach-greeting-replay','data-coach-greeting-courses'])assert.ok(gate.indexOf(marker)>gate.indexOf('data-coach-greeting-course={program}'))
 assert.match(css,/\.cinemaMedia,\.cinemaShade\{position:absolute;inset:0/)
 assert.match(css,/\.ctaArea\{min-height:68px\}/)
 assert.doesNotMatch(gate,/03:24|09:50|68%/)
})
