import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { EventEmitter } from 'node:events'
import ts from 'typescript'
import { antiStressBlueprint } from '../lib/inner-growth/anti-stress-blueprint.js'
import { OPORA_PUBLIC_ENTRY, assertOporaGuestPreviewSnapshot, createOporaGuestPreviewGuard, verifyOporaPublicEntry } from '../scripts/helpers/opora-public-entry-verifier.mjs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const inviteSource = read('components/app/opora-first-week-invite.jsx')
const mutate = (source, from, to) => {
 assert.equal(source.split(from).length - 1, 1, 'Mutation must change one precise source site')
 return source.replace(from, to)
}
const jsx = (type, props) => ({ type, props: props || {} })
function* descendants(node) {
 if (Array.isArray(node)) { for (const item of node) yield* descendants(item) }
 else if (node && typeof node === 'object') { yield node; yield* descendants(node.props.children) }
}
const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props.children) : node == null ? '' : String(node)

// Execute the actual invitation and real authored curriculum. Only visual
// framework wrappers are inert elements; no browser/layout claim is made.
function renderedPreview(locale, source = inviteSource) {
 const compiled = ts.transpileModule(source, { compilerOptions: {
  jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
 } }).outputText
 const module = { exports: {} }
 const load = name => {
  if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx }
  if (name === 'next/link') return 'a'
  if (name === 'next/image') return 'img'
  if (name === 'lucide-react') return { ArrowRight: 'svg', LockKeyhole: 'svg' }
  if (name === '@/lib/inner-growth/anti-stress-blueprint') return { antiStressBlueprint }
  if (name === './opora-first-week-invite.module.css') return {}
  throw new Error('Unexpected invitation dependency: ' + name)
 }
 new Function('require', 'module', 'exports', compiled)(load, module, module.exports)
 let actions = 0
 const tree = module.exports.default({ locale, signedOut: true, onAccept: () => { actions++ } })
 const nodes = [...descendants(tree)], one = filter => {
  const selected = nodes.filter(filter); assert.equal(selected.length, 1); return selected[0]
 }
 const accept = one(n => n.props['data-opora-week-one-accept'] !== undefined)
 const explore = one(n => n.type === 'a')
 return { actions, snapshot: {
  title: text(one(n => n.type === 'h1')), weekCount: String(tree.props['data-opora-week-one-count']),
  days: nodes.filter(n => n.props['data-opora-preview-day'] !== undefined).map(day => ({
   day: String(day.props['data-opora-preview-day']), title: text([...descendants(day)].find(n => n.type === 'strong')),
  })),
  accept: { tag: 'BUTTON', type: accept.props.type, google: accept.props['data-course-google-signin'] !== undefined,
   fastConsent: accept.props['data-opora-fast-consent'] !== undefined, disabled: accept.props.disabled, text: text(accept) },
  explore: { tag: 'A', href: explore.props.href, text: text(explore) },
  privacy: text(one(n => n.type === 'p' && [...descendants(n)].some(child => child.type === 'svg'))),
 } }
}

test('actual EN/RU first-week component matches independent authored expectations without an action', () => {
 for (const locale of ['en', 'ru']) {
  const rendered = renderedPreview(locale)
  assertOporaGuestPreviewSnapshot(rendered.snapshot, locale)
  assert.equal(rendered.actions, 0)
  assert.deepEqual(antiStressBlueprint(locale).days.slice(0, 7).map(day => day.title), OPORA_PUBLIC_ENTRY[locale].days)
  // This is the exact old browser failure, not a generic changed-copy claim.
  assert.throws(() => assert.match(rendered.snapshot.title, locale === 'en' ? /Stress Relief/ : /Антистресс/))
 }
})

