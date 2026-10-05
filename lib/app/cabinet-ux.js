function byNewest(a, b) {
  return (
    String(b.occurredOn || '').localeCompare(String(a.occurredOn || '')) ||
    Date.parse(b.savedAt || 0) - Date.parse(a.savedAt || 0) ||
    String(a.id).localeCompare(String(b.id))
  )
}

export function getPortraitNextStep({ dimensions = [], savedReports = [], requests = [], now = Date.now() }) {
  const state = dimensions.find((dimension) => dimension.dimensionClass === 'state')
  const hasTendencies = dimensions.some((dimension) => dimension.dimensionClass === 'trait')
  if (!state) return { kind: 'state', href: '/tests' }
  if (!hasTendencies) return { kind: 'tendencies', href: '/tests' }
  if (requests.some((request) => ['requested', 'contacted'].includes(request.status)))
    return { kind: 'consultation', href: '/consultations' }
  const unread = [...savedReports].filter((report) => report.unread && report.available !== false).sort(byNewest)[0]
  if (unread) return { kind: 'report', href: `/reports/${unread.id}` }
  const repeatDays = Number(state.suggestedRepeatDays)
  if (repeatDays > 0 && state.measurementAt && Date.parse(now) >= Date.parse(state.measurementAt) + repeatDays * 86400000)
    return { kind: 'checkin', href: '/tests' }
  return { kind: 'history', href: '/history' }
}

export function reportTimeline(savedReports = []) {
  return [...savedReports]
    .map((report) => ({
      id: report.id,
      occurredOn: String(report.occurredOn).slice(0, 10),
      savedAt: report.savedAt,
      ...(report.unread ? { unread: true } : {}),
      ...(report.available === false ? { available: false } : {}),
    }))
    .sort(byNewest)
}

export function formatReportDate(occurredOn, locale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(`${occurredOn}T00:00:00.000Z`),
  )
}

export function latestCompatibleChange(results = []) {
  const latest = [...results]
    .sort((a, b) => Date.parse(a.measurementAt) - Date.parse(b.measurementAt) || String(a.id).localeCompare(String(b.id)))
    .at(-1)
  if (!latest) return []
  const keys = new Set(latest.dimensions.map((dimension) => dimension.key))
  const prior = [...results]
    .filter((result) => result.id !== latest.id && result.definitionKey === latest.definitionKey && result.definitionVersion === latest.definitionVersion && result.dimensions.every((dimension) => keys.has(dimension.key)) && result.dimensions.length === keys.size)
    .sort((a, b) => Date.parse(a.measurementAt) - Date.parse(b.measurementAt) || String(a.id).localeCompare(String(b.id)))
    .at(-1)
  if (!prior) return []
  return latest.dimensions.map((dimension) => ({ key: dimension.key, previous: prior.dimensions.find((candidate) => candidate.key === dimension.key).value, value: dimension.value }))
}
