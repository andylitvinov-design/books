export const consultationClinicalFields = [['potency', 'Potency'], ['dosage', 'Dosage'], ['frequency', 'Frequency'], ['duration', 'Duration'], ['purpose', 'Purpose'], ['sequence', 'Stage / sequence'], ['instructions', 'Instructions']]

export function initialConsultationRows(consultation, remedies, count = 2) {
  const blank = () => ({ rowKey: crypto.randomUUID(), remedySlug: null, displayNameOverride: null, sourceStatus: null, selected: false, query: '' })
  return consultation?.items?.map((item) => ({
    ...blank(), ...item,
    sourceStatus: item.remedySlug ? 'canonical' : item.sourceStatus ?? 'custom',
    selected: Boolean(item.remedySlug || item.displayNameOverride?.trim()),
    query: (item.remedySlug ? remedies.find((remedy) => remedy.slug === item.remedySlug)?.label : null) ?? item.displayNameOverride ?? item.remedySlug ?? '',
  })) ?? Array.from({ length: count }, blank)
}

export function serializeConsultationRows(rows) {
  return rows.filter((row) => row.selected).map((row) => ({
    remedySlug: row.remedySlug || null,
    displayNameOverride: row.remedySlug ? null : row.displayNameOverride,
    sourceStatus: row.sourceStatus,
    ...Object.fromEntries(consultationClinicalFields.map(([key]) => [key, row[key] ?? ''])),
  }))
}

export function validateConsultationRows(rows) {
  return rows.some((row) => row.selected) && !rows.some((row) => row.query.trim() && !row.selected)
}
