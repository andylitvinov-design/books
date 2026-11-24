import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('home primary microphone uses the shared manual MediaRecorder dictation flow',()=>{
 const home=read('components/home-dialogue-entry.tsx')
 const note=read('components/app/messenger-voice-note.tsx')
 const css=read('components/home-dialogue-entry.module.css')
 assert.match(home,/variant="dictation" micMarker="data-home-intent-mic"/)
 assert.match(home,/onBegin=\{\(\)=>stopAliPersonaAudio\(\)\}/)
 assert.match(note,/getUserMedia/)
 assert.match(note,/new MediaRecorder\(/)
 assert.match(note,/stop\(true\)/)
 assert.match(note,/if \(dictation && confirmed && recording\.size>0/)
 assert.match(note,/sendAfterStop\.current=false/)
 assert.match(note,/body\.append\("locale",dictation\?"auto":locale\)/)
 assert.match(note,/body\.append\("output","text"\)/)
 assert.match(home,/data-home-voice-disclosure/)
 assert.match(css,/\.speechDisclosure/)
 assert.doesNotMatch(home,/SpeechRecognition|startCoachRecordedTurn|type="checkbox"/)
})
test('home voice transcript stays editable and requires explicit send',()=>{
 const home=read('components/home-dialogue-entry.tsx')
 const note=read('components/app/messenger-voice-note.tsx')
 assert.match(home,/onSendTranscript=\{text=>\{setDraft\(previous=>/)
 assert.match(home,/startConversationWith\(draft\)/)
 assert.match(home,/event\.currentTarget\.querySelector\("\[data-hh-dictation-active\]"\)/)
 assert.match(note,/onClick=\{discard\}/)
 assert.match(note,/abortRef\.current\?\.abort\(\)/)
 assert.match(note,/stopTracks\(streamRef\.current\)/)
 assert.match(note,/generationRef\.current/)
 assert.doesNotMatch(note,/localStorage|sessionStorage|navigator\.sendBeacon/)
})
