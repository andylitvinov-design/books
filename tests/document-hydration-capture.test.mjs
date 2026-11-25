import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const source=readFileSync(new URL('../scripts/verify-document-hydration.mjs',import.meta.url),'utf8')
const handler=source.match(/page\.on\('response',response=>\{([\s\S]*?)\n  \}\)/)[1]
const readBody=source.match(/const captured=await document\.body([\s\S]*?)\n  const serialized=/)[0].replace(/\n  const serialized=$/,'')
const capture=new Function('response','page','documents',handler)
const readCaptured=new Function('document',`return (async()=>{${readBody};return captured.html})()`)
const frame={},page={mainFrame:()=>frame}
function response(html,{navigation=true,main=true,reject=null}={}){
 let reads=0,evicted=false
 const object={request:()=>({isNavigationRequest:()=>navigation,frame:()=>main?frame:{}}),text:()=>{reads++;return evicted?Promise.reject(new Error('evicted')):reject?Promise.reject(reject):Promise.resolve(html)}}
 return {object,reads:()=>reads,evict:()=>{evicted=true}}
}
test('actual response callback starts body capture before navigation evicts inspector storage',async()=>{
 const documents=[],r=response('original');capture(r.object,page,documents);assert.equal(r.reads(),1);r.evict();assert.equal(await readCaptured(documents[0]),'original');await assert.rejects(r.object.text(),/evicted/)
})
test('each main navigation keeps its own response/body identity; unrelated responses excluded',async()=>{
 const documents=[],a=response('A'),b=response('B');capture(a.object,page,documents);capture(response('asset',{navigation:false}).object,page,documents);capture(response('iframe',{main:false}).object,page,documents);capture(b.object,page,documents);assert.equal(documents.length,2);assert.equal(documents.at(-1).response,b.object);assert.equal(await readCaptured(documents.at(-1)),'B');assert.equal(await readCaptured(documents[0]),'A');assert.notEqual(documents[0],documents.at(-1))
})
test('selected document body failure stays a failure instead of substituting another navigation',async()=>{
 const documents=[],error=new Error('selected body unavailable');capture(response('old').object,page,documents);capture(response('',{reject:error}).object,page,documents);await assert.rejects(readCaptured(documents.at(-1)),e=>e===error)
})
test('nonce, complete schema, live URL and navigation stability checks remain mandatory',()=>{
 for(const fragment of ["assert.equal(response.url(),page.url())","assert.equal(rendered.nonce,nonce",'assert.deepEqual(rendered.schema,JSON.parse(serialized[1])',"assert.equal(documents.at(-1),document,'document must remain stable",'assert.deepEqual(errors,[])'])assert.ok(source.includes(fragment),fragment)
 const stable=new Function('documents','document','assert',source.match(/assert\.equal\(documents\.at\(-1\),document,'document must remain stable during its assertions'\)/)[0]);const old={};assert.throws(()=>stable([{}],old,assert));stable([old],old,assert)
})

test('actual schema assertions accept one WebSite in a graph and reject missing, duplicate or wrong nodes',()=>{
 const fragment=source.slice(source.indexOf("  assert.equal(rendered.schema['@context']"),source.indexOf("  assert.equal(await page.locator('html')"))
 const validate=new Function('rendered','assert',fragment)
 const website={'@type':'WebSite',name:'Holistic House',inLanguage:['en','ru','es']}
 const schema=nodes=>({'@context':'https://schema.org','@graph':nodes})
 validate({schema:schema([website,{'@type':'Organization',name:'Holistic House'},{'@type':'Person',name:'Andrey Litvinov'}])},assert)
 validate({schema:{'@context':'https://schema.org',...website}},assert)
 for(const invalid of [
  schema([]),schema([{'@type':'Organization',name:'Holistic House'}]),schema([website,{...website}]),
  schema([{...website,name:'Wrong site'}]),schema([{...website,inLanguage:['en']}]),
  {...schema([website]),'@context':'https://wrong.invalid'},
 ])assert.throws(()=>validate({schema:invalid},assert),assert.AssertionError)
})
