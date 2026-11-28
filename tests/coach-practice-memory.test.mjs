import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizeMemorySelection} from '../lib/coaching/coach-memory-selection.mjs'

const owner='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'
const other='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'
const session=(changes={})=>({
 id:'session-1',account_id:owner,cycle_id:'cycle-1',day_number:1,lesson_id:'practice-a',content_version:'content-1',
 completed_at:new Date('2026-11-01T10:00Z'),window:'practice_v15',focus:'stress',usefulness:'useful',
 before_now:0,after_now:4,reflection_ciphertext:'must stay private',...changes,
})

test('practice history only accepts an authenticated owner’s implicit scope',()=>{
 assert.deepEqual(normalizeMemorySelection({action:'practice-outcomes'}),{action:'practice-outcomes'})
 for(const attr of [{accountId:other},{mode:'video'},{purpose:'practice_selection'},{consent:true}]){
  assert.throws(()=>normalizeMemorySelection({action:'practice-outcomes',...attr}))
 }
})

test('practice outcome uses direct answers, source identity, and an explicitly paired zero',async()=>{
 const {projectPracticeOutcome}=await import('../lib/coaching/coach-practice-memory.mjs')
 const result=projectPracticeOutcome(session(),owner)
 assert.equal(result.clientFeedback,'helpful')
 assert.equal(result.practiceId,'practice-a')
 assert.equal(result.practiceVersion,'content-1')
 assert.deepEqual(result.context,{day:1,focus:'stress',window:'practice_v15'})
 assert.deepEqual(result.measurement,{before:0,after:4,scaleId:'practice-moment-0-10',scaleVersion:1})
 assert.deepEqual(result.sourceRefs,[{kind:'growth_session',id:'session-1'}])
 assert.equal(result.occurredAt,'2026-11-01T10:00:00.000Z')
 assert.equal(result.sessionProtocolId,null)
 assert.doesNotMatch(JSON.stringify(result),/must stay private/)
 assert.equal(projectPracticeOutcome(session({account_id:other}),owner),null)
 assert.equal(projectPracticeOutcome(session({window:'legacy_lesson_v1'}),owner),null)
 assert.equal(projectPracticeOutcome(session({after_now:null}),owner).measurement,null)
 assert.equal(projectPracticeOutcome(session({focus:null}),owner).measurement,null)
})

test('v6 skips and unknown answers never become helpful, while explicit discomfort wins',async()=>{
 const {projectPracticeOutcome}=await import('../lib/coaching/coach-practice-memory.mjs')
 const v6={window:'practice_v6',feedback:'helped',usefulness:null}
 assert.equal(projectPracticeOutcome(session(v6),owner).clientFeedback,'unknown')
 assert.equal(projectPracticeOutcome(session({...v6,attempt:'tried'}),owner).clientFeedback,'helpful')
 assert.equal(projectPracticeOutcome(session({...v6,attempt:'tried'}),owner).measurement,null)
 assert.equal(projectPracticeOutcome(session({...v6,feedback:'uncomfortable'}),owner).clientFeedback,'discomfort')
 assert.equal(projectPracticeOutcome(session({comfort:'uncomfortable'}),owner).clientFeedback,'discomfort')
 assert.equal(projectPracticeOutcome(session({usefulness:'unchanged'}),owner).clientFeedback,'neutral')
 assert.equal(projectPracticeOutcome(session({usefulness:'skip'}),owner).clientFeedback,'unknown')
})

test('recall reports distinct dated responses and never conflates practice versions or transfers an old result into a new recommendation',async()=>{
 const {practiceHistoryView}=await import('../lib/coaching/coach-practice-memory.mjs')
 const rows=[
  session(),
  session({id:'session-2',usefulness:'skip',comfort:'uncomfortable'}),
  session({id:'session-3',content_version:'content-2'}),
  session({id:'session-4',focus:'sleep'}),
  session({id:'session-5',account_id:other}),
  session(),
 ]
 const view=practiceHistoryView(rows,owner)
 assert.equal(view.status,'ok')
 assert.equal(view.items.length,4)
 assert.deepEqual(view.items.map(item=>item.recall),['discomfort_reported','discomfort_reported','helpful_reported','helpful_reported'])
 assert.deepEqual(view.counts,{helpful:3,neutral:0,not_helpful:0,discomfort:1,unknown:0})
 assert.doesNotMatch(JSON.stringify(view),new RegExp(owner+'|'+other+'|cycle-1'))
 assert.equal(practiceHistoryView([],owner).status,'empty')
 assert.equal(practiceHistoryView(rows,owner,true).status,'partial')
 assert.equal(practiceHistoryView(rows,owner,true).items[2].recall,'review_history')
})
