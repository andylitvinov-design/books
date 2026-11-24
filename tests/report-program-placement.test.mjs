import {test} from 'node:test'
import assert from 'node:assert/strict'
import {parseReportProgram,normalizeReportPlacement,reportWeekHref} from '../lib/consultations/report-program.mjs'
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
 assert.equal(reportWeekHref('ru',{program:'business',week:4}),'/ru/app/daybook?program=business&stage=4&tab=stages')
 assert.equal(reportWeekHref('en',null),'/en/app/portrait#personal-reports')
})
