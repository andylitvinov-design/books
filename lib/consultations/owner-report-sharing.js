/**
 * Owner-only UI helpers. Publishing requires an explicit owner button action.
 * Saving a report or preparing its private session must never publish it.
 */
export async function requestOwnerDocumentLink(recordId, kind = 'recommendation', fetcher = fetch) {
  const endpoint = kind === 'payment' ? 'client-link' : 'session-link'
  const response = await fetcher('/admin/api/documents/' + encodeURIComponent(recordId) + '/' + endpoint, {
    method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json' }, body: '{}',
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const code = typeof data.error === 'string' ? data.error : 'LINK_REQUEST_FAILED'
    const error = new Error(code)
    error.code = code
    error.status = response.status
    throw error
  }
  if (typeof data.selector !== 'string' || !data.selector ||
      typeof data.secret !== 'string' || !data.secret) {
    const error = new Error('LINK_RESPONSE_INVALID')
    error.code = 'LINK_RESPONSE_INVALID'
    throw error
  }
  return { selector: data.selector, secret: data.secret }
}

export async function prepareReportSession(clientId, documentId, fetcher = fetch) {
  if (typeof clientId !== 'string' || !clientId ||
      typeof documentId !== 'string' || !documentId) {
    throw new Error('SESSION_CLIENT_MISSING')
  }
  // Idempotent existing service: creates a DRAFT or reuses one sourced to this
  // consultation. No publishing, grants, or patient notifications here.
  const endpoint='/api/admin/clients/' + encodeURIComponent(clientId) + '/sessions'
  const options={
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({documentId}),
  }
  let response=await fetcher(endpoint,options)
  if(response.status===404) {
    // Existing iPhone owner login may predate the separately scoped /api/admin
    // cookie. Upgrade only through the established, owner-authenticated bridge.
    // This cannot log in guests or publish a draft. The POST is idempotent.
    const bridge=await fetcher('/admin/api/recorder-auth',{
      method:'POST',credentials:'same-origin',cache:'no-store',
    })
    if(bridge.ok)response=await fetcher(endpoint,options)
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok || typeof data.id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.id)) {
    throw new Error(typeof data.error === 'string' ? data.error : 'SESSION_PREPARATION_FAILED')
  }
  return '/admin/clients/' + encodeURIComponent(clientId) + '/sessions/' + encodeURIComponent(data.id)
}

/**
 * Publish the saved report from its preview with one owner click. Reuse the
 * existing session and the same fingerprint/revision checks as AdminSessionStudio
 * instead of navigating to a second review screen.
 *
 * A report/session mismatch fails closed: never silently overwrite another
 * session draft or publish the wrong report or unreviewed newer revision.
 */
export async function publishSavedClientReport(clientId, documentId, fetcher = fetch) {
  const editorHref = await prepareReportSession(clientId, documentId, fetcher)
  const sessionId = editorHref.split('/').at(-1)
  const endpoint = '/api/admin/clients/' + encodeURIComponent(clientId) +
    '/sessions/' + encodeURIComponent(sessionId)

  const read = async response => {
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      const code = typeof data.error === 'string' ? data.error : 'SESSION_PUBLICATION_FAILED'
      const error = new Error(code)
      error.code = code
      error.status = response.status
      throw error
    }
    return data
  }

  // GET is owner-only and supplies the exact report fingerprint at this instant.
  const { session } = await read(await fetcher(endpoint, {
    method: 'GET', credentials: 'same-origin', cache: 'no-store',
  }))
  if (!session || session.draft?.reportDocumentId !== documentId ||
      session.publicationSource?.reportDocumentId !== documentId)
    throw new Error('REPORT_SESSION_MISMATCH')

  const fingerprint = session.publicationSource.reportFingerprint
  if (!Number.isSafeInteger(session.draftRevision) || session.draftRevision < 1 ||
      typeof fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(fingerprint))
    throw new Error('PUBLICATION_REVIEW_REQUIRED')

  // The server rechecks both values under the session lock. If the report or
  // draft changed meanwhile, publication fails rather than exposing stale data.
  const result = await read(await fetcher(endpoint, {
    method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'publish',
      expectedRevision: session.draftRevision,
      expectedReportDocumentId: documentId,
      expectedReportFingerprint: fingerprint,
    }),
  }))
  if (result.id !== sessionId || result.revision !== session.draftRevision)
    throw new Error('PUBLICATION_CONFIRMATION_FAILED')

  return { sessionId, revision: result.revision }
}

export async function tryCopyOwnerLink(value, clipboard) {
  if (typeof value !== 'string' || !value || typeof clipboard?.writeText !== 'function') return false
  try {
    await clipboard.writeText(value)
    return true
  } catch {
    // Safari may lose transient user activation while awaiting an API response.
    // Preserve the owner-only URL in a readonly field for an explicit second tap.
    return false
  }
}
