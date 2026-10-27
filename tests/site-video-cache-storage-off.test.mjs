import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { prepareVideoChange, toPublishedSiteVideo } from '../lib/site-videos/model.js'
import vm from 'node:vm'
import ts from 'typescript'

function parse(source, filename) {
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  assert.equal(file.parseDiagnostics.length, 0, filename + ' must parse')
  return file
}
function descendants(node) {
  const result = []
  const visit = value => { result.push(value); ts.forEachChild(value, visit) }
  visit(node)
  return result
}
function sourceModule(currentSource, filename, modules, globals) {
  parse(currentSource, filename)
  const compiledModule = { exports: {} }
  const code = ts.transpileModule(currentSource, { fileName: filename, compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText
  const denied = () => { throw new Error('External operation forbidden by source-contract fixture') }
  vm.runInNewContext(code, { module: compiledModule, exports: compiledModule.exports, ...globals,
    fetch: denied, XMLHttpRequest: denied, WebSocket: denied,
    require: name => {
      assert.ok(Object.hasOwn(modules, name), 'Unapproved dependency ' + name)
      return modules[name]
    },
  }, { filename, timeout: 5000 })
  return compiledModule.exports
}

const sourcePath = 'lib/site-videos/public.ts'
const source = readFileSync(new URL('../' + sourcePath, import.meta.url), 'utf8')
const plain = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value))
const timestamp = '2026-01-01T00:00:00.000Z'
const syntheticRecord = (slot, locale, changes = {}) => ({
  ...prepareVideoChange(null, {
    slot, locale, intent: 'publish', reviewed: true,
    youtubeUrl: 'https://youtu.be/AAAAAAAAAAA', title: 'Fictional ' + locale,
    description: 'Fictional public description', transcript: 'Fictional public transcript',
    driveUrl: 'https://drive.google.com/file/d/fictional-archive/view', ...changes,
  }, timestamp), revision: 0,
})
function records() {
  const approved = ['en', 'ru', 'es'].map(locale => syntheticRecord('about-intro', locale))
  const hidden = syntheticRecord('home-intro', 'en'); hidden.published = null
  const draft = syntheticRecord('thank-you', 'en', { intent: 'draft', reviewed: false })
  const malformed = syntheticRecord('services-intro', 'en'); malformed.published.status = 'draft'
  const privateRecord = syntheticRecord('homeopathy-intro', 'en'); privateRecord.clientId = 'fictional-private-marker'
  const wrongLanguage = syntheticRecord('method-hypnotherapy', 'en'); wrongLanguage.published.language = 'ru'
  const wrongVisibility = syntheticRecord('method-constellations', 'en'); wrongVisibility.published.visibility = 'private'
  return { approved, all: [...approved, hidden, draft, malformed, privateRecord, wrongLanguage, wrongVisibility] }
}
const expectedVideos = rows => Object.fromEntries(rows.flatMap(record => {
  const value = toPublishedSiteVideo(record)
  return value ? [[record.key, value]] : []
}))

