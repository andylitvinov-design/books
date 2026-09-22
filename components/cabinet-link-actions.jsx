'use client'
import { useState } from 'react'
export function CabinetLinkActions({ clientId, locale = 'en' }) {
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const ru = locale === 'ru'
  async function act(open) {
    setBusy(true); setStatus('')
    try {
      const response = await fetch(`/admin/api/clients/${clientId}/access`, { method: 'POST', cache: 'no-store' })
      if (!response.ok) throw new Error('Unavailable')
      const { selector, secret } = await response.json()
      const url = `${location.origin}/${locale}/client/${selector}#${secret}`
      if (open) location.assign(url)
      else { await navigator.clipboard.writeText(url); setStatus(ru ? 'Ссылка скопирована' : 'Cabinet link copied') }
    } catch { setStatus(ru ? 'Доступ недоступен. Проверьте настройки клиента.' : 'Access unavailable. Check client settings.') }
    finally { setBusy(false) }
  }
  return <section className="consultation-result-document"><h2>{ru ? 'Кабинет клиента' : 'Client cabinet'}</h2><div className="consultation-result-actions"><button type="button" disabled={busy} onClick={() => act(false)}>{ru ? 'Копировать ссылку на кабинет' : 'Copy client cabinet link'}</button><button type="button" disabled={busy} onClick={() => act(true)}>{ru ? 'Открыть кабинет' : 'Open cabinet'}</button><a href={`/admin/clients/${clientId}`}>{ru ? 'История клиента' : 'Client history'}</a></div><p role="status">{status}</p></section>
}
