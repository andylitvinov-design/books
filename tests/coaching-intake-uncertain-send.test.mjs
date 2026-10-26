import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

// Execute the actual component and its rendered callbacks, with a closed fake
// hook/JSX runtime. Tests explicitly opt into the actual first mount effect,
// using deferred in-memory account replies/storage/BroadcastChannel only.
// No app, auth, provider or database module is loaded; second/context effect is
// not executed. All requests and interactions remain synthetic fixtures.
const source = readFileSync(new URL('../components/coaching-intake-form.tsx', import.meta.url), 'utf8')
const ast = ts.createSourceFile('coaching-intake-form.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
assert.equal(ast.parseDiagnostics.length, 0)
assert.deepEqual(ast.statements.filter(ts.isImportDeclaration).map(node => node.moduleSpecifier.text), [
  'react', 'next/link', 'lucide-react', '@/lib/app/client-fetch', '@/lib/coaching/intake-model',
  '@/lib/coaching/diagnostic-enquiry.mjs', '@/lib/public-locales', './coaching-intake-form.module.css',
])
const component = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'CoachingIntakeForm')
assert.ok(component)
const states = [], refs = []
for (const statement of component.body.statements) if (ts.isVariableStatement(statement)) {
  for (const node of statement.declarationList.declarations) {
    if (!node.initializer || !ts.isCallExpression(node.initializer)) continue
    if (node.initializer.expression.getText(ast) === 'useState') states.push(node.name.elements[0].name.text)
    if (node.initializer.expression.getText(ast) === 'useRef') refs.push(node.name.text)
  }
}
const compiled = ts.transpileModule(source, { fileName: 'coaching-intake-form.tsx', reportDiagnostics: true,
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } })
assert.equal(compiled.diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0)
const locales = ['en', 'ru', 'es']
const words = text => Object.fromEntries(locales.map(locale => [locale, text]))
const fields = ['request', 'outcome', 'priority'].map(id => ({ id, required: true,
  group: 'session', label: words('Synthetic ' + id), max: 600 }))
const draft = () => ({ topic: 'personal', name: '', city: '', status: 'draft', questions: [''],
  answers: Object.fromEntries(fields.map(field => [field.id, 'Synthetic original answer'])) })
const publicPath = '/api/coaching-diagnostic', telegramPath = publicPath + '/telegram'
const reply = (status = 201, error = 'INVALID_COACHING_ENQUIRY') => ({ ok: status < 400, status,
  json: async () => status < 400 ? { saved: true, referenceCode: 'HH-000000000001' } : { error } })
const lost = () => { throw new Error('SYNTHETIC_ACCEPTED_BUT_RESPONSE_LOST') }
const settle = async () => { await new Promise(resolve => setImmediate(resolve)); await new Promise(resolve => setImmediate(resolve)) }
function nodes(tree, predicate) {
  const result = []
  const visit = node => {
    if (Array.isArray(node)) return node.forEach(visit)
    if (!node || typeof node !== 'object') return
    if (predicate(node)) result.push(node)
    visit(node.props?.children)
  }
  visit(tree)
  return result
}
const byClass = (tree, name) => nodes(tree, node => node.props?.className === name)
const renderedText = node => Array.isArray(node) ? node.map(renderedText).join('')
  : typeof node === 'string' || typeof node === 'number' ? String(node) : renderedText(node?.props?.children || [])
