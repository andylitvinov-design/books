import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { publicServicePhotoUrl } from '../lib/practitioners/public-service-media.mjs'
import { normalizeVideoPresentation, publicPresentationUrl } from '../lib/practitioners/presentation-contract.js'

const project='https://provider.example.supabase.co'
const account='11111111-1111-4111-8111-111111111111'
const object='22222222-2222-4222-8222-222222222222'
const publicPhoto=`${project}/storage/v1/object/public/hh-service-photos/${account}/${object}.jpg`

test('approved practitioner photo upload is visible with no signed tokens',()=>{
 assert.equal(publicServicePhotoUrl(publicPhoto,project),publicPhoto)
 assert.equal(publicServicePhotoUrl('/images/holistic-house/hero-olive-incense.webp',project),
  '/images/holistic-house/hero-olive-incense.webp')
 assert.equal(publicServicePhotoUrl('/api/public/example.jpg',project),'/api/public/example.jpg')
})

test('strict URL allowlist blocks foreign private signed and arbitrary objects',()=>{
 const bad=[
  'https://other.supabase.co/storage/v1/object/public/hh-service-photos/'+account+'/'+object+'.jpg',
  project+'/storage/v1/object/sign/hh-service-photos/'+account+'/'+object+'.jpg',
  project+'/storage/v1/object/public/hh-client-private-media/'+account+'/'+object+'.jpg',
  project+'/storage/v1/object/public/hh-service-photos/'+account+'/'+object+'.jpg?token=secret',
  project+'/storage/v1/object/public/hh-service-photos/'+account+'/'+object+'.jpg#secret',
  project+'/storage/v1/object/public/hh-service-photos/'+account+'/'+object+'.png',
  project+'/storage/v1/object/public/hh-service-photos/not-a-uuid/'+object+'.jpg',
  project+'/storage/v1/object/public/hh-service-photos/'+account+'/example.jpg',
  project+'/storage/v1/object/public/hh-service-photos/'+account+'/'+object+'.jpg/extra',
  'http://provider.example.supabase.co/storage/v1/object/public/hh-service-photos/'+account+'/'+object+'.jpg',
  '/api/private/a.jpg','/images/../api/private/a.jpg','/images/%2E%2E/private.jpg',
  '/images/holistic-house/photo.jpg?token=secret',
  '//provider.example.supabase.co/private.jpg','not-a-url',null,42,'x'.repeat(651)
 ]
 for(const url of bad)assert.equal(publicServicePhotoUrl(url,project),'',String(url))
})

test('published upload introduction URLs use the public presentation contract, not private media',()=>{
 for(const [type,ext] of [['video','mp4'],['video','mov'],['audio','m4a'],['audio','mp3']]){
  const value={kind:'upload',assetId:object,path:account+'/'+object+'.'+ext}
  const normalized=normalizeVideoPresentation(value,type)
  assert.equal(publicPresentationUrl(normalized,project,type),
    project+'/storage/v1/object/public/hh-practitioner-presentations/'+account+'/'+object+'.'+ext)
 }
 assert.throws(()=>normalizeVideoPresentation({kind:'upload',assetId:object,path:account+'/'+object+'.jpg'},'video'))
})

test('public directory uses moderated service introductions and strict public URLs',()=>{
 const src=readFileSync(new URL('../lib/practitioners/public-remote-support-masters.ts',import.meta.url),'utf8')
 assert.match(src,/publicServicePhotoUrl\(path, supabaseUrl\)/)
 assert.match(src,/publicIntroduction\(intro, locale, config.supabaseUrl\)/)
 assert.match(src,/publicPresentationUrl\(intro.media, supabaseUrl, intro.type\)/)
 assert.match(src,/\.flatMap\(intro =>/)
 assert.match(src,/service.status === "published" && service.active/)
 assert.match(src,/\[\.\.\.new Set\(\[service.imagePath/)
 assert.doesNotMatch(src,/service\.photos\s*\|\|\s*\[\]\)\s*\.map\(\s*\w*\s*=>\s*\w*\s*\)/)
})

test('CSP admits approved Storage media only on public Support mobile, not private reports',()=>{
 const middleware=readFileSync(new URL('../middleware.ts',import.meta.url),'utf8')
 assert.match(middleware,/supportMobilePublishedMedia = \/\^\\\/\(en\|ru\|es\)/)
 assert.match(middleware,/supportMobilePublishedMedia\)\)return ''/)
 assert.match(middleware,/supportMobilePublishedMedia \? listingImageOrigin : ''/)
 const allowed=/^\/(en|ru|es)\/holistic-support\/mobile\/?$/
 for(const path of ['/en/holistic-support/mobile','/ru/holistic-support/mobile',
   '/es/holistic-support/mobile/'])assert.ok(allowed.test(path),path)
 for(const path of ['/ru/app/portrait','/ru/app/consultations',
   '/en/client/session/private','/api/public/remote-energy-support-masters',
   '/admin/videos','/en/holistic-support'])assert.ok(!allowed.test(path),path)
 const gallery=readFileSync(new URL('../components/holistic-support-master-gallery.tsx',import.meta.url),'utf8')
 assert.match(gallery,/selectedOffer.presentations\[0\].type === "audio"/)
 assert.match(gallery,/<Headphones size=\{25\}/)
})
