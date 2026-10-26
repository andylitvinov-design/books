import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import * as React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

// Actual page/component SSR with installed ReactDOM; only fixture collaborators.
// Effects do not run on the server. No application/auth/provider module is loaded.
// The API route/config are parsed, never imported: only pure expression/function
// bodies below run with synthetic origins/headers and no request transport.
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const formSource = read('components/coaching-intake-form.tsx')
const pageSource = read('app/[locale]/coaching/intake/page.tsx')
const routeSource = read('app/api/app/[...path]/route.js')
const configSource = read('lib/app/config.js')
const locales = ['en', 'ru', 'es']
const words = value => Object.fromEntries(locales.map(locale => [locale, value]))
let forbiddenCalls = 0
const forbidden = () => { forbiddenCalls++; throw Error('application/auth/provider execution forbidden') }
const styles = { __esModule: true, default: new Proxy({}, { get: (_target, key) => String(key) }) }
const fixtureModules = {
  react: React, 'react/jsx-runtime': jsxRuntime,
  'next/link': { __esModule: true, default: ({ children, href }) => React.createElement('a', { href }, children) },
  'next/image': { __esModule: true, default: ({ src, alt }) => React.createElement('img', { src, alt }) },
  'next/navigation': { notFound: forbidden },
  'lucide-react': Object.fromEntries(['ArrowRight', 'ArrowLeft', 'Check', 'ClipboardCopy', 'LockKeyhole', 'Plus', 'ShieldCheck', 'Trash2'].map(name => [name, () => null])),
  '@/lib/app/client-fetch': { appFetch: forbidden },
  '@/lib/coaching/intake-model': { COACHING_FIELDS: [{ id: 'request', required: true, group: 'session', max: 600, label: words('Synthetic request') }],
    COACHING_GROUPS: [{ id: 'session', title: words('Synthetic group'), hint: words('Synthetic hint') }],
    COACHING_TOPICS: [{ id: 'personal', label: words('Synthetic topic') }], COACHING_INTAKE_VERSION: 'synthetic',
    coachingIntakeEntryTopic: () => 'personal' },
  '@/lib/coaching/diagnostic-enquiry.mjs': { DIAGNOSTIC_START_KEY: 'synthetic-only', parseDiagnosticStart: () => null },
  '@/data/academy/catalog': { isPublicLocale: value => locales.includes(value) },
  '@/data/site-metadata': { metadataBaseFor: () => new URL('https://synthetic-site.invalid') },
  '@/components/public-site-header': { PublicSiteHeader: () => React.createElement('header', null, 'Synthetic header') },
  './coaching-intake-form.module.css': styles, '../coaching-page.module.css': styles,
}
function compileActual(source, fileName) {
  const result = ts.transpileModule(source, { fileName, reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } })
  assert.equal(result.diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0)
  const context = { exports: {}, require: name => {
    assert.ok(name in fixtureModules, 'unexpected real module: ' + name)
    return fixtureModules[name]
  } }
  vm.runInNewContext(result.outputText, context, { timeout: 1000 })
  return context.exports
}
const Form = compileActual(formSource, 'coaching-intake-form.tsx').CoachingIntakeForm
fixtureModules['@/components/coaching-intake-form'] = { CoachingIntakeForm: Form }
const Page = compileActual(pageSource, 'page.tsx').default
const markup = async (locale, query) => renderToStaticMarkup(await Page({
  params: Promise.resolve({ locale }), searchParams: query === undefined ? undefined : Promise.resolve(query),
}))
const parseQuery = query => {
  const params = new URLSearchParams(query), result = {}
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key)
    result[key] = values.length === 1 ? values[0] : values
  }
  return result
}

