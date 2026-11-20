import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {firstCoachEarlySentence,approveCoachEarlySentence} from '../lib/coaching/coach-early-speech.mjs'
import {readCoachTurnStream} from '../lib/coaching/coach-stream-client.mjs'
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('early Groq voice requires a complete short sentence',()=>{
  assert.equal(firstCoachEarlySentence('Мне понятно ваше желание'),'')
  assert.equal(firstCoachEarlySentence('Я слышу, насколько это важно для вас. Что вы уже пробовали?'),
    'Я слышу, насколько это важно для вас.')
  assert.equal(firstCoachEarlySentence('Слишком коротко.'),'')
  assert.equal(firstCoachEarlySentence('Это плохая\nстрока для голоса. Следом'),'')
  assert.equal(firstCoachEarlySentence('Промпт с \x60кодом\x60 не озвучиваем. Следом'),'')
})
test('Director can approve, rewrite or veto an early phrase without another model call',()=>{
  let parsed=0,guarded=0
  const args={
    draft:'Я слышу, насколько это важно для вас. Что вы уже пробовали?',
    input:{message:'Это важно для меня.'},directive:{methodId:'grow',stage:'reality'},
    parseReply:raw=>{parsed++;return {mode:'ai',message:JSON.parse(raw).message}},
    enforceDirective:value=>{guarded++;return value}
  }
  assert.equal(approveCoachEarlySentence(args),'Я слышу, насколько это важно для вас.')
  assert.equal(parsed,1);assert.equal(guarded,1)
  assert.equal(approveCoachEarlySentence({...args,enforceDirective:()=>({mode:'ai',message:'Другая фраза.'})}),'')
  assert.equal(approveCoachEarlySentence({...args,parseReply:()=>{throw Error('unsafe')}}),'')
})
const sse=blocks=>new Response(new TextEncoder().encode(blocks.map(x=>'data: '+JSON.stringify(x)+'\n\n').join('')),{
  headers:{'Content-Type':'text/event-stream; charset=utf-8'}
})
test('browser receives approved phrase before final reviewed result',async()=>{
  const approved='Я слышу, насколько это важно для вас.'
  const preview=[];const phrases=[]
  const response=sse([
    {type:'delta',value:approved+' '},
    {type:'approved_phrase',value:approved},
    {type:'delta',value:'Что вы уже пробовали?'},
    {type:'result',result:{mode:'ai',message:approved+' Что вы уже пробовали?',approvedSpokenPrefix:approved}}
  ])
  const result=await readCoachTurnStream(response,{
    onPreview:value=>preview.push(value),onApprovedPhrase:value=>phrases.push(value)
  })
  assert.deepEqual(phrases,[approved])
  assert.equal(result.approvedSpokenPrefix,approved)
  assert.equal(preview.at(-1),'')
})
test('malformed or duplicate early events cannot start speech',async()=>{
  const phrase='Я слышу, насколько это важно для вас.'
  for(const frames of [
    [{type:'approved_phrase',value:phrase},{type:'result',result:{mode:'ai'}}],
    [{type:'delta',value:phrase+' '},{type:'approved_phrase',value:phrase},{type:'approved_phrase',value:phrase}],
    [{type:'delta',value:phrase+' '},{type:'approved_phrase',value:phrase},
      {type:'result',result:{mode:'ai',approvedSpokenPrefix:'другая'}}]
  ])await assert.rejects(readCoachTurnStream(sse(frames)),{message:'COACH_STREAM_INVALID'})
})
test('early voice remains Director-gated, interruptible, and preserves existing voices',()=>{
  const brain=src('lib/app/coaching-brain.js')
  const voice=src('components/my-coach-speech-loop.jsx')
  const ui=src('components/my-coach-live-dialogue.jsx')
  assert.match(brain,/approveCoachEarlySentence/)
  assert.match(brain,/enforceDirective:enforceCoachSessionDirective/)
  assert.match(brain,/approvedSpokenPrefix:trustedPrefix/)
  assert.match(voice,/earlySpeechRef\.current=null/)
  assert.match(voice,/onApprovedPhrase:\(phrase,locale\)=>offerEarlyPhrase/)
  assert.match(voice,/cancelRef\.current\?\.\(\)/)
  assert.match(voice,/gemini_tts_free/)
  assert.match(ui,/onApprovedPhrase:spoken\?\.onApprovedPhrase/)
  assert.match(ui,/result\.approvedSpokenPrefix/)
})
