import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash,createHmac} from 'node:crypto'
// Evaluate the known module with its server-only import stripped so this test
// runs under ordinary node --test as well as --conditions=react-server.
class AppError extends Error {constructor(code,status){super(code);this.code=code;this.status=status}}
const source=readFileSync(new URL('../lib/clients/private-video-object-store.js',import.meta.url),'utf8')
const {configuredVideoUploadStore,signPrivateVideoRequest,createVideoUploadUrl,createVideoReadUrl}=
  new Function('createHash','createHmac','AppError',
    source.replace(/^import .*\n/gm,'').replace(/^export /gm,'')+
    '\nreturn {configuredVideoUploadStore,signPrivateVideoRequest,createVideoUploadUrl,createVideoReadUrl}'
  )(createHash,createHmac,AppError)
const env={
  HH_CLIENT_VIDEO_EXTERNAL_ENABLED:'true',HH_CLIENT_VIDEO_BACKEND:'r2',
  HH_CLIENT_VIDEO_R2_ACCOUNT_ID:'abcdef0123456789abcdef0123456789',
  HH_CLIENT_VIDEO_BUCKET:'hh-private-video-test',
  HH_CLIENT_VIDEO_ACCESS_KEY_ID:'synthetic-access-id',
  HH_CLIENT_VIDEO_SECRET_ACCESS_KEY:'synthetic-never-real-secret',
}
const key='12345678-1234-4234-8234-123456789abc/12345678-1234-4234-8234-123456789abd.mp4'
test('external video is disabled by default and credentials are never needed for Supabase assets',()=>{
  assert.equal(configuredVideoUploadStore({}),null)
  assert.equal(configuredVideoUploadStore({...env,HH_CLIENT_VIDEO_EXTERNAL_ENABLED:'false'}),null)
  assert.equal(configuredVideoUploadStore(env).provider,'r2')
})
test('only exact approved private R2 or Canada S3 endpoint may be signed',()=>{
  const url=new URL(createVideoUploadUrl('r2',key,env))
  assert.equal(url.hostname,env.HH_CLIENT_VIDEO_R2_ACCOUNT_ID+'.r2.cloudflarestorage.com')
  assert.equal(url.pathname,'/hh-private-video-test/'+key)
  assert.equal(url.searchParams.get('X-Amz-Expires'),'900')
  assert.equal(url.searchParams.get('X-Amz-SignedHeaders'),'content-type;host;if-none-match')
  assert.ok(url.searchParams.get('X-Amz-Signature')?.length===64)
  assert.equal(url.href.includes(env.HH_CLIENT_VIDEO_SECRET_ACCESS_KEY),false)
  const ca={...env,HH_CLIENT_VIDEO_BACKEND:'s3_ca'}
  assert.equal(new URL(signPrivateVideoRequest('s3_ca',key,{env:ca})).hostname,'s3.ca-central-1.amazonaws.com')
  assert.throws(()=>signPrivateVideoRequest('r2',key,{env:ca}))
})
test('SigV4 signs method, key, content type and TTL; rejects unsafe paths',()=>{
  const at=new Date('2026-10-15T22:01:00Z')
  const put=signPrivateVideoRequest('r2',key,{method:'PUT',mime:'video/mp4',expires:180,at,env})
  const get=signPrivateVideoRequest('r2',key,{method:'GET',expires:180,at,env})
  const head=signPrivateVideoRequest('r2',key,{method:'HEAD',expires:180,at,env})
  assert.notEqual(put,get);assert.notEqual(get,head)
  assert.equal(new URL(put).searchParams.get('X-Amz-Date'),'20261015T220100Z')
  assert.equal(new URL(get).searchParams.get('X-Amz-SignedHeaders'),'host')
  // The upload signature binds the create-only header; a server-issued PUT
  // may not silently overwrite any ready/published recording.
  assert.equal(new URL(put).searchParams.get('X-Amz-SignedHeaders'),'content-type;host;if-none-match')
  assert.throws(()=>signPrivateVideoRequest('r2',key,{method:'PUT',expires:180,at,env}))
  assert.throws(()=>signPrivateVideoRequest('r2','../../private.mp4',{env}))
  assert.throws(()=>signPrivateVideoRequest('r2',key,{expires:3601,env}))
  assert.throws(()=>signPrivateVideoRequest('r2',key,{method:'PUT',mime:'application/pdf',env}))
})
test('iPhone external PUT sends immutable object condition',()=>{
  const recorder=readFileSync(new URL('../components/session-audio-recorder.jsx',import.meta.url),'utf8')
  assert.match(recorder,/setRequestHeader\('If-None-Match','\*'\)/)
  assert.match(recorder,/setRequestHeader\('Content-Type',mime\)/)
})
test('existing session readers always use server-authorized streaming; not R2 bearer URLs',()=>{
  for(const route of [
    '../app/api/client-session-viewer/[selector]/media/[assetId]/route.js',
    '../app/api/client/[selector]/sessions/[sessionId]/media/[assetId]/route.js',
    '../app/api/app/saved-sessions/[id]/media/[assetId]/route.js'
  ]) {
    const text=readFileSync(new URL(route,import.meta.url),'utf8')
    assert.match(text,/privateMediaStream/)
    assert.doesNotMatch(text,/createVideoReadUrl/)
  }
})

