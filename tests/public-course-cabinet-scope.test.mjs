import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const source=read('components/public-course-cabinet.tsx')
const compile=(text,fileName)=>ts.transpileModule(text,{fileName,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const nodes=tree=>!tree||typeof tree!=='object'?[]:Array.isArray(tree)?tree.flatMap(nodes):[tree,...nodes(tree.props?.children)]
const text=tree=>tree==null||typeof tree==='boolean'?'':typeof tree!=='object'?String(tree):Array.isArray(tree)?tree.map(text).join(' '):text(tree.props?.children)
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve}}
const bootstrap=id=>({account:{id,onboardingState:'active'},results:[],runs:[],requests:[],consents:[],services:[]})
const owned={id:'course-a',stage:4,focusTags:['attention']}
const reply=(body,status=200)=>({ok:status>=200&&status<300,status,json:async()=>body})

function mount(handler,locale='en'){
  const slots=[],calls=[],listeners=new Map(),channels=[]
  let index=0,pending=[],dirty=false,tree,props={locale},firstFrame
  const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]))
  const hooks={
    useState(initial){const i=index++;slots[i]??={value:initial};return [slots[i].value,value=>{slots[i].value=typeof value==='function'?value(slots[i].value):value;dirty=true}]},
    useEffect(fn,deps){const i=index++;if(!same(slots[i]?.deps,deps))pending.push(()=>{slots[i]?.cleanup?.();slots[i]={deps,cleanup:fn()}})},
  }
  const client={exports:{},fetch:async(url,options)=>{calls.push({url,options});return handler(url,options,calls.length)},Error}
  vm.runInNewContext(compile(read('lib/app/client-fetch.js'),'client-fetch.js'),client)
  const document={visibilityState:'visible',addEventListener:(name,fn)=>listeners.set('document:'+name,fn),removeEventListener:name=>listeners.delete('document:'+name)}
  const window={addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)}
  class Channel{constructor(name){assert.equal(name,'hh-app-session');channels.push(this)}close(){this.closed=true}}
  const dependencies={react:hooks,'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
    'next/link':{default:'Link'},'lucide-react':new Proxy({},{get:(_,key)=>String(key)}),
    './public-growth-courses.module.css':{default:new Proxy({},{get:(_,key)=>String(key)})},'@/lib/app/client-fetch':client.exports}
  const runtime={exports:{},require:name=>{assert.ok(dependencies[name],name);return dependencies[name]},window,document,BroadcastChannel:Channel,AbortController,console}
  vm.runInNewContext(compile(source,'public-course-cabinet.tsx'),runtime)
  const render=(next=props)=>{props=next;index=0;pending=[];dirty=false;tree=runtime.exports.PublicCourseCabinet(props);firstFrame=tree;pending.forEach(fn=>fn());return tree}
  const settle=async()=>{for(let i=0;i<60;i++){await Promise.resolve();if(dirty)render()}return tree}
  render()
  return {calls,channels,document,render,settle,get tree(){return tree},get firstFrame(){return firstFrame},event(name){listeners.get(name)?.()},
    signedOut(){channels.filter(c=>!c.closed).forEach(c=>c.onmessage?.({data:'signed-out'}))},unmount(){slots.forEach(s=>s?.cleanup?.())}}
}
const visibleCourse=h=>text(h.tree).includes('Focus & Energy')||text(h.tree).includes('Фокус и энергия')
const progress=h=>nodes(h.tree).find(n=>n.props?.role==='progressbar')
function ordinary(url,options){
  if(url==='/api/app/bootstrap')return reply(bootstrap('owner-a'))
  assert.equal(options.headers['X-HH-Account-ID'],'owner-a')
  if(url==='/api/app/course')return reply({course:owned})
  assert.match(url,/\/api\/app\/course\/progress\?locale=(en|ru)&courseId=course-a$/)
  return reply({courseId:'course-a',progress:{practiceCount:3}})
}

test('public cabinet validates identity and sends account/course-bound read-only requests in EN/RU',async()=>{
  for(const locale of ['en','ru']){
    const h=mount(ordinary,locale);await h.settle();assert.ok(visibleCourse(h));assert.equal(progress(h).props['aria-valuenow'],3)
    assert.equal(h.calls.length,4)
    for(const call of h.calls){assert.equal(call.options.method,'GET');assert.equal(call.options.body,undefined);assert.equal(call.options.cache,'no-store');assert.equal(call.options.credentials,'same-origin')}
    assert.equal(h.calls.at(-1).options.headers['X-HH-Account-ID'],'owner-a');h.unmount()
  }
})

