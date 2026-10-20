import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {canProxyOwnerPhoto,OWNER_PHOTO_MIME_TYPES,OWNER_PHOTO_PROXY_MAX_BYTES} from '../lib/clients/owner-photo-upload.js'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
class AppError extends Error {
  constructor(code,status){super(code);this.name='AppError';this.code=code;this.status=status}
}
const storageSource=read('lib/clients/session-delivery-storage.js')
const model=storageSource.replace(/^import .*\n/gm,'')
  .replace(/^export \{client as privateStorageClient, sniff as sniffPrivateMedia\}\r?\n/gm,'')
  .replace(/^export /gm,'')
const PHOTO=Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe0]),Buffer.alloc(496)])
const OWNER='client-owner',SESSION='session-one',ASSET='asset-one'
const base={
  id:ASSET,legacy_client_id:OWNER,session_id:SESSION,asset_kind:'image',
  scope:'client',mime:'image/jpeg',max_bytes:PHOTO.length,status:'pending',
  storage_provider:'supabase',object_key:'opaque/opaque.jpg',
}
function harness({asset=base,session={status:'draft'},uploadError=null,storedSize=PHOTO.length,storedMime='image/jpeg'}={}) {
  const writes=[]
  const storage={
    upload:async(path,blob,options)=>{
      writes.push({path,blob,options})
      return {error:uploadError}
    },
    info:async()=>({data:{size:storedSize,content_type:storedMime},error:null}),
  }
  const factory=new Function('createClient','transaction','getOwnerSession','validUuid',
    'PRIVATE_MEDIA_BUCKET','OWNER_PHOTO_MIME_TYPES','OWNER_PHOTO_PROXY_MAX_BYTES',
    'AppError','Buffer','Blob',model+'\nreturn uploadPrivateOwnerPhoto')
  const upload=factory(
    ()=>({storage:{from:bucket=>{assert.equal(bucket,'hh-client-private-media');return storage}}}),
    async(_config,_owner,cb)=>cb({query:async(_sql,[id,sessionId,clientId])=>({
      rows:asset&&asset.id===id&&asset.session_id===sessionId&&
        asset.legacy_client_id===clientId?[asset]:[],
    })}),
    async(_config,_store,clientId,sessionId)=>{
      if(clientId!==OWNER||sessionId!==SESSION)throw new AppError('SESSION_UNAVAILABLE',404)
      return session
    },
    ()=>true,'hh-client-private-media',OWNER_PHOTO_MIME_TYPES,OWNER_PHOTO_PROXY_MAX_BYTES,
    AppError,Buffer,Blob,
  )
  const call=(options={})=>upload({supabaseUrl:'https://synthetic.invalid',secretKey:'sb_secret_synthetic'},
    {},OWNER,SESSION,ASSET,{mime:'image/jpeg',body:PHOTO,...options})
  return {writes,call}
}

