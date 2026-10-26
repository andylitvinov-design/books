// Source-bound orchestration and interaction bookkeeping, not a native browser.
import assert from 'node:assert/strict'
import { parse, descendants, ts } from './current-source-render.mjs'

const widths = [320, 375, 390, 430, 1365]
const engines = ['chromium', 'webkit']
const directions = [['en', 'ru'], ['ru', 'en']]
const locales = ['en', 'ru']
const journeys = ['selfTest', 'analysis', 'reiki']
const origin = 'https://synthetic-home.invalid'
const evidence = '/synthetic-evidence'
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
const forbidden = () => { throw new Error('Native, filesystem and network operations are forbidden') }
const sorted = rows => rows.map(row => JSON.stringify(row)).sort()
const expectedCases = engines.flatMap(engine => widths.map(width => ({ engine, width })))
const expectedSwitches = expectedCases.flatMap(item => directions.map(([from, to]) => ({ ...item, from, to, heldRsc: true, firstClickRetained: true })))
const expectedJourneys = expectedCases.flatMap(item => locales.flatMap(locale => journeys.map(freeJourney => ({
  ...item, locale, freeJourney, ...(freeJourney === 'analysis'
    ? { inPageCapture: true, stayedOnHome: true, submitted: false }
    : { destinationRendered: true, backReturned: true, submitted: false }),
}))))

function fragments(source) {
  const file = parse(source, 'verify-home-locale-switch.mjs')
  const fn = name => {
    const matches = file.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === name)
    assert.equal(matches.length, 1, 'One real ' + name)
    return matches[0]
  }
  const exercise = fn('exercise')
  assert.deepEqual(exercise.parameters.map(node => node.name.getText(file)), ['engine', 'browserType', 'width'])
  const main = exercise.body.statements.filter(ts.isTryStatement)
  assert.equal(main.length, 1); assert.ok(main[0].catchClause && main[0].finallyBlock)
  const protectedInputs = ['engine', 'browserType', 'width']
  for (const node of descendants(exercise.body)) {
    if ((ts.isVariableDeclaration(node) || ts.isParameter(node)) && node.name)
      assert.ok(!descendants(node.name).some(item => ts.isIdentifier(item) && protectedInputs.includes(item.text)), 'No shadowed case identity')
    if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment
      && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment)
      assert.ok(!descendants(node.left).some(item => ts.isIdentifier(item) && protectedInputs.includes(item.text)), 'No reassigned case identity')
    if ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node))
      && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(node.operator))
      assert.ok(!descendants(node.operand).some(item => ts.isIdentifier(item) && protectedInputs.includes(item.text)), 'No unary write to case identity')
  }
  for (const statement of exercise.body.statements.slice(0, exercise.body.statements.indexOf(main[0]))) {
    if (ts.isVariableStatement(statement)) continue
    const value = ts.isExpressionStatement(statement) ? statement.expression : undefined
    const call = value && ts.isAwaitExpression(value) ? value.expression : value
    assert.ok(call && ts.isCallExpression(call) && ['page.on', 'page.route'].includes(call.expression.getText(file)),
      'No new pre-acceptance branch or early throw hidden outside the executed fragments')
  }
  const switches = main[0].tryBlock.statements[0]
  assert.ok(ts.isForOfStatement(switches), 'Directions remain the first unconditional acceptance loop')
  assert.equal(switches.initializer.getText(file), 'const [from, to]')
  // Reject an early outer return that would make extracted acceptance unreachable.
  const walk = node => {
    if (node !== exercise && (ts.isFunctionLike(node) || ts.isClassDeclaration(node))) return
    assert.ok(!ts.isReturnStatement(node), 'No early exit from the actual exercise')
    ts.forEachChild(node, walk)
  }
  walk(exercise)
  const calls = descendants(exercise.body).filter(node => ts.isCallExpression(node) && node.expression.getText(file) === 'browser.newContext')
  assert.equal(calls.length, 1)
  const browsers = exercise.body.statements.filter(ts.isVariableStatement).flatMap(node => [...node.declarationList.declarations])
    .filter(node => ts.isIdentifier(node.name) && node.name.text === 'browser')
  assert.equal(browsers.length, 1)
  const launch = browsers[0].initializer
  assert.ok(launch && ts.isAwaitExpression(launch) && ts.isCallExpression(launch.expression))
  assert.equal(launch.expression.expression.getText(file), 'browserType.launch', 'Launch the actual requested engine binding')
  assert.equal(launch.expression.arguments.length, 0)
  const tailStart = main[0].tryBlock.statements.findIndex(node => ts.isExpressionStatement(node)
    && ts.isAwaitExpression(node.expression) && ts.isCallExpression(node.expression.expression)
    && node.expression.expression.expression.getText(file) === 'exerciseFreeJourneys')
  assert.ok(tailStart > 0, 'Journeys remain a reached, unconditional call in the real acceptance try')
  // Visual DOM acceptance is deliberately not simulated. Guard the outer
  // control-flow boundary of this omitted region; callbacks/assertions inside
  // it still need native acceptance and are not declared successful here.
  const guardVisualFlow = node => {
    if (ts.isFunctionLike(node) || ts.isClassDeclaration(node)) return
    assert.ok(![ts.SyntaxKind.ThrowStatement, ts.SyntaxKind.ReturnStatement,
      ts.SyntaxKind.BreakStatement, ts.SyntaxKind.ContinueStatement].includes(node.kind), 'No new explicit control-flow escape in the unexecuted visual region')
    ts.forEachChild(node, guardVisualFlow)
  }
  for (const statement of main[0].tryBlock.statements.slice(3, tailStart)) guardVisualFlow(statement)
  const outer = file.statements.filter(ts.isTryStatement)
  assert.equal(outer.length, 1); assert.equal(file.statements.at(-1), outer[0]); assert.ok(outer[0].finallyBlock)
  return { outer: outer[0].getText(file), switches: switches.getText(file), launch: launch.getText(file), viewport: calls[0].getText(file),
    tail: main[0].tryBlock.statements.slice(tailStart).map(node => node.getText(file)).join('\n'),
    afterSwitches: main[0].tryBlock.statements.slice(1, 3).map(node => node.getText(file)).join('\n'),
    homePath: fn('homePath').getText(file), journeys: fn('exerciseFreeJourneys').getText(file) }
}

