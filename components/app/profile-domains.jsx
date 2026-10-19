'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Brain, CalendarDays, ChevronDown, FileText, Flower2, HeartHandshake, Leaf, LockKeyhole, MessageCircle, Sparkles } from 'lucide-react'
import { recommendationItemType } from '@/lib/documents/recommendation'
import { PROFILE_AREAS, profileServiceOffer } from '@/lib/profile/profile-service-offers'
import { availableSavedReports, latestReceivedReport } from '@/lib/profile/report-summary'
import { whatsappEnquiryUrl } from '@/lib/whatsapp-enquiry'
import './profile-domains.css'
import './profile-refresh.css'

const DevelopmentProgram = dynamic(() => import('./development-program'), { ssr: false })
const DOMAINS = PROFILE_AREAS
const ICONS = { psychology: Brain, homeopathy: Leaf, wu_xing: Flower2, hypnotherapy: HeartHandshake }
const WORDS = {
  en: {
    eyebrow: 'YOUR CABINET · PRIVATE',
    title: 'My profile & reports',
    reports: 'Your private reports, recommendations and guidance from your practitioner.',
    intro: 'Four perspectives on your journey. Explore what is available, follow changes over time, and choose support only when you want it.',
    psychology: 'Psychological', homeopathy: 'Homeopathy', wu_xing: 'Wu Xing', hypnotherapy: 'Hypnotherapy',
    psyDetail: 'Psychological profile', homeoDetail: 'Homeopathic profile', wuDetail: 'Five-element resource profile', hypnoDetail: 'Hypnotherapist recommendations',
    testResults: 'Completed test results', latest: 'Latest record', notMeasured: 'Not measured yet',
    psyIntro: 'Self-reported test results and dated comparisons. These measures are not diagnoses or universal health scores.',
    profileIntro: 'A dated view of practitioner-shared information. Nothing is inferred from unrelated test scores or report text.',
    homeoIntro: 'Your most recently shared remedy selection and earlier written recommendations. This shows what was issued, not what you currently take.',
    resourceIntro: 'Your individual resource analysis in the author’s symbolic Wu Xing model. No five-element values are calculated without a practitioner report.',
    elementLegend: 'Five perspectives · illustrative guide, not a reading', elementNames: ['Wood','Fire','Earth','Metal','Water'],
    hypnoIntro: 'Personal reflections or exercises shared by your hypnotherapist. The plan is not generated automatically.',
    current: 'Most recently shared selection', datedChanges: 'Previous selections', reportHistory: 'Reports and observations over time',
    noPsy: 'No psychological test results are available in this cabinet yet.',
    noHomeo: 'A homeopathic recommendation has not been shared here yet.',
    noWu: 'Your personal Wu Xing report has not been shared here yet.',
    noHypno: 'No personal hypnotherapy recommendations have been shared here yet.',
    noRemedies: 'This document has no named homeopathic remedies to display.',
    continue: 'Open report', openDocument: 'Read original recommendation', seeAll: 'See all personal reports',
    compare: 'Test dynamics', assessments: 'My tests', analysis: 'Personal analysis',
    request: 'Request personal support', consultation: 'Book free consultation', freeWu: 'Request free resource analysis',
    learnMore: 'Explore consultation options', date: 'Dated', loading: 'Opening your saved materials…',
    incomplete: 'Some saved materials could not be opened. Available originals remain accessible in My personal reports below.',
    private: 'Private to your cabinet. Nothing is sent to a practitioner when you open a profile; a consultation request does not attach test answers or reports automatically.',
    unknown: 'Available when shared', recent: 'recent', reportsCount: 'personal reports',
    visibleLimit: 'Recent saved materials are shown here. Your complete archive is in My personal reports below.',
    selected: 'selected', emptyLegacyPsy: 'Psychological test reports shared by Andy will appear here. Your Google Cabinet also keeps results from tests you complete yourself.',
    google: 'Open my Google Cabinet',
    archiveTitle: 'My reports and recommendations', archiveHint: 'Read and download reports you have saved from your practitioner.',
    archivePanelTitle: 'My reports', archivePanelIntro: 'Reports from Andrey · private',
    archiveLatest: 'Latest report', archiveReceived: 'Received', archiveDated: 'Report date',
    archiveEmpty: 'No reports yet. A report you save from Andrey will appear here.',
    archiveViewAll: 'View all reports', archiveHideAll: 'Hide all reports', archiveOpen: 'Open report', archiveDefaultTitle: 'Personal report',
    browseTitle: 'Reports by area', browseHint: 'Browse your saved reports by topic.', savedDocumentsLink: 'My saved documents', getReview: 'Request a free written review', noReportsHint: 'Your personal archive starts with a report shared with you.',
    consultationNote: 'Free introductory request, not an instant booking. Andrey confirms availability personally; full sessions are paid.',
    emptyInviteTitle: 'No reports yet? Start with a consultation',
    emptyInviteCopy: 'Discuss your situation with Andrey in a personal session. Choose 30 minutes (€50) or 60 minutes (€100). A free written review is available separately.',
    benefitGuidance: 'Personal guidance', benefitGuidanceHint: 'Discuss your goals',
    benefitFormat: 'Choose your format', benefitFormatHint: '30 or 60 minutes',
    benefitPrivate: 'Private reports', benefitPrivateHint: 'Save shared documents',
    overview: 'Profile at a glance', profileReports: 'Personal reports', remedyRecords: 'Remedy records', discover: 'Explore services', support: 'Personal support',
  },
  ru: {
    eyebrow: 'ЛИЧНЫЙ КАБИНЕТ · ПРИВАТНО',
    title: 'Мой профиль и отчёты',
    reports: 'Ваши личные отчёты, рекомендации и поддержка специалиста — в одном приватном пространстве.',
    intro: 'Четыре стороны вашего профиля. Вы можете спокойно изучить записи, увидеть изменения и обратиться за поддержкой, когда захотите.',
    psychology: 'Психология', homeopathy: 'Гомеопатия', wu_xing: 'У-Син', hypnotherapy: 'Гипнотерапия',
    psyDetail: 'Психологический профиль', homeoDetail: 'Гомеопатический профиль', wuDetail: 'Ресурсы по пяти стихиям У-Син', hypnoDetail: 'Рекомендации гипнотерапевта',
    testResults: 'Завершённых результатов тестов', latest: 'Последняя запись', notMeasured: 'Пока нет измерений',
    psyIntro: 'Результаты тестов и сравнение замеров по датам. Это не диагноз и не единый процент психологического здоровья.',
    profileIntro: 'Записи и отчёты от специалиста с сохранением дат. Никаких выводов из произвольных цифр или текста.',
    homeoIntro: 'Последний переданный подбор препаратов и история рекомендаций. Это история выданных документов, а не подтверждение текущего приёма.',
    resourceIntro: 'Индивидуальная диагностика ресурсов в авторской символической модели пяти стихий У-Син. Показатели не вычисляются без отчёта специалиста.',
    elementLegend: 'Пять стихий · ориентир по модели, не ваш результат', elementNames: ['Дерево','Огонь','Земля','Металл','Вода'],
    hypnoIntro: 'Личные рекомендации или упражнения, переданные гипнотерапевтом. Никаких автоматически составленных программ.',
    current: 'Последний переданный подбор', datedChanges: 'Предыдущие подборы', reportHistory: 'Отчёты и наблюдения по датам',
    noPsy: 'В этом кабинете пока нет результатов психологических тестов.',
    noHomeo: 'Гомеопатическая рекомендация пока не передана в ваш кабинет.',
    noWu: 'Личный отчёт У-Син пока не передан в ваш кабинет.',
    noHypno: 'Личные рекомендации гипнотерапевта пока не переданы.',
    noRemedies: 'В этом документе нет названий гомеопатических препаратов.',
    continue: 'Читать отчёт', openDocument: 'Открыть исходную рекомендацию', seeAll: 'Все личные отчёты',
    compare: 'Динамика тестов', assessments: 'Мои тесты', analysis: 'Личный анализ',
    request: 'Запросить личную поддержку', consultation: 'Заказать бесплатную консультацию', freeWu: 'Запросить бесплатную диагностику ресурсов',
    learnMore: 'Варианты консультации', date: 'Дата', loading: 'Открываем сохранённые материалы…',
    incomplete: 'Некоторые материалы открыть не удалось. Доступные оригиналы — ниже, в разделе «Мои личные отчёты».',
    private: 'Доступно только вам. Просмотр профиля ничего не отправляет специалисту; при запросе консультации ответы тестов и отчёты не прикрепляются автоматически.',
    unknown: 'После передачи отчёта', recent: 'последних', reportsCount: 'личных отчётов',
    visibleLimit: 'Здесь показаны последние материалы. Полный архив доступен ниже в разделе «Мои личные отчёты».',
    selected: 'подобрано', emptyLegacyPsy: 'Здесь будут психологические отчёты от Andy. Результаты самостоятельно пройденных тестов сохраняются в вашем Google-кабинете.',
    google: 'Открыть Google-кабинет',
    archiveTitle: 'Мои отчёты и рекомендации', archiveHint: 'Читать и скачивать сохранённые отчёты специалиста.',
    archivePanelTitle: 'Мои отчёты', archivePanelIntro: 'Отчёты от Андрея · лично',
    archiveLatest: 'Последний отчёт', archiveReceived: 'Получен', archiveDated: 'Дата отчёта',
    archiveEmpty: 'Пока нет отчётов. Сохранённый отчёт от Андрея появится здесь.',
    archiveViewAll: 'Показать все отчёты', archiveHideAll: 'Свернуть отчёты', archiveOpen: 'Открыть отчёт', archiveDefaultTitle: 'Личный отчёт',
    browseTitle: 'Отчёты по направлениям', browseHint: 'Просмотрите сохранённые отчёты по темам.', savedDocumentsLink: 'Сохранённые документы', getReview: 'Заказать бесплатный письменный разбор', noReportsHint: 'Ваш личный архив начнётся с отчёта, которым с вами поделились.',
    consultationNote: 'Бесплатное ознакомительное обращение, не подтверждённая запись. Андрей согласует время лично; полноценные сессии платные.',
    emptyInviteTitle: 'Нет отчётов? Начните с консультации',
    emptyInviteCopy: 'Обсудите свою ситуацию с Андреем лично: 30 минут — €50, 60 минут — €100. Бесплатный письменный разбор можно заказать отдельно.',
    benefitGuidance: 'Личная поддержка', benefitGuidanceHint: 'Обсудите свой запрос',
    benefitFormat: 'Выбор формата', benefitFormatHint: '30 или 60 минут',
    benefitPrivate: 'Личный архив', benefitPrivateHint: 'Сохраняйте свои отчёты',
    overview: 'Профиль в цифрах', profileReports: 'Личные отчёты', remedyRecords: 'Подборы препаратов', discover: 'Посмотреть услуги', support: 'Личная поддержка',
  },
}
// No report content, client ID, test answers or private URLs enter this enquiry.
// An owner-approved introductory call is a request pending personal availability confirmation.
function freeIntroConsultationHref(locale) {
  const ru = locale === 'ru'
  return whatsappEnquiryUrl({
    locale: ru ? 'ru' : 'en',
    service: ru ? 'Бесплатная ознакомительная консультация' : 'Free introductory consultation',
    request: ru
      ? 'Хочу запросить бесплатную ознакомительную консультацию. Подскажите, пожалуйста, возможно ли такое знакомство и доступное время. Понимаю, что это запрос, а не подтверждённая запись; полноценные консультации оплачиваются отдельно.'
      : 'I would like to request a free introductory consultation. Please confirm whether an introductory conversation is available and suggest a time. I understand this is a request, not a confirmed booking, and longer personal sessions are paid separately.',
  })
}
const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').slice(0, 10))
function readableDate(value, locale) {
  if (!isDate(value)) return ''
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-CA', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(String(value).slice(0, 10) + 'T12:00:00Z'))
}
function ordered(items) {
  return [...items].sort((a, b) => String(b.occurredOn || b.date || '').localeCompare(String(a.occurredOn || a.date || '')))
}
function cleanRemedies(document) {
  if (!document || !['homeopathy', 'mixed'].includes(document.recommendationType)) return []
  return [...new Set((document.items || [])
    .filter(item => recommendationItemType(item, document.recommendationType) === 'homeopathy')
    .map(item => String(item.displayName || '').trim())
    .filter(Boolean))]
}
function reportLink(item, locale, selector) {
  return selector
    ? '/' + locale + '/client/' + encodeURIComponent(selector) + '/assessments/' + encodeURIComponent(item.id)
    : '/' + locale + '/app/reports/' + encodeURIComponent(item.id)
}
function RemedyHistory({ updates, locale, selector, t }) {
  if (!updates.length) return <div className="hh-domain-empty">{t.noHomeo}</div>
  const [newest, ...prior] = ordered(updates)
  const href = item => selector
    ? '/' + locale + '/client/' + encodeURIComponent(selector) + '/documents/' + encodeURIComponent(item.id)
    : '/' + locale + '/app/document-view/' + encodeURIComponent(item.id)
  return <>
    <article className="hh-domain-latest">
      <div className="hh-domain-latest-top"><span>{t.current}</span><time>{readableDate(newest.date, locale)}</time></div>
      {newest.remedies.length
        ? <ul className="hh-domain-remedy-chips">{newest.remedies.map(name => <li key={name}>{name}</li>)}</ul>
        : <p>{t.noRemedies}</p>}
      <Link href={href(newest)} prefetch={false}>{t.openDocument} <ArrowRight size={16} aria-hidden="true" /></Link>
    </article>
    {prior.length > 0 && <div className="hh-domain-history">
      <h3>{t.datedChanges}</h3>
      {prior.map(item => <Link key={item.id} href={href(item)} prefetch={false} className="hh-domain-history-row">
        <span><time>{readableDate(item.date, locale)}</time><small>{item.remedies.join(', ') || t.noRemedies}</small></span>
        <ArrowRight size={17} aria-hidden="true" />
      </Link>)}
    </div>}
  </>
}
function ReportsHistory({ reports, locale, selector, title, empty, t }) {
  return <div className="hh-domain-history">
    <h3>{title}</h3>
    {reports.length
      ? ordered(reports).map(report => <Link key={report.id} href={reportLink(report, locale, selector)} prefetch={false} className="hh-domain-history-row">
        <span><strong>{report.title}</strong><small>{readableDate(report.occurredOn, locale)}</small></span>
        <ArrowRight size={17} aria-hidden="true" />
      </Link>)
      : <div className="hh-domain-empty">{empty}</div>}
  </div>
}

