import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import vm from 'node:vm'
import { types } from 'node:util'
import { canonicalSupportDashboard, supportDashboardSnapshot } from '../scripts/helpers/support-dashboard-diagnostics.mjs'

const metadata = { engine: 'chromium', locale: 'ru', width: 430 }
const rect = (y = 20, height = 30) => ({ x: 1, y, right: 21, bottom: y + height, width: 20, height, shown: true })
const initial = () => ({ client: 430, scroll: 430, a: [rect(20, 275)], photo: [rect(30, 100)],
  toolsSection: [rect(20, 274)], hero: [rect(306.703125, 288)], readableScores: [{ name: 'NEVER_RETAIN' }] })
const raw = () => ({ nodes: Array.from({ length: 7 }, (_, i) => ({ x: 1, y: i, width: 30, height: 40 })) })
const source = readFileSync(new URL('../scripts/helpers/support-dashboard-diagnostics.mjs', import.meta.url), 'utf8')
const verifier = readFileSync(new URL('../scripts/verify-holistic-support-mock-fidelity.mjs', import.meta.url), 'utf8')
function recorderEnvironment({ writeThrows = false, emitThrows = false } = {}) {
  const writes = [], messages = [], timers = new Map(); let now = 0, sequence = 0
  const context = vm.createContext({ types, performance: { now: () => now },
    writeFileSync: (path, content) => { if (writeThrows) throw Error('SECRET_WRITE'); writes.push({ path, content }) },
    console: { error: (...args) => { if (emitThrows) throw Error('SECRET_EMIT'); messages.push(args) } },
    setTimeout: (fn, ms) => { assert.equal(ms, 1000); timers.set(++sequence, fn); return sequence },
    clearTimeout: id => timers.delete(id),
  })
  vm.runInContext(source.replace(/^import .*\n/gm, '').replace(/export /g, '') + '\nthis.make = createSupportDashboardRecorder;', context)
  return { record: context.make(), writes, messages, timers, advance: n => { now = n }, flush: () => { for (const fn of timers.values()) fn() } }
}

