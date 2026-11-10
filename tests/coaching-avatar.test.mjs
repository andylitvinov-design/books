import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {COACH_AVATAR_OPTIONS,coachingVisualAvatarId,normalizeAvatarSpeechEvent} from '../lib/personal-coaching/coaching-avatar-state.mjs'

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('coaching avatars are stable and localized',()=>{
 assert.deepEqual(COACH_AVATAR_OPTIONS.map(x=>x.id),['warm','clear','calm'])
 for(const option of COACH_AVATAR_OPTIONS)for(const locale of ['ru','en','es'])assert.ok(option.labels[locale])
 assert.equal(coachingVisualAvatarId('grow_v1'),'clear')
 assert.equal(coachingVisualAvatarId('somatic_relaxation'),'calm')
 assert.equal(coachingVisualAvatarId('unknown'),'warm')
})
test('voice events normalize to honest avatar states',()=>{
 assert.deepEqual(normalizeAvatarSpeechEvent({phase:'speaking',beat:5}),{phase:'speaking',beat:1})
 assert.deepEqual(normalizeAvatarSpeechEvent({phase:'paused',beat:-4}),{phase:'paused',beat:0})
 assert.deepEqual(normalizeAvatarSpeechEvent({phase:'speaking',beat:Number.POSITIVE_INFINITY}),{phase:'speaking',beat:0})
 assert.deepEqual(normalizeAvatarSpeechEvent({phase:'failed',beat:8}),{phase:'idle',beat:0})
})
test('speech avatar starts only on actual playback, returns to idle on interruption',()=>{
 const voice=source('components/app/coaching-question-voice.jsx')
 for(const event of ['onstart','onpause','onresume','onboundary','onend','onerror']){
  assert.match(voice,new RegExp('item\\.'+event+'='))
 }
 assert.match(voice,/if\(utterance\.current!==item\)return/)
 assert.match(voice,/onSpeechChange/)
 assert.match(voice,/emitSpeech\('idle'\)/)
})
test('both private coaching turn types have avatar and speech callbacks',()=>{
 const player=source('components/app/personal-coaching.jsx')
 const avatar=source('components/app/coaching-avatar.jsx')
 const css=source('components/app/coaching-avatar.module.css')
 const layout=source('components/app/personal-coaching.module.css')
 assert.equal((player.match(/<CoachingAvatar /g)||[]).length,2)
 assert.equal((player.match(/onSpeechChange=\{updateAvatarSpeech\}/g)||[]).length,2)
 assert.match(player,/data-coaching-avatar-ready/)
 assert.match(avatar,/data-coach-avatar/)
 assert.match(avatar,/onAvatarChange\?\.\(/)
 assert.match(avatar,/aria-live="polite"/)
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/)
 assert.match(layout,/data-coaching-avatar-ready/)
})
