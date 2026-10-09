'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Download, LockKeyhole } from 'lucide-react'
import { buildCabinetReport, drawCabinetReportPdf } from '@/lib/app/cabinet-report'
import styles from './portrait-report-actions.module.css'

const COPY = {
  en: {
    download: 'Download my report',
    advice: 'Get specialist recommendations',
    loading: 'Preparing PDF…',
    empty: 'Complete a test to unlock your personal PDF report. The portrait remains a neutral guide until then.',
    failed: 'The PDF could not be prepared on this device. Please try again.',
    consent: 'You decide whether to share a test result when requesting specialist recommendations.',
  },
  ru: {
    download: 'Скачать отчёт',
    advice: 'Получить рекомендации специалиста',
    loading: 'Создаём PDF…',
    empty: 'Пройдите хотя бы один тест, чтобы скачать личный отчёт. Пока портрет остаётся нейтральной схемой.',
    failed: 'Не удалось создать PDF на этом устройстве. Попробуйте ещё раз.',
    consent: 'При запросе рекомендаций вы сами решаете, каким результатом поделиться со специалистом.',
  },
}

export function PortraitReportActions({ data, locale = 'en' }) {
  const c = COPY[locale] || COPY.en
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const hasResults = Array.isArray(data?.results) && data.results.length > 0
  function download() {
    if (!hasResults || busy) return
    setBusy(true)
    setError('')
    try {
      // No private answers or names are sent to an external PDF service.
      const model = buildCabinetReport(data, locale)
      const blob = drawCabinetReportPdf(model)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'holistic-house-personal-report-' + new Date().toISOString().slice(0, 10) + '.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 15000)
    } catch {
      setError(c.failed)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className={styles.actions} aria-label={locale === 'ru' ? 'Действия с психопортретом' : 'Psychological portrait actions'}>
      <button type="button" className={styles.download} onClick={download} disabled={!hasResults || busy}>
        <Download size={17} aria-hidden="true" /> {busy ? c.loading : c.download}
      </button>
      <Link className={styles.advice} prefetch={false} href={'/' + locale + '/app/consultations?intent=recommendations'}>
        {c.advice} <ArrowRight size={17} aria-hidden="true" />
      </Link>
      {!hasResults && <p className={styles.empty}>{c.empty}</p>}
      <p className={styles.privacy}><LockKeyhole size={13} aria-hidden="true" /> {c.consent}</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  )
}
