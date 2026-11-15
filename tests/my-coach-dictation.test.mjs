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
test('real mic shows ongoing live words without creating a recorded file',()=>{
 const loop=source('components/my-coach-speech-loop.jsx')
 const ui=source('components/my-coach-live-dialogue.jsx')
 for(const token of ['readDictationResults(event.results,1200)','recognition.interimResults=true',
   'transcriptRef.current?.(visible)',
   'draftRef.current?.(appendSpokenAnswer(draftAtStartRef.current,visible,1200))',
   "changePhase('starting')",'lastHeardRef.current=finished',
   "event.error==='network'"])assert.ok(loop.includes(token),token)
 for(const token of ["onDraft={text=>{setDraft(text);setError('')}}",
   'speechLocale={speechLocale}','initialDraft={draft}','value={speechLocale}',
   'responseLocale=detectedSpeechLocale(message,lang)','locale:responseLocale,consent:true,message'])
   assert.ok(ui.includes(token),token)
 assert.doesNotMatch(loop,/MediaRecorder|FormData|new File\(|audio-storyboard|18000/)
 assert.doesNotMatch(ui,/recordedMode|recordingModeHint|recordingNotice/)
 assert.doesNotMatch(loop,/sendBeacon|localStorage|sessionStorage/)
})

test('iOS 27 recognition is repaired by bounded automatic re-arm, never a second tap',()=>{
 const ios27={userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 Version/27.2 Mobile/15E148 Safari/604.1'}
 assert.equal(ios27NeedsSpeechRecovery(ios27),true)
 assert.equal(ios27NeedsSpeechRecovery({userAgent:ios27.userAgent.replace('Version/27.2','Version/26.6')}),false)
 assert.equal(ios27NeedsSpeechRecovery({userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X) Version/27.2 Safari/605.1.15',platform:'MacIntel',maxTouchPoints:0}),false)
 const loop=source('components/my-coach-speech-loop.jsx')
 for(const part of ['ios27NeedsSpeechRecovery(window.navigator)','cue.onend=finishCue',
   'cue.onerror=finishCue','hasRecognizedRef.current','retryAttemptsRef.current>=3',
   'restartSilentRecognition(recognition)','startListening()',
   'retryTimerRef.current=setTimeout','iosResultTimerRef.current=setTimeout'])
   assert.ok(loop.includes(part),part)
 assert.doesNotMatch(loop,/startRecordedTurn|recordingConsentRef|stopRecordedTurn/)
})

test('Safari interim-only answers finalize once after silence, even without onend',()=>{
 const loop=source('components/my-coach-speech-loop.jsx')
 const result=loop.slice(loop.indexOf('recognition.onresult=event=>{'),loop.indexOf('recognition.onerror=event=>{'))
 assert.match(result,/settleTimerRef\.current=setTimeout\(\(\)=>\{/)
 assert.match(result,/final\?1700:2300/)
 assert.match(result,/lastHeardRef\.current=heard/)
 assert.match(result,/void deliver\(appendSpokenAnswer\(draftAtStartRef\.current,heard,1200\)\)/)
 assert.match(result,/recognition\.onend=null/)
 const onend=loop.slice(loop.indexOf('    recognition.onend=()=>{'),loop.indexOf('    const startRecognition='))
 assert.match(onend,/if\(finished\.length>=3\)void deliver/)
 assert.match(onend,/if\(recovered\.length>=3\)/)
 for(const phrase of ['Как ты себя чувствуешь','Мне спокойнее','Я хочу продолжить разговор']){
   const recognized=readDictationResults([{isFinal:false,0:{transcript:phrase}}])
   assert.equal(appendSpokenAnswer('',recognized.visible,1200),phrase)
 }
})

test('Play intro and every subsequent reply use the same non-recording voice cycle',()=>{
 const loop=source('components/my-coach-speech-loop.jsx')
 const ui=source('components/my-coach-live-dialogue.jsx')
 assert.match(ui,/startSession\(opening,\{naturalVoice\}\)/)
 assert.match(loop,/startSession\(introduction,\{naturalVoice=false\}=\{\}\)/)
 assert.match(loop,/void speakCoachReply\(\{reply:String\(introduction\|\|'\'\)/)
 assert.match(loop,/async function speakCoachReply\(result,text,generation,naturalVoice=false\)/)
 assert.match(loop,/function startListening\(\)/)
 assert.match(loop,/function afterSpeech|const afterSpeech=\(\)=>\{/)
 assert.match(loop,/onEnd:\(\)=>\{/)
 assert.match(loop,/speakReply\(result\)\{/)
 assert.doesNotMatch(loop,/fetch\('\/api\/holistic-support\/audio-storyboard'/)
})
