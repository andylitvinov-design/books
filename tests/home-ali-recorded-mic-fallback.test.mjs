import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('home microphone selects ephemeral STT fallback on iOS 27 or missing Web Speech',()=>{
 const home=read('components/home-dialogue-entry.tsx')
 const css=read('components/home-dialogue-entry.module.css')
 assert.match(home,/ios27NeedsSpeechRecovery\(window\.navigator\)/)
 assert.match(home,/coachRecordedSupported\(window\)/)
 assert.match(home,/startCoachRecordedTurn\(\{/)
 assert.match(home,/purpose:"public"/)
 assert.match(home,/recordedRef\.current\?\.cancel\(\)/)
 assert.match(home,/speechRef\.current\?\.abort\(\)/)
 assert.match(home,/onFailure:code=>/)
 assert.match(home,/data-home-intent-mic/)
 assert.match(home,/data-home-voice-disclosure/)
 assert.match(css,/\.speechDisclosure/)
 assert.doesNotMatch(home,/type="checkbox"/)
})
test('home voice transcript stays editable and requires an explicit send click',()=>{
 const home=read('components/home-dialogue-entry.tsx')
 assert.match(home,/onResult:text=>\{/)
 assert.match(home,/setDraft\(previous=>/)
 assert.match(home,/speech\.onresult=event=>/)
 assert.match(home,/setPreferRecorder\(true\)/)
 assert.match(home,/voiceAttempt\.current\+=1/)
 assert.match(home,/startConversationWith\(draft\)/)
})
