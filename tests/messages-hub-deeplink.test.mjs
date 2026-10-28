import test from 'node:test'
import assert from 'node:assert/strict'
import {fileURLToPath} from 'node:url'
import {compose,deferred,response,textContent,visible} from './helpers/messages-owner-handoff-harness.mjs'

const ROOT=process.env.SOURCE_ROOT||fileURLToPath(new URL('../',import.meta.url))
const A='10000000-0000-4000-8000-000000000001',B='10000000-0000-4000-8000-000000000002'
const T='20000000-0000-4000-8000-000000000001',U='20000000-0000-4000-8000-000000000002',C='30000000-0000-4000-8000-000000000001',R='40000000-0000-4000-8000-000000000001',E='50000000-0000-4000-8000-000000000001'
const SLUG='synthetic-practitioner'
const row={id:T,peerName:'Synthetic direct person',updatedAt:'2026-10-26T00:00:00Z',unread:0}
function fixture(options={}){
  const calls=[],violations=[];let account=options.account||A,list=options.threads||[],startCount=0
  const sendQueue=[...(options.sendQueue||[])],requestQueue=[...(options.requestQueue||[])]
  const queued=new Map();for(const [key,value] of Object.entries(options.queue||{}))queued.set(key,[...value])
  const metadata=()=>({accountId:account,ownerMessenger:options.owner!==false,ownerAuthorized:options.owner!==false,requests:options.requests||[],businessEnquiries:options.business||[],services:[],hasPractice:true})
  const fetch=async(path,init={})=>{
    const method=init.method||'GET';let body
    if(init.body)body=JSON.parse(init.body)
    calls.push({path,method,body,headers:init.headers})
    const key=method+' '+path
    if(options.requestLifetime&&path.startsWith('/api/app/practitioner-client-messages')){
      assert.equal(init.headers['X-HH-Account-Id'],account)
      if(method==='GET'){
        assert.equal(path,'/api/app/practitioner-client-messages?requestId='+R)
        return response({requestId:R,messages:[],nextCursor:null,unseenCount:0,canReply:true,canNote:false})
      }
      assert.equal(method,'POST');assert.equal(path,'/api/app/practitioner-client-messages');assert.ok(options.allowRequestSend)
      assert.equal(body.requestId,R);assert.equal(body.text,'Synthetic request reply');assert.equal(body.visibility,'participants');assert.match(body.operationId,/^60000000-0000-4000-8000-/)
      assert.ok(requestQueue.length,'unapproved extra request send');const result=requestQueue.shift();return typeof result==='function'?result():result
    }
    if(method==='GET'&&!['/api/app/messages/requests?view=owner','/api/app/messages/requests','/api/public/telegram-diagnostic','/api/app/direct-messages','/api/app/direct-messages?threadId='+T,'/api/app/direct-messages?threadId='+U].includes(path)){violations.push(key);throw Error('Forbidden network '+key)}
    if(method!=='GET'&&!(method==='POST'&&path==='/api/app/direct-messages'&&(body?.action==='start'||(options.allowSend&&body?.action==='send')))){violations.push(key+' '+body?.action);throw Error('Forbidden mutation '+key)}
    if(method==='POST'){
      assert.equal(init.headers['x-hh-account-id'],account,'Start must remain account-pinned')
      if(body.action==='send'){
        assert.ok((options.allowOtherSend?[T,U]:[T]).includes(body.threadId));assert.equal(body.text,'Synthetic explicit reply')
        if(sendQueue.length){const result=sendQueue.shift();return typeof result==='function'?result():result}
        return response({ok:true})
      }
      assert.equal(body.slug,SLUG);startCount++
      if(startCount>1){violations.push('second start');throw Error('Unapproved duplicate Start')}
    }
    const q=queued.get(key);if(q?.length){const result=q.shift();return typeof result==='function'?result():result}
    if(path==='/api/app/messages/requests?view=owner'||path==='/api/app/messages/requests')return response(metadata())
    if(path==='/api/public/telegram-diagnostic')return response({available:false})
    if(method==='POST'){list=options.missingRow?[]:[...list.filter(item=>item.id!==T),row];return response({threadId:T})}
    if(path==='/api/app/direct-messages')return response({accountId:account,threads:list})
    const threadId=new URL(path,'https://synthetic.invalid').searchParams.get('threadId');return response({threadId,accountId:account,peerName:list.find(item=>item.id===threadId)?.peerName||'Synthetic direct person',messages:[],blocked:false,isRecipient:false})
  }
  const app=compose({root:ROOT,search:options.search??'?to='+SLUG,locale:options.locale||'en',fetch,crmThreads:options.crm||[]})
  const nodes=()=>app.nodes(),shell=()=>nodes().find(n=>n.props&&Object.hasOwn(n.props,'data-simple-messages'))
  const starts=()=>nodes().filter(n=>n.type==='button'&&textContent(n).includes(': '+SLUG))
  const visibleStarts=()=>starts().filter(visible)
  const button=label=>nodes().find(n=>n.type==='button'&&(n.props['aria-label']===label||textContent(n)===label))
  const person=name=>nodes().find(n=>n.type==='button'&&n.props.className?.includes('person')&&textContent(n).includes(name))
  return {app,calls,violations,queued,nodes,shell,starts,visibleStarts,button,person,
    async folder(id){
      const tab=nodes().find(n=>n.type==='button'&&n.props.id==='hh-simple-tab-'+id)
      assert.ok(tab,'expected folder '+id)
      if(!tab.props['aria-selected']){tab.props.onClick();await app.settle()}
    },
    setAccount(next){account=next},setList(next){list=next},
    assertClean(){assert.deepEqual(violations,[]);assert.ok(!app.trace.includes('fetch-after-unmount'),'no requests after unmount')},
    async click(n){assert.ok(n,'expected button');assert.ok(!n.props.disabled,'button disabled');n.props.onClick?.({preventDefault(){}});await app.settle()},
    close(){app.unmount();assert.deepEqual(violations,[])},
  }
}
async function run(options,fn){const f=fixture(options);try{await f.app.settle();await fn(f);f.assertClean()}finally{f.close()}}
function assertOwnerIntent(f){assert.equal(f.visibleStarts().length,1,'manual Start must be visible through all ancestors');assert.equal(f.shell()?.props['data-detail-open'],'true');assert.equal(f.calls.filter(c=>c.method==='POST').length,0,'arrival must not write');assert.equal(f.calls.filter(c=>c.path.includes('?threadId=')).length,0,'arrival must not open/read a prior conversation')}
for(const locale of ['en','ru','es'])test(locale+': actual composed owner reveals existing manual Start with zero POST',()=>run({locale},assertOwnerIntent))
for(const [locale,label] of [['en','Offline'],['ru','Нет интернета'],['es','Sin conexión']])test(locale+': upstream offline notice and listener cleanup survive handoff bridge',()=>run({locale,search:''},async f=>{
  const notice=()=>f.nodes().find(n=>n.type==='p'&&n.props.className?.includes(':offline'))
  assert.equal(notice(),undefined);assert.equal(f.app.networkListenerCount(),2)
  const calls=f.calls.length
  f.app.setOnline(false);await f.app.settle();assert.ok(notice()&&visible(notice())&&textContent(notice()).startsWith(label))
  f.app.setOnline(true);await f.app.settle();assert.equal(notice(),undefined)
  assert.equal(f.calls.length,calls,'network notice must not add reads or writes')
  f.app.unmount();assert.equal(f.app.networkListenerCount(),0)
}))
test('recipient-only detail is not a real row and mounts no private avatar or request conversation',()=>run({},f=>{
  assertOwnerIntent(f)
  assert.equal(f.nodes().filter(n=>n.type==='button'&&n.props.className?.includes('person')).length,0)
  assert.equal(f.nodes().filter(n=>n.component&&n.type.name==='PrivateAvatar').length,0)
  assert.equal(f.nodes().filter(n=>n.component&&['PracticeRequestConversation','MessagesContactCard'].includes(n.type.name)).length,0)
  assert.equal(f.nodes().filter(n=>n.type==='button'&&n.props.className?.includes(':cardButton')).length,0)
  assert.ok(f.calls.every(c=>c.method==='GET'&&!c.path.includes('photo')&&!c.path.includes('media')&&!c.path.includes('threadId=')))
}))
test('member retains URL-driven manual recipient path',()=>run({owner:false},f=>{assert.equal(f.shell(),undefined);assert.equal(f.visibleStarts().length,1);assert.equal(f.calls.filter(c=>c.method==='POST').length,0)}))
for(const slug of ['', 'a','UPPERCASE','../bad','x'.repeat(91)])test('invalid recipient remains ordinary owner list: '+JSON.stringify(slug),()=>run({search:'?to='+encodeURIComponent(slug)},f=>{assert.equal(f.shell()?.props['data-detail-open'],'false');assert.equal(f.nodes().filter(n=>n.type==='button'&&visible(n)&&/Message:|Написать мастеру:|Enviar mensaje:/.test(textContent(n))).length,0);assert.equal(f.calls.filter(c=>c.method==='POST').length,0)}))
test('absent recipient remains ordinary owner list',()=>run({search:''},f=>{assert.equal(f.shell()?.props['data-detail-open'],'false');assert.ok(!visible(f.nodes().find(n=>n.props?.['data-simple-detail']===true)),'direct pane must remain ancestor-hidden');assert.equal(f.calls.filter(c=>c.method==='POST').length,0)}))
for(const slug of ['ab','a'.repeat(90)])test('recipient valid length boundary '+slug.length,()=>run({search:'?to='+slug},f=>{assert.equal(f.shell()?.props['data-detail-open'],'true');assert.ok(f.nodes().some(n=>n.type==='button'&&visible(n)&&textContent(n).includes(': '+slug)));assert.equal(f.calls.filter(c=>c.method==='POST').length,0)}))
test('duplicate invalid first recipient does not open valid second',()=>run({search:'?to=&to='+SLUG},f=>{assert.equal(f.shell()?.props['data-detail-open'],'false');assert.equal(f.visibleStarts().length,0)}))
test('duplicate valid first recipient opens despite invalid second',()=>run({search:'?to='+SLUG+'&to='},assertOwnerIntent))
test('one manual Start selects authorized real direct thread, never sends',()=>run({},async f=>{assertOwnerIntent(f);await f.click(f.visibleStarts()[0]);assert.equal(f.calls.filter(c=>c.method==='POST').length,1);assert.ok(f.person(row.peerName),'authorized list row should exist');assert.equal(f.person(row.peerName).props['aria-pressed'],true);assert.equal(f.visibleStarts().length,0);assert.equal(f.shell()?.props['data-detail-open'],'true')}))
test('Back consumes recipient and preserves unrelated URL/hash; refresh does not replay',()=>run({search:'?to='+SLUG+'&keep=1#anchor'},async f=>{assertOwnerIntent(f);await f.click(f.button('Conversations'));assert.equal(f.shell().props['data-detail-open'],'false');assert.equal(f.visibleStarts().length,0);assert.equal(f.app.url.searchParams.get('keep'),'1');assert.equal(f.app.url.hash,'#anchor');await f.click(f.button('Refresh'));assert.equal(f.visibleStarts().length,0);assert.equal(f.shell().props['data-detail-open'],'false');assert.equal(f.calls.filter(c=>c.method==='POST').length,0)}))
for(const kind of ['crm','direct','request','business'])test('selecting real '+kind+' row consumes pending recipient',()=>{
 const name='Synthetic '+kind+' target',opt={}
 if(kind==='crm')opt.crm=[{id:C,name,channel:'telegram',unreadCount:0}]
 if(kind==='direct')opt.threads=[{...row,peerName:name}]
 if(kind==='request')opt.requests=[{id:R,contact:{name},requestKind:'public',message:'Synthetic request'}]
 if(kind==='business')opt.business=[{id:E,name,question:'Synthetic business',status:'new'}]
 return run(opt,async f=>{assertOwnerIntent(f);await f.folder(['request','business'].includes(kind)?'requests':'chats');await f.click(f.person(name));assert.equal(f.visibleStarts().length,0);assert.equal(f.person(name).props['aria-pressed'],true);f.app.rerender();await f.app.settle();assert.equal(f.visibleStarts().length,0);assert.equal(f.calls.filter(c=>c.method==='POST').length,0)})
})

