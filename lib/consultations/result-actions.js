export const resultLocale = (preference) => preference === 'ru' ? 'ru' : 'en'
export const remedyCountLabel = (count) => `${count} ${count === 1 ? 'remedy' : 'remedies'}`
export function documentActionUrls(id, locale, kind = 'recommendation') {
  const language = resultLocale(locale)
  return {
    open: `/admin/documents/${id}/${kind === 'payment' ? 'view' : 'session-preview'}?locale=${language}`,
    previewPdf: `/admin/api/documents/${id}/pdf?locale=${language}&preview=1`,
    pdf: `/admin/api/documents/${id}/pdf?locale=${language}`,
    print: `/admin/documents/${id}/view?locale=${language}&print=1`,
  }
}

// Locale is presentation only. Keep a single issuance promise per mounted document.
export function createDocumentLinkCache(loadCredentials, { scope = 'document' } = {}) {
  let credentials, pending
  return { async url(locale, origin) {
    if (!credentials) {
      pending ??= Promise.resolve().then(loadCredentials).finally(() => { pending = null })
      credentials = await pending
    }
    const path = scope === 'session' ? 'client/session' : 'prescriptions'
    const link = new URL(`/${resultLocale(locale)}/${path}/${credentials.selector}`, origin)
    link.hash = credentials.secret
    return link.toString()
  } }
}
