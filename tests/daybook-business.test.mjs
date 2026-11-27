import test from 'node:test'
import assert from 'node:assert/strict'
import {BUSINESS_SYLLABUS,businessTag,savedBusinessTask,businessProgress,legacyBusinessTasks,businessSessionScreenshot,businessReportPdf} from '../lib/app/business-daybook.mjs'
import {readFileSync} from 'node:fs'
const note=(week=1,step=1,extra={})=>({id:week+'-'+step,kind:'note',goalId:null,revision:1,tags:[businessTag(week,step)],text:'Result',updatedAt:'2026-11-24T00:00:00Z',...extra})
test('eight strategic sessions and three concrete practices per locale',()=>{
 for(const lang of ['en','ru','es']){assert.equal(BUSINESS_SYLLABUS[lang].length,8);for(const [title,description,tasks] of BUSINESS_SYLLABUS[lang]){assert.ok(title&&description);assert.equal(tasks.length,3);for(const [name,instruction] of tasks)assert.ok(name&&instruction)}}
 assert.throws(()=>businessTag(9,1));assert.throws(()=>businessTag(1,4));assert.throws(()=>businessTag('1',1))
})
test('business progress only counts its own saved account notes, not goal or clarity entries',()=>{
 assert.deepEqual(businessProgress([]),{completed:0,total:24,percent:0,weeks:[0,0,0,0,0,0,0,0],next:{week:1,step:1}})
 assert.equal(businessProgress([note(),note(1,2,{goalId:'another-goal'}),note(1,3,{tags:['clarity-week-1']}),note(2,1,{text:' '})]).completed,1)
 assert.deepEqual(businessProgress([note()]).next,{week:1,step:2})
 assert.equal(savedBusinessTask([note(1,1,{id:'old'}),note(1,1,{id:'new',revision:2,updatedAt:'2026-11-25T00:00:00Z'})],1,1).id,'new')
 const all=Array.from({length:24},(_,i)=>note(Math.floor(i/3)+1,i%3+1))
 assert.deepEqual(businessProgress(all),{completed:24,total:24,percent:100,weeks:[3,3,3,3,3,3,3,3],next:null})
})
test('business route is private, uses existing verified owner saver and has a real profile entry',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
 const ui=read('components/app/business-daybook.jsx')
 assert.match(ui,/createJournalSaver\(appFetch,id\)/)
 assert.match(ui,/collectJournalExport\(appFetch,id/)
 assert.match(ui,/await saver.current.save\(input\)/)
 assert.match(ui,/createJournalSessionGuard\(appFetch,account/)
 assert.doesNotMatch(ui,/localStorage|sessionStorage/)
 assert.match(read('app/[locale]/app/daybook/business/page.jsx'),/index:false/)
 assert.match(read('components/app/profile-space-dashboard.jsx'),/data-business-daybook-link/)
})

test('prior four-session notes are retained without marking new sessions complete',()=>{
 const previous=note(3,1,{tags:['hh-business-v1-w3-s1']})
 assert.equal(businessProgress([previous]).completed,0)
 assert.equal(legacyBusinessTasks([previous],'ru')[0].title,'Организационная трансформация')
 assert.equal(legacyBusinessTasks([previous],'ru')[0].text,'Result')
 assert.equal(businessTag(8,3),'hh-business-v2-w8-s3')
 assert.deepEqual(businessProgress([note(8,3)]).weeks,[0,0,0,0,0,0,0,1])
})
test('each session screenshot and both original report PDFs are checked into the app',()=>{
 for(const locale of ['ru','en','es'])for(let n=1;n<=8;n++){
  const bytes=readFileSync(new URL('../public'+businessSessionScreenshot(locale,n),import.meta.url))
  assert.equal(bytes.subarray(0,4).toString(),'RIFF')
  assert.equal(bytes.subarray(8,12).toString(),'WEBP')
  assert.ok(bytes.length<200000)
 }
 assert.equal(businessReportPdf('ru'),'/reports/business-program/ru.pdf')
 assert.equal(businessReportPdf('en'),'/reports/business-program/en.pdf')
 assert.equal(businessReportPdf('es'),businessReportPdf('en'))
 for(const locale of ['ru','en','es'])assert.equal(readFileSync(new URL('../public'+businessReportPdf(locale),import.meta.url)).subarray(0,5).toString(),'%PDF-')
})
