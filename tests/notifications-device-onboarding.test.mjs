import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

// Compile and execute the actual rendered component. All browser, API, permission
// and subscription operations are in-memory fakes; no provider or DB is called.
const source=readFileSync(new URL('../components/app/notification-settings.jsx',import.meta.url),'utf8')
const compiled=ts.transpileModule(source,{compilerOptions:{
  jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,
}}).outputText
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}}
const flush=async()=>{for(let i=0;i<12;i++)await new Promise(resolve=>setImmediate(resolve))}
const nodes=tree=>Array.isArray(tree)?tree.flatMap(nodes):tree&&typeof tree==='object'
  ?[tree,...nodes(tree.props?.children)]:[]
const text=tree=>Array.isArray(tree)?tree.map(text).join(' '):tree&&typeof tree==='object'
  ?text(tree.props?.children):typeof tree==='string'||typeof tree==='number'?String(tree):''
function fixture({enabled=true,ready=true,supported=true,ios=false,permission='default',
  existing=false,messageAlerts=false,permissionWait=null,subscriptionWait=null,failRegistration=false,locale='en'}={}){
  const states=[],refs=[],effects=[],requests=[],calls={permission:0,lookup:0,subscribe:0,unsubscribe:0}
  let si=0,ri=0,ei=0,accountId='11111111-1111-4111-8111-111111111111',tree
  const initial={ready,publicKey:'BAAA',enabled,deviceCount:enabled?1:0,
    courseReminders:true,messageAlerts,reminderHour:19,liveActivitiesAvailable:true}
  const subscription={toJSON:()=>({endpoint:'https://fcm.googleapis.com/synthetic'}),
    unsubscribe:async()=>{calls.unsubscribe++;return true}}
  const worker={pushManager:{getSubscription:async()=>{calls.lookup++;return existing?subscription:null},
    subscribe:async()=>{calls.subscribe++;return subscription}}}
  const notification={permission,requestPermission:async()=>{calls.permission++;return permissionWait?permissionWait.promise:notification.permission==='denied'?'denied':'granted'}}
  const mockReact={
    useState(initialValue){const i=si++;if(!(i in states))states[i]=initialValue;return [states[i],value=>{states[i]=typeof value==='function'?value(states[i]):value}]},
    useRef(initialValue){const i=ri++;refs[i]||={current:initialValue};return refs[i]},
    useEffect(fn,deps){const i=ei++,previous=effects[i];if(!previous||deps.some((v,n)=>!Object.is(v,previous.deps[n])))effects[i]={fn,deps,cleanup:previous?.cleanup,pending:true}},
  }
  const modules={react:mockReact,'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:'fragment'},
    'lucide-react':{Bell:'Bell',BellOff:'BellOff',Clock3:'Clock3',Sparkles:'Sparkles'},
    '@/lib/app/client-fetch':{appFetch:async(path,body,_method,options)=>{
      requests.push({path,body,accountId:options.accountId})
      if(path==='notifications')return {...initial}
      if(path==='notifications/subscribe'){
        if(subscriptionWait)return subscriptionWait.promise
        if(failRegistration){const error=Error('DEVICE_ALREADY_REGISTERED');error.code='DEVICE_ALREADY_REGISTERED';throw error}
        return {...initial,enabled:true,deviceCount:existing?initial.deviceCount:initial.deviceCount+1}
      }
      if(path==='notifications/unsubscribe')return {...initial,enabled:false,deviceCount:0}
      if(path==='notifications/preferences')return {...initial,...body}
      if(path==='notifications/test')return {accepted:1}
      assert.fail('Unexpected API action '+path)
    }},
    './live-activity-control':{default:'LiveActivityControl'},
    './notification-settings.module.css':{default:new Proxy({},{get:(_target,key)=>key})},
  }
  const context={exports:{},require:name=>{assert.ok(name in modules,'Unmocked dependency '+name);return modules[name]},
    AbortController,Uint8Array,Intl,atob,
    window:{isSecureContext:true,matchMedia:()=>({matches:false}),...(supported?{Notification:notification,PushManager:{}}:{})},
    navigator:{userAgent:ios?'iPhone':'Android',standalone:false,...(supported?{serviceWorker:{ready:Promise.resolve(worker)}}:{})},
    Notification:notification,
  }
  vm.runInNewContext(compiled,context)
  const Component=context.exports.default
  const render=()=>{si=0;ri=0;ei=0;tree=Component({accountId,locale});return tree}
  const commit=()=>{for(const effect of effects)if(effect.pending){effect.cleanup?.();effect.cleanup=effect.fn();effect.pending=false}}
  const button=label=>nodes(tree).find(node=>node.type==='button'&&text(node).trim()===label)
  return {calls,requests,notification,initial,render,commit,button,
    get tree(){return tree},get enrollment(){return nodes(tree).find(node=>node.type==='button'&&node.props?.onClick?.name==='enable')},
    async mount(){render();commit();await flush();render()},
    changeAccount({commitEffect=true}={}){accountId='22222222-2222-4222-8222-222222222222';render();if(commitEffect)commit()},
    unmount(){for(const effect of effects)effect.cleanup?.()},
    async enable(){const control=nodes(tree).find(node=>node.type==='button'&&node.props?.onClick?.name==='enable');assert.ok(control,'current browser enrollment must be visible');assert.equal(control.props.disabled,false);await control.props.onClick();render()},
  }
}

