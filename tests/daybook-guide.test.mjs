import test from 'node:test'
import assert from 'node:assert/strict'
import {
  GUIDE_WEEKS, GUIDE_LEVELS, getGuideTask, guideTag, guideText,
  parseGuideEntry, guideRecords, guideReadable, guideProgress,
} from '../lib/app/daybook-guide.mjs'
import {STAGES, stageTag, stageText} from '../lib/app/daybook-stages.mjs'

const note = ({weekId = 'discover', level = 1, stepId = 'situation', answers = {}, completed = false, goalId = 'goal-a', id = 'note-a', updatedAt = '2026-11-24T00:00:00Z'} = {}) => ({
  id, kind: 'note', goalId, updatedAt,
  tags: [guideTag(weekId, level, stepId)],
  text: guideText({weekId, level, stepId, answers, completed}),
})
const rewrite = (entry, update) => ({...entry, text: JSON.stringify({...JSON.parse(entry.text), ...update})})

test('seven weeks retain canonical order, all original questions and three languages', () => {
  assert.deepEqual(GUIDE_WEEKS.map(week => week.id), ['discover', 'vision', 'plan', 'resources', 'obstacles', 'options', 'progress'])
  assert.deepEqual(GUIDE_WEEKS.map(week => week.number), [1, 2, 3, 4, 5, 6, 7])
  assert.deepEqual(GUIDE_LEVELS.map(level => level.id), [1, 2, 3, 4])
  const resources = new Set(['tests', 'vectors', 'plan', 'goals', 'today', 'courses', 'videos'])
  for (const week of GUIDE_WEEKS) {
    const original = STAGES.find(stage => stage.id === week.id)
    assert.equal(week.steps.length, 7)
    assert.equal(new Set(week.steps.map(step => step.id)).size, 7)
    const fields = week.steps.flatMap(step => step.fields)
    for (const key of original.keys) {
      const retained = fields.filter(field => field.id === key)
      assert.equal(retained.length, 1, `${week.id}.${key} must be preserved once`)
      for (const locale of ['en', 'ru', 'es']) assert.equal(retained[0].label[locale], original[locale][original.keys.indexOf(key) + 2])
    }
    for (const locale of ['en', 'ru', 'es']) {
      assert.ok(week.title[locale])
      assert.ok(week.subtitle[locale])
      for (const step of week.steps) {
        assert.ok(step.title[locale])
        assert.ok(step.description[locale])
        assert.ok(step.fields.length > 0)
        for (const field of step.fields) {
          assert.ok(field.label[locale])
          assert.ok(['text', 'rating'].includes(field.type))
          assert.equal(typeof field.required, 'boolean')
        }
        for (const resource of step.resources) assert.ok(resources.has(resource))
      }
    }
  }
  assert.equal(STAGES.reduce((sum, stage) => sum + stage.keys.length, 0), 39)
  assert.deepEqual(GUIDE_WEEKS.filter(week => week.steps.some(step => step.resources.includes('videos'))).map(week => week.number), [4, 5, 7])
  for (const level of GUIDE_LEVELS) for (const locale of ['en', 'ru', 'es']) {
    assert.ok(level.title[locale])
    assert.ok(level.description[locale])
    assert.ok(level.priceLabel[locale])
  }
  assert.match(GUIDE_LEVELS[1].priceLabel.en, /Guide price: 100 XP/)
  assert.match(GUIDE_LEVELS[2].priceLabel.en, /Guide price: 250 XP/)
})

test('every free task round-trips with its own required answers and readable labels', () => {
  for (const week of GUIDE_WEEKS) for (const step of week.steps) {
    const answers = Object.fromEntries(step.fields.map(field => [field.id, field.type === 'rating' ? '0' : `  Answer for ${field.id}  `]))
    const entry = note({weekId: week.id, stepId: step.id, answers, completed: true})
    const parsed = parseGuideEntry(entry)
    assert.equal(parsed.format, 'hh-guide-v1')
    assert.equal(parsed.week, week.id)
    assert.equal(parsed.step, step.id)
    assert.equal(parsed.completed, true)
    for (const field of step.fields) assert.equal(parsed.answers[field.id], answers[field.id].trim())
    for (const locale of ['en', 'ru', 'es']) {
      const readable = guideReadable(entry, locale)
      assert.ok(readable.includes(step.title[locale]))
      assert.ok(readable.includes(step.fields[0].label[locale]))
    }
    assert.equal(guideReadable(entry, 'unknown'), guideReadable(entry, 'en'))
  }
})