async function runSwitches(f, results, engine, width, options) {
  const state = { locale: undefined, played: false, committed: false, url: undefined }
  const ids = { en: 'Y4K4piEwwA8', ru: 'AE8Pelpo424' }
  const homePath = locale => locale === 'en' ? '/' : '/ru'
  const main = { kind: 'main' }
  const player = locale => ({ kind: 'player', locale, locator(selector) {
    if (selector === 'iframe') return { kind: 'iframe', locale, async elementHandle() {
      assert.equal(state.played, true)
      return { async evaluate(callback) { return callback({ isConnected: !options.discarded }) } }
    } }
    assert.equal(selector, 'button.site-video-play')
    return { async click() { assert.equal(state.locale, locale); assert.equal(state.played, false); state.played = true } }
  } })
  const page = {
    async goto(url, opts) {
      assert.deepEqual(opts, { waitUntil: 'domcontentloaded' })
      assert.ok([origin + '/', origin + '/ru'].includes(url))
      state.locale = url.endsWith('/ru') ? 'ru' : 'en'; state.url = url; state.played = false; state.committed = false
    },
    locator(selector) {
      if (selector === 'main.house-home') return main
      const match = selector.match(/^\[data-video-slot="home-intro"\]\[data-video-locale="(en|ru)"\]$/)
      assert.ok(match, 'Exact current/next player locator'); return player(match[1])
    },
  }
  const expect = target => ({
    async toHaveURL(url) { assert.equal(target, page); assert.equal(state.url, url) },
    async toHaveAttribute(name, value) {
      if (target === main) { assert.equal(name, 'lang'); assert.equal(state.locale, value) }
      else { assert.equal(target.kind, 'iframe'); assert.equal(name, 'src'); assert.equal(state.played, true)
        assert.match('https://www.youtube-nocookie.com/embed/' + ids[target.locale] + '?autoplay=1', value) }
    },
    async toHaveCount(count) {
      await Promise.resolve()
      assert.equal(target.kind === 'player' ? Number(state.locale === target.locale) : Number(state.locale === target.locale && state.played), count)
    },
  })
  expect.poll = callback => ({ async toBeGreaterThan(value) { assert.ok(await callback() > value) } })
  const checks = [], offers = []
  const transport = { assertHealthy() { checks.push('healthy') } }
  const errors = options.pageError ? ['Synthetic page error'] : []
  await new AsyncFunction('assert', 'expect', 'page', 'homePath', 'origin', 'results', 'engine', 'width', 'state', 'transport', 'errors', 'offers', `
    let phase, heldRequests = 0, delayedLocale = null, delayedRscGate, releaseHeldRsc = () => {};
    const unexpectedEnquiryRequests = [];
    const pause = async ms => assert.equal(ms, 2200);
    async function chooseHomeLocale(target, locale) {
      assert.equal(target, page); assert.equal(delayedLocale, locale); heldRequests++;
      delayedRscGate.then(() => { state.locale = locale; state.url = origin + homePath(locale); state.played = false; state.committed = true; });
    }
    async function verifyFreeOffers(target, locale, actualEngine, actualWidth) {
      assert.equal(target, page); assert.equal(actualEngine, engine); assert.equal(actualWidth, width); offers.push(locale);
    }
    ${f.switches}
    ${f.afterSwitches}
  `)(assert, expect, page, homePath, origin, results, engine, width, state, transport, errors, offers)
  assert.deepEqual(offers, ['ru', 'en'], 'Both actual directions reach their retained offer checks')
  assert.equal(checks.length, 9, 'All existing switch and post-switch fatal transport gates remain')
}

