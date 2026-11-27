import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizeOwnerMemoryQuery,projectOwnerReviewedEvidence,searchOwnerReviewedEvidence,
 OWNER_MEMORY_MAX_RECORDS,OWNER_MEMORY_MAX_CIPHERTEXT_BYTES} from '../lib/coaching/coach-personal-memory.mjs'
import {coachCourseProtocolRows} from '../lib/coaching/coach-course-protocol-schema.mjs'

const A='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'
const B='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
const make=(n,quote='A quiet walk before the meeting helps me.',date='2026-11-22T10:00:00.000Z')=>({
 accountId:A,protocol:{id:id(n),provenance:'client_reviewed_dialogue',locale:'en',
  completedAt:date,courseSessionId:'clarity_support',
  courseFieldReview:{version:'hh-coach-course-review-v1',courseSessionId:'clarity_support',
    events:[{fieldId:'resources',status:'confirmed',turnIndex:0,quote,revision:1}]},
  turns:[{role:'user',content:quote},{role:'assistant',content:'PRIVATE GENERATED SUMMARY'}]},
 reviewRows:[{id:'resources',status:'confirmed',source:'client_reviewed_quote',turnIndex:0,quote,revision:1}]
})
const q=(patch={})=>normalizeOwnerMemoryQuery({ownerReview:true,query:'walk meeting',...patch})
test('strict query: explicit owner request, no actor or provider override, bounded limits',()=>{
 assert.equal(q().limit,8)
 for(const patch of [{ownerReview:false},{accountId:B},{provider:'groq'},{limit:13},{limit:0},
  {query:'?'},{query:'',types:[]},{types:['diagnosis']},{types:['resource','resource']},
  {through:'2026-02-30'},{courseSessionId:'../private'}])assert.throws(()=>q(patch),/MY_COACH_MEMORY_QUERY_INVALID/)
 assert.equal(OWNER_MEMORY_MAX_RECORDS,120)
 assert.equal(OWNER_MEMORY_MAX_CIPHERTEXT_BYTES,4194304)
})
test('atomic reviewed evidence is literal, historical, and owner-scoped',()=>{
 const f=make(1),r=projectOwnerReviewedEvidence(f,A)
 assert.equal(r.supported,true);assert.equal(r.items.length,1)
 const [item]=r.items
 assert.equal(item.value,f.protocol.turns[0].content)
 assert.equal(item.kind,'resource')
 assert.equal(item.temporalStatus,'historical')
 assert.equal(item.evidenceStatus,'client_confirmed')
 assert.equal(item.source.fieldRevision,1)
 assert.equal(item.source.protocolId,id(1))
 assert.equal(item.source.turnIndex,0)
 assert.equal(Object.hasOwn(item,'observedAt'),false)
 assert.equal(projectOwnerReviewedEvidence(f,B).items.length,0)
 assert.doesNotMatch(JSON.stringify(r),/PRIVATE GENERATED SUMMARY/)
})
test('reject draft, invalid provenance, unreviewed and mismatched source rows',()=>{
 const f=make(2)
 for(const protocol of [{...f.protocol,provenance:'client_autosaved_unreviewed_draft'},
  {...f.protocol,courseFieldReview:null},{...f.protocol,id:'invalid'}])
   assert.equal(projectOwnerReviewedEvidence({...f,protocol},A).items.length,0)
 for(const patch of [{status:'needs_confirmation'},{status:'skipped_by_client'},
  {source:'model_suggestion'},{archived:true},{quote:'Invented'},{turnIndex:1},{revision:0}])
   assert.equal(projectOwnerReviewedEvidence({...f,reviewRows:[{...f.reviewRows[0],...patch}]},A).items.length,0)
 assert.equal(projectOwnerReviewedEvidence({...f,protocol:{...f.protocol,turns:[{role:'user',content:f.reviewRows[0].quote,unanswered:true}]}},A).items.length,0)
})
test('private recall markers cannot become new evidence',()=>{
 const f=make(3),quote=f.reviewRows[0].quote
 const protocol={...f.protocol,turns:[{role:'assistant',content:'Previous recap',requestedSavedContext:true},{role:'user',content:quote}]}
 assert.equal(projectOwnerReviewedEvidence({...f,protocol,reviewRows:[{...f.reviewRows[0],turnIndex:1}]},A).items.length,0)
})
test('search finds older relevant fact among 110 newer sessions and never returns other owner',()=>{
 const records=Array.from({length:110},(_,i)=>make(i+1,'I read a book at home.'))
 records.push(make(111,'A quiet walk before the meeting helps me.','2026-10-01T10:00:00.000Z'))
 const items=records.flatMap(r=>projectOwnerReviewedEvidence(r,A).items)
 const foreign={...items.at(-1),accountId:B,value:'walk meeting'}
 const found=searchOwnerReviewedEvidence([...items,foreign],A,q())
 assert.equal(found.length,1);assert.equal(found[0].source.protocolId,id(111))
 assert.equal(Object.hasOwn(found[0],'accountId'),false)
 assert.deepEqual(searchOwnerReviewedEvidence(items,A,q({query:'unrelated'})),[])
 assert.deepEqual(searchOwnerReviewedEvidence(items,A,q({types:['goal_statement']})),[])
 assert.deepEqual(searchOwnerReviewedEvidence(items,A,q({courseSessionId:'goal_resources'})),[])
 assert.deepEqual(searchOwnerReviewedEvidence(items,A,q({through:'2026-09-30'})),[])
})
test('RU/ES query normalization, deterministic order and deduplication',()=>{
 const a=projectOwnerReviewedEvidence(make(10,'Прогулка перед встречей помогает.'),A).items[0]
 const b=projectOwnerReviewedEvidence(make(11,'Respiración tranquila antes de la reunión.'),A).items[0]
 assert.equal(searchOwnerReviewedEvidence([a,b],A,q({query:'прогул встреч'})).length,1)
 assert.equal(searchOwnerReviewedEvidence([a,b],A,q({query:'respiracion reunion'})).length,1)
 const c=projectOwnerReviewedEvidence(make(12,'Прогулка перед встречей помогает.'),A).items[0]
 assert.deepEqual(searchOwnerReviewedEvidence([c,a,a],A,q({query:'прогулка'})),
  searchOwnerReviewedEvidence([a,c],A,q({query:'прогулка'})))
 assert.equal(searchOwnerReviewedEvidence([a,c],A,q({query:'прогулка',limit:1})).length,1)
})
test('real course review resolver supplies the exact source; subsequent skip withdraws it',()=>{
 const f=make(20)
 const resolve=p=>coachCourseProtocolRows(p.courseSessionId,p.turns,p.courseFieldReview,'en')
 assert.equal(projectOwnerReviewedEvidence({...f,reviewRows:resolve(f.protocol)},A).items.length,1)
 const updated={...f.protocol,courseFieldReview:{...f.protocol.courseFieldReview,
   events:[...f.protocol.courseFieldReview.events,{fieldId:'resources',status:'skipped_by_client',turnIndex:null,quote:'',revision:2}]}}
 assert.equal(projectOwnerReviewedEvidence({...f,protocol:updated,reviewRows:resolve(updated)},A).items.length,0)
})
