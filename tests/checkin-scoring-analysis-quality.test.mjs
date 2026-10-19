import test from 'node:test'
import assert from 'node:assert/strict'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { assessmentResultOverview, initialAssessmentSection } from '../lib/assessments/result-overview.js'
import { buildOriginalCheckinInsight } from '../lib/assessments/checkin-synthesis.js'
import { assessmentMethodology } from '../lib/assessments/assessment-methodology.js'
import { monitoringCatalogItem } from '../data/assessments/catalog.js'

const scored = (key, version, locale, answers) => {
  const def = getAssessmentDefinition(key, version, locale)
  const data = Object.fromEntries(def.questions.map(q => [q.id, answers[q.id] ?? 5]))
  return {
    id: 'checkin-quality-fixture',
    measurementAt: '2026-10-19T15:00:00.000Z',
    ...scoreAssessment(def, data),
  }
}

test('current-state directs attention to reported tension, not a low difficulty number', () => {
  const result = scored('hh-current-state','v2','ru',{
    'state.problem_intensity': 2,
    'state.resource': 8,
    'state.tension': 9,
    'state.fatigue': 1,
    'state.life_impact': 3,
  })
  const report = buildAssessmentResultReport(result,'ru')
  assert.equal(report.verified, true)
  assert.equal(report.checkinInsight?.focusKey, 'state.tension')
  assert.match(report.checkinInsight.summary, /Напряжение/)
  assert.match(report.intro, /Для следующего самонаблюдения/)
  assert.match(report.intro, /не общий индекс здоровья/)
  assert.equal(initialAssessmentSection(report), 2)
  assert.equal(assessmentResultOverview(report,result,'ru').preview[0].key, 'state.tension')
  assert.equal(report.sections.length, 5)
  assert.equal(report.total, undefined)
})

test('weekly-pulse keeps eight axes and returns contextual EN follow-up, never a health aggregate', () => {
  const result = scored('hh-weekly-pulse','v1','en',{
    'weekly.mood':8,'weekly.tension':2,'weekly.load':8,
    'weekly.recovery':7,'weekly.energy':8,'weekly.clarity':7,
    'weekly.connection':9,'weekly.functioning':6,
  })
  const report = buildAssessmentResultReport(result,'en')
  assert.equal(report.verified,true)
  assert.equal(report.checkinInsight?.focusKey,'weekly.load')
  assert.match(report.intro,/One possible focus/)
  assert.match(report.intro,/not a health index/)
  assert.equal(report.sections.length,8)
  assert.equal(assessmentResultOverview(report,result,'en').preview[0].key,'weekly.load')
  assert.equal(result.total,undefined)
})

test('a falsified stored identity cannot receive check-in synthesis or priority-based reassurance', () => {
  const result = scored('hh-current-state','v2','en',{})
  const tampered = {...result, contentHash:'sha256:invalid-content'}
  const report = buildAssessmentResultReport(tampered,'en')
  assert.equal(report.verified,false)
  assert.equal(report.checkinInsight,null)
  assert.equal(buildOriginalCheckinInsight(tampered,report.sections,'en'),null)
  assert.equal(initialAssessmentSection(report),0)
})

test('neutral multidimensional and invalid instruments do not get a directional priority', () => {
  const neutral={verified:true,sections:[
    {key:'trait.a',value:0,min:0,max:10,bandBasis:'descriptive',presentationDirection:'neutral'},
    {key:'trait.b',value:10,min:0,max:10,bandBasis:'descriptive',presentationDirection:'neutral'},
  ]}
  assert.equal(initialAssessmentSection(neutral),0)
  assert.deepEqual(assessmentResultOverview(neutral,{},'en').preview.map(x=>x.key),['trait.a','trait.b'])
  const unsafe={verified:false,sections:[
    {key:'resource',value:0,min:0,max:10,bandBasis:'unavailable',presentationDirection:'resource'},
    {key:'issue',value:10,min:0,max:10,bandBasis:'unavailable',presentationDirection:'difficulty'},
  ]}
  assert.equal(initialAssessmentSection(unsafe),0)
})

test('an explicit source-backed follow-up stays ahead of descriptive display priorities', () => {
  const review={verified:true,sections:[
    {key:'a',value:10,min:0,max:10,bandBasis:'descriptive',presentationDirection:'difficulty',recommendedReview:false},
    {key:'b',value:3,min:0,max:6,bandBasis:'screening',presentationDirection:'difficulty',recommendedReview:true},
  ]}
  assert.equal(initialAssessmentSection(review),1)
  assert.equal(assessmentResultOverview(review,{},'en').preview[0].key,'b')
})

test('the catalog labels all authored check-ins as descriptive, not independently validated', () => {
  const item=monitoringCatalogItem('hh-weekly-pulse')
  const description=assessmentMethodology({key:item.key,catalog:item,locale:'en'})
  assert.equal(description.status,'original')
  assert.match(description.text,/not been independently psychometrically validated/)
  const russian=assessmentMethodology({key:item.key,catalog:item,locale:'ru'})
  assert.match(russian.text,/Независимая психометрическая валидизация/)
})
