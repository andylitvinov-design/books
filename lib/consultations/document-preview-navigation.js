/**
 * Keep links to older standalone reports functional while directing client-bound
 * consultations back to the current practitioner studio. Editing never creates a
 * second report: every destination loads the same stored document ID.
 */
export function documentPreviewEditHref(record, consultationId) {
  const id = encodeURIComponent(record.id)
  if (record.kind === 'payment') return `/admin/payments/${id}#edit-payment`
  if (consultationId || record.clientId) return `/admin/consultations/${id}/edit`
  return `/admin/prescriptions/${id}#edit-recommendation`
}
