import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DOCUMENT_TEMPLATE } from './template.js'

// Inline only into an authorized document (or explicitly enabled synthetic preview).
// The reusable signature asset is deliberately outside public/.
export function signatureDataUri() {
  return `data:image/png;base64,${readFileSync(resolve(process.cwd(), DOCUMENT_TEMPLATE.signature.path)).toString('base64')}`
}