test('delayed owner bootstrap reaches recipient while website requests stay pending',async()=>{
 const owner=deferred(),web=deferred();const f=fixture({queue:{'GET /api/app/messages/requests?view=owner':[owner.promise],'GET /api/app/messages/requests':[web.promise]}})
 try{await f.app.settle();assert.equal(f.shell(),undefined);assert.equal(f.visibleStarts().length,0);owner.resolve(response({accountId:A,ownerMessenger:true}));await f.app.settle();assertOwnerIntent(f)}finally{f.close()}
})
test('failed website requests do not block verified owner recipient',()=>run({queue:{'GET /api/app/messages/requests':[response({error:'SYNTHETIC_UNAVAILABLE'},503)]}},assertOwnerIntent))
test('owner/request account mismatch cannot expose stale recipient control',()=>run({queue:{'GET /api/app/messages/requests':[response({accountId:B,ownerMessenger:true,requests:[],businessEnquiries:[]})]}},f=>{assert.equal(f.shell(),undefined);assert.equal(f.visibleStarts().length,0);assert.equal(f.calls.filter(c=>c.method==='POST').length,0)}))
test('mismatched authorized direct list never enables manual Start',()=>run({queue:{'GET /api/app/direct-messages':[response({accountId:B,threads:[]})]}},f=>{const b=f.visibleStarts()[0];assert.ok(!b||b.props.disabled);assert.equal(f.calls.filter(c=>c.method==='POST').length,0)}))
test('failed explicit Start remains an error, with no retry or invented row',()=>run({queue:{'POST /api/app/direct-messages':[response({error:'SYNTHETIC_START_FAILED'},503)]}},async f=>{assertOwnerIntent(f);await f.click(f.visibleStarts()[0]);assert.equal(f.calls.filter(c=>c.method==='POST').length,1);assert.equal(f.person(row.peerName),undefined);assert.ok(f.nodes().some(n=>n.props?.role==='alert'&&visible(n)));f.app.rerender();await f.app.settle();assert.equal(f.calls.filter(c=>c.method==='POST').length,1)}))
test('returned start ID absent from authorized list is not a fabricated selection',()=>run({missingRow:true},async f=>{assertOwnerIntent(f);await f.click(f.visibleStarts()[0]);assert.equal(f.person(row.peerName),undefined);assert.equal(f.calls.filter(c=>c.path.includes('?threadId=')).length,0);assert.equal(f.calls.filter(c=>c.method==='POST').length,1);assert.ok(f.nodes().some(n=>n.props?.role==='alert'&&visible(n)))}))
for(const leave of ['back','crm','unmount','account'])test('late Start after '+leave+' cannot reopen or issue follow-on reads',async()=>{
 const start=deferred(),f=fixture({crm:[{id:C,name:'Synthetic CRM target',channel:'telegram',unreadCount:0}],queue:{'POST /api/app/direct-messages':[start.promise]}})
 try{await f.app.settle();assertOwnerIntent(f);await f.click(f.visibleStarts()[0]);assert.equal(f.calls.filter(c=>c.method==='POST').length,1)
 if(leave==='back')await f.click(f.button('Conversations'))
 if(leave==='crm')await f.click(f.person('Synthetic CRM target'))
 if(leave==='unmount')f.app.unmount()
 if(leave==='account'){f.setAccount(B);await f.click(f.button('Refresh'));assert.equal(f.visibleStarts().length,0)}
 const count=f.calls.length;f.setList([row]);start.resolve(response({threadId:T}));await f.app.settle();assert.equal(f.calls.length,count,'stale start completion must not trigger follow-on reads');f.assertClean()
 if(leave==='back')assert.equal(f.shell().props['data-detail-open'],'false')
 if(leave==='crm')assert.equal(f.person('Synthetic CRM target').props['aria-pressed'],true)
 if(leave==='account'){assert.equal(f.visibleStarts().length,0);assert.equal(f.shell().props['data-detail-open'],'false')}
 }finally{f.close()}
})
for(const leave of ['back','crm','unmount','account'])test('late post-Start list after '+leave+' cannot steal selection',async()=>{
 const list=deferred(),f=fixture({crm:[{id:C,name:'Synthetic CRM target',channel:'telegram',unreadCount:0}],queue:{'GET /api/app/direct-messages':[response({accountId:A,threads:[]}),list.promise]}})
 try{await f.app.settle();assertOwnerIntent(f);await f.click(f.visibleStarts()[0]);assert.equal(f.calls.filter(c=>c.method==='POST').length,1)
 if(leave==='back')await f.click(f.button('Conversations'))
 if(leave==='crm')await f.click(f.person('Synthetic CRM target'))
 if(leave==='unmount')f.app.unmount()
 if(leave==='account'){f.setAccount(B);await f.click(f.button('Refresh'))}
 const count=f.calls.length;list.resolve(response({accountId:A,threads:[row]}));await f.app.settle();assert.equal(f.calls.length,count,'stale list must not open returned thread');f.assertClean()
 if(leave==='back')assert.equal(f.shell().props['data-detail-open'],'false')
 if(leave==='crm')assert.equal(f.person('Synthetic CRM target').props['aria-pressed'],true)
 if(leave==='account'){assert.equal(f.visibleStarts().length,0);assert.equal(f.shell().props['data-detail-open'],'false');assert.ok(!f.nodes().some(n=>visible(n)&&textContent(n).includes('PRIVATE_ACCOUNT_A_MESSAGE')))}
 }finally{f.close()}
})
for(const leave of ['back','crm','unmount','account'])test('late direct thread read after '+leave+' cannot display old content',async()=>{
 const read=deferred(),f=fixture({crm:[{id:C,name:'Synthetic CRM target',channel:'telegram',unreadCount:0}],queue:{['GET /api/app/direct-messages?threadId='+T]:[read.promise]}})
 try{await f.app.settle();assertOwnerIntent(f);await f.click(f.visibleStarts()[0]);assert.equal(f.calls.filter(c=>c.path.includes('?threadId=')).length,1)
 if(leave==='back')await f.click(f.button('Conversations'))
 if(leave==='crm')await f.click(f.person('Synthetic CRM target'))
 if(leave==='unmount')f.app.unmount()
 if(leave==='account'){f.setAccount(B);await f.click(f.button('Refresh'))}
 const count=f.calls.length;read.resolve(response({threadId:T,accountId:A,peerName:'Synthetic old person',messages:[{id:'old-message',mine:true,text:'PRIVATE_ACCOUNT_A_MESSAGE'}]}));await f.app.settle();assert.equal(f.calls.length,count);f.assertClean()
 if(leave!=='unmount'){assert.ok(!f.nodes().some(n=>n.type==='article'&&visible(n)&&textContent(n).includes('PRIVATE_ACCOUNT_A_MESSAGE')),'late content must not become visible');if(leave==='crm')assert.equal(f.person('Synthetic CRM target').props['aria-pressed'],true);else assert.equal(f.shell().props['data-detail-open'],'false')}
 }finally{f.close()}
})

