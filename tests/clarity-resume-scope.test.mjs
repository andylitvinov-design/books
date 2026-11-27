import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {clarityResumeRunId,clarityResumeMatches,clarityDaybookRunSelection,validClarityRunSummary,clarityMyPageRunHref} from '../lib/coaching/clarity-resume-scope.mjs'
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

test('private Daybook deep link rejects duplicate or invalid run/day selectors',()=>{
 const parse=q=>clarityDaybookRunSelection(new URLSearchParams(q))
 assert.deepEqual(parse('program=clarity'),{requested:false,id:null,day:null,invalid:false})
 assert.deepEqual(parse('courseRunId='+a+'&clarityDay=2'),{requested:true,id:a,day:2,invalid:false})
 for(const q of ['courseRunId=bad','courseRunId='+a+'&courseRunId='+b,'courseRunId='+a+'&clarityDay=4','courseRunId='+a+'&clarityDay=1&clarityDay=2'])assert.equal(parse(q).invalid,true)
})
test('exact readback rejects other run and inconsistent minutes',()=>{
 const days=[1,2,3].map((day,i)=>({day,protocolId:'00000000-0000-4000-8000-00000000000'+(i+3),elapsedMs:0,remainingMs:1200000,status:'not_started'}))
 const run={id:a,ordinal:1,access:'free',status:'ready',totalElapsedMs:0,days}
 assert.equal(validClarityRunSummary(run,a),true)
 assert.equal(validClarityRunSummary(run,b),false)
 assert.equal(validClarityRunSummary({...run,totalElapsedMs:1},a),false)
 assert.equal(validClarityRunSummary({...run,days:[days[0],days[1],{...days[2],protocolId:days[0].protocolId}]},a),false)
 assert.equal(validClarityRunSummary({...run,days:[days[0],days[1],{...days[2],remainingMs:0}]},a),false)
})

test('each My Page Express card opens its own saved run and logical day',()=>{
 for(const locale of ['en','ru','es']){
  const first=clarityMyPageRunHref(locale,{kind:'clarity',id:a,day:2})
  const second=clarityMyPageRunHref(locale,{kind:'clarity',id:b,day:null})
  assert.equal(first,'/'+locale+'/app/daybook?program=clarity&courseRunId='+a+'&clarityDay=2')
  assert.equal(second,'/'+locale+'/app/daybook?program=clarity&courseRunId='+b)
  assert.deepEqual(clarityDaybookRunSelection(new URL(first,'https://test.invalid').searchParams),{requested:true,id:a,day:2,invalid:false})
  assert.deepEqual(clarityDaybookRunSelection(new URL(second,'https://test.invalid').searchParams),{requested:true,id:b,day:null,invalid:false})
 }
 for(const card of [{kind:'clarity',id:'bad',day:1},{kind:'clarity',id:a,day:4},{kind:'legacy',id:a,day:1},{kind:'clarity',id:a,day:'2'},null])assert.equal(clarityMyPageRunHref('en',card),null)
 assert.equal(clarityMyPageRunHref('bad',{kind:'clarity',id:a,day:1}),null)
 const ui=readFileSync(new URL('../components/app/my-page-courses.jsx',import.meta.url),'utf8')
 assert.ok(ui.includes('const href=clarityMyPageRunHref(locale,c)'))
 assert.ok(ui.includes('const view=courseView(c,lang,t);if(!view)return null'))
})

