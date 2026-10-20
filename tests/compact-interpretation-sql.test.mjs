import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import {compactInterpretationInsert, encodeCanonicalDictionary, restoreCanonicalFragments, sqlLiteral, MAX_COMPACT_SQL_BYTES} from '../scripts/compact-interpretation-sql.mjs'
const canonical = value => value === null || typeof value !== 'object' ? JSON.stringify(value) : Array.isArray(value) ? '[' + value.map(canonical).join(',') + ']' : '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}'
function row(index, value) {
  const payload = {sourceCommit:'a'.repeat(40),interpretationVersion:'2026-10-17.v1',reportLocale:'en',rulesEngineVersion:'test-only',provenance:{assessmentVersionId:'00000000-0000-4000-8000-'+String(index).padStart(12,'0'),contentHash:'sha256:'+'b'.repeat(64)},value,shared:{meaning:'Meaning shared across rows, with apostrophes, Unicode and backslashes: O’Brien\'s \\ Русский 😀'.repeat(3)}}
  const text = canonical(payload)
  return {assessment_version_id:payload.provenance.assessmentVersionId,interpretation_version:payload.interpretationVersion,report_locale:payload.reportLocale,payload,payload_canonical:text,payload_sha256:'sha256:'+crypto.createHash('sha256').update(text).digest('hex')}
}
test('structured dictionary preserves exact UTF-8 canonical bytes without sentinel substitution', () => {
  const cases = [null,true,false,0,-1,1.25,'',"'\\\n\t\r😀 Русский",'~HH0~',[],{},[0,'0',null,{z:'quoted "',a:'\\u1234'}]]
  const rows = cases.map((value,index)=>row(index,value))
  const encoded = encodeCanonicalDictionary(rows)
  assert.ok(encoded.dictionary.length > 0)
  assert.equal(new Set(encoded.dictionary).size, encoded.dictionary.length)
  assert.deepEqual(encodeCanonicalDictionary(rows),encoded)
  encoded.encoded.forEach((item,index)=>{
    const restored=restoreCanonicalFragments(encoded.dictionary,item.parts)
    assert.deepEqual(Buffer.from(restored),Buffer.from(rows[index].payload_canonical))
    assert.equal('sha256:'+crypto.createHash('sha256').update(restored).digest('hex'),item.hash)
  })
})
test('invalid fragments and missing indices fail rather than becoming skipped NULLs', () => {
  for(const parts of [[],[-1],[.5],[1],[null],[true],[{}],[[]],new Array(1)]) assert.throws(()=>restoreCanonicalFragments(['valid'],parts))
  for(const dictionary of [null,[null],['same','same'],new Array(1)]) assert.throws(()=>restoreCanonicalFragments(dictionary,['literal']))
  const rows=[row(0,'value')]
  assert.throws(()=>encodeCanonicalDictionary([...rows,...rows]),/Duplicate/)
  assert.throws(()=>encodeCanonicalDictionary([{...rows[0],payload_canonical:'{}'}]),/canonical/)
  assert.throws(()=>encodeCanonicalDictionary([{...rows[0],payload_sha256:'sha256:'+'0'.repeat(64)}]),/hash/)
  assert.throws(()=>encodeCanonicalDictionary([]),/row count/)
})
test('SQL uses escaped E literals, ordered reconstruction and one conflict-aborting INSERT', () => {
  assert.equal(sqlLiteral("a'b\\c"),"E'a''b\\\\c'")
  const result=compactInterpretationInsert([row(0,"'; DROP TABLE app.assessment_versions; --"),row(1,'second')])
  assert.equal(result.recordCount,2)
  assert.ok(Buffer.byteLength(result.sql)<MAX_COMPACT_SQL_BYTES)
  assert.equal((result.sql.match(/INSERT INTO app\.assessment_interpretation_versions/g)||[]).length,1)
  assert.match(result.sql,/ORDER BY f\.ordinality/)
  assert.match(result.sql,/jsonb_array_elements\(e\.fragments\) WITH ORDINALITY/)
  assert.match(result.sql,/invalid dictionary index/)
  assert.match(result.sql,/invalid fragment/)
  assert.doesNotMatch(result.sql,/ON CONFLICT|CREATE FUNCTION|CREATE TABLE|CREATE EXTENSION/)
  assert.equal(compactInterpretationInsert([row(0,'same'),row(1,'same')]).sql,compactInterpretationInsert([row(0,'same'),row(1,'same')]).sql)
})
