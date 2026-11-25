import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {readGeminiLiveServerMessage, bytesToBase64} from '../lib/coaching/gemini-live-transport.mjs'

const binary = msg => new TextEncoder().encode(JSON.stringify(msg)).buffer

test('Gemini Live receives setup, PCM and interruptions as ordered binary JSON frames', () => {
  const pcm = bytesToBase64(Uint8Array.of(0x10, 0x00, 0x20, 0x00))
  const messages = [
    {setupComplete: {}},
    {serverContent: {
      outputTranscription: {text: 'Привет!'},
      modelTurn: {parts: [{inlineData: {mimeType: 'audio/pcm;rate=24000', data: pcm}}]},
    }},
    {serverContent: {interrupted: true}},
    {serverContent: {turnComplete: true}},
  ]
  const frames = messages.map(msg => readGeminiLiveServerMessage(binary(msg)))
  assert.deepEqual(frames, messages.map(msg => readGeminiLiveServerMessage(JSON.stringify(msg))))
  assert.equal(frames[0].setupComplete, true)
  assert.deepEqual(frames[1].audio, [pcm])
  assert.equal(frames[1].output, 'Привет!')
  assert.equal(frames[2].interrupted, true)
  assert.equal(frames[3].turnComplete, true)
})

test('Gemini Live rejects malformed UTF-8 and oversized binary frames', () => {
  assert.throws(() => readGeminiLiveServerMessage(Uint8Array.of(0xff).buffer), /GEMINI_LIVE_FRAME_INVALID/)
  assert.throws(() => readGeminiLiveServerMessage(new ArrayBuffer(600001)), /GEMINI_LIVE_FRAME_INVALID/)
})

test('Gemini Live configures binary WebSocket delivery and forwards messages to the decoder', () => {
  const source = readFileSync(new URL('../components/my-coach-gemini-live.jsx', import.meta.url), 'utf8')
  assert.match(source, /new WebSocket\([^\n]+\)[\s\S]{0,300}socket\.binaryType='arraybuffer'/)
  assert.match(source, /socket\.onmessage=event=>\{\s*if\(r\.ended\|\|r\.socket!==socket\)return\s*handleAudio\(r,event\.data\)/)
})
