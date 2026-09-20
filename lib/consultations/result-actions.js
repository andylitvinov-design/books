export const resultLocale = (preference) => preference === 'ru' ? 'ru' : 'en'
export const remedyCountLabel = (count) => `${count} ${count === 1 ? 'remedy' : 'remedies'}`
export function documentActionUrls(id, locale) {
  const language = resultLocale(locale)
  return {
    open: `/admin/documents/${id}?locale=${language}`,
    pdf: `/admin/api/documents/${id}/pdf?locale=${language}`,
    print: `/admin/documents/${id}?locale=${language}&print=1`,
  }
}

// Locale is presentation only. Keep a single issuance promise per mounted document.
export function createDocumentLinkCache(loadCredentials) {
  let credentials, pending
  return { async url(locale, origin) {
    if (!credentials) {
      pending ??= Promise.resolve().then(loadCredentials).finally(() => { pending = null })
      credentials = await pending
    }
    const link = new URL(`/${resultLocale(locale)}/prescriptions/${credentials.selector}`, origin)
    link.hash = credentials.secret
    return link.toString()
  } }
}
