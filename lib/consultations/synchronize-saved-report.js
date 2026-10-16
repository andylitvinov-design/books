/**
 * Publish the exact saved consultation report into its existing client-scoped
 * session (or create that session once). No bearer is issued or sent here.
 *
 * Dependencies are injected so the safety and idempotence contract is
 * independently testable without patient records or production storage.
 */
export async function synchronizeSavedReport(record,{store,config,operations}) {
  if (!record || ['payment','report'].includes(record.kind) || record.status!=='active')
    return {status:'skipped'}
  if (!record.clientId) return {status:'unlinked'}
  const current=await store.findById(record.id)
  if (!current || current.clientId!==record.clientId || current.status!=='active' ||
      current.kind!==record.kind || current.updatedAt!==record.updatedAt)
    throw new Error('REPORT_VERSION_CHANGED')
  const {createClientSession,getOwnerSession,saveOwnerDraft,publishClientSession,getPublishedClientSession}=operations
  const {id}=await createClientSession(config,store,record.clientId,{documentId:record.id})
  const owner=await getOwnerSession(config,store,record.clientId,id)
  if (!owner || owner.status==='archived' || !owner.draft)
    throw new Error('REPORT_SESSION_UNAVAILABLE')
  if (owner.draft.reportDocumentId && owner.draft.reportDocumentId!==record.id)
    throw new Error('REPORT_SESSION_MISMATCH')
  // A previously created empty session may not yet reference this report.
  // Restore only that source ID, preserving media, personal notes and selected
  // library material rather than replacing the whole session draft.
  if (!owner.draft.reportDocumentId) {
    await saveOwnerDraft(config,store,record.clientId,id,{
      expectedRevision:owner.draftRevision,
      draft:{...owner.draft,reportDocumentId:record.id},
    })
  }
  await publishClientSession(config,store,record.clientId,id)
  const published=await getPublishedClientSession(config,store,record.clientId,id)
  // Only report a successful save-and-publish once the published fingerprint
  // resolves to the exact source document. No stale/changed report link.
  if (published.report?.id!==record.id || published.status!=='published')
    throw new Error('REPORT_PUBLICATION_NOT_VERIFIED')
  return {status:'published',sessionId:id}
}
