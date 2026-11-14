'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MONITORING_CATALOG } from '@/data/assessments/catalog'
import { ASSESSMENT_DEFINITIONS, getDefinitionById } from '@/lib/assessments/definitions'
import { chatAnswerLabel, chatPermittedOptions, chatChoosePayload, chatProgress } from '@/lib/assessments/test-chat-flow.mjs'
import { testControlFromText, proposedTestAnswer, previousTestAnswerPayload } from '@/lib/assessments/conversational-test-protocol.mjs'
import { buildAssessmentResultReport } from '@/lib/assessments/result-report'
import { buildTestResultDiscussion } from '@/lib/assessments/test-result-discussion.mjs'
import { buildMotivatorMessage } from '@/lib/assessments/motivator-mind.mjs'
import { hasTraumaAdministration } from '@/lib/assessments/trauma-administration'
import { safetySignal, SAFETY_COPY } from '@/lib/assessments/safety'
import { Asrs6SourceNotice, Asrs6ChoiceMarker, asrs6ChoiceClass } from '@/components/app/asrs6-source-notice'
import { TEST_KINDS, testKindFor, HOBBY_TEST_KEYS } from '@/lib/assessments/test-kinds'
import css from './messenger-test-journey.module.css'

const COPY = {
  ru: {
    title: 'Тест в диалоге', select: 'Выберите тест. Я задам каждый вопрос по очереди.',
    find: 'Найти тест по названию', more: 'Все доступные тесты', start: 'Начать тест',
    resume: 'Продолжить сохранённый тест', adult: 'Мне исполнилось 18 лет. Я согласен(на) на временное сохранение ответов для прохождения теста.',
    privacy: 'Без входа в Google. Результат гостевой сессии временный; сохранить его в кабинете можно по вашему выбору.',
    back: 'Назад к выбору', previous: 'Предыдущий вопрос', question: 'Вопрос',
    saving: 'Сохраняю ответ…', complete: 'Вы ответили на все вопросы.', completionTitle: 'Поздравляем! 🎉',
    completionHint: 'Теперь можно посмотреть свой результат и рекомендации.', completionCount: 'вопросов пройдено', finish: 'Посмотреть результат',
    result: 'Готово! Ваши ответы оценены по исходной методике.', view: 'Посмотреть результат и шкалы',
    again: 'Выбрать другой тест', loading: 'Загружаю…', retry: 'Повторить',
    error: 'Не получилось сохранить ответ. Повторите действие — ранее сохранённые ответы не потеряны.',
    sessionError: 'Гостевой тест сейчас недоступен. Попробуйте позже или откройте каталог тестов.',
    special: 'Этот тест требует дополнительных подготовительных инструкций и согласий. Пройдите его в защищённом интерфейсе.',
    openSpecial: 'Открыть этот тест', notDiagnostic: 'Результат предназначен для самонаблюдения, не для постановки диагноза.',
    answers: 'Варианты ответа', days: 'Выберите количество дней / балл', noMatches: 'По этому запросу нет доступных тестов.',
    recent: 'Ваши ответы', backToChat: 'Вернуться к диалогу',
    savedLabel:'Незавершённый тест', suggestion:'Рекомендуем начать с этого', take:'Пройти тест',
    browse:'Другие тесты', hideList:'Скрыть список', showNext:'Показать ещё',
    questionUnit:'вопросов', minuteUnit:'мин', instructionsLabel:'Инструкции к тесту',
    matches:'Подходящие тесты', library:'Вся библиотека', filterLabel:'Типы тестов',
    filters:{all:'Все',monitoring:'Анкеты',professional:'Pro',hobby:'Хобби',typology:'Типологии'},
    resetFilters:'Сбросить фильтры', genericDescription:'Опросник из библиотеки Holistic House.',
  },
  en: {
    title: 'Test in chat', select: 'Choose a test. I will ask one question at a time.',
    find: 'Find a test by name', more: 'All available tests', start: 'Start test',
    resume: 'Resume saved test', adult: 'I am 18 or older and agree to temporary storage of my answers for this test.',
    privacy: 'No Google login required. Guest results are temporary; saving to your account is optional.',
    back: 'Back to tests', previous: 'Previous question', question: 'Question',
    saving: 'Saving your answer…', complete: 'You have answered every question.', completionTitle: 'Congratulations! 🎉',
    completionHint: 'You can now explore your results and recommendations.', completionCount: 'questions answered', finish: 'View result',
    result: 'Done! Your answers were scored using the original methodology.', view: 'See results and scales',
    again: 'Choose another test', loading: 'Loading…', retry: 'Retry',
    error: 'Your answer could not be saved. Retry; your previously saved answers remain available.',
    sessionError: 'Guest testing is currently unavailable. Try again later or open the test catalogue.',
    special: 'This test requires additional instructions and acknowledgements. Use its protected questionnaire.',
    openSpecial: 'Open this test', notDiagnostic: 'For self-reflection, not a medical diagnosis.',
    answers: 'Answer choices', days: 'Choose number of days / score', noMatches: 'No available tests match this search.',
    recent: 'Your answers', backToChat: 'Return to chat',
    savedLabel:'Your unfinished test', suggestion:'Suggested to start', take:'Take test',
    browse:'Explore other tests', hideList:'Hide test list', showNext:'Show more',
    questionUnit:'questions', minuteUnit:'min', instructionsLabel:'Test instructions',
    matches:'Matching tests', library:'Full library', filterLabel:'Test types',
    filters:{all:'All',monitoring:'Check-ins',professional:'Pro',hobby:'Hobby',typology:'Typologies'},
    resetFilters:'Clear filters', genericDescription:'A questionnaire from the Holistic House library.',
  },
  es: {
    title: 'Test en el chat', select: 'Elige un test. Haré una pregunta cada vez.',
    find: 'Buscar un test', more: 'Todos los tests disponibles', start: 'Empezar',
    resume: 'Continuar test guardado', adult: 'Tengo al menos 18 años y acepto el almacenamiento temporal de mis respuestas para este test.',
    privacy: 'No necesitas Google. El resultado temporal solo se guarda en tu cuenta si lo decides.',
    back: 'Volver a los tests', previous: 'Pregunta anterior', question: 'Pregunta',
    saving: 'Guardando respuesta…', complete: 'Has respondido a todas las preguntas.', completionTitle: '¡Felicidades! 🎉',
    completionHint: 'Ahora puedes ver tus resultados y recomendaciones.', completionCount: 'preguntas respondidas', finish: 'Ver resultado',
    result: '¡Listo! Las respuestas se evaluaron con el método original.', view: 'Ver resultados y escalas',
    again: 'Elegir otro test', loading: 'Cargando…', retry: 'Reintentar',
    error: 'No pudimos guardar la respuesta. Reinténtalo; tus respuestas guardadas permanecen disponibles.',
    sessionError: 'Los tests de invitado no están disponibles temporalmente. Prueba más tarde.',
    special: 'Este test necesita instrucciones y consentimientos adicionales. Usa el cuestionario protegido.',
    openSpecial: 'Abrir test', notDiagnostic: 'Solo para reflexión personal; no es un diagnóstico médico.',
    answers: 'Opciones de respuesta', days: 'Selecciona días / puntuación', noMatches: 'No hay tests disponibles con ese nombre.',
    recent: 'Tus respuestas', backToChat: 'Volver al chat',
    savedLabel:'Test pendiente', suggestion:'Sugerido para empezar', take:'Hacer test',
    browse:'Explorar otros tests', hideList:'Ocultar lista', showNext:'Ver más',
    questionUnit:'preguntas', minuteUnit:'min', instructionsLabel:'Instrucciones del test',
    matches:'Pruebas para ti', library:'Biblioteca completa', filterLabel:'Tipos de pruebas',
    filters:{all:'Todas',monitoring:'Cuestionarios',professional:'Pro',hobby:'Hobby',typology:'Tipologías'},
    resetFilters:'Quitar filtros', genericDescription:'Un cuestionario de la biblioteca Holistic House.',
  },
}

