import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

// Same bounded hook/JSX approach as helpers/course-ui-harness.mjs.
// Only the real MessagesHub is evaluated; child inboxes are inert and all
// metadata requests are synthetic. No auth, CRM, provider or database I/O.
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const source=read('components/app/messages-hub.jsx')
const compiled=ts.transpileModule(source,{fileName:'messages-hub.jsx',compilerOptions:{
  allowJs:true,jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,
}}).outputText
const nodes=tree=>!tree||typeof tree!=='object'?[]:Array.isArray(tree)?tree.flatMap(nodes):
  [tree,...nodes(tree.props?.children)]
const part=(tree,name)=>nodes(tree).find(node=>node.type?.testName===name)
const section=(tree,name)=>nodes(tree).find(node=>node.type==='section'&&node.props.className===name)
const tab=(tree,id)=>nodes(tree).find(node=>node.props?.id==='hh-inbox-tab-'+id)
function mount({locale='en',search='',owner=true,slowRequests=false}={}){
  const slots=[],pending=[],calls=[]
  let index=0,dirty=false,tree
  let url=new URL('https://synthetic.invalid/'+locale+'/app/messages'+search)
  const equal=(a,b)=>a&&b&&a.length===b.length&&a.every((value,i)=>Object.is(value,b[i]))
  const hooks={
    useState(initial){const i=index++;slots[i]||={value:typeof initial==='function'?initial():initial}
      return [slots[i].value,next=>{slots[i].value=typeof next==='function'?next(slots[i].value):next;dirty=true}]},
    useCallback(fn,deps){const i=index++;if(!equal(slots[i]?.deps,deps))slots[i]={value:fn,deps};return slots[i].value},
    useEffect(fn,deps){const i=index++;if(!equal(slots[i]?.deps,deps))pending.push(()=>{
      slots[i]?.cleanup?.();slots[i]={deps,cleanup:fn()}})},
  }
  const stub=name=>Object.assign(()=>{throw Error('Child must remain inert: '+name)},{testName:name})
  const jsx=(type,props,key)=>({type,props,key})
  const modules={
    react:hooks,'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'Fragment'},
    'lucide-react':new Proxy({},{get:(_target,key)=>stub(String(key))}),
    './direct-message-inbox':{default:stub('DirectMessageInbox')},
    './crm-messenger':{default:stub('CrmMessengerPanel')},
    './messages-client-requests':{default:stub('MessagesClientRequests')},
    './messages-hub.module.css':{default:new Proxy({},{get:(_target,key)=>key})},
  }
  const exports={}
  const metadata={accountId:'10000000-0000-4000-8000-000000000001',ownerMessenger:owner,
    requests:[],businessEnquiries:[],services:[],hasPractice:true}
  const runtime={exports,URL,URLSearchParams,AbortController,
    require:key=>{assert.ok(Object.hasOwn(modules,key),'Unexpected import '+key);return modules[key]},
    window:{get location(){return url},history:{state:null,replaceState:(_state,_title,path)=>{url=new URL(path,url)}}},
    document:{getElementById:()=>null},
    fetch:async(path,options)=>{
      assert.ok(['/api/app/messages/requests?view=owner','/api/app/messages/requests'].includes(path))
      assert.equal(options.method,undefined,'only synthetic metadata GETs may occur')
      calls.push({path,options})
      if(slowRequests&&path==='/api/app/messages/requests')return new Promise(()=>{})
      return {ok:true,status:200,json:async()=>metadata}
    },
  }
  vm.runInNewContext(compiled,runtime)
  function render(){index=0;pending.length=0;dirty=false;tree=exports.default({locale});pending.splice(0).forEach(fn=>fn());return tree}
  async function settle(){for(let i=0;i<20;i++){await Promise.resolve();if(dirty)render()}return tree}
  render()
  return {settle,calls,get tree(){return tree},get url(){return url},
    unmount(){for(const slot of slots)slot?.cleanup?.()}}
}
async function scenario(options,check){
  const app=mount(options)
  try{await app.settle();await check(app);assert.equal(app.calls.length,2)}finally{app.unmount()}
}
for(const locale of ['en','ru','es']){
  test(locale+': valid practitioner deep link shows On-site for an owner',()=>scenario(
    {locale,search:'?to=synthetic-practitioner'},app=>{
      assert.equal(tab(app.tree,'chats').props['aria-selected'],true)
      assert.equal(section(app.tree,'direct').props.hidden,false)
      assert.equal(section(app.tree,'crm').props.hidden,true)
      assert.equal(part(app.tree,'DirectMessageInbox').props.locale,locale)
      assert.equal(part(app.tree,'DirectMessageInbox').props.ownerCrmAvailable,true)
    }))
}
test('valid recipient takes precedence over requests tab and slow website requests',()=>scenario(
  {search:'?tab=requests&to=synthetic-practitioner',slowRequests:true},app=>{
    assert.equal(tab(app.tree,'chats').props['aria-selected'],true)
    assert.equal(section(app.tree,'direct').props.hidden,false)
    assert.equal(section(app.tree,'crm').props.hidden,true)
  }))
test('ordinary owner entry retains Messengers as the default source',()=>scenario({},app=>{
  assert.equal(tab(app.tree,'chats').props['aria-selected'],true)
  assert.equal(section(app.tree,'crm').props.hidden,false)
  assert.equal(section(app.tree,'direct').props.hidden,true)
}))
test('request links without a recipient keep Requests selected',()=>scenario(
  {search:'?tab=requests'},app=>{
    assert.equal(tab(app.tree,'requests').props['aria-selected'],true)
    assert.equal(nodes(app.tree).find(n=>n.props?.id==='hh-inbox-panel-requests').props.hidden,false)
  }))