function runtime(outcomes = [], initial = {}, config = {}) {
  const state = {}, ref = {}, requests = [], effects = [], forbidden = []
  let stateIndex = 0, refIndex = 0, uuid = 0, locale = initial.locale || 'en'
  const hooks = {
    useState(value) { const name = states[stateIndex++]; if (!(name in state)) state[name] = typeof value === 'function' ? value() : value
      return [state[name], next => { state[name] = typeof next === 'function' ? next(state[name]) : next }] },
    useRef(value) { const name = refs[refIndex++]; return ref[name] ||= { current: value } },
    useMemo(fn) { return fn() },
    useEffect(fn) { effects.push(fn) },
  }
  const jsx = (type, props) => ({ type, props: props || {} })
  const modules = {
    react: hooks, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'next/link': { __esModule: true, default: 'Link' },
    'lucide-react': Object.fromEntries(['ArrowRight', 'Check', 'ClipboardCopy', 'LockKeyhole', 'Plus', 'ShieldCheck', 'Trash2'].map(name => [name, name])),
    '@/lib/app/client-fetch': { appFetch: async (...args) => { if (config.appFetch) return config.appFetch(...args); forbidden.push(args); throw Error('appFetch must not execute') } },
    '@/lib/coaching/intake-model': { COACHING_FIELDS: fields,
      COACHING_GROUPS: [{ id: 'session', title: words('Synthetic group'), hint: words('Synthetic hint') }],
      COACHING_TOPICS: [{ id: 'personal', label: words('Synthetic topic') }], COACHING_INTAKE_VERSION: 'synthetic',
      coachingIntakeEntryTopic: () => 'personal' },
    '@/lib/coaching/diagnostic-enquiry.mjs': { DIAGNOSTIC_START_KEY: 'synthetic-only',
      parseDiagnosticStart: () => null },
    './coaching-intake-form.module.css': { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) },
  }
  const context = { exports: {}, require: name => { assert.ok(name in modules, 'unexpected import ' + name); return modules[name] },
    window: { crypto: { randomUUID: () => '00000000-0000-4000-8000-' + String(++uuid).padStart(12, '0') },
      confirm: () => { if (config.confirm) return config.confirm(); forbidden.push('confirm'); throw Error('confirm must not execute') },
      location: { hash: '', search: '', assign: () => { forbidden.push('navigate'); throw Error('navigation must not execute') } } },
    sessionStorage: { removeItem: () => {}, getItem: () => null, setItem: (...args) => { forbidden.push(['storage', ...args]) } },
    navigator: { clipboard: { writeText: async value => { forbidden.push(['clipboard', value]) } } },
    URLSearchParams, BroadcastChannel: class { constructor() { config.channel = this } close() {} },
    fetch: async (url, options) => {
      assert.ok([publicPath, telegramPath].includes(url), 'only synthetic request paths')
      requests.push({ url, ...options })
      const next = outcomes.shift()
      assert.ok(next, 'unexpected extra request')
      return typeof next === 'function' ? next() : next
    },
  }
  vm.runInNewContext(compiled.outputText, context, { timeout: 1000 })
  Object.assign(state, { auth: 'guest', draft: draft(), sendConsent: true,
    replyContact: { email: 'synthetic@example.invalid', phone: '' } }, initial)
  function render(change = {}) {
    Object.assign(state, change)
    if (change.locale) locale = change.locale
    const count = requests.length
    stateIndex = 0; refIndex = 0
    const tree = context.exports.CoachingIntakeForm({ locale })
    assert.equal(stateIndex, states.length); assert.equal(refIndex, refs.length)
    assert.equal(requests.length, count, 'render never auto-sends')
    return tree
  }
  return { state, ref, requests, forbidden, effects, render,
    async click(change = {}) { const button = byClass(render(change), 'sendButton')[0]; assert.ok(button); button.props.onClick(); await settle() } }
}
const linked = { telegramStatus: 'linked', telegramInitData: 'synthetic-not-a-real-session',
  sendConsent: false, replyContact: { email: '', phone: '' } }

test('accepted-but-lost Telegram request survives 401/404 without a new UUID or public fallback', async () => {
  for (const locale of locales) {
    const r = runtime([lost, reply(401), reply(404), reply()], { ...linked, locale })
    await r.click()
    const attempt = r.ref.leadAttempt.current
    assert.ok(attempt, 'lost response retains the original attempt')
    for (const status of [401, 404]) {
      await r.click()
      assert.strictEqual(r.ref.leadAttempt.current, attempt, 'preserve attempt after ' + status)
      assert.equal(r.state.telegramStatus, 'linked', 'no silent public fallback')
      assert.equal(r.state.leadLocked, true)
      const message = renderedText(byClass(r.render(), 'requestError')[0])
      assert.ok(message.includes({ en: 'same Telegram chat', ru: 'тот же диалог Telegram', es: 'mismo chat' }[locale]))
    }
    assert.ok(Object.isFrozen(attempt), 'actual attempt is immutable')
    await r.click()
    assert.equal(r.requests.length, 4)
    for (const request of r.requests) { assert.equal(request.url, telegramPath); assert.equal(request.body, attempt.body) }
    assert.equal(r.state.leadReceipt, 'HH-000000000001')
    assert.equal(byClass(r.render(), 'sendButton').length, 0)
    assert.equal(r.forbidden.length, 0)
  }
})

