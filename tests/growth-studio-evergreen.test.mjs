import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {nextGrowthPost} from '../lib/growth-studio/model.mjs'
import {prepareEvergreenGrowthDrafts} from '../lib/growth-studio/evergreen.mjs'
import {createMemoryGrowthStudioStore} from '../lib/growth-studio/store.js'
import {sameGrowthDraft} from '../lib/growth-studio/bulk.mjs'

const now=new Date('2026-10-20T12:00:00.000Z')
function approved({status='approved',...fields}={}){
  const draft=nextGrowthPost({action:'save',id:randomUUID(),now,fields:{
    brand:'holistic_house',channel:'telegram',locale:'ru',
    title:'Публичная образовательная встреча',
    caption:'Посмотрите открытый образовательный материал.',
    sourceUrl:'/ru/academy',campaign:'reiki_education',
    scheduledAt:'',mediaUrl:'/images/public.webp',mediaAlt:'Учебная книга',
    ...fields,
  }})
  const record=nextGrowthPost({current:draft,action:'approve',now})
  if(status==='approved')return record
  if(status==='published')return {...record,status,
    delivery:{provider:'telegram',messageId:123,publishedAt:now.toISOString(),
      url:'https://t.me/ActualPublicChannel/123'}}
  return {...record,status}
}
function args(opts={}){return {
  batchId:randomUUID(),expectedRevision:2,cadence:'weekly',count:3,
  startAt:'2026-10-27T14:00:00.000Z',...opts,
}}
test('weekly series retains Toronto 10am across DST and does not auto-approve or publish',()=>{
  const original=approved()
  const items=prepareEvergreenGrowthDrafts(args(),{source:original,now})
  assert.equal(items.length,3)
  assert.deepEqual(items.map(x=>x.scheduledAt),[
    '2026-10-27T14:00:00.000Z','2026-11-03T15:00:00.000Z','2026-11-10T15:00:00.000Z',
  ])
  for(const item of items){
    assert.equal(item.status,'draft')
    assert.equal(item.revision,1)
    assert.equal(item.brand,'holistic_house')
    assert.equal(item.mediaUrl,original.mediaUrl)
    assert.equal(item.mediaAlt,original.mediaAlt)
    assert.equal(item.caption,original.caption)
    assert.equal(Object.hasOwn(item,'delivery'),false)
    assert.equal(Object.hasOwn(item,'attemptId'),false)
  }
  assert.equal(original.status,'approved')
})
test('monthly series clamps short months while anchored to the original 31st',()=>{
  const items=prepareEvergreenGrowthDrafts(args({cadence:'monthly',count:3,
    startAt:'2026-10-31T14:00:00.000Z'}),{source:approved(),now})
  assert.deepEqual(items.map(x=>x.scheduledAt),[
    '2026-10-31T14:00:00.000Z','2026-11-30T15:00:00.000Z',
    '2026-12-31T15:00:00.000Z',
  ])
})
test('two-week cadence keeps Toronto local wall time, not UTC offsets',()=>{
  const items=prepareEvergreenGrowthDrafts(args({cadence:'biweekly',count:3}),{source:approved(),now})
  assert.deepEqual(items.map(x=>x.scheduledAt),[
    '2026-10-27T14:00:00.000Z','2026-11-10T15:00:00.000Z','2026-11-24T15:00:00.000Z',
  ])
})
test('same batch ID generates stable post IDs across retries with no duplication',async()=>{
  const store=createMemoryGrowthStudioStore()
  const source=approved()
  const arg=args()
  const first=prepareEvergreenGrowthDrafts(arg,{source,now})
  await store.batchCreate(first)
  const retry=prepareEvergreenGrowthDrafts(arg,{source,now:new Date(now.getTime()+5000)})
  assert.deepEqual(retry.map(p=>p.id),first.map(p=>p.id))
  assert.equal(retry.every((x,i)=>sameGrowthDraft(x,first[i])),true)
  await assert.rejects(store.batchCreate(retry),/conflict/)
  assert.equal((await store.list()).length,3)
})
test('publication receipts and past approvals never get cloned into new drafts',()=>{
  const source=approved({status:'published'})
  const items=prepareEvergreenGrowthDrafts(args(),{source,now})
  assert.equal(items.length,3)
  assert.equal(items.every(x=>!x.delivery&&x.status==='draft'),true)
})
test('rejects unapproved, archived, uncertain and concurrently edited sources',()=>{
  const source=approved()
  for(const status of ['draft','archived','sending','delivery_unknown']){
    assert.throws(()=>prepareEvergreenGrowthDrafts(args(),{source:{...source,status},now}),/invalid_source/)
  }
  assert.throws(()=>prepareEvergreenGrowthDrafts(args({expectedRevision:1}),{source,now}),/invalid_source/)
  assert.throws(()=>prepareEvergreenGrowthDrafts(args(),{source:null,now}),/invalid_source/)
})
test('rejects invalid intervals, excess counts and arbitrary private fields',()=>{
  const source=approved()
  for(const input of [
    args({count:0}),args({count:11}),args({cadence:'daily'}),
    args({startAt:'2026-10-27T10:00:00-04:00'}),args({startAt:'not-a-date'}),
    args({batchId:'invalid'}),args({extraPrivateClientId:'123'}),
  ]){
    assert.throws(()=>prepareEvergreenGrowthDrafts(input,{source,now}))
  }
})
test('rejects DST repeated 1:30, schedules too close, and dates beyond horizon',()=>{
  const source=approved()
  for(const input of [
    args({startAt:'2026-11-01T05:30:00.000Z'}), // ambiguous 01:30
    args({startAt:'2026-10-20T12:30:00.000Z'}), // < one hour in future
    args({startAt:'2027-10-27T14:00:00.000Z'}), // too far
  ])assert.throws(()=>prepareEvergreenGrowthDrafts(input,{source,now}),/invalid_recurrence/)
})
test('evergreen owner action must reuse verified saved source and atomic draft storage',()=>{
  const source=readFileSync(new URL('../app/admin/growth-studio/actions.js',import.meta.url),'utf8')
  assert.match(source,/createGrowthEvergreenDraftsAction/)
  assert.match(source,/requireAdminRequest\(\)/)
  assert.match(source,/prepareEvergreenGrowthDrafts\(/)
  assert.match(source,/store\.batchCreate\(drafts\)/)
  const model=readFileSync(new URL('../lib/growth-studio/evergreen.mjs',import.meta.url),'utf8')
  assert.doesNotMatch(model,/sendTelegramPost|publishGrowthTelegramNowAction|fetch\(/)
})
