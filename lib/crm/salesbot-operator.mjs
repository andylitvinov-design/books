// Operator assist is a private, read-only bridge from approved CRM SalesBot
// previews to a human-operated reply composer. Never dispatches to a provider.
import {
  SALESBOT_LOCALES, salesbotOfferPath, validateSalesbotFlow,
} from './salesbot-flow.mjs'

const SAFE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MODES = new Set(['completed', 'waiting_for_choice'])
// Internally activated flows retain their immutable, owner-approved preview.
// Activation does not authorize any automated provider send.
const ELIGIBLE_STATUSES = new Set(['approved_preview', 'active_internal'])

export function approvedSalesbotOperatorFlows(rows) {
  if (!Array.isArray(rows)) return []
  return rows.slice(0, 30).flatMap(row => {
    if (!row || !ELIGIBLE_STATUSES.has(row.status) || !SAFE_UUID.test(row.id || '') ||
      !Number.isSafeInteger(row.version) || row.version < 1) return []
    try {
      return [{ id: row.id, version: row.version, flow: validateSalesbotFlow(row.flow) }]
    } catch { return [] }
  })
}

export function salesbotOperatorSuggestions(result, locale = 'en') {
  if (!SALESBOT_LOCALES.includes(locale) || !result || result.mode !== 'dry_run' ||
    !MODES.has(result.status) || !Array.isArray(result.trace) || result.trace.length > 30 ||
    result.sent !== false || result.leadCreated !== false ||
    result.bookingConfirmed !== false || result.paymentReceived !== false) return []
  const seen = new Set()
  return result.trace.flatMap(step => {
    if (!step || !['message', 'choice', 'offer'].includes(step.kind) ||
      typeof step.nodeId !== 'string' || seen.has(step.nodeId) ||
      typeof step.text !== 'string') return []
    seen.add(step.nodeId)
    const text = step.text.trim()
    if (!text || text.length > 360 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) return []
    let draft = text
    if (step.kind === 'offer') {
      try {
        // Never use an arbitrary link from the response. Only a known public
        // destination computed by the existing, reviewed flow allowlist.
        const path = salesbotOfferPath(step.offerId, locale)
        draft += '\nhttps://holistichouse.vercel.app' + path
      } catch { return [] }
    }
    if (draft.length > 1200) return []
    return [{ nodeId: step.nodeId, kind: step.kind, text: draft }]
  })
}