test('ordinary member explicit Start still opens existing direct composer',()=>run({owner:false},async f=>{assert.equal(f.visibleStarts().length,1);await f.click(f.visibleStarts()[0]);assert.equal(f.calls.filter(c=>c.method==='POST').length,1);assert.equal(f.shell(),undefined);assert.ok(f.nodes().some(n=>n.type==='textarea'&&visible(n)))}))
test('manual reply stays separate from Start and requires explicit submit',()=>run({allowSend:true},async f=>{assertOwnerIntent(f);await f.click(f.visibleStarts()[0]);const input=f.nodes().find(n=>n.type==='textarea'&&visible(n));assert.ok(input);input.props.onChange({target:{value:'Synthetic explicit reply'}});await f.app.settle();assert.equal(f.calls.filter(c=>c.body?.action==='send').length,0);const form=f.nodes().find(n=>n.type==='form'&&visible(n));assert.ok(form);form.props.onSubmit({preventDefault(){}});await f.app.settle();assert.equal(f.calls.filter(c=>c.body?.action==='start').length,1);assert.equal(f.calls.filter(c=>c.body?.action==='send').length,1);assert.equal(f.calls.filter(c=>c.method==='POST').length,2)}))
test('uncertain Start rejection does not automatically retry',()=>run({queue:{'POST /api/app/direct-messages':[()=>Promise.reject(new Error('SYNTHETIC_CONNECTION_LOST'))]}},async f=>{assertOwnerIntent(f);await f.click(f.visibleStarts()[0]);assert.equal(f.calls.filter(c=>c.method==='POST').length,1);assert.equal(f.person(row.peerName),undefined);assert.ok(f.nodes().some(n=>n.props?.role==='alert'&&visible(n)));f.app.rerender();await f.app.settle();assert.equal(f.calls.filter(c=>c.method==='POST').length,1)}))

