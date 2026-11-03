import test from 'node:test'
import assert from 'node:assert/strict'
import { mount, nodes, textOf, findPart, deferred } from './helpers/course-ui-harness.mjs'
import { buildCourseSlides } from '../lib/inner-growth/course-slide-sequence.js'
import { DAY_ONE_SLIDES } from '../lib/inner-growth/anti-stress-day-one.js'
import { lessonFor, COURSE_ANTISTRESS_OUTCOME_V3 } from '../lib/inner-growth/lesson-library.js'

// The shared harness executes the real Player JSX and its state/effects. Visits
// come from the rendered data-slide-key, not an invented acknowledgement array.
// Child callbacks below are the genuine props emitted by the Player; no browser,
// network, billing provider, account data or database is involved.
function playerFixture(t, { locale, day = 14, promotion, save = async () => true }) {
  const submissions = [], observed = []
  let props = {
    locale,
    data: {
      cycle: { id: 'synthetic-offer-ack-cycle', day, durationDays: 14, preferences: {} },
      programme: { id: 'stress' },
      lesson: lessonFor('calm_regulation', day, locale, 'standard', COURSE_ANTISTRESS_OUTCOME_V3),
      target: { label: 'Synthetic fixture focus' }, progress: { practiceCount: 0 },
    },
    promotion: promotion || { show: true, checking: false, checkoutReady: true },
    onClose() {},
    onCheckin() { assert.fail('Navigation alone must not save a check-in') },
    onPreferences() { assert.fail('Navigation alone must not change preferences') },
    async onSession(payload) { submissions.push(payload); return save(payload, submissions.length) },
  }
  const h = mount('course-slide-player', { props })
  t.after(() => h.unmount())
  const content = () => nodes(h.tree).find(node => node.props?.['data-slide-scroller'])
  const kind = () => content()?.props['data-slide-kind']
  const record = () => {
    const key = content()?.props['data-slide-key']
    if (key && observed.at(-1) !== key) observed.push(key)
  }
  const settle = async () => { await h.settle(); record() }
  const button = className => nodes(h.tree).find(node => node.type === 'button' && node.props.className === className)
  const click = async node => {
    assert.ok(node, 'Expected a rendered button')
    assert.notEqual(node.props.disabled, true, 'Only available controls are clicked')
    node.props.onClick()
    await settle()
  }
  const next = () => click(button('primary'))
  const until = async target => {
    for (let step = 0; step < 40 && kind() !== target; step++) {
      assert.notEqual(kind(), 'completion', `Unexpected completion before ${target}`)
      await next()
    }
    assert.equal(kind(), target)
  }
  const replacePromotion = async promotion => {
    props = { ...props, promotion }
    h.render(props)
    // Check the first render as well as the settled render: there must be no
    // transient success receipt before the pending server response arrives.
    assert.notEqual(kind(), 'completion', 'Eligibility alone cannot confirm a saved lesson')
    await settle()
  }
  const expectedKeys = day === 1 ? DAY_ONE_SLIDES.map(slide => slide.key)
    : buildCourseSlides(props.data.lesson).map(slide => slide.key)
  const assertAck = payload => {
    const renderedCoreKeys = [...new Set(observed.filter(key => key !== 'free-course-offer'))]
    assert.deepEqual(renderedCoreKeys, expectedKeys, 'Every core screen was genuinely rendered')
    assert.deepEqual(Array.from(payload.visitedSlideKeys), renderedCoreKeys, 'ACK matches actual visited core screens')
    assert.ok(!Object.hasOwn(payload, 'moduleActivityChoice'), 'No duplicate generic practice signal')
  }
  record()
  return { h, submissions, observed, expectedKeys, content, kind, record, settle, button, click, next, until, replacePromotion, assertAck }
}

async function assertReplayHasNoOffer(f, locale) {
  assert.equal(f.kind(), 'completion')
  for (let step = 0; step < 3 && !nodes(f.h.tree).some(node => node.type === 'button' &&
    textOf(node).trim() === (locale === 'ru' ? 'Перечитать занятие' : 'Read the lesson again')); step++) await f.next()
  const replay = nodes(f.h.tree).find(node => node.type === 'button' &&
    textOf(node).trim() === (locale === 'ru' ? 'Перечитать занятие' : 'Read the lesson again'))
  await f.click(replay)
  assert.equal(f.kind(), 'baseline')
  const beforeReplay = f.observed.length
  await f.until('feedback')
  assert.equal(f.observed.slice(beforeReplay).includes('free-course-offer'), false)
  assert.equal(f.submissions.length, 1, 'Reading the saved lesson does not submit another session')
}

