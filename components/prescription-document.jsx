import Link from 'next/link'
import { recommendationCopy } from '@/lib/documents/recommendation'
import { DocumentAutoPrint } from './document-auto-print'
import { PrescriptionActions } from './prescription-actions'
import { DocumentLetterhead, DocumentSignature } from './document-letterhead'



export function PrescriptionDocument({ document, locale, selector, autoPrint = false, admin = false }) {
  const labels = recommendationCopy(locale)
  const alternateLocale = locale === 'ru' ? 'en' : 'ru'
  return <main className="prescription-shell canonical-shell">
    {!admin && selector && <div className="prescription-toolbar">
      <Link href={`/${alternateLocale}/prescriptions/${selector}`}>{alternateLocale.toUpperCase()}</Link>
      <PrescriptionActions locale={locale} selector={selector} autoPrint={autoPrint} />
    </div>}
    <article className="canonical-document">
      <DocumentAutoPrint enabled={admin && autoPrint} /><DocumentLetterhead />
      <h1>{labels.title}</h1>
      <div className="canonical-client"><p>{labels.patient}: {document.patientName}</p><p>{labels.date}: {document.dateIssued}</p></div>
      {document.recommendationNumber && <p>{labels.number}: {document.recommendationNumber}</p>}
      <p className="canonical-intro">{labels.intro}</p>
      <section>
        {document.items.map((item, index) => <section className="canonical-remedy" key={index}>
          <h2>{index + 1}. {item.remedyPath ? <Link href={item.remedyPath}>{item.displayName}</Link> : item.displayName}{item.potency && ` - ${item.potency}`}</h2>
          {item.remedyPath && <Link href={item.remedyPath}>{locale === 'ru' ? 'Подробнее о препарате →' : 'Read remedy profile →'}</Link>}
          <dl>{['purpose', 'dosage', 'frequency', 'duration', 'sequence', 'instructions'].filter((key) => item[key]).map((key) => <div key={key}><dt>{labels[key]}: </dt><dd>{item[key]}</dd></div>)}</dl>
        </section>)}
      </section>
      {document.generalInstructions && <section className="canonical-general"><h2>{labels.general}</h2><p>{document.generalInstructions}</p></section>}
      {document.followUp && <p className="canonical-follow-up">{labels.followUp}: {document.followUp}</p>}
      <DocumentSignature date={document.dateIssued} locale={locale} />
      <p className="canonical-disclaimer">{labels.disclaimer}</p>
    </article>
  </main>
}