test('never-bound signed-out member preserves recipient URL for sign-in',()=>run({owner:false,queue:{'GET /api/app/messages/requests?view=owner':[response({error:'SIGN_IN_REQUIRED'},401)],'GET /api/app/messages/requests':[response({error:'SIGN_IN_REQUIRED'},401)],'GET /api/app/direct-messages':[response({error:'SIGN_IN_REQUIRED'},401)]}},f=>{assert.equal(f.shell(),undefined);assert.equal(f.app.url.searchParams.get('to'),SLUG);assert.equal(f.visibleStarts().length,0);assert.equal(f.calls.filter(c=>c.method==='POST').length,0)}))
test('post-Start authorized list account mismatch cannot select or read returned thread',()=>run({queue:{'GET /api/app/direct-messages':[response({accountId:A,threads:[]}),response({accountId:B,threads:[row]})]}},async f=>{assertOwnerIntent(f);await f.click(f.visibleStarts()[0]);assert.equal(f.calls.filter(c=>c.method==='POST').length,1);assert.equal(f.calls.filter(c=>c.path.includes('?threadId=')).length,0);assert.equal(f.person(row.peerName),undefined);assert.ok(!f.visibleStarts()[0]||f.visibleStarts()[0].props.disabled,'account mismatch must disable Start');assert.ok(f.nodes().some(n=>n.props?.role==='alert'&&visible(n)))}))
test('malformed Start response cannot invent a thread identity',()=>run({queue:{'POST /api/app/direct-messages':[response({ok:true})]}},async f=>{assertOwnerIntent(f);await f.click(f.visibleStarts()[0]);assert.equal(f.calls.filter(c=>c.method==='POST').length,1);assert.equal(f.calls.filter(c=>c.path.includes('?threadId=')).length,0);assert.equal(f.person(row.peerName),undefined);assert.ok(f.nodes().some(n=>n.props?.role==='alert'&&visible(n)))}))
test('Start returning an existing authorized thread selects that real row once',()=>run({threads:[row]},async f=>{assertOwnerIntent(f);await f.click(f.visibleStarts()[0]);assert.equal(f.person(row.peerName).props['aria-pressed'],true);assert.equal(f.calls.filter(c=>c.method==='POST').length,1);assert.equal(f.nodes().filter(n=>n.type==='button'&&n.props.className?.includes('person')&&textContent(n).includes(row.peerName)).length,1)}))
for(const kind of ['request','business'])for(const phase of ['start','list','read'])test('late '+phase+' after selecting '+kind+' cannot steal selection',async()=>{
 const later=deferred(),name='Synthetic '+kind+' destination',opt={queue:{}}
 if(kind==='request')opt.requests=[{id:R,contact:{name},requestKind:'public',message:'Synthetic request'}]
 else opt.business=[{id:E,name,question:'Synthetic business'}]
 if(phase==='start')opt.queue['POST /api/app/direct-messages']=[later.promise]
 if(phase==='list')opt.queue['GET /api/app/direct-messages']=[response({accountId:A,threads:[]}),later.promise]
 if(phase==='read')opt.queue['GET /api/app/direct-messages?threadId='+T]=[later.promise]
 const f=fixture(opt)
 try{await f.app.settle();assertOwnerIntent(f);await f.click(f.visibleStarts()[0]);await f.folder(['request','business'].includes(kind)?'requests':'chats');await f.click(f.person(name));const count=f.calls.length
 later.resolve(response(phase==='start'?{threadId:T}:phase==='list'?{accountId:A,threads:[row]}:{threadId:T,accountId:A,peerName:row.peerName,messages:[{id:'old',mine:true,text:'STALE_SYNTHETIC_DIRECT_CONTENT'}]}))
 await f.app.settle();assert.equal(f.calls.length,count);assert.equal(f.person(name).props['aria-pressed'],true);assert.ok(!f.nodes().some(n=>n.type==='article'&&visible(n)&&textContent(n).includes('STALE_SYNTHETIC_DIRECT_CONTENT')));f.assertClean()
 }finally{f.close()}
})

