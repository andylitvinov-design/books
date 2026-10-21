import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

// Actual source in a closed synthetic VM, not React/browser/DB acceptance.
// No production adapter is imported; unknown imports and private calls fail shut.
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const repositorySource = read('lib/practitioners/repository.js')
const workspaceSource = read('components/app/practice-workspace.jsx')
const plain = value => JSON.parse(JSON.stringify(value))
const forbidden = name => () => { throw new Error('Unexpected adapter: ' + name) }
const compiled = new Map()
function sourceModule(source, name, modules = {}, globals = {}) {
  const key = name + '\n' + source
  if (!compiled.has(key)) {
    const result = ts.transpileModule(source, {
      // Use a JS compilation name: TypeScript preserves ESM for an .mjs name.
      fileName: name.replace(/\.mjs$/, '.js'), reportDiagnostics: true, compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022, esModuleInterop: true,
      },
    })
    assert.deepEqual((result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error), [])
    compiled.set(key, result.outputText)
  }
  const module = { exports: {} }
  runInNewContext(compiled.get(key), {
    ...globals, module, exports: module.exports,
    require: name => {
      assert.ok(Object.hasOwn(modules, name), 'Unmocked dependency: ' + name)
      return modules[name]
    },
  }, { timeout: 2000, contextCodeGeneration: { strings: false, wasm: false } })
  return module.exports
}
class AppError extends Error {
  constructor(code, status) { super(code); this.code = code; this.status = status }
}
const contracts = sourceModule(read('lib/practitioners/contracts.js'), 'contracts.js', {
  '../assessments/contracts.js': { AppError, assertObject: forbidden('assertObject'), onlyKeys: forbidden('onlyKeys'), text: forbidden('text') },
  './presentation-contract.js': { normalizeVideoPresentation: forbidden('normalizeVideoPresentation') },
})
const activation = sourceModule(read('lib/practitioners/practice-activation.mjs'), 'practice-activation.mjs')
const quota = sourceModule(read('lib/practitioners/service-quota.js'), 'service-quota.js')
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222'
const P = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', Q = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const R1 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', R2 = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const RF = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', DAY = '2026-10-20'
const actor = Object.freeze({ id: A, displayName: 'Synthetic account', claims: Object.freeze({ sub: A }) })
const config = Object.freeze({ syntheticOnly: true })
const master = (status = 'submitted', extra = {}) => ({
  id: P, trusted_auth_user_id: A, slug: 'synthetic-practice', status,
  draft_profile: { displayName: 'Synthetic practitioner' }, public_profile: {}, ...extra,
})
const offering = (status = 'submitted', practitioner_id = P, id = 'synthetic-service') => ({
  id, practitioner_id, status, localized_copy: {}, draft_copy: {}, pricing_mode: 'free',
})
const normalize = sql => sql.replace(/\s+/g, ' ').trim()
const SQL = {
  account: 'select id,status,onboarding_state from app.accounts where id=$1',
  practitioner: 'select * from app.practitioners where trusted_auth_user_id=$1',
  services: 'select * from app.service_offerings where practitioner_id=$1 order by created_at,id',
  guardServices: "select status from app.service_offerings where practitioner_id=$1 and status in ('submitted','changes_requested','published','paused') limit 1",
  credentials: 'select * from app.practitioner_credentials where practitioner_id=$1 order by created_at,id',
  requests: 'select * from app.consultation_requests where recipient_practitioner_id=$1 order by created_at desc,id',
  totals: 'select request_id,count(*)::int as message_count,max(created_at) as last_message_at from app.practitioner_request_messages where request_id=any($1::uuid[]) group by request_id',
  latest: "select distinct on (request_id) request_id,author_role,created_at from app.practitioner_request_messages where request_id=any($1::uuid[]) and visibility='participants' order by request_id,created_at desc,id desc",
  unseen: "select m.request_id,count(*)::int as unseen_count from app.practitioner_request_messages m left join app.practitioner_request_reads seen on seen.request_id=m.request_id and seen.account_id=$2 where m.request_id=any($1::uuid[]) and m.visibility='participants' and m.author_role='client' and m.author_account_id<>$2 and (seen.last_seen_at is null or m.created_at>seen.last_seen_at) group by m.request_id",
  counts: "select request_id,count(*)::int as open_count, (count(*) filter (where due_on=$3::date))::int as today_count, (count(*) filter (where due_on<$3::date))::int as overdue_count, min(due_on)::text as next_due_on from app.practitioner_request_tasks where practitioner_account_id=$1 and status='open' and request_id=any($2::uuid[]) group by request_id",
  tasks: "select id,request_id,kind,due_on::text as due_on,status,revision from app.practitioner_request_tasks where practitioner_account_id=$1 and status='open' and request_id=any($2::uuid[]) order by due_on asc,id asc limit 150",
  dates: `select ((now() at time zone 'America/Toronto')::date-1)::text as yesterday, ((now() at time zone 'America/Toronto')::date-7)::text as "weekStart"`,
  daily: 'select f.service_id as "serviceId",f.day::text as day,f.impressions, f.order_clicks as orders,f.whatsapp_clicks as whatsapp,f.telegram_clicks as telegram from app_private.service_funnel_daily f join app.service_offerings s on s.id=f.service_id where s.practitioner_id=$1 and f.day >= $2::date and f.day <= $3::date',
}
const requestRow = (id, recipient_practitioner_id = P) => ({
  id, recipient_practitioner_id, account_id: B, status: 'requested',
  created_at: '2026-10-19T12:00:00Z', contact_ciphertext: 'synthetic-contact',
  message_ciphertext: 'synthetic-message', shared_excerpt_ciphertext: 'synthetic-excerpt',
})
const taskRows = [
  ...Array.from({ length: 153 }, (_, i) => ({ id: 'task-' + String(i).padStart(3, '0'), request_id: R1, practitioner_account_id: A, status: 'open', due_on: i < 2 ? '2026-10-19' : DAY, kind: 'reply', revision: 0 })),
  ...Array.from({ length: 2 }, (_, i) => ({ id: 'future-' + i, request_id: R2, practitioner_account_id: A, status: 'open', due_on: '2026-10-21', kind: 'general', revision: 1 })),
  { id: 'foreign-owner', request_id: R1, practitioner_account_id: B, status: 'open', due_on: DAY },
  { id: 'foreign-request', request_id: RF, practitioner_account_id: A, status: 'open', due_on: DAY },
  { id: 'completed', request_id: R1, practitioner_account_id: A, status: 'done', due_on: DAY },
]
function fixture({
  account = { id: A, status: 'active', onboarding_state: 'active' },
  practitioners = [master()], services = [offering()], privateAllowed = false,
  requests = [requestRow(R1), requestRow(R2), requestRow(RF, Q)],
  source = repositorySource, queryFailure = null,
} = {}) {
  const calls = [], privateCalls = []
  const owned = practitioners.find(p => p.trusted_auth_user_id === actor.id)
  const ownedRequests = requests.filter(r => r.recipient_practitioner_id === owned?.id)
  const ids = ownedRequests.map(r => r.id)
  const permit = name => {
    privateCalls.push(name)
    assert.ok(privateAllowed, 'Unexpected private adapter: ' + name)
  }
  const paramsEqual = (actual, expected) => assert.deepEqual(plain(actual), expected)
  const db = { async query(sql, parameters = []) {
    const statement = normalize(sql), params = plain(parameters)
    calls.push({ statement, params })
    if (statement === queryFailure) throw new Error('Synthetic query failure')
    if (statement === SQL.account) {
      paramsEqual(params, [A]); return { rows: account?.id === A ? [account] : [] }
    }
    if (statement === SQL.practitioner) {
      paramsEqual(params, [A]); return { rows: owned ? [owned] : [] }
    }
    if (statement === SQL.services || statement === SQL.guardServices) {
      assert.ok(owned); paramsEqual(params, [owned.id])
      const rows = services.filter(s => s.practitioner_id === params[0])
      return { rows: statement === SQL.services ? rows : rows.filter(s => ['submitted', 'changes_requested', 'published', 'paused'].includes(s.status)).slice(0, 1).map(s => ({ status: s.status })) }
    }
    // Every other query is private. Reject it before returning any synthetic row.
    permit('query:' + statement)
    if (statement === SQL.credentials) {
      paramsEqual(params, [owned.id]); return { rows: [{ id: 'synthetic-credential', title: 'Synthetic only' }] }
    }
    if (statement === SQL.requests) {
      paramsEqual(params, [owned.id]); return { rows: ownedRequests }
    }
    if (statement === SQL.totals || statement === SQL.latest) {
      paramsEqual(params, [ids]); return { rows: [] }
    }
    if (statement === SQL.unseen) {
      paramsEqual(params, [ids, A]); return { rows: [] }
    }
    if (statement === SQL.counts || statement === SQL.tasks) {
      paramsEqual(params, statement === SQL.counts ? [A, ids, DAY] : [A, ids])
      const rows = taskRows.filter(t => t.practitioner_account_id === params[0] && params[1].includes(t.request_id) && t.status === 'open')
      if (statement === SQL.tasks) return { rows: [...rows].sort((a, b) => a.due_on.localeCompare(b.due_on) || a.id.localeCompare(b.id)).slice(0, 150) }
      return { rows: ids.map(id => {
        const own = rows.filter(t => t.request_id === id)
        return { request_id: id, open_count: own.length, today_count: own.filter(t => t.due_on === params[2]).length, overdue_count: own.filter(t => t.due_on < params[2]).length, next_due_on: own.map(t => t.due_on).sort()[0] }
      }).filter(row => row.open_count) }
    }
    if (statement === SQL.dates) { paramsEqual(params, []); return { rows: [{ yesterday: '2026-10-19', weekStart: '2026-10-13' }] } }
    if (statement === SQL.daily) { paramsEqual(params, [owned.id, '2026-10-13', '2026-10-19']); return { rows: [] } }
    throw new Error('Query outside projection whitelist: ' + statement)
  } }
  const modules = {
    'server-only': {}, 'node:crypto': { randomUUID: forbidden('randomUUID') },
    '../assessments/contracts.js': { AppError, onlyKeys: forbidden('onlyKeys'), requireUUID: forbidden('requireUUID'), revision: forbidden('revision'), text: forbidden('text') },
    '../app/database.js': { async transaction(...args) {
      assert.equal(args.length, 3); assert.equal(args[0], config); assert.equal(args[1], actor)
      return args[2](db)
    } },
    '../app/crypto.js': {
      openSealed(value) { permit('openSealed'); return value },
      operationHash() { permit('operationHash'); return 'synthetic-client-key' },
    },
    './contracts.js': { ...contracts, validateCredential: forbidden('validateCredential'), validateProfile: forbidden('validateProfile'), validateServiceDraft: forbidden('validateServiceDraft'), slugify: forbidden('slugify') },
    './practice-activation.mjs': activation,
    './service-analytics.js': { summarizeServiceAnalytics(items, daily, dates) { permit('summarizeServiceAnalytics'); return { synthetic: true, serviceIds: Array.from(items, s => s.id), daily: plain(daily), dates: plain(dates) } } },
    './service-quota.js': quota,
    './presentation-storage.js': { assertOwnedReadyPresentation: forbidden('assertOwnedReadyPresentation') },
    './public-service-enquiry.js': { async listPublicServiceEnquiries(receivedDb, id, receivedConfig) { permit('listPublicServiceEnquiries'); assert.equal(receivedDb, db); assert.equal(id, owned.id); assert.equal(receivedConfig, config); return [] }, updatePublicServiceEnquiry: forbidden('updatePublicServiceEnquiry') },
    './task-policy.js': { torontoToday() { permit('torontoToday'); return DAY } },
  }
  const repo = sourceModule(source, 'repository.js', modules).createPractitionerRepository(config)
  return { repo, calls, privateCalls, owned, run: () => repo.getMyPractice(actor) }
}
const falseKeys = ['credentials', 'practiceActivated', 'practitioner', 'practitionerTasks', 'requests', 'serviceQuota', 'services', 'suggestedProfile'].sort()
async function assertIneligible(f) {
  const result = plain(await f.run())
  assert.equal(result.practiceActivated, false)
  assert.deepEqual(Object.keys(result).sort(), falseKeys)
  for (const key of ['credentials', 'requests', 'practitionerTasks']) assert.deepEqual(result[key], [])
  assert.deepEqual(f.privateCalls, [])
  assert.deepEqual(f.calls.map(c => c.statement), [SQL.account, SQL.practitioner, ...(f.owned ? [SQL.services] : [])])
  return result
}