test('status changes in flight cannot reroute the frozen public or Telegram payload', async () => {
  for (const telegram of [false, true]) {
    let reject
    const pending = () => new Promise((_, rejectPromise) => { reject = rejectPromise })
    const r = runtime([pending, reply()], telegram ? linked : {})
    const first = byClass(r.render(), 'sendButton')[0]
    first.props.onClick()
    assert.equal(r.requests.length, 1)
    r.render({ telegramStatus: telegram ? 'unavailable' : 'linked', telegramInitData: 'synthetic-new-context' })
    reject(new Error('SYNTHETIC_LOST_RESPONSE')); await settle()
    await r.click()
    assert.equal(r.requests.length, 2)
    assert.equal(r.requests[1].url, telegram ? telegramPath : publicPath)
    assert.equal(r.requests[1].body, r.requests[0].body)
    assert.match(renderedText(byClass(r.render(), 'requestSuccess')[0]), telegram
      ? /existing Telegram chat/ : /questionnaire and contact were received/)
  }
})

test('an uncertain outcome followed by 400 keeps the same attempt and locks edits', async () => {
  const r = runtime([lost, reply(400), reply()], linked)
  await r.click(); const attempt = r.ref.leadAttempt.current
  await r.click()
  assert.strictEqual(r.ref.leadAttempt.current, attempt)
  const tree = r.render()
  const answer = nodes(tree, node => node.props?.id === 'coaching-field-request')[0]
  assert.equal(answer.props.disabled, true)
  answer.props.onChange({ target: { value: 'Synthetic changed after unknown receipt' } })
  assert.equal(r.state.draft.answers.request, 'Synthetic original answer', 'actual edit guard rejects mutation')
  await r.click()
  assert.equal(r.requests[2].body, r.requests[0].body)
})

test('only a first definitive 400 allows explicit edits and a new attempt UUID', async () => {
  for (const telegram of [false, true]) {
  const r = runtime([reply(400), reply()], telegram ? linked : {})
  await r.click()
  assert.equal(r.ref.leadAttempt.current, null)
  assert.equal(Boolean(r.state.leadLocked), false)
  const answer = nodes(r.render(), node => node.props?.id === 'coaching-field-request')[0]
  assert.equal(answer.props.disabled, false)
  answer.props.onChange({ target: { value: 'Synthetic corrected answer' } })
  await r.click()
  const [before, after] = r.requests.map(request => { const body = JSON.parse(request.body); return telegram ? body.questionnaire : body })
  assert.notEqual(after.operationId, before.operationId)
  assert.equal(after.answers.request, 'Synthetic corrected answer')
  assert.equal(telegram ? after.confirmed : after.contactConsent, true)
  }
})

test('unrecognized 400 cannot be treated as proof of non-write', async () => {
  const r = runtime([reply(400, 'UNRECOGNIZED_ERROR'), reply()])
  await r.click(); const attempt = r.ref.leadAttempt.current
  assert.ok(attempt)
  assert.equal(r.state.leadLocked, true)
  await r.click()
  assert.strictEqual(r.ref.leadAttempt.current, attempt)
  assert.equal(r.requests[1].body, r.requests[0].body)
})

test('pending linkage blocks initial send, while ordinary public consent and contact gates remain', async () => {
  for (const change of [{ telegramStatus: 'checking' }, { sendConsent: false },
    { replyContact: { email: '', phone: '' } }, { draft: { ...draft(), answers: {} } }]) {
    const r = runtime([], change)
    assert.equal(byClass(r.render(), 'sendButton')[0].props.disabled, true)
    await r.click()
    assert.equal(r.requests.length, 0)
    assert.equal(r.ref.leadAttempt.current, null)
  }
})

test('rapid duplicate clicks and personal-copy actions cannot discard an in-flight attempt', async () => {
  let resolve
  const r = runtime([() => new Promise(done => { resolve = done })])
  const tree = r.render()
  const send = byClass(tree, 'sendButton')[0]
  send.props.onClick(); send.props.onClick()
  assert.equal(r.requests.length, 1, 'same-render second tap does not create another request')
  const locked = r.render()
  assert.equal(byClass(locked, 'choiceFieldset')[0].props.disabled, true)
  const contact = nodes(locked, node => node.type === 'input' && node.props.type === 'email')[0]
  assert.equal(contact.props.disabled, true)
  const before = r.ref.leadAttempt.current.body
  byClass(locked, 'phoneToggle')[0].props.onClick()
  assert.equal(r.state.showPhone, true, 'presentation toggle remains available')
  assert.equal(r.ref.leadAttempt.current.body, before, 'presentation toggle cannot edit frozen payload')
  const login = byClass(locked, 'saveDraft')[0]
  assert.equal(login.props.disabled, true)
  login.props.onClick(); await settle()
  assert.equal(r.forbidden.length, 0, 'actual signIn guard prevents navigation/API')
  resolve(reply()); await settle()
})

