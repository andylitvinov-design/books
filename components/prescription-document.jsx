import Link from 'next/link'
import { getRemedy } from '@/data/remedies'
import { RemedyContent } from './remedy-content'
import { DistanceHomeopathyGuide } from './distance-homeopathy-guide'
import { recommendationCopy, recommendationGuidance, recommendationItemType, remedySchedule } from '@/lib/documents/recommendation'
import { DocumentAutoPrint } from './document-auto-print'
import { PrescriptionActions } from './prescription-actions'
import { DocumentLetterhead, DocumentSignature } from './document-letterhead'
import { extractReportProgress } from '@/lib/documents/report-progress'
import './consultation-report.css'

export function PrescriptionDocument({ document, locale, selector, autoPrint = false, admin = false, cabinetAction = null }) {
  const labels = recommendationCopy(locale, document.recommendationType)
  const guidance = document.additionalNotes ? undefined : recommendationGuidance(document, locale)
  const progress = extractReportProgress(document.analysis)
  const alternateLocale = locale === 'ru' ? 'en' : 'ru'
  const seenProfiles = new Set()
  const selectedProfiles = document.items.map(item => ({ item, remedy: item.remedySlug ? getRemedy(locale, item.remedySlug) : undefined }))
    .filter(({ item, remedy }) => {
      if (!remedy || seenProfiles.has(item.remedySlug)) return false
      seenProfiles.add(item.remedySlug)
      return true
    })
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
    <article className="canonical-document canonical-document--editorial">
      <DocumentAutoPrint enabled={admin && autoPrint} /><DocumentLetterhead compact />
      <header className="canonical-report-heading">
        <div className="canonical-report-hero">
          <p className="canonical-report-eyebrow">{locale === 'ru' ? 'HOLISTIC HOUSE · ПЕРСОНАЛЬНЫЙ ОТЧЁТ' : 'HOLISTIC HOUSE · PERSONAL REPORT'}</p>
          <h1>{labels.title}</h1>
          <p className="canonical-report-hero-subtitle">{locale === 'ru' ? 'Индивидуальные рекомендации по итогам консультации' : 'Individual guidance from your consultation'}</p>
        </div>
        <dl className="canonical-client">
          <div><dt>{labels.patient}</dt><dd>{document.patientName}</dd></div>
          <div><dt>{labels.date}</dt><dd><time dateTime={document.dateIssued}>{document.dateIssued}</time></dd></div>
          {document.recommendationNumber && <div><dt>{labels.number}</dt><dd>{document.recommendationNumber}</dd></div>}
        </dl>
        <p className="canonical-intro">{labels.intro}</p>
        {progress && <section className="canonical-progress" aria-label={locale === 'ru' ? 'Динамика самооценки' : 'Self-rated progress'}>
          <h2>{locale === 'ru' ? 'Динамика самооценки' : 'Self-rated progress'}</h2>
          <div className="canonical-progress-grid">
            {[
              { key: 'before', label: locale === 'ru' ? 'Начало' : 'Start', value: progress.before },
              { key: 'after', label: locale === 'ru' ? 'Конец' : 'End', value: progress.after },
            ].map(({ key, label, value }) => <div className={`canonical-progress-item canonical-progress-item--${key}`} key={key}>
              <div className="canonical-progress-dial" aria-hidden="true" style={{ '--progress': `${value * 10}%` }}>
                <strong>{value}<small>/10</small></strong>
              </div>
              <span>{label}</span>
            </div>)}
          </div>
        </section>}
      </header>
      {document.analysis && <section className="canonical-general canonical-report-analysis">
        <h2>{labels.analysis}</h2>
        <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{document.analysis}</p>
      </section>}

      {groups.map((group) => <section className="canonical-remedy-group" key={group.type}>
        <h2 className="canonical-remedy-group-title">{group.title || (locale === 'ru' ? 'РЕКОМЕНДАЦИИ' : 'RECOMMENDATIONS')}</h2>
        {group.items.map((item) => {
          itemNumber += 1
          const number = itemNumber
          const schedule = remedySchedule(item, locale, document.recommendationType)
          const sourceRemedy = item.remedySlug ? getRemedy(locale, item.remedySlug) : null
          return <section className="canonical-remedy" key={number}>
            {sourceRemedy?.primary_image && <figure className="canonical-remedy-card-photo">
              {/* Reuse the client's selected original library image, never a stock substitute. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sourceRemedy.primary_image} alt={sourceRemedy.primary_image_alt || sourceRemedy.canonical_latin_name} loading="lazy" decoding="async" />
            </figure>}
            <div className="canonical-remedy-heading">
              <span className="canonical-remedy-number" aria-hidden="true">{String(number).padStart(2, '0')}</span>
              <div className="canonical-remedy-title">
                <h3>{item.remedyPath ? <Link href={item.remedyPath}>{item.displayName}</Link> : item.displayName}</h3>
                {schedule && <p className="canonical-remedy-schedule">{schedule}</p>}
              </div>
            </div>
            {item.remedyPath && <Link className="canonical-remedy-profile-action" href={item.remedyPath}>
              <span>{locale === 'ru' ? 'Открыть описание препарата' : 'View remedy description'}</span>
              <span aria-hidden="true">↗</span>
            </Link>}
            <dl className="canonical-remedy-fields">{['purpose', 'dosage', 'frequency', 'duration', 'sequence', 'instructions'].filter((key) => item[key]).map((key) => <div key={key}><dt>{labels[key]}</dt><dd>{item[key]}</dd></div>)}</dl>
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
      {document.generalInstructions && <section className="canonical-general canonical-general-instructions"><h2>{labels.general}</h2><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{document.generalInstructions}</p></section>}
      {document.followUp && <div className="canonical-follow-up"><span>{labels.followUp}</span><strong>{document.followUp}</strong></div>}
      <DocumentSignature date={document.dateIssued} locale={locale} compact />
      <p className="canonical-disclaimer">{labels.disclaimer}</p>

      {selectedProfiles.length > 0 && <section className="canonical-remedy-profiles" aria-label={locale === 'ru' ? 'Приложение' : 'Appendix'}>
        <h2>{locale === 'ru' ? 'Приложение' : 'Appendix'}</h2>
        <p className="canonical-remedy-appendix-description">{locale === 'ru' ? 'Полные тексты описаний выбранных препаратов из библиотеки Holistic House' : 'Complete library descriptions of all selected remedies'}</p>
        {selectedProfiles.map(({ item, remedy }) => <section className="canonical-remedy-profile" key={item.remedySlug}>
          <h3>{remedy.canonical_latin_name}</h3>
          {remedy.primary_image ? <figure className="canonical-remedy-profile-photo">
            {/* The published original image is retained rather than substituted or generated. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={remedy.primary_image} alt={remedy.primary_image_alt || remedy.canonical_latin_name} loading="lazy" decoding="async" />
          </figure> : <p className="canonical-remedy-photo-unavailable">{locale === 'ru' ? 'Исходная фотография отсутствует в базе.' : 'No source photograph is available in the library.'}</p>}
          <RemedyContent locale={locale} remedy={remedy} sourceUrl={remedy.primary_source_url} variant="book" showEssence={false} expandSupplementary fullSource />
          {item.remedyPath && <p className="canonical-remedy-profile-link"><Link href={item.remedyPath}>
            {locale === 'ru' ? 'Открыть полную карточку препарата →' : 'Open full remedy profile →'}
          </Link></p>}
        </section>)}
      </section>}

      {document.includeDistanceHomeopathy && <DistanceHomeopathyGuide locale={locale} embedded report />}
    </article>
  </main>
}
