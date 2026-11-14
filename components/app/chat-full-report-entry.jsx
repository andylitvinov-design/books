'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './chat-full-report-entry.module.css'

// A single server-scoped handoff replaces the public score-only result URL.
// No guest scores, answers, account credentials or report identifiers go into
// web storage, chat history, analytics or the OAuth redirect query.
const COPY = {
  ru: {
    open: 'Открыть полный отчёт', opening: 'Открываем отчёт…',
    eyebrow: 'ЛИЧНЫЙ РЕЗУЛЬТАТ', title: 'Ваш подробный отчёт',
    description: 'Войдите или создайте личный кабинет, чтобы сразу увидеть полный результат теста: шкалы, графики, диапазоны и подробные пояснения.',
    google: 'Продолжить через Google', telegram: 'Продолжить через Telegram',
    note: 'После входа выбранный тест будет сохранён в вашем личном кабинете. Ответы остаются закрытыми и не публикуются.',
    existing: 'Уже есть Google-кабинет? Войдите через Google, чтобы сохранить ранее пройденные тесты.',
    close: 'Закрыть окно входа', error: 'Не получилось открыть полный отчёт. Попробуйте снова.',
    authError: 'Не удалось открыть вход. Повторите попытку.',
  },
  en: {
    open: 'Open my full report', opening: 'Opening report…',
    eyebrow: 'PRIVATE TEST RESULT', title: 'Your detailed test report',
    description: 'Sign in or create your private Cabinet to open the complete test reading: scores, charts, ranges and explanations.',
    google: 'Continue with Google', telegram: 'Continue with Telegram',
    note: 'After sign-in, this selected test is saved in your private Cabinet. Answers stay private and are never published.',
    existing: 'Already have a Google Cabinet? Use Google to keep your previously completed tests.',
    close: 'Close sign-in dialog', error: 'Could not open the full report. Please try again.',
    authError: 'Could not start sign-in. Please retry.',
  },
  es: {
    open: 'Abrir informe completo', opening: 'Abriendo informe…',
    eyebrow: 'RESULTADO PRIVADO', title: 'Tu informe detallado',
    description: 'Entra o crea tu gabinete para ver el resultado completo: puntuaciones, gráficos, rangos y explicaciones.',
    google: 'Continuar con Google', telegram: 'Continuar con Telegram',
    note: 'Al entrar, solo este resultado se guarda en tu gabinete privado. Las respuestas nunca se publican.',
    existing: '¿Ya tienes gabinete con Google? Entra con Google para conservar los resultados anteriores.',
    close: 'Cerrar acceso', error: 'No se pudo abrir el informe. Inténtalo otra vez.',
    authError: 'No se pudo iniciar sesión. Vuelve a intentarlo.',
  },
}

