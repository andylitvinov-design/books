import test from 'node:test'
import assert from 'node:assert/strict'
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
  assert.equal(calls[0].init.redirect,'error')
  assert.equal((await response.arrayBuffer()).byteLength,audio.length)
})

test('read returns null only for an actual missing object, not a transient error',async()=>{
  const missing=await readSavedCoachGreeting(config,'mira','en',
    async()=>new Response('missing',{status:404}))
  assert.equal(missing,null)
  await assert.rejects(readSavedCoachGreeting(config,'mira','en',
    async()=>new Response('unavailable',{status:503})),/STORAGE_READ_FAILED/)
})

test('the live Supabase HTTP 400 NoSuchKey response is a missing recording',async()=>{
  const missing=await readSavedCoachGreeting(config,'genie','ru',async()=>
    Response.json({statusCode:'404',error:'not_found',message:'Object not found',code:'NoSuchKey'},
      {status:400}))
  assert.equal(missing,null)
})

test('other storage errors cannot masquerade as a missing recording',async()=>{
  const failures=[
    Response.json({statusCode:'404',code:'NoSuchBucket'},{status:400}),
    Response.json({statusCode:'403',code:'AccessDenied'},{status:400}),
    Response.json({statusCode:'403',code:'NoSuchKey'},{status:400}),
    Response.json({statusCode:'404',code:'NoSuchKey'},{status:403}),
    new Response('invalid JSON',{status:400}),
  ]
  for(const response of failures)
    await assert.rejects(readSavedCoachGreeting(config,'genie','ru',async()=>response),
      /STORAGE_READ_FAILED/)
})

test('an unsatisfiable byte range preserves 416 without treating the track as missing',async()=>{
  const upstream=new Response(null,{status:416,headers:{'content-range':'bytes */1500'}})
  const response=await readSavedCoachGreeting(config,'genie','ru',async()=>upstream,
    'bytes=1500-')
  assert.equal(response.status,416)
  assert.equal(response.headers.get('content-range'),'bytes */1500')
  await assert.rejects(readSavedCoachGreeting(config,'genie','ru',async()=>
    new Response(null,{status:416}),'bytes=1500-'),/STORAGE_READ_FAILED/)
  await assert.rejects(readSavedCoachGreeting(config,'genie','ru',async()=>upstream),
    /STORAGE_READ_FAILED/)
})

test('a lookup that never receives headers is aborted and reports storage failure',async t=>{
  t.mock.timers.enable({apis:['setTimeout']})
  const read=readSavedCoachGreeting(config,'genie','ru',async(_url,{signal})=>
    new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>
      reject(new Error('aborted')),{once:true})))
  const rejected=assert.rejects(read,/STORAGE_READ_FAILED/)
  t.mock.timers.tick(7001)
  await rejected
})

test('an accepted recording can finish streaming after the lookup deadline',async t=>{
  t.mock.timers.enable({apis:['setTimeout']})
  let signal,body
  const response=await readSavedCoachGreeting(config,'genie','ru',async(_url,init)=>{
    signal=init.signal
    return new Response(new ReadableStream({start(controller){
      body=controller
      controller.enqueue(audio.subarray(0,32))
      signal.addEventListener('abort',()=>controller.error(new Error('aborted')),{once:true})
    }}),{headers:{'content-type':'audio/mpeg'}})
  })
  t.mock.timers.tick(30000)
  assert.equal(signal.aborted,false)
  body.enqueue(audio.subarray(32))
  body.close()
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()),audio)
})

test('first generation writes the original MP3 exactly once and never upserts',async()=>{
  let calls=0
  const saved=await saveCoachGreetingOnce(config,'genie','es',audio,async(url,init)=>{
    calls++
    assert.equal(url,config.supabaseUrl+'/storage/v1/object/hh-coach-greetings/v2/es/genie.mp3')
    assert.equal(init.method,'POST')
    assert.equal(init.redirect,'error')
    assert.equal(init.headers['Content-Type'],'audio/mpeg')
    assert.equal(init.headers['x-upsert'],'false')
    assert.equal(init.headers.apikey,config.secretKey)
    assert.deepEqual(init.body,audio)
    return new Response('{}',{status:200})
  })
  assert.deepEqual(saved,{created:true})
  assert.equal(calls,1)
})

test('new Supabase secret keys go on apikey, never JWT Bearer Authorization',async()=>{
  await saveCoachGreetingOnce({...config,secretKey:'sb_secret_0123456789'},'mira','ru',audio,
    async(_url,init)=>{
      assert.equal(init.headers.apikey,'sb_secret_0123456789')
      assert.equal(init.headers.Authorization,undefined)
      return new Response('{}',{status:201})
    })
})

test('concurrent first write recognizes canonical object and missing secret denies writes',async()=>{
  const concurrent=await saveCoachGreetingOnce(config,'max','ru',audio,
    async()=>new Response('exists',{status:409}))
  assert.deepEqual(concurrent,{created:false})
  await assert.rejects(saveCoachGreetingOnce({...config,secretKey:null},
    'max','ru',audio),/STORAGE_CONFIG/)
})

test('HTTP 400 duplicate uploads preserve the already stored recording',async()=>{
  const duplicates=[
    {statusCode:'409',error:'Duplicate',message:'The resource already exists'},
    {statusCode:409,code:'ResourceAlreadyExists'},
    {statusCode:'409',code:'KeyAlreadyExists'},
  ]
  for(const error of duplicates){
    const result=await saveCoachGreetingOnce(config,'genie','ru',audio,
      async()=>Response.json(error,{status:400}))
    assert.deepEqual(result,{created:false})
  }
})

test('failed uploads are not mistaken for an existing recording',async()=>{
  const failures=[
    Response.json({statusCode:'403',error:'AccessDenied'},{status:400}),
    Response.json({statusCode:'403',error:'Duplicate'},{status:400}),
    Response.json({statusCode:'409',error:'Conflict'},{status:400}),
    Response.json({statusCode:'409',error:'Duplicate'},{status:503}),
    new Response('invalid JSON',{status:400}),
  ]
  for(const response of failures)
    await assert.rejects(saveCoachGreetingOnce(config,'genie','ru',audio,async()=>response),
      /STORAGE_WRITE_FAILED/)
})


test('Samir v3 object keys are separate from v2 and cannot affect other personas',()=>{
  assert.equal(coachGreetingObjectKey('genie','ru','v3'),'v3/ru/genie.mp3')
  assert.equal(coachGreetingObjectKey('genie','en','v3'),'v3/en/genie.mp3')
  assert.equal(coachGreetingObjectKey('genie','ru'),'v2/ru/genie.mp3')
  assert.equal(coachGreetingObjectKey('genie','es','v3'),null)
  assert.equal(coachGreetingObjectKey('mira','ru','v3'),null)
  assert.equal(coachGreetingObjectKey('genie','ru','../other'),null)
})

test('v4 creates separate immutable English keys for the seven public coaches only',()=>{
  for(const id of ['mira','max','sofia','alex','merlin','harry','genie']){
    assert.equal(coachGreetingObjectKey(id,'en','v4'),'v4/en/'+id+'.mp3')
    assert.equal(coachGreetingObjectKey(id,'ru','v4'),null)
    assert.equal(coachGreetingObjectKey(id,'es','v4'),null)
  }
  for(const id of ['lea','noah','iris','ray','meditations'])assert.equal(coachGreetingObjectKey(id,'en','v4'),null)
})