async function runJourneys(f, results, engine, width, options) {
  let url, home, selected, routeHandler
  const openedHomes = [], captures = [], visited = [], backs = []
  const suffixes = { selfTest: '/client/tests', reiki: '/academy/principles-of-energywork/learn' }
  const targets = { selfTest: '[data-prelogin-test-picker]', reiki: '[data-energywork-ai-learner]' }
  const homePath = new Function('assert', f.homePath + '; return homePath;')(assert)
  const chooser = { locator(selector) {
    const match = selector.match(/^button\[data-home-free-option="(selfTest|analysis|reiki)"\]$/)
    if (match) return { async click() { selected = match[1] } }
    assert.notEqual(selected, 'analysis'); assert.equal(selector, `a[data-home-free-action="${selected}"]`)
    return { async evaluate() { return { url } }, async click() {
      const locale = home.endsWith('/ru') ? 'ru' : 'en'; url = origin + '/' + locale + suffixes[selected]; visited.push(url)
      if (selected === 'selfTest') await routeHandler({ request: () => ({ method: () => options.privateRequest ? 'POST' : 'GET',
        url: () => origin + (options.privateRequest ? '/api/app/test-plans' : '/api/app/guest/bootstrap') }),
        async fulfill(response) { assert.equal(response.status, options.privateRequest ? 401 : 200) },
        continue: forbidden, fetch: forbidden })
    } }
  } }
  const page = {
    async route(pattern, handler) { assert.equal(pattern, origin + '/api/app/**'); assert.equal(routeHandler, undefined); routeHandler = handler },
    async goto(target, settings) { assert.deepEqual(settings, { waitUntil: 'domcontentloaded' }); home = url = target; openedHomes.push(target) },
    async waitForLoadState(value) { assert.equal(value, 'networkidle') },
    locator(selector) { return selector === '[data-home-free-capture]' ? chooser : { selector } },
    async goBack() { url = home; backs.push(home) },
  }
  const expect = target => ({
    async toHaveURL(value) { assert.equal(target, page); assert.equal(url, value) },
    async toBeVisible() { assert.ok([targets[selected], '[data-home-contact-capture] [data-home-free-capture]'].includes(target.selector)) },
  })
  const analysis = async (target, scope, locale) => {
    assert.equal(target, page); assert.equal(scope, chooser); assert.equal(selected, 'analysis')
    assert.equal(url, origin + (locale === 'en' ? '/' : '/ru')); captures.push(locale)
  }
  const actual = new Function('assert', 'expect', 'origin', 'homePath', 'results', 'verifyHomeAnalysisCapture',
    f.journeys + '; return exerciseFreeJourneys;')(assert, expect, origin, homePath, results, analysis)
  const transport = { assertHealthy() {} }, errors = [], unexpectedEnquiryRequests = []
  await new AsyncFunction('exerciseFreeJourneys', 'page', 'engine', 'width', 'assert', 'transport', 'errors', 'unexpectedEnquiryRequests', f.tail)(
    actual, page, engine, width, assert, transport, errors, unexpectedEnquiryRequests)
  assert.deepEqual(openedHomes, ['/', '/', '/', '/ru', '/ru', '/ru'].map(path => origin + path))
  assert.deepEqual(captures, ['en', 'ru'])
  assert.deepEqual(visited, locales.flatMap(locale => ['selfTest', 'reiki'].map(id => origin + '/' + locale + suffixes[id])))
  assert.deepEqual(backs, ['/', '/', '/ru', '/ru'].map(path => origin + path))
}

