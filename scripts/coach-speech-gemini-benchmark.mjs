// Explicit, local CLI. Never use client recordings. No CI or application route invokes this.
import {readFile,realpath,writeFile} from 'node:fs/promises'
import {resolve,dirname,basename} from 'node:path'
import {createHash} from 'node:crypto'
import {performance} from 'node:perf_hooks'
import {transcribeGeminiBenchmark} from '../lib/coaching/gemini-transcribe-benchmark.mjs'
const args=process.argv.slice(2)
const [rootArg,output]=args
if(!rootArg||!output||!args.includes('--synthetic-only'))throw Error('Usage: node scripts/coach-speech-gemini-benchmark.mjs CORPUS OUTPUT --synthetic-only [--check-only] [--hints] [--vocabulary] [--limit=10]')
const root=await realpath(rootArg),audioRoot=await realpath(resolve(root,'audio'))
if(dirname(audioRoot)!==root)throw Error('INVALID_AUDIO_ROOT')
const refs=JSON.parse(await readFile(new URL('../tests/fixtures/coach-speech-benchmark-v1.json',import.meta.url),'utf8')).fixtures
const records=JSON.parse(await readFile(resolve(audioRoot,'manifest.json'),'utf8')).records
const byId=new Map(refs.map(r=>[r.id,r])),seen=new Set(),clips=[]
if(!Array.isArray(records)||records.length!==refs.length)throw Error('FIXTURE_COUNT_MISMATCH')
for(const row of records){
  const ref=byId.get(row.id)
  if(!ref||seen.has(row.id)||row.locale!==ref.locale||row.reference!==ref.reference||row.file!==row.id+'.wav'||basename(row.file)!==row.file)throw Error('INVALID_FIXTURE')
  seen.add(row.id)
  const path=await realpath(resolve(audioRoot,row.file))
  if(dirname(path)!==audioRoot)throw Error('INVALID_AUDIO_PATH')
  const wav=await readFile(path)
  if(wav.length<44||wav.length>480044||wav.toString('ascii',0,4)!=='RIFF'||wav.toString('ascii',8,12)!=='WAVE'||wav.toString('ascii',12,16)!=='fmt '||wav.readUInt32LE(16)!==16||wav.readUInt16LE(20)!==1||wav.readUInt16LE(22)!==1||wav.readUInt32LE(24)!==16000||wav.readUInt16LE(34)!==16||wav.toString('ascii',36,40)!=='data'||wav.readUInt32LE(40)!==wav.length-44||wav.length%2!==0)throw Error('INVALID_AUDIO_FORMAT')
  const audioId=createHash('sha256').update(wav).digest('hex')
  if(audioId!==row.audioId)throw Error('AUDIO_HASH_MISMATCH')
  clips.push({id:row.id,locale:row.locale,audioId,wav})
}
if(args.includes('--check-only')){console.log(JSON.stringify({validatedClips:clips.length,modelExecuted:false}));process.exit(0)}
if(process.env.HH_GEMINI_TRANSCRIBE_FREE_BENCHMARK_CONFIRMED!=='true'||process.env.HH_GEMINI_TRANSCRIBE_SYNTHETIC_DATA_ACK!=='true'||!process.env.HH_GEMINI_TRANSCRIBE_BENCHMARK_KEY)throw Error('BENCHMARK_NOT_AUTHORIZED')
const limit=Number(args.find(a=>a.startsWith('--limit='))?.split('=')[1]??10)
if(!Number.isInteger(limit)||limit<1||limit>10)throw Error('LIMIT_1_TO_10')
const offset=Number(args.find(a=>a.startsWith('--offset='))?.split('=')[1]??0)
if(!Number.isInteger(offset)||offset<0||offset>=clips.length)throw Error('INVALID_OFFSET')
const hints=args.includes('--hints'),vocabulary=args.includes('--vocabulary')
const results=[];let stopped=false,attempted=0
for(const [index,clip] of clips.entries()){
  let text=null,latencyMs=null
  if(index>=offset&&index<offset+limit&&!stopped){
    const start=performance.now();attempted++
    try{text=await transcribeGeminiBenchmark(clip.wav,clip.locale,{hints,vocabulary})}
    catch{stopped=true}
    latencyMs=Math.round(performance.now()-start)
  }
  results.push({id:clip.id,audioId:clip.audioId,text,latencyMs})
}
await writeFile(output,JSON.stringify({name:'gemini-3.5-transcribe'+(hints?'-hints':'-auto')+(vocabulary?'-vocabulary':''),results},null,2),{flag:'wx',mode:0o600})
console.log(JSON.stringify({validatedClips:clips.length,attempted,recognizedClips:results.filter(r=>r.text).length,stopped,partial:true}))
