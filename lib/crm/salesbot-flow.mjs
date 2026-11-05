// Holistic SalesBot R1: a bounded, pure *dry-run* workflow engine.
// No database mutations, providers, AI calls, HTTP, timers or user-authored code.
// Existing CRM contacts/consent/messenger remain the only source of truth.
export const SALESBOT_LOCALES = Object.freeze(['en', 'ru', 'es'])
export const SALESBOT_TOPICS = Object.freeze(['relationships', 'stress', 'resources', 'work', 'direction'])
export const SALESBOT_OFFER_IDS = Object.freeze(['free_review', 'consultation', 'tests', 'business', 'academy'])
const MAX_NODES = 24
const MAX_STEPS = 30
const ID = /^[a-z][a-z0-9_-]{0,31}$/
const TYPES = new Set(['start', 'say', 'choice', 'branch', 'offer', 'handoff', 'end'])
const TEXT = (en, ru, es) => ({ en, ru, es })

function error(code) { throw new Error(code) }
function object(value, keys, code = 'INVALID_SALESBOT_GRAPH') {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
    Object.keys(value).some(key => !keys.includes(key))) error(code)
}
function id(value) {
  if (typeof value !== 'string' || !ID.test(value)) error('INVALID_SALESBOT_NODE_ID')
  return value
}
function localized(value) {
  object(value, SALESBOT_LOCALES, 'INVALID_SALESBOT_LOCALE')
  for (const locale of SALESBOT_LOCALES) {
    if (typeof value[locale] !== 'string' || !value[locale].trim() ||
      value[locale].length > 360 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value[locale]))
      error('INVALID_SALESBOT_COPY')
  }
  return Object.fromEntries(SALESBOT_LOCALES.map(locale => [locale, value[locale].trim()]))
}
const outgoing = node => node.type === 'choice' ? node.options.map(option => option.next) :
  node.type === 'branch' ? [node.yes, node.no] :
  node.type === 'end' ? [] : [node.next]

export function validateSalesbotFlow(flow) {
  object(flow, ['schemaVersion', 'id', 'title', 'start', 'nodes'])
  if (flow.schemaVersion !== 1) error('INVALID_SALESBOT_VERSION')
  const flowId = id(flow.id)
  const title = localized(flow.title)
  const start = id(flow.start)
  if (!Array.isArray(flow.nodes) || flow.nodes.length < 2 || flow.nodes.length > MAX_NODES)
    error('INVALID_SALESBOT_NODE_COUNT')
  const byId = new Map()
  const nodes = flow.nodes.map(raw => {
    object(raw, ['id', 'type', 'next', 'text', 'options', 'field', 'equals', 'yes', 'no', 'offer'])
    const nodeId = id(raw.id)
    if (byId.has(nodeId)) error('DUPLICATE_SALESBOT_NODE')
    if (!TYPES.has(raw.type)) error('INVALID_SALESBOT_NODE_TYPE')
    const node = { id: nodeId, type: raw.type }
    if (['say', 'choice', 'offer', 'handoff', 'end'].includes(node.type))
      node.text = localized(raw.text)
    if (['start', 'say', 'offer', 'handoff'].includes(node.type)) node.next = id(raw.next)
    if (node.type === 'choice') {
      if (!Array.isArray(raw.options) || raw.options.length < 2 || raw.options.length > 5)
        error('INVALID_SALESBOT_CHOICES')
      const seen = new Set()
      node.options = raw.options.map(option => {
        object(option, ['id', 'text', 'next'])
        const optionId = id(option.id)
        if (seen.has(optionId)) error('DUPLICATE_SALESBOT_CHOICE')
        seen.add(optionId)
        return { id: optionId, text: localized(option.text), next: id(option.next) }
      })
    }
    if (node.type === 'branch') {
      if (raw.field !== 'topic' || !SALESBOT_TOPICS.includes(raw.equals))
        error('INVALID_SALESBOT_BRANCH')
      node.field = raw.field
      node.equals = raw.equals
      node.yes = id(raw.yes)
      node.no = id(raw.no)
    }
    if (node.type === 'offer') {
      if (!SALESBOT_OFFER_IDS.includes(raw.offer)) error('INVALID_SALESBOT_OFFER')
      node.offer = raw.offer
    }
    // Reject silently ignored fields. A non-executable node must not smuggle
    // untrusted send/config/HTTP instructions into an apparently safe flow.
    const expected = {
      start: ['id', 'type', 'next'],
      say: ['id', 'type', 'text', 'next'],
      choice: ['id', 'type', 'text', 'options'],
      branch: ['id', 'type', 'field', 'equals', 'yes', 'no'],
      offer: ['id', 'type', 'text', 'offer', 'next'],
      handoff: ['id', 'type', 'text', 'next'],
      end: ['id', 'type', 'text'],
    }[node.type]
    if (Object.keys(raw).some(key => !expected.includes(key))) error('INVALID_SALESBOT_NODE_FIELD')
    byId.set(nodeId, node)
    return node
  })
  if (byId.get(start)?.type !== 'start' || nodes.filter(node => node.type === 'start').length !== 1)
    error('INVALID_SALESBOT_START')
  if (!nodes.some(node => node.type === 'end')) error('INVALID_SALESBOT_TERMINAL')
  const visited = new Set()
  const visiting = new Set()
  function walk(nodeId, depth) {
    if (!byId.has(nodeId)) error('MISSING_SALESBOT_EDGE')
    if (depth > MAX_STEPS) error('SALESBOT_TOO_DEEP')
    if (visiting.has(nodeId)) error('SALESBOT_CYCLE')
    if (visited.has(nodeId)) return
    visiting.add(nodeId)
    for (const target of outgoing(byId.get(nodeId))) walk(target, depth + 1)
    visiting.delete(nodeId)
    visited.add(nodeId)
  }
  walk(start, 0)
  if (visited.size !== nodes.length) error('UNREACHABLE_SALESBOT_NODE')
  return { schemaVersion: 1, id: flowId, title, start, nodes }
}

