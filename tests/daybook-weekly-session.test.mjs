import test from 'node:test'
import assert from 'node:assert/strict'
import {createWeeklyEditorSession} from '../lib/app/daybook-weekly-session.mjs'
const id=n=>'550e8400-e29b-41d4-a716-'+String(n).padStart(12,'0'),owner=id(1)
const source={asOf:'2026-11-22T12:00:00.000Z',days:[],journal:[],actions:[],nextGoal:null,summary:{selectedDays:0,selectedEntries:0,plannedActions:0,completed:0,open:0,other:0,unavailable:0}}
function harness(){let saved=null,fail=false;let counter=10;const calls=[]
 const fetcher=async(path,body,method)=>{calls.push({path,body,method});if(fail){fail=false;throw Error('lost response')}
  if(path.startsWith('daybook-weekly?week='))return {review:saved}
  if(path.startsWith('coaching-life-plan'))return {plan:null,domains:[],goals:[],actions:[]}
  if(path.startsWith('daybook?'))return {entries:[],nextCursor:null}
  if(body?.operation==='preview')return {weekStart:body.weekStart,timezone:body.timezone,sourceDays:[],sourceJournal:[],sourceActions:[],nextGoalId:null,sources:source}
  if(method==='DELETE'){saved=null;return {deleted:true,id:body.id}}
  if(body){saved={...body,revision:body.revision+1,sources:source};delete saved.operationId;return {saved:true,review:saved}}
  if(saved)return {review:saved}
  const error=Error('missing');error.status=404;throw error
 }
 const session=createWeeklyEditorSession(fetcher,owner,'2026-11-16','America/Toronto','en',()=>id(counter++))
 return {session,calls,fail:()=>{fail=true}}
}
test('weekly save requires explicit source preview and reflects separately verified server data',async()=>{
 const {session:s,calls}=harness();await s.load();assert.equal(s.snapshot().phase,'ready')
 s.edit('wins','Private win');await s.save();assert.equal(calls.some(c=>c.method==='POST'),false)
 await s.preview();assert.equal(s.snapshot().preview.summary.plannedActions,0)
 await s.save();assert.equal(s.snapshot().status,'saved');assert.equal(s.snapshot().draft.revision,1);assert.equal(s.snapshot().dirty,false)
})
test('failed save locks editing until exact retry; loading cannot silently throw away pending words',async()=>{
 const h=harness(),s=h.session;await s.load();s.edit('wins','Keep this');await s.preview();h.fail();await s.save()
 assert.equal(s.snapshot().status,'failed');assert.equal(s.edit('wins','Lost'),false);await s.load();assert.equal(s.snapshot().draft.wins,'Keep this')
 await s.save();assert.equal(s.snapshot().status,'saved')
})
test('delete is confirmed by absence and leaves source records untouched',async()=>{
 const {session:s,calls}=harness();await s.load();await s.preview();await s.save();await s.remove()
 assert.equal(s.snapshot().status,'deleted');assert.equal(s.snapshot().draft.revision,0)
 assert.equal(calls.filter(c=>c.method==='DELETE').length,1);assert.equal(calls.find(c=>c.method==='DELETE').path,'daybook-weekly')
})
test('disposing a weekly session clears private memory and ignores every late load response',async()=>{
 const pending=[];const s=createWeeklyEditorSession(path=>new Promise(done=>pending.push({path,done})),owner,'2026-11-16','America/Toronto')
 const request=s.load();s.dispose()
 for(const {path,done} of pending)done(path.startsWith('daybook-weekly')?{review:null}:path.startsWith('coaching-life-plan')?{plan:null,domains:[],goals:[],actions:[]}:{entries:[],nextCursor:null})
 await request;assert.equal(s.snapshot().draft,null);assert.equal(s.snapshot().phase,'closed');assert.equal(s.edit('wins','Late'),false)
})
test('account revocation erases all private weekly state before any later operation',async()=>{
 const s=createWeeklyEditorSession(async()=>{const e=Error('revoked');e.status=401;throw e},owner,'2026-11-16','America/Toronto')
 await s.load();assert.equal(s.snapshot().phase,'signed-out');assert.equal(s.snapshot().draft,null);assert.equal(s.snapshot().plan,null);assert.deepEqual(s.snapshot().entries,[]);assert.equal(s.edit('wins','Late'),false)
})
