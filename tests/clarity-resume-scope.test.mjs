import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {clarityResumeRunId,clarityResumeMatches} from '../lib/coaching/clarity-resume-scope.mjs'
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002'
test('explicit run binding never silently restores a different course or legacy draft',()=>{
 assert.equal(clarityResumeRunId(a),a)
 for(const invalid of [null,undefined,'bad',[a],a.toUpperCase()+'x'])assert.equal(clarityResumeRunId(invalid),null)
 assert.equal(clarityResumeMatches({courseRunId:a},a),true)
 assert.equal(clarityResumeMatches({courseRunId:b},a),false)
 assert.equal(clarityResumeMatches(null,a),false)
 assert.equal(clarityResumeMatches({courseRunId:a},null),false)
 assert.equal(clarityResumeMatches(null,null),true)
 assert.equal(clarityResumeMatches({courseRunId:'bad'},'bad'),false)
})
test('scope is owner-filtered before pagination, exact on resume and passed through coach selection',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
 const store=read('lib/app/my-coach-protocol-drafts.js'),route=read('app/api/app/my-coach/draft/route.js'),ui=read('components/my-coach-live-dialogue.jsx')
 assert.ok(store.includes('where account_id=$1 and course_run_id=$'))
 assert.ok(store.includes('clarityResumeMatches(binding,input.courseRunId)'))
 assert.ok(route.includes("courseRunId:params.get('courseRunId')"))
 assert.ok(ui.includes('item.courseRunId?{courseRunId:item.courseRunId}'))
 assert.ok(ui.includes("greetingIdentity.status==='loading'||courseRunId"))
 assert.ok(read('components/app/clarity-run-catalog.jsx').includes("clarityCoachHref('/'+locale+'/my-coach',day.day,run.id)"))
})
