import Link from 'next/link'

import { PrescriptionActions } from './prescription-actions'

const copy = {
  ru: {
    title: 'ГОМЕОПАТИЧЕСКАЯ РЕКОМЕНДАЦИЯ', patient: 'Клиент', date: 'Дата', dob: 'Дата рождения',
    remedy: 'Препарат', potency: 'Потенция', dosage: 'Дозировка', frequency: 'Частота', duration: 'Длительность', notes: 'Примечания',
    details: 'Описание препарата →', instructions: 'Общие рекомендации', updated: 'Обновлено', disclaimer: 'Материал носит информационный характер и не заменяет медицинскую диагностику, лечение или неотложную медицинскую помощь.',
  },
  en: {
    title: 'HOMEOPATHIC RECOMMENDATION', patient: 'Patient', date: 'Date', dob: 'Date of birth',
    remedy: 'Remedy', potency: 'Potency', dosage: 'Dosage', frequency: 'Frequency', duration: 'Duration', notes: 'Notes',
    details: 'Read remedy profile →', instructions: 'General instructions', updated: 'Updated', disclaimer: 'This document is provided for informational purposes and is not a substitute for medical diagnosis, treatment, or emergency care.',
  },
}

function ItemDetails({ item, labels }) {
  return (
    <dl className="prescription-item-details">
      {[
        [labels.potency, item.potency], [labels.dosage, item.dosage], [labels.frequency, item.frequency],
        [labels.duration, item.duration], [labels.notes, [item.instructions, item.notes].filter(Boolean).join(' — ')],
      ].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
  )
}

export function PrescriptionDocument({ document, locale, autoPrint = false }) {
  const labels = copy[locale]
  const alternateLocale = locale === 'ru' ? 'en' : 'ru'

  return (
    <main className="prescription-shell">
      <div className="prescription-toolbar">
        <Link href={`/${alternateLocale}/prescriptions/${document.publicId}`}>{alternateLocale.toUpperCase()}</Link>
        <PrescriptionActions locale={locale} publicId={document.publicId} autoPrint={autoPrint} />
      </div>
      <article className="prescription-document">
        <header className="prescription-header">
          <div>
            <p className="prescription-kicker">{document.practitionerRole}</p>
            <h1>{document.practitionerName}</h1>
            {document.practitionerBackground && <p>{document.practitionerBackground}</p>}
            {document.practitionerContact && <p>{document.practitionerContact}</p>}
          </div>
          <h2>{labels.title}</h2>
        </header>

        <section className="prescription-patient" aria-label={labels.patient}>
          <div><span>{labels.patient}</span><strong>{document.patientName}</strong></div>
          <div><span>{labels.date}</span><strong>{document.dateIssued}</strong></div>
          {document.patientDob && <div><span>{labels.dob}</span><strong>{document.patientDob}</strong></div>}
        </section>

        <section className="prescription-items" aria-label={labels.remedy}>
          {document.items.map((item, index) => (
            <article className="prescription-item" key={`${item.displayName}-${index}`}>
              <div className="prescription-item-title">
                <span>{labels.remedy}</span>
                {item.remedyPath ? <Link href={item.remedyPath}>{item.displayName}</Link> : <strong>{item.displayName}</strong>}
                {item.remedyPath && <Link className="prescription-remedy-link" href={item.remedyPath}>{labels.details}</Link>}
              </div>
              <ItemDetails item={item} labels={labels} />
            </article>
          ))}
        </section>

        {document.generalInstructions && <section className="prescription-instructions"><h2>{labels.instructions}</h2><p>{document.generalInstructions}</p></section>}

        <footer className="prescription-footer">
          <p>{labels.updated}: {document.updatedAt.slice(0, 10)}</p>
          <div className="prescription-signature"><span>{document.practitionerName}</span></div>
          <p>{labels.disclaimer}</p>
        </footer>
      </article>
    </main>
  )
}
