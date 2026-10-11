'use client'

import Link from 'next/link'
import { ArrowDownToLine, ArrowUpRight, ClipboardPenLine, Flower2, FileText, LockKeyhole, Pin } from 'lucide-react'
import { useState } from 'react'
import './personal-analysis.css'
import { generatePractitionerReportPdf } from '@/lib/profile/practitioner-report-pdf'

const WORDS = {
  ru: {
    eyebrow: 'ЛИЧНЫЙ АНАЛИЗ · HOLISTIC HOUSE',
    title: 'Личный анализ',
    intro: 'Два бесплатных способа лучше понять свою ситуацию и внутренние ресурсы. Полученные письменные отчёты сохраняйте здесь.',
    situation: 'Диагностика ситуации',
    situationTag: 'Символическая расстановка',
    situationCopy: 'Опишите проблему в анкете и нарисуйте от руки «Я — Цель — Проблема». Andy подготовит персональный письменный разбор, без обязательной личной сессии.',
    situationAction: 'Начать бесплатный анализ',
    resource: 'Диагностика ресурсов',
    resourceTag: 'Дао · У-Син · пять элементов',
    resourceCopy: 'Исследуйте самочувствие, личную опору и баланс через авторскую китайскую модель У-Син. Символический профиль, а не медицинский диагноз.',
    resourceAction: 'Запросить бесплатный анализ',
    free: 'БЕСПЛАТНО',
    reportsTitle: 'Мои отчёты от Andy',
    reportsIntro: 'Личные отчёты, которыми Andy поделился именно с вами. Вы можете открыть их и сохранить в PDF.',
    empty: 'Здесь пока нет закреплённых отчётов.',
    emptyGoogle: 'Когда Andy пришлёт приватную ссылку на отчёт, откройте её и нажмите «Сохранить отчёт в личном кабинете». После подтверждения отчёт появится здесь.',
    emptyLegacy: 'Когда Andy откроет вам доступ к персональному отчёту, он появится в этом разделе.',
    report: 'Персональный отчёт',
    open: 'Читать',
    download: 'Скачать PDF',
    downloading: 'Готовим PDF…',
    failed: 'PDF не удалось сформировать. Откройте отчёт и попробуйте снова.',
    saved: 'Закреплён',
    withdrawn: 'Отчёт отозван или больше недоступен',
    privacy: 'Ваши отчёты приватны. Другие клиенты их не видят. Бесплатные услуги не заменяют медицинскую или психиатрическую помощь.',
  },
  en: {
    eyebrow: 'PERSONAL ANALYSIS · HOLISTIC HOUSE',
    title: 'Personal analysis',
    intro: 'Two free ways to explore your situation and personal resources. Keep the written reports you receive together here.',
    situation: 'Situation analysis',
    situationTag: 'Symbolic constellations',
    situationCopy: 'Describe your concern in a short form and draw ME · GOAL · PROBLEM on paper. Andy prepares a personal written reflection, not a free live consultation.',
    situationAction: 'Start free analysis',
    resource: 'Resource analysis',
    resourceTag: 'Dao · Wu Xing · five elements',
    resourceCopy: 'Explore your sense of energy, support and balance through the author’s Chinese Wu Xing framework. A symbolic profile, not a medical diagnosis.',
    resourceAction: 'Request free analysis',
    free: 'FREE',
    reportsTitle: 'My reports from Andy',
    reportsIntro: 'Reports Andy has shared specifically with you. Open any available report or download your own PDF copy.',
    empty: 'No personal reports have been pinned here yet.',
    emptyGoogle: 'When Andy sends a private report link, open it and choose “Save this report to my Cabinet”. After you confirm, the report will appear here.',
    emptyLegacy: 'Once Andy shares a personal report with you, it will appear here.',
    report: 'Personal report',
    open: 'Read',
    download: 'Download PDF',
    downloading: 'Preparing PDF…',
    failed: 'The PDF could not be prepared. Open the report and try again.',
    saved: 'Pinned',
    withdrawn: 'This report was withdrawn or is no longer available',
    privacy: 'Your reports are private and not visible to other clients. Free services do not replace medical or mental-health care.',
  },
}

