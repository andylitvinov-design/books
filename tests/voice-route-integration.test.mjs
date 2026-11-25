import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import {readFileSync} from 'node:fs'
import {myCoachFishVoice,myCoachFishProsody,normalizeMyCoachFishRequest} from '../lib/coaching/my-coach-fish-voice.mjs'

function harness(google=false){
 const source=readFileSync(new URL('../app/api/app/my-coach/voice/synthesize/route.js',import.meta.url),'utf8')
 const route=source.slice(source.indexOf('const currentProvider='))
 const calls=[]
 class AppError extends Error{constructor(code,status){super(code);this.code=code;this.status=status}}
 class NextResponse{constructor(body,options){this.body=body;this.status=options.status}static json(body,options){return {body,status:options?.status??200}}}
 const context={AppError,NextResponse,process:{env:{}},AbortSignal,getAppConfig:()=>({}),requireSameOrigin:()=>{},createRequestAuth:()=>({verified:async()=>({id:'synthetic'}),apply:x=>x}),consumeRate:async(_config,value)=>calls.push({rate:value.op}),readBody:async request=>request.input,safeError:e=>({code:e.code,status:e.status}),PRIVATE_HEADERS:{},GOOGLE_PROVIDER:'google',GOOGLE_TTS_GLOBAL_DAILY_LIMIT:1,googleChirpConfig:()=>google?{}:null,myCoachFishConfig:()=>({key:'test',model:'synthetic'}),myCoachFishVoice,myCoachFishProsody,normalizeMyCoachFishRequest,fetch:async(_url,options)=>{calls.push({payload:JSON.parse(options.body)});return {ok:true,body:'synthetic',headers:{get:()=> 'audio/mpeg'}}}}
 const code=route.replaceAll('export async function ','async function ')
 return {post:vm.runInNewContext(`${code}; POST`,context),calls}
}
test('synthetic synthesis enforces consent and passes Sofia prosody and server-selected voice',async()=>{
 const {post,calls}=harness()
 const base={provider:'fish_free',personaId:'sofia',locale:'en',text:'Hello',voiceConsent:true,cloudVoiceConsent:true,trainingUseConsent:true}
 const noConsent=await post({input:{...base,trainingUseConsent:false},signal:new AbortController().signal})
 assert.equal(noConsent.status,400)
 assert.equal(calls.length,0)
 const response=await post({input:base,signal:new AbortController().signal})
 assert.equal(response.status,200)
 const request=calls.find(x=>x.payload).payload
 assert.equal(request.reference_id,myCoachFishVoice('sofia','en'))
 assert.equal(request.prosody.speed,0.9)
 assert.deepEqual(calls.filter(x=>x.rate).map(x=>x.rate),['my-coach-fish-minute','my-coach-fish-day'])
})
test('Google priority does not silently switch a Fish request',async()=>{
 const {post,calls}=harness(true)
 const response=await post({input:{provider:'fish_free'},signal:new AbortController().signal})
 assert.equal(response.status,503)
 assert.equal(calls.length,0)
})
test('public intro uses fixed authored text and applies Sofia prosody',async()=>{
 const source=readFileSync(new URL('../app/api/coaching/intro/[locale]/[coach]/route.js',import.meta.url),'utf8')
 const route=source.slice(source.indexOf('const CACHE_HEADERS=')).replace('export async function GET(', 'async function GET(')
 const calls=[]
 class AppError extends Error{constructor(code,status){super(code);this.code=code;this.status=status}}
 class NextResponse{constructor(body,options){this.body=body;this.status=options.status}static json(body,options){return {body,status:options.status}}}
 const context={URL,AbortSignal,AppError,NextResponse,safeError:e=>({code:e.code,status:e.status}),getCoachPresentation:()=>({text:'fixed editorial introduction'}),coachOpeningIntro:()=> 'fixed opening protocol',getAppConfig:()=>({}),googleChirpConfig:()=>null,myCoachFishVoice,myCoachFishProsody,myCoachFishConfig:()=>({key:'test',model:'synthetic'}),consumeRate:async()=>{},fetch:async(_url,options)=>{calls.push(JSON.parse(options.body));return {ok:true,body:'synthetic',headers:{get:()=> 'audio/mpeg'}}}}
 const get=vm.runInNewContext(`${route}; GET`,context)
 const request=url=>({url,headers:{get:()=> 'same-origin'},signal:new AbortController().signal})
 assert.equal((await get(request('https://example.test/api/coaching/intro/en/sofia?v=2'))).status,200)
 assert.equal(calls[0].text,'fixed opening protocol')
 assert.equal(calls[0].prosody.speed,0.9)
 assert.equal(calls[0].reference_id,myCoachFishVoice('sofia','en'))
 assert.equal((await get(request('https://example.test/api/coaching/intro/en/sofia?text=private'))).status,400)
 assert.equal(calls.length,1)
})
