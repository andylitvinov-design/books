import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {buildExplorerEntries} from '../lib/assessments/test-explorer.js'
import {getDefinitionById, getAssessmentDefinition} from '../lib/assessments/definitions.js'
import {monitoringCatalogItem} from '../data/assessments/catalog.js'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const source=read('scripts/verify-app-r1.mjs')
function assertWeeklyJourney(code, entries){
 const calls=[...code.matchAll(/await enterTest\('([^']+)','Quick'\)/g)]
 assert.equal(calls.length,1,'one exact Quick journey')
 assert.equal(calls[0][1],'Weekly Wellbeing Check-in','approved non-diagnostic catalog title')
 const selected=entries.filter(entry=>entry.title===calls[0][1]&&entry.selectable)
 assert.equal(selected.length,1,'exactly one selectable catalog identity')
 assert.equal(selected[0].key,'hh-weekly-pulse')
 assert.match(code,/await expect\(page\.locator\('\.hh-quick-question'\)\)\.toHaveCount\(8\)/)
 assert.match(code,/const weeklyResumeRow=page\.locator\('#my-tests-list article'\)\.filter\(\{has:page\.getByRole\('heading',\{name:'Weekly Wellbeing Check-in',exact:true\}\)\}\)/)
 assert.match(code,/getByRole\('heading',\{name:'Finish: Weekly Wellbeing Check-in',exact:true\}\)/)
 assert.doesNotMatch(code,/Weekly Psychic Health/)
 assert.match(code,/Overall, how emotionally okay have you felt during the past 7 days\?/)
}
const entries=buildExplorerEntries({locale:'en',audience:'account'})
test('Quick journey uses exact current weekly catalog identity and preserves runner assertions',()=>{
 assertWeeklyJourney(source,entries)
 const saved=read('components/app/account-test-battery.jsx')
 assert.match(saved,/title: catalog\?\.title\?\.\[locale\] \|\| catalog\?\.title\?\.en \|\| definition\.title/)
 assert.match(saved,/<h3>\{row\.title\}<\/h3>/)
})
for(const [name,edit] of [
 ['stale title',code=>code.replace("enterTest('Weekly Wellbeing Check-in','Quick')","enterTest('Weekly Psychic Health','Quick')")],
 ['wrong mode',code=>code.replace("enterTest('Weekly Wellbeing Check-in','Quick')","enterTest('Weekly Wellbeing Check-in','Guided')")],
]) test('weekly contract rejects '+name,()=>assert.throws(()=>assertWeeklyJourney(edit(source),entries)))
for(const [name,edit] of [
 ['missing identity',list=>list.filter(e=>e.key!=='hh-weekly-pulse')],
 ['unselectable identity',list=>list.map(e=>e.key==='hh-weekly-pulse'?{...e,selectable:false}:e)],
 ['duplicate identity',list=>[...list,list.find(e=>e.key==='hh-weekly-pulse')]],
 ['wrong key',list=>list.map(e=>e.key==='hh-weekly-pulse'?{...e,key:'wrong-key'}:e)],
]) test('weekly contract rejects '+name,()=>assert.throws(()=>assertWeeklyJourney(source,edit(entries))))

for(const [name,from,to] of [
 ['stale resume heading',"name:'Weekly Wellbeing Check-in',exact:true","name:'Weekly Psychic Health',exact:true"],
 ['stale profile heading',"name:'Finish: Weekly Wellbeing Check-in',exact:true","name:'Finish: Weekly Psychic Health',exact:true"],
 ['wrong resume identity',"name:'Weekly Wellbeing Check-in',exact:true","name:'Personality Baseline',exact:true"],
 ['partial resume matching',"name:'Weekly Wellbeing Check-in',exact:true","name:'Weekly Wellbeing Check-in',exact:false"],
 ['partial profile matching',"name:'Finish: Weekly Wellbeing Check-in',exact:true","name:'Finish: Weekly Wellbeing Check-in',exact:false"],
]) test('full weekly scenario rejects '+name,()=>{
 const changed=source.replace(from,to);assert.notEqual(changed,source)
 assert.throws(()=>assertWeeklyJourney(changed,entries))
})
test('actual profile draft recommendation uses the same catalog identity and exact run destination',()=>{
 const workspace=read('components/app/app-workspace.jsx')
 const start=workspace.indexOf('function profileDashboardNextStep(')
 const end=workspace.indexOf('\n}',start)+2
 assert.ok(start>=0&&end>start)
 const nextStep=new Function('getDefinitionById','monitoringCatalogItem',workspace.slice(start,end)+';return profileDashboardNextStep')(getDefinitionById,monitoringCatalogItem)
 const definition=getAssessmentDefinition('hh-weekly-pulse','v1','en')
 for(const status of ['draft','in_progress']){
  const result=nextStep({data:{runs:[{id:'synthetic-weekly-run',definitionId:definition.id,status}]},locale:'en'})
  assert.equal(result.title,'Finish: Weekly Wellbeing Check-in')
  assert.equal(result.href,'/en/app/runs/synthetic-weekly-run')
  assert.equal(result.action,'Continue test')
 }
})
