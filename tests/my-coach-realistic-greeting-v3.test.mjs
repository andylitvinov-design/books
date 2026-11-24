import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync,statSync} from 'node:fs'
import {PUBLIC_COACH_PERSONA_IDS,COACH_PERSONAS} from '../lib/coaching/persona-registry.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url))
const src=path=>read(path).toString('utf8')
const base='public/images/holistic-house/my-coach-motion/'

test('realistic greeting v3 has exactly four distinct first-party video/poster pairs',()=>{
  assert.deepEqual(PUBLIC_COACH_PERSONA_IDS,['mira','max','sofia','alex'])
  assert.equal(COACH_PERSONAS.length,8) // old reports remain readable
  const clips=new Set(),posters=new Set()
  for(const id of PUBLIC_COACH_PERSONA_IDS){
    const clip=read(base+id+'-greeting-real-v3.mp4')
    const poster=read(base+id+'-greeting-real-v3.webp')
    assert.equal(clip.toString('ascii',4,8),'ftyp',id+' MP4')
    assert.ok(clip.includes(Buffer.from('avc1')),id+' H264 video')
    assert.ok(clip.includes(Buffer.from('moov')),id+' fast-start')
    assert.ok(!clip.includes(Buffer.from('soun')),id+' remains silent')
    assert.ok(clip.length>25000&&clip.length<180000,id+' is mobile-light')
    assert.equal(poster.toString('ascii',0,4),'RIFF',id+' still RIFF')
    assert.equal(poster.toString('ascii',8,12),'WEBP',id+' still WebP')
    assert.ok(!poster.includes(Buffer.from('ANIM')),id+' still does not animate')
    assert.ok(statSync(new URL('../'+base+id+'-greeting-real-v3.webp',import.meta.url)).size<20000)
    clips.add(createHash('sha256').update(clip).digest('hex'))
    posters.add(createHash('sha256').update(poster).digest('hex'))
  }
  assert.equal(clips.size,4)
  assert.equal(posters.size,4)
})

test('catalog and session greetings select v3 while actual voice/listening states keep their own clips',()=>{
  const player=src('components/my-coach-motion-media.jsx')
  const catalog=src('components/my-coach-catalog.jsx')
  const session=src('components/my-coach-live-dialogue.jsx')
  const css=src('components/my-coach-motion-media.module.css')
  assert.ok(player.includes("const expressiveGreeting=state==='greeting'||(state==='idle'&&context==='card')"))
  assert.ok(player.includes("expressiveGreeting?'-greeting-real-v3.mp4':'-'+state+'.mp4'"))
  assert.ok(player.includes("expressiveGreeting?'-greeting-real-v3.webp':'-still.webp'"))
  assert.ok(player.includes("data-coach-motion-clip={expressiveGreeting?'greeting-real-v3':state}"))
  assert.ok(catalog.includes('phase="greeting" context="hero"'))
  assert.ok(catalog.includes('phase="greeting" context="avatar"'))
  assert.ok(catalog.includes('phase="idle" context="card"'))
  assert.ok(session.includes('phase={motionPhase} context="session"'))
  assert.ok(session.includes("voiceState.phase==='speaking'?'speaking'"))
  assert.ok(session.includes("voiceState.phase==='listening'?'listening'"))
  for(const pattern of ['IntersectionObserver','visibilitychange','video.pause()',
    'video.play()','muted loop playsInline autoPlay','prefers-reduced-motion: reduce',
    'onPlaying={()=>setVideoReady(true)}','onError={()=>setVideoReady(false)}'])
    assert.ok(player.includes(pattern),pattern)
  assert.match(css,/\.media\[data-coach-motion-ready='true'\] \.video\{opacity:1\}/)
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/)
  assert.doesNotMatch(player,/fetch\(|getUserMedia|MediaRecorder|speechSynthesis|localStorage|sessionStorage/)
})
