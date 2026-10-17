import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const source=readFileSync(new URL('../components/app/test-explorer.jsx',import.meta.url),'utf8')
// Read the actual function boundary so neighboring comments and JSX cannot
// become part of the executable fixture.
const parsed = ts.createSourceFile('test-explorer.jsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX)
function selectionFunction(name) {
 const matches=[]
 function visit(node) {
  if(ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text===name) matches.push(node)
  ts.forEachChild(node,visit)
 }
 visit(parsed)
 assert.equal(matches.length,1, 'one actual '+name+' declaration is required')
 assert.ok(ts.isArrowFunction(matches[0].initializer))
 return 'const '+matches[0].getText(parsed)
}
function harness({compact=false,keys=[],simpleMode=true,changed=false,auto=['phq-9','hh-current-state']}={}){
 let selected=[...keys],manual=changed
 function toggle(key){
  const name=compact?'toggleSimpleSelected':'toggleSelected'
  const fn=new Function('simpleMode','simpleSelectionChanged','simpleAuto','setSimpleSelectionChanged','setSelectedKeys',selectionFunction(name)+`; return ${name}`)(simpleMode,manual,auto.map(key=>({key})),v=>{manual=v},fn=>{selected=fn(selected)})
  fn(key)
 }
 return {toggle,get keys(){return selected},get changed(){return manual}}
}
test('direct full catalog first click selects exactly the visibly unchecked item, without hidden automatic additions',()=>{
 const h=harness();assert.equal(h.keys.includes('phq-9'),false);h.toggle('phq-9');assert.deepEqual(h.keys,['phq-9']);assert.equal(h.changed,true);h.toggle('phq-9');assert.deepEqual(h.keys,[])
})
test('full catalog chooses a new item without silently seeding automatic recommendations',()=>{
 const h=harness();h.toggle('cfpb-financial-wellbeing-5');assert.deepEqual(h.keys,['cfpb-financial-wellbeing-5'])
})
test('explicit selections carried into full catalog remain editable in public and account modes',()=>{
 for(const simpleMode of [true,false]){const h=harness({simpleMode,keys:['phq-9','hh-current-state'],changed:true});h.toggle('phq-9');assert.deepEqual(h.keys,['hh-current-state']);h.toggle('mini-ipip-20');assert.deepEqual(h.keys,['hh-current-state','mini-ipip-20'])}
})
test('full catalog retains twelve-item cap and allows deselection at the cap',()=>{
 const keys=Array.from({length:12},(_,i)=>'test-'+i),h=harness({keys,changed:true});h.toggle('extra');assert.deepEqual(h.keys,keys);h.toggle(keys[0]);assert.equal(h.keys.length,11)
})
test('compact mode still edits the complete displayed implicit starter set',()=>{
 const h=harness({compact:true});h.toggle('phq-9');assert.deepEqual(h.keys,['hh-current-state']);h.toggle('mini-ipip-20');assert.deepEqual(h.keys,['hh-current-state','mini-ipip-20'])
})

test('direct full and core navigation reach explicit checkboxes while normal browse retains its carried selection',()=>{
 const page=readFileSync(new URL('../app/[locale]/client/tests/page.tsx',import.meta.url),'utf8')
 assert.ok(page.includes("initialBrowseFull={query.catalog === 'full'}"))
 assert.ok(source.includes("onBrowseCore={() => { setBrowseFull(true); setAvailability('core') }}"))
 const browse=source.slice(source.indexOf('      onBrowseFull={() => {'),source.indexOf('      starting={starting}',source.indexOf('      onBrowseFull={() => {')))
 assert.ok(browse.includes('setSelectedKeys(simpleAuto.map((entry) => entry.key))'))
 assert.ok(browse.includes('setSimpleSelectionChanged(true)'))
 for(const route of ['direct-full','core']) {const h=harness();h.toggle('phq-9');assert.deepEqual(h.keys,['phq-9'],route);h.toggle('phq-9');assert.deepEqual(h.keys,[],route)}
})
