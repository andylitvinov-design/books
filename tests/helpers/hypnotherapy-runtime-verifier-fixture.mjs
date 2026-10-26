// No browser or network: run the genuine TSX event handlers and verifier's real
// assertion sequence against a small DOM/locator adapter. This is not browser QA.
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {pathToFileURL, fileURLToPath} from 'node:url'
import {randomUUID} from 'node:crypto'
import vm from 'node:vm'
import ts from 'typescript'
import {hypnotherapyService, installHypnotherapyPopupSpy, HYPNOTHERAPY_RECEIPT_KEY} from '../../scripts/helpers/hypnotherapy-enquiry-journey-verifier.mjs'
const root=resolve(process.env.HYPNOTHERAPY_RUNTIME_ROOT || fileURLToPath(new URL('../..',import.meta.url)))
const source=await readFile(resolve(root,'components/compact-lead-capture.tsx'),'utf8')
const whatsapp=await import(pathToFileURL(resolve(root,'lib/whatsapp-enquiry.js')))
const receiptModule=await import(pathToFileURL(resolve(root,'lib/practitioners/enquiry-receipt.mjs')))
const tick=() => new Promise(resolve => setImmediate(resolve))
const children=node => {const result=[];function walk(value){if(Array.isArray(value)) return value.forEach(walk);if(!value || typeof value!=='object'|| !('type' in value)) return;result.push(value);walk(value.props.children)}walk(node);return result}
const text=node => {if (Array.isArray(node)) return node.map(text).join('');if(typeof node==='string'||typeof node==='number') return String(node);return node?.props ? text(node.props.children) : ''}
export function runtimePage(locale, receipt, {denyReceiptStorage=false}={}) {
  class Store {constructor(){this.values=new Map()}setItem(key,value){this.values.set(key,String(value))}getItem(key){return this.values.get(key)??null}}
  const sessionStorage=new Store()
  const window={crypto:{randomUUID},sessionStorage,location:{pathname:`/${locale}/services/hypnotherapy-course`},open:() => assert.fail('No real window')}
  const sandbox={window,sessionStorage,Storage:Store,DOMException,URL,URLSearchParams,Date,console}
  const evaluate=(fn,arg) => vm.runInNewContext('('+fn.toString()+')('+JSON.stringify(arg)+')',sandbox)
  evaluate(installHypnotherapyPopupSpy,{receiptKey:HYPNOTHERAPY_RECEIPT_KEY,denyReceiptStorage})
  let slots=[],index=0,dirty=true,tree,pending=[]
  const same=(a,b) => a&&b&&a.length===b.length&&a.every((value,i) => Object.is(value,b[i]))
  const hooks={
    useState(initial){const i=index++;if(!slots[i])slots[i]={value:typeof initial==='function'?initial():initial};return [slots[i].value,value => {const next=typeof value==='function'?value(slots[i].value):value;if(!Object.is(next,slots[i].value)){slots[i].value=next;dirty=true}}]},
    useRef(initial){const i=index++;if(!slots[i])slots[i]={current:initial};return slots[i]},
    useEffect(effect,deps){const i=index++;if(!slots[i]||!same(slots[i].deps,deps)){const prior=slots[i];slots[i]={deps,cleanup:prior?.cleanup};pending.push(() => {slots[i].cleanup?.();slots[i].cleanup=effect()})}},
  }
  hooks.useLayoutEffect=hooks.useEffect
  const element=(type,props) => ({type,props:props||{}}),empty=() => null
  const imports={react:hooks,'react/jsx-runtime':{jsx:element,jsxs:element,Fragment:'fragment'},'next/navigation':{usePathname:() => window.location.pathname},'lucide-react':new Proxy({},{get:() => empty}),'@/components/static-portrait':{StaticPortrait:empty},'@/lib/whatsapp-enquiry':whatsapp,'@/lib/practitioners/enquiry-receipt.mjs':receiptModule}
  const loaded={exports:{}}
  sandbox.exports=loaded.exports;sandbox.module=loaded;sandbox.require=path => {if(path.endsWith('.module.css'))return{default:{}};assert.ok(path in imports,'unapproved import '+path);return imports[path]}
  sandbox.fetch=(url,options) => new Promise((resolveResponse,reject) => {
    assert.equal(url,'/api/service-enquiries');assert.equal(options.method,'POST')
    const r={request:() => ({postData:() => options.body,headers:() => ({'content-type':options.headers['Content-Type']})}),fulfill:async response => resolveResponse({ok:response.status>=200&&response.status<300,status:response.status,json:async () => JSON.parse(response.body)}),abort:async () => reject(Error('Synthetic abort'))}
    receipt.accept(r).catch(reject)
  })
  const code=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  vm.runInNewContext(code,sandbox)
  const component=loaded.exports.CompactLeadCapture
  function flush(){for(let count=0;dirty;count++){assert.ok(count<30,'render loop');dirty=false;index=0;pending=[];tree=component({locale,serviceTitle:hypnotherapyService(locale),title:'Synthetic title',lead:'Synthetic only'});for(const effect of pending)effect()}}
  flush()
  function matches(node,selector){
    if(selector==='[data-compact-lead-form]')return 'data-compact-lead-form' in node.props
    if(selector==='input[name="contact"]')return node.type==='input'&&node.props.name==='contact'
    if(selector==='input[type="checkbox"]')return node.type==='input'&&node.props.type==='checkbox'
    if(selector==='[role="alert"]')return node.props.role==='alert'
    if(selector==='[data-lead-saved][role="status"]')return 'data-lead-saved' in node.props&&node.props.role==='status'
    const channel=selector.match(/^(a|button)\[data-compact-channel(?:="(whatsapp|telegram)")?\]$/)
    assert.ok(channel,'unknown selector '+selector)
    return node.type===channel[1]&&'data-compact-channel' in node.props&&(!channel[2]||node.props['data-compact-channel']===channel[2])
  }
  function locator(get,selector){
    const loc={selector,all:() => {flush();return get()},locator:next => locator(() => loc.all().flatMap(node => children(node).slice(1)).filter(node => matches(node,next)),next),scrollIntoViewIfNeeded:async () => {},getAttribute:async name => loc.one().props[name]??null}
    loc.one=() => {const all=loc.all();assert.equal(all.length,1,'one '+selector);return all[0]}
    loc.fill=async value => {const node=loc.one();assert.ok(!node.props.disabled,'enabled fill');node.props.onChange({target:{value}});flush();await tick()}
    loc.check=async () => {const node=loc.one();assert.ok(!node.props.disabled,'enabled check');node.props.onChange({target:{checked:true}});flush();await tick()}
    loc.click=async () => {const node=loc.one();assert.ok(!node.props.disabled,'enabled click');node.props.onClick();flush();await tick();flush()}
    return loc
  }
  const page={url:() => 'http://127.0.0.1:3100'+window.location.pathname,evaluate:async (fn,arg) => structuredClone(evaluate(fn,arg)),locator:selector => {
    assert.equal(selector,'[data-sitewide-capture="core-service"][data-core-service-capture="hypnotherapy"]')
    return locator(() => [tree],selector)
  },flush,unmount:() => {for(const slot of slots)slot?.cleanup?.()},snapshot:() => ({window,sessionStorage})}
  return page
}
async function retry(fn){let error;for(let i=0;i<30;i++){try{return fn()}catch(e){error=e;await tick()}}throw error}
export function expectRuntime(locator){
  const one=() => locator.one()
  const result={
    toHaveCount:n => retry(() => assert.equal(locator.all().length,n,'count '+locator.selector)),
    toBeVisible:() => retry(() => assert.ok(locator.all().length,'visible '+locator.selector)),
    toBeEnabled:() => retry(() => assert.ok(!one().props.disabled,'enabled '+locator.selector)),
    toBeDisabled:() => retry(() => assert.equal(one().props.disabled,true,'disabled '+locator.selector)),
    toBeChecked:() => retry(() => assert.equal(one().props.checked,true,'checked '+locator.selector)),
    toHaveValue:value => retry(() => assert.equal(one().props.value,value)),
    toContainText:value => retry(() => assert.ok(text(one()).includes(value))),
    toHaveAttribute:(key,value) => retry(() => assert.equal(one().props[key],value)),
    toHaveURL:value => retry(() => assert.equal(locator.url(),value)),
    not:{toBeChecked:() => retry(() => assert.equal(one().props.checked,false))},
  }
  return result
}
expectRuntime.poll=fn => ({toBe:async expected => {let actual;for(let i=0;i<30;i++){actual=await fn();if(Object.is(actual,expected))return;await tick()}assert.equal(actual,expected)},toEqual:async expected => {let error;for(let i=0;i<30;i++){try{assert.deepEqual(await fn(),expected);return}catch(e){error=e;await tick()}}throw error}})