test('internal Direct All conversations Back closes parent selection without reopening',()=>run({},async f=>{assertOwnerIntent(f);await f.click(f.visibleStarts()[0]);const reads=f.calls.filter(c=>c.path.includes('?threadId=')).length;await f.click(f.button('All conversations'));assert.equal(f.shell().props['data-detail-open'],'false');assert.equal(f.person(row.peerName).props['aria-pressed'],false);f.app.rerender();await f.app.settle();await f.app.settle();assert.equal(f.calls.filter(c=>c.path.includes('?threadId=')).length,reads);assert.equal(f.visibleStarts().length,0);assert.ok(!f.nodes().some(n=>n.type==='textarea'&&visible(n)))}))
test('same-tick repeated explicit Start handler remains single-flight',()=>run({},async f=>{assertOwnerIntent(f);const button=f.visibleStarts()[0];button.props.onClick();button.props.onClick();await f.app.settle();assert.equal(f.calls.filter(c=>c.method==='POST').length,1);assert.equal(f.person(row.peerName).props['aria-pressed'],true)}))
for(const phase of ['start','list','read'])test('late '+phase+' after selecting another direct row cannot steal selection',async()=>{
 const later=deferred(),other={...row,id:U,peerName:'Synthetic other direct person'},opt={threads:[other],queue:{}}
 if(phase==='start')opt.queue['POST /api/app/direct-messages']=[later.promise]
 if(phase==='list')opt.queue['GET /api/app/direct-messages']=[response({accountId:A,threads:[other]}),later.promise]
 if(phase==='read')opt.queue['GET /api/app/direct-messages?threadId='+T]=[later.promise]
 const f=fixture(opt)
 try{await f.app.settle();assertOwnerIntent(f);await f.click(f.visibleStarts()[0]);await f.click(f.person(other.peerName));const count=f.calls.length
 later.resolve(response(phase==='start'?{threadId:T}:phase==='list'?{accountId:A,threads:[other,row]}:{threadId:T,accountId:A,peerName:row.peerName,messages:[{id:'old',mine:true,text:'STALE_SYNTHETIC_DIRECT_CONTENT'}]}))
 await f.app.settle();assert.equal(f.calls.length,count);assert.equal(f.person(other.peerName).props['aria-pressed'],true);assert.ok(!f.nodes().some(n=>n.type==='article'&&visible(n)&&textContent(n).includes('STALE_SYNTHETIC_DIRECT_CONTENT')));f.assertClean()
 }finally{f.close()}
})