test('exact numeric dashboard evidence and fixed aliases exclude names', () => {
  const result = canonicalSupportDashboard(initial(), raw(), metadata)
  assert.equal(result.original.dashboardHeight, 286.703125)
  assert.deepEqual(result.observation.targets.map(x => x.alias), ['top-band', 'assessment', 'profile', 'tools', 'goal-filter', 'quick-match', 'hero'])
  assert.equal(JSON.stringify(result).includes('NEVER_RETAIN'), false)
  assert.equal(result.caseAlias, 'chromium-ru-430')
})
test('unknown metadata keys and values fail closed', () => {
  for (const bad of [{ ...metadata, url: 'SECRET' }, { ...metadata, engine: 'firefox' }, { ...metadata, locale: 'secret' }, { ...metadata, width: 431 }])
    assert.equal(canonicalSupportDashboard(initial(), raw(), bad), null)
})
test('unknown raw or rectangle keys rejected without payload retention', () => {
  for (const value of [{ ...raw(), secret: 'SECRET' }, { nodes: raw().nodes.map((r, i) => i ? r : { ...r, value: 'SECRET' }) }]) {
    const result = canonicalSupportDashboard(initial(), value, metadata)
    assert.equal(result.observation.status, 'unavailable'); assert.equal(result.original.status, 'captured')
    assert.equal(JSON.stringify(result).includes('SECRET'), false)
  }
})
test('accessors and proxies are rejected without calling traps', () => {
  let calls = 0
  const accessor = {}; Object.defineProperty(accessor, 'nodes', { get() { calls++; throw Error('SECRET') } })
  const proxy = new Proxy(raw(), { ownKeys() { calls++; throw Error('SECRET') } })
  for (const value of [accessor, proxy]) assert.equal(canonicalSupportDashboard(initial(), value, metadata).observation.status, 'unavailable')
  const m = { ...metadata }; Object.defineProperty(m, 'width', { get() { calls++; return 430 } })
  assert.equal(canonicalSupportDashboard(initial(), raw(), m), null)
  assert.equal(calls, 0)
})
test('array extras holes and wrong lengths reject supplemental capture', () => {
  const values = [[], new Array(7), [...raw().nodes, null]]
  const extra = raw().nodes; extra.secret = 'SECRET'; values.push(extra)
  for (const nodes of values) assert.equal(canonicalSupportDashboard(initial(), { nodes }, metadata).observation.status, 'unavailable')
})
test('nonfinite and huge numbers reject while absent nodes remain explicit', () => {
  for (const value of [NaN, Infinity, -Infinity, 100001, '33']) {
    const data = raw(); data.nodes[0].height = value
    assert.equal(canonicalSupportDashboard(initial(), data, metadata).observation.status, 'unavailable')
  }
  const data = raw(); data.nodes[4] = null
  assert.equal(canonicalSupportDashboard(initial(), data, metadata).observation.targets[4].rect, null)
})
test('original accessors and unknown keys cannot leak or replace supplemental evidence', () => {
  let called = 0; const data = initial(); Object.defineProperty(data, 'a', { get() { called++; return [] } })
  assert.equal(canonicalSupportDashboard(data, raw(), metadata).original.status, 'unavailable')
  assert.equal(canonicalSupportDashboard({ ...initial(), secret: 'SECRET' }, raw(), metadata).original.status, 'unavailable')
  assert.equal(called, 0)
})
test('browser snapshot reads only seven fixed node rectangles', () => {
  const node = { getBoundingClientRect: () => ({ x: 1, y: 2, width: 3, height: 4 }), closest: () => node }
  node.parentElement = node
  const selectors = []
  const root = { querySelector: sel => { selectors.push(sel); return node } }
  const context = vm.createContext({ document: { querySelector: sel => { assert.equal(sel, '[data-holistic-mobile-alternative]'); return root } } })
  const result = vm.runInContext('(' + supportDashboardSnapshot.toString() + ')()', context)
  assert.equal(result.nodes.length, 7); assert.equal(selectors.length, 6)
  assert.deepEqual(JSON.parse(JSON.stringify(result.nodes[0])), { x: 1, y: 2, width: 3, height: 4 })
  assert.doesNotMatch(supportDashboardSnapshot.toString(), /textContent|innerText|getAttribute|getComputedStyle|\.value\b|\.url\b|storage|cookie/)
})
test('recorder is one attempt fixed path bounded content with timer cleanup', async () => {
  const e = recorderEnvironment(); let evaluations = 0
  const page = { evaluate: async () => { evaluations++; return raw() } }
  await e.record(page, metadata, initial()); await e.record(page, metadata, initial())
  assert.equal(evaluations, 1); assert.equal(e.writes.length, 1); assert.equal(e.messages.length, 1); assert.equal(e.timers.size, 0)
  assert.equal(e.writes[0].path, 'artifacts/holistic-support-mock-fidelity/dashboard-diagnostics.json')
  assert.ok(e.writes[0].content.length < 8192); assert.doesNotMatch(e.writes[0].content, /NEVER_RETAIN|SECRET/)
})
test('invalid metadata does not consume the single allowed valid attempt', async () => {
  const e = recorderEnvironment(); let evaluations = 0
  const page = { evaluate: async () => { evaluations++; return raw() } }
  await e.record(page, { ...metadata, width: 700 }, initial()); await e.record(page, metadata, initial())
  assert.equal(evaluations, 1); assert.equal(e.writes.length, 1)
})
test('evaluation rejection emits no error text and retains initial measurement', async () => {
  const e = recorderEnvironment()
  await e.record({ evaluate: async () => { throw Error('SECRET_BROWSER') } }, metadata, initial())
  const result = JSON.parse(e.writes[0].content)
  assert.equal(result.original.dashboardHeight, 286.703125); assert.equal(result.observation.status, 'unavailable')
  assert.doesNotMatch(JSON.stringify(e.messages), /SECRET_BROWSER/)
})
test('artifact and console errors never escape diagnostics', async () => {
  for (const config of [{ writeThrows: true }, { emitThrows: true }]) {
    const e = recorderEnvironment(config); await assert.doesNotReject(e.record({ evaluate: async () => raw() }, metadata, initial()))
    assert.equal(e.timers.size, 0)
  }
})
test('timer expiry forbids late evaluation writes and logs', async () => {
  const e = recorderEnvironment(); let resolve
  const pending = e.record({ evaluate: () => new Promise(r => { resolve = r }) }, metadata, initial())
  await Promise.resolve(); e.advance(1000); e.flush(); await pending
  resolve(raw()); await Promise.resolve(); await Promise.resolve()
  assert.equal(e.writes.length, 0); assert.equal(e.messages.length, 0); assert.equal(e.timers.size, 0)
})
test('monotonic expiry before timer callback also prevents emission', async () => {
  const e = recorderEnvironment()
  await e.record({ evaluate: async () => { e.advance(1001); return raw() } }, metadata, initial())
  assert.equal(e.writes.length, 0); assert.equal(e.messages.length, 0)
})
const insertedBlock = `          if (!(geometry.hero[0].y-geometry.a[0].y<285)) {
            try { await recordSupportDashboardFailure(page, { engine: browserType.name(), locale, width }, geometry); }
            catch { /* Diagnostics must not replace the original fatal assertion. */ }
          }
`
// Only diagnostic-owned wiring and fatal measurement gates are contractual.
// Whole-file publication reversal is separate evidence, not a committed hash lock.
function supportDiagnosticContract(text) {
  const file = ts.createSourceFile('verifier.mjs', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  assert.equal(file.parseDiagnostics.length, 0, 'valid verifier JavaScript')
  const nodes = []
  const visit = node => { nodes.push(node); ts.forEachChild(node, visit) }
  visit(file)
  const shape = node => {
    if (ts.isParenthesizedExpression(node)) return shape(node.expression)
    if (ts.isIdentifier(node)) return ['id', node.text]
    if (ts.isNumericLiteral(node)) return ['number', node.text]
    if (ts.isStringLiteral(node)) return ['string', node.text]
    if (ts.isPropertyAccessExpression(node)) { assert.ok(!node.questionDotToken); return ['property', shape(node.expression), node.name.text] }
    if (ts.isElementAccessExpression(node)) { assert.ok(!node.questionDotToken); return ['element', shape(node.expression), shape(node.argumentExpression)] }
    if (ts.isBinaryExpression(node)) return ['binary', node.operatorToken.kind, shape(node.left), shape(node.right)]
    if (ts.isPrefixUnaryExpression(node)) return ['unary', node.operator, shape(node.operand)]
    if (ts.isCallExpression(node)) { assert.ok(!node.questionDotToken); return ['call', shape(node.expression), node.arguments.map(shape)] }
    if (ts.isArrayLiteralExpression(node)) return ['array', node.elements.map(shape)]
    if (ts.isObjectLiteralExpression(node)) return ['object', node.properties.map(property => {
      if (ts.isShorthandPropertyAssignment(property) && !property.objectAssignmentInitializer) return ['shorthand', property.name.text]
      assert.ok(ts.isPropertyAssignment(property) && ts.isIdentifier(property.name), 'fixed metadata data properties')
      return ['property', property.name.text, shape(property.initializer)]
    })]
    assert.fail('unsupported diagnostic expression kind')
  }
  const expression = source => ts.createSourceFile('expected.mjs', 'const value = '+source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS).statements[0].declarationList.declarations[0].initializer
  const same = (node, expected) => assert.deepEqual(shape(node), shape(expression(expected)))
  const isCall = (node, name) => ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === name
  // Scoped ownership/control-flow checks, not universal JavaScript verification.
  const assertImports = file.statements.filter(node => ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === 'node:assert/strict')
  assert.equal(assertImports.length, 1, 'one genuine strict assert import')
  const assertClause = assertImports[0].importClause
  assert.ok(assertClause && !assertClause.isTypeOnly && !assertClause.namedBindings && assertClause.name?.text === 'assert', 'genuine default assert binding')
  for (const identifier of nodes.filter(node => ts.isIdentifier(node) && node.text === 'assert')) {
    if (identifier === assertClause.name) continue
    const member = identifier.parent, invocation = member.parent
    assert.ok(ts.isPropertyAccessExpression(member) && member.expression === identifier && !member.questionDotToken &&
      ts.isCallExpression(invocation) && invocation.expression === member && !invocation.questionDotToken,
    'assert binding cannot be shadowed, aliased or reassigned')
  }
  const imports = file.statements.filter(node => ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === './helpers/support-dashboard-diagnostics.mjs')
  assert.equal(imports.length, 1, 'one fixed helper import')
  const clause = imports[0].importClause
  assert.ok(clause && !clause.isTypeOnly && !clause.name && clause.namedBindings && ts.isNamedImports(clause.namedBindings))
  assert.equal(clause.namedBindings.elements.length, 1)
  const binding = clause.namedBindings.elements[0]
  assert.ok(!binding.propertyName && !binding.isTypeOnly && binding.name.text === 'createSupportDashboardRecorder', 'unaliased factory import')
  const factories = nodes.filter(node => isCall(node, 'createSupportDashboardRecorder'))
  assert.equal(factories.length, 1, 'one recorder factory call')
  const factory = factories[0], declaration = factory.parent
  assert.ok(!factory.questionDotToken); assert.equal(factory.arguments.length, 0)
  assert.ok(ts.isVariableDeclaration(declaration) && declaration.initializer === factory && ts.isIdentifier(declaration.name) && declaration.name.text === 'recordSupportDashboardFailure')
  assert.ok(ts.isVariableDeclarationList(declaration.parent) && (declaration.parent.flags & ts.NodeFlags.Const))
  assert.equal(declaration.parent.declarations.length, 1)
  assert.ok(ts.isVariableStatement(declaration.parent.parent) && declaration.parent.parent.parent === file, 'top-level singleton')
  for (const name of ['createSupportDashboardRecorder', 'recordSupportDashboardFailure']) {
    assert.equal(nodes.filter(node => ts.isIdentifier(node) && node.text === name).length, 2, 'no extra binding, reassignment or use of '+name)
  }
  const calls = nodes.filter(node => isCall(node, 'recordSupportDashboardFailure'))
  assert.equal(calls.length, 1, 'one diagnostic call')
  const call = calls[0]
  assert.ok(!call.questionDotToken); assert.equal(call.arguments.length, 3)
  same(call.arguments[0], 'page')
  same(call.arguments[1], '{ engine: browserType.name(), locale, width }')
  same(call.arguments[2], 'geometry')
  const awaited = call.parent, statement = awaited.parent, tryBlock = statement.parent, guardedTry = tryBlock.parent
  assert.ok(ts.isAwaitExpression(awaited) && awaited.expression === call && ts.isExpressionStatement(statement))
  assert.ok(ts.isBlock(tryBlock) && tryBlock.statements.length === 1 && tryBlock.statements[0] === statement)
  assert.ok(ts.isTryStatement(guardedTry) && guardedTry.tryBlock === tryBlock && !guardedTry.finallyBlock)
  assert.ok(guardedTry.catchClause && !guardedTry.catchClause.variableDeclaration && guardedTry.catchClause.block.statements.length === 0, 'observer failure cannot replace fatal assertion')
  const arm = guardedTry.parent, conditional = arm.parent
  assert.ok(ts.isBlock(arm) && arm.statements.length === 1 && arm.statements[0] === guardedTry)
  assert.ok(ts.isIfStatement(conditional) && conditional.thenStatement === arm && !conditional.elseStatement)
  same(conditional.expression, '!(geometry.hero[0].y - geometry.a[0].y < 285)')
  const block = conditional.parent
  assert.ok(ts.isBlock(block), 'diagnostic is directly in measured case block')
  const index = block.statements.indexOf(conditional)
  const fatal = block.statements[index + 1]
  const assertCall = node => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) && !node.expression.questionDotToken ? node.expression : null
  const fatalCall = assertCall(fatal)
  assert.ok(fatalCall && fatalCall.arguments.length === 2, 'fatal assertion immediately follows observer arm')
  same(fatalCall.expression, 'assert.ok')
  same(fatalCall.arguments[0], 'geometry.hero[0].y - geometry.a[0].y < 285')
  const noSwallowingCatch = node => {
    for (let child = node, parent = node.parent; parent; child = parent, parent = parent.parent) {
      assert.ok(!(ts.isTryStatement(parent) && parent.tryBlock === child && parent.catchClause), 'fatal assertion cannot be swallowed by ancestor catch')
    }
  }
  noSwallowingCatch(fatal)
  const gate = (callee, predicate) => block.statements.map((node, at) => ({node, at, call:assertCall(node)})).filter(item => {
    if (!item.call || !item.call.arguments.length) return false
    try { same(item.call.expression, callee); same(item.call.arguments[0], predicate); return true } catch { return false }
  })
  const heights = gate('assert.ok', 'geometry.hero[0].height >= 268')
  assert.equal(heights.length, 1, 'one unweakened hero-height gate')
  assert.ok(heights[0].at > index + 1); noSwallowingCatch(heights[0].node)
  const errors = gate('assert.deepEqual', 'errors')
  assert.equal(errors.length, 1, 'one fatal browser-errors gate')
  assert.equal(errors[0].call.arguments.length, 3); same(errors[0].call.arguments[1], '[]')
  assert.ok(errors[0].at > heights[0].at); noSwallowingCatch(errors[0].node)
  const caseTry = block.parent
  assert.ok(ts.isTryStatement(caseTry) && caseTry.tryBlock === block && !caseTry.catchClause && caseTry.finallyBlock,
    'measured case must be direct uncaught try/finally, not a conditional wrapper')
  const loop = (body, name, iterable) => {
    const node = body.parent
    assert.ok(ts.isBlock(body) && ts.isForOfStatement(node) && node.statement === body && !node.awaitModifier,
      'case ancestry is a direct for-of matrix')
    assert.ok(ts.isVariableDeclarationList(node.initializer) && (node.initializer.flags & ts.NodeFlags.Const) && node.initializer.declarations.length === 1)
    const variable = node.initializer.declarations[0]
    assert.ok(ts.isIdentifier(variable.name) && variable.name.text === name && !variable.initializer)
    same(node.expression, iterable)
    return node
  }
  const widthLoop = loop(caseTry.parent, 'width', '[320, 390, 430]')
  const localeLoop = loop(widthLoop.parent, 'locale', '["ru", "en", "es"]')
  const browserTryBlock = localeLoop.parent, browserTry = browserTryBlock.parent
  assert.ok(ts.isBlock(browserTryBlock) && ts.isTryStatement(browserTry) && browserTry.tryBlock === browserTryBlock && !browserTry.catchClause && browserTry.finallyBlock)
  const browserLoop = loop(browserTry.parent, 'browserType', '[chromium, webkit]')
  assert.equal(browserLoop.parent, file, 'browser matrix is not guarded by another condition')
  const noEarlyExit = node => {
    // Returns inside page.evaluate/wait callbacks do not exit the measured case.
    if (ts.isFunctionLike(node)) return
    assert.ok(!ts.isContinueStatement(node) && !ts.isBreakStatement(node) && !ts.isReturnStatement(node),
      'measured case and fatal gates cannot be skipped by an early exit')
    ts.forEachChild(node, noEarlyExit)
  }
  noEarlyExit(caseTry.finallyBlock); noEarlyExit(browserTry.finallyBlock)
  const checkPrefix = (container, target) => {
    const at = container.statements.indexOf(target)
    assert.ok(at >= 0)
    for (const before of container.statements.slice(0, at)) noEarlyExit(before)
  }
  for (const [container, target] of [[file,browserLoop],[browserTry.parent,browserTry],
    [browserTryBlock,localeLoop],[widthLoop.parent,widthLoop],[caseTry.parent,caseTry],
    [block,errors[0].node]]) checkPrefix(container, target)
  const measurements = block.statements.slice(0, index).filter(node => ts.isVariableStatement(node)).flatMap(node => [...node.declarationList.declarations]).filter(node => ts.isIdentifier(node.name) && node.name.text === 'geometry')
  assert.equal(measurements.length, 1, 'original geometry precedes diagnostic')
  const measurement = measurements[0]
  assert.ok((measurement.parent.flags & ts.NodeFlags.Const) && measurement.initializer && ts.isAwaitExpression(measurement.initializer))
  assert.ok(ts.isCallExpression(measurement.initializer.expression)); same(measurement.initializer.expression.expression, 'page.evaluate')
  return { arm:conditional.getText(file), fatal:fatal.getText(file), source:file }
}

