import './coach-speech-live-compare.test.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,writeFileSync,readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {MODEL,freeLiveKey,setupFrame,initLedger,reserveStart,streamSyntheticPcm,offlineWhisper} from '../lib/coaching/gemini-live-stt-benchmark.mjs'
const pcm=Buffer.alloc(6400,1)
const env={HH_GEMINI_LIVE_STT_FREE_CONFIRMED:'true',HH_GEMINI_LIVE_STT_SYNTHETIC_ONLY:'true',HH_GEMINI_LIVE_STT_EXCLUSIVE_PROJECT:'true',HH_GEMINI_LIVE_STT_TEST_KEY:'fake-test'}
function ledger(t){const dir=mkdtempSync(join(tmpdir(),'hh-stt-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));initLedger(dir);return dir}
class FakeSocket extends EventTarget{
  readyState=1
  bufferedAmount=0
  frames=[]
  closed=false
  constructor(mode='ok'){super();this.mode=mode;queueMicrotask(()=>this.dispatchEvent(new Event('open')))}
  message(data){queueMicrotask(()=>this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(data)})))}
  send(raw){
    const frame=JSON.parse(raw);this.frames.push(frame)
    if(frame.setup)this.message({setupComplete:{}})
    if(frame.realtimeInput?.audio)this.message({serverContent:{interimInputTranscription:{text:'partial'}}})
    if(frame.realtimeInput?.activityEnd){
      if(this.mode==='error')this.message({error:{code:429,message:'private error must not leak'}})
      else if(this.mode==='ok')this.message({serverContent:{inputTranscription:{text:'Уставшим'}}})
    }
  }
  close(){this.closed=true;this.readyState=3}
}
test('dedicated free project and synthetic-only acknowledgements; no default key',()=>{
  for(const key of Object.keys(env))assert.throws(()=>freeLiveKey({...env,[key]:undefined,GOOGLE_API_KEY:'fallback'}),/FREE_TEST_/)
  assert.equal(freeLiveKey(env),'fake-test')
})
test('dedicated streaming model with verbatim mode, manual VAD and RU EN ES',()=>{
  for(const [locale,lang] of [['ru','ru-RU'],['en','en-US'],['es','es-ES']]){
    const s=setupFrame(locale,{hints:true,vocabulary:true}).setup
    assert.equal(s.model,MODEL);assert.deepEqual(s.generationConfig.responseModalities,['TEXT'])
    assert.equal(s.inputAudioTranscription.mode,'VERBATIM')
    assert.deepEqual(s.inputAudioTranscription.languageCodes,[lang])
    assert.equal(s.realtimeInputConfig.automaticActivityDetection.disabled,true)
    assert.equal(Object.hasOwn(s,'systemInstruction'),false)
    assert.deepEqual(setupFrame(locale).setup.inputAudioTranscription.languageCodes,[])
  }
})
test('quota persists, blocks third start in a rolling minute and twenty-first in 24h',t=>{
  const dir=ledger(t),start=1760000000000
  for(let i=0;i<20;i++){
    const now=start+Math.floor(i/2)*61000
    reserveStart(pcm,{dir,now})
    if(i===1)assert.throws(()=>reserveStart(pcm,{dir,now}),/FREE_QUOTA_EXHAUSTED/)
  }
  assert.throws(()=>reserveStart(pcm,{dir,now:start+700000}),/FREE_QUOTA_EXHAUSTED/)
  assert.equal(JSON.parse(readFileSync(join(dir,'quota.json'),'utf8')).length,20)
  assert.throws(()=>initLedger(dir))
  assert.equal(reserveStart(pcm,{dir,now:start+86400001}).remainingDay,1)
})
test('corrupt ledger, clock rollback, concurrent reservation and oversize audio fail closed',t=>{
  const dir=ledger(t),now=1760000000000
  reserveStart(pcm,{dir,now})
  assert.throws(()=>reserveStart(pcm,{dir,now:now-1}),/QUOTA_LEDGER_INVALID/)
  writeFileSync(join(dir,'quota.lock'),'locked')
  assert.throws(()=>reserveStart(pcm,{dir,now}),/QUOTA_LOCK_UNAVAILABLE/)
  assert.throws(()=>reserveStart(Buffer.alloc(480002),{dir,now}),/INVALID_PCM/)
  const bad=ledger(t);writeFileSync(join(bad,'quota.json'),'broken')
  assert.throws(()=>reserveStart(pcm,{dir:bad,now}),/QUOTA_LEDGER_UNAVAILABLE/)
})
test('real wire framing, paced PCM, interim not committed, final without turnComplete',async t=>{
  const dir=ledger(t);let ws
  const result=await streamSyntheticPcm(pcm,'ru',{env,dir,pace:async()=>{},connect:url=>{
    assert.match(url,/^wss:\/\/generativelanguage\.googleapis\.com\//)
    ws=new FakeSocket();return ws
  }})
  assert.equal(result.text,'Уставшим');assert.equal(ws.closed,true)
  assert.deepEqual(ws.frames[1],{realtimeInput:{activityStart:{}}})
  assert.equal(ws.frames[2].realtimeInput.audio.mimeType,'audio/pcm;rate=16000')
  assert.equal(Buffer.from(ws.frames[2].realtimeInput.audio.data,'base64').length,3200)
  assert.deepEqual(ws.frames.at(-1),{realtimeInput:{activityEnd:{}}})
  assert.equal(ws.frames.length,5)
})
test('provider failure closes once, reserves quota and does not leak error or retry',async t=>{
  const dir=ledger(t);let calls=0,ws
  await assert.rejects(streamSyntheticPcm(pcm,'en',{env,dir,pace:async()=>{},connect:()=>{calls++;ws=new FakeSocket('error');return ws}}),/^Error: STT_PROVIDER_UNAVAILABLE$/)
  assert.equal(calls,1);assert.equal(ws.closed,true)
  assert.equal(JSON.parse(readFileSync(join(dir,'quota.json'),'utf8')).length,1)
})
test('silence/stalled final times out and closes; missing free permission never connects',async t=>{
  const dir=ledger(t);let calls=0,ws
  await assert.rejects(streamSyntheticPcm(pcm,'es',{env:{},dir,connect:()=>{calls++}}),/FREE_TEST_NOT_AUTHORIZED/)
  assert.equal(calls,0)
  await assert.rejects(streamSyntheticPcm(pcm,'es',{env,dir,pace:async()=>{},timeoutMs:20,connect:()=>{calls++;ws=new FakeSocket('stall');return ws}}),/STT_TIMEOUT/)
  assert.equal(calls,1);assert.equal(ws.closed,true)
})
test('no local models configured means no network fallback',()=>assert.equal(offlineWhisper(pcm,'ru',{}),null))
