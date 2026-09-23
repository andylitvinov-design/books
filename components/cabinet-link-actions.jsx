'use client'

import { useState } from 'react'

export function CabinetLinkActions({ clientId, locale = 'en' }) {
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const ru = locale === 'ru'

  async function act(open) {
    setBusy(true)
    setStatus('')
    try {
      const response = await fetch(`/admin/api/clients/${clientId}/access`, { method: 'POST', cache: 'no-store' })
      if (!response.ok) throw new Error('Unavailable')
      const { selector, secret } = await response.json()
      const url = `${location.origin}/${locale}/client/${selector}#${secret}`
      if (open) location.assign(url)
      else {
        await navigator.clipboard.writeText(url)
        setStatus(ru ? 'Ссылка скопирована' : 'Link copied')
      }
    } catch {
      setStatus(ru ? 'Доступ недоступен' : 'Access unavailable')
    } finally {
      setBusy(false)
    }
  }

  return <section className="consultation-cabinet-card consultation-cabinet-card--dense" aria-label={ru ? 'Кабинет клиента' : 'Client cabinet'}>
    <div className="consultation-cabinet-head">
      <p>{ru ? 'КАБИНЕТ КЛИЕНТА' : 'CLIENT CABINET'}</p>
      <span>{ru ? 'Одна ссылка на всю историю' : 'One link for all history'}</span>
    </div>
    <div className="consultation-cabinet-actions consultation-cabinet-actions--dense">
      <button className="consultation-cabinet-primary" type="button" disabled={busy} onClick={() => act(false)}>
        {ru ? 'Копировать' : 'Copy link'}
      </button>
      <button type="button" disabled={busy} onClick={() => act(true)}>{ru ? 'Открыть' : 'Open'}</button>
      <a href={`/admin/clients/${clientId}`}>{ru ? 'История' : 'History'}</a>
    </div>
    <p className="consultation-cabinet-status" role="status">{status}</p>
  </section>
}
