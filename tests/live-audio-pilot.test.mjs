import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  HOST_IDENTITY, MAX_LISTENERS, TOKEN_TTL_SECONDS,
  audioGrants, audioPresence, canListen, liveAudioSettings,
} from '../lib/live-audio/policy.mjs'

const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8')
const env = {
  HH_LIVE_AUDIO_ENABLED:'true',
  LIVEKIT_URL:'wss://free-project.livekit.cloud',
  LIVEKIT_API_KEY:'synthetic-key',
  LIVEKIT_API_SECRET:'synthetic-secret-not-real',
  VERCEL_ENV:'production',
}

test('audio pilot is opt-in, region/environment-separated and rejects invalid credentials',()=>{
  assert.equal(liveAudioSettings({...env,HH_LIVE_AUDIO_ENABLED:'false'}),null)
  const active=liveAudioSettings(env)
  assert.equal(active.wsUrl,env.LIVEKIT_URL)
  assert.equal(active.apiUrl,'https://free-project.livekit.cloud')
  assert.equal(active.room,'hh-live-audio-production-v1')
  assert.notEqual(liveAudioSettings({...env,VERCEL_ENV:'preview'}).room,active.room)
  for(const changes of [{LIVEKIT_URL:'https://evil.invalid'},{LIVEKIT_URL:'wss://bad.invalid/stolen'},{LIVEKIT_URL:'wss://u:p@bad.invalid/'},{LIVEKIT_API_SECRET:''}]){
    assert.throws(()=>liveAudioSettings({...env,...changes}),/LIVE_AUDIO_NOT_CONFIGURED/)
  }
  assert.equal(TOKEN_TTL_SECONDS,180)
})

test('listener grants cannot publish mic/video/data, host may only publish microphone',()=>{
  const host=audioGrants('host','hh-room')
  const guest=audioGrants('listener','hh-room')
  assert.deepEqual(host.canPublishSources,['microphone'])
  assert.equal(host.canPublish,true)
  assert.equal(host.canSubscribe,false)
  assert.equal(host.canPublishData,false)
  assert.equal(guest.room,'hh-room')
  assert.equal(guest.canPublish,false)
  assert.equal(guest.canSubscribe,true)
  assert.equal(guest.canPublishData,false)
  assert.equal(guest.canUpdateOwnMetadata,false)
  assert.equal(Object.hasOwn(guest,'canPublishSources'),false)
  assert.throws(()=>audioGrants('moderator','hh-room'),/INVALID_ROLE/)
})

test('status and admission depend on real provider host presence, not room existence',()=>{
  const room='hh-test-room'
  const rooms=[{name:room}]
  const host={identity:HOST_IDENTITY,tracks:[{source:2,muted:false}]}
  const guests=Array.from({length:MAX_LISTENERS},(_,i)=>({identity:'listener-'+i}))
  assert.equal(audioPresence([],[],room).live,false)
  assert.equal(audioPresence(rooms,guests,room).live,false)
  assert.equal(audioPresence(rooms,[{identity:HOST_IDENTITY}],room).live,false)
  assert.equal(audioPresence(rooms,[{identity:HOST_IDENTITY,tracks:[{source:1}]}],room).live,false)
  assert.equal(audioPresence(rooms,[{identity:HOST_IDENTITY,tracks:[{source:2,muted:true}]}],room).live,true)
  assert.deepEqual(audioPresence(rooms,[host],room),{enabled:true,live:true,listeners:0})
  assert.ok(canListen(audioPresence(rooms,[host],room)))
  assert.equal(canListen(audioPresence(rooms,[host,...guests],room)),false)
  assert.equal(canListen({enabled:false,live:true,listeners:0}),false)
})

test('server only gives listeners subscribe-only tokens and owner-only end; disabled is explicit',()=>{
  const token=read('app/api/live-audio/token/route.js')
  const stop=read('app/api/live-audio/end/route.js')
  const status=read('app/api/live-audio/status/route.js')
  const engine=read('lib/live-audio/server.js')
  for(const source of [token,stop]){
    assert.match(source,/requireSameOrigin/)
    assert.match(source,/auth\.verified\(\)/)
    assert.match(source,/practitionerEmailAllowed/)
    assert.match(source,/ACCOUNT_CHANGED/)
    assert.match(source,/PRIVATE_HEADERS/)
  }
  assert.match(token,/consumeRate/)
  assert.match(token,/readBody\(request, 512\)/)
  assert.match(token,/role === 'host'/)
  assert.match(engine,/canListen\(current\.presence\)/)
  assert.match(engine,/maxParticipants: MAX_LISTENERS \+ 1/)
  assert.match(engine,/deleteRoom/)
  assert.match(engine,/toJwt\(\)/)
  assert.match(status,/enabled: false, live: false, listeners: 0/)
})

test('live audio audio-only CSP/microphone scope, localized UI and cabinet entry',()=>{
  const middleware=read('middleware.ts')
  const next=read('next.config.ts')
  const publicPage=read('app/[locale]/live/page.tsx')
  const hostPage=read('app/[locale]/live/host/page.tsx')
  const client=read('components/live-audio-room.jsx')
  const css=read('app/[locale]/live/live-audio.css')
  assert.match(middleware,/liveAudioPage/)
  assert.match(middleware,/liveAudioOrigin/)
  assert.match(next,/liveAudioHostSources/)
  assert.match(next,/microphone=\(self\)/)
  assert.match(publicPage,/notFound/)
  assert.match(hostPage,/notFound/)
  assert.match(client,/RoomEvent\.TrackSubscribed/)
  assert.match(client,/RoomEvent\.ParticipantDisconnected/)
  assert.match(client,/startAudio\(\)/)
  assert.match(client,/setMicrophoneEnabled\(true\)/)
  assert.match(client,/hh-live-audio-output/)
  for(const phrase of ['Escuchar en directo','Слушать эфир','Listen live'])assert.ok(client.includes(phrase))
  assert.match(css,/@media\(max-width:390px\)/)
  assert.match(css,/:focus-visible/)
  assert.match(css,/prefers-reduced-motion/)
})

test('Live audio status saves function and provider calls while tabs are hidden', () => {
  const client = read('components/live-audio-room.jsx')
  assert.match(client, /document\.visibilityState === 'hidden'/)
  assert.match(client, /setInterval\(\(\) => \{ void refresh\(\) \}, 60000\)/)
  assert.match(client, /document\.addEventListener\('visibilitychange', onVisibility\)/)
  assert.match(client, /document\.removeEventListener\('visibilitychange', onVisibility\)/)
  assert.match(client, /if \(cancelled\)/)
  assert.doesNotMatch(client, /setInterval\(refresh, 15000\)/)
})
