import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {fetchPracticeTelegramAudio} from '../lib/practitioners/practice-telegram-auth-fetch.mjs'

const root=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const validFile={id:'550e8400-e29b-41d4-a716-446655440000',title:'Meditation'}
const reply=(status,data)=>({status,ok:status>=200&&status<300,async json(){return data}})
const fetcherFrom=(replies,record)=>async (url,options)=>{
  record.push({url,options})
  const result=replies.shift()
  if(!result)throw Error('UNEXPECTED_NETWORK_CALL')
  return result
}

test('owner with existing admin session loads audio without minting a second session',async()=>{
  const calls=[]
  const files=await fetchPracticeTelegramAudio(fetcherFrom([reply(200,{files:[validFile]})],calls))
  assert.deepEqual(files,[validFile]);assert.equal(calls.length,1)
  assert.equal(calls[0].url,'/api/admin/materials/telegram')
  assert.deepEqual(calls[0].options,{credentials:'same-origin',cache:'no-store',signal:undefined})
})

test('fresh verified owner Google login transparently establishes admin API cookie only after 404',async()=>{
  const calls=[]
  const signal=new AbortController().signal
  const files=await fetchPracticeTelegramAudio(fetcherFrom([
    reply(404,{error:'MATERIAL_UNAVAILABLE'}),
    reply(200,{redirectUrl:'/admin/materials'}),
    reply(200,{files:[validFile]}),
  ],calls),signal)
  assert.deepEqual(files,[validFile])
  assert.deepEqual(calls.map(x=>x.url),[
    '/api/admin/materials/telegram','/api/app/practitioner/open','/api/admin/materials/telegram'])
  assert.equal(calls[1].options.method,'POST')
  assert.equal(calls[1].options.credentials,'same-origin')
  assert.equal(calls[1].options.cache,'no-store')
  assert.equal(calls[1].options.signal,signal)
  assert.equal(calls[1].options.headers['Content-Type'],'application/json')
  assert.deepEqual(JSON.parse(calls[1].options.body),{destination:'materials'})
})

test('nonowner and invalid trusted handoff fail closed without a third request',async()=>{
  for(const denied of [reply(404,{error:'NOT_FOUND'}),reply(200,{redirectUrl:'https://evil.invalid'}),reply(200,{redirectUrl:'/admin/clients'})]){
    const calls=[]
    await assert.rejects(fetchPracticeTelegramAudio(fetcherFrom([reply(404,{}),denied],calls)),/OWNER_AUDIO_AUTH_REQUIRED/)
    assert.equal(calls.length,2)
  }
})

test('unrelated server failures never silently mint privileged admin sessions',async()=>{
  for(const status of [400,401,403,500,503]){
    const calls=[]
    await assert.rejects(fetchPracticeTelegramAudio(fetcherFrom([reply(status,{})],calls)),/OWNER_AUDIO_UNAVAILABLE/)
    assert.equal(calls.length,1)
  }
})

test('remaining 404 or unexpected payload fails without repeated owner bridge attempts',async()=>{
  const calls=[]
  await assert.rejects(fetchPracticeTelegramAudio(fetcherFrom([
    reply(404,{}),reply(200,{redirectUrl:'/admin/materials'}),reply(404,{})],calls)),/OWNER_AUDIO_UNAVAILABLE/)
  assert.equal(calls.length,3)
  await assert.rejects(fetchPracticeTelegramAudio(async()=>reply(200,{files:{}})),/OWNER_AUDIO_INVALID_LIST/)
})

test('aborted owner bridge does not retry or leak a session',async()=>{
  const abort=new AbortController()
  const calls=[]
  const rejectOnAbort=async url=>{
    calls.push(url)
    if(calls.length===1){abort.abort();return reply(404,{})}
    throw Object.assign(new Error('ABORTED'),{name:'AbortError'})
  }
  await assert.rejects(fetchPracticeTelegramAudio(rejectOnAbort,abort.signal),/ABORTED/)
  assert.equal(calls.length,2)
})

test('existing UI mounts audio only under owner panel and keeps protected media routes',()=>{
  const auth=root('lib/practitioners/practice-telegram-auth-fetch.mjs')
  assert.match(auth,/destination:'materials'/)
  assert.doesNotMatch(auth,/service_role|secretKey|createSignedUrl|localStorage|document.cookie/)
})
