'use client'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { makeLearningPlan } from '@/lib/learning-path/planner.mjs'
import styles from './learning-path-workspace.module.css'

const WORDS = {
  ru: {
    eyebrow: 'HOLISTIC HOUSE · АКАДЕМИЯ',
    title: 'Мой учебный маршрут',
    intro: 'Ответьте на семь коротких вопросов. Мы составим посильный маршрут по настоящим урокам Reiki на 4–6 недель.',
    privacy: 'Это образовательная программа, не медицинская диагностика и не подтверждение квалификации.',
    noAi: 'Пока действует бесплатный режим по проверенной программе, без внешней AI-генерации.',
    next: 'Дальше', back: 'Назад', skip: 'Пропустить', preview: 'Показать маршрут',
    goal: 'Чему вы хотите научиться?', goalHint: 'Например: изучить пять вводных уроков Reiki и повторить основные практики.',
    baseline: 'Что вы уже знаете?', experience: 'Что пробовали раньше? (необязательно)',
    outcome: 'По какому действию поймёте, что достигли цели?',
    outcomeHint: 'Например: смогу самостоятельно повторить выбранную практику.',
    time: 'Сколько времени в неделю вы реально готовы уделять?', weeks: 'Горизонт маршрута',
    format: 'Как удобнее учиться?', obstacles: 'Что может мешать? (необязательно)',
    mentor: 'Нужна ли помощь живого мастера? (необязательно)',
    consent: 'Я согласен(на) сохранить ответы и учебный прогресс в личном кабинете. Внешнему AI и мастеру мои ответы не отправляются.',
    save: 'Сохранить мой маршрут', signin: 'Войти через Google', signFirst: 'Для сохранения войдите в Holistic House через Google, затем откройте эту страницу снова.',
    signing: 'Открываем безопасный вход…', retry: 'Повторить',
    loading: 'Проверяем личный кабинет…', unavailable: 'Не удалось загрузить данные кабинета. Можно посмотреть пример, но сохранение пока недоступно.',
    accountReady: 'Вы вошли. Ваш маршрут будет сохранён приватно.',
    weeksLabel: 'недель', week: 'Неделя', minutes: 'мин', budget: 'План проверен по времени',
    start: 'Начать урок', inEnglish: 'Этот материал доступен на английском языке.',
    mark: 'Я попробовал(а) / изучил(а)', skipStep: 'Пропустить шаг',
    undo: 'Снять отметку', saved: 'Отмечено вами', skipped: 'Пропущено',
    progress: 'Ваш прогресс', reflect: 'Учебный помощник', explain: 'Объясни', hint: 'Подсказка',
    example: 'Пример', review: 'Проверить понимание', ask: 'Мой вопрос (необязательно)',
    send: 'Получить ответ', rules: 'Подсказки по материалу. Это не генеративный AI и не профессиональная проверка.',
    mentorLink: 'Написать мастеру', mentorNote: 'Переход в мессенджер не отправляет ваши ответы автоматически.',
    archive: 'Завершить этот маршрут', delete: 'Удалить маршрут и переписку',
    confirmDelete: 'Подтвердить безвозвратное удаление', cancel: 'Отмена',
    export: 'Экспортировать мои данные', restart: 'Составить новый маршрут',
    activeExists: 'У вас уже есть активный маршрут. Завершите его перед созданием нового.',
    invalid: 'Проверьте ответы и недельный бюджет. Для четырёх недель требуется минимум 50 минут в неделю.',
    success: 'Маршрут сохранён в «Моём доме».', error: 'Не удалось сохранить действие. Проверьте соединение и повторите.',
    previous: 'Предыдущие маршруты', archived: 'В архиве', none: 'Пока нет сохранённых маршрутов.',
    baselines: ['Начинаю с нуля','Есть небольшой опыт','Уже хорошо знаком(а)'],
    formats: ['Читать','Смотреть','Слушать','Практиковаться','Смешанный формат'],
    obstacleChoices: ['Не хватает времени','Сложно сосредоточиться','Слишком быстрый темп','Другое'],
    mentorChoices: ['Пока самостоятельно','Могу обратиться к мастеру'],
    openCabinet: 'Мой дом',
  },
  en: {
    eyebrow: 'HOLISTIC HOUSE · ACADEMY', title: 'My learning path',
    intro: 'Answer seven short questions. Build a realistic 4–6 week route using real Reiki lessons.',
    privacy: 'Educational guidance only: not medical diagnosis or professional certification.',
    noAi: 'Currently uses free, verified course rules, without external AI generation.',
    next: 'Next', back: 'Back', skip: 'Skip', preview: 'Show my route',
    goal: 'What do you want to learn?', goalHint: 'For example: study five Reiki introductory lessons and try their practices.',
    baseline: 'What do you already know?', experience: 'What have you tried? (optional)',
    outcome: 'What practical result will show you have met your goal?',
    outcomeHint: 'For example: I can independently repeat a chosen practice.',
    time: 'How much time can you really spend each week?', weeks: 'Learning horizon',
    format: 'How do you like to learn?', obstacles: 'What may get in your way? (optional)',
    mentor: 'Would a human mentor help? (optional)',
    consent: 'I agree to save these answers and my learning progress privately in My House. My answers are not shared with an external AI or mentor.',
    save: 'Save my route', signin: 'Continue with Google',
    signFirst: 'Sign in with Google, then reopen this page to save your route.',
    signing: 'Opening secure sign-in…', retry: 'Try again', loading: 'Checking My House…',
    unavailable: 'Could not load your account. You can preview a route, but saving is unavailable.',
    accountReady: 'You are signed in. Your route will be saved privately.',
    weeksLabel: 'weeks', week: 'Week', minutes: 'min', budget: 'Time budget verified',
    start: 'Start lesson', inEnglish: 'This lesson is available in English.',
    mark: 'I tried / studied this', skipStep: 'Skip this step', undo: 'Remove my mark',
    saved: 'Self-reported', skipped: 'Skipped', progress: 'Your progress',
    reflect: 'Learning helper', explain: 'Explain', hint: 'Hint', example: 'Example',
    review: 'Review understanding', ask: 'My question (optional)', send: 'Get guidance',
    rules: 'Source-based guidance. Not generative AI or professional verification.',
    mentorLink: 'Message a practitioner', mentorNote: 'Opening Messenger does not automatically send your answers.',
    archive: 'Finish this route', delete: 'Delete route and tutor messages',
    confirmDelete: 'Confirm permanent deletion', cancel: 'Cancel',
    export: 'Export my data', restart: 'Create a new route',
    activeExists: 'You already have an active route. Finish it before creating a new one.',
    invalid: 'Check your answers and weekly time budget. Four weeks require at least 50 minutes a week.',
    success: 'Your route was saved in My House.', error: 'Could not save this action. Check your connection and retry.',
    previous: 'Previous routes', archived: 'Archived', none: 'No saved routes yet.',
    baselines: ['Starting from scratch','Some experience','Familiar with the subject'],
    formats: ['Read','Watch','Listen','Practise','Mixed'],
    obstacleChoices: ['Limited time','Attention','Pace too fast','Other'],
    mentorChoices: ['Self-guided for now','I may contact a mentor'], openCabinet: 'My House',
  },
  es: {
    eyebrow: 'HOLISTIC HOUSE · ACADEMIA', title: 'Mi ruta de aprendizaje',
    intro: 'Responde siete preguntas breves y crea una ruta realista de 4–6 semanas con lecciones auténticas de Reiki.',
    privacy: 'Solo educación: no es un diagnóstico médico ni una certificación profesional.',
    noAi: 'Por ahora funciona con reglas gratuitas del curso, sin generación externa de IA.',
    next: 'Siguiente', back: 'Atrás', skip: 'Omitir', preview: 'Mostrar ruta',
    goal: '¿Qué quieres aprender?', goalHint: 'Por ejemplo: estudiar cinco lecciones introductorias de Reiki.',
    baseline: '¿Qué sabes ya?', experience: '¿Qué has probado antes? (opcional)',
    outcome: '¿Qué acción mostrará que has alcanzado la meta?',
    outcomeHint: 'Por ejemplo: repetir una práctica por mi cuenta.',
    time: '¿Cuánto tiempo puedes dedicar por semana?', weeks: 'Duración de la ruta',
    format: '¿Cómo prefieres aprender?', obstacles: '¿Qué podría dificultarlo? (opcional)',
    mentor: '¿Quieres la ayuda de un maestro? (opcional)',
    consent: 'Acepto guardar estas respuestas y mi progreso de forma privada en Mi Casa. No se envían a una IA externa ni a un maestro.',
    save: 'Guardar mi ruta', signin: 'Entrar con Google',
    signFirst: 'Entra con Google y vuelve a abrir esta página para guardar tu ruta.',
    signing: 'Abriendo acceso seguro…', retry: 'Reintentar', loading: 'Comprobando tu cuenta…',
    unavailable: 'No se pudo cargar tu cuenta. Puedes ver una ruta, pero no guardarla.',
    accountReady: 'Sesión iniciada. Tu ruta se guardará de forma privada.',
    weeksLabel: 'semanas', week: 'Semana', minutes: 'min', budget: 'Tiempo verificado',
    start: 'Abrir lección', inEnglish: 'El material está disponible en inglés.',
    mark: 'Lo estudié / practiqué', skipStep: 'Omitir paso', undo: 'Quitar marca',
    saved: 'Autoevaluación', skipped: 'Omitido', progress: 'Tu progreso',
    reflect: 'Ayuda de estudio', explain: 'Explicar', hint: 'Pista', example: 'Ejemplo',
    review: 'Revisar comprensión', ask: 'Mi pregunta (opcional)', send: 'Ver respuesta',
    rules: 'Orientación basada en el curso, no IA generativa ni verificación profesional.',
    mentorLink: 'Escribir al maestro', mentorNote: 'Abrir Messenger no envía automáticamente tus respuestas.',
    archive: 'Finalizar ruta', delete: 'Eliminar ruta y mensajes',
    confirmDelete: 'Confirmar eliminación permanente', cancel: 'Cancelar',
    export: 'Exportar mis datos', restart: 'Crear otra ruta',
    activeExists: 'Ya tienes una ruta activa. Finalízala para crear otra.',
    invalid: 'Revisa tus respuestas y el tiempo. Cuatro semanas requieren al menos 50 minutos semanales.',
    success: 'Tu ruta se guardó en Mi Casa.', error: 'No se pudo guardar. Comprueba la conexión.',
    previous: 'Rutas anteriores', archived: 'Archivada', none: 'Todavía no hay rutas guardadas.',
    baselines: ['Empiezo desde cero','Algo de experiencia','Ya conozco el tema'],
    formats: ['Leer','Ver','Escuchar','Practicar','Mixto'],
    obstacleChoices: ['Falta de tiempo','Atención','Ritmo rápido','Otro'],
    mentorChoices: ['Por mi cuenta','Quizás consulte a un maestro'], openCabinet: 'Mi Casa',
  },
}

