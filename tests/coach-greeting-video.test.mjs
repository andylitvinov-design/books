import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'

const read = path => readFileSync(new URL('../'+path, import.meta.url))
const mediaRoot = 'public/images/holistic-house/my-coach-motion/'
const code = path => read(path).toString('utf8')

test('Merlin and Harry have lightweight, real silent H264 greeting clips', () => {
  for (const name of ['merlin', 'harry']) {
    const path = mediaRoot + name + '-greeting-real-v1.mp4'
    const video = read(path)
    assert.equal(video.toString('latin1', 4, 8), 'ftyp', path + ' must be an MP4')
    assert.ok(video.length > 10000, path + ' must contain actual footage')
    assert.ok(video.length < 200000, path + ' must be mobile friendly')
    assert.ok(video.includes(Buffer.from('avc1')), path + ' must use browser-compatible H264')
    assert.equal(video.includes(Buffer.from('soun')), false, path + ' must have no audio')
    assert.ok(statSync(new URL('../'+path, import.meta.url)).isFile())
  }
})

test('greeting animation is available on hero and session for all six coaches', () => {
  const motion = code('components/my-coach-motion-media.jsx')
  const avatar = code('components/app/coaching-avatar.jsx')
  const session = code('components/my-coach-live-dialogue.jsx')
  const catalog = code('components/my-coach-catalog.jsx')

  for (const name of ['mira', 'max', 'sofia', 'alex', 'merlin', 'harry']) {
    assert.match(motion, new RegExp("'"+name+"'"), name + ' must be in the video allowlist')
    assert.match(avatar, new RegExp("'"+name+"'"), name + ' must be eligible for large photo animation')
    assert.match(session, new RegExp("'"+name+"'"), name + ' must be eligible for live session motion')
  }
  for (const name of ['merlin', 'harry']) {
    assert.ok(motion.includes(name+'-greeting-real-v1.mp4') || motion.includes("personaId+'-greeting-real-v1.mp4'"))
  }
  assert.match(motion, /harry-soft-.*?\.mp4/)
  assert.match(motion, /prefers-reduced-motion: reduce/)
  assert.match(motion, /IntersectionObserver/)
  assert.match(motion, /visibilitychange/)
  assert.match(motion, /muted loop playsInline autoPlay/)
  assert.match(catalog, /phase="greeting" context="hero"/)
})
