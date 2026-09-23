import Link from 'next/link'
import { recommendationCopy, recommendationGuidance, remedySchedule } from '@/lib/documents/recommendation'
import { DocumentAutoPrint } from './document-auto-print'
import { PrescriptionActions } from './prescription-actions'
import { DocumentLetterhead, DocumentSignature } from './document-letterhead'



export function PrescriptionDocument({ document, locale, selector, autoPrint = false, admin = false }) {
  const labels = recommendationCopy(locale, document.recommendationType)
  const guidance = recommendationGuidance(document, locale)
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
        {document.items.map((item, index) => {
          const schedule = remedySchedule(item, locale, document.recommendationType)
          return <section className="canonical-remedy" key={index}>
          <div className="canonical-remedy-heading"><h2>{index + 1}. {item.remedyPath ? <Link href={item.remedyPath}>{item.displayName}</Link> : item.displayName}{item.potency && ` - ${item.potency}`}</h2>{schedule && <span className="canonical-remedy-schedule">{schedule}</span>}</div>
          {item.remedyPath && <Link href={item.remedyPath}>{locale === 'ru' ? 'Подробнее о препарате →' : 'Read remedy profile →'}</Link>}
          <dl>{['purpose', 'dosage', 'frequency', 'duration', 'sequence', 'instructions'].filter((key) => item[key]).map((key) => <div key={key}><dt>{labels[key]}: </dt><dd>{item[key]}</dd></div>)}</dl>
        </section>
        })}
      </section>
      {guidance && <section className="canonical-guidance">
        <h2>{guidance.takeTitle}</h2>
        <ul>{guidance.bullets.map((line) => <li key={line}>{line}</li>)}</ul>
        <p><strong>{guidance.course.split(':')[0]}:</strong>{guidance.course.includes(':') ? guidance.course.slice(guidance.course.indexOf(':') + 1) : ''}</p>
        <p>{guidance.recheck}</p>
        <p className="canonical-guidance-contact">{guidance.contact}</p>
      </section>}
      {document.generalInstructions && <section className="canonical-general"><h2>{labels.general}</h2><p>{document.generalInstructions}</p></section>}
      {document.followUp && <p className="canonical-follow-up">{labels.followUp}: {document.followUp}</p>}
      <DocumentSignature date={document.dateIssued} locale={locale} />
      <p className="canonical-disclaimer">{labels.disclaimer}</p>
    </article>
  </main>
}
