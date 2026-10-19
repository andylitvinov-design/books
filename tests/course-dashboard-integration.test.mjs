import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { nodes, textOf, findButton, findPart, deferred, account, course, courseA, courseB, access, courseView, mount } from './helpers/course-ui-harness.mjs'
import { SUBSCRIPTION_PLANS, normalizeBillingStatus } from '../lib/billing/public-plan.js'
import { COURSE_PRESETS } from '../lib/inner-growth/course-presets.js'
import * as strategy from '../lib/inner-growth/course-strategy.js'

const freeStatus = (enabledPlans = ['start', 'advanced', 'premium']) => normalizeBillingStatus({
  available: true, enabled: true, enabledPlans, provider: 'stripe', plans: SUBSCRIPTION_PLANS, plan: SUBSCRIPTION_PLANS.free,
  entitlement: { active: false, tier: 'free', ...SUBSCRIPTION_PLANS.free },
})
const checkConsent = async h => {
  nodes(h.tree).find(node => node.type === 'input' && node.props.type === 'checkbox').props.onChange({ target: { checked: true } })
  await h.settle()
}
const tiles = tree => nodes(tree).filter(node => typeof node.type === 'function' && node.type.name === 'CourseTile').map(node => node.type(node.props))

test('Cabinet Courses tab always shows started courses before the chosen lesson', async () => {
  const workspace = readFileSync(new URL('../components/app/app-workspace.jsx', import.meta.url), 'utf8')
  assert.match(workspace, /id: 'course', label: locale === 'ru' \? 'Курсы' : 'Courses', href: root \+ '\/course\?view=courses'/)
  const active = course('course-a', 4)
  const h = mount('my-course', {
    search: '?view=courses',
    props: { data: account('owner-a'), locale: 'en' },
    fetcher: () => courseView(active, {
      courses: [active],
      access: { ...access, tier: 'free', activeCourseLimit: 1, activeCourseCount: 1, multiCourseEnabled: false },
    }),
  })
  await h.settle()
  const dashboard = findPart(h.tree, 'MyCoursesDashboard')
  assert.ok(dashboard, 'the navigation destination is the owned-courses overview')
  assert.deepEqual(dashboard.props.courses.map(item => item.id), ['course-a'])
  assert.equal(findPart(h.tree, 'CourseToday'), undefined, 'the lesson must not open without choosing a course')
  assert.equal(h.navigations.length, 0, 'opening Courses must not manufacture a courseId URL')
  dashboard.props.onOpen(active)
  await h.settle()
  assert.equal(findPart(h.tree, 'CourseToday')?.props.courseId, 'course-a')
  assert.match(h.navigations.at(-1), /courseId=course-a/)
  assert.doesNotMatch(h.navigations.at(-1), /view=courses/)
  h.unmount()
})

test('other possible course directions stay visible at the free active-course limit', async () => {
  const current = { ...course('course-a', 4), presetId: 'calm_balance' }
  let newCourseRequests = 0
  const props = {
    courses: [current], locale: 'en',
    membership: { tier: 'free', maxActiveCourses: 1, occupiedCount: 1 },
    canAddCourse: false, canManageCourses: true, multiCourseEnabled: false,
    onOpen() {}, onNew() { newCourseRequests++ }, onClose() {}, onPrimary() {},
  }
  const h = mount('my-courses-dashboard', { props })
  await h.settle()
  const options = nodes(h.tree).filter(node => node.props?.['data-course-option'])
  assert.deepEqual(options.map(option => option.props['data-course-option']), ['business_focus', 'confidence'])
  assert.ok(textOf(h.tree).includes('Focus & Productivity'))
  assert.ok(textOf(h.tree).includes('Confidence & Inner Strength'))
  assert.equal(options.flatMap(nodes).filter(node => node.type === 'button').length, 0,
    'a full account can see other directions but cannot bypass the active-course quota')
  h.render({ ...props, canAddCourse: true }); await h.settle()
  nodes(h.tree).filter(node => node.props?.['data-course-option'])[0].props.children[2].props.onClick()
  assert.equal(newCourseRequests, 1, 'an available option opens the existing catalog flow')
  h.unmount()
})

