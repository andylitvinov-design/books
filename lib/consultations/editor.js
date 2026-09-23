export const consultationClinicalFields = [['potency', 'Potency'], ['dosage', 'Dosage'], ['frequency', 'Frequency'], ['duration', 'Duration'], ['purpose', 'Purpose'], ['sequence', 'Stage / sequence'], ['instructions', 'Instructions']]

export function initialConsultationRows(consultation, remedies, count = 2) {
  const blank = (withDoseDefaults = true) => ({
    rowKey: crypto.randomUUID(),
    remedySlug: null,
    displayNameOverride: null,
    sourceStatus: null,
    selected: false,
    query: '',
    granules: withDoseDefaults ? '5' : '',
    timesPerDay: withDoseDefaults ? '3' : '',
  })
  return consultation?.items?.map((item) => ({
    ...blank(false), ...item,
    sourceStatus: item.remedySlug ? 'canonical' : item.sourceStatus ?? 'custom',
    selected: Boolean(item.remedySlug || item.displayNameOverride?.trim()),
    query: (item.remedySlug ? remedies.find((remedy) => remedy.slug === item.remedySlug)?.label : null) ?? item.displayNameOverride ?? item.remedySlug ?? '',
  })) ?? Array.from({ length: count }, () => blank(true))
}

export function serializeConsultationRows(rows) {
  return rows.filter((row) => row.selected).map((row) => ({
    remedySlug: row.remedySlug || null,
    displayNameOverride: row.remedySlug ? null : row.displayNameOverride,
    sourceStatus: row.sourceStatus,
    granules: row.granules ?? '',
    timesPerDay: row.timesPerDay ?? '',
    ...Object.fromEntries(consultationClinicalFields.map(([key]) => [key, row[key] ?? ''])),
  }))
}

export function validateConsultationRows(rows) {
  return rows.some((row) => row.selected) && !rows.some((row) => row.query.trim() && !row.selected)
}
