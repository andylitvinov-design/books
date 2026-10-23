import { OPORA_SKILL_SLIDE_MODEL } from '../lib/inner-growth/anti-stress-skills-v5.js'
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { lessonFor, TRACKS, COURSE_CONTENT_VERSION, COURSE_CONTENT_V3, COURSE_CONTENT_V4 } from '../lib/inner-growth/lesson-library.js'

const source = readFileSync(new URL('../components/app/course-slide-player.jsx', import.meta.url), 'utf8')
const match = source.match(/function buildSlides\(lesson\) \{[\s\S]*?\n\}/)
assert.ok(match, 'test the real player slide builder, without a duplicate implementation')
const buildSlides = runInNewContext('(' + match[0] + ')', { OPORA_SKILL_SLIDE_MODEL })
const keys = lesson => Array.from(buildSlides(lesson), slide => slide.key)

test('every EN/RU V3/V4 lesson recalls before the merged teaching exercise, preserving the rest of the steps', () => {
  for (const version of [COURSE_CONTENT_V3, COURSE_CONTENT_V4]) {
    for (const locale of ['en', 'ru']) for (const goal of Object.keys(TRACKS)) {
      for (let day = 1; day <= 14; day++) for (const length of ['quick', 'standard']) {
        const lesson = lessonFor(goal, day, locale, length, version)
        const before = JSON.stringify(lesson)
        const actual = keys(lesson)
        const hasArrival = lesson.sections?.some(part => part.kind === 'arrive')
        const hasLearn = lesson.sections?.some(part => part.kind === 'learn')
        const prefix = ['welcome', 'baseline', 'checkin', 'recall', 'idea',
          ...(hasLearn && !hasArrival ? ['understand'] : [])]
        assert.deepEqual(actual.slice(0, prefix.length), prefix, `${version}/${locale}/${goal}/${day}/${length}`)
        assert.equal(new Set(actual).size, actual.length)
        assert.deepEqual(actual.slice(prefix.length), ['phrase', 'guided-0', 'guided-1', 'guided-2', 'ritual', 'transfer', ...(lesson.practiceV4 ? ['symbol'] : []), 'reflection', 'moment', 'feedback'])
        if (hasArrival && hasLearn) {
          assert.equal(actual.includes('understand'), false, 'arrival holds learn text in a collapsible transcript')
        }
        assert.equal(JSON.stringify(lesson), before, 'no content, lesson ID, or answers are mutated')
      }
    }
  }
})

test('legacy/no-recall and sparse lessons never receive an invented recall or teaching step', () => {
  const legacy = lessonFor('calm_regulation', 1, 'en', 'standard', COURSE_CONTENT_VERSION)
  assert.equal(keys(legacy).includes('recall'), false)
  assert.deepEqual(keys(legacy).slice(0, 5), ['welcome', 'baseline', 'checkin', 'idea', 'phrase'])
  assert.ok(legacy.sections.some(part => part.kind === 'arrive'), 'legacy arrival now hosts its learn text')
  assert.deepEqual(keys({sections:[]}), ['welcome', 'baseline', 'checkin', 'idea', 'ritual', 'reflection', 'moment', 'feedback'])
  assert.deepEqual(keys({sections:[], practiceV3:{recall:'Optional orientation'}}).slice(0, 5), ['welcome', 'baseline', 'checkin', 'recall', 'idea'])
  assert.ok(keys({sections:[{kind:'learn',text:'Only learning'}]}).includes('understand'),
    'older or sparse content without arrival keeps the separate teaching slide')
})

test('day one is orientation, while later prompts preserve previously learned-skill wording', () => {
  for (const locale of ['en', 'ru']) {
    const first = lessonFor('calm_regulation', 1, locale, 'standard', COURSE_CONTENT_V4)
    const second = lessonFor('calm_regulation', 2, locale, 'standard', COURSE_CONTENT_V4)
    assert.match(first.practiceV3.recall, locale === 'en' ? /name one skill/ : /назовите один навык/)
    assert.doesNotMatch(first.practiceV3.recall, /yesterday|вчера/)
    assert.match(second.practiceV3.recall, locale === 'en' ? /Without looking back/ : /без подсказки/)
  }
})

test('full text keeps recall before teaching and player retains server-confirmed save contract', () => {
  const full = readFileSync(new URL('../components/app/course-today.jsx', import.meta.url), 'utf8')
  assert.ok(full.indexOf('data-course-active-recall') < full.indexOf('className={styles.aphorism}'))
  assert.match(source, /const \[index, setIndex\] = useState\(reviewOnly \? 0 : alreadyDone \? slides\.length : 0\)/)
  assert.match(source, /day:cycle.day,lessonId:lesson.id,operationId:sessionOp.current/)
  assert.match(source, /feedback:legacyFeedback,beforeNow,afterNow,reflection/)
  assert.match(source, /if \(response\) \{ sessionOp.current = null; setEarned\(true\); setIndex\(slides.length\) \}/)
  assert.doesNotMatch(source, /localStorage|sessionStorage/)
})