test('My courses opens the authored dashboard and explicitly selected cards retain the course URL and account', async () => {
  const h = mount('my-course', { enterCourse: true,  props: { data: account('owner-a') }, fetcher: path => courseView(path.includes('course-b') ? courseB : courseA) })
  await h.settle()
  const dashboard = findPart(h.tree, 'MyCoursesDashboard')
  assert.ok(dashboard)
  assert.equal(findPart(h.tree, 'CourseR3Steps'), undefined)
  dashboard.props.onOpen(courseB); await h.settle()
  assert.equal(findPart(h.tree, 'CourseR3Steps').props.state.course.id, 'course-b')
  assert.match(h.navigations.at(-1), /courseId=course-b/)
  assert.equal(h.calls.at(-1).options.headers['X-HH-Account-ID'], 'owner-a')
  const count = h.calls.length
  await dashboard.props.onPrimary(courseA)
  assert.equal(h.calls.length, count, 'a dismissed dashboard cannot issue a later action')
  h.unmount()
})

test('preset cards and personal selection never save before explicit checked consent, including cancellation', async () => {
  for (const presetId of [...COURSE_PRESETS.map(preset => preset.id), null]) {
    const h = mount('my-course', { enterCourse: true,  props: { data: account('owner-a') }, fetcher: (_path, _options, body) => body
      ? courseView({ ...course(body.courseId, presetId ? 2 : 1), presetId })
      : { course: null, courses: [], access: { ...access, activeCourseCount: 0 }, assessments: {} } })
    await h.settle()
    const catalog = findPart(h.tree, 'CoursePresetCatalog')
    const choose = () => presetId ? catalog.props.onPreset(presetId) : catalog.props.onPersonal()
    choose(); await h.settle()
    assert.equal(findButton(h.tree, 'Agree & start').props.disabled, true)
    findButton(h.tree, 'Agree & start').props.onClick(); await h.settle()
    assert.equal(h.calls.filter(call => call.body).length, 0)
    await checkConsent(h)
    findButton(h.tree, 'Not now').props.onClick(); await h.settle()
    assert.equal(h.calls.filter(call => call.body).length, 0)
    choose(); await h.settle()
    assert.equal(findButton(h.tree, 'Agree & start').props.disabled, true)
    await checkConsent(h)
    const confirm = findButton(h.tree, 'Agree & start')
    confirm.props.onClick(); confirm.props.onClick(); await h.settle()
    const writes = h.calls.filter(call => call.body)
    assert.equal(writes.length, 1)
    assert.equal(writes[0].body.presetId || null, presetId)
    assert.equal(writes[0].body.consent, true)
    assert.equal(writes[0].body.newCourse, true)
    assert.match(writes[0].body.courseId, /^[a-f\d-]{36}$/)
    assert.equal(findPart(h.tree, 'CourseR3Steps').props.state.course.id, writes[0].body.courseId)
    h.unmount()
  }
})

test('switching preset requires fresh consent and invalidates callbacks from the dismissed personal setup', async () => {
  const h = mount('my-course', { enterCourse: true,  props: { data: account('owner-a') }, search: '?courseId=course-a', fetcher: (_path, _options, body) => courseView(body ? { ...courseA, stage: 2, revision: 2, presetId: body.presetId } : courseA) })
  await h.settle()
  const oldSteps = findPart(h.tree, 'CourseR3Steps')
  findButton(h.tree, 'Change course direction').props.onClick(); await h.settle()
  const count = h.calls.length
  await assert.rejects(oldSteps.props.onCourseCommand('intake', { concerns: 'outdated' }), /COURSE_SELECTION_CHANGED/)
  assert.equal(h.calls.length, count)
  findPart(h.tree, 'CoursePresetCatalog').props.onPreset('confidence'); await h.settle()
  await checkConsent(h); findButton(h.tree, 'Agree & start').props.onClick(); await h.settle()
  const write = h.calls.find(call => call.body)
  assert.equal(write.body.action, 'select-preset')
  assert.equal(write.body.courseId, 'course-a')
  assert.equal(write.body.expectedRevision, 1)
  assert.equal(write.body.presetId, 'confidence')
  assert.equal(write.body.consent, true)
  assert.match(findPart(h.tree, 'CourseR3Steps').key, /:confidence$/)
  h.unmount()
})