async function matrixRun(f, fault = {}) {
  const results = [], calls = [], writes = [], lifecycle = [], logs = []
  const browserTypes = { chromium: Object.freeze({ label: 'synthetic chromium' }), webkit: Object.freeze({ label: 'synthetic webkit' }) }
  let changed = false
  const exercise = async (engine, type, width) => {
    assert.ok(engines.includes(engine)); assert.equal(type, browserTypes[engine]); assert.ok(widths.includes(width))
    calls.push({ engine, width })
    const browser = { async newContext(settings) { assert.deepEqual(settings, { viewport: { width, height: 900 }, serviceWorkers: 'block' }); return {} } }
    const launched = await new AsyncFunction('browserType', 'return ' + f.launch)({ async launch() {
      assert.equal(type, browserTypes[engine]); return browser
    } })
    assert.equal(launched, browser)
    await new AsyncFunction('browser', 'width', 'return await ' + f.viewport)(launched, width)
    const inject = !changed && engine === 'chromium' && width === 320
    await runSwitches(f, results, engine, width, inject ? fault : {})
    await runJourneys(f, results, engine, width, inject ? fault : {})
    if (inject) {
      changed = true
      if (fault.dropSwitch) results.splice(results.findIndex(row => row.firstClickRetained), 1)
      if (fault.dropJourney) results.splice(results.findIndex(row => row.freeJourney), 1)
      // Emit valid rows first: a missing fatal-outcome check cannot hide behind
      // a coincidental count failure in this deliberate case-error control.
      if (fault.caseFailure) throw new Error('Synthetic exercise failure')
    }
  }
  const writeFile = async (path, value) => { lifecycle.push('write'); writes.push({ path, value: JSON.parse(value) }) }
  const app = { kill(signal) { lifecycle.push('kill'); assert.equal(signal, 'SIGTERM') } }
  let error
  try {
    await new AsyncFunction('live', 'origin', 'evidence', 'results', 'app', 'exercise', 'chromium', 'webkit', 'assert',
      'writeFile', 'console', 'spawn', 'fetch', f.outer)(true, origin, evidence, results, app, exercise,
      browserTypes.chromium, browserTypes.webkit, assert, writeFile, { log: message => logs.push(message) }, forbidden, forbidden)
  } catch (caught) { error = caught }
  return { results, calls, writes, lifecycle, logs, error }
}

export async function assertHomeVerifierMatrix(source) {
  const f = fragments(source), nominal = await matrixRun(f)
  assert.equal(nominal.error, undefined, 'The actual fixed matrix must complete under isolated source fixtures')
  assert.deepEqual(sorted(nominal.calls), sorted(expectedCases), 'Every fixed browser/width identity exactly once')
  assert.deepEqual(sorted(nominal.results.filter(row => row.firstClickRetained)), sorted(expectedSwitches), 'All 20 fixed direction identities')
  assert.deepEqual(sorted(nominal.results.filter(row => row.freeJourney)), sorted(expectedJourneys), 'All 60 fixed locale/journey identities')
  for (const [name, fault] of Object.entries({ missingSwitch: { dropSwitch: true }, missingJourney: { dropJourney: true },
    failedCase: { caseFailure: true }, discardedIframe: { discarded: true }, pageError: { pageError: true }, privateRequest: { privateRequest: true } })) {
    const rejected = await matrixRun(f, fault)
    assert.ok(rejected.error, name + ' must remain fatal, not a synthetic successful matrix')
    assert.equal(rejected.logs.length, 0, name + ' must not emit PASS')
    assert.deepEqual(rejected.lifecycle, ['write', 'kill'], name + ' retains the actual outer finally')
    assert.equal(rejected.writes.length, 1)
    assert.equal(rejected.writes[0].path, evidence + '/live-results.json')
  }
  assert.equal(nominal.logs.length, 1)
  assert.deepEqual(nominal.lifecycle, ['write', 'kill'])
  assert.equal(nominal.writes.length, 1)
  assert.equal(nominal.writes[0].path, evidence + '/live-results.json')
  assert.deepEqual(nominal.writes[0].value, { origin, results: nominal.results, fullPlayback: 'Not claimed by this interaction-only test' })
}