test('saving a draft does not complete a task; completion requires every required answer', () => {
  const draft = note()
  assert.deepEqual(parseGuideEntry(draft).answers, {})
  assert.equal(parseGuideEntry(draft).completed, false)
  assert.throws(() => note({completed: true}), /GUIDE_RESULT_REQUIRED/)
  assert.throws(() => note({answers: {situation: '  \n\t '}, completed: true}), /GUIDE_RESULT_REQUIRED/)
  assert.equal(parseGuideEntry(rewrite(draft, {completed: true})), null)
  assert.throws(() => note({weekId: 'review', stepId: 'summary', answers: {result: 'A result'}, completed: true}), /GUIDE_RESULT_REQUIRED/)
  const review = note({weekId: 'review', stepId: 'summary', answers: {result: 'Result', changes: 'Changes', direction: 'Next direction'}, completed: true})
  assert.equal(parseGuideEntry(review).completed, true)
  assert.equal(getGuideTask('review', 2, 'preparation'), null)
  assert.equal(getGuideTask('review', 1, 'situation'), null)
})

test('rating zero is a real answer and unrated remains absent', () => {
  const zero = note({weekId: 'resources', stepId: 'energy', answers: {rating: '0'}, completed: true})
  assert.equal(parseGuideEntry(zero).answers.rating, '0')
  assert.match(guideReadable(zero, 'ru'), /0\/10/)
  assert.equal(parseGuideEntry(note({weekId: 'resources', stepId: 'energy'})).answers.rating, undefined)
  for (const rating of ['11', '-1', '2.5', '01', 'NaN']) {
    assert.throws(() => note({weekId: 'resources', stepId: 'energy', answers: {rating}}), /GUIDE_RATING_INVALID/)
    assert.equal(parseGuideEntry(rewrite(zero, {answers: {rating}})), null)
  }
})

test('unknown tasks, fields, formats, types and malformed metadata fail closed', () => {
  const entry = note({answers: {situation: 'Present situation'}})
  const malformed = [
    null,
    {...entry, kind: 'goal'},
    {...entry, tags: null},
    {...entry, tags: []},
    {...entry, tags: ['daybook-guide:vision:1:vision']},
    {...entry, text: null},
    {...entry, text: 'ordinary journal note'},
    {...entry, text: 'null'},
    {...entry, text: '[]'},
    rewrite(entry, {format: 'hh-guide-v2'}),
    rewrite(entry, {week: 'unknown'}),
    rewrite(entry, {step: 'unknown'}),
    rewrite(entry, {level: '1'}),
    rewrite(entry, {level: 0}),
    rewrite(entry, {level: 1.5}),
    rewrite(entry, {level: 5}),
    rewrite(entry, {completed: 'true'}),
    rewrite(entry, {answers: null}),
    rewrite(entry, {answers: []}),
    rewrite(entry, {answers: {unknown: 'answer'}}),
    rewrite(entry, {answers: {situation: 12}}),
    rewrite(entry, {answers: {situation: {text: 'answer'}}}),
    rewrite(entry, {answers: JSON.parse('{"__proto__":"injected"}')}),
    rewrite(entry, {goalId: 'another-goal'}),
  ]
  for (const candidate of malformed) assert.equal(parseGuideEntry(candidate), null)
  assert.throws(() => guideTag('unknown', 1, 'situation'), /GUIDE_TASK_INVALID/)
  assert.throws(() => guideText(null), /GUIDE_ANSWERS_INVALID/)
  assert.throws(() => note({answers: {situation: 1}}), /GUIDE_ANSWERS_INVALID/)
  assert.throws(() => note({answers: {unknown: 'answer'}}), /GUIDE_ANSWERS_INVALID/)
  assert.equal(getGuideTask('discover', 2, 'situation'), null)
  assert.equal(getGuideTask('discover', 1, 'preparation'), null)
})

test('answer and serialized-note limits protect both writes and reads', () => {
  const boundary = note({answers: {situation: 'x'.repeat(1200)}, completed: true})
  assert.equal(parseGuideEntry(boundary).answers.situation.length, 1200)
  assert.throws(() => note({answers: {situation: 'x'.repeat(1201)}}), /GUIDE_ANSWER_TOO_LONG/)
  assert.equal(parseGuideEntry(rewrite(boundary, {answers: {situation: 'x'.repeat(1201)}})), null)
  assert.notEqual(parseGuideEntry({...boundary, text: boundary.text.padEnd(19999, ' ')}), null)
  assert.equal(parseGuideEntry({...boundary, text: boundary.text.padEnd(20000, ' ')}), null)
  // Escaping can make a serialized note exceed the total limit even when each field fits.
  const escaped = '\u0000'.repeat(1200)
  assert.throws(() => note({weekId: 'review', stepId: 'summary', answers: {result: escaped, changes: escaped, direction: escaped}}), /GUIDE_TEXT_TOO_LONG/)
})

