'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowDownToLine, ArrowUpRight, FileText, LockKeyhole, Pin } from 'lucide-react'
import { useEffect, useState } from 'react'
import './personal-analysis.css'
import { generatePractitionerReportPdf } from '@/lib/profile/practitioner-report-pdf'
import {SavedSessionsPanel} from '@/components/app/saved-sessions-panel'

const WORDS = {
  ru: {
    eyebrow: '3 БЕСПЛАТНЫХ ВОЗМОЖНОСТИ · ЛИЧНЫЕ ОТЧЁТЫ',
    title: 'Личный анализ',
    intro: 'Выберите, с чего начать: пройти тесты или запросить личный письменный разбор. Полученные отчёты будут ниже.',
    offerLabel: 'Бесплатные способы анализа',
    stress: 'Стресс и психологический профиль',
    stressTag: 'Тесты · Стресс · Личность',
    stressCopy: 'Пройдите бесплатные тесты, посмотрите свои показатели и получите рекомендации.',
    stressBenefit: 'Вы сами выбираете нужные тесты',
    stressAction: 'Начать бесплатные тесты',
    situation: 'Личный анализ ситуации',
    situationTag: 'Анкета · Рисунок',
    situationCopy: 'Опишите свой вопрос и отправьте рисунок «Я — Цель — Проблема». Я подготовлю письменный разбор.',
    situationBenefit: 'Личный отчёт · Без обязательного созвона',
    situationAction: 'Заказать бесплатно',
    resource: 'Анализ ресурсов У-Син',
    resourceTag: 'Дао · Пять стихий',
    resourceCopy: 'Исследуйте внутреннюю опору и баланс через мою символическую модель пяти стихий. Это не медицинская диагностика.',
    resourceBenefit: 'Индивидуальный письменный профиль',
    resourceAction: 'Получить в подарок',
    free: 'БЕСПЛАТНО',
    reportsTitle: 'Мои отчёты',
    reportsIntro: 'Ваши персональные разборы и документы от Andy.',
    reportsIntroCompact: 'Отчёты от Андрея.',
    private: 'ЛИЧНОЕ',
    empty: 'Отчётов пока нет',
    emptyGoogle: 'Когда Андрей поделится личным отчётом, откройте приватную ссылку и сохраните его здесь. Начать также можно с консультации или бесплатного письменного разбора.',
    emptyLegacy: 'Когда Andy поделится отчётом, он появится здесь.',
    emptyCompact: 'Откройте ссылку на отчёт Андрея и сохраните его здесь.',
    report: 'Персональный отчёт',
    open: 'Открыть',
    download: 'Скачать PDF',
    downloading: 'Готовим PDF…',
    failed: 'PDF не удалось сформировать. Откройте отчёт и попробуйте снова.',
    saved: 'Сохранён',
    withdrawn: 'Отчёт отозван или больше недоступен',
    legacy: 'Архивный формат: попросите Andy повторно отправить отчёт',
    contact: 'Связаться с Andy',
    moreEyebrow: 'ДОПОЛНИТЕЛЬНАЯ ПОМОЩЬ',
    moreTitle: 'Хотите разобрать ситуацию глубже?',
    moreCopy: 'Можно заказать отдельную платную личную консультацию, чтобы обсудить ваш вопрос или результаты.',
    moreAction: 'Заказать консультацию',
    privacy: 'Отчёты приватны и не видны другим клиентам. Тесты и символические разборы не заменяют медицинскую или психиатрическую помощь.',
  },
  en: {
    eyebrow: '3 FREE STARTING POINTS · PERSONAL REPORTS',
    title: 'Personal analysis',
    intro: 'Choose how to begin: take free tests or request a personal written review. Your reports will appear below.',
    offerLabel: 'Free ways to explore your situation',
    stress: 'Stress & personality profile',
    stressTag: 'Tests · Stress · Personality',
    stressCopy: 'Take free self-assessments, explore your results and get practical guidance.',
    stressBenefit: 'Choose the tests that matter to you',
    stressAction: 'Start free testing',
    situation: 'Personal situation analysis',
    situationTag: 'Questionnaire · Drawing',
    situationCopy: 'Share your concern and a Me · Goal · Problem drawing. I will prepare a personal written reflection.',
    situationBenefit: 'Personal report · No call required',
    situationAction: 'Request free review',
    resource: 'Wu Xing resource profile',
    resourceTag: 'Dao · Five elements',
    resourceCopy: 'Explore your inner resources and sense of balance through my symbolic five-element approach. This is not a medical diagnosis.',
    resourceBenefit: 'Personal written profile',
    resourceAction: 'Get my free profile',
    free: 'FREE',
    reportsTitle: 'My reports',
    reportsIntro: 'Personal reflections and documents Andy has shared with you.',
    reportsIntroCompact: 'Reports from Andrey.',
    private: 'PRIVATE',
    empty: 'No reports yet',
    emptyGoogle: 'When Andrey shares a private report, open its link and save it here. You can also start with a consultation or a free written review.',
    emptyLegacy: 'When Andy shares a report with you, it will appear here.',
    emptyCompact: 'Open a report link from Andrey to save it here.',
    report: 'Personal report',
    open: 'Open report',
    download: 'Download PDF',
    downloading: 'Preparing PDF…',
    failed: 'The PDF could not be prepared. Open the report and try again.',
    saved: 'Saved',
    withdrawn: 'This report was withdrawn or is no longer available',
    legacy: 'Older report format: please ask Andy to share an updated copy',
    contact: 'Contact Andy',
    moreEyebrow: 'FURTHER SUPPORT',
    moreTitle: 'Want to explore this more deeply?',
    moreCopy: 'You can book a separate paid personal consultation to discuss your situation or results together.',
    moreAction: 'Request a consultation',
    privacy: 'Your reports are private and not visible to other clients. Self-checks and symbolic reviews are not medical or mental-health diagnoses.',
  },
}

