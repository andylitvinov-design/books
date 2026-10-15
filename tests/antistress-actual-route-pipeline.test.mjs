import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { repositoryHarness, router, presets, lessons, methods, labs, moduleActivities, outcomes, slideSequence, dayOne, mount, nodes, textOf,
  findPart, findButton, clone } from './helpers/route-pipeline-harness.mjs'

const NAV1 = 'opora-nav-1.3-20261014'
const CYCLE_DEFAULTS = { length: 'standard', imagery: 'optional', checkinFrequency: 'daily' }
const snapshots = JSON.parse(readFileSync(new URL('./fixtures/antistress-nav1-lessons.json', import.meta.url), 'utf8'))
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const observedSlideAcknowledgements = new WeakMap()
const renderedSlide = player => nodes(player.tree).find(node => node.props?.['data-slide-scroller'])
function observeSlide(player, visited) {
  const frame = renderedSlide(player)
  assert.ok(frame, 'The actual Player renders a slide frame')
  const key = frame.props['data-slide-key']
  assert.equal(typeof key, 'string', 'The actual rendered screen exposes its authored slide key')
  if (!visited.some(slide => slide.key === key)) visited.push({ key, kind: frame.props['data-slide-kind'] })
}
function assertSlideAcknowledgement(data, submitted, visited) {
  const firstStressDay = Boolean(data.lesson.antiStress && !data.lesson.antiStress.routePlan &&
    data.cycle.day === 1 && data.programme?.id === 'stress')
  const expected = firstStressDay ? dayOne.DAY_ONE_SLIDES : slideSequence.buildCourseSlides(data.lesson)
  assert.deepEqual(visited, expected.map(({ key, kind }) => ({ key, kind })),
    'Actual rendered key/kind order matches the authored sequence, including quick/localized variants')
  assert.deepEqual(submitted.visitedSlideKeys, visited.map(slide => slide.key),
    'The emitted ACK contains exactly the screens actually reached by real navigation')
  observedSlideAcknowledgements.set(data, clone(submitted.visitedSlideKeys))
}
async function walkActualSlides(data, locale = 'en') {
  let submitted = null
  const visited = []
  const player = mount('course-slide-player', { data, locale, onClose() {},
    onCheckin() { assert.fail('A slide-only traversal must not save an optional check-in') },
    onSession(body) { assert.equal(submitted, null); submitted = clone(body); return true },
  })
  for (let step = 0; step < 50 && !submitted; step++) {
    observeSlide(player, visited)
    const next = nodes(player.tree).find(node => node.type === 'button' && node.props.className === 'primary')
    assert.ok(next, 'The actual screen offers its continuation/save action')
    assert.equal(Boolean(next.props.disabled), false)
    next.props.onClick(); await player.settle()
  }
  assert.ok(submitted, 'Only a complete actual traversal can produce a new save payload')
  assertSlideAcknowledgement(data, submitted, visited)
  player.unmount()
  return { submitted, visited }
}
async function savedInput(data, extra = {}) {
  // Validator fixtures use ACKs obtained from genuine Player navigation. A
  // historical operation retry deliberately has no ACK and must stay idempotent.
  if (!data.currentSession && !observedSlideAcknowledgements.has(data)) await walkActualSlides(data)
  return {
    operationId: '00000000-0000-4000-8000-000000000999', day: data.cycle.day, lessonId: data.lesson.id,
    feedback: 'skip', beforeNow: null, afterNow: null,
    ...(!data.currentSession ? { visitedSlideKeys: clone(observedSlideAcknowledgements.get(data)) } : {}),
    ...extra,
  }
}

function assertCanonicalPart(tree, route, part) {
  const wrappers = nodes(tree).filter(node => node.type?.testName === 'OporaModuleActivity')
  const sections = nodes(tree).filter(node => node.props?.['data-opora-practical-part'])
  assert.equal(wrappers.length, route ? 1 : 0, 'Exactly one actual canonical activity wraps each routed slide; AS2 stays direct')
  assert.equal(sections.length, route ? 1 : 0, 'The actual canonical JSX section must render, not a stub')
  if (route) {
    assert.equal(sections[0].props['data-opora-practical-part'], part)
    assert.equal(wrappers[0].props.part, part)
    const field = part === 'method' ? 'methodActivity' : 'practiceLab'
    assert.deepEqual(clone(wrappers[0].props.routePlan[field]), clone(route[field]),
      'The canonical presentation consumes the authoritative route descriptor')
  }
}