test('verifier retains scoped diagnostic singleton, failure-only call and fatal gates', () => {
  supportDiagnosticContract(verifier)
})
test('actual verifier block never runs on pass and preserves original assertion after throwing observer', async () => {
  const assertion = '          assert.ok(geometry.hero[0].y-geometry.a[0].y<285,\n            label+" screenshot-like three-zone dashboard exposes scenic player by 285px");'
  assert.ok(verifier.includes(insertedBlock + assertion))
  let calls = 0
  const run = (gap, record) => vm.runInNewContext('(async()=>{' + insertedBlock + assertion + '\n})()', {
    geometry: { hero: [{ y: gap }], a: [{ y: 0 }] }, page: {}, browserType: { name: () => 'chromium' }, locale: 'ru', width: 430,
    label: 'case', recordSupportDashboardFailure: record, assert,
  })
  await run(284.999, async () => { calls++ }); assert.equal(calls, 0)
  await assert.rejects(run(285, async () => { calls++; throw Error('SECRET_OBSERVER') }), error => error.code === 'ERR_ASSERTION' && /by 285px/.test(error.message))
  assert.equal(calls, 1)
})

test('recorder preserves initial measurement and metadata across delayed evaluation', async () => {
  const e = recorderEnvironment(); const before = initial(), meta = { ...metadata }; let finish
  const pending = e.record({ evaluate: () => new Promise(resolve => { finish = resolve }) }, meta, before)
  await Promise.resolve(); before.hero[0].y = 999; meta.locale = 'en'; meta.width = 320
  finish(raw()); await pending
  const saved = JSON.parse(e.writes[0].content)
  assert.equal(saved.caseAlias, 'chromium-ru-430'); assert.equal(saved.original.dashboardHeight, 286.703125)
})

