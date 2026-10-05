'use client'

import { useState } from 'react'

async function api(path, body) {
  const response = await fetch('/api/app/' + path, {
    method: 'POST',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const value = await response.json().catch(() => ({ error: 'SERVICE_UNAVAILABLE' }))
  if (!response.ok) {
    const error = new Error(value.error || 'SERVICE_UNAVAILABLE')
    error.code = value.error
    throw error
  }
  return value
}

export function SavePrivateDocumentControl({ selector, locale = 'en', appAvailable = false }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const ru = locale === 'ru'

  async function save() {
    if (busy) return
    if (!appAvailable) {
      setError(ru ? 'Google-кабинет сейчас недоступен.' : 'Google Cabinet is unavailable right now.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const intent = await api('save-intents', {
        sourceKind: 'legacy_document',
        selector,
        operationId: crypto.randomUUID(),
      })
      if (intent.signedIn) {
        window.location.assign('/' + locale + '/app/continue?intent=' + encodeURIComponent(intent.id))
        return
      }
      const auth = await api('auth/start', { locale, intentId: intent.id })
      window.location.assign(auth.redirectUrl)
    } catch (e) {
      setError(
        e?.code === 'DOCUMENT_UNAVAILABLE'
          ? ru
            ? 'Этот документ нельзя сохранить в кабинет.'
            : 'This document cannot be saved to the Cabinet.'
          : ru
            ? 'Не удалось начать сохранение. Попробуйте ещё раз.'
            : 'Could not start saving. Please try again.',
      )
      setBusy(false)
    }
  }

  return (
    <div className="prescription-save-to-cabinet">
      <button type="button" onClick={save} disabled={busy}>
        {busy
          ? ru
            ? 'Открываем Google…'
            : 'Opening Google…'
          : ru
            ? 'Сохранить в мой кабинет через Google'
            : 'Save to my Cabinet with Google'}
      </button>
      <span>
        {ru
          ? 'Войдите или зарегистрируйтесь через Google — сохранится только этот документ.'
          : 'Sign in or register with Google — only this document will be saved.'}
      </span>
      {error && <span role="alert">{error}</span>}
    </div>
  )
}