test('another registered phone does not hide current browser enrollment or imply its confirmation',async()=>{
  const f=fixture();await f.mount()
  assert.ok(f.enrollment,'account enabled on another phone must not hide enrollment here')
  assert.equal(f.enrollment.props.disabled,false)
  assert.match(text(f.tree),/Push enabled for your account/)
  assert.match(text(f.tree),/Notifications are connected separately in each browser/)
  assert.equal(f.calls.permission,0);assert.equal(f.calls.lookup,0);assert.equal(f.calls.subscribe,0)
  assert.deepEqual(f.requests.map(r=>r.path),['notifications'])
  await f.enable()
  assert.equal(f.calls.permission,1);assert.equal(f.calls.subscribe,1)
  assert.equal(f.calls.unsubscribe,0)
  assert.deepEqual(f.requests.map(r=>r.path),['notifications','notifications/subscribe'])
  assert.equal(f.requests[1].body.messageAlerts,false,'device enrollment does not opt into private message alerts')
  assert.match(text(f.tree),/Registered devices\s*:\s*2/)
  assert.match(text(f.tree),/browser is registered for your account/)
  assert.equal(f.enrollment,undefined)
})

test('an existing local subscription is only confirmed after its account-scoped API registration',async()=>{
  const pending=deferred(),f=fixture({existing:true,subscriptionWait:pending});await f.mount()
  const action=f.enrollment.props.onClick();await flush();f.render()
  assert.match(text(f.tree),/Notifications are connected separately in each browser/)
  assert.equal(f.calls.subscribe,0);assert.equal(f.calls.unsubscribe,0)
  pending.resolve({...f.initial});await action;f.render()
  assert.match(text(f.tree),/browser is registered for your account/)
})

test('a subscription owned by another account remains unconfirmed on rejected registration',async()=>{
  const f=fixture({existing:true,failRegistration:true});await f.mount();await f.enable()
  assert.match(text(f.tree),/Notifications are connected separately in each browser/)
  assert.ok(f.enrollment);assert.equal(f.calls.unsubscribe,0)
  assert.doesNotMatch(text(f.tree),/browser is registered for your account/)
})

for(const [name,options,expected] of [
  ['missing server configuration',{ready:false},/not yet configured/],
  ['unsupported browser',{supported:false},/not supported/],
  ['uninstalled iPhone browser',{ios:true},/Add to Home Screen/],
])test(name+' cannot request notification permission',async()=>{
  const f=fixture(options);await f.mount()
  assert.equal(f.enrollment.props.disabled,true);assert.match(text(f.tree),expected)
  await f.enrollment.props.onClick();f.render()
  assert.equal(f.calls.permission,0);assert.equal(f.calls.subscribe,0)
  assert.deepEqual(f.requests.map(r=>r.path),['notifications'])
})

test('denied permission does not prompt again and can be retried after device settings change',async()=>{
  const f=fixture({permission:'denied'});await f.mount();await f.enable()
  assert.equal(f.calls.permission,0);assert.equal(f.calls.lookup,0)
  assert.match(text(f.tree),/blocked in browser or phone settings/)
  f.notification.permission='granted';await f.enable()
  assert.equal(f.calls.permission,1);assert.equal(f.calls.subscribe,1)
})

test('rapid repeated enrollment clicks perform one permission and one account registration',async()=>{
  const pending=deferred(),f=fixture({permissionWait:pending});await f.mount()
  const click=f.enrollment.props.onClick,first=click(),second=click()
  assert.equal(f.calls.permission,1)
  pending.resolve('granted');await Promise.all([first,second]);f.render()
  assert.equal(f.requests.filter(r=>r.path==='notifications/subscribe').length,1)
})

