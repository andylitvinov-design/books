import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  COURSE_PROGRAMS, getCourseProgram, courseProgramFromTopics,
  orderCourseProgramTests, suggestCourseProgramScales, courseProgramDay, COURSE_PROGRAM_ARCS,
} from '../lib/inner-growth/course-programs.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
test('three bilingual pain-led programmes map to existing, valid course topic tags', () => {
  assert.deepEqual(COURSE_PROGRAMS.map(program => program.id), ['stress', 'confidence', 'focus'])
  for (const programme of COURSE_PROGRAMS) {
    assert.equal(courseProgramFromTopics([...programme.focusTags].reverse())?.id, programme.id)
    assert.ok(programme.title.en && programme.title.ru && programme.promise.en && programme.promise.ru)
    assert.equal(programme.focusTags.length, 3)
    assert.equal(programme.starterKeys.length, new Set(programme.starterKeys).size)
  }
  assert.equal(courseProgramFromTopics(['stress', 'attention']), null)
  assert.equal(courseProgramFromTopics(['stress', 'mood', 'energy', 'relationships']), null)
  assert.equal(getCourseProgram('not-real'), null)
})

test('starter battery is deterministic and only reorders real rights-cleared recommendations', () => {
  const current = ['other', 'hh-resource-pulse', 'hh-weekly-pulse', 'hh-current-state', 'other-2', 'other-3']
    .map((key, i) => ({ key, title:key, completed:i%2===0 }))
  const result = orderCourseProgramTests(current, 'stress')
  assert.deepEqual(result.slice(0, 3).map(test => test.key),
    ['hh-weekly-pulse', 'hh-current-state', 'hh-resource-pulse'])
  assert.deepEqual(result.map(test => test.key).sort(), current.map(test => test.key).sort())
  assert.equal(result.filter(test => test.recommended).length, 5)
  assert.deepEqual(orderCourseProgramTests(current, null), current)
  assert.equal(result.find(test => test.key === 'other').completed, true)
  const missing = orderCourseProgramTests([{ key:'hh-resource-pulse' }], 'confidence')
  assert.deepEqual(missing.map(test => test.key), ['hh-resource-pulse'])
})

test('track-aware three-scale suggestions use only eligible measured values', () => {
  const raw = [
    { id:'a',goal:'energy_agency',eligible:true,score:2,priorityPercent:91 },
    { id:'b',goal:'inner_support',eligible:true,score:4,priorityPercent:12 },
    { id:'c',goal:'connection_boundaries',eligible:true,score:4,priorityPercent:52 },
    { id:'d',goal:'calm_regulation',eligible:true,score:8,priorityPercent:72 },
    { id:'e',goal:'attention_clarity',eligible:true,score:3,priorityPercent:34 },
    { id:'unmeasured',goal:'inner_support',eligible:false,score:0,priorityPercent:99 },
  ]
  assert.deepEqual(suggestCourseProgramScales({eligible:raw},'confidence').map(s=>s.id), ['b','c','a'])
  assert.deepEqual(suggestCourseProgramScales({eligible:raw},'stress').map(s=>s.id), ['d','a','c'])
  assert.deepEqual(suggestCourseProgramScales({eligible:raw},'focus').map(s=>s.id), ['e','a','d'])
  assert.deepEqual(suggestCourseProgramScales({eligible:[]},'stress'),[])
})

test('the new UI uses one consented start and private existing test/lesson endpoints', () => {
  const shell = read('components/app/my-course.jsx')
  const wizard = read('components/app/course-r3-steps.jsx')
  const style = read('components/app/my-course.module.css')
  assert.match(shell, /data-course-program-selection/)
  assert.match(shell, /data-course-program-id=\{program.id\}/)
  assert.match(shell, /data-course-personal-program/)
  assert.match(shell, /async function confirmStart\(\)/)
  assert.match(shell, /request\(\{ action: 'start', consent: true \}\)/)
  assert.match(shell, /action: 'intake'/)
  assert.match(shell, /expectedRevision: started.course.revision/)
  assert.match(wizard, /orderCourseProgramTests\(courseRecommendedTests/)
  assert.match(wizard, /suggestCourseProgramScales\(profile,programme.id,3\)/)
  assert.match(wizard, /data-course-selected-programme/)
  assert.match(style, /@media\(max-width:530px\)/)
  assert.doesNotMatch(shell, /localStorage|sessionStorage|dangerouslySetInnerHTML/)
})

test('each flagship has fourteen complete, distinct, bilingual self-help prompts', () => {
  for (const program of COURSE_PROGRAMS) {
    const days = COURSE_PROGRAM_ARCS[program.id]
    assert.equal(days.length,14)
    assert.equal(new Set(days.map(day => day.title.en)).size,14)
    for (let day = 1; day <= 14; day++) {
      const en = courseProgramDay(program.id,day,'en')
      const ru = courseProgramDay(program.id,day,'ru')
      assert.equal(en.day,day)
      assert.equal(ru.day,day)
      assert.ok(en.title.length > 5 && en.prompt.length > 15)
      assert.ok(ru.title.length > 5 && ru.prompt.length > 15)
    }
  }
  assert.equal(courseProgramDay('stress',15),null)
  assert.equal(courseProgramDay('unknown',1),null)
})

test('the authenticated daily API overlays curriculum without touching existing lesson validation', () => {
  const server = read('lib/app/growth-daily.js')
  const today = read('components/app/course-today.jsx')
  const quest = read('components/app/course-quest.jsx')
  assert.match(server,/programme:programme\?\{id:programme.id/)
  assert.match(server,/programmeDay:programme\?courseProgramDay/)
  assert.match(today,/data.programme\?\.day\?\.prompt/)
  assert.match(quest,/item.programmeDay\?\.title/)
  assert.match(server,/const lessonGoal=currentFocus.goal/)
  assert.match(server,/lessonFor\(lessonGoal,dayInfo.day/)
})