test('source-component negatives reject missing days, wrong locale/link, missing OAuth marker and wrong branch', () => {
 const variants = [
  mutate(inviteSource, '.days.slice(0, 7)', '.days.slice(0, 6)'),
  mutate(inviteSource, "const lang = COPY[locale] ? locale : 'en'", "const lang = 'ru'"),
  mutate(inviteSource, 'href={`/${lang}/courses/antistress`}', 'href={`/ru/courses/antistress`}'),
  mutate(inviteSource, "data-course-google-signin={signedOut ? '' : undefined}", 'data-course-google-signin={undefined}'),
  mutate(inviteSource, '<h1 id="opora-week-one-title">{t.title}</h1>', '<h1 id="opora-week-one-title">OPORA Stress Relief</h1>'),
 ]
 for (const source of variants) assert.throws(() => assertOporaGuestPreviewSnapshot(renderedPreview('en', source).snapshot, 'en'))
 const wrongOrder = structuredClone(renderedPreview('en').snapshot)
 wrongOrder.days.reverse()
 assert.throws(() => assertOporaGuestPreviewSnapshot(wrongOrder, 'en'))
 assert.throws(() => assertOporaGuestPreviewSnapshot(renderedPreview('en').snapshot, 'es'))
})

test('an automatic affirmative action is distinguishable from a passive preview', () => {
 const source = mutate(inviteSource, '  const lang = COPY[locale]', '  onAccept()\n  const lang = COPY[locale]')
 assert.equal(renderedPreview('en', source).actions, 1)
 assert.throws(() => assert.equal(renderedPreview('en', source).actions, 0))
})

test('read-only fence preserves existing routes and aborts auth, writes and providers without logging their secrets', async () => {
 const origin = 'http://127.0.0.1:3100'
 for (const [url, method, allowed] of [
  [origin + '/en/app/course?program=stress', 'GET', true],
  [origin + '/api/app/bootstrap', 'GET', true],
  [origin + '/en/courses/antistress', 'HEAD', true],
  [origin + '/api/app/auth/start?secret=never-log', 'GET', false],
  [origin + '/api/app/auth/start', 'POST', false],
  [origin + '/api/app/course', 'POST', false],
  ['https://accounts.google.com/o/oauth2/auth?secret=never-log', 'GET', false],
 ]) {
  const guard = createOporaGuestPreviewGuard(origin), calls = []
  await guard.route({ request: () => ({ url: () => url, method: () => method }),
   fallback: async () => calls.push('fallback'), abort: async reason => calls.push(reason) })
  assert.deepEqual(calls, [allowed ? 'fallback' : 'blockedbyclient'])
  if (allowed) guard.assertUntouched()
  else { assert.throws(() => guard.assertUntouched()); assert.deepEqual(Object.keys(guard.blocked[0]).sort(), ['method', 'sameOrigin']) }
 }
 assert.throws(() => createOporaGuestPreviewGuard('https://holistic-house.com'))
})

