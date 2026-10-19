import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { installRatingsRequestDiagnostics,ratingsFailureCategory,ratingsPath,ratingsErrorEndpoint,ratingsDocumentObserver } from '../scripts/helpers/ratings-request-diagnostics.mjs'
const origin='http://127.0.0.1:3100',A='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
function fixture(){
 const context=new EventEmitter();context.pages=()=>[];context.exposeBinding=async(_,fn)=>{context.binding=fn};context.addInitScript=async fn=>{context.init=fn}
 const page=new EventEmitter();const frame={page:()=>page,url:()=>origin+'/en/app/results/private-id'};page.mainFrame=()=>frame;page.url=frame.url
 const request={frame:()=>frame,url:()=>origin+'/api/app/test-ratings/mini-ipip-20?secret=private',method:()=> 'GET',isNavigationRequest:()=>false,failure:()=>({errorText:'Load request cancelled SECRET'})}
 return {context,page,frame,request}
}
test('fixed categories and endpoints never return sensitive text/query',()=>{
 assert.equal(ratingsFailureCategory('Load request cancelled secret'),'cancelled')
 assert.equal(ratingsFailureCategory('access control checks, cancelled secret'),'access-control-or-security')
 assert.equal(ratingsFailureCategory('private message'),'other')
 assert.equal(ratingsPath(origin+'/api/app/test-ratings?secret=abc',origin),'/api/app/test-ratings')
 assert.equal(ratingsPath('https://other.invalid/api/app/test-ratings',origin),null)
})
test('request ID and source page remain stable across interleaved commit; document join stays unproven',async()=>{
 const f=fixture(),events=[];await installRatingsRequestDiagnostics(f.context,origin,e=>events.push(e));f.context.emit('page',f.page)
 const source={page:f.page,frame:f.frame}
 f.context.binding(source,{kind:'document-init',documentToken:A,at:1,pagePath:'/en/app/results/private-id'})
 f.context.emit('request',f.request)
 f.context.binding(source,{kind:'document-init',documentToken:B,at:2,pagePath:'/en/app/tests'})
 f.page.emit('framenavigated',f.frame)
 f.context.emit('response',{request:()=>f.request,status:()=>200})
 f.context.emit('requestfailed',f.request)
 f.context.binding(source,{kind:'window-error',documentToken:A,at:3,pagePath:'/en/app/results/private-id',endpoint:'/api/app/test-ratings',category:'access-control-or-security',secret:'never'})
 const start=events.find(e=>e.kind==='ratings-request'),fail=events.find(e=>e.kind==='ratings-failed'),windowError=events.find(e=>e.kind==='window-error')
 assert.equal(fail.requestId,start.requestId);assert.equal(fail.pageId,start.pageId);assert.equal(fail.sourceDocumentCandidate,A)
 assert.equal(fail.attribution,'source-frame-exact-document-unproven');assert.equal(windowError.documentToken,A);assert.equal(windowError.attribution,'source-window-exact')
 assert.equal(events.find(e=>e.kind==='main-frame-commit').attribution,'frame-current-candidate-only')
 assert.ok(!JSON.stringify(events).includes('private-id'));assert.ok(!JSON.stringify(events).includes('SECRET'));assert.ok(!JSON.stringify(events).includes('secret'))
})
test('pageerror attribution binds emitting page instead of mutable main page',async()=>{
 const f=fixture(),events=[];await installRatingsRequestDiagnostics(f.context,origin,e=>events.push(e));f.context.emit('page',f.page)
 const other=fixture();f.context.emit('page',other.page)
 f.page.emit('pageerror',new Error(origin+'/api/app/test-ratings/mini-ipip-20 due to access control checks.'))
 other.page.emit('pageerror',new Error(origin+'/api/app/test-ratings/mini-ipip-20 due to access control checks.'))
 const errors=events.filter(e=>e.kind==='pageerror');assert.equal(errors.length,2);assert.notEqual(errors[0].pageId,errors[1].pageId)
 assert.ok(errors.every(e=>e.attribution==='source-page-exact-document-unproven'))
})
test('bounded logging and throwing output cannot change request flow',async()=>{
 const f=fixture(),events=[];await installRatingsRequestDiagnostics(f.context,origin,e=>events.push(e),{limit:2});f.context.emit('page',f.page)
 for(let i=0;i<10;i++)f.context.emit('request',f.request)
 assert.equal(events.length,3);assert.equal(events[2].kind,'limit-reached')
 const x=fixture();await installRatingsRequestDiagnostics(x.context,origin,()=>{throw Error('logger')});x.context.emit('page',x.page)
 assert.doesNotThrow(()=>x.context.emit('request',x.request))
})
test('parser observer is passive without Navigation API and supplies its own exact token',async()=>{
 const events=[],listeners={};const sandbox={crypto:{randomUUID:()=>A},location:{pathname:'/en/app/tests',origin},Date,Promise,URL,window:{__hhRatingsSource:e=>events.push(e)},addEventListener:(name,fn)=>{listeners[name]=fn}}
 vm.runInNewContext('('+ratingsDocumentObserver.toString()+')()',sandbox)
 listeners.error({message:origin+'/api/app/test-ratings/mini-ipip-20 due to access control checks.'})
 listeners.error({message:'https://other.invalid/api/app/test-ratings/private-key due to access control checks.'})
 assert.equal(events.length,2);assert.equal(events[1].endpoint,'/api/app/test-ratings/[definition]');
 assert.equal(events[0].kind,'document-init');assert.equal(events[1].documentToken,A);assert.equal(events[1].category,'access-control-or-security')
 assert.doesNotMatch(ratingsDocumentObserver.toString(),/preventDefault|stopImmediatePropagation|window\.fetch\s*=|headers/)
})
test('isolated verifier retains raw error gate and binds recovery/replacement sources',()=>{
 const source=readFileSync(new URL('../scripts/verify-app-r1.mjs',import.meta.url),'utf8')
 assert.match(source,/const capturePageError=sourcePage=>error=>/)
 assert.match(source,/errors\.push\(error\.message\)/)
 assert.match(source,/recoveryPage\.on\('pageerror',capturePageError\(recoveryPage\)\)/)
 assert.equal((source.match(/page\.on\('pageerror',capturePageError\(page\)\)/g)||[]).length,2)
 assert.match(source,/assert\.deepEqual\(errors,\[\]\)/)
 assert.doesNotMatch(source,/test-ratings due to access control checks\.'\)\)return/)
})

test('actual definition GETs normalize one bounded segment; foreign and malformed paths are excluded',()=>{
 for(const prefix of ['/api/app/test-ratings','/api/app/guest/test-ratings']){
  for(const key of ['mini-ipip-20','hh-current-state']){
   const raw=origin+prefix+'/'+key+'?secret=never';
   assert.equal(ratingsPath(raw,origin),prefix+'/[definition]');
   assert.equal(ratingsErrorEndpoint('Fetch API cannot load '+raw+' due to access control checks.',origin),prefix+'/[definition]');
  }
  for(const suffix of ['/key/extra','/key%2Fextra','/'+'x'.repeat(101),'/'])assert.equal(ratingsPath(origin+prefix+suffix,origin),null);
  assert.equal(ratingsErrorEndpoint('https://foreign.invalid'+prefix+'/mini-ipip-20 due to access control checks.',origin),null);
 }
});

test('teardown accessor failures cannot escape additive listeners',async()=>{
 const f=fixture();await installRatingsRequestDiagnostics(f.context,origin,()=>{});f.context.emit('page',f.page);
 f.context.emit('request',f.request);
 for(const field of ['failure','url','method','isNavigationRequest','frame']){
  const bad={...f.request,[field]:()=>{throw Error('teardown')}};
  assert.doesNotThrow(()=>f.context.emit('request',bad));
  if(field==='failure'){
   f.context.emit('request',bad);
   assert.doesNotThrow(()=>f.context.emit('requestfailed',bad));
  }
 }
 assert.doesNotThrow(()=>f.context.emit('response',{request:()=>f.request,status:()=>{throw Error('closed')}}));
 f.page.url=()=>{throw Error('closed')};
 assert.doesNotThrow(()=>f.page.emit('pageerror',new Error(origin+'/api/app/test-ratings/mini-ipip-20 due to access control checks.')));
 f.frame.url=()=>{throw Error('closed')};assert.doesNotThrow(()=>f.page.emit('framenavigated',f.frame));
});
test('raw source-path lookup failure still retains actual error in strict gate',()=>{
 const source=readFileSync(new URL('../scripts/verify-app-r1.mjs',import.meta.url),'utf8');
 const declaration=source.split('\n').find(line=>line.startsWith('const capturePageError='));
 const errors=[],logs=[];
 const capture=vm.runInNewContext(declaration+';capturePageError',{errors,console:{log:(...args)=>logs.push(args)},URL,Date});
 const error=new Error('http://localhost:3100/api/app/test-ratings/mini-ipip-20 due to access control checks.');
 assert.doesNotThrow(()=>capture({url:()=>{throw Error('closed')}})(error));
 assert.deepEqual(errors,[error.message]);assert.equal(logs[0][1],'[unavailable]');
});

test('browser diagnostic callbacks tolerate throwing error and navigation accessors',()=>{
 const listeners={},events=[];let navigate;
 const sandbox={crypto:{randomUUID:()=>A},location:{pathname:'/en/app/tests',origin},Date,Promise,URL,window:{__hhRatingsSource:e=>events.push(e)},navigation:{addEventListener:(_,fn)=>{navigate=fn}},addEventListener:(name,fn)=>{listeners[name]=fn}};
 vm.runInNewContext('('+ratingsDocumentObserver.toString()+')()',sandbox);
 assert.doesNotThrow(()=>listeners.unhandledrejection({reason:{get message(){throw Error('private')}}}));
 assert.doesNotThrow(()=>listeners.error({get message(){throw Error('private')}}));
 assert.doesNotThrow(()=>navigate({get destination(){throw Error('private')}}));
 assert.equal(events.length,1);
});