async function playActualLesson(data, locale, { choose = true } = {}) {
  let submitted = null
  const visited = []
  const player = mount('course-slide-player', { data, locale, onClose() {},
    onCheckin() { assert.fail('Optional check-in should not be saved without a rating') },
    onSession(body) { assert.equal(submitted, null); submitted = clone(body); return true },
  })
  const seen = { method: 0, main: 0, reflect: 0, dayOne: 0 }, chosen = {}
  const route = data.lesson.antiStress?.routePlan
  for (let step = 0; step < 40 && !submitted; step++) {
    observeSlide(player, visited)
    if (findPart(player.tree, 'DayOneExercise')) seen.dayOne++
    const method = findPart(player.tree, 'AntiStressMethodActivity')
    if (method) {
      assertCanonicalPart(player.tree, route, 'method')
      seen.method++
      const expected = route?.methodActivity || methods.antiStressMethodActivity(data.cycle.day, locale)
      assert.ok(expected, 'Every rendered method comes from actual lesson metadata or the existing AS2 catalog')
      if (route) assert.deepEqual(clone(method.props.activity), clone(expected), 'Player passes the route method, not the same-numbered AS2 method')
      const control = mount('anti-stress-method-activity', method.props)
      const section = nodes(control.tree).find(n => n.props?.['data-opora-method-day'])
      assert.ok(section, 'The actual method component renders its choices')
      assert.equal(section.props['data-opora-method'], expected.kind)
      assert.ok(textOf(control.tree).includes(expected.prompt))
      // Choices contain their displayed 1-based index, so match the actual label.
      for (const choice of expected.choices) assert.ok(nodes(control.tree).some(n =>
        n.type === 'button' && textOf(n).includes(choice.label)), 'Missing rendered method choice: ' + choice.label)
      if (choose) {
        const choice = expected.choices[0]
        nodes(control.tree).find(n => n.type === 'button' && textOf(n).includes(choice.label)).props.onClick()
        chosen.method = choice.value
      }
      control.unmount(); await player.settle()
    }
    const lab = findPart(player.tree, 'AntiStressPracticeLab')
    if (lab) {
      assertCanonicalPart(player.tree, route, lab.props.part)
      seen[lab.props.part]++
      const expected = route?.practiceLab || labs.antiStressLabFor(data.cycle.day, locale)
      assert.ok(expected)
      if (route) assert.deepEqual(clone(lab.props.plan), clone(expected), 'Player passes the route lab, not the same-numbered AS2 lab')
      const card = expected[lab.props.part]
      let control = mount('anti-stress-practice-lab', lab.props)
      const section = nodes(control.tree).find(n => n.props?.['data-opora-practical-lab'])
      assert.ok(section, 'The actual practice lab renders')
      assert.equal(section.props['data-opora-lab-method'], card.method)
      assert.ok(textOf(control.tree).includes(card.instruction))
      for (const option of card.options) assert.ok(findButton(control.tree, option.label), 'Missing rendered lab option: ' + option.label)
      assert.ok(textOf(control.tree).includes(card.steps[0]))
      if (card.steps.length > 1) {
        findButton(control.tree, locale === 'ru' ? 'Следующий шаг' : 'Next step').props.onClick()
        await control.settle()
        assert.equal(nodes(control.tree).find(n => n.props?.['data-practical-step']).props['data-practical-step'], 2)
        assert.ok(textOf(control.tree).includes(card.steps[1]))
      }
      if (card.format === 'worksheet') {
        assert.ok(nodes(control.tree).find(n => n.props?.['data-route-practice-worksheet']))
        const fields = nodes(control.tree).filter(n => n.type === 'input' && n.props.type === 'text')
        assert.equal(fields.length, card.fields.length)
        for (const label of card.fields) assert.ok(textOf(control.tree).includes(label))
        fields[0].props.onChange({ target: { value: lab.props.part === 'main' ? 'Synthetic unsaved draft' : 'Synthetic chosen note' } })
        await player.settle()
        control.render(findPart(player.tree, 'AntiStressPracticeLab').props); await control.settle()
        const expectedDraft = lab.props.part === 'main' ? 'Synthetic unsaved draft' : 'Synthetic chosen note'
        assert.equal(nodes(control.tree).find(n => n.type === 'input' && n.props.type === 'text').props.value, expectedDraft)
        // Actual slide navigation unmounts this child. Retained in-Player props
        // must hydrate a fresh lab instance, without submitting the draft.
        nodes(player.tree).find(n => n.type === 'button' && n.props.className === 'primary').props.onClick()
        await player.settle()
        nodes(player.tree).find(n => n.type === 'button' && n.props.className === 'back').props.onClick()
        await player.settle()
        const retained = findPart(player.tree, 'AntiStressPracticeLab')
        assert.equal(retained.props.part, lab.props.part)
        control.unmount(); control = mount('anti-stress-practice-lab', retained.props)
        assert.equal(nodes(control.tree).find(n => n.type === 'input' && n.props.type === 'text').props.value, expectedDraft,
          'A worksheet draft survives next/back without being submitted')
        if (lab.props.part === 'reflect') {
          const keep = findButton(control.tree, locale === 'ru' ? 'Добавить в мой личный дневник' : 'Add to my private journal')
          assert.equal(keep.props.disabled, false)
          keep.props.onClick()
          chosen.note = card.fields[0] + ': Synthetic chosen note'
        }
      }
      if (choose) {
        findButton(control.tree, card.options[0].label).props.onClick()
        chosen[lab.props.part] = card.options[0].id
        if (lab.props.part === 'main') {
          findButton(control.tree, locale === 'ru' ? 'Попробовал(а)' : 'Tried').props.onClick()
          chosen.attempt = 'tried'
        }
      }
      control.unmount(); await player.settle()
    }
    const next = nodes(player.tree).find(n => n.type === 'button' && n.props.className === 'primary')
    assert.ok(next, 'Actual player offers a continuation/save control')
    assert.equal(Boolean(next.props.disabled), false)
    next.props.onClick(); await player.settle()
  }
  assert.ok(submitted, 'The actual player reaches its onSession callback')
  assertSlideAcknowledgement(data, submitted, visited)
  assert.equal(submitted.lessonId, data.lesson.id)
  assert.equal(submitted.day, data.cycle.day)
  assert.equal(Object.hasOwn(submitted, 'routePlan'), false, 'Client never submits a trusted plan')
  assert.equal(Object.hasOwn(submitted, 'routeDrafts'), false, 'Uncommitted worksheet drafts never enter the session payload')
  assert.equal(Object.hasOwn(submitted, 'moduleActivityChoice'), false, 'The canonical Player sends only route-scoped interactions')
  const receipt = findPart(player.tree, 'CourseLessonResult')
  assert.ok(receipt, 'The actual player renders a completion receipt')
  if (route) {
    const summary = outcomes.courseSingleLessonOutcome(receipt.props)
    assert.equal(summary.mainPractice, route.practiceLab.main.title)
    assert.equal(summary.anchor, route.practiceLab.main.options.find(o => o.id === chosen.main)?.label || null)
    assert.equal(summary.anotherChoice, route.practiceLab.reflect.options.find(o => o.id === chosen.reflect)?.label || null)
    const renderedReceipt = mount('course-lesson-result', receipt.props)
    for (const label of [summary.mainPractice, summary.anchor, summary.anotherChoice].filter(Boolean))
      assert.ok(textOf(renderedReceipt.tree).includes(label), 'Receipt displays the selected route label: ' + label)
    renderedReceipt.unmount()
  }
  player.unmount()
  return { submitted, seen, chosen }
}

for (const moduleId of router.ANTISTRESS_ACTIVE_MODULE_IDS) for (const locale of ['en', 'ru']) {
  for (let day = 1; day <= 14; day++) {
    test(`actual NAV2 ${moduleId} ${locale} day ${day}: create → repository lesson → player choices → session storage`, async () => {
      const h = repositoryHarness(), created = await h.create(moduleId)
      assert.deepEqual(created.preferences, { ...CYCLE_DEFAULTS, oporaModuleId: moduleId, oporaModuleRouter: router.ANTISTRESS_ROUTER_VERSION })
      assert.equal(created.content_version, moduleId === 'AS2' ? lessons.COURSE_ANTISTRESS_OUTCOME_V3 : lessons.COURSE_CONTENT_V4)
      assert.equal(h.writes.length, 2, 'Real factory writes only the new cycle and target')
      h.seedDay(day)
      const before = JSON.stringify(h.cycle), readWrites = h.writes.length
      const data = await h.read(locale)
      assert.equal(h.writes.length, readWrites, 'Reading generated lessons does not write')
      assert.equal(JSON.stringify(h.cycle), before, 'Read does not relabel stored preferences')
      assert.equal(data.cycle.day, day); assert.equal(data.cycle.moduleId, moduleId)
      assert.equal(data.programme.id, 'stress')
      assert.equal(data.roadmap.length, 14)
      assert.equal(data.roadmap.find(row => row.day === day).title, data.lesson.title)
      assert.ok(data.lesson.antiStress, 'Every NAV2 route actually reaches the educational controls')
      if (moduleId === 'AS2') assert.equal(data.lesson.antiStress.routePlan, undefined, 'Approved AS2 stays on its existing plan')
      else {
        assert.ok(data.lesson.antiStress.routePlan?.methodActivity)
        assert.ok(data.lesson.antiStress.routePlan?.practiceLab?.main)
        assert.ok(data.lesson.antiStress.routePlan?.practiceLab?.reflect)
      }
      const { submitted, seen, chosen } = await playActualLesson(data, locale)
      if (moduleId === 'AS2' && day === 1) {
        assert.ok(seen.dayOne > 0); assert.equal(seen.method, 0); assert.equal(seen.main, 0); assert.equal(seen.reflect, 0)
        assert.ok(submitted.dayOneAnswers)
      } else {
        assert.equal(seen.dayOne, 0, 'Route-specific day 1 must not become the AS2 day-one lesson')
        assert.equal(seen.method, 1); assert.equal(seen.main, 1); assert.equal(seen.reflect, 1)
        assert.equal(submitted.dailyMethodChoice, chosen.method)
        assert.deepEqual(submitted.practiceLab, { main: chosen.main, attempt: 'tried', reflect: chosen.reflect })
      }
      const saved = await h.command(submitted, locale)
      const record = h.sessions.find(row => row.day_number === day)
      assert.ok(record); assert.equal(record.lesson_id, data.lesson.id)
      assert.equal(record.content_version, created.content_version)
      assert.equal(saved.currentSession.completedAt, record.completed_at)
      if (seen.method) {
        assert.equal(record.signals.dailyMethodChoice, chosen.method)
        assert.deepEqual(record.signals.practiceLab, submitted.practiceLab)
        assert.equal(record.signals.interactiveSchema, moduleId === 'AS2' ? 'as-4.0' : 'opora-nav2-interactions-1')
        assert.equal(record.signals.practiceLabVersion, moduleId === 'AS2' ? 'opora-lab-1' : 'opora-nav2-lab-1')
        assert.equal(Object.hasOwn(record.signals, 'moduleActivityChoice'), false, 'The scoped dialect never stores parallel generic choices')
      }
      assert.doesNotMatch(submitted.reflection, /Synthetic unsaved draft/, 'Uncommitted worksheet text stays local')
      if (chosen.note) {
        assert.equal(saved.currentSession.reflection, chosen.note, 'Only an explicit journal action persists worksheet text')
        assert.ok(record.reflection_ciphertext)
        assert.equal(String(record.reflection_ciphertext).includes('Synthetic chosen note'), false, 'Journal content uses the existing encrypted field')
        assert.equal(JSON.stringify(record.signals).includes('Synthetic chosen note'), false, 'Free text never enters bounded signals')
      }
      assert.equal(record.signals.window, 'practice_v15')
      assert.equal(record.signals.comfort, 'skip', 'Skipped ratings are not invented outcomes')
      assert.equal(record.before_now, null); assert.equal(record.after_now, null)
      assert.deepEqual(h.cycle.preferences, created.preferences, 'Saving ordinary choices does not change the route')
    })
  }
}