const EXTRA = {
  ru: {
    resume:'Продолжить сохранённый тест', pause:'Продолжить позже', paused:'Тест приостановлен. Ответы сохранены в защищённой гостевой сессии.',
    continue:'Продолжить тест', cancel:'Отменить тест', confirmCancel:'Удалить незавершённые ответы?', confirmDiscard:'Да, удалить черновик',
    keep:'Нет, сохранить черновик', confirm:'Подтвердить распознанный ответ', reject:'Выбрать кнопкой', exact:'Это исходные инструкции методики.',
    select:'Выберите проверенный тест или вариант ответа кнопкой.', unclear:'Я не буду угадывать ответ. Нажмите исходный вариант или продиктуйте его точно и подтвердите.',
    repeated:'Повторяю исходный вопрос.', back:'Предыдущий ответ открыт для изменения.',
    conflict:'Данные изменились в другой вкладке. Показан актуальный сохранённый вопрос.',
    recovered:'Найден незавершённый тест.', language:'Вопросы этой методики доступны на языке: ',
    preview:'Предлагаемый ответ, пока не сохранён:', resultTitle:'Ваш результат в чате',
    originalScore:'Значения исходных шкал', report:'Полный отчёт',
    save:'Войти и сохранить в «Мой дом»', optional:'Необязательный следующий шаг',
    cannotInterpret:'Интерпретация недоступна: проверьте исходный отчёт.', version:'Версия методики'
  },
  en: {
    resume:'Resume saved test', pause:'Continue later', paused:'Test paused. Answers remain in the protected guest session.',
    continue:'Resume test', cancel:'Cancel test', confirmCancel:'Delete unfinished answers?', confirmDiscard:'Yes, discard draft',
    keep:'No, keep draft', confirm:'Confirm recognized answer', reject:'Choose a button instead', exact:'These are the original instrument instructions.',
    select:'Choose an eligible test or an original answer button.', unclear:'I will not guess your answer. Choose an original option or confirm an exact dictation.',
    repeated:'Repeating the exact original question.', back:'Previous answer is ready to edit.',
    conflict:'Another tab changed this run. Showing the latest saved question.',
    recovered:'An unfinished test is available.', language:'This instrument is available in: ',
    preview:'Proposed answer, not yet saved:', resultTitle:'Your result in chat',
    originalScore:'Original scale scores', report:'Full report',
    save:'Sign in and save to My Home', optional:'Optional next step',
    cannotInterpret:'Interpretation unavailable; review the original report.', version:'Instrument version'
  },
  es: {
    resume:'Continuar prueba guardada', pause:'Continuar más tarde', paused:'Prueba en pausa. Tus respuestas siguen protegidas en la sesión.',
    continue:'Continuar prueba', cancel:'Cancelar prueba', confirmCancel:'¿Eliminar respuestas incompletas?', confirmDiscard:'Sí, eliminar borrador',
    keep:'No, conservar', confirm:'Confirmar respuesta reconocida', reject:'Elegir con botón', exact:'Estas son las instrucciones originales.',
    select:'Elige una prueba disponible o una opción original.', unclear:'No adivinaré tu respuesta. Elige una opción original o confirma un dictado exacto.',
    repeated:'Repito la pregunta original sin cambios.', back:'Puedes modificar la respuesta anterior.',
    conflict:'Otra pestaña cambió la sesión. Se muestra la pregunta guardada más reciente.',
    recovered:'Hay una prueba pendiente.', language:'La prueba está disponible en: ',
    preview:'Respuesta propuesta, todavía sin guardar:', resultTitle:'Tu resultado en el chat',
    originalScore:'Puntuaciones originales', report:'Informe completo',
    save:'Entrar y guardar en Mi Casa', optional:'Siguiente paso opcional',
    cannotInterpret:'Interpretación no disponible; revisa el informe original.', version:'Versión de la prueba'
  },
}
// Editorial topic matches for the assistant's six-project test entry.
// Rights, startability and guest eligibility stay enforced by the canonical catalogue.
const FOCUS_TERMS = {
  personality: ['personality', 'strength', 'identity', 'big-five', 'ipip'],
  stress: ['stress', 'anxiety', 'mood', 'wellbeing', 'body', 'health'],
  relationships: ['relationship', 'attachment', 'intimacy', 'love', 'compassion'],
  work: ['work', 'career', 'professional', 'financial', 'resource', 'burnout'],
}

