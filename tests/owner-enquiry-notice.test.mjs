import test from 'node:test'
import assert from 'node:assert/strict'
import {ownerEnquiryNotice} from '../lib/app/owner-enquiry-notice.mjs'
const data={serviceTitle:'60-minute personal session · €100',sourcePath:'/en/services/alchemy-of-soul',
 referenceCode:'HH-123456789ABC',createdAt:'2026-10-31T14:02:00.000Z',hasContact:false,attribution:{
 landingPath:'/en/services',previousPath:'/en/about',trafficSource:'google-paid',campaign:'hh_free_review_en_toronto_202610'}}
test('owner receives offer, conversion page, acquisition and reference but no user data',()=>{
 const text=ownerEnquiryNotice({locale:'ru',enquiry:data})
 for(const field of ['60-minute personal session · €100','/en/services/alchemy-of-soul',
  '/en/services','/en/about','google-paid','hh_free_review_en_toronto_202610','HH-123456789ABC'])
  assert.ok(text.includes(field),field)
 assert.match(text,/Контакт: пока не оставлен/)
 assert.match(text,/\/ru\/app\/practice\?panel=requests/)
})
test('owner card includes the saved enquiry date in Toronto time',()=>{
 const text=ownerEnquiryNotice({locale:'en',enquiry:data})
 const date=new Intl.DateTimeFormat('en',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Toronto'}).format(new Date(data.createdAt))
 assert.ok(text.includes(date))
})
test('browser-reported page and source are not presented as server-verified provenance',()=>{
 const text=ownerEnquiryNotice({locale:'en',enquiry:data})
 assert.match(text,/Browser-reported source:/)
 assert.match(text,/Browser-reported enquiry page:/)
})
test('invalid enquiry dates are never replaced by a fabricated timestamp',()=>{
 const text=ownerEnquiryNotice({locale:'en',enquiry:{...data,createdAt:'not-a-date'}})
 assert.doesNotMatch(text,/Invalid Date|not-a-date/)
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
test('visitor-supplied health text in metadata never reaches the owner notice',()=>{
 const marker='patient-has-cancer'
 const text=ownerEnquiryNotice({locale:'en',enquiry:{...data,
  serviceTitle:'Patient has cancer',sourcePath:'/en/services/'+marker,
  attribution:{landingPath:'/en/services/'+marker,trafficSource:'direct',campaign:'patient_has_cancer'}}})
 assert.doesNotMatch(text,/Patient has cancer|patient-has-cancer|patient_has_cancer/)
 assert.match(text,/See service in account/)
})
