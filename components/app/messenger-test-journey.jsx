'use client'

import { useMemo, useRef, useState } from 'react'
import { MONITORING_CATALOG } from '@/data/assessments/catalog'
import { ASSESSMENT_DEFINITIONS, getDefinitionById } from '@/lib/assessments/definitions'
import { chatAnswerLabel, chatPermittedOptions, chatChoosePayload, chatProgress } from '@/lib/assessments/test-chat-flow.mjs'
import { hasTraumaAdministration } from '@/lib/assessments/trauma-administration'
import { safetySignal, SAFETY_COPY } from '@/lib/assessments/safety'
import { Asrs6SourceNotice, Asrs6ChoiceMarker, asrs6ChoiceClass } from '@/components/app/asrs6-source-notice'
import css from './messenger-test-journey.module.css'

const COPY = {
  ru: {
    title: 'Тест в диалоге', select: 'Выберите тест. Я задам каждый вопрос по очереди.',
    find: 'Найти тест по названию', more: 'Все доступные тесты', start: 'Начать тест',
    resume: 'Продолжить сохранённый тест', adult: 'Мне исполнилось 18 лет. Я согласен(на) на временное сохранение ответов для прохождения теста.',
    privacy: 'Без входа в Google. Результат гостевой сессии временный; сохранить его в кабинете можно по вашему выбору.',
    back: 'Назад к выбору', previous: 'Предыдущий вопрос', question: 'Вопрос',
    saving: 'Сохраняю ответ…', complete: 'Вы ответили на все вопросы.', finish: 'Показать результат',
    result: 'Готово! Ваши ответы оценены по исходной методике.', view: 'Посмотреть результат и шкалы',
    again: 'Выбрать другой тест', loading: 'Загружаю…', retry: 'Повторить',
    error: 'Не получилось сохранить ответ. Повторите действие — ранее сохранённые ответы не потеряны.',
    sessionError: 'Гостевой тест сейчас недоступен. Попробуйте позже или откройте каталог тестов.',
    special: 'Этот тест требует дополнительных подготовительных инструкций и согласий. Пройдите его в защищённом интерфейсе.',
    openSpecial: 'Открыть этот тест', notDiagnostic: 'Результат предназначен для самонаблюдения, не для постановки диагноза.',
    answers: 'Варианты ответа', days: 'Выберите количество дней / балл', noMatches: 'По этому запросу нет доступных тестов.',
    recent: 'Ваши ответы', backToChat: 'Вернуться к диалогу',
  },
  en: {
    title: 'Test in chat', select: 'Choose a test. I will ask one question at a time.',
    find: 'Find a test by name', more: 'All available tests', start: 'Start test',
    resume: 'Resume saved test', adult: 'I am 18 or older and agree to temporary storage of my answers for this test.',
    privacy: 'No Google login required. Guest results are temporary; saving to your account is optional.',
    back: 'Back to tests', previous: 'Previous question', question: 'Question',
    saving: 'Saving your answer…', complete: 'You have answered every question.', finish: 'View result',
    result: 'Done! Your answers were scored using the original methodology.', view: 'See results and scales',
    again: 'Choose another test', loading: 'Loading…', retry: 'Retry',
    error: 'Your answer could not be saved. Retry; your previously saved answers remain available.',
    sessionError: 'Guest testing is currently unavailable. Try again later or open the test catalogue.',
    special: 'This test requires additional instructions and acknowledgements. Use its protected questionnaire.',
    openSpecial: 'Open this test', notDiagnostic: 'For self-reflection, not a medical diagnosis.',
    answers: 'Answer choices', days: 'Choose number of days / score', noMatches: 'No available tests match this search.',
    recent: 'Your answers', backToChat: 'Return to chat',
  },
  es: {
    title: 'Test en el chat', select: 'Elige un test. Haré una pregunta cada vez.',
    find: 'Buscar un test', more: 'Todos los tests disponibles', start: 'Empezar',
    resume: 'Continuar test guardado', adult: 'Tengo al menos 18 años y acepto el almacenamiento temporal de mis respuestas para este test.',
    privacy: 'No necesitas Google. El resultado temporal solo se guarda en tu cuenta si lo decides.',
    back: 'Volver a los tests', previous: 'Pregunta anterior', question: 'Pregunta',
    saving: 'Guardando respuesta…', complete: 'Has respondido a todas las preguntas.', finish: 'Ver resultado',
    result: '¡Listo! Las respuestas se evaluaron con el método original.', view: 'Ver resultados y escalas',
    again: 'Elegir otro test', loading: 'Cargando…', retry: 'Reintentar',
    error: 'No pudimos guardar la respuesta. Reinténtalo; tus respuestas guardadas permanecen disponibles.',
    sessionError: 'Los tests de invitado no están disponibles temporalmente. Prueba más tarde.',
    special: 'Este test necesita instrucciones y consentimientos adicionales. Usa el cuestionario protegido.',
    openSpecial: 'Abrir test', notDiagnostic: 'Solo para reflexión personal; no es un diagnóstico médico.',
    answers: 'Opciones de respuesta', days: 'Selecciona días / puntuación', noMatches: 'No hay tests disponibles con ese nombre.',
    recent: 'Tus respuestas', backToChat: 'Volver al chat',
  },
}