export function PersonalAnalysisOffers({ locale = 'en' }) {
  const t = WORDS[locale === 'ru' ? 'ru' : 'en']
  return <div className="hh-analysis-offers">
    <article className="hh-analysis-offer hh-analysis-offer--situation">
      <div className="hh-analysis-offer-top"><span className="hh-analysis-offer-icon"><ClipboardPenLine size={24} aria-hidden="true" /></span><strong>{t.free}</strong></div>
      <p className="hh-analysis-offer-tag">{t.situationTag}</p>
      <h2>{t.situation}</h2>
      <p>{t.situationCopy}</p>
      <Link href={`/${locale}/services/free-situation-review`} prefetch={false}>{t.situationAction}<ArrowUpRight size={17} aria-hidden="true" /></Link>
    </article>
    <article className="hh-analysis-offer hh-analysis-offer--resource">
      <div className="hh-analysis-offer-top"><span className="hh-analysis-offer-icon"><Flower2 size={24} aria-hidden="true" /></span><strong>{t.free}</strong></div>
      <p className="hh-analysis-offer-tag">{t.resourceTag}</p>
      <h2>{t.resource}</h2>
      <p>{t.resourceCopy}</p>
      <Link href={`/${locale}/services/dao-health-profile`} prefetch={false}>{t.resourceAction}<ArrowUpRight size={17} aria-hidden="true" /></Link>
    </article>
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

export function PersonalAnalysisReportList({ locale = 'en', reports = [], selector = null }) {
  const t = WORDS[locale === 'ru' ? 'ru' : 'en']
  const items = [...reports].sort((a,b) => String(b.occurredOn || '').localeCompare(String(a.occurredOn || '')) || String(b.savedAt || '').localeCompare(String(a.savedAt || '')))
  function dateLabel(value) {
    const day = String(value || '').slice(0, 10)
    return /^\d{4}-\d{2}-\d{2}$/.test(day)
      ? new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(day + 'T12:00:00Z'))
      : ''
  }
  return <section className="hh-analysis-reports" aria-labelledby="hh-analysis-reports-title">
    <div className="hh-analysis-reports-head"><span className="hh-analysis-reports-pin"><Pin size={19} aria-hidden="true" /></span><div><h2 id="hh-analysis-reports-title">{t.reportsTitle}</h2><p>{t.reportsIntro}</p></div></div>
    {items.length ? <div className="hh-analysis-report-list">{items.map(item => {
      const unavailable = item.available === false
      const href = selector
        ? `/${locale}/client/${selector}/assessments/${item.id}`
        : `/${locale}/app/reports/${item.id}`
      return <article className="hh-analysis-report" key={item.id}>
        <div className="hh-analysis-report-icon"><FileText size={21} aria-hidden="true" /></div>
        <div className="hh-analysis-report-body"><span className="hh-analysis-report-state">{unavailable ? t.withdrawn : t.saved}</span><h3>{item.title || t.report}</h3><p>{dateLabel(item.occurredOn)}</p></div>
        {!unavailable && <div className="hh-analysis-report-actions"><Link href={href} prefetch={false}>{t.open}</Link><DownloadPractitionerReport reportId={item.id} selector={selector} locale={locale} /></div>}
      </article>
    })}</div> : <div className="hh-analysis-reports-empty"><FileText size={23} aria-hidden="true" /><strong>{t.empty}</strong><p>{selector ? t.emptyLegacy : t.emptyGoogle}</p></div>}
    <p className="hh-analysis-privacy"><LockKeyhole size={16} aria-hidden="true" />{t.privacy}</p>
  </section>
}

export function PersonalAnalysisPanel({ locale = 'en', reports = [], selector = null }) {
  const t = WORDS[locale === 'ru' ? 'ru' : 'en']
  return <section className="hh-personal-analysis" aria-label={t.title}>
    <div className="hh-personal-analysis-header"><p>{t.eyebrow}</p><h1>{t.title}</h1><div>{t.intro}</div></div>
    <PersonalAnalysisOffers locale={locale} />
    <PersonalAnalysisReportList reports={reports} locale={locale} selector={selector} />
  </section>
}
