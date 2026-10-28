import test from 'node:test'
import assert from 'node:assert/strict'
import { publicJourneyRequestDiagnostic as diagnostic, publicJourneyRequestDecision as decision, installPublicJourneyFence } from '../scripts/helpers/public-journey-verifier.mjs'
const origin='http://127.0.0.1:3100'
const path='/api/public/telegram-diagnostic'
const sample={url:origin+path,method:'GET',body:'',navigation:false,resourceType:'fetch',prefetch:false,prefetchSignals:{purposePrefetch:false,nextRouterPrefetch:false,rsc:false}}
test('source-proven exact alias stays redacted and fatal, never a public-read exemption',()=>{
 assert.equal(decision(sample,origin),'unplanned-route')
 const result=diagnostic(sample,'unplanned-route',origin)
 assert.equal(result.sourceId,'public-telegram-diagnostic-availability')
 assert.equal(result.path,'[redacted]')
 assert.equal(diagnostic(sample,'private-text',origin).sourceId,'redacted')
})
for(const [name,patch] of Object.entries({
 query:{url:origin+path+'?secret=PRIVATE_SENTINEL'},hash:{url:origin+path+'#PRIVATE_SENTINEL'},foreign:{url:'https://example.com'+path},credentials:{url:'http://u:p@127.0.0.1:3100'+path},normalized:{url:origin+'/api/public/x/../telegram-diagnostic'},encoded:{url:origin+'/api/public/%74elegram-diagnostic'},slash:{url:origin+path+'/'},unknown:{url:origin+'/api/private/PRIVATE_SENTINEL'},huge:{url:origin+path+'x'.repeat(9000)},post:{method:'POST'},head:{method:'HEAD'},body:{body:'PRIVATE_SENTINEL'},navigation:{navigation:true},resource:{resourceType:'xhr'},prefetch:{prefetch:true},rsc:{prefetchSignals:{purposePrefetch:false,nextRouterPrefetch:false,rsc:true}},missingSignals:{prefetchSignals:undefined},missingBody:{body:undefined},
}))test('no alias for '+name,()=>{
 const result=diagnostic({...sample,...patch},'unplanned-route',origin)
 assert.equal(result.sourceId,'unclassified')
 assert.ok(!JSON.stringify(result).includes('PRIVATE_SENTINEL'))
})
test('production and noncanonical origins do not acquire alias',()=>{
 for(const value of ['https://holistichouse.vercel.app','http://127.0.0.1:3100/'])assert.equal(diagnostic({...sample,url:value+path},'unplanned-route',value).sourceId,'unclassified')
})
test('fixed phase enum never changes abort behavior or logs arbitrary input',async()=>{
 let handler,aborted=0,continued=0,fulfilled=0
 const fence=await installPublicJourneyFence({route:async(_,fn)=>{handler=fn}},origin)
 const route={request:()=>({url:()=>sample.url,method:()=>sample.method,postData:()=>null,isNavigationRequest:()=>false,resourceType:()=>sample.resourceType,headers:()=>({})}),abort:async()=>{aborted++},continue:async()=>{continued++},fulfill:async()=>{fulfilled++}}
 for(const phase of ['business-initial','business-paid','business-return','business-mentoring','business-free','PRIVATE_SENTINEL',{},null]){
  fence.setDiagnosticPhase(phase);await handler(route)
 }
 const summary=fence.summary()
 assert.deepEqual(summary.requestDiagnostics.map(x=>x.phase),['business-initial','business-paid','business-return','business-mentoring','business-free','unclassified','unclassified','unclassified'])
 assert.equal(aborted,8);assert.equal(continued,0);assert.equal(fulfilled,0)
 assert.equal(summary.violations.length,8)
 assert.ok(!JSON.stringify(summary).includes('PRIVATE_SENTINEL'))
 assert.throws(()=>fence.assertNoSideEffects('synthetic-only'))
})
