import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url))
const source=path=>read(path).toString('utf8')
const root='public/images/holistic-house/my-coach-motion/'

test('Samir has a real calm looping animated asset and matching still poster',()=>{
  const animation=read(root+'genie-calm-loop-v1.gif')
  const poster=read(root+'genie-calm-loop-poster.webp')
  assert.equal(animation.toString('ascii',0,6),'GIF89a')
  assert.ok(animation.length>30000)
  assert.ok(animation.length<1500000,'lazy loaded, mobile-friendly loop')
  assert.equal(poster.toString('ascii',0,4),'RIFF')
  assert.equal(poster.toString('ascii',8,12),'WEBP')
  assert.ok(poster.length<100000)
})
test('Samir uses the selected hero and live session motion component with static accessibility fallback',()=>{
  const motion=source('components/my-coach-motion-media.jsx')
  const catalog=source('components/my-coach-catalog.jsx')
  const profile=source('components/my-coach-compact-profile.jsx')
  assert.match(motion,/VIDEO_PERSONAS=new Set\(\[[^\]]*'genie'/)
  assert.match(motion,/const GENIE_LOOP=MEDIA_ROOT\+'genie-calm-loop-v1\.gif'/)
  assert.match(motion,/const shouldPlay=supported&&hasVideo&&motionAllowed&&inViewport&&pageVisible/)
  assert.match(motion,/prefers-reduced-motion: reduce/)
  assert.match(motion,/onLoad=\{\(\)=>setVideoReady\(true\)\}/)
  assert.match(motion,/isGenie\s*\? <img/)
  assert.match(motion,/const poster=supported\?/)
  assert.match(catalog,/phase="greeting" context="hero"/)
  assert.match(catalog,/genie-calm-loop-poster\.webp/)
  assert.match(profile,/genie-calm-loop-poster\.webp/)
})
