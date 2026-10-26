import {createCompactAlchemyRegistrationProfile} from '../scripts/helpers/contact-channel-verifier.mjs'
import {alchemyJourneyComponentFixture} from './helpers/alchemy-journey-component-fixture.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {alchemyOrigin,alchemyService,assertAlchemyBody,permittedAlchemyRead,alchemyRequestGate,syntheticAlchemyReceipt,withAlchemyIsolation,alchemyBoundarySummary,ALCHEMY_PHONE,ALCHEMY_REFERENCE,verifyAlchemyEnquiryJourney} from '../scripts/helpers/alchemy-enquiry-journey-verifier.mjs'
const origin='http://127.0.0.1:3100'
const body = locale => JSON.stringify({operationId:'27d6bba7-fede-49b3-90d8-c655b72202fd',serviceTitle:alchemyService(locale),description:locale==='ru'?'Формат: Экспресс · 30 минут · €50':'Format: Express review · 30 min · €50',sourcePath:`/${locale}/services/alchemy-of-soul`,locale,contact:{displayName:'',email:'',phone:ALCHEMY_PHONE},contactConsent:true,website:''})
const request=(url,method='GET',type='fetch',raw=body('en'))=>({url:()=>url,method:()=>method,resourceType:()=>type,postData:()=>raw})
const route = req => { const log=[];return {log,request:()=>req,abort:async()=>log.push('abort'),fulfill:async x=>log.push(x),fetch:async options=>{log.push(options);return {url:req.url,status:()=>200,dispose:async()=>log.push('dispose')}}} }
const acceptReceipt=async(receipt,route)=>{receipt.arm();return receipt.accept(route)}
// Context bootstrap is the modern entry boundary. The actual supplied page
// remains guarded through final context close; no new page exists before route.
function bootstrapContext({route=async()=>{},close=async()=>{},evaluate=async()=>{},onInit=async()=>{},exposeBinding=async()=>{}}={}) {
 const page={evaluate,isClosed:()=>false}
 let init
 return {route,close,routeWebSocket:async()=>{},exposeBinding,on:()=>{},
   addInitScript:async(fn,arg)=>{init=()=>evaluate(fn,arg);await onInit()},
   newPage:async()=>{await init();return page}}
}
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
 await acceptReceipt(receipt,a);assert.equal(a.log[0].status,503)
 const b=route(request(origin+'/api/service-enquiries','POST'));await acceptReceipt(receipt,b)
 assert.equal(receipt.pending,true);assert.deepEqual(b.log,[])
 await receipt.confirm();assert.equal(b.log[0].status,200);assert.equal(receipt.pending,false)
 await receipt.close();await assert.rejects(receipt.confirm(),/Stale/)
})
for(const change of ['serviceTitle','contactConsent','description','operationId','contact','website','sourcePath','locale','extra']) test('reject changed payload '+change,async()=>{
 const receipt=syntheticAlchemyReceipt('en');await acceptReceipt(receipt,route(request(origin+'/api/service-enquiries','POST')))
 const next=JSON.parse(body('en'));next[change]=change==='contactConsent'?false:'changed'
 await assert.rejects(acceptReceipt(receipt,route(request(origin+'/api/service-enquiries','POST','fetch',JSON.stringify(next)))))
})
test('reject whitespace-changed serialized retry and duplicate third request',async()=>{
 const receipt=syntheticAlchemyReceipt('en');await acceptReceipt(receipt,route(request(origin+'/api/service-enquiries','POST')))
 await assert.rejects(acceptReceipt(receipt,route(request(origin+'/api/service-enquiries','POST','fetch',body('en')+' '))),/byte-identical/)
 await acceptReceipt(receipt,route(request(origin+'/api/service-enquiries','POST')));await receipt.confirm()
 await assert.rejects(acceptReceipt(receipt,route(request(origin+'/api/service-enquiries','POST'))),/At most/)
})
test('cleanup aborts held outcome and closes operation before abort completes',async()=>{
 const receipt=syntheticAlchemyReceipt('en');await acceptReceipt(receipt,route(request(origin+'/api/service-enquiries','POST')))
 const held=route(request(origin+'/api/service-enquiries','POST'));await acceptReceipt(receipt,held)
 held.abort=async()=>{await assert.rejects(receipt.confirm(),/Stale/);held.log.push('abort')}
 await receipt.close();assert.deepEqual(held.log,['abort']);await assert.rejects(acceptReceipt(receipt,held),/closes/)
})
for(const fault of ['route','setup','run','abort','restore','close']) test('partial failure cleanup '+fault,async()=>{
 const calls=[];let evaluations=0
 const context=bootstrapContext({route:async()=>{calls.push('route');if(fault==='route')throw Error('primary')},evaluate:async()=>{evaluations++;const name=evaluations===1?'setup':'restore';calls.push(name);if(fault===name)throw Error(name)},close:async()=>{calls.push('close');if(fault==='close')throw Error('close')}})
 const receipt={close:async()=>{calls.push('abort');if(fault==='abort')throw Error('abort')}}
 await assert.rejects(withAlchemyIsolation(context,()=>{},receipt,false,async()=>{calls.push('run');if(fault==='run')throw Error('run')}))
 assert.ok(calls.includes('abort'));assert.ok(calls.includes('close'))
 if(fault!=='route')assert.ok(calls.includes('setup'))
 if(!['route','setup'].includes(fault))assert.ok(calls.includes('restore'))
})
test('primary failure remains primary despite cleanup faults',async()=>{
 const primary=Error('original');const context=bootstrapContext({evaluate:async()=>{throw primary},close:async()=>{throw Error('cleanup')}})
 await assert.rejects(withAlchemyIsolation(context,()=>{},{close:async()=>{throw Error('abort')}},false,()=>{}),error=>error===primary)
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
 assert.match(helper,/toHaveURL\(originalURL\)/)
 assert.match(helper,/initialDocument:true,allowReceipt:false/)
})

