import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {alchemyOrigin,alchemyService,assertAlchemyBody,permittedAlchemyRead,alchemyRequestGate,syntheticAlchemyReceipt,withAlchemyIsolation,ALCHEMY_CONTACT} from '../scripts/helpers/alchemy-enquiry-journey-verifier.mjs'
const origin='http://127.0.0.1:3100'
const body = locale => JSON.stringify({operationId:'27d6bba7-fede-49b3-90d8-c655b72202fd',serviceTitle:alchemyService(locale),description:'',sourcePath:`/${locale}/services/alchemy-of-soul`,locale,contact:{displayName:'',email:ALCHEMY_CONTACT,phone:''},contactConsent:true,website:''})
const request=(url,method='GET',type='fetch',raw=body('en'))=>({url:()=>url,method:()=>method,resourceType:()=>type,postData:()=>raw})
const route = req => { const log=[];return {log,request:()=>req,abort:async()=>log.push('abort'),fulfill:async x=>log.push(x),fetch:async options=>{log.push(options);return {url:req.url,status:()=>200,dispose:async()=>log.push('dispose')}}} }
for(const locale of ['en','ru']) test(locale+' exact source and payload',()=>{
 assert.equal(alchemyOrigin(origin+`/${locale}/services/alchemy-of-soul`,locale),origin)
 assertAlchemyBody(body(locale),locale)
})
for(const bad of ['https://127.0.0.1:3100','http://holistichouse.vercel.app:3100','http://localhost','http://user@localhost:3100']) test('reject origin '+bad,()=>assert.throws(()=>alchemyOrigin(bad+'/en/services/alchemy-of-soul','en')))
for(const suffix of ['?x=1','#request','/','/../contact']) test('reject source suffix '+suffix,()=>assert.throws(()=>alchemyOrigin(origin+'/en/services/alchemy-of-soul'+suffix,'en')))
for(const [path,type] of [['/en/thank-you','document'],['/en/thank-you?_rsc=ab-12_X','fetch'],['/_next/static/chunks/abc.js','script'],['/_next/static/chunks/app/%5Blocale%5D/thank-you/page-a1b2.js','script'],['/_next/static/chunks/app/[locale]/layout-a1b2.js','script'],['/_next/static/css/a.css','stylesheet'],['/_next/static/media/font.woff2','font'],['/images/holistic-house/portrait-static/andy-828-3dcbabded1e9.webp','image']]) test('allow exact read '+path,()=>assert.equal(permittedAlchemyRead(request(origin+path,'GET',type),origin,'en'),true))
for(const [url,method,type] of [
 [origin+'/api/service-enquiries','GET','fetch'],[origin+'/api/app/bootstrap','GET','fetch'],[origin+'/en/services','GET','fetch'],
 [origin+'/ru/thank-you','GET','document'],[origin+'/en/thank-you?contact=x','GET','fetch'],[origin+'/en/thank-you?_rsc=x&other=y','GET','fetch'],
 [origin+'/en/thank-you?_rsc=x&_rsc=y','GET','fetch'],[origin+'/en/thank-you?_rsc=x','GET','document'],
 [origin+'/en/thank-you','POST','fetch'],[origin+'/en/thank-you','DELETE','fetch'],
 ['https://evil.invalid/_next/static/a.js','GET','script'],[origin+'/_next/static/a.js?x=1','GET','script'],
 [origin+'/_next/static/a.js','GET','fetch'],[origin+'/_next/static/%2e%2e/a.js','GET','script'],[origin+'/_next/static/a..js','GET','script'],
 [origin+'/_next/image?url=https://evil.invalid','GET','image']]) test('deny read '+url+' '+method+' '+type,()=>assert.equal(permittedAlchemyRead(request(url,method,type),origin,'en'),false))
