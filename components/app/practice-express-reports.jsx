'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { FileText, Plus, Save, Send, ShieldCheck } from 'lucide-react'
import styles from './practice-express-reports.module.css'

const EMPTY = Object.freeze({
  title: '', situation: '', findings: '', resources: '', steps: '', followUp: '',
  progressBefore: '', progressAfter: '',
})
const COPY = {
  en: {
    title: 'Express diagnosis · situation report',
    subtitle: 'A focused private review with observations, resources and clear next steps. No homeopathic remedies or prescriptions.',
    owner: 'Full clinical report with homeopathy is available only in the owner’s tools.',
    new: 'New express report', archived: 'Saved express reports',
    client: 'Verified client request', noClient: 'No verified client requests yet. Guest enquiries cannot receive private reports until they sign in.',
    selectClient: 'Choose a verified request',
    reportLanguage: 'Report language', reportDate: 'Review date',
    titleField: 'Report title', situation: 'Situation and question',
    findings: 'What we observed / discovered', resources: 'Strengths and possibilities',
    steps: 'Practical steps and recommendations', followUp: 'Follow-up / self-observation',
    before: 'Before · 0–10', after: 'After · 0–10',
    save: 'Save private draft', publish: 'Publish in client’s cabinet',
    revoke: 'Withdraw client access', published: 'Published', draft: 'Private draft', revoked: 'Withdrawn',
    none: 'No express reports yet.', refreshing: 'Loading reports…', error: 'Could not open the report. Please retry.',
    saved: 'Draft saved. It is not yet visible to the client.',
    sent: 'Published to the verified client’s private cabinet. No external message was sent.',
    hidden: 'Report withdrawn from the client’s cabinet.',
    confirmPublish: 'Publish this report to the verified client’s private cabinet?',
    confirmRevoke: 'Withdraw this published report from the client’s cabinet?',
    ready: 'Complete Situation, Observations and Practical steps before publishing.',
    dirty: 'Save your changes before publishing.',
    locked: 'Published reports are read-only. Create another report for a follow-up.',
    privacy: 'Private report, not a medical diagnosis. Only the assigned practitioner can write; only the verified client can read after publication.',
    dates: 'Date',
  },
  ru: {
    title: 'Экспресс-диагностика · отчёт по ситуации',
    subtitle: 'Краткий приватный отчёт: наблюдения, ресурсы и конкретные шаги. Без гомеопатических препаратов и рецептов.',
    owner: 'Полный отчёт с гомеопатией доступен только владельцу кабинета.',
    new: 'Новый экспресс-отчёт', archived: 'Сохранённые экспресс-отчёты',
    client: 'Подтверждённая заявка клиента', noClient: 'Пока нет заявок от клиентов с подтверждённым аккаунтом. Гостевую заявку нельзя использовать для приватного отчёта.',
    selectClient: 'Выберите заявку клиента',
    reportLanguage: 'Язык отчёта', reportDate: 'Дата разбора',
    titleField: 'Название отчёта', situation: 'Ситуация и запрос',
    findings: 'Что обнаружили / выяснили', resources: 'Ресурсы и возможности',
    steps: 'Конкретные шаги и рекомендации', followUp: 'Дальнейшее наблюдение',
    before: 'До · 0–10', after: 'После · 0–10',
    save: 'Сохранить черновик', publish: 'Опубликовать клиенту в кабинет',
    revoke: 'Отозвать доступ клиента', published: 'Опубликован', draft: 'Приватный черновик', revoked: 'Доступ отозван',
    none: 'Экспресс-отчётов пока нет.', refreshing: 'Загружаем отчёты…', error: 'Не удалось открыть отчёт. Повторите попытку.',
    saved: 'Черновик сохранён. Клиент пока его не видит.',
    sent: 'Отчёт опубликован в защищённом кабинете клиента. Внешние сообщения не отправлялись.',
    hidden: 'Отчёт скрыт из кабинета клиента.',
    confirmPublish: 'Опубликовать отчёт в личном кабинете подтверждённого клиента?',
    confirmRevoke: 'Отозвать доступ клиента к этому отчёту?',
    ready: 'Для публикации заполните ситуацию, наблюдения и конкретные шаги.',
    dirty: 'Сначала сохраните изменения.',
    locked: 'Опубликованный отчёт нельзя изменять. Для продолжения создайте новый.',
    privacy: 'Приватный разбор, не медицинский диагноз. Заполняет только назначенный мастер; клиент читает после публикации.',
    dates: 'Дата',
  },
  es: {
    title: 'Diagnóstico exprés · informe de situación',
    subtitle: 'Resumen privado con observaciones, recursos y próximos pasos. Sin remedios homeopáticos ni recetas.',
    owner: 'El informe completo con homeopatía solo está disponible para el propietario.',
    new: 'Nuevo informe exprés', archived: 'Informes guardados',
    client: 'Solicitud de un cliente verificado', noClient: 'Aún no hay solicitudes de clientes con cuenta verificada.',
    selectClient: 'Elige una solicitud', reportLanguage: 'Idioma del informe', reportDate: 'Fecha',
    titleField: 'Título', situation: 'Situación y pregunta',
    findings: 'Observaciones', resources: 'Recursos y posibilidades',
    steps: 'Próximos pasos', followUp: 'Seguimiento',
    before: 'Antes · 0–10', after: 'Después · 0–10',
    save: 'Guardar borrador privado', publish: 'Publicar en la cuenta del cliente',
    revoke: 'Revocar acceso', published: 'Publicado', draft: 'Borrador privado', revoked: 'Revocado',
    none: 'Aún no hay informes.', refreshing: 'Cargando informes…', error: 'No se pudo abrir. Inténtalo de nuevo.',
    saved: 'Borrador guardado. El cliente todavía no puede verlo.',
    sent: 'Publicado en la cuenta privada del cliente, sin mensajes externos.',
    hidden: 'Acceso del cliente revocado.',
    confirmPublish: '¿Publicar este informe en la cuenta privada del cliente?',
    confirmRevoke: '¿Revocar el acceso del cliente a este informe?',
    ready: 'Completa la situación, las observaciones y los próximos pasos.',
    dirty: 'Guarda los cambios antes de publicar.',
    locked: 'Los informes publicados no se pueden modificar. Crea uno nuevo para continuar.',
    privacy: 'Informe privado, no un diagnóstico médico. El cliente lo ve solo después de publicarlo.',
    dates: 'Fecha',
  },
}