for (const moduleId of router.ANTISTRESS_ACTIVE_MODULE_IDS.filter(id => id !== 'AS2')) {
  test(`actual ${moduleId} session validator rejects malformed and untrusted route signals without writes`, async () => {
    const h = repositoryHarness(); await h.create(moduleId); h.seedDay(1)
    const data = await h.read('en'), writes = h.writes.length
    const invalid = [
      [{ dailyMethodChoice: 'not-an-authored-choice' }, 'INVALID_OPORA_METHOD_CHOICE'],
      [{ dailyMethodChoice: { text: 'arbitrary personal text' } }, 'INVALID_OPORA_METHOD_CHOICE'],
      [{ dailyMethodHintUsed: 'yes' }, 'INVALID_OPORA_METHOD_HINT'],
      [{ practiceLab: { main: 'not-an-authored-choice' } }, 'INVALID_PRACTICE_LAB'],
      [{ practiceLab: { reflect: 'not-an-authored-choice' } }, 'INVALID_PRACTICE_LAB'],
      [{ practiceLab: { arbitraryText: 'private content does not belong in bounded signals' } }, 'INVALID_PRACTICE_LAB'],
      [{ practiceLab: { attempt: 'proved_mastery' } }, 'INVALID_PRACTICE_LAB'],
      [{ practiceLab: ['try'] }, 'INVALID_PRACTICE_LAB'],
      [{ dayOneAnswers: { quote: 'agree' } }, 'INVALID_DAY_ONE_LESSON'],
      [{ routePlan: data.lesson.antiStress?.routePlan }, 'UNKNOWN_FIELD'],
      [{ lessonId: 'unrelated-lesson' }, 'INVALID_LESSON_ID'],
    ]
    for (const [fields, code] of invalid) {
      await assert.rejects(h.command(await savedInput(data, fields)), { name: 'AppError', code }, JSON.stringify(fields))
      assert.equal(h.writes.length, writes, 'Rejected input cannot insert a session or update a cycle')
      assert.equal(h.sessions.length, 0)
    }
    await h.command(await savedInput(data, { dailyMethodChoice: null, dailyMethodHintUsed: false, practiceLab: {} }))
    assert.equal(h.sessions[0].signals.dailyMethodChoice, null, 'All activities remain voluntary')
  })
}

for (const preset of presets.COURSE_PRESETS) for (const day of [1, 7, 14]) {
  test(`fixed preset ${preset.id} day ${day} is excluded at factory, repository, player and validator`, async () => {
    for (const injectedPreferences of [false, true]) {
      const h = repositoryHarness({ presetId: preset.id }); await h.create('AS4'); h.seedDay(day)
      assert.deepEqual(h.cycle.preferences, CYCLE_DEFAULTS); assert.equal(h.cycle.content_version, lessons.COURSE_CONTENT_V4)
      const original = await h.read('en')
      if (injectedPreferences) h.cycle.preferences = { oporaModuleId: 'AS4', oporaModuleRouter: router.ANTISTRESS_ROUTER_VERSION }
      const beforeRead = JSON.stringify(h.cycle), readWrites = h.writes.length
      const data = await h.read('en')
      assert.equal(data.cycle.moduleId, null); assert.equal(data.lesson.antiStress, undefined)
      assert.deepEqual(clone(data.lesson), clone(original.lesson), 'Stored route-looking preferences cannot change a fixed preset lesson')
      assert.deepEqual(clone(data.learningSkills), [], 'A fixed preset cannot acquire OPORA learning evidence')
      assert.equal(JSON.stringify(h.cycle), beforeRead); assert.equal(h.writes.length, readWrites)
      const { submitted, seen } = await playActualLesson(data, 'en', { choose: false })
      assert.deepEqual(seen, { method: 0, main: 0, reflect: 0, dayOne: 0 })
      assert.equal(Object.hasOwn(submitted, 'dailyMethodChoice'), false)
      assert.equal(Object.hasOwn(submitted, 'practiceLab'), false)
      const writes = h.writes.length
      await assert.rejects(h.command({ ...submitted, dailyMethodChoice: 'try', practiceLab: { main: 'try' } }),
        { name: 'AppError', code: 'INVALID_ANTISTRESS_PROBE' })
      await assert.rejects(h.command({ ...submitted, moduleActivityChoice: 'skip' }),
        { name: 'AppError', code: 'INVALID_OPORA_MODULE_ACTIVITY' })
      assert.equal(h.writes.length, writes)
      await h.command(submitted)
      assert.equal(h.sessions.find(row => row.day_number === day).lesson_id, data.lesson.id)
    }
  })
}

test('actual AS2 repository preserves its historical learningSkills interpretation and saved signals', async () => {
  for (const routerVersion of [NAV1, router.ANTISTRESS_ROUTER_VERSION]) for (const locale of ['en', 'ru']) {
    const h = repositoryHarness(); await h.create('AS2')
    h.cycle.preferences.oporaModuleRouter = routerVersion
    h.seedDay(2)
    const secondDay = await h.read(locale), selected = secondDay.lesson.antiStress.probe.choices[0].value
    // These expectations pin the pre-integration AS2 reader: only its existing
    // practiceAttempt/dayOne reports and skillProbe fields contribute evidence.
    const cases = [
      [{}, {}, { status: 'introduced_only', actualPracticeTried: false, selectedChoice: null, usedHint: false }],
      [{}, { practiceLab: { attempt: 'tried' }, dailyMethodHintUsed: true },
        { status: 'introduced_only', actualPracticeTried: false, selectedChoice: null, usedHint: false }],
      [{}, { practiceLab: { attempt: 'partly' } },
        { status: 'introduced_only', actualPracticeTried: false, selectedChoice: null, usedHint: false }],
      ...['tried', 'simplified', 'neutral'].map(practiceAttempt => [{}, { practiceAttempt },
        { status: 'guided_attempt', actualPracticeTried: true, selectedChoice: null, usedHint: false }]),
      [{}, { practiceAttempt: 'partly' },
        { status: 'introduced_only', actualPracticeTried: false, selectedChoice: null, usedHint: false }],
      [{ dayOne: { practiceAttempt: 'partly' } }, {},
        { status: 'guided_attempt', actualPracticeTried: true, selectedChoice: null, usedHint: false }],
      [{}, { skillProbeHintUsed: true },
        { status: 'introduced_only', actualPracticeTried: false, selectedChoice: null, usedHint: true }],
      [{}, { skillProbeChoice: selected },
        { status: 'new_context_choice', actualPracticeTried: false, selectedChoice: selected, usedHint: false }],
      [{}, { skillProbeChoice: selected, skillProbeHintUsed: true },
        { status: 'guided_attempt', actualPracticeTried: false, selectedChoice: selected, usedHint: true }],
    ]
    for (const [first, last, expected] of cases) {
      h.seedDay(3)
      h.sessions[0].signals = clone(first); h.sessions[1].signals = clone(last)
      const before = JSON.stringify({ cycle: h.cycle, sessions: h.sessions }), writes = h.writes.length
      const data = await h.read(locale), skill = data.learningSkills.find(item => item.id === 'S1')
      const { status, actualPracticeTried, selectedChoice, usedHint } = skill
      assert.deepEqual({ status, actualPracticeTried, selectedChoice, usedHint }, expected)
      assert.equal(h.writes.length, writes)
      assert.equal(JSON.stringify({ cycle: h.cycle, sessions: h.sessions }), before,
        'The AS2 compatibility reader cannot rewrite saved historical signals')
    }
  }
})