// Execute the real public module and publication model, with finite synthetic
// adapters for framework caches, storage and console. Never acquire a configured
// store, credential, provider, browser or persisted media record.
function fixture(currentSource = source) {
  const trace = [], warnings = [], errors = [], registrations = [], reactEntries = []
  const state = { store: undefined, builtins: records().all, wrapperError: undefined, cacheHit: false }
  const file = parse(currentSource, sourcePath)
  const imports = file.statements.filter(node => ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly)
    .map(node => node.moduleSpecifier.text)
  assert.deepEqual(imports, ['server-only', 'react', 'next/cache', './model.js', './defaults.js', './store.js'])
  const storeImport = file.statements.find(node => ts.isImportDeclaration(node) && node.moduleSpecifier.text === './store.js')
  const bindings = storeImport.importClause?.namedBindings
  assert.ok(bindings && ts.isNamedImports(bindings), 'Only the public named store boundary is allowed')
  assert.deepEqual(bindings.elements.map(item => ({ imported: item.propertyName?.text ?? item.name.text, local: item.name.text })),
    [{ imported: 'getPublicSiteVideoStore', local: 'getPublicSiteVideoStore' }], 'Only the public read-only accessor is allowed')
  for (const node of descendants(file)) {
    assert.ok(!(ts.isExportDeclaration(node) && node.moduleSpecifier), 'No unreviewed re-export')
    if (ts.isCallExpression(node)) {
      assert.notEqual(node.expression.kind, ts.SyntaxKind.ImportKeyword)
      if (ts.isIdentifier(node.expression)) assert.ok(!['require', 'eval', 'Function', 'fetch'].includes(node.expression.text))
    }
    if (ts.isIdentifier(node)) assert.ok(!['process', 'window', 'document', 'XMLHttpRequest', 'WebSocket'].includes(node.text))
  }
  const exports = sourceModule(currentSource, sourcePath, {
    'server-only': {},
    react: { cache: fn => { reactEntries.push(fn); return fn } },
    'next/cache': {
      unstable_noStore: () => { trace.push(['noStore']) },
      unstable_cache: (callback, keys, options) => {
        const index = registrations.length
        registrations.push({ callback, keys: plain(keys), options: plain(options) })
        return async (...args) => {
          trace.push(['cache', index, ...args])
          if (state.wrapperError) throw state.wrapperError
          if (state.cacheHit) return { syntheticUnrelatedCachedSnapshot: true }
          return callback(...args)
        }
      },
    },
    './model.js': { toPublishedSiteVideo: record => {
      trace.push(['convert', record?.key]); return toPublishedSiteVideo(record)
    } },
    './defaults.js': { builtInSiteVideoRecords: () => {
      trace.push(['builtins']); return structuredClone(state.builtins)
    } },
    './store.js': { getPublicSiteVideoStore: () => { trace.push(['store']); return state.store } },
  }, { console: { warn: (...args) => warnings.push(args), error: (...args) => errors.push(args) } })
  assert.equal(reactEntries.length, 2, 'Both public entries retain request-level cache wrappers')
  assert.equal(registrations.length, 2, 'Only the reviewed list and single-record data caches')
  assert.deepEqual(registrations.map(item => item.keys), [
    ['holistic-house:published-videos:stored:v3'], ['holistic-house:published-video:single-key:v2'],
  ])
  for (const item of registrations) assert.deepEqual(item.options,
    { revalidate: 60, tags: ['holistic-house-published-site-videos'] })
  assert.deepEqual(Object.keys(exports).sort(), ['getPublishedSiteVideo', 'getPublishedSiteVideos'])
  assert.doesNotMatch(currentSource, /force-static|public, max-age|s-maxage/)
  return { exports, state, trace, warnings, errors, registrations }
}
function stored(f, rows, error) {
  f.state.store = Object.freeze({
    list: async options => {
      f.trace.push(['list', plain(options)])
      if (error) throw error
      return structuredClone(rows)
    },
    get: async (key, options) => {
      f.trace.push(['get', key, plain(options)])
      if (error) throw error
      return structuredClone(rows.find(record => record.key === key) ?? null)
    },
  })
}
function requestTrace(f, operation, key) {
  assert.deepEqual(f.trace.slice(0, 2), [['noStore'], ['store']], 'Dynamic response policy precedes storage/cache selection')
  assert.equal(f.trace.filter(event => event[0] === 'noStore').length, 1)
  assert.equal(f.trace.filter(event => event[0] === 'builtins').length, 0, 'Configured reads never resurrect a built-in')
  assert.deepEqual(f.trace.filter(event => event[0] === 'cache'), operation === 'list' ? [['cache', 0]] : [['cache', 1, key]])
  assert.deepEqual(f.trace.filter(event => ['get', 'list'].includes(event[0])), operation === 'list'
    ? [['list', { timeoutMs: 1200 }]] : [['get', key, { timeoutMs: 1800 }]])
}
async function assertBackgroundContract(currentSource = source) {
  const f = fixture(currentSource)
  // Genuine registered callbacks, across storage-on -> off on one module.
  stored(f, records().all)
  assert.deepEqual(plain(await f.registrations[0].callback()), expectedVideos(records().all))
  assert.deepEqual(plain(await f.registrations[1].callback('about-intro:ru')), toPublishedSiteVideo(records().approved[1]))
  f.state.store = undefined; f.trace.length = 0
  assert.deepEqual(plain(await f.registrations[0].callback()), {}, 'Background list must be empty with storage off')
  assert.equal(await f.registrations[1].callback('about-intro:ru'), undefined)
  assert.deepEqual(f.trace, [['store'], ['store']], 'Background revalidation must not throw, read built-ins, or touch request HTML')
  assert.deepEqual(f.warnings, []); assert.deepEqual(f.errors, [])
}
async function assertPublicContract(currentSource = source) {
  const off = fixture(currentSource)
  assert.deepEqual(Object.keys(expectedVideos(off.state.builtins)), ['about-intro:en', 'about-intro:ru', 'about-intro:es'],
    'Only the three approved synthetic identities pass the real publication model')
  off.state.cacheHit = true // A previous stored snapshot must be bypassed.
  assert.deepEqual(plain(await off.exports.getPublishedSiteVideos()), expectedVideos(off.state.builtins), 'Storage-off list must return exactly approved built-ins')
  assert.deepEqual(off.trace.slice(0, 3), [['noStore'], ['store'], ['builtins']], 'Storage-off request policy precedes public store selection')
  assert.equal(off.trace.filter(event => event[0] === 'convert').length, off.state.builtins.length)
  assert.equal(off.trace.filter(event => event[0] === 'cache').length, 0)
  for (const row of off.state.builtins) {
    off.trace.length = 0
    assert.deepEqual(plain(await off.exports.getPublishedSiteVideo(row.key)), toPublishedSiteVideo(row))
    assert.deepEqual(off.trace, [['noStore'], ['store'], ['builtins'], ['convert', row.key]])
  }
  for (const key of ['unknown:en', 'about-intro:de', 'about-intro:es?clientId=fictional', '__proto__', undefined]) {
    off.trace.length = 0
    assert.equal(await off.exports.getPublishedSiteVideo(key), undefined, 'Unknown identity cannot select another language or placement')
    assert.deepEqual(off.trace, [['noStore'], ['store'], ['builtins']])
  }
  off.state.builtins = records().all.map(row => ({ ...row, published: null }))
  assert.deepEqual(plain(await off.exports.getPublishedSiteVideos()), {}, 'Storage-off output is not a shared previous fallback snapshot')
  assert.equal(await off.exports.getPublishedSiteVideo('about-intro:en'), undefined)
  assert.deepEqual(off.warnings, []); assert.deepEqual(off.errors, [])

  const on = fixture(currentSource), rows = records().all
  rows[0].published.title = 'Fictional stored replacement'
  stored(on, rows)
  assert.deepEqual(plain(await on.exports.getPublishedSiteVideos()), expectedVideos(rows))
  requestTrace(on, 'list')
  assert.deepEqual(on.trace.filter(event => event[0] === 'convert').map(event => event[1]), rows.map(row => row.key))
  for (const key of [...rows.map(row => row.key), 'about-intro:unknown']) {
    on.trace.length = 0
    assert.deepEqual(plain(await on.exports.getPublishedSiteVideo(key)), toPublishedSiteVideo(rows.find(row => row.key === key)))
    requestTrace(on, 'get', key)
    assert.deepEqual(on.trace.filter(event => event[0] === 'convert'), [['convert', rows.find(row => row.key === key)?.key]])
  }
  stored(on, [])
  assert.deepEqual(plain(await on.exports.getPublishedSiteVideos()), {})
  assert.equal(await on.exports.getPublishedSiteVideo('about-intro:en'), undefined)
  assert.deepEqual(on.warnings, []); assert.deepEqual(on.errors, [])

  const categories = ['provider-limit', 'provider-auth', 'provider-endpoint', 'provider-5xx',
    'provider-http', 'provider-command', 'provider-protocol', 'timeout', 'transport']
  for (const diagnosticCode of [...categories, 'FICTIONAL-UNSAFE', undefined, 401]) {
    const f = fixture(currentSource), error = Object.assign(new Error('FICTIONAL-UNSAFE payload'), { diagnosticCode })
    stored(f, rows, error)
    assert.deepEqual(plain(await f.exports.getPublishedSiteVideos()), {}, 'Configured list outage must not resurrect built-ins')
    requestTrace(f, 'list')
    f.trace.length = 0
    assert.equal(await f.exports.getPublishedSiteVideo('about-intro:en'), undefined)
    requestTrace(f, 'get', 'about-intro:en')
    const category = categories.includes(diagnosticCode) ? diagnosticCode : 'unknown'
    assert.deepEqual(f.warnings, [
      ['[site-videos] Public video storage unavailable; category=' + category + '; serving an empty 60s snapshot.'],
      ['[site-videos] Public single-video read unavailable; category=' + category + '; keeping placement hidden for 60s.'],
    ])
    assert.deepEqual(f.errors, [])
    assert.doesNotMatch(JSON.stringify(f.warnings), /FICTIONAL-UNSAFE|payload/)
  }
  const brokenCache = fixture(currentSource)
  stored(brokenCache, rows)
  brokenCache.state.wrapperError = new Error('FICTIONAL-UNSAFE cache payload')
  assert.deepEqual(plain(await brokenCache.exports.getPublishedSiteVideos()), {})
  assert.equal(await brokenCache.exports.getPublishedSiteVideo('about-intro:en'), undefined)
  assert.deepEqual(brokenCache.trace, [['noStore'], ['store'], ['cache', 0],
    ['noStore'], ['store'], ['cache', 1, 'about-intro:en']])
  assert.deepEqual(brokenCache.warnings, [])
  assert.deepEqual(brokenCache.errors, [['[site-videos] Published videos could not be read.']])
}

