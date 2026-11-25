import test from 'node:test'
import assert from 'node:assert/strict'
import {createLukasTurnGate} from '../lib/coaching/lukas-turn-gate.mjs'

test('new canonical reply invalidates previous speech, not the video session',()=>{
  const gate=createLukasTurnGate(),first=gate.begin('Hello')
  assert.equal(gate.isCurrent(first),true)
  const next=gate.begin('Second reply')
  assert.equal(gate.isCurrent(first),false)
  assert.equal(gate.isCurrent(next),true)
})
test('user turn invalidates pending audio, and next reply can speak',()=>{
  const gate=createLukasTurnGate(),first=gate.begin('old')
  gate.invalidate()
  assert.equal(gate.isCurrent(first),false)
  const next=gate.begin('new')
  assert.equal(gate.isCurrent(next),true)
})
test('reject empty, invalid or oversized reply without truncation',()=>{
  const gate=createLukasTurnGate()
  for(const value of ['', '   ', null, {}, 'x'.repeat(501)])assert.equal(gate.begin(value),null)
  assert.equal(gate.begin(' x '.repeat(2)).text,'x  x')
  assert.equal(gate.begin('x'.repeat(500)).text.length,500)
})

import {createLukasPlaybackGate} from '../lib/coaching/lukas-playback-gate.mjs'
test('microphone resume requires provider speech, input drain, and provider silence',()=>{
  const gate=createLukasPlaybackGate()
  assert.equal(gate.silent(),false)
  gate.sent();gate.speaking();assert.equal(gate.silent(),false)
  gate.drained();assert.equal(gate.silent(),true);assert.equal(gate.silent(),false)
  assert.equal(gate.active(),false)
})
test('interruption resets the playback evidence; late silence cannot reopen microphone',()=>{
  const gate=createLukasPlaybackGate()
  gate.sent();gate.speaking();gate.drained();gate.reset()
  assert.equal(gate.silent(),false);assert.equal(gate.active(),false)
  gate.sent();gate.drained();assert.equal(gate.silent(),false)
  gate.speaking();assert.equal(gate.silent(),true)
})
