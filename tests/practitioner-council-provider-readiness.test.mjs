import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {councilProviderProbeAuthorized,inspectCouncilProviderKeys} from '../lib/practitioners/council-provider-readiness.mjs'

const time=1792545600000
const token='a'.repeat(64)
const url='https://holistichouse.vercel.app/api/internal/council-provider-readiness?proof='+token
const env={VERCEL_ENV:'production',HH_COUNCIL_PROBE_SECRET:token,
 HH_COUNCIL_PROBE_EXPIRES:String(time+30*60*1000)}
test('temporary provider probe authorizes ONLY production/strong fixed-origin short TTL',()=>{
 assert.equal(councilProviderProbeAuthorized(url,env,time),true)
 for(const [link,config,now] of [
   [url,{...env,VERCEL_ENV:'preview'},time],
   [url,{...env,HH_COUNCIL_PROBE_EXPIRES:'0'},time],
   [url,env,time+30*60*1000],
   [url,{...env,HH_COUNCIL_PROBE_EXPIRES:String(time+3*3600000)},time],
   [url,{...env,HH_COUNCIL_PROBE_SECRET:'short'},time],
   [url.replace('a'.repeat(64),'b'.repeat(64)),env,time],
   [url+'&chatId=8',env,time],
   [url.replace('holistichouse.vercel.app','evil.example'),env,time],
   [url.replace('council-provider-readiness','owner-ai-bootstrap'),env,time],
 ])assert.equal(councilProviderProbeAuthorized(link,config,now),false)
})
test('no credentials: no network, no claim of provider replies or free Gemini tier',async()=>{
 const result=await inspectCouncilProviderKeys({},async()=>{throw Error('Unexpected network')})
 assert.equal(result.gemini.keyPresent,false)
 assert.equal(result.gemini.readyForChat,false)
 assert.equal(result.mistral.keyPresent,false)
 assert.equal(result.modelResponseTested,false)
})
test('read-only official Google and OpenRouter endpoints verify exact model and free pricing',async()=>{
 const secrets={HH_COUNCIL_GEMINI_API_KEY:'fake-google',HH_COUNCIL_OPENROUTER_API_KEY:'fake-router',
  HH_COUNCIL_GEMINI_FREE_TIER_CONFIRMED:'true'}
 const calls=[]
 const result=await inspectCouncilProviderKeys(secrets,async(uri,config)=>{
   const target=String(uri)
   calls.push({target,config})
   assert.equal(config.method,'GET')
   assert.equal(config.redirect,'error')
   if(target.includes('generativelanguage.googleapis.com')){
     assert.equal(config.headers['x-goog-api-key'],secrets.HH_COUNCIL_GEMINI_API_KEY)
     return Response.json({name:'models/gemini-3.8-flash',
       supportedGenerationMethods:['generateContent']})
   }
   if(target.endsWith('/key')){
     assert.equal(config.headers.Authorization,'Bearer '+secrets.HH_COUNCIL_OPENROUTER_API_KEY)
     return Response.json({data:{is_free_tier:true,limit_remaining:5}})
   }
   if(target.endsWith('/models'))return Response.json({data:[
     {id:'mistralai/mistral-nemo:free',pricing:{prompt:'0',completion:'0',request:'0'}},
     {id:'mistralai/mistral-large',pricing:{prompt:'2',completion:'2'}}
   ]})
   throw Error('Unexpected endpoint')
 })
 assert.equal(calls.length,3)
 assert.ok(calls.every(x=>!x.target.includes('fake-')))
 assert.equal(result.gemini.authenticated,true)
 assert.equal(result.gemini.readyForChat,true)
 assert.equal(result.mistral.readyForChat,true)
 assert.equal(result.mistral.model,'mistralai/mistral-nemo:free')
 assert.equal(result.modelResponseTested,false)
 assert.doesNotMatch(JSON.stringify(result),/fake-google|fake-router|limit_remaining|user_id|api_key/)
})
test('unconfirmed Gemini flag or a nonfree Mistral catalog never reports ready',async()=>{
 const result=await inspectCouncilProviderKeys({
 HH_COUNCIL_GEMINI_API_KEY:'google',HH_COUNCIL_OPENROUTER_API_KEY:'router'
 },async(uri)=>{
  if(String(uri).includes('generativelanguage'))
   return Response.json({name:'models/gemini-3.8-flash',supportedGenerationMethods:['generateContent']})
  if(String(uri).endsWith('/key'))return Response.json({data:{is_free_tier:false}})
  return Response.json({data:[{id:'mistralai/paid-model',pricing:{prompt:'0.5',completion:'1'}}]})
 })
 assert.equal(result.gemini.authenticated,true)
 assert.equal(result.gemini.readyForChat,false)
 assert.equal(result.mistral.authenticated,true)
 assert.equal(result.mistral.freeMistralListed,false)
})
test('raw response, passwords, tokens and full provider billing metadata never leave endpoint',()=>{
 const r=readFileSync(new URL('../app/api/internal/council-provider-readiness/route.js',import.meta.url),'utf8')
 const m=readFileSync(new URL('../lib/practitioners/council-provider-readiness.mjs',import.meta.url),'utf8')
 assert.match(r,/councilProviderProbeAuthorized\(request.url,process.env\)/)
 assert.match(r,/PRIVATE_HEADERS/)
 assert.doesNotMatch(r,/POST|sendMessage|sendDocument|generateContent\(/)
 assert.match(m,/https:\/\/openrouter.ai\/api\/v1\/key/)
 assert.match(m,/https:\/\/generativelanguage.googleapis.com\/v1beta\/models\//)
 assert.doesNotMatch(m,/console\.log|process\.env\s*=|JSON\.stringify\(key\)/)
})
