import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { formatDiagnostics, LIMITS } from '../scripts/format-eslint-diagnostics.mjs'

const cwd = '/synthetic/repository'
const checkout = { commit: 'a'.repeat(40), tree: 'b'.repeat(40), parents: ['c'.repeat(40), 'd'.repeat(40)] }
const options = (paths = ['tests/example.test.mjs']) => ({ cwd, allowedPaths: paths, checkout })
const message = (extra = {}) => ({ severity: 2, ruleId: 'no-undef', line: 3, column: 7, ...extra })
const result = (messages = [message()], path = 'tests/example.test.mjs') => ({ filePath: cwd + '/' + path,
  errorCount: messages.filter(item => item.severity === 2).length,
  warningCount: messages.filter(item => item.severity === 1).length,
  fatalErrorCount: messages.filter(item => item.fatal).length, messages })
const parsed = (rows, settings = options()) => JSON.parse(formatDiagnostics(rows, settings))
const invalid = operation => assert.throws(operation, error => error instanceof Error && error.message === 'ESLINT_DIAGNOSTICS_INVALID_METADATA')
const forbidden = ['message', 'source', 'output', 'suggestions', 'fix', 'fixes', 'url', 'help', 'ruleMetadata']

test('lint metadata keeps exact error, warning, fatal and actual-checkout counts separately', () => {
  const value = parsed([result([message(), message({ severity: 1, ruleId: '@typescript-eslint/no-unused-vars' }),
    message({ fatal: true, ruleId: null, line: undefined, column: undefined })])])
  assert.deepEqual(value.checkout, checkout)
  assert.deepEqual(value.totals, { files: 1, errors: 2, warnings: 1, fatalErrors: 1, messages: 3 })
  assert.deepEqual(value.records[2], { path: 'tests/example.test.mjs', line: null, column: null, ruleId: 'parser-fatal', severity: 2 })
  assert.deepEqual(value.groups, [{ path: 'tests/example.test.mjs', errors: 2, warnings: 1, fatalErrors: 1 }])
  assert.equal(value.completeRecords, true); assert.equal(value.completeGroups, true)
})

test('lint metadata healthy result is explicit, with no invented findings', () => {
  const value = parsed([result([])])
  assert.deepEqual(value.totals, { files: 1, errors: 0, warnings: 0, fatalErrors: 0, messages: 0 })
  assert.deepEqual(value.records, []); assert.deepEqual(value.groups, [])
})

test('lint metadata never accesses forbidden fields, inherited values or serialization hooks', () => {
  let touched = 0
  const trap = () => { touched++; throw new Error('PRIVATE_SOURCE_MESSAGE_SENTINEL') }
  const item = message(), row = result([item]), settings = options()
  for (const value of [item, row, settings, checkout]) {
    for (const key of [...forbidden, 'toJSON', 'toString', 'valueOf', 'rulesMeta']) Object.defineProperty(value, key, { configurable: true, get: trap })
    Object.defineProperty(value, Symbol.toPrimitive, { configurable: true, get: trap })
  }
  const text = formatDiagnostics([row], settings)
  assert.equal(touched, 0); assert.ok(!text.includes('PRIVATE_SOURCE_MESSAGE_SENTINEL'))
  assert.equal(JSON.parse(text).totals.errors, 1)
})

test('lint metadata discards huge raw text and nested sensitive payloads without reading them', () => {
  const item = message(), row = result([item]), secret = 'PRIVATE_TOKEN_SENTINEL'.repeat(100000)
  for (const key of forbidden) { item[key] = secret; row[key] = { nested: secret } }
  const text = formatDiagnostics([row], options())
  assert.ok(text.length < 2048); assert.ok(!text.includes('PRIVATE_TOKEN_SENTINEL'))
  assert.deepEqual(Object.keys(JSON.parse(text).records[0]), ['path', 'line', 'column', 'ruleId', 'severity'])
})