async function api(path, accountId, body) {
  const headers = { ...(accountId ? { 'x-hh-account-id': accountId } : {}),
    ...(body ? { 'Content-Type': 'application/json' } : {}) }
  const response = await fetch(path, {
    method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
    headers, ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'REPORT_UNAVAILABLE')
  return data
}
const contentFrom = content => ({
  ...EMPTY,
  ...(content || {}),
  progressBefore: content?.progressBefore == null ? '' : String(content.progressBefore),
  progressAfter: content?.progressAfter == null ? '' : String(content.progressAfter),
})
function titleFor(item, text) {
  return (item.content?.title || text.title).slice(0, 120)
}
function scoreText(value) {
  return value == null || value === '' ? '—' : String(value) + '/10'
}
function ExpressReportCard({ item, locale, client = false }) {
  const t = COPY[locale] || COPY.en
  const entries = [
    [t.situation, item.content.situation], [t.findings, item.content.findings],
    [t.resources, item.content.resources], [t.steps, item.content.steps],
    [t.followUp, item.content.followUp],
  ]
  return <article className={styles.report} data-express-report-id={item.id}>
    <div className={styles.reportTop}>
      <div>
        <span className={styles.eyebrow}>HOLISTIC HOUSE · {t.dates}: {item.issuedOn}</span>
        <h3>{titleFor(item,t)}</h3>
      </div>
      <span className={styles.status}>{t[item.status] || item.status}</span>
    </div>
    {entries.filter(([, value]) => Boolean(value)).map(([label,value]) =>
      <section key={label} className={styles.reportSection}>
        <h4>{label}</h4><p>{value}</p>
      </section>
    )}
    {(item.content.progressBefore != null || item.content.progressAfter != null) &&
      <div className={styles.scores}>
        <span>{t.before}: <strong>{scoreText(item.content.progressBefore)}</strong></span>
        <span>{t.after}: <strong>{scoreText(item.content.progressAfter)}</strong></span>
      </div>}
    {client && <p className={styles.privacy}><ShieldCheck size={15} aria-hidden="true" /> {t.privacy}</p>}
  </article>
}

export default function PracticeExpressReports({ locale = 'en', accountId, requests = [], owner = false }) {
  const t = COPY[locale] || COPY.en
  const eligible = useMemo(() => requests.filter(item => item.accountRequest === true), [requests])
  const [items,setItems] = useState([])
  const [loading,setLoading] = useState(true)
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [notice,setNotice] = useState('')
  const [selectedId,setSelectedId] = useState('')
  const pendingOperation = useRef(null) // Stable across network retries: never double-create a report.
  const [requestId,setRequestId] = useState('')
  const [language,setLanguage] = useState(['ru','es'].includes(locale) ? locale : 'en')
  const [issuedOn,setIssuedOn] = useState(() => new Date().toISOString().slice(0,10))
  const [content,setContent] = useState({ ...EMPTY, title: locale === 'ru' ? 'Экспресс-разбор ситуации' : locale === 'es' ? 'Análisis exprés de situación' : 'Express situation review' })
  const current = items.find(item => item.id === selectedId)
  const dirty = Boolean(current && (current.language !== language || current.issuedOn !== issuedOn ||
    Object.keys(EMPTY).some(field => String(current.content[field] ?? '').trim() !== String(content[field] ?? '').trim())))
  const canPublish = Boolean(current?.status === 'draft' && !dirty &&
    current.content.situation && current.content.findings && current.content.steps)

  async function refresh() {
    const result = await api('/api/app/practice/express-reports',accountId)
    setItems(result.items || [])
    return result.items || []
  }
  useEffect(() => {
    let live = true
    api('/api/app/practice/express-reports',accountId).then(result => {
      if (live) setItems(result.items || [])
    }).catch(() => { if (live) setError(t.error) }).finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  },[accountId,t.error])
  useEffect(() => {
    if (!requestId && eligible.length) setRequestId(eligible[0].id)
  },[eligible,requestId])

  function startNew() {
    pendingOperation.current = null
    setSelectedId('')
    setLanguage(['ru','es'].includes(locale) ? locale : 'en')
    setIssuedOn(new Date().toISOString().slice(0,10))
    setContent({ ...EMPTY, title: locale === 'ru' ? 'Экспресс-разбор ситуации' : locale === 'es' ? 'Análisis exprés de situación' : 'Express situation review' })
    setError('')
    setNotice('')
  }
  function open(item) {
    pendingOperation.current = null
    setSelectedId(item.id)
    setRequestId(item.requestId)
    setLanguage(item.language)
    setIssuedOn(item.issuedOn)
    setContent(contentFrom(item.content))
    setError('')
    setNotice('')
  }
  async function perform(action) {
    if (busy) return
    if (action === 'publish' && (!canPublish || !window.confirm(t.confirmPublish))) return
    if (action === 'revoke' && !window.confirm(t.confirmRevoke)) return
    setBusy(true); setError(''); setNotice('')
    try {
      let result
      if (action === 'save') {
        if (!requestId) throw new Error(t.noClient)
        const shared = {language,issuedOn,content}
        result = current
          ? await api('/api/app/practice/express-reports/'+current.id,accountId,{expectedRevision:current.revision,...shared})
          : await api('/api/app/practice/express-reports',accountId,{operationId:(pendingOperation.current ||= crypto.randomUUID()),requestId,...shared})
      } else {
        if (!current) return
        result = await api('/api/app/practice/express-reports/'+current.id,accountId,
          {action,expectedRevision:current.revision})
      }
      const next = await refresh()
      const saved = next.find(item => item.id === result.report.id) || result.report
      open(saved)
      setNotice(action === 'save' ? t.saved : action === 'publish' ? t.sent : t.hidden)
    } catch (e) {
      setError(e?.message || t.error)
    } finally { setBusy(false) }
  }

  return <section className={styles.shell} aria-label={t.title} data-practitioner-express-reports>
    <div className={styles.heading}>
      <div><p className={styles.eyebrow}>MY PRACTICE · PRIVATE</p><h2>{t.title}</h2><p>{t.subtitle}</p></div>
      <button type="button" onClick={startNew} className={styles.newButton}><Plus size={17} aria-hidden="true" />{t.new}</button>
    </div>
    {owner && <p className={styles.owner}>{t.owner}</p>}
    <p className={styles.privacy}><ShieldCheck size={16} aria-hidden="true" />{t.privacy}</p>
    {loading ? <p role="status">{t.refreshing}</p> : <>
      {eligible.length ? <form className={styles.form} onSubmit={event => {event.preventDefault();perform('save')}} autoComplete="off">
        <div className={styles.row}>
          <label>{t.client}
            <select value={requestId} disabled={Boolean(current) || busy}
              onChange={event => setRequestId(event.target.value)} required>
              <option value="">{t.selectClient}</option>
              {eligible.map(item => <option key={item.id} value={item.id}>
                {(item.contact?.name || item.contact?.fullName || item.contact?.email || ('#'+item.id.slice(0,8))).slice(0,90)}
              </option>)}
              {current && !eligible.some(item => item.id === requestId) &&
                <option value={requestId}>{'#'+requestId.slice(0,8)}</option>}
            </select>
          </label>
          <label>{t.reportLanguage}
            <select value={language} disabled={busy || Boolean(current && current.status !== 'draft')}
              onChange={event => setLanguage(event.target.value)}>
              <option value="en">English</option><option value="ru">Русский</option><option value="es">Español</option>
            </select>
          </label>
          <label>{t.reportDate}<input type="date" value={issuedOn} required
            disabled={busy || Boolean(current && current.status !== 'draft')}
            onChange={event => setIssuedOn(event.target.value)} /></label>
        </div>
        <label>{t.titleField}<input maxLength={120} value={content.title} required
          disabled={busy || Boolean(current && current.status !== 'draft')}
          onChange={event => setContent(previous => ({...previous,title:event.target.value}))}/></label>
        <div className={styles.fields}>
          {[
            ['situation',t.situation,2000],['findings',t.findings,4000],
            ['resources',t.resources,3000],['steps',t.steps,3000],
            ['followUp',t.followUp,1800],
          ].map(([key,label,limit]) => <label key={key}>{label}
            <textarea rows={2} maxLength={limit} value={content[key]}
              disabled={busy || Boolean(current && current.status !== 'draft')}
              onChange={event => setContent(previous => ({...previous,[key]:event.target.value}))}/>
          </label>)}
        </div>
        <div className={styles.row}>
          {['progressBefore','progressAfter'].map((key,index) =>
            <label key={key}>{index ? t.after : t.before}
              <input type="number" min="0" max="10" step="0.1"
                value={content[key] ?? ''}
                disabled={busy || Boolean(current && current.status !== 'draft')}
                onChange={event => setContent(previous => ({...previous,[key]:event.target.value}))}/>
            </label>)}
        </div>
        <div className={styles.actions}>
          {(!current || current.status === 'draft') && <>
            <button type="submit" disabled={busy || !requestId} className={styles.save}><Save size={16} aria-hidden="true" />{t.save}</button>
            {current && <button type="button" disabled={busy || !canPublish}
              onClick={() => perform('publish')} className={styles.publish}>
              <Send size={16} aria-hidden="true"/>{t.publish}</button>}
          </>}
          {current?.status === 'published' &&
            <button type="button" disabled={busy} onClick={() => perform('revoke')} className={styles.revoke}>{t.revoke}</button>}
        </div>
        {current?.status === 'draft' && (dirty || !canPublish) && <p className={styles.hint}>{dirty ? t.dirty : t.ready}</p>}
        {current && current.status !== 'draft' && <p className={styles.hint}>{t.locked}</p>}
      </form> : <p className={styles.hint}>{t.noClient}</p>}
      {current && <ExpressReportCard item={current} locale={language}/>}
      <div className={styles.archive}>
        <h3>{t.archived}</h3>
        {items.length === 0 ? <p>{t.none}</p> : <div className={styles.archiveItems}>
          {items.map(item => <button key={item.id} type="button" onClick={() => open(item)}
            aria-pressed={item.id === selectedId} className={styles.archiveItem}>
            <span><strong>{titleFor(item,t)}</strong><small>{item.issuedOn}</small></span>
            <em>{t[item.status] || item.status}</em>
          </button>)}
        </div>}
      </div>
    </>}
    {notice && <p className={styles.success} role="status">{notice}</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
  </section>
}

export function ClientExpressReports({ locale = 'en', accountId }) {
  const t = COPY[locale] || COPY.en
  const [items,setItems] = useState([])
  const [error,setError] = useState(false)
  const [loading,setLoading] = useState(true)
  useEffect(() => {
    let live = true
    api('/api/app/express-reports',accountId).then(data => {
      if (live) setItems((data.items || []).filter(item => item.status === 'published'))
    }).catch(() => { if (live) setError(true) }).finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  },[accountId])
  if (!loading && !error && !items.length) return null
  return <section className={styles.clientShell} aria-label={t.title} data-client-express-reports>
    <p className={styles.eyebrow}>HOLISTIC HOUSE · MY REPORTS</p>
    <h2>{t.title}</h2>
    {loading && <p role="status">{t.refreshing}</p>}
    {error && <p role="alert">{t.error}</p>}
    {items.map(item => <ExpressReportCard key={item.id} item={item} locale={locale} client />)}
  </section>
}