const routedModules = router.ANTISTRESS_ACTIVE_MODULE_IDS.filter(id => id !== 'AS2')
for (const [index, moduleId] of routedModules.entries()) {
  test(`actual ${moduleId} repository learningSkills reports saved attempts and hints independently`, async () => {
    for (const day of [13, 14]) for (const [attempt, tried] of [
      ['tried', true], ['partly', true], ['stopped', false], ['skip', false], [undefined, false],
    ]) for (const hintUsed of [false, true]) {
      const h = repositoryHarness(); await h.create(moduleId); h.seedDay(day)
      const data = await h.read('en'), plan = data.lesson.antiStress.routePlan
      const reflect = plan.practiceLab.reflect.options.find(option => option.id.endsWith(hintUsed ? '_hint' : '_defer')).id
      const practiceLab = { main: plan.practiceLab.main.options[0].id, reflect, ...(attempt ? { attempt } : {}) }
      await h.command(await savedInput(data, {
        dailyMethodChoice: plan.methodActivity.choices[0].value, dailyMethodHintUsed: hintUsed, practiceLab,
      }))
      const before = JSON.stringify({ course: h.course, cycle: h.cycle, sessions: h.sessions }), writes = h.writes.length
      const reread = await h.read('en')
      const skill = reread.learningSkills.find(item => item.days.includes(day))
      assert.ok(skill)
      assert.equal(skill.status, tried ? 'reported_attempt' : 'introduced_only')
      assert.equal(skill.actualPracticeTried, tried, 'Only an explicit tried/partly report counts as an attempt')
      assert.equal(skill.usedHint, hintUsed, 'Consulting a hint remains independent of whether a practice was attempted')
      assert.equal(skill.selectedChoice, null, 'An educational route selection is not reinterpreted as an AS2 skill probe')
      assert.equal(h.writes.length, writes)
      assert.equal(JSON.stringify({ course: h.course, cycle: h.cycle, sessions: h.sessions }), before)
    }
  })

  test(`actual ${moduleId} accepts the bounded live-f7 dialect and rejects mixed or invalid generic choices`, async () => {
    for (let day = 1; day <= 14; day++) {
      const h = repositoryHarness(); await h.create(moduleId); h.seedDay(day)
      const data = await h.read('en'), writes = h.writes.length
      const generic = moduleActivities.oporaModuleActivity(moduleId, day, 'en', router.ANTISTRESS_ROUTER_VERSION)
      const choice = generic.options[(day - 1) % generic.options.length].id
      const scoped = data.lesson.antiStress.routePlan
      const foreignDay = moduleActivities.oporaModuleActivity(moduleId, day === 14 ? 1 : day + 1, 'en', router.ANTISTRESS_ROUTER_VERSION)
      const incompatible = foreignDay.options.find(option => !generic.options.some(own => own.id === option.id))
      assert.ok(incompatible, 'A generic choice from a different day can be incompatible without implying route provenance')
      for (const extra of [
        { moduleActivityChoice: 'not-an-authored-choice' },
        { moduleActivityChoice: incompatible.id },
        { moduleActivityChoice: { text: 'arbitrary personal text' } },
        { moduleActivityChoice: choice, dailyMethodChoice: scoped.methodActivity.choices[0].value },
        { moduleActivityChoice: choice, dailyMethodChoice: null },
        { moduleActivityChoice: choice, dailyMethodHintUsed: false },
        { moduleActivityChoice: choice, practiceLab: {} },
      ]) {
        await assert.rejects(h.command(await savedInput(data, extra)), { name: 'AppError', code: 'INVALID_OPORA_MODULE_ACTIVITY' })
        assert.equal(h.writes.length, writes, 'Invalid or contradictory dialects cannot write a session')
      }
      const saved = await h.command(await savedInput(data, { moduleActivityChoice: choice }))
      const signals = h.sessions.find(row => row.day_number === day).signals
      assert.equal(signals.moduleActivityChoice, choice)
      assert.equal(signals.interactionSchema, 'opora-level-2')
      assert.equal(signals.moduleThemeId, moduleId + '-day-' + day, 'The server binds the generic dialect to the persisted route and day')
      for (const key of ['dailyMethodChoice', 'dailyMethodHintUsed', 'practiceLab', 'practiceLabVersion', 'interactiveSchema'])
        assert.equal(Object.hasOwn(signals, key), false, 'Legacy input does not manufacture scoped signals: ' + key)
      assert.deepEqual(clone(saved.currentSession.signals), clone(signals))
    }
  })

  test(`actual ${moduleId} validator rejects choices copied from another route or day`, async () => {
    const h = repositoryHarness(); await h.create(moduleId); h.seedDay(2)
    const current = await h.read('en'), writes = h.writes.length
    h.seedDay(3); const nextDay = await h.read('en'); h.seedDay(2)
    const other = repositoryHarness(); await other.create(routedModules[(index + 1) % routedModules.length]); other.seedDay(2)
    const otherRoute = await other.read('en')
    for (const foreign of [nextDay, otherRoute]) {
      const plan = foreign.lesson.antiStress.routePlan
      const value = plan.methodActivity.choices[0].value
      assert.equal(current.lesson.antiStress.routePlan.methodActivity.choices.some(o => o.value === value), false,
        'Method IDs are bound to their authored route and day')
      await assert.rejects(h.command(await savedInput(current, { dailyMethodChoice: value })),
        { name: 'AppError', code: 'INVALID_OPORA_METHOD_CHOICE' })
      for (const part of ['main', 'reflect']) {
        const id = plan.practiceLab[part].options[0].id
        assert.equal(current.lesson.antiStress.routePlan.practiceLab[part].options.some(o => o.id === id), false)
        await assert.rejects(h.command(await savedInput(current, { practiceLab: { [part]: id } })),
          { name: 'AppError', code: 'INVALID_PRACTICE_LAB' })
      }
    }
    assert.equal(h.writes.length, writes)
  })

  test(`actual ${moduleId} independent practice cannot be claimed after a hint, while hint/defer remain valid`, async () => {
    for (const ending of ['_hint', '_defer']) {
      const h = repositoryHarness(); await h.create(moduleId); h.seedDay(13)
      const data = await h.read('en'), plan = data.lesson.antiStress.routePlan
      const independent = plan.practiceLab.reflect.options.find(o => o.id.endsWith('_independent'))
      const honest = plan.practiceLab.reflect.options.find(o => o.id.endsWith(ending))
      assert.ok(independent, 'Day 13 offers an explicit independent attempt')
      assert.ok(honest, 'Day 13 offers honest hint/defer reporting')
      const writes = h.writes.length
      await assert.rejects(h.command(await savedInput(data, { dailyMethodHintUsed: true, practiceLab: { reflect: independent.id } })),
        { name: 'AppError', code: 'INVALID_PRACTICE_LAB' })
      assert.equal(h.writes.length, writes)
      await h.command(await savedInput(data, { dailyMethodHintUsed: true, practiceLab: { reflect: honest.id } }))
      const signals = h.sessions.find(s => s.day_number === 13).signals
      assert.equal(signals.dailyMethodHintUsed, true); assert.equal(signals.practiceLab.reflect, honest.id)
      assert.equal(signals.practiceLab.attempt, undefined, 'Choosing a report is not inferred to be a completed practice')
    }
  })

  test(`actual ${moduleId} Player clears an independent choice after opening a method hint`, async () => {
    const h = repositoryHarness(); await h.create(moduleId); h.seedDay(13)
    const data = await h.read('en'), plan = data.lesson.antiStress.routePlan
    const independent = plan.practiceLab.reflect.options.find(o => o.id.endsWith('_independent'))
    assert.ok(independent)
    const player = mount('course-slide-player', { data, locale: 'en', onClose() {}, onSession() { assert.fail('No save requested') } })
    const seek = async (name, predicate = () => true, direction = 'primary') => {
      for (let i = 0; i < 40; i++) {
        const part = findPart(player.tree, name)
        if (part && predicate(part)) return part
        const button = nodes(player.tree).find(n => n.type === 'button' && n.props.className === direction)
        assert.ok(button); button.props.onClick(); await player.settle()
      }
      assert.fail('Could not reach ' + name)
    }
    const reflect = await seek('AntiStressPracticeLab', node => node.props.part === 'reflect')
    const reflectControl = mount('anti-stress-practice-lab', reflect.props)
    findButton(reflectControl.tree, independent.label).props.onClick(); await player.settle(); reflectControl.unmount()
    assert.equal(findPart(player.tree, 'AntiStressPracticeLab').props.value, independent.id)
    const method = await seek('AntiStressMethodActivity', () => true, 'back')
    const methodControl = mount('anti-stress-method-activity', method.props)
    nodes(methodControl.tree).find(n => n.type === 'details').props.onToggle({ currentTarget: { open: true } })
    await player.settle(); methodControl.unmount()
    const revisited = await seek('AntiStressPracticeLab', node => node.props.part === 'reflect')
    assert.equal(revisited.props.value, '', 'A previously independent claim is removed after a hint')
    assert.equal(revisited.props.hintUsed, true)
    const revisitedControl = mount('anti-stress-practice-lab', revisited.props)
    assert.equal(findButton(revisitedControl.tree, independent.label).props.disabled, true)
    revisitedControl.unmount(); player.unmount()
  })

  test(`actual ${moduleId} Player records real main/reflect lab hints and prevents a later independent claim`, async () => {
    for (const locale of ['en', 'ru']) for (const hintPart of ['main', 'reflect']) {
      const h = repositoryHarness(); await h.create(moduleId); h.seedDay(13)
      const data = await h.read(locale), plan = data.lesson.antiStress.routePlan
      const independent = plan.practiceLab.reflect.options.find(option => option.id.endsWith('_independent'))
      const withHint = plan.practiceLab.reflect.options.find(option => option.id.endsWith('_hint'))
      let submitted = null
      const player = mount('course-slide-player', { data, locale, onClose() {}, onSession(body) { submitted = clone(body); return true } })
      const seek = async (part, direction = 'primary') => {
        for (let step = 0; step < 40; step++) {
          const lab = findPart(player.tree, 'AntiStressPracticeLab')
          if (lab?.props.part === part) return lab
          const button = nodes(player.tree).find(node => node.type === 'button' && node.props.className === direction)
          assert.ok(button); button.props.onClick(); await player.settle()
        }
        assert.fail('Could not reach the actual ' + part + ' lab')
      }
      const reflect = await seek('reflect')
      let control = mount('anti-stress-practice-lab', reflect.props)
      findButton(control.tree, independent.label).props.onClick(); await player.settle(); control.unmount()
      assert.equal(findPart(player.tree, 'AntiStressPracticeLab').props.value, independent.id)
      const hintLab = await seek(hintPart, 'back')
      assertCanonicalPart(player.tree, plan, hintPart)
      control = mount('anti-stress-practice-lab', hintLab.props)
      const showLabel = locale === 'ru' ? 'Подсказка без оценивания' : 'Show a non-grading hint'
      const hideLabel = locale === 'ru' ? 'Скрыть подсказку' : 'Hide hint'
      const hintButton = findButton(control.tree, showLabel)
      assert.ok(hintButton, 'The authored route exposes an actual lab hint, not an artificial callback invocation')
      assert.equal(hintButton.props['aria-expanded'], false)
      hintButton.props.onClick(); await player.settle(); await control.settle()
      assert.equal(findButton(control.tree, hideLabel).props['aria-expanded'], true)
      // Closing a hint cannot undo the fact that it was already consulted.
      findButton(control.tree, hideLabel).props.onClick(); await player.settle(); await control.settle()
      assert.equal(findButton(control.tree, showLabel).props['aria-expanded'], false)
      control.unmount()
      const revisited = await seek('reflect')
      assert.equal(revisited.props.value, '', 'Opening a lab hint clears the earlier independent response')
      assert.equal(revisited.props.hintUsed, true)
      control = mount('anti-stress-practice-lab', revisited.props)
      assert.equal(findButton(control.tree, independent.label).props.disabled, true)
      findButton(control.tree, withHint.label).props.onClick(); await player.settle(); control.unmount()
      for (let step = 0; step < 40 && !submitted; step++) {
        const next = nodes(player.tree).find(node => node.type === 'button' && node.props.className === 'primary')
        assert.ok(next); next.props.onClick(); await player.settle()
      }
      assert.ok(submitted); assert.equal(submitted.dailyMethodHintUsed, true)
      assert.equal(submitted.practiceLab.reflect, withHint.id)
      const writes = h.writes.length
      await assert.rejects(h.command({ ...submitted, practiceLab: { ...submitted.practiceLab, reflect: independent.id } }, locale),
        { name: 'AppError', code: 'INVALID_PRACTICE_LAB' })
      assert.equal(h.writes.length, writes, 'The server rejects an independent report after the real UI has opened a hint')
      await h.command(submitted, locale)
      assert.equal(h.sessions.find(row => row.day_number === 13).signals.dailyMethodHintUsed, true)
      player.unmount()
    }
  })
}