for (const locale of ['en', 'ru']) {
  test(`final Free offer is the last unsaved slide; ACK and replay stay independent of payment (${locale})`, async t => {
    const f = playerFixture(t, { locale })
    await f.until('course-offer')
    assert.equal(f.submissions.length, 0)
    assert.deepEqual(f.observed, [...f.expectedKeys, 'free-course-offer'])
    const link = nodes(f.h.tree).find(node => node.type === 'a' && node.props.className === 'promoLink')
    assert.equal(link.props.href, `/${locale}/app/course?add=1`)
    assert.equal(link.props.target, '_blank')
    assert.ok(textOf(f.h.tree).includes(locale === 'ru' ? 'Первый месяц 10 €' : 'First month €10'))
    assert.doesNotMatch(textOf(f.h.tree), /ONE MONTHLY PLAN|ЕДИНЫЙ ПЛАТНЫЙ ТАРИФ/)
    await f.next()
    assert.equal(f.kind(), 'completion')
    assert.equal(f.submissions.length, 1)
    f.assertAck(f.submissions[0])
    assert.equal(f.content().props['data-slide-key'], undefined)
    await assertReplayHasNoOffer(f, locale)
  })

  for (const duringSave of [false, true]) {
    test(`offer eligibility disappearing ${duringSave ? 'during' : 'before'} save cannot create a false receipt (${locale})`, async t => {
      const response = deferred()
      const f = playerFixture(t, { locale, save: () => response.promise })
      await f.until('course-offer')
      if (duringSave) {
        await f.next()
        assert.equal(f.submissions.length, 1)
        assert.equal(f.button('primary').props.disabled, true)
      }
      await f.replacePromotion({ show: false, checking: false })
      assert.equal(f.kind(), 'feedback')
      assert.equal(nodes(f.h.tree).some(node => node.props?.['data-course-slide-completion']), false)
      if (!duringSave) {
        assert.equal(f.submissions.length, 0)
        await f.next()
      }
      assert.equal(f.submissions.length, 1)
      assert.equal(f.kind(), 'feedback')
      response.resolve(true)
      await f.settle()
      assert.equal(f.kind(), 'completion')
      f.assertAck(f.submissions[0])
    })
  }

  test(`late eligibility during a pending successful save never becomes a post-save offer (${locale})`, async t => {
    const response = deferred()
    const f = playerFixture(t, { locale, promotion: { show: false, checking: true }, save: () => response.promise })
    await f.until('feedback')
    await f.next()
    assert.equal(f.submissions.length, 1)
    await f.replacePromotion({ show: true, checking: false, checkoutReady: true })
    assert.equal(f.kind(), 'feedback')
    assert.equal(f.button('primary').props.disabled, true)
    response.resolve(true)
    await f.settle()
    assert.equal(f.kind(), 'completion')
    assert.equal(f.observed.includes('free-course-offer'), false)
    f.assertAck(f.submissions[0])
    await assertReplayHasNoOffer(f, locale)
  })

  test(`failed final save preserves its operation ID and a repeated click cannot create another request (${locale})`, async t => {
    const firstResponse = deferred()
    const f = playerFixture(t, { locale, save: (_payload, attempt) => attempt === 1 ? firstResponse.promise : true })
    await f.until('course-offer')
    const saveButton = f.button('primary')
    saveButton.props.onClick()
    saveButton.props.onClick()
    await f.settle()
    assert.equal(f.submissions.length, 1)
    assert.equal(f.kind(), 'course-offer')
    firstResponse.resolve(false)
    await f.settle()
    assert.equal(f.kind(), 'course-offer')
    assert.ok(nodes(f.h.tree).some(node => node.props?.role === 'alert'))
    f.assertAck(f.submissions[0])
    await f.next()
    assert.equal(f.kind(), 'completion')
    assert.equal(f.submissions.length, 2)
    assert.equal(f.submissions[0].operationId, f.submissions[1].operationId)
    f.assertAck(f.submissions[1])
  })

  test(`day-one double Stop reaches the neutral exit once and ACK covers all 15 screens (${locale})`, async t => {
    const f = playerFixture(t, { locale, day: 1, promotion: { show: false } })
    await f.until('day1-practice')
    const child = findPart(f.h.tree, 'DayOneExercise')
    assert.equal(child.props.kind, 'day1-practice')
    child.props.onStopPractice()
    child.props.onStopPractice()
    await f.settle()
    assert.equal(f.kind(), 'day1-exit')
    assert.equal(findPart(f.h.tree, 'DayOneExercise').props.neutralMode, true)
    assert.equal(f.submissions.length, 0)
    await f.next()
    assert.equal(f.kind(), 'day1-anchor', 'The exit cannot be skipped by a duplicate Stop callback')
    for (let step = 0; step < 20 && f.kind() !== 'completion'; step++) await f.next()
    assert.equal(f.kind(), 'completion')
    assert.equal(f.submissions.length, 1)
    assert.equal(f.submissions[0].dayOneAnswers.practiceAttempt, 'stopped')
    f.assertAck(f.submissions[0])
    assert.equal(f.expectedKeys.length, 15)
  })

  test(`returning to early day-one slides stays neutral and still acknowledges every core screen (${locale})`, async t => {
    const f = playerFixture(t, { locale, day: 1, promotion: { show: false } })
    await f.until('day1-prepare')
    findPart(f.h.tree, 'DayOneExercise').props.onDiscomfort()
    await f.settle()
    const support = nodes(f.h.tree).find(node => node.props?.['data-course-discomfort-support'])
    assert.ok(support)
    const neutral = nodes(support).find(node => node.type === 'button')
    await f.click(neutral)
    assert.equal(findPart(f.h.tree, 'DayOneExercise').props.neutralMode, true)
    for (let step = 0; step < 5; step++) await f.click(f.button('back'))
    assert.equal(f.kind(), 'welcome')
    const neutralCore = []
    for (let step = 0; step < 20 && f.kind() !== 'completion'; step++) {
      const key = f.content().props['data-slide-key']
      neutralCore.push(key)
      if (neutralCore.length <= 5) {
        assert.ok(nodes(f.h.tree).some(node => node.props?.['data-course-day-one-neutral-early']))
        assert.equal(findPart(f.h.tree, 'CoursePracticeVoice'), undefined)
      } else assert.equal(findPart(f.h.tree, 'DayOneExercise').props.neutralMode, true)
      await f.next()
    }
    assert.equal(f.kind(), 'completion')
    assert.deepEqual(neutralCore, f.expectedKeys, 'Neutral alternatives do not jump over required screens')
    assert.equal(f.submissions.length, 1)
    assert.equal(f.submissions[0].feedback, 'uncomfortable')
    assert.equal(f.submissions[0].comfort, 'uncomfortable')
    f.assertAck(f.submissions[0])
  })
}
