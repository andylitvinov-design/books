// Versioned encrypted lesson answer for the existing private end-01 journal.
// Keep v1 readable/valid for already-saved applications; only new edits write v2.
export const REIKI_REQUEST_PREFIX = 'hh-reiki-personal-request-v1:'
export const REIKI_REQUEST_PREFIX_V2 = 'hh-reiki-personal-request-v2:'
export const REIKI_INITIATION_IDS = Object.freeze(['tantra', 'kundalini', 'yggdrasil'])
export const REIKI_INITIATION_NAMES = Object.freeze({
  tantra: 'Tantra Reiki',
  kundalini: 'Kundalini Reiki',
  yggdrasil: 'Reiki Yggdrasil',
})
export const REIKI_PERSONAL_SESSIONS = Object.freeze([
  Object.freeze({ id: 'none', minutes: 0, priceEur: 0 }),
  Object.freeze({ id: 'express', minutes: 30, priceEur: 50 }),
  Object.freeze({ id: 'full', minutes: 60, priceEur: 100 }),
])

const blank = () => ({
  firstName: '', lastName: '', location: '', timezone: '',
  preferredTime: '', freeInitiation: '', donationInitiations: [], motivation: '',
  personalSession: 'none',
})
const text = (value, max) => typeof value === 'string' ? value.slice(0, max) : ''
const ids = (value) => Array.isArray(value)
  ? [...new Set(value.filter((id) => REIKI_INITIATION_IDS.includes(id)))].slice(0, 2)
  : []
const validPersonalSession = (value) => REIKI_PERSONAL_SESSIONS.some((item) => item.id === value)
const prefixOf = (raw) => raw.startsWith(REIKI_REQUEST_PREFIX_V2) ? REIKI_REQUEST_PREFIX_V2
  : raw.startsWith(REIKI_REQUEST_PREFIX) ? REIKI_REQUEST_PREFIX : null

// Legacy free-text letters reopen with their motivation intact.
export function readReikiInitiationRequest(raw) {
  if (typeof raw !== 'string') return blank()
  const prefix = prefixOf(raw)
  if (!prefix) return { ...blank(), motivation: text(raw, 700) }
  try {
    const value = JSON.parse(raw.slice(prefix.length))
    if (!value || typeof value !== 'object' || Array.isArray(value)) return blank()
    return {
      firstName: text(value.firstName, 60),
      lastName: text(value.lastName, 60),
      location: text(value.location, 120),
      timezone: text(value.timezone, 80),
      preferredTime: text(value.preferredTime, 180),
      freeInitiation: REIKI_INITIATION_IDS.includes(value.freeInitiation) ? value.freeInitiation : '',
      donationInitiations: ids(value.donationInitiations).filter((id) => id !== value.freeInitiation),
      motivation: text(value.motivation, 700),
      personalSession: validPersonalSession(value.personalSession) ? value.personalSession : 'none',
    }
  } catch {
    return blank()
  }
}

export function writeReikiInitiationRequest(value) {
  const normalized = readReikiInitiationRequest(REIKI_REQUEST_PREFIX_V2 + JSON.stringify(value))
  return REIKI_REQUEST_PREFIX_V2 + JSON.stringify(normalized)
}

export function reikiInitiationRequestValid(raw) {
  if (typeof raw !== 'string' || raw.length > 1600) return false
  const prefix = prefixOf(raw)
  if (!prefix) return false
  const request = readReikiInitiationRequest(raw)
  // v1 submissions remain valid after release without rewriting the user's
  // existing signed-off choice or requiring them to resubmit anything.
  const canonical = prefix === REIKI_REQUEST_PREFIX
    ? REIKI_REQUEST_PREFIX + JSON.stringify(Object.fromEntries(Object.entries(request).filter(([key]) => key !== 'personalSession')))
    : writeReikiInitiationRequest(request)
  if (canonical !== raw) return false
  return Boolean(
    request.firstName.trim().length >= 2 &&
    request.lastName.trim().length >= 2 &&
    request.location.trim().length >= 2 &&
    request.timezone.trim().length >= 2 &&
    request.preferredTime.trim().length >= 3 &&
    request.motivation.trim().length >= 20 &&
    REIKI_INITIATION_IDS.includes(request.freeInitiation) &&
    request.donationInitiations.every((id) => id !== request.freeInitiation) &&
    validPersonalSession(request.personalSession)
  )
}

export function formatReikiInitiationRequest(raw, locale = 'en') {
  if (typeof raw !== 'string' || !prefixOf(raw)) return text(raw, 1600)
  const request = readReikiInitiationRequest(raw)
  const ru = locale === 'ru'
  const choice = (id) => REIKI_INITIATION_NAMES[id] || (ru ? 'Не выбрана' : 'Not selected')
  const personal = {
    none: ru ? 'Не выбрана' : 'Not requested',
    express: ru ? 'Краткая личная инициация — 30 минут, €50' : 'Express personal initiation — 30 minutes, €50',
    full: ru ? 'Полноценная личная сессия — 60 минут, €100' : 'Full personal session — 60 minutes, €100',
  }
  return [
    ru ? 'Заявка на Рейки-инициацию' : 'Reiki initiation request',
    (ru ? 'Имя: ' : 'First name: ') + request.firstName,
    (ru ? 'Фамилия: ' : 'Last name: ') + request.lastName,
    (ru ? 'Город, страна: ' : 'City, country: ') + request.location,
    (ru ? 'Часовой пояс: ' : 'Time zone: ') + request.timezone,
    (ru ? 'Удобное время для согласования: ' : 'Preferred time to arrange: ') + request.preferredTime,
    (ru ? 'Бесплатная инициация в чате: ' : 'Free chat-guided initiation: ') + choice(request.freeInitiation),
    (ru ? 'Дополнительно за добровольный донейшн (чат): ' : 'Additional initiations by donation (chat): ') +
      (request.donationInitiations.map(choice).join(', ') || (ru ? 'Не выбраны' : 'None selected')),
    (ru ? 'Индивидуальная сессия с Андреем: ' : 'Personal session with Andrey: ') + personal[request.personalSession],
    ru ? 'Без оплаты и бронирования на этом шаге; детали согласуются отдельно.' : 'No payment or booking at this step; details are arranged separately.',
    '',
    ru ? 'Почему я хочу получить инициацию:' : 'Why I would like to receive this initiation:',
    request.motivation,
  ].join('\n')
}
