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
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${dateIssued}T12:00:00Z`))

  return <>
    <header className="consultation-result-topbar consultation-result-topbar--dense">
      <div>
        <p className="consultation-result-breadcrumb"><a href="/admin">Holistic House · {ru ? 'Кабинет' : 'Cabinet'}</a></p>
        <h1>{labels.title}</h1>
      </div>
      <div className="consultation-result-top-actions">
        <a className="consultation-result-new-link" href="/admin/consultations/new">+ {labels.newConsultation}</a>
        <form action={logout}><button className="consultation-result-logout" type="submit">{labels.logout}</button></form>
      </div>
    </header>

    <section className="consultation-result-summary consultation-result-summary--dense" aria-label={ru ? 'Клиент и язык документов' : 'Client and document language'}>
      <div className="consultation-result-client consultation-result-client--inline">
        <span>{ru ? 'Клиент' : 'Client'}</span>
        <strong>{patientName}</strong>
        <em>·</em>
        <p>{date}</p>
      </div>
      <fieldset className="consultation-language consultation-language--dense">
        <legend>{labels.language}</legend>
        <div>{['en', 'ru'].map(language => <button key={language} type="button" aria-pressed={locale === language} onClick={() => setLocale(language)}>{language.toUpperCase()}</button>)}</div>
      </fieldset>
    </section>

    {clientId && <CabinetLinkActions clientId={clientId} locale={locale} />}

    <div className="consultation-result-documents">
      {documents.map(document => {
        const text = resultDocumentText(document, locale)
        return <section className="consultation-result-document consultation-document-card consultation-document-card--dense" key={`${document.id}-${document.active}`} aria-label={text.title}>
          <div className="consultation-document-heading consultation-document-heading--inline">
            <h2>{text.title}</h2>
            <p className="consultation-document-meta">{text.description}</p>
          </div>
          <ConsultationDocumentActions
            recordId={document.id}
            locale={locale}
            active={document.active}
            editHref={document.editHref}
            editLabel={text.edit}
            accessLabel={labels.access}
            revoke={document.revoke}
            reactivate={document.reactivate}
            reactivateHelp={labels.reactivateHelp}
            revokeLabel={labels.revoke}
            reactivateLabel={labels.reactivate}
          />
        </section>
      })}
    </div>
  </>
}
