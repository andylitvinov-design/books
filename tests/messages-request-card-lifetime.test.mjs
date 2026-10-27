import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {resolve} from 'node:path'
import {compose,deferred,response,textContent,visible} from './helpers/messages-request-card-harness.mjs'

const ROOT=process.env.SOURCE_ROOT||fileURLToPath(new URL('../',import.meta.url))
const A='10000000-0000-4000-8000-000000000001',B='10000000-0000-4000-8000-000000000002'
const R='20000000-0000-4000-8000-000000000001',S='20000000-0000-4000-8000-000000000002',T='30000000-0000-4000-8000-000000000001'
const TEXT='Synthetic protected reply'
const request=(id=R)=>({id,requestKind:'private',contact:{name:id===R?'Synthetic request R':'Synthetic request S'},message:'Synthetic original enquiry',createdAt:'2026-10-26T00:00:00Z'})
const direct={id:T,peerName:'Synthetic direct person',updatedAt:'2026-10-26T00:00:00Z',unread:0}
const page=id=>({requestId:id,messages:[],nextCursor:null,unseenCount:0,canReply:true,canNote:false})
const saved=body=>response({saved:true,id:body.operationId,requestId:body.requestId})

function fixture(options={}){
  let account=A,savedCallbacks=0,viewedCallbacks=0
  const calls=[],violations=[],reads=[...(options.readQueue||[])],posts=[...(options.postQueue||[])]
  async function withAbort(result,signal){
    if(signal?.aborted)throw Error('SYNTHETIC_ABORT')
    let listener
    const aborted=new Promise((_,reject)=>{listener=()=>reject(Error('SYNTHETIC_ABORT'));signal?.addEventListener('abort',listener,{once:true})})
    try{return await Promise.race([Promise.resolve(result),aborted])}
    finally{signal?.removeEventListener('abort',listener)}
  }
  const fetch=async(path,init={})=>{
    const method=init.method||'GET',body=init.body?JSON.parse(init.body):undefined
    calls.push({path,method,body,headers:init.headers,signal:init.signal})
    if(method==='GET'&&path==='/api/app/direct-messages')return response({accountId:account,threads:options.direct?[direct]:[]})
    if(method==='GET'&&path==='/api/app/direct-messages?threadId='+T)return response({accountId:account,threadId:T,peerName:direct.peerName,messages:[],blocked:false,isRecipient:false})
    if(path.startsWith('/api/app/practitioner-client-messages?')&&method==='GET'){
      const id=new URL(path,'https://synthetic.invalid').searchParams.get('requestId')
      assert.ok([R,S].includes(id));assert.equal(init.headers['X-HH-Account-Id'],account)
      const result=reads.length?reads.shift():response(page(id))
      return withAbort(typeof result==='function'?result(id):result,init.signal)
    }
    if(path==='/api/app/practitioner-client-messages'&&method==='POST'&&!body.action){
      assert.ok([R,S].includes(body.requestId));assert.equal(body.text,TEXT);assert.equal(body.visibility,'participants')
      assert.equal(init.headers['X-HH-Account-Id'],account);assert.match(body.operationId,/^60000000-0000-4000-8000-/)
      const result=posts.length?posts.shift():saved(body)
      return withAbort(typeof result==='function'?result(body):result,init.signal)
    }
    violations.push(method+' '+path);throw Error('Forbidden synthetic network '+method+' '+path)
  }
  const app=compose({root:ROOT,props:{locale:options.locale||'en',accountId:account,requests:options.requests||[request(),request(S)],
    onReload:()=>{savedCallbacks++}},fetch})
  const nodes=()=>app.nodes()
  const person=id=>nodes().find(n=>n.type==='button'&&n.props.className?.includes(':person')&&textContent(n).includes(id===T?direct.peerName:id===R?'Synthetic request R':'Synthetic request S'))
  const cardToggle=()=>nodes().find(n=>n.type==='button'&&n.props.className?.includes(':cardButton'))
  const card=()=>nodes().find(n=>n.props&&Object.hasOwn(n.props,'data-messages-client-card'))
  const cardBack=()=>nodes().find(n=>n.type==='button'&&n.ancestors?.some(a=>Object.hasOwn(a.props,'data-messages-client-card')))
  const input=(id=R,includeHidden=false)=>nodes().find(n=>n.type==='textarea'&&n.props.id==='practice-chat-'+id&&(includeHidden||visible(n)))
  const instance=name=>[...app.instances.values()].find(f=>f.type.name===name)
  const sent=()=>calls.filter(c=>c.method==='POST')
  async function click(node){assert.ok(node,'expected control');assert.ok(!node.props.disabled,'control disabled');node.props.onClick?.({preventDefault(){}});await app.settle()}
  return {app,calls,violations,nodes,person,cardToggle,card,cardBack,input,instance,sent,click,
    savedCallbacks:()=>savedCallbacks,viewedCallbacks:()=>viewedCallbacks,
    async folder(id){
      const tab=nodes().find(n=>n.type==='button'&&n.props.id==='hh-simple-tab-'+id)
      assert.ok(tab,'expected folder '+id)
      if(!tab.props['aria-selected'])await click(tab)
    },
    async select(id=R){
      // The canonical owner UI puts private requests and direct messages in separate folders.
      const tab=nodes().find(n=>n.type==='button'&&n.props.id==='hh-simple-tab-'+(id===T?'chats':'requests'))
      assert.ok(tab,'expected source folder')
      if(!tab.props['aria-selected'])await click(tab)
      await click(person(id))
    },
    async type(id=R){assert.ok(input(id));input(id).props.onChange({target:{value:TEXT}});await app.settle()},
    async send(){await click(nodes().find(n=>n.type==='button'&&visible(n)&&n.props.onClick?.name==='send'))},
    async account(next){account=next;app.updateProps({accountId:next});await app.settle()},
    clean(){assert.deepEqual(violations,[]);assert.ok(!app.trace.includes('fetch-after-unmount'))},
    close(){app.unmount();assert.equal(app.intervalCount(),0);assert.equal(app.networkListenerCount(),0);assert.deepEqual(violations,[])},
  }
}
async function run(options,fn){const f=fixture(options);try{await f.app.settle();await fn(f);f.clean()}finally{f.close()}}
async function composeReply(f){await f.select();await f.type()}