test('close and primary management carry target revision and discard delayed results after account changes', async () => {
  for (const action of ['onClose', 'onPrimary']) {
    const slow = deferred()
    const h = mount('my-course', { enterCourse: true,  props: { data: account('owner-a') }, fetcher: (_path, options, body) => body ? slow.promise : options.headers['X-HH-Account-ID'] === 'owner-a' ? courseView() : courseView(course('owner-b-course'), { courses: [course('owner-b-course')] }) })
    await h.settle()
    const dashboard = findPart(h.tree, 'MyCoursesDashboard')
    const pending = dashboard.props[action](courseB)
    await dashboard.props[action](courseB)
    assert.equal(h.calls.filter(call => call.body).length, 1)
    const write = h.calls.find(call => call.body)
    assert.equal(write.body.action, action === 'onClose' ? 'close' : 'make-primary')
    assert.equal(write.body.courseId, 'course-b')
    assert.equal(write.body.expectedRevision, 1)
    h.render({ data: account('owner-b') }); await h.settle()
    slow.resolve(courseView({ ...courseB, status: 'archived', revision: 2 }))
    await pending; await h.settle()
    assert.equal(findPart(h.tree, 'CourseEntrySelector'), undefined,
      'the new owner’s only saved course resumes without an intermediate selector')
    assert.equal(findPart(h.tree, 'CourseR3Steps')?.props.state.course.id, 'owner-b-course',
      'the new owner resumes their own course, never the previous owner’s pending action')
    assert.equal(h.calls.at(-1).options.headers['X-HH-Account-ID'], 'owner-b')
    h.unmount()
  }
})

test('dashboard counts only authoritative occupied slots, retains paused courses, and preserves downgrade access', async () => {
  for (const locale of ['en', 'ru']) {
    const h = mount('my-courses-dashboard', { props: { locale, courses: [course('active', 4), course('paused', 4, 'paused'), course('archive', 4, 'archived')], membership: { tier: 'free', occupiedCount: 1, maxActiveCourses: 1 }, overLimit: true, canAddCourse: false, onOpen() {} } })
    await h.settle()
    assert.match(textOf(h.tree), /1\s+\/\s+1/)
    assert.equal(tiles(h.tree).length, 2)
    assert.ok(tiles(h.tree).every(tile => !findButton(tile, locale === 'ru' ? 'Продолжить курс' : 'Continue course').props.disabled))
    assert.equal(findButton(h.tree, locale === 'ru' ? 'Начать новый курс' : 'Start another course').props.disabled, true)
    assert.match(textOf(h.tree), locale === 'ru' ? /активные курсы и история сохраняются/ : /active courses and history are preserved/)
    findButton(h.tree, locale === 'ru' ? 'Открыть историю' : 'View completed').props.onClick(); await h.settle()
    assert.match(textOf(h.tree), locale === 'ru' ? /Закрыт досрочно/ : /Closed early/)
    h.unmount()
  }
})

test('closing a course uses a keyboard-dismissable native dialog and cancellation leaves history unchanged', async () => {
  const closed = []
  const h = mount('my-courses-dashboard', { props: { courses: [courseA], canManageCourses: true, membership: { occupiedCount: 1, maxActiveCourses: 1 }, onClose: course => closed.push(course.id) } })
  await h.settle()
  findButton(tiles(h.tree)[0], 'Close course').props.onClick(); await h.settle()
  const dialog = nodes(h.tree).find(node => node.type === 'dialog')
  assert.equal(dialog.props.ref.current.open, true)
  dialog.props.onCancel(); await h.settle()
  assert.deepEqual(closed, [])
  findButton(tiles(h.tree)[0], 'Close course').props.onClick(); await h.settle()
  findButton(h.tree, 'Close and save history').props.onClick(); await h.settle()
  assert.deepEqual(closed, ['course-a'])
  h.unmount()
})

