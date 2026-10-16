import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { validateServiceDraft } from '../lib/practitioners/contracts.js'

const uuidA='11111111-1111-4111-8111-111111111111'
const uuidB='22222222-2222-4222-8222-222222222222'
const picture='https://shervdixkaxurnaecioe.supabase.co/storage/v1/object/public/hh-service-photos/'+uuidA+'/'+uuidB+'.jpg'
const draft=()=>({
  copy:{es:{title:'Consulta de recursos',shortDescription:'Explorar opciones de apoyo',description:'Sesión personal de exploración'}},
  displayLocales:['es'],areaKey:'personal_development',offeringType:'session',
  deliveryFormat:'online',locationLabel:'',languages:['es'],
  pricingMode:'fixed',confirmedPrice:49.29,currency:'MXN',durationMinutes:45,
  imagePath:'',photos:[picture],contacts:{whatsapp:'+1 (416) 555-1212',telegram:'@Practice_2026'}
})
test('master listing supports a single chosen publication language without fabricated translations',()=>{
  const value=validateServiceDraft(draft(),{complete:true})
  assert.deepEqual(value.displayLocales,['es'])
  assert.equal(value.copy.es.title,'Consulta de recursos')
  assert.equal(value.copy.en.title,'')
  assert.equal(value.copy.ru.title,'')
  assert.equal(value.currency,'MXN')
  assert.equal(value.confirmedPrice,49.29)
  assert.deepEqual(value.photos,[picture])
  assert.deepEqual(value.contacts,{whatsapp:'14165551212',telegram:'Practice_2026'})
  assert.deepEqual(value.languages,['es'])
})
test('master cannot submit selected language with missing copy',()=>{
  const value=draft()
  value.displayLocales=['es','en']
  assert.throws(()=>validateServiceDraft(value,{complete:true}),error=>error.code==='INCOMPLETE_SERVICE')
  assert.doesNotThrow(()=>validateServiceDraft(value,{complete:false}))
})
test('WhatsApp Telegram currency and publicly hosted photo inputs are checked',()=>{
  for(const [key,value,code] of [
    ['contacts',{whatsapp:'123',telegram:''},'INVALID_WHATSAPP'],
    ['contacts',{whatsapp:'',telegram:'https://evil.example/username'},'INVALID_TELEGRAM'],
    ['photos',['https://evil.example/storage/v1/object/public/else.jpg'],'INVALID_IMAGE'],
    ['photos',Array(6).fill(picture),'INVALID_LIST'],
    ['currency','ABC','INVALID_PRICE'],
    ['confirmedPrice',49.295,'INVALID_PRICE'],
  ]){
    assert.throws(()=>validateServiceDraft({...draft(),[key]:value},{complete:true}),
      error=>error.code===code,JSON.stringify([key,value,code]))
  }
  assert.throws(()=>validateServiceDraft({...draft(),displayLocales:['fr']},{complete:true}),
    error=>error.code==='INVALID_LIST')
})
test('service publishing retains moderated snapshots, ownership checks and locale-specific public routes',async()=>{
  const [repository,ui,migration,page,api,middleware,types]=await Promise.all([
    readFile(new URL('../lib/practitioners/repository.js',import.meta.url),'utf8'),
    readFile(new URL('../components/app/practice-workspace.jsx',import.meta.url),'utf8'),
    readFile(new URL('../supabase/migrations/20261016232500_hh_master_service_i18n_gallery_contacts.sql',import.meta.url),'utf8'),
    readFile(new URL('../app/[locale]/services/[practitionerSlug]/[serviceSlug]/page.tsx',import.meta.url),'utf8'),
    readFile(new URL('../app/api/app/practice/photos/route.js',import.meta.url),'utf8'),
    readFile(new URL('../middleware.ts',import.meta.url),'utf8'),
    readFile(new URL('../lib/practitioners/public-types.ts',import.meta.url),'utf8'),
  ])
  assert.match(repository,/assertOwnedListingPhotos/)
  assert.match(repository,/status='submitted'/)
  assert.match(repository,/contact_channels=\$15/)
  assert.match(repository,/display_locales=\$13/)
  assert.match(repository,/photos=\$14/)
  assert.match(repository,/\.includes\(locale\)/)
  assert.match(ui,/Submit for publication/)
  assert.match(ui,/WhatsApp/)
  assert.match(ui,/Telegram/)
  assert.match(ui,/LISTING_CURRENCIES/)
  assert.match(ui,/displayLocales/)
  assert.match(api,/createRequestAuth/)
  assert.match(api,/sharp\(source/)
  assert.match(api,/upsert:false/)
  assert.match(migration,/hh-service-photos/)
  assert.match(migration,/storage\.foldername/)
  assert.match(migration,/to authenticated/)
  assert.match(migration,/display_locales/)
  assert.match(page,/service\.contacts\.whatsapp/)
  assert.match(page,/service\.displayLocales\.map/)
  assert.match(middleware,/listingImageOrigin/)
  assert.match(types,/contacts:/)
})
