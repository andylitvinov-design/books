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
    const previousTitle = window.document.title
    const previousLanguage = window.document.documentElement.lang
    window.document.title = labels.title
    window.document.documentElement.lang = locale
    return () => {
      window.document.title = previousTitle
      window.document.documentElement.lang = previousLanguage
    }
  }, [locale, labels.title])

  const ru = locale === 'ru'
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${dateIssued}T12:00:00Z`))

  return <>
    <header className="consultation-result-topbar">
      <div>
        <p className="consultation-result-breadcrumb"><a href="/admin">Holistic House · {ru ? 'Кабинет' : 'Cabinet'}</a></p>
        <h1>{labels.title}</h1>
        <a className="consultation-result-new-link" href="/admin/consultations/new">+ {labels.newConsultation}</a>
      </div>
      <form action={logout}><button className="consultation-result-logout" type="submit">{labels.logout}</button></form>
    </header>

    <section className="consultation-result-summary" aria-label={ru ? 'Клиент и язык документов' : 'Client and document language'}>
      <div className="consultation-result-client">
        <span>{ru ? 'Клиент' : 'Client'}</span>
        <h2>{patientName}</h2>
        <p>{date}</p>
      </div>
      <fieldset className="consultation-language">
        <legend>{labels.language}</legend>
        <div>{['en', 'ru'].map(language => <button key={language} type="button" aria-pressed={locale === language} onClick={() => setLocale(language)}>{language.toUpperCase()}</button>)}</div>
      </fieldset>
    </section>

    {clientId && <CabinetLinkActions clientId={clientId} locale={locale} />}

    <div className="consultation-result-documents">
      {documents.map(document => {
        const text = resultDocumentText(document, locale)
        return <section className="consultation-result-document consultation-document-card" key={`${document.id}-${document.active}`} aria-label={text.title}>
          <div className="consultation-document-heading">
            <div>
              <h2>{text.title}</h2>
              <p className="consultation-document-meta">{text.description}</p>
            </div>
          </div>
          <ConsultationDocumentActions recordId={document.id} locale={locale} active={document.active} />
          <div className="consultation-document-secondary">
            <a className="consultation-edit-link" href={document.editHref}>{text.edit}</a>
            <details className="consultation-access">
              <summary>{labels.access}</summary>
              <form action={document.active ? document.revoke : document.reactivate}>
                {!document.active && <p>{labels.reactivateHelp}</p>}
                <button type="submit">{document.active ? labels.revoke : labels.reactivate}</button>
              </form>
            </details>
          </div>
        </section>
      })}
    </div>
  </>
}