test('each dashboard checkout obeys authoritative per-plan readiness and never claims an optimistic paid entitlement', async () => {
  const checkout = []
  let billing = { status: freeStatus(['advanced']), phase: 'ready', busy: '', startCheckout: tier => { checkout.push(tier); return false } }
  const h = mount('my-courses-dashboard', { props: { courses: [courseA], membership: { tier: 'free', occupiedCount: 1, maxActiveCourses: 1, checkoutConfigured: true } }, extraModules: { './subscription-access': { useSubscription: () => billing } } })
  await h.settle()
  findButton(h.tree, 'Compare membership plans').props.onClick(); await h.settle()
  const plans = () => nodes(h.tree).filter(node => node.type === 'article' && node.props['data-plan-id'])
  for (const plan of plans().filter(plan => plan.props['data-plan-id'] !== 'free')) {
    const button = findButton(plan, 'Choose plan')
    assert.equal(button.props.disabled, plan.props['data-plan-id'] !== 'advanced')
    button.props.onClick()
  }
  assert.deepEqual(checkout, ['advanced'])
  assert.equal(plans().find(plan => plan.props['data-current']).props['data-plan-id'], 'free')
  billing = { ...billing, phase: 'loading' }; h.render(); await h.settle()
  assert.ok(plans().filter(plan => plan.props['data-plan-id'] !== 'free').every(plan => findButton(plan, 'Choose plan').props.disabled))
  assert.match(textOf(h.tree), /60-minute/)
  assert.match(textOf(h.tree), /separate scheduling confirmation/)
  assert.match(textOf(h.tree), /Baseline tests stay free/)
  h.unmount()
})

test('confirmed subscription changes re-read course allowance without writing or trusting a return query', async () => {
  let billing = { phase: 'ready', status: freeStatus() }
  const h = mount('my-course', { enterCourse: true,  props: { data: account('owner-a') }, search: '?billing=success', fetcher: () => courseView(courseA, { access: billing.status.entitlement.tier === 'free' ? { ...access, tier: 'free', activeCourseLimit: 1, activeCourseCount: 1 } : access }), extraModules: { './subscription-access': { useSubscription: () => billing } } })
  await h.settle()
  assert.equal(h.calls.length, 1)
  assert.equal(findPart(h.tree, 'MyCoursesDashboard').props.canAddCourse, false)
  billing = { phase: 'ready', status: { ...billing.status, entitlement: { ...billing.status.entitlement, tier: 'advanced', paidThrough: '2026-11-13T00:00:00Z' } } }
  h.render(); await h.settle()
  assert.equal(h.calls.length, 2)
  assert.ok(h.calls.every(call => !call.body && call.options.headers['X-HH-Account-ID'] === 'owner-a'))
  assert.equal(findPart(h.tree, 'MyCoursesDashboard').props.canAddCourse, true)
  h.unmount()
})