test('iPhone photographs are re-encoded into a first-party request well below Vercel limit',()=>{
  assert.equal(OWNER_PHOTO_PROXY_MAX_BYTES,3_000_000)
  for(const mime of OWNER_PHOTO_MIME_TYPES)
    assert.equal(canProxyOwnerPhoto({type:mime,size:2000}),true)
  for(const file of [{type:'image/heic',size:2000},{type:'image/svg+xml',size:2000},
    {type:'image/jpeg',size:OWNER_PHOTO_PROXY_MAX_BYTES+1},{type:'image/jpeg',size:50}])
    assert.equal(canProxyOwnerPhoto(file),false)
  const source=read('components/session-photo-uploader.jsx')
  assert.match(source,/canvas\.toBlob/)
  assert.match(source,/new File\(\[blob\],'consultation-photo\.jpg'/)
  assert.match(source,/for\(const side of \[2048,1792,1536,1280,1024\]\)/)
  assert.match(source,/sourcePhotoMime\(original\)/)
  assert.match(source,/jpeg:'image\/jpeg'/)
  assert.match(source,/canProxyOwnerPhoto\(blob\)/)
  assert.match(source,/credentials:'same-origin'/)
  assert.match(source,/body:blob/)
  assert.match(source,/encodeURIComponent\(intent\.assetId\)\+'\/upload'/)
  assert.doesNotMatch(source,/createClient\(|uploadToSignedUrl\(/)
  assert.match(source,/onClick=\{\(\)=>void upload\(failed\)\}/)
})

test('protected photo upload stores only the exact owner/client/session pending image',async()=>{
  const {call,writes}=harness()
  assert.deepEqual(await call(),{uploaded:true})
  assert.equal(writes.length,1)
  assert.equal(writes[0].path,base.object_key)
  assert.equal(writes[0].blob.size,PHOTO.length)
  assert.equal(writes[0].blob.type,'image/jpeg')
  assert.deepEqual(writes[0].options,{contentType:'image/jpeg',upsert:false,cacheControl:'0'})
})

test('invalid MIME, forged bytes, wrong session/owner, wrong kind, too large and archived are rejected before a write',async()=>{
  const failures=[
    [harness(),{mime:'image/svg+xml'},'MEDIA_TYPE_NOT_ALLOWED'],
    [harness(),{body:Buffer.alloc(500)},'MEDIA_TYPE_NOT_ALLOWED'],
    [harness(),{body:Buffer.alloc(3_000_001)},'MEDIA_SIZE_NOT_ALLOWED'],
    [harness(),{body:PHOTO.subarray(0,499)},'MEDIA_UNAVAILABLE'],
    [harness({asset:{...base,legacy_client_id:'other'}}),{},'MEDIA_UNAVAILABLE'],
    [harness({asset:{...base,asset_kind:'audio'}}),{},'MEDIA_UNAVAILABLE'],
    [harness({asset:{...base,scope:'practitioner',storage_provider:'external'}}),{},'MEDIA_UNAVAILABLE'],
    [harness({asset:{...base,status:'removed'}}),{},'MEDIA_UNAVAILABLE'],
    [harness({session:{status:'archived'}}),{},'MEDIA_UNAVAILABLE'],
  ]
  for(const [f,options,code] of failures){
    await assert.rejects(f.call(options),{code})
    assert.equal(f.writes.length,0,code)
  }
})

test('lost response and existing ready image never overwrite object or create a duplicate',async()=>{
  const ready=harness({asset:{...base,status:'ready'}})
  assert.deepEqual(await ready.call(),{uploaded:true,already:true})
  assert.equal(ready.writes.length,0)
  const duplicate=harness({uploadError:{message:'Object already exists'}})
  assert.deepEqual(await duplicate.call(),{uploaded:true,already:true})
  assert.equal(duplicate.writes.length,1)
  const mismatch=harness({uploadError:{message:'Object already exists'},storedSize:400})
  await assert.rejects(mismatch.call(),{code:'MEDIA_STORAGE_UNAVAILABLE'})
})

test('photo route keeps audio working and applies exact same-origin, byte cap and authorization',()=>{
  const route=read('app/api/admin/clients/[id]/sessions/[sessionId]/media/[assetId]/upload/route.js')
  assert.match(route,/ownerDelivery\(request/)
  assert.match(route,/isSameOriginRequest\(request\)/)
  assert.match(route,/sec-fetch-site/)
  assert.match(route,/OWNER_PHOTO_PROXY_MAX_BYTES/)
  assert.match(route,/const limit=photo\?OWNER_PHOTO_PROXY_MAX_BYTES:OWNER_AUDIO_PROXY_MAX_BYTES/)
  assert.match(route,/request\.body\.getReader\(\)/)
  assert.match(route,/Number\(declared\)!==size/)
  assert.match(route,/uploadPrivateOwnerPhoto\(/)
  assert.match(route,/uploadPrivateOwnerAudio\(/)
  assert.doesNotMatch(route,/NEXT_PUBLIC_.*SECRET|createSignedUploadUrl/)
})