test('restored server-ended session opens results without restarting or silently approving a report',()=>{
 const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
 const restore=ui.slice(ui.indexOf('async function restorePrivateDraft('),ui.indexOf('function beginRestoredConversation('))
 assert.ok(restore.includes('result?.draft?.id!==item.id'))
 assert.ok(restore.includes('(result.courseRunId||null)!==(item.courseRunId||null)'))
 assert.match(restore,/if\(timedEnd\)\{\s*clarityTimeLimit\.current=true\s*setResumePending\(false\);setPaused\(true\)\s*setProtocolFinishedAt\(new Date\(\)\.toISOString\(\)\);setProtocolEditing\(false\);setProtocolOpen\(true\)/)
 assert.ok(restore.includes('if(!timedEnd&&thematic?.step.crossCoach&&!thematic.step.paused)toggleComposer()'))
 assert.doesNotMatch(restore,/saveProtocol\(/)
 const expr=restore.match(/const timedEnd=(timeKnown[^\n]+)/)?.[1]
 assert.ok(expr)
 const timedEnd=new Function('timeKnown','restoredTime','CLARITY_COURSE_SECONDS','return '+expr)
 assert.equal(timedEnd(true,{status:'time_limit',elapsedSeconds:1200,remainingSeconds:0},1200),true)
 for(const [known,time] of [[false,{status:'time_limit',elapsedSeconds:1200,remainingSeconds:0}],[true,{status:'paused',elapsedSeconds:1200,remainingSeconds:0}],[true,{status:'active',elapsedSeconds:1200,remainingSeconds:0}],[true,{status:'time_limit',elapsedSeconds:1199,remainingSeconds:1}],[true,{status:'time_limit',elapsedSeconds:1200,remainingSeconds:1}]])assert.equal(timedEnd(known,time,1200),false)
 const close=ui.slice(ui.indexOf('async function closeProtocolToRating('),ui.indexOf('async function submitSessionRating('))
 assert.ok(close.includes('if(clarityTimeLimit.current)'))
 assert.ok(close.includes('clarityReturnHref(lang,day,activeCourseRunId)'))
 assert.doesNotMatch(close,/saveProtocol\(/)
})

test('unreviewed checkpoints cannot assert trusted completion or homework and unbound final save requires exact server proof',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
 const draft=read('lib/personal-coaching/protocol-draft.mjs')
 assert.ok(draft.includes("courseFieldReview:undefined,clarityTimeLimitReached:undefined,clarityHomeworkAccepted:undefined"))
 const service=read('lib/app/personal-coaching.js')
 const save=service.slice(service.indexOf('export async function saveMyCoachProtocol'),service.indexOf('export async function deleteMyCoachProtocol'))
 assert.ok(save.includes("else if(!existing&&protocol.clarityTimeLimitReached===true)"))
 assert.ok(save.includes('await readClarityCourseClockInTransaction(db,config,actor)'))
 assert.ok(save.includes("draft?.state!=='active'||!clarityClockTimedEnd(legacyClock,day,protocol.id.toLowerCase())"))
 assert.ok(save.indexOf("throw new AppError('CLARITY_SESSION_STILL_OPEN',409)",save.indexOf('const legacyClock='))<save.indexOf('await finalizeCoachDraft'))
 assert.ok(save.includes('if (existing && !sameSavedProtocol(existing, protocol))'))
})

test('completed saved but unreviewed session returns to its exact original coach for report review',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
 const ui=read('components/app/clarity-run-catalog.jsx')
 assert.ok(ui.includes("transcript&&!transcript.reviewed&&day.status==='time_limit'&&day.elapsedMs===1200000&&day.remainingMs===0"))
 assert.ok(ui.includes('coachSessionHref(locale,transcript.personaId)'))
 assert.ok(ui.includes('data-clarity-review-completed href={clarityCoachHref(reviewHref,day.day,run.id)}'))
 assert.ok(ui.includes('timedEnd={completedUnreviewed}'))
 const live=read('components/my-coach-live-dialogue.jsx')
 assert.ok(live.includes("item.clarityTime?.status==='time_limit'&&item.clarityTime.elapsedSeconds===CLARITY_COURSE_SECONDS&&item.clarityTime.remainingSeconds===0"))
 assert.ok(live.includes("completedReview?{ru:'Открыть итоги'"))
 const docs=read('components/app/clarity-course-protocol.jsx')
 assert.ok(docs.includes('!sessionProtocol.reviewed'))
 assert.ok(docs.includes('t.pendingResult'))
})
