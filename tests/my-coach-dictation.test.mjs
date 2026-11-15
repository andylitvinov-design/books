import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {detectedSpeechLocale,chooseDictationLanguage,readDictationResults,ios27NeedsSpeechRecovery} from '../lib/personal-coaching/my-coach-dictation.mjs'
import {appendSpokenAnswer} from '../lib/personal-coaching/speech-text.js'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('Auto follows device language and remembered transcript; manual RU/EN override works',()=>{
 assert.equal(chooseDictationLanguage({locale:'en',browserLanguages:['ru-RU','en-CA']}),'ru-RU')
 assert.equal(chooseDictationLanguage({locale:'ru',browserLanguages:['en-US','ru-RU']}),'en-GB')
 assert.equal(chooseDictationLanguage({locale:'en',browserLanguages:['en-US'],lastTranscript:'Я хочу поговорить'}),'ru-RU')
 assert.equal(chooseDictationLanguage({locale:'ru',browserLanguages:['ru-RU'],lastTranscript:'I want to talk'}),'en-GB')
 assert.equal(chooseDictationLanguage({locale:'en',selection:'ru',browserLanguages:['en-US']}),'ru-RU')
 assert.equal(chooseDictationLanguage({locale:'ru',selection:'en',browserLanguages:['ru-RU']}),'en-GB')
 assert.equal(chooseDictationLanguage({locale:'es'}),'es-ES')
})
test('One shared coaching Brain gets text detected as Russian or English',()=>{
 assert.equal(detectedSpeechLocale('Мне тревожно','en'),'ru')
 assert.equal(detectedSpeechLocale('I feel anxious','ru'),'en')
 assert.equal(detectedSpeechLocale('¿Qué pasa?','en'),'es')
 assert.equal(detectedSpeechLocale('…','ru'),'ru')
})
test('Safari partial and final speech is visible and appendable in editable draft',()=>{
 const interim=readDictationResults([{isFinal:false,0:{transcript:'Мне важно'}}])
 assert.deepEqual(interim,{final:'',interim:'Мне важно',visible:'Мне важно'})
 const mixed=readDictationResults([{isFinal:true,0:{transcript:'Мне важно'}},{isFinal:false,0:{transcript:'сегодня поговорить'}}])
 assert.deepEqual(mixed,{final:'Мне важно',interim:'сегодня поговорить',visible:'Мне важно сегодня поговорить'})
 assert.equal(appendSpokenAnswer('Мне важно','сегодня поговорить',1200),'Мне важно сегодня поговорить')
 assert.equal(readDictationResults([{isFinal:true,0:{transcript:'  Hi  '}}]).final,'Hi')
})

test('the live microphone displays interim words in transcript only',()=>{
  const loop=source('components/my-coach-speech-loop.jsx')
  const ui=source('components/my-coach-live-dialogue.jsx')
  for(const marker of [
    'readDictationResults(event.results,1200)',
    "changePhase('starting')",
    "recognition.onresult=event=>{",
    "recognition.interimResults=true",
    'transcriptRef.current?.(visible)',
    'lastHeardRef.current=finished',
    "event.error==='network'",
  ])assert.ok(loop.includes(marker),marker)
  assert.ok(ui.includes('onTranscript={setSpeechPreview}'))
  assert.ok(ui.includes('initialDraft={draft}'))
  assert.ok(ui.includes('speechLocale={speechLocale}'))
  assert.ok(ui.includes('locale:responseLocale,consent:true,message'))
  assert.ok(!loop.includes('MediaRecorder'))
  assert.ok(!loop.includes('audio-storyboard'))
  assert.ok(!loop.includes('sendBeacon'))
  assert.ok(!loop.includes('sessionStorage'))
})