test('lint metadata accepts tracked literal App Router paths and protected filename metadata only', () => {
  const paths = ['app/[locale]/academy/[[...slug]]/page.tsx', 'app/ia-v2.css']
  const rows = paths.map(path => result([message()], path))
  let sourceReads = 0
  for (const row of rows) Object.defineProperty(row, 'source', { get() { sourceReads++; throw Error('PROTECTED_CONTENT') } })
  assert.deepEqual(parsed(rows, options(paths)).records.map(row => row.path), paths)
  assert.equal(sourceReads, 0)
})

test('lint metadata rejects untracked, outside, traversal, control and oversized paths', () => {
  for (const path of ['not-tracked.mjs', '../outside.mjs', 'tests/../example.mjs', 'tests//example.mjs',
    'tests/line\nbreak.mjs', 'https://secret.invalid/file.mjs', 'tests/' + 'x'.repeat(260) + '.mjs']) {
    invalid(() => formatDiagnostics([result([message()], path)], options()))
    if (path !== 'not-tracked.mjs') invalid(() => formatDiagnostics([], options([path])))
  }
  const row = result(); row.filePath = '/outside/test.mjs'
  invalid(() => formatDiagnostics([row], options()))
  invalid(() => formatDiagnostics([result(), result()], options()))
  invalid(() => formatDiagnostics([], options(['tests/example.test.mjs', 'tests/example.test.mjs'])))
})

test('lint metadata rejects inherited required fields and accessor diagnostics without invoking getters', () => {
  let touched = 0
  for (const key of ['severity', 'ruleId', 'line', 'column', 'fatal']) {
    const item = message(), row = result([item])
    Object.defineProperty(item, key, { get() { touched++; throw Error('PRIVATE_GETTER') } })
    invalid(() => formatDiagnostics([row], options()))
  }
  for (const key of ['filePath', 'errorCount', 'warningCount', 'fatalErrorCount', 'messages']) {
    const row = result()
    Object.defineProperty(row, key, { get() { touched++; throw Error('PRIVATE_GETTER') } })
    invalid(() => formatDiagnostics([row], options()))
  }
  invalid(() => formatDiagnostics([Object.create(result())], options()))
  const inherited = Object.create(message())
  invalid(() => formatDiagnostics([{ ...result(), messages: [inherited] }], options()))
  assert.equal(touched, 0)
})

test('lint metadata rejects exotic scalars, sparse arrays and hostile descriptor traps with constant errors', () => {
  for (const value of [new Number(2), 2n, Symbol('PRIVATE_SYMBOL'), {}, () => 2, NaN, Infinity, '2', null]) {
    const row = result(); row.messages[0].severity = value
    invalid(() => formatDiagnostics([row], options()))
  }
  invalid(() => formatDiagnostics(new Array(1), options()))
  invalid(() => formatDiagnostics({ length: 0 }, options()))
  invalid(() => formatDiagnostics([new Proxy({}, { getOwnPropertyDescriptor() { throw Error('PRIVATE_PROXY_PAYLOAD') } })], options()))
})

test('lint metadata rejects every nested Proxy and revoked Proxy before traps can read raw fields', () => {
  const locations = ['results', 'options', 'paths', 'checkout', 'parents', 'result', 'messages', 'message']
  for (const location of locations) for (const revoked of [false, true]) {
    const rows = [result()], settings = options(); let traps = 0, rawReads = 0
    const targets = { results: rows, options: settings, paths: settings.allowedPaths,
      checkout: settings.checkout, parents: settings.checkout.parents, result: rows[0],
      messages: rows[0].messages, message: rows[0].messages[0] }
    const target = targets[location]
    Object.defineProperty(target, 'source', { configurable: true, get() { rawReads++; return 'PRIVATE_PROXY_SOURCE' } })
    const trap = (...args) => { traps++; Reflect.get(target, 'source'); return Reflect.getOwnPropertyDescriptor(...args) }
    const handler = { getOwnPropertyDescriptor: trap, get() { traps++; Reflect.get(target, 'source'); return undefined },
      getPrototypeOf() { traps++; Reflect.get(target, 'source'); return null }, ownKeys() { traps++; Reflect.get(target, 'source'); return [] } }
    const control = Proxy.revocable(target, handler), proxy = control.proxy
    if (revoked) control.revoke()
    let input = rows, config = settings
    if (location === 'results') input = proxy
    if (location === 'options') config = proxy
    if (location === 'paths') settings.allowedPaths = proxy
    if (location === 'checkout') settings.checkout = proxy
    if (location === 'parents') settings.checkout = { commit: checkout.commit, tree: checkout.tree, parents: proxy }
    if (location === 'result') rows[0] = proxy
    if (location === 'messages') rows[0].messages = proxy
    if (location === 'message') rows[0].messages[0] = proxy
    invalid(() => formatDiagnostics(input, config))
    assert.equal(traps, 0, location + ' reflection trap must never run')
    assert.equal(rawReads, 0, location + ' source getter must never run')
  }
})