// Reuse the catalogue's rights-aware discovery classification. "Pro" means a
// sourced instrument, never proof of psychometric or clinical validation.
const TEST_FILTERS = ['all', ...TEST_KINDS.map(kind => kind.key), 'typology']
const TYPOLOGY_KEYS = new Set(HOBBY_TEST_KEYS.filter(key =>
  ['hh-socionics-32','hh-enneagram-36','hh-disc-style-20','hh-temperaments-16'].includes(key)))

const ALL_TESTS = MONITORING_CATALOG.filter(item =>
  item.startable === true && item.rightsStatus === 'cleared' && item.guestEligible === true && item.key !== 'phq-9'
).map(item => {
  const definitions = ASSESSMENT_DEFINITIONS.filter(def => def.key === item.key && def.version === item.version)
  return { item, definitions }
}).filter(entry => entry.definitions.length > 0)

function pickDefinition(entry, locale) {
  return entry?.definitions.find(def => def.instrumentLocale === (locale === 'ru' ? 'ru' : 'en'))
    || entry?.definitions.find(def => def.instrumentLocale === 'en')
    || entry?.definitions[0] || null
}

async function request(path, body) {
  const response = await fetch('/api/app/' + path, {
    method: body ? 'POST' : 'GET',
    credentials: 'same-origin', cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => ({ error: 'SERVICE_UNAVAILABLE' }))
  if (!response.ok) {
    const error = new Error(data.error || 'SERVICE_UNAVAILABLE')
    error.status = response.status
    error.code = data.error
    throw error
  }
  return data
}

function timezone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' } catch { return 'UTC' }
}


/* Existing first-party photographs, shared with the Holistic House card family.
   Decorative photos never encode private test answers or require remote media. */
function testPortrait(item, focus) {
  const topics = [item?.key || '', ...(item?.topics || [])].join(' ').toLowerCase()
  if (focus === 'personality' || topics.includes('personality') || topics.includes('ipip'))
    return '/images/holistic-house/support-mock-portrait.webp'
  if (focus === 'relationships' || topics.includes('relationship'))
    return '/images/holistic-house/reiki-approved-sunrise-v3.webp'
  if (focus === 'work' || topics.includes('work'))
    return '/images/holistic-house/report-lighthouse-coast.webp'
  return '/images/holistic-house/course-start-heron.webp'
}