test('nested rectangle and indexed-array getters remain uncalled', () => {
  let calls = 0
  const a = raw(); Object.defineProperty(a.nodes[0], 'x', { get() { calls++; return 1 } })
  assert.equal(canonicalSupportDashboard(initial(), a, metadata).observation.status, 'unavailable')
  const b = raw(); Object.defineProperty(b.nodes, '0', { get() { calls++; return null } })
  assert.equal(canonicalSupportDashboard(initial(), b, metadata).observation.status, 'unavailable')
  const c = initial(); Object.defineProperty(c.hero[0], 'y', { get() { calls++; return 300 } })
  assert.equal(canonicalSupportDashboard(c, raw(), metadata).original.status, 'unavailable')
  assert.equal(calls, 0)
})

test('even ignored name-bearing fields must be own data, never accessors', () => {
  let calls = 0; const data = initial()
  Object.defineProperty(data, 'readableScores', { get() { calls++; return [{ name: 'SECRET' }] } })
  assert.equal(canonicalSupportDashboard(data, raw(), metadata).original.status, 'unavailable')
  assert.equal(calls, 0)
})

test('scoped AST tolerates unrelated canonical additions and comments without hash churn', () => {
  for (const changed of [
    '// Unrelated canonical documentation\n'+verifier,
    verifier.replace('const evidence = [];', 'const evidence = [];\nassert.ok(true, "unrelated source contract");'),
    verifier.replace('Support mock fidelity browser cases: ', 'Support browser results: '),
  ]) {
    assert.notEqual(changed, verifier)
    supportDiagnosticContract(changed)
  }
})
test('actual AST-selected diagnostic preserves the boundary and fatal observer isolation', async () => {
  const selected = supportDiagnosticContract(verifier)
  let calls = 0
  const run = (gap, record) => vm.runInNewContext('(async()=>{'+selected.arm+'\n'+selected.fatal+'})()', {
    geometry:{hero:[{y:gap}],a:[{y:0}]},page:{},browserType:{name:()=> 'chromium'},locale:'ru',width:430,
    label:'case',recordSupportDashboardFailure:record,assert,
  })
  await run(284.999, async()=>{calls++});assert.equal(calls,0)
  for (const gap of [285,286,Number.NaN]) {
    const before=calls
    await assert.rejects(run(gap,async()=>{calls++;throw Error('OBSERVER_PRIVATE')}),error=>error.code==='ERR_ASSERTION' && !error.message.includes('OBSERVER_PRIVATE'))
    assert.equal(calls,before+1)
  }
})
const scopedMutations = [
  ['wrong helper import','./helpers/support-dashboard-diagnostics.mjs','./helpers/unrelated.mjs'],
  ['factory arguments','createSupportDashboardRecorder();','createSupportDashboardRecorder(42);'],
  ['factory not singleton','const recordSupportDashboardFailure =','let recordSupportDashboardFailure ='],
  ['duplicate recorder binding','const evidence = [];','const evidence = []; function shadow(recordSupportDashboardFailure) {}'],
  ['extra factory call','const evidence = [];','const evidence = []; createSupportDashboardRecorder();'],
  ['duplicate diagnostic call','try { await recordSupportDashboardFailure(page, { engine: browserType.name(), locale, width }, geometry); }','try { await recordSupportDashboardFailure(page, { engine: browserType.name(), locale, width }, geometry); await recordSupportDashboardFailure(page, { engine: browserType.name(), locale, width }, geometry); }'],
  ['optional recorder','await recordSupportDashboardFailure(page,','await recordSupportDashboardFailure?.(page,'],
  ['optional factory','createSupportDashboardRecorder();','createSupportDashboardRecorder?.();'],
  ['optional metadata','engine: browserType.name(), locale, width }, geometry','engine: browserType?.name(), locale, width }, geometry'],
  ['unawaited recorder','try { await recordSupportDashboardFailure','try { recordSupportDashboardFailure'],
  ['wrong page','recordSupportDashboardFailure(page,','recordSupportDashboardFailure(root,'],
  ['wrong metadata','{ engine: browserType.name(), locale, width }, geometry','{ engine: browserType.name(), locale, width, extra: 1 }, geometry'],
  ['spread metadata','{ engine: browserType.name(), locale, width }, geometry','{ engine: browserType.name(), ...metadata }, geometry'],
  ['wrong measurement','locale, width }, geometry','locale, width }, {}'],
  ['passing path observation','if (!(geometry.hero[0].y-geometry.a[0].y<285))','if (geometry.hero[0].y-geometry.a[0].y<285)'],
  ['weakened dashboard','y<285','y<286'],
  ['inclusive dashboard','y<285','y<=285'],
  ['optional fatal assertion','assert.ok(geometry.hero[0].y-geometry.a[0].y<285','assert.ok?.(geometry.hero[0].y-geometry.a[0].y<285'],
  ['weakened hero','height>=268','height>=267'],
  ['return from diagnostic','catch { /* Diagnostics must not replace the original fatal assertion. */ }','catch { return; }'],
  ['finally in diagnostic','catch { /* Diagnostics must not replace the original fatal assertion. */ }','catch {} finally { return; }'],
  ['retry loop','try { await recordSupportDashboardFailure','try { for(let attempt=0;attempt<2;attempt++) await recordSupportDashboardFailure'],
  ['fatal error gate removed','assert.deepEqual(errors,[],label+" browser exceptions");','void errors;'],
  ['error gate accepts failures','assert.deepEqual(errors,[],','assert.deepEqual(errors,errors,'],
  ['observer order interrupted',insertedBlock,insertedBlock+'          assert.ok(true);\n'],
]
for (const [name, from, to] of scopedMutations) test('scoped diagnostic rejects '+name, () => {
  assert.ok(verifier.includes(from),'mutation applies')
  const changed=verifier.replace(from,to)
  assert.throws(()=>supportDiagnosticContract(changed))
})
test('scoped diagnostic rejects an ancestor catch swallowing its fatal assertion', () => {
  const selected=supportDiagnosticContract(verifier)
  const from=insertedBlock+'          '+selected.fatal
  assert.ok(verifier.includes(from))
  const changed=verifier.replace(from,'          try {\n'+from+'\n          } catch {}')
  assert.throws(()=>supportDiagnosticContract(changed),/swallowed/)
})
test('scoped diagnostic rejects moving fatal assertion into the observer catch', () => {
  const selected=supportDiagnosticContract(verifier)
  const from=insertedBlock+'          '+selected.fatal
  assert.ok(verifier.includes(from))
  const changed=verifier.replace(from,insertedBlock.replace('/* Diagnostics must not replace the original fatal assertion. */', selected.fatal))
  assert.throws(()=>supportDiagnosticContract(changed))
})

