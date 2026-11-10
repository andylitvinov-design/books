import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

// Exercise only the current preview effect with synthetic files and URL methods.
// No component mount, microphone, browser, network, storage or upload operations.
const source=readFileSync(new URL('../components/app/direct-message-inbox.jsx',import.meta.url),'utf8')
const ast=ts.createSourceFile('direct-message-inbox.jsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
assert.equal(ast.parseDiagnostics.length,0)
const effects=[]
function visit(node){
  if(ts.isCallExpression(node)&&node.expression.getText(ast)==='useEffect'&&
    node.arguments[0]?.getText(ast).includes('createObjectURL(file)'))effects.push(node.arguments[0])
  ts.forEachChild(node,visit)
}
visit(ast)
assert.equal(effects.length,1,'exact current audio preview effect')
function harness(){
  const events=[]
  const context={URL:'/api/app/direct-messages',globalThis:{URL:{
    createObjectURL:file=>{const url='blob:synthetic-'+file.name;events.push(['create',file.name]);return url},
    revokeObjectURL:url=>events.push(['revoke',url])}},file:null,
    AUDIO_MIMES:new Set(['audio/webm','audio/mp4']),directMediaMime:file=>file.type,
    setAudioPreview:value=>events.push(['preview',value])}
  return {context,events,effect:vm.runInNewContext('('+effects[0].getText(ast)+')',context)}
}
test('audio preview uses browser URL methods despite the API URL string and revokes on unmount',()=>{
  const h=harness();h.context.file={name:'one',type:'audio/webm'}
  const cleanup=h.effect()
  assert.deepEqual(h.events,[['create','one'],['preview','blob:synthetic-one']])
  cleanup();assert.deepEqual(h.events.at(-1),['revoke','blob:synthetic-one'])
})
test('replacing audio revokes the captured old URL before previewing the replacement',()=>{
  const h=harness();h.context.file={name:'one',type:'audio/webm'}
  const firstCleanup=h.effect();h.context.file={name:'two',type:'audio/mp4'}
  firstCleanup();const secondCleanup=h.effect();secondCleanup()
  assert.deepEqual(h.events,[['create','one'],['preview','blob:synthetic-one'],['revoke','blob:synthetic-one'],
    ['create','two'],['preview','blob:synthetic-two'],['revoke','blob:synthetic-two']])
})
test('discarding audio clears preview without allocating a URL; non-audio files also clear it',()=>{
  const h=harness();h.context.file={name:'one',type:'audio/webm'}
  const cleanup=h.effect();cleanup();h.context.file=null
  assert.equal(h.effect(),undefined);assert.deepEqual(h.events.at(-1),['preview',''])
  h.context.file={name:'image',type:'image/png'}
  assert.equal(h.effect(),undefined);assert.deepEqual(h.events.at(-1),['preview',''])
  assert.equal(h.events.filter(event=>event[0]==='create').length,1)
})
