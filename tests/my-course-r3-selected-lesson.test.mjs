import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {coursePracticeFocus} from '../lib/inner-growth/course-strategy.js'
import {lessonFor,COURSE_CONTENT_V3} from '../lib/inner-growth/lesson-library.js'
import {GROWTH_GOALS} from '../lib/inner-growth/course-model.js'

const scales=['hh-weekly-pulse::weekly.tension','hh-weekly-pulse::weekly.clarity']
test('R3 day2 accepts the displayed non-primary selected-scale lesson in both languages',()=>{
 for(const locale of ['en','ru']){
  const focus=coursePracticeFocus(scales,'calm_regulation',2,locale)
  assert.equal(focus.goal,'attention_clarity');assert.equal(focus.scaleId,scales[1]);assert.ok(focus.label)
  const displayed=lessonFor(focus.goal,2,locale)
  const accepted=lessonFor(coursePracticeFocus(scales,'calm_regulation',2,locale).goal,2,'en')
  assert.equal(displayed.id,accepted.id)
  assert.notEqual(displayed.id,lessonFor('calm_regulation',2,'en').id,'reproduces the previously rejected non-primary lesson')
 }
})
test('every R3 rotated day has the same displayed and completion identity, including quick mode',()=>{
 for(let day=1;day<=14;day++)for(const locale of ['en','ru'])for(const length of ['quick','standard']){
  const focus=coursePracticeFocus(scales,'calm_regulation',day,locale)
  assert.equal(focus.scaleId,scales[(day-1)%scales.length])
  assert.equal(lessonFor(focus.goal,day,locale,length).id,lessonFor(focus.goal,day,'en').id)
 }
})
test('R1/R2 courses without measured choices retain all original14-day lesson identities',()=>{
 for(const goal of Object.keys(GROWTH_GOALS))for(let day=1;day<=14;day++)for(const locale of ['en','ru']){
  for(const choices of [undefined,[],['not-a-scale']]){
   const focus=coursePracticeFocus(choices,goal,day,locale)
   assert.deepEqual(focus,{goal,scaleId:null,label:null})
   assert.equal(lessonFor(focus.goal,day,locale).id,lessonFor(goal,day,locale).id)
  }
 }
})
test('repository read and session write call the same focus selector, never validate against primary alone',()=>{
 const source=readFileSync(new URL('../lib/app/growth-daily.js',import.meta.url),'utf8')
 assert.match(source,/coursePracticeFocus\(course\.scale_keys,cycle\.primary_domain,dayInfo\.day,locale,contentVersion\)/)
 assert.match(source,/coursePracticeFocus\(course\.scale_keys,cycle\.primary_domain,today\.day,locale,version\)/)
 assert.match(source,/const lesson=lessonFor\(focus\.goal,today\.day,'en','standard',version\)/)
 assert.doesNotMatch(source,/const lesson=lessonFor\(cycle\.primary_domain,today\.day/)
 assert.match(source,/input\.lessonId!==lesson\.id/)
})

test('V3 uses a stable primary focus on scheduled days but preserves the older R3 rotation',()=>{
 for(const locale of ['en','ru']){
  const old=coursePracticeFocus(scales,'calm_regulation',2,locale)
  const updated=coursePracticeFocus(scales,'calm_regulation',2,locale,COURSE_CONTENT_V3)
  assert.equal(old.goal,'attention_clarity')
  assert.equal(updated.goal,'calm_regulation')
  assert.equal(updated.role,'primary')
  const shown=lessonFor(updated.goal,2,locale,'quick',COURSE_CONTENT_V3)
  const accepted=lessonFor(updated.goal,2,'en','standard',COURSE_CONTENT_V3)
  assert.equal(shown.id,accepted.id)
  assert.notEqual(shown.id,lessonFor(old.goal,2,locale).id)
 }
})