function caseParts(text) {
  const file=ts.createSourceFile('control.mjs',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS)
  assert.equal(file.parseDiagnostics.length,0)
  let geometry
  const visit=node=>{if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text==='geometry')geometry=node;ts.forEachChild(node,visit)}
  visit(file);assert.ok(geometry)
  const statement=geometry.parent.parent,block=statement.parent,caseTry=block.parent
  assert.ok(ts.isBlock(block)&&ts.isTryStatement(caseTry)&&caseTry.finallyBlock)
  return {file,statement,block,caseTry}
}
const spliceSource=(source,at,text)=>source.slice(0,at)+text+source.slice(at)
const ownershipMutations = [
  ['reviewer dead measured-case wrapper',source=>{const {file,block}=caseParts(source);return spliceSource(spliceSource(source,block.end-1,' } '),block.getStart(file)+1,' if(false) { ')},/direct uncaught try/],
  ['reviewer continue before geometry',source=>{const {file,statement}=caseParts(source);return spliceSource(source,statement.getStart(file),'continue;\n')},/early exit/],
  ['reviewer shadow no-op assert',source=>{const {file,block}=caseParts(source);return spliceSource(source,block.getStart(file)+1,' const assert = { ok(){}, equal(){}, deepEqual(){}, match(){} }; ')},/assert binding/],
  ['skip at case entry',source=>{const {file,caseTry}=caseParts(source);return spliceSource(source,caseTry.getStart(file),'continue;\n')},/early exit/],
  ['conditional early continue',source=>{const {file,statement}=caseParts(source);return spliceSource(source,statement.getStart(file),'if(true) continue;\n')},/early exit/],
  ['finally suppresses failure with continue',source=>{const {file,caseTry}=caseParts(source);return spliceSource(source,caseTry.finallyBlock.getStart(file)+1,'continue;\n')},/early exit/],
  ['finally suppresses failure with break',source=>{const {file,caseTry}=caseParts(source);return spliceSource(source,caseTry.finallyBlock.getStart(file)+1,'break;\n')},/early exit/],
  ['finally suppresses failure with return',source=>{const {file,caseTry}=caseParts(source);return spliceSource(source,caseTry.finallyBlock.getStart(file)+1,'return;\n')},/early exit/],
  ['wrong assert module',source=>source.replace('from "node:assert/strict"','from "node:assert"'),/strict assert import/],
  ['assert method reassignment',source=>{const {file,statement}=caseParts(source);return spliceSource(source,statement.getStart(file),'assert.ok = ()=>{};\n')},/assert binding/],
  ['assert alias mutation',source=>{const {file,statement}=caseParts(source);return spliceSource(source,statement.getStart(file),'const alias = assert; alias.ok = ()=>{};\n')},/assert binding/],
  ['empty viewport matrix',source=>source.replace('for (const width of [320, 390, 430])','for (const width of [])'),/deep-equal/],
]
for (const [name, mutate, expected] of ownershipMutations) test('scoped ownership rejects '+name,()=>{
  const changed=mutate(verifier)
  assert.notEqual(changed,verifier)
  assert.equal(ts.createSourceFile('mutant.mjs',changed,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length,0)
  assert.throws(()=>supportDiagnosticContract(changed),expected)
})
test('scoped ownership permits ordinary added assertions and nested callback returns',()=>{
  const {file,statement}=caseParts(verifier)
  const changed=spliceSource(verifier,statement.getStart(file),'assert.ok(true, "independent check");\nconst unrelated = () => { return 42; };\n')
  supportDiagnosticContract(changed)
})
