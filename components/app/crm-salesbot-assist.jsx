'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { SALESBOT_TOPICS } from '../../lib/crm/salesbot-flow.mjs'
import {
  approvedSalesbotOperatorFlows, salesbotOperatorSuggestions,
} from '../../lib/crm/salesbot-operator.mjs'
import styles from './crm-salesbot-assist.module.css'

const COPY = {
  en: {
    title: 'SalesBot · reply ideas', open: 'SalesBot', close: 'Close',
    hint: 'Owner-reviewed drafts only. Nothing is sent until you press Send.',
    empty: 'No approved scenarios yet.', build: 'Open CRM Automations',
    load: 'Load approved scenarios', error: 'Could not load. Check access and try again.',
    flow: 'Scenario', topic: 'Situation', preview: 'Show suggestions',
    working: 'Checking…', insert: 'Insert draft', inserted: 'Draft inserted — review before sending.',
    pick: 'Select a possible branch to preview. This does not record a customer answer.',
    missing: 'No suggested reply on this path. Change the topic or answers.',
    topicNames: {relationships:'Relationships',stress:'Stress',resources:'Resources',work:'Work',direction:'Other'},
  },
  ru: {
    title: 'SalesBot · варианты ответа', open: 'SalesBot', close: 'Закрыть',
    hint: 'Только утверждённые сценарии. Ничего не отправляется без кнопки «Отправить».',
    empty: 'Нет утверждённых сценариев.', build: 'Открыть CRM → Автоматизация',
    load: 'Загрузить сценарии', error: 'Не удалось загрузить. Проверьте доступ.',
    flow: 'Сценарий', topic: 'Ситуация', preview: 'Показать ответы',
    working: 'Проверяю…', insert: 'Вставить', inserted: 'Черновик вставлен — проверьте перед отправкой.',
    pick: 'Выберите возможную ветку для просмотра. Это не ответ клиента.',
    missing: 'Нет варианта ответа. Выберите другую тему или ответ.',
    topicNames: {relationships:'Отношения',stress:'Стресс',resources:'Ресурсы',work:'Работа',direction:'Другое'},
  },
  es: {
    title: 'SalesBot · respuestas sugeridas', open: 'SalesBot', close: 'Cerrar',
    hint: 'Solo escenarios aprobados. No se envía nada hasta pulsar Enviar.',
    empty: 'Aún no hay escenarios aprobados.', build: 'Abrir CRM → Automatizaciones',
    load: 'Cargar escenarios', error: 'No se pudo cargar. Comprueba el acceso.',
    flow: 'Escenario', topic: 'Situación', preview: 'Ver respuestas',
    working: 'Comprobando…', insert: 'Insertar borrador', inserted: 'Borrador insertado: revísalo antes de enviar.',
    pick: 'Elige una rama hipotética. No registra una respuesta del cliente.',
    missing: 'Sin sugerencias en esta rama. Cambia el tema o las respuestas.',
    topicNames: {relationships:'Relaciones',stress:'Estrés',resources:'Recursos',work:'Trabajo',direction:'Otro'},
  },
}