export function salesbotOfferPath(offer, locale = 'en') {
  if (!SALESBOT_OFFER_IDS.includes(offer)) error('INVALID_SALESBOT_OFFER')
  const lang = SALESBOT_LOCALES.includes(locale) ? locale : 'en'
  const testLang = lang === 'es' ? 'en' : lang
  const routes = {
    free_review: '/' + lang + '/services/free-situation-review',
    consultation: '/' + lang + '/services#consultation',
    tests: '/' + testLang + '/client/tests',
    business: '/' + (lang === 'ru' ? 'ru' : 'en') + '/app/business',
    academy: '/' + lang + '/academy',
  }
  return routes[offer]
}

export function simulateSalesbotFlow(rawFlow, input = {}) {
  const flow = validateSalesbotFlow(rawFlow)
  object(input, ['locale', 'topic', 'answers'], 'INVALID_SALESBOT_INPUT')
  const locale = input.locale ?? 'en'
  if (!SALESBOT_LOCALES.includes(locale)) error('INVALID_SALESBOT_LOCALE')
  const topic = input.topic ?? 'direction'
  if (!SALESBOT_TOPICS.includes(topic)) error('INVALID_SALESBOT_TOPIC')
  const answers = input.answers ?? {}
  object(answers, flow.nodes.filter(node => node.type === 'choice').map(node => node.id),
    'INVALID_SALESBOT_ANSWERS')
  const nodeMap = new Map(flow.nodes.map(node => [node.id, node]))
  const trace = []
  let current = flow.start
  for (let step = 0; step <= MAX_STEPS; step++) {
    const node = nodeMap.get(current)
    if (!node) error('MISSING_SALESBOT_EDGE')
    if (node.type === 'end') {
      trace.push({ nodeId: node.id, kind: 'end', text: node.text[locale] })
      return { mode: 'dry_run', status: 'completed', trace, waiting: null,
        sent: false, leadCreated: false, bookingConfirmed: false, paymentReceived: false }
    }
    if (node.type === 'start') { current = node.next; continue }
    if (node.type === 'branch') {
      current = topic === node.equals ? node.yes : node.no
      continue
    }
    if (node.type === 'choice') {
      const options = node.options.map(option => ({ id: option.id, text: option.text[locale] }))
      trace.push({ nodeId: node.id, kind: 'choice', text: node.text[locale], options })
      const answer = answers[node.id]
      if (answer === undefined) {
        return { mode: 'dry_run', status: 'waiting_for_choice', trace,
          waiting: { nodeId: node.id, options }, sent: false, leadCreated: false,
          bookingConfirmed: false, paymentReceived: false }
      }
      const selected = node.options.find(option => option.id === answer)
      if (!selected) error('INVALID_SALESBOT_CHOICE_ANSWER')
      current = selected.next
      continue
    }
    if (node.type === 'offer') trace.push({
      nodeId: node.id, kind: 'offer', text: node.text[locale],
      offerId: node.offer, href: salesbotOfferPath(node.offer, locale),
    })
    else if (node.type === 'handoff') trace.push({
      nodeId: node.id, kind: 'handoff', text: node.text[locale],
      // Preview-only: intentionally not a contact, message or follow-up task.
      action: 'owner_manual_review_preview',
    })
    else trace.push({ nodeId: node.id, kind: 'message', text: node.text[locale] })
    current = node.next
  }
  error('SALESBOT_TOO_DEEP')
}

