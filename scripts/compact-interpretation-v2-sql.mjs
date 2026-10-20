// Transport-only v2 encoding. C1 payload bytes, hashes and decoder semantics stay exact.
import {createHash} from 'node:crypto'
import {canonicalJSON} from '../lib/assessments/contracts.js'
import { compactInterpretationInsert, sqlLiteral, MAX_COMPACT_SQL_BYTES } from './compact-interpretation-sql.mjs'
export function lexicalParts(text) {
  // Linear scanner avoids regexp stack growth on a large JSON string literal.
  const parts=[]; let end=0, index=0
  while(index<text.length){
    if(text[index] !== '"'){index++;continue}
    const start=index++
    while(index<text.length && text[index] !== '"')index+=text[index]==='\\'?2:1
    if(index>=text.length)throw Error('Unterminated JSON string')
    index++
    if(start>end)parts.push(text.slice(end,start))
    const token=text.slice(start,index)
    if(token.length<64)parts.push(token)
    else {
      parts.push('"')
      const sentences=token.slice(1,-1).split(/([.!?](?:\s+|\\n)+)/)
      for(let i=0;i<sentences.length;i+=2){const sentence=sentences[i]+(sentences[i+1]||'');if(sentence)parts.push(sentence)}
      parts.push('"')
    }
    end=index
  }
  if(end<text.length)parts.push(text.slice(end))
  if(parts.join('')!==text)throw Error('Lexical roundtrip failed')
  return parts
}
export function encodeTransport(rows){
 if(!Array.isArray(rows)||rows.length===0||rows.length>10000)throw Error('Invalid compact row count')
 const identities=new Set()
 for(const row of rows){
  const identity=JSON.stringify([row.assessment_version_id,row.interpretation_version,row.report_locale])
  if(identities.has(identity))throw Error('Duplicate compact row identity');identities.add(identity)
  if(canonicalJSON(row.payload)!==row.payload_canonical||row.payload_sha256!=='sha256:'+createHash('sha256').update(row.payload_canonical).digest('hex'))throw Error('Compact input canonical/hash mismatch')
 }
 const arrays=rows.map(r=>lexicalParts(r.payload_canonical)),counts=new Map()
 for(const parts of arrays)for(const part of parts)if(part.length>=16)counts.set(part,(counts.get(part)||0)+1)
 const dictionary=[],indexes=new Map(),encoded=[]
 for(let i=0;i<arrays.length;i++){
  const parts=[]
  for(const part of arrays[i]){
   if((counts.get(part)||0)>1&&part.length>=16){if(!indexes.has(part)){indexes.set(part,dictionary.length);dictionary.push(part)}parts.push(indexes.get(part))}
   else if(typeof parts.at(-1)==='string')parts[parts.length-1]+=part;else parts.push(part)
  }
  if(parts.length>100000||parts.map(p=>typeof p==='string'?p:dictionary[p]).join('')!==rows[i].payload_canonical)throw Error('Transport roundtrip failed')
  encoded.push({hash:rows[i].payload_sha256,parts})
 }
 if(dictionary.length>100000)throw Error('Dictionary limit')
 return {dictionary,encoded}
}
export function compactLexicalInsert(rows){
 const {dictionary,encoded}=encodeTransport(rows)
 // Keep the exact C1-audited PostgreSQL decoder and INSERT projection.
 const original=compactInterpretationInsert([rows[0]]).sql
 const marker='), restored AS MATERIALIZED ('
 if(original.split(marker).length!==2)throw Error('Decoder source drift')
 const sql = `WITH dictionary AS MATERIALIZED (SELECT ${sqlLiteral(JSON.stringify(dictionary))}::jsonb AS parts),\nencoded(expected_hash, fragments) AS (VALUES\n${encoded.map(row=>'('+sqlLiteral(row.hash)+','+sqlLiteral(JSON.stringify(row.parts))+'::jsonb)').join(',\n')}\n`+marker+original.split(marker)[1]
 if(Buffer.byteLength(sql)>MAX_COMPACT_SQL_BYTES)throw Error('Compact SQL exceeds reviewed transport bound')
 return sql
}