test('disabled public-video store no longer throws during stale revalidation', async () => {
  await assertBackgroundContract()
})

test('storage-off mode keeps only approved published built-ins and avoids per-request warnings', async () => {
  await assertPublicContract()
})

// These controls mutate the actual pinned module source, never a replacement
// implementation. Every mutation must parse and be rejected by the same oracle.
function mutateSource(before, after, count = 1) {
  assert.equal(source.split(before).length - 1, count, 'Exact source mutation anchor')
  const changed = source.split(before).join(after)
  assert.notEqual(changed, source)
  parse(changed, sourcePath)
  return changed
}
async function rejectsPublicMutation(before, after, expectedMessage, count = 1) {
  const mutated = mutateSource(before, after, count)
  await assert.rejects(() => assertPublicContract(mutated), error => {
    assert.equal(error.code, 'ERR_ASSERTION')
    assert.match(error.message, expectedMessage)
    return true
  })
}

test('source control rejects a private instead of public read-only accessor', async () => {
  await rejectsPublicMutation('getPublicSiteVideoStore', 'getSiteVideoStore', /Only the public read-only accessor is allowed/, 5)
})

test('source control rejects removal of the approved storage-off list fallback', async () => {
  await rejectsPublicMutation('return approvedBuiltInVideos();', 'return {};', /Storage-off list must return exactly approved built-ins/)
})

