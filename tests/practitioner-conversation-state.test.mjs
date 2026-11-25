import test from 'node:test'
import assert from 'node:assert/strict'
import {
  compareConversationMessages,createConversationReadScope,
  latestVisibleParticipantMessage,mergeConversationMessages,mergeConversationPage,
} from '../lib/practitioners/conversation-state.js'

const message=(number,createdAt,extra={})=>({
  id:'00000000-0000-4000-8000-'+String(number).padStart(12,'0'),
  createdAt,visibility:'participants',mine:false,text:'Appointment follow-up',...extra,
})
const page=(messages,nextCursor=null,extra={})=>({requestId:'case-a',messages,nextCursor,
  unseenCount:messages.length,canReply:true,canNote:true,...extra})
const at=number=>`2026-10-20T15:00:00.${String(number).padStart(6,'0')}Z`

test('messages in one millisecond retain PostgreSQL microsecond order over their UUID order',()=>{
  const earlier=message(99,at(101)),later=message(1,at(109))
  assert.equal(Date.parse(earlier.createdAt),Date.parse(later.createdAt))
  assert.deepEqual(mergeConversationMessages([later],[earlier]),[earlier,later])
  assert.ok(compareConversationMessages(earlier,later)<0)
})

test('timezone offsets and variable fractional widths order by the exact instant',()=>{
  const before=message(3,'2026-10-20T11:00:00.100099-04:00')
  const after=message(1,'2026-10-20T15:00:00.100100+00:00')
  const same=message(2,'2026-10-20T15:00:00.1001Z')
  const boundary=message(4,'2026-10-20T15:00:00.101Z')
  assert.deepEqual(mergeConversationMessages([boundary,same],[after,before]),[before,after,same,boundary])
})

test('identical instants use the same canonical UUID tie-breaker as PostgreSQL',()=>{
  const first=message(1,at(999)),second=message(2,at(999))
  assert.deepEqual(mergeConversationMessages([second],[first]),[first,second])
  assert.equal(compareConversationMessages(first,{...first,id:first.id.toUpperCase()}),0)
})

test('overlapping pages deduplicate by message ID without mutating either input',()=>{
  const earlier=message(1,at(1)),original=message(2,at(2)),fresh={...original,text:'Updated visible data'}
  const older=[original,earlier],incoming=[fresh]
  const merged=mergeConversationMessages(older,incoming)
  assert.deepEqual(merged,[earlier,fresh])
  assert.deepEqual(older,[original,earlier])
  assert.deepEqual(incoming,[fresh])
})

test('viewed acknowledgement selects the latest loaded shared message from the other participant',()=>{
  const earlier=message(99,at(101)),latest=message(1,at(109))
  const own=message(2,at(200),{mine:true})
  const privateNote=message(3,at(300),{visibility:'practitioner_note'})
  assert.equal(latestVisibleParticipantMessage([latest,privateNote,own,earlier]),latest)
  assert.equal(latestVisibleParticipantMessage([own,privateNote]),null)
  assert.equal(latestVisibleParticipantMessage(),null)
})

test('loading older history keeps the newest visible shared message as the viewed target',()=>{
  const recent=message(1,at(123459)),older=message(99,at(123451))
  const merged=mergeConversationPage(page([recent],'before-recent'),page([older],null),{olderPage:true})
  assert.deepEqual(merged.messages,[older,recent])
  assert.equal(merged.nextCursor,null)
  assert.equal(latestVisibleParticipantMessage(merged.messages),recent)
})

test('a latest refresh preserves the oldest loaded cursor even when page lengths match',()=>{
  const first=message(1,at(1)),second=message(2,at(2)),third=message(3,at(3))
  const refreshed=mergeConversationPage(page([first,second],'before-first'),page([second,third],'before-second',{unseenCount:1}))
  assert.deepEqual(refreshed.messages,[first,second,third])
  assert.equal(refreshed.nextCursor,'before-first')
  assert.equal(refreshed.unseenCount,1)
})

test('a refresh without overlap restarts pagination so an intervening page is not lost',()=>{
  const batch=(start,end)=>Array.from({length:end-start+1},(_,index)=>message(start+index,at(start+index)))
  const oldPage=page(batch(1,40),null)
  const latest=page(batch(81,120),'before-81')
  const refreshed=mergeConversationPage(oldPage,latest)
  assert.deepEqual(refreshed.messages,latest.messages)
  assert.equal(refreshed.nextCursor,'before-81')
  const withMiddle=mergeConversationPage(refreshed,page(batch(41,80),'before-41'),{olderPage:true})
  const complete=mergeConversationPage(withMiddle,oldPage,{olderPage:true})
  assert.equal(complete.messages.length,120)
  assert.deepEqual(complete.messages,batch(1,120))
  assert.equal(complete.nextCursor,null)
})

test('an empty latest page clears prior message history instead of retaining stale content',()=>{
  const result=mergeConversationPage(page([message(1,at(1))]),page([]))
  assert.deepEqual(result.messages,[])
  assert.equal(result.unseenCount,0)
})

test('a delayed read cannot restore a stale unread badge after the newer viewed refresh',async()=>{
  const scope=createConversationReadScope()
  let resolveEarlier,resolveLater,view=null
  const earlier=scope.begin()
  const earlierResult=new Promise(resolve=>{resolveEarlier=resolve}).then(result=>{
    if(scope.accepts(earlier))view=mergeConversationPage(view,result)
  })
  const later=scope.begin()
  const laterResult=new Promise(resolve=>{resolveLater=resolve}).then(result=>{
    if(scope.accepts(later))view=mergeConversationPage(view,result)
  })
  resolveLater(page([message(1,at(1))],null,{unseenCount:0,canReply:false}))
  await laterResult
  resolveEarlier(page([message(1,at(1))],null,{unseenCount:7,canReply:true}))
  await earlierResult
  assert.equal(earlier.signal.aborted,true)
  assert.equal(view.unseenCount,0)
  assert.equal(view.canReply,false)
})

test('account or request scope disposal rejects in-flight results and prevents reopening it',()=>{
  const oldAccount=createConversationReadScope(),oldRead=oldAccount.begin()
  oldAccount.close()
  const nextAccount=createConversationReadScope(),currentRead=nextAccount.begin()
  assert.equal(oldRead.signal.aborted,true)
  assert.equal(oldAccount.accepts(oldRead),false)
  assert.equal(oldAccount.begin(),null)
  assert.equal(nextAccount.accepts(oldRead),false)
  assert.equal(nextAccount.accepts(currentRead),true)
})
