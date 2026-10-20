import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { isSmsPhone, marketingEligibility, smsRecordedConsentEligibility } from '../lib/crm/consent.js'
import { manualSmsEligible } from '../lib/crm/manual-sms.js'
import { createSmsStore } from '../lib/crm/sms-store.js'
import { sendCrmSms } from '../lib/crm/sms-dispatch.js'
import { smsRecipientFingerprint } from '../lib/crm/sms.js'
import { seal } from '../lib/app/crypto.js'

const ownerId = '11111111-1111-4111-8111-111111111111'
const contactId = '22222222-2222-4222-8222-222222222222'
const otherId = '33333333-3333-4333-8333-333333333333'
const eventId = '44444444-4444-4444-8444-444444444444'
const requestId = '55555555-5555-4555-8555-555555555555'
const phone = '+14165550123'
const now = new Date('2026-10-20T12:00:00Z')
const event = {
  id: eventId, contactId, channel: 'sms', purpose: 'product_updates',
  decision: 'granted', occurredAt: '2026-10-19T12:00:00Z',
  source: 'synthetic_documented_opt_in', textVersion: 'crm-sms-v1', actorKind: 'owner_recorded',
}
const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const evaluate = (events, extra = {}) => smsRecordedConsentEligibility({
  contactId, phone, events, ...extra,
}, now)
const ledgerRow = raw => ({
  id: raw.id, contact_id: raw.contactId, channel: raw.channel, purpose: raw.purpose,
  decision: raw.decision, occurred_at: raw.occurredAt, source: raw.source,
  text_version: raw.textVersion, actor_kind: raw.actorKind,
})

test('recorded SMS consent preserves existing policy decisions for valid destinations', () => {
  const withdrawn = { ...event, decision: 'withdrawn' }
  const cases = [
    [], [event], [withdrawn], [event, withdrawn], [withdrawn, event],
    [event, { ...withdrawn, occurredAt: '2026-10-20T10:00:00Z' }],
    [{ ...event, contactId: otherId }], [{ ...event, channel: 'email' }],
    [{ ...event, purpose: 'website_reply_only_v1' }],
    [{ ...event, source: '' }], [{ ...event, textVersion: '' }],
    [{ ...event, actorKind: 'untrusted' }],
    [{ ...event, occurredAt: '2026-10-21T12:00:00Z' }],
    [{ ...event, actorKind: 'contact' }],
  ]
  for (const events of cases) {
    for (const suppressed of [false, true]) {
      assert.deepEqual(evaluate(events, { suppressed }), marketingEligibility({
        contactId, channel: 'sms', events, suppressed, verifiedAddress: true,
      }, now))
    }
  }
  assert.deepEqual(evaluate([event]), {
    allowed: true, reason: 'explicit_consent', consentEventId: eventId,
  }, 'no phone ownership or new verification state is returned')
})

test('SMS requires a valid destination and separate scoped evidence, not mere phone presence', () => {
  for (const invalid of ['', undefined, null, 14165550123, [phone], '+0', '+1416-not-a-phone',
    '+1 416 555 0123', phone + '\n', '+14165550123,+14165550124']) {
    assert.equal(isSmsPhone(invalid), false)
    assert.deepEqual(evaluate([event], { phone: invalid }), {
      allowed: false, reason: 'unverified_address',
    })
  }
  assert.equal(isSmsPhone(phone), true)
  assert.equal(evaluate([]).reason, 'no_explicit_consent')
  assert.equal(evaluate([{ ...event, purpose: 'business-reply-only-v1' }]).allowed, false)
  assert.equal(evaluate([{ ...event, contactId: otherId }]).allowed, false)
  assert.equal(evaluate([event], { contactId: 'bad' }).reason, 'invalid_scope')
  assert.equal(evaluate([event], { suppressed: true }).reason, 'suppressed')
  const email = { ...event, channel: 'email' }
  assert.equal(marketingEligibility({
    contactId, channel: 'email', events: [email], verifiedAddress: false,
  }, now).reason, 'unverified_address')
  assert.equal(marketingEligibility({
    contactId, channel: 'email', events: [email], verifiedAddress: true,
  }, now).allowed, true)
})

test('documented owner-recorded SMS consent still enables only manual handset preparation', () => {
  const contact = { id: contactId, phone, lifecycle: 'lead', suppressed: false,
    smsEligibility: evaluate([event]) }
  assert.equal(manualSmsEligible(contact), true)
  assert.equal(manualSmsEligible({ ...contact, smsEligibility: evaluate([]) }), false)
  assert.equal(manualSmsEligible({ ...contact, suppressed: true }), false)
  assert.equal(manualSmsEligible({ ...contact, lifecycle: 'archived' }), false)
})

