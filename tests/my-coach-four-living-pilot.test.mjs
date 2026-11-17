import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,statSync} from 'node:fs'
import {
  COACH_PERSONAS,PUBLIC_COACH_PERSONA_IDS,PUBLIC_COACH_PERSONAS,PUBLIC_COACH_TOPICS,
  getCoachPersona,
} from '../lib/coaching/persona-registry.mjs'

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const root='../public/images/holistic-house/my-coach-motion/'
const states=['greeting','idle','listening','speaking']

test('pilot advertises exactly two female and two male coaches without deleting the historical registry',()=>{
  assert.deepEqual(PUBLIC_COACH_PERSONA_IDS.slice(0,4),['mira','max','sofia','alex'])
  assert.deepEqual(PUBLIC_COACH_PERSONAS.map(item=>item.id),PUBLIC_COACH_PERSONA_IDS)
  assert.ok(COACH_PERSONAS.length>=8)
  assert.ok(PUBLIC_COACH_PERSONA_IDS.every(id=>getCoachPersona(id)))
  assert.ok(PUBLIC_COACH_TOPICS.every(topic=>PUBLIC_COACH_PERSONAS.some(p=>p.topic===topic||p.related.includes(topic))))
  const catalog=source('components/my-coach-catalog.jsx')
  assert.match(catalog,/PUBLIC_COACH_PERSONAS\.filter\(persona =>/)
  assert.match(catalog,/PUBLIC_COACH_TOPICS\.map\(key =>/)
  assert.match(catalog,/PUBLIC_COACH_PERSONA_IDS\.includes\(id\)/)
  assert.match(catalog,/PUBLIC_COACH_PERSONA_IDS\.map\(id =>/)
  assert.doesNotMatch(catalog,/COACH_PERSONAS\.filter\(persona =>/)
  for(const id of ['lea','noah','iris','ray']){
    assert.ok(!PUBLIC_COACH_PERSONA_IDS.includes(id))
  }
})

test('every active coach has a silent playable local 24fps MP4 for each of four visual states',()=>{
  const hashes=new Set()
  for(const id of ['mira','max','sofia','alex']){
    for(const state of states){
      const f=new URL(root+id+'-'+state+'.mp4',import.meta.url)
      const bytes=readFileSync(f)
      assert.equal(bytes.subarray(4,8).toString('ascii'),'ftyp',id+'/'+state)
      assert.ok(bytes.includes(Buffer.from('moov')),id+'/'+state+' must be faststart')
      assert.ok(bytes.includes(Buffer.from('avc1')),id+'/'+state+' must have H264 video')
      assert.ok(!bytes.includes(Buffer.from('soun')),id+'/'+state+' must have no audio')
      assert.ok(statSync(f).size>10000&&statSync(f).size<180000,id+'/'+state+' must be mobile-light')
      hashes.add(`${id}-${state}`)
    }
  }
  assert.equal(hashes.size,16)
})

test('motion media uses a real static poster, existing silent MP4 and edge-only cues',()=>{
 const comp=source('components/my-coach-motion-media.jsx')
 const css=source('components/my-coach-motion-media.module.css')
 for(const value of ['IntersectionObserver','visibilitychange','prefers-reduced-motion: reduce',
  'video.play()','video.pause()','muted loop playsInline autoPlay',
  'data-coach-motion-scene={visualScene}','-still.webp'])
  assert.ok(comp.includes(value),value)
 assert.match(css,/\.media\[data-coach-motion-ready='true'\] \.video\{opacity:1\}/)
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/)
 assert.doesNotMatch(comp,/greeting-real-v3|fetch\(|navigator\.mediaDevices|speechSynthesis|localStorage|sessionStorage|canvas|getUserMedia/)
 assert.doesNotMatch(css,/mask-image:radial-gradient/)
})
test('live reply selects a scene without changing ASR, privacy gates or speech source',()=>{
 const catalog=source('components/my-coach-catalog.jsx')
 const live=source('components/my-coach-live-dialogue.jsx')
 const avatar=source('components/app/coaching-avatar.jsx')
 const css=source('components/my-coach-live-dialogue.module.css')
 assert.match(catalog,/<MyCoachMotionMedia personaId=\{selected\.id\} phase="greeting" context="hero"/)
 assert.match(catalog,/<MyCoachMotionMedia personaId=\{persona\.id\} phase="idle" context="card"/)
 assert.match(live,/selectCoachVisualScene\(\{phase:motionPhase,text:latestCoachText,stage:currentStage\}\)/)
 assert.match(live,/<MyCoachMotionMedia personaId=\{personaId\} phase=\{motionPhase\} context="session" scene=\{visualScene\}/)
 assert.match(avatar,/<MyCoachMotionMedia personaId=\{photoId\} phase=\{state\} context="avatar" scene=\{scene\}/)
 assert.doesNotMatch(avatar,/requestAnimationFrame|AudioContext|portraitMouthAperture|livingPortraitMouth|living\.webp/)
 assert.doesNotMatch(live,/setPortraitLevel|onVoiceLevel=\{setPortraitLevel\}/)
 assert.match(css,/sessionPortrait\[data-persona\]::after\{display:none!important;content:none!important/)
})