const storageSource=readFileSync(new URL('../lib/clients/session-delivery-storage.js',import.meta.url),'utf8')
const loadStorage=(names,values,symbol)=>new Function(...names,
  storageSource.replace(/^import .*\n/gm,'').replace(/^export /gm,'')+'\nreturn '+symbol
)(...values)
test('gated external intent accepts larger MP4 without invoking Supabase Storage and binds one session',async()=>{
  const inserted=[]
  const query=async(sql,params)=>{
    if(sql.startsWith('select count'))return {rows:[{n:0}]}
    if(sql.startsWith('insert into')){inserted.push({sql,params});return {rows:[]}}
    throw Error('Unexpected SQL: '+sql)
  }
  const create=loadStorage(
    ['AppError','SESSION_MEDIA_TYPES','randomUUID','getOwnerSession','configuredVideoUploadStore','createVideoUploadUrl','transaction','validUuid'],
    [AppError,{'video/mp4':{kind:'video',ext:'mp4',max:45_000_000}},
      ()=>'12345678-1234-4234-8234-123456789abc',
      async()=>({status:'draft',assets:[],draft:{media:[]}}),
      ()=>({provider:'r2'}),()=> 'https://private.invalid/signed',
      async(_config,_actor,fn)=>fn({query}),()=>true],
    'createPrivateMediaIntent'
  )
  const result=await create({},null,'client-a','session-a',{kind:'video',mime:'video/mp4',bytes:90_000_000,scope:'client'})
  assert.equal(result.provider,'external')
  assert.equal(result.maxBytes,200_000_000)
  assert.equal(result.uploadUrl,'https://private.invalid/signed')
  assert.equal(result.supabaseUrl,undefined)
  assert.equal(inserted.length,1)
  assert.match(inserted[0].sql,/storage_provider/)
  assert.deepEqual(inserted[0].params.slice(1,5),['client-a','session-a','video','client'])
  assert.equal(inserted[0].params.at(-1),'r2')
})
test('external media HEAD/ftyp confirmation must match exact intended bytes before attachment',async()=>{
  let attached=0,inspected=0,sniffed=0,updated=0
  const asset={id:'asset',legacy_client_id:'client-a',session_id:'session-a',status:'pending',
    storage_provider:'r2',object_key:'synthetic.mp4',max_bytes:90_000_000,mime:'video/mp4'}
  const run=(size=90_000_000)=>loadStorage(
    ['AppError','validUuid','getOwnerSession','transaction','inspectUploadedVideo','verifyUploadedVideoHeader','attachSessionAsset'],
    [AppError,()=>true,async()=>({}),
      async(_cfg,_actor,fn)=>fn({query:async sql=>{
        if(sql.startsWith('select *'))return {rows:[asset]}
        if(sql.startsWith('update')){updated++;return {rowCount:1}}
        return {rows:[]}
      }}),
      async()=>{inspected++;return {bytes:size,mime:'video/mp4'}},
      async()=>{sniffed++;return true},
      async()=>{attached++;return {attached:true}}],'completePrivateMedia'
  )
  await assert.rejects(run(80_000_000)({},null,'client-a','session-a','asset'),{code:'MEDIA_SIZE_NOT_ALLOWED'})
  assert.equal(sniffed,0);assert.equal(attached,0)
  await run()({},null,'client-a','session-a','asset')
  assert.equal(inspected,2)
  assert.equal(sniffed,1);assert.equal(updated,1);assert.equal(attached,1)
})

