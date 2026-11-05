import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {advanceEnquiryAttribution,parseEnquiryAttributionCookie,
 normalizeEnquiryAttribution,readPublicEnquiryAttribution,ENQUIRY_ATTRIBUTION_COOKIE}
 from '../lib/analytics/enquiry-attribution.mjs'
import {verifiedEnquiryPath,verifiedEnquiryServiceTitle} from '../lib/analytics/enquiry-public-catalog.mjs'

test('known academy routes and core service titles remain available across locales',()=>{
 for(const locale of ['en','ru','es']){
  assert.equal(verifiedEnquiryPath('/'+locale+'/academy'),'/'+locale+'/academy')
  assert.equal(verifiedEnquiryPath('/'+locale+'/academy/reiki/yggdrasil'),'/'+locale+'/academy/reiki/yggdrasil')
 }
 for(const title of ['Guided Imagery Hypnotherapy','Курс гипнотерапии','Hipnoterapia con imágenes guiadas',
  'Daoist talismans · basket quote','Daoist Fu talismans · checkout pending payment'])
  assert.equal(verifiedEnquiryServiceTitle(title),title)
 assert.equal(verifiedEnquiryServiceTitle('Patient has cancer'),null)
})

test('first consented public entry retains coarse source, campaign and exact public landing',()=>{
 const cookie=advanceEnquiryAttribution('',{
  path:'/en/services',href:'https://holistichouse.vercel.app/en/services?utm_source=google&utm_medium=cpc&utm_campaign=hh_free_review_en_toronto_202610',
  referrer:'https://www.google.com/search?q=sensitive'})
 const row=parseEnquiryAttributionCookie(cookie)
 assert.equal(row.landingPath,'/en/services')
 assert.equal(row.trafficSource,'google-paid')
 assert.equal(row.campaign,'hh_free_review_en_toronto_202610')
 assert.equal(row.previousPath,null)
 assert.doesNotMatch(decodeURIComponent(cookie),/sensitive|utm_source|utm_medium|www.google.com/)
 const next=advanceEnquiryAttribution(cookie,{path:'/en/services/alchemy-of-soul',
  href:'https://holistichouse.vercel.app/en/services/alchemy-of-soul',referrer:''})
 assert.deepEqual(normalizeEnquiryAttribution(parseEnquiryAttributionCookie(next)),{
  landingPath:'/en/services',previousPath:'/en/services',trafficSource:'google-paid',campaign:'hh_free_review_en_toronto_202610'})
})
test('sensitive/private paths and arbitrary payloads cannot become conversion metadata',()=>{
 for(const campaign of ['alice-smith','person123456789','diagnosis-anxiety']){
  const value=normalizeEnquiryAttribution({landingPath:'/en/services',trafficSource:'direct',campaign})
  assert.equal(value.campaign,undefined,'unregistered campaign must not enter lead metadata')
 }
 const privateGap=advanceEnquiryAttribution('',{path:'/en/app/client',href:'https://example.org',referrer:''})
 assert.equal(parseEnquiryAttributionCookie(privateGap),null)
 assert.doesNotMatch(decodeURIComponent(privateGap),/app|client/)
 assert.equal(normalizeEnquiryAttribution({landingPath:'/en/app/secrets',trafficSource:'direct'}),null)
 assert.equal(normalizeEnquiryAttribution({landingPath:'/en/services?email=secret',trafficSource:'direct'}),null)
 assert.equal(normalizeEnquiryAttribution({landingPath:'/en/services',trafficSource:'x-google'}),null)
 assert.equal(normalizeEnquiryAttribution({landingPath:'/en/services',trafficSource:'direct',previousPath:'https://bad.test'}),null)
 assert.equal(parseEnquiryAttributionCookie('%7Bbad'),null)
 const cookie=advanceEnquiryAttribution('',{path:'/en/services',href:'https://holistichouse.vercel.app/en/services?utm_campaign=EMAIL%40EXAMPLE',referrer:''})
 assert.equal(parseEnquiryAttributionCookie(cookie).campaign,undefined)
 assert.equal(normalizeEnquiryAttribution({landingPath:'/en/services/patient-has-cancer',trafficSource:'direct'}),null)
 const untrusted=normalizeEnquiryAttribution({landingPath:'/en/services',trafficSource:'direct',campaign:'patient_has_cancer'})
 assert.equal(untrusted.campaign,undefined)
})
test('an unregistered intermediate page never becomes a fabricated previous page',()=>{
 let cookie=advanceEnquiryAttribution('',{path:'/en/services',href:'https://holistichouse.vercel.app/en/services?utm_source=google',referrer:''})
 cookie=advanceEnquiryAttribution(cookie,{path:'/en/services/unregistered',href:'https://holistichouse.vercel.app/en/services/unregistered',referrer:''})
 cookie=advanceEnquiryAttribution(cookie,{path:'/en/about',href:'https://holistichouse.vercel.app/en/about',referrer:''})
 const result=normalizeEnquiryAttribution(parseEnquiryAttributionCookie(cookie))
 assert.equal(result.landingPath,'/en/services')
 assert.equal(result.trafficSource,'google-organic')
 assert.equal(result.previousPath,null)
})
test('an unregistered first page cannot be replaced with a fabricated first touch',()=>{
 let cookie=advanceEnquiryAttribution('',{path:'/en/services/unregistered',href:'https://holistichouse.vercel.app/en/services/unregistered',referrer:''})
 cookie=advanceEnquiryAttribution(cookie,{path:'/en/services',href:'https://holistichouse.vercel.app/en/services',referrer:''})
 const result=parseEnquiryAttributionCookie(cookie)
 assert.equal(result.landingPath,'/en/services','this is the first recorded page after consent')
 assert.equal(result.trafficSource,'unknown','the earlier source is never inferred')
 assert.equal(result.initialUnknown,true)
 assert.doesNotMatch(decodeURIComponent(cookie),/unregistered/)
 const forged=normalizeEnquiryAttribution({landingPath:'/en/services',previousPath:null,
  trafficSource:'google-paid',campaign:'hh_free_review_en_toronto_202610',initialUnknown:true})
 assert.equal(forged.trafficSource,'unknown')
 assert.equal(forged.campaign,undefined)
})
test('new consent or an expired SPA cookie never reuses an earlier referrer or campaign',()=>{
 const cookie=advanceEnquiryAttribution('',{path:'/en/services',
  href:'https://holistichouse.vercel.app/en/services?utm_source=google&utm_medium=cpc&utm_campaign=hh_free_review_en_toronto_202610',
  referrer:'https://www.google.com/search?q=sensitive',contextUnknown:true})
 const result=normalizeEnquiryAttribution(parseEnquiryAttributionCookie(cookie))
 assert.equal(result.landingPath,'/en/services')
 assert.equal(result.trafficSource,'unknown')
 assert.equal(result.initialUnknown,true)
 assert.equal(result.campaign,undefined)
 assert.doesNotMatch(decodeURIComponent(cookie),/sensitive|google\.com/)
})
test('server requires separate enquiry-attribution consent before linking source to a lead',()=>{
 const value=advanceEnquiryAttribution('',{path:'/ru/services',href:'https://holistichouse.vercel.app/ru/services',referrer:''})
 const request=(stats,attribution,skip='')=>({cookies:{get(name){return {value:name===ENQUIRY_ATTRIBUTION_COOKIE?value:name==='hh_public_stats_consent'?stats:name==='hh_enquiry_attribution_consent'?attribution:skip}}}})
 assert.equal(readPublicEnquiryAttribution(request('v1','')),null,'anonymous counters alone do not consent to per-enquiry attribution')
 assert.equal(readPublicEnquiryAttribution(request('v1','denied')),null)
 assert.equal(readPublicEnquiryAttribution(request('v1','v1','1')),null,'owner exclusion wins over consent')
 assert.equal(readPublicEnquiryAttribution(request('denied','v1')).trafficSource,'direct','separate enquiry consent does not require anonymous counters')
 assert.equal(readPublicEnquiryAttribution(request('v1','v1')).trafficSource,'direct')
})
test('the visitor can separately opt in and withdrawal clears the first-touch cookie',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
 const preferences=read('components/analytics-consent.tsx')
 const collector=read('components/public-page-traffic.tsx')
 assert.match(preferences,/hh_enquiry_attribution_consent/)
 assert.match(preferences,/setEnquiryAttributionConsent\(allow/)
 assert.match(preferences,/hh_enquiry_source_v1/)
 assert.match(preferences,/Max-Age=0/)
 assert.match(collector,/hh_enquiry_attribution_consent/)
 assert.match(collector,/ENQUIRY_ATTRIBUTION_COOKIE \+ "=; Path=\/; Max-Age=0/)
 assert.match(collector,/if \(!path\) \{[\s\S]*?addEventListener\("holistic-house:public-stats-consent", recordGap\)/)
})
test('visitor-facing enquiry forms expose a separate optional source-linking choice',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
 const choice=read('components/enquiry-attribution-choice.tsx')
 assert.match(choice,/setEnquiryAttributionConsent\(event\.target\.checked\)/)
 assert.match(choice,/hh_public_stats_skip/)
 assert.doesNotMatch(choice,/required/)
 for(const file of ['components/contact-channel-chooser.tsx','components/compact-lead-capture.tsx',
  'components/home-free-diagnosis-banner.tsx','components/free-express-wizard.tsx',
  'components/services-hero-quick-request.tsx','components/taoist-talisman-cart.tsx'])
  assert.match(read(file),/<EnquiryAttributionChoice\b/,file)
})
test('both enquiry and talisman checkout routes apply the same consent gate',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
 for(const file of ['app/api/service-enquiries/route.js','app/api/payments/talismans/checkout/route.js']){
  const route=read(file)
  assert.match(route,/readPublicEnquiryAttribution\(request\)/,file)
  assert.match(route,/createPublicServiceEnquiry\([\s\S]*?readPublicEnquiryAttribution\(request\)/,file)
 }
 for(const locale of ['en','ru','es']){
  const path='/'+locale+'/talismans/cart'
  const cookie=advanceEnquiryAttribution('',{path,href:'https://holistichouse.vercel.app'+path,referrer:''})
  assert.equal(parseEnquiryAttributionCookie(cookie).landingPath,path)
 }
})
