import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {getAssessmentDefinition} from '../lib/assessments/definitions.js'
import {startOrResumeCourseTest} from '../lib/app/course-test-flow.js'
import {buildFinalCourseRetest} from '../lib/inner-growth/course-final-retest.js'
import {antistressSelectedMeasures,antistressRoleForScale,orderAntistressScales,
  ANTISTRESS_MEASUREMENT_TESTS} from '../lib/inner-growth/anti-stress-measurement-contract.js'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const keyOrder=['weekly.load','weekly.tension','weekly.recovery','weekly.functioning',
  'weekly.connection','weekly.mood','weekly.energy','weekly.clarity']
const baselineTime='2026-10-14T08:00:00Z'
const completeTime='2026-10-29T11:00:00Z'
const frame={startedAt:'2026-10-14T12:00:00Z',completedAt:'2026-10-29T10:00:00Z',
  now:'2026-10-29T12:00:00Z',primaryTestKey:'hh-weekly-pulse'}
const results=(key,id,at,points)=>{
  const weekly=key==='hh-weekly-pulse',gad=key==='gad-7'
  const instrument=weekly?'past-7-days':gad?'past-2-weeks':'right-now'
  const dimensions=Object.entries(points).map(([scale,value])=>({
    key:scale,value,min:0,max:gad?21:10,
    direction:scale==='weekly.load'||scale==='weekly.tension'||gad
      ?'lower-reported-difficulty':'higher-reported-resource',
  }))
  return {id,definitionKey:key,definitionVersion:'v1',instrumentLocale:'ru',
    translationVersion:'test-ru-v1',contentHash:'sha256:test-battery',
    timeframe:instrument,scoringKey:'configured',scoringVersion:'v1',resultVersion:'v1',
    measurementAt:at,dimensions}
}
const weeklyBefore=results('hh-weekly-pulse','wb',baselineTime,{
  'weekly.mood':5,'weekly.tension':8,'weekly.load':9,'weekly.recovery':3,
  'weekly.energy':4,'weekly.clarity':5,'weekly.connection':6,'weekly.functioning':4,
})
const weeklyAfter=results('hh-weekly-pulse','wa',completeTime,{
  'weekly.mood':6,'weekly.tension':6,'weekly.load':7,'weekly.recovery':5,
  'weekly.energy':5,'weekly.clarity':6,'weekly.connection':6,'weekly.functioning':5,
})
const gadBefore=results('gad-7','gb',baselineTime,{'symptoms.gad7.total':14})
const gadAfter=results('gad-7','ga',completeTime,{'symptoms.gad7.total':10})
const resourceBefore=results('hh-resource-pulse','rb',baselineTime,{
  'resource.self_support':4,'resource.agency':3,'resource.support':4,
  'resource.energy':4,'resource.connection':5,'resource.meaning':5,
})
const resourceAfter=results('hh-resource-pulse','ra',completeTime,{
  'resource.self_support':6,'resource.agency':5,'resource.support':5,
  'resource.energy':5,'resource.connection':6,'resource.meaning':5,
})
const meta=[
  {key:'hh-weekly-pulse',version:'v1',startable:true,rightsStatus:'cleared',
    suggestedRepeatDays:7,locale:'ru'},
  {key:'gad-7',version:'v1',startable:true,rightsStatus:'cleared',
    suggestedRepeatDays:14,locale:'ru'},
  {key:'hh-resource-pulse',version:'v1',startable:true,rightsStatus:'cleared',
    suggestedRepeatDays:14,locale:'ru'},
]

test('the chosen Anti-Stress instruments cover all 8 weekly scales, 1 GAD scale and optional resources',()=>{
  assert.deepEqual(ANTISTRESS_MEASUREMENT_TESTS,{
    primary:'hh-weekly-pulse',anxiety:'gad-7',optionalResource:'hh-resource-pulse',
  })
  const measures=antistressSelectedMeasures(['hh-weekly-pulse','gad-7'],'ru')
  assert.deepEqual(measures.map(m=>m.testKey),['hh-weekly-pulse','gad-7'])
  assert.deepEqual(measures[0].scales.map(m=>m.id),keyOrder)
  assert.equal(measures[0].scales[0].role,'primary')
  assert.equal(measures[0].scales[0].direction,'lower')
  assert.equal(measures[0].window,'past-7-days')
  assert.equal(measures[1].scales[0].id,'symptoms.gad7.total')
  assert.equal(measures[1].window,'past-2-weeks')
  const extra=antistressSelectedMeasures(['hh-weekly-pulse','gad-7','hh-resource-pulse'],'en')
  assert.deepEqual(extra[2].scales.slice(0,2).map(x=>x.id),
    ['resource.self_support','resource.agency'])
  assert.equal(extra[2].window,'right-now')
  assert.equal(antistressRoleForScale('hh-weekly-pulse','weekly.load'),'primary')
})

test('all named weekly measures originate in the actual registered 8-question RU/EN definitions',()=>{
  for(const locale of ['ru','en']){
    const def=getAssessmentDefinition('hh-weekly-pulse','v1',locale)
    assert.equal(def.timeframe,'past-7-days')
    assert.equal(def.questions.length,8)
    assert.deepEqual(new Set(def.questions.map(q=>q.id)),new Set(keyOrder))
    assert.equal(def.questions.every(q=>q.required===true),true)
  }
  for(const locale of ['ru','en']){
    const gad=getAssessmentDefinition('gad-7','v1',locale)
    assert.equal(gad.questions.length,7)
    assert.equal(gad.timeframe,'past-2-weeks')
  }
})

