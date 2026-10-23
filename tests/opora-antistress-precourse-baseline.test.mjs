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
  const active=server.slice(server.indexOf("} else if (action === 'choose-goals')"),
    server.indexOf("} else if (action === 'complete-day')"))
  // Even if stage 2 passed previously, the learner may start weeks later.
  // Revalidate every chosen Anti-Stress questionnaire at actual cycle activation.
  assert.match(active,/hasAntistressRequiredBaseline\(row\.test_keys, 'stress'\)/)
  assert.match(active,/COURSE_ANTISTRESS_BASELINE_REQUIRED/)
  assert.match(active,/compatibleResult\(before,key,\{requireRecent:true\}\)/)
  assert.match(active,/COURSE_TESTS_REMAIN/)
})

test('the private step-2 interface visibly leads through starting tests before the first lesson', () => {
  const wizard=read('components/app/course-r3-steps.jsx')
  const css=read('components/app/course-r3-steps.module.css')
  const root=read('components/app/my-course.jsx')
  const testFlow=read('lib/app/course-test-flow.js')
  assert.match(root,/request\(accountId, \{ action: 'start', consent: true, courseId: requestedCourseId/)
  assert.match(root,/action: 'intake'/)
  assert.match(root,/Weekly Pulse baseline/)
  assert.match(wizard,/data-course-antistress-pretests/)
  assert.match(wizard,/data-course-required-baseline/)
  assert.match(wizard,/setChosenTests\(preset \? \[\.\.\.preset\.testKeys\] : withAntistressRequiredBaseline\(initial,programme\?\.id\)\)/)
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

test('combined server guards allow Weekly-only Anti-Stress and preserve fixed preset contracts', async () => {
  const { coursePresetForTags, coursePresetTags, getCoursePreset, matchesFixedPresetTests } = await import('../lib/inner-growth/course-presets.js')
  const { courseProgramFromTopics } = await import('../lib/inner-growth/course-programs.js')
  const source=read('lib/app/growth-course.js')
  const start=source.indexOf('          const preset =',source.indexOf("} else if (action === 'confirm-tests')"))
  const end=source.indexOf('          // Highlighted suggestions',start)
  const check=new Function('row','keys','coursePresetForTags','matchesFixedPresetTests','hasAntistressRequiredBaseline','courseProgramFromTopics','reject',source.slice(start,end))
  const run=(tags,keys)=>check({focus_tags:tags},keys,coursePresetForTags,matchesFixedPresetTests,hasAntistressRequiredBaseline,courseProgramFromTopics,(code)=>{throw new Error(code)})
  const stress=getCourseProgram('stress')
  const tags=stress.topics || stress.focusTags || ['stress']
  assert.equal(courseProgramFromTopics(tags)?.id,'stress')
  assert.doesNotThrow(()=>run(tags,['hh-weekly-pulse']))
  assert.throws(()=>run(tags,['gad-7']),/COURSE_ANTISTRESS_BASELINE_REQUIRED/)
  for(const id of ['calm_balance','business_focus','confidence']){
    const preset=getCoursePreset(id)
    assert.doesNotThrow(()=>run(coursePresetTags(id),preset.testKeys))
    assert.throws(()=>run(coursePresetTags(id),preset.testKeys.slice(1)),/COURSE_PRESET_TESTS_FIXED/)
  }
  assert.match(source,/const stressIntake=row\?\.stage===2 && !coursePresetForTags/)
  assert.match(source,/const recentStress=!preset &&/)
})

test('actual T0 recency recheck preserves the separate fixed preset battery',()=>{
 const source=read('lib/app/growth-course.js')
 const block=source.slice(source.indexOf("} else if (action === 'choose-goals')"),source.indexOf('          let goals, scales = []'))
 assert.match(block,/if \(!coursePresetForTags\(row.focus_tags\) && courseProgramFromTopics\(row.focus_tags\|\|\[\]\)\?\.id==='stress'\)/)
 assert.match(block,/where account_id=\$1/)
 assert.match(block,/\[actor.id\]/)
 assert.match(block,/compatibleResult\(before,key,\{requireRecent:true\}\)/)
})
