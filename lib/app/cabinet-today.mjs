// Client-side-only navigation aid for the signed-in Cabinet.
// Free text is never serialized into a URL, analytics payload or API call.
const ACTION_PATHS = Object.freeze({
  course: '/app/practice?panel=materials&materialTab=courses',
  article: '/app/practice?panel=materials&materialTab=articles',
  video: '/app/practice?panel=materials&materialTab=videos',
  audio: '/app/practice?panel=materials&materialTab=audio',
  service: '/app/practice?panel=materials&materialTab=services',
  tests: '/app/tests',
  lessons: '/app/course?view=courses',
  reports: '/app/portrait#personal-reports',
  labs: '/app/labs',
  ideas: '/books',
  review: '/services/free-situation-review#request-free-review',
})

export function cabinetActionHref(action, locale = 'en') {
  if (!Object.hasOwn(ACTION_PATHS, action)) return null
  const language = locale === 'ru' ? 'ru' : 'en'
  return '/' + language + ACTION_PATHS[action]
}

export function cabinetActionIds({ practitioner = false, owner = false } = {}) {
  return [
    ...(practitioner ? ['course', 'article', 'video'] : []),
    ...(owner && practitioner ? ['audio'] : []),
    'tests', 'reports', 'lessons', 'ideas', 'labs', 'review',
    ...(practitioner ? ['service'] : []),
  ]
}

export function matchCabinetIntent(raw, permissions = {}) {
  const text = String(raw || '').slice(0, 240).normalize('NFKC').toLowerCase().trim()
  if (!text) return null
  const allowed = new Set(cabinetActionIds(permissions))
  const valid = (primary, alternative = null) =>
    allowed.has(primary) ? primary : alternative && allowed.has(alternative) ? alternative : null

  if (/анализ(?:ы|ов)? крови|лаборатор|blood test|bloodwork|laborator|anal[ií]tica/.test(text)) return valid('labs')
  if (/виде|ролик|ютуб|youtube|video|reel|film|vídeo/.test(text)) return valid('video', 'ideas')
  if (/аудио|запись голоса|медитаци|подкаст|audio|podcast|meditaci[oó]n/.test(text)) return valid('audio', 'lessons')
  if (/стать[яюеи]|статей|публикац|блог|article|art[ií]cul|post|blog/.test(text)) return valid('article', 'ideas')
  if (/курс|обучени|урок|программ|course|learn|lesson|curso|aprender|lecci[oó]n/.test(text)) {
    const creating = /созда|напиш|разработ|запиш|сдела|опублику|create|build|write|publish|produce|make|crear|escribir|publicar/.test(text)
    return creating ? valid('course', 'lessons') : valid('lessons')
  }
  if (/отч[её]т|результат|report|results?|informe|resultado/.test(text)) return valid('reports')
  if (/тест|опрос|самопроверк|test|assess|quiz|cuestionario|prueba/.test(text)) return valid('tests')
  if (/услуг|сервис|service|servicio/.test(text)) return valid('service', 'review')
  if (/идеи|вдохнов|книг|почита|idea|inspir|book|libro/.test(text)) return valid('ideas')
  if (/консультац|помощ|поддержк|consult|help|support|ayuda|consulta/.test(text)) return valid('review')
  return null
}
