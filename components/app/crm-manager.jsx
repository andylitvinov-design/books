'use client'
import { useEffect, useRef, useState } from 'react'
import { CRM_TEMPLATES } from '../../lib/crm/campaigns'
import styles from './crm-manager.module.css'
const COPY = {
  en: { title: 'Clients & subscribers', privacy: 'Business contact details only. Do not enter health information here.', name: 'Name', email: 'Email', add: 'Add contact', loading: 'Loading…', error: 'CRM is not available yet. Your information was not saved.', noContacts: 'No contacts yet.', noConsent: 'Marketing consent is separate from a paid subscription.', draft: 'Prepare an update', saveDraft: 'Save draft', drafts: 'Drafts', off: 'Sending is off. No email or messenger campaign will be sent from this screen.', saved: 'Saved.', unverified: 'Address not verified', suppressed: 'Do not contact', locale: 'Language' },
  ru: { title: 'Клиенты и подписчики', privacy: 'Только деловые контактные данные. Не вводите здесь сведения о здоровье.', name: 'Имя', email: 'Email', add: 'Добавить контакт', loading: 'Загрузка…', error: 'CRM пока недоступна. Данные не сохранены.', noContacts: 'Контактов пока нет.', noConsent: 'Согласие на рассылку оформляется отдельно от платной подписки.', draft: 'Подготовить новость', saveDraft: 'Сохранить черновик', drafts: 'Черновики', off: 'Отправка отключена. Эта страница не отправляет email или сообщения в мессенджеры.', saved: 'Сохранено.', unverified: 'Адрес не подтверждён', suppressed: 'Не писать', locale: 'Язык' },
  es: { title: 'Clientes y suscriptores', privacy: 'Solo datos de contacto. No introduzcas información de salud aquí.', name: 'Nombre', email: 'Correo', add: 'Añadir contacto', loading: 'Cargando…', error: 'El CRM aún no está disponible. Los datos no se han guardado.', noContacts: 'Todavía no hay contactos.', noConsent: 'El consentimiento para recibir novedades es independiente de la suscripción.', draft: 'Preparar novedades', saveDraft: 'Guardar borrador', drafts: 'Borradores', off: 'El envío está desactivado. Esta pantalla no envía correos ni mensajes.', saved: 'Guardado.', unverified: 'Dirección no verificada', suppressed: 'No contactar', locale: 'Idioma' },
}
const BILLING_COPY = {
  en: { title: 'Subscription register', note: 'Up to 100 technical account records. Contact matching has not been verified.', off: 'Subscription register is not connected.', until: 'Paid through', cancel: 'Renewal cancelled' },
  ru: { title: 'Реестр подписок', note: 'До 100 технических записей аккаунтов. Связь с контактами ещё не подтверждена.', off: 'Реестр подписок пока не подключён.', until: 'Оплачено до', cancel: 'Продление отменено' },
  es: { title: 'Registro de suscripciones', note: 'Hasta 100 registros técnicos de cuentas. La vinculación con contactos no está verificada.', off: 'El registro aún no está conectado.', until: 'Pagado hasta', cancel: 'Renovación cancelada' },
}
export default function CrmManager({ locale = 'en', accountId }) {
  const language = COPY[locale] ? locale : 'en'
  const c = COPY[language]
  const billing = BILLING_COPY[language]
  const [data, setData] = useState(null)
  const sessionRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [displayName, setName] = useState('')
  const [email, setEmail] = useState('')
  const [templateId, setTemplate] = useState('course_update')
  async function load(session) {
    const response = await fetch('/api/app/crm', { credentials: 'same-origin', cache: 'no-store', signal: session.controller.signal, headers: { 'X-HH-Account-Id': session.accountId } })
    if (!response.ok) throw new Error('unavailable')
    const result = await response.json(); if (sessionRef.current === session) setData(result)
  }
  useEffect(() => {
    if (!accountId) return
    const controller = new AbortController()
    const session = { accountId, controller }
    sessionRef.current = session
    setData(null); setNotice(''); setBusy(false); setName(''); setEmail('')
    fetch('/api/app/crm', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal, headers: { 'X-HH-Account-Id': accountId } })
      .then(async (response) => { if (!response.ok) throw new Error('unavailable'); const result = await response.json(); if (sessionRef.current === session) setData(result) })
      .catch((error) => { if (error.name !== 'AbortError' && sessionRef.current === session) setNotice(c.error) })
    return () => { controller.abort(); if (sessionRef.current === session) sessionRef.current = null }
  }, [c.error, accountId])
  async function save(action, payload) {
    const session = sessionRef.current
    if (busy || !session || session.accountId !== accountId) return
    setBusy(true); setNotice('')
    try {
      const response = await fetch('/api/app/crm', { method: 'POST', credentials: 'same-origin', signal: session.controller.signal, headers: { 'Content-Type': 'application/json', 'X-HH-Account-Id': session.accountId }, body: JSON.stringify({ action, payload }) })
      if (!response.ok) throw new Error('unavailable')
      if (sessionRef.current !== session) return
      setNotice(c.saved)
      if (action === 'create_contact') { setName(''); setEmail('') }
      await load(session).catch(() => {})
    } catch { if (sessionRef.current === session) setNotice(c.error) } finally { if (sessionRef.current === session) setBusy(false) }
  }
  if (!accountId) return null
  return <section className={styles.panel} aria-labelledby="crm-title">
    <h2 id="crm-title">{c.title}</h2><p>{c.privacy}</p><p>{c.noConsent}</p>
    <p role="status" aria-live="polite">{notice || (!data ? c.loading : '')}</p>
    <form className={styles.form} onSubmit={(event) => { event.preventDefault(); save('create_contact', { displayName, email, locale: language, lifecycle: 'lead' }) }}>
      <label>{c.name}<input value={displayName} onChange={(event) => setName(event.target.value)} maxLength={120} autoComplete="off" required /></label>
      <label>{c.email}<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} autoComplete="off" required /></label>
      <button disabled={busy || !data} type="submit">{c.add}</button>
    </form>
    <ul className={styles.list}>{data?.contacts?.length ? data.contacts.map((contact) => <li key={contact.id}><strong>{contact.displayName}</strong><span>{contact.email}</span><small>{contact.suppressed ? c.suppressed : c.unverified}</small></li>) : <li>{c.noContacts}</li>}</ul>
    <h3>{billing.title}</h3><p>{data?.subscriberRegistryEnabled ? billing.note : billing.off}</p>
    {data?.subscriberRegistryEnabled && <ul className={styles.list}>{data.subscribers?.map((subscriber) => <li key={`${subscriber.accountId}-${subscriber.provider}-${subscriber.environment}`}>
      <strong>{subscriber.accountId?.slice(0, 8)}</strong><span>{subscriber.status}</span><span>{subscriber.provider} · {subscriber.environment}</span>
      {subscriber.paidThrough && <span>{billing.until}: {new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(new Date(subscriber.paidThrough))}</span>}
      {subscriber.cancelAtPeriodEnd && <small>{billing.cancel}</small>}
    </li>)}</ul>}
    <h3>{c.draft}</h3><p>{c.off}</p>
    <select aria-label={c.draft} value={templateId} onChange={(event) => setTemplate(event.target.value)}>{Object.entries(CRM_TEMPLATES).map(([id, text]) => <option key={id} value={id}>{text[language].subject}</option>)}</select>
    <p>{CRM_TEMPLATES[templateId][language].body}</p>
    <button disabled={busy || !data} type="button" onClick={() => save('create_draft', { templateId, locale: language, channel: 'email', segment: 'all_opted_in' })}>{c.saveDraft}</button>
    <h3>{c.drafts}</h3><ul>{data?.drafts?.map((draft) => <li key={draft.id}>{CRM_TEMPLATES[draft.definition?.templateId]?.[draft.definition?.locale]?.subject || draft.status}</li>)}</ul>
  </section>
}
