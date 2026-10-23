import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { normalizePublicServiceEnquiry } from '../lib/practitioners/public-service-enquiry-input.mjs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const payload = {
  operationId: '13b822f6-8d70-4b1c-b44e-d0c31ad1d82f',
  serviceTitle: 'Tantra Reiki',
  description: 'I would like to join the next Level 1 course.',
  sourcePath: '/en/academy/reiki/tantra-reiki',
  locale: 'en',
  contactConsent: true,
  contact: { displayName:'  Alex Example  ', email:'  ALEX@example.test ', phone:' +1 (416) 555-0123 ' },
  website:'',
}

test('public course registration normalizes consented contact and marks source as academy',()=>{
  const result=normalizePublicServiceEnquiry(payload)
  assert.equal(result.contact.displayName,'Alex Example')
  assert.equal(result.contact.email,'alex@example.test')
  assert.equal(result.contact.phone,'+14165550123')
  assert.equal(result.contact.source,'academy')
  assert.equal(result.contactConsent,true)
  assert.equal(result.website,undefined)
})
test('service registration is lead-source website and accepts phone-only contact',()=>{
  const result=normalizePublicServiceEnquiry({...payload,
    locale:'ru', sourcePath:'/ru/services/alchemy-of-soul',
    contact:{displayName:'Мария',phone:'+442071234567'},
  })
  assert.deepEqual(result.contact,{displayName:'Мария', email:'', phone:'+442071234567',source:'website'})
})
test('contact-only interest is valid without a personal note across all locales',()=>{
  for(const locale of ['en','ru','es']){
    const result=normalizePublicServiceEnquiry({...payload,locale,description:''})
    assert.match(result.description,/Tantra Reiki/)
    assert.ok(result.description.length>=10)
    assert.equal(result.contactConsent,true)
    const withoutField={...payload,locale}
    delete withoutField.description
    assert.equal(normalizePublicServiceEnquiry(withoutField).description,result.description)
  }
})
test('short optional comments remain in the encrypted request and legacy guest requests still need a description',()=>{
  const short=normalizePublicServiceEnquiry({...payload,description:'Hi'})
  assert.ok(short.description.endsWith(' Hi'))
  for(const bad of [
    {...payload,description:'x'.repeat(1401)},
    {...payload,description:'hello\u0007world'},
    {...payload,description:42},
  ])assert.throws(()=>normalizePublicServiceEnquiry(bad))
  const {contact,contactConsent,website,...legacy}=payload
  assert.throws(()=>normalizePublicServiceEnquiry({...legacy,description:''}))
})
test('public registration never stores unconsented, malformed or unexpected contact fields',()=>{
  for (const candidate of [
    {...payload,contactConsent:false},
    {...payload,contactConsent:undefined},
    {...payload,contact:null},
    {...payload,contact:{displayName:'A',email:'alex@example.test'}},
    {...payload,contact:{displayName:'Alex'}},
    {...payload,contact:{displayName:'Alex',email:'not-an-email'}},
    {...payload,contact:{displayName:'Alex',phone:'(416) 555 0123'}},
    {...payload,contact:{displayName:'Alex',email:'alex@example.test',marketing:true}},
    {...payload,website:'https://spam.test'},
    {...payload,sourcePath:'/en/app/practice'},
    {...payload,sourcePath:'/en/academy/reiki?token=abc'},
  ]) assert.throws(()=>normalizePublicServiceEnquiry(candidate))
})
test('legacy contactless enquiry is backwards-compatible and contact-only consent is rejected',()=>{
  const {contact,contactConsent,website,...legacy}=payload
  assert.deepEqual(normalizePublicServiceEnquiry(legacy),legacy)
  assert.throws(()=>normalizePublicServiceEnquiry({...legacy,contactConsent:true}))
})
test('guest registration creates an encrypted CRM contact in the same transaction, without marketing opt-in',()=>{
  const backend=read('lib/practitioners/public-service-enquiry.js')
  const endpoint=read('app/api/service-enquiries/route.js')
  const sql=read('supabase/migrations/20261020165000_hh_public_service_crm_contact_intake_20261020.sql')
  assert.match(backend,/transaction\(config, null, async db =>/)
  assert.match(backend,/app\.public_service_enquiries/)
  assert.match(backend,/app\.crm_contacts/)
  assert.match(backend,/on conflict do nothing/i)
  assert.match(backend,/contactConsent|replyConsent/)
  assert.match(backend,/seal\(\{\s*displayName: contact\.displayName/)
  assert.match(backend,/contactProvenance: manuallyRecorded\?\.submittedByVisitor/)
  assert.match(backend,/enquiry: \{ referenceCode, serviceTitle, sourcePath \}/)
  assert.match(endpoint,/requireSameOrigin\(request, config\)/)
  assert.match(endpoint,/consumeRate/)
  assert.match(sql,/grant insert \(id,owner_id,contact_ciphertext,email_hash,phone_hash,locale,lifecycle,source\)/)
  assert.match(sql,/for insert to hh_app_backend/)
  assert.match(sql,/app\.public_service_enquiries/)
  assert.match(sql,/hh\.public_enquiry_operation/)
  assert.match(sql,/crm_contacts\.owner_id/)
  assert.match(sql,/email_verified = false and suppressed = false/)
  assert.doesNotMatch(sql,/grant\s+(all|select|update|delete)\s+on\s+app\.crm_contacts\s+to\s+(anon|authenticated|hh_app_backend)/i)
  assert.doesNotMatch(sql,/security definer|marketing_consent|send_sms|send_email/i)
})
test('shared course/service chooser requires a reply contact and opt-in; name is optional',()=>{
  const view=read('components/contact-channel-chooser.tsx')
  const styles=read('components/contact-channel-chooser.module.css')
  for (const term of ['autoComplete="name"','autoComplete="email"',
    'contactConsent: consent', 'contact: { displayName:', 'type="checkbox" required',
    'setConsent(quick)','setDisplayName("")','setPhone("")']) {
    assert.ok(view.includes(term),term)
  }
  // Standard forms start unchecked; the quick form discloses reply-only consent
  // immediately before the explicit Submit action, never a marketing opt-in.
  assert.match(view,/quick = false/)
  assert.match(view,/const \[consent, setConsent\] = useState\(quick\)/)
  assert.match(view,/setConsent\(quick\);[\s\S]*?\}, \[enquiryResetKey, quick\]\)/)
  assert.match(view,/\{!quick && <><details className=\{styles\.optionalName\}>[\s\S]*?type="checkbox" required checked=\{consent\}/)
  assert.match(view,/\{quick && <small className=\{styles\.quickConsent\}>\{c\.quickConsent\}<\/small>\}/)
  assert.match(view,/No marketing, charge or confirmed booking/)
  assert.match(view,/\|\| !consent\) \{/)
  assert.match(read('components/phone-country-input.tsx'),/autoComplete="tel-national"/)
  assert.match(view,/sourcePath: pathname, locale/)
  assert.match(view,/fetch\("\/api\/service-enquiries"/)
  assert.match(view,/name:\s*"Ваше имя"/)
  assert.match(view,/name:\s*"Tu nombre"/)
  assert.match(view,/className=\{styles\.optionalNote\}/)
  assert.doesNotMatch(view,/c\.situation \+ ": " \+ description/)
  const alchemy=read('components/alchemy-soul-lead-form.tsx')
  assert.doesNotMatch(alchemy,/name\.trim\(\) \? \{ context:/)
  assert.doesNotMatch(alchemy,/name="name" autoComplete="given-name"/)
  assert.match(styles,/\.honeypot/)
  assert.match(styles,/@container \(max-width:340px\)/)
  assert.doesNotMatch(view,/localStorage|sendBeacon/i)
  const contacts=read('components/app/crm-manager.jsx')
  const store=read('lib/crm/repository.js')
  assert.match(contacts,/contact\.enquiry\?\.serviceTitle/)
  assert.match(contacts,/contact\.enquiry\.referenceCode/)
  assert.match(store,/\.\.\.\(former\.enquiry \? \{enquiry:former\.enquiry\} : \{\}\)/)
})

