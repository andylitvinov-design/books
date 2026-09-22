'use client'

import { CabinetLinkActions } from './cabinet-link-actions'
import { useEffect, useState } from 'react'
import { ConsultationDocumentActions } from './consultation-document-actions'
import { resultCopy, resultDocumentText } from '@/lib/consultations/result-copy'
import { resultLocale } from '@/lib/consultations/result-actions'

export function ConsultationResult({ clientId, patientName, dateIssued, languagePreference, documents, logout }) {
  const [locale, setLocale] = useState(() => resultLocale(languagePreference))
  const labels = resultCopy(locale)
  useEffect(() => {
    const previousTitle = window.document.title, previousLanguage = window.document.documentElement.lang
    window.document.title = labels.title
    window.document.documentElement.lang = locale
    return () => { window.document.title = previousTitle; window.document.documentElement.lang = previousLanguage }
  }, [locale, labels.title])
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${dateIssued}T12:00:00Z`))
  return <>
    <header className="prescription-admin-header">
      <div><p><a href="/admin/consultations/new">{labels.newConsultation}</a></p><h1>{labels.title}</h1></div>
      <form action={logout}><button type="submit">{labels.logout}</button></form>
    </header>
    <div className="consultation-result-heading">
      <div><h2>{patientName}</h2><p>{date}</p></div>
      <fieldset className="consultation-language"><legend>{labels.language}</legend><div>
        {['en', 'ru'].map(language => <button key={language} type="button" aria-pressed={locale === language} onClick={() => setLocale(language)}>{language.toUpperCase()}</button>)}
      </div></fieldset>
    </div>
    {clientId && <CabinetLinkActions clientId={clientId} locale={locale} />}
    <div className="consultation-result-documents">{documents.map(document => { const text = resultDocumentText(document, locale); return <section className="consultation-result-document" key={`${document.id}-${document.active}`} aria-label={text.title}>
      <h2>{text.title}</h2><p className="consultation-document-meta">{text.description}</p>
      <ConsultationDocumentActions recordId={document.id} locale={locale} active={document.active} />
      <a className="consultation-edit-link" href={document.editHref}>{text.edit}</a>
      <details className="consultation-access"><summary>{labels.access}</summary>
        <form action={document.active ? document.revoke : document.reactivate}>
          {!document.active && <p>{labels.reactivateHelp}</p>}
          <button type="submit">{document.active ? labels.revoke : labels.reactivate}</button>
        </form>
      </details>
    </section> })}</div>
  </>
}
