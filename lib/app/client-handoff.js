// A single explicit Save / Get analysis click creates a browser-proven, item-scoped
// intent BEFORE OAuth. This includes an individual guest test result: it does
// not grant access to other guest results or another account's results.
// For client_session, the separate leave-page modal confirms saving before OAuth.
// Never resume an arbitrary intent from the URL without its HttpOnly proof.
const automaticKinds = new Set(['delivered_report', 'legacy_document', 'client_session', 'guest_result'])
const allKinds = new Set(['delivered_report', 'legacy_document', 'guest_result','client_session'])
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function canAutoContinueSave({ automatic, authStatus, intent }) {
  return automatic === true &&
    !authStatus &&
    automaticKinds.has(intent?.sourceKind) &&
    intent.expired !== true &&
    (intent.status === 'pending' || (intent.status === 'committed' && Boolean(intent.resourceId)))
}

export function savedResourcePath(locale, sourceKind, resourceId) {
  if (!allKinds.has(sourceKind) || !uuid.test(resourceId || ''))
    throw new Error('Invalid saved resource destination')
  const language = locale === 'ru' ? 'ru' : 'en'
  const collection = sourceKind === 'client_session'
    ? 'sessions'
    : sourceKind === 'delivered_report'
    ? 'reports'
    : sourceKind === 'legacy_document'
      ? 'document-view'
      : 'results'
  return `/${language}/app/${collection}/${resourceId}`
}