test('context stays guarded until close and drains late allowed-read failure',async()=>{
 let handler,resolveRead,settled=false,closed=false
 const failures=[]
 const pendingRead=new Promise(resolve=>{resolveRead=resolve})
 const r=route(request(origin+'/en/thank-you'))
 r.fetch=async()=>pendingRead
 const page={context:()=>ctx,evaluate:async()=>{}}
 const ctx={route:async(_pattern,fn)=>{handler=fn},close:async()=>{closed=true}}
 const result=withAlchemyIsolation(bootstrapContext({...ctx,evaluate:page.evaluate}),alchemyRequestGate(origin,'en',()=>assert.fail(),failures,[]),{close:async()=>{}},false,async()=>{
   void handler(r)
   return 'pre-cleanup snapshot'
 }).then(value=>{settled=true;return value})
 await new Promise(resolve=>setImmediate(resolve))
 assert.equal(closed,false,'Context must remain alive until active reads settle');assert.equal(settled,false,'Cannot return before active read settles')
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
 await withAlchemyIsolation(bootstrapContext({...ctx,evaluate:page.evaluate}),alchemyRequestGate(origin,'en',()=>assert.fail(),failures,[]),{close:async()=>{}},false,async()=>{})
 assert.equal(called,true);assert.deepEqual(unexpected.log,['abort']);assert.equal(failures.length,1)
})

test('evaluated shim denies only receipt session write and restores popup/storage originals',async()=>{
 const {runInNewContext}=await import('node:vm')
 class FakeStorage { constructor(){this.values=new Map()} setItem(k,v){this.values.set(k,String(v))} getItem(k){return this.values.get(k)??null} removeItem(k){this.values.delete(k)} }
 const sessionStorage=new FakeStorage(),localStorage=new FakeStorage(),realOpen=()=>assert.fail('Real messenger must not open')
 let popupAttempts=0
 const sandbox={Storage:FakeStorage,sessionStorage,localStorage,DOMException,window:{open:realOpen,__alchemyUnexpectedPopup:async()=>{popupAttempts++}}}
 let closed=false
 const page={context:()=>({route:async()=>{},close:async()=>{closed=true}}),evaluate:async(fn,arg)=>runInNewContext('('+fn.toString()+')('+JSON.stringify(arg)+')',sandbox)}
 const original=FakeStorage.prototype.setItem
 await assert.rejects(withAlchemyIsolation(bootstrapContext({...page.context(),evaluate:page.evaluate,exposeBinding:async(name,callback)=>{sandbox.window[name]=async()=>{popupAttempts++;callback()}}}),()=>{},{close:async()=>{}},true,async()=>{
   assert.throws(()=>sessionStorage.setItem('hh-service-enquiry-receipt:v1','fake'),/Synthetic receipt-only/)
   sessionStorage.setItem('other','allowed');localStorage.setItem('hh-service-enquiry-receipt:v1','allowed')
   assert.equal(sessionStorage.getItem('other'),'allowed');assert.equal(localStorage.getItem('hh-service-enquiry-receipt:v1'),'allowed')
   assert.equal(sandbox.window.open('https://wa.me/123'),null)
   assert.equal(sandbox.window.__alchemyFixture.opens,1);assert.equal(popupAttempts,1)
 }),/No unowned popup/)
 assert.equal(closed,true);assert.equal(FakeStorage.prototype.setItem,original);assert.equal(sandbox.window.open,realOpen)
 assert.equal(sandbox.window.__alchemyFixture,undefined)
})

