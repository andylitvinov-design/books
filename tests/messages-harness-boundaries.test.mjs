import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import {readonlySearchParams} from './helpers/messages-owner-handoff-harness.mjs'

const helpers=['messages-owner-handoff-harness.mjs','messages-request-card-harness.mjs']
const source=name=>readFileSync(new URL('./helpers/'+name,import.meta.url),'utf8')
function extract(name,predicate,context){
  const text=source(name),ast=ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),found=[]
  assert.equal(ast.parseDiagnostics.length,0)
  const visit=node=>{if(predicate(node))found.push(node);ts.forEachChild(node,visit)};visit(ast)
  assert.equal(found.length,1,'exact unique fixture implementation')
  const node=ts.isPropertyAssignment(found[0])?found[0].initializer:found[0]
  return vm.runInNewContext('('+node.getText(ast)+')',context)
}
test('search parameters preserve read semantics and reject all normal mutation methods',()=>{
  const value=readonlySearchParams('?to=master-one&to=master-two&q=a%20b&empty=')
  assert.equal(value.get('to'),'master-one');assert.deepEqual(value.getAll('to'),['master-one','master-two'])
  assert.equal(value.get('q'),'a b');assert.equal(value.get('empty'),'');assert.equal(value.get('missing'),null)
  assert.deepEqual([...value.keys()],['to','to','q','empty'])
  for(const method of ['append','delete','set','sort'])assert.throws(()=>value[method]('to','changed'),/Readonly/)
  assert.equal(value.valueOf(),value)
  assert.throws(()=>value.valueOf().set('to','changed'),/Readonly/)
  assert.throws(()=>value.forEach((_v,_k,receiver)=>{
    assert.equal(receiver,value);receiver.set('to','changed')
  }),/Readonly/)
  assert.equal(value.get('to'),'master-one');assert.equal(readonlySearchParams('').toString(),'')
})
test('actual query hook keeps same-query identity and isolates changed, empty and old session snapshots',()=>{
  const make=()=>{
    let last,retained
    const context={url:new URL('https://synthetic.invalid/en/app/messages?to=master-one'),readonlySearchParams,
      hooks:{useMemo(fn,deps){if(!last||last[0]!==deps[0]){retained=fn();last=deps}return retained}}}
    const hook=extract(helpers[0],node=>ts.isPropertyAssignment(node)&&node.name.getText()==='useSearchParams',context)
    return {context,hook}
  }
  const a=make(),b=make(),first=a.hook();assert.equal(a.hook(),first)
  a.context.url=new URL('https://synthetic.invalid/en/app/messages?to=master-one#other');assert.equal(a.hook(),first)
  a.context.url=new URL('https://synthetic.invalid/en/app/messages?to=master-two');const next=a.hook()
  assert.notEqual(next,first);assert.equal(next.get('to'),'master-two');assert.equal(first.get('to'),'master-one')
  assert.equal(b.hook().get('to'),'master-one');assert.notEqual(b.hook(),first)
  a.context.url=new URL('https://synthetic.invalid/en/app/messages');assert.equal(a.hook().get('to'),null)
  assert.equal(next.get('to'),'master-two');assert.equal(b.hook().get('to'),'master-one')
})
for(const name of helpers){
  test(name+': recorder fixture retains explicit callbacks but does not invoke them on mount',()=>{
    const calls=[],recorded=file=>calls.push(['recorded',file]),recording=value=>calls.push(['recording',value])
    const props={locale:'en',disabled:false,onRecorded:recorded,onRecordingChange:recording}
    const fixture=extract(name,node=>ts.isFunctionDeclaration(node)&&node.name?.text==='VoiceRecorderFixture',{assert,jsx:(type,props)=>({type,props})})
    const node=fixture(props);assert.equal(node.type,'fixture-voice-recorder');assert.deepEqual(calls,[])
    assert.equal(node.props.onRecorded,recorded);assert.equal(node.props.onRecordingChange,recording)
    const fake={name:'synthetic.webm',type:'audio/webm'};node.props.onRecordingChange(true);node.props.onRecorded(fake);node.props.onRecordingChange(false)
    assert.deepEqual(calls,[['recording',true],['recorded',fake],['recording',false]])
    for(const patch of [{onRecorded:null},{onRecordingChange:'wrong'},{disabled:'false'},{locale:'unknown'}])assert.throws(()=>fixture({...props,...patch}))
  })
  test(name+': unknown imports and media operations remain fail closed',()=>{
    const policy={directMediaMime:()=> 'audio/webm',DIRECT_MEDIA_PROXY_MAX_BYTES:3000000}
    const context={root:'/synthetic',path:'/synthetic/components/app/messages-simple-inbox.jsx',resolve,dirname,
      externals:Object.create(null),boundary:Object.create(null),actual:new Set(),load:path=>{assert.equal(path,'/synthetic/lib/practitioners/direct-message-policy.mjs');return policy}}
    const requireBoundary=extract(name,node=>ts.isPropertyAssignment(node)&&node.name.getText()==='require',context)
    for(const unknown of ['next/unknown','./unapproved-component','@/unknown','node:fs'])assert.throws(()=>requireBoundary(unknown),/Unapproved module boundary/)
    const exposed=requireBoundary('@/lib/practitioners/direct-message-policy.mjs')
    assert.equal(exposed.directMediaMime,policy.directMediaMime);assert.equal(exposed.DIRECT_MEDIA_PROXY_MAX_BYTES,3000000)
    assert.throws(()=>exposed.directMediaSpec('audio/webm',200),/Forbidden media operation/)
    assert.equal(exposed.directMessageText,undefined)
  })
  test(name+': synthetic object URL leases never call host blob methods',()=>{
    class HostURL extends URL {static createObjectURL(){throw Error('host allocation forbidden')}static revokeObjectURL(){throw Error('host revoke forbidden')}}
    const context={URL:HostURL,assert,objectURLs:new Set(),nextObjectURL:0}
    const FixtureURL=extract(name,node=>ts.isClassDeclaration(node)&&node.name?.text==='FixtureURL',context)
    const first=FixtureURL.createObjectURL({name:'first'}),second=FixtureURL.createObjectURL({name:'second'})
    assert.notEqual(first,second);assert.equal(context.objectURLs.size,2)
    FixtureURL.revokeObjectURL(first);assert.equal(context.objectURLs.size,1);assert.ok(context.objectURLs.has(second))
    FixtureURL.revokeObjectURL(second);assert.equal(context.objectURLs.size,0)
    assert.equal(new FixtureURL('/messages?to=master','https://synthetic.invalid').searchParams.get('to'),'master')
    assert.throws(()=>FixtureURL.createObjectURL(null))
  })
}
