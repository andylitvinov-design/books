'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TestExplorer } from './test-explorer'
import { makeTestSelectionIntent, PENDING_TEST_SELECTION_KEY } from '@/lib/app/test-selection-intent'
import { COURSE_ENTRY_INTENT_KEY, makeCourseEntryIntent } from '@/lib/inner-growth/course-entry-intent'

async function request(path, body, method = 'POST') {
  const response = await fetch('/api/app/' + path, {
    method, credentials: 'same-origin', cache: 'no-store',
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

/** @param {{ locale: string, embedded?: boolean, initialPreferences?: { focus: string[], problems?: string[] } | null, initialMode?: 'tests' | 'course', initialBrowseFull?: boolean, onGuestStartSingle?: ((entry: object) => Promise<void>) | null }} props */
export function PublicTestExplorer({ locale, embedded = false, initialPreferences = null, initialMode = 'tests', initialBrowseFull = false, onGuestStartSingle = null }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const effectiveLocale = locale === 'ru' ? 'ru' : 'en'
  const submit = async (entries, selectionPreferences) => {
    setError('')
    try {
      // Read current authority first: a single rights-cleared guest-eligible test
      // uses the *existing* server-backed temporary guest flow, with consent.
      // Full saved batteries still use the explicit Google Account handoff.
      let signedIn = false
      try {
        const session = await request('bootstrap', undefined, 'GET')
        signedIn = Boolean(session.account?.id)
      } catch (cause) {
        if (cause.status !== 401) throw cause
      }
      if (!signedIn && entries.length === 1 && typeof onGuestStartSingle === 'function') {
        const candidate = entries[0]
        if (candidate?.selectable === true && candidate?.startable === true &&
            candidate?.rightsStatus === 'cleared' && candidate?.guestEligible === true &&
            candidate?.definition) {
          await onGuestStartSingle(candidate)
          return
        }
      }
      if (signedIn) {
        const saved = await request('test-plans', {
          items: entries.map((entry) => ({
            definitionKey: entry.definition.key,
            definitionVersion: entry.definition.version,
            instrumentLocale: entry.definition.instrumentLocale,
          })),
          operationId: crypto.randomUUID(),
          appendActive: true,
          selectionPreferences,
        })
        router.push('/' + effectiveLocale + '/app/tests?plan=' + encodeURIComponent(saved.id))
        return
      }
      // For signed-out multi-test or guest-ineligible selections, the existing
      // Google intent stores only short-lived selected definition identifiers,
      // not answers, diagnoses, raw concerns or account information.
      const intent = makeTestSelectionIntent(entries.map((entry) => entry.key), Date.now(), selectionPreferences)
      window.sessionStorage.setItem(PENDING_TEST_SELECTION_KEY, intent)
      const { redirectUrl } = await request('auth/start', {
        locale: effectiveLocale, continueTo: 'tests',
      })
      window.location.assign(redirectUrl)
    } catch (cause) {
      setError(cause?.code === 'APP_UNAVAILABLE' || cause?.code === 'SIGN_IN_UNAVAILABLE'
        ? (locale === 'ru' ? 'Вход через Google сейчас недоступен. Попробуйте позже.' : locale === 'es' ? 'El acceso con Google no está disponible ahora.' : 'Google sign-in is currently unavailable. Please try again.')
        : (locale === 'ru' ? 'Не удалось продолжить. Проверьте соединение и повторите попытку.' : locale === 'es' ? 'No se pudo continuar. Inténtalo de nuevo.' : 'Could not continue. Please check your connection and try again.'))
      throw cause
    }
  }
  const launchCourse = (entries, selectionPreferences) => {
    // Same-tab, short-lived editorial selection only; an explicit course
    // consent screen controls any eventual server-side saving.
    try {
      window.sessionStorage.setItem(COURSE_ENTRY_INTENT_KEY, makeCourseEntryIntent(entries, selectionPreferences))
    } catch { /* Private mode may block session storage; the course still opens. */ }
    router.push('/' + effectiveLocale + '/app/course?entry=personal')
  }
  return <>
    <TestExplorer locale={locale} audience="account" embedded={embedded} simpleMode={embedded}
      key={effectiveLocale + ':' + (initialPreferences?.focus || []).join(',') + ':' + (initialPreferences?.problems || []).join(',') + ':' + initialMode + ':' + String(initialBrowseFull)}
      initialPreferences={initialPreferences} initialMode={initialMode} initialBrowseFull={initialBrowseFull} onStart={submit} onStartCourse={launchCourse} />
    {error && <p role="alert" className="cabinet-test-error">{error}</p>}
  </>
}
