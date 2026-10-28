import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { availableSavedReports, latestReceivedReport } from '../../lib/profile/report-summary.js'

const source = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8')
const areas = ['psychology', 'homeopathy', 'wu_xing', 'hypnotherapy']
const element = (type, props, key) => ({ type, props: props || {}, key })
const jsxRuntime = { jsx: element, jsxs: element, Fragment: 'Fragment' }
let compiledProfile, compiledPortrait

function compile(text, filename) {
  const result = ts.transpileModule(text, { fileName: filename, reportDiagnostics: true, compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } })
  assert.deepEqual((result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error)
    .map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')), [], filename + ' must parse')
  return result.outputText
}

// Parse only to locate the real portrait expression. The workspace's imports,
// bootstrap, effects, APIs and other routes are never evaluated.
function portraitExpression(workspace) {
  const ast = ts.createSourceFile('app-workspace.jsx', workspace, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX)
  assert.equal(ast.parseDiagnostics.length, 0)
  const matches = []
  function visit(node) {
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
      && ts.isBinaryExpression(node.left) && node.left.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken
      && ts.isIdentifier(node.left.left) && node.left.left.text === 'page'
      && ts.isStringLiteral(node.left.right) && node.left.right.text === 'portrait') matches.push(node.right)
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.equal(matches.length, 1, 'one real signed-in portrait branch')
  return matches[0].getText(ast)
}

function profileRuntime() {
  let effectRegistrations = 0
  const blocked = () => { throw new Error('Effects, requests and browser execution are outside this source-layout regression') }
  const modules = {
    react: {
      useState: value => [typeof value === 'function' ? value() : value, blocked],
      useRef: current => ({ current }),
      useEffect: () => { effectRegistrations++ }, // Register, never invoke callback.
    },
    'react/jsx-runtime': jsxRuntime,
    'next/link': { default: 'a' },
    'next/dynamic': { default: () => 'DevelopmentProgramBoundary' },
    'lucide-react': new Proxy({}, { get: () => 'svg' }),
    '@/lib/documents/recommendation': { recommendationItemType: blocked },
    '@/lib/profile/profile-service-offers': { PROFILE_AREAS: areas, profileServiceOffer: blocked },
    '@/lib/profile/report-summary': { availableSavedReports, latestReceivedReport },
    './free-express-my-requests': { default: 'FreeExpressMyRequestsBoundary' },
    './profile-domains.css': {}, './profile-refresh.css': {},
  }
  const runtime = { exports: {}, require: name => {
    assert.ok(Object.hasOwn(modules, name), 'Unreviewed profile import: ' + name)
    return modules[name]
  }, fetch: blocked, window: undefined, document: undefined, requestAnimationFrame: blocked }
  compiledProfile ||= compile(source('components/app/profile-domains.jsx'), 'profile-domains.jsx')
  runInNewContext(compiledProfile, runtime, { timeout: 1000 })
  return { ProfileDomains: runtime.exports.ProfileDomains, effects: () => effectRegistrations }
}

export function layoutNodes(tree, ancestors = []) {
  if (!tree || typeof tree !== 'object') return []
  if (Array.isArray(tree)) return tree.flatMap(child => layoutNodes(child, ancestors))
  return [{ node: tree, ancestors }, ...layoutNodes(tree.props?.children, [...ancestors, tree])]
}

function exactly(nodes, predicate, label) {
  const found = nodes.filter(({ node }) => predicate(node))
  assert.equal(found.length, 1, 'exactly one ' + label)
  return found[0]
}

export function renderProfileActivityLayout(locale, accountId = 'synthetic-account-a', role = 'client') {
  const profile = profileRuntime()
  const data = { account: { id: accountId }, results: [], savedReports: [], savedDocuments: [], savedSessions: [],
    practitioner: role === 'owner' ? {} : null, practice: role === 'practitioner' ? {} : null }
  const timeline = [], timelineInputs = [], bindings = []
  const runtime = { exports: {}, locale, data,
    ProfileDomains: profile.ProfileDomains,
    CabinetJourney: 'CabinetJourneyBoundary', CabinetToday: 'CabinetTodayBoundary',
    PersonalAnalysisPanel: 'PersonalAnalysisPanelBoundary', ClientExpressReports: 'ClientExpressReportsBoundary',
    reportTimeline: reports => { timelineInputs.push(reports); return timeline },
    require: name => { assert.equal(name, 'react/jsx-runtime'); return jsxRuntime },
  }
  compiledPortrait ||= compile('exports.tree = ' + portraitExpression(source('components/app/app-workspace.jsx')), 'portrait-expression.jsx')
  runInNewContext(compiledPortrait, runtime, { timeout: 1000 })
  function expand(tree) {
    if (!tree || typeof tree !== 'object') return tree
    if (Array.isArray(tree)) return tree.map(expand)
    if (tree.type === profile.ProfileDomains) {
      bindings.push(tree.props)
      return expand(profile.ProfileDomains(tree.props))
    }
    // Walk rendered children ONLY, never activityContent/reportsContent props.
    return { ...tree, props: { ...tree.props, children: expand(tree.props?.children) } }
  }
  const tree = expand(runtime.exports.tree)
  assert.equal(bindings.length, 1)
  assert.ok(profile.effects() > 0, 'actual profile function, with effects deliberately unexecuted')
  return { tree, data, bindings: bindings[0], timeline, timelineInputs, profile }
}

