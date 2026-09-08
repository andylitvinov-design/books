const normalize = (value) => value.toLowerCase().replaceAll('ё', 'е').replace(/[.,;:|\s_—–-]+/g, ' ').trim()
const fieldNames = {
  potency: /^(?:potency|потенция|разведение)$/i,
  dosage: /^(?:dose|dosage|доза|дозировка)$/i,
  frequency: /^(?:frequency|частота|при[её]м)$/i,
  duration: /^(?:duration|длительность|курс)$/i,
  notes: /^(?:notes?|заметки|примечани[ея])$/i,
}
const clean = (text) => text.replace(/^[\s,;:|—–-]+|[\s,;:|—–-]+$/g, '').trim()

function recognizeName(text, remedies) {
  const normalized = normalize(text)
  const matches = remedies.flatMap((remedy) => (remedy.importNames ?? remedy.label.split(' — ')).map(normalize).filter((name) => name && (normalized === name || normalized.startsWith(name + ' '))).map((name) => ({ remedy, name })))
  const longest = Math.max(0, ...matches.map((match) => match.name.length))
  const candidates = matches.filter((match) => match.name.length === longest)
  if (new Set(candidates.map((match) => match.remedy.slug)).size !== 1) return null
  const match = candidates[0]
  // Locate the name in the original text so the remainder keeps its spelling.
  for (let end = 1; end <= text.length; end++) {
    if (normalize(text.slice(0, end)) === match.name && (end === text.length || /[.\s,;:|—–-]/.test(text[end]))) return { remedy: match.remedy, rest: clean(text.slice(end).replace(/^\.\s*/, '')) }
  }
  return null
}

function parseDetails(text, item) {
  let rest = text
  const take = (field, pattern) => {
    if (item[field]) return
    const match = rest.match(pattern)
    if (match) { item[field] = match[0].trim(); rest = rest.slice(0, match.index) + ' ' + rest.slice(match.index + match[0].length) }
  }
  // Explicit labels take precedence over inference. Values may contain spaces.
  rest = rest.replace(/(?:^|[,;|]\s*|\s+)(potency|потенция|разведение|dose|dosage|доза|дозировка|frequency|частота|при[её]м|duration|длительность|курс|notes?|заметки|примечани[ея])\s*:\s*([\s\S]*?)(?=(?:[,;|]\s*|\s+)(?:potency|потенция|разведение|dose|dosage|доза|дозировка|frequency|частота|при[её]м|duration|длительность|курс|notes?|заметки|примечани[ея])\s*:|$)/gi, (_, label, value) => {
    const field = Object.keys(fieldNames).find((key) => fieldNames[key].test(label))
    item[field] = [item[field], clean(value)].filter(Boolean).join('; ')
    return ' '
  })
  take('potency', /(?<![\p{L}\d])(?:LM\s*\/?\s*\d+|\d+\s*(?:CH|CK|DH|C|D|X|K|M|С|СН|Д))(?![\p{L}\d])/iu)
  take('frequency', /(?:\d+\s*(?:раз(?:а)?|р\.?|times?)\s*(?:в|per|a|\/)?\s*(?:день|сутки|неделю|day|week)|(?:once|twice)\s+(?:a\s+)?(?:day|week)|daily|weekly|ежедневно|однократно|каждые\s+\d+\s*час(?:а|ов)?)/iu)
  take('duration', /(?:в течение\s+|на\s+|for\s+)?\d+\s*(?:дней|дня|день|недели|недель|неделю|месяц(?:а|ев)?|days?|weeks?|months?)(?!\p{L})/iu)
  take('dosage', /(?:по\s+)?\d+(?:[.,]\d+)?\s*(?:гранул(?:ы|а)?|крупин(?:ок|ки|ка)|кап(?:ель|ли|ля)|таблет(?:ок|ки|ка)|мл|мг|pellets?|granules?|drops?|tablets?|ml|mg)(?!\p{L})/iu)
  const remaining = clean(rest.replace(/\s+/g, ' '))
  if (remaining) item.notes = [item.notes, remaining].filter(Boolean).join('; ')
  return remaining
}

export function parsePrescriptionText(source, remedies) {
  const result = { items: [], patientName: '', dateIssued: '', generalInstructions: '', warnings: [] }
  if (source.length > 30000) return { ...result, warnings: ['Текст слишком длинный. Вставьте не более 30 000 символов.'] }
  let tableColumns = null
  let generalMode = false
  for (const [index, raw] of source.split(/\r?\n/).entries()) {
    const line = raw.trim().replace(/^(?:[-*•]\s+|\d+[.)]\s+)/, '')
    if (!line) continue
    const patient = line.match(/^(?:client(?: name)?|patient(?: name)?|клиент|пациент|фио|имя)\s*:\s*(.+)$/i)
    if (patient) { result.patientName = patient[1].trim(); generalMode = false; continue }
    const date = line.match(/^(?:date|дата)\s*:\s*(.+)$/i)
    if (date) {
      const parts = date[1].trim().match(/^(\d{4})-(\d{2})-(\d{2})$|^(\d{2})\.(\d{2})\.(\d{4})$/)
      const iso = parts && (parts[1] ? parts[0] : `${parts[6]}-${parts[5]}-${parts[4]}`)
      if (iso && !Number.isNaN(Date.parse(iso)) && new Date(iso).toISOString().slice(0, 10) === iso) result.dateIssued = iso
      else result.warnings.push(`Строка ${index + 1}: дата не распознана — ${date[1]}`)
      continue
    }
    const general = line.match(/^(?:general instructions|instructions|общие (?:инструкции|рекомендации)|рекомендации)\s*:\s*(.*)$/i)
    if (general) { result.generalInstructions += (result.generalInstructions ? '\n' : '') + general[1]; generalMode = true; continue }
    const cells = raw.includes('\t') ? raw.split('\t').map((cell) => cell.trim()) : line.includes('|') ? line.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim()) : null
    if (cells && /^(?:remedy|препарат|средство)$/i.test(cells[0])) {
      tableColumns = cells.map((cell, i) => i === 0 ? 'remedy' : Object.keys(fieldNames).find((key) => fieldNames[key].test(cell)) ?? 'notes')
      continue
    }
    if (cells?.every((cell) => /^:?-+:?$/.test(cell))) continue
    const match = recognizeName(cells ? cells[0] : line, remedies)
    if (match) {
      generalMode = false
      const item = { remedySlug: match.remedy.slug, query: match.remedy.label, potency: '', dosage: '', frequency: '', duration: '', notes: '', instructions: '', displayNameOverride: '' }
      let residual = ''
      if (cells) {
        const mapping = tableColumns ?? ['remedy', 'potency', 'dosage', 'frequency', 'duration', 'notes']
        cells.slice(1).forEach((cell, i) => { const key = mapping[i + 1] ?? 'notes'; item[key] = [item[key], cell].filter(Boolean).join('; ') })
        if (match.rest) residual = parseDetails(match.rest, item)
      } else residual = parseDetails(match.rest, item)
      if (residual) result.warnings.push(`Строка ${index + 1}: проверьте остаток текста в Notes — ${residual}`)
      result.items.push(item)
    } else if (generalMode) result.generalInstructions += '\n' + line
    else if (result.items.length && /^(?:potency|потенция|разведение|dose|dosage|доза|дозировка|frequency|частота|duration|длительность|курс|notes?|заметки|примечание)\s*:/i.test(line)) {
      parseDetails(line, result.items.at(-1))
    } else result.warnings.push(`Строка ${index + 1} не распознана: ${line}`)
  }
  return result
}
