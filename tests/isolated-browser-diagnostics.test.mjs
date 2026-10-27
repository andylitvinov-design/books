import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  sanitizePathname, classifyDiagnosticError, sanitizeServiceLog,
  preserveIsolatedServiceDiagnostics, MAX_SERVICE_LOG_BYTES, MAX_SERVICE_EVENTS,
} from '../scripts/helpers/isolated-browser-diagnostics.mjs'

const origin = 'http://localhost:3100'

test('diagnostic pathnames omit query/hash and mask dynamic or personal segments', () => {
  assert.equal(sanitizePathname('/api/app/auth/callback?code=secret#token', origin), '/api/app/auth/callback')
  assert.equal(sanitizePathname('/ru/app/results/d03bb958-4227-402c-8fcb-564046983640?token=secret', origin), '/ru/app/results/[id]')
  assert.equal(sanitizePathname('/en/app/results/person%40example.test?name=person', origin), '/en/app/results/[segment]')
  assert.equal(sanitizePathname('/en/app/results/%2Fprivate%2Fvalue', origin), '/en/app/results/[segment]')
  assert.equal(sanitizePathname('https://other.invalid/api/app/bootstrap?key=secret', origin), null)
  assert.equal(sanitizePathname('//other.invalid/api/app/bootstrap', origin), null)
  assert.equal(sanitizePathname('http://person:secret@localhost:3100/api/app/bootstrap', origin), null)
  assert.equal(sanitizePathname('/api/app/bootstrap', 'https://production.invalid'), null)
})

test('service diagnostics retain only technical requests, lifecycle and fixed error codes', () => {
  const raw = [
    '2026-10-18T19:00:00Z GET /api/app/bootstrap?token=fixture-query-secret 200 in 234ms',
    'POST http://localhost:3100/api/app/guest/runs/12345678-1234-4123-8123-123456789012/save 200 in 1.25s',
    'GET https://other.invalid/api/app/bootstrap 200 in 4ms',
    'Authorization: Bearer fixture-authorization-secret',
    'Cookie: hh_guest_dev=fixture-cookie-secret',
    'Set-Cookie: fixture-set-cookie-secret',
    'HH_APP_TOKEN=fixture-env-secret',
    'postgres://person:fixture-password@localhost/private',
    '{"access_token":"fixture-access-secret","name":"Synthetic Private Person","answers":[1,2,3]}',
    'HH_APP_TEST_ERROR AppError GUEST_SESSION_REQUIRED fixture-sensitive-detail',
    'HH_APP_TEST_ERROR AppError PERSONAL_FIELD fixture-sensitive-detail',
    'Error: socket hang up: fixture-error-secret',
    '✓ Ready in 2s',
    '○ Compiling /ru/app/results/[id] ...',
    '✓ Compiled /ru/app/results/[id] in 500ms (1234 modules)',
    'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJmaXh0dXJlIn0.signature',
    'GET /en/app/results/person@example.test 200 in 7ms',
  ].join('\n')
  const evidence = sanitizeServiceLog(raw, { origin, source: 'next' })
  const serialized = JSON.stringify(evidence)
  for (const secret of ['fixture-', 'Synthetic Private Person', 'answers', 'eyJ', 'person@', 'PERSONAL_FIELD', '12345678-1234', '?', '#token', 'other.invalid', 'postgres://'])
    assert.ok(!serialized.includes(secret), secret)
  assert.deepEqual(evidence.events[0], {
    line: 1, timestamp: '2026-10-18T19:00:00.000Z', type: 'request',
    method: 'GET', pathname: '/api/app/bootstrap', status: 200, durationMs: 234,
  })
  assert.equal(evidence.events[1].durationMs, 1250)
  assert.ok(evidence.events.some(event => event.code === 'GUEST_SESSION_REQUIRED'))
  assert.ok(evidence.events.some(event => event.code === 'UNCLASSIFIED'))
  assert.ok(evidence.events.some(event => event.category === 'socket_hang_up'))
  assert.ok(evidence.events.some(event => event.action === 'ready' && event.durationMs === 2000))
  assert.ok(evidence.droppedLines > 0)
})

