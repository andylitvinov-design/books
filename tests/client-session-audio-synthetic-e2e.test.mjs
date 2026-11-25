import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {randomUUID} from 'node:crypto'
import {normalizePhoneAudioFile} from '../lib/clients/phone-audio-file.js'
import {recordingUpload,saveRecording} from '../lib/clients/recording-upload.js'
import {canProxyOwnerAudio,OWNER_AUDIO_MIME_TYPES,OWNER_AUDIO_PROXY_MAX_BYTES} from '../lib/clients/owner-audio-upload.js'
import {PRIVATE_MEDIA_BUCKET,SESSION_MEDIA_TYPES,validUuid,emptySessionDraft,
  normalizeDraft,clientPayload,guestSessionProjection} from '../lib/clients/delivery-model.js'

// Real 0.03s AAC-LC M4A generated from an artificial 440Hz sine. No patient data,
// microphone permissions, live application credentials or production backend.
const wavLike=Buffer.from(readFileSync(new URL('./fixtures/synthetic-440hz-voice.m4a.base64',import.meta.url),'utf8').trim(),'base64')
assert.equal(wavLike.toString('ascii',4,8),'ftyp')
class FakeFile extends Blob{
  constructor(parts,name,options={}){super(parts,{type:options.type||''});this.name=name;this.lastModified=options.lastModified||0}
}
class AppError extends Error{
  constructor(code,status){super(code);this.name='AppError';this.code=code;this.status=status}
}
const CLIENT='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const CLIENT_B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const SESSION='cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const config={secretKey:'sb_secret_synthetic_only',supabaseUrl:'https://storage.synthetic.invalid',publishableKey:'synthetic-public'}
const storageSource=readFileSync(new URL('../lib/clients/session-delivery-storage.js',import.meta.url),'utf8')
const storageJs=storageSource.replace(/^import .*\n/gm,'')
  .replace(/^export \{.*\}\r?\n/gm,'').replace(/^export /gm,'')