const replyText='Synthetic explicit reply'
const draftLeaves=['back','internal-back','crm','request','business','card']
const replyOptions=extra=>({search:'',threads:[row],
  crm:[{id:C,name:'Synthetic CRM target',channel:'telegram',unreadCount:0}],
  requests:[{id:R,contact:{name:'Synthetic request target'},requestKind:'public',message:'Synthetic request'}],
  business:[{id:E,name:'Synthetic business target',question:'Synthetic business'}],...extra})
const replyInput=f=>f.nodes().find(n=>n.type==='textarea'&&visible(n))
const replyForm=f=>f.nodes().find(n=>n.type==='form'&&visible(n))
async function typeReply(f){await f.folder('chats');await f.click(f.person(row.peerName));const input=replyInput(f);assert.ok(input);input.props.onChange({target:{value:replyText}});await f.app.settle()}
async function leaveReply(f,leave){
  if(leave==='back')await f.click(f.button('Conversations'))
  else if(leave==='card')await f.click(f.button('Client card'))
  else if(leave==='internal-back')await f.click(f.button('All conversations'))
  else {await f.folder(['request','business'].includes(leave)?'requests':'chats');await f.click(f.person('Synthetic '+(leave==='crm'?'CRM':leave)+' target'))}
}
async function submitReply(f){const form=replyForm(f);assert.ok(form);form.props.onSubmit({preventDefault(){}});await f.app.settle()}
const sendCalls=f=>f.calls.filter(c=>c.body?.action==='send')
for(const leave of draftLeaves)test('draft/file preserved across temporary '+leave+' and same-thread return',()=>run(replyOptions(),async f=>{
  await typeReply(f)
  const file={name:'synthetic-note.ogg',type:'audio/ogg',size:128}
  f.nodes().find(n=>n.type==='input'&&n.props.type==='file'&&visible(n)).props.onChange({target:{files:[file]}})
  await f.app.settle()
  f.nodes().find(n=>n.type==='input'&&n.props.type==='checkbox'&&visible(n)).props.onChange({target:{checked:true}})
  await f.app.settle();await leaveReply(f,leave);await f.folder('chats');await f.click(f.person(row.peerName))
  assert.equal(replyInput(f)?.props.value,replyText)
  assert.ok(f.nodes().some(n=>n.type==='p'&&n.props.className?.includes('fileName')&&textContent(n).includes(file.name)))
  assert.equal(f.nodes().find(n=>n.type==='input'&&n.props.type==='checkbox'&&visible(n))?.props.checked,true)
  assert.equal(f.calls.filter(c=>c.method==='POST').length,0,'navigation does not send/upload')
}))
for(const leave of draftLeaves)test('uncertain Send operation survives temporary '+leave+' and same-thread retry',()=>run(replyOptions({allowSend:true,sendQueue:[()=>Promise.reject(new Error('SYNTHETIC_UNCERTAIN_SEND')),response({ok:true})]}),async f=>{
  await typeReply(f);await submitReply(f);assert.equal(sendCalls(f).length,1)
  const operation=sendCalls(f)[0].body.operationId
  await leaveReply(f,leave);await f.folder('chats');await f.click(f.person(row.peerName))
  assert.equal(replyInput(f)?.props.value,replyText,'uncertain draft must survive')
  await submitReply(f);assert.equal(sendCalls(f).length,2)
  assert.equal(sendCalls(f)[1].body.operationId,operation,'retry must retain original operation identity')
}))
for(const leave of ['back','crm','request','business','card'])test('pending Send survives temporary '+leave+' until uncertain completion',async()=>{
  const pending=deferred(),f=fixture(replyOptions({allowSend:true,sendQueue:[pending.promise,response({ok:true})]}))
  try{
    await f.app.settle();await typeReply(f);await submitReply(f);assert.equal(sendCalls(f).length,1)
    const operation=sendCalls(f)[0].body.operationId
    await leaveReply(f,leave);await f.folder('chats');await f.click(f.person(row.peerName))
    assert.equal(replyInput(f)?.props.value,replyText);assert.equal(replyInput(f)?.props.disabled,true)
    pending.reject(new Error('SYNTHETIC_UNCERTAIN_SEND'));await f.app.settle()
    assert.equal(replyInput(f)?.props.value,replyText)
    await submitReply(f);assert.equal(sendCalls(f).length,2);assert.equal(sendCalls(f)[1].body.operationId,operation)
    f.assertClean()
  }finally{f.close()}
})
test('different direct thread retains baseline draft behavior but uses a different Send operation identity',()=>run(replyOptions({threads:[row,{...row,id:U,peerName:'Synthetic other direct person'}],allowSend:true,allowOtherSend:true,sendQueue:[()=>Promise.reject(new Error('SYNTHETIC_UNCERTAIN_SEND')),response({ok:true})]}),async f=>{
  await typeReply(f);await submitReply(f);const first=sendCalls(f)[0].body
  await f.click(f.person('Synthetic other direct person'))
  assert.equal(replyInput(f)?.props.value,replyText,'keep existing owner thread-switch semantics')
  await submitReply(f);const second=sendCalls(f)[1].body
  assert.equal(first.threadId,T);assert.equal(second.threadId,U);assert.notEqual(second.operationId,first.operationId)
}))
test('account remount clears direct draft/file and prior uncertain Send operation',()=>run(replyOptions({allowSend:true,sendQueue:[()=>Promise.reject(new Error('SYNTHETIC_UNCERTAIN_SEND')),response({ok:true})]}),async f=>{
  await typeReply(f);await submitReply(f);const first=sendCalls(f)[0].body.operationId
  f.nodes().find(n=>n.type==='input'&&n.props.type==='file'&&visible(n)).props.onChange({target:{files:[{name:'synthetic-note.ogg',type:'audio/ogg',size:128}]}})
  await f.app.settle();f.setAccount(B);await f.click(f.button('Refresh'));await f.folder('chats');await f.click(f.person(row.peerName))
  assert.equal(replyInput(f)?.props.value,'');assert.ok(!f.nodes().some(n=>n.type==='p'&&n.props.className?.includes('fileName')))
  replyInput(f).props.onChange({target:{value:replyText}});await f.app.settle();await submitReply(f)
  assert.notEqual(sendCalls(f)[1].body.operationId,first);assert.equal(sendCalls(f)[1].headers['x-hh-account-id'],B)
}))

