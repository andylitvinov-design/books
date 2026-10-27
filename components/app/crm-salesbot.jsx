'use client'

import { useEffect, useRef, useState } from 'react'
import {
  SALESBOT_TEMPLATES, SALESBOT_TOPICS, SALESBOT_OFFER_IDS,
} from '../../lib/crm/salesbot-flow.mjs'
import {
  SALESBOT_EDITOR_NODE_TYPES, salesbotEditorEdges, insertSalesbotStep,
  addSalesbotChoice, removeSalesbotChoice, setSalesbotTopicCondition,
  setSalesbotOfferTarget, removeSalesbotLinearStep, importSalesbotJson,
} from '../../lib/crm/salesbot-editor.mjs'
import styles from './crm-salesbot.module.css'
import CrmSalesbotDraftControls from './crm-salesbot-drafts'
import CrmSalesbotInternalRuns from './crm-salesbot-internal-runs'
import CrmTelegramDiagnosticScript from './crm-telegram-diagnostic-script'

const clone = value => JSON.parse(JSON.stringify(value))
const LABELS = {
  en: {
    title: 'Other CRM workflows · preview only', eyebrow: 'CRM AUTOMATIONS',
    extraTemplates: 'Other CRM scenarios · examples and internal previews (not the Telegram dialogue)',
    lead: 'Build a guided conversation and safely test every branch before connecting a real channel.',
    safety: 'Preview only · No customers contacted · No CRM leads, bookings or payments created.',
    explain: 'Changes remain on this page until you explicitly save an encrypted owner draft above. JSON export is optional.',
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
    graphTitle: 'Build conversation', graphPath: 'After this path', graphType: 'Next step',
    graphAdd: 'Add step', graphRemove: 'Remove step', graphInvalid: 'Graph change was rejected: it would break the flow or exceed limits.',
    graphChoiceAdd: 'Add response button', graphChoiceRemove: 'Remove this answer',
    graphTopic: 'Condition: visitor topic', graphOffer: 'Recommended existing offer',
    importTitle: 'Import a validated scenario', importPlaceholder: 'Paste a JSON scenario (no code execution)',
    importAction: 'Validate and load JSON', importError: 'JSON is invalid or contains unsupported actions.',
    customTemplate: 'Saved or imported scenario',
    open: 'Open existing page', answerSelected: 'Changing a step resets the preview.',
    chooseTopic: {
      direction: 'Direction', work: 'Business & work', stress: 'Stress',
      relationships: 'Relationships', resources: 'Resources',
    },
    types: { start:'Start', say:'Message', choice:'Question', branch:'Condition', offer:'Offer link',
      handoff:'Owner handoff', end:'Finish' },
  },
  ru: {
    title: 'Другие CRM-сценарии · только предпросмотр', eyebrow: 'АВТОМАТИЗАЦИИ CRM',
    extraTemplates: 'Другие CRM-сценарии · примеры и внутренние предпросмотры (не диалог Telegram)',
    lead: 'Настройте сценарий диалога и проверьте все ветки, прежде чем подключать реальный канал.',
    safety: 'Только предпросмотр · Никому не пишем · Не создаём лиды, записи и оплаты.',
    explain: 'Изменения остаются в этой вкладке, пока вы не сохраните зашифрованный черновик в CRM. JSON можно скопировать отдельно.',
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
    graphTitle: 'Собрать сценарий', graphPath: 'После какой ветки', graphType: 'Следующий шаг',
    graphAdd: 'Добавить шаг', graphRemove: 'Убрать шаг', graphInvalid: 'Изменение отклонено: нарушаются связи сценария или лимиты.',
    graphChoiceAdd: 'Добавить вариант ответа', graphChoiceRemove: 'Удалить вариант',
    graphTopic: 'Условие: тема запроса', graphOffer: 'Подтверждённое предложение',
    importTitle: 'Импорт проверенного сценария', importPlaceholder: 'Вставьте JSON сценария (код не выполняется)',
    importAction: 'Проверить и загрузить JSON', importError: 'Ошибка JSON или запрещённые действия в сценарии.',
    customTemplate: 'Сохранённый или импортированный сценарий',
    open: 'Открыть страницу', answerSelected: 'Редактирование сбросит текущий предпросмотр.',
    chooseTopic: {
      direction: 'Выбор пути', work: 'Работа и бизнес', stress: 'Стресс',
      relationships: 'Отношения', resources: 'Ресурсы',
    },
    types: { start:'Старт', say:'Сообщение', choice:'Вопрос', branch:'Условие', offer:'Ссылка',
      handoff:'Передача мастеру', end:'Завершение' },
  },
  es: {
    title: 'Otros escenarios CRM · solo vista previa', eyebrow: 'AUTOMATIZACIONES CRM',
    extraTemplates: 'Otros escenarios CRM · ejemplos y vistas previas internas (no Telegram)',
    lead: 'Diseña una conversación y prueba sus caminos antes de conectar un canal real.',
    safety: 'Solo vista previa · Sin mensajes ni contactos, reservas o pagos nuevos.',
    explain: 'Los cambios quedan en esta página hasta guardar el borrador cifrado en CRM. Copiar JSON es opcional.',
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
    graphTitle: 'Crear conversación', graphPath: 'Después de esta rama', graphType: 'Siguiente paso',
    graphAdd: 'Agregar paso', graphRemove: 'Eliminar paso', graphInvalid: 'Cambio rechazado: flujo no válido o límite alcanzado.',
    graphChoiceAdd: 'Agregar respuesta', graphChoiceRemove: 'Eliminar esta respuesta',
    graphTopic: 'Condición: tema', graphOffer: 'Oferta existente',
    importTitle: 'Importar un escenario validado', importPlaceholder: 'Pega JSON (no se ejecuta código)',
    importAction: 'Validar y cargar JSON', importError: 'JSON no válido o contiene acciones no permitidas.',
    customTemplate: 'Escenario guardado o importado',
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
  const [insertType, setInsertType] = useState('say')
  const [insertPath, setInsertPath] = useState('next')
  const [importText, setImportText] = useState('')
  const controllerRef = useRef(null)
  const sessionRef = useRef(null)

  useEffect(() => {
    const session = { accountId }
    sessionRef.current = session
    setResult(null)
    setAnswers({})
    setNotice('')
    // Never carry unsaved owner-written wording across an account switch.
    setFlow(clone(SALESBOT_TEMPLATES[0]))
    setTemplateId(SALESBOT_TEMPLATES[0].id)
    setSelectedNodeId('welcome')
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
  function restoreSavedDraft(savedFlow) {
    cancelPreview()
    const draft = clone(savedFlow)
    setFlow(draft)
    setTemplateId(draft.id)
    setSelectedNodeId(draft.nodes.find(node => node.text)?.id || draft.start)
  }
  function applyEdit(edit) {
    try {
      const changed = edit(flow)
      const nextFlow = changed.flow || changed
      cancelPreview()
      setFlow(nextFlow)
      setSelectedNodeId(changed.selectedNodeId || selected.id)
    } catch {
      setNotice(t.graphInvalid)
    }
  }
  function importScenario() {
    try {
      const graph = importSalesbotJson(importText)
      cancelPreview()
      setFlow(graph)
      setTemplateId(graph.id)
      setSelectedNodeId(graph.nodes.find(node => node.text)?.id || graph.start)
      setImportText('')
    } catch {
      setNotice(t.importError)
    }
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
  const outgoing = salesbotEditorEdges(selected)
  const activePath = outgoing.includes(insertPath) ? insertPath : outgoing[0] || ''
  const inDefaultTemplates = SALESBOT_TEMPLATES.some(template => template.id === templateId)
  return <section className={styles.root} data-salesbot-studio="original-telegram-first">
    <CrmTelegramDiagnosticScript locale={lang}/>
    <details className={styles.extraTemplates} data-salesbot-mode="dry_run">
      <summary className={styles.extraSummary}>{t.extraTemplates}</summary>
      <div className={styles.extraBody}>
    <header className={styles.head}>
      <div>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h3 id="hh-salesbot-title">{t.title}</h3>
        <p>{t.lead}</p>
      </div>
      <span className={styles.badge}>DRY RUN · OFFLINE DISPATCH</span>
    </header>
    <p className={styles.warning} role="status">{t.safety}</p>
    <CrmSalesbotDraftControls key={accountId} accountId={accountId} locale={lang}
      flow={flow} onRestore={restoreSavedDraft} />
    <CrmSalesbotInternalRuns key={'runs-'+accountId} accountId={accountId} locale={lang}/>
    <div className={styles.controls}>
      <label>{t.template}
        <select value={templateId} onChange={e => chooseTemplate(e.target.value)}>
          {!inDefaultTemplates && <option value={templateId}>{t.customTemplate} · {flow.title[lang]}</option>}
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
          {selected.type === 'choice' && <>
            {selected.options.map(option => <div className={styles.choiceEdit} key={option.id}>
              <label>{option.id}
                <input maxLength={360} value={option.text[editingLocale]}
                  onChange={e => changeText(selected.id, e.target.value, option.id)} />
              </label>
              {selected.options.length > 2 && <button type="button" className={styles.secondary}
                aria-label={t.graphChoiceRemove + ' ' + option.id}
                onClick={() => applyEdit(current => removeSalesbotChoice(current, selected.id, option.id))}>
                {t.graphChoiceRemove}
              </button>}
            </div>)}
            {selected.options.length < 5 && <button type="button" className={styles.secondary}
              onClick={() => applyEdit(current => addSalesbotChoice(current, selected.id))}>
              {t.graphChoiceAdd}
            </button>}
          </>}
          {selected.type === 'offer' && <label>{t.graphOffer}
            <select value={selected.offer}
              onChange={e => applyEdit(current => setSalesbotOfferTarget(current, selected.id, e.target.value))}>
              {SALESBOT_OFFER_IDS.map(id => <option key={id} value={id}>{id.replaceAll('_', ' ')}</option>)}
            </select>
          </label>}
        </> : <p className={styles.note}>{t.noEditable}</p>}
        {selected.type === 'branch' && <label>{t.graphTopic}
          <select value={selected.equals}
            onChange={e => applyEdit(current => setSalesbotTopicCondition(current, selected.id, e.target.value))}>
            {SALESBOT_TOPICS.map(topic => <option key={topic} value={topic}>{t.chooseTopic[topic]}</option>)}
          </select>
        </label>}
        <div className={styles.graphTools}>
          <h4>{t.graphTitle}</h4>
          {!!outgoing.length && <>
            <label>{t.graphPath}
              <select value={activePath} onChange={e => setInsertPath(e.target.value)}>
                {outgoing.map(slot => <option key={slot} value={slot}>{slot.replace('choice:', '')}</option>)}
              </select>
            </label>
            <label>{t.graphType}
              <select value={insertType} onChange={e => setInsertType(e.target.value)}>
                {SALESBOT_EDITOR_NODE_TYPES.map(type => <option key={type} value={type}>{t.types[type]}</option>)}
              </select>
            </label>
            <button type="button" className={styles.actionButton}
              onClick={() => applyEdit(current => insertSalesbotStep(current, {
                nodeId: selected.id, slot: activePath, type: insertType,
              }))}>{t.graphAdd}</button>
          </>}
          {['say', 'offer', 'handoff'].includes(selected.type) &&
            <button type="button" className={styles.secondary}
              onClick={() => applyEdit(current => ({
                flow: removeSalesbotLinearStep(current, selected.id), selectedNodeId: current.start,
              }))}>{t.graphRemove}</button>}
        </div>
        <details className={styles.importPanel}>
          <summary>{t.importTitle}</summary>
          <textarea rows={4} maxLength={24576} aria-label={t.importTitle}
            placeholder={t.importPlaceholder} value={importText}
            onChange={e => setImportText(e.target.value)} />
          <button type="button" className={styles.actionButton} disabled={!importText.trim()}
            onClick={importScenario}>{t.importAction}</button>
        </details>
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
      </div>
    </details>
  </section>
}
