import { createHash, createHmac } from 'node:crypto'
import { issuePrescriptionAccess, verifyPrescriptionSecret } from '../prescriptions/access.js'

const derivation = 'owner-link-hmac-v1'
function ownerKey(environment) {
  const encoded = environment.PRESCRIPTIONS_DATA_ENCRYPTION_KEY
  if (encoded) {
    const key = Buffer.from(encoded.trim().replace(/-/g, '+').replace(/_/g, '/'), 'base64')
    if (key.length !== 32) throw new Error('Client links unavailable')
    return key
  }
  if ((['development', 'test'].includes(environment.NODE_ENV) || environment.VERCEL_ENV === 'preview') && environment.PRESCRIPTIONS_ADMIN_TOKEN) return Buffer.from(environment.PRESCRIPTIONS_ADMIN_TOKEN)
  throw new Error('Client links unavailable')
}
function derive(record, environment) {
  const key = createHmac('sha256', ownerKey(environment)).update('psialchemy:owner-client-link-key:v1').digest()
  return createHmac('sha256', key).update(JSON.stringify([derivation, record.id, record.access.selector, record.access.version])).digest('base64url')
}

// Only the authenticated admin endpoint can return a recovered secret.
// The store keeps a hash, never the bearer. Copying another locale must not rotate access.
export async function getOwnerClientLink(store, id, environment = process.env) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const current = await store.findById(id)
    if (!current || current.status !== 'active') throw new Error('Document unavailable')
    if (current.access) {
      if (current.access.ownerDerivation !== derivation) throw new Error('Existing link must be replaced explicitly from the original document controls')
      const secret = derive(current, environment)
      if (!verifyPrescriptionSecret(current, secret)) throw new Error('Client links unavailable')
      return { selector: current.access.selector, secret }
    }
    const issued = issuePrescriptionAccess(current)
    const secret = derive(issued.record, environment)
    issued.record.access.secretHash = createHash('sha256').update(secret).digest('hex')
    issued.record.access.ownerDerivation = derivation
    if (await store.saveAccessIfUnchanged(current, issued.record)) return { selector: issued.selector, secret }
  }
  throw new Error('Document changed. Please try again.')
}
