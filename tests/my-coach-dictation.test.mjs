import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {detectedSpeechLocale,chooseDictationLanguage,readDictationResults} from '../lib/personal-coaching/my-coach-dictation.mjs'
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