// Verified existing public routes only; no direct messaging, payments or AI.
// Immutable by contract: callers edit a separate in-memory copy of a template.
export const SALESBOT_TEMPLATES = Object.freeze([
  {
    schemaVersion: 1, id: 'first-enquiry',
    title: TEXT('New enquiry · next step', 'Новый запрос · первый шаг', 'Nueva consulta · primer paso'),
    start: 'start',
    nodes: [
      { id: 'start', type: 'start', next: 'welcome' },
      { id: 'welcome', type: 'say',
        text: TEXT('Welcome! Let us find a useful first step. This is an automated guide, not a practitioner.',
          'Здравствуйте! Найдём подходящий первый шаг. Это автоматический помощник, не мастер.',
          '¡Hola! Busquemos un primer paso. Esta es una guía automática, no un terapeuta.'),
        next: 'choice' },
      { id: 'choice', type: 'choice',
        text: TEXT('Would you like a free written review or to request a personal session?',
          'Предпочитаете бесплатный письменный разбор или запросить личную сессию?',
          '¿Prefieres una revisión gratuita por escrito o solicitar una sesión personal?'),
        options: [
          { id: 'review', text: TEXT('Free written review', 'Бесплатный разбор', 'Revisión gratuita'), next: 'free' },
          { id: 'session', text: TEXT('Personal session', 'Личная сессия', 'Sesión personal'), next: 'personal' },
        ] },
      { id: 'free', type: 'offer',
        text: TEXT('Open the existing free review page. Your message here has not created a lead.',
          'Откройте существующую страницу бесплатного разбора. Этот диалог ещё не создал лид.',
          'Abre la página de revisión gratuita. Este diálogo aún no ha creado ningún contacto.'),
        offer: 'free_review', next: 'done' },
      { id: 'personal', type: 'offer',
        text: TEXT('Request a session with Andrey: €50/30 min or €100/60 min. This is not a booking.',
          'Запросить сессию с Андреем: €50/30 мин или €100/60 мин. Это ещё не запись.',
          'Solicita una sesión con Andrey: €50/30 min o €100/60 min. No es una reserva.'),
        offer: 'consultation', next: 'done' },
      { id: 'done', type: 'end',
        text: TEXT('Only a submitted form creates a request. No message has been sent.',
          'Заявка появится только после отправки формы. Сообщений не отправлено.',
          'Solo el formulario enviado crea una solicitud. No se ha enviado ningún mensaje.') },
    ],
  },
  {
    schemaVersion: 1, id: 'business-program',
    title: TEXT('Business · course or support', 'Бизнес · курс или помощь', 'Negocios · curso o apoyo'),
    start: 'start',
    nodes: [
      { id: 'start', type: 'start', next: 'intro' },
      { id: 'intro', type: 'say',
        text: TEXT('A structured programme or a personal conversation? Choose what fits your goal.',
          'Структурная программа или личный разговор? Выберите подходящий формат.',
          '¿Un programa estructurado o una conversación personal? Elige lo que necesitas.'),
        next: 'choice' },
      { id: 'choice', type: 'choice',
        text: TEXT('How would you like to begin?', 'Как хотите начать?', '¿Cómo quieres empezar?'),
        options: [
          { id: 'course', text: TEXT('Explore 90-day Business & Career', 'Программа «Бизнес и карьера» на 90 дней', 'Curso de 90 días'), next: 'course' },
          { id: 'consult', text: TEXT('Ask for personal support', 'Запросить личную помощь', 'Solicitar apoyo personal'), next: 'consult' },
        ] },
      { id: 'course', type: 'offer',
        text: TEXT('Open the existing Business & Career programme (sign-in may be needed).',
          'Открыть существующую программу «Бизнес и карьера» (возможно, нужен вход).',
          'Abre el programa Business & Career existente (quizá necesites iniciar sesión).'),
        offer: 'business', next: 'finish' },
      { id: 'consult', type: 'offer',
        text: TEXT('A consultation request is not an appointment or payment.',
          'Запрос консультации не означает запись или оплату.',
          'Una solicitud de consulta no es una reserva ni un pago.'),
        offer: 'consultation', next: 'finish' },
      { id: 'finish', type: 'end',
        text: TEXT('No automatic contact or sales action occurred.',
          'Автоматические сообщения и продажи не совершались.',
          'No se ha contactado automáticamente a nadie.') },
    ],
  },
  {
    schemaVersion: 1, id: 'manual-followup',
    title: TEXT('Owner follow-up · handoff', 'Follow-up · передача мастеру', 'Seguimiento · al profesional'),
    start: 'start',
    nodes: [
      { id: 'start', type: 'start', next: 'intro' },
      { id: 'intro', type: 'say',
        text: TEXT('If a client explicitly requests a reply, the next step is a human review.',
          'Если клиент явно запросил ответ, следующий шаг — проверка человеком.',
          'Si el cliente solicita una respuesta, primero se requiere revisión humana.'),
        next: 'handoff' },
      { id: 'handoff', type: 'handoff',
        text: TEXT('Preview: a CRM owner task could be prepared only after a real submitted, consented lead.',
          'Предпросмотр: задачу мастеру можно создать только после реальной заявки и согласия.',
          'Vista previa: la tarea requiere una solicitud real y consentimiento.'),
        next: 'done' },
      { id: 'done', type: 'end',
        text: TEXT('Preview complete. No task, contact or external message was created.',
          'Предпросмотр завершён. Задачи, контакты и сообщения не созданы.',
          'Vista previa terminada. No se crearon tareas, contactos ni mensajes.') },
    ],
  },
])