test('owner-scoped SMS list applies STOP and handles invalid destinations without false eligibility', async () => {
  const config = { encryptionKey: Buffer.alloc(32, 7) }
  const hash = smsRecipientFingerprint(phone, config.encryptionKey)
  let stopped = false
  const queries = []
  const db = { async query(sql, values) {
    queries.push(sql)
    if (sql.includes('from app.crm_consent_ledger')) {
      assert.match(sql, /where owner_id=\$1 and contact_id=any\(\$2::uuid\[\]\)/)
      assert.deepEqual(values, [ownerId, [contactId, otherId]])
      return { rows: [ledgerRow(event)] }
    }
    assert.match(sql, /crm_sms_is_opted_out/)
    assert.deepEqual(values, [[hash]], 'invalid destinations are never fingerprinted')
    return { rows: [{ hash, blocked: stopped }] }
  } }
  const store = createSmsStore(db, { id: ownerId }, config)
  const contacts = [
    { id: contactId, phone, suppressed: false, lifecycle: 'lead' },
    { id: otherId, phone: '+invalid', suppressed: false, lifecycle: 'lead' },
  ]
  const eligible = await store.listSmsEligibility(contacts)
  assert.deepEqual(eligible[0].smsEligibility, evaluate([event]))
  assert.equal(eligible[1].smsEligibility.allowed, false)
  stopped = true
  const blocked = await store.listSmsEligibility(contacts)
  assert.deepEqual(blocked[0].smsEligibility, { allowed: false, reason: 'opted_out' })
  assert.ok(queries.every(sql => sql.startsWith('select ')))
})

test('SMS claim rechecks current owner, consent and STOP before returning dispatch permission', async () => {
  const config = { encryptionKey: Buffer.alloc(32, 7) }
  const hash = smsRecipientFingerprint(phone, config.encryptionKey)
  const encrypted = seal({ phone }, { accountId: ownerId, recordId: contactId, field: 'crm.contact' }, config)
  const payload = seal({ formatted: 'Synthetic message' },
    { accountId: ownerId, recordId: requestId, field: 'crm.sms_job' }, config)
  for (const condition of ['allowed', 'missing_consent', 'withdrawn', 'suppressed', 'archived', 'stop']) {
    const writes = []
    const db = { async query(sql, values) {
      if (sql.startsWith('select id,contact_id,recipient_hash')) {
        assert.deepEqual(values, [requestId, ownerId])
        return { rows: [{ id: requestId, contact_id: contactId, recipient_hash: hash,
          payload_ciphertext: payload, status: 'reserved' }] }
      }
      if (sql.startsWith('select id,contact_ciphertext')) {
        assert.match(sql, /where id=\$1 and owner_id=\$2 for update/)
        assert.deepEqual(values, [contactId, ownerId])
        return { rows: [{ id: contactId, contact_ciphertext: encrypted,
          suppressed: condition === 'suppressed', lifecycle: condition === 'archived' ? 'archived' : 'lead' }] }
      }
      if (sql.includes('from app.crm_consent_ledger')) {
        assert.deepEqual(values, [ownerId, contactId])
        return { rows: condition === 'missing_consent' ? [] : [
          ledgerRow({ ...event, decision: condition === 'withdrawn' ? 'withdrawn' : 'granted' }),
        ] }
      }
      if (sql.includes('crm_sms_is_opted_out')) return { rows: [{ blocked: condition === 'stop' }] }
      assert.match(sql, /update app\.crm_sms_jobs .*where id=\$1 and owner_id=\$2/)
      assert.deepEqual(values, [requestId, ownerId])
      writes.push(sql)
      return { rows: [] }
    } }
    const result = await createSmsStore(db, { id: ownerId }, config).claimSms(requestId)
    assert.equal(result.allowed, condition === 'allowed', condition)
    assert.equal(writes.length, 1)
    assert.match(writes[0], condition === 'allowed' ? /status='dispatching'/ : /status='blocked'/)
  }
})

test('provider-off SMS dispatch cannot reserve or send even with recorded consent', async () => {
  const former = process.env.HH_CRM_SMS_ENABLED
  process.env.HH_CRM_SMS_ENABLED = 'false'
  let touched = false
  try {
    await assert.rejects(sendCrmSms({
      repo: { async withOwner() { touched = true; throw new Error('must not reserve') } },
      actor: { id: ownerId }, payload: { requestId, contactId, body: 'Synthetic message' },
    }), /SMS_NOT_CONFIGURED/)
    assert.equal(touched, false)
  } finally {
    if (former === undefined) delete process.env.HH_CRM_SMS_ENABLED
    else process.env.HH_CRM_SMS_ENABLED = former
  }
})

test('SMS uses recorded-consent naming and truthful EN/RU/ES copy; email still uses verification', () => {
  const sms = source('lib/crm/sms-store.js')
  assert.equal((sms.match(/smsRecordedConsentEligibility\(\{/g) || []).length, 2)
  assert.doesNotMatch(sms, /verifiedAddress|phoneVerified|phoneOwnershipVerified/)
  const email = source('lib/crm/email-store.js')
  assert.match(email, /verifiedAddress:contact\.emailVerified/)
  const ui = source('components/app/crm-sms-tools.jsx')
  assert.equal((ui.match(/phoneNotVerified:/g) || []).length, 3)
  assert.match(ui, /\{c\.phoneNotVerified\}/)
  assert.match(ui, /does not verify that this phone belongs to the contact/)
  assert.match(ui, /не подтверждает, что номер принадлежит этому контакту/)
  assert.match(ui, /no verifica que el teléfono pertenezca al contacto/)
})
