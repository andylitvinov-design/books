import test from 'node:test'
import assert from 'node:assert/strict'
import {validateSessionContent,validateUpload,isUuid,selectorPattern} from '../lib/clients/session-delivery-validation.js'
const id1='246aa1a3-a371-5a83-9f4b-cd23ff027a76'
const id2='246aa1a3-a371-5a83-9f4b-cd23ff027a77'

test('personal sessions contain distinct, ordered, versionable per-session materials',()=>{
  const one=validateSessionContent({title:'Session A',summary:'Support A',items:[
    {kind:'video',title:'Video A',assetId:id1,id:id2},
    {kind:'report',title:'Report A',refId:id2,id:id1}
  ]})
  assert.equal(one.items.length,2)
  assert.equal(one.items[0].assetId,id1)
  assert.equal(one.items[1].refId,id2)
  assert.equal(one.items[0].position,0)
  assert.equal(one.items[1].position,1)
  const two=validateSessionContent({title:'Session B',summary:'',items:[
    {kind:'audio',title:'Audio B',assetId:id1}
  ]})
  assert.notEqual(one.title,two.title)
  assert.notEqual(one.items[0].id,two.items[0].id)
})
test('cannot attach arbitrary or ambiguous item identifiers',()=>{
  const base={title:'Private session',summary:'',items:[]}
  assert.throws(()=>validateSessionContent({...base,items:[{kind:'report',title:'x',refId:'report'}]}))
  assert.throws(()=>validateSessionContent({...base,items:[{id:id1,kind:'report',title:'x',refId:id2},{id:id1,kind:'report',title:'y',refId:id2}]}))
  assert.throws(()=>validateSessionContent({...base,unknown:'secret'}))
  assert.throws(()=>validateSessionContent({...base,items:[{kind:'video',title:'x',assetId:id1,url:'https://evil.example'}]}))
  assert.throws(()=>validateSessionContent({...base,items:[{kind:'script',title:'script'}]}))
})
test('does not allow invalid or local external resources',()=>{
  const template=url=>({title:'Plan',summary:'',items:[{kind:'link',title:'Resource',url}]})
  for(const url of ['http://localhost/file','https://127.0.0.1/private','file:///tmp/secret','javascript:alert(1)','https://user:pass@example.com/','https://foo.local/doc']){
    assert.throws(()=>validateSessionContent(template(url)),url)
  }
  assert.equal(validateSessionContent(template('https://example.com/resource')).items[0].url,'https://example.com/resource')
})
test('media size and MIME are explicitly limited before signed upload',()=>{
  assert.deepEqual(validateUpload({mime:'audio/mpeg',bytes:1024}),{mime:'audio/mpeg',bytes:1024})
  assert.throws(()=>validateUpload({mime:'text/html',bytes:150}))
  assert.throws(()=>validateUpload({mime:'video/mp4',bytes:150*1024*1024}))
  assert.throws(()=>validateUpload({mime:'audio/mp4',bytes:26*1024*1024}))
  assert.throws(()=>validateUpload({mime:'application/pdf',bytes:0}))
})
test('UUID/selector guards have exact structure',()=>{
  assert.ok(isUuid(id1))
  assert.ok(!isUuid('../session-a'))
  assert.ok(selectorPattern.test('aaaaaaaaaaaaaaaaaaaaaa'))
  assert.ok(!selectorPattern.test('not/a/selector'))
})
