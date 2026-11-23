import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {samirMotionTake,samirMotionFilename,samirMotionPath} from '../lib/coaching/samir-motion.mjs'
import {selectCoachVisualScene} from '../lib/coaching/coach-visual-cues.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url))
const source=path=>read(path).toString('utf8')
const root='public/images/holistic-house/my-coach-motion/'

test('approved third Samir MP4 is an actual first-party silent H264 file',()=>{
  const video=read(root+'genie-natural-encourage-v2.mp4')
  assert.equal(video.toString('ascii',4,8),'ftyp')
  assert.ok(video.includes(Buffer.from('moov')))
  assert.ok(video.includes(Buffer.from('avc1')))
  assert.equal(video.includes(Buffer.from('soun')),false,'must not contain audio')
  assert.ok(video.length>30000&&video.length<4000000)
  const poster=read(root+'genie-calm-loop-poster.webp')
  assert.equal(poster.toString('ascii',0,4),'RIFF')
  assert.equal(poster.toString('ascii',8,12),'WEBP')
  // Keep old approved loop only for backwards compatibility / still fallback.
  assert.equal(read(root+'genie-calm-loop-v1.gif').toString('ascii',0,6),'GIF89a')
})

test('Samir's only three visual reactions follow actual voice phase and reviewed scene',()=>{
  for(const phase of ['idle','greeting','loading','paused','speaking']){
    assert.equal(samirMotionTake(phase,'calm'),'idle')
  }
  assert.equal(samirMotionTake('listening','action'),'listening','real microphone overrides encouragement')
  assert.equal(samirMotionTake('thinking','encourage'),'listening')
  assert.equal(samirMotionTake('speaking','empathy'),'idle','never cheer over distress')
  assert.equal(samirMotionTake('speaking','curiosity'),'idle')
  for(const scene of ['encourage','action','insight','closure']){
    assert.equal(samirMotionTake('speaking',scene),'encourage')
  }
  for(const text of ['A small next step could help.','You managed this!','Что вы могли бы сделать в следующий шаг?']){
    const scene=selectCoachVisualScene({phase:'speaking',text,stage:'action'})
    assert.equal(samirMotionTake('speaking',scene),'encourage')
  }
  const distress=selectCoachVisualScene({phase:'speaking',text:'This is painful; I am sorry.',stage:'action'})
  assert.equal(distress,'empathy')
  assert.equal(samirMotionTake('speaking',distress),'idle')
  assert.equal(samirMotionFilename('idle'),'genie-natural-idle-v1.mp4')
  assert.equal(samirMotionFilename('listening'),'genie-natural-listening-v1.mp4')
  assert.equal(samirMotionFilename('encourage'),'genie-natural-encourage-v2.mp4')
  assert.equal(samirMotionFilename('talking'),null)
  assert.equal(samirMotionPath('encourage'),'/images/holistic-house/my-coach-motion/genie-natural-encourage-v2.mp4')
})

test('shared selected hero, live session and large avatar follow Samir's 3-state player',()=>{
  const motion=source('components/my-coach-motion-media.jsx')
  const layers=source('components/samir-motion-videos.jsx')
  const catalog=source('components/my-coach-catalog.jsx')
  const profile=source('components/my-coach-compact-profile.jsx')
  const session=source('components/my-coach-live-dialogue.jsx')
  const avatar=source('components/app/coaching-avatar.jsx')
  const css=source('components/my-coach-motion-media.module.css')
  assert.match(motion,/VIDEO_PERSONAS=new Set\(\[[^\]]*'genie'/)
  assert.match(motion,/samirMotionTake\(state,visualScene\)/)
  assert.match(motion,/<SamirMotionVideos take=\{samirTake\}/)
  assert.match(motion,/const shouldPlay=supported&&hasVideo&&motionAllowed&&inViewport&&pageVisible/)
  assert.match(motion,/prefers-reduced-motion: reduce/)
  assert.match(layers,/muted playsInline loop/)
  assert.match(layers,/onPlaying=/)
  assert.match(layers,/samirMotionPath\(name\)/)
  assert.match(css,/\.samirLayer\[data-samir-visible='true'\]/)
  assert.match(catalog,/phase="greeting" context="hero"/)
  assert.match(catalog,/genie-calm-loop-poster\.webp/)
  assert.match(profile,/genie-calm-loop-poster\.webp/)
  assert.match(session,/voiceState\.phase==='thinking'\|\|busy/)
  assert.match(session,/<MyCoachMotionMedia personaId=\{personaId\}/)
  assert.match(avatar,/\['mira','max','sofia','alex','merlin','harry','genie'\]/)
  assert.doesNotMatch(layers,/heygen\.ai|fetch\(|AudioContext|speechSynthesis|lipSync/)
})

test('same guarded prebuild prepares two previously completed originals, not new generations',()=>{
  const original=source('scripts/prepare-my-coach-natural-mp4.mjs')
  const samir=source('scripts/prepare-samir-motion-mp4.mjs')
  const pkg=JSON.parse(source('package.json'))
  assert.match(pkg.scripts.prebuild,/prepare-my-coach-natural-mp4\.mjs/)
  assert.match(original,/await import\('\.\/prepare-samir-motion-mp4\.mjs'\)/)
  assert.match(samir,/VERCEL_ENV==='production'/)
  assert.match(samir,/HH_SAMIR_MOTION/)
  assert.match(samir,/-an/)
  assert.match(samir,/b984e6733fa94bcf9b13713cd1a88676/)
  assert.match(samir,/344cf059da0149dda3e9d68f65d4e185/)
  assert.doesNotMatch(samir,/generate|createVideo|textToVideo|imageToVideo/i)
})