test('real routes keep the compact invitation, full programme and original enrollment destination separate', () => {
 const workspace = read('components/app/app-workspace.jsx'), guest = read('components/app/course-guest-landing.jsx')
 const route = read('app/[locale]/courses/antistress/page.tsx'), programme = read('components/public-antistress-landing.tsx')
 assert.match(workspace, /<CourseGuestLanding locale=\{locale\} onStart=\{signin\} busy=\{busy\} stressSignup=\{stressSignup\} compact/)
 assert.match(guest, /if \(compact && stressSignup\) return/)
 assert.match(guest, /<OporaFirstWeekInvite locale=\{locale\} signedOut onAccept=\{onStart\}/)
 assert.match(route, /return <PublicAntistressLanding locale=\{locale\} \/>/)
 assert.match(programme, /data-opora-antistress-landing/)
 assert.match(programme, /const enrollmentPath = "\/" \+ enrollmentLocale \+ "\/app\/course\?program=stress"/)
 assert.match(programme, /<Course14DayOverview locale=\{locale\} programId="stress"[^>]*compact/)
 const verifier = read('scripts/helpers/opora-public-entry-verifier.mjs')
 assert.match(verifier, /await explore\.click\(\)/)
 assert.match(verifier, /await enrollment\.click\(\)/)
 assert.doesNotMatch(verifier, /(?:accept|signin|consent)\.click\(/)
 assert.match(verifier, /toHaveCount\(14\)/)
 assert.match(verifier, /toHaveCount\(7\)/)
})

// Execute the complete real helper with an eventful, inert page lifecycle.
// Invitation content comes from the actual component above; programme arrays
// come from its authored blueprint. Geometry is a passing synthetic value:
// these tests establish lifecycle/guard behavior, NOT browser acceptance.
function lifecycleFixture(options = {}) {
 const origin = 'http://127.0.0.1:3100', context = new EventEmitter(), pages = [], screenshots = [], requests = [], journey = []
 const routes = new Set(), snapshots = new Map()
 context.route = async (_pattern, handler) => { routes.add(handler) }
 context.unroute = async (_pattern, handler) => {
  await options.onUnroute?.({ context, pages, requests })
  if (options.unrouteError) throw options.unrouteError
  routes.delete(handler)
 }
 context.dispatch = async (url, method = 'GET', behavior = {}) => {
  const record = { url, method, aborted: false, forwarded: false }; requests.push(record)
  const handler = [...routes].at(-1)
  if (!handler) { record.forwarded = true; return }
  await handler({ request: () => ({ url: () => url, method: () => method }),
   abort: async () => { record.aborted = true; if (behavior.abortError) throw behavior.abortError },
   fallback: async () => { if (behavior.fallback) await behavior.fallback(); record.forwarded = true },
  })
 }
 const createPage = (opener = null) => {
  const page = new EventEmitter()
  Object.assign(page, { locale: 'en', phase: 'blank', currentUrl: 'about:blank', closed: false, viewports: [],
   context: () => context, opener: async () => opener, isClosed: () => page.closed,
   viewportSize: () => page.viewports.at(-1) || null,
   setViewportSize: async viewport => { page.viewports.push({ ...viewport }) },
   goto: async url => {
    assert.ok(routes.size, 'Fence must exist before owned navigation')
    await context.dispatch(url)
    if (options.primaryError) throw options.primaryError
    page.currentUrl = url; page.locale = new URL(url).pathname.split('/')[1]; page.phase = 'invite'
    journey.push(page.locale + ':entry')
   },
   evaluate: async () => true,
   close: async () => {
    assert.ok(routes.size, 'Owned pages close under the active fence')
    await options.onClose?.({ page, context, pages, createPage })
    if (options.closeError && !opener) throw options.closeError
    page.closed = true
   },
  })
  const locator = (kind, value) => {
   const t = OPORA_PUBLIC_ENTRY[page.locale]
   if (!snapshots.has(page.locale)) snapshots.set(page.locale, renderedPreview(page.locale).snapshot)
   const snapshot = snapshots.get(page.locale)
   const exists = () => {
    if (['landing', 'preview', 'previewDays', 'previewTitles', 'accept', 'privacy', 'explore'].includes(kind)) return page.phase === 'invite'
    if (['programme', 'enrollment', 'overview', 'phases', 'skills', 'skillSummary', 'detailed', 'daySummary', 'days', 'questionnaires', 'card', 'cardText'].includes(kind)) return page.phase === 'programme'
    if (kind === 'heading') return value === (page.phase === 'invite' ? t.title : t.programmeTitle)
    return false
   }
   const result = { kind, value, exists,
    first: () => result,
    locator: selector => {
     if (selector === 'summary') return locator(kind === 'detailed' ? 'daySummary' : 'skillSummary')
     return select(selector)
    },
    getByRole: (role, settings = {}) => locator(role === 'heading' ? 'heading' : role === 'button' ? 'accept' : 'explore', settings.name),
    getByText: text => locator(kind === 'card' ? 'cardText' : 'privacy', text),
    click: async () => {
     assert.ok(exists(), 'Only a present node may be activated')
     if (kind === 'explore') {
      page.phase = 'programme'; page.currentUrl = origin + '/' + page.locale + '/courses/antistress'
      await context.dispatch(page.currentUrl); journey.push(page.locale + ':programme')
     } else if (kind === 'enrollment') {
      page.phase = 'invite'; page.currentUrl = origin + '/' + page.locale + '/app/course?program=stress'
      await context.dispatch(page.currentUrl); journey.push(page.locale + ':back')
     } else if (kind === 'skillSummary') page.skillOpen = true
     else if (kind === 'daySummary') page.daysOpen = true
     else assert.fail('No OAuth, enrolment, test or unrelated control may be clicked')
    },
    evaluate: async () => { assert.equal(kind, 'preview'); return snapshot },
    evaluateAll: async () => {
     if (kind === 'days') return antiStressBlueprint(page.locale).days.map(day => String(day.day))
     assert.equal(kind, 'questionnaires')
     return antiStressBlueprint(page.locale).tests.map(test => test.key)
    },
    count: () => ['previewDays', 'previewTitles', 'phases', 'skills'].includes(kind) ? 7 : kind === 'days' ? 14 : kind === 'questionnaires' ? 3 : 1,
    text: () => kind === 'previewTitles' ? snapshot.days.map(day => day.title) : kind === 'privacy' ? snapshot.privacy : kind === 'accept' ? snapshot.accept.text : value,
    attribute: name => name === 'href' ? kind === 'explore' ? snapshot.explore.href : '/' + page.locale + '/app/course?program=stress' :
     name === 'open' && (kind === 'detailed' ? page.daysOpen : page.skillOpen) ? '' : null,
   }
   return result
  }
  const selectors = {
   '[data-opora-guest-landing]': 'landing', '[data-opora-first-week-intro]': 'preview', '[data-opora-preview-day]': 'previewDays',
   '[data-opora-preview-day] strong': 'previewTitles', 'button[data-opora-week-one-accept][data-course-google-signin]': 'accept',
   '[data-opora-antistress-landing]': 'programme', 'a[data-antistress-start]': 'enrollment',
   '[data-course-before-signup="guest"]': 'overview', '[data-course-phase]': 'phases', '[data-course-skill-accordion]': 'skills',
   '[data-course-14-day-list]': 'detailed', '[data-course-day]': 'days', '[data-antistress-test]': 'questionnaires',
  }
  const select = selector => {
   if (/^\[data-antistress-test="[a-z0-9-]+"\]$/.test(selector)) return locator('card', selector)
   assert.ok(selectors[selector], 'Unexpected helper selector: ' + selector)
   return locator(selectors[selector])
  }
  page.locator = select
  pages.push(page)
  context.emit('page', page)
  if (opener) opener.emit('popup', page)
  return page
 }
 context.newPage = async () => createPage()
 const caller = { context: () => context, viewportSize: () => ({ width: 375, height: 812 }),
  close: async () => assert.fail('Caller ownership must be preserved'), setViewportSize: async () => assert.fail('Caller viewport must not change') }
 const expect = target => ({
  toHaveURL: async expected => assert.equal(target.currentUrl, expected),
  toBeVisible: async () => assert.ok(target.exists(), 'Expected rendered node ' + target.kind),
  toHaveCount: async count => assert.equal(target.count(), count),
  toHaveText: async value => assert.deepEqual(target.text(), value),
  toBeEnabled: async () => assert.equal(target.kind, 'accept'),
  toHaveAttribute: async (name, value) => assert.equal(target.attribute(name), value),
 })
 return { origin, caller, context, pages, routes, requests, screenshots, journey, createPage,
  run: (verify = verifyOporaPublicEntry) => verify(caller, expect, { origin, output: '/not-written', screenshotEvidence: async target => {
   assert.notEqual(target, caller); assert.ok(pages.includes(target)); screenshots.push(target)
  } }),
 }
}

test('complete actual helper owns its page, copies viewport, follows both native journeys and removes the fence', async () => {
 const fixture = lifecycleFixture()
 await fixture.run()
 assert.deepEqual(fixture.journey, ['en:entry', 'en:programme', 'en:back', 'ru:entry', 'ru:programme', 'ru:back'])
 assert.deepEqual(fixture.pages[0].viewports[0], { width: 375, height: 812 })
 assert.equal(fixture.screenshots.length, 4)
 assert.ok(fixture.pages.every(page => page.isClosed()))
 assert.equal(fixture.routes.size, 0)
 assert.equal(fixture.context.listenerCount('page'), 0)
 assert.equal(fixture.pages[0].listenerCount('pageerror'), 0)
 assert.equal(fixture.pages[0].listenerCount('popup'), 0)
 assert.ok(fixture.requests.every(request => request.method === 'GET' && request.forwarded))
})

test('late auth, course writes and provider requests during close or unroute fail closed', async () => {
 for (const phase of ['onClose', 'onUnroute']) for (const [path, method] of [
  ['/api/app/auth/start', 'POST'], ['/api/app/course', 'POST'], ['https://accounts.google.com/o/oauth2/auth', 'GET'],
 ]) {
  const fixture = lifecycleFixture({ [phase]: async ({ context }) => {
   await context.dispatch(path.startsWith('/') ? 'http://127.0.0.1:3100' + path : path, method)
  } })
  await assert.rejects(fixture.run(), /must not attempt authentication, writes or provider requests/)
  const last = fixture.requests.at(-1)
  assert.equal(last.aborted, true); assert.equal(last.forwarded, false)
  assert.ok(fixture.pages.every(page => page.isClosed()))
  assert.equal(fixture.routes.size, 0)
 }
})

test('owned page and popup errors, including unroute-time errors, cannot pass', async () => {
 for (const phase of ['onClose', 'onUnroute']) {
  const fixture = lifecycleFixture({ [phase]: async ({ pages }) => { pages[0].emit('pageerror', new Error('synthetic page error')) } })
  await assert.rejects(fixture.run(), /must not raise page errors/)
 }
 let child
 const fixture = lifecycleFixture({ onClose: async ({ page, createPage }) => {
  if (!child) { child = createPage(page); child.emit('pageerror', new Error('synthetic popup error')) }
 } })
 await assert.rejects(fixture.run(), /must not raise page errors/)
 assert.equal(child.isClosed(), true)
})

test('children born during close are owned and closed while unrelated context pages remain untouched', async () => {
 let child, unrelated
 const fixture = lifecycleFixture({ onClose: async ({ page, createPage }) => {
  if (!child) { child = createPage(page); unrelated = createPage() }
 } })
 await fixture.run()
 assert.equal(child.isClosed(), true)
 assert.equal(unrelated.isClosed(), false)
 assert.equal(unrelated.listenerCount('pageerror'), 0)
 assert.equal(fixture.routes.size, 0)
})

test('delayed route failures are drained and primary failures survive throwing cleanup', async () => {
 const delayed = lifecycleFixture({ onUnroute: ({ context }) => {
  void context.dispatch('http://127.0.0.1:3100/api/app/bootstrap', 'GET', {
   fallback: () => new Promise((_resolve, reject) => queueMicrotask(() => reject(new Error('delayed synthetic handler error')))),
  })
 } })
 await assert.rejects(delayed.run(), /request-fence handlers must finish without errors/)
 const primary = new Error('original synthetic assertion'), cleanup = new Error('synthetic close failure')
 const fixture = lifecycleFixture({ primaryError: primary, closeError: cleanup })
 await assert.rejects(fixture.run(), error => error === primary)
 assert.equal(fixture.pages[0].isClosed(), false)
 assert.equal(fixture.routes.size, 1, 'A live owned page retains the fence')
 await fixture.context.dispatch('http://127.0.0.1:3100/api/app/auth/start', 'POST')
 assert.equal(fixture.requests.at(-1).aborted, true)
 assert.equal(fixture.requests.at(-1).forwarded, false)
 const throwingRemoval = lifecycleFixture({ unrouteError: cleanup })
 await assert.rejects(throwingRemoval.run(), error => error === cleanup)
 assert.ok(throwingRemoval.pages.every(page => page.isClosed()))
})

test('a guard-leak counterfactual fails the complete helper lifecycle oracle', async () => {
 const source = read('scripts/helpers/opora-public-entry-verifier.mjs')
 const leaked = mutate(source, 'await until(() => context.unroute(\'**/*\', guard.route), deadline, \'fence removal\'); routeInstalled = false', 'routeInstalled = false /* synthetic leaked handler */')
 const module = await import('data:text/javascript,' + encodeURIComponent(leaked))
 const fixture = lifecycleFixture()
 await fixture.run(module.verifyOporaPublicEntry)
 assert.equal(fixture.routes.size, 1)
 assert.throws(() => assert.equal(fixture.routes.size, 0, 'Successful preview must release its fence'))
})

// Reviewer reproductions retain the original event order: the grandchild is
// observed before the child's delayed opener settles, and its popup event is
// delivered before the child has an owned-page popup listener.
function earlyGrandchildFixture({ earlyError = false, pendingRequest = null } = {}) {
 let child, grandchild
 const fixture = lifecycleFixture({ onClose: async ({ page, context, pages }) => {
  if (child) return
  let resolveOpener
  child = new EventEmitter()
  Object.assign(child, { closed: false, opener: () => new Promise(resolve => { resolveOpener = resolve }), isClosed: () => child.closed,
   close: async () => { assert.ok(fixture.routes.size); child.closed = true } })
  grandchild = new EventEmitter()
  Object.assign(grandchild, { closed: false, opener: async () => child, isClosed: () => grandchild.closed,
   close: async () => { assert.ok(fixture.routes.size); grandchild.closed = true } })
  pages.push(child, grandchild)
  context.emit('page', child)
  context.emit('page', grandchild)
  child.emit('popup', grandchild)
  if (earlyError) grandchild.emit('pageerror', new Error('unadopted grandchild error'))
  await Promise.resolve()
  if (pendingRequest) await context.dispatch(...pendingRequest)
  resolveOpener(page)
  await Promise.resolve()
  page.emit('popup', child)
 } })
 return { fixture, descendants: () => [child, grandchild] }
}

test('reviewer early-grandchild probe closes the full graph and preserves buffered errors', async () => {
 for (const earlyError of [false, true]) {
  const { fixture, descendants } = earlyGrandchildFixture({ earlyError })
  if (earlyError) await assert.rejects(fixture.run(), /must not raise page errors/)
  else await fixture.run()
  assert.ok(descendants().every(page => page.isClosed()), 'Neither child nor early grandchild may survive')
  assert.equal(fixture.routes.size, 0)
  assert.equal(fixture.context.listenerCount('page'), 0)
 }
})

test('auth and provider requests remain blocked while ancestry is unresolved', async () => {
 for (const pendingRequest of [
  ['http://127.0.0.1:3100/api/app/auth/start', 'POST'],
  ['https://accounts.google.com/o/oauth2/auth', 'GET'],
 ]) {
  const { fixture, descendants } = earlyGrandchildFixture({ pendingRequest })
  await assert.rejects(fixture.run(), /must not attempt authentication, writes or provider requests/)
  assert.equal(fixture.requests.at(-1).aborted, true)
  assert.equal(fixture.requests.at(-1).forwarded, false)
  assert.ok(descendants().every(page => page.isClosed()))
 }
})

test('reviewer unroute-child probe restores the fence, closes the child and refuses unstable success', async () => {
 let child
 const fixture = lifecycleFixture({ onUnroute: async ({ pages }) => { child = fixture.createPage(pages[0]) } })
 await assert.rejects(fixture.run(), /fence removal was not quiescent; request fence retained/)
 assert.equal(child.isClosed(), true)
 assert.equal(fixture.routes.size, 1)
 await fixture.context.dispatch('http://127.0.0.1:3100/api/app/auth/start', 'POST')
 assert.equal(fixture.requests.at(-1).aborted, true)
 assert.equal(fixture.requests.at(-1).forwarded, false)
})

test('bounded observed-page and close-operation caps reject without releasing the fence', async () => {
 for (const [count, message] of [[33, /observed-page cap/], [17, /close-operation cap/]]) {
  let created = false
  const fixture = lifecycleFixture({ onClose: async ({ page, context, pages }) => {
   if (created) return
   created = true
   for (let i = 0; i < count; i++) {
    const child = new EventEmitter()
    Object.assign(child, { closed: false, opener: async () => page, isClosed: () => child.closed, close: async () => { child.closed = true } })
    pages.push(child); context.emit('page', child); page.emit('popup', child)
   }
  } })
  await assert.rejects(fixture.run(), message)
  assert.equal(fixture.routes.size, 1)
  assert.ok(fixture.pages.some(page => !page.isClosed()))
  await fixture.context.dispatch('http://127.0.0.1:3100/api/app/course', 'POST')
  assert.equal(fixture.requests.at(-1).aborted, true)
  assert.equal(fixture.requests.at(-1).forwarded, false)
 }
})

test('incomplete ancestry times out as a bounded failure with the fence retained', async () => {
 let child, resolveOpener
 const fixture = lifecycleFixture({ onClose: async ({ page, context, pages }) => {
  if (child) return
  child = new EventEmitter()
  Object.assign(child, { closed: false, opener: () => new Promise(resolve => { resolveOpener = resolve }), isClosed: () => child.closed,
   close: async () => { child.closed = true } })
  pages.push(child); context.emit('page', child)
 } })
 await assert.rejects(fixture.run(), /closure deadline reached during ancestry drain; request fence retained/)
 assert.equal(child.isClosed(), false, 'Unknown ancestry does not authorize closing a page')
 assert.equal(fixture.routes.size, 1)
 await fixture.context.dispatch('https://accounts.google.com/o/oauth2/auth', 'GET')
 assert.equal(fixture.requests.at(-1).aborted, true)
 assert.equal(fixture.requests.at(-1).forwarded, false)
 resolveOpener(fixture.pages[0])
 await Promise.resolve()
})

test('failed ancestry never substitutes for a primary assertion or permits guard removal', async () => {
 const primary = new Error('primary source assertion')
 let child
 const fixture = lifecycleFixture({ primaryError: primary, onClose: async ({ context, pages }) => {
  if (child) return
  child = new EventEmitter()
  Object.assign(child, { opener: async () => { throw new Error('synthetic opener failure') }, isClosed: () => false,
   close: async () => assert.fail('Unproven ownership must not be closed') })
  pages.push(child); context.emit('page', child)
 } })
 await assert.rejects(fixture.run(), error => error === primary)
 assert.equal(fixture.routes.size, 1)
 await fixture.context.dispatch('http://127.0.0.1:3100/api/app/auth/start', 'POST')
 assert.equal(fixture.requests.at(-1).aborted, true)
 assert.equal(fixture.requests.at(-1).forwarded, false)
})

test('removing retained graph reconciliation reproduces the original grandchild escape', async () => {
 const source = read('scripts/helpers/opora-public-entry-verifier.mjs')
 const changed = mutate(source,
  'if (!owned.has(target) && [...openers].some(opener => owned.has(opener))) changed = adopt(target) || changed',
  'if (false) changed = adopt(target) || changed /* synthetic lost retained edge */')
 const module = await import('data:text/javascript,' + encodeURIComponent(changed))
 const { fixture, descendants } = earlyGrandchildFixture({ earlyError: true })
 await fixture.run(module.verifyOporaPublicEntry)
 assert.ok(descendants().some(page => !page.isClosed()))
 assert.equal(fixture.routes.size, 0)
 assert.throws(() => assert.ok(descendants().every(page => page.isClosed())))
})

test('a pending unroute-time handler cannot create an unfenced child or forward its auth', async () => {
 let child
 const fixture = lifecycleFixture({ onUnroute: ({ context, pages }) => {
  void context.dispatch('http://127.0.0.1:3100/api/app/bootstrap', 'GET', { fallback: async () => {
   await new Promise(resolve => setTimeout(resolve, 0))
   child = fixture.createPage(pages[0])
   await context.dispatch('http://127.0.0.1:3100/api/app/auth/start', 'POST')
  } })
 } })
 await assert.rejects(fixture.run(), /must not attempt authentication, writes or provider requests/)
 assert.equal(child.isClosed(), true)
 assert.equal(fixture.routes.size, 1)
 assert.equal(fixture.requests.at(-1).aborted, true)
 assert.equal(fixture.requests.at(-1).forwarded, false)
})

test('a broken page factory cannot transfer caller ownership or alter its viewport', async () => {
 const fixture = lifecycleFixture()
 fixture.context.newPage = async () => fixture.caller
 await assert.rejects(fixture.run(), /must not reuse the caller page/)
 assert.equal(fixture.pages.length, 0)
 assert.equal(fixture.routes.size, 0)
})
