import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {clarityProtocolView} from '../lib/coaching/clarity-course-protocol.mjs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
test('only reviewed protocol from exact selected day, no hidden private fields',()=>{
 const record={id:'saved',courseSessionId:'clarity_day_1',personaId:'mira',savedAt:'2026-11-26T10:00:00Z',provenance:'client_reviewed_dialogue',secret:'x',turns:[{role:'user',content:'hello',private:'x'},{role:'assistant',content:'welcome',coachId:'caesar',interrupted:true,private:'x'}]}
 assert.equal(clarityProtocolView(record,2),null)
 assert.equal(clarityProtocolView({...record,provenance:'draft'},1),null)
 assert.equal(clarityProtocolView({...record,courseSessionId:'clarity_discover'},1),null)
 const view=clarityProtocolView(record,1)
 assert.deepEqual(view.turns,[{role:'user',content:'hello'},{role:'assistant',content:'welcome',personaId:'caesar',interrupted:true}])
 assert.equal(view.secret,undefined)
 assert.equal(view.day,1)
 assert.equal(clarityProtocolView({...record,turns:[{role:'assistant',content:'hi'}]},1).turns[0].personaId,'mira')
})
test('exact owner-scoped archive lookup and explicit lazy view',()=>{
 const route=read('app/api/app/clarity-course/protocol/route.js')
 const store=read('lib/app/personal-coaching.js')
 const ui=read('components/app/clarity-course-protocol.jsx')
 assert.match(route,/auth\.verified\(\)/)
 assert.match(route,/x-hh-account-id'\)!==actor.id/)
 assert.match(route,/clarityProtocolView\(await readMyCoachProtocol/)
 assert.match(store,/where account_id=\$1 and protocol_id=\$2/)
 assert.match(ui,/onClick=\{\(\)=>void open\(\)\}/)
 assert.match(ui,/AbortController/)
 assert.match(ui,/protocol\?\.id!==report\.id\|\|protocol\.day!==report\.day/)
})
