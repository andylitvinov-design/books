import test from 'node:test'
import assert from 'node:assert/strict'
import { OPORA_SEVEN_SCREEN_MODEL, SEVEN_SKILLS_SLIDES, buildCourseSlides } from '../lib/inner-growth/course-slide-sequence.js'
import { COURSE_ANTISTRESS_SEVEN_SKILLS_V1, lessonFor } from '../lib/inner-growth/lesson-library.js'

test('AS-2.1 seven roles are unique, progressive and have a 10-minute nonbinding time budget',()=>{
  const models=OPORA_SEVEN_SCREEN_MODEL
  assert.equal(models.length,7)
  assert.deepEqual(models.map(x=>x.order),[1,2,3,4,5,6,7])
  assert.equal(new Set(models.map(x=>x.role)).size,7)
  assert.equal(new Set(models.map(x=>x.key)).size,7)
  assert.equal(models.reduce((sum,x)=>sum+x.seconds,0),600)
  assert.ok(models.filter(x=>x.practice).reduce((sum,x)=>sum+x.seconds,0)>=420)
  for(const item of models){
    assert.ok(item.title.ru.length>4 && item.title.en.length>4)
    assert.ok(item.expectedAction.length>20)
    assert.ok(item.evidence.length>7)
    assert.equal(Object.isFrozen(item),true)
  }
  assert.deepEqual(SEVEN_SKILLS_SLIDES.map(x=>x.key),models.map(x=>x.key))
})

test('7-slide source stays tied to actual 14-lesson content, without changing historical versions',()=>{
  for(const locale of ['ru','en','es'])for(let day=1;day<=14;day++){
    const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SEVEN_SKILLS_V1)
    assert.ok(lesson)
    assert.equal(buildCourseSlides(lesson).length,7)
    assert.equal(lesson.antiStress.sevenSkillsV1.skillId,'S'+((day-1)%7+1))
    assert.equal(lesson.antiStress.sevenSkillsV1.suggestedMinutes,'8–12')
    assert.ok(lesson.antiStress.sevenSkillsV1.steps.length>=3)
  }
})