test('T14 displays the pre-registered primary weekly.load first, retains 8 actual dimensions and GAD7 separate',()=>{
  const plan=buildFinalCourseRetest({...frame,
    metadata:meta,testKeys:['hh-weekly-pulse','gad-7'],
    results:[weeklyBefore,weeklyAfter,gadBefore,gadAfter]})
  assert.equal(plan.ready,true)
  assert.equal(plan.totalCount,2)
  assert.equal(plan.completedCount,2)
  const weekly=plan.tests[0],gad=plan.tests[1]
  assert.equal(weekly.role,'primary_outcome')
  assert.equal(weekly.timeframe,'past-7-days')
  assert.equal(weekly.baselineResultId,'wb')
  assert.equal(weekly.afterResultId,'wa')
  assert.equal(weekly.comparison.length,8)
  assert.deepEqual(weekly.comparison.map(x=>x.key),keyOrder)
  assert.equal(weekly.comparison[0].measureRole,'primary')
  assert.equal(weekly.comparison[0].from,9)
  assert.equal(weekly.comparison[0].to,7)
  assert.equal(weekly.comparison[0].delta,-2)
  assert.equal(gad.role,'symptom_screening')
  assert.equal(gad.timeframe,'past-2-weeks')
  assert.equal(gad.comparison[0].key,'symptoms.gad7.total')
  assert.equal(gad.comparison[0].from,14)
  assert.equal(gad.comparison[0].to,10)
})

test('optional Resource Pulse is repeated only when selected, never replaced by an invented internal support score',()=>{
  const without=buildFinalCourseRetest({...frame,metadata:meta,
    testKeys:['hh-weekly-pulse','gad-7'],
    results:[weeklyBefore,weeklyAfter,gadBefore,gadAfter,resourceBefore,resourceAfter]})
  assert.deepEqual(without.tests.map(x=>x.key),['hh-weekly-pulse','gad-7'])
  const withResources=buildFinalCourseRetest({...frame,metadata:meta,
    testKeys:['hh-weekly-pulse','gad-7','hh-resource-pulse'],
    results:[weeklyBefore,weeklyAfter,gadBefore,gadAfter,resourceBefore,resourceAfter]})
  assert.equal(withResources.totalCount,3)
  assert.equal(withResources.tests[2].comparison.length,6)
  assert.deepEqual(withResources.tests[2].comparison.slice(0,2).map(row=>row.key),
    ['resource.self_support','resource.agency'])
  assert.equal(withResources.tests[2].timeframe,'right-now')
})

test('language provenance of original questionnaire determines the retest, never the app translation',async()=>{
  const en=getAssessmentDefinition('gad-7','v1','en')
  const ru=getAssessmentDefinition('gad-7','v1','ru')
  const state={course:{stage:2,testKeys:['gad-7']}}
  const bootstrap={activeTestPlan:{definitionIds:[en.id,ru.id]},latestTestPlan:{definitionIds:[]},runs:[]}
  const calls=[]
  const request=async(action,payload)=>{
    calls.push({action,payload})
    return action==='bootstrap'?bootstrap:{...payload,id:'fake-run'}
  }
  const ruRun=await startOrResumeCourseTest({courseState:state,key:'gad-7',locale:'ru',request})
  assert.equal(ruRun.instrumentLocale,'ru')
  const enRun=await startOrResumeCourseTest({courseState:state,key:'gad-7',locale:'en',request})
  assert.equal(enRun.instrumentLocale,'en')
  assert.equal(calls.filter(x=>x.action==='runs').length,2)
})

test('the T0 and T14 user screens expose real scale roles, dates and original test language',()=>{
  const pre=read('components/app/course-completion-review.jsx')
  const stage=read('components/app/course-r3-steps.jsx')
  const after=read('components/app/course-final-retest.jsx')
  const server=read('lib/app/growth-course.js')
  assert.match(stage,/hh-weekly-pulse','gad-7/)
  assert.match(stage,/stressMeasuresTitle/)
  assert.match(pre,/data-course-antistress-baseline-axes/)
  assert.match(pre,/data-antistress-measure-role/)
  assert.match(pre,/item.instrumentLocale/)
  assert.match(server,/instrumentLocale:eligible\?\.instrumentLocale/)
  assert.match(after,/data-antistress-t14-role/)
  assert.match(after,/item\.hardBlocked/)
  assert.match(after,/item\.comparison\.map/)
  assert.doesNotMatch(after,/item\.comparison\.slice\(0,3\)/)
})

test('retesting cannot claim success before the actual 14-day GAD7 interval or without a valid baseline',()=>{
  const early=buildFinalCourseRetest({...frame,completedAt:'2026-10-26T11:00:00Z',
    now:'2026-10-27T03:00:00Z',metadata:meta,testKeys:['gad-7'],results:[gadBefore]})
  assert.equal(early.tests[0].hardBlocked,true)
  assert.equal(early.tests[0].canRepeat,false)
  const missing=buildFinalCourseRetest({...frame,metadata:meta,
    testKeys:['hh-weekly-pulse'],results:[weeklyAfter]})
  assert.equal(missing.tests[0].baselineResultId,null)
  assert.equal(missing.tests[0].comparison,null)
  assert.equal(missing.completedCount,0)
})
