// Offline aggregation of the fixed synthetic STT experiment. No API calls.
import {readFileSync,writeFileSync} from 'node:fs'
import {pathToFileURL} from 'node:url'
import {compare} from './coach-speech-benchmark.mjs'
const GEMINI='models/gemini-3.5-transcribe-live'
export const PROVIDERS=Object.freeze([GEMINI,'whisper-large-v3-local','whisper-large-v3-turbo-local'])
export const SMOKE_IDS=Object.freeze(['ru','en','es'].flatMap(l=>['short','negation','terms','numbers','mixed'].map(c=>l+'-'+c+'-1')))
export function aggregateLiveComparison(fixtures,rows,{smoke=false}={}){
  if(!Array.isArray(fixtures)||!Array.isArray(rows)||!rows.length)throw Error('INVALID_INPUT')
  const byId=new Map(fixtures.map(f=>[f.id,f]))
  if(byId.size!==fixtures.length)throw Error('DUPLICATE_FIXTURE')
  const plan=smoke?SMOKE_IDS.map(id=>byId.get(id)):fixtures
  if(!plan.length||plan.some(f=>!f))throw Error('PLAN_FIXTURE_MISSING')
  const expected=new Map(plan.map(f=>[f.id,f]))
  const cells=new Map(),hashes=new Map(),failures=[]
  let geminiConfig=null
  for(const row of rows){
    const f=expected.get(row?.fixtureId),provider=row?.attemptedProvider
    if(!f||!PROVIDERS.includes(provider)||row.locale!==f.locale||row.partial!==true||row.primaryModel!==GEMINI||typeof row.audioId!=='string'||!/^[a-f0-9]{64}$/.test(row.audioId))throw Error('UNEXPECTED_RESULT')
    if(!Number.isFinite(row.seconds)||row.seconds<=0||row.seconds>15)throw Error('INVALID_DURATION')
    if(hashes.has(f.id)&&hashes.get(f.id)!==row.audioId)throw Error('AUDIO_MISMATCH')
    hashes.set(f.id,row.audioId)
    const key=provider+'::'+f.id
    if(cells.has(key))throw Error('DUPLICATE_RESULT')
    let result
    if(provider===GEMINI){
      if(typeof row.hints!=='boolean'||typeof row.vocabulary!=='boolean')throw Error('MISSING_CONFIG')
      const config=JSON.stringify([row.hints,row.vocabulary])
      if(geminiConfig!==null&&geminiConfig!==config)throw Error('GEMINI_CONFIG_MISMATCH')
      geminiConfig=config
      result=row.primary // Never attribute a Whisper fallback to Gemini.
    }else{
      if(row.primary!==null||row.hints!==false||row.vocabulary!==false||row.fallback&&row.fallback.provider!==provider)throw Error('WRONG_LOCAL_MODEL')
      result=row.fallback
    }
    if(result!=null&&(typeof result.text!=='string'||!result.text.trim()||!Number.isFinite(result.latencyMs)||result.latencyMs<0))throw Error('INVALID_TRANSCRIPT')
    if(result==null)failures.push({fixtureId:f.id,provider,reason:typeof row.reason==='string'&&/^(STT_|FREE_QUOTA_|QUOTA_)[A-Z_]+$/.test(row.reason)?row.reason:'NO_RESULT'})
    cells.set(key,{id:f.id,audioId:row.audioId,text:result?.text??null,latencyMs:result?.latencyMs??null})
  }
  const missing=PROVIDERS.flatMap(provider=>plan.filter(f=>!cells.has(provider+'::'+f.id)).map(f=>({provider,fixtureId:f.id})))
  const header={scope:smoke?'synthetic-smoke-15':'synthetic-full-corpus',expectedPerModel:plan.length,received:cells.size,missing,failures,geminiConfig:geminiConfig===null?null:JSON.parse(geminiConfig),realClientAcceptance:false}
  if(missing.length)return {...header,complete:false,reports:null}
  const models=PROVIDERS.map(name=>({name,results:plan.map(f=>cells.get(name+'::'+f.id))}))
  return {...header,complete:true,latencyNote:'Gemini total includes connection and paced audio; local Whisper CPU includes loading and offline inference. Not an end-to-end dialogue latency comparison.',...compare(plan,models)}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=process.argv.slice(2),smoke=args.includes('--smoke')
  const [output,...inputs]=args.filter(a=>a!=='--smoke')
  if(!output||!inputs.length)throw Error('Usage: node scripts/coach-speech-live-compare.mjs OUTPUT RESULT.json [...] [--smoke]')
  const fixtures=JSON.parse(readFileSync(new URL('../tests/fixtures/coach-speech-benchmark-v1.json',import.meta.url),'utf8')).fixtures
  const report=aggregateLiveComparison(fixtures,inputs.map(p=>JSON.parse(readFileSync(p,'utf8'))),{smoke})
  writeFileSync(output,JSON.stringify(report,null,2),{flag:'wx',mode:0o600})
  console.log(JSON.stringify({scope:report.scope,complete:report.complete,received:report.received,missing:report.missing.length,failures:report.failures.length}))
  if(!report.complete)process.exitCode=2
}
