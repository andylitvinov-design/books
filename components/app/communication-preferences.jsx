'use client'
import { useEffect, useRef, useState } from 'react'
import styles from './crm-manager.module.css'
import { boundedJsonFetch } from '../../lib/crm/client-request'
const TEXT = {
  en: { title: 'Messages and updates', note: 'Optional updates are separate from your paid subscription. Sending and new opt-ins remain off until the sender and consent notice are configured.', stop: 'Turn off updates', off: 'Off', on: 'Opted in', error: 'Preferences could not be loaded or saved.', saved: 'Preference saved.' },
  ru: { title: 'Сообщения и новости', note: 'Необязательные новости не связаны с платной подпиской. Отправка и новые согласия отключены до настройки отправителя и текста согласия.', stop: 'Отключить новости', off: 'Отключено', on: 'Согласие получено', error: 'Не удалось загрузить или сохранить настройки.', saved: 'Настройка сохранена.' },
  es: { title: 'Mensajes y novedades', note: 'Las novedades opcionales son independientes de la suscripción. El envío y los nuevos consentimientos están desactivados hasta configurar el remitente y el aviso de consentimiento.', stop: 'Desactivar novedades', off: 'Desactivado', on: 'Consentimiento guardado', error: 'No se pudieron cargar o guardar las preferencias.', saved: 'Preferencia guardada.' },
}
export default function CommunicationPreferences({ locale = 'en', accountId }) {
  const text = TEXT[locale] || TEXT.en
  const [preferences, setPreferences] = useState(null)
  const sessionRef = useRef(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!accountId) return
    const controller = new AbortController()
    const session = { accountId, controller }; sessionRef.current = session
    setPreferences(null); setMessage(''); setBusy(false)
    boundedJsonFetch('/api/app/communication-preferences', { cache: 'no-store', credentials: 'same-origin', signal: controller.signal, headers: { 'X-HH-Account-Id': accountId } })
      .then(({ response, data }) => { if (!response.ok) throw new Error(); if (sessionRef.current === session) setPreferences(Array.isArray(data.preferences) ? data.preferences : []) })
      .catch(() => { if (sessionRef.current === session) setMessage(text.error) })
    return () => { controller.abort(); if (sessionRef.current === session) sessionRef.current = null }
  }, [text.error, accountId])
  async function withdraw(channel) {
    const session = sessionRef.current
    if (busy || !session || session.accountId !== accountId) return
    setBusy(true)
    try {
      const { response } = await boundedJsonFetch('/api/app/communication-preferences', { method: 'POST', credentials: 'same-origin', signal: session.controller.signal, headers: { 'Content-Type': 'application/json', 'X-HH-Account-Id': session.accountId }, body: JSON.stringify({ channel, accepted: false, textVersion: 'crm-marketing-v1' }) })
      if (!response.ok) throw new Error()
      if (sessionRef.current !== session) return
      setPreferences((items) => (items || []).map((item) => item.channel === channel ? { ...item, accepted: false } : item)); setMessage(text.saved)
    } catch { if (sessionRef.current === session) setMessage(text.error) } finally { if (sessionRef.current === session) setBusy(false) }
  }
  if (!accountId) return null
  return <section className={styles.panel} aria-labelledby="communication-preferences-title">
    <h2 id="communication-preferences-title">{text.title}</h2><p>{text.note}</p>
    <ul className={styles.list}>{['email', 'telegram', 'whatsapp'].map((channel) => {
      const accepted = (preferences || []).some((item) => item.channel === channel && item.accepted)
      return <li key={channel}><strong>{channel}</strong><span>{preferences === null ? '—' : accepted ? text.on : text.off}</span>{accepted && <button type="button" disabled={busy} onClick={() => withdraw(channel)}>{text.stop}</button>}</li>
    })}</ul><p role="status" aria-live="polite">{message}</p>
  </section>
}
