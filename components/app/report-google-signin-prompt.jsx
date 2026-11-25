'use client'

import { useEffect, useState } from 'react'
import styles from './report-google-signin-prompt.module.css'

// Only a UI dismissal flag is stored. Never store private report identifiers,
// viewer credentials, health information or OAuth data in browser storage.
const DISMISS_KEY = 'hh-report-google-prompt-dismissed-v1'

const COPY = {
  en: {
    label: 'Google sign-in for Holistic House',
    heading: 'Sign in to Holistic House with your Google account',
    action: 'Continue with Google',
    busy: 'Opening Google…',
    note: 'Save this report to your private Cabinet. Reading without signing in is still available.',
    close: 'Dismiss sign-in suggestion',
  },
  ru: {
    label: 'Вход в Holistic House через Google',
    heading: 'Войдите в Holistic House с аккаунтом Google',
    action: 'Продолжить с Google',
    busy: 'Открываем Google…',
    note: 'Сохраните этот отчёт в личном кабинете. Читать отчёт можно и без входа.',
    close: 'Закрыть подсказку о входе',
  },
}

// This is a first-party suggestion, not a Google One Tap widget. The action
// uses the existing report-scoped save intent and server-side OAuth PKCE flow.
export function ReportGoogleSignInPrompt({
  locale = 'en',
  viewing = false,
  enabled = false,
  onGoogle,
  busy = false,
  error = '',
}) {
  const c = COPY[locale] || COPY.en
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!viewing || !enabled) return undefined
    try {
      if (window.sessionStorage.getItem(DISMISS_KEY) === '1') return undefined
    } catch {
      // Session storage may be blocked. The suggestion still remains optional.
    }
    let live = true
    const controller = new AbortController()
    // Never show a sign-in prompt to an already authenticated visitor.
    // Fail closed on server errors rather than misreporting the visitor as a guest.
    fetch('/api/app/auth/contact-profile', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(response => {
        if (live && response.status === 401) setOpen(true)
      })
      .catch(() => {})
    return () => {
      live = false
      controller.abort()
    }
  }, [viewing, enabled])

  function dismiss() {
    setOpen(false)
    try {
      window.sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // Dismissal still works in memory if storage is unavailable.
    }
  }

  if (!open || !viewing || !enabled) return null

  return (
    <>
      <div className={styles.spacer} aria-hidden="true" />
      <aside className={styles.prompt} aria-label={c.label} data-report-google-prompt>
        <div className={styles.header}>
          <span className={styles.googleMark} aria-hidden="true">G</span>
          <p className={styles.heading}>{c.heading}</p>
          <button
            type="button"
            className={styles.close}
            onClick={dismiss}
            aria-label={c.close}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <button
          type="button"
          className={styles.action}
          onClick={onGoogle}
          disabled={busy}
        >
          {busy ? c.busy : c.action}
        </button>
        <p className={styles.note}>{c.note}</p>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </aside>
    </>
  )
}