function TestCard({ item, locale, focus, label, action, onAction, disabled = false, progress = null, compact = false }) {
  const t = COPY[locale] || COPY.en
  const title = item?.title?.[locale] || item?.title?.en || item?.key || t.title
  const description = item?.description?.[locale] || item?.description?.en || ''
  const facts = [
    Number.isFinite(item?.questionCount) ? item.questionCount + ' ' + t.questionUnit : null,
    Number.isFinite(item?.durationMinutes) ? item.durationMinutes + ' ' + t.minuteUnit : null,
    progress,
  ].filter(Boolean).join(' · ')
  return <article className={css.testCard + (compact ? ' ' + css.compactCard : '')}
    data-hh-test-card={item?.key || 'saved'}>
    <img src={testPortrait(item, focus)} alt="" width={80} height={94}
      loading="lazy" decoding="async" className={css.testPhoto} />
    <div className={css.testBody}>
      {label && <span className={css.cardEyebrow}>{label}</span>}
      <strong className={css.testTitle}>{title}</strong>
      {facts && <small className={css.testMeta}>{facts}</small>}
      <p className={css.testDescription}>{description || t.genericDescription}</p>
      {action && <button type="button" className={css.testAction} disabled={disabled}
        onClick={onAction}>{action}</button>}
    </div>
  </article>
}

