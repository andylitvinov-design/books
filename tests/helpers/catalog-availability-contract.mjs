import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { canonicalJSON } from '../../lib/assessments/contracts.js'
import { MONITORING_CATALOG } from '../../data/assessments/catalog.js'
import { interpretationPlan, interpretationRegistryCoverage } from '../../lib/assessments/interpretation-registry.js'

// Immutable golden provenance, not an expectation derived from current output:
// pre-addition commit b36c91f568ecfc0a2d39c7f952142e677db264c2,
// catalog e04e76dcdb0819221ce0bd938d2ce74cc6319bdf (145 active), registry
// ca1959be4860f125613878b5aae4f86dc63d6dea (290 reviewed union identities).
// Pre-hold catalog 485edcd5a6f5db7837209156c685432ac7960067 adds exactly
// these five identities. The approved hold affects only ONS v1/en, not history.
export const ONS_REFERENCE_KEY = 'ons-personal-wellbeing-4'
export const ADDITIONAL_STARTABLE_KEYS = Object.freeze([
  'ipip-emotion-decision-making-9', 'ipip-responsive-joy-10',
  'ipip-responsive-distress-10', 'ipip-empathic-concern-10',
])
const addedKeys = [...ADDITIONAL_STARTABLE_KEYS, ONS_REFERENCE_KEY]
export const CURRENT_ACTIVE_COUNT = 145 + ADDITIONAL_STARTABLE_KEYS.length
export const CURRENT_REVIEWED_COUNT = 290 + addedKeys.length
export const CURRENT_PROFESSIONAL_COUNT = 72 + ADDITIONAL_STARTABLE_KEYS.length
// `registered` is a local interpretation-plan count, never a DB-state claim.
export const EXPECTED_LOCAL_INTERPRETATION_COVERAGE = Object.freeze({
  total: CURRENT_ACTIVE_COUNT, registered: 150, uncovered: Object.freeze([]),
  obsolete: Object.freeze([ONS_REFERENCE_KEY + ':v1']),
})
const digest = rows => createHash('sha256').update(JSON.stringify(rows)).digest('hex')
const identity = row => [row.key, row.version, row.instrumentLocale].join(':')

export function assertCatalogAvailability(catalog = MONITORING_CATALOG) {
  const held = catalog.filter(row => row.key === ONS_REFERENCE_KEY)
  assert.equal(held.length, 1, 'Exactly one ONS reference must remain')
  const [ons] = held
  assert.deepEqual([ons.version, ons.instrumentLocale, ons.startable, ons.availability, ons.registrationRequired],
    ['v1', 'en', false, 'reference-only', true])
  assert.equal(interpretationPlan(ons.key, ons.version)?.key, ons.key, 'Historical ONS interpretation must remain')
  const active = catalog.filter(row => row.startable)
  const priorIdentities = [...active, ons].map(identity).sort()
  assert.equal(priorIdentities.length, 150)
  assert.equal(new Set(priorIdentities).size, 150)
  assert.equal(digest(priorIdentities), '880a2c547ffbf59e2932a68994cd351ed4ea0f4a17cf35c2356e6a1cb5c8488c',
    'No previously enabled identity may disappear or be substituted')
  const earlier = active.filter(row => !addedKeys.includes(row.key)).map(identity).sort()
  assert.equal(earlier.length, 145)
  assert.equal(digest(earlier), 'edca21e965d2b078ec6c2d38ccacfaaba33381b2d7ece90c44f4d06044377733',
    'All pre-addition instruments remain available')
  for (const key of ADDITIONAL_STARTABLE_KEYS) {
    const rows = active.filter(row => row.key === key)
    assert.equal(rows.length, 1, key)
    assert.deepEqual([rows[0].version, rows[0].instrumentLocale, rows[0].testStyle, rows[0].rightsStatus],
      ['v1', 'en', 'professional', 'cleared'], key)
  }
  assert.deepEqual(interpretationRegistryCoverage(catalog), EXPECTED_LOCAL_INTERPRETATION_COVERAGE)
  return active
}

export function assertReviewedCatalogInventory(entries) {
  assertCatalogAvailability()
  const keys = entries.map(row => row.key).sort()
  assert.equal(keys.length, CURRENT_REVIEWED_COUNT)
  assert.equal(new Set(keys).size, keys.length)
  for (const key of addedKeys) assert.equal(keys.filter(value => value === key).length, 1, key)
  const earlier = keys.filter(key => !addedKeys.includes(key))
  assert.equal(earlier.length, 290)
  assert.equal(digest(earlier), '000132727224acb229ca59ff9725eea5b4ebce631cf9d63e1c624060ecdb0a70',
    'All 290 prior reviewed identities remain; only the five canonical additions are allowed')
  const ons = entries.find(row => row.key === ONS_REFERENCE_KEY)
  assert.equal(ons.startable, false)
  assert.equal(ons.selectable, false)
}

// Exact immutable additions from b378a90572118f98586d3967c4f9a6958d9f2fa7,
// source blob20dc9bc66902372229d9339b98fc9746702968d1. These are the only
// IDs omitted from older definition-set snapshots; their contents stay pinned.
export function assertAdditionalDefinitionIdentities(definitions) {
  const ids = new Set([
    '13deba1e-e350-5593-85c7-30f2c9815cbd',
    '00089afb-3905-5e84-8efb-f0566342aff5',
    'eea5bd21-9620-5fd6-bc2a-9809e590fbd2',
    '608dce45-8984-51bc-9f1d-5dc8aa9eac8e',
    '78e257f3-7d2d-5feb-a317-d39f8c2a8e19',
  ])
  const additions = definitions.filter(definition => ids.has(definition.id))
  assert.equal(additions.length, ids.size)
  assert.equal(createHash('sha256').update(canonicalJSON(additions)).digest('hex'),
    'a242d6b77eeb010a5c8b965a89c1d1d97acab13321cbd745e289f935b17187e7',
    'All five canonical appended definitions must remain byte-equivalent in content')
  return ids
}
