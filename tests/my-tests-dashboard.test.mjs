import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'
import {getSiteNavigation,activeNavigationId} from '../lib/site-navigation-model.js'

const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('My tests navigation stays public before login and owner-only after Google',()=>{
 assert.equal(getSiteNavigation('en').find(x=>x.id==='cabinet').label,'My tests')
 assert.equal(getSiteNavigation('en').find(x=>x.id==='cabinet').href,'/en/client')
 assert.equal(getSiteNavigation('ru').find(x=>x.id==='cabinet').href,'/ru/client')
 assert.equal(activeNavigationId('/en/app'),'cabinet')
 const workspace=read('components/app/app-workspace.jsx')
 assert.match(workspace,/<AccountTestBattery/)
 assert.match(workspace,/<Portrait data=\{data\} locale=\{locale\}/)
})

test('compact My Tests stat cards and every saved selection are visible without a Show tests action',()=>{
 const dash=read('components/app/my-tests-dashboard.jsx')
 const battery=read('components/app/account-test-battery.jsx')
 assert.match(dash,/data-my-tests-dashboard/)
 assert.match(dash,/rows\.length\?Math\.round\(completed\/rows\.length\*100\):0/)
 assert.match(dash,/className=\{styles\.stats\}/)
 assert.match(dash,/\{hasList\?children:/)
 assert.match(dash,/className=\{styles\.filterButton\}/)
 assert.match(dash,/onClick=\{onOpenFilters\}/)
 assert.match(battery,/data-inline-selected-tests/)
 assert.match(battery,/className=\{styles\.group\}/)
 assert.match(battery,/id="my-tests-list"/)
 assert.doesNotMatch(dash,/Another selection is ready/)
 assert.doesNotMatch(dash,/styles\.previewList/)
 assert.doesNotMatch(battery,/\{showList && <div className=\{styles\.listArea\}/)
})

test('one tap starts or resumes a chosen test and a separate button removes it from a battery only',()=>{
 const battery=read('components/app/account-test-battery.jsx')
 const repo=read('lib/app/repository.js')
 const routes=read('app/api/app/[...path]/route.js')
 assert.match(battery,/onClick=\{\(\) => openTest\(row\)\}/)
 assert.match(battery,/onClick=\{\(\) => removeSelectedTest\(row\)\}/)
 assert.match(battery,/data-remove-selected-test=\{row\.key\}/)
 assert.match(battery,/api\('test-plans\/' \+ encodeURIComponent\(currentPlan\.id\) \+ '\/remove'/)
 assert.match(battery,/row\.run \? c\.resume : done \? c\.repeat : c\.begin/)
 assert.match(battery,/router\.push\(root \+ '\/runs\/'/)
 assert.match(battery,/\?mode=quick/)
 assert.match(repo,/async removeTestPlanItem\(actor, id, input\)/)
 assert.match(repo,/ownedTestPlan\(db, actor, id, \{ write: true \}\)/)
 assert.match(repo,/completedRunIds/)
 assert.match(routes,/repo\.removeTestPlanItem\(actor, path\[1\], body\)/)
})

test('report and recommendations remain available and based on completed private measurements',()=>{
 const dash=read('components/app/my-tests-dashboard.jsx')
 const report=read('components/app/client-report-actions.jsx')
 const model=read('lib/profile/client-report.js')
 assert.match(dash,/<ClientReportActions data=\{data\} locale=\{locale\} singleAction/)
 assert.match(dash,/nextPersonalRecommendation\(\{results:results\|\|\[\],snapshot,locale\}\)/)
 assert.match(report,/generateClientPdf/)
 assert.match(model,/latest\.dimensions\.map/)
})

test('filters are an explicit optional action; pending public selection is reviewed there only',()=>{
 const dash=read('components/app/my-tests-dashboard.jsx')
 const battery=read('components/app/account-test-battery.jsx')
 const css=read('components/app/account-test-battery.module.css')
 assert.match(dash,/onOpenFilters,filtersOpen=false,hasNewSelection=false/)
 assert.match(battery,/function openFilters\(\)/)
 assert.match(battery,/<section id="my-test-explorer"/)
 assert.match(battery,/\{conflict && <aside className=\{styles\.reviewSelection\} data-pending-selection>/)
 assert.match(battery,/onClick=\{keepSavedSet\}/)
 assert.match(battery,/onClick=\{applyNewSelection\}/)
 assert.match(css,/\.removeButton/)
 assert.match(css,/@media\(max-width:760px\)/)
})