test('records isolate goals, weeks, levels, steps and unattached drafts', () => {
  const first = note({id: 'a', answers: {situation: 'Goal A'}})
  const anotherGoal = note({id: 'b', goalId: 'goal-b', answers: {situation: 'Goal B'}})
  const anotherStep = note({id: 'c', stepId: 'area', answers: {area: 'Area'}})
  const anotherWeek = note({id: 'd', weekId: 'vision', stepId: 'vision', answers: {vision: 'Vision'}})
  const preparation = note({id: 'e', level: 2, stepId: 'preparation', answers: {request: 'Request'}})
  const unattached = note({id: 'f', goalId: null, answers: {situation: 'Unattached'}})
  const missingGoal = {...unattached, id: 'g'}
  delete missingGoal.goalId
  const entries = [first, anotherGoal, anotherStep, anotherWeek, preparation, unattached, missingGoal, null]
  assert.deepEqual(guideRecords(entries, 'goal-a', 'discover', 1, 'situation').map(entry => entry.id), ['a'])
  assert.deepEqual(guideRecords(entries, 'goal-b', 'discover', 1, 'situation').map(entry => entry.id), ['b'])
  assert.deepEqual(guideRecords(entries, null, 'discover', 1, 'situation').map(entry => entry.id), ['f'])
  assert.deepEqual(guideRecords(entries, 'goal-a', 'discover', 2, 'preparation').map(entry => entry.id), ['e'])
  for (const invalidGoal of [undefined, '', 0, false]) assert.deepEqual(guideRecords(entries, invalidGoal, 'discover', 1, 'situation'), [])
  assert.deepEqual(guideRecords(null, 'goal-a', 'discover', 1, 'situation'), [])
  assert.deepEqual(guideRecords(entries, 'goal-a', 'unknown', 1, 'situation'), [])
})

test('unrelated journal entries are skipped without reading their note payload', () => {
  let unrelatedReads = 0
  const unrelated = Array.from({length: 250}, (_, index) => ({
    id: `unrelated-${index}`, kind: 'note', goalId: 'goal-a',
    tags: [guideTag('vision', 1, 'vision')],
    get text() { unrelatedReads += 1; return 'A long unrelated note' },
  }))
  const selected = note({answers: {situation: 'My selected task'}})
  assert.deepEqual(guideRecords([...unrelated, selected], 'goal-a', 'discover', 1, 'situation').map(entry => entry.id), [selected.id])
  assert.equal(unrelatedReads, 0)
})

test('every guide tag fits the existing 40-character journal tag limit', () => {
  const tags = [guideTag('review', 1, 'summary')]
  for (const week of GUIDE_WEEKS) {
    for (const step of week.steps) tags.push(guideTag(week.id, 1, step.id))
    for (const level of [2, 3, 4]) tags.push(guideTag(week.id, level, 'preparation'))
  }
  assert.equal(tags.length, 71)
  assert.equal(new Set(tags).size, 71)
  for (const tag of tags) assert.ok(tag.length <= 40, `${tag} exceeds the journal tag limit`)
})

