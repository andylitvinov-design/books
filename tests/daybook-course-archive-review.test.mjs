import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {archiveReviewPrograms,archiveReviewRows,archiveReviewOutput,COURSE_REVIEW_TAG} from '../lib/app/course-archive-review.mjs'
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
const record=(n,courseSessionId,extra={})=>({id:id(n),courseSessionId,provenance:'client_reviewed_dialogue',completedAt:'2026-11-26T15:00:00.000Z',personaId:'mira',goal:'Client focus',clientSummary:'Client takeaway',clientNextStep:'Client step',turns:[{content:'PRIVATE_TRANSCRIPT'}],...extra})
test('programs keep exact canonical topic sets and no implicit selection',()=>{
 for(const locale of ['en','ru','es']){
  const programs=archiveReviewPrograms(locale)
  assert.equal(programs.length,4)
  const rows=archiveReviewRows('journey',[record(1,'life_direction'),record(2,'goal_result')],{},locale)
  assert.equal(rows.length,8);assert.equal(rows[0].available.length,1)
  assert.ok(rows.every(row=>row.selected===null&&row.title))
  assert.equal(archiveReviewRows('goal',[record(1,'life_direction'),record(2,'goal_result')],{},locale)[0].available.length,1)
  assert.equal(archiveReviewRows('clarity',[],{},locale).length,4)
 }
})
test('exact course and reviewed archive record only; deleted, duplicate and malformed records fail closed',()=>{
 const records=[record(1,'life_direction'),record(2,'life_direction'),record(2,'life_direction'),record(3,'goal_result'),record(4,'life_direction',{provenance:'draft'}),record(5,'life_direction',{completedAt:'invalid'}),record(6,'introductory'),record(7,'life_direction',{id:'fake'})]
 const rows=archiveReviewRows('journey',records,{life_direction:id(3),inner_compass:id(1)})
 assert.deepEqual(rows[0].available.map(x=>x.id),[id(1)])
 assert.ok(rows.every(row=>row.selected===null))
 assert.equal(archiveReviewRows('journey',records,{life_direction:id(1)})[0].selected.id,id(1))
 assert.equal(archiveReviewRows('journey',[],{life_direction:id(1)})[0].selected,null)
 assert.throws(()=>archiveReviewOutput('journey',records,{}))
 assert.throws(()=>archiveReviewRows('__proto__',records))
})
test('local PDF contains selected takeaways, not transcript; private note stores references and new plan only',()=>{
 const records=[record(1,'life_direction'),record(2,'inner_compass',{clientSummary:'UNSELECTED_TAKEAWAY'})]
 const output=archiveReviewOutput('journey',records,{life_direction:id(1)},'My new plan','en')
 assert.equal(output.selectedCount,1);assert.equal(output.total,8)
 assert.match(output.protocolOverview,/Client takeaway/);assert.match(output.protocolOverview,/Not recorded|No report selected/)
 assert.doesNotMatch(output.protocolOverview,/PRIVATE_TRANSCRIPT|UNSELECTED_TAKEAWAY/)
 assert.match(output.journalText,/My new plan/);assert.ok(output.journalText.includes(id(1)))
 assert.doesNotMatch(output.journalText,/Client takeaway|Client focus|Client step|PRIVATE_TRANSCRIPT|UNSELECTED_TAKEAWAY/)
 assert.ok(!output.journalText.includes(id(2)))
 assert.equal(COURSE_REVIEW_TAG,'coach-journey-review-v1')
})
test('only owner-scoped visible archive, existing verified saver and local PDF renderer are used',()=>{
 const ui=readFileSync(new URL('../components/app/course-archive-review.jsx',import.meta.url),'utf8')
 const page=readFileSync(new URL('../components/app/my-coaching-plan.jsx',import.meta.url),'utf8')
 assert.match(page,/protocolPage.accountId===accountId[^\n]*<CourseArchiveReview/)
 assert.match(page,/protocols=\{visibleProtocols\}/)
 assert.match(ui,/createJournalSaver\(appFetch,accountId\)/)
 assert.match(ui,/await saver\.current\.save\(pending\.current\)/)
 assert.match(ui,/entryKind:'protocol',entries:\[\]/)
 assert.doesNotMatch(ui,/localStorage|sessionStorage|completeSession|checkout|fetch\(['"]/i)
})