test('iOS 27 recognizer recovery retains locale detection and re-primes after replies',()=>{
  const ios27={userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 Version/27.2 Mobile/15E148 Safari/604.1'}
  assert.equal(ios27NeedsSpeechRecovery(ios27),true)
  assert.equal(ios27NeedsSpeechRecovery({userAgent:ios27.userAgent.replace('Version/27.2','Version/26.6')}),false)
  assert.equal(ios27NeedsSpeechRecovery({userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X) Version/27.2 Safari/605.1.15',platform:'MacIntel',maxTouchPoints:0}),false)
  assert.equal(ios27NeedsSpeechRecovery({userAgent:'Mozilla/5.0 (iPhone) CriOS/156.0 Mobile Safari/604.1'}),false)
  const loop=source('components/my-coach-speech-loop.jsx')
  for(const marker of ['ios27NeedsSpeechRecovery(window.navigator)',
    'hasRecognizedRef.current','cue.onend=finishCue',
    'cue.onerror=finishCue','recognition.continuous=false',
    'restartSilentRecognition(recognition)','settleTimerRef.current=setTimeout',
    'void deliver(appendSpokenAnswer(draftAtStartRef.current,heard,1200))',
    'iosResultTimerRef.current=setTimeout'])
    assert.ok(loop.includes(marker),marker)
})

test('a repeated user turn restarts recognition without any record/stop/transcribe tap',()=>{
  const loop=source('components/my-coach-speech-loop.jsx')
  const start=loop.slice(loop.indexOf('function startListening(){'),loop.indexOf('async function deliver(text){'))
  assert.ok(start.includes('recognition.onresult=event=>{'))
  assert.ok(start.includes('recognition.onend=()=>{'))
  assert.ok(start.includes('restartSilentRecognitionAfterEnd()'))
  assert.ok(start.includes('settleTimerRef.current=setTimeout'))
  assert.ok(start.includes('void deliver(appendSpokenAnswer'))
  assert.ok(loop.includes('const afterSpeech=()=>{'))
  assert.ok(loop.includes('startListening()'))
  assert.ok(loop.includes('retryAttemptsRef.current>=3'))
  assert.ok(!loop.includes('stopRecordedTurn'))
  assert.ok(!loop.includes('recorder.start'))
  assert.ok(!loop.includes('MediaRecorder'))
  for(const phrase of ['Как ты себя чувствуешь','Мне спокойнее','Я хочу продолжить разговор']){
    const result=readDictationResults([{isFinal:false,0:{transcript:phrase}}])
    assert.equal(result.visible,phrase)
    assert.equal(appendSpokenAnswer('',result.visible,1200),phrase)
  }
})

test('recorded-audio uploads and extra consent gates are removed only from My Coach',()=>{
  const loop=source('components/my-coach-speech-loop.jsx')
  const ui=source('components/my-coach-live-dialogue.jsx')
  const route=source('app/api/app/my-coach/voice/synthesize/route.js')
  assert.ok(!loop.includes('MediaRecorder'))
  assert.ok(!loop.includes('new File('))
  assert.ok(!loop.includes('FormData'))
  assert.ok(!loop.includes("fetch('/api/holistic-support/audio-storyboard'"))
  assert.ok(!ui.includes('recordingModeHint'))
  assert.ok(!ui.includes('checked={cloudAgreed}'))
  assert.ok(!ui.includes('<dialog'))
  assert.ok(ui.includes('onSessionStart={()=>setCloudAgreed(true)}'))
  assert.ok(ui.includes('voiceProviderDetails'))
  assert.ok(route.includes('normalizeMyCoachFishRequest'))
  assert.ok(route.includes('normalizeGoogleChirpInput'))
  assert.ok(!loop.includes('localStorage'))
})

test('Safari fragment watchdog and silence settle commit once automatically',()=>{
  const loop=source('components/my-coach-speech-loop.jsx')
  const handler=loop.slice(loop.indexOf('recognition.onresult=event=>{'),loop.indexOf('recognition.onerror=event=>{'))
  assert.ok(handler.includes('iosResultTimerRef.current=setTimeout'))
  assert.ok(handler.includes('settleTimerRef.current=setTimeout'))
  assert.ok(handler.includes('recognition.onend=null'))
  assert.ok(handler.includes('lastHeardRef.current=heard'))
  assert.ok(handler.includes('void deliver(appendSpokenAnswer'))
  assert.ok(!handler.includes('changePhase(\'stalled\')'))
})


test('iOS 27 keeps recognized Safari voice sessions alive until natural onend',()=>{
 const loop=source('components/my-coach-speech-loop.jsx')
 const onresult=loop.slice(loop.indexOf('recognition.onresult=event=>{'),loop.indexOf('recognition.onerror=event=>{'))
 const iosFallback=onresult.slice(onresult.indexOf('if(ios27&&visible){'),onresult.indexOf('// Dictation is shown'))
 assert.match(iosFallback,/draftRef\.current\?\.\(appendSpokenAnswer\(draftAtStartRef\.current,heard,1200\)\)/)
 assert.match(iosFallback,/transcriptRef\.current\?\.\(''\)/)
 assert.match(iosFallback,/setNotice\(t\.iosAwaitEnd\)/)
 assert.doesNotMatch(iosFallback,/recognition\.abort\(\)|void deliver\(/,'never cut recognized iOS voice or auto-send before natural end')
 const settle=onresult.slice(onresult.indexOf('if(visible){'),onresult.length)
 assert.match(settle,/if\(!ios27\)\{[\s\S]*?settleTimerRef\.current=setTimeout\(/)
 assert.match(loop,/recognition\.continuous=false/)
 const naturalEnd=loop.slice(loop.indexOf('recognition.onend=()=>{'),loop.indexOf('const startRecognition=()=>{'))
 assert.match(naturalEnd,/void deliver\(appendSpokenAnswer\(draftAtStartRef\.current,recovered,1200\)\)/)
 assert.ok(loop.includes('cue.onend=finishCue'),'every subsequent Safari session still waits for the short recovery cue')
 for(const marker of ['iosAwaitEnd:',"setNotice(t.iosAwaitEnd)"])assert.ok(loop.includes(marker))
});