test('source control rejects inverted storage-off gates and stale cached output', async () => {
  await rejectsPublicMutation('if (!getPublicSiteVideoStore()) {', 'if (getPublicSiteVideoStore()) {', /Storage-off list must return exactly approved built-ins/, 2)
})

test('source control rejects removal of dynamic request cache policy', async () => {
  await rejectsPublicMutation('  noStore();', '  void 0;', /Storage-off request policy precedes public store selection/, 2)
})

test('source control rejects raw unapproved record projection', async () => {
  await rejectsPublicMutation('const video = toPublishedSiteVideo(record);', 'const video = record;', /Storage-off list must return exactly approved built-ins/, 2)
})

test('source control rejects stale background data when storage is disabled', async () => {
  const mutated = mutateSource('if (!store) return {};', 'if (!store) return { stale: true };')
  await assert.rejects(() => assertBackgroundContract(mutated), error => {
    assert.equal(error.code, 'ERR_ASSERTION')
    assert.match(error.message, /Background list must be empty with storage off/)
    return true
  })
})

test('source control rejects built-in resurrection after a configured list outage', async () => {
  await rejectsPublicMutation(
    "console.warn('[site-videos] Public video storage unavailable; category=' + safeStorageDiagnostic(error) + '; serving an empty 60s snapshot.');\n      return {};",
    "console.warn('[site-videos] Public video storage unavailable; category=' + safeStorageDiagnostic(error) + '; serving an empty 60s snapshot.');\n      return approvedBuiltInVideos();",
    /Configured list outage must not resurrect built-ins/,
  )
})
