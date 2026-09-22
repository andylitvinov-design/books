'use client'

import { useEffect, useRef, useState } from 'react'

const secretPattern = /^[A-Za-z0-9_-]{43}$/

export function PrescriptionAccessGate({ locale, selector, cabinet = false }) {
  const started = useRef(false)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    const exchange = () => {
      const secret = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
      if (started.current) return
      if (!secretPattern.test(secret)) { setUnavailable(true); return }
      started.current = true
      setUnavailable(false)
      void (async () => {
        const response = await fetch(cabinet ? '/api/client-access' : '/api/prescription-access', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          cache: 'no-store', credentials: 'same-origin',
          body: JSON.stringify({ selector, secret }),
        })
        if (response.ok) {
          window.location.replace(`${window.location.pathname}${window.location.search}`)
          return
        }
        setUnavailable(true)
      })().catch(() => setUnavailable(true)).finally(() => { started.current = false })
    }
    exchange()
    window.addEventListener('hashchange', exchange)
    return () => window.removeEventListener('hashchange', exchange)
  }, [selector, cabinet])

  const labels = locale === 'ru'
    ? { checking: 'Проверяем приватную ссылку…', unavailable: 'Приватная ссылка недоступна.' }
    : { checking: 'Checking the private link…', unavailable: 'Private link unavailable.' }

  return <main className="prescription-access-gate" aria-live="polite">
    <h1>{unavailable ? labels.unavailable : labels.checking}</h1>
  </main>
}
