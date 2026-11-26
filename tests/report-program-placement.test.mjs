import {test} from 'node:test'
import assert from 'node:assert/strict'
import {REPORT_PROGRAMS,parseReportProgram,normalizeReportPlacement,reportWeekHref,reportDaybookWeek,reportWeekIndexItem} from '../lib/consultations/report-program.mjs'
import {BUSINESS_SESSION_COUNT} from '../lib/app/business-daybook.mjs'
test('program placement validates exact boundaries; standalone has no week',()=>{
 assert.equal(REPORT_PROGRAMS.business.weeks,BUSINESS_SESSION_COUNT)
 assert.deepEqual(parseReportProgram('business',8),{program:'business',week:8})
 assert.deepEqual(parseReportProgram('clarity','4'),{program:'clarity',week:4})
 assert.deepEqual(parseReportProgram('goal',8),{program:'goal',week:8})
 assert.deepEqual(parseReportProgram('business',1),{program:'business',week:1})
 assert.equal(parseReportProgram('standalone',''),null)
 for(const [p,w] of [['clarity',5],['business',9],['goal',0],['goal','01'],['unknown',1],['standalone',1],['goal',null],['__proto__',1]])
  assert.throws(()=>parseReportProgram(p,w))
 assert.throws(()=>normalizeReportPlacement({program:'goal',week:1,paid:true}))
})
test('fixed Daybook path never includes name, private payload or a client supplied redirect',()=>{
 assert.equal(reportWeekHref('ru',{program:'business',week:8}),'/ru/app/daybook/business?week=8')
 for(const locale of ['en','ru','es']) {
  assert.equal(reportWeekHref(locale,{program:'clarity',week:2}),`/${locale}/app/daybook?program=clarity&week=2`)
  assert.equal(reportWeekHref(locale,{program:'goal',week:8}),`/${locale}/app/daybook?tab=goals`)
  assert.equal(reportWeekHref(locale,{program:'business',week:4}),`/${locale}/app/daybook/business?week=4`)
 }
 assert.equal(reportWeekHref('en',null),'/en/app/portrait#personal-reports')
})

test('week view accepts a single canonical bounded number, never a goal or access claim',()=>{
 for(const program of ['clarity','business']){
  const max=REPORT_PROGRAMS[program].weeks
  for(let n=1;n<=max;n++)assert.equal(reportDaybookWeek(program,String(n)),n)
  for(const value of [null,undefined,1,'0',String(max+1),'01','1.0',['1','2'],'1&paid=true'])assert.equal(reportDaybookWeek(program,value),null)
 }
 assert.equal(reportDaybookWeek('goal','1'),null)
})

test('weekly index projects only approved report navigation metadata, not unbound goals or report content',()=>{
 const id='12345678-1234-4123-8123-123456789abc',reference={id,occurredOn:'2026-11-25',accountId:'private'},record={kind:'prescription',status:'active',programPlacement:{program:'clarity',week:2},analysis:'private'}
 assert.deepEqual(reportWeekIndexItem('clarity',reference,record),{id,occurredOn:'2026-11-25',week:2})
 assert.equal(reportWeekIndexItem('business',reference,record),null)
 assert.equal(reportWeekIndexItem('goal',reference,{...record,programPlacement:{program:'goal',week:2}}),null)
 assert.equal(reportWeekIndexItem('clarity',reference,{...record,status:'archived'}),null)
 assert.equal(reportWeekIndexItem('clarity',reference,{...record,kind:'payment'}),null)
 assert.equal(reportWeekIndexItem('clarity',reference,{...record,programPlacement:{program:'clarity',week:5}}),null)
 assert.equal(reportWeekIndexItem('clarity',{...reference,id:'invalid'},record),null)
})

test('goal placement requires explicit valid goal and verified account ownership for navigation or indexing',()=>{
 const goalId='12345678-1234-4123-8123-123456789abc',other='22345678-1234-4123-8123-123456789abc',p=parseReportProgram('goal',3,goalId),ref={id:other,occurredOn:'2026-11-25'},record={status:'active',kind:'prescription',programPlacement:p}
 assert.deepEqual(p,{program:'goal',week:3,goalId})
 assert.throws(()=>parseReportProgram('clarity',2,goalId))
 assert.throws(()=>parseReportProgram('goal',3,'wrong'))
 assert.equal(reportWeekHref('en',p),'/en/app/daybook?tab=goals')
 assert.equal(reportWeekHref('en',p,other),'/en/app/daybook?tab=goals')
 assert.equal(reportWeekHref('en',p,goalId),'/en/app/daybook?tab=stages&stage=3&goal='+goalId)
 assert.equal(reportWeekIndexItem('goal',ref,record,other),null)
 assert.deepEqual(reportWeekIndexItem('goal',ref,record,goalId),{id:other,occurredOn:ref.occurredOn,week:3})
})

test('eighth Business session is indexed only as an authorized business report',()=>{
 const id='12345678-1234-4123-8123-123456789abc',ref={id,occurredOn:'2026-11-25'},record={status:'active',kind:'prescription',programPlacement:{program:'business',week:8}}
 assert.deepEqual(reportWeekIndexItem('business',ref,record),{id,occurredOn:ref.occurredOn,week:8})
 assert.equal(reportWeekIndexItem('clarity',ref,record),null)
 assert.equal(reportWeekIndexItem('business',ref,{...record,programPlacement:{program:'business',week:9}}),null)
})
