import {test} from 'node:test'
import assert from 'node:assert/strict'
import {parseReportProgram,normalizeReportPlacement,reportWeekHref,reportDaybookWeek} from '../lib/consultations/report-program.mjs'
test('program placement validates exact boundaries; standalone has no week',()=>{
 assert.deepEqual(parseReportProgram('clarity','4'),{program:'clarity',week:4})
 assert.deepEqual(parseReportProgram('goal',8),{program:'goal',week:8})
 assert.deepEqual(parseReportProgram('business',1),{program:'business',week:1})
 assert.equal(parseReportProgram('standalone',''),null)
 for(const [p,w] of [['clarity',5],['business',8],['goal',0],['goal','01'],['unknown',1],['standalone',1],['goal',null],['__proto__',1]])
  assert.throws(()=>parseReportProgram(p,w))
 assert.throws(()=>normalizeReportPlacement({program:'goal',week:1,paid:true}))
})
test('fixed Daybook path never includes name, private payload or a client supplied redirect',()=>{
 assert.equal(reportWeekHref('ru',{program:'business',week:4}),'/ru/app/daybook/business?week=4')
 for(const locale of ['en','ru','es']) {
  assert.equal(reportWeekHref(locale,{program:'clarity',week:2}),`/${locale}/app/daybook?program=clarity&week=2`)
  assert.equal(reportWeekHref(locale,{program:'goal',week:8}),`/${locale}/app/daybook?tab=goals`)
  assert.equal(reportWeekHref(locale,{program:'business',week:4}),`/${locale}/app/daybook/business?week=4`)
 }
 assert.equal(reportWeekHref('en',null),'/en/app/portrait#personal-reports')
})

test('week view accepts a single canonical bounded number, never a goal or access claim',()=>{
 for(const program of ['clarity','business']){
  for(let n=1;n<=4;n++)assert.equal(reportDaybookWeek(program,String(n)),n)
  for(const value of [null,undefined,1,'0','5','01','1.0',['1','2'],'1&paid=true'])assert.equal(reportDaybookWeek(program,value),null)
 }
 assert.equal(reportDaybookWeek('goal','1'),null)
})
