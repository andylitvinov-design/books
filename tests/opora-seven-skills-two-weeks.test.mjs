import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { COURSE_ANTISTRESS_SEVEN_SKILLS_V1, SEVEN_SKILLS, antiStressSevenSkillDay, antiStressSevenSkillCards, sevenSkillsLessonValid } from '../lib/inner-growth/anti-stress-seven-skills-v1.js'
import { COURSE_ANTISTRESS_OUTCOME_V3, lessonFor } from '../lib/inner-growth/lesson-library.js'
import { buildCourseSlides, verifyCourseSlideVisitOrder } from '../lib/inner-growth/course-slide-sequence.js'

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('first seven days introduce seven unique skills, days 8–14 deepen the same skills in new exercises',()=>{
  assert.equal(sevenSkillsLessonValid(),true)
  assert.equal(SEVEN_SKILLS.length,7)
  for(const locale of ['ru','en','es']){
    const cards=antiStressSevenSkillCards(locale)
    assert.equal(new Set(cards.map(s=>s.id)).size,7)
    for(let i=0;i<7;i++){
      const first=antiStressSevenSkillDay(i+1,locale)
      const deeper=antiStressSevenSkillDay(i+8,locale)
      assert.equal(first.skillId,cards[i].id)
      assert.equal(deeper.skillId,cards[i].id)
      assert.deepEqual(cards[i].days,[i+1,i+8])
      assert.equal(first.sevenSkillsV1.depth,'learn')
      assert.equal(deeper.sevenSkillsV1.depth,'deepen')
      assert.notEqual(first.title,deeper.title)
      assert.notDeepEqual(first.sevenSkillsV1.steps,deeper.sevenSkillsV1.steps)
      assert.equal(first.sevenSkillsV1.steps.length,4)
      assert.equal(deeper.sevenSkillsV1.steps.length,4)
      assert.equal(first.sevenSkillsV1.suggestedMinutes,'8–12')
      assert.equal(antiStressSevenSkillDay(i+1,locale,'quick').sevenSkillsV1.suggestedMinutes,'5–8')
      assert.ok(first.sevenSkillsV1.outcome.length>16)
    }
  }
})
test('server validates exactly the seven new slide keys; previous content remains pinned',()=>{
  for(let day=1;day<=14;day++){
    const newLesson=lessonFor('calm_regulation',day,'ru','standard',COURSE_ANTISTRESS_SEVEN_SKILLS_V1)
    assert.ok(newLesson)
    assert.ok(newLesson.id.includes(COURSE_ANTISTRESS_SEVEN_SKILLS_V1))
    assert.equal(newLesson.antiStress?.sevenSkillsV1?.day,day)
    assert.equal(newLesson.durationSeconds,600)
    const keys=buildCourseSlides(newLesson).map(row=>row.key)
    assert.deepEqual(keys,['skill-intro','skill-prepare','skill-practice','skill-repeat','skill-scenario','skill-review','skill-result'])
    assert.equal(verifyCourseSlideVisitOrder(buildCourseSlides(newLesson),keys),true)
    assert.equal(verifyCourseSlideVisitOrder(buildCourseSlides(newLesson),keys.slice(0,-1)),false)
    const oldLesson=lessonFor('calm_regulation',day,'ru','standard',COURSE_ANTISTRESS_OUTCOME_V3)
    assert.ok(oldLesson.id.includes(COURSE_ANTISTRESS_OUTCOME_V3))
    assert.equal(oldLesson.antiStress.sevenSkillsV1,undefined)
    assert.ok(buildCourseSlides(oldLesson).length>7)
  }
})
test('source routes new cycle and submission validation without silently modifying legacy cycles',()=>{
  const server=source('lib/app/growth-daily.js')
  const player=source('components/app/course-slide-player.jsx')
  const audience=source('components/public-growth-courses.tsx')
  assert.match(server,/nextContentVersion=[\s\S]*COURSE_ANTISTRESS_SEVEN_SKILLS_V1/)
  assert.match(server,/version!==COURSE_ANTISTRESS_SEVEN_SKILLS_V1 && !firstStressDay/)
  assert.match(server,/firstStressDay=Boolean\(version===COURSE_ANTISTRESS_OUTCOME_V3/)
  assert.match(server,/const requiredSlides=firstStressDay\?DAY_ONE_SLIDES:buildCourseSlides\(selectedLesson\)/)
  assert.match(player,/const isSevenSkills=Boolean\(lesson\.antiStress\?\.sevenSkillsV1/)
  assert.match(player,/buildCourseSlides\(lesson\)/)
  assert.match(player,/data-opora-seven-skills/)
  assert.match(player,/onAttempt=\{setPracticeAttempt\}/)
  assert.match(audience,/index \+ 1\} \+ \{index \+ 8/)
})
