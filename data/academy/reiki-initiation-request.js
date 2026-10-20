// A compact versioned answer stored under the existing encrypted end-01 journal key.
// No new public endpoint, client-side storage or database migration is required.
export const REIKI_REQUEST_PREFIX = 'hh-reiki-personal-request-v1:'
export const REIKI_INITIATION_IDS = Object.freeze(['tantra', 'kundalini', 'yggdrasil'])
export const REIKI_INITIATION_NAMES = Object.freeze({
  tantra: 'Tantra Reiki',
  kundalini: 'Kundalini Reiki',
  yggdrasil: 'Reiki Yggdrasil',
})

const blank = () => ({
  firstName: '', lastName: '', location: '', timezone: '',
  preferredTime: '', freeInitiation: '', donationInitiations: [], motivation: '',
})
const text = (value, max) => typeof value === 'string' ? value.slice(0, max) : ''
const ids = (value) => Array.isArray(value)
  ? [...new Set(value.filter((id) => REIKI_INITIATION_IDS.includes(id)))].slice(0, 2)
  : []

// Legacy free-text initiation letters reopen with their motivation intact.
export function readReikiInitiationRequest(raw) {
  if (typeof raw !== 'string') return blank()
  if (!raw.startsWith(REIKI_REQUEST_PREFIX))
    return { ...blank(), motivation: text(raw, 700) }
  try {
    const value = JSON.parse(raw.slice(REIKI_REQUEST_PREFIX.length))
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
    }
  } catch {
    return blank()
  }
}

export function writeReikiInitiationRequest(value) {
  const request = readReikiInitiationRequest(REIKI_REQUEST_PREFIX + JSON.stringify(value))
  return REIKI_REQUEST_PREFIX + JSON.stringify(request)
}

export function reikiInitiationRequestValid(raw) {
  if (typeof raw !== 'string' || !raw.startsWith(REIKI_REQUEST_PREFIX) || raw.length > 1600) return false
  const request = readReikiInitiationRequest(raw)
  if (writeReikiInitiationRequest(request) !== raw) return false
  return Boolean(
    request.firstName.trim().length >= 2 &&
    request.lastName.trim().length >= 2 &&
    request.location.trim().length >= 2 &&
    request.timezone.trim().length >= 2 &&
    request.preferredTime.trim().length >= 3 &&
    request.motivation.trim().length >= 20 &&
    REIKI_INITIATION_IDS.includes(request.freeInitiation) &&
    request.donationInitiations.every((id) => id !== request.freeInitiation),
  )
}

export function formatReikiInitiationRequest(raw, locale = 'en') {
  if (typeof raw !== 'string' || !raw.startsWith(REIKI_REQUEST_PREFIX)) return text(raw, 1600)
  const request = readReikiInitiationRequest(raw)
  const ru = locale === 'ru'
  const choice = (id) => REIKI_INITIATION_NAMES[id] || (ru ? 'Не выбрана' : 'Not selected')
  return [
    ru ? 'Заявка на личную Рейки-инициацию' : 'Personal Reiki initiation request',
    (ru ? 'Имя: ' : 'First name: ') + request.firstName,
    (ru ? 'Фамилия: ' : 'Last name: ') + request.lastName,
    (ru ? 'Город, страна: ' : 'City, country: ') + request.location,
    (ru ? 'Часовой пояс: ' : 'Time zone: ') + request.timezone,
    (ru ? 'Удобное время для согласования в чате: ' : 'Preferred time to arrange in chat: ') + request.preferredTime,
    (ru ? 'Бесплатная инициация: ' : 'Free initiation: ') + choice(request.freeInitiation),
    (ru ? 'Дополнительно за донейшн: ' : 'Additional initiations by donation: ') +
      (request.donationInitiations.map(choice).join(', ') || (ru ? 'Не выбраны' : 'None selected')),
    '',
    ru ? 'Почему я хочу получить инициацию:' : 'Why I would like to receive this initiation:',
    request.motivation,
  ].join('\n')
}
