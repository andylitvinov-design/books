import test from 'node:test'
import assert from 'node:assert/strict'
import { assertDaoLoopback, assertDaoRequest, DAO_CONTACT, DAO_SERVICE } from '../scripts/helpers/dao-lead-journey-verifier.mjs'
import { daoRequestGate, withDaoIsolation } from '../scripts/helpers/dao-lead-journey-verifier.mjs'

for (const locale of ['en','ru']) {
  test('loopback DAO guard accepts only exact route: '+locale, () => {
    assert.equal(assertDaoLoopback('http://127.0.0.1:3100/'+locale+'/services/dao-health-profile',locale),'http://127.0.0.1:3100')
    assert.equal(assertDaoLoopback('http://localhost:3100/'+locale+'/services/dao-health-profile#request-free-wu-xing',locale),'http://localhost:3100')
  })
}
for (const raw of ['https://holistichouse.vercel.app/en/services/dao-health-profile','http://localhost.evil:3100/en/services/dao-health-profile','http://localhost/en/services/dao-health-profile','http://user:pass@localhost:3100/en/services/dao-health-profile','http://localhost:3100/en/services/other','http://localhost:3100/en/services/dao-health-profile?x=1']) {
  test('guard rejects '+raw, () => assert.throws(()=>assertDaoLoopback(raw,'en')))
}
const valid=()=>({operationId:'12345678-1234-4123-8123-123456789abc',serviceTitle:DAO_SERVICE,description:'Preferred reply channel: WhatsApp',sourcePath:'/en/services/dao-health-profile',locale:'en',contact:{displayName:'',email:DAO_CONTACT,phone:''},contactConsent:true,website:''})
test('strict synthetic payload accepted',()=>assertDaoRequest(valid(),'en'))
for (const [key,value] of Object.entries({contactConsent:false,serviceTitle:'other',sourcePath:'/en/services/other',locale:'ru',operationId:'invalid',description:'private text',website:'spam',contact:{email:'real@example.org'}})) {
  test('reject payload drift: '+key,()=>assert.throws(()=>assertDaoRequest({...valid(),[key]:value},'en')))
}
test('reject extra private fields',()=>assert.throws(()=>assertDaoRequest({...valid(),answers:['private']},'en')))

for (const [url, method] of [
  ['http://localhost:3100/api/service-enquiries?contact=synthetic','POST'],
  ['http://localhost:3100/api/other','POST'],
  ['http://localhost:3100/api/service-enquiries','GET'],
  ['http://localhost:3100/api/service-enquiries','PUT'],
  ['https://example.invalid/api/service-enquiries','POST'],
  ['https://example.invalid/?synthetic=1','GET'],
]) {
  test('broad route guard aborts unexpected '+method+' '+url, async()=>{
    const events=[], errors=[]
    const gate=daoRequestGate('http://localhost:3100',async()=>events.push('accept'),errors)
    await gate({request:()=>({url:()=>url,method:()=>method}),abort:async()=>events.push('abort'),continue:async()=>events.push('continue'),fallback:async()=>events.push('fallback')})
    assert.deepEqual(events,['abort']);assert.equal(errors.length,1)
  })
}
test('exact POST enters synthetic handler only',async()=>{
  const events=[],errors=[]
  await daoRequestGate('http://localhost:3100',async()=>events.push('synthetic'),errors)({request:()=>({url:()=> 'http://localhost:3100/api/service-enquiries',method:()=> 'POST'}),continue:async()=>events.push('continue')})
  assert.deepEqual(events,['synthetic']);assert.deepEqual(errors,[])
})

for (const fault of ['route','setup','run','abort','restore','unroute']) {
  test('all cleanup attempted after '+fault+' failure',async()=>{
    const events=[];let evaluates=0;const original=new Error(fault)
    const hit=async name=>{events.push(name);if(name===fault)throw original}
    const page={route:async pattern=>{assert.equal(pattern,'**/*');await hit('route')},
      evaluate:async()=>hit(++evaluates===1&&fault!=='route'?'setup':'restore'),
      unroute:async pattern=>{assert.equal(pattern,'**/*');await hit('unroute')}}
    const error=await withDaoIsolation(page,()=>{},()=>hit('run'),()=>hit('abort')).catch(e=>e)
    assert.ok(error instanceof Error)
    assert.ok(events.includes('abort')&&events.includes('restore')&&events.includes('unroute'))
    if(['route','setup','run'].includes(fault))assert.equal(error,original)
  })
}
test('primary failure is preserved despite all cleanup failures',async()=>{
  const events=[];let evaluateCount=0;const original=new Error('primary')
  const page={route:async()=>{},evaluate:async()=>{if(evaluateCount++) {events.push('restore');throw Error('restore')}},unroute:async()=>{events.push('unroute');throw Error('unroute')}}
  await assert.rejects(withDaoIsolation(page,()=>{},async()=>{throw original},async()=>{events.push('abort');throw Error('abort')}),e=>e===original)
  assert.deepEqual(events,['abort','restore','unroute'])
})
