import test from 'node:test'
import assert from 'node:assert/strict'
import {ownerEnquiryNotice} from '../lib/app/owner-enquiry-notice.mjs'
const data={serviceTitle:'60-minute personal session · €100',sourcePath:'/en/services/alchemy-of-soul',
 referenceCode:'HH-123456789ABC',hasContact:false,attribution:{
 landingPath:'/en/services',previousPath:'/en/about',trafficSource:'google-paid',campaign:'october'}}
test('owner receives offer, conversion page, acquisition and reference but no user data',()=>{
 const text=ownerEnquiryNotice({locale:'ru',enquiry:data})
 for(const field of ['60-minute personal session · €100','/en/services/alchemy-of-soul',
  '/en/services','/en/about','google-paid','october','HH-123456789ABC'])
  assert.ok(text.includes(field),field)
 assert.match(text,/Контакт: пока не оставлен/)
 assert.match(text,/\/ru\/app\/practice\?panel=requests/)
})
test('malicious service label and URL cannot escape owner notification',()=>{
 const text=ownerEnquiryNotice({locale:'en',enquiry:{...data,
  serviceTitle:'https://evil.test?email=person@example.net',
  sourcePath:'/en/services?email=person@example.net',
  attribution:{landingPath:'/en/app/private',trafficSource:'x'}}})
 assert.doesNotMatch(text,/person@example|evil.test/)
 assert.match(text,/See service in account/)
 assert.match(text,/unknown \/ no analytics consent/)
})
