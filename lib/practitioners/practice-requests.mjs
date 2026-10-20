const ACTIVE_STATUSES = new Set(['requested', 'contacted'])

export function summarizePracticeRequests(value, previewLimit = 3) {
  const requests = Array.isArray(value) ? value.filter(Boolean) : []
  const open = requests
    .filter(item => ACTIVE_STATUSES.has(item.status))
    .sort((left, right) => {
      const priority = Number(right.status === 'requested') - Number(left.status === 'requested')
      if (priority) return priority
      const leftTime = Date.parse(left.createdAt || '') || 0
      const rightTime = Date.parse(right.createdAt || '') || 0
      return rightTime - leftTime
    })

  const limit = Number.isSafeInteger(previewLimit) && previewLimit >= 0
    ? Math.min(previewLimit, 10)
    : 3

  return {
    total: requests.length,
    newCount: requests.filter(item => item.status === 'requested').length,
    inProgressCount: requests.filter(item => item.status === 'contacted').length,
    openCount: open.length,
    preview: open.slice(0, limit),
  }
}
