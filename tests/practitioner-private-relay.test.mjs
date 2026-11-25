import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {redactRelayContacts,relayContactAlias,relayContactView,assertNoRelayContacts}
  from '../lib/practitioners/relay-privacy.mjs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('master contact envelope never exposes direct contact fields',()=>{
  const c=relayContactView({displayName:'Anna',email:'private@example.org',
    phone:'+14165550101',telegram:'@private_helper',whatsapp:'+14165550101'})
  assert.deepEqual(c,{displayName:'Anna'})
  assert.equal(relayContactAlias('+14165550101'),'Client')
})
test('server masks legacy direct contacts without destroying appointment details',()=>{
  const text='Write private@example.org / @private_helper / +1 (416) 555-0101 / '+ 
    'https://t.me/private_helper / wa.me/14165550101. Tomorrow 20:30 2026-10-23.'
  const masked=redactRelayContacts(text)
  for(const forbidden of ['private@example.org','@private_helper','416','t.me/','wa.me/'])
    assert.ok(!masked.includes(forbidden),forbidden)
  assert.match(masked,/20:30/)
  assert.match(masked,/2026-10-23/)
  assert.throws(()=>assertNoRelayContacts('email me at person@site.com'),/CONTACT_EXCHANGE_BLOCKED/)
  assert.throws(()=>assertNoRelayContacts('call +14165550101'),/CONTACT_EXCHANGE_BLOCKED/)
  assert.equal(assertNoRelayContacts('Available Friday at 14:30 for Reiki.'),'Available Friday at 14:30 for Reiki.')
})
test('both server serializers redact before returning master JSON, not merely hiding UI',()=>{
  const practitioner=read('lib/practitioners/repository.js')
  const publicEnquiry=read('lib/practitioners/public-service-enquiry.js')
  const clientMessages=read('lib/practitioners/client-messages.js')
  assert.match(practitioner,/contact:relayContactView/)
  assert.match(practitioner,/message:redactRelayContacts/)
  assert.match(publicEnquiry,/contact: relayContactView/)
  assert.match(publicEnquiry,/message: redactRelayContacts/)
  assert.match(clientMessages,/assertNoRelayContacts/)
  assert.match(clientMessages,/redactRelayContacts/)
})
test('portal UI does not render or ask master to record direct contacts',()=>{
  const profile=read('components/app/practitioner-client-profiles.jsx')
  const chat=read('components/app/practice-request-conversation.jsx')
  assert.doesNotMatch(profile,/PublicEnquiryContact/)
  assert.doesNotMatch(profile,/\{selected\.contact\}/)
  assert.match(profile,/t\.viaPortal/)
  assert.match(chat,/CONTACT_EXCHANGE_BLOCKED/)
  assert.match(chat,/no Telegram, WhatsApp or email delivery is implied/)
})
