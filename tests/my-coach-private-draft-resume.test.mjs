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