export default function CrmSalesbotAssist({ accountId, threadId, locale = 'en', disabled = false, onInsert }) {
  const lang = COPY[locale] ? locale : 'en'
  const t = COPY[lang]
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [flows, setFlows] = useState([])
  const [flowId, setFlowId] = useState('')
  const [topic, setTopic] = useState('direction')
  const [answers, setAnswers] = useState({})
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [notice, setNotice] = useState('')
  const requestRef = useRef(null)
  const epochRef = useRef(0)

  useEffect(() => {
    ++epochRef.current
    requestRef.current?.abort()
    setOpen(false); setLoaded(false); setFlows([]); setFlowId('')
    setTopic('direction'); setAnswers({}); setPreview(null)
    setBusy(false); setError(false); setNotice('')
    return () => { ++epochRef.current; requestRef.current?.abort() }
  }, [accountId, threadId])

  useEffect(() => {
    if (disabled) {
      ++epochRef.current
      requestRef.current?.abort()
      setOpen(false)
      setBusy(false)
      setPreview(null)
    }
  }, [disabled])

  async function loadApproved() {
    if (disabled || !accountId || !threadId) return
    const epoch = ++epochRef.current
    const controller = new AbortController()
    requestRef.current?.abort()
    requestRef.current = controller
    setBusy(true); setError(false); setNotice('')
    try {
      const res = await fetch('/api/app/crm/salesbot/drafts', {
        credentials: 'same-origin', cache: 'no-store',
        headers: { 'X-HH-Account-Id': accountId }, signal: controller.signal,
      })
      if (!res.ok) throw new Error('SALESBOT_ACCESS')
      const body = await res.json()
      if (body.mode !== 'owner_drafts' || body.sendsEnabled !== false)
        throw new Error('SALESBOT_MODE')
      const approved = approvedSalesbotOperatorFlows(body.items)
      if (controller.signal.aborted || epoch !== epochRef.current) return
      setFlows(approved)
      setFlowId(approved[0]?.id || '')
      setLoaded(true)
    } catch {
      if (!controller.signal.aborted && epoch === epochRef.current) setError(true)
    } finally {
      if (epoch === epochRef.current) setBusy(false)
    }
  }

  function show() {
    if (disabled || !accountId || !threadId) return
    if (open) {
      ++epochRef.current
      requestRef.current?.abort()
      setOpen(false); setBusy(false)
    } else {
      setOpen(true)
      if (!loaded) void loadApproved()
    }
  }

  async function run(nextAnswers = answers, nextTopic = topic) {
    if (busy || disabled) return
    const approved = flows.find(item => item.id === flowId)
    if (!approved) return
    const epoch = ++epochRef.current
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setBusy(true); setError(false); setNotice(''); setPreview(null)
    try {
      // No CRM contact ID, conversation text, photo, test result or chat ID
      // is sent to the simulator. Only the approved owner flow and selections.
      const res = await fetch('/api/app/crm/salesbot', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: {'Content-Type': 'application/json', 'X-HH-Account-Id': accountId},
        body: JSON.stringify({flow: approved.flow, input: {
          locale: lang, topic: nextTopic, answers: nextAnswers,
        }}), signal: controller.signal,
      })
      if (!res.ok) throw new Error('SALESBOT_PREVIEW')
      const result = await res.json()
      if (controller.signal.aborted || epoch !== epochRef.current) return
      if (result.mode !== 'dry_run' || result.sent !== false ||
        result.leadCreated !== false || result.bookingConfirmed !== false ||
        result.paymentReceived !== false) throw new Error('SALESBOT_MODE')
      setPreview(result)
    } catch {
      if (!controller.signal.aborted && epoch === epochRef.current) setError(true)
    } finally {
      if (epoch === epochRef.current) setBusy(false)
    }
  }

  const suggestions = salesbotOperatorSuggestions(preview, lang)
  return <div className={styles.root} data-salesbot-operator-mode="manual-only">
    <button type="button" className={styles.launcher} aria-expanded={open}
      aria-label={t.title} disabled={disabled || !accountId || !threadId}
      onClick={show}>{open ? t.close : t.open}</button>
    {open && <div className={styles.panel} role="region" aria-label={t.title}>
      <p className={styles.hint}>{t.hint}</p>
      {busy && <p role="status">{t.working}</p>}
      {error && <button type="button" onClick={() => {
        setLoaded(false); setError(false); void loadApproved()
      }}>{t.load}</button>}
      {loaded && !flows.length && <p>{t.empty} <Link href={`/${lang}/app/practice?panel=crm&crmTab=automations`}>{t.build}</Link></p>}
      {loaded && flows.length > 0 && <>
        <label>{t.flow}
          <select value={flowId} onChange={event => {
            ++epochRef.current; requestRef.current?.abort()
            setFlowId(event.target.value); setAnswers({}); setPreview(null); setNotice(''); setBusy(false)
          }}>
            {flows.map(item => <option key={item.id} value={item.id}>
              {item.flow.title[lang]} · v{item.version}
            </option>)}
          </select>
        </label>
        <label>{t.topic}
          <select value={topic} onChange={event => {
            ++epochRef.current; requestRef.current?.abort()
            setTopic(event.target.value); setAnswers({}); setPreview(null); setNotice(''); setBusy(false)
          }}>
            {SALESBOT_TOPICS.map(value =>
              <option value={value} key={value}>{t.topicNames[value]}</option>)}
          </select>
        </label>
        <button type="button" disabled={busy} onClick={() => void run({})}>{t.preview}</button>
        {preview?.waiting && <>
          <p className={styles.hint}>{t.pick}</p>
          <div className={styles.choices}>
            {preview.waiting.options.map(option =>
              <button key={option.id} type="button" disabled={busy}
                onClick={() => {
                  const next = {...answers, [preview.waiting.nodeId]: option.id}
                  setAnswers(next); void run(next)
                }}>{option.text}</button>)}
          </div>
        </>}
        {preview && suggestions.length === 0 && <p>{t.missing}</p>}
        {suggestions.map(item =>
          <div className={styles.suggestion} key={item.nodeId}>
            <p>{item.text}</p>
            <button type="button" disabled={busy || disabled}
              onClick={() => {
                if (onInsert?.(item.text) !== false) {
                  setNotice(t.inserted); setOpen(false)
                }
              }}>{t.insert}</button>
          </div>)}
        {notice && <p role="status">{notice}</p>}
      </>}
    </div>}
  </div>
}
