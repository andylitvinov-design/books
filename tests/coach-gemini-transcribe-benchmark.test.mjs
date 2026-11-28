import test from 'node:test'
import assert from 'node:assert/strict'
import {geminiTranscribePayload,geminiTranscriptText,transcribeGeminiBenchmark} from '../lib/coaching/gemini-transcribe-benchmark.mjs'
const wav=Buffer.alloc(48);wav.write('RIFF',0);wav.write('WAVE',8)
test('verbatim, inline audio, no stored interaction, no reference or client context',()=>{
  const p=geminiTranscribePayload(wav,'ru')
  assert.equal(p.model,'gemini-3.5-transcribe');assert.equal(p.store,false)
  assert.deepEqual(p.generation_config.transcription_config,{mode:{type:'verbatim'},language_codes:[]})
  assert.equal(p.input.length,1);assert.equal(p.input[0].data,wav.toString('base64'))
  assert.equal(geminiTranscribePayload(wav,'es',{hints:true,vocabulary:true}).generation_config.transcription_config.language_codes[0],'es-ES')
  assert.throws(()=>geminiTranscribePayload(wav,'xx'))
})
test('only completed model output is accepted',()=>{
  const steps=[{type:'thought',content:[{type:'text',text:'hidden'}]},{type:'model_output',content:[{type:'text',text:'Уставшим'}]}]
  assert.equal(geminiTranscriptText({status:'completed',steps}),'Уставшим')
  assert.equal(geminiTranscriptText({status:'incomplete',steps}),null)
})
test('explicit free and synthetic approval required before network; no retry',async()=>{
  let calls=0
  const fetcher=async()=>{calls++;return {ok:false,status:429}}
  const env={HH_GEMINI_TRANSCRIBE_BENCHMARK_KEY:'mock',HH_GEMINI_TRANSCRIBE_FREE_BENCHMARK_CONFIRMED:'true'}
  await assert.rejects(transcribeGeminiBenchmark(wav,'ru',{env,fetcher}),/NOT_AUTHORIZED/)
  assert.equal(calls,0)
  await assert.rejects(transcribeGeminiBenchmark(wav,'ru',{env:{...env,HH_GEMINI_TRANSCRIBE_SYNTHETIC_DATA_ACK:'true'},fetcher}),/STT_QUOTA/)
  assert.equal(calls,1)
})