function ProfileServiceOffer({ area, locale }) {
  const offer = profileServiceOffer(area, locale)
  const hint = locale === 'ru'
    ? 'WhatsApp откроет готовый запрос. Вы сами подтверждаете отправку.'
    : 'WhatsApp opens a prepared request. You decide whether to send it.'
  return <aside className="hh-domain-promo" data-profile-service-cta={area} aria-label={offer.title}>
    <div className="hh-domain-promo-copy">
      <span className="hh-domain-promo-icon" aria-hidden="true"><MessageCircle size={19} /></span>
      <div><strong>{offer.title}</strong><p>{offer.description}</p></div>
    </div>
    <div className="hh-domain-promo-actions">
      <a href={offer.requestHref} target="_blank" rel="noopener noreferrer" data-contact-channel="whatsapp" data-service-area={area}>
        {offer.button} <ArrowRight size={15} aria-hidden="true" />
      </a>
      <Link href={offer.descriptionHref} prefetch={false}>{offer.details}</Link>
      <small>{hint}</small>
    </div>
  </aside>
}

/**
 * One authenticated profile selector for the Google Cabinet and the existing
 * private-link Cabinet. Never joins client archives or derives remedies,
 * Wu Xing values or therapy instructions from arbitrary narrative text.
 */
export function ProfileDomains({
  locale = 'en', mode = 'account', selector = null, accountId = null, assessments = [], homeopathyUpdates = [],
  results = [], savedReports = [], savedDocuments = [], children = null,
  overviewContent = null, reportsContent = null, focusReports = false,
}) {
  const ru = locale === 'ru'
  const t = WORDS[ru ? 'ru' : 'en']
  const [active, setActive] = useState('psychology')
  const [expanded, setExpanded] = useState(mode === 'legacy')
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [interactive, setInteractive] = useState(false)
  const [fetchedReports, setFetchedReports] = useState([])
  const [fetchedDocuments, setFetchedDocuments] = useState([])
  const [fetchState, setFetchState] = useState('idle')
  const mounted = useRef(true)
  const focusedArchive = useRef(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => {
    if (!reportsContent || focusedArchive.current) return
    if (!focusReports && window.location.hash !== '#personal-reports') return
    focusedArchive.current = true
    if (mode !== 'legacy') setArchiveOpen(true)
    // Profile is client-rendered after account bootstrap; browser fragment scrolling
    // can happen before its report archive exists, so complete it after mount.
    requestAnimationFrame(() => document.getElementById('personal-reports')?.scrollIntoView({ block: 'start' }))
  }, [focusReports, reportsContent])
  useEffect(() => { setInteractive(true) }, [])
  const external = mode === 'legacy'
  const availableReports = availableSavedReports(savedReports)
  const latestSavedReport = latestReceivedReport(savedReports)
  const lastReceivedDate = readableDate(latestSavedReport?.savedAt || latestSavedReport?.occurredOn, locale)
  const reports = external ? assessments : fetchedReports
  const updates = external ? homeopathyUpdates : fetchedDocuments
  const byArea = area => ordered(reports.filter(report => report.profileArea === area && report.available !== false))
  const psychologicalReports = byArea('psychology')
  const homeopathicReports = byArea('homeopathy')
  const wuReports = byArea('wu_xing')
  const hypnoReports = byArea('hypnotherapy')

  useEffect(() => {
    if (external || !expanded || fetchState !== 'idle') return
    setFetchState('loading')
    const reportRefs = ordered(savedReports.filter(report => report.available !== false)).slice(0, 30)
    const documentRefs = ordered(savedDocuments.filter(document => document.kind === 'recommendation')).slice(0, 20)
    Promise.all([
      Promise.allSettled(reportRefs.map(async item => {
        const response = await fetch('/api/app/reports/' + encodeURIComponent(item.id), { credentials: 'same-origin', cache: 'no-store' })
        if (!response.ok) throw Error('Report unavailable')
        const value = await response.json()
        return { ...value.report, id: item.id, occurredOn: item.occurredOn, available: true }
      })),
      Promise.allSettled(documentRefs.map(async item => {
        const response = await fetch('/api/app/documents/' + encodeURIComponent(item.id) + '?locale=' + locale, { credentials: 'same-origin', cache: 'no-store' })
        if (!response.ok) throw Error('Document unavailable')
        const value = await response.json()
        return { id: item.id, date: item.occurredOn, remedies: cleanRemedies(value.document), valid: ['homeopathy', 'mixed'].includes(value.document?.recommendationType) }
      })),
    ]).then(([r, d]) => {
      if (!mounted.current) return
      setFetchedReports(r.filter(value => value.status === 'fulfilled').map(value => value.value))
      setFetchedDocuments(d.filter(value => value.status === 'fulfilled' && value.value.valid).map(value => value.value))
      setFetchState([...r, ...d].some(value => value.status === 'rejected') ? 'partial' : 'ready')
    }).catch(() => { if (mounted.current) setFetchState('partial') })
  }, [expanded, external, fetchState, locale, savedDocuments, savedReports])

  const entries = DOMAINS.map(key => ({
    key,
    summary: key === 'psychology'
      ? psychologicalReports.length
      : key === 'homeopathy'
        ? (updates.length || homeopathicReports.length)
        : key === 'wu_xing' ? wuReports.length : hypnoReports.length,
  }))
  const panelTitle = { psychology: t.psyDetail, homeopathy: t.homeoDetail, wu_xing: t.wuDetail, hypnotherapy: t.hypnoDetail }
  const mayBeLimited = !external && (savedReports.filter(r => r.available !== false).length > 30 || savedDocuments.filter(d => d.kind === 'recommendation').length > 20)

  const footerActions = (
    <div className="hh-domain-footer-actions">
      <Link className="hh-domain-free-review-link" href={'/' + locale + '/services/free-situation-review#request-free-review'} prefetch={false}>
        <Sparkles size={19} aria-hidden="true" />{t.getReview}<ArrowRight size={18} aria-hidden="true" />
      </Link>
      <Link className="hh-domain-services-link" href={'/' + locale + '/services'} prefetch={false}>
        <Leaf size={19} aria-hidden="true" />{t.discover}<ArrowRight size={18} aria-hidden="true" />
      </Link>
    </div>
  )

  return <section className="hh-profile-domains" data-profile-domains data-profile-mode={mode} data-profile-interactive={interactive ? "true" : "false"}>
    {external && <header className="hh-domain-hero">
      <div className="hh-domain-title">
        <p className="hh-domain-eyebrow">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p className="hh-domain-hero-subtitle">{t.reports}</p>
        <div className="hh-domain-hero-actions">
        <a href="#personal-reports">{t.archiveTitle} <ArrowRight size={16} aria-hidden="true" /></a>
        {!external && <Link href={'/' + locale + '/app/history'} prefetch={false}>{t.savedDocumentsLink}</Link>}
      </div>
      </div>
    </header>}
    {reportsContent && <section id="personal-reports" className="hh-domain-report-archive"
      aria-labelledby={external ? 'hh-analysis-reports-title' : 'hh-account-report-title'} data-profile-report-archive>
      {external ? <>{reportsContent}</> : <>
        <div className="hh-account-report-heading">
          <span className="hh-account-report-icon" aria-hidden="true"><FileText size={23} /></span>
          <div className="hh-account-report-heading-copy">
            <h1 id="hh-account-report-title">{t.archivePanelTitle}</h1>
            <p>{t.archivePanelIntro}</p>
          </div>
          <span className="hh-account-report-private"><LockKeyhole size={12} aria-hidden="true" />{ru ? 'ЛИЧНО' : 'PRIVATE'}</span>
        </div>
        {latestSavedReport
          ? <article className="hh-account-report-latest" data-profile-latest-report>
              <div className="hh-account-report-latest-copy">
                <span className="hh-account-report-eyebrow">{t.archiveLatest}</span>
                <strong>{latestSavedReport.title || t.archiveDefaultTitle}</strong>
                {lastReceivedDate && <time dateTime={String(latestSavedReport.savedAt || latestSavedReport.occurredOn).slice(0,10)}>
                  {latestSavedReport.savedAt ? t.archiveReceived : t.archiveDated}: {lastReceivedDate}
                </time>}
              </div>
              <Link className="hh-account-report-open" href={'/' + locale + '/app/reports/' + encodeURIComponent(latestSavedReport.id)} prefetch={false}>
                {t.archiveOpen} <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </article>
          : <p className="hh-account-report-empty">{t.archiveEmpty}</p>}
        <button type="button" className="hh-account-report-toggle" aria-expanded={archiveOpen}
          aria-controls="hh-account-report-all" onClick={() => setArchiveOpen(open => !open)}>
          <span>{archiveOpen ? t.archiveHideAll : t.archiveViewAll}</span>
          <span className="hh-account-report-number">{availableReports.length}</span>
          <ChevronDown className={archiveOpen ? 'is-open' : ''} size={19} aria-hidden="true" />
        </button>
        <div id="hh-account-report-all" hidden={!archiveOpen} className="hh-account-report-full">
          {archiveOpen && reportsContent}
          {archiveOpen && availableReports.length === 0 && <div className="hh-domain-when-empty" data-profile-empty-consultation>
            <a className="hh-domain-appointment-button" href={freeIntroConsultationHref(locale)}
              target="_blank" rel="noopener noreferrer" data-contact-channel="whatsapp"
              data-consultation-kind="free-introduction">
              <CalendarDays size={20} aria-hidden="true" />
              <span>{t.consultation}</span>
              <ArrowRight size={20} aria-hidden="true" />
            </a>
            <p className="hh-domain-consultation-disclaimer">{t.consultationNote}</p>
          </div>}
        </div>
      </>}
    </section>}
    {!external && accountId && <DevelopmentProgram key={accountId} accountId={accountId} locale={locale} results={results} />}
    {!external && footerActions}
    <details className="hh-domain-more" open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}>
      <summary className="hh-domain-more-toggle">
        <span className="hh-domain-more-summary"><strong>{t.browseTitle}</strong><small>{t.browseHint}</small>
          <span className="hh-domain-topic-pills" aria-hidden="true">{DOMAINS.map(key => <span key={key}>{t[key]}</span>)}</span>
        </span>
        <ChevronDown size={20} aria-hidden="true" />
      </summary>
      <div className="hh-domain-more-body">
      {overviewContent}
    <div className="hh-domain-tabs" role="tablist" aria-label={t.title}>
      {entries.map(({ key, summary }) => {
        const Icon = ICONS[key]
        return <button key={key} id={'hh-domain-tab-' + key} role="tab" type="button" aria-selected={active === key}
          aria-controls="hh-domain-panel" tabIndex={active === key ? 0 : -1}
          onClick={() => setActive(key)}
          onKeyDown={event => {
            const index = DOMAINS.indexOf(key)
            const next = event.key === 'ArrowRight' ? (index + 1) % DOMAINS.length
              : event.key === 'ArrowLeft' ? (index + DOMAINS.length - 1) % DOMAINS.length
                : event.key === 'Home' ? 0 : event.key === 'End' ? DOMAINS.length - 1 : -1
            if (next < 0) return
            event.preventDefault()
            setActive(DOMAINS[next])
            event.currentTarget.parentElement?.querySelectorAll('[role="tab"]')[next]?.focus()
          }}
          className={active === key ? 'is-current' : ''}>
          <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
          <strong>{t[key]}</strong>
          <small aria-label={summary ? String(summary) : undefined}>{summary || '—'}</small>
        </button>
      })}
    </div>
    <div role="tabpanel" id="hh-domain-panel" aria-labelledby={'hh-domain-tab-' + active} className="hh-domain-panel" tabIndex={0}>
      {active === 'psychology' && <section className="hh-domain-content" data-domain="psychology">
        {external ? <>
          <div className="hh-domain-heading"><div><p className="hh-domain-eyebrow">{t.psychology}</p><h2>{t.psyDetail}</h2><p>{t.psyIntro}</p></div></div>
          <ReportsHistory reports={psychologicalReports} locale={locale} selector={selector} title={t.reportHistory} empty={t.emptyLegacyPsy} t={t} />
          <Link className="hh-domain-secondary-link" href={'/' + locale + '/app/portrait'} prefetch={false}>{t.google} <ArrowRight size={16} /></Link>
        </> : <>
          <div className="hh-domain-heading"><div><p className="hh-domain-eyebrow">{t.psychology}</p><h2>{t.psyDetail}</h2><p>{t.psyIntro}</p></div></div>
          {fetchState === 'loading' && <p className="hh-domain-loading" role="status">{t.loading}</p>}
          {children}
          {fetchState !== 'loading' && <ReportsHistory reports={psychologicalReports} locale={locale} title={t.reportHistory} empty={t.emptyLegacyPsy} t={t} />}
          <div className="hh-domain-link-row"><Link href={'/' + locale + '/app/portfolio?tab=dynamics'} prefetch={false}>{t.compare} <ArrowRight size={16} /></Link></div>
        </>}
      </section>}
      {active !== 'psychology' && <section className="hh-domain-content" data-domain={active}>
        <div className="hh-domain-heading"><div><p className="hh-domain-eyebrow">{t[active]}</p><h2>{panelTitle[active]}</h2><p>{active === 'homeopathy' ? t.homeoIntro : active === 'wu_xing' ? t.resourceIntro : t.hypnoIntro}</p></div></div>
        {!external && fetchState === 'loading' && <p className="hh-domain-loading" role="status">{t.loading}</p>}
        {(external || fetchState !== 'loading') && active === 'homeopathy' && <>
          <RemedyHistory updates={updates} locale={locale} selector={selector} t={t} />
          {homeopathicReports.length > 0 && <ReportsHistory reports={homeopathicReports} locale={locale} selector={selector} title={t.reportHistory} empty={t.noHomeo} t={t} />}
        </>}
        {active === 'wu_xing' && <div className="hh-domain-elements" aria-label={t.elementLegend}>
          <p>{t.elementLegend}</p>
          <div className="hh-domain-element-grid">{t.elementNames.map((name, index) => <span key={name} className={'hh-domain-element hh-domain-element-' + index}>{name}</span>)}</div>
        </div>}
        {(external || fetchState !== 'loading') && active === 'wu_xing' && <ReportsHistory reports={wuReports} locale={locale} selector={selector} title={t.reportHistory} empty={t.noWu} t={t} />}
        {(external || fetchState !== 'loading') && active === 'hypnotherapy' && <ReportsHistory reports={hypnoReports} locale={locale} selector={selector} title={t.reportHistory} empty={t.noHypno} t={t} />}
        <Link className="hh-domain-secondary-link" href={external ? '/' + locale + '/client/' + encodeURIComponent(selector) + '?view=analysis' : '/' + locale + '/app/portrait#personal-reports'} prefetch={false}>{t.seeAll} <ArrowRight size={16} /></Link>
        {fetchState === 'partial' && <p role="status" className="hh-domain-caution">{t.incomplete}</p>}
        {mayBeLimited && <p className="hh-domain-caution">{t.visibleLimit}</p>}
      </section>}
      <details className="hh-domain-support">
        <summary><MessageCircle size={17} aria-hidden="true" /><span>{t.support}</span><ChevronDown size={16} aria-hidden="true" /></summary>
        <ProfileServiceOffer area={active} locale={locale} />
      </details>
    </div>
      </div>
    </details>
    <p className="hh-domain-private"><LockKeyhole size={15} aria-hidden="true" />{t.private}</p>
    {external && footerActions}
  </section>
}