for (const moduleId of ['AS1', 'AS2', 'AS3', 'AS4', 'AS5', 'AS6']) for (const locale of ['en', 'ru']) {
  test(`existing NAV1 ${moduleId} ${locale} keeps all 14 frozen lessons and roadmap titles`, async () => {
    const h = repositoryHarness(); await h.create(moduleId === 'AS6' ? 'AS5' : moduleId)
    // Seed an already stored NAV1 row. This is fixture state, not an upgrade or write.
    h.cycle.preferences = { oporaModuleId: moduleId, oporaModuleRouter: NAV1 }
    const before = JSON.stringify(h.cycle), writes = h.writes.length
    for (let day = 1; day <= 14; day++) {
      h.seedDay(day)
      const data = await h.read(locale)
      const expected = snapshots.find(s => s.moduleId === moduleId && s.locale === locale && s.day === day)
      assert.equal(data.cycle.moduleId, moduleId); assert.equal(data.cycle.day, day)
      assert.equal(data.lesson.id, expected.id); assert.equal(digest(data.lesson), expected.sha256)
      assert.equal(data.lesson.antiStress?.routePlan, undefined)
      for (const row of data.roadmap) assert.equal(row.title,
        snapshots.find(s => s.moduleId === moduleId && s.locale === locale && s.day === row.day).title)
      assert.equal(JSON.stringify(h.cycle), before); assert.equal(h.writes.length, writes)
    }
  })
}

