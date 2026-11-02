import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {validateContactInput} from '../lib/crm/consent.js'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const base={displayName:'Synthetic Caller',locale:'en',lifecycle:'lead',source:'website'}

test('phone-first lead needs at least one contact channel, never fake email',()=>{
 const byPhone=validateContactInput({...base,phone:'+1 (416) 555-1234'})
 assert.equal(byPhone.phone,'+14165551234')
 assert.equal(byPhone.email,'')
 assert.equal(validateContactInput({...base,email:'hello@example.test'}).phone,'')
 assert.equal(validateContactInput({...base,email:'HELLO@Example.Test',phone:'+447700900123'}).email,'hello@example.test')
 assert.throws(()=>validateContactInput(base),/CONTACT_CHANNEL_REQUIRED/)
})
test('phone is international only; reject malformed, injection and clinical fields',()=>{
 for(const phone of ['4165551234','+0','+123','+1abc','+1\n4165551234','+1<script>','+1'.repeat(60)])
  assert.throws(()=>validateContactInput({...base,phone}))
 assert.throws(()=>validateContactInput({...base,phone:'+14165551234',diagnosis:'private'}))
 assert.throws(()=>validateContactInput({...base,email:'a@b.test',phone:'hello telegram'}))
})
test('phone HMAC and encryption retain owner isolation and no email fabrication',()=>{
 const repo=read('lib/crm/repository.js'),schema=read('supabase/migrations/20261018184529_hh_crm_phone_first_contacts_20261018.sql')
 assert.match(repo,/seal\(\{ displayName: data\.displayName, email: data\.email, phone: data\.phone \}/)
 assert.match(repo,/scope: 'crm-email-less-contact'/)
 assert.match(repo,/scope: 'crm-phone'/)
 assert.match(repo,/phone_hash,locale,lifecycle,source/)
 assert.match(schema,/add column phone_hash text/)
 assert.match(schema,/unique index crm_contacts_owner_phone_hash_uniq/)
 assert.match(schema,/where phone_hash is not null/)
 assert.doesNotMatch(repo,/assessment_results|assessment_runs|service_role/)
})
test('phone-only contacts never get email verification or marketing sends',()=>{
 const store=read('lib/crm/email-store.js')
 const ui=read('components/app/crm-email-tools.jsx')
 const manager=read('components/app/crm-manager.jsx')
 assert.match(store,/if \(!contact\.email\) throw new AppError\('EMAIL_ADDRESS_REQUIRED'/)
 assert.match(ui,/const noEmail=!contact\.email\?\.trim\(\)/)
 assert.match(ui,/noEmail\?<p className=\{styles\.warning\}>/)
 assert.match(manager,/type="tel"/)
 assert.match(manager,/!email\.trim\(\)&&!phone\.trim\(\)/)
 assert.match(manager,/save\('create_contact', \{ displayName, email, phone, locale: language, lifecycle, source \}\)/)
})
