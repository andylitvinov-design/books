import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { videoKey, videoPagePath, prepareVideoChange, toPublishedSiteVideo } from '../lib/site-videos/model.js'
import { parseEnquiryReceipt, RECEIPT_SESSION_KEY } from '../lib/practitioners/enquiry-receipt.mjs'

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const referenceCode='HH-AABBCCDDEEFF'
const createdAt=Date.UTC(2026,9,21,14)
const receipt={referenceCode,createdAt}

test('temporary confirmation receipt contains only an opaque reference and expires',()=>{
  assert.equal(RECEIPT_SESSION_KEY,'hh-service-enquiry-receipt:v1')
  assert.deepEqual(parseEnquiryReceipt(JSON.stringify(receipt),createdAt+60000),receipt)
  for(const item of [
    null,'{not json}',{}, {referenceCode:'HH-INVALID',createdAt},
    {...receipt,email:'private@example.test'}, {...receipt,contact:'sensitive'},
    {...receipt,createdAt:createdAt+100000},
    {...receipt,createdAt:createdAt-25*3600000},
  ])assert.equal(parseEnquiryReceipt(item,createdAt),null)
})

test('page and service form only acknowledge a successful server-saved reply request',()=>{
  const form=source('components/contact-channel-chooser.tsx')
  const page=source('app/[locale]/thank-you/page.tsx')
  const ui=source('components/service-enquiry-thank-you.tsx')
  assert.match(form,/response\.ok \|\| data\.saved !== true/)
  assert.match(form,/setSaved\(\{ saved: true, referenceCode: data\.referenceCode, whatsappUrl: attempt\.whatsappUrl \}\)/)
  assert.match(form,/typeof data\.referenceCode !== "string"/)
  assert.match(form,/if \(!mounted\.current \|\| activeContext\.current !== attempt\.context \|\| operation\.current !== attempt\) return/)
  assert.match(form,/sessionStorage\.setItem\(RECEIPT_SESSION_KEY/)
  assert.match(form,/router\.push\("\/" \+ locale \+ "\/thank-you"\)/)
  assert.doesNotMatch(form,/localStorage|sendBeacon/i)
  assert.match(page,/robots: \{ index: false, follow: false/)
  assert.match(ui,/parseEnquiryReceipt\(window\.sessionStorage\.getItem/)
  assert.match(ui,/const confirmed = \/\^HH-/)
  assert.doesNotMatch(ui,/gtag|fbq|sendBeacon|fetch\(|localStorage/i)
  for(const locale of ['en','ru','es']) {
    assert.ok(ui.includes('  '+locale+': {'), 'missing locale '+locale)
    assert.equal(videoPagePath('thank-you',locale),'/'+locale+'/thank-you')
    assert.equal(videoKey('thank-you',locale),'thank-you:'+locale)
  }
  const analytics = source('lib/public-analytics.ts')
  assert.match(analytics,/PUBLIC_ANALYTICS_AVAILABLE = false/)
  assert.match(analytics,/app\|client\|report\|prescriptions\|thank-you/)
})

test('video is draft-only until explicit checked publication, with no default auto-post',()=>{
  const draft=prepareVideoChange(null,{
    slot:'thank-you',locale:'ru',intent:'draft',youtubeUrl:'https://youtu.be/OkLEN8Zb-sY',title:'Thanks',
  })
  assert.equal(toPublishedSiteVideo(draft),undefined)
  assert.throws(()=>prepareVideoChange(draft,{
    slot:'thank-you',locale:'ru',intent:'publish',youtubeUrl:'https://youtu.be/OkLEN8Zb-sY',title:'Thanks',reviewed:false,
  }))
  assert.match(source('app/[locale]/thank-you/page.tsx'),/getPublishedSiteVideo\("thank-you:" \+ locale\)/)
  assert.doesNotMatch(source('app/[locale]/thank-you/page.tsx'),/getPublishedSiteVideos\(/)
  assert.match(source('components/site-video-manager.tsx'),/\["about-intro", "thank-you"\]\.includes\(item\.id\)/)
  assert.match(source('components/service-enquiry-thank-you.tsx'),/\{video && \(/)
})

test('server-side owner analytics counts committed enquiries with consent and RLS',()=>{
  const code=source('lib/practitioners/repository.js')
  const ui=source('components/app/practice-service-statistics.jsx')
  assert.match(code,/from app\.public_service_enquiries where recipient_practitioner_id=\$1/)
  assert.match(code,/contact_ciphertext is not null/)
  assert.match(code,/registrationStats/)
  assert.match(code,/getMyPractice\(actor\)/)
  assert.match(ui,/registrationStats\.last7/)
  assert.match(ui,/registrationStats\.last30/)
  assert.match(ui,/not a confirmed booking or payment/)
  assert.doesNotMatch(source('app/[locale]/thank-you/page.tsx'),/lead_created|recordPublicServiceEvent/)
})

function loadThankYouPage(getPublishedSiteVideo){
  const imports={
    'react/jsx-runtime':{jsx:(type,props)=>{assert.equal(type,'thank-you');return {type,props}}},
    'next/navigation':{notFound:()=>{throw Error('NOT_FOUND')}},
    '@/app/site-videos.css':{},
    '@/components/service-enquiry-thank-you':{ServiceEnquiryThankYou:'thank-you'},
    '@/lib/site-videos/public':{getPublishedSiteVideo},
  }
  const module={exports:{}}
  vm.runInNewContext(ts.transpileModule(source('app/[locale]/thank-you/page.tsx'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
    module,exports:module.exports,require:id=>{assert.ok(Object.hasOwn(imports,id),'Unexpected page dependency: '+id);return imports[id]},
  })
  return module.exports.default
}
for(const locale of ['en','ru','es'])test(`${locale} thank-you reads only its exact public video key and keeps missing/draft/hidden media absent`,async()=>{
  const draft=prepareVideoChange(null,{slot:'thank-you',locale,intent:'draft',youtubeUrl:'https://youtu.be/OkLEN8Zb-sY',title:'Fictional thank-you'})
  const published=prepareVideoChange(draft,{slot:'thank-you',locale,intent:'publish',youtubeUrl:'https://youtu.be/OkLEN8Zb-sY',title:'Fictional thank-you',reviewed:true})
  const hidden=prepareVideoChange(published,{slot:'thank-you',locale,intent:'hide'})
  assert.equal(toPublishedSiteVideo(draft),undefined)
  assert.equal(toPublishedSiteVideo(hidden),undefined)
  assert.equal(toPublishedSiteVideo(published).youtubeId,'OkLEN8Zb-sY')
  for(const video of [undefined,toPublishedSiteVideo(draft),toPublishedSiteVideo(hidden),toPublishedSiteVideo(published)]){
    const keys=[]
    const page=loadThankYouPage(async key=>{keys.push(key);return video})
    const tree=await page({params:Promise.resolve({locale})})
    assert.deepEqual(keys,['thank-you:'+locale])
    assert.equal(tree.props.locale,locale)
    assert.equal(tree.props.video,video??null)
  }
})
test('invalid thank-you locale performs no video read; unavailable store cannot invent published media',async()=>{
  const keys=[]
  const page=loadThankYouPage(async key=>{keys.push(key);throw Error('FICTIONAL_UNAVAILABLE')})
  for(const locale of ['fr','../en','en?private=1',''])await assert.rejects(()=>page({params:Promise.resolve({locale})}),/NOT_FOUND/)
  assert.equal(keys.length,0)
  await assert.rejects(()=>page({params:Promise.resolve({locale:'en'})}),/FICTIONAL_UNAVAILABLE/)
  assert.deepEqual(keys,['thank-you:en'])
})
