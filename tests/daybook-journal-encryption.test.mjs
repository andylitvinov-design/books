import test from 'node:test'
import assert from 'node:assert/strict'
import {seal,openSealed,operationHash} from '../lib/app/crypto.js'
const config={encryptionKey:Buffer.alloc(32,7),encryptionKeyId:'synthetic-test-key'}
const accountId='550e8400-e29b-41d4-a716-446655440001'
const recordId='550e8400-e29b-41d4-a716-446655440002'
const context={accountId,recordId,field:'daybook.entry'}
test('journal ciphertext conceals content and is bound to account, record and field',()=>{
 const payload={text:'Synthetic private journal thought',tags:['private-tag'],localDay:'2026-11-22'}
 const sealed=seal(payload,context,config)
 for(const plaintext of [payload.text,'private-tag','2026-11-22']) assert.equal(sealed.includes(plaintext),false)
 assert.deepEqual(openSealed(sealed,context,config),payload)
 for(const changed of [{accountId:recordId},{recordId:accountId},{field:'development.goals'}]) assert.throws(()=>openSealed(sealed,{...context,...changed},config),{code:'PRIVATE_DATA_UNAVAILABLE'})
 const envelope=JSON.parse(sealed);envelope.data=Buffer.from('tampered').toString('base64')
 assert.throws(()=>openSealed(JSON.stringify(envelope),context,config),{code:'PRIVATE_DATA_UNAVAILABLE'})
 assert.notEqual(sealed,seal(payload,context,config))
})
test('retry fingerprint detects changed body, revision and operation without retaining content',()=>{
 const input={text:'Synthetic thought',revision:1,operation:'save'}
 const fingerprint=operationHash(input,config)
 assert.match(fingerprint,/^[a-f0-9]{64}$/)
 assert.equal(fingerprint,operationHash({...input},config))
 for(const changed of [{text:'Another thought'},{revision:2},{operation:'delete'}]) assert.notEqual(fingerprint,operationHash({...input,...changed},config))
})