function harness(){
  const rows=new Map(),objects=new Map(),draft=emptySessionDraft({title:'Synthetic consultation'}),requests=[]
  let published=null
  const session={id:SESSION,status:'draft',draft,assets:[]}
  const validOwner=(clientId,sessionId)=>{
    if(clientId!==CLIENT||sessionId!==SESSION||session.status==='archived')
      throw new AppError('SESSION_UNAVAILABLE',404)
  }
  const getOwnerSession=async(_,__,clientId,sessionId)=>{
    validOwner(clientId,sessionId)
    return session
  }
  const getSessionAsset=async(_,clientId,sessionId,assetId)=>{
    validOwner(clientId,sessionId)
    const asset=rows.get(assetId)
    if(!asset||asset.status!=='ready'||asset.legacy_client_id!==clientId||asset.session_id!==sessionId)
      throw new AppError('MEDIA_UNAVAILABLE',404)
    return asset
  }
  const attachSessionAsset=async(_,__,clientId,sessionId,assetId)=>{
    validOwner(clientId,sessionId)
    const asset=await getSessionAsset(null,clientId,sessionId,assetId)
    if(!draft.media.some(x=>x.assetId===assetId)){
      draft.media.push({assetId,scope:asset.scope,title:asset.scope==='client'?'Voice message':'Private voice note',
        transcript:'',role:'personal',sortOrder:draft.media.length})
    }
    return {id:assetId,attached:true}
  }
  const storage={
    getBucket:async()=>({data:{public:false},error:null}),
    createSignedUploadUrl:async()=>({data:{token:'synthetic-create-only-token'},error:null}),
    upload:async(key,blob,{contentType,upsert})=>{
      assert.equal(upsert,false)
      if(objects.has(key))return {error:new Error('Already exists')}
      objects.set(key,{bytes:Buffer.from(await blob.arrayBuffer()),mime:contentType})
      return {error:null}
    },
    info:async key=>{
      const object=objects.get(key)
      return object?{data:{size:object.bytes.length,content_type:object.mime},error:null}:
        {data:null,error:new Error('Not found')}
    },
    createSignedUrl:async key=>({data:{signedUrl:'https://storage.synthetic.invalid/asset?key='+encodeURIComponent(key)+'&token=synthetic'},error:null}),
  }
  const fakeFetch=async(url,opts={})=>{
    const target=new URL(String(url))
    assert.equal(target.origin,config.supabaseUrl)
    const object=objects.get(target.searchParams.get('key'))
    if(!object)throw new Error('Unexpected missing synthetic object')
    const bytes=object.bytes
    const range=opts.headers?.Range||opts.headers?.range
    requests.push({method:opts.method||'GET',range:range||null})
    if(opts.method==='HEAD')
      return new Response(null,{status:200,headers:{'content-length':String(bytes.length),'content-type':object.mime}})
    if(range){
      const match=/^bytes=(\d+)-(\d+)$/.exec(range)
      if(!match)throw new Error('Unexpected synthetic Range')
      const start=Number(match[1]),end=Math.min(Number(match[2]),bytes.length-1)
      return new Response(bytes.subarray(start,end+1),{status:206,
        headers:{'content-range':`bytes ${start}-${end}/${bytes.length}`,
          'content-length':String(end-start+1),'content-type':object.mime,
          location:'https://storage.synthetic.invalid/secret','set-cookie':'test-secret=yes'}})
    }
    return new Response(bytes,{status:200,headers:{'content-length':String(bytes.length),'content-type':object.mime}})
  }
  const transaction=async(_cfg,_actor,callback)=>callback({query:async(sql,args=[])=>{
    if(sql.startsWith('select count(*)::integer as n from app_private.client_delivery_assets'))
      return {rows:[{n:[...rows.values()].filter(x=>x.session_id===args[0]&&x.status==='pending').length}]}
    if(sql.startsWith('select * from app_private.client_delivery_assets where id=$1')){
      const row=rows.get(args[0])
      return {rows:row&&((args.length===1)||(row.session_id===args[1]&&row.legacy_client_id===args[2]))?[row]:[]}
    }
    if(sql.startsWith('insert into app_private.client_delivery_assets')){
      const [id,clientId,sessionId,kind,scope,key,mime,bytes]=args
      rows.set(id,{id,legacy_client_id:clientId,session_id:sessionId,asset_kind:kind,scope,
        object_key:key,mime,max_bytes:bytes,status:'pending',storage_provider:'supabase',
        created_at:new Date().toISOString()})
      return {rowCount:1}
    }
    if(sql.startsWith("update app_private.client_delivery_assets set status='ready'")){
      const row=rows.get(args[0])
      if(!row||row.session_id!==args[1]||row.legacy_client_id!==args[2]||row.status!=='pending')
        return {rowCount:0}
      row.status='ready';row.bytes=args[3];row.duration_seconds=args[4]
      return {rowCount:1}
    }
    if(sql.startsWith('select status from app_private.client_delivery_assets'))
      return {rows:[{status:rows.get(args[0])?.status}]}
    throw new Error('Unexpected synthetic SQL: '+sql.slice(0,100))
  }})
  const imports={
    randomUUID,createClient:()=>({storage:{getBucket:storage.getBucket,
      from:bucket=>{assert.equal(bucket,PRIVATE_MEDIA_BUCKET);return storage}}}),
    AppError,transaction,PRIVATE_MEDIA_BUCKET,SESSION_MEDIA_TYPES,validUuid,getOwnerSession,
    attachSessionAsset,getSessionAsset,configuredVideoUploadStore:()=>null,
    OWNER_AUDIO_MIME_TYPES,OWNER_AUDIO_PROXY_MAX_BYTES,fetch:fakeFetch,
  }
  const factory=new Function(...Object.keys(imports),
    storageJs+'\nreturn {createPrivateMediaIntent,uploadPrivateOwnerAudio,completePrivateMedia,privateMediaStream,checkPrivateMediaStorage}')
  const services=factory(...Object.values(imports))
  const post=async(url,data)=>{
    assert.equal(url,`/api/admin/clients/${CLIENT}/sessions/${SESSION}/media`)
    if(data.action==='intent')
      return services.createPrivateMediaIntent(config,null,CLIENT,SESSION,data)
    if(data.action==='complete')
      return services.completePrivateMedia(config,null,CLIENT,SESSION,data.assetId,
        {durationSeconds:data.durationSeconds})
    throw new Error('Unexpected synthetic action '+data.action)
  }
  const upload=async(intent,file,mime)=>{
    assert.equal(intent.provider,undefined)
    assert.equal(canProxyOwnerAudio(file),true)
    assert.equal(file.type,mime)
    const output=await services.uploadPrivateOwnerAudio(config,null,CLIENT,SESSION,intent.assetId,
      {mime,body:Buffer.from(await file.arrayBuffer())})
    assert.equal(output.uploaded,true)
  }
  const publish=()=>{
    published=clientPayload(normalizeDraft(draft))
    session.status='published'
    return guestSessionProjection({id:SESSION,occurredOn:'2026-10-18',...published,
      media:published.media.map(x=>({...x,kind:'audio',mime:'audio/mp4',durationSeconds:null}))})
  }
  return {rows,objects,draft,session,services,post,upload,publish,requests,
    get published(){return published}}
}

