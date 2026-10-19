import Link from 'next/link'
import { getRemedy } from '@/data/remedies'
import { RemedyContent } from './remedy-content'
import { RemedyReportThumbnail } from './remedy-report-thumbnail'
import { DistanceHomeopathyGuide } from './distance-homeopathy-guide'
import { recommendationCopy, recommendationGuidance, recommendationItemType, remedySchedule, reportFollowUpDetails } from '@/lib/documents/recommendation'
import { DocumentAutoPrint } from './document-auto-print'
import { ReportAppendixPrintExpander } from './report-appendix-print-expander'
import { PrescriptionActions } from './prescription-actions'
import { ReportNarrationPlayer } from './report-narration-player'
import { DaoStageDisclosure } from './dao-resource-stage'
import { narrationEnabled } from '@/lib/clients/report-narration-service'
import { DocumentLetterhead, DocumentSignature } from './document-letterhead'
import { resolveReportProgress } from '@/lib/documents/report-progress'
import { resolveRecommendedTests } from '@/lib/consultations/recommended-tests'
import { clientReportHeading } from '@/lib/documents/report-heading'
import './consultation-report.css'

export function PrescriptionDocument({ document, locale, selector, autoPrint = false, admin = false, cabinetAction = null, embedded = false, narration = null, afterCover = null }) {
  const labels = recommendationCopy(locale, document.recommendationType)
  const guidance = (document.additionalNotes || document.recommendationsText) ? undefined : recommendationGuidance(document, locale)
  const progress = resolveReportProgress(document)
  const reportHeading = clientReportHeading(locale, document.recommendationType)
  const followUpSession = reportFollowUpDetails(document.followUpDate, locale)
  const recommendedTests = Array.isArray(document.recommendedTests)
    ? document.recommendedTests : resolveRecommendedTests(document, locale)
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
        { type: 'homeopathy', title: locale === 'ru' ? 'ГОМЕОПАТИЧЕСКИЕ НАЗНАЧЕНИЯ' : 'HOMEOPATHIC PRESCRIPTIONS', items: document.items.filter((item) => recommendationItemType(item, document.recommendationType) === 'homeopathy') },
        { type: 'bach', title: locale === 'ru' ? 'НАЗНАЧЕНИЯ · ЭССЕНЦИИ БАХА' : 'BACH ESSENCE PRESCRIPTIONS', items: document.items.filter((item) => recommendationItemType(item, document.recommendationType) === 'bach') },
      ].filter((group) => group.items.length)
    : [{ type: document.recommendationType, items: document.items }]

  let itemNumber = 0

  const Root = embedded ? 'section' : 'main'
  return <Root className="prescription-shell canonical-shell">
    {!admin && selector && <div className="prescription-toolbar">
      <Link href={`/${alternateLocale}/prescriptions/${selector}`}>{alternateLocale.toUpperCase()}</Link>
      <PrescriptionActions locale={locale} selector={selector} autoPrint={autoPrint} mobilePdf />{cabinetAction}
    </div>}
    <article className="canonical-document canonical-document--editorial">
      {selectedProfiles.length > 0 && <ReportAppendixPrintExpander />}
      <DocumentAutoPrint enabled={admin && autoPrint} />
      <div className="canonical-report-cover">
      <div className="canonical-report-brandline">
        <div className="canonical-editorial-brand">
          <strong>HOLISTIC HOUSE</strong>
          <span>Mind · Body · Soul · Nature</span>
        </div>
        <DocumentLetterhead compact />
        <span className="canonical-report-private-label">{locale === 'ru' ? 'ЛИЧНЫЙ ОТЧЁТ' : 'PRIVATE REPORT'}</span>
      </div>
      <header className="canonical-report-heading">
        <div className="canonical-report-hero">
          <p className="canonical-report-eyebrow">{locale === 'ru' ? 'ПЕРСОНАЛЬНЫЙ ОТЧЁТ' : 'PERSONAL REPORT'}</p>
          <h1>{reportHeading}</h1>
          <p className="canonical-report-hero-subtitle">{locale === 'ru' ? 'Мягкий путь к внутреннему равновесию' : 'A gentler path to inner balance'}</p>
          <span className="canonical-editorial-hero-motto" aria-hidden="true">{locale === 'ru' ? 'Глубже. Человечнее. Целостнее.' : 'Deeper. Kinder. More whole.'}</span>
        </div>
        <dl className="canonical-client">
          <div><dt>{labels.patient}</dt><dd>{document.patientName}</dd></div>
          <div><dt>{labels.date}</dt><dd><time dateTime={document.dateIssued}>{document.dateIssued}</time></dd></div>
          {document.recommendationNumber && <div><dt>{labels.number}</dt><dd>{document.recommendationNumber}</dd></div>}
        </dl>
        {!document.analysis && <p className="canonical-intro">{labels.intro}</p>}
        {progress && <section className="canonical-progress" aria-label={locale === 'ru' ? 'Динамика самооценки' : 'Self-rated progress'}>
          <h2>{locale === 'ru' ? 'Динамика самооценки' : 'Self-rated progress'}</h2>
          <p className="canonical-progress-subtitle">{locale === 'ru' ? 'Оценки до и после консультации' : 'Before and after consultation scores'}</p>
          <div className="canonical-progress-grid">
            {[
              { key: 'before', label: locale === 'ru' ? 'Было' : 'Before', value: progress.before },
              { key: 'after', label: locale === 'ru' ? 'Стало' : 'After', value: progress.after },
            ].map(({ key, label, value }) => <div className={`canonical-progress-item canonical-progress-item--${key}`} key={key}>
              <div className="canonical-progress-dial" aria-hidden="true" style={{ '--progress': `${value * 10}%` }}>
                <strong>{value}<small>/10</small></strong>
              </div>
              <span>{label}</span>
            </div>)}
            <aside className="canonical-progress-note">
              <span>{locale === 'ru' ? 'Ваши оценки в два момента времени.' : 'Your ratings at two moments in time.'}</span>
            </aside>
          </div>
        </section>}
      </header>
      </div>
      {afterCover}
      {document.analysis && <section className="canonical-general canonical-report-analysis">
        <div className="canonical-analysis-heading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 9, marginBottom: 11 }}>
          <h2 style={{ margin: 0 }}>{labels.analysis}</h2>
          {narration && <ReportNarrationPlayer locale={locale} access={narration} available={narrationEnabled()} />}
        </div>
        <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{document.analysis}</p>
      </section>}

      {document.recommendationsText && <section className="canonical-general canonical-report-analysis canonical-report-recommendations">
        <h2>{labels.recommendations}</h2>
        <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{document.recommendationsText}</p>
      </section>}

      {groups.map((group) => <section className="canonical-remedy-group" key={group.type}>
        <div className="canonical-remedy-section-heading">
          <h2 className="canonical-remedy-group-title">{group.title || (locale === 'ru' ? 'НАЗНАЧЕНИЯ' : 'PRESCRIPTIONS')}</h2>
          <p className="canonical-remedy-group-caption">{locale === 'ru' ? 'Индивидуальная схема приёма' : 'Individual regimen'}</p>
        </div>
        {group.items.map((item) => {
          itemNumber += 1
          const number = itemNumber
          const schedule = remedySchedule(item, locale, document.recommendationType)
          // The potency belongs beside the remedy name, not in the administration line.
          // Preserve practitioner-authored values; never infer a missing potency.
          const potency = recommendationItemType(item, document.recommendationType) === 'homeopathy'
            ? String(item.potency ?? '').trim() : ''
          const administration = potency ? schedule.split(' · ').slice(1).join(' · ') : schedule
          const detailKeys = ['purpose', 'dosage', 'frequency', 'duration', 'sequence', 'instructions'].filter((key) => item[key])
          const remedy = item.remedySlug ? getRemedy(locale, item.remedySlug) : null
          return <section className="canonical-remedy canonical-remedy--unified" key={number}>
            <details className="canonical-remedy-profile-disclosure canonical-remedy-unified-disclosure">
              <summary className="canonical-remedy-unified-summary">
                <RemedyReportThumbnail src={remedy?.primary_image} number={number} />
                <span className="canonical-remedy-unified-main">
                  <span className="canonical-remedy-title">
                    <h3>{item.displayName}{potency && <span
                      className="canonical-remedy-potency"
                      aria-label={locale === 'ru' ? `Потенция ${potency}` : `Potency ${potency}`}
                    >{' '}{potency}</span>}</h3>
                  </span>
                  {administration && <span className="canonical-remedy-schedule" aria-label={administration}>
                    {administration.split(' · ').map((part, index) => <span className="canonical-remedy-schedule-part" key={index}>
                      {index > 0 && <span className="canonical-remedy-schedule-dot" aria-hidden="true">·</span>}
                      <span className="canonical-remedy-schedule-chip">{part}</span>
                    </span>)}
                  </span>}
                  {detailKeys.length > 0 && <span className="canonical-remedy-fields canonical-remedy-unified-instructions">
                    {detailKeys.map((key) => <span className="canonical-remedy-unified-instruction" key={key}>
                      <strong>{labels[key]}:</strong> {item[key]}
                    </span>)}
                  </span>}
                </span>
                <span className="canonical-remedy-profile-action canonical-remedy-unified-toggle">
                  <span>{locale === 'ru' ? 'Описание' : 'Details'}</span>
                  <span className="canonical-remedy-unified-chevron" aria-hidden="true">⌄</span>
                </span>
              </summary>
              <div className="canonical-remedy-profile-content">
                {remedy ? <>
                  <div className="canonical-remedy-unified-profile-heading">
                    <strong>{remedy.canonical_latin_name}</strong>
                    <small>{locale === 'ru' ? 'Описание из библиотеки Holistic House' : 'From the Holistic House remedy library'}</small>
                  </div>
                  {remedy.primary_image && <figure className="canonical-remedy-profile-photo canonical-remedy-unified-full-photo">
                    {/* Retain the actual approved library photo, not a generated substitute. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={remedy.primary_image} alt={remedy.primary_image_alt || remedy.canonical_latin_name} loading="lazy" decoding="async" />
                  </figure>}
                  <RemedyContent locale={locale} remedy={remedy} sourceUrl={remedy.primary_source_url}
                    variant="book" showEssence={false} expandSupplementary fullSource />
                </> : <p className="canonical-remedy-unified-unavailable">
                  {locale === 'ru' ? 'Описание этого препарата пока не добавлено в библиотеку.' : 'This remedy description is not yet available in the library.'}
                </p>}
                {item.remedyPath && <p className="canonical-remedy-profile-link"><Link href={item.remedyPath}>
                  {locale === 'ru' ? 'Открыть полную карточку препарата →' : 'Open the full remedy profile →'}
                </Link></p>}
              </div>
            </details>
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
        {guidance.recheck && <p>{guidance.recheck}</p>}
        {guidance.contact && <p className="canonical-guidance-contact">{guidance.contact}</p>}
      </section>}

      {document.additionalNotes && <section className="canonical-general canonical-report-notes"><h2>{labels.additionalNotes}</h2><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{document.additionalNotes}</p></section>}
      {document.generalInstructions && <section className="canonical-general canonical-general-instructions"><h2>{labels.general}</h2><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{document.generalInstructions}</p></section>}
      {followUpSession && <section className="canonical-follow-up-appointment" aria-label={followUpSession.title}>
        <h2>{followUpSession.title}</h2>
        <time dateTime={followUpSession.date}>{followUpSession.displayDate}</time>
        <p>{followUpSession.description}</p>
      </section>}
      {document.followUp && <div className="canonical-follow-up"><span>{labels.followUp}</span><strong>{document.followUp}</strong></div>}

      {document.includeDistanceHomeopathy && <DistanceHomeopathyGuide locale={locale} embedded report />}
      <DaoStageDisclosure score={document.daoResourceScore} locale={locale}
        published={document.daoResourcePublished !== false} />
      <DocumentSignature date={document.dateIssued} locale={locale} compact />
      <p className="canonical-disclaimer">{labels.disclaimer}</p>
      {!embedded && recommendedTests.length > 0 && <section className="canonical-recommended-tests" aria-label={locale === 'ru' ? 'Рекомендуемые тесты' : 'Recommended tests'}>
        <h2>{locale === 'ru' ? 'Рекомендуемые тесты' : 'Recommended tests'}</h2>
        <p>{locale === 'ru'
          ? 'Отметил для вас тесты, которые можно пройти после консультации. Нажмите на название, чтобы начать.'
          : 'Your practitioner selected these tests for your next step. Tap a title to begin.'}</p>
        <ol>{recommendedTests.map(test => <li key={test.key}>
          <Link href={test.href} prefetch={false}>{test.title} <span aria-hidden="true">↗</span></Link>
          {test.startLocale !== locale && <small>{locale === 'ru' ? 'Откроется на доступном языке' : 'Opens in the available language'}</small>}
        </li>)}</ol>
      </section>}
    </article>
  </Root>
}
