import Link from 'next/link'
import { getRemedy } from '@/data/remedies'
import { RemedyContent } from './remedy-content'
import { DistanceHomeopathyGuide } from './distance-homeopathy-guide'
import { recommendationCopy, recommendationGuidance, recommendationItemType, remedySchedule } from '@/lib/documents/recommendation'
import { DocumentAutoPrint } from './document-auto-print'
import { PrescriptionActions } from './prescription-actions'
import { DocumentLetterhead, DocumentSignature } from './document-letterhead'
import './consultation-report.css'

export function PrescriptionDocument({ document, locale, selector, autoPrint = false, admin = false, cabinetAction = null }) {
  const labels = recommendationCopy(locale, document.recommendationType)
  const guidance = document.additionalNotes ? undefined : recommendationGuidance(document, locale)
  const alternateLocale = locale === 'ru' ? 'en' : 'ru'
  const selectedProfiles = document.items.map(item => ({ item, remedy: item.remedySlug ? getRemedy(locale, item.remedySlug) : undefined }))
    .filter(({ remedy }) => Boolean(remedy))
  const mixed = document.recommendationType === 'mixed'
  const groups = mixed
    ? [
        { type: 'homeopathy', title: locale === 'ru' ? 'ГОМЕОПАТИЯ' : 'HOMEOPATHY', items: document.items.filter((item) => recommendationItemType(item, document.recommendationType) === 'homeopathy') },
        { type: 'bach', title: locale === 'ru' ? 'ЭССЕНЦИИ БАХА' : 'BACH ESSENCES', items: document.items.filter((item) => recommendationItemType(item, document.recommendationType) === 'bach') },
      ].filter((group) => group.items.length)
    : [{ type: document.recommendationType, items: document.items }]

  let itemNumber = 0

  return <main className="prescription-shell canonical-shell">
    {!admin && selector && <div className="prescription-toolbar">
      <Link href={`/${alternateLocale}/prescriptions/${selector}`}>{alternateLocale.toUpperCase()}</Link>
      <PrescriptionActions locale={locale} selector={selector} autoPrint={autoPrint} />{cabinetAction}
    </div>}
    <article className="canonical-document">
      <DocumentAutoPrint enabled={admin && autoPrint} /><DocumentLetterhead />
      <h1>{labels.title}</h1>
      <div className="canonical-client"><p>{labels.patient}: {document.patientName}</p><p>{labels.date}: {document.dateIssued}</p></div>
      {document.recommendationNumber && <p>{labels.number}: {document.recommendationNumber}</p>}
      <p className="canonical-intro">{labels.intro}</p>
      {document.analysis && <section className="canonical-general canonical-report-analysis">
        <h2>{labels.analysis}</h2>
        <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{document.analysis}</p>
      </section>}

      {groups.map((group) => <section className="canonical-remedy-group" key={group.type}>
        {group.title && <h2 className="canonical-remedy-group-title">{group.title}</h2>}
        {group.items.map((item) => {
          itemNumber += 1
          const number = itemNumber
          const schedule = remedySchedule(item, locale, document.recommendationType)
          return <section className="canonical-remedy" key={number}>
            <div className="canonical-remedy-heading">
              <h2>{number}. {item.remedyPath ? <Link href={item.remedyPath}>{item.displayName}</Link> : item.displayName}</h2>
              {schedule && <span className="canonical-remedy-schedule">{schedule}</span>}
            </div>
            {item.remedyPath && <Link href={item.remedyPath}>{locale === 'ru' ? 'Подробнее о препарате →' : 'Read remedy profile →'}</Link>}
            <dl>{['purpose', 'dosage', 'frequency', 'duration', 'sequence', 'instructions'].filter((key) => item[key]).map((key) => <div key={key}><dt>{labels[key]}: </dt><dd>{item[key]}</dd></div>)}</dl>
          </section>
        })}
      </section>)}

      {guidance && <section className="canonical-guidance">
        <h2>{guidance.takeTitle}</h2>
        {guidance.sections.map((section) => <div className="canonical-guidance-section" key={section.type}>
          {section.title && <h3>{section.title}</h3>}
          <ul>{section.bullets.map((line) => <li key={line}>{line}</li>)}</ul>
        </div>)}
        <p>{guidance.course}</p>
        <p>{guidance.recheck}</p>
        <p className="canonical-guidance-contact">{guidance.contact}</p>
      </section>}

      {document.additionalNotes && <section className="canonical-general canonical-report-notes"><h2>{labels.additionalNotes}</h2><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{document.additionalNotes}</p></section>}
      {document.generalInstructions && <section className="canonical-general"><h2>{labels.general}</h2><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{document.generalInstructions}</p></section>}
      {document.followUp && <p className="canonical-follow-up">{labels.followUp}: {document.followUp}</p>}
      <DocumentSignature date={document.dateIssued} locale={locale} />
      <p className="canonical-disclaimer">{labels.disclaimer}</p>

      {selectedProfiles.length > 0 && <section className="canonical-remedy-profiles" aria-label={locale === 'ru' ? 'Описание препаратов' : 'Remedy profiles'}>
        <h2>{locale === 'ru' ? 'Описание выбранных препаратов' : 'About your selected remedies'}</h2>
        <p>{locale === 'ru'
          ? 'Авторские описания и фотографии из библиотеки Holistic House. Материал для ознакомления и самонаблюдения, не медицинская инструкция.'
          : 'Original descriptions and photographs from the Holistic House library. Educational material for reflection, not medical instructions.'}</p>
        {selectedProfiles.map(({ item, remedy }) => <section className="canonical-remedy-profile" key={item.remedySlug}>
          <h3>{remedy.canonical_latin_name}</h3>
          {remedy.primary_image && <figure className="canonical-remedy-profile-photo">
            {/* The published original image is retained rather than substituted or generated. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={remedy.primary_image} alt={remedy.primary_image_alt || remedy.canonical_latin_name} loading="lazy" decoding="async" />
          </figure>}
          <RemedyContent locale={locale} remedy={remedy} sourceUrl={remedy.primary_source_url} variant="book" showEssence={false} expandSupplementary />
          {item.remedyPath && <p className="canonical-remedy-profile-link"><Link href={item.remedyPath}>
            {locale === 'ru' ? 'Открыть полную карточку препарата →' : 'Open full remedy profile →'}
          </Link></p>}
        </section>)}
      </section>}

      {document.includeDistanceHomeopathy && <DistanceHomeopathyGuide locale={locale} embedded report />}
    </article>
  </main>
}