export function assertProfileActivitiesBeforeArchive(locale) {
  for (const accountId of ['synthetic-account-a', 'synthetic-account-b']) for (const role of ['client', 'practitioner', 'owner']) {
    const h = renderProfileActivityLayout(locale, accountId, role)
    const nodes = layoutNodes(h.tree)
    const profile = exactly(nodes, n => n.props['data-profile-domains'] === true, 'profile container')
    const disclosure = exactly(nodes, n => n.type === 'details' && n.props.className === 'hh-domain-more', 'four-profile disclosure')
    assert.equal(disclosure.node.props.open, true, 'requested four profiles are initially revealed')
    const tabs = nodes.filter(({ node }) => node.props.role === 'tab')
    assert.deepEqual(tabs.map(({ node }) => node.props.id), areas.map(area => 'hh-domain-tab-' + area))
    const journey = exactly(nodes, n => n.type === 'CabinetJourneyBoundary', 'Journey')
    const today = exactly(nodes, n => n.type === 'CabinetTodayBoundary', 'Today')
    const archive = exactly(nodes, n => n.props.id === 'personal-reports' && n.props['data-profile-report-archive'] === true, 'actual report archive')
    assert.ok(tabs.every(tab => nodes.indexOf(tab) < nodes.indexOf(journey)), 'four profiles stay before activities')
    assert.ok(nodes.indexOf(journey) < nodes.indexOf(today), 'Journey remains before Today')
    assert.ok(nodes.indexOf(today) < nodes.indexOf(archive), 'Today remains before the actual report archive')
    for (const activity of [journey, today]) {
      assert.ok(activity.ancestors.includes(profile.node), 'activity belongs to account profile composition')
      assert.ok(!activity.ancestors.some(n => n.type === 'details'), 'activity is not hidden inside profile disclosure')
    }
    assert.equal(journey.node.key, 'journey:' + accountId, 'account switch resets existing Journey')
    assert.equal(journey.node.props.accountId, accountId)
    assert.equal(journey.node.props.locale, locale)
    assert.equal(today.node.props.locale, locale)
    assert.equal(today.node.props.practitioner, role !== 'client')
    assert.equal(today.node.props.owner, role === 'owner')
    assert.equal(h.bindings.mode, 'account')
    assert.equal(h.bindings.accountId, accountId)
    for (const field of ['results', 'savedReports', 'savedDocuments']) assert.equal(h.bindings[field], h.data[field])
    const personal = exactly(nodes, n => n.type === 'PersonalAnalysisPanelBoundary', 'existing personal report renderer')
    const express = exactly(nodes, n => n.type === 'ClientExpressReportsBoundary', 'existing express report renderer')
    for (const report of [personal, express]) assert.ok(report.ancestors.includes(archive.node), 'reports remain inside archive')
    assert.equal(personal.node.key, accountId)
    assert.equal(personal.node.props.locale, locale)
    assert.equal(personal.node.props.reports, h.timeline)
    assert.equal(personal.node.props.savedSessions, h.data.savedSessions)
    assert.equal(personal.node.props.embedded, true)
    assert.equal(express.node.props.locale, locale)
    assert.equal(express.node.props.accountId, accountId)
    assert.equal(h.timelineInputs.length, 1)
    assert.equal(h.timelineInputs[0], h.data.savedReports, 'original reportTimeline binding is retained')
  }
}

const stableTree = value => JSON.stringify(value, (_key, entry) => typeof entry === 'function' ? '[handler]' : entry)

