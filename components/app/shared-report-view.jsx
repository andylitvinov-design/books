'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, FileText, LockKeyhole } from 'lucide-react'
import { AssessmentReading } from '@/components/assessment-reading'
import { DownloadPractitionerReport } from '@/components/app/personal-analysis-panel'

const COPY = {
  en: {
    loading: 'Opening your private report…',
    unavailable: 'This private report link is unavailable or has expired.',
    eyebrow: 'PRIVATE REPORT · HOLISTIC HOUSE',
    prepared: 'A personal report from Andy is ready for you.',
    genericTitle: 'Your personal report',
    preview: 'Report preview',
    preparedFor: 'Prepared for you',
    lockTitle: 'Your full report is ready',
    lockCopy: 'Open the complete personal analysis and recommendations in your private space.',
    save: 'Open report & save to my Google Cabinet',
    saving: 'Connecting your report…',
    note: 'Choose your Google account. Your report will open and save automatically under Personal analysis, and your client record with Andy will be linked to that account. Only this report is saved.',
    expiry: 'Invitation available until',
    viewOnlyLabel: 'PRIVATE REPORT · VIEW ONLY',
    viewOnly: 'This invitation allows you to read the full report without signing in. Saving to a Google Cabinet is not enabled for this link.',
    authUnavailable: 'Google sign-in is unavailable right now.',
    saveError: 'We could not prepare your report for saving. Please try again.',
  },
  ru: {
    loading: 'Открываем ваш личный отчёт…',
    unavailable: 'Эта приватная ссылка на отчёт недоступна или больше не действует.',
    eyebrow: 'ЛИЧНЫЙ ОТЧЁТ · HOLISTIC HOUSE',
    prepared: 'Andy подготовил для вас персональный отчёт.',
    genericTitle: 'Ваш личный отчёт',
    preview: 'Предпросмотр отчёта',
    preparedFor: 'Подготовлено для вас',
    lockTitle: 'Полный отчёт готов',
    lockCopy: 'Откройте ваш личный анализ, выводы и рекомендации в приватном кабинете.',
    save: 'Открыть отчёт и сохранить в Google-кабинете',
    saving: 'Подключаем ваш отчёт…',
    note: 'Выберите Google-аккаунт. После входа отчёт откроется полностью и автоматически сохранится в разделе «Личный анализ». Ваша карточка клиента у Andy будет связана с этим аккаунтом. Сохраняется только этот отчёт.',
    expiry: 'Ссылка действует до',
    viewOnlyLabel: 'ЛИЧНЫЙ ОТЧЁТ · ТОЛЬКО ПРОСМОТР',
    viewOnly: 'По этой ссылке можно прочитать полный отчёт без входа. Сохранение в Google-кабинет для неё не разрешено.',
    authUnavailable: 'Вход через Google сейчас недоступен.',
    saveError: 'Не удалось подготовить отчёт к сохранению. Попробуйте ещё раз.',
  },
}

async function api(path, body) {
  const response = await fetch('/api/app/' + path, {
    method: body ? 'POST' : 'GET',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const value = await response.json().catch(() => ({ error: 'SERVICE_UNAVAILABLE' }))
  if (!response.ok) {
    const error = new Error(value.error || 'SERVICE_UNAVAILABLE')
    error.code = value.error
    throw error
  }
  return value
}

export function SharedReportView({ selector, locale = 'en', appAvailable = false }) {
  const c = COPY[locale] || COPY.en
  const [report, setReport] = useState(null)
  const [grant, setGrant] = useState(null)
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let live = true
    const open = async () => {
      const secret = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
      try {
        const value = secret
          ? await api('report-viewer/exchange', { selector, secret })
          : await api('report-viewer/' + encodeURIComponent(selector))
        if (!live) return
        setReport(value.report)
        setGrant(value.grant)
        setState('ready')
        if (secret)
          history.replaceState(history.state, '', window.location.pathname + window.location.search)
      } catch {
        if (live) setState('unavailable')
      }
    }
    open()
    return () => {
      live = false
    }
  }, [selector])

  async function save() {
    if (!grant?.saveAllowed || busy) return
    if (!appAvailable) {
      setError(c.authUnavailable)
      return
    }
    setBusy(true)
    setError('')
    try {
      const intent = await api('save-intents', {
        sourceKind: 'delivered_report',
        selector,
        operationId: crypto.randomUUID(),
      })
      const auth = await api('auth/start', { locale, intentId: intent.id })
      window.location.assign(auth.redirectUrl)
    } catch {
      setError(c.saveError)
      setBusy(false)
    }
  }

  if (state === 'loading')
    return <section className="shared-report-card" aria-busy="true"><p>{c.loading}</p></section>
  if (state !== 'ready' || !report)
    return <section className="shared-report-card"><p role="alert">{c.unavailable}</p></section>

  const canSave = grant?.saveAllowed === true
  const date = /^\d{4}-\d{2}-\d{2}$/.test(report.occurredOn || '')
    ? new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-CA', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(report.occurredOn + 'T12:00:00Z'))
    : ''
  return (
    <section className={'shared-report-card' + (canSave ? ' shared-report-card--invite' : '')}>
      {canSave ? (
        <>
          <header className="shared-report-intro">
            <span className="shared-report-intro-icon" aria-hidden="true"><FileText size={24} /></span>
            <div>
              <p className="about-kicker">{c.eyebrow}</p>
              <h1>{report.title || c.genericTitle}</h1>
              <p>{c.prepared}{date ? ' · ' + date : ''}</p>
            </div>
          </header>
          <div className="shared-report-paper" data-report-preview>
            <div className="shared-report-paper-head"><strong>HOLISTIC HOUSE</strong><span>{c.preview}</span></div>
            <p className="shared-report-paper-eyebrow">{c.preparedFor}</p>
            {/* Decorative placeholder only. Private conclusions never reach this page. */}
            <div className="shared-report-paper-faded" aria-hidden="true">
              <span className="shared-report-skeleton-heading" />
              <span className="shared-report-skeleton-line" />
              <span className="shared-report-skeleton-line short" />
              <span className="shared-report-skeleton-line" />
              <span className="shared-report-skeleton-heading second" />
              <span className="shared-report-skeleton-line" />
              <span className="shared-report-skeleton-line short" />
            </div>
            <div className="shared-report-lock">
              <span className="shared-report-lock-icon" aria-hidden="true"><LockKeyhole size={23} /></span>
              <h2>{c.lockTitle}</h2>
              <p>{c.lockCopy}</p>
              <button type="button" onClick={save} disabled={busy}>
                {busy ? c.saving : c.save}
                {!busy && <ArrowRight size={19} aria-hidden="true" />}
              </button>
              <p className="shared-report-consent">{c.note}</p>
            </div>
          </div>
          {grant?.expiresAt && <p className="shared-report-expiry">{c.expiry}: {new Date(grant.expiresAt).toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-CA')}</p>}
        </>
      ) : (
        <>
          <p className="about-kicker">{c.viewOnlyLabel}</p>
          <AssessmentReading record={report} locale={locale} />
          <div className="hh-analysis-detail-download"><DownloadPractitionerReport report={report} locale={locale} /></div>
          <p className="shared-report-expiry">{c.viewOnly}</p>
          {grant?.expiresAt && <p className="shared-report-expiry">{c.expiry}: {new Date(grant.expiresAt).toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-CA')}</p>}
        </>
      )}
      {error && <p role="alert" className="client-entry-error">{error}</p>}
    </section>
  )
}
