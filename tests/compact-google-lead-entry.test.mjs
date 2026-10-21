import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { normalizePublicServiceEnquiry } from '../lib/practitioners/public-service-enquiry-input.mjs'
import { safeEnquiryReturnPath } from '../lib/app/enquiry-auth-redirect.js'
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const base={operationId:'13b822f6-8d70-4b1c-b44e-d0c31ad1d82f',
  serviceTitle:'Tantra Reiki',sourcePath:'/en/academy/reiki/tantra-reiki',
  locale:'en',description:'',contactConsent:true,contact:{email:'test@example.org',displayName:''}}
test('one contact field and no name creates an unverified reply-only registration',()=>{
  const result=normalizePublicServiceEnquiry(base)
  assert.deepEqual(result.contact,{displayName:'Website enquiry',email:'test@example.org',phone:'',source:'academy'})
  assert.equal(result.contactConsent,true)
  for(const [locale,name] of [['ru','Заявка с сайта'],['es','Solicitud web']]){
    const item=normalizePublicServiceEnquiry({...base,locale,sourcePath:'/'+locale+'/services',
      contact:{phone:'+14165550123'}})
    assert.equal(item.contact.displayName,name)
    assert.equal(item.contact.phone,'+14165550123')
    assert.equal(item.contact.email,'')
  }
  for(const suppliedName of ['A','x'.repeat(121),'Visitor\nInjected']){
    assert.throws(()=>normalizePublicServiceEnquiry({...base,contact:{...base.contact,displayName:suppliedName}}))
  }
  assert.throws(()=>normalizePublicServiceEnquiry({...base,contactConsent:false}))
  assert.throws(()=>normalizePublicServiceEnquiry({...base,contact:{displayName:''}}))
})
test('OAuth enquiry continuation cannot redirect to a private page or foreign website',()=>{
  for(const [locale,path] of [
    ['en','/en/services'],['ru','/ru/academy/reiki/tantra-reiki'],
    ['es','/es/services'],['en','/en/toronto'],
  ])assert.equal(safeEnquiryReturnPath(path,locale),path)
  for(const path of [
    'https://evil.example/','//evil.example/en/services','/en/app/practice',
    '/en/client/report','/en/tests','/en/services?next=https://evil.example/',
    '/en/services#secret','/en/services/../api','/en/services/%2e%2e/api',
    '/en/services\\\\api','/en/services//api','/ru/services',
    '/en/explore/business','/en',
  ])assert.equal(safeEnquiryReturnPath(path,'en'),'','blocked: '+path)
})
test('Google entry uses existing PKCE and prefill, never silently submits a CRM lead',()=>{
  const src=source('components/contact-channel-chooser.tsx')
  const auth=source('app/api/app/[...path]/route.js')
  const css=source('components/contact-channel-chooser.module.css')
  assert.match(src,/continueTo: "enquiry", returnPath: pathname/)
  assert.match(src,/sessionStorage\.setItem\("hh-google-enquiry-return"/)
  assert.match(src,/fetch\("\/api\/app\/auth\/contact-profile"/)
  assert.match(src,/setGoogleReady\(true\)/)
  assert.match(src,/method === "email" \? email\.trim\(\) : ""/)
  assert.match(src,/method === "phone" \? cleanedPhone : ""/)
  assert.match(src,/contactConsent: consent/)
  assert.match(src,/<details className=\{styles\.optionalName\}>/)
  assert.match(src,/<details className=\{styles\.privacy\}>/)
  assert.doesNotMatch(src,/localStorage|sendBeacon|autoSubmit/)
  assert.match(auth,/safeEnquiryReturnPath\(returnPath, locale\)/)
  assert.match(auth,/auth\.client\.auth\.signInWithOAuth/)
  assert.match(auth,/auth\.client\.auth\.exchangeCodeForSession/)
  assert.match(auth,/joined === 'auth\/contact-profile' && method === 'GET'/)
  assert.match(auth,/const actor = await auth\.verified\(\)/)
  assert.match(auth,/PRIVATE_HEADERS/)
  assert.match(css,/\.googleButton:focus-visible/)
  assert.match(css,/\.methodChoices button\[aria-pressed="true"\]/)
  assert.match(css,/font-size:16px/)
  for(const language of ['en','ru','es']) assert.match(src,new RegExp('  '+language+': \\{'))
})
