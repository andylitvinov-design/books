import { hasCoachContextGrant } from './context-cloud-consent.mjs'

const validSources = new Map([
  ['goals', 'saved_life_plan'],
  ['actions', 'saved_life_plan'],
  ['reports', 'reviewed_report'],
  ['preferences', 'client_preference'],
])

// Accept only server-resolved sources from the current owner transaction.
export function selectCoachContext(request, items, grants) {
  const packet = { version: 2, purpose: 'coaching_dialogue', items: [] }
  if (!request?.topicKey || request.optOut || request.topicChanged || request.corrected ||
      !Array.isArray(items)) return packet
  const ranked = items.filter(item =>
    item?.accountId === request.accountId &&
    item.status === 'confirmed' && item.sensitivity === 'coach_shareable' &&
    item.topicKey === request.topicKey &&
    validSources.has(item.category) && validSources.get(item.category) === item.sourceKind &&
    typeof item.sourceRevision === 'string' && item.sourceRevision.length > 0 &&
    item.sourceRevision === item.currentSourceRevision &&
    Number.isFinite(item.reviewedAt) && item.reviewedAt <= request.now &&
    (item.expiresAt === null || item.expiresAt > request.now) &&
    typeof item.text === 'string' && item.text.trim() && item.text.length <= 240 &&
    hasCoachContextGrant({ ...request, category: item.category, itemId: item.id,
      sourceRevision: item.sourceRevision }, grants)
  ).sort((a, b) =>
    Number(b.id === request.selectedItemId) - Number(a.id === request.selectedItemId) ||
    b.reviewedAt - a.reviewedAt || (a.id < b.id ? -1 : Number(a.id > b.id))
  )

  const seen = new Set()
  for (const item of ranked) {
    if (seen.has(item.id)) continue
    const projection = { kind: item.category, sourceKind: item.sourceKind, text: item.text }
    const candidate = { ...packet, items: [...packet.items, projection] }
    if (Buffer.byteLength(JSON.stringify(candidate)) > 1200) continue
    packet.items.push(projection)
    seen.add(item.id)
    if (packet.items.length === 6) break
  }
  return packet
}