test('projection preserves active account and onboarding checks before any other read', async () => {
  for (const account of [null, { id: B, status: 'active', onboarding_state: 'active' }, { id: A, status: 'suspended', onboarding_state: 'active' }, { id: A, status: 'active', onboarding_state: 'pending' }]) {
    const f = fixture({ account })
    await assert.rejects(f.run(), e => e.code === 'ACCOUNT_REQUIRED' && e.status === 401)
    assert.deepEqual(f.calls.map(c => c.statement), [SQL.account]); assert.deepEqual(f.privateCalls, [])
  }
})
test('unregistered or foreign-only practitioner gets exact false projection', async () => {
  for (const practitioners of [[], [master('submitted', { id: Q, trusted_auth_user_id: B })]]) {
    const result = await assertIneligible(fixture({ practitioners }))
    assert.equal(result.practitioner, null); assert.deepEqual(result.services, [])
    assert.equal(result.suggestedProfile.displayName, actor.displayName)
  }
})
test('every ineligible practitioner state skips all private adapters, even with a public profile', async () => {
  for (const status of ['draft', 'suspended', 'rejected', 'archived', 'unknown']) {
    const p = master(status, { public_profile: { displayName: 'Existing public name' } })
    const result = await assertIneligible(fixture({ practitioners: [p], services: [offering('published')] }))
    assert.equal(result.practitioner.status, status); assert.equal(result.services.length, 1)
    assert.equal(result.serviceQuota.used, 1)
  }
})
test('missing, ineligible or foreign-only first services never unlock an applicant', async () => {
  for (const status of ['submitted', 'changes_requested']) {
    for (const services of [[], [offering('draft')], [offering('suspended')], [offering('archived')], [offering('submitted', Q)]]) {
      await assertIneligible(fixture({ practitioners: [master(status)], services }))
    }
  }
})
test('name fallback preserves empty-string versus whitespace and draft-presence semantics', async () => {
  for (const draft_profile of [{}, { displayName: '' }, { displayName: '   ' }, { displayName: '\t\n' }]) {
    await assertIneligible(fixture({ practitioners: [master('submitted', { draft_profile })] }))
  }
  await assertIneligible(fixture({ practitioners: [master('submitted', { draft_profile: { displayName: '   ' }, public_profile: { displayName: 'Public fallback' } })] }))
  for (const draft_profile of [{}, { displayName: '' }, null]) {
    const f = fixture({ privateAllowed: true, practitioners: [master('submitted', { draft_profile, public_profile: { displayName: 'Public fallback' } })] })
    assert.equal((await f.run()).practiceActivated, true)
  }
})
test('all existing eligible status pairs agree with requireActivated without public promotion', async () => {
  for (const status of ['submitted', 'changes_requested']) for (const serviceStatus of ['submitted', 'changes_requested', 'published', 'paused']) {
    const f = fixture({ privateAllowed: true, practitioners: [master(status, { active: false })], services: [{ ...offering(serviceStatus), active: false }, offering('published', Q, 'foreign')] })
    const result = plain(await f.run())
    assert.equal(result.practiceActivated, true); assert.deepEqual(result.practitioner.profile, {})
    assert.equal(result.practitioner.draftProfile.displayName, 'Synthetic practitioner')
    assert.deepEqual(result.services.map(s => s.id), ['synthetic-service'])
    assert.equal(await f.repo.requireActivated(actor), true)
    assert.deepEqual(f.calls.slice(0, 4).map(c => c.statement), [SQL.account, SQL.practitioner, SQL.services, SQL.credentials])
  }
})
test('approved legacy retains every current output and full scoped #1350 aggregates', async () => {
  const f = fixture({ privateAllowed: true, practitioners: [master('approved', { draft_profile: {}, active: false })], services: [] })
  const result = plain(await f.run())
  assert.equal(result.practiceActivated, true); assert.equal(await f.repo.requireActivated(actor), true)
  assert.deepEqual(Object.keys(result).sort(), [...falseKeys, 'practitionerTaskSummary', 'serviceAnalytics'].sort())
  assert.equal(result.credentials.length, 1); assert.equal(result.requests.length, 2)
  assert.deepEqual(result.practitionerTaskSummary, { day: DAY, requests: [
    { requestId: R1, openCount: 153, todayCount: 151, overdueCount: 2, nextDueOn: '2026-10-19' },
    { requestId: R2, openCount: 2, todayCount: 0, overdueCount: 0, nextDueOn: '2026-10-21' },
  ] })
  assert.equal(result.practitionerTasks.length, 150, 'details stay bounded; complete aggregate total is 155')
  assert.equal(result.practitionerTaskSummary.requests.reduce((n, r) => n + r.openCount, 0), 155)
  assert.ok(result.practitionerTasks.every(t => t.requestId === R1 && !t.id.startsWith('foreign')))
  assert.deepEqual(Object.keys(result.practitionerTasks[0]).sort(), ['dueOn', 'id', 'kind', 'requestId', 'revision', 'status'])
  assert.equal(result.serviceAnalytics.synthetic, true)
})
test('eligible caller without requests retains dated empty summary without querying tasks', async () => {
  const f = fixture({ privateAllowed: true, requests: [] })
  const result = plain(await f.run())
  assert.deepEqual(result.practitionerTaskSummary, { day: DAY, requests: [] })
  assert.deepEqual(result.practitionerTasks, [])
  assert.ok(!f.calls.some(c => [SQL.counts, SQL.tasks, SQL.totals, SQL.latest, SQL.unseen].includes(c.statement)))
})
test('account/practitioner/service query errors never become false success or private reads', async () => {
  for (const queryFailure of [SQL.account, SQL.practitioner, SQL.services]) {
    const f = fixture({ queryFailure })
    await assert.rejects(f.run(), /Synthetic query failure/); assert.deepEqual(f.privateCalls, [])
  }
})
test('repository negatives detect removed ownership/account checks and early-return bypass', async () => {
  for (const [from, to] of [
    ['where trusted_auth_user_id=$1', 'where true'],
    ['where practitioner_id=$1 order by created_at,id', 'where true order by created_at,id'],
    ['await readyAccount(db,actor)', 'void actor'],
    ['if(!hasActivatedPractice(practitioner,services))return {', 'if(false)return {'],
  ]) {
    assert.ok(repositorySource.includes(from))
    const source = repositorySource.replace(from, to)
    await assert.rejects(() => assertIneligible(fixture({ source, practitioners: [master('draft')] })))
  }
  assert.throws(() => fixture({ source: repositorySource + "\nimport 'unmocked-private-adapter'\n" }), /Unmocked dependency/)
})

