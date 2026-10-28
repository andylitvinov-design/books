// A source-bound, browser-local conversation about ONE already saved assessment.
// No scores, answers, free text or interests are transmitted to an AI provider, CRM,
// analytics, advertising or storage. Reuse the report's versioned interpretations.
import { assessmentResultOverview } from './result-overview.js'
import { verifiedHistoryResult } from './verified-history.js'

export const TEST_DISCUSSION_INTENT_KEY = 'hh:discuss-guest-test-intent:v1'

const WORDS = {
  en: {
    intro: 'I can help you explore the scores from this completed test. These are questionnaire responses, not a diagnosis or a population ranking.',
    unavailable: 'The saved result could not be verified against its source version, or no comparable numeric scales are available. Open the full report; I cannot make personal recommendations from unverified scores.',
    focus: 'Which result would you like to discuss first?',
    followup: 'What kind of next step would suit you?',
    observe: 'This is what the source-linked report says about this scale:',
    review: 'This result includes advice to seek professional review. If a symptom concerns you, discuss it with a qualified healthcare professional. This site conversation is not clinical care.',
    format: 'This is a local guided conversation based on the same verified report. It does not send test answers to an external AI.',
    video: 'Watch a video', course: 'Try a practice / course', tests: 'Explore another test', session: 'Ask for a consultation',
    videoTitle: 'Published videos and meditations', videoNote: 'Choose a published recording; this is a gallery, not a claim that one video treats a score.',
    courseTitle: 'Short practices and courses', courseNote: 'Explore the existing course and choose whether to start.',
    testsTitle: 'Choose another verified test', testsNote: 'Find a relevant follow-up in My Tests; only currently available questionnaires can be started.',
    sessionTitle: 'Personal consultation', sessionNote: 'Review the available services; an enquiry is not a confirmed booking or payment.',
  },
  ru: {
    intro: 'Давайте разберём показатели этого теста. Они отражают ответы на вопросы, а не диагноз или место среди других людей.',
    unavailable: 'Не удалось подтвердить версию сохранённого результата либо подходящие числовые шкалы отсутствуют. Посмотрите исходный отчёт: персональные рекомендации по непроверенным баллам недоступны.',
    focus: 'Какой показатель вы хотите обсудить в первую очередь?',
    followup: 'Какой следующий шаг вам сейчас подходит?',
    observe: 'Вот как этот показатель объясняется в исходном отчёте:',
    review: 'Для результата предусмотрена рекомендация профессионального обсуждения. Если вас беспокоят симптомы, обратитесь к квалифицированному медицинскому специалисту. Этот диалог не заменяет медицинскую помощь.',
    format: 'Это локальный диалог по проверенному отчёту. Ответы и баллы не передаются внешнему ИИ.',
    video: 'Посмотреть видео', course: 'Практика или курс', tests: 'Другой тест', session: 'Индивидуальная консультация',
    videoTitle: 'Видео и медитации', videoNote: 'Выберите опубликованную запись. Видео не считается лечением или гарантией изменения баллов.',
    courseTitle: 'Практики и курсы', courseNote: 'Откройте существующую программу и сами решите, начинать ли её.',
    testsTitle: 'Подобрать следующий тест', testsNote: 'В My Tests можно выбрать доступную методику для дальнейшего самонаблюдения.',
    sessionTitle: 'Личная консультация', sessionNote: 'Посмотрите доступные услуги. Отправка заявки не означает бронь или оплату.',
  },
  es: {
    intro: 'Podemos explorar las puntuaciones de esta prueba. Describen tus respuestas, no un diagnóstico ni tu posición en la población.',
    unavailable: 'No se ha podido verificar la versión del resultado o faltan escalas numéricas comparables. Consulta el informe original; no se generan recomendaciones personales a partir de datos no verificados.',
    focus: '¿Qué indicador quieres comentar primero?',
    followup: '¿Qué paso te gustaría dar ahora?',
    observe: 'Esto indica el informe original sobre esta escala:',
    review: 'El resultado incluye una recomendación de consulta profesional. Si te preocupan los síntomas, habla con un profesional sanitario cualificado. Este diálogo no sustituye la atención médica.',
    format: 'Este diálogo utiliza el informe verificado de forma local, sin enviar respuestas a una IA externa.',
    video: 'Ver un vídeo', course: 'Práctica o curso', tests: 'Otra prueba', session: 'Consulta individual',
    videoTitle: 'Vídeos y meditaciones', videoNote: 'Elige una grabación publicada; un vídeo no garantiza cambios en tus puntuaciones.',
    courseTitle: 'Prácticas y cursos', courseNote: 'Explora el curso existente y decide si deseas empezar.',
    testsTitle: 'Elegir otra prueba', testsNote: 'En My Tests encontrarás cuestionarios disponibles para seguir reflexionando.',
    sessionTitle: 'Consulta personal', sessionNote: 'Consulta los servicios; enviar una solicitud no constituye una reserva ni un pago.',
  },
}

const finite = value => typeof value === 'number' && Number.isFinite(value)
const short = value => typeof value === 'string' ? value.trim().slice(0, 600) : ''

