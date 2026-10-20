// Private owner-requested CSV only. Never add health, assessments, consultation
// notes or access tokens to this export.
export const CRM_EXPORT_MAX_CONTACTS = 5000
const HEADERS = Object.freeze([
  'contact_id','name','email','phone','language','stage','source',
  'email_verified','do_not_contact','created_at',
])

function cell(value) {
  let text = String(value ?? '').replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ').trim()
  // Excel/LibreOffice can evaluate formulas even inside quoted CSV cells.
  // Include leading + and - (phone and numeric-looking values) in protection.
  if (/^[\s\u200b\ufeff]*[=+@-]/iu.test(text)) text = "'" + text
  return '"' + text.replace(/"/g,'""') + '"'
}
export function exportCrmContactsCsv(contacts) {
  if (!Array.isArray(contacts) || contacts.length > CRM_EXPORT_MAX_CONTACTS)
    throw new Error('EXPORT_TOO_LARGE')
  const lines = [HEADERS.map(cell).join(',')]
  for (const r of contacts) {
    const fields = [
      r.id,r.displayName,r.email,r.phone,r.locale,r.lifecycle,r.source,
      r.emailVerified ? 'yes':'no',r.suppressed ? 'yes':'no',
      r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    ]
    lines.push(fields.map(cell).join(','))
  }
  return lines.join('\r\n') + '\r\n'
}
