import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  COACH_GREETING_BUCKET, coachGreetingObjectKey, coachGreetingPublicUrl,
  isMp3Bytes,readSavedCoachGreeting,saveCoachGreetingOnce,
} from '../lib/coaching/coach-greeting-mp3-store.mjs'

const config={supabaseUrl:'https://project.supabase.co',secretKey:'server-only-secret'}
const coaches=['mira','max','sofia','alex','merlin','harry','genie','lea','noah','iris','ray']
const locales=['en','ru','es']
const audio=new Uint8Array(1500)
audio.set([0x49,0x44,0x33])

test('all eleven personas and three locales have deterministic durable MP3 keys',()=>{
  assert.equal(COACH_GREETING_BUCKET,'hh-coach-greetings')
  for(const locale of locales)for(const coach of coaches){
    assert.equal(coachGreetingObjectKey(coach,locale),'v2/'+locale+'/'+coach+'.mp3')
    assert.equal(coachGreetingPublicUrl(config,coach,locale),
      config.supabaseUrl+'/storage/v1/object/public/hh-coach-greetings/v2/'+locale+'/'+coach+'.mp3')
  }
  assert.equal(coachGreetingObjectKey('../x','en'),null)
  assert.equal(coachGreetingObjectKey('mira','../../x'),null)
})

test('only a plausible nonempty MP3 is persisted',()=>{
  assert.equal(isMp3Bytes(audio),true)
  assert.equal(isMp3Bytes(new Uint8Array([1,2,3])),false)
  assert.equal(isMp3Bytes(new Uint8Array(1024)),false)
  assert.equal(isMp3Bytes(new Uint8Array(10*1024*1024+1)),false)
})

test('saved audio streams from the same first-party URL, including byte ranges',async()=>{
  const calls=[]
  const response=await readSavedCoachGreeting(config,'merlin','ru',async (url,init)=>{
    calls.push({url,init})
    return new Response(audio,{status:206,headers:{
      'content-type':'audio/mpeg','content-range':'bytes 0-1499/1500',
    }})
  },'bytes=0-1499')
  assert.equal(response.status,206)
  assert.equal(calls.length,1)
  assert.match(calls[0].url,/\/storage\/v1\/object\/public\//)
  assert.equal(calls[0].init.headers.Range,'bytes=0-1499')
  assert.equal((await response.arrayBuffer()).byteLength,audio.length)
})

test('read returns null only for an actual missing object, not a transient error',async()=>{
  const missing=await readSavedCoachGreeting(config,'mira','en',
    async()=>new Response('missing',{status:404}))
  assert.equal(missing,null)
  await assert.rejects(readSavedCoachGreeting(config,'mira','en',
    async()=>new Response('unavailable',{status:503})),/STORAGE_READ_FAILED/)
})

test('first generation writes the original MP3 exactly once and never upserts',async()=>{
  let calls=0
  const saved=await saveCoachGreetingOnce(config,'genie','es',audio,async(url,init)=>{
    calls++
    assert.equal(url,config.supabaseUrl+'/storage/v1/object/hh-coach-greetings/v2/es/genie.mp3')
    assert.equal(init.method,'POST')
    assert.equal(init.headers['Content-Type'],'audio/mpeg')
    assert.equal(init.headers['x-upsert'],'false')
    assert.equal(init.headers.apikey,config.secretKey)
    assert.deepEqual(init.body,audio)
    return new Response('{}',{status:200})
  })
  assert.deepEqual(saved,{created:true})
  assert.equal(calls,1)
})

test('concurrent first write recognizes canonical object and missing secret denies writes',async()=>{
  const concurrent=await saveCoachGreetingOnce(config,'max','ru',audio,
    async()=>new Response('exists',{status:409}))
  assert.deepEqual(concurrent,{created:false})
  await assert.rejects(saveCoachGreetingOnce({...config,secretKey:null},
    'max','ru',audio),/STORAGE_CONFIG/)
})

test('v2 route consults durable cache before synthesis and saves both vendor paths',()=>{
  const route=readFileSync(new URL('../app/api/coaching/intro/[locale]/[coach]/route.js',import.meta.url),'utf8')
  const gate=readFileSync(new URL('../lib/personal-coaching/direct-coach-intro-audio.mjs',import.meta.url),'utf8')
  assert.match(route,/if\(useRecordedGreeting\)\{/)
  assert.match(route,/readSavedCoachGreeting\(config,personaId,locale,fetch,/)
  assert.match(route,/if\(saved\)return storedAudioResponse\(saved\)/)
  assert.match(route,/if\(useRecordedGreeting\)return persistGreeting\(config,personaId,locale,audio\)/)
  assert.match(route,/return persistGreeting\(config,personaId,locale,audio\)/)
  assert.match(route,/if\(!saved\.created\)/)
  assert.match(route,/max-age=31536000/)
  assert.match(gate,/\/api\/coaching\/intro\//)
  assert.match(gate,/\?v=2/)
})
