import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createCoachDraftQueue} from '../lib/personal-coaching/protocol-draft-queue.mjs'
test('restored revision continues, never resets',async()=>{
 const calls=[];const queue=createCoachDraftQueue(async(revision,value)=>{calls.push(revision);return {id:value.protocol.id,revision,saved:true}},()=>{},8)
 queue.offer({courseSessionId:'introductory',protocol:{id:'test',turns:[{role:'user',content:'First'}]}})
 assert.equal(await queue.flush(),9);assert.deepEqual(calls,[9])
})
test('owner/revision guard and private text-only resume',()=>{
 const ui=readFileSync(new URL('../components/my-coach-live-dialogue.jsx',import.meta.url),'utf8')
 const server=readFileSync(new URL('../lib/app/my-coach-protocol-drafts.js',import.meta.url),'utf8')
 assert.match(ui,/initialDraftRevision.current=result.draft.revision/)
 assert.match(ui,/if\(restoredDraft\)return await sendMessage\(draft.trim\(\),\{forceLocal:true\}\)/)
 assert.match(server,/row.state!=='active'\|\|row.revision!==input.revision/)
})
test('reviewed draft retains selected course and finalized tombstone cannot recreate deleted report',()=>{
 const archive=readFileSync(new URL('../components/app/my-coach-draft-archive.jsx',import.meta.url),'utf8')
 const server=readFileSync(new URL('../lib/app/my-coach-protocol-drafts.js',import.meta.url),'utf8')
 const writer=readFileSync(new URL('../lib/app/personal-coaching.js',import.meta.url),'utf8')
 assert.ok(archive.includes('courseSessionId:item.courseSessionId'))
 assert.ok(server.includes('protocol.courseSessionId!==old.courseSessionId'))
 assert.ok(writer.includes('const draft=await assertCoachDraftReview(db,actor,config,protocol,input.draftRevision)'))
 assert.ok(server.includes('coachDraftReviewDecision(row,revision,Boolean(existing))'))
 assert.ok(server.includes("if(decision==='conflict')throw conflict()"))
 assert.match(writer,/if\(draft\?\.state==='finalized'&&!existing\)throw new AppError\('MY_COACH_PROTOCOL_CONFLICT',409\)/)
})