test('actual ReactDOM SSR keeps ordinary public page and restricts private return before hydration', async () => {
  for (const locale of locales) {
    const normal = await markup(locale)
    assert.match(normal, /data-coaching-request/)
    assert.doesNotMatch(normal, /data-coaching-private-copy/)
    for (let reload = 0; reload < 2; reload++) {
      const privatePage = await markup(locale, { private: '1' })
      assert.match(privatePage, /data-coaching-private-copy/)
      assert.doesNotMatch(privatePage, /data-coaching-request|class="sendButton"|data-coaching-enquiry-saved/)
      assert.match(privatePage, /class="saveDraft"/, 'existing deliberate private login remains')
    }
  }
  assert.equal(forbiddenCalls, 0, 'SSR performs no auth, storage, API or provider operation')
})

test('malformed/repeated private query renders neutral no-form response, never a public-send fallback', async () => {
  const invalid = ['', '0', 'true', '01', '%31', ['1'], ['1', '1'], ['1', '0'], ['0', '1']]
  for (const locale of locales) for (const value of invalid) {
    const html = await markup(locale, { private: value })
    assert.match(html, /data-coaching-invalid-private-return/)
    assert.doesNotMatch(html, /data-coaching-intake|data-coaching-request|class="sendButton"|class="saveDraft"/)
  }
  for (const query of ['?private=%31', '?pri%76ate=1']) {
    assert.match(await markup('en', parseQuery(query)), /data-coaching-private-copy/)
  }
  for (const query of ['?private=%2531', '?private=1&private=1', '?private=1&private=0', '?private']) {
    assert.match(await markup('en', parseQuery(query)), /data-coaching-invalid-private-return/)
  }
  assert.equal(forbiddenCalls, 0)
})

test('untrusted URL hints can restrict UI but cannot become receipt, linkage or authenticated access', async () => {
  const html = await markup('en', { private: '1', receipt: 'HH-FFFFFFFFFFFF', operationId: 'synthetic-forged-id',
    accountId: 'synthetic-other-account', linked: 'true', initData: 'synthetic-not-a-session' })
  assert.match(html, /data-coaching-private-copy/)
  assert.doesNotMatch(html, /HH-FFFFFFFFFFFF|synthetic-other-account|synthetic-not-a-session|data-coaching-enquiry-saved/)
  assert.equal(forbiddenCalls, 0)
})

function ast(source, name) {
  const result = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  assert.equal(result.parseDiagnostics.length, 0)
  return result
}
function findAll(node, predicate) {
  const result = []
  const visit = child => { if (predicate(child)) result.push(child); ts.forEachChild(child, visit) }
  visit(node)
  return result
}
const route = ast(routeSource, 'route.js')
const callbackBlocks = findAll(route, node => ts.isIfStatement(node)
  && node.expression.getText(route) === "joined === 'auth/callback' && method === 'GET'")
assert.equal(callbackBlocks.length, 1)
const destinations = findAll(callbackBlocks[0], node => ts.isVariableDeclaration(node) && node.name.getText(route) === 'destination')
assert.equal(destinations.length, 1)
const destinationExpression = destinations[0].initializer.getText(route)
const redirect = (change = {}) => vm.runInNewContext(destinationExpression, {
  origin: 'https://synthetic-site.invalid', locale: 'en', intentId: null, serviceId: null,
  continueTo: 'coaching-intake', requestId: null, returnPath: null, program: null,
  coachingMode: null, coachingLang: null, profi: null, ...change,
}, { timeout: 1000 })
const authQueryFunctions = findAll(route, node => ts.isArrowFunction(node)
  && node.getText(route).includes("url.searchParams.set('auth', value)"))
assert.equal(authQueryFunctions.length, 2)

