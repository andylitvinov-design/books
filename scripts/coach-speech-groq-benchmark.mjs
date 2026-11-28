// Explicit benchmark only. Reuse merged Gemini CLI's input validation through the Python corpus checker.
import {readFile,realpath,writeFile,open} from 'node:fs/promises'
import {resolve,dirname,basename} from 'node:path'
import {createHash} from 'node:crypto'
import {performance} from 'node:perf_hooks'
const args=process.argv.slice(2)
const [rootArg,output,model]=args
if(!rootArg||!output||!['whisper-large-v3','whisper-large-v3-turbo'].includes(model)||!args.includes('--synthetic-only'))throw Error('Usage: node scripts/coach-speech-groq-benchmark.mjs CORPUS OUTPUT MODEL --synthetic-only [--check-only] [--limit=10] [--offset=0] [--auto]')
const root=await realpath(rootArg),audioRoot=await realpath(resolve(root,'audio'))
if(dirname(audioRoot)!==root)throw Error('INVALID_AUDIO_ROOT')
const refs=JSON.parse(await readFile(new URL('../tests/fixtures/coach-speech-benchmark-v1.json',import.meta.url),'utf8')).fixtures
const manifest=JSON.parse(await readFile(resolve(audioRoot,'manifest.json'),'utf8'))
if(manifest.source!=='authored-synthetic-espeak')throw Error('SYNTHETIC_PROVENANCE_REQUIRED')
const byId=new Map(refs.map(r=>[r.id,r])),seen=new Set(),clips=[]
if(!Array.isArray(manifest.records)||manifest.records.length!==refs.length)throw Error('FIXTURE_COUNT_MISMATCH')
for(const row of manifest.records){
 const ref=byId.get(row.id)
 if(!ref||seen.has(row.id)||row.locale!==ref.locale||row.reference!==ref.reference||row.file!==row.id+'.wav'||basename(row.file)!==row.file)throw Error('INVALID_FIXTURE')
 seen.add(row.id)
 const path=await realpath(resolve(audioRoot,row.file))
 if(dirname(path)!==audioRoot)throw Error('INVALID_AUDIO_PATH')
 const wav=await readFile(path)
 if(wav.length<3244||wav.length>480044||wav.length%2||wav.toString('ascii',0,4)!=='RIFF'||wav.toString('ascii',8,12)!=='WAVE'||wav.readUInt32LE(4)!==wav.length-8||wav.toString('ascii',12,16)!=='fmt '||wav.readUInt32LE(16)!==16||wav.readUInt16LE(20)!==1||wav.readUInt16LE(22)!==1||wav.readUInt32LE(24)!==16000||wav.readUInt16LE(34)!==16||wav.toString('ascii',36,40)!=='data'||wav.readUInt32LE(40)!==wav.length-44)throw Error('INVALID_AUDIO_FORMAT')
 const audioId=createHash('sha256').update(wav).digest('hex')
 if(audioId!==row.audioId)throw Error('AUDIO_HASH_MISMATCH')
 clips.push({id:row.id,locale:row.locale,audioId,wav})
}
if(args.includes('--check-only')){console.log(JSON.stringify({validatedClips:clips.length,modelExecuted:false}));process.exit(0)}
if(process.env.HH_GROQ_STT_FREE_BENCHMARK_CONFIRMED!=='true'||process.env.HH_GROQ_STT_SYNTHETIC_DATA_ACK!=='true'||!process.env.HH_GROQ_STT_BENCHMARK_KEY)throw Error('BENCHMARK_NOT_AUTHORIZED')
const limit=Number(args.find(a=>a.startsWith('--limit='))?.split('=')[1]??10),offset=Number(args.find(a=>a.startsWith('--offset='))?.split('=')[1]??0)
if(!Number.isInteger(limit)||limit<1||limit>10||!Number.isInteger(offset)||offset<0||offset>=clips.length)throw Error('INVALID_BATCH')
const auto=args.includes('--auto'),results=[];let stopped=false,attempted=0
// Reserve the output before any billable-capable call. A flag is not evidence of a free account.
const handle=await open(output,'wx',0o600)
try{
 for(const [index,clip] of clips.entries()){
  let text=null,latencyMs=null
  if(index>=offset&&index<offset+limit&&!stopped){
   const start=performance.now();attempted++
   try{
    const form=new FormData()
    form.set('file',new Blob([clip.wav],{type:'audio/wav'}),'benchmark.wav')
    form.set('model',model);form.set('response_format','json');form.set('temperature','0')
    if(!auto)form.set('language',clip.locale)
    const res=await fetch('https://api.groq.com/openai/v1/audio/transcriptions',{method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000),headers:{Authorization:'Bearer '+process.env.HH_GROQ_STT_BENCHMARK_KEY},body:form})
    if(!res.ok)throw Error('PROVIDER_REJECTED')
    const body=await res.json()
    if(typeof body.text==='string'&&body.text.trim()&&body.text.length<=12000)text=body.text.trim()
   }catch{stopped=true}
   latencyMs=Math.round(performance.now()-start)
  }
  results.push({id:clip.id,audioId:clip.audioId,text,latencyMs})
 }
 await handle.writeFile(JSON.stringify({name:model+(auto?'-auto':'-hints'),results},null,2))
}finally{await handle.close()}
console.log(JSON.stringify({validatedClips:clips.length,attempted,recognizedClips:results.filter(r=>r.text).length,stopped,partial:attempted!==clips.length}))