for(const locale of ['en','ru','es'])test(locale+': Client card keeps actual request child mounted and preserves typed reply',()=>run({locale},async f=>{
  await composeReply(f);const before=f.instance('MessageConversation'),reads=f.calls.length
  await f.click(f.cardToggle());assert.ok(f.card());assert.ok(f.instance('MessageConversation')===before,'same request conversation instance')
  assert.equal(Boolean(f.input(R)),false,'request editor is hidden behind the card');assert.equal(f.input(R,true)?.props.value,TEXT)
  await f.click(f.cardBack());assert.equal(f.input()?.props.value,TEXT);assert.ok(f.instance('MessageConversation')===before,'same request conversation instance')
  assert.equal(f.calls.length,reads,'request card must not refetch or touch media');assert.equal(f.sent().length,0)
}))
test('CSS explicitly hides kept request pane despite its authored flex display',()=>{
  const css=readFileSync(resolve(ROOT,'components/app/messages-simple-inbox.module.css'),'utf8')
  assert.match(css,/\.requestPane\{display:flex/)
  assert.match(css,/\.requestPane\[hidden\]\s*\{\s*display:none!important\s*\}/)
})
test('same card toggle and outer Back both preserve the selected request session',()=>run({},async f=>{
  await composeReply(f);const before=f.instance('MessageConversation')
  await f.click(f.cardToggle());await f.click(f.cardToggle());assert.equal(f.input()?.props.value,TEXT)
  await f.click(f.cardToggle());await f.click(f.nodes().find(n=>n.type==='button'&&n.props.className?.includes('messages-simple-inbox.module.css:back')))
  assert.equal(f.card(),undefined);assert.ok(f.instance('MessageConversation')===before,'same request conversation instance')
  await f.select();assert.equal(f.input()?.props.value,TEXT)
}))
test('initial request read is not aborted or duplicated by a card round trip',async()=>{
  const pending=deferred(),f=fixture({readQueue:[pending.promise]})
  try{await f.app.settle();await f.select();const read=f.calls.find(c=>c.path.includes('requestId='));await f.click(f.cardToggle());assert.equal(read.signal.aborted,false)
    pending.resolve(response(page(R)));await f.app.settle();await f.click(f.cardBack());assert.ok(f.input())
    assert.equal(f.calls.filter(c=>c.path.includes('requestId=')).length,1);f.clean()
  }finally{f.close()}
})
for(const result of ['rejected','unconfirmed','wrong-receipt'])test(result+' Send keeps the same operation ID across card and retry',()=>run({postQueue:[body=>result==='rejected'?Promise.reject(Error('SYNTHETIC_UNCERTAIN')):response(result==='unconfirmed'?{saved:false}:{saved:true,id:body.operationId,requestId:S})]},async f=>{
  await composeReply(f);await f.send();const first=f.sent()[0]
  assert.equal(f.input()?.props.value,TEXT);await f.click(f.cardToggle());await f.click(f.cardBack())
  assert.equal(f.input()?.props.value,TEXT);await f.send();assert.equal(f.sent().length,2)
  assert.equal(f.sent()[1].body.operationId,first.body.operationId);assert.equal(f.input()?.props.value,'')
}))
for(const outcome of ['confirmed','uncertain'])for(const returnFirst of [false,true])test('pending '+outcome+' Send survives card '+(returnFirst?'round trip':'while hidden'),async()=>{
  const pending=deferred(),f=fixture({postQueue:[pending.promise]})
  try{await f.app.settle();await composeReply(f);await f.send();const first=f.sent()[0],before=f.instance('MessageConversation')
    await f.click(f.cardToggle());assert.equal(first.signal.aborted,false);assert.ok(f.instance('MessageConversation')===before,'same request conversation instance')
    if(returnFirst)await f.click(f.cardBack())
    if(outcome==='confirmed')pending.resolve(saved(first.body));else pending.reject(Error('SYNTHETIC_UNCERTAIN'))
    await f.app.settle();assert.equal(first.signal.aborted,false);assert.equal(f.sent().length,1)
    if(!returnFirst){assert.ok(f.card());await f.click(f.cardBack())}
    if(outcome==='confirmed'){assert.equal(f.input()?.props.value,'');assert.equal(f.savedCallbacks(),1)}
    else{assert.equal(f.input()?.props.value,TEXT);await f.send();assert.equal(f.sent()[1].body.operationId,first.body.operationId)}
    f.clean()
  }finally{f.close()}
})
for(const boundary of ['request','account','unmount'])test(boundary+' boundary still aborts old pending request lifetime safely',async()=>{
  const pending=deferred(),f=fixture({postQueue:[pending.promise]})
  try{await f.app.settle();await composeReply(f);await f.send();const first=f.sent()[0],before=f.instance('MessageConversation')
    await f.click(f.cardToggle())
    if(boundary==='request')await f.select(S)
    if(boundary==='account'){await f.account(B);await f.select(R)}
    if(boundary==='unmount')f.app.unmount()
    assert.equal(first.signal.aborted,true);assert.equal(before.mounted,false)
    const count=f.calls.length;pending.resolve(saved(first.body));await f.app.settle();assert.equal(f.calls.length,count);assert.equal(f.savedCallbacks(),0)
    if(boundary!=='unmount'){
      const id=boundary==='request'?S:R;assert.equal(f.input(id)?.props.value,'');await f.type(id);await f.send()
      const next=f.sent()[1];assert.notEqual(next.body.operationId,first.body.operationId);assert.equal(next.body.requestId,id)
      assert.equal(next.headers['X-HH-Account-Id'],boundary==='account'?B:A)
    }
    f.clean()
  }finally{f.close()}
})
test('public request card does not mount a private conversation or trigger private reads',()=>run({requests:[{...request(),requestKind:'public'}]},async f=>{
  await f.select();const before=f.calls.length;await f.click(f.cardToggle());await f.click(f.cardBack())
  assert.equal(f.instance('MessageConversation'),undefined);assert.equal(f.calls.length,before);assert.equal(f.sent().length,0)
}))
test('existing conversation interval remains mounted under card without automatic sends',()=>run({},async f=>{
  await f.select();assert.equal(f.app.intervalCount(),1);await f.click(f.cardToggle());assert.equal(f.app.intervalCount(),1)
  const reads=f.calls.filter(c=>c.path.includes('requestId=')).length;f.app.fireIntervals();await f.app.settle()
  assert.equal(f.calls.filter(c=>c.path.includes('requestId=')).length,reads+1);assert.equal(f.sent().length,0)
}))
test('Direct draft and selected file also remain mounted across its existing card toggle',()=>run({direct:true},async f=>{
  await f.select(T);const before=f.instance('DirectMessageInbox')
  const textarea=f.nodes().find(n=>n.type==='textarea'&&visible(n));textarea.props.onChange({target:{value:'Synthetic direct draft'}})
  await f.app.settle();f.nodes().find(n=>n.type==='input'&&n.props.type==='file'&&visible(n)).props.onChange({target:{files:[{name:'synthetic-note.ogg',type:'audio/ogg',size:128}]}})
  await f.app.settle();await f.click(f.cardToggle());assert.ok(f.instance('DirectMessageInbox')===before,'same direct conversation instance')
  await f.click(f.cardBack());assert.equal(f.nodes().find(n=>n.type==='textarea'&&visible(n))?.props.value,'Synthetic direct draft')
  assert.ok(f.nodes().some(n=>n.type==='p'&&n.props.className?.includes(':fileName')&&textContent(n).includes('synthetic-note.ogg')))
  assert.equal(f.sent().length,0);assert.ok(!f.calls.some(c=>/photo|media/.test(c.path)))
}))

test('Inbox/Requests round trip keeps the request draft and client card mounted without extra reads',()=>run({},async f=>{
  await composeReply(f);const before=f.instance('MessageConversation'),reads=f.calls.length
  await f.click(f.cardToggle());const card=f.instance('MessagesContactCard')
  await f.folder('chats')
  assert.ok(f.instance('MessageConversation')===before);assert.ok(f.instance('MessagesContactCard')===card)
  assert.equal(Boolean(f.input()),false);assert.equal(f.input(R,true)?.props.value,TEXT)
  assert.ok(!visible(f.card()),'client card must be hidden outside its source folder')
  await f.folder('requests');assert.ok(visible(f.card()));await f.click(f.cardBack())
  assert.equal(f.input()?.props.value,TEXT);assert.equal(f.calls.length,reads);assert.equal(f.sent().length,0)
}))
test('folder switch keeps an uncertain request Send and retry bound to one operation ID',async()=>{
  const pending=deferred(),f=fixture({postQueue:[pending.promise]})
  try{await f.app.settle();await composeReply(f);await f.send();const first=f.sent()[0],before=f.instance('MessageConversation')
    await f.folder('chats');assert.equal(first.signal.aborted,false);assert.ok(f.instance('MessageConversation')===before)
    pending.reject(Error('SYNTHETIC_FOLDER_UNCERTAIN'));await f.app.settle()
    assert.equal(Boolean(f.input()),false);await f.folder('requests');assert.equal(f.input()?.props.value,TEXT)
    await f.send();assert.equal(f.sent()[1].body.operationId,first.body.operationId);f.clean()
  }finally{f.close()}
})
