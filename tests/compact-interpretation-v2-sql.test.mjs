import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import {canonicalJSON} from '../lib/assessments/contracts.js'
import {compactInterpretationInsert,restoreCanonicalFragments,MAX_COMPACT_SQL_BYTES} from '../scripts/compact-interpretation-sql.mjs'
import {lexicalParts,encodeTransport,compactLexicalInsert} from '../scripts/compact-interpretation-v2-sql.mjs'
const row=(payload,id='a')=>{const payload_canonical=canonicalJSON(payload);return{assessment_version_id:id,interpretation_version:'test.v2',report_locale:'en',payload,payload_canonical,payload_sha256:'sha256:'+crypto.createHash('sha256').update(payload_canonical).digest('hex')}}
test('sentence fragments preserve exact escaped Unicode, apostrophe, backslash and JSON bytes',()=>{
 const payload={nested:[null,true,false,1.25,{text:'One. Same long sentence with meaning. Quote "yes". Same long sentence with meaning. Unicode Привет 😀. Backslash \\ and newline\n then apostrophe O\'Neil; DROP TABLE must remain literal.'}],empty:'',special:'\\" \\n \\u1234'}
 const r=row(payload);assert.equal(lexicalParts(r.payload_canonical).join(''),r.payload_canonical)
 const {dictionary,encoded}=encodeTransport([r]);assert.ok(dictionary.length>0)
 assert.equal(restoreCanonicalFragments(dictionary,encoded[0].parts),r.payload_canonical)
 assert.deepEqual(JSON.parse(restoreCanonicalFragments(dictionary,encoded[0].parts)),payload)
})
test('transport rejects empty/duplicate identities and changed canonical bytes or hashes',()=>{
 const r=row({text:'Repeated sentence with some words. Repeated sentence with some words.'})
 assert.throws(()=>encodeTransport([]));assert.throws(()=>encodeTransport([r,r]),/Duplicate/)
 assert.throws(()=>encodeTransport([{...r,payload_canonical:r.payload_canonical+' '}]),/canonical/)
 assert.throws(()=>encodeTransport([{...r,payload_sha256:'sha256:'+'0'.repeat(64)}]),/canonical/)
})
test('v2 changes only encoded literals and preserves the exact C1 decoder/INSERT tail and12MiB bound',()=>{
 const r=row({text:'A repeated sentence for exact transport. A repeated sentence for exact transport.'})
 const marker='), restored AS MATERIALIZED ('
 const before=compactInterpretationInsert([r]).sql,after=compactLexicalInsert([r])
 assert.equal(after.split(marker).length,2);assert.equal(after.split(marker)[1],before.split(marker)[1])
 assert.ok(after.startsWith('WITH dictionary AS MATERIALIZED (SELECT '))
 assert.equal(MAX_COMPACT_SQL_BYTES,12*1024*1024)
 const enormous=row({text:'x'.repeat(MAX_COMPACT_SQL_BYTES+1)})
 assert.throws(()=>compactLexicalInsert([enormous]),/transport bound/)
})