/** @param {{ locale?: 'en'|'ru'|'es', focus?: keyof typeof FOCUS_TERMS|null, onAdvance?: (() => void)|null, onClose?: (() => void)|null, incomingTurn?: { seq: number, text: string }|null, suggestedKey?: string }} props */
export default function MessengerTestJourney({ locale = 'en', focus = null, onAdvance = null, onClose = null, incomingTurn = null, suggestedKey = '' }) {
  const t = COPY[locale] || COPY.en
  const extra = EXTRA[locale] || EXTRA.en
  const [selectedKey, setSelectedKey] = useState('')
  const [adult, setAdult] = useState(false)
  const [search, setSearch] = useState('')
  const [testFilter, setTestFilter] = useState('all')
  const [visibleCount, setVisibleCount] = useState(3)
  const [run, setRun] = useState(null)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [acknowledgedSafety, setAcknowledgedSafety] = useState(null)
  const [restorable, setRestorable] = useState(null)
  const [paused, setPaused] = useState(false)
  const [cancelPending, setCancelPending] = useState(false)
  const [notice, setNotice] = useState('')
  const [pendingAnswer, setPendingAnswer] = useState(null)
  const seenTurn = useRef(incomingTurn?.seq || 0)
  const operation = useRef(null)
  const startId = useRef(null)
  const completion = useRef(null)
  const active = ALL_TESTS.find(entry => entry.item.key === selectedKey)
  const definition = useMemo(() => {
    if (run) {
      try { return getDefinitionById(run.definitionId) } catch { return null }
    }
    return pickDefinition(active, locale)
  }, [run, active, locale])
  const state = chatProgress(definition, run)
  const question = definition?.questions[state.index]
  const choices = chatPermittedOptions(definition, question, run?.answers || {})
  const signal = run && safetySignal(definition, run.answers || {})
  const report = useMemo(() => result ? buildAssessmentResultReport(result, locale === 'es' ? 'en' : locale) : null, [result, locale])
  const discussion = useMemo(() => result && report ? buildTestResultDiscussion({ result, report, locale }) : null, [result, report, locale])
  const motivator = useMemo(() => result && report?.verified && !discussion?.needsProfessional
    ? buildMotivatorMessage({ result, report, locale, tone: 'gentle' }) : null, [result, report, locale, discussion?.needsProfessional])
  const signalKey = signal ? signal.questionId + ':' + signal.value : null
  const transcript = definition && run ? definition.questions.slice(Math.max(0, state.index - 3), state.index)
    .filter(item => Object.prototype.hasOwnProperty.call(run.answers || {}, item.id)) : []
  const focusMatches = focus && FOCUS_TERMS[focus] ? ALL_TESTS.filter(entry => {
    const info = [
      entry.item.key, entry.item.title?.en, ...(entry.item.topics || []),
      ...(entry.item.categoryAffinities || []),
      ...(entry.item.analysisAxes || []).map(axis => axis.key),
    ].filter(Boolean).join(' ').toLowerCase()
    return FOCUS_TERMS[focus].some(term => info.includes(term))
  }) : []
  // Match the selected topic first; render the eligible catalogue directly.
  const recommended = focusMatches.length ? focusMatches : ALL_TESTS
  const featured = (focus === 'personality' ? recommended.find(entry => entry.item.key === 'mini-ipip-20') : null)
    || (!focus ? recommended.find(entry => entry.item.key === 'hh-current-state') : null)
    || recommended.find(entry => entry.item.questionCount <= 20 && entry.item.durationMinutes <= 5)
    || recommended[0]
  const ranked = [
    ...(featured ? [featured] : []),
    ...recommended.filter(entry => entry.item.key !== featured?.item.key),
    ...ALL_TESTS.filter(entry => !recommended.some(option => option.item.key === entry.item.key)),
  ]
  const restorableEntry = restorable && ALL_TESTS.find(entry =>
    entry.definitions.some(def => def.id === restorable.definitionId))
  const restorableDefinition = restorableEntry?.definitions.find(def => def.id === restorable?.definitionId)
  const restorableProgress = restorableDefinition && restorable?.answers
    ? chatProgress(restorableDefinition, restorable).answeredCount + '/' + restorableDefinition.questions.length
    : null
  const filtered = ranked.filter(entry => {
    if (restorableEntry?.item.key === entry.item.key) return false
    const kind = testKindFor({
      key: entry.item.key, catalog: entry.item, definition: pickDefinition(entry, locale),
    })
    if (testFilter === 'typology' && !TYPOLOGY_KEYS.has(entry.item.key)) return false
    if (testFilter !== 'all' && testFilter !== 'typology' && kind !== testFilter) return false
    const query = search.trim().toLocaleLowerCase()
    const text = [entry.item.key, entry.item.title?.[locale], entry.item.title?.en,
      entry.item.description?.[locale], entry.item.description?.en].filter(Boolean).join(' ').toLocaleLowerCase()
    return !query || text.includes(query)
  })

  useEffect(() => {
    let live = true
    // Recover exclusively from the server's HttpOnly guest identity. Nothing
    // sensitive goes into localStorage, query strings or AI telemetry.
    request('guest/bootstrap').then(bootstrap => {
      if (!live) return
      const eligible = (bootstrap.runs || []).filter(item =>
        ALL_TESTS.some(entry => entry.definitions.some(def => def.id === item.definitionId && !hasTraumaAdministration(def))))
      if (eligible.length) setRestorable(eligible.at(-1))
    }).catch(() => { /* No consented guest session. Never create one implicitly. */ })
    return () => { live = false }
  }, [])
  useEffect(() => {
    if (!run && suggestedKey && ALL_TESTS.some(entry => entry.item.key === suggestedKey))
      setSelectedKey(current => current || suggestedKey)
  }, [suggestedKey, run])
  function notify() { onAdvance?.() }
  function changeTest(key) {
    if (busy) return
    setSelectedKey(key);setRun(null);setResult(null);setError('');setAdult(false);setAcknowledgedSafety(null)
    setVisibleCount(3)
    setPaused(false);setCancelPending(false);setPendingAnswer(null);setNotice('')
    operation.current = null;completion.current = null;startId.current = null
    notify()
  }
  async function start() {
    if (!adult || !definition || busy) return
    if (hasTraumaAdministration(definition)) return
    setBusy(true);setError('')
    try {
      let bootstrap
      try { bootstrap = await request('guest/bootstrap') }
      catch (err) {
        if (err.status !== 401 || err.code !== 'GUEST_SESSION_REQUIRED') throw err
        await request('guest/session', { adult: true, necessary: true, uiLocale: locale === 'ru' ? 'ru' : 'en', timezone: timezone() })
        bootstrap = await request('guest/bootstrap')
      }
      const existing = (bootstrap.runs || []).find(item => item.definitionId === definition.id)
      if (!startId.current) startId.current = crypto.randomUUID()
      const next = existing || await request('guest/runs', {
        definitionKey: definition.key, definitionVersion: definition.version,
        instrumentLocale: definition.instrumentLocale, operationId: startId.current,
      })
      setRun(next);setResult(null);setAcknowledgedSafety(null);startId.current = null
      setPaused(false);setPendingAnswer(null);setRestorable(null)
      notify()
    } catch { setError(t.sessionError) }
    finally { setBusy(false) }
  }
  async function saveAnswer(value) {
    if (!run || !definition || busy || paused || result) return
    setBusy(true);setError('')
    try {
      if (!operation.current) operation.current = chatChoosePayload(definition, run, value, crypto.randomUUID())
      const next = await request('guest/runs/' + run.id + '/save', operation.current)
      setRun(next);operation.current = null;setPendingAnswer(null);notify()
    } catch (reason) {
      await reconcileSaveError(reason)
    } finally { setBusy(false) }
  }
  // Optimistic concurrency is resolved from the owned server run, never
  // from a local stale copy. Unknown transport outcomes keep operationId.
  async function reconcileSaveError(reason) {
    if (reason?.status !== 409) { setError(t.error); return }
    try {
      const fresh = await request('guest/runs/' + run.id)
      setRun(fresh);operation.current = null;setPendingAnswer(null)
      setError(extra.conflict);notify()
    } catch { setError(t.sessionError) }
  }
  async function retrySave() {
    if (!operation.current || busy || !run) return
    setBusy(true);setError('')
    try {
      const next = await request('guest/runs/' + run.id + '/save', operation.current)
      setRun(next);operation.current = null;setPendingAnswer(null);notify()
    } catch (reason) { await reconcileSaveError(reason) }
    finally { setBusy(false) }
  }
  async function previous() {
    if (!run || busy || operation.current || state.index <= 0) return
    setBusy(true);setError('')
    const payload = previousTestAnswerPayload(definition, run, crypto.randomUUID())
    operation.current = payload
    try {
      const next = await request('guest/runs/' + run.id + '/save', payload)
      setRun(next);operation.current = null;setPendingAnswer(null);notify()
    } catch (reason) { await reconcileSaveError(reason) }
    finally { setBusy(false) }
  }
  async function finish() {
    if (!run || !state.complete || busy || operation.current) return
    setBusy(true);setError('')
    try {
      if (!completion.current) completion.current = { expectedRevision: run.revision }
      const value = await request('guest/runs/' + run.id + '/submit', completion.current)
      setResult(value);completion.current = null;setPendingAnswer(null);setPaused(false);notify()
    } catch { setError(t.error) }
    finally { setBusy(false) }
  }

  async function resumeSaved() {
    if (!restorable || busy) return
    setBusy(true);setError('')
    try {
      const fresh = await request('guest/runs/' + restorable.id)
      if (!ALL_TESTS.some(entry => entry.definitions.some(def =>
        def.id === fresh.definitionId && !hasTraumaAdministration(def)))) throw Error('NOT_ELIGIBLE')
      setRun(fresh);setSelectedKey(fresh.definitionKey);setResult(null);setPaused(false)
      setCancelPending(false);setPendingAnswer(null);setRestorable(null);notify()
    } catch { setError(t.sessionError) }
    finally { setBusy(false) }
  }
  async function discardDraft() {
    if (!run || busy) return
    setBusy(true);setError('')
    try {
      await request('guest/runs/' + run.id + '/discard', { expectedRevision: run.revision })
      operation.current = null;completion.current = null;setRestorable(null)
      setSelectedKey('');setRun(null);setResult(null);setCancelPending(false);setPendingAnswer(null);notify()
    } catch { setError(t.error) }
    finally { setBusy(false) }
  }
  // Incoming composer text (including OS dictation) stays in the same chat.
  // It never becomes an assessment answer until confirmed on-screen.
  useEffect(() => {
    if (!incomingTurn || seenTurn.current >= incomingTurn.seq) return
    seenTurn.current = incomingTurn.seq
    const action = testControlFromText(incomingTurn.text)
    setPendingAnswer(null);setNotice('')
    if (action === 'resume') {setPaused(false);setCancelPending(false);return}
    if (action === 'pause') {setPaused(true);setCancelPending(false);return}
    if (action === 'cancel' && run && !result) {setCancelPending(true);return}
    if (action === 'repeat') {setNotice(extra.repeated);return}
    if (action === 'explain') {setNotice(definition?.instructions || extra.exact);return}
    if (action === 'previous') {if (run && !paused) void previous(); else setNotice(extra.select);return}
    if (action === 'finish') {if (run && state.complete) void finish(); else setNotice(extra.select);return}
    if (!run || result || paused || cancelPending || !question || signal) {setNotice(extra.select);return}
    const candidate = proposedTestAnswer(definition, question, run.answers || {}, incomingTurn.text)
    if (!candidate) {setNotice(extra.unclear);return}
    setPendingAnswer({ ...candidate, questionId: question.id, revision: run.revision })
  }, [incomingTurn, run, definition, question, paused, cancelPending, result, state.complete, signal])
  return <section className={css.panel} aria-label={t.title} data-hh-messenger-test-chat>
    <div className={css.header}><strong>{selectedKey || run ? t.title : t.matches}</strong>
      <div className={css.headerActions}>
        <a className={css.libraryLink} href={'/' + locale + '/tests'}>{t.library}</a>
        {onClose && <button type="button" className={css.plain} onClick={onClose}>{t.backToChat}</button>}
      </div>
    </div>
    {!run && <>
      {!selectedKey && <>
        {restorable && <TestCard item={restorableEntry?.item} locale={locale} focus={focus}
          label={t.savedLabel} action={busy ? t.loading : extra.continue}
          onAction={resumeSaved} disabled={busy} progress={restorableProgress} compact />}
        <div className={css.filterRow} role="group" aria-label={t.filterLabel}
          data-hh-test-kind-filters>
          {TEST_FILTERS.map(kind=><button type="button" key={kind}
            className={css.filterChip} aria-pressed={testFilter===kind}
            title={TEST_KINDS.find(entry=>entry.key===kind)?.description?.[locale] || t.filters[kind]}
            onClick={()=>{setTestFilter(kind);setVisibleCount(3)}}>
            {t.filters[kind]}
          </button>)}
        </div>
        <div id="hh-messenger-test-catalog" className={css.browse} data-hh-test-catalog>
          <label className={css.search}>
            <span className={css.srOnly}>{t.find}</span>
            <input type="search" value={search} placeholder={t.find}
              onChange={e=>{setSearch(e.target.value);setVisibleCount(3)}} />
          </label>
          <div className={css.tests} role="group" aria-label={t.more}>
            {filtered.slice(0,visibleCount).map(entry=><TestCard key={entry.item.key}
              item={entry.item} locale={locale} focus={focus}
              label={testFilter==='all' && !search && entry.item.key===featured?.item.key ? t.suggestion : null}
              action={t.take} onAction={()=>changeTest(entry.item.key)} disabled={busy}/>)}
            {!filtered.length && <div className={css.empty}>
              <p className={css.note}>{t.noMatches}</p>
              <button type="button" className={css.plain} onClick={()=>{
                setTestFilter('all');setSearch('');setVisibleCount(3)
              }}>{t.resetFilters}</button>
            </div>}
          </div>
          {filtered.length > visibleCount && <button type="button" className={css.plain}
            onClick={()=>setVisibleCount(count=>count+4)}>
            {t.showNext} ({filtered.length-visibleCount})
          </button>}
        </div>
      </>}
      {selectedKey && definition && <>
        <button className={css.backLink} type="button" onClick={()=>changeTest('')}>‹ {t.back}</button>
        <TestCard item={active?.item} locale={locale} focus={focus} compact />
        {definition.instrumentLocale !== locale && <p className={css.note} role="note">{extra.language}<b>{definition.instrumentLocale.toUpperCase()}</b>. {locale === 'es' ? 'No es una traducción validada al español.' : locale === 'ru' ? 'Это не перевод и не русская версия методики.' : 'This is not a translated version.'}</p>}
        {hasTraumaAdministration(definition) ? <>
          <p className={css.note}>{t.special}</p>
          <a className={css.primary} href={'/' + (locale === 'es' ? 'en' : locale) + '/client?startTests=' + encodeURIComponent(definition.key)}>{t.openSpecial}</a>
        </> : <>
          {definition.instructions && <details className={css.instructions}>
            <summary>{t.instructionsLabel}</summary>
            <p lang={definition.instrumentLocale}>{definition.instructions}</p>
          </details>}
          <label className={css.consent}><input type="checkbox" checked={adult} onChange={e=>setAdult(e.target.checked)} />{t.adult}</label>
          <p className={css.note}>{t.privacy}</p>
          <button className={css.primary} type="button" onClick={start} disabled={!adult || busy}>{busy ? t.loading : t.start}</button>
        </>}
      </>}
    </>}
    {run && !result && definition && <>
      {(!state.complete || paused || cancelPending) && <div className={css.controls} role="group" aria-label={t.title}>
        {paused ? <button type="button" className={css.plain} onClick={()=>setPaused(false)}>{extra.continue}</button> :
          <button type="button" className={css.plain} onClick={()=>{setPaused(true);setPendingAnswer(null)}}>{extra.pause}</button>}
        <button type="button" className={css.plain} onClick={()=>setCancelPending(true)}>{extra.cancel}</button>
      </div>}
      {cancelPending && <div className={css.confirmation} role="alertdialog" aria-label={extra.confirmCancel}>
        <p>{extra.confirmCancel}</p>
        <div className={css.controls}>
          <button type="button" className={css.plain} disabled={busy} onClick={()=>setCancelPending(false)}>{extra.keep}</button>
          <button type="button" className={css.plain} disabled={busy} onClick={discardDraft}>{extra.confirmDiscard}</button>
        </div>
      </div>}
      {paused && <p className={css.assistant} data-hh-test-block="test_pause">{extra.paused}</p>}
      {!state.complete && <>
      <div className={css.progress} role="progressbar" aria-valuenow={state.answeredCount} aria-valuemin={0} aria-valuemax={state.total} aria-label={t.question}>
        <span style={{width:(state.total?state.answeredCount / state.total * 100:0)+'%'}} />
      </div>
      <small className={css.counter}>{t.question} {Math.min(state.index + 1, state.total)} / {state.total} · {state.answeredCount} / {state.total}</small>
      </>}
      <Asrs6SourceNotice definition={definition} startedAt={run.startedAt} locale={locale} />
      {!state.complete && transcript.length > 0 && <div className={css.history} aria-label={t.recent}>
        {transcript.map(item=><div key={item.id} className={css.exchange}>
          <p className={css.assistant} lang={definition.instrumentLocale}>{item.text}</p>
          <p className={css.user} lang={definition.instrumentLocale}>{chatAnswerLabel(definition, item, run.answers[item.id])}</p>
        </div>)}
      </div>}
      {!paused && !cancelPending && signal && acknowledgedSafety !== signalKey ? <div className={css.safety} role="alert">
        <strong>{(SAFETY_COPY[locale] || SAFETY_COPY.en).title}</strong>
        <p>{(SAFETY_COPY[locale] || SAFETY_COPY.en).text}</p>
        <p>{(SAFETY_COPY[locale] || SAFETY_COPY.en).urgent}</p>
        <p>{(SAFETY_COPY[locale] || SAFETY_COPY.en).support}</p>
        <button type="button" onClick={()=>setAcknowledgedSafety(signalKey)}>{(SAFETY_COPY[locale] || SAFETY_COPY.en).continue}</button>
      </div> : !paused && !cancelPending && question && !state.complete ? <>
        <fieldset className={css.question} disabled={busy || !!operation.current}>
          <legend className={css.assistant} lang={definition.instrumentLocale}>{question.text}</legend>
          {question.section && <small>{question.section}</small>}
          {definition.key === 'cdc-hrqol-4' && question.id === 'hrqol4.04' && run.answers?.['hrqol4.02'] === 0 && run.answers?.['hrqol4.03'] === 0 &&
            <p className={css.note}>{locale === 'ru' ? 'По правилам CDC, если физически и психологически нездоровых дней не было, выберите 0.' : locale === 'es' ? 'Según el CDC, si no hubo días de malestar físico ni mental, elija 0.' : 'CDC guidance: when physical and mental unhealthy days were both zero, select 0.'}</p>}
          <div className={css.choices} role="group" aria-label={t.answers}>
            {choices.length > 11 ? <label>
              <span className={css.srOnly}>{t.days}</span>
              <select defaultValue="" key={question.id} onChange={e=>{if(e.target.value!=='')void saveAnswer(Number(e.target.value))}} disabled={busy}>
                <option value="" disabled>{t.days}</option>
                {choices.map(choice=><option key={choice.value} value={choice.value}>{choice.label}</option>)}
              </select>
            </label> : choices.map(choice=><button type="button" key={choice.value} disabled={busy}
              className={asrs6ChoiceClass(definition, question, choice.value)}
              lang={definition.instrumentLocale} onClick={()=>saveAnswer(choice.value)}>
              {choice.label === String(choice.value) ? choice.label : <><b>{choice.value}</b> {choice.label}</>}
              <Asrs6ChoiceMarker definition={definition} question={question} value={choice.value} />
            </button>)}
          </div>
          {question.anchors?.length > 0 && <small className={css.note} lang={definition.instrumentLocale}>
            {question.anchors[0]} — {question.anchors.at(-1)}
          </small>}
        </fieldset>
      </> : !paused && !cancelPending ? <div className={css.completionCard} data-hh-test-block="test_complete">
        <span className={css.completionMark} aria-hidden="true">✓</span>
        <small className={css.completionCount}>{state.answeredCount} / {state.total} · {t.completionCount}</small>
        <strong className={css.completionTitle} role="status">{t.completionTitle}</strong>
        <p className={css.completionMessage}>{t.complete} {t.completionHint}</p>
        <button type="button" className={css.completionCta} data-hh-test-view-result disabled={busy || !!operation.current} onClick={finish}>
          <span>{busy ? t.loading : t.finish}</span><span aria-hidden="true">→</span>
        </button>
        {state.index > 0 && <button className={css.completionBack} type="button" disabled={busy || !!operation.current} onClick={previous}>{t.previous}</button>}
      </div> : null}
      {notice && <p className={css.assistant} data-hh-test-block="test_clarification">{notice}</p>}
      {pendingAnswer && !busy && !paused && pendingAnswer.questionId === question?.id &&
        pendingAnswer.revision === run.revision && <div className={css.confirmation} data-hh-test-block="test_confirmed_answer">
          <p>{extra.preview} <strong>{pendingAnswer.label}</strong></p>
          <div className={css.controls}>
            <button type="button" className={css.primary} onClick={()=>saveAnswer(pendingAnswer.value)}>{extra.confirm}</button>
            <button type="button" className={css.plain} onClick={()=>setPendingAnswer(null)}>{extra.reject}</button>
          </div>
        </div>}
      {state.index > 0 && !state.complete && !paused && !cancelPending && <button className={css.plain} type="button" disabled={busy || !!operation.current} onClick={previous}>{t.previous}</button>}
      {busy && !state.complete && <p className={css.note} role="status">{t.saving}</p>}
      <p className={css.note}>{t.notDiagnostic}</p>
    </>}
    {result && <>
      <p className={css.assistant} role="status">{t.result}</p>
      <div className={css.resultCard} data-hh-test-block="test_result" aria-label={extra.resultTitle}>
        <strong>{extra.resultTitle}</strong>
        <p>{active?.item.title?.[locale] || definition?.title || result.definitionKey} · {extra.version}: {result.definitionVersion}</p>
        {result.measurementAt && <small>{new Intl.DateTimeFormat(locale, {dateStyle:'medium'}).format(new Date(result.measurementAt))}</small>}
        <strong>{extra.originalScore}</strong>
        <ul>{(result.dimensions || []).slice(0,3).filter(item=>Number.isFinite(item?.value)).map(item=>
          <li key={item.key}><span>{item.sourceConstruct || item.key}</span><b>{item.value} {item.unit === 'points' ? '' : item.unit || ''}</b></li>
        )}</ul>
        {discussion?.verified && !discussion.needsProfessional ? <>
          {discussion.highlights?.[0]?.summary && <p>{discussion.highlights[0].summary}</p>}
          {discussion.highlights?.[0]?.optionalStep && <p><b>{extra.optional}:</b> {discussion.highlights[0].optionalStep}</p>}
          {motivator?.paragraph && <p>{motivator.paragraph}</p>}
        </> : <p>{discussion?.reviewNote || extra.cannotInterpret}</p>}
        <p className={css.note}>{t.notDiagnostic}</p>
      </div>
      <a className={css.primary} href={`/${locale === 'es' ? 'en' : locale}/client?result=${encodeURIComponent(result.id)}`}>{extra.report}</a>
      <a className={css.plain} href={`/${locale === 'es' ? 'en' : locale}/client?result=${encodeURIComponent(result.id)}`}>{extra.save}</a>
      <button className={css.plain} type="button" onClick={()=>changeTest('')}>{t.again}</button>
      <p className={css.note}>{t.notDiagnostic}</p>
    </>}
    {error && <div role="alert" className={css.error}>
      <p>{error}</p>
      <button type="button" disabled={busy} onClick={operation.current?retrySave:completion.current?finish:run?()=>{setError('');notify()}:start}>{t.retry}</button>
    </div>}
  </section>
}
