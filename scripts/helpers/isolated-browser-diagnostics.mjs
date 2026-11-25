import { mkdir, open, writeFile } from 'node:fs/promises'

export const MAX_SERVICE_LOG_BYTES = 1024 * 1024
export const MAX_SERVICE_EVENTS = 1000
const MAX_PATH_SEGMENTS = 16

const SAFE_SEGMENTS = new Set([
  'en','ru','es','api','app','client','auth','callback','bootstrap','guest',
  'runs','run','results','result','save','submit','answers','profile','history',
  'portfolio','portrait','tests','test','consent','session','logout','login',
  'me','mood','course','courses','plans','plan','billing','status','health',
  'crm','search','contacts','followups','activity','materials','documents',
  'questionnaires','requests','request','account','export','snapshot','dynamics',
  'subscriptions','settings','preferences','notifications','insights','monitoring',
])
const APP_CODES = new Set([
  'SIGN_IN_REQUIRED','GUEST_SESSION_REQUIRED','ORIGIN_DENIED','CRM_UNAVAILABLE',
  'CSRF_INVALID','DATABASE_UNAVAILABLE','SERVICE_UNAVAILABLE','RATE_LIMITED',
  'INTERNAL_ERROR','FORBIDDEN','NOT_FOUND','INVALID_INPUT','CONFLICT',
])
const METHODS = new Set(['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'])

function isolatedOrigin(origin) {
  try {
    const url = new URL(origin)
    return url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname)
      && Boolean(url.port) && !url.username && !url.password
      && url.pathname === '/' && !url.search && !url.hash ? url.origin : null
  } catch { return null }
}

// Only known route words survive; query, fragment and dynamic identifiers never do.
export function sanitizePathname(raw, origin) {
  const base = isolatedOrigin(origin)
  if (!base || typeof raw !== 'string') return null
  try {
    const url = new URL(raw, base)
    if (url.origin !== base || url.username || url.password) return null
    const segments = url.pathname.split('/').filter(Boolean)
    return '/' + segments.slice(0, MAX_PATH_SEGMENTS).map(segment => {
      let value
      try { value = decodeURIComponent(segment) } catch { return '[segment]' }
      if (SAFE_SEGMENTS.has(value)) return value
      if (/^(?:[a-f0-9]{8}-[a-f0-9-]{27,}|[a-f0-9]{20,})$/i.test(value)) return '[id]'
      return '[segment]'
    }).join('/') + (segments.length > MAX_PATH_SEGMENTS ? '/[truncated]' : '')
  } catch { return null }
}

// Never return arbitrary error messages, stack frames, headers or payloads.
export function classifyDiagnosticError(error) {
  const text = typeof error === 'string' ? error : String(error?.message || '')
  if (/socket hang up/i.test(text)) return 'socket_hang_up'
  if (/ECONNRESET|connection reset/i.test(text)) return 'connection_reset'
  if (/ECONNREFUSED|connection refused/i.test(text)) return 'connection_refused'
  if (/ERR_ABORTED|AbortError|aborted/i.test(text)) return 'request_aborted'
  if (/heap out of memory|out of memory|ENOMEM/i.test(text)) return 'out_of_memory'
  if (/ETIMEDOUT|timed? ?out|TimeoutError/i.test(text)) return 'timeout'
  if (/failed to fetch|networkerror|network request failed/i.test(text)) return 'network_fetch_error'
  if (error?.name === 'SyntaxError') return 'javascript_syntax_error'
  if (error?.name === 'TypeError') return 'javascript_type_error'
  return 'unclassified_error'
}

function duration(value, unit) {
  const number = Number(value) * (unit === 's' ? 1000 : 1)
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 1000) / 1000 : null
}

