import test from 'node:test'
import assert from 'node:assert/strict'
import {gzipSync} from 'node:zlib'
import {encodeCourseState,decodeCourseState,COURSE_STATE_MAX_DECODED_BYTES} from '../lib/app/course-state-codec.js'
test('bounded versioned compression roundtrips EN/RU without modifying old plain state',()=>{
 const state={modelVersion:'synthetic-only',journey:{notes:['Synthetic note','Учебная заметка','🙂']}}
 assert.deepEqual(decodeCourseState(encodeCourseState(state)),state)
 assert.equal(decodeCourseState(state),state)
})
test('strict shape, unknown version, malformed base64 and declared size fail closed',()=>{
 const envelope=encodeCourseState({synthetic:'text'})
 for(const value of [null,[],{...envelope,format:'unknown'},{...envelope,encoding:'other'},{...envelope,extra:true},{...envelope,payload:envelope.payload+'!'},{...envelope,uncompressedBytes:0},{...envelope,uncompressedBytes:1},{...envelope,uncompressedBytes:COURSE_STATE_MAX_DECODED_BYTES+1}])assert.throws(()=>decodeCourseState(value),/COURSE_STATE_UNAVAILABLE/)
})
test('corrupt/truncated gzip and decoded oversized or nested envelopes are rejected',()=>{
 const envelope=encodeCourseState({synthetic:'text'})
 const bytes=Buffer.from(envelope.payload,'base64')
 for(const payload of [bytes.subarray(0,-3).toString('base64'),Buffer.from('not gzip').toString('base64')])assert.throws(()=>decodeCourseState({...envelope,payload}),/COURSE_STATE_UNAVAILABLE/)
 const oversized=gzipSync(Buffer.alloc(COURSE_STATE_MAX_DECODED_BYTES+1,32))
 assert.throws(()=>decodeCourseState({...envelope,payload:oversized.toString('base64'),uncompressedBytes:COURSE_STATE_MAX_DECODED_BYTES}),/COURSE_STATE_UNAVAILABLE/)
 assert.throws(()=>encodeCourseState({text:'x'.repeat(COURSE_STATE_MAX_DECODED_BYTES)}),/COURSE_STATE_UNAVAILABLE/)
 assert.throws(()=>decodeCourseState({text:'x'.repeat(COURSE_STATE_MAX_DECODED_BYTES)}),/COURSE_STATE_UNAVAILABLE/)
 const nested=JSON.stringify(envelope)
 assert.throws(()=>decodeCourseState({...envelope,payload:gzipSync(nested).toString('base64'),uncompressedBytes:Buffer.byteLength(nested)}),/COURSE_STATE_UNAVAILABLE/)
})
test('decoded bytes must be valid UTF8 JSON object with exact byte count',()=>{
 const base=encodeCourseState({synthetic:'text'})
 for(const bytes of [Buffer.from('null'),Buffer.from('[]'),Buffer.from('{invalid'),Buffer.from([0x7b,0x22,0x78,0x22,0x3a,0x22,0xff,0x22,0x7d])])assert.throws(()=>decodeCourseState({...base,payload:gzipSync(bytes).toString('base64'),uncompressedBytes:bytes.length}),/COURSE_STATE_UNAVAILABLE/)
})
