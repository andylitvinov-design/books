import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { validUuid } from '../lib/clients/delivery-model.js'
import { uiLocaleCookie, readUiLocale } from '../lib/ui-locale.js'
import { sourceModule, parse, descendants, returnedSource, expression, nodes, jsx, denied, ts } from './helpers/current-source-render.mjs'

const read = (path) => readFile(path, 'utf8')

// The owner-approved PR #1059 removed the duplicate picker. Exercise the actual
// route and its active-option handoff, not an invented picker or a copied route.
// All records below are fictional; server adapters never import auth/store code.
const reportEntryPath = 'app/admin/reports/new/page.js'
const studioPath = 'app/admin/consultations/new/page.js'
const selectorPath = 'components/consultation-client-selector.jsx'
const formPath = 'components/consultation-form.jsx'
const sources = Object.fromEntries(await Promise.all([reportEntryPath, studioPath, selectorPath, formPath]
  .map(async path => [path, await read(path)])))
const clientA = '00000000-0000-4000-8000-000000000701'
const clientB = '00000000-0000-4000-8000-000000000702'
const inactiveClient = '00000000-0000-4000-8000-000000000703'
const unknownClient = '00000000-0000-4000-8000-000000000799'
const fictionalClients = [
  { id: clientA, fullName: 'Fictional Alpha', preferredLocale: 'en', status: 'active' },
  { id: clientB, fullName: 'Fictional Beta', preferredLocale: 'ru', status: 'active' },
  { id: inactiveClient, fullName: 'Fictional Inactive', preferredLocale: 'en', status: 'inactive' },
]
const redirectMarker = Symbol('isolated redirect')
const redirectTo = target => { throw Object.assign(new Error('Synthetic redirect'), { [redirectMarker]: true, target }) }
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const settled = promise => promise.then(value => ({ value }), error => ({ error }))
const queryAfterAuth = (trace, query) => ({ then(resolve) { trace.push('query'); resolve(query) } })
function assertRedirect(result, target) {
  assert.equal(result.error?.[redirectMarker], true, 'The actual route must terminate by redirect')
  assert.equal(result.error.target, target)
  assert.equal(Object.hasOwn(result, 'value'), false)
}
function actualModule(source, path, modules, globals = {}) {
  const file = parse(source, path)
  const imports = file.statements.filter(ts.isImportDeclaration).map(node => node.moduleSpecifier.text)
  assert.deepEqual(imports, Object.keys(modules).filter(name => name !== 'react/jsx-runtime'), 'Explicit module boundary: ' + path)
  for (const node of descendants(file)) {
    assert.ok(!(ts.isExportDeclaration(node) && node.moduleSpecifier), 'No unreviewed re-export')
    if (ts.isCallExpression(node)) {
      assert.notEqual(node.expression.kind, ts.SyntaxKind.ImportKeyword, 'No dynamic imports')
      if (ts.isIdentifier(node.expression)) assert.ok(!['require', 'eval', 'Function', 'fetch'].includes(node.expression.text), 'No hidden transport or evaluator')
    }
    if (ts.isIdentifier(node)) assert.ok(!['process', 'XMLHttpRequest', 'WebSocket'].includes(node.text), 'No deployment environment or transport')
  }
  return sourceModule(source, path, modules, globals)
}
function entryFixture(source = sources[reportEntryPath]) {
  const trace = [], gate = deferred()
  const entry = actualModule(source, reportEntryPath, {
    'next/navigation': { redirect: redirectTo },
    '@/lib/prescriptions/admin': { requireAdminRequest: (...args) => {
      assert.deepEqual(args, []); trace.push('auth'); return gate.promise
    } },
    '@/lib/clients/delivery-model': { validUuid: value => {
      trace.push('validate'); return validUuid(value)
    } },
  }, { encodeURIComponent: value => { trace.push('encode'); return encodeURIComponent(value) } })
  assert.equal(entry.dynamic, 'force-dynamic')
  assert.equal(entry.metadata.robots.index, false)
  assert.equal(entry.metadata.robots.follow, false)
  assert.equal(typeof entry.default, 'function')
  return { entry: entry.default, trace, gate }
}
async function assertEntryContract(source = sources[reportEntryPath]) {
  for (const auth of [false, 'reject']) {
    const f = entryFixture(source), authError = new Error('Synthetic authorization failure')
    const result = settled(f.entry({ searchParams: queryAfterAuth(f.trace, { clientId: clientA }) }))
    await Promise.resolve(); await Promise.resolve()
    assert.deepEqual(f.trace, ['auth'], 'Await authorization before consuming query or validating identity')
    if (auth === false) f.gate.resolve(false)
    else f.gate.reject(authError)
    const outcome = await result
    if (auth === false) assertRedirect(outcome, '/admin/login')
    else assert.equal(outcome.error, authError, 'Preserve original authorization failure')
    assert.deepEqual(f.trace, ['auth'], 'No identity processing on rejected authorization')
  }
  const valid = [clientA, clientB, unknownClient, 'ABCDEFAB-CDEF-4ABC-8ABC-ABCDEFABCDEF']
  const invalid = [undefined, null, '', [], [clientA], {}, { toString: () => clientA }, 7, false,
    ' ' + clientA, clientA + ' ', 'not-a-uuid', clientA + '&next=https://invalid.example',
    'https://invalid.example', '//invalid.example', '../clients/' + clientA,
    '00000000-0000-0000-8000-000000000701', '00000000-0000-9000-8000-000000000701',
    '00000000-0000-4000-0000-000000000701']
  // Admin URLs are locale-neutral. EN/RU/ES hints must not become a destination
  // or query leak; this does not assert that the admin UI gained Spanish copy.
  for (const locale of ['en', 'ru', 'es']) for (const value of [...valid, ...invalid]) {
    const f = entryFixture(source)
    const query = { clientId: value, locale, next: 'https://invalid.example/redirect', returnTo: '//invalid.example',
      q: 'fictional-unrelated-search', created: '1', subject: clientB }
    const result = settled(f.entry({ searchParams: queryAfterAuth(f.trace, query) }))
    await Promise.resolve(); await Promise.resolve()
    assert.deepEqual(f.trace, ['auth'], 'No early query while authorization is pending')
    f.gate.resolve(true)
    const accepted = valid.includes(value)
    const target = '/admin/consultations/new' + (accepted ? '?clientId=' + encodeURIComponent(value) : '')
    assertRedirect(await result, target)
    assert.deepEqual(f.trace, accepted ? ['auth', 'query', 'validate', 'encode'] : ['auth', 'query', 'validate'])
  }
  for (const query of [undefined, null, {}]) {
    const f = entryFixture(source), result = settled(f.entry({ searchParams: queryAfterAuth(f.trace, query) }))
    f.gate.resolve(true)
    assertRedirect(await result, '/admin/consultations/new')
  }
  // Production reuses a module between requests. A fresh fixture per case alone
  // would miss sticky authorization or a previous client's query identity.
  const reused = entryFixture(source)
  for (const [authorized, value] of [[true, clientA], [true, clientB], [false, clientA],
    [true, undefined], [true, unknownClient], [true, '//invalid.example']]) {
    reused.trace.length = 0
    reused.gate.promise = Promise.resolve(authorized)
    const result = await settled(reused.entry({ searchParams: queryAfterAuth(reused.trace, { clientId: value }) }))
    const accepted = authorized && validUuid(value)
    assertRedirect(result, !authorized ? '/admin/login' : '/admin/consultations/new' + (accepted ? '?clientId=' + encodeURIComponent(value) : ''))
    assert.deepEqual(reused.trace, !authorized ? ['auth'] : accepted ? ['auth', 'query', 'validate', 'encode'] : ['auth', 'query', 'validate'])
  }
}
function studioFixture(source = sources[studioPath], locale = 'en', available = true) {
  const trace = [], gate = deferred(), clients = fictionalClients.map(client => ({ ...client }))
  const store = {
    listClients: async () => { trace.push('clients'); return clients },
    listClientDocuments: async id => {
      trace.push('documents:' + id)
      assert.ok([clientA, clientB].includes(id), 'Only active options may trigger document reads')
      return [{ id: 'fictional-document-' + id, consultationId: 'fictional-consultation-' + id, dateIssued: '2026-01-01' }]
    },
  }
  const studioModule = actualModule(source, studioPath, {
    'next/link': { default: 'link' },
    'next/headers': { cookies: async () => { trace.push('cookies'); return { get: key => {
      assert.equal(key, uiLocaleCookie); return { value: locale }
    } } } },
    'node:crypto': { randomUUID: () => '00000000-0000-4000-8000-000000000711' },
    'next/navigation': { redirect: redirectTo },
    '@/lib/prescriptions/store': { getPrescriptionStore: () => { trace.push('store'); return available ? store : undefined } },
    '@/lib/prescriptions/admin': { requireAdminRequest: () => { trace.push('auth'); return gate.promise } },
    '@/lib/remedies/registry': { getConsultationRemedyOptions: () => [] },
    '@/lib/ui-locale': { uiLocaleCookie },
    '@/lib/clients/delivery-model': { deliveryEnabled: () => false },
    '@/components/consultation-form': { ConsultationForm: 'consultation-form' },
    '@/components/new-report-materials': { NewReportMaterials: 'report-materials' },
    '@/lib/consultations/recommended-tests': { getRecommendedTestOptions: () => [] },
    '@/components/prescription-admin-header': { PrescriptionAdminHeader: 'admin-header' },
    '../actions': { createConsultationAction: denied },
    'react/jsx-runtime': jsx,
  })
  return { run: studioModule.default, trace, gate }
}
function actualFormBoundary(studioProps, selector, formSource) {
  // Execute the real exported constructor, including parameter binding and all
  // preceding control flow. This is only the first render: effects, setters,
  // portals, child components and submission are never invoked. Ancillary form
  // content uses inert synthetic adapters, not real records or a copied form.
  const remedies = [], rows = []
  const formModule = actualModule(formSource, formPath, {
    './consultation-client-selector': { ConsultationClientSelector: selector },
    './consultation-studio.css': {},
    './consultation-report.css': {},
    'lucide-react': { ClipboardList: 'icon-clipboard', FileCheck2: 'icon-file', UsersRound: 'icon-users' },
    './consultation-text-import': { ConsultationTextImport: denied },
    './consultation-draft-preview': { ConsultationDraftPreview: denied },
    react: {
      useState: initial => [typeof initial === 'function' ? initial() : initial, denied],
      useActionState: (action, initial) => {
        assert.equal(action, studioProps.action)
        return [initial, denied, false]
      },
      useEffect: effect => { assert.equal(typeof effect, 'function') },
      useMemo: calculate => calculate(),
    },
    'react-dom': { createPortal: denied },
    '@/lib/consultations/editor': {
      consultationClinicalFields: [],
      initialConsultationRows: (consultation, options, count) => {
        assert.equal(consultation, undefined); assert.equal(options, remedies); assert.equal(count, 1)
        return rows
      },
      serializeConsultationRows: value => { assert.equal(value, rows); return [] },
      validateConsultationRows: denied,
    },
    '@/lib/consultations/remedy-search': { consultationRemedySuggestions: denied },
    '@/lib/consultations/owner-report-template': { getOwnerReportTextTemplate: locale => {
      assert.ok(['en', 'ru'].includes(locale))
      return { analysis: 'Fictional draft', additionalNotes: 'Fictional note' }
    } },
    '@/lib/documents/recommendation': { reportFollowUpCopy: () => ({ description: 'Fictional follow-up label' }) },
    './report-language-picker': { ReportLanguagePicker: denied },
    './consultation-recommended-tests': { ConsultationRecommendedTests: denied },
    './dao-resource-stage': { DaoResourceStageField: denied },
    '@/lib/consultations/dao-resource-stage': { parseDaoResourceScore: value => { assert.equal(value, ''); return null } },
    '@/lib/documents/report-progress': {
      extractReportProgress: denied,
      parseReportProgressScore: value => { assert.equal(value, ''); return null },
    },
    './report-progress-editor.css': {},
    '@/lib/ui-locale': { readUiLocale },
    'react/jsx-runtime': jsx,
  })
  assert.equal(typeof formModule.ConsultationForm, 'function')
  let tree
  assert.doesNotThrow(() => { tree = formModule.ConsultationForm({ ...studioProps, remedies }) },
    'The actual new-consultation constructor must execute with its real prop bindings')
  assert.equal(tree?.type, 'form', 'No earlier branch may bypass the actual form')
  const selectors = nodes(tree).filter(item => item.type === selector)
  assert.equal(selectors.length, 1, 'One selector is actually reached, not merely present in final JSX')
  const actual = selectors[0]
  assert.equal(actual.props.clients, studioProps.clients, 'Runtime client options preserve the studio boundary')
  assert.equal(actual.props.selectedClientId, studioProps.selectedClientId, 'Runtime binding must retain this request identity')
  assert.equal(nodes(tree).filter(item => item.type === 'input' && item.props.name === 'clientId').length, 0,
    'The rendered form must not introduce a second submitted client identity')
  return actual
}
function actualSelector(studioProps, locale, selectorSource = sources[selectorPath], formSource = sources[formPath]) {
  const selector = actualModule(selectorSource, selectorPath, {
    react: { useState: initial => [typeof initial === 'function' ? initial() : initial, denied] },
    'react/jsx-runtime': jsx,
  }).ConsultationClientSelector
  // Keep all finite source-shape guards, and corroborate the expression with
  // the actual exported form's first render rather than assuming it is reached.
  const returned = returnedSource(formSource, 'ConsultationForm')
  const { file, owner } = returned
  assert.ok(owner.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword), 'Actual exported constructor')
  for (const binding of descendants(owner.body)) {
    if ((ts.isVariableDeclaration(binding) || ts.isParameter(binding) || ts.isFunctionDeclaration(binding)) && binding.name && ts.isIdentifier(binding.name))
      assert.ok(!['ConsultationClientSelector', 'clients', 'selectedClientId', 'consultation'].includes(binding.name.text), 'No shadowed selector or client inputs')
  }
  const importNode = file.statements.find(node => ts.isImportDeclaration(node)
    && node.moduleSpecifier.text === './consultation-client-selector')
  assert.ok(importNode)
  const imported = importNode.importClause.namedBindings.elements
  assert.equal(imported.length, 1)
  assert.equal(imported[0].name.text, 'ConsultationClientSelector')
  assert.equal(imported[0].propertyName?.text ?? imported[0].name.text, 'ConsultationClientSelector')
  const candidates = returned.nodes.filter(node => ts.isJsxSelfClosingElement(node)
    && node.tagName.getText(file) === 'ConsultationClientSelector')
  assert.equal(candidates.length, 1, 'One genuine selector in the form')
  const node = candidates[0], branch = node.parent
  assert.ok(ts.isConditionalExpression(branch))
  assert.equal(branch.condition.getText(file), '!consultation')
  assert.equal(branch.whenTrue, node, 'New consultations use the selector')
  const directIdentityInputs = returned.nodes.filter(item => ts.isJsxSelfClosingElement(item)
    && item.tagName.getText(file) === 'input' && item.attributes.properties.some(attribute =>
      ts.isJsxAttribute(attribute) && attribute.name.getText(file) === 'name' && attribute.initializer?.text === 'clientId'))
  assert.equal(directIdentityInputs.length, 0, 'The real selector remains the sole submitted client identity')
  for (let ancestor = branch.parent; ancestor !== returned.returned; ancestor = ancestor.parent) {
    assert.ok(ancestor)
    assert.ok(ts.isJsxElement(ancestor) || ts.isJsxExpression(ancestor) || ts.isJsxFragment(ancestor)
      || ts.isParenthesizedExpression(ancestor), 'No unexecuted or additional gated selector branch')
    if (ts.isJsxElement(ancestor)) for (const attribute of ancestor.openingElement.attributes.properties) {
      assert.ok(ts.isJsxAttribute(attribute), 'No unreviewed ancestor prop spread')
      assert.ok(!['hidden', 'aria-hidden', 'style', 'disabled'].includes(attribute.name.getText(file)), 'No hidden or disabled selector ancestor')
    }
  }
  const actual = expression(node, file, { ConsultationClientSelector: selector,
    clients: studioProps.clients, selectedClientId: studioProps.selectedClientId,
    uiLocale: readUiLocale(uiLocaleCookie + '=' + locale), changeReportLocale: denied })
  assert.equal(actual.type, selector)
  assert.equal(actual.props.clients, studioProps.clients)
  assert.equal(actual.props.selectedClientId, studioProps.selectedClientId)
  const rendered = actualFormBoundary(studioProps, selector, formSource)
  assert.equal(rendered.props.clients, actual.props.clients)
  assert.equal(rendered.props.selectedClientId, actual.props.selectedClientId)
  const renderedHidden = nodes(selector(rendered.props)).filter(item => item.type === 'input' && item.props.name === 'clientId')
  assert.equal(renderedHidden.length, 1, 'The actually reached selector submits one identity')
  assert.equal(renderedHidden[0].props.value, studioProps.clients.some(client => client.id === studioProps.selectedClientId)
    ? studioProps.selectedClientId : '', 'Actual constructor control flow must not substitute another client')
  const tree = selector(actual.props), hidden = nodes(tree).filter(item => item.type === 'input' && item.props.name === 'clientId')
  assert.equal(hidden.length, 1, 'One actual submitted client identity')
  assert.equal(hidden[0].props.type, 'hidden')
  assert.notEqual(tree.props.disabled, true, 'The selector fieldset remains enabled')
  assert.notEqual(hidden[0].props.disabled, true, 'The selected identity is actually submitted')
  return hidden[0].props.value
}
async function assertStudioContract({ studio = sources[studioPath], selector = sources[selectorPath], form = sources[formPath] } = {}) {
  const deniedStudio = studioFixture(studio)
  const deniedResult = settled(deniedStudio.run({ searchParams: queryAfterAuth(deniedStudio.trace, { clientId: clientA }) }))
  await Promise.resolve(); await Promise.resolve()
  assert.deepEqual(deniedStudio.trace, ['auth'], 'Studio awaits its own authorization before any store/query/cookie read')
  deniedStudio.gate.resolve(false)
  assertRedirect(await deniedResult, '/admin/login')
  assert.deepEqual(deniedStudio.trace, ['auth'])
  for (const locale of ['en', 'ru', 'es']) for (const requested of [clientA, clientB, inactiveClient, unknownClient, undefined, [clientA], 'https://invalid.example']) {
    const f = studioFixture(studio, locale)
    const result = settled(f.run({ searchParams: queryAfterAuth(f.trace, { clientId: requested, locale, next: 'https://invalid.example' }) }))
    await Promise.resolve(); await Promise.resolve()
    assert.deepEqual(f.trace, ['auth'])
    f.gate.resolve(true)
    const outcome = await result
    assert.equal(outcome.error, undefined)
    const forms = nodes(outcome.value).filter(item => item.type === 'consultation-form')
    assert.equal(forms.length, 1, 'One canonical constructor')
    const props = forms[0].props
    assert.deepEqual(Array.from(props.clients, client => client.id), [clientA, clientB])
    for (const client of props.clients) {
      assert.deepEqual(Object.keys(client).sort(), ['consultationCount', 'fullName', 'id', 'lastConsultation', 'preferredLocale'].sort())
      assert.equal(client.consultationCount, 1)
      assert.equal(client.lastConsultation, '2026-01-01')
    }
    assert.equal(props.selectedClientId, typeof requested === 'string' ? requested : undefined)
    assert.equal(props.action, denied, 'Keep the explicit save action; rendering must never invoke it')
    assert.deepEqual(f.trace.filter(event => event.startsWith('documents:')), ['documents:' + clientA, 'documents:' + clientB])
    assert.equal(actualSelector(props, locale, selector, form), [clientA, clientB].includes(requested) ? requested : '',
      'Unknown/inactive/malformed subject must not select a different client or become a hidden submitted ID')
  }
  const empty = studioFixture(studio, 'en', false), pending = settled(empty.run({ searchParams: { clientId: clientA } }))
  empty.gate.resolve(true)
  const outcome = await pending
  assert.equal(outcome.error, undefined)
  const formNode = nodes(outcome.value).find(item => item.type === 'consultation-form')
  assert.equal(formNode.props.clients.length, 0)
  assert.equal(actualSelector(formNode.props, 'en', selector, form), '')
}