export function PersonalAnalysisOffers({ locale = 'en', selector = null }) {
  const t = WORDS[locale === 'ru' ? 'ru' : 'en']
  const offers = [
    {
      id: 'stress', title: t.stress, tag: t.stressTag, copy: t.stressCopy,
      benefit: t.stressBenefit, action: t.stressAction,
      href: selector ? '/' + locale + '/client/tests' : '/' + locale + '/app/tests?mode=recommendations',
      image: locale === 'ru'
        ? '/images/holistic-house/video-posters/home-ru-v1.webp'
        : '/images/holistic-house/video-posters/home-en-v2.webp',
    },
    {
      id: 'situation', title: t.situation, tag: t.situationTag, copy: t.situationCopy,
      benefit: t.situationBenefit, action: t.situationAction,
      href: '/' + locale + '/services/free-situation-review',
      image: '/images/holistic-house/hero-olive-incense.webp',
    },
    {
      id: 'resource', title: t.resource, tag: t.resourceTag, copy: t.resourceCopy,
      benefit: t.resourceBenefit, action: t.resourceAction,
      href: '/' + locale + '/services/dao-health-profile',
      image: '/academy/reiki-yggdrasil/source/eastern-tradition.png',
    },
  ]
  return <div className="hh-analysis-offers" aria-label={t.offerLabel}>
    {offers.map(offer => <article className={'hh-analysis-offer hh-analysis-offer--' + offer.id} key={offer.id} data-analysis-offer={offer.id}>
      <Link href={offer.href} className="hh-analysis-offer-photo" tabIndex={-1} aria-hidden="true" prefetch={false}>
        <Image src={offer.image} alt="" fill sizes="(max-width: 520px) 105px, (max-width: 850px) 145px, 260px" />
      </Link>
      <div className="hh-analysis-offer-content">
        <div className="hh-analysis-offer-meta"><strong>{t.free}</strong><span>{offer.tag}</span></div>
        <h2>{offer.title}</h2>
        <p className="hh-analysis-offer-description">{offer.copy}</p>
        <p className="hh-analysis-offer-benefit">{offer.benefit}</p>
        <Link href={offer.href} className="hh-analysis-offer-cta" prefetch={false}>
          {offer.action}<ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      </div>
    </article>)}
  </div>
}

export function DownloadPractitionerReport({ reportId = null, report = null, selector = null, locale = 'en', disabled = false }) {
  const t = WORDS[locale === 'ru' ? 'ru' : 'en']
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function download() {
    if (busy || disabled) return
    setBusy(true)
    setError('')
    try {
      const path = selector
        ? `/api/client/${encodeURIComponent(selector)}/assessments/${encodeURIComponent(reportId)}`
        : `/api/app/reports/${encodeURIComponent(reportId)}`
      let record = report
      if (!record) {
        const response = await fetch(path, { cache: 'no-store', credentials: 'same-origin' })
        if (!response.ok) throw new Error('Report unavailable')
        const value = await response.json()
        record = value.report
      }
      if (!record || !record.title) throw new Error('Report unavailable')
      const pdf = await generatePractitionerReportPdf(record, locale)
      const url = URL.createObjectURL(pdf)
      try {
        const link = document.createElement('a')
        link.href = url
        const issued = /^\d{4}-\d{2}-\d{2}$/.test(record.occurredOn || '') ? record.occurredOn : 'personal'
        link.download = `holistic-house-personal-analysis-${issued}.pdf`
        document.body.append(link)
        link.click()
        link.remove()
      } finally {
        window.setTimeout(() => URL.revokeObjectURL(url), 120000)
      }
    } catch {
      setError(t.failed)
    } finally {
      setBusy(false)
    }
  }
  return <span className="hh-analysis-download">
    <button type="button" onClick={download} disabled={disabled || busy}>
      <ArrowDownToLine size={16} aria-hidden="true" />{busy ? t.downloading : t.download}
    </button>
    {error && <small role="alert">{error}</small>}
  </span>
}

