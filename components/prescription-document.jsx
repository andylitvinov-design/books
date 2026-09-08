import Link from 'next/link'
import { DocumentAutoPrint } from './document-auto-print'
import { PrescriptionActions } from './prescription-actions'
import { DocumentLetterhead, DocumentSignature } from './document-letterhead'

const copy = {
  ru: { title: 'ГОМЕОПАТИЧЕСКАЯ РЕКОМЕНДАЦИЯ', patient: 'Клиент', date: 'Дата', number: 'Рекомендация №', purpose: 'Цель', dosage: 'Как принимать', frequency: 'Частота', duration: 'Длительность', sequence: 'Этап', individual: 'Индивидуальные инструкции', general: 'ОБЩИЕ РЕКОМЕНДАЦИИ', followUp: 'Следующая консультация', intro: 'Следующие гомеопатические рекомендации предоставлены на индивидуальной консультации:', disclaimer: 'Материал носит информационный характер и не заменяет медицинскую диагностику, лечение или неотложную медицинскую помощь.' },
  en: { title: 'HOMEOPATHIC RECOMMENDATION', patient: 'Client', date: 'Date', number: 'Recommendation No.', purpose: 'Purpose', dosage: 'How to take', frequency: 'Frequency', duration: 'Duration', sequence: 'Stage', individual: 'Instructions', general: 'GENERAL RECOMMENDATIONS', followUp: 'Follow-up', intro: 'The following homeopathic recommendations were provided during the individual consultation:', disclaimer: 'This document is provided for informational purposes and is not a substitute for medical diagnosis, treatment, or emergency medical care.' },
}

export function PrescriptionDocument({ document, locale, selector, autoPrint = false, admin = false }) {
  const labels = copy[locale]
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
          <dl>{['purpose', 'dosage', 'frequency', 'duration', 'sequence', 'instructions'].filter((key) => item[key]).map((key) => <div key={key}><dt>{labels[key === 'instructions' ? 'individual' : key]}: </dt><dd>{item[key]}</dd></div>)}</dl>
        </section>)}
      </section>
      {document.generalInstructions && <section className="canonical-general"><h2>{labels.general}</h2><p>{document.generalInstructions}</p></section>}
      {document.followUp && <p className="canonical-follow-up">{labels.followUp}: {document.followUp}</p>}
      <DocumentSignature date={document.dateIssued} locale={locale} />
      <p className="canonical-disclaimer">{labels.disclaimer}</p>
    </article>
  </main>
}
