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
test('Mic shows real listening state and writes interim results to the actual form',()=>{
 const loop=source('components/my-coach-speech-loop.jsx')
 const ui=source('components/my-coach-live-dialogue.jsx')
 for(const s of ['readDictationResults(event.results,1200)','draftRef.current?.(appendSpokenAnswer(draftAtStartRef.current,visible,1200))','recognition.onstart=',"changePhase('starting')",'lastHeardRef.current=finished',"event.error==='network'"])assert.ok(loop.includes(s),s)
 for(const s of ["onDraft={text=>{setDraft(text);setError('')}}",'speechLocale={speechLocale}','initialDraft={draft}','value={speechLocale}','responseLocale=detectedSpeechLocale(message,lang)','locale:responseLocale,consent:true,message'])assert.ok(ui.includes(s),s)
 assert.doesNotMatch(loop,/new MediaRecorder|sendBeacon|localStorage|sessionStorage/)
})

test('iOS 27 Safari recovery targets only affected WebKit and preserves RU/EN conversation',()=>{
 const ios27={userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 Version/27.2 Mobile/15E148 Safari/604.1'}
 assert.equal(ios27NeedsSpeechRecovery(ios27),true)
 assert.equal(ios27NeedsSpeechRecovery({userAgent:ios27.userAgent.replace('Version/27.2','Version/26.6')}),false)
 assert.equal(ios27NeedsSpeechRecovery({userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X) Version/27.2 Safari/605.1.15',platform:'MacIntel',maxTouchPoints:0}),false)
 assert.equal(ios27NeedsSpeechRecovery({userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X) Version/27.2 Safari/605.1.15',platform:'MacIntel',maxTouchPoints:5}),true)
 assert.equal(ios27NeedsSpeechRecovery({userAgent:'Mozilla/5.0 (iPhone) CriOS/156.0 Mobile Safari/604.1'}),false)
 const sourceCode=source('components/my-coach-speech-loop.jsx')
 for(const part of ['if(!ios27)try{recognition.stop()}catch{}','ios27NeedsSpeechRecovery(window.navigator)',
   'cue.onend=finishCue','cue.onerror=finishCue','iosCueSatisfiedRef.current',
   'hasRecognizedRef.current','iosResultTimerRef.current=setTimeout',
   'draftRef.current?.(appendSpokenAnswer(draftAtStartRef.current,visible,1200))'])
   assert.ok(sourceCode.includes(part),part)
 assert.doesNotMatch(sourceCode,/MediaRecorder|sendBeacon|localStorage|sessionStorage/)
})


test('iOS 27 repeat-turn recovery always primes every following recognition, including after Fish playback',()=>{
 const code=source('components/my-coach-speech-loop.jsx')
 const start=code.slice(code.indexOf('function startListening(){'),code.indexOf('async function deliver(text){'))
 assert.match(start,/if\(ios27&&hasRecognizedRef\.current&&/,'cue required for every iOS 27 subsequent session')
 assert.doesNotMatch(start,/!cueAlreadyPlayed/,'prior TTS cannot skip the next cue')
 assert.match(start,/cue\.onend=finishCue/)
 assert.match(start,/recognition\.continuous=false/)
 assert.match(start,/if\(!ios27\)try\{recognition\.stop\(\)\}catch\{\}/)
 assert.match(start,/if\(recovered\.length>=3\)\{[\s\S]*?void deliver\(appendSpokenAnswer\(draftAtStartRef\.current,recovered,1200\)\)/)
 assert.match(start,/changePhase\('stalled'\)/)
 assert.match(code,/if\(phaseRef\.current==='stalled'\)\{/)
 assert.match(code,/retryMic:t\.retryMic:active\?t\.stop:t\.start/)
 assert.match(code,/iosResultTimerRef\.current=setTimeout/)
 assert.doesNotMatch(code,/new MediaRecorder|new WebSocket|localStorage|sessionStorage/)
 for(const phrase of ['Как ты себя чувствуешь','Мне спокойнее','Я хочу продолжить разговор']){
   const result=readDictationResults([{isFinal:false,0:{transcript:phrase}}])
   assert.equal(result.visible,phrase)
   assert.equal(appendSpokenAnswer('',result.visible,1200),phrase)
 }
})
