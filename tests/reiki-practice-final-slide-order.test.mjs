import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import {
  ENERGYWORK_QUESTIONS,
  energyworkLessonRanges,
  energyworkSequence,
} from '../data/academy/energywork-ai-schema.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const editorial = read('data/academy/energywork-ai-curriculum.ts')
const learner = read('components/energywork-ai-learner.tsx')
const browser = read('scripts/verify-reiki-all-slides-browser.mjs')

test('all five Reiki lessons place music-assisted practice directly before the closing slide', () => {
  const sequence = energyworkSequence()
  const ranges = energyworkLessonRanges()
  assert.equal(sequence.length, 63, 'only the seven requested slide IDs are retired')
  assert.deepEqual(ranges.map(({ count }) => count), [8, 14, 16, 14, 9])

  const endings = [
    { first: 'flight-01', practices: ['flight-03'], last: 'flight-done', report: 'flight-04' },
    { first: 'tan-01', practices: ['tan-03'], last: 'tan-done', report: 'tan-04' },
    { first: 'kun-01', practices: ['kun-03'], last: 'kun-done', report: 'kun-04' },
    { first: 'ygg-01', practices: ['ygg-03'], last: 'ygg-done', report: 'ygg-04' },
    { first: 'paths-01', practices: ['intention-04'], last: 'end-02', report: 'end-01' },
  ]

  for (const [lessonIndex, item] of endings.entries()) {
    const { start, end } = ranges[lessonIndex]
    const ids = sequence.slice(start, end)
    assert.equal(ids[0], item.first, 'lesson ' + (lessonIndex + 1) + ' introduction')
    assert.equal(ids.at(-1), item.last, 'lesson ' + (lessonIndex + 1) + ' congratulations')
    assert.deepEqual(
      ids.slice(-(item.practices.length + 1), -1),
      item.practices,
      'lesson ' + (lessonIndex + 1) + ' practical audio slides immediately precede congratulations',
    )
    assert.ok(
      ids.indexOf(item.report) >= 0 && ids.indexOf(item.report) < ids.indexOf(item.practices[0]),
      'lesson ' + (lessonIndex + 1) + ' reflection precedes the final practice',
    )
    for (const practice of item.practices) {
      assert.equal(sequence.filter(id => id === practice).length, 1, practice + ' appears once')
      assert.equal(ENERGYWORK_QUESTIONS[practice], 'choice', practice + ' keeps answer contract')
      assert.ok(editorial.includes('id: "' + practice + '"'), practice + ' remains in editorial source')
    }
  }

  // Intro to initiation really begins the fifth lesson rather than being
  // appended to the fourth lesson's Yggdrasil progress indicator.
  assert.ok(sequence.indexOf('paths-01') < sequence.indexOf('intention-01'))
  assert.ok(sequence.indexOf('paths-01') < sequence.indexOf('init-02'))
  assert.ok(sequence.indexOf('paths-01') > sequence.indexOf('ygg-done'))
})

test('existing practice timers retain soundtrack, pause, answers and previous/next navigation', () => {
  assert.match(editorial, /function withClosingPractices\(/)
  assert.match(editorial, /withClosingPractices\(commonSlides\.filter\(\(slide\) => slide\.phase === "flight"\), \["flight-03"\], "flight-done"\)/)
  assert.match(editorial, /\["tan-03"\], "tan-done"\)/)
  assert.match(editorial, /withClosingPractices\(pathSlides\.kundalini, \["kun-03"\], "kun-done"\)/)
  assert.match(editorial, /withClosingPractices\(pathSlides\.yggdrasil, \["ygg-03"\], "ygg-done"\)/)
  assert.match(editorial, /withClosingPractices\(finalLesson, \["intention-04"\], "end-02"\)/)
  assert.match(learner, /slide\.kind === "practice" \? <PracticeTimer key=\{slide\.id\}/)
  assert.match(learner, /useOceanPracticeAudio\(\)/)
  assert.match(learner, /ocean\.pause\(\)/)
  assert.match(learner, /data-energywork-next/)
  assert.match(learner, /async function previous\(\)/)
  assert.match(browser, /one-minute music-assisted practice before congratulations/)
})
