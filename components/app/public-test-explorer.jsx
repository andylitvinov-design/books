'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TestExplorer } from './test-explorer'
import { makeTestSelectionIntent, PENDING_TEST_SELECTION_KEY } from '@/lib/app/test-selection-intent'

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

export function PublicTestExplorer({ locale, embedded = false }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const effectiveLocale = locale === 'ru' ? 'ru' : 'en'
  const submit = async (entries, selectionPreferences) => {
    setError('')
    try {
      // Only cleared test identifiers are retained in this tab; never answers, email or tokens.
      // The explicit Start action authorizes this short-lived handoff to the user's own account.
      window.sessionStorage.setItem(PENDING_TEST_SELECTION_KEY,
        makeTestSelectionIntent(entries.map((entry) => entry.key), Date.now(), selectionPreferences))
      let signedIn = false
      try {
        const session = await request('bootstrap', undefined, 'GET')
        signedIn = Boolean(session.account?.id)
      } catch (cause) {
        if (cause.status !== 401) throw cause
      }
      if (signedIn) {
        router.push('/' + effectiveLocale + '/app/tests?selection=pending')
        return
      }
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
  return <>
    <TestExplorer locale={locale} audience="account" embedded={embedded} onStart={submit} />
    {error && <p role="alert" className="cabinet-test-error">{error}</p>}
  </>
}