test('actual callback destination stays same-origin/same-path with only constant restrictive query', () => {
  for (const origin of ['https://synthetic-site.invalid', 'http://localhost:3100']) for (const locale of locales) {
    const destination = redirect({ origin, locale })
    assert.equal(destination, `${origin}/${locale}/coaching/intake?private=1`)
    for (const reason of ['cancelled', 'failed']) for (const fn of authQueryFunctions) {
      const result = vm.runInNewContext(`(${fn.getText(route)})(${JSON.stringify(reason)})`, { URL, destination }, { timeout: 1000 })
      const url = new URL(result)
      assert.equal(url.origin, origin)
      assert.equal(url.pathname, `/${locale}/coaching/intake`)
      assert.equal(url.searchParams.get('private'), '1')
      assert.equal(url.searchParams.get('auth'), reason)
    }
  }
  assert.equal(redirect({ continueTo: 'tests' }), 'https://synthetic-site.invalid/en/app/tests?selection=pending')
  assert.equal(redirect({ continueTo: 'business' }), 'https://synthetic-site.invalid/en/app/business')
  assert.equal(redirect({ continueTo: 'enquiry', returnPath: '/en/coaching/intake' }), 'https://synthetic-site.invalid/en/coaching/intake?hh_enquiry=google')
})

const config = ast(configSource, 'config.js')
const pureOriginFunctions = ['requestOrigin', 'requireSameOrigin'].map(name => {
  const found = findAll(config, node => ts.isFunctionDeclaration(node) && node.name?.text === name)
  assert.equal(found.length, 1)
  return found[0].getText(config).replace(/^export /, '')
}).join('\n')
class SyntheticAppError extends Error { constructor(code, status) { super(code); this.status = status } }
const originRuntime = { URL, AppError: SyntheticAppError }
vm.runInNewContext(pureOriginFunctions, originRuntime, { timeout: 1000 })
const request = (headers, url = 'https://synthetic-site.invalid/api/app/auth/callback') => ({
  url, headers: { get: name => headers[name] ?? null },
})

test('actual configured-origin checks reject spoofed hosts and cross-site POST before any redirect', () => {
  const config = { origins: ['https://synthetic-site.invalid', 'http://localhost:3100'] }
  assert.equal(originRuntime.requestOrigin(request({ host: 'synthetic-site.invalid' }), config), config.origins[0])
  assert.equal(originRuntime.requestOrigin(request({}), config), config.origins[0])
  for (const host of ['evil.invalid', 'synthetic-site.invalid,evil.invalid', 'synthetic-site.invalid@evil.invalid', 'synthetic-site.invalid/path', 'synthetic-site.invalid%2Fevil']) {
    assert.throws(() => originRuntime.requestOrigin(request({ host }), config), /ORIGIN_DENIED/)
  }
  assert.throws(() => originRuntime.requestOrigin(request({}, 'https://evil.invalid/callback'), config), /ORIGIN_DENIED/)
  assert.equal(originRuntime.requireSameOrigin(request({ host: 'synthetic-site.invalid', origin: config.origins[0] }), config), config.origins[0])
  assert.throws(() => originRuntime.requireSameOrigin(request({ host: 'synthetic-site.invalid', origin: 'https://evil.invalid' }), config), /ORIGIN_DENIED/)
  assert.throws(() => originRuntime.requireSameOrigin(request({ host: 'synthetic-site.invalid', origin: config.origins[0], 'sec-fetch-site': 'cross-site' }), config), /ORIGIN_DENIED/)
})

test('restrictive return leaves provider scopes, verified account and private-save authorization gates intact', () => {
  assert.match(routeSource, /scopes: 'openid email profile'/)
  assert.match(routeSource, /origin = requestOrigin\(request, config\)/)
  assert.match(routeSource, /if \(method !== 'GET' && method !== 'HEAD'\) requireSameOrigin\(request, config\)/)
  assert.match(routeSource, /const actor = await auth\.verified\(\)/)
  const privateBlocks = findAll(route, node => ts.isIfStatement(node)
    && node.expression.getText(route) === "joined === 'coaching-intake'")
  assert.equal(privateBlocks.length, 1)
  assert.match(privateBlocks[0].getText(route), /request\.headers\.get\('x-hh-account-id'\) !== actor\.id/)
  assert.match(formSource, /if \(!consent\) \{ setError\(t\.consent\); return; \}/)
  assert.match(formSource, /JSON\.stringify\(\{ version: COACHING_INTAKE_VERSION, expires: Date\.now\(\) \+ 15 \* 60 \* 1000, draft \}\)/)
})
