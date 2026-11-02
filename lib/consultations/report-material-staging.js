import { validUuid } from '../clients/delivery-model.js'

// Only stable IDs. Never place private media URLs or client details in links.
export function parseReportMaterialIds(raw) {
  if (raw == null || raw === '') return []
  if (typeof raw !== 'string' || raw.length > 2000) throw new Error('INVALID_SESSION_MATERIALS')
  let ids
  try { ids = JSON.parse(raw) } catch { throw new Error('INVALID_SESSION_MATERIALS') }
  if (!Array.isArray(ids) || ids.length > 24 || new Set(ids).size !== ids.length ||
      ids.some(id => !validUuid(id))) throw new Error('INVALID_SESSION_MATERIALS')
  return ids
}

// Create an owner-only draft and preserve any concurrent/personal session content.
// Actual publication remains a separate explicit, authenticated action.
export async function stageReportMaterials({ config, store, report, materialIds }, {
  createSession, getSession, saveDraft,
}) {
  if (!materialIds.length) return null
  if (!validUuid(report?.id) || !validUuid(report?.clientId)) throw new Error('INVALID_REPORT_SOURCE')
  const clientId = report.clientId
  const created = await createSession(config, store, clientId, { documentId: report.id })
  for (let attempt = 0; attempt < 2; attempt++) {
    const session = await getSession(config, store, clientId, created.id)
    if (session.draft?.reportDocumentId !== report.id) throw new Error('REPORT_SESSION_MISMATCH')
    const draft = { ...session.draft, plan: { ...session.draft.plan, materialIds } }
    try {
      await saveDraft(config, store, clientId, created.id, {
        expectedRevision: session.draftRevision, draft,
      })
      return { sessionId: created.id, status: 'draft' }
    } catch (error) {
      if (error?.code !== 'SESSION_CHANGED' && error?.message !== 'SESSION_CHANGED') throw error
      if (attempt === 1) throw error
    }
  }
  throw new Error('SESSION_CHANGED')
}
