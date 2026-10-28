import test from 'node:test'
import assert from 'node:assert/strict'
import { readTalismanRequestDraft, formatTalismanRequestDraft,
  TALISMAN_REQUEST_DRAFT_KEY, REMOTE_SUPPORT_DRAFT_TTL } from '../lib/practitioners/remote-energy-support.js'
import { TAOIST_TALISMANS } from '../lib/practitioners/taoist-talismans.js'

const now = 1_800_000_000_000
const serviceId = 'synthetic-public-service'
const base = { version:1, serviceId, practitioner:'Synthetic public practitioner',
  goal:'Work and money', savedAt:now }
const storage = value => ({ getItem(key) {
  assert.equal(key, TALISMAN_REQUEST_DRAFT_KEY)
  return JSON.stringify(value)
} })
const read = (value, at = now, service = serviceId) => readTalismanRequestDraft(storage(value), service, at)

test('existing version-one metadata drafts remain accepted without a catalog ID', () => {
  const result = read(base)
  assert.deepEqual(result, base)
  assert.deepEqual(Object.keys(result).sort(), ['goal','practitioner','savedAt','serviceId','version'])
  assert.notEqual(result, base)
  assert.match(formatTalismanRequestDraft(result), /not ordered or paid/)
})

test('all authored catalog drafts retain their matching goal, ID and public fields', () => {
  for (const item of TAOIST_TALISMANS) {
    const value = { ...base, goal:item.goal, catalogId:item.id }
    assert.deepEqual(read(value), value)
    assert.deepEqual(Object.keys(read(value)).sort(), ['catalogId','goal','practitioner','savedAt','serviceId','version'])
    for (const locale of ['en','ru','es']) assert.ok(formatTalismanRequestDraft(read(value), locale).includes(item[locale].title))
  }
})

for (const field of ['intention','message','assessmentAnswers','assessmentId','clientId','report','image','contact','secret','metadata','constructor','__proto__']) {
  test('rejects extra ' + field + ' rather than returning or silently projecting it', () => {
    assert.equal(read({ ...base, [field]:'SYNTHETIC_UNREVIEWED_FIELD' }), null)
  })
}

test('unknown-field rejection also applies to otherwise valid catalog drafts', () => {
  for (const item of TAOIST_TALISMANS)
    assert.equal(read({ ...base, goal:item.goal, catalogId:item.id, answers:['SYNTHETIC_ANSWER'] }), null)
})

test('same-service binding, existing expiry boundary and future-clock tolerance are unchanged', () => {
  assert.equal(REMOTE_SUPPORT_DRAFT_TTL, 24 * 60 * 60 * 1000, 'TALISMAN_TTL_24H')
  assert.equal(read(base, now, 'other-public-service'), null)
  assert.ok(read(base, now + 24 * 60 * 60 * 1000))
  assert.equal(read(base, now + 24 * 60 * 60 * 1000 + 1), null)
  assert.ok(read({ ...base, savedAt:now + 60_000 }))
  assert.equal(read({ ...base, savedAt:now + 60_001 }), null, 'TALISMAN_FUTURE_TOLERANCE')
})

test('controlled goal/catalog, public name and raw-size validation remain strict', () => {
  for (const change of [
    { version:2 }, { goal:'uncontrolled synthetic text' }, { catalogId:'unknown-design' },
    { goal:'Inner balance and calm', catalogId:'fu-prosperity' },
    { practitioner:'x'.repeat(121) }, { practitioner:'synthetic\nname' },
    { practitioner:'<synthetic>' }, { savedAt:0.5 },
  ]) assert.equal(read({ ...base, ...change }), null)
  assert.equal(readTalismanRequestDraft({ getItem: () => 'x'.repeat(1001) }, serviceId, now), null)
  assert.equal(readTalismanRequestDraft({ getItem: () => '{invalid' }, serviceId, now), null)
  assert.equal(readTalismanRequestDraft({ getItem() { throw new Error('synthetic storage unavailable') } }, serviceId, now), null)
  for (const value of [null, [], 'synthetic', 1]) assert.equal(read(value), null)
})


test('service binding requires a nonempty string in both caller and persisted draft', () => {
  const { serviceId: ignored, ...missingService } = base
  for (const caller of [undefined, null, '', 0, 1, {}, []]) {
    assert.equal(readTalismanRequestDraft(storage(base), caller, now), null)
    assert.equal(readTalismanRequestDraft(storage(missingService), caller, now), null)
  }
  for (const value of [missingService, { ...base, serviceId:undefined },
    ...[null, '', 0, 1, {}, [], 'different-service'].map(serviceId => ({ ...base, serviceId }))])
    assert.equal(readTalismanRequestDraft(storage(value), serviceId, now), null)
  assert.deepEqual(readTalismanRequestDraft(storage(base), serviceId, now), base)
})
