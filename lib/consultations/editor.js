export const consultationClinicalFields = [['dosage', 'Dosage'], ['frequency', 'Frequency'], ['duration', 'Duration'], ['purpose', 'Purpose'], ['sequence', 'Stage / sequence'], ['instructions', 'Instructions']]

function recommendationItemType(consultation, item) {
  if (item?.itemType === 'bach' || item?.itemType === 'homeopathy') return item.itemType
  return consultation?.recommendationType === 'bach' ? 'bach' : 'homeopathy'
}

export function initialConsultationRows(consultation, remedies, count = 2) {
  const blank = (withDoseDefaults = true) => ({
    rowKey: crypto.randomUUID(),
    remedySlug: null,
    displayNameOverride: null,
    sourceStatus: null,
    selected: false,
    query: '',
    itemType: 'homeopathy',
    potency: withDoseDefaults ? '30' : '',
    granules: withDoseDefaults ? '5' : '',
    timesPerDay: withDoseDefaults ? '3' : '',
  })
  return consultation?.items?.map((item) => {
    const itemType = recommendationItemType(consultation, item)
    return {
      ...blank(false),
      ...item,
      itemType,
      sourceStatus: item.remedySlug ? 'canonical' : item.sourceStatus ?? 'custom',
      selected: Boolean(item.remedySlug || item.displayNameOverride?.trim()),
      query: (item.remedySlug ? remedies.find((remedy) => remedy.slug === item.remedySlug)?.label : null) ?? item.displayNameOverride ?? item.remedySlug ?? '',
    }
  }) ?? Array.from({ length: count }, () => blank(true))
}

export function serializeConsultationRows(rows) {
  return rows.filter((row) => row.selected).map((row) => ({
    remedySlug: row.itemType === 'bach' ? null : row.remedySlug || null,
    displayNameOverride: row.itemType === 'bach' ? row.query.trim() : row.remedySlug ? null : row.displayNameOverride,
    sourceStatus: row.itemType === 'bach' ? 'custom' : row.sourceStatus,
    itemType: row.itemType === 'bach' ? 'bach' : 'homeopathy',
    potency: row.itemType === 'homeopathy' ? row.potency ?? '' : '',
    granules: row.itemType === 'homeopathy' ? row.granules ?? '' : '',
    timesPerDay: row.itemType === 'homeopathy' ? row.timesPerDay ?? '' : '',
    ...Object.fromEntries(consultationClinicalFields.map(([key]) => [key, row[key] ?? ''])),
  }))
}

export function validateConsultationRows(rows) {
  return rows.some((row) => row.selected) && !rows.some((row) => row.query.trim() && !row.selected)
}
