import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  getCourseProgram, ANTISTRESS_REQUIRED_BASELINE_KEY, ANTISTRESS_BASELINE_RECENCY_DAYS,
  hasAntistressRequiredBaseline, withAntistressRequiredBaseline, isAntistressBaselineRecent,
} from '../lib/inner-growth/course-programs.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('new Anti-Stress onboarding always retains the Weekly Pulse baseline without forcing optional screens', () => {
  assert.equal(ANTISTRESS_REQUIRED_BASELINE_KEY, 'hh-weekly-pulse')
  assert.equal(getCourseProgram('stress').starterKeys[0], 'hh-weekly-pulse')
  assert.deepEqual(withAntistressRequiredBaseline(['gad-7'], 'stress'), ['hh-weekly-pulse', 'gad-7'])
  assert.deepEqual(withAntistressRequiredBaseline([], 'stress'), ['hh-weekly-pulse'])
  assert.deepEqual(withAntistressRequiredBaseline(['hh-resource-pulse','hh-weekly-pulse','hh-weekly-pulse'], 'stress'),
    ['hh-weekly-pulse', 'hh-resource-pulse'])
  assert.equal(hasAntistressRequiredBaseline(['gad-7', 'hh-resource-pulse'], 'stress'), false)
  assert.equal(hasAntistressRequiredBaseline(['hh-weekly-pulse'], 'stress'), true)
  // Historical non-Anti-Stress programs are not migrated into a new baseline.
  assert.deepEqual(withAntistressRequiredBaseline(['hh-resource-pulse'], 'confidence'), ['hh-resource-pulse'])
  assert.equal(hasAntistressRequiredBaseline(['hh-resource-pulse'], 'confidence'), true)
})

test('a compatible previous assessment is counted only inside the defined baseline window', () => {
  const now = Date.parse('2026-10-14T12:00:00Z')
  assert.deepEqual(ANTISTRESS_BASELINE_RECENCY_DAYS, {
    'hh-weekly-pulse': 7, 'gad-7': 14, 'hh-resource-pulse': 14,
  })
  assert.equal(isAntistressBaselineRecent('hh-weekly-pulse','2026-10-07T12:00:00Z',now),true)
  assert.equal(isAntistressBaselineRecent('hh-weekly-pulse','2026-10-07T11:59:59Z',now),false)
  assert.equal(isAntistressBaselineRecent('hh-weekly-pulse','2026-10-14T12:01:00Z',now),false)
  assert.equal(isAntistressBaselineRecent('gad-7','2026-09-30T12:00:00Z',now),true)
  assert.equal(isAntistressBaselineRecent('gad-7','2026-09-30T11:59:59Z',now),false)
  assert.equal(isAntistressBaselineRecent('hh-resource-pulse','2026-10-01T12:00:00Z',now),true)
  assert.equal(isAntistressBaselineRecent('hh-weekly-pulse','invalid',now),false)
})

test('stage-2 server rejects omitting the baseline and reviewing without completed, recent assessments', () => {
  const server=read('lib/app/growth-course.js')
  const commands=server.slice(server.indexOf("} else if (action === 'confirm-tests')"),
    server.indexOf("} else if (action === 'choose-goals')"))
  assert.equal((commands.match(/COURSE_ANTISTRESS_BASELINE_REQUIRED/g)||[]).length,2)
  assert.match(commands,/hasAntistressRequiredBaseline\(keys,courseProgramFromTopics/)
  assert.match(commands,/hasAntistressRequiredBaseline\(row\.test_keys,courseProgramFromTopics/)
  assert.match(commands,/COURSE_TEST_SELECTION_REQUIRED/)
  assert.match(commands,/COURSE_TESTS_REMAIN/)
  assert.match(commands,/compatibleResult\(found,key,\{requireRecent:recentStress\}\)/)
  assert.match(server,/isAntistressBaselineRecent\(key,r\.measurementAt,now\)/)
  const active=server.slice(server.indexOf("} else if (action === 'choose-goals')"))
  assert.doesNotMatch(active,/COURSE_ANTISTRESS_BASELINE_REQUIRED/)
})

test('the private step-2 interface visibly leads through starting tests before the first lesson', () => {
  const wizard=read('components/app/course-r3-steps.jsx')
  const css=read('components/app/course-r3-steps.module.css')
  const root=read('components/app/my-course.jsx')
  const testFlow=read('lib/app/course-test-flow.js')
  assert.match(root,/request\(\{ action: 'start', consent: true \}\)/)
  assert.match(root,/action: 'intake'/)
  assert.match(root,/Weekly Pulse baseline/)
  assert.match(wizard,/data-course-antistress-pretests/)
  assert.match(wizard,/data-course-required-baseline/)
  assert.match(wizard,/withAntistressRequiredBaseline\(confirmedKeys\.length/)
  assert.match(wizard,/if\(isAntistress && key===ANTISTRESS_REQUIRED_BASELINE_KEY\) return/)
  assert.match(wizard,/confirmed && baselineConfirmed && pending\.length===0/)
  assert.match(wizard,/pending\.length===0&&baselineConfirmed/)
  assert.match(wizard,/startOrResumeCourseTest/)
  assert.match(testFlow,/coursePendingKeys/)
  assert.match(css,/\.stressBaselineIntro/)
  assert.match(css,/\.requiredBadge/)
  assert.match(css,/\.optionalBadge/)
})

test('marketing and Academy course URLs retain the standard sign-up path and truthful test descriptions', () => {
  const landing=read('components/public-antistress-landing.tsx')
  const catalogue=read('components/public-growth-courses.tsx')
  assert.match(landing,/Antes de la primera lección/)
  assert.match(landing,/Перед первым уроком/)
  assert.match(landing,/Before the first lesson/)
  assert.match(landing,/GAD-7/)
  assert.match(landing,/Resource Pulse/)
  assert.match(landing,/app\/course\?program=stress/)
  assert.match(catalogue,/Weekly Pulse \(8 questions\)/)
  assert.match(catalogue,/Weekly Pulse \(8 вопросов\)/)
})
