// Client-side filtering for the practitioner's own offerings; no extra API calls or personal data.
const normalize = value => String(value ?? '').trim().toLocaleLowerCase()

function searchableCopy(item) {
  const descriptions = [
    item.copy,
    ...Object.values(item.localizedCopy || {}),
    ...Object.values(item.draftCopy?.copy || {}),
  ]
  return [
    ...descriptions.flatMap(copy => copy && typeof copy === 'object'
      ? [copy.title, copy.shortDescription, copy.description]
      : []),
    ...(item.methods || []),
    ...(item.goals || []),
    ...(item.benefits || []),
    item.areaKey?.replaceAll('_', ' '),
    item.locationLabel,
  ].filter(value => typeof value === 'string').join(' ').toLocaleLowerCase()
}

export function filterPracticeServices(items = [], filters = {}) {
  const query = normalize(filters.query)
  const status = filters.status || 'all'
  const area = filters.area || 'all'
  const format = filters.format || 'any'
  const price = filters.price || 'any'
  return (Array.isArray(items) ? items : []).filter(item => {
    if (status === 'published' && item.status !== 'published') return false
    if (status === 'review' && !['submitted', 'changes_requested'].includes(item.status)) return false
    if (status === 'draft' && !['draft', 'paused', 'suspended'].includes(item.status)) return false
    if (area !== 'all' && item.areaKey !== area) return false
    if (format === 'online' && !['online', 'hybrid'].includes(item.deliveryFormat)) return false
    if (format === 'in_person' && !['in_person', 'hybrid'].includes(item.deliveryFormat)) return false
    if (price === 'free' && item.pricingMode !== 'free') return false
    if (price === 'priced' && !['fixed', 'from'].includes(item.pricingMode)) return false
    if (price === 'contact' && item.pricingMode !== 'contact') return false
    return !query || searchableCopy(item).includes(query)
  })
}
