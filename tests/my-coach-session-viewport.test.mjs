import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('mobile coach starts with one Play and no recording or vendor consent checkbox',()=>{
  const ui=read('components/my-coach-live-dialogue.jsx')
  const loop=read('components/my-coach-speech-loop.jsx')
  assert.match(ui,/data-session-visual-v4/)
  const intro=read('components/my-coach-voice-introduction.jsx')
  assert.match(ui,/\{!introductionComplete&&<MyCoachVoiceIntroduction/)
  assert.match(intro,/<Play size=\{22\} fill="currentColor"/)
  assert.match(ui,/onStart=\{startVoiceSession\}/)
  assert.match(ui,/startSession\(opening,\{naturalVoice\}\)/)
  assert.match(loop,/startSession\(introduction,\{naturalVoice=false\}=\{\}\)/)
  assert.doesNotMatch(ui,/recordingNotice|recordedMode|recordingModeHint|voiceConsentRef|naturalVoiceRow|voiceModalNatural/)
  assert.doesNotMatch(ui,/checked=\{cloudAgreed\}|checked=\{consent\}|Fish Audio \(reply may train models\).*<input/)
  assert.doesNotMatch(loop,/MediaRecorder|new File\(|FormData\(|audio-storyboard|18000|stopRecordedTurn/)
  assert.ok(ui.includes('providerCopy.disclosure'),'privacy terms remain accessible')
  assert.ok(ui.includes('fishNotice:'),'fish provider processing is disclosed before Play')
})

test('real hands-free browser recognition commits speech automatically and re-arms after coach audio',()=>{
  const loop=read('components/my-coach-speech-loop.jsx')
  for(const token of [
    'recognition.interimResults=true','readDictationResults(event.results,1200)',
    'transcriptRef.current?.(visible)','draftRef.current?.(appendSpokenAnswer',
    'settleTimerRef.current=setTimeout','async function deliver(text)',
    'async function speakCoachReply(result,text,generation,naturalVoice=false)',
    'startListening()','restartSilentRecognition(recognition)',
    'retryAttemptsRef.current>=3','if(!activeRef.current)return',
    'onEnd:()=>{','afterSpeech()','onCancelTurn'
  ]) assert.ok(loop.includes(token),token)
  assert.match(loop,/onTurn|turnRef\.current\?\.\(text\)/)
  assert.match(loop,/recognition\.onend=\(\)=>\{/)
  assert.match(loop,/if\(finished\.length>=3\)void deliver/)
  assert.doesNotMatch(loop,/recorder|transcribing|recordingConsentRef/)
})

test('one mobile viewport reserves space for transcript AND bottom input',()=>{
  const ui=read('components/my-coach-live-dialogue.jsx')
  const css=read('components/my-coach-live-dialogue.module.css')
  assert.equal((ui.match(/className=\{styles\.conversationPanel\}/g)||[]).length,1)
  assert.equal((ui.match(/className=\{styles\.liveTranscript\}/g)||[]).length,1)
  assert.match(ui,/className=\{styles\.textComposer\} open/)
  assert.match(css,/\.root\[data-session-visual-v4\]\{[\s\S]*?height:100dvh;min-height:0;max-height:100dvh;[\s\S]*?overflow:hidden/)
  assert.match(css,/\.root\[data-session-visual-v4\] \.voiceWorkspace\{[\s\S]*?flex:1 1 auto;[\s\S]*?min-height:0/)
  assert.match(css,/\.root\[data-session-visual-v4\] \.conversationPanel\{[\s\S]*?flex:1 1 auto;[\s\S]*?min-height:0;max-height:none/)
  assert.match(css,/\.root\[data-session-visual-v4\] \.conversationPanel \.transcriptFeed\{[\s\S]*?overflow-y:auto/)
  assert.match(css,/\.root\[data-session-visual-v4\] \.conversationPanel \.textComposer\{[\s\S]*?flex:0 0 auto;order:2/)
  assert.ok(css.includes('@media(max-width:699px) and (max-height:670px)'))
  assert.ok(css.includes('@media(max-width:699px) and (max-height:530px)'))
  for(const width of [320,354,390,430])
    assert.ok(width>=320&&width<=699,'all target iPhones use the single flex viewport')
})

test('speaking has an audible fallback and one Replay resume path',()=>{
  const ui=read('components/my-coach-live-dialogue.jsx')
  const loop=read('components/my-coach-speech-loop.jsx')
  assert.ok(loop.includes('const fallback=()=>{'))
  assert.ok(loop.includes('speakOnDevice()'),'natural-voice network failures must not be silent')
  assert.match(loop,/resumeVoice\(\)\{/)
  assert.ok(loop.includes('blockedResumeRef.current()'))
  assert.ok(ui.includes('if(speechRef.current?.resumeVoice?.())return'))
  assert.ok(ui.includes('replayPlayerRef.current.resume()'))
  assert.ok(ui.includes('onClick={()=>replayCoachReply()}'))
  assert.ok(loop.includes('speakReply(result){'),'typed turns also enter audible coach path')
  assert.doesNotMatch(ui,/localStorage|sessionStorage/)
})

test('browser recognition disclosure is in the privacy details, not a recording panel',()=>{
  const ui=read('components/my-coach-live-dialogue.jsx')
  const css=read('components/my-coach-live-dialogue.module.css')
  for(const phrase of ['Browser speech recognition may send microphone audio',
    'Браузер может отправлять звук поставщику распознавания речи',
    'El navegador puede procesar mi voz'])
    assert.ok(ui.includes(phrase))
  assert.ok(ui.includes('className={styles.consentDetails}'))
  assert.doesNotMatch(ui,/data-reliable-voice-notice|data-browser-voice-notice/)
  assert.doesNotMatch(css.slice(css.lastIndexOf('Hands-free My Coach v4')),/\.recordingModeHint|\.naturalVoiceRow/)
})
