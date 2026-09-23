import { parsePrescriptionText } from '../prescriptions/text-import.js'

const cleanLine = (value) => value.trim().replace(/^(?:[-*•]\s+|\d+[.)]\s+)/, '').trim()

function bachLine(line) {
  const explicit = line.match(/^(?:bach(?:\s+(?:essence|flower))?|бах|эссенци[яи](?:\s+баха)?|essence)\s*[:—–-]\s*(.+)$/i)
    ?? line.match(/^(?:bach|бах)\s+(.+)$/i)
  return explicit?.[1]?.trim()
}

function isBachHeader(line) {
  return /^(?:bach(?:\s+(?:flower\s+)?essences?)?|бах|эссенции\s+баха)\s*:??$/i.test(line)
}

function isHomeopathyHeader(line) {
  return /^(?:homeopathy|гомеопатия)\s*:??$/i.test(line)
}

function isMetaLine(line) {
  return /^(?:client(?: name)?|patient(?: name)?|клиент|пациент|фио|имя|date|дата|general instructions|instructions|общие (?:инструкции|рекомендации)|рекомендации)\s*:/i.test(line)
}

function numericFrom(value, pattern) {
  const match = String(value ?? '').match(pattern)
  return match?.[1] ?? ''
}

function normalizePotency(value) {
  const text = String(value ?? '').trim()
  if (!text) return '30'
  const plain = text.match(/^(\d{1,4})$/)
  return plain ? plain[1] : text
}

function homeopathyItem(item) {
  const granules = numericFrom(item.dosage, /(?:по\s*)?(\d{1,2})\s*(?:гранул|granules?|pellets?)/i)
  const timesPerDay = numericFrom(item.frequency, /(\d{1,2})\s*(?:раз|times?)/i)
  return {
    ...item,
    itemType: 'homeopathy',
    selected: true,
    potency: normalizePotency(item.potency),
    granules: granules || '5',
    timesPerDay: timesPerDay || '3',
    dosage: '',
    frequency: '',
  }
}

function bachItem(name) {
  return {
    itemType: 'bach',
    selected: true,
    remedySlug: null,
    displayNameOverride: name,
    sourceStatus: 'custom',
    query: name,
    potency: '',
    granules: '',
    timesPerDay: '',
    dosage: '',
    frequency: '',
    duration: '',
    purpose: '',
    sequence: '',
    instructions: '',
  }
}

export function inferParsedRecommendationType(items = []) {
  const types = new Set(items.map((item) => item.itemType).filter(Boolean))
  if (types.has('homeopathy') && types.has('bach')) return 'mixed'
  if (types.has('bach')) return 'bach'
  return 'homeopathy'
}

export function parseConsultationText(source, remedies) {
  const lines = String(source ?? '').split(/\r?\n/)
  const passthrough = []
  const bachItems = []
  let section = null

  for (const raw of lines) {
    const line = cleanLine(raw)
    if (!line) { passthrough.push(''); continue }
    if (isBachHeader(line)) { section = 'bach'; passthrough.push(''); continue }
    if (isHomeopathyHeader(line)) { section = 'homeopathy'; passthrough.push(''); continue }

    const explicitBach = bachLine(line)
    if (explicitBach) {
      bachItems.push(bachItem(explicitBach))
      passthrough.push('')
      continue
    }

    if (section === 'bach' && !isMetaLine(line)) {
      bachItems.push(bachItem(line))
      passthrough.push('')
      continue
    }

    passthrough.push(raw)
  }

  const parsed = parsePrescriptionText(passthrough.join('\n'), remedies)
  const items = [...parsed.items.map(homeopathyItem), ...bachItems]
  return {
    ...parsed,
    items,
    recommendationType: inferParsedRecommendationType(items),
  }
}