test('forward only zero-redirect verified real response',async()=>{
 const failures=[],blocked=[],r=route(request(origin+'/en/thank-you'))
 await alchemyRequestGate(origin,'en',()=>assert.fail(),failures,blocked)(r)
 assert.deepEqual(r.log[0],{maxRedirects:0});assert.equal(r.log[2],'dispose');assert.deepEqual(failures,[])
})
for(const status of [301,302,307,308,404,500]) test('reject read status '+status,async()=>{
 const failures=[],r=route(request(origin+'/en/thank-you'))
 r.fetch=async()=>({url:()=>origin+'/en/thank-you',status:()=>status,dispose:async()=>r.log.push('dispose')})
 await alchemyRequestGate(origin,'en',()=>assert.fail(),failures,[])(r)
 assert.equal(failures.length,1);assert.deepEqual(r.log,['dispose','abort'])
})
test('reject rewritten response and API/write attempts',async()=>{
 const failures=[],blocked=[],r=route(request(origin+'/en/thank-you'))
 r.fetch=async()=>({url:()=> 'https://evil.invalid',status:()=>200,dispose:async()=>{}})
 const gate=alchemyRequestGate(origin,'en',()=>assert.fail(),failures,blocked)
 await gate(r)
 for(const req of [request(origin+'/api/other'),request(origin+'/api/service-enquiries?x=1','POST'),request(origin+'/unknown','PUT')]) {const rr=route(req);await gate(rr);assert.deepEqual(rr.log,['abort'])}
 assert.equal(failures.length,4)
 const media=route(request('https://media.invalid/file.jpg','GET','image'));await gate(media)
 assert.deepEqual(media.log,['abort']);assert.equal(blocked.length,1)
})
test('synthetic 503 retry is byte-identical and never forwarded',async()=>{
 const receipt=syntheticAlchemyReceipt('en'),a=route(request(origin+'/api/service-enquiries','POST'))
 await receipt.accept(a);assert.equal(a.log[0].status,503)
 const b=route(request(origin+'/api/service-enquiries','POST'));await receipt.accept(b)
 assert.equal(receipt.pending,true);assert.deepEqual(b.log,[])
 await receipt.confirm();assert.equal(b.log[0].status,200);assert.equal(receipt.pending,false)
 await receipt.close();await assert.rejects(receipt.confirm(),/Stale/)
})
for(const change of ['serviceTitle','contactConsent','description','operationId','contact','website','sourcePath','locale','extra']) test('reject changed payload '+change,async()=>{
 const receipt=syntheticAlchemyReceipt('en');await receipt.accept(route(request(origin+'/api/service-enquiries','POST')))
 const next=JSON.parse(body('en'));next[change]=change==='contactConsent'?false:'changed'
 await assert.rejects(receipt.accept(route(request(origin+'/api/service-enquiries','POST','fetch',JSON.stringify(next)))))
})
test('reject whitespace-changed serialized retry and duplicate third request',async()=>{
 const receipt=syntheticAlchemyReceipt('en');await receipt.accept(route(request(origin+'/api/service-enquiries','POST')))
 await assert.rejects(receipt.accept(route(request(origin+'/api/service-enquiries','POST','fetch',body('en')+' '))),/byte-identical/)
 await receipt.accept(route(request(origin+'/api/service-enquiries','POST')));await receipt.confirm()
 await assert.rejects(receipt.accept(route(request(origin+'/api/service-enquiries','POST'))),/At most/)
})
test('cleanup aborts held outcome and closes operation before abort completes',async()=>{
 const receipt=syntheticAlchemyReceipt('en');await receipt.accept(route(request(origin+'/api/service-enquiries','POST')))
 const held=route(request(origin+'/api/service-enquiries','POST'));await receipt.accept(held)
 held.abort=async()=>{await assert.rejects(receipt.confirm(),/Stale/);held.log.push('abort')}
 await receipt.close();assert.deepEqual(held.log,['abort']);await assert.rejects(receipt.accept(held),/closes/)
})
for(const fault of ['route','setup','run','abort','restore','close']) test('partial failure cleanup '+fault,async()=>{
 const calls=[];let evaluations=0
 const page={route:async()=>{calls.push('route');if(fault==='route')throw Error('primary')},evaluate:async()=>{evaluations++;const name=evaluations===1?'setup':'restore';calls.push(name);if(fault===name)throw Error(name)},close:async()=>{calls.push('close');if(fault==='close')throw Error('close')}}
 page.context=()=>page
 const receipt={close:async()=>{calls.push('abort');if(fault==='abort')throw Error('abort')}}
 await assert.rejects(withAlchemyIsolation(page,()=>{},receipt,false,async()=>{calls.push('run');if(fault==='run')throw Error('run')}))
 assert.ok(calls.includes('abort'));assert.ok(calls.includes('close'))
 assert.ok(calls.filter(x=>['setup','restore'].includes(x)).length>=1)
})
test('primary failure remains primary despite cleanup faults',async()=>{
 const primary=Error('original');const page={route:async()=>{},evaluate:async()=>{throw primary},close:async()=>{throw Error('cleanup')}}
 page.context=()=>page
 await assert.rejects(withAlchemyIsolation(page,()=>{},{close:async()=>{throw Error('abort')}},false,()=>{}),error=>error===primary)
})
test('integration keeps real routing, dedicated context and both scenarios',async()=>{
 const source=await readFile(new URL('../scripts/verify-app-r1.mjs',import.meta.url),'utf8')
 assert.match(source,/kind==='dao'\|\|kind==='alchemy'\?await browser.newContext\(\{serviceWorkers:'block'\}\)/)
 assert.match(source,/verifyAlchemyEnquiryJourney\(servicePage,expect,locale\)/)
 assert.match(source,/verifyAlchemyEnquiryJourney\(servicePage,expect,locale,\{denyReceiptStorage:true\}\)/)
 assert.match(source,/assertAlchemyPanelOrder\(measurements\)/)
 assert.match(source,/for\(const width of \[320,360,390,1280\]\)/)
 const helper=await readFile(new URL('../scripts/helpers/alchemy-enquiry-journey-verifier.mjs',import.meta.url),'utf8')
 assert.doesNotMatch(helper,/stayAfterSave|route\.continue\(|route\.fallback\(|router\.push\s*=/)
 assert.match(helper,/toHaveURL\(origin\+`\/\$\{locale\}\/thank-you`\)/)
})

test('context stays guarded until close and drains late allowed-read failure',async()=>{
 let handler,resolveRead,settled=false,closed=false
 const failures=[]
 const pendingRead=new Promise(resolve=>{resolveRead=resolve})
 const r=route(request(origin+'/en/thank-you'))
 r.fetch=async()=>pendingRead
 const page={context:()=>ctx,evaluate:async()=>{}}
 const ctx={route:async(_pattern,fn)=>{handler=fn},close:async()=>{closed=true}}
 const result=withAlchemyIsolation(page,alchemyRequestGate(origin,'en',()=>assert.fail(),failures,[]),{close:async()=>{}},false,async()=>{
   void handler(r)
   return 'pre-cleanup snapshot'
 }).then(value=>{settled=true;return value})
 await new Promise(resolve=>setImmediate(resolve))
 assert.equal(closed,true);assert.equal(settled,false,'Cannot return before active read settles')
 resolveRead({url:()=>origin+'/en/thank-you',status:()=>500,dispose:async()=>{}})
 await result
 assert.equal(failures.length,1,'Caller terminal assertion receives the late failure')
 assert.equal(r.log.at(-1),'abort')
})
test('a write arriving during context close remains intercepted, never forwarded',async()=>{
 let handler,called=false
 const failures=[]
 const page={context:()=>ctx,evaluate:async()=>{}}
 const unexpected=route(request(origin+'/api/other','POST'))
 const ctx={route:async(_pattern,fn)=>{handler=fn},close:async()=>{called=true;await handler(unexpected)}}
 await withAlchemyIsolation(page,alchemyRequestGate(origin,'en',()=>assert.fail(),failures,[]),{close:async()=>{}},false,async()=>{})
 assert.equal(called,true);assert.deepEqual(unexpected.log,['abort']);assert.equal(failures.length,1)
})

test('evaluated shim denies only receipt session write and restores popup/storage originals',async()=>{
 const {runInNewContext}=await import('node:vm')
 class FakeStorage { constructor(){this.values=new Map()} setItem(k,v){this.values.set(k,String(v))} getItem(k){return this.values.get(k)??null} removeItem(k){this.values.delete(k)} }
 const sessionStorage=new FakeStorage(),localStorage=new FakeStorage(),realOpen=()=>assert.fail('Real messenger must not open')
 const sandbox={Storage:FakeStorage,sessionStorage,localStorage,DOMException,window:{open:realOpen}}
 let closed=false
 const page={context:()=>({route:async()=>{},close:async()=>{closed=true}}),evaluate:async(fn,arg)=>runInNewContext('('+fn.toString()+')('+JSON.stringify(arg)+')',sandbox)}
 const original=FakeStorage.prototype.setItem
 await withAlchemyIsolation(page,()=>{},{close:async()=>{}},true,async()=>{
   assert.throws(()=>sessionStorage.setItem('hh-service-enquiry-receipt:v1','fake'),/Synthetic receipt-only/)
   sessionStorage.setItem('other','allowed');localStorage.setItem('hh-service-enquiry-receipt:v1','allowed')
   assert.equal(sessionStorage.getItem('other'),'allowed');assert.equal(localStorage.getItem('hh-service-enquiry-receipt:v1'),'allowed')
   assert.equal(sandbox.window.open('https://wa.me/123'),null)
   assert.equal(sandbox.window.__alchemyFixture.opens[0],'https://wa.me/123')
 })
 assert.equal(closed,true);assert.equal(FakeStorage.prototype.setItem,original);assert.equal(sandbox.window.open,realOpen)
 assert.equal(sandbox.window.__alchemyFixture,undefined)
})

for (const [field,value] of [['contactConsent',false],['description','private text'],['serviceTitle','Alchemy only'],['operationId','not-a-uuid'],['contact',{displayName:'',email:'other@example.invalid',phone:''}],['sourcePath','/en/other'],['website','spam']]) test('first request rejects invalid '+field,()=>{
 const bad=JSON.parse(body('en'));bad[field]=value
 assert.throws(()=>assertAlchemyBody(JSON.stringify(bad),'en'))
})