test('confirmed public receipt restores optional private saving without enabling a second CRM send', async () => {
  for (const signed of [false, true]) {
    const r = runtime([reply()], { auth: signed ? 'signed' : 'guest', consent: true,
      saved: { accountId: 'synthetic-account', revision: 1, intake: null } })
    await r.click(); const attempt = r.ref.leadAttempt.current
    const tree = r.render()
    assert.equal(r.state.leadLocked, false)
    assert.equal(byClass(tree, 'sendButton').length, 0)
    const answer = nodes(tree, node => node.props?.id === 'coaching-field-request')[0]
    assert.equal(answer.props.disabled, false)
    answer.props.onChange({ target: { value: 'Synthetic private-only edit after confirmed send' } })
    assert.equal(r.state.draft.answers.request, 'Synthetic private-only edit after confirmed send')
    const privateAction = byClass(r.render(), 'saveDraft')[0]
    assert.equal(privateAction.props.disabled, false)
    privateAction.props.onClick(); await settle()
    assert.equal(r.forbidden.length, 1, 'only the explicit synthetic private-save/login mock was invoked')
    assert.equal(r.forbidden[0][0], signed ? 'coaching-intake' : 'auth/start')
    assert.strictEqual(r.ref.leadAttempt.current, attempt)
    assert.equal(attempt.endpoint, publicPath)
    assert.equal(r.state.leadReceipt, 'HH-000000000001')
    assert.equal(r.requests.length, 1)
  }
})

test('malformed success receipt is uncertain, not permission to edit or regenerate identity', async () => {
  const r = runtime([{ ok: true, status: 201, json: async () => ({ saved: true }) }, reply()])
  await r.click(); const attempt = r.ref.leadAttempt.current
  assert.equal(r.state.leadLocked, true)
  await r.click()
  assert.strictEqual(r.ref.leadAttempt.current, attempt)
  assert.equal(r.requests[1].body, r.requests[0].body)
})


test('REVIEW: late private-account hydration must not replace visible locked original answers', async () => {
  let resolveAccount
  const config = { appFetch: () => new Promise(resolve => { resolveAccount = resolve }) }
  const r = runtime([lost, reply()], { auth: 'checking' }, config)
  r.render(); r.effects[0]()
  await r.click()
  const attempt = r.ref.leadAttempt.current
  resolveAccount({ accountId: 'synthetic-account', revision: 1, intake: {
    ...draft(), answers: { request: 'Synthetic saved private answer', outcome: 'Saved outcome', priority: 'Saved priority' }
  } })
  await settle()
  assert.strictEqual(r.ref.leadAttempt.current, attempt, 'wire attempt stays stable')
  assert.equal(r.state.leadLocked, true)
  assert.equal(r.state.draft.answers.request, 'Synthetic original answer', 'locked UI must display the answers being retried')
})

test('REVIEW: late collision resolution must not replace visible locked original answers', async () => {
  const r = runtime([lost, reply()])
  await r.click()
  const tree = r.render({ collision: true, saved: { accountId: 'synthetic-account', revision: 1,
    intake: { ...draft(), answers: { request: 'Synthetic saved private answer' } } } })
  const conflict = byClass(tree, 'conflict')[0]
  const loadSaved = nodes(conflict, node => node.type === 'button')[0]
  if (loadSaved) loadSaved.props.onClick()
  assert.equal(r.state.draft.answers.request, 'Synthetic original answer', 'locked UI cannot be edited through conflict handler')
})

test('REVIEW: signout invalidates late private-account hydration', async () => {
  let resolveAccount
  const config = { appFetch: () => new Promise(resolve => { resolveAccount = resolve }) }
  const r = runtime([], { auth: 'checking' }, config)
  r.render(); r.effects[0]()
  config.channel.onmessage({ data: 'signed-out' })
  assert.equal(r.state.auth, 'guest')
  resolveAccount({ accountId: 'synthetic-old-account', revision: 1, intake: draft() })
  await settle()
  assert.equal(r.state.auth, 'guest', 'old response must not restore signed-in state after logout')
  assert.equal(r.state.saved, null, 'old account must not reappear')
  assert.equal(r.state.draft.answers.request || '', '', 'private answers stay cleared')
})