test('lint metadata uses no input iterators, inherited index getters or proxied array length access', () => {
  let called = 0
  const trap = () => { called++; throw Error('PRIVATE_ARRAY_HOOK') }
  const rows = [result()], settings = options()
  for (const array of [rows, rows[0].messages, settings.allowedPaths, settings.checkout.parents]) {
    Object.defineProperty(array, Symbol.iterator, { configurable: true, get: trap })
    Object.defineProperty(array, 'map', { configurable: true, get: trap })
    Object.defineProperty(array, 'toJSON', { configurable: true, get: trap })
  }
  assert.equal(parsed(rows, settings).totals.errors, 1)
  const sparse = new Array(1)
  Object.setPrototypeOf(sparse, Object.defineProperty({}, '0', { get: trap }))
  invalid(() => formatDiagnostics(sparse, settings))
  const arrayProxy = new Proxy([], { get(_target, key) { if (key === 'length') trap(); return undefined } })
  invalid(() => formatDiagnostics(arrayProxy, settings))
  assert.equal(called, 0)
})

test('lint metadata rejects malformed count, severity, rule and coordinate records instead of returning success', () => {
  for (const key of ['errorCount', 'warningCount', 'fatalErrorCount']) {
    for (const value of [-1, 1.5, NaN, Infinity, '1', 10000001]) {
      const row = result(); row[key] = value
      invalid(() => formatDiagnostics([row], options()))
    }
  }
  for (const changes of [{ severity: 0 }, { severity: 3 }, { severity: 1 }, { fatal: 'true' },
    { ruleId: 'https://private.invalid' }, { ruleId: '' }, { ruleId: 'x'.repeat(LIMITS.ruleBytes + 1) },
    { line: 0 }, { column: -1 }, { line: 1.2 }, { line: '3' }, { column: null }]) {
    const row = result(); Object.assign(row.messages[0], changes)
    invalid(() => formatDiagnostics([row], options()))
  }
  invalid(() => formatDiagnostics([{ ...result(), errorCount: 0 }], options()))
  invalid(() => formatDiagnostics([{ ...result(), fatalErrorCount: 1 }], options()))
})

test('lint metadata rejects malformed or accessor checkout provenance without leaking its payload', () => {
  for (const changes of [{ commit: 'PRIVATE_SHA' }, { tree: null }, { parents: ['bad'] }, { parents: new Array(9).fill('a'.repeat(40)) }]) {
    invalid(() => formatDiagnostics([], { ...options(), checkout: { ...checkout, ...changes } }))
  }
  const value = { ...checkout }; let called = false
  Object.defineProperty(value, 'commit', { get() { called = true; throw Error('PRIVATE_PROVENANCE') } })
  invalid(() => formatDiagnostics([], { ...options(), checkout: value })); assert.equal(called, false)
})

test('lint metadata bounded records and groups retain exact totals and honest omission counts', () => {
  const paths = Array.from({ length: LIMITS.groups + 5 }, (_, index) => `tests/long-${index}.mjs`)
  const rows = paths.map(path => result([message(), message({ severity: 1 })], path))
  const value = parsed(rows, options(paths)), total = paths.length * 2
  assert.equal(value.totals.errors, paths.length); assert.equal(value.totals.warnings, paths.length)
  assert.equal(value.totals.messages, total)
  assert.equal(value.records.length, LIMITS.records); assert.equal(value.omittedRecords, total - LIMITS.records)
  assert.equal(value.groups.length, LIMITS.groups); assert.equal(value.omittedGroups, 5); assert.equal(value.omittedGroupMessages, 10)
  assert.equal(value.completeRecords, false); assert.equal(value.completeGroups, false)
})

