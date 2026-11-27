import {createClarityCourseClock,advanceClarityCourseClock} from '../lib/coaching/clarity-course-clock.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {CLARITY_COURSE_IDS,CLARITY_COURSE_SECONDS,CLARITY_COURSE_GROUP,clarityDay,clarityCourseDay,clarityCourseId,clarityCoachHref,clarityReturnHref,clarityHomeworkRows,clarityHomeworkCandidates,clarityHomeworkTags,clarityHomeworkNotes,clarityHomeworkEntryId} from '../lib/coaching/clarity-course.mjs'
import {clarityCourseResult,clarityResultProjection} from '../lib/coaching/clarity-course-results.mjs'
import {coachCourseProtocolRows,coachCourseProtocolSchema,appendCoachCourseFieldReview,coachCourseFieldReviewQuotes} from '../lib/coaching/coach-course-protocol-schema.mjs'
import {claritySemanticResult,clarityRatingPair,clarityRatingAnswer,clarityRatingForQuestion,claritySpecialField} from '../lib/coaching/clarity-session-fields.mjs'
import {validClarityHomeworkAnswer} from '../lib/coaching/clarity-course.mjs'
import {checkpointAnswerMismatch} from '../lib/coaching/coach-course-question-binding.mjs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('three localized course days and bounded duration',()=>{
 assert.equal(CLARITY_COURSE_SECONDS,1200)
 assert.equal(CLARITY_COURSE_GROUP.sessions.length,3)
 for(const day of [1,2,3]){
  assert.equal(clarityDay(String(day)),day)
  assert.equal(clarityCourseDay(clarityCourseId(day)),day)
  assert.equal(clarityCourseId(day),CLARITY_COURSE_IDS[day-1])
  for(const locale of ['en','ru','es']){
   assert.ok(CLARITY_COURSE_GROUP.sessions[day-1].title[locale])
   assert.equal(clarityCoachHref('/'+locale+'/my-coach',day),'/'+locale+'/my-coach?clarityDay='+day)
   assert.equal(clarityReturnHref(locale,day),'/'+locale+'/app/daybook?program=clarity&clarityDay='+day)
  }
 }
 for(const invalid of [0,4,-1,'01','4','1.0',null,undefined,[],{}])assert.equal(clarityDay(invalid),null)
 assert.equal(clarityCourseDay('clarity_discover'),null)
 assert.equal(clarityCoachHref('//external.example',1),'//external.example')
})
test('homework requires a matching server clock, reviewed ending and separate acceptance',()=>{
 const protocolId='00000000-0000-4000-8000-000000000001',segmentId='00000000-0000-4000-8000-000000000011',connectionId='00000000-0000-4000-8000-000000000021'
 let clock=createClarityCourseClock()
 const event={day:1,protocolId,segmentId,connectionId}
 clock=advanceClarityCourseClock(clock,{...event,type:'begin',expectedRevision:0,atMs:0,coachId:'mira',consent:{kind:'explicit_client_session_consent',decision:'start',protocolId,connectionId,coachId:'mira',atMs:0,turnId:'consent:1'}})
 for(let t=10000;t<=1200000;t+=10000)clock=advanceClarityCourseClock(clock,{...event,type:'observe',expectedRevision:clock.revision,atMs:t,evidence:'server_observed_connected'})
 const opening={completed:true,declined:false,checkmarks:{confirmation:true},confirmedQuote:'Yes'}
 const record={id:'00000000-0000-4000-8000-000000000001',courseSessionId:'clarity_day_1',provenance:'client_reviewed_dialogue',savedAt:'2026-11-26T12:00:00Z',turns:[],clientSummary:'Reflection',clientNextStep:'Next',durationSeconds:1200,opening}
 for(const locale of ['en','ru','es']){
  assert.equal(coachCourseProtocolRows(record.courseSessionId,[],null,locale).length,10)
  assert.deepEqual(clarityCourseResult(record,locale).homework,[])
  const timed={...record,clarityTimeLimitReached:true}
  assert.equal(clarityHomeworkCandidates(timed,coachCourseProtocolRows(record.courseSessionId,[],null,locale)).length,10)
  assert.deepEqual(clarityCourseResult(timed,locale).homework,[])
  assert.deepEqual(clarityCourseResult({...timed,clarityHomeworkAccepted:true},locale).homework,[])
  const result=clarityCourseResult({...timed,clarityHomeworkAccepted:true},locale,{clock})
  assert.equal(result.day,1);assert.equal(result.summary,'Reflection')
  assert.equal(result.homework.length,10);assert.ok(result.homework.every(r=>r.question))
 }
 const accepted={...record,clarityTimeLimitReached:true,clarityHomeworkAccepted:true}
 assert.equal(clarityCourseResult({...record,courseSessionId:'clarity_support'}),null)
 assert.equal(clarityCourseResult({...record,savedAt:null}),null)
 assert.equal(clarityCourseResult({...record,provenance:'draft'}),null)
 for(const bad of [{clarityTimeLimitReached:false},{durationSeconds:1199},{opening:null},{opening:{...opening,completed:false}},{courseSessionId:'clarity_day_2'},{clarityHomeworkAccepted:false},{turns:[{role:'assistant',mode:'safety'}]}]){
  assert.deepEqual(clarityCourseResult({...accepted,...bad},'en',{clock}).homework,[])
 }
 const rows=[['request','not_explored'],['outer_body_health','needs_confirmation'],['needs','confirmed'],['strengths','skipped_by_client'],['symptoms','not_explored']].map(([id,status])=>({id,status,label:'L',question:'Q'}))
 assert.deepEqual(clarityHomeworkRows(accepted,rows,clock).map(r=>r.id),['request','outer_body_health'])
 assert.deepEqual(clarityHomeworkRows(accepted,rows),[])
 assert.deepEqual(clarityHomeworkRows({...accepted,id:'00000000-0000-4000-8000-000000000009'},rows,clock),[])
 assert.deepEqual(clarityHomeworkRows({...accepted,clarityHomeworkAccepted:false},rows,clock),[])
 assert.deepEqual(clarityHomeworkRows(record,rows),[])
})
test('homework answers are saved separately, scoped to the exact report and field',async()=>{
 const report='00000000-0000-4000-8000-000000000001',account='00000000-0000-4000-8000-000000000002'
 const tags=clarityHomeworkTags(report,'request')
 assert.deepEqual(tags,['hw:'+report,'hw-field:request'])
 assert.ok(tags.every(t=>t.length<=40))
 assert.equal(clarityHomeworkTags(report,'unknown'),null)
 assert.ok(clarityHomeworkTags(report,'symptoms'))
 const note={kind:'note',goalId:null,revision:1,tags,text:'My reflection'}
 assert.deepEqual(clarityHomeworkNotes([note,{...note,revision:0},{...note,text:' '},{...note,goalId:account}],report,'request'),[note])
 assert.deepEqual(clarityHomeworkNotes([note],report,'needs'),[])
 const id=await clarityHomeworkEntryId(account,report,'request')
 assert.equal(await clarityHomeworkEntryId(account,report,'request'),id)
 assert.notEqual(await clarityHomeworkEntryId(account,report,'needs'),id)
 assert.notEqual(await clarityHomeworkEntryId(report,report,'request'),id)
 assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
 assert.match(read('components/app/clarity-program.jsx'),/homework=\{<section data-clarity-personal-homework/)
 assert.match(read('components/my-coach-live-dialogue.jsx'),/clarityOpeningReady&&clarityVoiceActive&&speechRef\.current\?\.isConnected/)
 assert.doesNotMatch(read('components/my-coach-live-dialogue.jsx'),/clarityTimeLimit\.current=true/)
 assert.match(read('lib/app/clarity-course-access.js'),/CLARITY_TRUSTED_TRANSPORT_ADAPTER_READY=false/)
})
test('proposed voice grant is account and day scoped and feature gated',()=>{
 const sql=read('docs/coaching/clarity-course-voice-grants.proposal.sql')
 assert.match(sql,/primary key\(account_id,course_day\)/)
 assert.match(sql,/check\(course_day between 1 and 3\)/)
 assert.match(sql,/force row level security/)
 assert.match(sql,/account_id=\(select auth.uid\(\)\)/)
 assert.match(sql,/revoke all .* from public,anon,authenticated/)
 assert.match(read('lib/app/clarity-course-access.js'),/HH_CLARITY_FREE_COURSE_ENABLED/)
})

test('a single projection updates both the remaining homework and result without changing coach evidence',()=>{
 const id='00000000-0000-4000-8000-000000000001'
 const rows=[['request','confirmed','My request'],['life_balance','needs_confirmation',''],['meaning_axes','not_explored',''],['needs','skipped_by_client',''],['strengths','not_explored','']].map(([id,status,quote])=>({id,status,quote,label:id,question:'Question '+id,source:status==='confirmed'?'client_reviewed_quote':null}))
 const result={id,rows,homework:rows.filter(r=>['not_explored','needs_confirmation'].includes(r.status))}
 const note=(field,text='My answer')=>({kind:'note',goalId:null,revision:1,tags:clarityHomeworkTags(id,field),text})
 const project=entries=>clarityResultProjection(result,entries,{journalComplete:true})
 assert.equal(project([]).homeworkTotal,3);assert.equal(project([]).answered,1)
 assert.equal(project([note('request'),note('needs')]).answered,1)
 const saved=project([note('life_balance','My score')])
 assert.equal(saved.answered,2);assert.equal(saved.homeworkRemaining,2)
 assert.equal(saved.rows[1].source,'daybook');assert.equal(saved.rows[1].quote,'My score')
 assert.equal(saved.rows[0].quote,'My request');assert.equal(saved.rows[3].status,'skipped_by_client')
 assert.equal(project([note('life_balance'),note('life_balance')]).rows[1].homeworkState,'conflict')
 assert.equal(project([{...note('life_balance'),revision:0}]).homeworkDone,0)
 assert.equal(project([{...note('life_balance'),tags:clarityHomeworkTags('00000000-0000-4000-8000-000000000009','life_balance')}]).homeworkDone,0)
 assert.equal(project([{...note('life_balance'),tags:[...note('life_balance').tags,'hw-field:strengths']}]).homeworkDone,0)
 assert.equal(clarityResultProjection(result,[note('life_balance')],{journalComplete:false}).homeworkDone,0)
 const all=project([note('life_balance'),note('meaning_axes'),note('strengths')])
 assert.equal(all.homeworkRemaining,0);assert.equal(all.answered,4);assert.equal(all.skipped,1);assert.equal(all.complete,false)
 assert.equal(project([note('life_balance','Edited answer')]).rows[1].quote,'Edited answer')
 assert.equal(project([]).rows[1].status,'needs_confirmation')
 const ui=read('components/app/clarity-program.jsx'),view=read('components/app/clarity-course-results.jsx')
 assert.match(ui,/clarityResultProjection\(report,entries,\{journalComplete:!hasMore\}\)/)
 assert.match(view,/clarityResultProjection\(r,entries,\{journalComplete:!hasMore\}\)/)
 assert.match(view,/data-clarity-result-diagram/)
 assert.match(ui,/data-clarity-homework-done/)
})
test('every Clarity day uses the exact schema and matching trusted time-limit proof',()=>{
 let clock=createClarityCourseClock()
 const opening={completed:true,declined:false,checkmarks:{confirmation:true},confirmedQuote:'Yes'}
 for(const day of [1,2,3]){
  const protocolId='00000000-0000-4000-8000-00000000000'+day,segmentId='00000000-0000-4000-8000-00000000001'+day,connectionId='00000000-0000-4000-8000-00000000002'+day
  const event={day,protocolId,segmentId,connectionId},start=(day-1)*86400000
  const record={id:protocolId,courseSessionId:clarityCourseId(day),provenance:'client_reviewed_dialogue',savedAt:'2026-11-26T12:00:00Z',turns:[],durationSeconds:1200,opening,clarityTimeLimitReached:true,clarityHomeworkAccepted:true}
  assert.deepEqual(clarityCourseResult(record,'en',{clock}).homework,[])
  clock=advanceClarityCourseClock(clock,{...event,type:'begin',expectedRevision:clock.revision,atMs:start,coachId:'mira',consent:{kind:'explicit_client_session_consent',decision:'start',protocolId,connectionId,coachId:'mira',atMs:start,turnId:'consent:'+day}})
  for(let dt=10000;dt<=1200000;dt+=10000)clock=advanceClarityCourseClock(clock,{...event,type:'observe',expectedRevision:clock.revision,atMs:start+dt,evidence:'server_observed_connected'})
  for(const locale of ['en','ru','es']){
   const result=clarityCourseResult(record,locale,{clock})
   assert.equal(result.rows.length,[10,13,8][day-1])
   assert.deepEqual(result.homework.map(x=>x.id),result.rows.map(x=>x.id))
   assert.ok(result.homework.every(x=>x.question&&clarityHomeworkTags(protocolId,x.id)))
  }
 }
})

test('canonical axes, exact bound score pairs, legacy review and living semantic results',()=>{
 for(const locale of ['en','ru','es']){
  const a=coachCourseProtocolSchema('clarity_day_1',locale),b=coachCourseProtocolSchema('clarity_day_2',locale),c=coachCourseProtocolSchema('clarity_day_3',locale)
  assert.equal(a.checkpoints.filter(x=>x.id.startsWith('outer_')).length,8)
  assert.equal(b.checkpoints.filter(x=>x.id.startsWith('inner_')).length,8)
  assert.ok(c.checkpoints.some(x=>x.id==='dream_image'));assert.ok(c.checkpoints.some(x=>x.id==='why'))
  assert.equal(new Set(a.checkpoints.map(x=>x.question)).size,10)
  assert.equal(new Set(b.checkpoints.map(x=>x.question)).size,13)
 }
 const course='clarity_day_1',schema=coachCourseProtocolSchema(course,'ru'),field='outer_body_health'
 const question=claritySpecialField(field,'ru',{legacyPair:true}).question
 const turns=[{role:'assistant',content:question},{role:'user',content:'0/8'}]
 assert.deepEqual(clarityRatingPair(field,'0/8'),{current:0,desired:8})
 assert.deepEqual(clarityRatingPair(field,'сейчас пять, хочу девять'),{current:5,desired:9})
 for(const invalid of ['','да','7','11/8','-1/8','в 2026 году 5 и 7','6.5/8','пропустим']){assert.equal(clarityRatingPair(field,invalid),null);assert.equal(checkpointAnswerMismatch(field,invalid),invalid!=='7')}
 assert.equal(coachCourseFieldReviewQuotes(course,'outer_finance',turns).length,0)
 assert.equal(coachCourseFieldReviewQuotes(course,field,turns).length,1)
 assert.throws(()=>appendCoachCourseFieldReview(null,course,turns,'outer_finance','turn:1'))
 const review=appendCoachCourseFieldReview(null,course,turns,field,'turn:1')
 const rows=coachCourseProtocolRows(course,turns,review,'ru')
 const before=claritySemanticResult(1,rows,'ru')
 assert.equal(before.axes[0].current,0);assert.equal(before.axes[0].desired,8)
 assert.equal(before.axes[1].current,null)
 const report={id:'00000000-0000-4000-8000-000000000001',rows,homework:rows.filter(x=>x.status==='not_explored')}
 const independent='outer_finance',note={kind:'note',revision:1,goalId:null,text:'3/9',tags:clarityHomeworkTags(report.id,independent)}
 const view=entries=>clarityResultProjection(report,entries,{journalComplete:true})
 assert.equal(view([note]).homeworkDone,1)
 const after=claritySemanticResult(1,view([note]).rows,'ru')
 assert.equal(after.axes.find(x=>x.id===independent).current,3)
 assert.equal(after.axes.find(x=>x.id===independent).source,'daybook')
 assert.equal(after.axes[0].current,0)
 assert.equal(view([{...note,text:'not sure'}]).homeworkDone,0)
 assert.equal(view([{...note,text:'not sure'}]).rows.find(x=>x.id===independent).homeworkState,'invalid')
 assert.equal(claritySemanticResult(1,view([]).rows,'ru').axes.find(x=>x.id===independent).current,null)
 const oldTurns=[{role:'user',content:'My earlier general balance answer'}]
 const legacy=appendCoachCourseFieldReview(null,course,oldTurns,'life_balance','turn:0')
 const oldRows=coachCourseProtocolRows(course,oldTurns,legacy,'en')
 assert.equal(oldRows.find(x=>x.id==='life_balance').archived,true)
 assert.equal(clarityResultProjection({id:report.id,rows:oldRows,homework:[]},[],{journalComplete:true}).total,10)
 assert.equal(claritySemanticResult(2,[{id:'inner_anchor',status:'self_reported',quote:'5/9',source:'daybook'}]).axes[0].current,5)
 const dream=claritySemanticResult(3,[{id:'dream_image',status:'confirmed',quote:'A creative life',source:'client_reviewed_quote'},{id:'goal',status:'self_reported',quote:'Make a studio',source:'daybook'}])
 assert.equal(dream.dream.value,'A creative life');assert.equal(dream.nodes[0].value,'Make a studio');assert.equal(dream.nodes[1].value,null)
 assert.equal(validClarityHomeworkAnswer('goal','yes'),false)
 assert.equal(validClarityHomeworkAnswer('goal','Build a studio'),true)
})

test('Day 1 v5 current-only wheel retains exact question provenance and old pairs',()=>{
 const course='clarity_day_1',field='outer_body_health'
 for(const lang of ['en','ru','es']){
  const question=coachCourseProtocolSchema(course,lang).checkpoints.find(row=>row.id===field).question
  const turns=[{role:'assistant',content:question},{role:'user',content:'0'}]
  assert.deepEqual(clarityRatingForQuestion(field,'0',question),{current:0,desired:null})
  assert.equal(clarityRatingForQuestion(field,'5/10',question),null)
  assert.equal(coachCourseFieldReviewQuotes(course,'outer_finance',turns).length,0)
  assert.equal(coachCourseFieldReviewQuotes(course,field,turns).length,1)
  assert.equal(coachCourseFieldReviewQuotes(course,field,[{...turns[0],interrupted:true},turns[1]]).length,0)
  const pending=coachCourseProtocolRows(course,turns,null,lang)
  assert.equal(pending.find(row=>row.id===field).status,'needs_confirmation')
  assert.equal(claritySemanticResult(1,pending,lang).axes[0].current,null)
  const review=appendCoachCourseFieldReview(null,course,turns,field,'turn:1')
  const rows=coachCourseProtocolRows(course,turns,review,lang)
  assert.equal(rows.find(row=>row.id===field).question,question)
  const axis=claritySemanticResult(1,rows,lang).axes[0]
  assert.equal(axis.current,0);assert.equal(axis.desired,null)
  const old=claritySpecialField(field,lang,{legacyPair:true}).question
  assert.deepEqual(clarityRatingForQuestion(field,'0/8',old),{current:0,desired:8})
  assert.equal(clarityRatingForQuestion(field,'0',old),null)
 }
 for(const value of ['сейчас пять','five out of 10','ahora cinco','5 из 10'])assert.deepEqual(clarityRatingAnswer(field,value),{current:5,desired:null})
 for(const value of ['11','-1','6.5','в 2026 году 5','5 лет','пять человек','не знаю'])assert.equal(clarityRatingAnswer(field,value),null)
 assert.equal(clarityRatingAnswer('inner_anchor','5'),null)
 assert.equal(validClarityHomeworkAnswer(field,'0'),true)
 assert.equal(validClarityHomeworkAnswer('inner_anchor','0'),false)
 const report={id:'00000000-0000-4000-8000-000000000002',rows:[{id:field,status:'not_explored',question:'current'}],homework:[{id:field}]}
 const entry={kind:'note',revision:1,goalId:null,text:'0',tags:clarityHomeworkTags(report.id,field)}
 const view=clarityResultProjection(report,[entry],{journalComplete:true})
 assert.equal(view.homeworkDone,1)
 const axis=claritySemanticResult(1,view.rows,'en').axes[0]
 assert.equal(axis.current,0);assert.equal(axis.desired,null);assert.equal(axis.source,'daybook')
})
