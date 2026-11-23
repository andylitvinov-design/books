import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
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
      fetcher:async(_url,options)=>{
        assert.equal(options.method,'POST')
        assert.ok(JSON.parse(options.body).liveConnectConstraints)
        return {ok:false,status,async json(){throw Error(secretSentinel)}}
      },
    }),error=>error.message===code&&
       !error.message.includes(secretSentinel))
  }
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
