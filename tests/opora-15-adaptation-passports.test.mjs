import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { practiceAdjustmentSuggestion, effectiveLessonPreferences } from '../lib/inner-growth/course-adaptation.js'
import { lessonEditorialPassports } from '../lib/inner-growth/course-editorial-passports.js'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')

test('safe adaptation keeps choice optional and never infers symptoms from absent answers',()=>{
  assert.equal(practiceAdjustmentSuggestion({}),null)
  assert.equal(practiceAdjustmentSuggestion({comfort:'skip',usefulness:'useful'}),null)
  assert.deepEqual(practiceAdjustmentSuggestion({comfort:'uncomfortable',usefulness:'useful'}),{kind:'stop',reason:'safety_first'})
  assert.deepEqual(practiceAdjustmentSuggestion({comfort:'comfortable',usefulness:'useful'}),{kind:'keep',reason:'self_reported_acceptable'})
  assert.deepEqual(practiceAdjustmentSuggestion({comfort:'comfortable',flexibility:'more_choice'}),{kind:'keep',reason:'self_reported_acceptable'})
  assert.equal(practiceAdjustmentSuggestion({comfort:'neutral',usefulness:'unchanged'}).kind,'simplify')
  assert.equal(practiceAdjustmentSuggestion({comfort:'comfortable',usefulness:'unchanged'}).kind,'neutral')
  assert.equal(practiceAdjustmentSuggestion({comfort:'comfortable',tooDemanding:true}).kind,'simplify')
})
test('explicit selected adaptation only affects pace and optional imagery of NEXT session',()=>{
  assert.deepEqual(effectiveLessonPreferences({length:'standard',imagery:'optional'},'simplify'),{length:'quick',imagery:'optional'})
  assert.deepEqual(effectiveLessonPreferences({length:'standard',imagery:'optional'},'neutral'),{length:'standard',imagery:'no_imagery'})
  assert.deepEqual(effectiveLessonPreferences({length:'standard',imagery:'optional'},'keep'),{length:'standard',imagery:'optional'})
})
test('all 84 already authored cards have transparent pending review passports',()=>{
  for(const locale of ['en','ru']){
    const rows=lessonEditorialPassports(locale)
    assert.equal(rows.length,84)
    assert.equal(new Set(rows.map(r=>r.id)).size,84)
    assert.ok(rows.every(r=>r.practiceText.length>40&&r.stateGoal&&r.editorialReviewed===false&&r.usabilityPiloted===false))
    assert.ok(rows.every(r=>r.verifiedSource===null&&r.mediaRightsReview===null))
  }
})
test('the user explicitly chooses adaptation and all slides remain untouched',()=>{
  const component=read('components/app/course-slide-player.jsx')
  const server=read('lib/app/growth-daily.js')
  assert.match(component,/data-course-practice-adaptation/)
  assert.match(component,/setAdaptationChoice/)
  assert.match(server,/adaptationChoice:/)
  assert.match(server,/effectiveLessonPreferences/)
  assert.match(component,/function buildSlides\(lesson\)/)
})
