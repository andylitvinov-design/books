// Pure owner-only CRM contact search policy. Do not log queries or contact values.
// Search is performed only on decrypted owner-owned records in a restricted DB transaction.
export const CRM_SEARCH_SCAN_CAP = 3000
export const CRM_SEARCH_RESULTS_CAP = 80

export function parseCrmSearchQuery(input) {
  if (typeof input !== 'string') throw new Error('INVALID_CONTACT_SEARCH')
  const q = input.trim().normalize('NFKC').toLocaleLowerCase()
  if (q.length < 2 || q.length > 80 || /[\u0000-\u001f\u007f]/u.test(q))
    throw new Error('INVALID_CONTACT_SEARCH')
  return q
}
export function parseCrmSearchStage(stage) {
  if (!['all','lead','client','archived'].includes(stage)) throw new Error('INVALID_CONTACT_STAGE')
  return stage === 'all' ? null : stage
}
export function contactMatchesSearch(contact, normalisedQuery) {
  const q = parseCrmSearchQuery(normalisedQuery)
  const fields = [contact.displayName, contact.email, contact.phone]
  const matched = fields.some(value =>
    typeof value === 'string' && value.normalize('NFKC').toLocaleLowerCase().includes(q))
  if (matched) return true
  if (!/^[+0-9 ().-]+$/.test(q)) return false
  const digits = q.replace(/\D/g,'')
  return digits.length >= 3 && typeof contact.phone === 'string' &&
    contact.phone.replace(/\D/g,'').includes(digits)
}
