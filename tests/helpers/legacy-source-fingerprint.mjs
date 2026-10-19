import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { canonicalJSON } from '../../lib/assessments/contracts.js'

// Published 19 Oct 2026 as v1 with a *source-item fingerprint* in contentHash,
// unlike the general contract's full canonical-definition digest. Preserve
// those five immutable v1 identifiers. This manifest additionally seals each
// ENTIRE v1 definition; never treat the item-only fingerprint as equivalent to
// a canonical hash or silently rewrite an existing user-facing version.
const LEGACY = Object.freeze({
  'ipip-emotion-decision-making-9': Object.freeze({
    id:'13deba1e-e350-5593-85c7-30f2c9815cbd',
    canonical:'00b20d0d0629ee95ae20ee259fa578d2f8671b763b3d40c84f26a4a003bdd72f',
    fingerprint:'85ba815ae4a2a57da10a5fbf0136fc0bbfbe0e5a32fc3011fe8ef0a34003d35b',
  }),
  'ipip-responsive-joy-10': Object.freeze({
    id:'00089afb-3905-5e84-8efb-f0566342aff5',
    canonical:'ed8f57940c02cd76b187a7f31cbde3aae986a4b01bedf906cf90341cda6216c7',
    fingerprint:'191b04f9610931d98dab5270fc733c687a8bd05c5cc21cf052ce5e952397538c',
  }),
  'ipip-responsive-distress-10': Object.freeze({
    id:'eea5bd21-9620-5fd6-bc2a-9809e590fbd2',
    canonical:'e3f9429958c33993327f4b1914897125d8632f2cf2c07adbb4618d529a43f10f',
    fingerprint:'3f6e099c8027c79bc1fe1d8d46910d0f56c63ed08989714e984d04addde8b282',
  }),
  'ipip-empathic-concern-10': Object.freeze({
    id:'608dce45-8984-51bc-9f1d-5dc8aa9eac8e',
    canonical:'542c912371a0b2208dbdd3dea235dfd67dcd6eeeae2ae1b732f282e875b14834',
    fingerprint:'e8661dad68762e77e466943ab40231675c2447a6872176063c3a74165067558f',
  }),
  'ons-personal-wellbeing-4': Object.freeze({
    id:'78e257f3-7d2d-5feb-a317-d39f8c2a8e19',
    canonical:'227a78206ac9adb4106b8d7c3f1044307f9aefe5414c485e10d1dbecac4d563b',
    fingerprint:'8597bc30247ea6505a7521df9f0dd4d51c13cb86776a5abc6d493fc170df6689',
  }),
})
const digest=value=>createHash('sha256').update(value).digest('hex')

export function assertAssessmentSourceIntegrity(definition) {
  assert.ok(definition && typeof definition==='object','Registered source definition required')
  const {contentHash,...rest}=definition
  const fullDigest=digest(canonicalJSON(rest))
  const legacy=definition.version==='v1' && definition.instrumentLocale==='en'
    ? LEGACY[definition.key] : null
  if (!legacy) {
    assert.equal(contentHash,'sha256:'+fullDigest,
      definition.key+' must use canonical full-source SHA-256')
    return 'canonical'
  }
  assert.equal(definition.id,legacy.id,'Locked legacy source UUID')
  assert.equal(fullDigest,legacy.canonical,
    definition.key+' entire original v1 questionnaire has changed')
  assert.equal(contentHash,'sha256:'+legacy.fingerprint,
    definition.key+' published source-item fingerprint has changed')
  const items=definition.questions.map(q=>q.text)
  const spec=definition.scoring?.dimensions?.[0]
  const payload=definition.key.startsWith('ipip-')
    ? {key:definition.key,items,positiveCount:items.length-(spec?.reverseItems||[]).length}
    : {key:definition.key,items}
  assert.equal(digest(JSON.stringify(payload)),legacy.fingerprint,
    definition.key+' declared fingerprint is not the original item set')
  return 'legacy-source-fingerprint'
}

export function approvedLegacySourceKeys() { return Object.keys(LEGACY).sort() }
