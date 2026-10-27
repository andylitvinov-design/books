import { recommendProfileBattery } from './profile-battery.js'

// Scale keys and full-questionnaire time/question metadata come only from the
// existing rights-cleared public catalogue. A scale is NOT a stand-alone quiz:
// one questionnaire can provide several scale scores after one completion.
export function buildProfileScaleGroups(tests = [], areas = [], areaAxes = {}) {
  const input = Array.isArray(tests) ? tests : []
  return (Array.isArray(areas) ? areas : []).map(area => {
    const axes = new Set(areaAxes[area] || [])
    const seen = new Set()
    const scales = []
    for (const test of input) {
      if (typeof test?.key !== 'string' || !Array.isArray(test.scales)) continue
      for (const item of test.scales) {
        if (!item || typeof item.key !== 'string' || !axes.has(item.axis) ||
            typeof item.label !== 'string' || !item.label.trim()) continue
        const id = test.key + '::' + item.key
        if (seen.has(id)) continue
        seen.add(id)
        scales.push({
          id, key: item.key, axis: item.axis, label: item.label,
          testKey: test.key, testTitle: test.title,
          testKind: test.testKind,
          // Item count is source-declared. null means it cannot be verified.
          scaleQuestions: Number.isInteger(item.scaleQuestions) && item.scaleQuestions > 0
            ? item.scaleQuestions : null,
          // Exact source questionnaire totals, not invented scale runtimes.
          questions: Number.isInteger(test.questions) && test.questions > 0 ? test.questions : null,
          minutes: Number.isFinite(test.minutes) && test.minutes > 0 ? test.minutes : null,
        })
      }
    }
    scales.sort((a, b) =>
      (a.testKind === 'monitoring' ? 0 : 1) - (b.testKind === 'monitoring' ? 0 : 1) ||
      (a.minutes ?? 99) - (b.minutes ?? 99) ||
      (a.questions ?? 99) - (b.questions ?? 99) ||
      a.axis.localeCompare(b.axis) || a.label.localeCompare(b.label))
    return { area, scales }
  })
}

// Suggest up to three *existing* source-declared scales for each topic, first
// covering different axes, then alternative subscales. No mandatory scales.
export function defaultProfileScaleIds(groups = [], perTopic = 3) {
  const selected = new Set()
  const cap = Number.isInteger(perTopic) ? Math.max(0, Math.min(5, perTopic)) : 0
  for (const group of groups) {
    const chosen = []
    const axes = new Set()
    for (const scale of group.scales || []) {
      if (chosen.length >= cap) break
      if (axes.has(scale.axis)) continue
      chosen.push(scale.id)
      axes.add(scale.axis)
    }
    for (const scale of group.scales || []) {
      if (chosen.length >= cap) break
      if (!chosen.includes(scale.id)) chosen.push(scale.id)
    }
    chosen.forEach(id => selected.add(id))
  }
  return [...selected]
}

export function selectedProfileAxes(groups = [], ids = []) {
  const picked = new Set(ids)
  return [...new Set(groups.flatMap(group => (group.scales || [])
    .filter(scale => picked.has(scale.id)).map(scale => scale.axis)))]
}

// The mode changes only eligible catalogue alternatives, not scoring,
// licensing, account permissions, or the meaning of individual scales.
export function recommendProfileMode(tests = [], axes = [], mode = 'questionnaires', limit = 5) {
  const kind = mode === 'pro' ? 'professional' : 'monitoring'
  const eligible = (Array.isArray(tests) ? tests : []).filter(test =>
    test?.testKind === kind && Array.isArray(test.axes) &&
    test.axes.some(axis => axes.includes(axis)))
  return [...recommendProfileBattery(eligible, axes, limit)]
}

export function profileBatteryTotals(tests = [], keys = []) {
  const chosen = new Set(keys)
  const source = (Array.isArray(tests) ? tests : []).filter(test => chosen.has(test.key))
  return Object.freeze({
    count: source.length,
    questions: source.reduce((total, t) => total + (t.questions ?? 0), 0),
    minutes: source.reduce((total, t) => total + (t.minutes ?? 0), 0),
  })
}
