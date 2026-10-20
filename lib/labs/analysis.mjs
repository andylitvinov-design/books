// Holistic House laboratory-result education v1.
// Deterministic range comparisons only: never invent reference intervals or diagnoses.
export const LAB_REPORT_VERSION = 1
export const LAB_MAX_MARKERS = 100
const FORMATS = new Set(['csv', 'tsv', 'txt', 'manual'])
const NUMBER = /^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/
const MAX_TEXT = 64000

export function parseLabNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const text = String(value ?? '').trim().replace(/\u2212/g, '-')
  if (!NUMBER.test(text)) return null
  const number = Number(text.replace(',', '.'))
  return Number.isFinite(number) ? number : null
}
function optionalNumber(value) {
  if (value === null || value === undefined || String(value).trim() === '') return { valid: true, value: null }
  const number = parseLabNumber(value)
  return { valid: number !== null, value: number }
}
export function normalizeLabMarker(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const name = String(value.name ?? '').trim().replace(/\s+/g, ' ')
  const unit = String(value.unit ?? '').trim().replace(/\s+/g, ' ')
  const amount = parseLabNumber(value.value)
  const lower = optionalNumber(value.lower), upper = optionalNumber(value.upper)
  if (name.length < 2 || name.length > 90 || /[<>\u0000-\u001f]/.test(name) ||
      unit.length > 36 || /[<>\u0000-\u001f]/.test(unit) ||
      amount === null || !lower.valid || !upper.valid ||
      (lower.value !== null && upper.value !== null && lower.value >= upper.value) ||
      (value.critical !== undefined && typeof value.critical !== 'boolean')) return null
  return { name, value: amount, unit, lower: lower.value, upper: upper.value, critical: value.critical === true }
}
export function labRangeStatus(marker) {
  const entry = normalizeLabMarker(marker)
  if (!entry) return 'invalid'
  if (entry.lower !== null && entry.value < entry.lower) return 'low'
  if (entry.upper !== null && entry.value > entry.upper) return 'high'
  // A one-sided boundary does NOT establish a normal range.
  if (entry.lower === null || entry.upper === null) return 'unrated'
  return 'within'
}
const labels = {
  iron: { en: 'Blood count / iron markers', ru: 'Показатели крови и железа' },
  metabolic: { en: 'Glucose regulation', ru: 'Регуляция глюкозы' },
  lipids: { en: 'Lipid profile', ru: 'Липидный профиль' },
  thyroid: { en: 'Thyroid markers', ru: 'Показатели щитовидной железы' },
  nutrients: { en: 'Vitamin / nutrient markers', ru: 'Показатели витаминов и нутриентов' },
  organs: { en: 'Kidney, liver or electrolyte markers', ru: 'Почки, печень или электролиты' },
  other: { en: 'Other laboratory indicators', ru: 'Другие лабораторные показатели' },
}
export function labFocus(markerName) {
  const text = String(markerName ?? '').toLowerCase().replace(/\s+/g, ' ')
  if (/ferritin|hemoglobin|haemoglobin|\bhgb\b|\bmcv\b|transferrin|ферритин|гемоглобин|желез[оа]|эритроцит/.test(text)) return 'iron'
  if (/hba1c|a1c|glucose|insulin|глюкоз|гликирован|инсулин/.test(text)) return 'metabolic'
  if (/cholesterol|triglycer|\bhdl\b|\bldl\b|холестерин|триглицерид|липопротеин/.test(text)) return 'lipids'
  if (/\btsh\b|thyroid|thyrox|\bft4\b|\bft3\b|тиреотроп|тироксин|щитовид/.test(text)) return 'thyroid'
  if (/vitamin|\bb12\b|folate|folic|25.oh.d|витамин|фолиев|кобаламин/.test(text)) return 'nutrients'
  if (/creatinin|\begfr\b|urea|\balt\b|\bast\b|bilirubin|potassium|sodium|креатинин|мочевин|натрий|калий|билирубин|печен/.test(text)) return 'organs'
  return 'other'
}
export function labMarkerKey(name) {
  return String(name || '').trim().toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu, '')
}
export function buildLabReview(markers = [], locale = 'en') {
  const ru = locale === 'ru'
  const checked = (Array.isArray(markers) ? markers : []).map(normalizeLabMarker).filter(Boolean)
  const entries = checked.map(marker => ({ ...marker, status: labRangeStatus(marker), focus: labFocus(marker.name) }))
  const abnormal = entries.filter(marker => marker.status === 'low' || marker.status === 'high')
  const uncertain = entries.filter(marker => marker.status === 'unrated')
  const critical = entries.filter(marker => marker.critical)
  const focusIds = [...new Set(abnormal.map(marker => marker.focus))]
  const focus = focusIds.map(id => ({ id, label: labels[id][ru ? 'ru' : 'en'] }))
  const steps = [
    [ru ? 'Сверить результаты' : 'Verify the values', ru ? 'Сравните каждый показатель, единицу и референсный интервал с оригиналом. Если данных не хватает, уточните их в лаборатории.' : 'Compare each value, unit and reference interval with the original report. Ask the laboratory about missing details.'],
    [ru ? 'Собрать динамику' : 'Collect past results', ru ? 'Найдите предыдущие анализы и даты, не сравнивайте цифры в разных единицах.' : 'Gather dated earlier results. Do not compare numerical values measured in different units.'],
    [ru ? 'Записать контекст' : 'Record the context', ru ? 'Подготовьте для врача список симптомов, лекарств, добавок и изменений самочувствия.' : 'Prepare a list of symptoms, medicines, supplements and recent changes for your clinician.'],
    [ru ? 'Подготовить вопросы' : 'Prepare questions', ru ? 'Спросите, какие отклонения важны в вашем случае и нужны ли подтверждающие исследования.' : 'Ask which findings matter for your circumstances and whether follow-up testing is needed.'],
    [ru ? 'Проверить привычки' : 'Review daily routines', ru ? 'Оцените сон, регулярность питания, движение и стресс без резких перемен и самолечения.' : 'Review sleep, regular meals, movement and stress without abrupt changes or self-treatment.'],
    [ru ? 'Обсудить с врачом' : 'Speak with a clinician', ru ? 'Покажите исходный документ врачу, согласуйте дальнейшие действия и сроки контроля.' : 'Share the original laboratory report and agree on next steps and any retesting interval with a clinician.'],
    [ru ? 'Зафиксировать следующий шаг' : 'Record the next step', ru ? 'Отметьте согласованные действия и дату дальнейшего наблюдения, если она назначена.' : 'Record agreed actions and any clinician-recommended follow-up date.'],
  ]
  return {
    entries, abnormal, uncertain, critical, focus,
    steps: steps.map(([title, detail], index) => ({ day: index + 1, title, detail })),
    urgency: critical.length ? 'lab-flag' : abnormal.length ? 'review' : 'routine',
  }
}
function splitFields(line, delimiter) {
  const fields = []; let part = '', quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { part += '"'; i++ } else quoted = !quoted
    } else if (ch === delimiter && !quoted) { fields.push(part.trim()); part = '' }
    else part += ch
  }
  fields.push(part.trim())
  return fields
}
function headerKey(value) { return String(value || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '') }
const HEADERS = {
  name: ['name','test','analyte','analyte name','marker','parameter','показатель','исследование','анализ','название'],
  value: ['value','result','measurement','значение','результат','число'],
  unit: ['unit','units','единица','единицы','едизм','единицыизмерения'],
  lower: ['low','lower','minimum','min','lower limit','нижняя','минимум','от'],
  upper: ['high','upper','maximum','max','upper limit','верхняя','максимум','до'],
  range: ['range','reference','reference range','ref range','normal range','норма','референс','референсныезначения'],
}
function parseRange(value) {
  const match = String(value || '').trim().match(/^\s*([+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+))\s*(?:-|–|—|…|\.\.|to|до)\s*([+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+))\s*$/i)
  return match ? [match[1], match[2]] : [null, null]
}
export function parseLabText(raw) {
  const source = String(raw ?? '').slice(0, MAX_TEXT)
  const lines = source.split(/\r?\n/).map(line => line.trim()).filter(Boolean).slice(0, 240)
  const result = []; let skipped = 0, header = null, separator = null
  for (const line of lines) {
    if (result.length >= LAB_MAX_MARKERS) break
    const delimiter = line.includes('\t') ? '\t' : line.includes(';') ? ';' : line.includes('|') ? '|' : line.includes(',') && !/\d,\d/.test(line) ? ',' : null
    let marker = null
    if (delimiter) {
      const fields = splitFields(line, delimiter)
      if (!header) {
        const keys = fields.map(headerKey)
        const positions = Object.fromEntries(Object.entries(HEADERS).map(([name, aliases]) =>
          [name, keys.findIndex(value => aliases.some(alias => headerKey(alias) === value))]))
        if (positions.name >= 0 && positions.value >= 0) {
          header = positions; separator = delimiter; continue
        }
      }
      const columns = separator && header ? splitFields(line, separator) : fields
      if (header) {
        const get = key => header[key] >= 0 ? columns[header[key]] : ''
        let [lower, upper] = parseRange(get('range'))
        lower = get('lower') || lower; upper = get('upper') || upper
        marker = normalizeLabMarker({ name: get('name'), value: get('value'), unit: get('unit'), lower, upper })
      } else if (columns.length >= 4) {
        marker = normalizeLabMarker({ name: columns[0], value: columns[1], unit: columns[2], lower: columns[3], upper: columns[4] ?? '' })
      }
    }
    if (!marker) {
      const match = line.match(/^(.{2,90}?)\s*[:：]\s*([+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+))\s*([^\d\[\]()]{0,36}?)\s*[([]?\s*([+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+))\s*(?:-|–|—|…|\.\.|to|до)\s*([+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+))/i)
      if (match) marker = normalizeLabMarker({ name: match[1], value: match[2], unit: match[3], lower: match[4], upper: match[5] })
    }
    if (marker) result.push(marker); else skipped++
  }
  return { markers: result, skipped, truncated: source.length >= MAX_TEXT || lines.length >= 240 }
}
export function normalizeLabReport(input, now = Date.now()) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || input.version !== LAB_REPORT_VERSION ||
      input.confirmed !== true || !FORMATS.has(input.sourceFormat) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(input.measuredOn || '') ||
      !Array.isArray(input.markers) || input.markers.length < 1 || input.markers.length > LAB_MAX_MARKERS) return null
  const day = new Date(input.measuredOn + 'T12:00:00Z')
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== input.measuredOn ||
      day.getTime() < Date.UTC(1990,0,1) || day.getTime() > now + 86400000) return null
  const labName = String(input.labName ?? '').trim().replace(/\s+/g, ' ')
  if (labName.length > 80 || /[<>\u0000-\u001f]/.test(labName)) return null
  const markers = input.markers.map(normalizeLabMarker)
  if (markers.some(marker => !marker)) return null
  return { version: LAB_REPORT_VERSION, labName, measuredOn: input.measuredOn, sourceFormat: input.sourceFormat, markers }
}