for (const moduleId of router.ANTISTRESS_ACTIVE_MODULE_IDS) for (const locale of ['en', 'ru']) {
  test(`completed NAV2 ${moduleId} ${locale} preserves missing historical signals and read-only replay`, async () => {
    const historyCases = [[1, null], [7, {}], [14, {
      window: 'practice_v15', comfort: 'neutral', usefulness: 'unchanged', flexibility: 'same',
    }]]
    if (moduleId !== 'AS2') {
      for (const [day, choice] of [[1, 'object'], [8, 'words'], [13, 'replay'], [14, 'anchor']]) historyCases.push([day, {
        window: 'practice_v15', interactionSchema: 'opora-level-2', moduleThemeId: moduleId + '-day-' + day,
        moduleActivityChoice: choice, comfort: 'neutral', usefulness: 'unchanged', flexibility: 'same',
      }, choice])
      for (const provenance of [{}, { interactionSchema: 'opora-level-2' },
        { interactionSchema: 'opora-level-2', moduleThemeId: moduleId + '-day-7' },
        { interactionSchema: 'opora-level-2', moduleThemeId: routedModules.find(id => id !== moduleId) + '-day-8' },
        { interactionSchema: 'unrecognized-schema', moduleThemeId: moduleId + '-day-8' }])
        historyCases.push([8, { ...provenance, moduleActivityChoice: 'words' }])
    }
    for (const [day, historicalSignals, expectedActivityId] of historyCases) {
      const h = repositoryHarness(); await h.create(moduleId); h.seedDay(day)
      // These are the NAV2 IDs written before the additive interaction repair.
      const historicalId = moduleId === 'AS2'
        ? `hh-growth-calm_regulation-${String(day).padStart(2, '0')}-hh-antistress-outcomes-v3-20261014`
        : `hh-opora-${moduleId.toLowerCase()}-${String(day).padStart(2, '0')}-hh-growth-v4-20261013-opora-levels-2.0-20261014`
      const completedAt = new Date().toISOString()
      const operationId = '00000000-0000-4000-8000-000000000989'
      h.sessions.push({
        id: '00000000-0000-4000-8000-000000000988', account_id: h.cycle.account_id, cycle_id: h.cycle.id,
        day_number: day, local_date: completedAt.slice(0, 10), completed_at: completedAt,
        lesson_id: historicalId, content_version: h.cycle.content_version,
        before_now: 7, after_now: 6, feedback: 'neutral',
        reflection_ciphertext: null, practice_plan_ciphertext: null, signals: clone(historicalSignals), operation_id: operationId,
      })
      if (day === 14) { h.cycle.status = 'completed'; h.course.status = 'completed' }
      const before = JSON.stringify({ course: h.course, cycle: h.cycle, sessions: h.sessions })
      const writes = h.writes.length, data = await h.read(locale)
      assert.equal(data.cycle.day, day); assert.equal(data.lesson.id, historicalId)
      if (moduleId !== 'AS2') assert.ok(data.lesson.antiStress.routePlan, 'Additive educational controls may repair an existing NAV2 route')
      assert.deepEqual(clone(data.currentSession.signals), historicalSignals || {})
      for (const key of ['dailyMethodChoice', 'dailyMethodHintUsed', 'practiceLab', 'practiceAttempt',
        'interactiveSchema', 'practiceLabVersion']) assert.equal(Object.hasOwn(data.currentSession.signals, key), false)
      let saveCalls = 0
      const player = mount('course-slide-player', { data, locale, onClose() {},
        onSession() { saveCalls++; assert.fail('Replaying a completed lesson must not submit another session') },
        onCheckin() { assert.fail('Read-only replay must not create a check-in') },
      })
      const assertHistoricalReceipt = () => {
        const receipt = findPart(player.tree, 'CourseLessonResult'); assert.ok(receipt)
        const summary = outcomes.courseSingleLessonOutcome(receipt.props)
        assert.equal(summary.attempt, locale === 'ru' ? 'Не отмечено' : 'Not reported')
        assert.equal(summary.anchor, null); assert.equal(summary.anotherChoice, null)
        const expectedLabel = expectedActivityId ? moduleActivities.oporaModuleActivity(moduleId, day, locale,
          router.ANTISTRESS_ROUTER_VERSION).options.find(option => option.id === expectedActivityId).label : null
        assert.equal(summary.savedActivity, expectedLabel, 'Only a genuine saved live-f7 dialect yields a generic choice label')
        assert.equal(receipt.props.moduleActivityChoice, expectedActivityId || null,
          'Missing or mismatched schema/route/day provenance cannot reinterpret a historical choice')
        const rendered = mount('course-lesson-result', receipt.props)
        const savedChoice = nodes(rendered.tree).find(node => node.props?.['data-course-saved-module-choice'])
        assert.equal(Boolean(savedChoice), Boolean(expectedLabel))
        if (expectedLabel) assert.ok(textOf(savedChoice).includes(expectedLabel), 'The actual receipt preserves the localized historical choice')
        rendered.unmount()
        assert.deepEqual(summary.state, { before: 7, after: 6, delta: -1 }, 'Existing self-ratings retain their meaning')
        assert.deepEqual(clone(receipt.props.practiceLab || {}), {},
          'New fields are not backfilled into the historical receipt')
        assert.equal(Boolean(receipt.props.practiceAttempt), false)
      }
      assertHistoricalReceipt()
      findButton(player.tree, locale === 'ru' ? 'Перечитать занятие' : 'Read the lesson again').props.onClick()
      await player.settle()
      const changedDayOne = new Set()
      for (let step = 0; step < 40 && !findPart(player.tree, 'CourseLessonResult'); step++) {
        const replayLab = findPart(player.tree, 'AntiStressPracticeLab')
        if (replayLab) {
          // A new in-memory trial during replay is not a historical saved
          // answer. The completion receipt must still use the saved session.
          const control = mount('anti-stress-practice-lab', replayLab.props)
          const card = (data.lesson.antiStress.routePlan?.practiceLab || labs.antiStressLabFor(day, locale))[replayLab.props.part]
          findButton(control.tree, card.options[0].label).props.onClick()
          if (replayLab.props.part === 'main') findButton(control.tree, locale === 'ru' ? 'Попробовал(а)' : 'Tried').props.onClick()
          await player.settle(); control.unmount()
        }
        const dayOne = findPart(player.tree, 'DayOneExercise')
        if (dayOne && ['day1-practice', 'day1-anchor'].includes(dayOne.props.kind)) {
          const value = dayOne.props.kind === 'day1-practice' ? 'tried' : 'colour'
          const exercise = mount('anti-stress-day-one', dayOne.props)
          const choices = nodes(exercise.tree).find(n => n.type?.name === 'DayOneChoices' && n.props.options?.some(o => o.value === value))
          assert.ok(choices, 'The actual day-one exercise offers the replay choice')
          const control = mount('anti-stress-day-one', choices.props, { exportName: 'DayOneChoices' })
          const option = choices.props.options.find(o => o.value === value)
          nodes(control.tree).find(n => n.type === 'button' && textOf(n).includes(option.label)).props.onClick()
          await player.settle(); control.unmount(); exercise.unmount(); changedDayOne.add(value)
        }
        const next = nodes(player.tree).find(n => n.type === 'button' && n.props.className === 'primary')
        assert.ok(next); next.props.onClick(); await player.settle()
      }
      if (moduleId === 'AS2' && day === 1) assert.deepEqual([...changedDayOne].sort(), ['colour', 'tried'])
      assertHistoricalReceipt(); assert.equal(saveCalls, 0); player.unmount()
      const reread = await h.read(locale)
      assert.equal(reread.lesson.id, historicalId); assert.deepEqual(clone(reread.currentSession.signals), historicalSignals || {})
      // An actual retry of the original operation must reread this exact
      // selected course. The SQL allowlist rejects any unscoped course query.
      const retried = await h.command(await savedInput(data, { operationId }), locale)
      assert.equal(retried.courseId, h.course.id); assert.equal(retried.cycle.id, h.cycle.id)
      assert.equal(retried.lesson.id, historicalId)
      assert.deepEqual(clone(retried.currentSession.signals), historicalSignals || {})
      assert.equal(h.writes.length, writes)
      assert.equal(JSON.stringify({ course: h.course, cycle: h.cycle, sessions: h.sessions }), before,
        'Reading and replaying cannot change stored IDs, historical signals or completion records')
    }
  })
}

