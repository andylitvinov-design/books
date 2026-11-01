'use client'
import { useEffect, useRef, useState } from 'react'
import styles from './crm-salesbot-drafts.module.css'

const COPY = {
  en: {
    title: 'My saved scenarios', info: 'Private encrypted drafts · preview approval is NOT publication to visitors.',
    loading: 'Loading saved scenarios…', unavailable: 'Draft storage is not yet available. Use Copy JSON until it is enabled.',
    select: 'Saved scenario', new: 'New draft (current template)', save: 'Save draft',
    approve: 'Approve preview version', pause: 'Pause internal flow', activate: 'Activate internal CRM event workflow', activated: 'Active for consented events. Only internal owner records are created; NO visitor messages.', revision: 'Revision',
    version: 'Version', restore: 'Load selected draft', none: 'No saved drafts yet.',
    saved: 'Saved securely. No customer message was sent.',
    approved: 'Preview version approved. No bot has been activated.',
    paused: 'Preview paused. No external channel changed.',
    duplicate: 'A scenario with this ID is already saved. Load it before editing.',
    dirty: 'Changes are not saved. Save before approving a preview version.',
    conflict: 'The scenario changed in another tab. Refresh and reload it before saving.',
    error: 'Could not save. No changes were confirmed.',
    refresh: 'Refresh list', status: {draft:'Draft',approved_preview:'Preview approved',paused:'Paused',active_internal:'Internal CRM active'},
  },
  ru: {
    title: 'Мои сохранённые сценарии', info: 'Зашифрованные черновики · одобрение предпросмотра НЕ включает бота для посетителей.',
    loading: 'Загружаем сценарии…', unavailable: 'Хранение черновиков пока недоступно. Можно скопировать JSON.',
    select: 'Сохранённый сценарий', new: 'Новый черновик (текущий шаблон)', save: 'Сохранить черновик',
    approve: 'Утвердить предпросмотр', pause: 'Остановить внутренний сценарий', activate: 'Включить сценарий для согласованных событий CRM', activated: 'Внутренний сценарий включён. Клиентам ничего автоматически не отправляется.', revision: 'Редакция',
    version: 'Версия', restore: 'Загрузить черновик', none: 'Пока нет сохранённых сценариев.',
    saved: 'Черновик сохранён. Сообщения клиентам не отправлены.',
    approved: 'Версия предпросмотра утверждена. Бот не активирован.',
    paused: 'Предпросмотр остановлен. Внешние каналы не менялись.',
    duplicate: 'Сценарий с таким ID уже сохранён. Сначала откройте его.',
    dirty: 'Текст изменён, но ещё не сохранён. Сохраните перед одобрением.',
    conflict: 'Сценарий изменился в другой вкладке. Обновите список и откройте заново.',
    error: 'Сохранить не удалось. Изменения не подтверждены.',
    refresh: 'Обновить список', status: {draft:'Черновик',approved_preview:'Предпросмотр одобрен',paused:'Остановлено',active_internal:'Внутренний CRM активен'},
  },
  es: {
    title: 'Mis escenarios guardados', info: 'Borradores privados cifrados. Aprobar una vista previa NO activa un bot público.',
    loading: 'Cargando escenarios…', unavailable: 'Todavía no se pueden guardar borradores. Puedes copiar el JSON.',
    select: 'Escenario guardado', new: 'Nuevo borrador (plantilla actual)', save: 'Guardar borrador',
    approve: 'Aprobar versión de prueba', pause: 'Pausar flujo interno', activate: 'Activar flujo para eventos del CRM', activated: 'Flujo interno activo. No se envían mensajes automáticos a clientes.', revision: 'Revisión',
    version: 'Versión', restore: 'Abrir borrador', none: 'Aún no hay escenarios.',
    saved: 'Guardado de forma segura. No se enviaron mensajes.',
    approved: 'Vista previa aprobada. El bot no está activo.',
    paused: 'Vista previa pausada. No se han cambiado los canales.',
    duplicate: 'Ya hay un escenario con este ID. Ábrelo primero.',
    dirty: 'Hay cambios sin guardar. Guarda antes de aprobar.',
    conflict: 'El escenario cambió en otra pestaña. Actualiza y vuelve a cargar.',
    error: 'No se guardó el borrador.',
    refresh: 'Actualizar', status: {draft:'Borrador',approved_preview:'Vista previa aprobada',paused:'Pausado',active_internal:'CRM interno activo'},
  },
}

