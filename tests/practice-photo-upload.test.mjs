import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {validateProfile,validateServiceDraft} from '../lib/practitioners/contracts.js'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const owner='11111111-1111-4111-8111-111111111111'
const file='22222222-2222-4222-8222-222222222222'
const url='https://shervdixkaxurnaecioe.supabase.co/storage/v1/object/public/hh-service-photos/'+owner+'/'+file+'.jpg'
const profile=()=>({displayName:'Example Master',professionalTitle:'Teacher',shortBio:'A short bio',languages:['en'],formats:['online'],areas:['personal_development'],photoPath:url})
const service=()=>({copy:{en:{title:'Service',shortDescription:'Helpful service'},ru:{title:'Услуга',shortDescription:'Помогающая услуга'}},areaKey:'personal_development',deliveryFormat:'online',languages:['en','ru'],pricingMode:'free',photos:[url]})
test('practitioner photo accepts owned-public format in validation, rejects unsafe URL shapes',()=>{
  assert.equal(validateProfile(profile()).photoPath,url)
  for(const photoPath of ['https://evil.example/photo.jpg','//evil.example/photo.jpg','data:image/jpeg;base64,AA','javascript:alert(1)','https://shervdixkaxurnaecioe.supabase.co/storage/v1/object/public/hh-service-photos/'+owner+'/'+file+'.jpg?token=secret']){
    assert.throws(()=>validateProfile({...profile(),photoPath}),{code:'INVALID_IMAGE'})
  }
  assert.equal(validateProfile({...profile(),photoPath:'/images/legacy.jpg'}).photoPath,'/images/legacy.jpg')
})
test('service gallery accepts five marketing images and rejects external media',()=>{
  assert.deepEqual(validateServiceDraft(service()).photos,[url])
  assert.throws(()=>validateServiceDraft({...service(),photos:Array(6).fill(url)}),{code:'INVALID_LIST'})
  assert.throws(()=>validateServiceDraft({...service(),photos:['https://elsewhere.invalid/photo.jpg']}),{code:'INVALID_IMAGE'})
})
test('photo upload remains authorized, moderated and visible on intended public pages',()=>{
  const api=read('app/api/app/practice/photos/route.js')
  const repository=read('lib/practitioners/repository.js')
  const ui=read('components/app/practice-workspace.jsx')
  const middleware=read('middleware.ts')
  const gallery=read('app/[locale]/services/[practitionerSlug]/[serviceSlug]/page.tsx')
  assert.match(api,/requireSameOrigin/)
  assert.match(api,/createRequestAuth/)
  assert.match(api,/sharp\(source/)
  assert.match(api,/upsert:false/)
  assert.match(repository,/assertOwnedMarketingPhotos/)
  assert.match(repository,/photos=\$14/)
  assert.match(repository,/status='published'/)
  assert.match(ui,/PracticePhotoUpload/)
  assert.match(ui,/photoPath/)
  assert.match(gallery,/service\.photos/)
  assert.match(middleware,/listingImageOrigin/)
})
