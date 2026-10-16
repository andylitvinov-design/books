import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {canProxyOwnerAudio,OWNER_AUDIO_PROXY_MAX_BYTES} from '../lib/clients/owner-audio-upload.js'

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
class AppError extends Error {constructor(code,status){super(code);this.code=code;this.status=status;this.name='AppError'}}
const model=source('lib/clients/session-delivery-storage.js')
const createUploader=({row,upload=async()=>({error:null}),info=async()=>({error:{message:'Not found'}}),session={status:'draft'}}={})=>{
  const calls=[]
  const from=()=>({
    upload:async(key,blob,opts)=>{calls.push({key,size:blob.size,mime:blob.type,opts});return upload(key,blob,opts)},
    info,
  })
  const factory=new Function('createClient','transaction','getOwnerSession','validUuid','PRIVATE_MEDIA_BUCKET',
    'OWNER_AUDIO_MIME_TYPES','OWNER_AUDIO_PROXY_MAX_BYTES','AppError','Buffer','Blob',
    model.replace(/^import .*\n/gm,'').replace(/^export /gm,'')+
    '\nreturn uploadPrivateOwnerAudio')
  const run=factory(
    ()=>({storage:{from}}),
    async(_cfg,_actor,cb)=>cb({query:async()=>({rows:row?[row]:[]})}),
    async()=>session,()=>true,'hh-client-private-media',
    ['audio/mp4','audio/x-m4a','audio/webm','audio/mpeg'],
    OWNER_AUDIO_PROXY_MAX_BYTES,AppError,Buffer,Blob)
  return {calls,run:(overrides={})=>run({supabaseUrl:'https://synthetic.supabase.co',secretKey:'sb_secret_fake'},null,
    'client-a','session-a','asset-a',{mime:'audio/mp4',body:Buffer.alloc(500),...overrides})}
}
const record={
  id:'asset-a',legacy_client_id:'client-a',session_id:'session-a',
  asset_kind:'audio',mime:'audio/mp4',max_bytes:500,status:'pending',
  storage_provider:'supabase',object_key:'opaque/uuid.m4a'
}

test('iPhone short audio uses bounded first-party uploads; video and oversize files stay off Vercel',()=>{
  assert.equal(OWNER_AUDIO_PROXY_MAX_BYTES,3_000_000)
  for(const mime of ['audio/mp4','audio/x-m4a','audio/webm','audio/mpeg'])
    assert.equal(canProxyOwnerAudio({type:mime,size:512}),true,mime)
  for(const file of [{type:'video/mp4',size:512},{type:'application/pdf',size:512},
    {type:'audio/mp4',size:OWNER_AUDIO_PROXY_MAX_BYTES+1},{type:'audio/mp4',size:12}])
    assert.equal(canProxyOwnerAudio(file),false,file.type)
})

test('authorized, pinned pending audio is uploaded only once without upsert or exposing its key',async()=>{
  const {run,calls}=createUploader({row:record})
  const result=await run()
  assert.deepEqual(result,{uploaded:true})
  assert.equal(calls.length,1)
  assert.equal(calls[0].key,record.object_key)
  assert.equal(calls[0].mime,'audio/mp4')
  assert.equal(calls[0].size,500)
  assert.equal(calls[0].opts.upsert,false)
  assert.equal(calls[0].opts.contentType,'audio/mp4')
})

test('owner proxy rejects an unrelated asset, forged MIME or byte size before any upload',async()=>{
  for(const bad of [
    {...record,legacy_client_id:'other-client',status:'removed'},
    {...record,asset_kind:'video'},
    {...record,storage_provider:'r2'},
    {...record,mime:'application/pdf'},
    {...record,max_bytes:501},
    {...record,status:'removed'},
  ]){
    const {run,calls}=createUploader({row:bad})
    await assert.rejects(run(),{code:'MEDIA_UNAVAILABLE'})
    assert.equal(calls.length,0)
  }
  const {run,calls}=createUploader({row:record})
  await assert.rejects(run({mime:'application/pdf'}),{code:'MEDIA_SIZE_NOT_ALLOWED'})
  assert.equal(calls.length,0)
})

test('duplicate or lost-response upload is idempotent but never overwrites a stored object',async()=>{
  const first=createUploader({row:{...record,status:'ready'}})
  assert.deepEqual(await first.run(),{uploaded:true,already:true})
  assert.equal(first.calls.length,0)
  const second=createUploader({row:record,
    upload:async()=>({error:{message:'Already exists'}}),
    info:async()=>({data:{size:500,content_type:'audio/mp4'},error:null})})
  assert.deepEqual(await second.run(),{uploaded:true,already:true})
  assert.equal(second.calls.length,1)
  const mismatched=createUploader({row:record,
    upload:async()=>({error:{message:'Already exists'}}),
    info:async()=>({data:{size:499,content_type:'audio/mp4'},error:null})})
  await assert.rejects(mismatched.run(),{code:'MEDIA_STORAGE_UNAVAILABLE'})
})

test('no patient upload is allowed for archived consultations',async()=>{
  const {run,calls}=createUploader({row:record,session:{status:'archived'}})
  await assert.rejects(run(),{code:'MEDIA_UNAVAILABLE'})
  assert.equal(calls.length,0)
})

test('binary route is authenticated, same-origin, size limited, and leaves finalization to existing protected endpoint',()=>{
  const route=source('app/api/admin/clients/[id]/sessions/[sessionId]/media/[assetId]/upload/route.js')
  assert.match(route,/ownerDelivery\(request/)
  assert.match(route,/isSameOriginRequest\(request\)/)
  assert.match(route,/OWNER_AUDIO_PROXY_MAX_BYTES/)
  assert.match(route,/request\.body\.getReader\(\)/)
  assert.match(route,/Number\(declared\)!==size/)
  assert.match(route,/Buffer\.concat\(chunks,size\)/)
  assert.match(route,/uploadPrivateOwnerAudio\(/)
  assert.doesNotMatch(route,/createSignedUploadUrl|NEXT_PUBLIC_|Bearer/)
})

test('recorder prefers authenticated same-origin for short notes and preserves a local backup',()=>{
  const recorder=source('components/session-audio-recorder.jsx')
  assert.match(recorder,/canProxyOwnerAudio\(file\)/)
  assert.match(recorder,/encodeURIComponent\(intent\.assetId\)\+'\/upload'/)
  assert.match(recorder,/method:'POST',headers:\{'content-type':mime\},body:file/)
  assert.match(recorder,/credentials:'same-origin'/)
  assert.match(recorder,/uploadToSignedUrl/)
  assert.match(recorder,/download=\{retryFile\.name/)
  const middleware=source('middleware.ts')
  assert.match(middleware,/ownerRecorderPage = deliveryPath && pathname\.startsWith\('\/admin\/'\)/)
  assert.match(middleware,/ownerRecorderPage\|\|deliveryOrigin/)
  assert.match(middleware,/"connect-src 'self'"/)
})