// Topic suggestions never substitute an unlicensed or unavailable questionnaire.
const FOCUS_TERMS = {
  personality: ['personality', 'strength', 'identity', 'big-five', 'ipip'],
  stress: ['stress', 'anxiety', 'mood', 'wellbeing', 'body', 'health'],
  relationships: ['relationship', 'attachment', 'intimacy', 'love', 'compassion'],
  work: ['work', 'career', 'professional', 'financial', 'resource', 'burnout'],
}

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

/** @param {{ locale?: 'en'|'ru'|'es', focus?: keyof typeof FOCUS_TERMS|null, onAdvance?: (() => void)|null, onClose?: (() => void)|null }} props */
export default function MessengerTestJourney({ locale = 'en', focus = null, onAdvance = null, onClose = null }) {
  const t = COPY[locale] || COPY.en
  const [selectedKey, setSelectedKey] = useState('')
  const [adult, setAdult] = useState(false)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [run, setRun] = useState(null)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [acknowledgedSafety, setAcknowledgedSafety] = useState(null)
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
  const signalKey = signal ? signal.questionId + ':' + signal.value : null
  const transcript = definition && run ? definition.questions.slice(Math.max(0, state.index - 3), state.index)
    .filter(item => Object.prototype.hasOwnProperty.call(run.answers || {}, item.id)) : []
  const focusMatches = focus && FOCUS_TERMS[focus] ? ALL_TESTS.filter(entry => {
    const info = [
      entry.item.key, entry.item.title?.en,
      ...(entry.item.topics || []),
      ...(entry.item.categoryAffinities || []),
      ...(entry.item.analysisAxes || []).map(axis => axis.key),
    ].filter(Boolean).join(' ').toLowerCase()
    return FOCUS_TERMS[focus].some(term => info.includes(term))
  }) : []
  // The initial four are editorial suggestions, not a clinical diagnosis.
  // The complete cleared catalogue and free-text search remain available.
  const source = !search.trim() && !expanded && focusMatches.length ? focusMatches : ALL_TESTS
  const filtered = source.filter(entry => {
    const label = entry.item.title?.[locale] || entry.item.title?.en || entry.item.key
    return !search.trim() || (label + ' ' + entry.item.key).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  }).slice(0, search.trim() || expanded ? 200 : 4)

  function notify() { onAdvance?.() }
  function changeTest(key) {
    if (busy) return
    setSelectedKey(key);setRun(null);setResult(null);setError('');setAdult(false);setAcknowledgedSafety(null)
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
      notify()
    } catch { setError(t.sessionError) }
    finally { setBusy(false) }
  }
  async function saveAnswer(value) {
    if (!run || !definition || busy || result) return
    setBusy(true);setError('')
    try {
      if (!operation.current) operation.current = chatChoosePayload(definition, run, value, crypto.randomUUID())
      const next = await request('guest/runs/' + run.id + '/save', operation.current)
      setRun(next);operation.current = null;notify()
    } catch {
      setError(t.error)
    } finally { setBusy(false) }
  }
  async function retrySave() {
    if (!operation.current || busy || !run) return
    setBusy(true);setError('')
    try {
      const next = await request('guest/runs/' + run.id + '/save', operation.current)
      setRun(next);operation.current = null;notify()
    } catch { setError(t.error) }
    finally { setBusy(false) }
  }
  async function previous() {
    if (!run || busy || operation.current || state.index <= 0) return
    setBusy(true);setError('')
    const payload = {
      answers: {}, context: run.context || {}, progress: state.index - 1,
      expectedRevision: run.revision, operationId: crypto.randomUUID(),
    }
    operation.current = payload
    try {
      const next = await request('guest/runs/' + run.id + '/save', payload)
      setRun(next);operation.current = null;notify()
    } catch { setError(t.error) }
    finally { setBusy(false) }
  }
  async function finish() {
    if (!run || !state.complete || busy || operation.current) return
    setBusy(true);setError('')
    try {
      if (!completion.current) completion.current = { expectedRevision: run.revision }
      const value = await request('guest/runs/' + run.id + '/submit', completion.current)
      setResult(value);completion.current = null;notify()
    } catch { setError(t.error) }
    finally { setBusy(false) }
  }

  return <section className={css.panel} aria-label={t.title} data-hh-messenger-test-chat>
    <div className={css.header}><strong>{t.title}</strong>
      {onClose && <button type="button" className={css.plain} onClick={onClose}>{t.backToChat}</button>}
    </div>
    {!run && <>
      <p className={css.assistant}>{t.select}</p>
      {!selectedKey && <>
        <label className={css.search}><span className={css.srOnly}>{t.find}</span>
          <input value={search} placeholder={t.find} onChange={e=>setSearch(e.target.value)} />
        </label>
        <div className={css.tests} role="group" aria-label={t.more}>
          {filtered.map(({ item })=><button type="button" key={item.key} onClick={()=>changeTest(item.key)}>
            {item.title?.[locale] || item.title?.en || item.key}
            <small>{item.questionCount} {t.question.toLowerCase()}</small>
          </button>)}
          {!filtered.length && <p>{t.noMatches}</p>}
        </div>
        {!search.trim() && !expanded && ALL_TESTS.length > 6 &&
          <button type="button" className={css.plain} onClick={()=>setExpanded(true)}>{t.more} ({ALL_TESTS.length})</button>}
      </>}
      {selectedKey && definition && <>
        <button className={css.plain} type="button" onClick={()=>changeTest('')}>{t.back}</button>
        <p className={css.assistant} lang={definition.instrumentLocale}>
          {active.item.title?.[locale] || definition.title} · {definition.questions.length} {t.question.toLowerCase()}
        </p>
        {hasTraumaAdministration(definition) ? <>
          <p className={css.note}>{t.special}</p>
          <a className={css.primary} href={`/${locale === 'es' ? 'en' : locale}/client?startTests=${encodeURIComponent(definition.key)}`}>{t.openSpecial}</a>
        </> : <>
          {definition.instructions && <p className={css.note} lang={definition.instrumentLocale}>{definition.instructions}</p>}
          <label className={css.consent}><input type="checkbox" checked={adult} onChange={e=>setAdult(e.target.checked)} />{t.adult}</label>
          <p className={css.note}>{t.privacy}</p>
          <button className={css.primary} type="button" onClick={start} disabled={!adult || busy}>{busy ? t.loading : t.start}</button>
        </>}
      </>}
    </>}
    {run && !result && definition && <>
      <div className={css.progress} role="progressbar" aria-valuenow={state.answeredCount} aria-valuemin={0} aria-valuemax={state.total} aria-label={t.question}>
        <span style={{width:(state.total?state.answeredCount / state.total * 100:0)+'%'}} />
      </div>
      <small className={css.counter}>{t.question} {Math.min(state.index + 1, state.total)} / {state.total} · {state.answeredCount} / {state.total}</small>
      <Asrs6SourceNotice definition={definition} startedAt={run.startedAt} locale={locale} />
      {transcript.length > 0 && <div className={css.history} aria-label={t.recent}>
        {transcript.map(item=><div key={item.id} className={css.exchange}>
          <p className={css.assistant} lang={definition.instrumentLocale}>{item.text}</p>
          <p className={css.user} lang={definition.instrumentLocale}>{chatAnswerLabel(definition, item, run.answers[item.id])}</p>
        </div>)}
      </div>}
      {signal && acknowledgedSafety !== signalKey ? <div className={css.safety} role="alert">
        <strong>{(SAFETY_COPY[locale] || SAFETY_COPY.en).title}</strong>
        <p>{(SAFETY_COPY[locale] || SAFETY_COPY.en).text}</p>
        <p>{(SAFETY_COPY[locale] || SAFETY_COPY.en).urgent}</p>
        <p>{(SAFETY_COPY[locale] || SAFETY_COPY.en).support}</p>
        <button type="button" onClick={()=>setAcknowledgedSafety(signalKey)}>{(SAFETY_COPY[locale] || SAFETY_COPY.en).continue}</button>
      </div> : question && !state.complete ? <>
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
      </> : <>
        <p className={css.assistant}>{t.complete}</p>
        <button type="button" className={css.primary} disabled={busy} onClick={finish}>{busy ? t.loading : t.finish}</button>
      </>}
      {state.index > 0 && <button className={css.plain} type="button" disabled={busy || !!operation.current} onClick={previous}>{t.previous}</button>}
      {busy && <p className={css.note} role="status">{t.saving}</p>}
      <p className={css.note}>{t.notDiagnostic}</p>
    </>}
    {result && <>
      <p className={css.assistant} role="status">{t.result}</p>
      <a className={css.primary} href={`/${locale === 'es' ? 'en' : locale}/client?result=${encodeURIComponent(result.id)}`}>{t.view}</a>
      <button className={css.plain} type="button" onClick={()=>changeTest('')}>{t.again}</button>
      <p className={css.note}>{t.notDiagnostic}</p>
    </>}
    {error && <div role="alert" className={css.error}>
      <p>{error}</p>
      <button type="button" disabled={busy} onClick={operation.current?retrySave:completion.current?finish:run?()=>{setError('');notify()}:start}>{t.retry}</button>
    </div>}
  </section>
}