test('REVIEW: retry cannot send cleared account answers after signout', async () => {
  const config = { appFetch: () => new Promise(() => {}) }
  const r = runtime([lost, reply()], { auth: 'signed' }, config)
  r.render(); r.effects[0]()
  await r.click()
  config.channel.onmessage({ data: 'signed-out' })
  assert.equal(r.state.draft.answers.request || '', '', 'private answers are cleared on signout')
  const button = byClass(r.render(), 'sendButton')[0]
  if (button) { assert.equal(button.props.disabled, true, 'present retry must be disabled after signout'); button.props.onClick() }
  await settle()
  assert.equal(r.requests.length, 1, 'cleared former account answers must not be sent again')
})

test('REVIEW: captured pre-signout retry callback cannot send former-account payload', async () => {
  const config = { appFetch: () => new Promise(() => {}) }
  const r = runtime([lost, reply()], { auth: 'signed' }, config)
  r.render(); r.effects[0]()
  await r.click()
  const capturedRetry = byClass(r.render(), 'sendButton')[0]
  config.channel.onmessage({ data: 'signed-out' })
  capturedRetry.props.onClick(); await settle()
  assert.equal(r.requests.length, 1, 'ref-level interruption guard rejects captured callback')
})

test('REVIEW: late send receipt after signout cannot resurface former-account request', async () => {
  let resolveSend
  const config = { appFetch: () => new Promise(() => {}) }
  const r = runtime([() => new Promise(resolve => { resolveSend = resolve })], { auth: 'signed' }, config)
  r.render(); r.effects[0]()
  byClass(r.render(), 'sendButton')[0].props.onClick()
  const attempt = r.ref.leadAttempt.current
  config.channel.onmessage({ data: 'signed-out' })
  resolveSend(reply()); await settle()
  const tree = r.render()
  assert.ok(!renderedText(tree).includes('HH-000000000001'), 'late old receipt stays off signed-out screen')
  assert.strictEqual(r.ref.leadAttempt.current, attempt, 'old dedupe identity retained')
  assert.equal(r.requests.length, 1)
})

test('REVIEW: late private save after confirmed send and signout cannot restore old answers', async () => {
  let resolveSave
  const config = { appFetch: (_path, input) => input ? new Promise(resolve => { resolveSave = resolve }) : new Promise(() => {}) }
  const r = runtime([reply()], { auth: 'signed', consent: true,
    saved: { accountId: 'synthetic-account', revision: 1, intake: draft() } }, config)
  r.render(); r.effects[0]()
  await r.click()
  byClass(r.render(), 'saveDraft')[0].props.onClick()
  config.channel.onmessage({ data: 'signed-out' })
  resolveSave({ accountId: 'synthetic-account', revision: 2, intake: draft() }); await settle()
  assert.equal(r.state.auth, 'guest')
  assert.equal(r.state.saved, null, 'old private-save result remains detached')
  assert.equal(r.state.draft.answers.request || '', '', 'old private answers remain cleared')
})

test('first validation rejection does not let a late old private load overwrite subsequent edits', async () => {
  let resolveAccount
  const config = { appFetch: () => new Promise(resolve => { resolveAccount = resolve }) }
  const r = runtime([reply(400), reply()], { auth: 'checking' }, config)
  r.render(); r.effects[0]()
  await r.click()
  assert.equal(r.ref.leadAttempt.current, null)
  assert.equal(r.state.auth, 'error', 'unknown private state is explicitly unavailable, not a permanent spinner')
  const answer = nodes(r.render(), node => node.props?.id === 'coaching-field-request')[0]
  answer.props.onChange({ target: { value: 'Synthetic revised after definite rejection' } })
  resolveAccount({ accountId: 'synthetic-old-account', revision: 1, intake: draft() }); await settle()
  assert.equal(r.state.draft.answers.request, 'Synthetic revised after definite rejection')
  assert.equal(r.state.saved, null)
  assert.equal(r.state.collision, false)
  await r.click()
  assert.equal(JSON.parse(r.requests[1].body).answers.request, 'Synthetic revised after definite rejection')
  assert.equal(byClass(r.render(), 'saveDraft')[0].props.disabled, false, 'deliberate private login remains after receipt')
})

