import {readFileSync,writeFileSync} from 'node:fs'
import {pathToFileURL} from 'node:url'
export function mergeBatches(batches) {
 if(!Array.isArray(batches)||!batches.length)throw Error('BATCHES_REQUIRED')
 const first=batches[0], name=first.name
 if(typeof name!=='string'||!name||!Array.isArray(first.results)||!first.results.length)throw Error('INVALID_BATCH')
 const rows=new Map()
 for(const item of first.results){
  if(typeof item.id!=='string'||rows.has(item.id)||!/^[a-f0-9]{64}$/u.test(item.audioId))throw Error('INVALID_CLIP')
  rows.set(item.id,{id:item.id,audioId:item.audioId,text:null,latencyMs:null})
 }
 const attempted=new Set()
 for(const batch of batches){
  if(batch.name!==name||!Array.isArray(batch.results)||batch.results.length!==rows.size)throw Error('MODEL_OR_COUNT_MISMATCH')
  const seen=new Set()
  for(const item of batch.results){
   const row=rows.get(item.id)
   if(!row||seen.has(item.id)||item.audioId!==row.audioId)throw Error('AUDIO_MISMATCH')
   seen.add(item.id)
   if(item.text!==null&&(typeof item.text!=='string'||!item.text.trim()))throw Error('INVALID_TEXT')
   if(item.latencyMs===null){if(item.text!==null)throw Error('MISSING_LATENCY');continue}
   if(!Number.isFinite(item.latencyMs)||item.latencyMs<0||attempted.has(item.id))throw Error('DUPLICATE_OR_INVALID_ATTEMPT')
   attempted.add(item.id);row.text=item.text;row.latencyMs=item.latencyMs
  }
 }
 return {name,results:[...rows.values()],partial:attempted.size!==rows.size,attempted:attempted.size}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [out,...paths]=process.argv.slice(2)
 if(!out||!paths.length)throw Error('Usage: node scripts/coach-speech-merge-batches.mjs OUTPUT BATCH...')
 const merged=mergeBatches(paths.map(p=>JSON.parse(readFileSync(p,'utf8'))))
 writeFileSync(out,JSON.stringify(merged,null,2),{flag:'wx',mode:0o600})
 console.log(JSON.stringify({attempted:merged.attempted,partial:merged.partial}))
}