test('My Practice report handoff selects the client in the current consultation studio', async () => {
  const [destination, practice] = await Promise.all([
    read('lib/app/practitioner-access.js'), read('components/app/practice-workspace.jsx'),
  ])
  assert.match(practice, /openOwner\('report'\)/)
  assert.match(destination, /report:\s*'\/admin\/reports\/new'/)
  await assertEntryContract()
  await assertStudioContract()
})

test('existing client report actions do not link to the old research editor', async () => {
  const [detail, panel] = await Promise.all([
    read('app/admin/clients/[id]/page.js'),
    read('components/owner-assessments.jsx'),
  ])
  assert.match(detail, /href=\{`\/admin\/consultations\/new\?clientId=\$\{id\}`\}/)
  assert.doesNotMatch(detail, /assessments\/new\?kind=research_result/)
  assert.ok(panel.includes('href={`/admin/consultations/new?clientId=${encodeURIComponent(clientId)}`}'))
  assert.match(panel, /new\?kind=test/)
  assert.doesNotMatch(panel, /new\?kind=research_result/)
})

test('isolated browser acceptance visits current studio and verifies legacy redirect', async () => {
  const script = await read('scripts/verify-ia-v2.mjs')
  assert.match(script, /clientReportLink\.click\(\)/)
  assert.match(script, /consultation-client-selector input\[name="clientId"\]/)
  assert.match(script, /textarea\[name="analysis"\]/)
  assert.match(script, /textarea\[name="additionalNotes"\]/)
  assert.match(script, /input\[name="includeInvoice"\]/)
  assert.match(script, /toHaveCount\(0\)/)
  assert.match(script, /old research-result redirect to the new consultation studio/)
})

test('old direct research-result URL redirects only after owner/client validation', async () => {
  const legacy = await read('app/admin/clients/[id]/assessments/new/page.js')
  const auth = legacy.indexOf('if (!await requireAdminRequest())')
  const client = legacy.indexOf("if (!client || client.status !== 'active'")
  const oldKind = legacy.indexOf("if ((await searchParams)?.kind === 'research_result')")
  const handoff = legacy.indexOf('redirect(`/admin/consultations/new?clientId=${encodeURIComponent(id)}`)')
  assert.ok(auth >= 0 && client > auth && oldKind > client && handoff > oldKind)
  assert.match(legacy, /<AssessmentEditor[^>]+kind="test"/)
  assert.doesNotMatch(legacy, /kind=\{kind\}/)
})
