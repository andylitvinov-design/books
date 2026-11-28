// Explicit local command. The only input is an ID from the committed synthetic
// corpus; no client audio, arbitrary text, recordings, mic, or runtime routes.
import {readFileSync,openSync,closeSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {initLedger,freeLiveKey,synthesizeFixture,streamSyntheticPcm,offlineWhisper,MODEL} from '../lib/coaching/gemini-live-stt-benchmark.mjs'
const args=process.argv.slice(2)
if(args.length===1&&args[0]==='--init-ledger'){
  initLedger();console.log(JSON.stringify({ledgerInitialized:true,network:false}));process.exit(0)
}
const known=/^(--synthetic-only|--check-only|--offline-only|--hints|--vocabulary|--id=[\w-]+|--output=.+)$/
if(args.some(a=>!known.test(a))||new Set(args.map(a=>a.split('=')[0])).size!==args.length||!args.includes('--synthetic-only'))throw Error('USE_COMMITTED_SYNTHETIC_FIXTURE_ONLY')
const id=args.find(a=>a.startsWith('--id='))?.slice(5)
const output=args.find(a=>a.startsWith('--output='))?.slice(9)
const check=args.includes('--check-only'),offline=args.includes('--offline-only')
if(!id||check&&offline||!check&&!output)throw Error('USE --synthetic-only --id=ru-short-1 [--check-only OR --output=FILE] [--offline-only] [--hints] [--vocabulary]')
const fixtures=JSON.parse(readFileSync(new URL('../tests/fixtures/coach-speech-benchmark-v1.json',import.meta.url),'utf8')).fixtures
const fixture=fixtures.find(f=>f.id===id)
if(!fixture)throw Error('UNKNOWN_FIXTURE')
const pcm=synthesizeFixture(fixture)
// Deterministic WAV wrapper for cross-provider audio hashes; benchmark results
// only comparable if hashes match, never pretend this is prior corpus audio.
const wav=Buffer.alloc(44+pcm.length)
wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8)
wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22)
wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34)
wav.write('data',36);wav.writeUInt32LE(pcm.length,40);pcm.copy(wav,44)
const audioId=createHash('sha256').update(wav).digest('hex')
if(check){console.log(JSON.stringify({id,locale:fixture.locale,audioId,seconds:pcm.length/32000,network:false}));process.exit(0)}
if(!offline)freeLiveKey()
const fd=openSync(output,'wx',0o600)
try{
  let primary=null,fallback=null,reason=null
  if(!offline){
    try{primary=await streamSyntheticPcm(pcm,fixture.locale,{hints:args.includes('--hints'),vocabulary:args.includes('--vocabulary')})}
    catch(e){
      // Only fixed internal codes are written; never provider error details.
      reason=/^(STT_|FREE_QUOTA_|QUOTA_)[A-Z_]+$/.test(e?.message||'')?e.message:'STT_UNAVAILABLE'
    }
  }
  if(offline||!primary)fallback=offlineWhisper(pcm,fixture.locale)
  const result={fixtureId:id,locale:fixture.locale,audioId,seconds:pcm.length/32000,primaryModel:MODEL,
    hints:args.includes('--hints'),vocabulary:args.includes('--vocabulary'),primary,fallback,reason,partial:true}
  writeFileSync(fd,JSON.stringify(result,null,2))
  console.log(JSON.stringify({id,provider:primary?MODEL:fallback?.provider??null,reason,recognized:Boolean(primary||fallback),partial:true}))
  if(!primary&&!fallback)process.exitCode=2
}finally{closeSync(fd)}
