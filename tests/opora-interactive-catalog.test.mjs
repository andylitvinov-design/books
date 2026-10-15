import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ANTISTRESS_INTERACTIVE_CURRICULUM, INTERACTIVE_METHODS, antistressInteractiveDay, interactiveCurriculumValid } from '../lib/inner-growth/anti-stress-interactive-catalog.js'
import { antiStressDay } from '../lib/inner-growth/anti-stress-outcomes-v3.js'

test('fourteen-day interactive methods align with the live anti-stress content schedule',()=>{
  assert.ok(interactiveCurriculumValid())
  assert.equal(ANTISTRESS_INTERACTIVE_CURRICULUM.length,14)
  assert.ok(Object.keys(INTERACTIVE_METHODS).length>=20)
  for(let day=1;day<=14;day++){
    const lesson=antiStressDay(day,'ru','standard')
    const plan=antistressInteractiveDay(day,'ru')
    const enLesson=antiStressDay(day,'en','standard')
    const enPlan=antistressInteractiveDay(day,'en')
    assert.equal(plan.skill,lesson.skillId)
    assert.equal(plan.title,lesson.title)
    assert.equal(enPlan.title,enLesson.title)
    assert.ok(plan.expectedResponse.length>25)
    assert.ok(plan.methods.every(key=>Boolean(INTERACTIVE_METHODS[key])))
  }
})
test('first-day live methods are clearly separated from planned days 2–14',()=>{
  assert.equal(antistressInteractiveDay(1,'ru').status,'implemented')
  for(let day=2;day<=14;day++)assert.equal(antistressInteractiveDay(day).status,'planned')
})
test('day map includes distinct therapeutic educational mechanisms and safety options',()=>{
  const all=new Set(ANTISTRESS_INTERACTIVE_CURRICULUM.flatMap(day=>day.methods))
  for(const name of ['visual_scan','switch_attention','signal_story','stress_branch','body_opt_in',
    'pace_picker','support_map','restorative_scene','fact_guess','phrase_builder',
    'help_request','situation_match','toolkit_builder']) assert.ok(all.has(name),name)
  assert.ok(ANTISTRESS_INTERACTIVE_CURRICULUM.every(day=>day.fallback&&day.measure))
  const contract=readFileSync('lib/inner-growth/anti-stress-day-one.js','utf8')
  assert.match(contract,/guided_stepper/)
  assert.match(contract,/three_word_tokens/)
  assert.match(contract,/if_then_builder/)
})