for (const moduleId of routedModules) for (const locale of ['en', 'ru']) {
  test(`actual ${moduleId} ${locale} rejects journal overflow without losing the note or worksheet draft`, async () => {
    const h = repositoryHarness(); await h.create(moduleId); h.seedDay(14)
    const data = await h.read(locale), writes = h.writes.length
    let submitted = null
    const player = mount('course-slide-player', { data, locale, onClose() {}, onSession(body) { submitted = clone(body); return true } })
    const journal = () => nodes(player.tree).find(n => n.type === 'textarea' && n.props.maxLength === 500)
    const move = async direction => {
      const button = nodes(player.tree).find(n => n.type === 'button' && n.props.className === direction)
      assert.ok(button); button.props.onClick(); await player.settle()
    }
    for (let step = 0; step < 40 && !journal(); step++) await move('primary')
    assert.ok(journal())
    const existing = 'Existing ' + 'x'.repeat(481)
    assert.equal(existing.length, 490)
    journal().props.onChange({ target: { value: existing } }); await player.settle()
    await move('back')
    let part = findPart(player.tree, 'AntiStressPracticeLab'); assert.equal(part.props.part, 'reflect')
    let control = mount('anti-stress-practice-lab', part.props)
    const draft = 'This stays in the worksheet draft'
    nodes(control.tree).find(n => n.type === 'input' && n.props.type === 'text').props.onChange({ target: { value: draft } })
    await player.settle(); control.render(findPart(player.tree, 'AntiStressPracticeLab').props)
    const keepLabel = locale === 'ru' ? 'Добавить в мой личный дневник' : 'Add to my private journal'
    findButton(control.tree, keepLabel).props.onClick(); await player.settle(); await control.settle()
    control.render(findPart(player.tree, 'AntiStressPracticeLab').props)
    assert.ok(nodes(control.tree).find(n => n.props?.['data-route-journal-capacity']), 'The overflow is explicitly reported')
    assert.equal(nodes(control.tree).filter(n => n.props?.role === 'status').length, 0, 'Rejected text is never falsely reported as added')
    assert.equal(nodes(control.tree).find(n => n.type === 'input' && n.props.type === 'text').props.value, draft)
    control.unmount()
    await move('primary'); assert.equal(journal().props.value, existing, 'The existing note is not silently truncated or replaced')
    assert.equal(h.writes.length, writes); assert.equal(submitted, null)
    journal().props.onChange({ target: { value: 'Existing note' } }); await player.settle()
    await move('back')
    part = findPart(player.tree, 'AntiStressPracticeLab'); control = mount('anti-stress-practice-lab', part.props)
    assert.equal(nodes(control.tree).find(n => n.type === 'input' && n.props.type === 'text').props.value, draft,
      'The entire rejected draft survives navigation while the note is edited')
    findButton(control.tree, keepLabel).props.onClick(); await player.settle(); await control.settle()
    assert.equal(nodes(control.tree).some(n => n.props?.['data-route-journal-capacity']), false)
    assert.ok(nodes(control.tree).find(n => n.props?.role === 'status'))
    control.unmount()
    await move('primary')
    const expected = 'Existing note\n' + data.lesson.antiStress.routePlan.practiceLab.reflect.fields[0] + ': ' + draft
    assert.equal(journal().props.value, expected, 'The successful retry appends the complete text')
    for (let step = 0; step < 40 && !submitted; step++) await move('primary')
    assert.ok(submitted); assert.equal(submitted.reflection, expected)
    assert.equal(JSON.stringify(submitted.practiceLab).includes(draft), false)
    const saved = await h.command(submitted, locale)
    assert.equal(saved.currentSession.reflection, expected)
    player.unmount()
  })
}

for (const locale of ['en', 'ru']) for (const copyToJournal of [false, true]) {
  test(`actual AS2 ${locale} day 8 associations ${copyToJournal ? 'reject overflow and retry the complete explicit copy' : 'survive next/back without automatically entering the saved note'}`, async () => {
    const h = repositoryHarness(); await h.create('AS2'); h.seedDay(8)
    const data = await h.read(locale), writes = h.writes.length
    assert.equal(data.lesson.antiStress.routePlan, undefined, 'This regression exercises the unchanged AS2 catalog')
    const card = labs.antiStressLabFor(8, locale).reflect
    assert.equal(card.format, 'associations')
    let submitted = null, saveCalls = 0
    const player = mount('course-slide-player', { data, locale, onClose() {},
      onCheckin() { assert.fail('Editing an optional association draft must not submit a check-in') },
      onSession(body) { saveCalls++; assert.equal(saveCalls, 1); submitted = clone(body); return true },
    })
    const journal = () => nodes(player.tree).find(node => node.type === 'textarea' && node.props.maxLength === 500)
    const labPart = () => findPart(player.tree, 'AntiStressPracticeLab')
    const move = async direction => {
      const button = nodes(player.tree).find(node => node.type === 'button' && node.props.className === direction)
      assert.ok(button); button.props.onClick(); await player.settle()
    }
    const existing = 'Existing ' + 'x'.repeat(481)
    if (copyToJournal) {
      for (let step = 0; step < 40 && !journal(); step++) await move('primary')
      assert.ok(journal()); assert.equal(existing.length, 490)
      journal().props.onChange({ target: { value: existing } }); await player.settle()
      await move('back')
    } else {
      for (let step = 0; step < 40 && labPart()?.props.part !== 'reflect'; step++) await move('primary')
    }
    assert.equal(labPart()?.props.part, 'reflect')
    assertCanonicalPart(player.tree, null, 'reflect')
    let control = mount('anti-stress-practice-lab', labPart().props)
    findButton(control.tree, card.options.find(option => option.id === 'words').label).props.onClick()
    await player.settle(); control.render(labPart().props); await control.settle()
    const fields = () => nodes(control.tree).filter(node => node.type === 'input' && node.props.type === 'text')
    const associationSection = () => nodes(control.tree).find(node => node.props?.['data-course-five-associations'])
    const pairs = Array.from({ length: 5 }, (_, index) => [
      'word-' + (index + 1) + '-' + 'w'.repeat(25), 'quality-' + (index + 1) + '-' + 'q'.repeat(22),
    ])
    const values = pairs.flat()
    assert.equal(fields().length, 10)
    for (const [index, value] of values.entries()) {
      assert.equal(value.length, 32)
      fields()[index].props.onChange({ target: { value } })
      await player.settle(); control.render(labPart().props); await control.settle()
    }
    const assertDraft = () => assert.deepEqual(fields().map(field => field.props.value), values,
      'All five words and qualities must survive navigation and a rejected copy unchanged')
    assertDraft()
    assert.equal(submitted, null); assert.equal(h.writes.length, writes)
    control.unmount()
    await move('primary')
    assert.equal(journal().props.value, copyToJournal ? existing : '', 'A draft does not enter the journal just because it was typed')
    await move('back')
    control = mount('anti-stress-practice-lab', labPart().props)
    assert.equal(labPart().props.value, 'words'); assertDraft()
    const keepLabel = locale === 'ru' ? 'Добавить в мой личный дневник' : 'Add to my private journal'
    const addition = (locale === 'ru' ? 'Мои ассоциации: ' : 'My associations: ') + pairs.map(pair => pair.join(' — ')).join('; ')
    let expectedReflection = ''
    if (copyToJournal) {
      assert.ok((existing + '\n' + addition).length > 500)
      findButton(control.tree, keepLabel).props.onClick(); await player.settle(); await control.settle()
      control.render(labPart().props)
      assert.ok(nodes(control.tree).some(node => node.props?.role === 'alert'), 'The refused copy must be reported explicitly')
      assert.equal(nodes(associationSection()).filter(node => node.props?.role === 'status').length, 0,
        'A rejected association copy must never claim that text was added')
      assertDraft()
      assert.equal(submitted, null); assert.equal(saveCalls, 0); assert.equal(h.writes.length, writes)
      control.unmount(); await move('primary')
      assert.equal(journal().props.value, existing, 'The 490-character note must remain exact, without partial append or truncation')
      journal().props.onChange({ target: { value: 'Existing note' } }); await player.settle()
      await move('back')
      control = mount('anti-stress-practice-lab', labPart().props); assertDraft()
      assert.equal(findButton(control.tree, keepLabel).props.disabled, false)
      findButton(control.tree, keepLabel).props.onClick(); await player.settle(); await control.settle()
      assert.equal(nodes(control.tree).some(node => node.props?.role === 'alert'), false)
      assert.ok(nodes(associationSection()).some(node => node.props?.role === 'status'), 'Only a successful explicit copy reports success')
      assertDraft()
      expectedReflection = 'Existing note\n' + addition
      assert.ok(expectedReflection.length < 500)
    }
    control.unmount(); await move('primary')
    assert.equal(journal().props.value, expectedReflection, 'The journal contains the complete authorized text, or no uncommitted draft')
    assert.equal(submitted, null); assert.equal(saveCalls, 0); assert.equal(h.writes.length, writes,
      'An explicit copy only updates the in-memory note until the final lesson save')
    for (let step = 0; step < 40 && !submitted; step++) await move('primary')
    assert.ok(submitted); assert.equal(saveCalls, 1); assert.equal(submitted.reflection, expectedReflection)
    assert.deepEqual(submitted.practiceLab, { reflect: 'words' }, 'The existing AS2 bounded payload keeps its original shape')
    assert.equal(submitted.dailyMethodChoice, null); assert.equal(submitted.dailyMethodHintUsed, false)
    for (const key of ['draft', 'words', 'qualities', 'routeDrafts', 'moduleActivityChoice', 'routePlan'])
      assert.equal(Object.hasOwn(submitted, key), false, 'No draft-only or generic field enters the session payload: ' + key)
    const saved = await h.command(submitted, locale), record = h.sessions.find(row => row.day_number === 8)
    assert.deepEqual(record.signals.practiceLab, { reflect: 'words' })
    assert.equal(record.signals.interactiveSchema, 'as-4.0'); assert.equal(record.signals.practiceLabVersion, 'opora-lab-1')
    for (const value of values) assert.equal(JSON.stringify(record.signals).includes(value), false)
    if (copyToJournal) {
      assert.equal(saved.currentSession.reflection, expectedReflection)
      assert.ok(record.reflection_ciphertext)
      for (const value of values) assert.equal(String(record.reflection_ciphertext).includes(value), false,
        'Explicitly copied associations persist only in the existing encrypted reflection field')
    } else {
      assert.equal(Boolean(saved.currentSession.reflection), false)
      assert.equal(record.reflection_ciphertext, null, 'An uncommitted association draft never becomes a saved note')
    }
    player.unmount()
  })
}

