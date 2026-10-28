import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

// Finite synthetic renderer. Actual component functions execute independently;
// each mounted type/key/path has its own hooks, stable setters, refs and cleanup.
// Host output is a logical tree, not a browser DOM or layout/E2E implementation.
export const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}}
export const response=(value,status=200)=>({ok:status>=200&&status<300,status,json:async()=>value})
export function readonlySearchParams(search){
  // Native subclass semantics keep forEach's receiver and valueOf on this same
  // read-only object; a Proxy bound to a mutable target would leak that target.
  class ReadonlySearchParams extends URLSearchParams {
    append(){throw new TypeError('Readonly search parameters')}
    delete(){throw new TypeError('Readonly search parameters')}
    set(){throw new TypeError('Readonly search parameters')}
    sort(){throw new TypeError('Readonly search parameters')}
  }
  return new ReadonlySearchParams(search)
}
export function compose({root,search='',locale='en',fetch,crmThreads=[]}){
  const instances=new Map(),modules=new Map(),effects=[],trace=[],timers=new Map();let nextTimer=0
  let current=null,dirty=true,tree=null,active=true,nextOperation=0,networkOnline=true,url=new URL('https://synthetic.invalid/'+locale+'/app/messages'+search)
  const networkListeners=new Map()
  function networkListener(type,fn,remove=false){
    if(!['online','offline','focus','document:visibilitychange'].includes(type))throw Error('Unexpected window event '+type)
    if(!networkListeners.has(type))networkListeners.set(type,new Set())
    if(remove)networkListeners.get(type).delete(fn);else networkListeners.get(type).add(fn)
  }
  // Synthetic object URLs only: never call host/browser blob or media methods.
  const objectURLs=new Set();let nextObjectURL=0
  class FixtureURL extends URL {
    static createObjectURL(file){assert.ok(file&&typeof file==='object');const value='blob:synthetic-preview-'+(++nextObjectURL);objectURLs.add(value);return value}
    static revokeObjectURL(value){objectURLs.delete(value)}
  }
  const typeIds=new WeakMap();let nextType=0
  const identity=type=>{if(!typeIds.has(type))typeIds.set(type,++nextType);return typeIds.get(type)}
  const equal=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]))
  const jsx=(type,props,key)=>({type,props:props||{},key:key??null})
  function slot(kind,create){assert.ok(current,'hook outside component');const index=current.index++;if(!current.slots[index]){current.slots[index]=create();current.slots[index].kind=kind};assert.equal(current.slots[index].kind,kind,'hook order changed');return current.slots[index]}
  const hooks={
    useState(initial){const fiber=current;const value=slot('state',()=>{const s={value:typeof initial==='function'?initial():initial};s.set=next=>{if(!active||!fiber.mounted){trace.push('late-setState-ignored');return}const n=typeof next==='function'?next(s.value):next;if(!Object.is(s.value,n)){s.value=n;dirty=true}};return s});return [value.value,value.set]},
    useRef(initial){return slot('ref',()=>({ref:{current:initial}})).ref},
    useMemo(fn,deps){const s=slot('memo',()=>({deps:undefined}));if(!equal(s.deps,deps)){s.value=fn();s.deps=deps}return s.value},
    useCallback(fn,deps){return hooks.useMemo(()=>fn,deps)},
    useEffect(fn,deps){const fiber=current,s=slot('effect',()=>({deps:undefined,cleanup:undefined}));if(!equal(s.deps,deps)){s.nextDeps=deps;effects.push({fiber,slot:s,fn})}},
  }
  function icon(props){return jsx('i',{'data-fixture-icon':true,...props})}
  function CrmFixture(props){hooks.useEffect(()=>{let alive=true;Promise.resolve().then(()=>{if(alive)props.onThreadsLoaded?.({loading:false,error:false,threads:crmThreads,partial:false})});return()=>{alive=false}},[props.onThreadsLoaded]);return jsx('fixture-crm',props)}
  function inert(name){return props=>jsx('fixture-'+name,props)}
  function VoiceRecorderFixture(props){
    assert.ok(['en','ru','es'].includes(props.locale),'recorder locale is explicit')
    assert.equal(typeof props.disabled,'boolean','recorder disabled wiring')
    assert.equal(typeof props.onRecorded,'function','recorder completion callback')
    if(props.onRecordingChange!==undefined)assert.equal(typeof props.onRecordingChange,'function','recorder state callback')
    // Preserve callbacks for explicit synthetic interaction, never invoke them on mount.
    return jsx('fixture-voice-recorder',props)
  }
  const externals={
    react:hooks,'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'Fragment'},
    'lucide-react':new Proxy({},{get:()=>icon}),
    'next/link':{default:props=>jsx('a',props)},
    // Keep identity stable until the synthetic URL query actually changes.
    'next/navigation':{useSearchParams:()=>hooks.useMemo(()=>readonlySearchParams(url.search),[url.search])},
    '@supabase/supabase-js':{createClient:()=>{throw Error('Forbidden storage/client operation')}},
    '@/components/session-photo-uploader':{preparePhoto:()=>{throw Error('Forbidden photo operation')}},
  }
  const actual=new Set(['messages-hub.jsx','messages-simple-inbox.jsx','direct-message-inbox.jsx','messages-contact-card.jsx','practice-request-conversation.jsx'])
  const boundary={
    // Recorder UI is outside these text/lifetime cases; never request microphone/media.
    './direct-voice-recorder':{default:VoiceRecorderFixture},
    './private-chat-photo':{default:()=>{throw Error('Forbidden photo renderer')}},
    './crm-telegram-photo':{default:()=>{throw Error('Forbidden photo renderer')}},
    './crm-messenger':{default:CrmFixture},
    './messages-client-requests':{default:inert('client-requests')},
    './practice-express-reports':{ClientExpressReportNotices:inert('express-notices')},
    './message-avatar':{default:inert('avatar')},
    './messages-avatar':{default:inert('avatar')},
    './public-enquiry-contact':{default:inert('public-enquiry')},
    './crm-business-enquiries':{default:inert('business-enquiries')},
  }
  function load(path){path=resolve(path);if(modules.has(path))return modules.get(path);const exports={};modules.set(path,exports)
    // Compile the exact .mjs helper bytes as CommonJS for this VM wrapper;
    // TypeScript otherwise forces .mjs output to keep ESM export syntax.
    const source=readFileSync(path,'utf8'),compiled=ts.transpileModule(source,{fileName:path.replace(/\.mjs$/,'.js'),compilerOptions:{allowJs:true,jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
    const context={exports,URL:FixtureURL,URLSearchParams,AbortController,console,crypto:{randomUUID:()=> '60000000-0000-4000-8000-'+String(++nextOperation).padStart(12,'0')},
      setTimeout:()=>{throw Error('Unexpected timer')},clearTimeout:()=>{},
      window:{get location(){return url},history:{state:null,replaceState:(_state,_title,path)=>{url=new URL(path,url)}},
        addEventListener:(type,fn)=>networkListener(type,fn),removeEventListener:(type,fn)=>networkListener(type,fn,true),
        setInterval:(fn,ms)=>{assert.equal(ms,60000);const id=++nextTimer;timers.set(id,fn);return id},clearInterval:id=>timers.delete(id)},
      document:{getElementById:()=>null,visibilityState:'visible',addEventListener:(type,fn)=>networkListener('document:'+type,fn),removeEventListener:(type,fn)=>networkListener('document:'+type,fn,true)},navigator:{get onLine(){return networkOnline},clipboard:{writeText:()=>{throw Error('Unexpected clipboard action')}}},
      fetch:(...args)=>{if(!active)trace.push('fetch-after-unmount');return fetch(...args)},
      require:key=>{
        // Use the exact pure upstream helper. Host refs remain null in this
        // logical renderer, so native viewport measurement is NOT simulated.
        if(key==='@/lib/practitioners/conversation-state')return load(resolve(root,'lib/practitioners/conversation-state.js'))
        if(key==='@/lib/app/mobile-inbox-height.mjs')return load(resolve(root,'lib/app/mobile-inbox-height.mjs'))
        if(key==='@/lib/app/messages-inbox-tabs.mjs')return load(resolve(root,'lib/app/messages-inbox-tabs.mjs'))
        if(key==='@/lib/app/messenger-private-media.mjs')return load(resolve(root,'lib/app/messenger-private-media.mjs'))
        if(key==='@/lib/practitioners/direct-message-policy.mjs'){
          const policy=load(resolve(root,'lib/practitioners/direct-message-policy.mjs'))
          return {directMediaMime:policy.directMediaMime,DIRECT_MEDIA_PROXY_MAX_BYTES:policy.DIRECT_MEDIA_PROXY_MAX_BYTES,
            directMediaSpec:()=>{throw Error('Forbidden media operation')}}
        }
        if(Object.hasOwn(externals,key))return externals[key]
        if(Object.hasOwn(boundary,key))return boundary[key]
        if(key.endsWith('.module.css'))return {default:new Proxy({},{get:(_t,k)=>key+':'+String(k)})}
        if(key.startsWith('./')&&actual.has(key.slice(2)+'.jsx'))return load(resolve(dirname(path),key+'.jsx'))
        throw Error('Unapproved module boundary '+key+' in '+path)
      },
    }
    vm.runInNewContext(compiled,context,{filename:path});return exports
  }
  const Hub=load(resolve(root,'components/app/messages-hub.jsx')).default
  function cleanup(fiber){fiber.mounted=false;for(const s of fiber.slots)if(s.kind==='effect'&&typeof s.cleanup==='function')s.cleanup();trace.push('unmounted:'+fiber.type.name)}
  function visit(element,path,seen,ancestors=[]){
    if(element==null||typeof element==='boolean')return null
    if(Array.isArray(element))return element.map((child,i)=>visit(child,path+'/'+(child?.key!=null?'key='+child.key:i),seen,ancestors)).filter(x=>x!=null)
    if(typeof element!=='object')return element
    if(typeof element.type==='function'){
      const id=path+'/component='+identity(element.type)+'/key='+String(element.key)
      let fiber=instances.get(id);if(!fiber){fiber={id,type:element.type,index:0,slots:[],mounted:true};instances.set(id,fiber);trace.push('mounted:'+fiber.type.name)}
      seen.add(id);fiber.index=0;fiber.props=element.props
      const previous=current;current=fiber;const result=element.type(element.props);current=previous
      const children=visit(result,id+'/render',seen,ancestors)
      return {type:element.type,props:element.props,key:element.key,children,component:true}
    }
    const node={type:element.type,props:element.props,key:element.key,ancestors}
    node.children=visit(element.props.children,path+'/'+String(element.type),seen,[...ancestors,node]);return node
  }
  function render(){assert.ok(active);dirty=false;effects.length=0;const seen=new Set();tree=visit(jsx(Hub,{locale}),'/root',seen)
    for(const [id,fiber] of instances)if(!seen.has(id)){cleanup(fiber);instances.delete(id)}
    // Child passive effects run before their parents, matching the relevant mount lifecycle.
    for(const e of effects.splice(0).sort((a,b)=>b.fiber.id.split('/').length-a.fiber.id.split('/').length)){
      if(!e.fiber.mounted)continue;if(typeof e.slot.cleanup==='function')e.slot.cleanup();e.slot.deps=e.slot.nextDeps;e.slot.cleanup=e.fn()
    }
  }
  async function settle(){let renders=0;for(let i=0;i<80;i++){await Promise.resolve();if(dirty){if(++renders>40)throw Error('Synthetic render did not converge');render()}}return tree}
  render()
  return {settle,get tree(){return tree},get url(){return url},trace,instances,
    setOnline(next){networkOnline=Boolean(next);for(const fn of networkListeners.get(networkOnline?'online':'offline')||[])fn()},
    objectURLCount(){return objectURLs.size},
    intervalCount(){return timers.size},
    networkListenerCount(){return [...networkListeners.values()].reduce((n,set)=>n+set.size,0)},
    rerender(){dirty=true},unmount(){active=false;for(const f of instances.values())cleanup(f);instances.clear()},
    nodes(){const walk=n=>n==null||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(walk):[n,...walk(n.children)];return walk(tree)},
  }
}
export const textContent=node=>node==null||typeof node==='boolean'?'':typeof node!=='object'?String(node):Array.isArray(node)?node.map(textContent).join(''):textContent(node.children??node.props?.children)
export const visible=node=>!node.component&&!node.props?.hidden&&!node.ancestors?.some(a=>a.props.hidden)
