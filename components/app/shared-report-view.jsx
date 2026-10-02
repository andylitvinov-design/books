'use client'

import { useEffect, useState } from 'react'
import { AssessmentReading } from '@/components/assessment-reading'

const COPY = {
  en: {
    loading: 'Opening your report…',
    unavailable: 'This report link is unavailable or has expired.',
    save: 'Save this report to my Cabinet',
    saving: 'Opening your Cabinet…',
    note: 'You can read this report without an account. Sign in only if you want to keep it in your personal Cabinet.',
    authUnavailable: 'Google sign-in is not connected in this environment yet.',
  },
  ru: {
    loading: 'Открываем ваш отчёт…',
    unavailable: 'Эта ссылка на отчёт недоступна или больше не действует.',
    save: 'Сохранить отчёт в личном кабинете',
    saving: 'Открываем личный кабинет…',
    note: 'Этот отчёт можно читать без аккаунта. Вход нужен только если вы хотите сохранить его в личном кабинете.',
    authUnavailable: 'В этом окружении вход через Google пока не подключён.',
  },
}

export function SharedReportView({ reportId, locale = 'en', appAvailable = false }) {
  const c = COPY[locale] || COPY.en
  const [report, setReport] = useState(null)
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let live = true
    const secret = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
    if (!secret) {
      setState('unavailable')
      return
    }
    fetch('/api/report/' + encodeURIComponent(reportId), {
      method: 'POST',
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret }),
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}))
        if (!response.ok || !body.report) throw new Error('UNAVAILABLE')
        if (!live) return
        setReport(body.report)
        setState('ready')
        history.replaceState(history.state, '', window.location.pathname + window.location.search)
      })
      .catch(() => {
        if (live) setState('unavailable')
      })
    return () => {
      live = false
    }
  }, [reportId])

  async function save() {
    if (!appAvailable) {
      setError(c.authUnavailable)
      return
    }
    setBusy(true)
    setError('')
    try {
      const claimResponse = await fetch('/api/app/report/claim', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      const claimBody = await claimResponse.json().catch(() => ({}))
      if (claimResponse.ok && claimBody.claimed) {
        window.location.assign('/' + locale + '/app')
        return
      }
      if (claimResponse.status === 403 && claimBody.error === 'CONSENT_REQUIRED') {
        window.location.assign('/' + locale + '/app')
        return
      }
      if (claimResponse.status !== 401) throw new Error('SIGN_IN_UNAVAILABLE')

      const authResponse = await fetch('/api/app/auth/start', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale }),
      })
      const authBody = await authResponse.json().catch(() => ({}))
      if (!authResponse.ok || !authBody.redirectUrl) throw new Error('SIGN_IN_UNAVAILABLE')
      window.location.assign(authBody.redirectUrl)
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
      <AssessmentReading record={report} locale={locale} />
      <div className="shared-report-save">
        <p>{c.note}</p>
        <button type="button" onClick={save} disabled={busy}>
          {busy ? c.saving : c.save}
        </button>
        {error && <p role="alert" className="client-entry-error">{error}</p>}
      </div>
    </section>
  )
}