const BASELINES = ['beginner', 'intermediate', 'advanced']
const FORMATS = ['read', 'watch', 'listen', 'practice', 'mixed']
const OBSTACLES = ['time', 'attention', 'pace', 'other']
const DEFAULT = locale => ({
  locale, goal: '', baseline: 'beginner', experience: '', outcome: '',
  minutesPerWeek: 90, weeks: 5, format: 'practice', obstacles: [],
  mentorPreference: 'self_guided',
})

async function requestPath(body) {
  const response = await fetch('/api/learning-path', {
    method: body ? 'POST' : 'GET',
    credentials: 'same-origin', cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.error || 'SERVICE_UNAVAILABLE')
    error.code = data.error
    error.status = response.status
    throw error
  }
  return data
}
function InputRow({ label, children }) {
  return <label className={styles.field}><span>{label}</span>{children}</label>
}
export default function LearningPathWorkspace({ locale = 'en' }) {
  const t = WORDS[locale] || WORDS.en
  const [auth, setAuth] = useState('loading')
  const [path, setPath] = useState(null)
  const [history, setHistory] = useState([])
  const [turns, setTurns] = useState([])
  const [step, setStep] = useState(0)
  const [values, setValues] = useState(() => DEFAULT(locale))
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [activeStep, setActiveStep] = useState(null)
  const [question, setQuestion] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [signBusy, setSignBusy] = useState(false)

  const refresh = async () => {
    try {
      const data = await requestPath()
      const active = data.paths?.find(item => item.status === 'active')
      setHistory(data.paths || [])
      setAuth('signed_in')
      if (active) {
        const details = await fetch('/api/learning-path?id=' + encodeURIComponent(active.id),
          { credentials: 'same-origin', cache: 'no-store' })
        const full = await details.json()
        setPath(full.path || active)
        setTurns(full.tutorTurns || [])
      } else {
        setPath(null)
        setTurns([])
      }
    } catch (error) {
      setAuth(error.status === 401 ? 'guest' : 'unavailable')
    }
  }
  useEffect(() => { void refresh() }, [])
  const update = (key, value) => {
    setValues(old => ({ ...old, [key]: value }))
    setMessage('')
  }
  const preview = useMemo(() => {
    try { return { plan: makeLearningPlan(values), error: '' } }
    catch (error) { return { plan: null, error: error.code || 'INVALID_LEARNING_INTERVIEW' } }
  }, [values])

  const mayAdvance = () => {
    if (step === 0) return values.goal.trim().length >= 10
    if (step === 2) return values.outcome.trim().length >= 5
    if (step === 3) return Number.isInteger(values.minutesPerWeek)
    return true
  }
  const next = () => {
    if (mayAdvance()) { setStep(Math.min(7, step + 1)); setMessage('') }
    else setMessage(t.invalid)
  }
  const signIn = async () => {
    if (signBusy) return
    setSignBusy(true); setMessage('')
    try {
      const response = await fetch('/api/app/auth/start', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale, continueTo: 'cabinet' }),
      })
      const data = await response.json()
      if (!response.ok || typeof data.redirectUrl !== 'string')
        throw new Error('AUTH_UNAVAILABLE')
      const destination = new URL(data.redirectUrl)
      if (destination.protocol !== 'https:') throw new Error('AUTH_UNAVAILABLE')
      window.location.assign(destination.href)
    } catch {
      setSignBusy(false); setMessage(t.error)
    }
  }
  const save = async () => {
    if (!preview.plan || !consent || busy) return
    if (auth !== 'signed_in') { setMessage(t.signFirst); return }
    setBusy(true); setMessage('')
    try {
      const result = await requestPath({
        action: 'create', interview: values, consent: true, operationId: crypto.randomUUID(),
      })
      setPath(result.path); setTurns([]); setStep(0); setMessage(t.success)
      await refresh()
    } catch (error) {
      setMessage(error.code === 'ACTIVE_PLAN_EXISTS' ? t.activeExists : t.error)
    } finally { setBusy(false) }
  }
  const mutate = async (body) => {
    if (!path || busy) return
    setBusy(true); setMessage('')
    try {
      const result = await requestPath({
        ...body, id: path.id, revision: path.revision,
        ...(body.action === 'mark' || body.action === 'tutor'
          ? { operationId: crypto.randomUUID() } : {}),
      })
      if (result.path) setPath(result.path)
      if (result.turn) setTurns(old => [...old, result.turn])
      if (result.deleted) {
        setPath(null); setTurns([]); setConfirmDelete(false); setValues(DEFAULT(locale))
        setConsent(false); setStep(0)
      }
      if (body.action === 'archive') {
        setPath(null); setTurns([]); setStep(0); setValues(DEFAULT(locale))
        setConsent(false)
      }
      if (body.action === 'delete' || body.action === 'archive') await refresh()
    } catch { setMessage(t.error); void refresh() }
    finally { setBusy(false) }
  }
  const exportData = async () => {
    if (!path) return
    try {
      const response = await fetch('/api/learning-path?id=' + encodeURIComponent(path.id),
        { credentials: 'same-origin', cache: 'no-store' })
      if (!response.ok) throw new Error('EXPORT_UNAVAILABLE')
      const data = await response.json()
      const objectUrl = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)],
        { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = objectUrl; link.download = 'holistic-house-my-learning-path.json'
      link.click()
      URL.revokeObjectURL(objectUrl)
    } catch { setMessage(t.error) }
  }

  const allSteps = path?.plan?.weeks?.flatMap(week => week.steps) || []
  const count = allSteps.filter(item =>
    path?.progress?.[item.key]?.status === 'self_reported').length
  return <main className={styles.wrap} data-hh-learning-path data-locale={locale}>
    <div className={styles.top}>
      <Link className={styles.backLink} href={'/' + locale + '/academy'}>← {t.eyebrow}</Link>
      <Link className={styles.backLink} href={'/' + (locale === 'es' ? 'en' : locale) + '/app/portrait'}>{t.openCabinet}</Link>
    </div>
    <header className={styles.hero}>
      <span className={styles.eyebrow}>{t.eyebrow}</span>
      <h1>{t.title}</h1>
      <p>{t.intro}</p>
      <p className={styles.small}>{t.noAi}</p>
    </header>
    {auth === 'loading' && <p role="status">{t.loading}</p>}
    {auth === 'unavailable' && <p role="alert" className={styles.error}>{t.unavailable}</p>}
    {message && <p role="status" className={styles.notice}>{message}</p>}
    {path ? <section className={styles.layout}>
      <div className={styles.summary}>
        <h2>{t.progress}</h2>
        <p className={styles.goal}>{path.interview?.goal}</p>
        <p>{count} / {allSteps.length} · {t.saved}</p>
        <div className={styles.meter}><span style={{ width: String(allSteps.length ? count * 100 / allSteps.length : 0) + '%' }} /></div>
        <p className={styles.small}>{t.privacy}</p>
      </div>
      {path.plan.weeks.map(week => <section className={styles.week} key={week.index}>
        <div className={styles.weekTitle}>
          <h2>{t.week} {week.index}</h2>
          <span>{week.plannedMinutes} {t.minutes}</span>
        </div>
        {week.steps.map(item => {
          const status = path.progress?.[item.key]?.status
          return <article className={styles.lesson} key={item.key}>
            <h3>{item.title}</h3>
            <p className={styles.small}>{item.minutesEstimated} {t.minutes} · {status === 'self_reported' ? t.saved : status === 'skipped' ? t.skipped : t.privacy}</p>
            {item.description && <p>{item.description}</p>}
            {item.href && <Link className={styles.textLink} href={item.href} prefetch={false}>{t.start} ↗</Link>}
            {item.sourceLocale === 'en' && locale === 'es' && <p className={styles.small}>{t.inEnglish}</p>}
            <div className={styles.actions}>
              <button type="button" disabled={busy} onClick={() => void mutate({
                action: 'mark', stepKey: item.key, status: status === 'self_reported' ? 'available' : 'self_reported',
              })}>{status === 'self_reported' ? t.undo : t.mark}</button>
              {status !== 'skipped' && <button type="button" disabled={busy}
                onClick={() => void mutate({ action: 'mark', stepKey: item.key, status: 'skipped' })}>{t.skipStep}</button>}
              <button type="button" className={styles.ghost}
                onClick={() => { setActiveStep(activeStep === item.key ? null : item.key); setQuestion('') }}>{t.reflect}</button>
            </div>
            {activeStep === item.key && <div className={styles.tutor}>
              <h4>{t.reflect}</h4><p className={styles.small}>{t.rules}</p>
              <InputRow label={t.ask}>
                <textarea rows={2} maxLength={1200} value={question}
                  onChange={e => setQuestion(e.target.value)} />
              </InputRow>
              <div className={styles.actions}>
                {['explain', 'hint', 'example', 'review'].map((action, index) =>
                  <button key={action} type="button" disabled={busy} onClick={() => void mutate({
                    action: 'tutor', stepKey: item.key, tutorAction: action, question,
                  })}>{[t.explain, t.hint, t.example, t.review][index]}</button>)}
              </div>
              {turns.filter(turn => turn.stepKey === item.key).map(turn =>
                <div className={styles.reply} key={turn.id}>
                  {turn.question && <p>{turn.question}</p>}
                  <p>{turn.answer}</p>
                </div>)}
            </div>}
          </article>
        })}
      </section>)}
      <div className={styles.summary}>
        <h2>{t.mentorLink}</h2>
        <p className={styles.small}>{t.mentorNote}</p>
        <Link className={styles.primaryLink} href={'/' + (locale === 'es' ? 'en' : locale) + '/app/messages'}>{t.mentorLink}</Link>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.ghost} onClick={() => void exportData()}>{t.export}</button>
        <button type="button" disabled={busy} onClick={() => void mutate({ action: 'archive' })}>{t.archive}</button>
        <button type="button" className={styles.danger} onClick={() => setConfirmDelete(!confirmDelete)}>{t.delete}</button>
      </div>
      {confirmDelete && <div className={styles.confirm}>
        <p>{t.delete}</p>
        <button type="button" disabled={busy} onClick={() => void mutate({
          action: 'delete', confirmation: 'DELETE_MY_LEARNING_PATH',
        })}>{t.confirmDelete}</button>
        <button type="button" onClick={() => setConfirmDelete(false)}>{t.cancel}</button>
      </div>}
    </section> : <section className={styles.form}>
      <div className={styles.progressLine}>
        <span>{Math.min(step + 1, 7)} / 7</span>
        <div className={styles.meter}><span style={{ width: String(Math.min((step + 1) * 100 / 7, 100)) + '%' }} /></div>
      </div>
      {step === 0 && <InputRow label={t.goal}>
        <textarea autoFocus rows={3} maxLength={400} value={values.goal}
          placeholder={t.goalHint} onChange={e => update('goal', e.target.value)} />
      </InputRow>}
      {step === 1 && <>
        <InputRow label={t.baseline}><select value={values.baseline}
          onChange={e => update('baseline', e.target.value)}>
          {BASELINES.map((id, i) => <option key={id} value={id}>{t.baselines[i]}</option>)}
        </select></InputRow>
        <InputRow label={t.experience}><textarea rows={3} maxLength={500}
          value={values.experience} onChange={e => update('experience', e.target.value)} /></InputRow>
      </>}
      {step === 2 && <InputRow label={t.outcome}>
        <textarea rows={3} maxLength={300} value={values.outcome}
          placeholder={t.outcomeHint} onChange={e => update('outcome', e.target.value)} />
      </InputRow>}
      {step === 3 && <>
        <InputRow label={t.time}><select value={values.minutesPerWeek}
          onChange={e => update('minutesPerWeek', Number(e.target.value))}>
          {[30, 45, 50, 60, 90, 120, 180, 240].map(n =>
            <option key={n} value={n}>{n} {t.minutes}</option>)}
        </select></InputRow>
        <InputRow label={t.weeks}><select value={values.weeks}
          onChange={e => update('weeks', Number(e.target.value))}>
          {[4, 5, 6].map(n => <option key={n} value={n}>{n} {t.weeksLabel}</option>)}
        </select></InputRow>
      </>}
      {step === 4 && <InputRow label={t.format}>
        <select value={values.format} onChange={e => update('format', e.target.value)}>
          {FORMATS.map((id, i) => <option key={id} value={id}>{t.formats[i]}</option>)}
        </select>
      </InputRow>}
      {step === 5 && <fieldset className={styles.checkGroup}><legend>{t.obstacles}</legend>
        {OBSTACLES.map((id, i) => <label key={id}>
          <input type="checkbox" checked={values.obstacles.includes(id)}
            onChange={e => update('obstacles', e.target.checked
              ? [...values.obstacles, id]
              : values.obstacles.filter(v => v !== id))} />
          {t.obstacleChoices[i]}
        </label>)}
      </fieldset>}
      {step === 6 && <InputRow label={t.mentor}>
        <select value={values.mentorPreference}
          onChange={e => update('mentorPreference', e.target.value)}>
          {['self_guided', 'optional_human'].map((id, i) =>
            <option key={id} value={id}>{t.mentorChoices[i]}</option>)}
        </select>
      </InputRow>}
      {step === 7 && <>
        <h2>{t.preview}</h2>
        {preview.plan ? <>
          <p className={styles.goal}>{values.goal}</p>
          <p>{t.budget}: {preview.plan.totalMinutes} {t.minutes} / {values.weeks} {t.weeksLabel}</p>
          {preview.plan.weeks.map(week => <div className={styles.previewWeek} key={week.index}>
            <strong>{t.week} {week.index} · {week.plannedMinutes} {t.minutes}</strong>
            {week.steps.map(lesson => <span key={lesson.key}>{lesson.title}</span>)}
          </div>)}
          <label className={styles.consent}>
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
            <span>{t.consent}</span>
          </label>
          {auth === 'signed_in'
            ? <button className={styles.primary} type="button" disabled={!consent || busy}
                onClick={() => void save()}>{busy ? t.loading : t.save}</button>
            : <div className={styles.signin}>
                <p>{t.signFirst}</p>
                <button type="button" className={styles.primary} disabled={signBusy}
                  onClick={() => void signIn()}>{signBusy ? t.signing : t.signin}</button>
              </div>}
        </> : <p role="alert" className={styles.error}>{t.invalid}</p>}
      </>}
      <div className={styles.nav}>
        {step > 0 && <button type="button" onClick={() => { setStep(step - 1); setMessage('') }}>{t.back}</button>}
        {step < 7 && <button className={styles.primary} type="button" onClick={next}
          disabled={!mayAdvance()}>{step === 6 ? t.preview : t.next}</button>}
      </div>
      {auth === 'signed_in' && <p className={styles.small}>{t.accountReady}</p>}
      <p className={styles.small}>{t.privacy}</p>
    </section>}
    {history.filter(item => item.status === 'archived').length > 0 &&
      <details className={styles.history}>
        <summary>{t.previous}</summary>
        {history.filter(item => item.status === 'archived').map(item =>
          <button type="button" key={item.id} onClick={() => { setPath(item); setTurns([]) }}>
            {item.interview?.goal || t.archived} · {new Date(item.createdAt).toLocaleDateString(locale)}
          </button>)}
      </details>}
  </main>
}