test('progress uses the latest valid record per free task and excludes other goals and weeks', () => {
  const oldCompleted = note({id: 'old', answers: {situation: 'Finished'}, completed: true, updatedAt: '2026-11-23T00:00:00Z'})
  const newDraft = note({id: 'new', answers: {situation: 'Revising'}, updatedAt: '2026-11-24T00:00:00Z'})
  const completedArea = note({id: 'area', stepId: 'area', answers: {area: 'My area'}, completed: true})
  const otherGoal = note({id: 'other-goal', goalId: 'goal-b', answers: {situation: 'Different goal'}, completed: true})
  const otherWeek = note({id: 'other-week', weekId: 'vision', stepId: 'vision', answers: {vision: 'A vision'}, completed: true})
  const entries = [oldCompleted, newDraft, completedArea, otherGoal, otherWeek]
  assert.deepEqual(guideRecords(entries, 'goal-a', 'discover', 1, 'situation').map(entry => entry.id), ['new', 'old'])
  assert.deepEqual(guideProgress(entries, 'goal-a', 'discover'), {completed: 1, total: 7})
  assert.deepEqual(guideProgress(entries, 'goal-b', 'discover'), {completed: 1, total: 7})
  assert.deepEqual(guideProgress(entries, 'goal-a', 'vision'), {completed: 1, total: 7})
  assert.deepEqual(guideProgress(entries, 'goal-c', 'discover'), {completed: 0, total: 7})
  assert.deepEqual(guideProgress(entries, 'goal-a', 'unknown'), {completed: 0, total: 7})
  assert.deepEqual(guideRecords([note({id: 'b'}), note({id: 'a'})], 'goal-a', 'discover', 1, 'situation').map(entry => entry.id), ['a', 'b'])
  const allDone = GUIDE_WEEKS[0].steps.map(step => note({stepId: step.id, answers: Object.fromEntries(step.fields.map(field => [field.id, 'A real answer'])), completed: true}))
  assert.deepEqual(guideProgress(allDone, 'goal-a', 'discover'), {completed: 7, total: 7})
})

test('paid-level preparation cannot be counted as completed work', () => {
  const entries = []
  for (const level of [2, 3, 4]) {
    const task = getGuideTask('discover', level, 'preparation')
    assert.deepEqual(task.fields.map(field => field.id), ['request', 'result'])
    const entry = note({level, stepId: 'preparation', answers: {request: 'My question', result: 'My desired result'}})
    assert.equal(parseGuideEntry(entry).completed, false)
    assert.throws(() => note({level, stepId: 'preparation', answers: {request: 'My question', result: 'My desired result'}, completed: true}), /GUIDE_PREPARATION_ONLY/)
    assert.equal(parseGuideEntry(rewrite(entry, {completed: true})), null)
    entries.push(entry)
  }
  assert.deepEqual(guideProgress(entries, 'goal-a', 'discover'), {completed: 0, total: 7})
})

test('each supported preparation level follows the selected week without introducing early video work', () => {
  const resources = new Set(['tests', 'vectors', 'plan', 'goals', 'today', 'courses', 'videos'])
  for (const locale of ['en', 'ru', 'es']) {
    const titles = new Set()
    const descriptions = new Set()
    for (const week of GUIDE_WEEKS) for (const level of [2, 3, 4]) {
      const selected = getGuideTask(week.id, level, 'preparation')
      assert.equal(selected.id, 'preparation')
      assert.deepEqual(selected.fields.map(field => field.id), ['request', 'result'])
      assert.ok(selected.title[locale])
      assert.ok(selected.description[locale])
      titles.add(selected.title[locale])
      descriptions.add(selected.description[locale])
      for (const resource of selected.resources) assert.ok(resources.has(resource))
      if ([1, 2, 3, 6].includes(week.number)) assert.equal(selected.resources.includes('videos'), false)
      const entry = note({weekId: week.id, level, stepId: 'preparation', answers: {request: 'My question', result: 'My desired result'}})
      assert.equal(parseGuideEntry(entry).completed, false)
      assert.ok(guideReadable(entry, locale).includes(selected.title[locale]))
    }
    assert.equal(titles.size, 21, `${locale}: each week and level needs a specific title`)
    assert.equal(descriptions.size, 21, `${locale}: each week and level needs a specific instruction`)
  }
  assert.deepEqual(GUIDE_WEEKS.filter(week => getGuideTask(week.id, 3, 'preparation').resources.includes('videos')).map(week => week.number), [4, 5, 7])
})

test('legacy stage notes remain readable without inventing seven completed tasks', () => {
  const stage = STAGES[0]
  const legacy = {
    id: 'legacy', kind: 'note', goalId: 'goal-a', updatedAt: '2026-11-24T00:00:00Z',
    tags: [stageTag(stage.id)], text: stageText(stage, {direction: 'Preserved legacy direction'}, true),
  }
  assert.equal(parseGuideEntry(legacy), null)
  assert.match(guideReadable(legacy, 'ru'), /Preserved legacy direction/)
  assert.equal(guideReadable(legacy, 'unknown'), guideReadable(legacy, 'en'))
  assert.deepEqual(guideProgress([legacy], 'goal-a', 'discover'), {completed: 0, total: 7})
  assert.deepEqual(guideRecords([legacy], 'goal-a', 'discover', 1, 'direction'), [])
  assert.equal(guideReadable({...legacy, text: 'not structured'}, 'en'), null)
})