test('real direct Client card Back preserves the mounted draft and never sends media',()=>run(replyOptions(),async f=>{
  await typeReply(f);const before=[...f.app.instances.values()].find(x=>x.type.name==='DirectMessageInbox')
  await f.click(f.button('Client card'));assert.ok(f.nodes().some(n=>n.props&&Object.hasOwn(n.props,'data-messages-client-card')))
  assert.equal(Boolean(replyInput(f)),false,'actual direct composer is hidden behind card')
  assert.ok([...f.app.instances.values()].find(x=>x.type.name==='DirectMessageInbox')===before)
  await f.click(f.button('Back to conversation'));assert.equal(replyInput(f)?.props.value,replyText)
  assert.equal(f.calls.filter(c=>c.method==='POST').length,0);assert.ok(!f.calls.some(c=>/photo|media/.test(c.path)))
}))
test('pending direct Send may reject while actual Client card stays open without losing retry identity',async()=>{
  const pending=deferred(),f=fixture(replyOptions({allowSend:true,sendQueue:[pending.promise,response({ok:true})]}))
  try{await f.app.settle();await typeReply(f);await submitReply(f);const operation=sendCalls(f)[0].body.operationId
    await f.click(f.button('Client card'));pending.reject(Error('SYNTHETIC_UNCERTAIN_SEND'));await f.app.settle()
    assert.ok(f.nodes().some(n=>n.props&&Object.hasOwn(n.props,'data-messages-client-card')))
    await f.click(f.button('Back to conversation'));assert.equal(replyInput(f)?.props.value,replyText)
    await submitReply(f);assert.equal(sendCalls(f)[1].body.operationId,operation);f.assertClean()
  }finally{f.close()}
})
const requestLifetimeOptions=extra=>({search:'?tab=requests',requestLifetime:true,requests:[{id:R,contact:{name:'Synthetic private request'},requestKind:'private',message:'Synthetic request'}],...extra})
const requestInput=f=>f.nodes().find(n=>n.type==='textarea'&&n.props.id==='practice-chat-'+R&&visible(n))
async function typeRequestReply(f){await f.click(f.person('Synthetic private request'));requestInput(f).props.onChange({target:{value:'Synthetic request reply'}});await f.app.settle()}
async function sendRequestReply(f){await f.click(f.nodes().find(n=>n.type==='button'&&visible(n)&&n.props.onClick?.name==='send'))}
const requestPosts=f=>f.calls.filter(c=>c.path==='/api/app/practitioner-client-messages'&&c.method==='POST')
test('canonical private request outer Back keeps actual draft/session and selected row',()=>run(requestLifetimeOptions(),async f=>{
  await typeRequestReply(f);const before=[...f.app.instances.values()].find(x=>x.type.name==='MessageConversation'),calls=f.calls.length
  await f.click(f.button('Conversations'));assert.equal(f.shell().props['data-detail-open'],'false')
  assert.equal(f.person('Synthetic private request').props['aria-pressed'],true)
  assert.ok([...f.app.instances.values()].find(x=>x.type.name==='MessageConversation')===before)
  await f.click(f.person('Synthetic private request'));assert.equal(requestInput(f)?.props.value,'Synthetic request reply')
  assert.equal(f.calls.length,calls);assert.equal(f.app.intervalCount(),1);assert.equal(requestPosts(f).length,0)
}))
test('canonical private request pending/uncertain UUID survives outer Back and retry',async()=>{
  const pending=deferred(),f=fixture(requestLifetimeOptions({allowRequestSend:true,requestQueue:[pending.promise,()=>Promise.reject(Error('SYNTHETIC_UNCERTAIN_RETRY'))]}))
  try{await f.app.settle();await typeRequestReply(f);await sendRequestReply(f);const operation=requestPosts(f)[0].body.operationId
    await f.click(f.button('Conversations'));assert.equal(f.person('Synthetic private request').props['aria-pressed'],true)
    pending.reject(Error('SYNTHETIC_UNCERTAIN_SEND'));await f.app.settle();await f.click(f.person('Synthetic private request'))
    assert.equal(requestInput(f)?.props.value,'Synthetic request reply');await sendRequestReply(f)
    assert.equal(requestPosts(f).length,2);assert.equal(requestPosts(f)[1].body.operationId,operation);f.assertClean()
  }finally{f.close()}
})
for(const kind of ['crm','business'])test('canonical '+kind+' selected row survives outer Back',()=>run(replyOptions(),async f=>{
  const name='Synthetic '+(kind==='crm'?'CRM':kind)+' target'
  await f.folder(kind==='business'?'requests':'chats');await f.click(f.person(name));await f.click(f.button('Conversations'));assert.equal(f.shell().props['data-detail-open'],'false')
  assert.equal(f.person(name).props['aria-pressed'],true);assert.equal(f.calls.filter(c=>c.method==='POST').length,0)
}))

