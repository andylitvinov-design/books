import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
test('CRM workday presents filters, exact contact navigation and follow-up actions',()=>{
 const manager=read('components/app/crm-manager.jsx')
 const tasks=read('components/app/crm-workflow.jsx')
 assert.match(manager,/\['tasks',language==='ru'\?'Задачи'/)
 assert.match(manager,/mode="tasks"/)
 assert.match(manager,/onOpenContact=\{focusContact\}/)
 assert.match(tasks,/filterCrmWorkdayTasks\(board,\{bucket,query:taskSearch\}\)/)
 assert.match(tasks,/aria-pressed=\{bucket===key\}/)
 assert.match(tasks,/onClick=\{\(\)=>onOpenContact\(item\.contactId\)\}/)
 for(const action of ["action:'complete'","action:'reschedule'","action:'cancel'"])
  assert.ok(tasks.includes(action))
 assert.doesNotMatch(tasks,/fetch\(|sendSms\(|sendEmail\(/)
})
test('off-page card focus aborts stale requests and uses scoped, no-cache POST',()=>{
 const manager=read('components/app/crm-manager.jsx')
 assert.match(manager,/focusAbortRef\.current\?\.abort\(\)/)
 assert.match(manager,/focusedIdRef\.current=id/)
 assert.match(manager,/method:'POST',credentials:'same-origin',cache:'no-store'/)
 assert.match(manager,/body:JSON\.stringify\(\{contactId:id\}\)/)
 assert.match(manager,/result\.contact\.id!==id/)
 assert.match(manager,/setFocusedContactId\(id\)/)
 assert.match(manager,/element\.focus\(\{preventScroll:true\}\)/)
 assert.match(manager,/tabIndex=\{contact\.id===focusedContactId\?-1:undefined\}/)
 assert.doesNotMatch(manager,/localStorage\.setItem|sessionStorage\.setItem/)
})
