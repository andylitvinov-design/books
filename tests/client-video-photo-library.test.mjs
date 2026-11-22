import assert from 'node:assert/strict'
import {test} from 'node:test'
import {readFileSync} from 'node:fs'
import {
 MAX_VIDEO_PHOTOS,MAX_VIDEO_PHOTO_INPUT_BYTES,MAX_VIDEO_PHOTO_BYTES,
 savedVideoPhotos,videoPhotoKey,videoPhotoPrefix,requireVideoPhotoPermission
} from '../lib/app/client-video-photo-contract.mjs'
const account='20212121-aaaa-4aaa-8aaa-202121212121'
const id='f'.repeat(64)
test('owner scoped keys and strict hash IDs',()=>{
  assert.equal(videoPhotoPrefix(account),'client-video-photos/'+account+'/')
  assert.equal(videoPhotoKey(account,id),'client-video-photos/'+account+'/'+id+'.jpg')
  for(const bad of ['../support-photo/a','F'.repeat(64),'a'.repeat(63),'a'.repeat(64)+'.jpg','/']){
    assert.throws(()=>videoPhotoKey(account,bad))
  }
  assert.throws(()=>videoPhotoPrefix('other-account'))
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
