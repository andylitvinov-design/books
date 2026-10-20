import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'
import {BUSINESS_FORMATS,validateBusinessEnquiry} from '../lib/business-consulting/intake-policy.js'

const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('shareable locale pages and direct form links use existing Business route',()=>{
  const page=read('app/[locale]/explore/[theme]/page.tsx')
  const form=read('components/business-website-enquiry.tsx')
  const explorer=read('components/topic-journey-selector.tsx')
  assert.match(page,/theme === 'business'/)
  assert.match(page,/<BusinessWebsiteEnquiry locale=/)
  assert.match(explorer,/href="#business-direct-request"/)
  assert.match(form,/id="business-direct-request"/)
  assert.match(form,/new URLSearchParams\(window.location.search\).get\("businessFormat"\)/)
  for(const kind of ['free','express','full','mentoring']){
    assert.ok(BUSINESS_FORMATS.includes(kind))
    assert.match(form,new RegExp('chosen==="'+kind+'"'))
    for(const lang of ['en','ru','es']) {
      const url=new URL('https://holistichouse.vercel.app/'+lang+'/explore/business?businessFormat='+kind+'#business-direct-request')
      assert.equal(url.pathname,'/'+lang+'/explore/business')
      assert.equal(url.searchParams.get('businessFormat'),kind)
      assert.equal(url.hash,'#business-direct-request')
    }
  }
})

test('public website request is opt-in, bounded, resilient to failures and stays in private CRM',()=>{
  const form=read('components/business-website-enquiry.tsx')
  const endpoint=read('app/api/services/business-consulting/route.js')
  const store=read('lib/business-consulting/enquiry-store.js')
  const review=read('components/business-consulting-landing.tsx')
  assert.match(form,/contactConsent:consent/)
  assert.match(form,/type="checkbox" required/)
  assert.match(form,/method:"POST"/)
  assert.match(form,/credentials:"same-origin"/)
  assert.match(form,/if\(body\?\.received===true\)setSuccess\(true\)/)
  assert.match(form,/href=\{"\/"\+locale\+"\/services\/business-consulting#business-offers"\}/)
  assert.match(form,/manualFallback/)
  assert.match(review,/ContactChannelChooser/)
  assert.match(endpoint,/requireSameOrigin/)
  assert.match(endpoint,/consumeRate/)
  assert.match(store,/payload_ciphertext/)
  assert.match(store,/seal\(payload/)
  assert.match(store,/business_consulting_requests/)
  assert.match(store,/on conflict do nothing/)
  assert.doesNotMatch(form,/automatic booking confirmed|payment successful/i)
  const payload={operationId:'d8929678-5c86-4ad5-95ad-6dfd7086ca71',locale:'en',format:'express',name:'Test Client',
    email:'example@example.org',question:'Please clarify a business decision.',contactConsent:true}
  assert.equal(validateBusinessEnquiry(payload).format,'express')
  assert.throws(()=>validateBusinessEnquiry({...payload,contactConsent:false}),/CONSENT_REQUIRED/)
})

test('private CRM can open directly, but still only renders for verified owner',()=>{
  const workspace=read('components/app/practice-workspace.jsx')
  const appPage=read('app/[locale]/app/[[...path]]/page.jsx')
  const crm=read('components/app/crm-manager.jsx')
  const inbox=read('components/app/crm-business-enquiries.jsx')
  assert.match(appPage,/['"]practice['"]/)
  assert.match(workspace,/params\.get\('panel'\)==='crm'/)
  assert.match(workspace,/activePanel==='crm'&&isOwner&&accountId/)
  assert.match(workspace,/onClick=\{\(\)=>choosePanel\('crm'\)\}/)
  assert.match(workspace,/CrmManager key=\{accountId\}/)
  assert.match(crm,/CrmBusinessEnquiries/)
  assert.match(inbox,/data-business-crm-inbox/)
  assert.match(inbox,/update_business_enquiry/)
  assert.match(inbox,/import_business_contact/)
})