test('account-bound recipient overrides Requests arrival without losing unrelated URL state or auto-sending',()=>run({search:'?tab=requests&to='+SLUG+'&keep=1#anchor'},async f=>{
  assertOwnerIntent(f)
  assert.equal(f.nodes().find(n=>n.props?.id==='hh-simple-tab-chats').props['aria-selected'],true)
  assert.equal(f.app.url.searchParams.has('tab'),false)
  assert.equal(f.app.url.searchParams.get('keep'),'1');assert.equal(f.app.url.hash,'#anchor')
  await f.click(f.visibleStarts()[0])
  assert.equal(f.person(row.peerName)?.props['aria-pressed'],true)
  assert.ok(f.nodes().some(n=>n.type==='textarea'&&visible(n)))
  assert.equal(f.calls.filter(c=>c.body?.action==='send').length,0)
}))
for(const phase of ['start','list'])test('Requests folder invalidates pending recipient '+phase+' without reopening or follow-on reads',async()=>{
  const pending=deferred(),queue=phase==='start'?{'POST /api/app/direct-messages':[pending.promise]}:
    {'GET /api/app/direct-messages':[response({accountId:A,threads:[]}),pending.promise]}
  const f=fixture({queue})
  try{await f.app.settle();assertOwnerIntent(f);await f.click(f.visibleStarts()[0]);await f.folder('requests')
    assert.equal(f.app.url.searchParams.get('tab'),'requests');assert.equal(f.app.url.searchParams.has('to'),false)
    const reads=f.calls.length
    pending.resolve(response(phase==='start'?{threadId:T}:{accountId:A,threads:[row]}));await f.app.settle()
    assert.equal(f.calls.length,reads);assert.equal(f.visibleStarts().length,0)
    assert.equal(f.shell().props['data-detail-open'],'false');assert.equal(f.calls.filter(c=>c.body?.action==='send').length,0)
    f.assertClean()
  }finally{f.close()}
})
