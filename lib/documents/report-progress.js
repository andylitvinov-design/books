// Two-point factual self-rating for the client report's first screen.
// Planned goals (if present in practitioner notes) stay in the written analysis,
// never as a third measured result or an implied treatment outcome.
export function extractReportProgress(analysis) {
  const found = {}
  for (const raw of String(analysis ?? '').split(/\r?\n/)) {
    const line = raw.trim()
    const score = line.match(/(?:^|\s)(10|[0-9](?:[.,][0-9]+)?)\s*\/\s*10(?!\d)/u)
    if (!score) continue
    const value = Number(score[1].replace(',', '.'))
    if (!Number.isFinite(value) || value < 0 || value > 10) continue
    if (/^(?:(?:было|начало|в начале|до(?: сессии| консультации| курса)?)\s*[:—–-]|(?:before(?: the)?(?: session| consultation| course)?|start|at (?:the )?start)\s*[:—–-])/i.test(line)) {
      found.before = value
    } else if (/^(?:(?:стало|после(?: сессии| консультации| курса)?|конец|в конце|итог)\s*[:—–-]|(?:after(?: the)?(?: session| consultation| course)?|end|at (?:the )?end)\s*[:—–-])/i.test(line)) {
      found.after = value
    }
  }
  if (!Number.isFinite(found.before) || !Number.isFinite(found.after)) return null
  return { before: found.before, after: found.after }
}

// Structured ratings take priority over phrases in the practitioner narrative.
// Legacy reports without saved score fields continue to display their historic rings.
export function parseReportProgressScore(value) {
  if (value == null || String(value).trim() === '') return null
  const normalized = String(value).trim().replace(',', '.')
  if (!/^(?:10(?:\.0)?|[0-9](?:\.[0-9])?)$/.test(normalized)) throw new Error('INVALID_REPORT_PROGRESS_SCORE')
  return Number(normalized)
}

export function resolveReportProgress(document) {
  if (!document) return null
  if (document.progressBefore !== undefined || document.progressAfter !== undefined) {
    try {
      const before = parseReportProgressScore(document.progressBefore)
      const after = parseReportProgressScore(document.progressAfter)
      return before !== null && after !== null ? { before, after } : null
    } catch {
      return null
    }
  }
  return extractReportProgress(document.analysis)
}