export function assertProfileActivityIsolation(locale) {
  const h = renderProfileActivityLayout(locale)
  const activityContent = element('ActivitySentinel', { children: 'synthetic activity only' })
  const report = element('ReportSentinel', { children: 'synthetic report only' })
  for (const mode of ['account', 'legacy']) {
    const props = { locale, mode, reportsContent: report }
    const without = h.profile.ProfileDomains(props)
    const withSlot = h.profile.ProfileDomains({ ...props, activityContent })
    const nodes = layoutNodes(withSlot)
    const activities = nodes.filter(({ node }) => node.type === 'ActivitySentinel')
    const archive = exactly(nodes, n => n.props.id === 'personal-reports', 'direct-render archive')
    const tabs = nodes.filter(({ node }) => node.props.role === 'tab')
    assert.equal(tabs.length, 4)
    assert.equal(layoutNodes(without).some(({ node }) => node.type === 'ActivitySentinel'), false, 'slot remains optional')
    if (mode === 'legacy') {
      assert.equal(activities.length, 0, 'account activities never leak to legacy private-link composition')
      assert.equal(stableTree(withSlot), stableTree(without), 'legacy structure unchanged even when a slot is supplied')
      assert.ok(tabs.every(tab => nodes.indexOf(archive) < nodes.indexOf(tab)), 'legacy archive-first composition unchanged')
    } else {
      assert.equal(activities.length, 1)
      assert.ok(tabs.every(tab => nodes.indexOf(tab) < nodes.indexOf(activities[0])))
      assert.ok(nodes.indexOf(activities[0]) < nodes.indexOf(archive))
      assert.ok(!activities[0].ancestors.some(n => n.type === 'details'))
    }
  }
}

// Evaluate the real enclosing predicates with synthetic state. Early-return
// JSX is replaced by a false sentinel; no event handler or other route runs.
export function assertProfileActivityGates() {
  const workspace = source('components/app/app-workspace.jsx')
  const ast = ts.createSourceFile('app-workspace.jsx', workspace, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX)
  const fn = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'AppWorkspace')
  assert.ok(fn?.body)
  const branches = [], activities = []
  function visit(node) {
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
      && ts.isBinaryExpression(node.left) && node.left.left.getText(ast) === 'page'
      && ts.isStringLiteral(node.left.right) && node.left.right.text === 'portrait') branches.push(node)
    if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node))
      && ['CabinetJourney', 'CabinetToday'].includes(node.tagName.getText(ast))) activities.push(node)
    ts.forEachChild(node, visit)
  }
  visit(fn.body)
  assert.equal(branches.length, 1)
  assert.equal(activities.length, 2, 'no duplicate or guest-route activity instances')
  const portrait = branches[0]
  for (const activity of activities) {
    let parent = activity.parent
    while (parent && parent !== portrait) parent = parent.parent
    assert.equal(parent, portrait, 'activities stay inside the actual portrait condition')
  }
  let child = portrait, parent = child.parent
  const guards = []
  while (parent && parent !== fn) {
    if (ts.isConditionalExpression(parent)) {
      assert.ok(child === parent.whenTrue || child === parent.whenFalse)
      guards.push((child === parent.whenTrue ? '' : '!') + '(' + parent.condition.getText(ast) + ')')
    }
    child = parent; parent = parent.parent
  }
  assert.equal(guards.length, 1, 'portrait remains under its onboarding choice')
  const early = fn.body.statements.filter(n => ts.isIfStatement(n) && ts.isReturnStatement(n.thenStatement))
  assert.equal(early.length, 6, 'all existing pre-workspace return guards are covered')
  const projected = '(function () {' + early.map(n => 'if (' + n.expression.getText(ast) + ') return false;').join('\n')
    + 'return ' + [...guards, '(' + portrait.left.getText(ast) + ')'].join(' && ') + ';})()'
  for (const page of ['portrait', 'course', 'reports', 'tests', 'practice']) {
    for (const state of ['ready', 'signed-out', 'loading', 'error', 'unavailable', 'deletion']) {
      for (const onboardingState of ['active', 'pending']) for (const deleted of [false, true]) {
        const actual = runInNewContext(projected, { page, state, deleted, stressSignup: false,
          data: { account: { id: 'synthetic-account', onboardingState } } }, { timeout: 1000 })
        assert.equal(actual, page === 'portrait' && state === 'ready' && onboardingState === 'active' && !deleted,
          JSON.stringify({ page, state, onboardingState, deleted }))
      }
    }
  }
  assert.equal(runInNewContext(projected, { page: 'portrait', state: 'ready', deleted: false, stressSignup: false, data: null },
    { timeout: 1000 }), false, 'missing account bootstrap cannot reach profile activities')
}
