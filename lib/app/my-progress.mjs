/**
 * Private, read-only progress projection. Each record is an existing, server-owned
 * account resource: do not invent completions or interpret test scores as growth.
 * No browser storage, analytics or additional media copies.
 */
const localeKey = (locale) => locale === 'ru' ? 'ru' : locale === 'es' ? 'es' : 'en'
const WORDS = {
  en: {
    test: 'Completed test', draft: 'Test in progress', course: 'Personal course',
    reiki: 'Free Reiki Practitioner Program', lesson: 'Completed course practice',
    mandala: 'Privately saved video mandala', checkin: 'Personal check-in',
    journal: 'Personal note', report: 'Saved report', session: 'Saved session',
    document: 'Saved document', request: 'Consultation request',
    labels: {money:'Money',energy:'Energy',relationships:'Relationships',goals:'Goals'},
  },
  ru: {
    test: 'Пройденный тест', draft: 'Незавершённый тест', course: 'Личный курс',
    reiki: 'Бесплатная программа Reiki Practitioner', lesson: 'Выполненная практика курса',
    mandala: 'Приватно сохранённая видеомандала', checkin: 'Наблюдение за состоянием',
    journal: 'Личная заметка', report: 'Сохранённый отчёт', session: 'Сохранённая консультация',
    document: 'Сохранённый документ', request: 'Заявка на консультацию',
    labels: {money:'Деньги',energy:'Энергия',relationships:'Отношения',goals:'Цели'},
  },
  es: {
    test: 'Test completado', draft: 'Test en curso', course: 'Curso personal',
    reiki: 'Programa gratuito de Reiki', lesson: 'Práctica del curso completada',
    mandala: 'Videomandala guardada en privado', checkin: 'Registro personal',
    journal: 'Nota personal', report: 'Informe guardado', session: 'Sesión guardada',
    document: 'Documento guardado', request: 'Solicitud de consulta',
    labels: {money:'Dinero',energy:'Energía',relationships:'Relaciones',goals:'Objetivos'},
  },
}

const asArray = (value) => Array.isArray(value) ? value : []
const dateOf = (value) => {
  if (typeof value !== 'string' && !(value instanceof Date)) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null
}
const safeId = (value) => typeof value === 'string' && value.length <= 160 ? value : null
const localized = (locale, en, ru, es) => locale === 'ru' ? ru : locale === 'es' ? es : en
// Map only existing editorial tags to Holistic House's four topic directions.
// Unknown tags remain unclassified; never infer a diagnosis, intention or score.
const TOPIC_ALIASES = Object.freeze({
  energy:'energy', body:'energy', recovery:'energy',
  business:'money', work:'money', money:'money', finance:'money',
  love:'relationships', relationships:'relationships',
  meaning:'meaning', goals:'meaning', purpose:'meaning', focus:'meaning',
})
const topicTags = input => [...new Set((Array.isArray(input) ? input : [])
  .map(tag => typeof tag === 'string' ? TOPIC_ALIASES[tag.trim().toLowerCase()] : null)
  .filter(Boolean))]