export function discussionTopic(section = {}) {
  const haystack = [section.domain, section.key, section.construct].filter(Boolean).join(' ').toLowerCase()
  if (/relationship|social|partner|family|attachment|love|intim|отношен|близост|семь|любов|relacion|familia/.test(haystack)) return 'relationships'
  if (/money|work|finance|income|business|career|function|деньг|работ|карьер|бизнес|finanz|trabaj/.test(haystack)) return 'work'
  if (/purpose|meaning|values|goal|direction|смысл|ценност|цел[ьи]|sentido|prop[oó]sito/.test(haystack)) return 'meaning'
  if (/sleep|fatigue|energy|exhaust|body|physical|resource|сон|энерг|устал|ресурс|sueño|energía/.test(haystack)) return 'energy'
  if (/attention|focus|concentrat|memory|вниман|концентрац|atenci[oó]n/.test(haystack)) return 'focus'
  if (/stress|anxiety|worr|burnout|mood|tension|тревог|стресс|напряж|настроен|ansiedad|estr[eé]s/.test(haystack)) return 'stress'
  return 'general'
}

export function buildTestResultDiscussion(result, report, locale = 'en') {
  const t = WORDS[locale] || WORDS.en
  // Legacy ASRS-6 and trauma report builders preserve source verification but
  // do not expose a top-level verified flag. Consult the canonical provenance
  // verifier in that narrow case; never trust numeric ranges on their own.
  const sourceVerified = report?.verified === true ||
    (report?.verified == null && verifiedHistoryResult(result))
  const verified = Boolean(result?.id && sourceVerified &&
    Array.isArray(report?.sections) && report.sections.length)
  if (!verified) return { verified: false, intro: t.unavailable, scales: [], needsCare: false, words: t }
  const raw = report.sections.filter(section =>
    section && typeof section.key === 'string' && section.bandBasis !== 'unavailable' &&
    finite(section.value) && finite(section.min) && finite(section.max) &&
    section.max >= section.min && section.value >= section.min && section.value <= section.max)
  const overview = assessmentResultOverview(report, result, locale)
  const ordered = overview.preview.map(preview => raw.find(section => section.key === preview.key)).filter(Boolean)
  const scales = ordered.slice(0, 3).map(section => ({
    key: section.key,
    label: short(section.construct || section.title || section.key),
    score: String(section.value) + ' (' + String(section.min) + '–' + String(section.max) + ')',
    summary: short(section.summary || section.meaning || report.purpose),
    next: short(section.primarySupport || section.steps?.[0] || section.followUp),
    band: ['screening', 'published-reference'].includes(section.bandBasis) ? short(section.band) : '',
    topic: discussionTopic(section),
    needsCare: section.recommendedReview === true,
  }))
  const needsCare = report.sections.some(section => section?.recommendedReview === true)
  return {
    verified: scales.length > 0,
    intro: scales.length ? t.intro : t.unavailable,
    question: t.focus,
    scales,
    needsCare,
    care: needsCare ? t.review : '',
    words: t,
  }
}

export function discussionOffers({ locale = 'en', topic = 'general', preference = 'video', needsCare = false } = {}) {
  // A flagged screening/professional-review signal must never be turned into a sales trigger.
  if (needsCare) return []
  const t = WORDS[locale] || WORDS.en
  const base = '/' + (['en', 'ru', 'es'].includes(locale) ? locale : 'en')
  const practice = topic === 'energy' || topic === 'stress'
    ? base + '/courses/antistress'
    : base + '/academy?view=videos'
  const offers = {
    video: { id: 'video', title: t.videoTitle, note: t.videoNote, href: base + '/holistic-support/mobile#support-meditation-gallery' },
    course: { id: 'course', title: t.courseTitle, note: t.courseNote, href: practice },
    tests: { id: 'tests', title: t.testsTitle, note: t.testsNote, href: base + '/app/tests?explore=1' },
    session: { id: 'session', title: t.sessionTitle, note: t.sessionNote, href: base + '/services#consultation' },
  }
  const ranking = {
    video: ['video', 'course', 'tests'],
    course: ['course', 'video', 'tests'],
    tests: ['tests', 'video', 'course'],
    session: ['session', 'video', 'course'],
  }
  return (ranking[preference] || ranking.video).map(key => offers[key])
}

// A few recognizable intents, not unrestricted AI interpretation of personal text.
// An unknown phrase returns null and the user keeps control of the available choices.
export function classifyTestDiscussionReply(text = '') {
  const value = typeof text === 'string' ? text.trim().slice(0, 240).toLowerCase() : ''
  if (!value) return null
  if (/суицид|самоубий|покончи.*собой|не хочу жить|самоповрежд|kill myself|suicid|self.harm|quitarme la vida/i.test(value)) return 'urgent'
  if (/видео|медитац|посмотр|video|medita|vídeo|ver video/i.test(value)) return 'video'
  if (/курс|практик|упражнен|урок|course|practice|program|curso|pr[aá]ctica/i.test(value)) return 'course'
  if (/тест|опросник|провер|test|questionnaire|prueba|cuestionario/i.test(value)) return 'tests'
  if (/консультац|специалист|психотерап|встреч|consult|session|therap|sesión|consulta/i.test(value)) return 'session'
  return null
}