test('signed-out or malformed bootstrap cannot request a course or establish an account',async()=>{
  for(const response of [reply({error:'AUTH_REQUIRED'},401),reply({account:{id:'owner-a'}})]){
    const h=mount(()=>response);await h.settle();assert.equal(h.calls.length,1);assert.equal(visibleCourse(h),false);assert.equal(progress(h),undefined);h.unmount()
  }
  assert.doesNotMatch(source,/ensureAccount|signIn\(|POST|localStorage|sessionStorage/)
})

test('course authorization, progress mismatch and changed final identity clear the entire private snapshot',async()=>{
  for(const failure of ['course','progress','identity']){
    let boot=0
    const h=mount((url,options)=>{
      if(url==='/api/app/bootstrap')return reply(bootstrap(failure==='identity'&&++boot===2?'owner-b':'owner-a'))
      if(failure==='course')return reply({error:'ACCOUNT_CHANGED'},409)
      if(failure==='progress'&&url.includes('/progress'))return reply({courseId:'course-b',progress:{practiceCount:12}})
      return ordinary(url,options)
    });await h.settle();assert.equal(visibleCourse(h),false);assert.equal(progress(h),undefined);h.unmount()
  }
})

test('signed-out broadcast aborts pending reads and suppresses their late private response',async()=>{
  for(const phase of ['course','progress']){
    const delayed=deferred()
    const h=mount((url,options)=>url==='/api/app/'+phase||phase==='progress'&&url.includes('/progress')?delayed.promise:ordinary(url,options))
    await h.settle();const last=h.calls.at(-1);h.signedOut();await h.settle();assert.equal(last.options.signal.aborted,true)
    delayed.resolve(phase==='course'?reply({course:owned}):reply({courseId:'course-a',progress:{practiceCount:13}}));await h.settle()
    assert.equal(visibleCourse(h),false);assert.equal(progress(h),undefined);h.unmount()
  }
})

test('locale replacement never renders an earlier private snapshot and ignores delayed old progress',async()=>{
  const delayed=deferred()
  const h=mount((url,options)=>url.includes('locale=en')?delayed.promise:ordinary(url,options))
  await h.settle();const old=h.calls.at(-1);h.render({locale:'ru'})
  assert.equal(text(h.firstFrame).includes('Focus & Energy'),false)
  await h.settle();assert.equal(old.options.signal.aborted,true);assert.ok(text(h.tree).includes('Фокус и энергия'))
  delayed.resolve(reply({courseId:'course-a',progress:{practiceCount:13}}));await h.settle();assert.equal(progress(h).props['aria-valuenow'],3)
  h.render({locale:'en'});assert.equal(text(h.firstFrame).includes('Фокус и энергия'),false);h.unmount()
})

test('pagehide clears and aborts, focus cannot reopen a leaving page, and pageshow revalidates',async()=>{
  const h=mount(ordinary);await h.settle();assert.ok(visibleCourse(h))
  h.event('pagehide');await h.settle();assert.equal(visibleCourse(h),false);const count=h.calls.length
  h.event('focus');await h.settle();assert.equal(h.calls.length,count)
  h.event('pageshow');await h.settle();assert.ok(visibleCourse(h));assert.equal(h.calls.length,count+4);h.unmount()
})

test('hidden/focus rechecks clear stale state, failed reauthentication does not retain prior progress',async()=>{
  let allowed=true
  const h=mount((url,options)=>!allowed?reply({error:'AUTH_REQUIRED'},401):ordinary(url,options));await h.settle();assert.ok(visibleCourse(h))
  h.document.visibilityState='hidden';h.event('document:visibilitychange');await h.settle();assert.equal(visibleCourse(h),false)
  allowed=false;h.document.visibilityState='visible';h.event('document:visibilitychange');await h.settle();assert.equal(visibleCourse(h),false);assert.equal(progress(h),undefined)
  allowed=true;h.event('focus');await h.settle();assert.ok(visibleCourse(h));h.unmount()
})

test('unmount cancels pending reads and closes the session listener',async()=>{
  const delayed=deferred();const h=mount(()=>delayed.promise);await h.settle();h.unmount()
  assert.equal(h.calls[0].options.signal.aborted,true);assert.ok(h.channels.every(c=>c.closed))
  delayed.resolve(reply(bootstrap('owner-a')));await h.settle();assert.equal(h.calls.length,1);assert.equal(visibleCourse(h),false)
})
