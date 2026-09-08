export function initialPrescriptionRows(prescription, remedies, count = 4) {
  const blank = () => ({ rowKey: crypto.randomUUID(), remedySlug: '', displayNameOverride: '', potency: '', dosage: '', frequency: '', duration: '', instructions: '', notes: '', query: '' })
  return prescription?.items?.map((item) => ({ ...blank(), ...item, query: remedies.find((remedy) => remedy.slug === item.remedySlug)?.label ?? item.displayNameOverride ?? item.remedySlug ?? '' })) ?? Array.from({ length: count }, blank)
}

export function serializePrescriptionRows(rows) {
  return JSON.stringify(rows.filter((row) => Object.entries(row).some(([key, value]) => key !== 'rowKey' && typeof value === 'string' && value.trim())).map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'rowKey' && key !== 'query'))))
}
