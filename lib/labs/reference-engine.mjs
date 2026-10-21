// Offline, deterministic reference-catalog tools. No network, identifiers, AI providers or writes.
// Numerical examples belong to the named SOURCE laboratory, not to an arbitrary patient's lab.
import { LAB_ANALYTES, LAB_EDUCATIONAL_INTERVALS, LAB_REFERENCE_SOURCES } from './reference-catalog.mjs'

export function normalizeAnalyteName(raw) {
  return String(raw ?? '').normalize('NFKD').toLocaleLowerCase('en')
    .replace(/[\u0300-\u036f]/g, '').replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}]+/gu, '')
}

const aliasIndex = new Map()
const analyteIndex = new Map(LAB_ANALYTES.map(marker => [marker.id, marker]))
for (const marker of LAB_ANALYTES) {
  for (const title of [...Object.values(marker.names), ...marker.aliases]) {
    const token = normalizeAnalyteName(title)
    if (!token) continue
    const hits = aliasIndex.get(token) || new Set()
    hits.add(marker.id)
    aliasIndex.set(token, hits)
  }
}
export function findLabAnalyte(name) {
  const token = normalizeAnalyteName(name)
  // Single-character codes ("K", "P") are unsafe without specimen and lab context.
  if (token.length < 2) return { status: 'unknown' }
  const matches = [...(aliasIndex.get(token) || [])]
  if (matches.length > 1) return { status: 'ambiguous', candidateIds: matches }
  if (!matches.length) return { status: 'unknown' }
  const marker = analyteIndex.get(matches[0])
  return { status: 'matched', analyteId: marker.id, group: marker.group, specimen: marker.specimen,
    names: marker.names, expectedUnit: marker.unit }
}
export function groupLabMarkers(rows = []) {
  if (!Array.isArray(rows)) return { recognized: [], needsReview: [], groups: {} }
  const recognized = [], needsReview = [], groups = {}
  for (const row of rows) {
    const hit = findLabAnalyte(row?.name)
    if (hit.status !== 'matched') { needsReview.push({ name: String(row?.name ?? '').slice(0, 90), reason: hit.status }); continue }
    const item = { originalName: String(row.name).slice(0, 90), analyteId: hit.analyteId, group: hit.group }
    recognized.push(item)
    ;(groups[hit.group] ||= []).push(item)
  }
  return { recognized, needsReview, groups }
}
function parseISODate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [y,m,d] = value.split('-').map(Number)
  const utc = Date.UTC(y, m-1, d)
  const date = new Date(utc)
  return date.getUTCFullYear() === y && date.getUTCMonth() === m-1 && date.getUTCDate() === d
    ? { y,m,d,utc } : null
}
// Compute locally from DOB and sample date. Do not transmit or persist the DOB.
export function ageAtSample(birthDate, sampleDate) {
  const birth = parseISODate(birthDate), sample = parseISODate(sampleDate)
  if (!birth || !sample || birth.utc > sample.utc) return null
  const days = (sample.utc - birth.utc) / 86400000
  // Completed calendar months, not average 30-day months. Day-based neonatal ranges
  // take priority where relevant (31-day/newborn cutoff).
  let months = (sample.y-birth.y)*12 + sample.m-birth.m
  if (sample.d < birth.d) months -= 1
  return { days, months: Math.max(0, months) }
}
function matchesAge(row, age) {
  if (!age || !Number.isInteger(age.days) || !Number.isInteger(age.months) || age.days < 0 || age.months < 0) return false
  // Some source ranges explicitly distinguish 0-14 or 0-30 days.
  if (row.maxDaysExclusive !== null) return age.days >= (row.minDays ?? 0) && age.days < row.maxDaysExclusive
  return (row.minDays === null || age.days >= row.minDays) &&
    age.months >= row.minMonths && (row.maxMonthsExclusive === null || age.months < row.maxMonthsExclusive)
}
function cleanUnit(value) {
  return String(value ?? '').normalize('NFKC').trim().toLowerCase()
    .replace(/[µμ]/g,'u').replace(/\s+/g,'').replace(/³/g,'3').replace(/²/g,'2')
}
const sourceUnitConversions = Object.freeze({
  hemoglobin: { 'g/dl':1, 'g/l':10 },
  hematocrit: { '%':1 },
  rbc: { '10^12/l':1, 'x10^12/l':1, 'million/mm3':1, 'millions/mm3':1, '10^6/ul':1 },
  wbc: { '10^9/l':1, 'x10^9/l':1, 'k/mm3':1, '10^3/ul':1 },
  platelets: { '10^9/l':1, 'x10^9/l':1, 'k/mm3':1 },
  mcv: { fl:1, femtoliters:1, femtoliter:1 },
  alp: { 'u/l':1, 'iu/l':1 },
  tsh: { 'miu/l':1, 'uiu/ml':1 },
  creatinine: { 'mg/dl':1, 'umol/l':88.4 },
  ferritin: { 'ng/ml':1, 'ug/l':1 },
})
function rounded(value) { return Number(value.toPrecision(8)) }
export function educationalLabReference(input = {}) {
  if (!input || typeof input !== 'object') return { status:'unavailable', reason:'invalid-input' }
  const hit = input.analyteId
    ? (analyteIndex.has(input.analyteId) ? { status:'matched', analyteId:input.analyteId } : { status:'unknown' })
    : findLabAnalyte(input.name)
  if (hit.status !== 'matched') return { status:'unavailable', reason:hit.status === 'ambiguous' ? 'ambiguous-name':'unknown-name' }
  const sourceRows = LAB_EDUCATIONAL_INTERVALS.filter(entry => entry.analyteId === hit.analyteId)
  if (!sourceRows.length) return { status:'unavailable', reason:'no-reviewed-source-example', analyteId:hit.analyteId }
  if (input.pregnant === true) return { status:'unavailable', reason:'pregnancy-requires-lab-context' }
  const age = input.age || ageAtSample(input.birthDate,input.sampleDate)
  if (!age || !Number.isInteger(age.days) || !Number.isInteger(age.months)) return { status:'unavailable', reason:'age-required' }
  if (input.preterm === true && age.months < 12) return { status:'unavailable', reason:'preterm-infant-requires-lab-context' }
  if (!['male','female','unspecified'].includes(input.sex)) return { status:'unavailable', reason:'sex-context-required' }
  const matching = sourceRows.filter(row => matchesAge(row,age) && (row.sex === 'any' || row.sex === input.sex))
  if (!matching.length) return { status:'unavailable', reason:'age-or-sex-range-not-available' }
  if (matching.length !== 1) return { status:'unavailable', reason:'conflicting-source-intervals' }
  const interval = matching[0], source = LAB_REFERENCE_SOURCES[interval.sourceId]
  // Source-assay specimen overrides the broad catalog's display specimen (e.g. plasma vs serum).
  const expectedSpecimen = source.specimenKey || analyteIndex.get(hit.analyteId)?.specimen
  if (input.specimen !== expectedSpecimen) return { status:'unavailable', reason:'specimen-unverified' }
  const conversions = sourceUnitConversions[hit.analyteId] || {}
  const factor = conversions[cleanUnit(input.unit)]
  if (!factor) return { status:'unavailable', reason:'unit-unverified' }
  // Conversion affects display ONLY, never patient status or stored patient ranges.
  return { status:'educational-example', mayClassifyPatient:false, analyteId:hit.analyteId,
    low:rounded(interval.low*factor), high:rounded(interval.high*factor), unit:input.unit,
    sourceId:interval.sourceId, sourceUrl:source.url, sourceLaboratory:source.institution,
    sourceMethod:source.method, sourceSpecimen:source.specimen, catalogAge:age,
    note:'Source-specific reference example only. Use the exact laboratory report limits for clinical interpretation.' }
}
