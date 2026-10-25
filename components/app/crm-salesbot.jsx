'use client'

import { useEffect, useRef, useState } from 'react'
import {
  SALESBOT_TEMPLATES, SALESBOT_TOPICS,
} from '../../lib/crm/salesbot-flow.mjs'
import styles from './crm-salesbot.module.css'

const clone = value => JSON.parse(JSON.stringify(value))
const LABELS = {
  en: {
    title: 'Holistic SalesBot · Workflow studio', eyebrow: 'CRM AUTOMATIONS',
    lead: 'Build a guided conversation and safely test every branch before connecting a real channel.',
    safety: 'Preview only · No customers contacted · No CRM leads, bookings or payments created.',
    explain: 'These drafts are stored only on this page, not in your database. Copy the JSON to keep a version.',
    template: 'Scenario template', topic: 'Simulated visitor topic', flow: 'Conversation steps',
    editor: 'Edit step wording', choose: 'Select a step', language: 'Text language',
    next: 'Next', review: 'Owner handoff', offer: 'Verified page', answer: 'Question',
    noEditable: 'This step has no wording to edit. Change the topic selector to test conditions.',
    message: 'Message', start: 'Start', choice: 'Question', branch: 'Condition', handoff: 'Human review',
    end: 'Finish', say: 'Message', preview: 'Test conversation', run: 'Run safe preview',
    reset: 'Reset choices', copy: 'Copy scenario JSON', copied: 'JSON copied to clipboard.',
    copyError: 'Clipboard unavailable. Select a template and try another browser.',
    incomplete: 'Add nonempty EN/RU/ES text before previewing this flow.',
    failed: 'Preview failed. Check flow wording and try again.',
    waiting: 'Choose a simulated visitor answer:', completed: 'Preview completed.',
    empty: 'Press “Run safe preview” to walk through this flow without sending anything.',
    onlyPreview: 'Simulation. Following a link opens an existing page; no contact is created by the preview.',
    open: 'Open existing page', answerSelected: 'Changing a step resets the preview.',
    chooseTopic: {
      direction: 'Direction', work: 'Business & work', stress: 'Stress',
      relationships: 'Relationships', resources: 'Resources',
    },
    types: { start:'Start', say:'Message', choice:'Question', branch:'Condition', offer:'Offer link',
      handoff:'Owner handoff', end:'Finish' },
  },
  ru: {
    title: 'Holistic SalesBot · Конструктор', eyebrow: 'АВТОМАТИЗАЦИИ CRM',
    lead: 'Настройте сценарий диалога и проверьте все ветки, прежде чем подключать реальный канал.',
    safety: 'Только предпросмотр · Никому не пишем · Не создаём лиды, записи и оплаты.',
    explain: 'Черновик хранится только в открытой вкладке, а не в БД. Скопируйте JSON, чтобы сохранить.',
    template: 'Шаблон сценария', topic: 'Тема тестового посетителя', flow: 'Шаги диалога',
    editor: 'Редактировать текст шага', choose: 'Выберите шаг', language: 'Язык текста',
    next: 'Далее', review: 'Передача мастеру', offer: 'Проверенная страница', answer: 'Вопрос',
    noEditable: 'В этом шаге нет текста. Условия можно проверить выбором темы.',
    message: 'Сообщение', start: 'Старт', choice: 'Вопрос', branch: 'Условие', handoff: 'Мастеру',
    end: 'Завершение', say: 'Сообщение', preview: 'Тестовый диалог', run: 'Проверить сценарий',
    reset: 'Сбросить ответы', copy: 'Копировать JSON сценария', copied: 'JSON скопирован.',
    copyError: 'Буфер обмена недоступен. Попробуйте другой браузер.',
    incomplete: 'Для проверки заполните тексты на EN/RU/ES.',
    failed: 'Проверка не выполнена. Исправьте текст или связи.',
    waiting: 'Выберите ответ тестового посетителя:', completed: 'Тестовый сценарий завершён.',
    empty: 'Нажмите «Проверить сценарий». Это не отправляет сообщения клиентам.',
    onlyPreview: 'Симуляция. Ссылка ведёт на действующую страницу, но не создаёт контакт в CRM.',
    open: 'Открыть страницу', answerSelected: 'Редактирование сбросит текущий предпросмотр.',
    chooseTopic: {
      direction: 'Выбор пути', work: 'Работа и бизнес', stress: 'Стресс',
      relationships: 'Отношения', resources: 'Ресурсы',
    },
    types: { start:'Старт', say:'Сообщение', choice:'Вопрос', branch:'Условие', offer:'Ссылка',
      handoff:'Передача мастеру', end:'Завершение' },
  },
  es: {
    title: 'Holistic SalesBot · Constructor', eyebrow: 'AUTOMATIZACIONES CRM',
    lead: 'Diseña una conversación y prueba sus caminos antes de conectar un canal real.',
    safety: 'Solo vista previa · Sin mensajes ni contactos, reservas o pagos nuevos.',
    explain: 'Este borrador vive únicamente en esta página. Copia el JSON para guardarlo.',
    template: 'Plantilla', topic: 'Tema simulado', flow: 'Pasos de la conversación',
    editor: 'Editar texto', choose: 'Seleccionar paso', language: 'Idioma del texto',
    next: 'Siguiente', review: 'Revisión humana', offer: 'Página verificada', answer: 'Pregunta',
    noEditable: 'Este paso no tiene texto editable. Prueba las condiciones cambiando el tema.',
    message: 'Mensaje', start: 'Inicio', choice: 'Pregunta', branch: 'Condición', handoff: 'Profesional',
    end: 'Fin', say: 'Mensaje', preview: 'Conversación de prueba', run: 'Probar sin enviar',
    reset: 'Restablecer respuestas', copy: 'Copiar JSON', copied: 'JSON copiado.',
    copyError: 'Portapapeles no disponible.',
    incomplete: 'Completa el texto EN/RU/ES antes de probar.',
    failed: 'No se pudo probar el flujo. Revisa los textos y enlaces.',
    waiting: 'Elige una respuesta simulada:', completed: 'La prueba ha terminado.',
    empty: 'Pulsa «Probar sin enviar» para recorrer el escenario.',
    onlyPreview: 'Simulación. Abrir un enlace no crea un contacto ni una reserva.',
    open: 'Abrir página', answerSelected: 'Editar reinicia la simulación.',
    chooseTopic: {
      direction: 'Dirección', work: 'Negocio y trabajo', stress: 'Estrés',
      relationships: 'Relaciones', resources: 'Recursos',
    },
    types: { start:'Inicio', say:'Mensaje', choice:'Pregunta', branch:'Condición', offer:'Enlace',
      handoff:'Revisión humana', end:'Fin' },
  },
}