export function buildMyProgress({ bootstrap = {}, growth = null, energywork = null, videos = null, videoProgress = null, titleOfTest = null, topicsOfTest = null, videoTopics = null, orders = null, locale = 'en' } = {}) {
  const lang = localeKey(locale)
  const t = WORDS[lang]
  const root = '/' + lang + '/app'
  const entries = []
  const ids = new Set()
  const add = ({ id, category, title, at, href, status, detail, completed = false, topics = [] }) => {
    const timestamp = dateOf(at)
    const unique = category + ':' + safeId(id)
    if (!timestamp || !safeId(id) || ids.has(unique)) return
    ids.add(unique)
    entries.push({
      id: unique, category, title, at: timestamp, href: href || null,
      status: status || 'saved', detail: detail || '', completed: completed === true, topics:topicTags(topics),
    })
  }
  for (const result of asArray(bootstrap.results)) {
    add({ id:result.id, category:'tests', at:result.measurementAt,
      title:t.test + (result.definitionKey ? ' · ' + (typeof titleOfTest === 'function' ? titleOfTest(result,lang) : result.definitionKey.replaceAll('-', ' ')) : ''),
      href:root + '/results/' + encodeURIComponent(result.id), status:'completed', completed:true,
      topics: typeof topicsOfTest === 'function' ? topicsOfTest(result) : [] })
  }
  for (const run of asArray(bootstrap.runs)) {
    if (!['draft','in_progress'].includes(run.status)) continue
    add({ id:run.id, category:'tests', at:run.measurementAt || run.startedAt,
      title:t.draft + (run.definitionKey ? ' · ' + (typeof titleOfTest === 'function' ? titleOfTest(run,lang) : run.definitionKey.replaceAll('-', ' ')) : ''),
      href:root + '/runs/' + encodeURIComponent(run.id), status:'in_progress',
      topics: typeof topicsOfTest === 'function' ? topicsOfTest(run) : [] })
  }
  for (const row of asArray(growth?.courses)) {
    const completedLessons = Number.isFinite(Number(row.completedLessons)) ? Math.max(0,Number(row.completedLessons)) : 0
    const durationDays = Number.isFinite(Number(row.durationDays)) ? Math.max(1,Number(row.durationDays)) : 14
    const detail = localized(lang,
      completedLessons + '/' + durationDays + ' practices',
      completedLessons + ' из ' + durationDays + ' практик',
      completedLessons + '/' + durationDays + ' prácticas')
    add({ id:row.id, category:'courses', at:row.finishedAt || row.updatedAt || row.startedAt,
      title:t.course + (row.presetId ? ' · ' + row.presetId.replaceAll('-', ' ') : ''),
      href:root + '/course?view=courses&courseId=' + encodeURIComponent(row.id),
      status:row.status || 'active', detail, completed:row.status === 'completed', topics:row.focusTags })
  }
  for (const [day, record] of Object.entries(growth?.course?.dayCompletions || {})) {
    const dayNumber = Number(day)
    if (!Number.isSafeInteger(dayNumber) || dayNumber < 1 || dayNumber > 365 || !record?.completedAt) continue
    add({ id:(growth.course.id || 'course') + '-' + day, category:'practices', at:record.completedAt,
      title:t.lesson + ' · ' + localized(lang,'Day ','День ','Día ') + dayNumber,
      href:root + '/course?courseId=' + encodeURIComponent(growth.course.id || ''),
      status:'completed', completed:true, topics:growth.course.focusTags })
  }
  if (energywork?.enrolled) {
    add({ id:energywork.courseId || 'reiki', category:'courses',
      at:energywork.completedAt || energywork.savedAt,
      title:t.reiki, href:'/' + lang + '/academy/principles-of-energywork/learn',
      status:energywork.status === 'completed' ? 'completed' : 'active',
      completed:energywork.status === 'completed', topics:['energy'] })
  }
  for (const row of asArray(videos?.videos)) {
    // A finished, server-confirmed cloud upload is a *saved file*, not
    // evidence of a public video watch or skill mastery.
    if (row.status !== 'ready') continue
    add({ id:row.id, category:'mandalas', at:row.readyAt || row.createdAt,
      title:t.mandala + (t.labels[row.theme] ? ' · ' + t.labels[row.theme] : ''),
      href:root + '/videos', status:'saved',
      detail:row.duration ? row.duration + ' s · ' + (row.aspect === 'landscape' ? '16:9' : row.aspect === 'square' ? '1:1' : '9:16') : '', topics:[row.theme] })
  }
  for (const record of asArray(videoProgress?.records)) {
    if (!['watched','mastered'].includes(record.status)) continue
    add({ id:record.videoId,category:'videos',at:record.markedAt || record.updatedAt,
      title:typeof record.title === 'string' ? record.title : '',
      href:'/' + lang + '/academy/videos', status:record.status,
      detail:localized(lang,'Self-confirmed viewing or practice', 'Отметка пользователя, не автоматический просмотр', 'Marcado por el usuario'),
      completed:record.status === 'mastered', topics:videoTopics?.[record.videoId] || [] })
  }
  for (const mood of asArray(bootstrap.moodCheckins)) {
    add({ id:mood.id, category:'notes', at:mood.occurredAt, title:t.checkin,
      href:root + '/history', status:'logged' })
  }
  for (const event of asArray(bootstrap.contextEvents)) {
    add({ id:event.id, category:'notes', at:event.occurredAt,
      title:t.journal, href:root + '/history', status:'logged' })
  }
  for (const row of asArray(bootstrap.savedReports)) {
    add({ id:row.id, category:'reports', at:row.savedAt || row.occurredOn,
      title:t.report, href:row.available === false ? null : root + '/reports/' + encodeURIComponent(row.id),
      status:row.available === false ? 'unavailable' : 'saved' })
  }
  for (const row of asArray(bootstrap.savedSessions)) {
    add({ id:row.id, category:'reports', at:row.savedAt || row.occurredOn,
      title:t.session, href:root + '/sessions/' + encodeURIComponent(row.id) })
  }
  for (const row of asArray(bootstrap.savedDocuments)) {
    add({ id:row.id, category:'reports', at:row.savedAt || row.occurredOn,
      title:t.document, href:root + '/document-view/' + encodeURIComponent(row.id) })
  }
  const ownOrders = asArray(orders?.orders)
  const ownedOrderById = new Map(ownOrders.filter(row => safeId(row?.id)).map(row => [row.id,row]))
  const visibleRequests = [...asArray(bootstrap.requests)]
  const found = new Set(visibleRequests.map(row => row?.id))
  for (const order of ownOrders) if (!found.has(order.id)) {
    visibleRequests.push(order)
    found.add(order.id)
  }
  for (const row of visibleRequests) {
    const order = ownedOrderById.get(row.id)
    const unread = Number(order?.unread)
    const detail = Number.isInteger(unread) && unread > 0
      ? localized(lang, 'New messages: ', 'Новые сообщения: ', 'Mensajes nuevos: ') + unread
      : ''
    const serviceCopy = order?.serviceCopy
    const title = [serviceCopy?.[lang]?.title,serviceCopy?.en?.title,serviceCopy?.ru?.title]
      .find(value => typeof value === 'string' && value.trim().length > 0 && value.length <= 140) || t.request
    add({ id:row.id, category:'services', at:order?.updatedAt || row.updatedAt || row.createdAt || order?.createdAt,
      title, href:root + '/messages?section=orders&order=' + encodeURIComponent(row.id),
      status:order?.status || row.status || 'requested', detail })
  }
  entries.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)||a.id.localeCompare(b.id))
  return {
    entries,
    totals: {
      tests:asArray(bootstrap.results).length,
      courses:entries.filter(x=>x.category==='courses').length,
      completedCourses:entries.filter(x=>x.category==='courses'&&x.completed).length,
      practices:entries.filter(x=>x.category==='practices'&&x.completed).length,
      mandalas:entries.filter(x=>x.category==='mandalas').length,
      watchedVideos:entries.filter(x=>x.category==='videos').length,
      reports:entries.filter(x=>x.category==='reports').length,
    },
    // The site does not yet store reliable public-video playback events.
    // Do not display a fictitious zero watched or infer viewing from a click.
    publicVideoWatchHistoryAvailable:Array.isArray(videoProgress?.records),
  }
}
