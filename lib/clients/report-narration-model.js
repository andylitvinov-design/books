// Pure, deterministic splitting of the practitioner's approved analysis.
// No client-supplied text is ever accepted by the synthesis endpoint.
export const NARRATION_PART_CHARS = 3000
export const NARRATION_TOTAL_CHARS = 20000
export const NARRATION_MAX_PARTS = 8

export function splitApprovedAnalysis(value, maxChars = NARRATION_PART_CHARS) {
  if (typeof value !== 'string' || !Number.isInteger(maxChars) || maxChars < 500 || maxChars > 5000) return []
  let remaining = value.trim()
  if (!remaining || remaining.length > NARRATION_TOTAL_CHARS) return []
  const parts = []
  while (remaining.length > maxChars) {
    const candidate = remaining.slice(0, maxChars + 1)
    const boundaries = [candidate.lastIndexOf('\n'), candidate.lastIndexOf('. '),
      candidate.lastIndexOf('! '), candidate.lastIndexOf('? '), candidate.lastIndexOf(' ')]
    let cut = Math.max(...boundaries)
    if (cut < Math.floor(maxChars / 2)) cut = maxChars
    else if (['.', '!', '?'].includes(remaining[cut])) cut += 1
    const part = remaining.slice(0, cut).trim()
    if (!part) return []
    parts.push(part)
    remaining = remaining.slice(cut).trimStart()
    if (parts.length >= NARRATION_MAX_PARTS) return []
  }
  if (remaining) parts.push(remaining)
  return parts.length <= NARRATION_MAX_PARTS ? parts : []
}

export const REPORT_NARRATION_SCOPES = Object.freeze([
  'guest-session', 'cabinet-session', 'saved-session',
  'legacy-document', 'cabinet-document', 'saved-document',
])

const SCOPE_KEYS = Object.freeze({
  'guest-session': ['locale', 'part', 'scope', 'selector'],
  'cabinet-session': ['locale', 'part', 'scope', 'selector', 'sessionId'],
  'saved-session': ['id', 'locale', 'part', 'scope'],
  'legacy-document': ['locale', 'part', 'scope', 'selector'],
  'cabinet-document': ['id', 'locale', 'part', 'scope', 'selector'],
  'saved-document': ['id', 'locale', 'part', 'scope'],
})

export function validNarrationRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)
    || !REPORT_NARRATION_SCOPES.includes(body.scope)
    || !['ru', 'en'].includes(body.locale)
    || !Number.isSafeInteger(body.part) || body.part < 0 || body.part >= NARRATION_MAX_PARTS)
    return false
  const allowed = SCOPE_KEYS[body.scope]
  if (Object.keys(body).sort().join('|') !== allowed.slice().sort().join('|')) return false
  if (allowed.includes('selector')
    && (typeof body.selector !== 'string' || !body.selector || body.selector.length > 150)) return false
  if (allowed.includes('id')
    && (typeof body.id !== 'string' || !body.id || body.id.length > 150)) return false
  if (allowed.includes('sessionId')
    && (typeof body.sessionId !== 'string' || !body.sessionId || body.sessionId.length > 150)) return false
  return true
}
