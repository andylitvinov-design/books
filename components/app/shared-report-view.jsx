'use client'

import { useEffect, useState } from 'react'
import { AssessmentReading } from '@/components/assessment-reading'

const COPY = {
  en: {
    loading: 'Opening your report…',
    unavailable: 'This report link is unavailable or has expired.',
    save: 'Save this report to my Cabinet',
    saving: 'Preparing secure save…',
    note: 'You can read this report without an account. Sign in only if you want to keep it in your personal Cabinet.',
    viewOnly: 'This invitation is for viewing only. Saving to a personal Cabinet is not enabled for this link.',
    authUnavailable: 'Google sign-in is not connected in this environment yet.',
    guest: 'Guest access',
    expires: 'Invitation available until',
  },
  ru: {
    loading: 'Открываем ваш отчёт…',
    unavailable: 'Эта ссылка на отчёт недоступна или больше не действует.',
    save: 'Сохранить отчёт в личном кабинете',
    saving: 'Подготавливаем безопасное сохранение…',
    note: 'Этот отчёт можно читать без аккаунта. Вход нужен только если вы хотите сохранить его в личном кабинете.',
    viewOnly: 'Эта ссылка предназначена только для просмотра. Сохранение в личный кабинет для неё не разрешено.',
    authUnavailable: 'В этом окружении вход через Google пока не подключён.',
    guest: 'Гостевой доступ',
    expires: 'Ссылка действует до',
  },
}

async function api(path, body, method) {
  const response = await fetch('/api/app/' + path, {
    method: method || (body ? 'POST' : 'GET'),
    cache: 'no-store',
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const value = await response.json().catch(() => ({ error: 'SERVICE_UNAVAILABLE' }))
  if (!response.ok) {
    const error = new Error(value.error || 'SERVICE_UNAVAILABLE')
    error.code = value.error
    error.status = response.status
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
      if (intent.signedIn) {
        window.location.assign('/' + locale + '/app/continue?intent=' + encodeURIComponent(intent.id))
        return
      }
      const auth = await api('auth/start', { locale, intentId: intent.id })
      window.location.assign(auth.redirectUrl)
    } catch {
      setError(c.authUnavailable)
      setBusy(false)
    }
  }

  if (state === 'loading')
    return <section className="shared-report-card" aria-busy="true"><p>{c.loading}</p></section>
  if (state !== 'ready' || !report)
    return <section className="shared-report-card"><p role="alert">{c.unavailable}</p></section>

  return (
    <section className="shared-report-card">
      <p className="about-kicker">{c.guest}</p>
      <AssessmentReading record={report} locale={locale} />
      {grant?.expiresAt && <p className="cabinet-test-note">{c.expires}: {new Date(grant.expiresAt).toLocaleString(locale)}</p>}
      <div className="shared-report-save">
        <p>{c.note}</p>
        {grant?.saveAllowed ? (
          <button type="button" onClick={save} disabled={busy}>
            {busy ? c.saving : c.save}
          </button>
        ) : (
          <p className="cabinet-test-note">{c.viewOnly}</p>
        )}
        {error && <p role="alert" className="client-entry-error">{error}</p>}
      </div>
    </section>
  )
}
