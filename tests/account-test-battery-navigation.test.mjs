// Synthetic UI-handler review. Actual component transpiled unchanged; no browser or database.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import {createRequire} from 'node:module'
import {pathToFileURL,fileURLToPath} from 'node:url'
import test from 'node:test'
import {randomUUID} from 'node:crypto'
const root=fileURLToPath(new URL('../',import.meta.url)).replace(/\/$/,'')
const require=createRequire(root+'/package.json'),ts=require('typescript')
const source=fs.readFileSync(root+'/components/app/account-test-battery.jsx','utf8')
const compiled=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true})
assert.equal(compiled.diagnostics.length,0)
const modules={}
for(const p of [...source.matchAll(/from '(@\/[^']+)'/g)].map(m=>m[1]))modules[p]=await import(pathToFileURL(root+p.slice(1)+'.js').href)
const entry=modules['@/lib/assessments/test-explorer'].buildExplorerEntries({locale:'en',audience:'account'}).find(e=>e.key==='hh-current-state')
assert(entry?.selectable)
const plan={id:'11111111-1111-4111-8111-111111111111',status:'active',revision:0,definitionIds:[entry.definition.id],completedRunIds:[],selectionPreferences:{}}
const run={id:'22222222-2222-4222-8222-222222222222'}
for(const routeOutcome of ['destination','competing-back','same-url-back','pre-reload-back','pre-reload-same-url-back','strict-effect-replay','unmount-before-reload'])test('saved test rows stay blocked until route commit: '+routeOutcome,async()=>{
const calls=[],routes=[],events=[],listeners=new Map()
let resolveReload,url='/en/app/tests',reloadResolved=false
const reloadPromise=new Promise(resolve=>resolveReload=()=>{reloadResolved=true;events.push('reload resolved');resolve()})
const router={replace(next){events.push('router.replace requested');routes.push({type:'replace',url:next,committed:false})},push(next){events.push('router.push requested');routes.push({type:'push',url:next,committed:false})}}
function commit(route){route.committed=true;url=route.url;props.requestedPlanId=new URL(url,'https://synthetic.invalid').searchParams.get('plan');dirty=true;events.push(route.type+' committed')}
const slots=[],effects=[];let index=0,dirty=true,tree
const runtime={jsx:(type,props)=>({type,props:props||{}}),jsxs:(type,props)=>({type,props:props||{}})}
const React={
 useState:init=>{const i=index++;if(!(i in slots))slots[i]=typeof init==='function'?init():init;return[slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;dirty=true}]},
 useRef:init=>{const i=index++;return slots[i]||(slots[i]={current:init})},
 useMemo:(fn,deps)=>{const i=index++,old=slots[i];if(!old||deps.some((x,k)=>x!==old.deps[k]))slots[i]={deps,value:fn()};return slots[i].value},
 useEffect:(fn,deps)=>{const i=index++,old=slots[i];if(!old||deps.some((x,k)=>x!==old.deps[k])){const slot={deps,fn,cleanup:old?.cleanup};slots[i]=slot;effects.push(()=>{slot.cleanup?.();slot.cleanup=fn()})}}
}
const TestExplorer=()=>null,Visual=()=>null,Dashboard=props=>runtime.jsxs('div',{children:[runtime.jsx('button',{onClick:props.onOpenFilters,children:'Open filters'}),props.children]})
const mod={exports:{}}
vm.runInNewContext(compiled.outputText,{
 module:mod,exports:mod.exports,require:p=>p==='react'?React:p==='react/jsx-runtime'?runtime:p==='next/navigation'?{useRouter:()=>router,useSearchParams:()=>new URL(url,'https://synthetic.invalid').searchParams,usePathname:()=>new URL(url,'https://synthetic.invalid').pathname}:p==='next/link'?{__esModule:true,default:props=>runtime.jsx('a',props)}:p==='lucide-react'?new Proxy({},{get:()=>()=>null}):p==='./test-explorer'?{TestExplorer}:p==='./test-explorer-visual'?{TestExplorerVisual:Visual}:p==='./my-tests-dashboard'?{MyTestsDashboard:Dashboard}:p.endsWith('.module.css')?{__esModule:true,default:new Proxy({},{get:(_,key)=>key})}:modules[p]||require(p),
 Intl,URL,URLSearchParams,crypto:{randomUUID},console,
 window:{addEventListener:(type,handler)=>listeners.set(type,handler),removeEventListener:(type)=>listeners.delete(type),sessionStorage:{getItem:()=>null,removeItem(){}},requestAnimationFrame:fn=>{fn();return 1},cancelAnimationFrame(){}},document:{getElementById:()=>null,querySelector:()=>null},
 fetch:async(path,options)=>{const body=options.body?JSON.parse(options.body):null;calls.push({path,body});events.push('POST '+path);if(path==='/api/app/test-plans')return{ok:true,status:201,json:async()=>plan};if(path==='/api/app/runs')return{ok:true,status:201,json:async()=>run};throw Error('Unexpected request '+path)}
})
const props={data:{results:[],runs:[],snapshot:null,activeTestPlan:null,latestTestPlan:null},locale:'en',requestedPlanId:null,reload:()=>{events.push('reload requested');return reloadPromise}}
function render(){index=0;dirty=false;tree=mod.exports.AccountTestBattery(props)}
function visit(node,fn){if(node==null||node===false)return;if(Array.isArray(node))return node.forEach(n=>visit(n,fn));if(typeof node!=='object')return;fn(node);if(typeof node.type==='function')return visit(node.type(node.props),fn);visit(node.props.children,fn)}
function nodes(predicate){const out=[];visit(tree,n=>{if(predicate(n))out.push(n)});return out}
const text=n=>n==null||n===false?'':Array.isArray(n)?n.map(text).join(''):typeof n==='object'?text(n.props?.children):String(n)
async function flush(){for(let n=0;n<30;n++){if(dirty)render();while(effects.length)effects.shift()();await Promise.resolve()}if(dirty)render()}
const startButton=()=>nodes(n=>n.type==='button'&&text(n)==='Start test')[0]
render();await flush()
const explorer=nodes(n=>n.type===TestExplorer)[0];assert(explorer)
const creating=explorer.props.onStart([entry],{})
await flush()
assert.equal(reloadResolved,false);assert(startButton());assert.equal(startButton().props.disabled,true)
assert.equal(routes.length,0);assert.equal(calls.filter(c=>c.path.endsWith('/runs')).length,0)
console.log('PASS: saved row exists while reload is deferred, but Start test is disabled; no run API or navigation requested.')
const beforeReloadBack=routeOutcome.startsWith('pre-reload')
const success=routeOutcome==='destination'||routeOutcome==='strict-effect-replay'
if(routeOutcome==='strict-effect-replay'||routeOutcome==='unmount-before-reload'){
 const effectSlots=slots.filter(s=>s?.fn);for(const slot of effectSlots)slot.cleanup?.()
 if(routeOutcome==='strict-effect-replay')for(const slot of effectSlots)slot.cleanup=slot.fn()
}
if(beforeReloadBack){listeners.get('popstate')();if(routeOutcome==='pre-reload-back')commit({type:'back',url:'/en/app/tests?filter=remaining'});await flush()}
resolveReload();await creating;await flush()
if(routeOutcome==='unmount-before-reload'){assert.equal(routes.length,0);assert.equal(calls.filter(c=>c.path.endsWith('/test-plans')).length,1);return}
if(!beforeReloadBack){
assert.equal(routes.length,1);assert.equal(routes[0].type,'replace');assert.equal(routes[0].committed,false)
assert.equal(startButton().props.disabled,true)
// Even an already queued handler must refuse to create or open a run.
startButton().props.onClick();await flush()
assert.equal(calls.filter(c=>c.path.endsWith('/runs')).length,0)
assert.deepEqual(routes.map(r=>r.type),['replace'])
if(routeOutcome==='same-url-back')listeners.get('popstate')();else commit(success?routes[0]:{type:'back',url:'/en/app/tests?filter=remaining'});await flush()
}
assert.equal(startButton().props.disabled,false)
// Saving the same selection at its exact destination needs no new transition.
if(success){
nodes(n=>n.type==='button'&&text(n)==='Open filters')[0].props.onClick();await flush()
const existingExplorer=nodes(n=>n.type===TestExplorer)[0];assert(existingExplorer)
await existingExplorer.props.onStart([entry],{});await flush()
assert.equal(routes.length,1)
assert.equal(startButton().props.disabled,false)
}
assert.equal(routes.length,beforeReloadBack?0:1,'a competing route must not replay the pending destination')
startButton().props.onClick();await flush()
const postedRuns=calls.filter(c=>c.path.endsWith('/runs'))
assert.equal(postedRuns.length,1)
assert.deepEqual({key:postedRuns[0].body.definitionKey,version:postedRuns[0].body.definitionVersion,locale:postedRuns[0].body.instrumentLocale},{key:entry.definition.key,version:entry.definition.version,locale:entry.definition.instrumentLocale})
assert.deepEqual(routes.map(r=>r.type),beforeReloadBack?['push']:['replace','push'])
assert.equal(routes.at(-1).url,'/en/app/runs/'+run.id+'?mode=quick&plan='+plan.id)
})