test('late private delete after confirmed send and signout cannot restore account state or notices', async () => {
  let resolveDelete
  const config = { confirm: () => true,
    appFetch: (_path, input) => input ? new Promise(resolve => { resolveDelete = resolve }) : new Promise(() => {}) }
  const r = runtime([reply()], { auth: 'signed', consent: true,
    saved: { accountId: 'synthetic-account', revision: 1, intake: draft() } }, config)
  r.render(); r.effects[0]()
  await r.click()
  byClass(r.render(), 'delete')[0].props.onClick()
  config.channel.onmessage({ data: 'signed-out' })
  resolveDelete({ accountId: 'synthetic-account', revision: 2, intake: null }); await settle()
  assert.equal(r.state.saved, null)
  assert.equal(r.state.auth, 'guest')
  assert.equal(r.state.notice, '')
  assert.equal(r.state.draft.answers.request || '', '')
})

test('late auth-start after signout cannot navigate or stage previous-account draft', async () => {
  let resolveLogin
  const config = { appFetch: path => path === 'auth/start'
    ? new Promise(resolve => { resolveLogin = resolve }) : new Promise(() => {}) }
  const r = runtime([reply()], {}, config)
  r.render(); r.effects[0]()
  await r.click()
  byClass(r.render(), 'saveDraft')[0].props.onClick()
  config.channel.onmessage({ data: 'signed-out' })
  resolveLogin({ redirectUrl: 'https://synthetic.invalid/no-navigation' }); await settle()
  assert.equal(r.forbidden.length, 0)
  assert.equal(r.state.busy, false)
  assert.equal(r.state.saved, null)
})

test('normal logout without an attempted send clears prior contact and allows a fresh explicit guest request', async () => {
  const config = { appFetch: () => new Promise(() => {}) }
  const r = runtime([reply()], { auth: 'signed' }, config)
  r.render(); r.effects[0]()
  config.channel.onmessage({ data: 'signed-out' })
  assert.equal(r.state.draft.answers.request || '', '')
  assert.equal(r.state.replyContact.email, '')
  assert.equal(r.state.sendConsent, false)
  assert.equal(r.state.leadSessionChanged, false)
  await r.click({ draft: draft(), sendConsent: true, replyContact: { email: 'new-synthetic@example.invalid', phone: '' } })
  assert.equal(r.requests.length, 1)
  assert.equal(JSON.parse(r.requests[0].body).contact.email, 'new-synthetic@example.invalid')
})

test('captured copy and contact callbacks cannot expose or restore old data after signout', async () => {
  const config = { appFetch: () => new Promise(() => {}) }
  const r = runtime([lost], { auth: 'signed' }, config)
  r.render(); r.effects[0]()
  await r.click()
  const tree = r.render()
  const copy = byClass(tree, 'copy')[0]
  const contact = nodes(tree, node => node.type === 'input' && node.props.type === 'email')[0]
  config.channel.onmessage({ data: 'signed-out' })
  copy.props.onClick(); contact.props.onChange({ target: { value: 'prior-synthetic@example.invalid' } }); await settle()
  assert.equal(r.forbidden.length, 0)
  assert.equal(r.state.replyContact.email, '')
  assert.ok(!renderedText(r.render()).includes('Synthetic original answer'))
  assert.strictEqual(r.ref.leadAttempt.current !== null, true)
})

test('confirmed receipt stays tied to the earlier session and is hidden after actual signout', async () => {
  for (const locale of locales) {
    const config = { appFetch: () => new Promise(() => {}) }
    const r = runtime([reply()], { auth: 'signed', locale }, config)
    r.render(); r.effects[0]()
    await r.click(); const attempt = r.ref.leadAttempt.current
    assert.ok(renderedText(r.render()).includes('HH-000000000001'))
    config.channel.onmessage({ data: 'signed-out' })
    const tree = r.render()
    assert.ok(!renderedText(tree).includes('HH-000000000001'))
    assert.equal(nodes(tree, node => node.props?.['data-coaching-send-quarantined'] !== undefined).length, 1)
    assert.equal(byClass(tree, 'sendButton').length, 0)
    assert.equal(nodes(tree, node => ['input', 'textarea'].includes(node.type)).length, 0)
    assert.strictEqual(r.ref.leadAttempt.current, attempt)
    assert.equal(r.requests.length, 1)
  }
})
