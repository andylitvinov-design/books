import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  freeExpressOwnerParts, prepareFreeExpressOwnerReply,
} from '../lib/practitioners/free-express-owner-reply-policy.mjs'

const src = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const ref = 'HH-ABCDEF012345'

test('original question and consented questionnaire remain one record',()=>{
  const original = 'Please help me understand a situation'
  const details = 'Questionnaire: detailed\nWhat happened?\nA personal answer'
  assert.deepEqual(freeExpressOwnerParts(original+'\n\n--- Holistic House · free express details (visitor consent) ---\n'+details),
    {initial:original,details})
  assert.deepEqual(freeExpressOwnerParts(original),{initial:original,details:''})
})
test('one private reply contains only public reference and authored answer',()=>{
  assert.equal(prepareFreeExpressOwnerReply(ref,'  Thank you. Please check your cabinet.  '),
    'Free review '+ref+'\n\nThank you. Please check your cabinet.')
  assert.throws(()=>prepareFreeExpressOwnerReply('bad','Hello'),/INVALID_ENQUIRY_REFERENCE/)
  assert.throws(()=>prepareFreeExpressOwnerReply(ref,'x'.repeat(1200)),/MESSAGE_TOO_LONG/)
  assert.throws(()=>prepareFreeExpressOwnerReply(ref,'\u0000hi'),/INVALID_MESSAGE/)
})
test('owner action reuses existing direct messages and requires verified claim',()=>{
  const service=src('../lib/practitioners/free-express-owner-reply.js')
  assert.match(service,/authorizedFreeExpressOwnerMedia/)
  assert.match(service,/app_private\.free_express_account_links/)
  assert.match(service,/recipient_practitioner_id/)
  assert.match(service,/createDirectMessages\(config\)\.send/)
  assert.match(service,/CLIENT_CHANNEL_UNVERIFIED/)
  assert.doesNotMatch(service,/telegram\.org|sendMessage|wa\.me/)
  const route=src('../app/api/app/practice/free-express/[id]/reply/route.js')
  for(const term of ['requireSameOrigin','auth.verified()','x-hh-account-id','consumeRate','PRIVATE_HEADERS'])
    assert.ok(route.includes(term),term)
})
test('Google claim creates private member thread under client role',()=>{
  const claim=src('../app/api/free-express/claim/route.js')
  assert.match(claim,/createDirectMessages\(config\)\.start\(actor/)
  assert.match(claim,/recipient_practitioner_id/)
  assert.match(claim,/saved: true, referenceCode: row.reference_code/)
})
test('additive FORCE RLS owner link keeps claims private and avoids recursion',()=>{
  const migration=src('../supabase/migrations/20261026162646_hh_free_express_owner_account_reply_20261026.sql')
  assert.match(migration,/create policy free_express_account_links_practitioner_read/)
  assert.match(migration,/trusted_auth_user_id=\(select auth.uid\(\)\)/)
  assert.match(migration,/where p\.id=recipient_practitioner_id/)
  assert.doesNotMatch(migration,/grant\s+.*\s+to\s+(?:anon|authenticated|service_role)/i)
})
