import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {clarityJournalIdentity,assertClarityJournalIdentityUnchanged,assertClarityJournalBinding} from '../lib/coaching/clarity-journal-scope.mjs'
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0')
const note=(...tags)=>({kind:'note',goalId:null,tags})
const scoped=(n,...tags)=>note('cr:'+id(n),...tags)
const game='clarity-game-v1-1-1',reflection='clarity-v2-day-1'
test('scoped games and reflections have one valid run, day and identity',()=>{
 assert.deepEqual(clarityJournalIdentity(scoped(1,game)),{courseRunId:id(1),reportId:null,kind:'game',day:1,key:game})
 assert.equal(clarityJournalIdentity(scoped(2,reflection)).day,1)
 for(const invalid of [scoped(1),scoped(1,game,reflection),scoped(1,'clarity-game-v1-4-1'),scoped(1,'cr:'+id(2),game),note('cr:bad',game),{...scoped(1,game),goalId:id(9)},{...scoped(1,game),kind:'morning'}])assert.throws(()=>clarityJournalIdentity(invalid),/SCOPE_INVALID/)
 assert.equal(clarityJournalIdentity(note(game)).courseRunId,null)
})
test('client may edit note text but cannot move an entry to another course or session',()=>{
 const prev=scoped(1,game)
 assert.equal(assertClarityJournalIdentityUnchanged(prev,{...prev,text:'updated'}).courseRunId,id(1))
 for(const changed of [scoped(2,game),note(game),scoped(1,'clarity-game-v1-2-1'),scoped(1,reflection)])assert.throws(()=>assertClarityJournalIdentityUnchanged(prev,changed),/SCOPE_INVALID/)
 assert.throws(()=>assertClarityJournalIdentityUnchanged(note(game),prev),/SCOPE_INVALID/)
 assert.equal(assertClarityJournalIdentityUnchanged(note('old'),note('edited')).courseRunId,null)
})
test('homework is bound to the exact owned report and course, including legacy bypass',()=>{
 const hw='hw:'+id(20),field='hw-field:outer_health'
 const identity=clarityJournalIdentity(scoped(1,hw,field))
 assert.equal(identity.reportId,id(20))
 assert.equal(assertClarityJournalBinding(identity,{courseRunId:id(1),day:2}),identity)
 assert.throws(()=>assertClarityJournalBinding(identity,null),/SCOPE_INVALID/)
 assert.throws(()=>assertClarityJournalBinding(identity,{courseRunId:id(2),day:2}),/SCOPE_INVALID/)
 assert.throws(()=>assertClarityJournalBinding(clarityJournalIdentity(note(hw,field)),{courseRunId:id(1),day:2}),/SCOPE_INVALID/)
 assert.equal(assertClarityJournalBinding(clarityJournalIdentity(note(hw,field)),null).courseRunId,null)
 assert.throws(()=>assertClarityJournalIdentityUnchanged(scoped(1,hw,field),scoped(1,hw,'hw-field:outer_work')),/SCOPE_INVALID/)
 assert.throws(()=>clarityJournalIdentity(scoped(1,hw)),/SCOPE_INVALID/)
})
test('server binds ownership inside existing transaction before writes; disabled gate does not query proposal tables',()=>{
 const s=readFileSync(new URL('../lib/app/daybook-journal.js',import.meta.url),'utf8')
 assert.match(s,/where account_id=\$1 and id=\$2/)
 assert.match(s,/where account_id=\$1 and protocol_id=\$2/)
 assert.match(s,/if\(!clarityRunStorageEnabled\(\)\)/)
 assert.ok(s.indexOf('await active(db,actor,true)')<s.indexOf('await verifyCourseScope(db,actor,config,input)'))
 assert.ok(s.indexOf('await verifyCourseScope(db,actor,config,input)')<s.indexOf('const ciphertext=seal(payload'))
})
