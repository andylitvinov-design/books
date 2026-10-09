import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { buildProfileAssessmentView } from '../lib/profile/profile-assessment-view.js'

const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const state=getAssessmentDefinition('hh-current-state','v2','en')
const weekly=getAssessmentDefinition('hh-weekly-pulse','v1','en')
const stateId=state.id,weeklyId=weekly.id
const id1='10000000-0000-4000-8000-000000000001',id2='10000000-0000-4000-8000-000000000002'
const sample={
  activeTestPlan:{ id:'10000000-0000-4000-8000-000000000003',status:'active',
    definitionIds:[stateId,weeklyId],completedRunIds:[id1] },
  results:[
    {id:'10000000-0000-4000-8000-000000000004',runId:id1,definitionId:stateId,definitionKey:state.key,measurementAt:'2026-10-08T11:00:00Z',dimensions:[]},
    // A historical completed result does not satisfy the current plan's pending item.
    {id:'10000000-0000-4000-8000-000000000005',runId:id2,definitionId:weeklyId,definitionKey:weekly.key,measurementAt:'2026-10-04T12:00:00Z',dimensions:[]},
  ],
  runs:[{id:'10000000-0000-4000-8000-000000000006',status:'in_progress',definitionId:weeklyId,answers:{[weekly.questions[0].id]:3}}],
  snapshot:{dimensions:[
    {key:'state.resource',sourceConstruct:'Resource',value:7,min:0,max:10,unit:'points',dimensionClass:'state',measurementAt:'2026-10-08T11:00:00Z',sourceDefinitionId:stateId},
    {key:'weekly.mood',sourceConstruct:'Mood',value:4,min:0,max:10,unit:'points',dimensionClass:'state',measurementAt:'2026-10-04T12:00:00Z',sourceDefinitionId:weeklyId},
  ]},
}
test('profile head consumes only saved measured scales, with raw scores and a bounded bar',()=>{
 const vm=buildProfileAssessmentView(sample,'en')
 assert.equal(vm.measured.length,2)
 assert.equal(vm.measured[0].label,'Resource')
 assert.equal(vm.measured[0].value,7)
 assert.equal(vm.measured[0].ratio,0.7)
 assert.equal(vm.measured[1].label,'Mood')
 assert.ok(vm.measured.every(d=>d.value>=d.min&&d.value<=d.max))
 assert.equal(vm.completedCount,2)
})
test('grey pending selection is current plan-based, not confused with results from older plans',()=>{
 const vm=buildProfileAssessmentView(sample,'en')
 assert.equal(vm.selectedCount,2)
 assert.equal(vm.completedInPlanCount,1)
 assert.equal(vm.pending.length,1)
 assert.equal(vm.pending[0].id,weeklyId)
 assert.equal(vm.pending[0].title.length>0,true)
 assert.ok(vm.pending[0].expectedScales.length>=1)
 assert.equal(vm.pending[0].runId,sample.runs[0].id)
 assert.ok(vm.pending[0].progress>0&&vm.pending[0].progress<100)
 assert.deepEqual(buildProfileAssessmentView({...sample,activeTestPlan:{...sample.activeTestPlan,completedRunIds:[id1,id2]}}).pending,[])
})
test('no plan and no results show neither invented rays nor fake zero measurements',()=>{
 const vm=buildProfileAssessmentView({results:[],runs:[],snapshot:null},'ru')
 assert.deepEqual(vm.measured,[])
 assert.deepEqual(vm.pending,[])
 assert.equal(vm.selectedCount,0)
 assert.equal(vm.completedCount,0)
})
test('Profile UI keeps the requested order and four real actions without sharing private scores',()=>{
 const workspace=read('components/app/app-workspace.jsx')
 const overview=read('components/app/profile-assessment-overview.jsx')
 const report=read('components/app/client-report-actions.jsx')
 const battery=read('components/app/account-test-battery.jsx')
 const css=read('components/app/profile-assessment-overview.module.css')
 assert.match(workspace,/<ProfileAssessmentOverview data=\{data\} locale=\{locale\} onBeginTest=\{beginSelectedTest\}>/)
 const head=overview.indexOf('data-profile-head')
 const measured=overview.indexOf('data-measured-scale')
 const grey=overview.indexOf('data-unfinished-test')
 const more=overview.indexOf('data-profile-extra-tools')
 const actions=overview.indexOf('data-profile-actions')
 assert.ok(head>0 && measured>head && grey>measured && more>grey && actions>more,'head -> measured -> gray pending -> actions')
 assert.match(overview, /<TestExplorerVisual compact locale=\{locale\}/)
 assert.match(overview,/greyBar/)
 assert.match(overview, /<ClientReportActions data=\{data\} locale=\{locale\} singleAction/)
 assert.match(overview,/source=test-results/)
 assert.match(overview,/tests\?filter=completed/)
 assert.match(overview,/tests\?filter=remaining/)
 assert.match(report,/generateClientPdf/)
 assert.match(workspace,/initialStatusFilter=\{searchParams\.get\('filter'\)\}/)
 assert.match(battery,/const completedRuns = new Set\(plan\?\.completedRunIds \|\| \[\]\)/)
 assert.match(battery,/const pastRows = useMemo/)
 assert.match(battery,/statusFilter === 'remaining'/)
 assert.match(css, /\.greyBar/)
 assert.match(workspace,/source === 'test-results'/)
 assert.doesNotMatch(overview,/localStorage|sessionStorage|analytics\.track/)
})
