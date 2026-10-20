import { organicEventLandingUrl } from '../organic-event-referrals.js'

export const ACQUISITION_TIME_ZONE = 'America/Toronto'
export const ACQUISITION_SOURCES = Object.freeze([
  ['eventbrite', 'Eventbrite'], ['meetup', 'Meetup'], ['google_business', 'Google Business'],
  ['allevents', 'AllEvents'], ['luma', 'Luma'], ['instagram', 'Instagram'],
  ['facebook', 'Facebook'], ['youtube', 'YouTube'], ['telegram', 'Telegram'],
  ['partner', 'Partner'], ['humanitix', 'Humanitix'], ['tickettailor', 'Ticket Tailor'],
])
export const COUNTER_KEYS = Object.freeze(['impressions', 'orderClicks', 'whatsappClicks', 'telegramClicks'])
export const UNMEASURED_STAGES = Object.freeze([
  'listing', 'registration', 'landing', 'confirmedInquiry', 'paidOrder', 'completedPaidSession', 'revenue', 'conversionRate',
])

export function acquisitionDateRange(period = 7, now = new Date()) {
  const days = [1, 7, 30].includes(Number(period)) ? Number(period) : 7
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new TypeError('INVALID_REPORT_DATE')
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: ACQUISITION_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now).map(part => [part.type, part.value]))
  // Subtract calendar dates, not 24-hour durations across Toronto DST changes.
  const today = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day))
  const date = offset => new Date(today - offset * 86400000).toISOString().slice(0, 10)
  return { days, start: date(days), end: date(1), timeZone: ACQUISITION_TIME_ZONE }
}

function count(value) {
  if (!(typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value)))) throw new TypeError('INVALID_AGGREGATE')
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number < 0) throw new TypeError('INVALID_AGGREGATE')
  return number
}

/** Only the existing daily counter contract is accepted, never individual records. */
export function summarizeAcquisitionCounters(rows, range) {
  if (!Array.isArray(rows)) throw new TypeError('INVALID_AGGREGATE')
  const totals = Object.fromEntries(COUNTER_KEYS.map(key => [key, 0]))
  const observedDates = new Set()
  for (const row of rows) {
    if (!row || Object.keys(row).some(key => !['day', ...COUNTER_KEYS].includes(key))
      || !/^\d{4}-\d{2}-\d{2}$/.test(row.day) || row.day < range.start || row.day > range.end
      || observedDates.has(row.day)) throw new TypeError('INVALID_AGGREGATE')
    observedDates.add(row.day)
    for (const key of COUNTER_KEYS) totals[key] = count(totals[key] + count(row[key]))
  }
  return {
    status: rows.length ? 'observed' : 'no_observations',
    // A successful read without records does not establish measurement coverage.
    totals: rows.length ? totals : null,
    observedDays: observedDates.size,
    firstObservedDay: [...observedDates].sort()[0] ?? null,
    lastObservedDay: [...observedDates].sort().at(-1) ?? null,
  }
}

export async function loadAcquisitionReport({ authorize, readDaily, period = 7, now = new Date() }) {
  // Authorization happens before configuration, database access or data generation.
  if (!await authorize()) return { status: 'forbidden' }
  const range = acquisitionDateRange(period, now)
  const unavailable = Object.fromEntries(UNMEASURED_STAGES.map(key => [key, { status: 'not_measured', value: null }]))
  let counters
  try { counters = summarizeAcquisitionCounters(await readDaily(range), range) }
  catch { counters = { status: 'unavailable', totals: null, observedDays: null } }
  return {
    status: 'ready', range, counters, stages: unavailable,
    attribution: { status: 'not_measured', source: null, campaign: null, language: null },
  }
}

export function acquisitionRecommendation(report) {
  if (report?.counters?.status !== 'observed') return 'measurement_unavailable'
  const counts = report.counters.totals
  if (counts.whatsappClicks + counts.telegramClicks > 0) return 'confirm_receipts'
  if (counts.orderClicks > 0) return 'check_handoff'
  if (counts.impressions > 0) return 'review_cta'
  return 'no_activity'
}

/** Local-only link drafting. A slug is a PUBLIC campaign name, never a person or request. */
export function campaignLandingLinks({ source, campaign, locale = 'en' } = {}) {
  if (!ACQUISITION_SOURCES.some(([id]) => id === source) || !['en', 'ru', 'es'].includes(locale)
    || typeof campaign !== 'string' || !/^[a-z][a-z0-9_-]{2,63}$/.test(campaign)
    || /\d{7,}/.test(campaign) || /(?:^|[-_])(?:email|phone|client|patient|diagnosis|symptom|token|secret|password)(?:[-_]|$)/.test(campaign)) {
    throw new TypeError('INVALID_PUBLIC_CAMPAIGN')
  }
  return ['free-situation-review', 'andy-litvinov/free-wu-xing-diagnostic'].map(destination =>
    organicEventLandingUrl(`/${locale}/services/${destination}`, { source, campaign, content: 'listing' }))
}
