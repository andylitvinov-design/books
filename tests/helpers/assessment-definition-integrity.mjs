import { createHash } from 'node:crypto'
import { canonicalJSON } from '../../lib/assessments/contracts.js'

// Source integrity for immutable assessment definitions. The five published
// 19-Oct-2026 v1 additions used a SHA-256 **item-set** fingerprint as their
// contentHash instead of the canonical full-definition digest used elsewhere.
// Preserve those v1 identities and any saved results; guard ALL source fields
// with separate pinned full-definition fingerprints until an additive new
// registered version replaces the legacy scheme. Do not silently rewrite v1.
const LEGACY_ITEM_FINGERPRINTS = Object.freeze({
  'ipip-emotion-decision-making-9': Object.freeze({
    id:'13deba1e-e350-5593-85c7-30f2c9815cbd',
    full:'sha256:00b20d0d0629ee95ae20ee259fa578d2f8671b763b3d40c84f26a4a003bdd72f',
  }),
  'ipip-responsive-joy-10': Object.freeze({
    id:'00089afb-3905-5e84-8efb-f0566342aff5',
    full:'sha256:ed8f57940c02cd76b187a7f31cbde3aae986a4b01bedf906cf90341cda6216c7',
  }),
  'ipip-responsive-distress-10': Object.freeze({
    id:'eea5bd21-9620-5fd6-bc2a-9809e590fbd2',
    full:'sha256:e3f9429958c33993327f4b1914897125d8632f2cf2c07adbb4618d529a43f10f',
  }),
  'ipip-empathic-concern-10': Object.freeze({
    id:'608dce45-8984-51bc-9f1d-5dc8aa9eac8e',
    full:'sha256:542c912371a0b2208dbdd3dea235dfd67dcd6eeeae2ae1b732f282e875b14834',
  }),
  'ons-personal-wellbeing-4': Object.freeze({
    id:'78e257f3-7d2d-5feb-a317-d39f8c2a8e19',
    full:'sha256:227a78206ac9adb4106b8d7c3f1044307f9aefe5414c485e10d1dbecac4d563b',
  }),
})

const digest = value => 'sha256:' + createHash('sha256').update(value,'utf8').digest('hex')

export function assessmentSourceHashVerification(definition) {
  if (!definition || !definition.contentHash) throw new Error('SOURCE_HASH_REQUIRED')
  const { contentHash, ...body } = definition
  const full = digest(canonicalJSON(body))
  if (full === contentHash) return Object.freeze({kind:'canonical-full-definition',full})
  const pinned = LEGACY_ITEM_FINGERPRINTS[definition.key]
  if (!pinned || definition.id !== pinned.id ||
      definition.version !== 'v1' || definition.instrumentLocale !== 'en' ||
      full !== pinned.full) throw new Error('INVALID_SOURCE_DEFINITION_HASH')

  const spec = definition.scoring?.dimensions?.[0]
  if (!Array.isArray(definition.questions) ||
      !definition.questions.length || !spec ||
      !Array.isArray(spec.items) ||
      definition.questions.some((q,i) => q.id !== spec.items[i] &&
        definition.key !== 'ons-personal-wellbeing-4'))
    throw new Error('INVALID_SOURCE_ITEM_FINGERPRINT')
  let fingerprintInput
  if (definition.key === 'ons-personal-wellbeing-4') {
    if (definition.questions.length !== 4 ||
        definition.scoring.dimensions.length !== 4 ||
        !definition.scoring.dimensions.every((scale,index) =>
          scale.method === 'value' && scale.items?.length === 1 &&
          scale.items[0] === definition.questions[index].id))
      throw new Error('INVALID_ONS_SOURCE_FORM')
    fingerprintInput = {key:definition.key,items:definition.questions.map(q=>q.text)}
  } else {
    const reverse = spec.reverseItems || []
    const positiveCount=spec.items.length-reverse.length
    if (spec.method !== 'sum' ||
        reverse.length === 0 ||
        reverse.some((id,i)=>id !== spec.items[positiveCount+i]))
      throw new Error('INVALID_IPIP_SOURCE_SCORING')
    fingerprintInput={
      key:definition.key,
      items:definition.questions.map(q=>q.text),
      positiveCount,
    }
  }
  if (digest(JSON.stringify(fingerprintInput)) !== contentHash)
    throw new Error('INVALID_SOURCE_ITEM_FINGERPRINT')
  return Object.freeze({kind:'legacy-item-set-with-pinned-full-definition',full})
}

export const LEGACY_SOURCE_FINGERPRINT_KEYS = Object.freeze(
  Object.keys(LEGACY_ITEM_FINGERPRINTS),
)
