import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {prepareGrowthBulk,sameGrowthDraft,MAX_BULK_POSTS} from '../lib/growth-studio/bulk.mjs'
import {createMemoryGrowthStudioStore} from '../lib/growth-studio/store.js'
import {nextGrowthPost} from '../lib/growth-studio/model.mjs'

const source=(props={})=>({
  brand:'holistic_house',channel:'instagram',locale:'en',
  title:'Reiki education',caption:'A public educational invitation.',
  sourceUrl:'/en/academy',campaign:'reiki_202610',
  scheduledAt:'',mediaUrl:'',mediaAlt:'',...props,
})
const stamp=new Date('2026-10-19T17:30:00.000Z')
test('batch IDs and content are deterministic for retried 20-post imports',()=>{
  const batchId=randomUUID()
  const input={batchId,entries:Array.from({length:MAX_BULK_POSTS},(_,i)=>source({title:'Post '+i}))}
  const first=prepareGrowthBulk(input,stamp)
  const retry=prepareGrowthBulk(input,new Date('2026-10-19T18:00:00.000Z'))
  assert.equal(first.length,20)
  assert.equal(new Set(first.map(x=>x.id)).size,20)
  assert.deepEqual(first.map(x=>x.id),retry.map(x=>x.id))
  assert.equal(first[0].status,'draft')
  assert.equal(first[0].revision,1)
  assert.equal(sameGrowthDraft(first[0],retry[0]),true)
})

test('20 item batch uses atomic commit and survives failures without partial writes',async()=>{
  const store=createMemoryGrowthStudioStore()
  const first=prepareGrowthBulk({batchId:randomUUID(),entries:[source({title:'1'}),source({title:'2'})]},stamp)
  assert.deepEqual(await store.batchCreate(first),first)
  assert.equal((await store.list()).length,2)
  await assert.rejects(store.batchCreate(first),/conflict/)
  assert.equal((await store.list()).length,2)
  const changed=prepareGrowthBulk({batchId:randomUUID(),entries:[source({title:'3'}),source({title:'4'})]},stamp)
  await store.batchCreate(changed)
  assert.equal((await store.list()).length,4)
  const direct=nextGrowthPost({action:'save',id:randomUUID(),fields:source({title:'Direct draft'}),now:stamp})
  await store.save(direct,0)
  assert.equal((await store.list()).length,5)
})

test('bulk rejects non UUID, invalid input, excess posts, private URL, status injection',()=>{
  assert.throws(()=>prepareGrowthBulk({batchId:'foo',entries:[source()]}),/invalid_post/)
  assert.throws(()=>prepareGrowthBulk({batchId:randomUUID(),entries:[]}),/invalid_post/)
  assert.throws(()=>prepareGrowthBulk({batchId:randomUUID(),entries:Array.from({length:21},()=>source())}),/invalid_post/)
  assert.throws(()=>prepareGrowthBulk({batchId:randomUUID(),entries:[source({sourceUrl:'/en/client/report'})]}),/invalid_post/)
  assert.throws(()=>prepareGrowthBulk({batchId:randomUUID(),entries:[{...source(),status:'published'}]}),/invalid_post/)
})

test('an edited batch item conflicts with its prior posted draft fingerprint',()=>{
  const id=randomUUID()
  const a=prepareGrowthBulk({batchId:id,entries:[source()]},stamp)[0]
  const b=prepareGrowthBulk({batchId:id,entries:[source({caption:'Changed'})]},stamp)[0]
  assert.equal(sameGrowthDraft(a,b),false)
  assert.equal(sameGrowthDraft(a,{...a,status:'approved'}),true)
})

test('atomic mass storage remains isolated from other content and caps input', async()=>{
  const store=createMemoryGrowthStudioStore()
  const fields=Array.from({length:20},(_,i)=>source({title:'Batch '+i}))
  const groups=Array.from({length:60},()=>prepareGrowthBulk({batchId:randomUUID(),entries:fields},stamp))
  for(const batch of groups)await store.batchCreate(batch)
  assert.equal((await store.list()).length,1200)
  const over=prepareGrowthBulk({batchId:randomUUID(),entries:[source()]},stamp)
  await assert.rejects(store.batchCreate(over),/capacity_reached/)
  assert.equal((await store.list()).length,1200)
})
