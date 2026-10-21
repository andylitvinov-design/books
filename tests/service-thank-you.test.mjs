import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { videoKey, videoPagePath, prepareVideoChange, toPublishedSiteVideo } from '../lib/site-videos/model.js'
import { parseEnquiryReceipt, RECEIPT_SESSION_KEY } from '../lib/practitioners/enquiry-receipt.mjs'
import { isPublicAnalyticsPath, PUBLIC_ANALYTICS_AVAILABLE } from '../lib/public-analytics.ts'

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
  assert.match(form,/setSaved\(\{ saved: true, referenceCode: data\.referenceCode \}\)/)
  assert.match(form,/sessionStorage\.setItem\(RECEIPT_SESSION_KEY/)
  assert.match(form,/router\.push\("\/" \+ locale \+ "\/thank-you"\)/)
  assert.doesNotMatch(form,/localStorage|sendBeacon/i)
  assert.match(page,/robots: \{ index: false, follow: false/)
  assert.match(ui,/parseEnquiryReceipt\(window\.sessionStorage\.getItem/)
  assert.match(ui,/const confirmed = \/\^HH-/)
  assert.doesNotMatch(ui,/gtag|fbq|sendBeacon|fetch\(|localStorage/i)
  for(const locale of ['en','ru','es']) {
    assert.match(ui,new RegExp('  '+locale+': \\\\{'))
    assert.equal(videoPagePath('thank-you',locale),'/'+locale+'/thank-you')
    assert.equal(videoKey('thank-you',locale),'thank-you:'+locale)
  }
  assert.equal(PUBLIC_ANALYTICS_AVAILABLE,false)
  for(const path of ['/en/thank-you','/ru/thank-you','/es/thank-you'])
    assert.equal(isPublicAnalyticsPath(path),false)
})

test('video is draft-only until explicit checked publication, with no default auto-post',()=>{
  const draft=prepareVideoChange(null,{
    slot:'thank-you',locale:'ru',intent:'draft',youtubeUrl:'https://youtu.be/OkLEN8Zb-sY',title:'Thanks',
  })
  assert.equal(toPublishedSiteVideo(draft),undefined)
  assert.throws(()=>prepareVideoChange(draft,{
    slot:'thank-you',locale:'ru',intent:'publish',youtubeUrl:'https://youtu.be/OkLEN8Zb-sY',title:'Thanks',reviewed:false,
  }))
  assert.match(source('app/[locale]/thank-you/page.tsx'),/getPublishedSiteVideos/)
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