for (const [field,value] of [['contactConsent',false],['description','private text'],['serviceTitle','Alchemy only'],['operationId','not-a-uuid'],['contact',{displayName:'',email:'other@example.invalid',phone:''}],['sourcePath','/en/other'],['website','spam']]) test('first request rejects invalid '+field,()=>{
 const bad=JSON.parse(body('en'));bad[field]=value
 assert.throws(()=>assertAlchemyBody(JSON.stringify(bad),'en'))
})


for (const [path,type] of [['/_next/static/chunks/app/%5Blocale%5D/thank-you/page.js','script'],['/_next/static/chunks/app/[locale]/layout.js','script'],['/_next/static/css/app/[locale]/thank-you/page.css','stylesheet']]) test('Next15 development timestamp '+type+' '+path,()=>{
 assert.equal(permittedAlchemyRead(request(origin+path+'?v=1792874902222','GET',type),origin,'en'),true)
})
for (const query of ['?v=1792874902222&contact=private','?v=1792874902222&v=1792874902222','?v=1792874902222&dpl=anything','?v=abc','?v=0000000000000','?v=1','?v=17928749022222222222','?v=-1792874902222','?v=1792874902222.0','?%76=1792874902222','?v=%31%37%39%32%38%37%34%39%30%32%32%32%32','?v=1792874902222#fragment']) test('reject noncanonical static query '+query,()=>{
 assert.equal(permittedAlchemyRead(request(origin+'/_next/static/chunks/a.js'+query,'GET','script'),origin,'en'),false)
})
for (const [url,method,type] of [
 ['https://external.invalid/_next/static/a.js?v=1792874902222','GET','script'],
 [origin+'/_next/static/a.js?v=1792874902222','POST','script'],
 [origin+'/_next/static/a.js?v=1792874902222','GET','fetch'],
 [origin+'/_next/static/a.woff2?v=1792874902222','GET','font'],
 [origin+'/images/holistic-house/portrait-static/andy-828-3dcbabded1e9.webp?v=1792874902222','GET','image'],
 [origin+'/api/service-enquiries?v=1792874902222','GET','script'],
 [origin+'/en/thank-you?v=1792874902222','GET','document'],
 [origin+'/_next/static/%2e%2e/a.js?v=1792874902222','GET','script'],
]) test('timestamp cannot escape boundary '+url+' '+method+' '+type,()=>assert.equal(permittedAlchemyRead(request(url,method,type),origin,'en'),false))
test('failure summary preserves safe asset evidence but omits arbitrary paths and query values',()=>{
 const evidence=alchemyBoundarySummary([
 {path:'/_next/static/chunks/app/%5Blocale%5D/thank-you/page.js',type:'script',queryKind:'next-dev-version'},
 {path:'/private-personal-path',type:'fetch',queryKind:'other'},
 ],['private error text'],2,false)
 assert.equal(evidence.completed,false);assert.equal(evidence.requestCount,2);assert.equal(evidence.failureCount,1)
 assert.equal(evidence.blocked[0].asset,'/_next/static/chunks/app/%5Blocale%5D/thank-you/page.js')
 assert.equal(evidence.blocked[1].asset,'other');assert.ok(!JSON.stringify(evidence).includes('private'))
})
test('boundary evidence is emitted in finally even when receipt assertion fails',async()=>{
 const source=await readFile(new URL('../scripts/helpers/alchemy-enquiry-journey-verifier.mjs',import.meta.url),'utf8')
 assert.match(source,/finally \{\s*console\.log\('SYNTHETIC_ALCHEMY_BOUNDARY'/)
 assert.match(source,/toContainText\(ALCHEMY_REFERENCE\)/)
 assert.doesNotMatch(source,/timeout:\s*\d+/)
})


for (const hash of ['2ba7c186341a9797','1f7cd850e9eda570']) test('observed Next15 webpack HMR manifest '+hash,()=>{
 assert.equal(permittedAlchemyRead(request(origin+'/_next/static/webpack/'+hash+'.webpack.hot-update.json'),origin,'en'),true)
})
for (const path of [
 '/_next/static/webpack/2ba7c186341a9797.webpack.hot-update.json?v=1792874902222',
 '/_next/static/webpack/2ba7c186341a9797.webpack.hot-update.json?x=1',
 '/_next/static/webpack/2ba7c186341a9797.webpack.hot-update.json#x',
 '/_next/static/webpack/2BA7C186341A9797.webpack.hot-update.json',
 '/_next/static/webpack/2ba7c186341a979.webpack.hot-update.json',
 '/_next/static/webpack/2ba7c186341a97977.webpack.hot-update.json',
 '/_next/static/webpack/2ba7c186341a979z.webpack.hot-update.json',
 '/_next/static/webpack/2ba7c186341a9797.other.hot-update.json',
 '/_next/static/webpack/app/2ba7c186341a9797.webpack.hot-update.json',
 '/_next/static/chunks/2ba7c186341a9797.webpack.hot-update.json',
 '/_next/static/webpack/arbitrary.json',
 '/api/2ba7c186341a9797.webpack.hot-update.json',
 '/en/services/alchemy-of-soul',
]) test('reject broadened HMR read '+path,()=>assert.equal(permittedAlchemyRead(request(origin+path),origin,'en'),false))
for (const [prefix,method,type] of [
 ['https://external.invalid','GET','fetch'],['http://localhost:3101','GET','fetch'],['http://user@127.0.0.1:3100','GET','fetch'],
 [origin,'POST','fetch'],[origin,'HEAD','fetch'],[origin,'GET','document'],[origin,'GET','xhr'],[origin,'GET','script'],[origin,'GET','other']
]) test('HMR cannot relax origin, method or type '+prefix+' '+method+' '+type,()=>assert.equal(permittedAlchemyRead(request(prefix+'/_next/static/webpack/2ba7c186341a9797.webpack.hot-update.json',method,type),origin,'en'),false))
test('HMR manifest uses the existing zero-redirect real read path',async()=>{
 const failures=[],blocked=[],r=route(request(origin+'/_next/static/webpack/2ba7c186341a9797.webpack.hot-update.json'))
 await alchemyRequestGate(origin,'en',()=>assert.fail('Must not call synthetic POST handler'),failures,blocked)(r)
 assert.deepEqual(r.log[0],{maxRedirects:0});assert.equal(r.log[2],'dispose')
 assert.deepEqual(failures,[]);assert.deepEqual(blocked,[])
})
test('HMR redirect is still rejected rather than fetched externally',async()=>{
 const failures=[],r=route(request(origin+'/_next/static/webpack/2ba7c186341a9797.webpack.hot-update.json'))
 r.fetch=async options=>{assert.deepEqual(options,{maxRedirects:0});return{url:()=>r.request().url(),status:()=>302,dispose:async()=>r.log.push('dispose')}}
 await alchemyRequestGate(origin,'en',()=>assert.fail(),failures,[])(r)
 assert.equal(failures.length,1);assert.deepEqual(r.log,['dispose','abort'])
})

test('admitted portrait fetch settles before context disposal; newly arriving reads never fetch',async()=>{
 let handler,release,closed=false,finished=false
 const failures=[],blocked=[]
 const ready=new Promise(resolve=>{release=resolve})
 const path=origin+'/images/holistic-house/portrait-static/andy-828-3dcbabded1e9.webp'
 const admitted=route(request(path,'GET','image'))
 admitted.fetch=async()=>{await ready;if(closed)throw Error('Request context disposed');return {url:()=>path,status:()=>200,dispose:async()=>{finished=true}}}
 const late=route(request(path,'GET','image'))
 late.fetch=async()=>assert.fail('No new fetch may start after teardown')
 const ctx={route:async(_pattern,fn)=>{handler=fn},close:async()=>{assert.equal(finished,true);closed=true;await handler(late)}}
 const page={context:()=>ctx,evaluate:async()=>{}}
 const result=withAlchemyIsolation(bootstrapContext({...ctx,evaluate:page.evaluate}),alchemyRequestGate(origin,'en',()=>assert.fail(),failures,blocked),{close:async()=>{}},false,async()=>{void handler(admitted)})
 await new Promise(resolve=>setImmediate(resolve))
 assert.equal(closed,false)
 release();await result
 assert.equal(closed,true);assert.equal(finished,true)
 assert.deepEqual(failures,[]);assert.deepEqual(late.log,['abort'])
 assert.equal(admitted.log.length,1,'Original real response is fulfilled, not discarded')
})

test('teardown retains unexpected API/write errors and closed synthetic receipt rejection',async()=>{
 const failures=[],receipt=syntheticAlchemyReceipt('en')
 const gate=alchemyRequestGate(origin,'en',route=>acceptReceipt(receipt,route),failures,[])
 gate.beginTeardown();await receipt.close()
 for(const req of [request(origin+'/api/private'),request(origin+'/api/other','POST'),request(origin+'/api/service-enquiries','POST')]) {
   const r=route(req);r.fetch=async()=>assert.fail('Never forward API');await gate(r);assert.deepEqual(r.log,['abort'])
 }
 assert.equal(failures.length,3)
 assert.match(failures[2],/fixture closes/)
})

for(const fault of ['fetch','fulfill','dispose']) test('admitted read '+fault+' failure survives teardown',async()=>{
 let handler,release
 const ready=new Promise(resolve=>{release=resolve}),failures=[]
 const r=route(request(origin+'/en/thank-you'))
 r.fetch=async()=>{await ready;if(fault==='fetch')throw Error('actual-fetch');return {url:()=>origin+'/en/thank-you',status:()=>200,dispose:async()=>{if(fault==='dispose')throw Error('actual-dispose')}}}
 if(fault==='fulfill')r.fulfill=async()=>{throw Error('actual-fulfill')}
 const page={context:()=>ctx,evaluate:async()=>{}}
 const ctx={route:async(_pattern,fn)=>{handler=fn},close:async()=>{}}
 const result=withAlchemyIsolation(bootstrapContext({...ctx,evaluate:page.evaluate}),alchemyRequestGate(origin,'en',()=>assert.fail(),failures,[]),{close:async()=>{}},false,async()=>{void handler(r)})
 await new Promise(resolve=>setImmediate(resolve));release();await result
 assert.deepEqual(failures,['actual-'+fault]);assert.equal(r.log.at(-1),'abort')
})

// Additional compact profiles, strict popup and actual-component adapter coverage.
{
const origin='http://127.0.0.1:3000',path='/en/services/alchemy-of-soul'
function body(locale='en') {
 const p=createCompactAlchemyRegistrationProfile(`${origin}/${locale}/services/alchemy-of-soul`,{referenceCode:ALCHEMY_REFERENCE})
 return {operationId:'11111111-1111-4111-8111-111111111111',serviceTitle:p.serviceTitle,description:p.description,sourcePath:p.sourcePath,locale,contact:p.contact,contactConsent:true,website:''}
}
function route({url=origin+'/api/service-enquiries',method='POST',type='fetch',raw=JSON.stringify(body()),status=200}={}) {
 const calls=[]
 return {calls,request:()=>({url:()=>url,method:()=>method,resourceType:()=>type,postData:()=>raw}),
  abort:async()=>calls.push('abort'),fulfill:async value=>calls.push(['fulfill',value]),
  fetch:async options=>{calls.push(['fetch',options]);return {url:()=>url,status:()=>status,dispose:async()=>calls.push('dispose')}}}
}
for(const locale of ['en','ru']) test(locale+' exact compact national phone body',()=>{
 assertAlchemyBody(JSON.stringify(body(locale)),locale)
 assert.equal(body(locale).contact.phone,ALCHEMY_PHONE)
})
for(const [name,change] of [
 ['old email',b=>b.contact={displayName:'',email:'alchemy-browser-fixture@example.invalid',phone:''}],
 ['old empty description',b=>b.description=''],['wrong format',b=>b.serviceTitle=b.serviceTitle.replace('30','60')],
 ['private topic',b=>b.description+='; PRIVATE'],['missing consent',b=>b.contactConsent=false],
 ['wrong locale',b=>b.locale='ru'],['UUID version',b=>b.operationId='11111111-1111-1111-8111-111111111111'],
 ['unknown key',b=>b.extra=true],['honeypot',b=>b.website='bot'],['foreign path',b=>b.sourcePath='/en/app'],
])test('body rejects '+name,()=>{const b=body();change(b);assert.throws(()=>assertAlchemyBody(JSON.stringify(b),'en'))})
test('fail-first exact frozen body, armed retry and ack precede success response',async()=>{
 const events=[],receipt=syntheticAlchemyReceipt('en',{onSaved:async()=>events.push('ack')})
 await assert.rejects(receipt.accept(route()),/explicit consented/)
 receipt.arm();const first=route();await receipt.accept(first)
 assert.equal(receipt.count,1);assert.equal(first.calls[0][1].status,503)
 receipt.arm();const second=route();const fulfill=second.fulfill;second.fulfill=async value=>{events.push('fulfill');await fulfill(value)}
 await receipt.accept(second);assert.equal(receipt.pending,true);assert.deepEqual(second.calls,[])
 await receipt.confirm();assert.deepEqual(events,['ack','fulfill']);assert.equal(receipt.pending,false)
 assert.deepEqual(JSON.parse(second.calls[0][1].body),{saved:true,referenceCode:ALCHEMY_REFERENCE})
 assert.throws(()=>receipt.arm());await receipt.close();await assert.rejects(receipt.confirm())
})
test('same valid shape but fresh retry UUID is rejected byte-for-byte',async()=>{
 const receipt=syntheticAlchemyReceipt('en');receipt.arm();await receipt.accept(route());receipt.arm()
 const b=body();b.operationId='22222222-2222-4222-8222-222222222222'
 await assert.rejects(receipt.accept(route({raw:JSON.stringify(b)})),/byte-identical/);await receipt.close()
})
test('pending retry is aborted on close and a saved-ack failure never fulfills',async()=>{
 const receipt=syntheticAlchemyReceipt('en',{onSaved:async()=>{throw Error('ack failed')}});receipt.arm();await receipt.accept(route());receipt.arm()
 const retry=route();await receipt.accept(retry);await assert.rejects(receipt.confirm(),/ack failed/)
 assert.deepEqual(retry.calls,[]);await receipt.close();assert.deepEqual(retry.calls,['abort'])
})
for(const [name,url,method] of [['GET endpoint',origin+'/api/service-enquiries','GET'],['query',origin+'/api/service-enquiries?x','POST'],['foreign','https://example.invalid/api/service-enquiries','POST'],['other write',origin+'/api/other','POST']])test('compact boundary blocks '+name,async()=>{
 const failures=[],r=route({url,method}),gate=alchemyRequestGate(origin,'en',()=>assert.fail('admission'),failures,[],{initialDocument:true,allowReceipt:false})
 await gate(r);assert.deepEqual(r.calls,['abort']);assert.equal(failures.length,1)
})
test('compact initial public document admitted exactly once in bootstrap phase and no thank-you',async()=>{
 const failures=[],gate=alchemyRequestGate(origin,'en',()=>{},failures,[],{initialDocument:true,allowReceipt:false})
 const initial=()=>route({url:origin+path,method:'GET',type:'document'})
 const r=initial();await gate(r);assert.equal(r.calls[0][0],'fetch');assert.deepEqual(r.calls[0][1],{maxRedirects:0})
 gate.endInitialDocument();const later=initial();await gate(later);assert.deepEqual(later.calls,['abort'])
 const thanks=route({url:origin+'/en/thank-you',method:'GET',type:'document'});await gate(thanks);assert.deepEqual(thanks.calls,['abort'])
 assert.deepEqual(failures,[])
})
test('default gate retains real normal/email thank-you reads',async()=>{
 const r=route({url:origin+'/en/thank-you',method:'GET',type:'document'});await alchemyRequestGate(origin,'en',()=>{},[],[])(r)
 assert.equal(r.calls[0][0],'fetch')
})
for(const failure of ['route','socket','binding','init','page','run','close'])test('isolation closes and preserves primary '+failure+' failure',async()=>{
 const calls=[],step=async name=>{calls.push(name);if(name===failure)throw Error(failure)}
 const page={isClosed:()=>false,evaluate:async()=>step('restore'),close:async()=>step('page-close')}
 const context={route:async()=>step('route'),unroute:async()=>step('unroute'),routeWebSocket:async()=>step('socket'),exposeBinding:async()=>step('binding'),on:()=>{},addInitScript:async()=>step('init'),newPage:async()=>{await step('page');return page},close:async()=>step('close')}
 const handler=()=>{};handler.beginTeardown=()=>calls.push('drain')
 await assert.rejects(withAlchemyIsolation(context,handler,{close:async()=>calls.push('receipt-close')},false,async()=>step('run')))
 assert.ok(calls.includes('close'));assert.ok(calls.includes('receipt-close'));if(calls.includes('page'))assert.ok(calls.indexOf('route')<calls.indexOf('page'))
 assert.ok(!calls.includes('unroute'),'Context-owned boundary remains through final close')
})
test('origin rejects nonlocal and noncanonical paths',()=>{
 assert.equal(alchemyOrigin(origin+path,'en'),origin)
 for(const raw of ['https://example.invalid'+path,origin+path+'?secret=1',origin+'/en/app'])assert.throws(()=>alchemyOrigin(raw,'en'))
})

for(const locale of ['en','ru'])for(const channel of ['whatsapp','telegram'])for(const denyReceiptStorage of [false,true])test(`actual compact controls drive complete ${locale}/${channel}/storage-${!denyReceiptStorage} adapter`,async t=>{
 t.mock.method(console,'log',()=>{})
 const fixture=alchemyJourneyComponentFixture({locale});await verifyAlchemyEnquiryJourney(fixture.source,fixture.expect,locale,{channel,denyReceiptStorage})
 const result=fixture.contexts[0];assert.equal(result.closed,true);assert.equal(result.unroutes,0,'Isolated context disposal owns route teardown')
 assert.equal(result.env.requests.length,2);assert.equal(result.env.requests[0],result.env.requests[1])
 assert.equal(result.env.window.open,result.originalOpen);assert.equal(result.env.window.__hhSyntheticContactPopup,undefined)
 assert.equal(result.env.storage.size,0);assert.equal(result.env.writes.length,denyReceiptStorage?0:1)
 assert.ok(fixture.events.findIndex(e=>e[0]==='route')<fixture.events.findIndex(e=>e[0]==='page'))
})
for(const [name,before,after]of [
 ['missing consent','contactConsent: consent, website,','contactConsent: true, website,'],
 ['changed retry UUID','body: attempt.body,','body: JSON.stringify({...JSON.parse(attempt.body),operationId:crypto.randomUUID()}),'],
 ['premature handoff','const response = await fetch("/api/service-enquiries", {','handoffWindow?.location.replace("https://wa.me/14376066502?text=UNSAFE");\n      const response = await fetch("/api/service-enquiries", {'],
 ['wrong destination','handoffWindow.location.replace(destination);','handoffWindow.location.replace(destination+"UNEXPECTED");'],
 ['compact redirect','if (!stayAfterSave && !compactPhone) router.push','if (true) router.push'],
])test('complete adapter rejects actual source mutation: '+name,async t=>{
 t.mock.method(console,'log',()=>{})
 const fixture=alchemyJourneyComponentFixture({mutateSource:source=>{assert.equal(source.split(before).length-1,1);return source.replace(before,after)}})
 await assert.rejects(verifyAlchemyEnquiryJourney(fixture.source,fixture.expect,'en'))
 assert.ok(fixture.contexts.every(context=>context.closed&&context.unroutes===0))
 assert.ok(fixture.contexts.every(context=>context.env.window.open===context.originalOpen))
})
test('actual compact click failure still restores sentinel, original globals and route handler',async t=>{
 t.mock.method(console,'log',()=>{})
 const fixture=alchemyJourneyComponentFixture({throwClick:true});await assert.rejects(verifyAlchemyEnquiryJourney(fixture.source,fixture.expect,'en'),/synthetic click failure/)
 const context=fixture.contexts[0];assert.ok(context.closed);assert.equal(context.unroutes,0);assert.equal(context.env.window.open,context.originalOpen)
})

}

test('unexpected popup during context close still fails after cleanup',async()=>{
 let report,closed=false
 const context=bootstrapContext({exposeBinding:async(name,callback)=>{report=callback},close:async()=>{closed=true;report()}})
 await assert.rejects(withAlchemyIsolation(context,()=>{},{close:async()=>{}},false,async()=>{}),/No unowned popup/)
 assert.equal(closed,true)
})
