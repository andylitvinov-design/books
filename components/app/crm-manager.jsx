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
const EXTRA_COPY = {
  en: { all: 'All', leads: 'Interested', clients: 'Clients', archived: 'Archived', suppress: 'Do not contact', suppressConfirm: 'Stop promotional contact with this person? This cannot be undone on this screen.', duplicate: 'This email is already in your contacts.', showing: 'Showing up to 100 recent contacts.' },
  ru: { all: 'Все', leads: 'Интересуются', clients: 'Клиенты', archived: 'Архив', suppress: 'Не связываться', suppressConfirm: 'Запретить рекламные сообщения этому контакту? На этой странице отменить это действие нельзя.', duplicate: 'Контакт с таким email уже существует.', showing: 'Показаны до 100 последних контактов.' },
  es: { all: 'Todos', leads: 'Interesados', clients: 'Clientes', archived: 'Archivados', suppress: 'No contactar', suppressConfirm: '¿Excluir este contacto de los mensajes promocionales? No se puede revertir aquí.', duplicate: 'Ya existe un contacto con este correo.', showing: 'Se muestran hasta 100 contactos recientes.' },
}
export default function CrmManager({ locale = 'en', accountId }) {
  const language = COPY[locale] ? locale : 'en'
  const c = { ...COPY[language], ...EXTRA_COPY[language] }
  const billing = BILLING_COPY[language]
  const [data, setData] = useState(null)
  const sessionRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [displayName, setName] = useState('')
  const [email, setEmail] = useState('')
  const [templateId, setTemplate] = useState('course_update')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [lifecycle, setLifecycle] = useState('lead')
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
    setData(null); setNotice(''); setBusy(false); setName(''); setEmail(''); setFilter('all'); setSearch('')
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
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error === 'CONTACT_ALREADY_EXISTS' ? 'CONTACT_ALREADY_EXISTS' : 'unavailable')
      if (sessionRef.current !== session) return
      setNotice(c.saved)
      if (action === 'create_contact') { setName(''); setEmail(''); setLifecycle('lead') }
      await load(session).catch(() => {})
    } catch (error) { if (sessionRef.current === session) setNotice(error?.message === 'CONTACT_ALREADY_EXISTS' ? c.duplicate : c.error) } finally { if (sessionRef.current === session) setBusy(false) }
  }
  if (!accountId) return null
  const contacts=(data?.contacts||[]).filter(contact=>{
    const text=[contact.displayName,contact.email].join(' ').toLowerCase()
    return text.includes(search.trim().toLowerCase()) && (filter === 'all' || contact.lifecycle === filter)
  })
  const retry=()=>{
    const session=sessionRef.current
    if(!session)return
    setNotice('')
    load(session).catch(()=>{if(sessionRef.current===session)setNotice(c.error)})
  }
  return <section className={styles.panel} aria-labelledby="crm-title">
    <header className={styles.head}>
      <div><h2 id="crm-title">{c.title}</h2>
        <p>{language==='ru'?'Все деловые контакты в одном месте.':language==='es'?'Tus contactos profesionales en un solo lugar.':'Keep your business contacts in one place.'}</p>
      </div>
    </header>
    <div className={styles.privacy}>
      <strong>{language==='ru'?'Только деловые контакты':'Business contacts only'}</strong>
      <p>{c.privacy} {c.noConsent}</p>
    </div>
    {!data&&<div className={styles.unavailable} role={notice?'alert':'status'}>
      <p>{notice||c.loading}</p>
      {notice&&<button type="button" onClick={retry}>{language==='ru'?'Повторить':'Retry'}</button>}
    </div>}
    {data&&<>
      <div className={styles.formCard}>
        <h3>{language==='ru'?'Добавить контакт':'Add new contact'}</h3>
        <form className={styles.form} onSubmit={(event) => {
          event.preventDefault()
          save('create_contact', { displayName, email, locale: language, lifecycle })
        }}>
          <label>{c.name} *<input value={displayName} onChange={(event)=>setName(event.target.value)}
            placeholder={language==='ru'?'Имя клиента':'e.g. Jane Smith'} maxLength={120} autoComplete="off" required /></label>
          <label>{c.email} *<input type="email" value={email} onChange={(event)=>setEmail(event.target.value)}
            placeholder="name@example.com" maxLength={254} autoComplete="off" required /></label>
          <label>{language==='ru'?'Тип контакта':'Contact type'}
            <select value={lifecycle} onChange={(event)=>setLifecycle(event.target.value)}>
              <option value="lead">{language==='ru'?'Интересуется':'Interested'}</option>
              <option value="client">{language==='ru'?'Клиент':'Client'}</option>
            </select>
          </label>
          <button disabled={busy} type="submit">{busy?c.loading:c.add}</button>
        </form>
        <p className={styles.fine}>{language==='ru'?'Добавляйте только контакты, с которыми есть допустимое основание для деловой связи. Это не подписка на рассылку.':'Add only business contacts you are permitted to keep. This does not enroll them in marketing messages.'}</p>
        {notice&&<p role="status" className={styles.notice}>{notice}</p>}
      </div>
      <div className={styles.contactsHead}>
        <h3>{language==='ru'?'Ваши контакты':'Your contacts'} ({data.contacts?.length||0})</h3>
        <input aria-label={language==='ru'?'Поиск контактов':'Search contacts'} type="search"
          placeholder={language==='ru'?'Поиск…':'Search contacts…'} value={search} onChange={(event)=>setSearch(event.target.value)} />
      </div>
      <div className={styles.filters} role="group" aria-label={language==='ru'?'Фильтр контактов':language==='es'?'Filtro de contactos':'Contact filter'}>
        {[[ 'all', c.all ], [ 'lead', c.leads ], [ 'client', c.clients ], [ 'archived', c.archived ]].map(([key,label])=><button type="button" key={key} aria-pressed={filter===key} className={filter===key?styles.filterSelected:styles.filterButton} onClick={()=>setFilter(key)}>{label}</button>)}
      </div>
      <p className={styles.fine}>{c.showing}</p>
      <ul className={styles.list}>
        {contacts.length?contacts.map(contact=><li key={contact.id}>
          <span className={styles.avatar} aria-hidden="true">{String(contact.displayName||'?').trim().slice(0,1).toUpperCase()}</span>
          <span className={styles.contactInfo}><strong>{contact.displayName}</strong><small>{contact.email}</small></span>
          <small className={styles.tag}>{contact.suppressed?c.suppressed:contact.lifecycle==='client'?c.clients:contact.lifecycle==='archived'?c.archived:c.leads}</small>
          {!contact.suppressed&&<button className={styles.suppress} type="button" disabled={busy} onClick={()=>{ if (window.confirm(c.suppressConfirm)) save('suppress_contact',{id:contact.id}) }}>{c.suppress}</button>}
        </li>):<li className={styles.empty}>{search?(language==='ru'?'Ничего не найдено.':'No matching contacts.'):c.noContacts}</li>}
      </ul>
      <details className={styles.advanced}>
        <summary>{language==='ru'?'Подписки и подготовка писем':'Subscriptions & prepared updates'}</summary>
        <h3>{billing.title}</h3><p>{data.subscriberRegistryEnabled?billing.note:billing.off}</p>
        {data.subscriberRegistryEnabled&&<ul className={styles.list}>{data.subscribers?.map(subscriber=><li key={[subscriber.accountId,subscriber.provider,subscriber.environment].join('-')}>
          <strong>{subscriber.accountId?.slice(0,8)}</strong><span>{subscriber.status}</span>
          <span>{subscriber.provider} · {subscriber.environment}</span>
          {subscriber.paidThrough&&<span>{billing.until}: {new Intl.DateTimeFormat(language,{dateStyle:'medium'}).format(new Date(subscriber.paidThrough))}</span>}
          {subscriber.cancelAtPeriodEnd&&<small>{billing.cancel}</small>}
        </li>)}</ul>}
        <h3>{c.draft}</h3><p>{c.off}</p>
        <select aria-label={c.draft} value={templateId} onChange={(event)=>setTemplate(event.target.value)}>
          {Object.entries(CRM_TEMPLATES).map(([id,text])=><option key={id} value={id}>{text[language].subject}</option>)}
        </select>
        <p>{CRM_TEMPLATES[templateId][language].body}</p>
        <button disabled={busy} type="button" onClick={()=>save('create_draft',{templateId,locale:language,channel:'email',segment:'all_opted_in'})}>{c.saveDraft}</button>
        <h3>{c.drafts}</h3><ul>{data.drafts?.map(draft=><li key={draft.id}>{CRM_TEMPLATES[draft.definition?.templateId]?.[draft.definition?.locale]?.subject||draft.status}</li>)}</ul>
      </details>
    </>}
  </section>
}