test('a ready external asset never issues another signed PUT or exposes its object path',async()=>{
  let presigned=0
  const existing={id:'asset-1',legacy_client_id:'client-a',session_id:'session-a',
    scope:'client',mime:'video/mp4',asset_kind:'video',max_bytes:512,
    status:'ready',storage_provider:'r2',object_key:key,created_at:new Date().toISOString()}
  const create=loadStorage(
    ['AppError','SESSION_MEDIA_TYPES','getOwnerSession','configuredVideoUploadStore',
     'transaction','validUuid','createVideoUploadUrl'],
    [AppError,{'video/mp4':{kind:'video',ext:'mp4',max:45_000_000}},
     async()=>({status:'published',assets:[],draft:{media:[]}}),
     ()=>({provider:'r2'}),
     async(_cfg,_actor,fn)=>fn({query:async()=>({rows:[existing]})}),
     ()=>true,()=>{presigned++;return 'https://synthetic.invalid/upload'}],
    'createPrivateMediaIntent'
  )
  const result=await create({},null,'client-a','session-a',{
    intentId:'intent-1',mime:'video/mp4',kind:'video',scope:'client',bytes:512,
  })
  assert.equal(result.ready,true)
  assert.equal(result.assetId,'asset-1')
  assert.equal(result.uploadUrl,undefined)
  assert.equal(result.objectKey,undefined)
  assert.equal(presigned,0)
})

test('owner media preflight exposes safe size/provider metadata, never credentials',()=>{
  const route=readFileSync(new URL('../app/api/admin/clients/[id]/sessions/status/route.js',import.meta.url),'utf8')
  const recorder=readFileSync(new URL('../components/session-audio-recorder.jsx',import.meta.url),'utf8')
  assert.match(route,/requireAdminRequest/)
  assert.match(route,/checkPrivateMediaStorage/)
  assert.match(route,/videoProvider,videoLimitBytes/)
  assert.match(route,/videoReady/)
  assert.doesNotMatch(route,/secretAccessKey|HH_CLIENT_VIDEO_SECRET_ACCESS_KEY/)
  assert.match(recorder,/availability\.videoLimitBytes/)
  assert.match(recorder,/videoReady===false/)
  assert.match(recorder,/await checkReady\(\)/)
})

test('new MP4 uploads fail closed without approved external storage, never silently filling Supabase',async()=>{
  let sessionReads=0,dbReads=0
  const create=loadStorage(
    ['AppError','SESSION_MEDIA_TYPES','configuredVideoUploadStore','getOwnerSession','transaction','process'],
    [AppError,{'video/mp4':{kind:'video',ext:'mp4',max:45_000_000}},
      ()=>null,async()=>{sessionReads++;return {}},
      async()=>{dbReads++;throw Error('Unexpected DB operation')},{env:{}}],
    'createPrivateMediaIntent'
  )
  await assert.rejects(create({},null,'client-a','session-a',{
    mime:'video/mp4',kind:'video',scope:'client',bytes:2048,
  }),{code:'MEDIA_STORAGE_NOT_CONFIGURED'})
  assert.equal(sessionReads,0)
  assert.equal(dbReads,0)
})
test('admin client media preflight reports fail-closed MP4, while keeping audio separate',()=>{
  const route=readFileSync(new URL('../app/api/admin/clients/[id]/sessions/status/route.js',import.meta.url),'utf8')
  assert.match(route,/videoProvider='unavailable',videoLimitBytes=0,videoReady=false/)
  assert.match(route,/HH_CLIENT_VIDEO_SUPABASE_UPLOADS_ALLOWED==='true'/)
  assert.match(route,/videoReady=true/)
})

test('iPhone editor shows gated video status immediately and checks each selected file once',()=>{
  const source=readFileSync(new URL('../components/session-audio-recorder.jsx',import.meta.url),'utf8')
  const choose=source.slice(source.indexOf('async function chooseFile('),source.indexOf("const busy=['preparing'"))
  assert.equal((choose.match(/await checkReady\(\)/g)||[]).length,1)
  assert.match(source,/videoStatus\?\.ready===false/)
  assert.match(source,/fetch\('\/api\/admin\/clients\/')
  assert.match(source,/video\/quicktime/)
  assert.match(source,/uploadProgress/)
})
