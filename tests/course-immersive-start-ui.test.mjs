import test from 'node:test'
import assert from 'node:assert/strict'
import { mount, nodes, textOf, findButton, findPart, dailyView, access } from './helpers/course-ui-harness.mjs'

const snapshot = (courseId = 'course-a', cycleId = 'cycle-a', extra = {}) => dailyView(courseId, cycleId, {
  programme: { id: 'stress', title: 'Synthetic anti-stress course' },
  lesson: { id: 'lesson-a', title: 'Synthetic practice', sections: [] },
  roadmap: [{ day: 1, title: 'Synthetic first skill', status: 'current' }],
  ...extra,
})
const primary = h => nodes(h.tree).find(node => node.type === 'button' && node.props['data-course-today-primary'] !== undefined)

for (const locale of ['en', 'ru']) {
  test(`real immersive ${locale} buttons open the lesson, path, details and course exit without writes`, async () => {
    let exits = 0
    const h = mount('course-today', {
      props: { locale, accountId: 'owner-a', courseId: 'course-a', onExit: () => { exits++ } },
      fetcher: () => snapshot(),
    })
    try {
      await h.settle()
      assert.equal(h.tree.props['data-course-immersive'], 'true')
      assert.ok(nodes(h.tree).some(node => node.props['data-course-scenic-hero'] !== undefined))
      assert.ok(textOf(h.tree).includes('Synthetic first skill'))
      const progress = nodes(h.tree).find(node => node.type === 'progress')
      assert.equal(progress.props.value, 0)
      assert.equal(progress.props.max, 14)
      assert.equal(primary(h).props.disabled, false)
      assert.ok(textOf(primary(h)).includes(locale === 'ru' ? 'Начать мой курс' : 'Start my course'))

      primary(h).props.onClick()
      await h.settle()
      const player = findPart(h.tree, 'CourseSlidePlayer')
      assert.ok(player)
      player.props.onClose()
      await h.settle()

      findButton(h.tree, locale === 'ru' ? 'Все 14 дней' : 'See all 14 days').props.onClick()
      await h.settle()
      assert.equal(h.tree.props['data-course-view'], 'path')
      assert.ok(findPart(h.tree, 'CourseQuestMap'))
      findButton(h.tree, locale === 'ru' ? 'Сегодня' : 'Today').props.onClick()
      await h.settle()

      findButton(h.tree, locale === 'ru' ? 'О курсе' : 'Course details').props.onClick()
      await h.settle()
      assert.equal(h.tree.props['data-course-view'], 'details')
      findButton(h.tree, locale === 'ru' ? 'Сегодня' : 'Today').props.onClick()
      await h.settle()
      nodes(h.tree).find(node => node.type === 'button' && node.props['aria-label'] ===
        (locale === 'ru' ? 'Вернуться к моим курсам' : 'Back to my courses')).props.onClick()
      assert.equal(exits, 1)
      assert.equal(h.calls.filter(call => call.body).length, 0)
    } finally {
      h.unmount()
    }
  })
}

test('real immersive start retains owner/course guards and paused-capacity disabled state', async () => {
  const h = mount('course-today', {
    props: { accountId: 'owner-a', courseId: 'course-a' },
    fetcher: path => path.includes('course-b') ? snapshot('course-b', 'cycle-b') : snapshot(),
  })
  try {
    await h.settle()
    const staleStart = primary(h).props.onClick
    h.render({ accountId: 'owner-b', courseId: 'course-b' })
    await h.settle()
    const count = h.calls.length
    staleStart()
    await h.settle()
    assert.equal(findPart(h.tree, 'CourseSlidePlayer'), undefined)
    assert.equal(h.calls.length, count)
    primary(h).props.onClick()
    await h.settle()
    assert.equal(findPart(h.tree, 'CourseSlidePlayer').props.data.cycle.id, 'cycle-b')
    assert.equal(h.calls.filter(call => call.body).length, 0)
  } finally {
    h.unmount()
  }

  const paused = mount('course-today', {
    props: { accountId: 'owner-a', courseId: 'course-a' },
    fetcher: () => snapshot('course-a', 'cycle-a', {
      cycle: { ...dailyView().cycle, status: 'paused' },
      access: { ...access, activeCourseLimit: 1, activeCourseCount: 1 },
    }),
  })
  try {
    await paused.settle()
    assert.equal(primary(paused).props.disabled, true)
    primary(paused).props.onClick()
    await paused.settle()
    assert.equal(findPart(paused.tree, 'CourseSlidePlayer'), undefined)
    assert.equal(paused.calls.filter(call => call.body).length, 0)
  } finally {
    paused.unmount()
  }
})