test('provider and error summaries never retain arbitrary strings', () => {
  const provider = sanitizeServiceLog('Loopback provider protocol double ready. No live Google test.\nrequest body: fixture-secret', { origin, source: 'provider' })
  assert.deepEqual(provider.events, [{ line: 1, type: 'provider_ready' }])
  assert.equal(classifyDiagnosticError(new TypeError('fixture-secret')), 'javascript_type_error')
  assert.equal(classifyDiagnosticError(new SyntaxError('fixture-secret')), 'javascript_syntax_error')
  assert.equal(classifyDiagnosticError('ECONNRESET fixture-secret'), 'connection_reset')
  assert.equal(classifyDiagnosticError('unrecognized fixture-secret'), 'unclassified_error')
  assert.throws(() => sanitizeServiceLog('', { origin: 'https://live.invalid', source: 'next' }))
  assert.throws(() => sanitizeServiceLog('', { origin, source: 'unknown' }))
})

test('artifact writer stores sanitized JSON only and rejects non-isolated capture', async () => {
  const root = await mkdtemp(join(tmpdir(), 'hh-diag-test-'))
  try {
    const input = join(root, 'input.log'), output = join(root, 'evidence')
    await writeFile(input, 'GET /api/app/bootstrap?secret=fixture-only-secret 200 in 10ms\nCookie: fixture-only-secret')
    await preserveIsolatedServiceDiagnostics({ runtime: 'isolated', origin, directory: output, sources: [[input, 'next'], [join(root, 'missing.log'), 'provider']] })
    assert.deepEqual(await readdir(output), ['next.json'])
    const saved = await readFile(join(output, 'next.json'), 'utf8')
    assert.ok(!saved.includes('fixture-only-secret'))
    assert.ok(!saved.includes('?'))
    assert.equal(JSON.parse(saved).events[0].pathname, '/api/app/bootstrap')
    await assert.rejects(preserveIsolatedServiceDiagnostics({ runtime: 'production', origin, directory: output }), /Isolated diagnostics only/)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('large log reads only a bounded tail and keeps the newest capped events in chronological order', async () => {
  const root = await mkdtemp(join(tmpdir(), 'hh-diag-large-'))
  try {
    const input = join(root, 'large.log'), output = join(root, 'evidence')
    const secret = 'fixture-large-secret-person@example.test'
    const padding = ('Cookie: ' + secret + '\n').repeat(Math.ceil(MAX_SERVICE_LOG_BYTES * 2 / secret.length))
    const count = MAX_SERVICE_EVENTS + 500
    const requests = Array.from({ length: count }, (_, index) =>
      'GET /ru/app/results/' + secret + '?token=' + secret + ' 200 in ' + index + 'ms').join('\n')
    const raw = padding + requests
    await writeFile(input, raw)
    await preserveIsolatedServiceDiagnostics({ runtime: 'isolated', origin, directory: output, sources: [[input, 'next']] })
    const saved = await readFile(join(output, 'next.json'), 'utf8'), evidence = JSON.parse(saved)
    assert.equal(evidence.capture.sourceBytes, Buffer.byteLength(raw))
    assert.equal(evidence.capture.readBytes, MAX_SERVICE_LOG_BYTES)
    assert.equal(evidence.capture.maxReadBytes, MAX_SERVICE_LOG_BYTES)
    assert.equal(evidence.capture.truncated, true)
    assert.ok(evidence.capture.omittedPrefixBytes > 0)
    assert.ok(evidence.capture.discardedLeadingLineBytes > 0)
    assert.equal(evidence.events.length, MAX_SERVICE_EVENTS)
    assert.equal(evidence.recognizedEvents, count)
    assert.equal(evidence.droppedEvents, 500)
    assert.equal(evidence.lineNumberBasis, 'captured_tail')
    assert.deepEqual(evidence.events.map(event => event.durationMs), Array.from({ length: MAX_SERVICE_EVENTS }, (_, index) => index + 500))
    assert.ok(evidence.events.every((event, index) => !index || event.line > evidence.events[index - 1].line))
    assert.ok(evidence.events.every(event => event.pathname === '/ru/app/results/[segment]'))
    for (const forbidden of [secret, 'Cookie', '?', 'token=', 'person@']) assert.ok(!saved.includes(forbidden))
    assert.ok(Buffer.byteLength(saved) < 512 * 1024, 'Artifact output remains bounded')
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('path segment count and a single oversized line cannot produce unbounded output', async () => {
  const pathname = sanitizePathname('/' + Array(10000).fill('person@example.test').join('/'), origin)
  assert.ok(pathname.length < 200)
  assert.ok(pathname.endsWith('/[truncated]'))
  assert.ok(!pathname.includes('person@'))
  const root = await mkdtemp(join(tmpdir(), 'hh-diag-long-line-'))
  try {
    const input = join(root, 'long.log'), output = join(root, 'evidence')
    await writeFile(input, 'fixture-no-newline-secret'.repeat(MAX_SERVICE_LOG_BYTES))
    await preserveIsolatedServiceDiagnostics({ runtime: 'isolated', origin, directory: output, sources: [[input, 'next']] })
    const saved = await readFile(join(output, 'next.json'), 'utf8'), evidence = JSON.parse(saved)
    assert.equal(evidence.capture.readBytes, MAX_SERVICE_LOG_BYTES)
    assert.equal(evidence.events.length, 0)
    assert.ok(saved.length < 1024)
    assert.ok(!saved.includes('fixture-no-newline-secret'))
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('only exact Next compile records add the fixed target without changing sanitized route metadata', { timeout: 3000 }, () => {
  const evidence = sanitizeServiceLog([
    '2026-10-27T07:10:00Z ○ Compiling /api/free-express/claim ...',
    '\u001b[32m✓ Compiled /api/free-express/claim in 973ms (1234 modules)\u001b[0m',
  ].join('\n'), { origin, source: 'next' })
  assert.deepEqual(evidence.events, [
    { line: 1, timestamp: '2026-10-27T07:10:00.000Z', type: 'server_lifecycle', action: 'compiling', pathname: '/api/[segment]/[segment]', compileTarget: 'free-express-claim' },
    { line: 2, type: 'server_lifecycle', action: 'compiled', pathname: '/api/[segment]/[segment]', durationMs: 973, compileTarget: 'free-express-claim' },
  ])
  assert.equal(evidence.recognizedEvents, 2); assert.equal(evidence.droppedEvents, 0)
  assert.equal(sanitizePathname('/api/free-express/claim', origin), '/api/[segment]/[segment]')
  assert.equal(sanitizePathname('/free-express/claim/private', origin), '/[segment]/[segment]/[segment]')
})

test('compile aliases reject query, fragment, private suffix, encoded, absolute and lookalike routes', { timeout: 3000 }, () => {
  const routes = [
    '/api/free-express/claim?account=fixture-secret', '/api/free-express/claim#fixture-secret',
    '/api/free-express/claim/private', '/api/free-express/claim/', '/api/free-express/claim-private',
    '/api/free-express/claims', '/api/free-express/%63laim', '/api/Free-express/claim',
    '/api/private/../free-express/claim', '/api//free-express/claim', '/api/free-express\\claim',
    'http://localhost:3100/api/free-express/claim', 'https://localhost:3100/api/free-express/claim',
    'http://other.invalid/api/free-express/claim', 'http://fixture-secret@localhost:3100/api/free-express/claim',
    '//localhost:3100/api/free-express/claim', '/api/private/fixture-secret',
  ]
  for (const route of routes) {
    for (const action of ['Compiling', 'Compiled']) {
      const evidence = sanitizeServiceLog(action + ' ' + route + ' in 1s', { origin, source: 'next' })
      assert.equal(evidence.events.length, 1)
      assert.ok(!Object.hasOwn(evidence.events[0], 'compileTarget'), route)
      assert.doesNotMatch(JSON.stringify(evidence), /fixture-secret|account=|other\.invalid|https?:|claim-private/)
    }
  }
})

test('compile target does not expand request, provider, readiness or unrecognized log capture', { timeout: 3000 }, () => {
  const lines = [
    'GET /api/free-express/claim 401 in 10ms', 'POST /api/free-express/claim 200 in 10ms',
    'Ready /api/free-express/claim in 1s', 'Starting /api/free-express/claim',
    'private log /api/free-express/claim fixture-secret',
  ]
  const evidence = sanitizeServiceLog(lines.join('\n'), { origin, source: 'next' })
  assert.equal(evidence.events.length, 4); assert.equal(evidence.droppedLines, 1)
  assert.ok(evidence.events.every(event => !Object.hasOwn(event, 'compileTarget')))
  const provider = sanitizeServiceLog('Compiling /api/free-express/claim ...\nCompiled /api/free-express/claim in 1s', { origin, source: 'provider' })
  assert.equal(provider.events.length, 2)
  assert.ok(provider.events.every(event => !Object.hasOwn(event, 'compileTarget')))
  assert.doesNotMatch(JSON.stringify([evidence, provider]), /fixture-secret/)
})

test('existing artifact writer emits compile alias with redacted paths and unchanged isolation checks', { timeout: 3000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'hh-diag-compile-'))
  try {
    const input = join(root, 'next.log'), output = join(root, 'evidence')
    const raw = [
      '○ Compiling /api/free-express/claim ...',
      '✓ Compiled /api/free-express/claim in 1.25s (1234 modules)',
      'Compiled /api/free-express/claim?token=fixture-secret in 1ms',
      'GET /api/free-express/claim/private?account=fixture-secret 401 in 2ms',
      'Cookie: fixture-secret',
    ].join('\n')
    await writeFile(input, raw)
    await preserveIsolatedServiceDiagnostics({ runtime: 'isolated', origin, directory: output, sources: [[input, 'next']] })
    assert.deepEqual(await readdir(output), ['next.json'])
    const saved = await readFile(join(output, 'next.json'), 'utf8'), evidence = JSON.parse(saved)
    assert.deepEqual(evidence.events.filter(event => event.compileTarget).map(event => event.compileTarget), ['free-express-claim', 'free-express-claim'])
    assert.ok(evidence.events.slice(0, 3).every(event => event.pathname === '/api/[segment]/[segment]'))
    assert.equal(evidence.events[1].durationMs, 1250)
    assert.equal(evidence.capture.truncated, false); assert.equal(evidence.capture.sourceBytes, Buffer.byteLength(raw))
    assert.doesNotMatch(saved, /fixture-secret|token=|account=|Cookie|\?|https?:|\/api\/free-express\/claim/)
    await assert.rejects(preserveIsolatedServiceDiagnostics({ runtime: 'production', origin, directory: output, sources: [[input, 'next']] }), /Isolated diagnostics only/)
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('compile aliases retain the existing service-event cap and chronological evidence', { timeout: 3000 }, () => {
  const count = MAX_SERVICE_EVENTS + 25
  const raw = Array.from({ length: count }, (_, index) => 'Compiled /api/free-express/claim in ' + index + 'ms').join('\n')
  const evidence = sanitizeServiceLog(raw, { origin, source: 'next' })
  assert.equal(evidence.events.length, MAX_SERVICE_EVENTS); assert.equal(evidence.droppedEvents, 25)
  assert.equal(evidence.recognizedEvents, count)
  assert.ok(evidence.events.every(event => event.compileTarget === 'free-express-claim' && event.pathname === '/api/[segment]/[segment]'))
  assert.deepEqual(evidence.events.map(event => event.durationMs), Array.from({ length: MAX_SERVICE_EVENTS }, (_, index) => index + 25))
})