export default function CrmSalesbotDraftControls({ accountId, locale = 'en', flow, onRestore }) {
  const lang = COPY[locale] ? locale : 'en'
  const t = COPY[lang]
  const [items, setItems] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [available, setAvailable] = useState(false)
  const [notice, setNotice] = useState('')
  const sessionRef = useRef(null)

  async function fetchItems(session) {
    setLoading(true)
    try {
      const response = await fetch('/api/app/crm/salesbot/drafts', {
        method: 'GET', credentials: 'same-origin', cache: 'no-store',
        signal: session.controller.signal,
        headers: {'X-HH-Account-Id': session.accountId},
      })
      const data = await response.json()
      if (session !== sessionRef.current || session.controller.signal.aborted) return
      if (!response.ok || data.mode !== 'owner_drafts' || data.sendsEnabled !== false ||
          !Array.isArray(data.items)) throw new Error('STORAGE_NOT_READY')
      setItems(data.items)
      setAvailable(true)
      setNotice('')
    } catch {
      if (session === sessionRef.current && !session.controller.signal.aborted) {
        setAvailable(false)
        setNotice(t.unavailable)
      }
    } finally {
      if (session === sessionRef.current && !session.controller.signal.aborted)
        setLoading(false)
    }
  }

  useEffect(() => {
    const session = { accountId, controller: new AbortController() }
    sessionRef.current = session
    setItems([])
    setSelectedId('')
    setAvailable(false)
    setNotice('')
    void fetchItems(session)
    return () => {
      session.controller.abort()
      if (sessionRef.current === session) sessionRef.current = null
    }
  }, [accountId])

  const selected = items.find(item => item.id === selectedId && item.flowKey === flow.id)
  const existingKey = items.some(item => item.flowKey === flow.id)
  const dirty = selected ? JSON.stringify(selected.flow) !== JSON.stringify(flow) : true

  function restore(id) {
    const item = items.find(row => row.id === id)
    if (!item) {
      setSelectedId('')
      return
    }
    setSelectedId(id)
    setNotice('')
    onRestore(item.flow)
  }
  async function mutate(action) {
    const session = sessionRef.current
    if (!session || busy || !available || session.accountId !== accountId) return
    if (action === 'save' && !selected && existingKey) {
      setNotice(t.duplicate)
      return
    }
    if (action !== 'save' && (!selected || dirty)) {
      setNotice(t.dirty)
      return
    }
    setBusy(true)
    setNotice('')
    try {
      const payload = action === 'save'
        ? selected ? { action, id: selected.id, flow, expectedRevision: selected.revision }
          : { action, flow }
        : { action, id: selected.id, expectedRevision: selected.revision }
      const response = await fetch('/api/app/crm/salesbot/drafts', {
        method:'POST', credentials:'same-origin', cache:'no-store',
        signal: session.controller.signal,
        headers: {'Content-Type':'application/json','X-HH-Account-Id': accountId},
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (session !== sessionRef.current || session.controller.signal.aborted) return
      if (!response.ok || data.saved !== true || data.mode !== 'owner_drafts' ||
          data.sendsEnabled !== false || !data.id || !Number.isInteger(data.revision)) {
        setNotice(data.error === 'REVISION_CONFLICT' ? t.conflict : t.error)
        return
      }
      const next = {
        id: data.id, flowKey: data.flowKey, flow: data.flow || selected?.flow || flow,
        status: data.status, revision: data.revision, version: data.version,
        createdAt: data.createdAt, updatedAt: data.updatedAt,
      }
      setItems(previous => [next, ...previous.filter(row => row.id !== next.id)])
      setSelectedId(next.id)
      if (data.flow) onRestore(data.flow)
      setNotice(action === 'save' ? t.saved : action === 'approve_preview' ? t.approved : action === 'activate_internal' ? t.activated : t.paused)
    } catch {
      if (session === sessionRef.current && !session.controller.signal.aborted)
        setNotice(t.error)
    } finally {
      if (session === sessionRef.current && !session.controller.signal.aborted) setBusy(false)
    }
  }

  return <section className={styles.panel} aria-labelledby="crm-salesbot-saved-title">
    <div className={styles.head}>
      <div>
        <h4 id="crm-salesbot-saved-title">{t.title}</h4>
        <p>{t.info}</p>
      </div>
      <button type="button" className={styles.secondary} disabled={loading || busy}
        onClick={() => { const s = sessionRef.current; if (s) void fetchItems(s) }}>{t.refresh}</button>
    </div>
    <label>{t.select}
      <select disabled={!available || loading || busy}
        value={selected?.id || ''}
        onChange={event => restore(event.target.value)}>
        <option value="">{t.new}</option>
        {items.map(item => <option key={item.id} value={item.id}>
          {item.flow?.title?.[lang] || item.flowKey} · {t.status[item.status] || item.status} · v{item.version}
        </option>)}
      </select>
    </label>
    {loading && <p role="status" className={styles.note}>{t.loading}</p>}
    {selected && <p className={styles.note}>
      {t.status[selected.status] || selected.status} · {t.revision} {selected.revision} · {t.version} {selected.version}
      {dirty ? ' · ' + t.dirty : ''}
    </p>}
    {!loading && available && items.length === 0 && <p className={styles.note}>{t.none}</p>}
    <div className={styles.actions}>
      <button type="button" disabled={busy || loading || !available || !!(selected && !dirty)}
        onClick={() => void mutate('save')}>{busy ? '…' : t.save}</button>
      <button type="button" className={styles.secondary}
        disabled={busy || loading || !available || !selected || dirty || ['approved_preview','active_internal'].includes(selected.status)}
        onClick={() => void mutate('approve_preview')}>{t.approve}</button>
      <button type="button" className={styles.secondary}
        disabled={busy || loading || !available || !selected || dirty || selected.status !== 'approved_preview'}
        onClick={() => void mutate('activate_internal')}>{t.activate}</button>
      <button type="button" className={styles.secondary}
        disabled={busy || loading || !available || !selected || !['approved_preview','active_internal'].includes(selected.status)}
        onClick={() => void mutate('pause')}>{t.pause}</button>
    </div>
    {notice && <p role={available ? 'status' : 'alert'} className={styles.note}>{notice}</p>}
  </section>
}
