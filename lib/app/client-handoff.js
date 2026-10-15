// The user confirms the recipient's document BEFORE OAuth. Only those
// item-scoped, browser-proven invitations may finish without a second click.
// For client_session, the separate leave-page modal explicitly confirms saving
// before OAuth and an HttpOnly browser-bound save intent proves that choice.
// Guest test imports retain their existing explicit post-login confirmation.
const automaticKinds = new Set(['delivered_report', 'legacy_document', 'client_session'])
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
