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

test('practice selection requires explicit request consent, a canonical current focus and a permissions revision',()=>{
 const request={action:'practice-selection',focus:'calm_regulation',confirmed:true,expectedSettingsRevision:3}
 assert.deepEqual(normalizeMemorySelection(request),request)
 for(const patch of [{focus:'unknown'},{focus:'__proto__'},{confirmed:false},{expectedSettingsRevision:'3'},
  {mode:'video'},{provider:'groq'},{courseRunId:'alternate'},{accountId:other}]){
  assert.throws(()=>normalizeMemorySelection({...request,...patch}),/MY_COACH_MEMORY_SELECTION_INVALID/)
 }
})

test('Director uses exact context, one dated direct report and no positive suggestion from partial history',async()=>{
 const {chooseRememberedPractice}=await import('../lib/coaching/coach-session-director.mjs')
 const recent='2026-11-20T12:00:00.000Z'
 const earlier='2026-11-01T12:00:00.000Z'
 const rows=[
  session({id:'helpful-same',focus:'calm_regulation',completed_at:recent}),
  session({id:'uncomfortable-same',focus:'calm_regulation',completed_at:earlier,comfort:'uncomfortable'}),
  session({id:'helpful-other-focus',focus:'attention_clarity',completed_at:recent}),
  session({id:'helpful-other-account',account_id:other,focus:'calm_regulation'}),
  session({id:'skip',focus:'calm_regulation',lesson_id:'practice-b',usefulness:'skip'}),
  session({id:'helpful-alternative',focus:'calm_regulation',lesson_id:'practice-c',completed_at:earlier}),
  session({id:'non-catalogued',focus:'calm_regulation',lesson_id:'practice-d',completed_at:recent}),
 ]
 const titleFor=item=>item.practiceId==='practice-d'?null:{en:'An authored course practice'}
 const result=chooseRememberedPractice(rows,{accountId:owner,focus:'calm_regulation',titleFor})
 assert.equal(result.status,'previously_helpful')
 assert.deepEqual(result.item,{title:{en:'An authored course practice'},reportedAt:earlier,day:1})
 assert.doesNotMatch(JSON.stringify(result),/helpful-alternative|practice-c|cycle-1|private|accountId/)
 assert.deepEqual(chooseRememberedPractice(rows.slice(0,5),{accountId:owner,focus:'calm_regulation',titleFor}),{status:'discomfort_reported',item:null})
 assert.deepEqual(chooseRememberedPractice(rows,{accountId:owner,focus:'calm_regulation',titleFor,partial:true}),{status:'partial',item:null})
 assert.deepEqual(chooseRememberedPractice(rows,{accountId:owner,focus:'energy_agency',titleFor}),{status:'no_match',item:null})
})

test('a report of discomfort blocks another variant or version of the same named practice',async()=>{
 const {chooseRememberedPractice}=await import('../lib/coaching/coach-session-director.mjs')
 const rows=[
  session({id:'helpful',focus:'calm_regulation',variant:'a'}),
  session({id:'discomfort',focus:'calm_regulation',variant:'b',content_version:'content-2',comfort:'uncomfortable'}),
 ]
 const titleFor=()=>({en:'An authored course practice'})
 assert.deepEqual(chooseRememberedPractice(rows,{accountId:owner,focus:'calm_regulation',titleFor}),{status:'discomfort_reported',item:null})
})
