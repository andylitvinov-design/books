import test from 'node:test'
import assert from 'node:assert/strict'
import { validateConsentEvent, marketingEligibility, validateContactInput } from '../lib/crm/consent.js'
import { prepareCampaignPlan, validateCampaignDraft } from '../lib/crm/campaigns.js'
const id = '11111111-1111-4111-8111-111111111111'
const now = new Date('2026-10-13T12:00:00Z')
const event = { id: '22222222-2222-4222-8222-222222222222', contactId: id, channel: 'email', purpose: 'product_updates', decision: 'granted', occurredAt: '2026-10-13T10:00:00Z', source: 'account_preferences', textVersion: 'crm-marketing-v1', actorKind: 'contact' }
const check = (events, extra = {}) => marketingEligibility({ contactId: id, channel: 'email', verifiedAddress: true, events, ...extra }, now)
test('subscription alone never grants marketing consent', () => assert.equal(check([]).allowed, false))
test('explicit evidence permits only its verified channel', () => { assert.equal(check([event]).allowed, true); assert.equal(check([event], { channel: 'telegram' }).allowed, false); assert.equal(check([event], { verifiedAddress: false }).allowed, false) })
test('suppression overrides consent and later grant', () => assert.equal(check([event], { suppressed: true }).reason, 'suppressed'))
test('withdrawal wins equal timestamps regardless of event order', () => { const withdrawn = { ...event, decision: 'withdrawn' }; assert.equal(check([event, withdrawn]).allowed, false); assert.equal(check([withdrawn, event]).allowed, false) })
test('out of order old grant cannot reopen withdrawal', () => assert.equal(check([{ ...event, decision: 'withdrawn', occurredAt: '2026-10-13T11:00:00Z' }, event]).allowed, false))
test('future, missing and unexpected evidence are rejected', () => { assert.throws(() => validateConsentEvent({ ...event, source: '' }, now)); assert.throws(() => validateConsentEvent({ ...event, occurredAt: '2027-01-01' }, now)); assert.throws(() => validateConsentEvent({ ...event, answers: [] }, now)); assert.equal(check([{ ...event, textVersion: '' }]).allowed, false) })
test('contact input rejects medical fields and invalid email', () => { const c = { displayName: 'Synthetic Person', email: 'synthetic@example.test', locale: 'en', lifecycle: 'lead' }; assert.equal(validateContactInput(c).locale, 'en'); assert.throws(() => validateContactInput({ ...c, diagnosis: 'not allowed' })); assert.throws(() => validateContactInput({ ...c, email: 'bad\naddress' })) })
test('campaigns reject health segmentation and arbitrary personalization', () => { assert.throws(() => validateCampaignDraft({ templateId: 'course_update', locale: 'en', channel: 'email', segment: 'low_mood' })); assert.throws(() => validateCampaignDraft({ templateId: 'course_update', locale: 'en', channel: 'email', segment: 'all_opted_in', scores: [] })) })
const draft = { templateId: 'course_update', locale: 'en', channel: 'email', segment: 'all_opted_in' }
const sender = { name: 'Synthetic sender', postalAddress: 'Synthetic postal address', contactUrl: 'https://example.test/contact', unsubscribeBaseUrl: 'https://example.test/unsubscribe' }
const contact = { id, consentEvents: [event], verifiedAddress: true, subscriptionActive: true }
test('campaign requires sender identity and secure unsubscribe URL', () => assert.throws(() => prepareCampaignPlan({ draft, contacts: [], sender: { ...sender, unsubscribeBaseUrl: 'http://example.test' } }, now)))
test('unapproved or unconfigured sends stay excluded', () => { assert.equal(prepareCampaignPlan({ draft, contacts: [contact], sender }, now).excluded[0].reason, 'campaign_approval_required'); assert.equal(prepareCampaignPlan({ draft, contacts: [contact], sender, approvedContactIds: [id] }, now).excluded[0].reason, 'provider_unconfigured') })
test('approved plan deduplicates and never sends', () => { const p = prepareCampaignPlan({ draft, contacts: [contact, contact], sender, approvedContactIds: [id], providerReady: true }, now); assert.equal(p.recipients.length, 1); assert.equal(p.status, 'prepared_only'); assert.equal(p.requiresSendTimeConsentRecheck, true); assert.deepEqual(Object.keys(p.recipients[0]), ['contactId', 'consentEventId']) })
test('withdrawn recipient excluded even when owner approves', () => { const p = prepareCampaignPlan({ draft, contacts: [{ ...contact, suppressed: true }], sender, approvedContactIds: [id], providerReady: true }, now); assert.equal(p.recipients.length, 0); assert.equal(p.excluded[0].reason, 'suppressed') })
