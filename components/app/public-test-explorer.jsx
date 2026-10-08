'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TestExplorer } from './test-explorer'
import styles from './test-explorer-consent.module.css'

async function request(path, body, method = 'POST') {
  const response = await fetch(`/api/app/${path}`, { method, credentials: 'same-origin', cache: 'no-store', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined })
  const value = await response.json().catch(() => ({ error: 'SERVICE_UNAVAILABLE' }))
  if (!response.ok) { const error = new Error(value.error || 'SERVICE_UNAVAILABLE'); error.code = value.error; throw error }
  return value
}

export function PublicTestExplorer({ locale, embedded = false }) {
  const [pending, setPending] = useState(null), [adult, setAdult] = useState(false), [necessary, setNecessary] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(null)
  const router = useRouter(), ru = locale === 'ru'
  const submit = async (entries, createSession = false) => {
    setBusy(true); setError(null)
    try {
      if (createSession) await request('guest/session', { adult, necessary, uiLocale: locale, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' })
      const plan = await request('guest/test-plans', { items: entries.map((entry) => ({ definitionKey: entry.definition.key, definitionVersion: entry.definition.version, instrumentLocale: entry.definition.instrumentLocale })), operationId: crypto.randomUUID(), replaceActive: false })
      router.push(`/${locale}/client?plan=${encodeURIComponent(plan.id)}`)
    } catch (cause) {
      if (cause.code === 'GUEST_SESSION_REQUIRED') setPending(entries)
      else setError(cause)
    } finally { setBusy(false) }
  }
  return <><TestExplorer locale={locale} audience="guest" embedded={embedded} onStart={(entries) => submit(entries)} />
    {pending && <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label={ru ? 'Перед началом' : 'Before you start'}><section className={styles.dialog}><h2>{ru ? 'Перед началом' : 'Before you start'}</h2><p>{ru ? 'Чтобы временно сохранить выбранный набор и ответы, подтвердите необходимые условия обработки.' : 'To temporarily store your selected set and answers, confirm the necessary processing conditions.'}</p><label><input type="checkbox" checked={adult} onChange={(event) => setAdult(event.target.checked)} />{ru ? 'Мне исполнилось 18 лет.' : 'I am 18 or older.'}</label><label><input type="checkbox" checked={necessary} onChange={(event) => setNecessary(event.target.checked)} />{ru ? 'Я согласен(-на) на временную приватную обработку ответов и результатов.' : 'I agree to temporary private processing of my answers and result.'}</label>{error && <p role="alert">{error.code || error.message}</p>}<div className={styles.actions}><button type="button" onClick={() => setPending(null)}>{ru ? 'Назад' : 'Back'}</button><button type="button" disabled={busy || !adult || !necessary} onClick={() => submit(pending, true)}>{busy ? '…' : (ru ? 'Продолжить' : 'Continue')}</button></div></section></div>}
  </>
}
