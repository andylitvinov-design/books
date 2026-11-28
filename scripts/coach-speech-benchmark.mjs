// Offline, deterministic benchmark scorer. No network, credentials or provider calls.
import {readFileSync} from 'node:fs'
import {pathToFileURL} from 'node:url'
export const normalize=s=>String(s??'').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/gu,' ').trim()
export function distance(a,b){
 let row=Array.from({length:b.length+1},(_,i)=>i)
 for(let i=1;i<=a.length;i++){
  const next=[i]
  for(let j=1;j<=b.length;j++)next[j]=Math.min(row[j]+1,next[j-1]+1,row[j-1]+(a[i-1]===b[j-1]?0:1))
  row=next
 }
 return row[b.length]
}
export function score(fixture,model){
 if(!Array.isArray(fixture)||!fixture.length||!model||!Array.isArray(model.results))throw Error('INVALID_BENCHMARK')
 const ids=new Set(fixture.map(x=>x.id))
 if(ids.size!==fixture.length)throw Error('DUPLICATE_FIXTURE')
 const records=new Map()
 for(const row of model.results){
  if(!ids.has(row.id)||records.has(row.id))throw Error('UNKNOWN_OR_DUPLICATE_RESULT')
  if(typeof row.audioId!=='string'||!row.audioId.trim())throw Error('MISSING_AUDIO_ID')
  if(row.text!=null&&typeof row.text!=='string')throw Error('INVALID_TRANSCRIPT')
  if(row.latencyMs!=null&&(!Number.isFinite(row.latencyMs)||row.latencyMs<0))throw Error('INVALID_LATENCY')
  records.set(row.id,row)
 }
 function aggregate(items){
  let words=0,werErrors=0,chars=0,cerErrors=0,covered=0,critical=0,criticalMismatch=0
  const latencies=[]
  for(const f of items){
   const r=records.get(f.id),ref=normalize(f.reference),hyp=normalize(r?.text)
   const rw=ref.split(' ').filter(Boolean),hw=hyp.split(' ').filter(Boolean)
   const rc=Array.from(ref.replace(/ /g,'')),hc=Array.from(hyp.replace(/ /g,''))
   words+=rw.length;chars+=rc.length;werErrors+=distance(rw,hw);cerErrors+=distance(rc,hc)
   if(hyp)covered++
   if(f.critical){critical++;if(ref!==hyp)criticalMismatch++}
   if(r?.latencyMs!=null)latencies.push(r.latencyMs)
  }
  latencies.sort((a,b)=>a-b)
  return {samples:items.length,coverage:covered/items.length,wer:words?werErrors/words:null,cer:chars?cerErrors/chars:null,criticalExactMismatch:criticalMismatch,criticalSamples:critical,p50Ms:latencies.length?latencies[Math.ceil(latencies.length*.5)-1]:null,p95Ms:latencies.length?latencies[Math.ceil(latencies.length*.95)-1]:null,latencySamples:latencies.length}
 }
 return {name:model.name,overall:aggregate(fixture),byLocale:Object.fromEntries([...new Set(fixture.map(x=>x.locale))].map(l=>[l,aggregate(fixture.filter(x=>x.locale===l))])),byCategory:Object.fromEntries([...new Set(fixture.map(x=>x.category))].map(c=>[c,aggregate(fixture.filter(x=>x.category===c))]))}
}
export function compare(fixture,models){
 if(!Array.isArray(models)||models.length<2)throw Error('TWO_MODELS_REQUIRED')
 // Same recorded clip for each model; missing outputs must be explicit null rows.
 for(const m of models)if(!Array.isArray(m.results)||m.results.length!==fixture.length)throw Error('EXPLICIT_RESULTS_REQUIRED')
 const baseline=new Map(models[0].results.map(x=>[x.id,x.audioId]))
 for(const m of models.slice(1))for(const x of m.results)if(baseline.get(x.id)!==x.audioId)throw Error('AUDIO_MISMATCH')
 return {baseline:models[0].name,reports:models.map(m=>score(fixture,m))}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [fixturePath,...resultPaths]=process.argv.slice(2)
 if(!fixturePath||resultPaths.length<2)throw Error('Usage: node scripts/coach-speech-benchmark.mjs FIXTURES.json BASELINE.json CANDIDATE.json [...]')
 const load=p=>JSON.parse(readFileSync(p,'utf8'))
 console.log(JSON.stringify(compare(load(fixturePath).fixtures,resultPaths.map(load)),null,2))
}