test('ordinary member has only the visible On-site inbox',()=>scenario({owner:false},app=>{
  assert.equal(section(app.tree,'direct').props.hidden,false)
  assert.equal(section(app.tree,'crm'),undefined)
  assert.equal(part(app.tree,'DirectMessageInbox').props.ownerCrmAvailable,false)
}))
test('member deep link retains the visible On-site inbox',()=>scenario(
  {owner:false,search:'?to=synthetic-practitioner'},app=>{
    assert.equal(section(app.tree,'direct').props.hidden,false)
    assert.equal(section(app.tree,'crm'),undefined)
  }))
for(const recipient of ['', 'a', 'UPPERCASE', 'with space', '../other', 'a'.repeat(91)]){
  test('invalid recipient preserves owner default: '+JSON.stringify(recipient),()=>scenario(
    {search:'?to='+encodeURIComponent(recipient)},app=>{
      assert.equal(section(app.tree,'crm').props.hidden,false)
      assert.equal(section(app.tree,'direct').props.hidden,true)
    }))
}
for(const recipient of ['ab','a'.repeat(90)]){
  test('valid recipient boundary opens On-site: '+recipient.length,()=>scenario(
    {search:'?to='+recipient},app=>{
      assert.equal(section(app.tree,'direct').props.hidden,false)
    }))
}
test('manual source/tab switches still work after a valid deep link',()=>scenario(
  {search:'?to=synthetic-practitioner'},async app=>{
    const buttons=nodes(app.tree).find(n=>n.props?.className==='sources').props.children
    buttons[0].props.onClick();await app.settle()
    assert.equal(section(app.tree,'crm').props.hidden,false)
    buttons[1].props.onClick();await app.settle()
    assert.equal(section(app.tree,'direct').props.hidden,false)
    tab(app.tree,'requests').props.onClick();await app.settle()
    assert.equal(tab(app.tree,'requests').props['aria-selected'],true)
    assert.equal(app.url.searchParams.get('tab'),'requests')
    assert.equal(app.url.searchParams.get('to'),'synthetic-practitioner')
  }))
test('actual profile link and direct recipient validation retain the same contract',()=>{
  const caller=read('app/[locale]/masters/[slug]/page.tsx')
  const inbox=read('components/app/direct-message-inbox.jsx')
  assert.match(caller,/practitioner\.canMessage &&/)
  assert.ok(caller.includes("'/app/messages?to=' + encodeURIComponent(practitioner.slug)"))
  assert.ok(inbox.includes("setDestination(/^[a-z0-9-]{2,90}$/.test(slug)?slug:'')"))
  assert.ok(inbox.includes("post({action:'start',slug:destination})"))
})

// Independent retained-state controls: synthetic callbacks only; child inboxes stay inert.
test('CRM request jump after deep link selects chats/CRM and keeps explicit thread sequence',()=>scenario(
  {search:'?to=synthetic-practitioner'},async app=>{
    tab(app.tree,'requests').props.onClick();await app.settle()
    const id='20000000-0000-4000-8000-000000000002'
    part(app.tree,'MessagesClientRequests').props.onOpenCrmThread(id);await app.settle()
    assert.equal(tab(app.tree,'chats').props['aria-selected'],true)
    assert.equal(section(app.tree,'crm').props.hidden,false)
    assert.equal(section(app.tree,'direct').props.hidden,true)
    assert.equal(part(app.tree,'CrmMessengerPanel').props.initialThreadId,id)
    assert.equal(part(app.tree,'CrmMessengerPanel').props.initialThreadSequence,1)
    part(app.tree,'MessagesClientRequests').props.onOpenCrmThread(id);await app.settle()
    assert.equal(part(app.tree,'CrmMessengerPanel').props.initialThreadSequence,2)
  }))
test('invalid CRM request jump does not displace valid direct recipient selection',()=>scenario(
  {search:'?to=synthetic-practitioner'},async app=>{
    part(app.tree,'MessagesClientRequests').props.onOpenCrmThread('../bad');await app.settle()
    assert.equal(tab(app.tree,'chats').props['aria-selected'],true)
    assert.equal(section(app.tree,'direct').props.hidden,false)
    assert.equal(section(app.tree,'crm').props.hidden,true)
    assert.equal(part(app.tree,'CrmMessengerPanel').props.initialThreadSequence,0)
  }))
test('compact open indicator follows selected source after valid deep link',()=>scenario(
  {search:'?to=synthetic-practitioner'},async app=>{
    part(app.tree,'DirectMessageInbox').props.onOpenChange(true);await app.settle()
    assert.equal(app.tree.props['data-thread-open'],true)
    const buttons=nodes(app.tree).find(n=>n.props?.className==='sources').props.children
    buttons[0].props.onClick();await app.settle()
    assert.equal(app.tree.props['data-thread-open'],undefined)
    part(app.tree,'CrmMessengerPanel').props.onOpenChange(true);await app.settle()
    assert.equal(app.tree.props['data-thread-open'],true)
    tab(app.tree,'requests').props.onClick();await app.settle()
    assert.equal(app.tree.props['data-thread-open'],undefined)
  }))
for(const [query,direct] of [['?to=synthetic-practitioner&to=',true],['?to=&to=synthetic-practitioner',false]]){
  test('duplicate recipient query agrees with child first-value semantics: '+query,()=>scenario(
    {search:query},app=>{
      assert.equal(section(app.tree,'direct').props.hidden,!direct)
      assert.equal(section(app.tree,'crm').props.hidden,direct)
    }))
}
