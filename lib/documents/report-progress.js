// The visual summary is a faithful projection of explicitly recorded /10 values.
// Never infer clinical improvement or manufacture scores from freeform notes.
export function extractReportProgress(analysis) {
  const found = {}
  for (const raw of String(analysis ?? '').split(/\r?\n/)) {
    const line = raw.trim()
    const score = line.match(/(?:^|\s)(10|[0-9](?:[.,][0-9]+)?)\s*\/\s*10(?!\d)/u)
    if (!score) continue
    const value = Number(score[1].replace(',', '.'))
    if (!Number.isFinite(value) || value < 0 || value > 10) continue
    if (/^(?:было\s*[:—-]|до (?:сессии|консультации)\s*[:—-]|before (?:the )?(?:session|consultation)\s*:)/i.test(line)) found.before = value
    else if (/^(?:после (?:сессии|консультации)\s*[:—-]|after (?:the )?(?:session|consultation)\s*:)/i.test(line)) found.after = value
    else if (/^(?:при[её]м препаратов должен\s|цель\s*[:—-]|планируемая цель\s*[:—-]|ожидаемый уровень\s*[:—-]|target\b|planned goal\b)/i.test(line)) found.target = value
  }
  if (!Number.isFinite(found.before) || !Number.isFinite(found.after)) return null
  return { before: found.before, after: found.after, ...(Number.isFinite(found.target) ? { target: found.target } : {}) }
}
