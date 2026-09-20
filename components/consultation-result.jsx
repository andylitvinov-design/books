'use client'

import { useState } from 'react'
import { ConsultationDocumentActions } from './consultation-document-actions'
import { resultLocale } from '@/lib/consultations/result-actions'

export function ConsultationResult({ patientName, dateIssued, languagePreference, documents }) {
  const [locale, setLocale] = useState(() => resultLocale(languagePreference))
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${dateIssued}T12:00:00Z`))
  return <>
    <div className="consultation-result-heading">
      <div><h2>{patientName}</h2><p>{date}</p></div>
      <fieldset className="consultation-language"><legend>Document language</legend><div>
        {['en', 'ru'].map(language => <button key={language} type="button" aria-pressed={locale === language} onClick={() => setLocale(language)}>{language.toUpperCase()}</button>)}
      </div></fieldset>
    </div>
    <div className="consultation-result-documents">{documents.map(document => <section className="consultation-result-document" key={`${document.id}-${document.active}`} aria-label={document.title}>
      <h2>{document.title}</h2><p className="consultation-document-meta">{document.description}</p>
      <ConsultationDocumentActions recordId={document.id} locale={locale} active={document.active} />
      <a className="consultation-edit-link" href={document.editHref}>{document.editLabel}</a>
      <details className="consultation-access"><summary>Access settings</summary>
        <form action={document.active ? document.revoke : document.reactivate}>
          {!document.active && <p>Reactivate to create a new private link. Previously revoked links remain disabled.</p>}
          <button type="submit">{document.active ? 'Revoke client access' : 'Reactivate document'}</button>
        </form>
      </details>
    </section>)}</div>
  </>
}