test('account changes before effect cleanup stop a pending permission from enrolling the prior account',async()=>{
  const pending=deferred(),f=fixture({permissionWait:pending});await f.mount()
  const action=f.enrollment.props.onClick
  const old=action();f.changeAccount({commitEffect:false});pending.resolve('granted');await old
  assert.equal(f.calls.lookup,0);assert.equal(f.calls.subscribe,0)
  assert.equal(f.requests.some(r=>r.path==='notifications/subscribe'),false)
  f.commit();await flush();f.render()
  assert.match(text(f.tree),/Notifications are connected separately in each browser/)
})

test('late registration success never confirms a newly selected account',async()=>{
  const pending=deferred(),f=fixture({subscriptionWait:pending});await f.mount()
  const action=f.enrollment.props.onClick();await flush();f.changeAccount()
  pending.resolve({...f.initial,deviceCount:2});await action;await flush();f.render()
  assert.match(text(f.tree),/Notifications are connected separately in each browser/)
  assert.doesNotMatch(text(f.tree),/browser is registered for your account/)
  assert.equal(f.calls.unsubscribe,0)
})

test('confirmed state is hidden immediately on account switch, before effects run',async()=>{
  const f=fixture();await f.mount();await f.enable()
  f.changeAccount({commitEffect:false})
  assert.match(text(f.tree),/Loading settings/)
  assert.doesNotMatch(text(f.tree),/browser is registered for your account/)
})

test('unmount cancels a pending registration without a stale confirmation',async()=>{
  const pending=deferred(),f=fixture({subscriptionWait:pending});await f.mount()
  const action=f.enrollment.props.onClick();await flush();f.unmount()
  pending.resolve({...f.initial,deviceCount:2});await action;f.render()
  assert.doesNotMatch(text(f.tree),/browser is registered for your account/)
})

test('Russian device setup keeps distinct account/device copy and an accessible status',async()=>{
  const f=fixture({locale:'ru'});await f.mount()
  assert.equal(text(f.enrollment).trim(),'Подключить этот браузер');assert.match(text(f.tree),/Push включены для аккаунта/)
  assert.ok(nodes(f.tree).some(n=>n.props?.role==='status'&&/Уведомления подключаются отдельно в каждом браузере/.test(text(n))))
  await f.enable();assert.match(text(f.tree),/браузер зарегистрирован для вашего аккаунта/)
})


test('account identity changes hide prior status, device count and preferences before effect cleanup',async()=>{
  const f=fixture({messageAlerts:true});await f.mount()
  assert.match(text(f.tree),/Registered devices\s*:\s*1/)
  assert.ok(nodes(f.tree).some(n=>n.type==='input'&&n.props.type==='checkbox'&&n.props.checked===true))
  f.changeAccount({commitEffect:false})
  assert.match(text(f.tree),/Loading settings/)
  assert.doesNotMatch(text(f.tree),/Push enabled for your account|Registered devices|Notify me about new private messages/)
  assert.equal(nodes(f.tree).filter(n=>n.type==='input'||n.type==='select'||n.type==='button').length,0)
  assert.equal(nodes(f.tree).find(n=>n.type==='LiveActivityControl').props.serverReady,false)
  assert.deepEqual(f.requests.map(r=>r.path),['notifications'])
})

test('successful enrollment is announced in exactly one live status region',async()=>{
  const f=fixture();await f.mount();await f.enable()
  const announcements=nodes(f.tree).filter(n=>n.props?.role==='status'&&/browser is registered for your account/.test(text(n)))
  assert.equal(announcements.length,1)
  assert.equal(text(f.tree).split('This browser is registered for your account.').length-1,1)
})

for(const locale of ['en','ru'])test(locale+' registration guidance avoids session jargon or claiming an existing browser is unregistered',async()=>{
  const f=fixture({locale,existing:true});await f.mount()
  assert.match(text(f.tree),locale==='ru'?/обновить его регистрацию/:/refresh its registration here/)
  assert.doesNotMatch(text(f.tree),/current session|this session|has not been confirmed|текущем сеансе|ещё не подтверждён/)
  assert.equal(f.calls.lookup,0);assert.equal(f.calls.permission,0)
})

test('Spanish retains existing English UI fallback without expanding backend locale support',async()=>{
  const f=fixture({locale:'es'});await f.mount()
  assert.equal(text(f.enrollment).trim(),'Enable this browser')
  assert.match(text(f.tree),/Notifications are connected separately in each browser/)
  assert.deepEqual(f.requests.map(r=>r.path),['notifications'])
})
