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

test('pilot advertises two female and three male coaches while retaining historical registry',()=>{
  assert.deepEqual(PUBLIC_COACH_PERSONA_IDS,['mira','max','sofia','alex','merlin'])
  assert.deepEqual(PUBLIC_COACH_PERSONAS.map(item=>item.id),PUBLIC_COACH_PERSONA_IDS)
  assert.equal(COACH_PERSONAS.length,9)
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
  for(const id of PUBLIC_COACH_PERSONA_IDS){
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

test('new Merlin poster exists and does not request missing 24fps videos',()=>{
 const poster=readFileSync(new URL(root+'merlin-still.webp',import.meta.url))
 assert.equal(poster.subarray(0,4).toString(),'RIFF')
 assert.equal(poster.subarray(8,12).toString(),'WEBP')
 const motion=source('components/my-coach-motion-media.jsx')
 assert.ok(motion.includes("personaId!=='merlin'"))
 assert.ok(motion.includes("const src=hasMotion?"))
 const intro=source('lib/personal-coaching/direct-coach-intro-audio.mjs')
 const api=source('app/api/coaching/intro/[locale]/[coach]/route.js')
 assert.match(intro,/alex\|merlin\|lea/)
 assert.match(api,/alex\|merlin\|lea/)
})

test('motion player is silent, visibility-gated, reduced-motion safe and never calls a provider',()=>{
  const comp=source('components/my-coach-motion-media.jsx')
  const css=source('components/my-coach-motion-media.module.css')
  for(const value of ['IntersectionObserver','visibilitychange','prefers-reduced-motion: reduce',
    'video.play()','video.pause()','playsInline autoPlay','muted loop','onError',
    'data-coach-motion-state={state}','-still.webp',"+'-'+state+'.mp4'"])
    assert.ok(comp.includes(value),value)
  assert.match(css,/\.media\[data-coach-motion-ready='true'\] \.video\{opacity:1\}/)
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/)
  assert.doesNotMatch(comp, /fetch\(|navigator\.mediaDevices|speechSynthesis|localStorage|sessionStorage/)
})

test('catalog and dialogue reuse one face and real voice phase instead of jerky 6-frame WebP',()=>{
  const catalog=source('components/my-coach-catalog.jsx')
  const live=source('components/my-coach-live-dialogue.jsx')
  const avatar=source('components/app/coaching-avatar.jsx')
  const css=source('components/my-coach-live-dialogue.module.css')
  assert.match(catalog,/<MyCoachMotionMedia personaId=\{selected\.id\} phase="greeting" context="hero"/)
  assert.match(catalog,/<MyCoachMotionMedia personaId=\{persona\.id\} phase="idle" context="card"/)
  assert.match(catalog,/src=\{`\/images\/holistic-house\/my-coach-motion\/\$\{id\}-still\.webp`\}/)
  assert.match(live,/<MyCoachMotionMedia personaId=\{personaId\} phase=\{motionPhase\} context="session"/)
  assert.match(live,/voiceState\.phase==='speaking'\?'speaking'/)
  assert.match(live,/voiceState\.phase==='listening'\?'listening'/)
  assert.match(avatar,/<MyCoachMotionMedia personaId=\{photoId\} phase=\{state\} context="avatar"/)
  assert.match(css,/data-coach-motion-video='true'\]::after\{display:none!important\}/)
  assert.ok(live.includes('data-voice-phase={voiceState.phase}'))
})