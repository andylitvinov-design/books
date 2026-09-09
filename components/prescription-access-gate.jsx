'use client'

import { useEffect, useRef, useState } from 'react'

const secretPattern = /^[A-Za-z0-9_-]{43}$/

export function PrescriptionAccessGate({ locale, selector }) {
  const started = useRef(false)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const secret = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    if (!secretPattern.test(secret)) {
      setUnavailable(true)
      return
    }
    void (async () => {
      const response = await fetch('/api/prescription-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        credentials: 'same-origin',
        body: JSON.stringify({ selector, secret }),
      })
      if (response.ok) {
        window.location.replace(`${window.location.pathname}${window.location.search}`)
        return
      }
      setUnavailable(true)
    })().catch(() => setUnavailable(true))
  }, [selector])

  const labels = locale === 'ru'
    ? { checking: 'Проверяем приватную ссылку…', unavailable: 'Назначение недоступно.' }
    : { checking: 'Checking the private link…', unavailable: 'Recommendation unavailable.' }

  return <main className="prescription-access-gate" aria-live="polite">
    <h1>{unavailable ? labels.unavailable : labels.checking}</h1>
  </main>
}
