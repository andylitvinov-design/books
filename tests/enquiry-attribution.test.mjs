import test from 'node:test'
import assert from 'node:assert/strict'
import {advanceEnquiryAttribution,parseEnquiryAttributionCookie,
 normalizeEnquiryAttribution,readPublicEnquiryAttribution,ENQUIRY_ATTRIBUTION_COOKIE}
 from '../lib/analytics/enquiry-attribution.mjs'

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
 assert.equal(advanceEnquiryAttribution('',{path:'/en/app/client',href:'https://example.org',referrer:''}),null)
 assert.equal(normalizeEnquiryAttribution({landingPath:'/en/app/secrets',trafficSource:'direct'}),null)
 assert.equal(normalizeEnquiryAttribution({landingPath:'/en/services?email=secret',trafficSource:'direct'}),null)
 assert.equal(normalizeEnquiryAttribution({landingPath:'/en/services',trafficSource:'x-google'}),null)
 assert.equal(normalizeEnquiryAttribution({landingPath:'/en/services',trafficSource:'direct',previousPath:'https://bad.test'}),null)
 assert.equal(parseEnquiryAttributionCookie('%7Bbad'),null)
 const cookie=advanceEnquiryAttribution('',{path:'/en/services',href:'https://holistichouse.vercel.app/en/services?utm_campaign=EMAIL%40EXAMPLE',referrer:''})
 assert.equal(parseEnquiryAttributionCookie(cookie).campaign,undefined)
 for(const campaign of ['alice-smith','person123456789','diagnosis-anxiety']){
  const value=normalizeEnquiryAttribution({landingPath:'/en/services',trafficSource:'direct',campaign})
  assert.equal(value.campaign,undefined, 'unregistered campaign must not enter lead metadata')
 }
})
test('server requires explicit analytics consent before linking attribution to a lead',()=>{
 const value=advanceEnquiryAttribution('',{path:'/ru/services',href:'https://holistichouse.vercel.app/ru/services',referrer:''})
 const request=(consent,skip='')=>({cookies:{get(name){return {value:name===ENQUIRY_ATTRIBUTION_COOKIE?value:name==='hh_public_stats_consent'?consent:skip}}}})
 assert.equal(readPublicEnquiryAttribution(request('', '') ),null)
 assert.equal(readPublicEnquiryAttribution(request('v1','1')),null)
 assert.equal(readPublicEnquiryAttribution(request('v1')).trafficSource,'direct')
})