export default function CrmSalesbot({ accountId, locale = 'en' }) {
  const lang = LABELS[locale] ? locale : 'en'
  const t = LABELS[lang]
  const [templateId, setTemplateId] = useState(SALESBOT_TEMPLATES[0].id)
  const [flow, setFlow] = useState(() => clone(SALESBOT_TEMPLATES[0]))
  const [topic, setTopic] = useState('direction')
  const [selectedNodeId, setSelectedNodeId] = useState('welcome')
  const [editingLocale, setEditingLocale] = useState(lang)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const controllerRef = useRef(null)
  const sessionRef = useRef(null)

  useEffect(() => {
    const session = { accountId }
    sessionRef.current = session
    setResult(null)
    setAnswers({})
    setNotice('')
    return () => {
      controllerRef.current?.abort()
      if (sessionRef.current === session) sessionRef.current = null
    }
  }, [accountId])

  function cancelPreview() {
    controllerRef.current?.abort()
    controllerRef.current = null
    setBusy(false)
    setAnswers({})
    setResult(null)
    setNotice('')
  }
  function chooseTemplate(id) {
    const template = SALESBOT_TEMPLATES.find(entry => entry.id === id)
    if (!template) return
    cancelPreview()
    setFlow(clone(template))
    setTemplateId(id)
    setSelectedNodeId(template.nodes.find(node => node.text)?.id || 'start')
  }
  function changeText(nodeId, text, optionId = null) {
    cancelPreview()
    setFlow(current => ({
      ...current,
      nodes: current.nodes.map(node => {
        if (node.id !== nodeId) return node
        if (optionId) return {
          ...node,
          options: node.options.map(option => option.id === optionId
            ? { ...option, text: { ...option.text, [editingLocale]: text } } : option),
        }
        return { ...node, text: { ...node.text, [editingLocale]: text } }
      }),
    }))
  }
  async function runPreview(nextAnswers = {}) {
    if (!accountId || busy) return
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const session = sessionRef.current
    setBusy(true)
    setNotice('')
    try {
      const response = await fetch('/api/app/crm/salesbot', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'X-HH-Account-Id': accountId },
        body: JSON.stringify({ flow, input: { locale: lang, topic, answers: nextAnswers } }),
      })
      const data = await response.json()
      if (controller.signal.aborted || session !== sessionRef.current || controller !== controllerRef.current) return
      if (!response.ok || data.mode !== 'dry_run' || data.sent !== false ||
        data.leadCreated !== false || data.bookingConfirmed !== false ||
        data.paymentReceived !== false || !Array.isArray(data.trace)) {
        setNotice(data?.error?.startsWith('INVALID_SALESBOT_') ? t.incomplete : t.failed)
        setResult(null)
      } else setResult(data)
    } catch (error) {
      if (error?.name !== 'AbortError' && session === sessionRef.current) {
        setResult(null)
        setNotice(t.failed)
      }
    } finally {
      if (session === sessionRef.current && controller === controllerRef.current) setBusy(false)
    }
  }
  function chooseAnswer(optionId) {
    if (!result?.waiting || busy) return
    const next = { ...answers, [result.waiting.nodeId]: optionId }
    setAnswers(next)
    void runPreview(next)
  }
  async function copyJson() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(flow, null, 2))
      setNotice(t.copied)
    } catch { setNotice(t.copyError) }
  }
  const selected = flow.nodes.find(node => node.id === selectedNodeId) || flow.nodes[0]
  const isEditable = Boolean(selected.text)
  return <section className={styles.root} aria-labelledby="hh-salesbot-title" data-salesbot-mode="dry_run">
    <header className={styles.head}>
      <div>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h3 id="hh-salesbot-title">{t.title}</h3>
        <p>{t.lead}</p>
      </div>
      <span className={styles.badge}>DRY RUN · OFFLINE DISPATCH</span>
    </header>
    <p className={styles.warning} role="status">{t.safety}</p>
    <div className={styles.controls}>
      <label>{t.template}
        <select value={templateId} onChange={e => chooseTemplate(e.target.value)}>
          {SALESBOT_TEMPLATES.map(template => <option key={template.id} value={template.id}>
            {template.title[lang]}
          </option>)}
        </select>
      </label>
      <label>{t.topic}
        <select value={topic} onChange={e => { setTopic(e.target.value); cancelPreview() }}>
          {SALESBOT_TOPICS.map(id => <option key={id} value={id}>{t.chooseTopic[id]}</option>)}
        </select>
      </label>
    </div>
    <div className={styles.builder}>
      <div className={styles.stepColumn}>
        <h4>{t.flow}</h4>
        <ol className={styles.steps}>
          {flow.nodes.map((node, index) => <li key={node.id}>
            <button type="button" className={selectedNodeId === node.id ? styles.stepActive : styles.step}
              aria-pressed={selectedNodeId === node.id}
              onClick={() => setSelectedNodeId(node.id)}>
              <span className={styles.stepNumber}>{index + 1}</span>
              <span><strong>{t.types[node.type]}</strong>
                <small>{node.text?.[lang] || node.field && (node.field + ' = ' + node.equals) || node.id}</small>
              </span>
            </button>
          </li>)}
        </ol>
      </div>
      <div className={styles.editor}>
        <h4>{t.editor}</h4>
        <label>{t.choose}
          <select value={selected.id} onChange={e => setSelectedNodeId(e.target.value)}>
            {flow.nodes.map(node => <option key={node.id} value={node.id}>{node.id} · {t.types[node.type]}</option>)}
          </select>
        </label>
        {isEditable ? <>
          <label>{t.language}
            <select value={editingLocale} onChange={e => setEditingLocale(e.target.value)}>
              <option value="en">English</option>
              <option value="ru">Русский</option>
              <option value="es">Español</option>
            </select>
          </label>
          <label>{t.message}
            <textarea rows={4} maxLength={360} value={selected.text[editingLocale]}
              onChange={e => changeText(selected.id, e.target.value)} />
          </label>
          {selected.type === 'choice' && selected.options.map(option => <label key={option.id}>{option.id}
            <input maxLength={360} value={option.text[editingLocale]}
              onChange={e => changeText(selected.id, e.target.value, option.id)} />
          </label>)}
          {selected.type === 'offer' && <p className={styles.note}>{t.offer}: <code>{selected.offer}</code></p>}
        </> : <p className={styles.note}>{t.noEditable}</p>}
        <p className={styles.note}>{t.explain}</p>
        <button type="button" className={styles.secondary} onClick={copyJson}>{t.copy}</button>
      </div>
    </div>
    <div className={styles.preview}>
      <div className={styles.previewHead}><h4>{t.preview}</h4>
        <div className={styles.actions}>
          <button type="button" onClick={() => { cancelPreview(); void runPreview({}) }} disabled={busy}>
            {busy ? '…' : t.run}
          </button>
          <button type="button" className={styles.secondary} onClick={cancelPreview} disabled={busy}>
            {t.reset}
          </button>
        </div>
      </div>
      {notice && <p role="status" className={styles.notice}>{notice}</p>}
      {!result && !busy && <p className={styles.note}>{t.empty}</p>}
      {result && <div role="log" aria-live="polite" className={styles.messages}>
        {result.trace.map((item, index) => <div key={item.nodeId + '-' + index}
          className={item.kind === 'offer' ? styles.offer : item.kind === 'handoff' ? styles.handoff : styles.message}>
          <small>{item.kind === 'handoff' ? t.review : item.kind === 'offer' ? t.offer
            : item.kind === 'choice' ? t.answer : t.types[item.kind === 'end' ? 'end' : 'say']}</small>
          <p>{item.text}</p>
          {item.kind === 'offer' && <a href={item.href}>{t.open} · {item.href}</a>}
        </div>)}
        {result.waiting ? <div className={styles.options} role="group" aria-label={t.waiting}>
          <strong>{t.waiting}</strong>
          {result.waiting.options.map(option => <button type="button" key={option.id}
            disabled={busy} onClick={() => chooseAnswer(option.id)}>{option.text}</button>)}
        </div> : <p className={styles.note}>{t.completed}</p>}
      </div>}
      <p className={styles.note}>{t.onlyPreview}</p>
    </div>
  </section>
}