async function appRequest(path, body) {
  const response = await fetch('/api/app/' + path, {
    method: body ? 'POST' : 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const value = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(value.error || 'REPORT_UNAVAILABLE')
  return value
}

export function ChatFullReportEntry({ resultId, locale = 'en' }) {
  const c = COPY[locale] || COPY.en
  const accountLocale = locale === 'es' ? 'en' : locale
  const [intentId, setIntentId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [telegramAvailable, setTelegramAvailable] = useState(false)
  const inFlight = useRef(false)
  const dialogRef = useRef(null)
  const currentResultId = useRef(resultId)
  currentResultId.current = resultId

  useEffect(() => {
    setIntentId('')
    setError('')
    setTelegramAvailable(false)
  }, [resultId])

  useEffect(() => {
    if (!intentId) return undefined
    let live = true
    // Telegram is an optional website Auth provider, not just an open bot chat.
    appRequest('auth/providers').then(value => {
      if (live) setTelegramAvailable(value?.telegram === true)
    }).catch(() => { /* Google remains available through the existing Auth flow. */ })
    return () => { live = false }
  }, [intentId])

  useEffect(() => {
    if (!intentId) return undefined
    const previouslyFocused = document.activeElement
    const dialog = dialogRef.current
    dialog?.querySelector('[data-chat-report-google-login]')?.focus()
    function onKeyDown(event) {
      if (event.key === 'Escape' && !inFlight.current) {
        event.preventDefault()
        setIntentId('')
      }
      if (event.key !== 'Tab' || !dialog) return
      const controls = [...dialog.querySelectorAll('button:not(:disabled)')]
      if (!controls.length) return
      const first = controls[0], last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (previouslyFocused?.isConnected && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus()
      }
    }
  }, [intentId])

  async function openFullReport() {
    if (!resultId || inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError('')
    try {
      const selectedId = resultId
      // This server operation checks the guest session and the exact result.
      const intent = await appRequest('save-intents', {
        sourceKind: 'guest_result',
        sourceId: selectedId,
        operationId: crypto.randomUUID(),
      })
      if (selectedId !== currentResultId.current) return
      if (typeof intent?.id !== 'string') throw new Error('SAVE_INTENT_UNAVAILABLE')
      if (intent.signedIn) {
        // Existing users skip the login prompt; server imports only this result.
        window.location.assign('/' + accountLocale + '/app/continue?intent=' + encodeURIComponent(intent.id) + '&auto=1')
        return
      }
      setIntentId(intent.id)
    } catch {
      if (resultId === currentResultId.current) setError(c.error)
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  async function signIn(provider = 'google') {
    if (!intentId || inFlight.current || (provider === 'telegram' && !telegramAvailable)) return
    inFlight.current = true
    setBusy(true)
    setError('')
    try {
      // Auth continuation retains the narrow, HttpOnly-backed save intent.
      const next = await appRequest('auth/start', {
        locale: accountLocale, intentId,
        ...(provider === 'telegram' ? { provider: 'telegram' } : {}),
      })
      const target = new URL(next.redirectUrl)
      if (target.protocol !== 'https:' && !(target.protocol === 'http:' && target.hostname === 'localhost')) {
        throw new Error('INVALID_AUTH_REDIRECT')
      }
      window.location.assign(target.href)
    } catch {
      setError(c.authError)
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  return <>
    <button type="button" className={styles.open} disabled={busy || !resultId}
      data-chat-test-full-report onClick={() => void openFullReport()}>
      {busy && !intentId ? c.opening : c.open}
    </button>
    {error && !intentId && <p className={styles.error} role="alert">{error}</p>}
    {intentId && typeof document !== 'undefined' && createPortal(
      <div className={styles.backdrop} role="presentation"
        onMouseDown={event => {
          if (event.target === event.currentTarget && !inFlight.current) setIntentId('')
        }}>
        <section className={styles.dialog} ref={dialogRef} role="dialog" aria-modal="true"
          aria-labelledby="hh-chat-full-report-signin-title" aria-describedby="hh-chat-full-report-signin-description"
          data-chat-report-auth-modal>
          <div className={styles.top}>
            <span className={styles.eyebrow}>{c.eyebrow}</span>
            <button type="button" className={styles.close} aria-label={c.close} disabled={busy}
              onClick={() => setIntentId('')}>×</button>
          </div>
          <h2 id="hh-chat-full-report-signin-title">{c.title}</h2>
          <p id="hh-chat-full-report-signin-description">{c.description}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.google} data-chat-report-google-login
              disabled={busy} onClick={() => void signIn('google')}>
              <span className={styles.googleMark} aria-hidden="true">G</span>{c.google}
            </button>
            {telegramAvailable && <button type="button" className={styles.telegram}
              disabled={busy} onClick={() => void signIn('telegram')}>{c.telegram}</button>}
          </div>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <p className={styles.privacy}>{c.note}</p>
          <p className={styles.existing}>{c.existing}</p>
        </section>
      </div>, document.body
    )}
  </>
}