const importMemo=(content=wavLike)=>normalizePhoneAudioFile(
  new FakeFile([content],'Voice Memo.m4a',{type:''}),FakeFile)

test('real AAC Voice Memo: private intent -> same-origin upload -> verification -> ready -> explicit client publishing -> Range playback',async()=>{
  const f=harness()
  assert.equal(await f.services.checkPrivateMediaStorage(config),true,
    'the synthetic private bucket passes the identical recorder readiness preflight')
  const file=importMemo()
  assert.equal(file.type,'audio/mp4')
  assert.equal(file.size,wavLike.length)
  const job=recordingUpload({file,clientId:CLIENT,sessionId:SESSION,scope:'client'})
  assert.equal(f.draft.media.length,0)
  assert.equal(f.published,null)
  await saveRecording(job,{post:f.post,upload:f.upload})
  assert.equal(job.uploaded,true)
  assert.equal(f.rows.get(job.intent.assetId)?.status,'ready')
  assert.equal(f.objects.size,1)
  assert.equal(f.draft.media.length,1)
  assert.equal(f.published,null,'draft attachment is not client publication')
  await saveRecording(job,{post:f.post,upload:f.upload})
  assert.equal(f.draft.media.length,1,'retry does not duplicate attachment')
  assert.equal(f.objects.size,1,'retry does not duplicate upload')
  const guest=f.publish()
  assert.equal(guest.media.length,1)
  assert.equal(guest.media[0].assetId,job.intent.assetId)
  assert.equal(guest.media[0].kind,'audio')
  assert.equal(guest.media[0].title,'Voice message')
  assert.equal(JSON.stringify(guest).includes(CLIENT),false)
  const range=new Request('https://app.synthetic.invalid/client/audio',
    {headers:{Range:'bytes=0-127'}})
  const partial=await f.services.privateMediaStream(config,CLIENT,SESSION,job.intent.assetId,range)
  assert.equal(partial.status,206)
  assert.equal(partial.headers.get('content-range'),`bytes 0-127/${wavLike.length}`)
  assert.equal(partial.headers.get('content-type'),'audio/mp4')
  assert.equal(partial.headers.get('location'),null)
  assert.equal(partial.headers.get('set-cookie'),null)
  assert.deepEqual(Buffer.from(await partial.arrayBuffer()),wavLike.subarray(0,128))
  const head=await f.services.privateMediaStream(config,CLIENT,SESSION,job.intent.assetId,
    new Request('https://app.synthetic.invalid/client/audio',{method:'HEAD'}))
  assert.equal(head.status,200)
  assert.equal(head.body,null)
  const bad=await f.services.privateMediaStream(config,CLIENT,SESSION,job.intent.assetId,
    new Request('https://app.synthetic.invalid/client/audio',{headers:{Range:`bytes=${wavLike.length}-`}}))
  assert.equal(bad.status,416)
  await assert.rejects(f.services.privateMediaStream(config,CLIENT_B,SESSION,job.intent.assetId,range),
    {code:'SESSION_UNAVAILABLE'})
})

test('a practitioner-only Voice Memo never reaches a published client snapshot',async()=>{
  const f=harness(),file=importMemo()
  const job=recordingUpload({file,clientId:CLIENT,sessionId:SESSION,scope:'practitioner'})
  await saveRecording(job,{post:f.post,upload:f.upload})
  assert.equal(f.draft.media.length,1)
  const guest=f.publish()
  assert.equal(guest.media.length,0)
  assert.equal(JSON.stringify(guest).includes('Private voice note'),false)
})

test('forged M4A with HTML bytes cannot finalize or become visible in the report',async()=>{
  const f=harness(),file=importMemo(Buffer.alloc(wavLike.length,0x3c))
  const job=recordingUpload({file,clientId:CLIENT,sessionId:SESSION,scope:'client'})
  await assert.rejects(saveRecording(job,{post:f.post,upload:f.upload}),{code:'MEDIA_TYPE_NOT_ALLOWED'})
  assert.equal(f.rows.get(job.intent.assetId)?.status,'pending')
  assert.equal(f.draft.media.length,0)
  assert.equal(f.publish().media.length,0)
})
