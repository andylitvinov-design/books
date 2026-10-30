import test from 'node:test';
import assert from 'node:assert/strict';
import * as provider from '../lib/mandala/voice-studio-provider.mjs';
import { buildStudioPayload, validateStudioRequest } from '../lib/mandala/voice-studio.mjs';

const request = buildStudioPayload(validateStudioRequest({mode:'sample',voiceId:'mark',language:'en'}));
function wav() {
  const b=Buffer.alloc(48); b.write('RIFF',0);b.writeUInt32LE(40,4);b.write('WAVEfmt ',8);
  b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);
  b.writeUInt32LE(24000,24);b.writeUInt32LE(48000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);
  b.write('data',36);b.writeUInt32LE(4,40);return b;
}
const response = audio => new Response(JSON.stringify({steps:[{type:'model_output',content:[{type:'audio',data:audio}]}]}));
const code = expected => error => error.code === expected;
test('documented Interactions request returns a validated provider WAV',async()=>{
  assert.equal(typeof provider.requestStudioAudio,'function');
  let received;
  const expected=wav();
  const actual=await provider.requestStudioAudio({key:'synthetic-key',payload:request,fetchImpl:async(url,options)=>{
    received={url,options}; return response(expected.toString('base64'));
  }});
  assert.deepEqual(actual,expected);
  assert.equal(received.url,'https://generativelanguage.googleapis.com/v1beta/interactions');
  assert.equal(received.options.headers['x-goog-api-key'],'synthetic-key');
  assert.deepEqual(JSON.parse(received.options.body),request);
});
test('quota, network, malformed response and unsupported WAV fail closed',async()=>{
  assert.equal(typeof provider.requestStudioAudio,'function');
  const run=fetchImpl=>provider.requestStudioAudio({key:'synthetic-key',payload:request,fetchImpl,maxBytes:1024});
  await assert.rejects(run(async()=>new Response('',{status:429})),code('TTS_FREE_QUOTA_EXHAUSTED'));
  await assert.rejects(run(async()=>new Response('',{status:500})),code('TTS_PROVIDER_UNAVAILABLE'));
  await assert.rejects(run(async()=>{throw new Error('timeout')}),code('TTS_PROVIDER_UNAVAILABLE'));
  await assert.rejects(run(async()=>new Response('not-json')),code('TTS_PROVIDER_INVALID_RESPONSE'));
  await assert.rejects(run(async()=>response('!invalid')),code('TTS_PROVIDER_INVALID_RESPONSE'));
  await assert.rejects(run(async()=>response(Buffer.alloc(60).toString('base64'))),code('TTS_PROVIDER_INVALID_RESPONSE'));
  await assert.rejects(run(async()=>new Response('x'.repeat(1025))),code('TTS_RESPONSE_TOO_LARGE'));
});
