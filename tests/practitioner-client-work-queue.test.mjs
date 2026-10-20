import test from 'node:test'
import assert from 'node:assert/strict'
import {buildPractitionerWorkQueue,filterPractitionerClientGroups,practitionerTaskTarget} from '../lib/practitioners/client-work-queue.js'
import {groupVerifiedPractitionerClients} from '../lib/practitioners/client-profile-groups.js'

const today='2026-10-20'
const request=(id,key,extra={})=>({id,clientKey:key.repeat(64),status:'contacted',
  createdAt:'2026-10-19T12:00:00Z',contact:{displayName:'Same name',phone:'+14165550100'},...extra})
const groups=groupVerifiedPractitionerClients([
  request('older-request','a',{createdAt:'2026-10-18T12:00:00Z',newMessageCount:2}),
  request('latest-request','a'),
  request('reply-request','b',{needsReply:true}),
  request('closed-request','c',{status:'closed'}),
  request('public-request','d',{requestKind:'public'}),
])
const task=(id,requestId,dueOn,extra={})=>({id,requestId,dueOn,status:'open',kind:'reply',...extra})
const details=[
  task('later','latest-request','2026-10-22'),
  task('today','reply-request',today,{kind:'call'}),
  task('overdue','older-request','2026-10-19'),
]
const keys=rows=>rows.map(row=>row.key).sort()

test('new messages, awaiting reply, due today and overdue remain distinct client queues',()=>{
  const queue=buildPractitionerWorkQueue(groups,details,today)
  const filtered=filter=>keys(filterPractitionerClientGroups(groups,{filter,queue}))
  assert.deepEqual(filtered('new'),['a'.repeat(64)])
  assert.deepEqual(filtered('reply'),['b'.repeat(64)])
  assert.deepEqual(filtered('today'),['b'.repeat(64)])
  assert.deepEqual(filtered('overdue'),['a'.repeat(64)])
  assert.deepEqual(filtered('tasks'),['a'.repeat(64),'b'.repeat(64)])
  assert.deepEqual(filtered('closed'),['c'.repeat(64)])
  assert.equal(filterPractitionerClientGroups(groups,{filter:'new',search:' SAME NAME ',queue}).length,1)
  assert.equal(filterPractitionerClientGroups(groups,{filter:'new',search:'unrelated',queue}).length,0)
})

test('counts and priority only include unique open tasks on actual private requests',()=>{
  const records=[...details,
    task('foreign','foreign-request','2026-10-01'),
    task('public','public-request','2026-10-01'),
    task('done','closed-request','2026-10-01',{status:'done'}),
    task('bad-day','reply-request','2026-02-30'),
    task('overdue','older-request','2026-10-19'),null,
  ]
  const before=structuredClone(records)
  const queue=buildPractitionerWorkQueue(groups,records,today)
  assert.deepEqual(queue.tasks.map(item=>item.id),['overdue','today','later'])
  assert.deepEqual([queue.openCount,queue.todayCount,queue.overdueCount],[3,1,1])
  assert.deepEqual(queue.byRequest.get('older-request'),{open:1,today:0,overdue:1})
  assert.deepEqual(records,before,'UI queue must not reorder or mutate the API snapshot')
})

test('selecting an older task opens its exact request, not the latest request for that client',()=>{
  const queue=buildPractitionerWorkQueue(groups,details,today)
  assert.deepEqual(practitionerTaskTarget(groups,queue,'overdue'),{
    groupKey:'a'.repeat(64),requestId:'older-request',taskId:'overdue',
  })
  assert.equal(practitionerTaskTarget(groups,queue,'foreign'),null)
  assert.equal(practitionerTaskTarget(groups.filter(group=>group.key!=='a'.repeat(64)),queue,'overdue'),null)
  assert.notEqual(practitionerTaskTarget(groups,queue,'overdue').groupKey,
    practitionerTaskTarget(groups,queue,'today').groupKey,
    'matching typed name and phone must never merge account-backed clients')
})

test('authoritative aggregates retain clients whose tasks fall outside the bounded detail page',()=>{
  const summary={day:today,requests:[
    {requestId:'older-request',openCount:20,todayCount:2,overdueCount:10},
    {requestId:'reply-request',openCount:3,todayCount:2,overdueCount:0},
    {requestId:'foreign-request',openCount:100,todayCount:100,overdueCount:0},
    {requestId:'public-request',openCount:100,todayCount:100,overdueCount:0},
    {requestId:'closed-request',openCount:1,todayCount:5,overdueCount:0},
  ]}
  // Only the first client's details fit in the response; the second still needs work.
  const queue=buildPractitionerWorkQueue(groups,[details[2]],'2026-10-21',summary)
  assert.equal(queue.tasks.length,1)
  assert.equal(queue.day,today,'server Toronto snapshot day anchors aggregate labels')
  assert.equal(queue.stale,true,'old aggregates must be explicitly dated and refreshed, never labelled as current')
  assert.deepEqual([queue.openCount,queue.todayCount,queue.overdueCount],[23,4,10])
  assert.deepEqual(keys(filterPractitionerClientGroups(groups,{filter:'today',queue})),
    ['a'.repeat(64),'b'.repeat(64)])
  assert.equal(queue.byRequest.has('foreign-request'),false)
  assert.equal(queue.byRequest.has('public-request'),false)
  assert.equal(queue.byRequest.has('closed-request'),false)
})

test('empty authoritative summary clears stale task filters; older backends fall back to details',()=>{
  const fresh=buildPractitionerWorkQueue(groups,details,today,{day:today,requests:[]})
  assert.equal(fresh.openCount,0)
  assert.equal(fresh.stale,false)
  assert.equal(fresh.tasks.length,0)
  assert.equal(filterPractitionerClientGroups(groups,{filter:'tasks',queue:fresh}).length,0)
  const legacy=buildPractitionerWorkQueue(groups,details,today,{day:'bad',requests:[]})
  assert.equal(legacy.openCount,3)
  assert.equal(legacy.stale,false,'legacy detail-only data has no authoritative snapshot date')
  const empty=buildPractitionerWorkQueue(null,null,today)
  assert.equal(empty.openCount,0)
  assert.deepEqual(filterPractitionerClientGroups(null),[])
  assert.equal(practitionerTaskTarget(groups,empty,'overdue'),null)
})
