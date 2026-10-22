import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
  ENERGYWORK_VERSION, ENERGYWORK_P9_VERSION,
  ENERGYWORK_LESSON_ANSWER_IDS, ENERGYWORK_REPORT_IDS,
  ENERGYWORK_COMMON, ENERGYWORK_INITIATION,
  energyworkP9ResumeId, energyworkSequence, energyworkLessonRanges,
} from '../data/academy/energywork-ai-schema.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const editorial = read('data/academy/energywork-ai-curriculum.ts')
const repository = read('lib/academy/energywork-course-repository.js')
const learner = read('components/energywork-ai-learner.tsx')
const migration = read('supabase/migrations/20261020212000_hh_academy_reiki_trim_lesson5_p10_20261020.sql')

const removed = {
  'intention-02': 'paths-03',
  'intention-01': 'paths-03',
  'intention-03': 'paths-03',
  'paths-04': 'intention-04',
  'boundaries-01': 'paths-03',
  'boundaries-02': 'paths-03',
  'boundaries-04': 'paths-03',
  'paths-02': 'paths-03',
  'init-01': 'init-02',
  'boundaries-03': 'end-02',
}

test('Previously retired screens and three newly removed lesson-five screens are absent in EN/RU', () => {
  const sequence = energyworkSequence()
  const ranges = energyworkLessonRanges(sequence)
  assert.equal(ENERGYWORK_VERSION, '2026-10-20.p10')
  assert.equal(ENERGYWORK_P9_VERSION, '2026-10-19.p9')
  assert.equal(sequence.length, 60)
  assert.deepEqual(ranges.map(range => range.count), [8, 14, 16, 14, 6])
  assert.deepEqual(sequence.slice(ranges[4].start), [
    'paths-01','paths-03','init-02','end-01','intention-04','end-02',
  ])
  for (const id of Object.keys(removed)) {
    assert.ok(!sequence.includes(id), id + ' must not be navigable')
    assert.ok(!ENERGYWORK_COMMON.includes(id) && !ENERGYWORK_INITIATION.includes(id))
    assert.doesNotMatch(editorial, new RegExp('id: "' + id + '", phase:'))
  }
  assert.match(editorial, /withClosingPractices\(finalLesson, \["intention-04"\], "end-02"\)/)
})

test('Historical p9 and p10 cursors advance safely without deleting encrypted answers', () => {
  for (const [retiredId, nextId] of Object.entries(removed)) {
    assert.equal(energyworkP9ResumeId(retiredId), nextId)
    assert.ok(energyworkSequence().includes(nextId))
  }
  assert.equal(energyworkP9ResumeId('end-01'),'end-01')
  assert.match(repository, /const activeSlideId = energyworkP9ResumeId\(row\.slide_id\)/)
  assert.match(repository, /\[ENERGYWORK_VERSION, ENERGYWORK_P9_VERSION\]\.includes\(progress\.course_version\)/)
  assert.match(repository, /ENERGYWORK_P8_VERSION \|\|/)
  assert.doesNotMatch(migration, /delete from|truncate|drop table|drop column|update\s+app_private\.academy_course_progress/i)
})

test('Initiation request and five meditation reports remain; removed fifth quiz is not required', () => {
  assert.deepEqual(ENERGYWORK_REPORT_IDS, ['flight-04','tan-04','kun-04','ygg-04','end-01'])
  assert.ok(!ENERGYWORK_LESSON_ANSWER_IDS.includes('init-01'))
  assert.match(editorial, /lesson: "initiation", reportId: "end-01", questionId: "end-01", questionIds: \[\]/)
  assert.match(learner, /item\.questionIds\.length > 0 \? <button/)
  assert.match(learner, /data-initiation-readiness/)
  assert.doesNotMatch(learner, /jumpToSlide\("paths-04"\)/)
  assert.match(learner, /jumpToSlide\(nextIncompleteSlide \?\? "end-01"\)/)
  assert.match(migration, /'2026-10-19\.p9', '2026-10-20\.p10'/)
})