// Minimal hook/JSX scheduler. Imported children are inert named leaves, never
// real React/Next components. Effects, cleanups, handlers and reloads below are
// the actual compiled PracticeWorkspace code, not expected-output mocks.
function ui({ source = workspaceSource, search = '', locale = 'en', owner = true, accountId = A } = {}) {
  const slots = [], pendingEffects = new Map(), frames = new Map(), requests = [], cancelled = [], scrolled = []
  let cursor = 0, dirty = false, tree, frameId = 0, alive = true
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]))
  const hooks = {
    useState(initial) {
      const i = cursor++
      if (!slots[i]) slots[i] = { value: typeof initial === 'function' ? initial() : initial }
      return [slots[i].value, next => { assert.ok(alive, 'state update after synthetic unmount'); const value = typeof next === 'function' ? next(slots[i].value) : next; if (!Object.is(value, slots[i].value)) { slots[i].value = value; dirty = true } }]
    },
    useMemo(fn, deps) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { deps, value: fn() }; return slots[i].value },
    useEffect(effect, deps) {
      const i = cursor++
      if (!slots[i] || !same(slots[i].deps, deps)) { const prior = slots[i]; slots[i] = { deps, cleanup: prior?.cleanup }; pendingEffects.set(i, effect) }
    },
  }
  const leaf = name => Object.defineProperty(function syntheticLeaf() { throw new Error('Child component must stay inert: ' + name) }, 'name', { value: name })
  const element = (type, props) => ({ type, props: props || {} })
  const modules = {
    react: hooks, 'react/jsx-runtime': { jsx: element, jsxs: element, Fragment: 'synthetic-fragment' },
    'next/link': { __esModule: true, default: leaf('Link') }, 'next/image': { __esModule: true, default: leaf('Image') },
    'lucide-react': Object.fromEntries('Plus FileText Film IdCard UsersRound Leaf ReceiptText BarChart3 ChevronRight ClipboardList Share2 CheckCircle2 CalendarDays Megaphone'.split(' ').map(name => [name, leaf(name)])),
    '@/lib/practitioners/service-quota.js': quota,
    '@/lib/practitioners/public-service-links.js': { getPublicServiceDetailHref: (language, practitioner, service) => '/' + language + '/services/' + practitioner + '/' + service },
    './practice-dashboard.css': {},
  }
  for (const [path, name] of Object.entries({ './crm-manager': 'CrmManager', './practitioner-client-profiles': 'PractitionerClientProfiles', './practice-materials': 'PracticeMaterials', './practice-events': 'PracticeEvents', './practice-service-statistics': 'PracticeServiceStatistics', './practice-requests-overview': 'PracticeRequestsOverview', './public-enquiry-contact': 'PublicEnquiryContact', './my-services-dashboard': 'MyServicesDashboard', './simple-service-editor': 'SimpleServiceEditor', './practice-photo-upload': 'PracticePhotoUpload', './practice-video-field': 'PracticeVideoField' })) modules[path] = { __esModule: true, default: leaf(name) }
  const nodes = () => {
    const output = []
    const visit = item => { if (Array.isArray(item)) return item.forEach(visit); if (item && typeof item === 'object' && Object.hasOwn(item, 'type')) { output.push(item); visit(item.props.children) } }
    visit(tree); return output
  }
  const globals = {
    URLSearchParams,
    window: { location: { search, origin: 'https://synthetic.invalid', assign: forbidden('location.assign') }, scrollTo: forbidden('window.scrollTo') },
    navigator: { share: forbidden('navigator.share'), clipboard: { writeText: forbidden('clipboard.writeText') } },
    document: { getElementById(id) { return nodes().some(n => n.props.id === id) ? { scrollIntoView() { scrolled.push(id) } } : null } },
    requestAnimationFrame(fn) { const id = ++frameId; frames.set(id, fn); return id },
    cancelAnimationFrame(id) { cancelled.push(id); frames.delete(id) },
    fetch(url, options) {
      assert.ok(url === '/api/app/practice' || url === '/api/app/practice/onboarding', 'Unmocked fetch destination')
      assert.equal(options.credentials, 'same-origin'); assert.equal(options.cache, 'no-store')
      return new Promise(resolve => requests.push({ url, options, resolve }))
    },
  }
  const Workspace = sourceModule(source, 'practice-workspace.jsx', modules, globals).default
  const props = { locale, ownerTools: owner ? 'SYNTHETIC_OWNER_TOOLS' : null, accountId }
  function render() { cursor = 0; dirty = false; tree = Workspace(props); return tree }
  async function settle() {
    for (let i = 0; i < 12; i++) {
      if (dirty) render()
      const effects = [...pendingEffects]; pendingEffects.clear()
      for (const [index, effect] of effects) { slots[index].cleanup?.(); slots[index].cleanup = effect() }
      await Promise.resolve()
    }
    assert.equal(dirty, false, 'synthetic hook scheduler must settle')
  }
  render()
  return {
    get tree() { return tree }, nodes, requests, cancelled, scrolled,
    named: name => nodes().filter(n => typeof n.type === 'function' && n.type.name === name),
    async start() { await settle() },
    async reply(index, data, ok = true) { assert.ok(requests[index], 'actual source must issue this request'); requests[index].resolve({ ok, json: async () => data }); await settle() },
    async click(fn) { fn(); await settle() },
    settle,
    flushFrames() { const pending = [...frames.values()]; frames.clear(); for (const fn of pending) fn() },
    unmount() { for (const slot of slots) slot?.cleanup?.(); alive = false },
  }
}
const uiData = (practiceActivated, extra = {}) => ({
  practiceActivated, practitioner: { id: P, slug: 'synthetic-practice', status: 'submitted', profile: {}, draftProfile: { displayName: 'Synthetic practitioner' } },
  services: [{ id: 'synthetic-service', status: 'submitted', pricingMode: 'free' }],
  requests: [], practitionerTasks: [], suggestedProfile: {}, ...extra,
})
function assertPrivateHidden(h) {
  for (const name of ['PracticeRequestsOverview', 'PracticeServiceStatistics', 'CrmManager', 'PractitionerClientProfiles', 'PracticeMaterials', 'PracticeEvents']) assert.equal(h.named(name).length, 0, name + ' must remain unmounted')
  assert.ok(!h.nodes().some(n => ['hh-practice-workspace-detail', 'hh-practice-services-view'].includes(n.props.id)))
  assert.ok(!h.nodes().some(n => n.props.className === 'hh-practice-more-tools' || n.props.className === 'hh-practice-setup'))
}
test('synthetic UI loading and initial error never mount private surfaces', async () => {
  const h = ui({ search: '?panel=clients&requestId=' + R1 })
  assert.equal(h.tree.props['aria-busy'], true); assertPrivateHidden(h)
  await h.start(); assert.equal(h.requests.length, 1)
  await h.reply(0, { error: 'SYNTHETIC_LOAD_ERROR' }, false)
  assert.equal(h.tree.props['aria-busy'], false); assertPrivateHidden(h)
  assert.ok(h.nodes().some(n => n.props.role === 'alert' && n.props.children === 'SYNTHETIC_LOAD_ERROR'))
  h.unmount()
})
test('strict server boolean alone gates synthetic UI across locales and private deep links', async () => {
  for (const locale of ['en', 'ru', 'es']) for (const practiceActivated of [false, undefined, null, 1, 'true', {}]) {
    const h = ui({ locale, search: '?panel=clients&requestId=' + R1 })
    await h.start(); await h.reply(0, uiData(practiceActivated, { practitioner: { id: P, status: 'approved', profile: { displayName: 'Public profile is not the activation flag' } } }))
    assertPrivateHidden(h); assert.equal(h.named('MasterOnboarding').length, 1)
    h.flushFrames(); assert.deepEqual(h.scrolled, []); h.unmount()
  }
})
test('eligible empty-public-profile UI preserves account/owner and exact request focus', async () => {
  const summary = { day: DAY, requests: [{ requestId: R1, openCount: 153 }] }
  const tasks = [{ id: 'synthetic-task', requestId: R1 }]
  const h = ui({ search: '?panel=clients&requestId=' + R1 })
  await h.start(); await h.reply(0, uiData(true, { practitionerTaskSummary: summary, practitionerTasks: tasks }))
  assert.equal(h.named('MasterOnboarding').length, 0); assert.equal(h.named('PracticeRequestsOverview').length, 1)
  const child = h.named('PractitionerClientProfiles')[0]
  assert.ok(child); assert.equal(child.props.accountId, A); assert.equal(child.props.isOwner, true)
  assert.equal(child.props.focusRequestId, R1); assert.equal(child.props.practitionerTaskSummary, summary); assert.equal(child.props.practitionerTasks, tasks)
  assert.ok(h.nodes().some(n => n.props.className === 'hh-practice-more-tools'))
  for (const options of [{ owner: false, accountId: A }, { owner: true, accountId: null }]) {
    const other = ui({ ...options, search: '?panel=crm' }); await other.start(); await other.reply(0, uiData(true)); assert.equal(other.named('CrmManager').length, 0); other.unmount()
  }
  const nonOwner = ui({ owner: false, search: '?panel=clients&requestId=not-a-uuid' })
  await nonOwner.start(); await nonOwner.reply(0, uiData(true))
  assert.equal(nonOwner.named('PractitionerClientProfiles')[0].props.isOwner, false)
  assert.equal(nonOwner.named('PractitionerClientProfiles')[0].props.focusRequestId, '')
  assert.ok(!nonOwner.nodes().some(n => n.props.className === 'hh-practice-more-tools'))
  nonOwner.unmount(); h.unmount()
})
test('actual submit and reload handlers never activate optimistically or after reload failure', async () => {
  for (const reloadOk of [true, false]) {
    const h = ui({ search: '?panel=clients&requestId=' + R1 })
    await h.start(); await h.reply(0, uiData(false))
    const pending = h.named('MasterOnboarding')[0].props.onAction({ action: 'submit', profile: { displayName: 'Synthetic only' }, service: {} })
    await h.settle(); assert.equal(h.requests[1].options.method, 'POST'); assertPrivateHidden(h)
    await h.reply(1, { practiceActivated: true }); assert.equal(h.requests[2].options.method, 'GET'); assertPrivateHidden(h)
    await h.reply(2, reloadOk ? uiData(true) : { error: 'SYNTHETIC_RELOAD_ERROR' }, reloadOk)
    await pending; await h.settle()
    if (reloadOk) { assert.equal(h.named('MasterOnboarding').length, 0); assert.equal(h.named('PractitionerClientProfiles').length, 1) }
    else { assertPrivateHidden(h); assert.ok(h.nodes().some(n => n.props.role === 'alert')) }
    h.unmount()
  }
})
test('actual refresh removes private surfaces on false reload and cleans scheduled scrolling', async () => {
  const h = ui({ search: '?panel=clients&requestId=' + R1 })
  await h.start(); await h.reply(0, uiData(true))
  const pending = h.named('PractitionerClientProfiles')[0].props.onRefresh()
  await h.settle(); await h.reply(1, uiData(false)); await pending; await h.settle()
  assertPrivateHidden(h); h.flushFrames(); assert.deepEqual(h.scrolled, [])
  h.unmount()
  const active = ui(); await active.start(); await active.reply(0, uiData(true))
  await active.click(active.named('PracticeTile').find(n => n.props.title === 'Clients').props.onClick)
  await active.click(active.named('PracticeTile').find(n => n.props.title === 'Materials').props.onClick)
  assert.ok(active.cancelled.length >= 1, 'new navigation invokes the prior effect cleanup')
  active.unmount(); active.flushFrames(); assert.deepEqual(active.scrolled, [])
})
test('UI negative mutations detect truthy flags and unguarded private wrappers', async () => {
  const mutations = [
    source => source.replace('data.practiceActivated!==true', '!data.practiceActivated'),
    source => source.replace('{!needsOnboarding&&<PracticeRequestsOverview', '{<PracticeRequestsOverview'),
    source => source.replace('!needsOnboarding&&ownerTools && <details', 'ownerTools && <details'),
  ]
  for (let i = 0; i < mutations.length; i++) {
    const source = mutations[i](workspaceSource); assert.notEqual(source, workspaceSource)
    const h = ui({ source }); await h.start(); await h.reply(0, uiData(i === 0 ? 'true' : false))
    assert.throws(() => assertPrivateHidden(h)); h.unmount()
  }
  assert.throws(() => ui({ source: workspaceSource + "\nimport 'unmocked-ui-adapter'\n" }), /Unmocked dependency/)
})
