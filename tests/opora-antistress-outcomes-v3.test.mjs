import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  COURSE_ANTISTRESS_OUTCOME_V3, antiStressDay, antiStressSkillCards, antiStressLessonValid,
} from '../lib/inner-growth/anti-stress-outcomes-v3.js'
import {lessonFor, COURSE_CONTENT_V4} from '../lib/inner-growth/lesson-library.js'
import {coursePracticeFocus} from '../lib/inner-growth/course-strategy.js'

const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('fourteen outcome-aligned RU/EN lessons contain seven exact skill pairs',()=>{
  assert.ok(antiStressLessonValid())
  for(const locale of ['ru','en']){
    const skills=antiStressSkillCards(locale)
    assert.equal(skills.length,7)
    assert.deepEqual(skills.map(s=>s.days),[[1,2],[3,4],[5,6],[7,8],[9,10],[11,12],[13,14]])
    for(let day=1;day<=14;day++){
      const entry=antiStressDay(day,locale)
      assert.equal(entry.skillId,'S'+Math.ceil(day/2))
      assert.ok(entry.guide.length>80)
      assert.ok(entry.action.length>25)
      assert.ok(entry.scales.length)
      assert.equal(Boolean(entry.probe),day%2===0)
      if(entry.probe){
        assert.equal(entry.probe.choices.length,3)
        assert.equal(new Set(entry.probe.choices.map(c=>c.value)).size,3)
        assert.ok(entry.probe.hint.length>20)
      }
      for(const key of entry.scales)assert.match(key,/^(weekly\.|resource\.|gad-7)/)
    }
  }
})

test('new stress content version preserves old lesson IDs and provides real instructional content',()=>{
  for(const day of [1,2,4,6,8,10,12,14]){
    for(const locale of ['ru','en']){
      const v4=lessonFor('calm_regulation',day,locale,'standard',COURSE_CONTENT_V4)
      const newLesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_OUTCOME_V3)
      assert.equal(v4.version,COURSE_CONTENT_V4)
      assert.equal(v4.antiStress,undefined)
      assert.equal(newLesson.version,COURSE_ANTISTRESS_OUTCOME_V3)
      assert.notEqual(newLesson.id,v4.id)
      assert.equal(newLesson.sections.length,5)
      assert.equal(newLesson.antiStress.skillId,'S'+Math.ceil(day/2))
      assert.equal(newLesson.title,antiStressDay(day,locale).title)
      assert.equal(newLesson.sections.find(s=>s.kind==='meditation').text,antiStressDay(day,locale).guide)
      assert.equal(newLesson.workbook.microPractice,antiStressDay(day,locale).transfer)
      assert.equal(newLesson.practiceV4.withoutImagery,antiStressDay(day,locale).neutral)
      assert.equal(newLesson.antiStress.probe?.choices.length,day%2===0?3:undefined)
      assert.match(newLesson.disclaimer,/PTSD|ПТСР/)
    }
  }
})

test('existing spaced measured-focus routing is retained for new content version',()=>{
  const result=coursePracticeFocus([], 'calm_regulation',4,'en',COURSE_ANTISTRESS_OUTCOME_V3)
  assert.equal(result.goal,'calm_regulation')
  assert.equal(result.role,'primary')
})

test('server limits new version to newly created stress cycles and validates saved skill choice',()=>{
  const server=read('lib/app/growth-daily.js')
  assert.match(server,/courseProgramFromTopics\(course\.focus_tags\|\|\[\]\)\?\.id==='stress'/)
  assert.match(server,/count\+1,goal,nextContentVersion,local,zone/)
  assert.match(server,/resolveCycleVersion.*COURSE_ANTISTRESS_OUTCOME_V3/)
  assert.match(server,/INVALID_ANTISTRESS_PROBE/)
  assert.match(server,/skillProbeChoice:probeChoice/)
  assert.match(server,/const usesOporaOutcomeChecks=isAntiStressV3\|\|isAntiStressV5\|\|isAntiStressV6\|\|isAntiStressV7\|\|isOporaNav2/)
  assert.match(server,/learningSkills=usesOporaOutcomeChecks/)
  assert.match(server,/last\?\.signals\?\.skillProbeChoice/)
})

test('course UI offers an optional skill-choice card and a separate qualitative practice focus',()=>{
  const player=read('components/app/course-slide-player.jsx')
  const journey=read('components/app/course-today.jsx')
  assert.match(player,/data-antistress-skill-probe/)
  assert.match(player,/lesson\.antiStress\|\|isOporaModule \? <>/)
  assert.match(player,/skillProbeChoice:skillProbeChoice\|\|null/)
  assert.match(player,/skillProbeHintUsed/)
  assert.match(journey,/data-antistress-seven-skill-progress/)
})

test('do not expose fabricated diagnostic outcomes or full trauma processing',()=>{
  const source=read('lib/inner-growth/anti-stress-outcomes-v3.js')
  const forbidden=[/return to your worst trauma/i,/revisit your traumatic event/i,/hold your breath until/i,/forced shaking/i,/diagnose you with ptsd/i]
  for(const phrase of forbidden)assert.doesNotMatch(source,phrase)
  const server=read('lib/app/growth-daily.js')
  assert.match(server,/skillProbeChoice/)
  assert.doesNotMatch(server,/GAD7\s*\+\s*weekly/)
})
