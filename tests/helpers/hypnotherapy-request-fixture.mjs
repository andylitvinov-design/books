// Offline source execution only: real SitewideLeadCapture + CompactLeadCapture
// hooks/handlers, exact public-copy module and link builder. Not layout/browser QA.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {randomUUID} from 'node:crypto'
import {runInNewContext} from 'node:vm'
import ts from 'typescript'
import * as whatsapp from '../../lib/whatsapp-enquiry.js'
import * as publicLead from '../../lib/public-lead-capture.js'
import * as receipt from '../../lib/practitioners/enquiry-receipt.mjs'
const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8')
const tick = () => new Promise(resolve => setImmediate(resolve))
const children = node => {const out=[];function walk(v) {if(Array.isArray(v)) return v.forEach(walk);if(!v || typeof v!=='object' || !v.props) return;out.push(v);walk(v.props.children)}walk(node);return out}
const text = node => Array.isArray(node) ? node.map(text).join('') : typeof node==='string' || typeof node==='number' ? String(node) : node?.props ? text(node.props.children) : ''
const compiled = new Map()
export const compactSource = read('components/compact-lead-capture.tsx')
export function runtimePage(locale, {sourceOverride=compactSource, responseOverride, priorReceipt=null, fault}={}) {
  const values = new Map([['unrelated-session-state','preserved']])
  if(priorReceipt!==null) values.set(receipt.RECEIPT_SESSION_KEY,priorReceipt)
  const writes=[], requests=[], handlers=[], routeCalls=[], fallbacks=[]
  const sessionStorage={getItem:key=>values.get(key)??null,setItem(key,value){assert.equal(key,receipt.RECEIPT_SESSION_KEY);writes.push([key,String(value)]);values.set(key,String(value))}}
  const originalOpen=()=>assert.fail('No actual provider window')
  const window={sessionStorage,crypto:{randomUUID},location:{pathname:'/'+locale+'/services/hypnotherapy-course'},open:originalOpen}
  let current,dirty=true,tree,instances=new Map(),effects=[]
  const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]))
  const slot=init=>{const i=current.index++;return current.slots[i]||(current.slots[i]=init())}
  const hooks={
    useState(initial){const s=slot(()=>({value:typeof initial==='function'?initial():initial}));return[s.value,value=>{const n=typeof value==='function'?value(s.value):value;if(!Object.is(n,s.value)){s.value=n;dirty=true}}]},
    useRef(initial){return slot(()=>({current:initial}))},
    useEffect(fn,deps){const s=slot(()=>({}));if(!same(s.deps,deps)){s.deps=deps;effects.push(()=>{s.cleanup?.();s.cleanup=fn()})}},
  }
  const jsx=(type,props)=>{assert.ok(type,'Exact JSX export');return{type,props:props||{}}}
  const base={'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'fragment'},react:hooks,'next/navigation':{usePathname:()=>window.location.pathname},'next/link':{default:'a'}}
  const sandbox={window,sessionStorage,URL,URLSearchParams,Date}
  const evaluate=(fn,arg)=>runInNewContext('('+fn.toString()+')('+JSON.stringify(arg)+')',sandbox)
  sandbox.fetch=(url,options)=>new Promise((resolve,reject)=>{
    assert.equal(url,'/api/service-enquiries');assert.equal(options.method,'POST');assert.equal(options.credentials,'same-origin');assert.equal(options.cache,'no-store')
    requests.push(options.body)
    const request={url:()=>page.url().replace(window.location.pathname,'')+url,method:()=>options.method,headers:()=>({'content-type':options.headers['Content-Type']}),postDataJSON:()=>JSON.parse(options.body)}
    let index=handlers.length-1
    const route={request:()=>request,fulfill:async reply=>{const next=responseOverride?.(reply)??reply;resolve({ok:next.status>=200&&next.status<300,status:next.status,json:async()=>JSON.parse(next.body)})},abort:async()=>reject(Error('Synthetic abort')),fallback:async()=>{if(index<0){fallbacks.push('unintercepted-write');reject(Error('No API forwarding allowed'));return}const handler=handlers[index--];await handler(route)}}
    route.fallback().catch(reject)
  })
  function compile(source,imports){
    let code=compiled.get(source)
    if(!code){const ast=ts.createSourceFile('actual.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);assert.equal(ast.parseDiagnostics.length,0);code=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;compiled.set(source,code)}
    const loaded={exports:{}}
    runInNewContext(code,{...sandbox,exports:loaded.exports,module:loaded,require:name=>{assert.ok(Object.hasOwn(imports,name),'Unknown dependency '+name);return imports[name]}})
    return loaded.exports
  }
  const core=compile(read('components/core-service-detail.tsx'),{
    ...base,'next/image':{default:'img'},'@/lib/public-card-artwork':{cardArtworkUrl:path=>path,hasCardArtwork:()=>false},'@/components/contact-channel-chooser':{ContactChannelChooser:'contact-chooser'},'@/lib/whatsapp-enquiry':whatsapp,
    'lucide-react':Object.fromEntries(['ArrowLeft','ArrowUpRight','Check','ShieldCheck'].map(x=>[x,'icon-'+x])),
    '@/components/service-video-showcase':{ServiceVideoShowcase:'service-video'},'./core-service-detail.module.css':{default:{}},
  })
  const compact=compile(sourceOverride,{...base,'lucide-react':Object.fromEntries(['CheckCircle2','MessageCircle','Send','ShieldCheck'].map(x=>[x,'icon-'+x])),
    '@/components/static-portrait':{StaticPortrait:'portrait'},'@/lib/practitioners/enquiry-receipt.mjs':receipt,'@/lib/whatsapp-enquiry':whatsapp,'./compact-lead-capture.module.css':{default:{}},
  })
  const sitewide=compile(read('components/sitewide-lead-capture.tsx'),{...base,'lucide-react':{ArrowRight:'icon-ArrowRight'},'@/lib/public-lead-capture':publicLead,
    '@/components/core-service-detail':core,'@/components/compact-lead-capture':compact,'./sitewide-lead-capture.module.css':{default:{}},
  }).SitewideLeadCapture
  function component(fn,props,path){let entry=instances.get(path);if(!entry||entry.fn!==fn){entry={fn,index:0,slots:[]};instances.set(path,entry)}entry.index=0;const last=current;current=entry;const value=fn(props);current=last;return render(value,path+'.r')}
  function render(node,path){if(Array.isArray(node))return node.map((v,i)=>render(v,path+'.'+i));if(!node?.props)return node;if(typeof node.type==='function')return component(node.type,node.props,path);return{...node,props:{...node.props,children:render(node.props.children,path+'.c')}}}
  function flush(){for(let count=0;dirty;count++){assert.ok(count<30,'Unexpected render loop');dirty=false;effects=[];tree=component(sitewide,{},'root');for(const effect of effects)effect()}}
  function matches(node,selector){const tag=selector.match(/^[a-z]+/)?.[0];if(tag&&node.type!==tag)return false;const attrs=[...selector.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)];assert.ok(attrs.length,'Unknown selector '+selector);return attrs.every(([,name,value])=>Object.hasOwn(node.props,name)&&(value===undefined||node.props[name]===value))}
  function all(){flush();const nodes=children(tree);if(fault==='missing form')return nodes.filter(n=>!Object.hasOwn(n.props,'data-compact-lead-form'));return nodes}
  function locator(get,selector){
    const loc={selector,all:()=>{flush();return get()},one:()=>{const a=loc.all();assert.equal(a.length,1,'one '+selector);return a[0]},locator:next=>locator(()=>loc.all().flatMap(n=>children(n).slice(1)).filter(n=>matches(n,next)),next),scrollIntoViewIfNeeded:async()=>{},getAttribute:async name=>{const v=loc.one().props[name];return v===true?'':v??null}}
    loc.fill=async value=>{const n=loc.one();assert.ok(!n.props.disabled);n.props.onChange({target:{value}});flush();await tick()}
    loc.check=async()=>{const n=loc.one();assert.ok(!n.props.disabled);n.props.onChange({target:{checked:true}});flush();await tick()}
    loc.click=async()=>{const n=loc.one();assert.notEqual(n.type,'a','Never activate provider links');assert.ok(!n.props.disabled);n.props.onClick();flush();await tick();flush()}
    return loc
  }
  const context={route:async(pattern,handler)=>{assert.equal(pattern,'**/*');routeCalls.push('route');handlers.push(handler)},unroute:async(pattern,handler)=>{assert.equal(pattern,'**/*');routeCalls.push('unroute');const i=handlers.indexOf(handler);assert.ok(i>=0);handlers.splice(i,1)}}
  const page={url:()=>'http://127.0.0.1:3100'+window.location.pathname,context:()=>context,evaluate:async(fn,arg)=>structuredClone(evaluate(fn,arg)),locator:selector=>locator(()=>all().filter(n=>matches(n,selector)),selector),
    publicDetailTree:()=>core.CoreServiceDetail({locale,kind:'hypnotherapy'}),reloadComponent(){instances=new Map();dirty=true;flush()},snapshot:()=>({window,values,writes,requests,handlers,routeCalls,fallbacks,originalOpen}),flush,
    unmount(){for(const entry of instances.values())for(const s of entry.slots)s?.cleanup?.()},
  }
  flush();return page
}
async function observe(fn){let error;for(let i=0;i<20;i++){try{return fn()}catch(e){error=e;await tick()}}throw error}
export function expectRuntime(loc){const one=()=>loc.one();return{
  toHaveCount:n=>observe(()=>assert.equal(loc.all().length,n,'count '+loc.selector)),
  toBeVisible:()=>observe(()=>{assert.equal(loc.all().length,1);assert.ok(!one().props.hidden)}),
  toBeDisabled:()=>observe(()=>assert.equal(one().props.disabled,true)),
  toBeChecked:()=>observe(()=>assert.equal(one().props.checked,true)),not:{toBeChecked:()=>observe(()=>assert.equal(one().props.checked,false))},
  toHaveValue:value=>observe(()=>assert.equal(one().props.value,value)),
  toHaveText:value=>observe(()=>assert.equal(text(one()),value)),toContainText:value=>observe(()=>assert.ok(text(one()).includes(value))),
  toHaveAttribute:(key,value)=>observe(()=>assert.equal(one().props[key]===true?'':one().props[key],value)),
  toHaveURL:value=>observe(()=>assert.equal(loc.url(),value)),
}}
expectRuntime.poll=fn=>({toBe:async value=>{let actual;for(let i=0;i<20;i++){actual=await fn();if(Object.is(actual,value))return;await tick()}assert.equal(actual,value)},toEqual:async value=>{let error;for(let i=0;i<20;i++){try{assert.deepEqual(await fn(),value);return}catch(e){error=e;await tick()}}throw error}})
