import assert from 'node:assert/strict'
import {test} from 'node:test'
import {readFileSync} from 'node:fs'
import {createHash,randomUUID} from 'node:crypto'
import {runInNewContext} from 'node:vm'
import ts from 'typescript'
import sharp from 'sharp'
import {NextResponse} from 'next/server.js'
import {AppError} from '../lib/assessments/contracts.js'
import {PRIVATE_HEADERS,safeError} from '../lib/app/http.js'
import * as photoContract from '../lib/app/client-video-photo-contract.mjs'
import {
 MAX_VIDEO_PHOTOS,MAX_VIDEO_PHOTO_INPUT_BYTES,MAX_VIDEO_PHOTO_BYTES,
 savedVideoPhotos,videoPhotoKey,videoPhotoPrefix,requireVideoPhotoPermission
} from '../lib/app/client-video-photo-contract.mjs'
const account='20212121-aaaa-4aaa-8aaa-202121212121'
const id='f'.repeat(64)

// Execute the actual multipart route against a deterministic private object
// store. Authentication and DB transport are synthetic; JPEG normalization,
// ownership paths, repeat saves, fresh reads and delete behavior are real code.
function photoRoute(objects){
  const origin='https://holistichouse.vercel.app'
  const storage={
    async list(prefix){const folder=prefix.replace(/\/$/,'')+'/'
      return {data:[...objects].filter(([key])=>key.startsWith(folder))
        .map(([key,bytes])=>({name:key.slice(folder.length),metadata:{size:bytes.length}}))}},
    async upload(key,bytes,options){
      assert.equal(options.upsert,false)
      if(objects.has(key))return {error:{status:409}}
      objects.set(key,Buffer.from(bytes));return {}
    },
    async createSignedUrl(key){
      assert.ok(objects.has(key),'only existing owned objects may be signed')
      return {data:{signedUrl:'https://abcdefghijklmnopqrst.supabase.co/storage/v1/object/sign/'+key+'?token=synthetic'}}
    },
    async remove(keys){for(const key of keys)objects.delete(key);return {}},
  }
  const config={supabaseUrl:'https://abcdefghijklmnopqrst.supabase.co',secretKey:'synthetic-not-a-credential'}
  const modules={
    'node:crypto':{createHash},'next/server':{NextResponse},sharp:{default:sharp},
    '@/lib/app/config':{
      getAppConfig:()=>config,
      requestOrigin:()=>origin,
      requireSameOrigin:request=>{if(request.headers.get('origin')!==origin)throw new AppError('ORIGIN_DENIED',403)},
    },
    '@/lib/app/session':{createRequestAuth:request=>({
      async verified(){const id=request.headers.get('x-test-owner');if(!id)throw new AppError('AUTH_REQUIRED',401);return {id}},
      apply:response=>response,
    })},
    '@/lib/app/database':{
      transaction:async(_config,_actor,work)=>work({query:async sql=>{
        if(sql.includes('account_active'))return {rows:[{active:true}]}
        assert.ok(sql.includes('pg_advisory_xact_lock'))
        return {rows:[]}
      }}),consumeRate:async()=>{},
    },
    '@/lib/clients/session-delivery-storage':{
      createPrivateStorageClient:()=>({storage:{from:bucket=>{assert.equal(bucket,'hh-client-private-media');return storage}}}),
      checkPrivateMediaStorage:async()=>{},
    },
    '@/lib/app/http':{PRIVATE_HEADERS,safeError},
    '@/lib/assessments/contracts':{AppError},
    '@/lib/app/client-video-photo-contract.mjs':photoContract,
  }
  const runtime={exports:{},Buffer,URL,process:{env:{}},require(name){
    assert.ok(Object.hasOwn(modules,name),name);return modules[name]
  }}
  const source=readFileSync(new URL('../app/api/app/video-photos/route.js',import.meta.url),'utf8')
  runInNewContext(ts.transpileModule(source,{compilerOptions:{
    module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,
  }}).outputText,runtime)
  return runtime.exports
}
function photoRequest(owner,method='GET',body,search=''){
  return new Request('https://holistichouse.vercel.app/api/app/video-photos'+search,{
    method,headers:{origin:'https://holistichouse.vercel.app',...(owner?{'x-test-owner':owner}:{})},body,
  })
}
test('photo upload survives a fresh route read, deduplicates and stays in the owning account',async()=>{
  const objects=new Map()
  const endpoint=photoRoute(objects)
  const jpeg=await sharp({create:{width:24,height:24,channels:3,background:'#867354'}}).jpeg().toBuffer()
  const upload=()=>{const form=new FormData();form.set('photo',new Blob([jpeg],{type:'image/jpeg'}),'photo.jpg')
    form.set('cloudConsent','true');form.set('photoRights','true');form.set('subject','self');return form}
  const first=await endpoint.POST(photoRequest(account,'POST',upload()))
  assert.equal(first.status,200)
  const saved=await first.json()
  assert.equal(saved.saved,true);assert.equal(saved.alreadySaved,false)
  assert.equal(objects.size,1)
  assert.ok(objects.has(videoPhotoKey(account,saved.id)))
  const repeated=await endpoint.POST(photoRequest(account,'POST',upload()))
  assert.equal(repeated.status,200)
  const repeat=await repeated.json()
  assert.equal(repeat.id,saved.id);assert.equal(repeat.alreadySaved,true);assert.equal(objects.size,1)
  const reopened=photoRoute(objects)
  const ownList=await reopened.GET(photoRequest(account))
  assert.equal(ownList.status,200)
  assert.equal(ownList.headers.get('cache-control'),PRIVATE_HEADERS['Cache-Control'])
  assert.equal((await ownList.json()).photos[0].id,saved.id)
  const other=randomUUID()
  assert.deepEqual((await (await reopened.GET(photoRequest(other))).json()).photos,[])
  assert.equal((await reopened.GET(photoRequest(other,'GET',undefined,'?id='+saved.id))).status,404)
  assert.equal((await reopened.DELETE(photoRequest(other,'DELETE',undefined,'?id='+saved.id))).status,404)
  assert.equal(objects.size,1)
  assert.equal((await reopened.GET(photoRequest(null))).status,401)
  assert.equal((await reopened.DELETE(photoRequest(account,'DELETE',undefined,'?id='+saved.id))).status,200)
  assert.deepEqual((await (await photoRoute(objects).GET(photoRequest(account))).json()).photos,[])
})
test('owner scoped keys and strict hash IDs',()=>{
  assert.equal(videoPhotoPrefix(account),'client-video-photos/'+account+'/')
  assert.equal(videoPhotoKey(account,id),'client-video-photos/'+account+'/'+id+'.jpg')
  for(const bad of ['../support-photo/a','F'.repeat(64),'a'.repeat(63),'a'.repeat(64)+'.jpg','/']){
    assert.throws(()=>videoPhotoKey(account,bad))
  }
  assert.throws(()=>videoPhotoPrefix('other-account'))
})
test('ordinary authenticated UUIDs work and incomplete UUIDs cannot become owner prefixes',()=>{
  for(const owner of [randomUUID(),account,account.toUpperCase(),
    '20212121-aaaa-7aaa-baaa-202121212121']){
    assert.equal(videoPhotoPrefix(owner),'client-video-photos/'+owner+'/')
    assert.equal(videoPhotoKey(owner,id),'client-video-photos/'+owner+'/'+id+'.jpg')
  }
  for(const invalid of ['20212121-aaaa-4aaa-8202121212121',
    '20212121-aaaa-4aaa-8aaa202121212121',account+'/',account+'/../other',
    '20212121-aaaa-4aaa-caaa-202121212121','20212121-aaaa-0aaa-8aaa-202121212121']){
    assert.throws(()=>videoPhotoPrefix(invalid),/INVALID_ACCOUNT/)
  }
})
test('listing excludes nested, nonphotos and forged object paths',()=>{
  const list=savedVideoPhotos([{name:id+'.jpg',created_at:'2026-11-21',metadata:{size:1500}},
    {name:'../'+id+'.jpg'},{name:id+'.png'},{name:id+'.jpg/evil'},{name:'portrait.jpg'}])
  assert.deepEqual(list,[{id,bytes:1500,createdAt:'2026-11-21'}])
})
test('consent is separate from AI and enforces adult or guardian permission',()=>{
  const base={cloudConsent:'true',photoRights:'true',subject:'self'}
  assert.equal(requireVideoPhotoPermission(base),'self')
  for(const x of [{...base,cloudConsent:'false'},{...base,photoRights:'false'},
      {...base,subject:'other'},{...base,subject:'minor',subjectConsent:'true'},
      {...base,subject:'other',subjectConsent:'false'},{...base,subject:'unknown'}])
    assert.throws(()=>requireVideoPhotoPermission(x))
  assert.equal(requireVideoPhotoPermission({...base,subject:'minor',subjectConsent:'true',guardianConsent:'true'}),'minor')
})
test('bounded local-first endpoint and isolated permission contract',()=>{
  assert.equal(MAX_VIDEO_PHOTOS,8)
  assert.ok(MAX_VIDEO_PHOTO_INPUT_BYTES<=1_500_000)
  assert.ok(MAX_VIDEO_PHOTO_BYTES<=1_450_000)
  const route=readFileSync(new URL('../app/api/app/video-photos/route.js',import.meta.url),'utf8')
  assert.match(route,/requireSameOrigin\(request,config\)/)
  assert.match(route,/await auth\.verified\(\)/)
  assert.match(route,/app_private\.account_active\(\)/)
  assert.match(route,/pg_advisory_xact_lock/)
  assert.match(route,/upsert:false/)
  assert.match(route,/createSignedUrl/)
  assert.doesNotMatch(route,/getPublicUrl|heygen|publishableUrl|service_role/i)
})

test('saved owner photos can be picked in the existing Video Gift without AI transmission',()=>{
  const gift=readFileSync(new URL('../components/mandala-video-gift.tsx',import.meta.url),'utf8')
  assert.match(gift,/VideoPhotoLibrary = dynamic/)
  assert.match(gift,/onSelectPhoto=\{file=>\{void choosePhoto\(file\)\}\}/)
  assert.match(gift,/disabled=\{photoBusy\}/)
  assert.doesNotMatch(gift,/fetch\([^\n]*heygen/i)
})
