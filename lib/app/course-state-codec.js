// Optional compression happens before authenticated encryption, never instead of
// it. This module receives only already-decrypted server-owned state; it has no I/O.
import { gzipSync, gunzipSync } from 'node:zlib'
export const COURSE_STATE_FORMAT = 'hh-course-state-gzip-v1'
export const COURSE_STATE_MAX_DECODED_BYTES = 4 * 1024 * 1024
export const COURSE_STATE_MAX_COMPRESSED_BYTES = 256 * 1024
const fail = () => { throw Error('COURSE_STATE_UNAVAILABLE') }
const object = value => value && typeof value === 'object' && !Array.isArray(value)
export function encodeCourseState(state) {
 if(!object(state)||Object.hasOwn(state,'format'))fail()
 const bytes=Buffer.from(JSON.stringify(state),'utf8')
 if(!bytes.length||bytes.length>COURSE_STATE_MAX_DECODED_BYTES)fail()
 const compressed=gzipSync(bytes,{level:6})
 if(compressed.length>COURSE_STATE_MAX_COMPRESSED_BYTES)fail()
 return {format:COURSE_STATE_FORMAT,encoding:'gzip+base64',uncompressedBytes:bytes.length,payload:compressed.toString('base64')}
}
export function decodeCourseState(value) {
 if(!object(value))fail()
 if(!Object.hasOwn(value,'format')){
  if(Buffer.byteLength(JSON.stringify(value),'utf8')>COURSE_STATE_MAX_DECODED_BYTES)fail()
  return value // Existing encrypted plain JSON remains readable, unchanged.
 }
 if(value.format!==COURSE_STATE_FORMAT||value.encoding!=='gzip+base64'||
  Object.keys(value).length!==4||!['format','encoding','uncompressedBytes','payload'].every(key=>Object.hasOwn(value,key))||
  !Number.isSafeInteger(value.uncompressedBytes)||value.uncompressedBytes<1||value.uncompressedBytes>COURSE_STATE_MAX_DECODED_BYTES||
  typeof value.payload!=='string'||!value.payload||value.payload.length>Math.ceil(COURSE_STATE_MAX_COMPRESSED_BYTES/3)*4||
  !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value.payload))fail()
 try{
  const compressed=Buffer.from(value.payload,'base64')
  if(compressed.length>COURSE_STATE_MAX_COMPRESSED_BYTES||compressed.toString('base64')!==value.payload)fail()
  const decoded=gunzipSync(compressed,{maxOutputLength:COURSE_STATE_MAX_DECODED_BYTES})
  if(decoded.length!==value.uncompressedBytes)fail()
  const state=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(decoded))
  if(!object(state)||Object.hasOwn(state,'format'))fail()
  return state
 }catch{fail()}
}
