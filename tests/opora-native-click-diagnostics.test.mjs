import test from 'node:test'
import assert from 'node:assert/strict'
import {EventEmitter} from 'node:events'
import vm from 'node:vm'
import fs from 'node:fs'
import {installOporaNativeProbe,redactOporaNativeRow,withOporaNativeClickDiagnostics as wrap} from '../scripts/helpers/opora-native-click-diagnostics.mjs'
const meta={engine:'webkit',locale:'ru',width:320,priorHelp:false}
const owner='00000000-0000-4000-8000-000000001056'
function harness(options={}) {
 const rows=[], listeners=[],timers=new Map(),frames=new Map();let time=0,next=0,disconnected=0
 const add=function(type,fn,o){listeners.push({target:this,type,fn,o});if(options.reenterAdd && type==='pagehide'){options.reenterAdd=false;for(const l of [...listeners])if(l.type==='pagehide')l.fn()}}
 const remove=function(type,fn){const n=listeners.findIndex(l=>l.target===this&&l.type===type&&l.fn===fn);if(n>=0)listeners.splice(n,1)}
 const footer={contains:n=>n===button||n===other},other={};
 const button={textContent:'Продолжить',isConnected:true,parentElement:footer,contains:n=>n===button,matches(){return Boolean(this.disabled)},getAttribute:()=>null,closest:()=>null,getBoundingClientRect:()=>({x:10,y:610,width:190,height:49})}
 const panel={getAttribute:()=>panel.scene};panel.scene='arrive'
 const root={isConnected:true,contains:n=>n===root||n===button||n===other,querySelectorAll:()=>[other,root.button],querySelector:()=>panel};root.button=button
 const document={documentElement:{lang:'ru'},querySelectorAll:()=>[root],elementFromPoint:()=>button,addEventListener:add,removeEventListener:remove};root.ownerDocument=document
 const window={addEventListener:add,removeEventListener:remove};window.top=window
 const context={window,document,location:{origin:'http://127.0.0.1:3100',pathname:'/__hh-test__/opora-as56/ru',search:'',hash:''},innerWidth:320,innerHeight:667,scrollX:0,scrollY:0,
  console:{debug:s=>rows.push(JSON.parse(s.slice('HH_OPORA_NATIVE_ROW '.length)))},performance:{now:()=>time},Date:{now:()=>time},getComputedStyle:()=>({display:'flex',visibility:'visible',pointerEvents:'auto'}),
  setTimeout:(fn,delay)=>{const n=++next;timers.set(n,{fn,delay});return n},clearTimeout:n=>timers.delete(n),requestAnimationFrame:fn=>{const n=++next;frames.set(n,fn);return n},cancelAnimationFrame:n=>frames.delete(n),
  MutationObserver:class {constructor(fn){context.mutation=fn}observe(){if(options.reenterObserve)for(const l of [...listeners])if(l.type==='pagehide')l.fn()}disconnect(){disconnected++}}}
 if(options.wrongScope)context.location.pathname='/private'
 if(options.expired)time=1001
 vm.createContext(context)
 const accepted=vm.runInContext(`(${installOporaNativeProbe.toString()})(${JSON.stringify({owner,expiresAt:1000})})`,context)
 return {accepted,rows,listeners,timers,frames,context,button,root,panel,get disconnected(){return disconnected},
  event(type,target=button){for(const l of [...listeners])if(l.type===type)l.fn({target,isTrusted:true,defaultPrevented:false})},
  timer(delay){for(const [n,t]of [...timers])if(t.delay===delay){timers.delete(n);time=delay;t.fn()}},
  frame(){for(const [n,fn]of [...frames]){frames.delete(n);time+=16;fn()}},setTime(t){time=t}}
}
test('native first-click integration and focused workflow registration',()=>{
 const source=fs.readFileSync(new URL('../scripts/verify-opora-as56-browser.mjs',import.meta.url),'utf8')
 assert.equal((source.match(/withOporaNativeClickDiagnostics\(page/g)||[]).length,1)
 assert.match(source,/context.setDefaultTimeout\(15000\)/)
 assert.ok(source.includes('() => click(t.next)'))
 assert.ok(source.includes('const click = async label => { await button(label).click() }'))
 const workflow=fs.readFileSync(new URL('../.github/workflows/opora-module-ci.yml',import.meta.url),'utf8')
 assert.ok(workflow.includes('tests/opora-current-edition-harness.test.mjs tests/opora-native-click-diagnostics.test.mjs'))
})
test('probe initial typed snapshot, frame pairing, disabled/replacement/hit classifications',()=>{
 const h=harness();assert.equal(h.accepted,true);assert.equal(h.rows[0].state.scene,'initial');assert.equal(h.rows[0].layout.hit,'target')
 h.timer(0);h.frame();h.frame();assert.equal(h.rows.filter(r=>r.kind==='frame').length,2)
 const initial=h.rows[0].state.current;h.root.button={...h.button,disabled:true};h.button.isConnected=false;h.context.mutation()
 const row=h.rows.at(-1);assert.notEqual(row.state.current,initial);assert.equal(row.state.originalConnected,false);assert.equal(row.state.disabled,true)
 h.event('click',h.root.button);assert.equal(h.rows.at(-1).kind,'click-bubble');h.timer(16000)
 assert.equal(h.rows.at(-1).reason,'window');assert.equal(h.listeners.length,0);assert.equal(h.frames.size,0);assert.equal(h.timers.size,0);assert.equal(h.disconnected,1)
})
test('expired/scope reject before observers/listeners',()=>{for(const options of [{expired:true},{wrongScope:true}]){const h=harness(options);assert.equal(h.accepted,false);assert.equal(h.listeners.length,0);assert.equal(h.timers.size,0)}})
test('transition and pagehide stop; no observations after teardown',()=>{for(const transition of [false,true]){const h=harness();if(transition){h.panel.scene='support';h.context.mutation()}else h.event('pagehide');const n=h.rows.length;h.context.mutation();h.event('click');assert.equal(h.rows.length,n);assert.equal(h.listeners.length,0);assert.equal(h.timers.size,0)}})
test('bounded observer storm and reentrant observe cleanup',()=>{const h=harness();for(let i=0;i<200;i++)h.context.mutation();assert.ok(h.rows.length<=48);assert.equal(h.rows.at(-1).reason,'cap');assert.equal(h.listeners.length,0);const r=harness({reenterObserve:true});assert.equal(r.accepted,false);assert.equal(r.listeners.length,0);assert.equal(r.timers.size,0);assert.ok(r.disconnected>=1)})
test('host allowlist drops unknown/raw payload, malformed and nonfinite values',()=>{
 const payload={kind:'start',secret:'PRIVATE',state:{secret:'PRIVATE',scene:'PRIVATE',current:Infinity},layout:{rect:['PRIVATE',1,2,3],viewport:[320,667],scroll:[0,0],hit:'PRIVATE',html:'PRIVATE'},target:'PRIVATE'}
 const out=redactOporaNativeRow(payload);assert.ok(!JSON.stringify(out).includes('PRIVATE'));assert.equal(out.state.current,null);assert.equal(out.layout.rect[0],null);assert.equal(redactOporaNativeRow({kind:'PRIVATE'}),null)
})
class Page extends EventEmitter {calls=[];constructor(mode='success'){super();this.mode=mode}evaluate(fn,arg){this.calls.push('evaluate');this.args=arg;if(this.mode==='reject')return Promise.reject(new Error('PRIVATE'));if(this.mode==='hang')return new Promise(()=>{});this.emit('console',{type:()=> 'debug',text:()=> 'HH_OPORA_NATIVE_ROW '+JSON.stringify({owner:arg.owner,kind:'start',secret:'PRIVATE',state:{scene:'initial'}})});return Promise.resolve(true)}}
test('non-target bypass no page access, preserves result and error identity',async()=>{for(const m of [{...meta,engine:'chromium'},{...meta,locale:'en'},{...meta,width:360},{...meta,priorHelp:true}]){let n=0,reads=0;const forbidden=new Proxy({}, {get(){reads++;throw new Error('page forbidden')}});const v=await wrap(forbidden,m,()=>{n++;return 42},()=>{});assert.equal(v,42);assert.equal(n,1);assert.equal(reads,0)}const error=new Error('original');await assert.rejects(wrap(null,{...meta,locale:'es'},()=>{throw error}),e=>e===error)})
test('target invokes once, rejection preserves original, no failure RPC, detached host',async()=>{
 const p=new Page(),emitted=[],error=new Error('original');let n=0
 await assert.rejects(wrap(p,meta,()=>{n++;p.emit('crash');throw error},r=>emitted.push(r)),e=>e===error)
 assert.equal(n,1);assert.deepEqual(p.calls,['evaluate']);assert.equal(p.eventNames().length,0);assert.deepEqual(emitted.map(x=>x.phase),['click-start','click-rejected','host-detached']);assert.equal(emitted[1].lifecycle[0],'crash');assert.ok(!JSON.stringify(emitted).includes('PRIVATE'))
})
test('setup rejection does not suppress action; emitter failure cannot replace result',async()=>{const p=new Page('reject');let n=0;assert.equal(await wrap(p,meta,()=>{n++;return 9},()=>{throw new Error('emit')}),9);assert.equal(n,1);assert.equal(p.eventNames().length,0)})
test('setup timeout does not alter native action and remains unaccepted',async()=>{const p=new Page('hang'),rows=[];let n=0;await wrap(p,meta,()=>{n++},r=>rows.push(r));assert.equal(n,1);assert.equal(rows[0].setup,'timed_out');assert.equal(rows[0].accepted,false);assert.equal(p.calls.length,1);assert.equal(p.eventNames().length,0)})
test('source passive privacy contract: no writes/actions/private reads',()=>{const s=installOporaNativeProbe.toString();for(const re of [/\.click\(/,/\.focus\(/,/scrollIntoView/,/localStorage/,/sessionStorage/,/document\.cookie/,/fetch\(/,/__oporaBrowserData/,/preventDefault\(/,/stopPropagation\(/])assert.doesNotMatch(s,re)})

test('motion and occlusion are categories, not raw nodes; scheduling failure contained',()=>{const h=harness();h.button.getBoundingClientRect=()=>({x:20,y:600,width:190,height:49});h.context.document.elementFromPoint=()=>({secret:'PRIVATE'});h.timer(0);h.frame();assert.equal(h.rows.at(-1).layout.rect[0],20);assert.equal(h.rows.at(-1).layout.hit,'outside');assert.ok(!JSON.stringify(h.rows).includes('PRIVATE'));h.context.requestAnimationFrame=()=>{throw new Error('PRIVATE')};assert.doesNotThrow(()=>h.timer(1000));assert.equal(h.rows.at(-1).reason,'read-failed');assert.equal(h.listeners.length,0)})

test('reentrant listener registration cleans its late registration',()=>{const h=harness({reenterAdd:true});assert.equal(h.accepted,false);assert.equal(h.listeners.length,0);assert.equal(h.timers.size,0)})
test('browser emission omits arbitrary style/node/event data and bounds geometry',()=>{const h=harness();h.button.getBoundingClientRect=()=>({x:'PRIVATE',y:Infinity,width:190,height:49});h.context.getComputedStyle=()=>({display:'PRIVATE',visibility:'PRIVATE',pointerEvents:'PRIVATE',secret:'PRIVATE'});h.event('pointerdown',{secret:'PRIVATE'});h.timer(0);h.frame();assert.ok(!JSON.stringify(h.rows).includes('PRIVATE'));assert.equal(h.rows.at(-1).layout.rect[0],null);assert.equal(h.rows.at(-1).layout.rect[1],null)})
test('host malformed console and late callbacks cannot leak or survive dispose',async()=>{const p=new Page(),output=[];let captured;await wrap(p,meta,()=>{captured=p.listeners('console')[0];for(let i=0;i<120;i++)p.emit('console',{type:()=> 'debug',text:()=> 'HH_OPORA_NATIVE_ROW {PRIVATE'});return 7},r=>output.push(r));const serialized=JSON.stringify(output);assert.ok(!serialized.includes('PRIVATE'));captured({type(){throw new Error('PRIVATE')}});assert.equal(JSON.stringify(output),serialized);assert.equal(p.eventNames().length,0)})