export function sanitizeServiceLog(raw, { origin, source }) {
  if (!isolatedOrigin(origin)) throw new Error('Loopback diagnostics origin required')
  if (!['next','provider'].includes(source)) throw new Error('Unknown diagnostic source')
  const lines = String(raw).split(/\r?\n/)
  const events = []
  let recognizedEvents = 0
  const retain = event => {
    events[recognizedEvents % MAX_SERVICE_EVENTS] = event
    recognizedEvents++
  }
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].replace(/\u001b\[[0-9;]*m/g, '').trim()
    const event = { line: index + 1 }
    const timestamp = line.match(/^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z)\s+/)
    const body = timestamp ? line.slice(timestamp[0].length) : line
    if (timestamp && Number.isFinite(Date.parse(timestamp[1]))) event.timestamp = new Date(timestamp[1]).toISOString()
    let match
    if ((match = body.match(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\S+)\s+([1-5]\d\d)\s+in\s+(\d+(?:\.\d+)?)\s*(ms|s)\b/))) {
      const pathname = sanitizePathname(match[2], origin)
      if (pathname && METHODS.has(match[1])) retain({ ...event, type: 'request', method: match[1], pathname, status: Number(match[3]), durationMs: duration(match[4],match[5]) })
    } else if ((match = body.match(/^HH_APP_TEST_ERROR\s+\S+\s+([A-Z_]+)\b/))) {
      retain({ ...event, type: 'app_error', code: APP_CODES.has(match[1]) ? match[1] : 'UNCLASSIFIED' })
    } else if ((match = body.match(/^(?:[✓○]\s*)?(Ready|Starting|Compiling|Compiled)\b(?:\s+(\S+))?/i))) {
      const action = match[1].toLowerCase()
      const timing = body.match(/\bin\s+(\d+(?:\.\d+)?)\s*(ms|s)\b/)
      const pathname = ['compiling','compiled'].includes(action) ? sanitizePathname(match[2] || '', origin) : null
      retain({ ...event, type: 'server_lifecycle', action, ...(pathname ? { pathname } : {}), ...(timing ? { durationMs: duration(timing[1],timing[2]) } : {}) })
    } else if (source === 'provider' && body === 'Loopback provider protocol double ready. No live Google test.') {
      retain({ ...event, type: 'provider_ready' })
    } else if (/socket hang up|ECONNRESET|ECONNREFUSED|ETIMEDOUT|heap out of memory|out of memory|ENOMEM/i.test(body)) {
      retain({ ...event, type: 'process_error', category: classifyDiagnosticError(body) })
    }
  }
  const first = recognizedEvents > MAX_SERVICE_EVENTS ? recognizedEvents % MAX_SERVICE_EVENTS : 0
  const chronologicalEvents = events.slice(first).concat(events.slice(0, first))
  return {
    schemaVersion: 1, source, totalLines: lines.length,
    lineNumberBasis: 'captured_tail', droppedLines: lines.length - recognizedEvents,
    recognizedEvents, droppedEvents: Math.max(0, recognizedEvents - MAX_SERVICE_EVENTS),
    maxEvents: MAX_SERVICE_EVENTS, events: chronologicalEvents,
  }
}

async function readBoundedTail(path) {
  const file = await open(path, 'r')
  try {
    const { size } = await file.stat()
    const offset = Math.max(0, size - MAX_SERVICE_LOG_BYTES)
    const buffer = Buffer.alloc(Math.min(size, MAX_SERVICE_LOG_BYTES))
    let readBytes = 0
    while (readBytes < buffer.length) {
      const result = await file.read(buffer, readBytes, buffer.length - readBytes, offset + readBytes)
      if (!result.bytesRead) break
      readBytes += result.bytesRead
    }
    const captured = buffer.subarray(0, readBytes)
    // Discard the leading possibly partial line and UTF-8 fragment after a tail cut.
    const newline = offset ? captured.indexOf(10) : -1
    const leadingBytes = offset ? (newline < 0 ? captured.length : newline + 1) : 0
    return {
      raw: captured.subarray(leadingBytes).toString('utf8'),
      capture: {
        sourceBytes: size, readBytes, maxReadBytes: MAX_SERVICE_LOG_BYTES,
        omittedPrefixBytes: offset + leadingBytes,
        discardedLeadingLineBytes: leadingBytes, truncated: offset > 0,
      },
    }
  } finally { await file.close() }
}

export async function preserveIsolatedServiceDiagnostics({
  runtime = process.env.HH_APP_TEST_RUNTIME,
  origin = process.env.HH_TEST_APP_ORIGIN,
  directory = 'artifacts/app-r1/service-diagnostics',
  sources = [['/tmp/hh-app-next.log','next'],['/tmp/hh-app-provider.log','provider']],
} = {}) {
  if (runtime !== 'isolated') throw new Error('Isolated diagnostics only')
  await mkdir(directory, { recursive: true })
  for (const [path, source] of sources) {
    let tail
    try { tail = await readBoundedTail(path) }
    catch (error) { if (error.code === 'ENOENT') continue; throw error }
    const evidence = { ...sanitizeServiceLog(tail.raw, { origin, source }), capture: tail.capture }
    await writeFile(directory + '/' + source + '.json', JSON.stringify(evidence, null, 2) + '\n')
  }
}