export function PersonalAnalysisReportList({ locale = 'en', reports = [], selector = null, compact = false }) {
  const t = WORDS[locale === 'ru' ? 'ru' : 'en']
  const items = [...reports].sort((a,b) => String(b.occurredOn || '').localeCompare(String(a.occurredOn || '')) || String(b.savedAt || '').localeCompare(String(a.savedAt || '')))
  function dateLabel(value) {
    const day = String(value || '').slice(0, 10)
    return /^\d{4}-\d{2}-\d{2}$/.test(day)
      ? new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(day + 'T12:00:00Z'))
      : ''
  }
  return <section className="hh-analysis-reports" aria-labelledby="hh-analysis-reports-title">
    <div className="hh-analysis-reports-head"><span className="hh-analysis-reports-pin"><Pin size={19} aria-hidden="true" /></span><div><h2 id="hh-analysis-reports-title">{t.reportsTitle}</h2><p>{compact ? t.reportsIntroCompact : t.reportsIntro}</p></div><span className="hh-analysis-reports-count">{items.length || t.private}</span></div>
    {items.length ? <div className="hh-analysis-report-list">{items.map(item => {
      const unavailable = item.available === false || item.legacy === true
      const href = selector
        ? `/${locale}/client/${selector}/assessments/${item.id}`
        : `/${locale}/app/reports/${item.id}`
      return <article className="hh-analysis-report" key={item.id}>
        <div className="hh-analysis-report-icon"><FileText size={21} aria-hidden="true" /></div>
        <div className="hh-analysis-report-body"><span className="hh-analysis-report-state">{item.legacy ? t.legacy : unavailable ? t.withdrawn : t.saved}</span><h3>{item.title || t.report}</h3><p>{dateLabel(item.occurredOn)}</p></div>
        {!unavailable && <div className="hh-analysis-report-actions"><Link href={href} prefetch={false}>{t.open}</Link><DownloadPractitionerReport reportId={item.id} selector={selector} locale={locale} /></div>}
        {item.legacy && <a className="hh-analysis-legacy-contact" href="https://t.me/AndyTherapist" target="_blank" rel="noopener noreferrer">{t.contact}</a>}
      </article>
    })}</div> : <div className="hh-analysis-reports-empty"><FileText size={23} aria-hidden="true" /><strong>{t.empty}</strong><p>{selector ? t.emptyLegacy : compact ? t.emptyCompact : t.emptyGoogle}</p></div>}
    <p className="hh-analysis-privacy"><LockKeyhole size={16} aria-hidden="true" />{t.privacy}</p>
  </section>
}

export function PersonalAnalysisPanel({ locale = 'en', reports = [], legacyReports = [], selector = null, embedded = false, savedSessions = [] }) {
  const t = WORDS[locale === 'ru' ? 'ru' : 'en']
  const [verified, setVerified] = useState(null)
  useEffect(() => {
    if (selector || !reports.length) return undefined
    let active = true
    fetch('/api/app/personal-analysis-reports', { credentials: 'same-origin', cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('REPORTS_UNAVAILABLE')
        return response.json()
      })
      .then(result => {
        if (active && Array.isArray(result.reports)) setVerified(result.reports)
      })
      .catch(() => { /* Keep existing account-scoped fallback; no private data is cached. */ })
    return () => { active = false }
  }, [selector, reports.length])
  const visibleReports = selector ? reports : (verified ?? reports)
  // The unified Profile owns this archive. Legacy /analysis links may still render
  // the existing standalone experience while all report access rules remain unchanged.
  if (embedded) return <div className="hh-personal-analysis hh-personal-analysis--embedded" data-personal-reports>
    <PersonalAnalysisReportList reports={[...visibleReports, ...legacyReports]} locale={locale} selector={selector} compact />
    {!selector&&<SavedSessionsPanel items={savedSessions} locale={locale}/>} 
  </div>
  return <section className="hh-personal-analysis" aria-label={t.title}>
    <header className="hh-personal-analysis-header"><p>{t.eyebrow}</p><h1>{t.title}</h1><div>{t.intro}</div></header>
    <PersonalAnalysisOffers locale={locale} selector={selector} />
    <PersonalAnalysisReportList reports={[...visibleReports, ...legacyReports]} locale={locale} selector={selector} />
    <aside className="hh-analysis-more">
      <div><p className="hh-analysis-more-eyebrow">{t.moreEyebrow}</p><h2>{t.moreTitle}</h2><p>{t.moreCopy}</p></div>
      <Link href={'/' + locale + '/services/alchemy-of-soul'} prefetch={false}>{t.moreAction}<ArrowUpRight size={18} aria-hidden="true" /></Link>
    </aside>
  </section>
}