test('lint metadata maximum retained field sizes remain below the fixed output byte ceiling', () => {
  const paths = Array.from({ length: LIMITS.groups + 1 }, (_, index) => 'tests/' + 'x'.repeat(239) + String(index).padStart(3, '0') + '.mjs')
  const rows = paths.map(path => result([message({ ruleId: 'x'.repeat(LIMITS.ruleBytes), line: 10000000, column: 10000000 })], path))
  const text = formatDiagnostics(rows, options(paths))
  assert.ok(Buffer.byteLength(text) <= LIMITS.outputBytes)
  assert.equal(JSON.parse(text).omittedGroups, 1)
})

test('lint metadata refuses over-budget scanning and invalid allowlists explicitly', () => {
  invalid(() => formatDiagnostics(new Array(LIMITS.files + 1), options()))
  invalid(() => formatDiagnostics([{ ...result(), messages: new Array(LIMITS.messages + 1) }], options()))
  invalid(() => formatDiagnostics([], options([])))
  invalid(() => formatDiagnostics([], { ...options(), cwd: 'relative/root' }))
})

test('lint workflow retains full selection and exact fatal status while only sanitized artifacts upload', () => {
  const workflow = readFileSync(new URL('../.github/workflows/hh-app-r1.yml', import.meta.url), 'utf8')
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  assert.equal(pkg.scripts.lint, 'eslint .')
  const start = workflow.indexOf('      - name: Lint complete repository including literal App Router paths')
  const end = workflow.indexOf('      - name: Production-mode build, app flags absent', start)
  assert.ok(start >= 0 && end > start)
  const block = workflow.slice(start, end)
  assert.equal((block.match(/npm run lint/g) || []).length, 1)
  assert.match(block, /npm run lint -- --format \.\/scripts\/format-eslint-diagnostics\.mjs --output-file "\$evidence\/summary\.json" >\/dev\/null 2>&1/)
  assert.match(block, /set \+e\n          npm run lint[^\n]+\n          lint_exit=\$\?\n          set -e/)
  assert.match(block, /exit "\$lint_exit"/)
  assert.match(block, /summary_written=false/)
  assert.match(block, /"checkoutSha":"%s","checkoutTree":"%s","checkoutParents":"%s"/)
  assert.match(block, /"\$HH_LINT_CHECKOUT_SHA" "\$HH_LINT_CHECKOUT_TREE" "\$HH_LINT_CHECKOUT_PARENTS" > "\$evidence\/exit.json"/)
  assert.doesNotMatch(block, /continue-on-error|\|\| true|--fix|--cache|--quiet|--max-warnings|--ignore|\.source|\.message/)
  assert.match(block, /git ls-tree -rz --name-only HEAD/)
  assert.match(block, /git rev-parse HEAD/); assert.match(block, /git rev-parse 'HEAD\^\{tree\}'/)
  assert.match(block, /git show -s --format=%P HEAD/)
  const upload = block.slice(block.indexOf('      - name: Upload bounded lint metadata only'))
  assert.match(upload, /if: always\(\)/)
  assert.match(upload, /path: \|\n            \$\{\{ runner.temp \}\}\/app-r1-lint\/summary.json\n            \$\{\{ runner.temp \}\}\/app-r1-lint\/exit.json\n/)
  assert.doesNotMatch(upload, /tracked-paths|\.log|\.tap|\*|source|message/)
  assert.match(upload, /retention-days: 7/)
  const downstream = workflow.slice(end, workflow.indexOf('  course-banner-browser:', end))
  assert.match(downstream, /run: npm run build/); assert.match(downstream, /npx --no-install tsc --noEmit/)
  assert.match(downstream, /npm run pwa:check && npm run native:check/)
  assert.doesNotMatch(downstream, /if:|continue-on-error/)
})