test('dashboard and catalogue retain source visuals while using one subscription ledger and safe selected-course navigation', () => {
  const source = name => readFileSync(new URL('../components/app/' + name + '.jsx', import.meta.url), 'utf8')
  const dashboard = source('my-courses-dashboard'), ui = source('my-course'), r3 = source('course-r3-steps')
  assert.match(dashboard, /styles\.mainCard/)
  assert.match(dashboard, /styles\.axes/)
  assert.match(dashboard, /styles\.historyGrid/)
  assert.match(dashboard, /canStartCheckout\(status,phase,plan.id\)/)
  assert.match(dashboard, /startCheckout\(tier\)/)
  assert.doesNotMatch(dashboard + ui, /course-billing|billing\/checkout|onUnlock|status==='locked'|window\.location\.assign/)
  assert.match(r3, /if \(preset\) return\s+if\(isAntistress && key===ANTISTRESS_REQUIRED_BASELINE_KEY\) return\s+setTestsTouched/)
  assert.match(r3, /preset \? \[\.\.\.preset.testKeys\] : withAntistressRequiredBaseline\(confirmedKeys.length/)
  assert.match(r3, /X-HH-Account-ID/)
  assert.match(r3, /courseId='\+encodeURIComponent\(fresh.course.id\)/)
})


test('fixed packs save exactly their five tests while personal-course selections remain editable, with duplicate-save protection', async () => {
  for (const preset of [...COURSE_PRESETS, null]) {
    const writes = [], errors = []
    const options = strategy.courseRecommendedTests({ focusTags: ['stress'], results: [], locale: 'en' })
    const mockPart = name => ({ __esModule: true, default: Object.assign(() => null, { testName: name }) })
    const current = { ...courseA, stage: 2, focusTags: ['stress'], presetId: preset?.id || null }
    const h = mount('course-r3-steps', {
      props: { stage: 2, locale: 'en', data: account('owner-a'), state: courseView(current), busy: false,
        root: '/en/app', isCourseCurrent: () => true, onError: message => errors.push(message), onState() {},
        onCourseCommand: async (action, body) => { writes.push({ action, body }); return courseView(current) },
      }, fetcher: () => ({}), extraModules: {
        '@/lib/app/client-fetch': { appFetch: async () => ({}) },
        '@/lib/app/course-test-flow': { coursePendingKeys: () => [], startOrResumeCourseTest: async () => ({}) },
        '@/lib/inner-growth/course-strategy': { ...strategy, courseRecommendedTests: () => options },
        './course-completion-review': mockPart('CourseCompletionReview'), './course-focus-picker': mockPart('CourseFocusPicker'),
      },
    })
    await h.settle()
    const checkboxes = () => nodes(h.tree).filter(node => node.type === 'input' && node.props.type === 'checkbox')
    assert.equal(checkboxes().length, 5)
    assert.ok(checkboxes().every(node => node.props.disabled === Boolean(preset)))
    checkboxes()[0].props.onChange(); await h.settle()
    const expected = preset ? preset.testKeys : options.slice(1, 5).map(item => item.key)
    assert.equal(checkboxes().filter(node => node.props.checked).length, expected.length)
    const save = findButton(h.tree, 'Confirm my test list')
    const first = save.props.onClick(), second = save.props.onClick()
    await Promise.all([first, second]); await h.settle()
    assert.equal(writes.length, 1)
    assert.equal(writes[0].action, 'confirm-tests')
    assert.deepEqual([...writes[0].body.testKeys], [...expected])
    assert.equal(h.calls.length, 1)
    assert.equal(h.calls[0].options.headers['X-HH-Account-ID'], 'owner-a')
    assert.equal(h.calls[0].body.replaceActive, false)
    assert.equal(h.calls[0].body.appendActive, true)
    assert.ok(!errors.some(Boolean))
    h.unmount()
  }
})

test('a slow billing-triggered read cannot roll back a course mutation that has already succeeded', async () => {
  let billing = { phase: 'ready', status: freeStatus() }
  const read = deferred(), write = deferred()
  let reads = 0
  const h = mount('my-course', { enterCourse: true,  props: { data: account('owner-a') }, search: '?courseId=course-a', fetcher: (_path, _options, body) => body ? write.promise : ++reads === 1 ? courseView() : read.promise,
    extraModules: { './subscription-access': { useSubscription: () => billing } } })
  await h.settle()
  const steps = findPart(h.tree, 'CourseR3Steps')
  const pending = steps.props.onAct('intake', { focusTags: ['stress'] })
  billing = { ...billing, status: { ...billing.status, entitlement: { ...billing.status.entitlement, tier: 'advanced', paidThrough: '2026-11-13T00:00:00Z' } } }
  h.render(); await h.settle()
  write.resolve(courseView({ ...courseA, stage: 2, revision: 2 })); await pending; await h.settle()
  read.resolve(courseView(courseA)); await h.settle()
  assert.equal(findPart(h.tree, 'CourseR3Steps').props.state.course.revision, 2)
  assert.equal(h.calls.at(-1).options.signal.aborted, true)
  h.unmount()
})


test('lifecycle actions stay disabled until the server enables multi-course storage', async () => {
  const h = mount('my-courses-dashboard', { props: { courses: [courseA, courseB], membership: { occupiedCount: 2, maxActiveCourses: 5 }, canManageCourses: false } })
  await h.settle()
  assert.ok(tiles(h.tree).every(tile => findButton(tile, 'Close course').props.disabled))
  assert.equal(findButton(tiles(h.tree)[1], 'Make main').props.disabled, true)
  h.unmount()
})


test('an archived setup opens its history without presenting editable intake or preset-switch controls', async () => {
  const h = mount('my-course', { enterCourse: true,  props: { data: account('owner-a') }, search: '?courseId=course-a', fetcher: () => courseView(course('course-a', 2, 'archived')) })
  await h.settle()
  assert.equal(findPart(h.tree, 'CourseR3Steps'), undefined)
  assert.equal(findButton(h.tree, 'Change course direction'), undefined)
  assert.ok(nodes(h.tree).some(node => node.props['data-course-history-readonly']))
  assert.match(textOf(h.tree), /read-only/)
  h.unmount()
})

test('active primary course first entry opens Today, with explicit My courses management still reachable',async()=>{
 const active=course('course-a',4)
 const h=mount('my-course', { enterCourse: true, props:{data:account('owner-a')},fetcher:()=>courseView(active)})
 await h.settle()
 assert.equal(findPart(h.tree,'CourseToday').props.courseId,'course-a')
 assert.equal(findPart(h.tree,'MyCoursesDashboard'),undefined)
 assert.equal(nodes(h.tree).filter(n=>n.type==='select').length,0)
 findButton(h.tree,'My courses').props.onClick();await h.settle()
 assert.equal(findPart(h.tree,'CourseToday'),undefined)
 assert.ok(findPart(h.tree,'MyCoursesDashboard'))
 assert.equal(h.calls.filter(x=>x.body).length,0)
 h.unmount()
})

test('Today first entry uses only the server-selected course for free and multiple-course owners', async () => {
  for (const tier of ['free', 'advanced']) {
    const active = course('server-selected', 4)
    const h = mount('my-course', { enterCourse: true,  props: { data: account('owner-a') }, fetcher: () => courseView(active, {
      courses: tier === 'free' ? [active] : [course('other-active', 4), active],
      access: { ...access, tier, activeCourseLimit: tier === 'free' ? 1 : 5, activeCourseCount: tier === 'free' ? 1 : 2 },
    }) })
    await h.settle()
    assert.equal(findPart(h.tree, 'CourseToday').props.courseId, active.id)
    assert.equal(h.calls[0].options.headers['X-HH-Account-ID'], 'owner-a')
    assert.equal(h.calls.filter(call => call.body).length, 0)
    h.unmount()
  }
})

test('no authoritative selected course never infers Today from a multiple-course list', async () => {
  for (const courses of [[], [course('one', 4), course('two', 4)]]) {
    const h = mount('my-course', { enterCourse: true,  props: { data: account('owner-a') }, fetcher: () => courseView(null, { courses }) })
    await h.settle()
    assert.equal(findPart(h.tree, 'CourseToday'), undefined)
    assert.equal(h.calls.filter(call => call.body).length, 0)
    h.unmount()
  }
})

test('explicit selected course cannot be replaced by a different server default', async () => {
  const h = mount('my-course', { enterCourse: true,  props: { data: account('owner-a') }, search: '?courseId=chosen', fetcher: () => courseView(course('different', 4)) })
  await h.settle()
  assert.equal(findPart(h.tree, 'CourseToday'), undefined)
  assert.match(h.calls[0].path, /courseId=chosen/)
  assert.equal(h.navigations.length, 0)
  h.unmount()
})

test('a delayed previous-owner default cannot open Today after the account changes', async () => {
  const slow = deferred()
  const h = mount('my-course', { enterCourse: true,  props: { data: account('owner-a') }, fetcher: (_path, options) =>
    options.headers['X-HH-Account-ID'] === 'owner-a' ? slow.promise : courseView(course('owner-b-selected', 4)) })
  await h.settle()
  h.render({ data: account('owner-b') }); await h.settle()
  slow.resolve(courseView(course('owner-a-selected', 4))); await h.settle()
  assert.equal(findPart(h.tree, 'CourseToday').props.courseId, 'owner-b-selected')
  assert.equal(findPart(h.tree, 'CourseToday').props.accountId, 'owner-b')
  assert.ok(h.navigations.every(url => !url.includes('owner-a-selected')))
  assert.equal(h.calls.filter(call => call.body).length, 0)
  h.unmount()
})
