import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {staticApproval,validStaticRequest,mp3Info,privateMp4Url,generateCaesarStatic,boundedBytes} from '../lib/coaching/caesar-static-video.mjs'
const at=Date.parse('2026-11-27T15:00:00Z')
const permit={job:'neutral',maxSeconds:5,notBefore:'2026-11-27T14:00:00Z',expiresAt:'2026-11-27T16:00:00Z',freeStaticAndHardStopVerified:true,editorialUseVerified:true}
const env=(patch={})=>({VERCEL_ENV:'production',HH_SIMLI_FREE_ACCOUNT_VERIFIED:'true',SIMLI_API_KEY:'synthetic-test-key',HH_SIMLI_STATIC_VIDEO_APPROVAL:JSON.stringify({...permit,...patch})})
const body={job:'neutral',freeOnly:true,editorialOnly:true}
const signed='https://api.simli.ai/static/mp4/job/test.mp4?token=synthetic'
const frame=()=>{const b=Buffer.alloc(192);b.set([0xff,0xf3,0x84,0xc0]);return b}
test('approval is off by default, production only, time and job bound',()=>{
  assert.equal(staticApproval({},at),null);assert.equal(staticApproval({...env(),VERCEL_ENV:'preview'},at),null)
  assert.equal(staticApproval(env({editorialUseVerified:false}),at),null);assert.equal(staticApproval(env({freeStaticAndHardStopVerified:false}),at),null)
  assert.equal(staticApproval(env({expiresAt:'2026-11-28T00:01:00Z'}),at),null);assert.equal(staticApproval(env(),at+7200000),null)
  assert.equal(validStaticRequest(body,staticApproval(env(),at)),true);assert.equal(validStaticRequest({...body,faceId:'other'},staticApproval(env(),at)),false)
})
test('strict MPEG frame scan and mono duration; reject truncated or overlong audio',()=>{
  const data=Buffer.concat(Array.from({length:100},frame));assert.ok(Math.abs(mp3Info(data).seconds-2.4)<1e-8)
  assert.equal(mp3Info(data).sampleRate,24000);assert.throws(()=>mp3Info(data.subarray(0,-1)),/STATIC_AUDIO_INVALID/)
  assert.throws(()=>mp3Info(Buffer.concat(Array.from({length:2600},frame))),/STATIC_AUDIO_TOO_LONG/)
})
test('only actual signed Simli MP4 path accepted, no attacker redirect or credentials',()=>{
  assert.equal(privateMp4Url({data:{mp4:signed}}),signed);for(const url of ['https://evil.example/static/mp4/a/b?token=x','https://api.simli.ai.evil.example/static/mp4/a/b?token=x','https://api.simli.ai/static/mp4/a/b','https://user@api.simli.ai/static/mp4/a/b?token=x','https://api.simli.ai/static/hls/a/b?token=x'])assert.equal(privateMp4Url(url),null)
})
test('neutral payload is fixed 5 seconds and reserves before exactly one POST',async()=>{
  const events=[];const out=await generateCaesarStatic(body,{env:env(),now:()=>at,readGreeting:()=>assert.fail('neutral must not read audio'),reserve:async()=>events.push('reserve'),fetcher:async(url,options)=>{events.push('post');assert.equal(url,'https://api.simli.ai/static/audio');assert.equal(options.redirect,'error');const p=JSON.parse(options.body);assert.equal(p.faceId,'efcb440b-6a24-4e79-a46a-764c1d4b751d');assert.equal(p.audioFormat,'pcm16');assert.equal(Buffer.from(p.audioBase64,'base64').length,160000);assert.equal(p.streaming_width,1080);assert.equal(p.streaming_height,1920);return Response.json({mp4:signed})}})
  assert.deepEqual(events,['reserve','post']);assert.equal(out.mp4Url,signed);assert.equal(out.status,'PROVIDER_URL_RECEIVED_QA_PENDING')
})
test('greeting sends entire saved MP3, never new TTS or cut speech',async()=>{
  const audio=Buffer.concat(Array.from({length:100},frame));await generateCaesarStatic({...body,job:'greeting-en'},{env:env({job:'greeting-en'}),now:()=>at,reserve:async()=>{},readGreeting:async l=>{assert.equal(l,'en');return audio},fetcher:async(_,o)=>{const p=JSON.parse(o.body);assert.equal(p.audioFormat,'mp3');assert.deepEqual(Buffer.from(p.audioBase64,'base64'),audio);return Response.json({mp4:signed})}})
})
test('no provider call on blocked approval, invalid request, missing audio or failed reservation',async()=>{
  const d={env:env(),now:()=>at,reserve:async()=>{throw Error('RATE_LIMITED')},fetcher:()=>assert.fail('provider must not be called')}
  await assert.rejects(generateCaesarStatic(body,{...d,env:{}}),/STATIC_NOT_APPROVED/);await assert.rejects(generateCaesarStatic({...body,job:'greeting-ru'},d),/STATIC_INVALID_REQUEST/)
  await assert.rejects(generateCaesarStatic(body,d),/RATE_LIMITED/)
})
test('ambiguous provider response is fail closed and never retries',async()=>{
  let posts=0;const d={env:env(),now:()=>at,reserve:async()=>{},fetcher:async()=>{posts++;return Response.json({unknown:'not a signed link'})}}
  await assert.rejects(generateCaesarStatic(body,d),/STATIC_ATTEMPT_LOCKED/);assert.equal(posts,1)
})
test('bounded reads reject oversized body',async()=>{await assert.rejects(boundedBytes(new Response('123456'),5),/STATIC_RESPONSE_INVALID/)})
test('route is private, admin-only, same-origin and global day limited',()=>{
  const source=readFileSync(new URL('../app/api/admin/caesar-static-video/route.js',import.meta.url),'utf8');assert.match(source,/requireAdminActor/);assert.match(source,/PRIVATE_HEADERS/);assert.match(source,/sec-fetch-site/);assert.match(source,/owner-caesar-static-video-day'\},1,86400/);assert.match(source,/readSavedCoachGreeting\(config,'caesar',locale,fetch,null,'v5'\)/)
})