const acknowledgementTargets = [
  ...[NAV1, router.ANTISTRESS_ROUTER_VERSION].flatMap(routerVersion =>
    (routerVersion === NAV1 ? ['AS1', 'AS2', 'AS3', 'AS4', 'AS5', 'AS6'] : router.ANTISTRESS_ACTIVE_MODULE_IDS)
      .map(moduleId => ({ moduleId, routerVersion, name: (routerVersion === NAV1 ? 'NAV1' : 'NAV2') + ' ' + moduleId }))),
  ...presets.COURSE_PRESETS.map(preset => ({ presetId: preset.id, moduleId: 'AS4', name: 'preset ' + preset.id })),
]
for (const target of acknowledgementTargets) for (const locale of ['en', 'ru']) for (const length of ['quick', 'standard']) {
  test(`actual slide ACK ${target.name} ${locale} ${length}: rendered keys match server requirements on all 14 days`, async () => {
    for (let day = 1; day <= 14; day++) {
      const h = repositoryHarness({ presetId: target.presetId })
      await h.create(target.moduleId === 'AS6' ? 'AS5' : target.moduleId)
      if (target.routerVersion) h.cycle.preferences = {
        oporaModuleId: target.moduleId, oporaModuleRouter: target.routerVersion,
      }
      h.cycle.preferences.length = length
      h.seedDay(day)
      const data = await h.read(locale), writes = h.writes.length
      const storedBefore = JSON.stringify({ cycle: h.cycle, sessions: h.sessions })
      const { submitted, visited } = await walkActualSlides(data, locale)
      assert.equal(h.writes.length, writes, 'Navigating real screens is not a database save')
      assert.equal(JSON.stringify({ cycle: h.cycle, sessions: h.sessions }), storedBefore)
      assert.equal(new Set(visited.map(slide => slide.key)).size, visited.length)
      if (target.presetId) assert.equal(data.lesson.antiStress, undefined)
      if (day === 1 && target.moduleId === 'AS2' && !target.presetId)
        assert.ok(visited.some(slide => slide.kind.startsWith('day1-')), 'AS2 day 1 uses its genuine special sequence')
      if (target.routerVersion === router.ANTISTRESS_ROUTER_VERSION && target.moduleId !== 'AS2')
        assert.equal(visited.some(slide => slide.kind.startsWith('day1-')), false, 'A routed lesson cannot be acknowledged as AS2 day 1')
      if (day === 1 || day === 14) {
        const actualKeys = submitted.visitedSlideKeys
        const swapped = [...actualKeys]; [swapped[1], swapped[2]] = [swapped[2], swapped[1]]
        const duplicate = [...actualKeys]; duplicate[1] = duplicate[0]
        for (const invalid of [undefined, [], actualKeys.slice(1), actualKeys.slice(0, -1), swapped, duplicate,
          [...actualKeys, 'unrendered-extra-screen'], 'welcome', { keys: actualKeys }]) {
          await assert.rejects(h.command({ ...submitted, visitedSlideKeys: invalid }, locale),
            { name: 'AppError', code: 'COURSE_SLIDES_INCOMPLETE' },
            'Missing, partial, duplicate, reordered or fabricated acknowledgement cannot complete the lesson')
          assert.equal(h.writes.length, writes)
          assert.equal(JSON.stringify({ cycle: h.cycle, sessions: h.sessions }), storedBefore,
            'The real repository rejects invalid ACKs before inserting a session or completing a cycle')
        }
      }
      const saved = await h.command(submitted, locale)
      const record = h.sessions.find(row => row.day_number === day)
      assert.ok(record); assert.equal(record.lesson_id, data.lesson.id)
      assert.equal(saved.currentSession.completedAt, record.completed_at)
      assert.equal(Object.hasOwn(record.signals, 'visitedSlideKeys'), false,
        'An ordering acknowledgement is not stored as learning or clinical evidence')
      const savedBefore = JSON.stringify({ course: h.course, cycle: h.cycle, sessions: h.sessions }), savedWrites = h.writes.length
      const replayWithoutAck = { ...submitted }; delete replayWithoutAck.visitedSlideKeys
      const replay = await h.command(replayWithoutAck, locale)
      assert.equal(replay.currentSession.completedAt, record.completed_at)
      assert.equal(replay.lesson.id, data.lesson.id)
      assert.equal(h.writes.length, savedWrites, 'An existing operation remains idempotent without a new ACK')
      assert.equal(JSON.stringify({ course: h.course, cycle: h.cycle, sessions: h.sessions }), savedBefore)
    }
  })
}
