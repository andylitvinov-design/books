import test from 'node:test'
import assert from 'node:assert/strict'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { buildPersonalPortraitSummary, approvedCourseFocus } from '../lib/profile/personal-portrait.js'

const definition = getAssessmentDefinition('cbi-personal','v1','en')
const cbi = {
  id:'00000000-0000-4000-8000-000000000097',runId:'00000000-0000-4000-8000-000000000098',
  definitionId:definition.id,definitionKey:definition.key,definitionVersion:definition.version,
  instrumentLocale:definition.instrumentLocale,measurementAt:'2026-10-13T12:00:00Z',
  dimensions:[{key:'symptoms.cbi_personal.total',value:45.83,min:0,max:100,unit:'points',
    sourceConstruct:'Copenhagen Burnout Inventory (CBI): Personal Burnout',dimensionClass:'symptoms'}],
}

test('unmeasured Profile is empty, never an artificial personal strength or diagnosis',()=>{
  const value=buildPersonalPortraitSummary({results:[],savedReports:[]},'ru')
  assert.deepEqual(value.measuredResourceLabels,[])
  assert.equal(value.professionalScaleCount,0)
  assert.equal(value.comparableAxes,0)
  assert.equal(value.savedReportCount,0)
  assert.equal(value.pendingTests,0)
  assert.ok(value.unmeasuredAreaLabels.length>0)
  assert.equal(value.portrait.measuredCount,0)
})

test('Profile reads actual saved professional scales and honors withdrawn practitioner reports',()=>{
  const value=buildPersonalPortraitSummary({
    results:[cbi],
    savedReports:[{id:'report-a',available:true},{id:'report-b',available:false}],
  },'en')
  assert.equal(value.professionalScaleCount,1)
  assert.equal(value.savedReportCount,1)
  assert.deepEqual(value.measuredResourceLabels,[])
  assert.equal(value.comparableAxes,0)
  assert.ok(!JSON.stringify(value).includes('100% healthy'))
})

test('latest informal state snapshots do not become professional portrait strengths',()=>{
  const state=getAssessmentDefinition('hh-current-state','v2','en')
  const value=buildPersonalPortraitSummary({
    results:[{...cbi, id:'10000000-0000-4000-8000-000000000099',
      definitionId:state.id,definitionKey:state.key,definitionVersion:state.version,
      dimensions:[{key:'state.resource',value:10,min:0,max:10,direction:'higher-reported'}]}],
  },'en')
  assert.equal(value.professionalScaleCount,0)
  assert.deepEqual(value.measuredResourceLabels,[])
})

test('course focus is shown only for actual consented course stage and known selected topics',()=>{
  assert.deepEqual(approvedCourseFocus(null,'en'),[])
  assert.deepEqual(approvedCourseFocus({stage:0,focusTags:['resources']},'en'),[])
  assert.deepEqual(approvedCourseFocus({stage:2,focusTags:['stress','resources','stress','unknown','__proto__']},'en'),['Stress','Resources'])
  assert.deepEqual(approvedCourseFocus({stage:2,focusTags:['relationships']},'ru'),['Отношения'])
  assert.deepEqual(approvedCourseFocus({stage:2,focusTags:'private narrative'},'en'),[])
})
