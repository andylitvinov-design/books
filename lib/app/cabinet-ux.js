export function getPortraitNextStep({ dimensions = [] }) {
  const hasState = dimensions.some((dimension) => dimension.dimensionClass === 'state')
  const hasTendencies = dimensions.some((dimension) => dimension.dimensionClass === 'trait')

  if (!hasState) return { kind: 'state', href: '/tests' }
  if (!hasTendencies) return { kind: 'tendencies', href: '/tests' }
  return { kind: 'history', href: '/history' }
}

export function reportTimeline(savedReports = []) {
  return savedReports.map((report) => ({
    id: report.id,
    occurredAt: `${report.occurredOn}T12:00:00.000Z`,
    savedAt: report.savedAt,
  }))
}
