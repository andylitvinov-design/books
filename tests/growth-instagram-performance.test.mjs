import test from 'node:test'
import assert from 'node:assert/strict'
import {instagramPerformanceRates,rankInstagramPerformance} from '../lib/growth-studio/instagram-performance.mjs'

const measured=value=>({status:'FRESH',value})
const cohort={socialAccountId:'wizards_secrets',format:'IMAGE',locale:'en',ageBucket:'7d',apiVersion:'v27.0'}
const post=(id,metrics,overrides={})=>({
  socialAccountId:'wizards_secrets',format:'IMAGE',locale:'en',ageBucket:'7d',
  source:'meta_graph_api',apiVersion:'v27.0',capturedAt:'2026-11-09T12:00:00.000Z',
  receipt:{provider:'meta_graph_api',accountId:'wizards_secrets',providerPostId:id,
    url:'https://www.instagram.com/p/AbCdEf123/',publishedAt:'2026-11-01T12:00:00.000Z'},
  metrics,...overrides,
})
const metrics=(reach,saves)=>({reach:measured(reach),likes:measured(2),comments:measured(1),shares:measured(0),saves:measured(saves),views:measured(100)})

test('rates preserve measured zero and do not invent missing, stale or zero-denominator data',()=>{
  const complete=instagramPerformanceRates(metrics(10,0))
  assert.equal(complete.savesPerReach,0)
  assert.equal(complete.engagementByReach,0.3)
  assert.equal(complete.viewsPerReach,10)
  assert.equal(instagramPerformanceRates({...metrics(10,1),shares:{status:'UNAVAILABLE',value:null}}).engagementByReach,null)
  assert.equal(instagramPerformanceRates({...metrics(10,1),reach:measured(0)}).savesPerReach,null)
  assert.equal(instagramPerformanceRates({...metrics(10,1),saves:undefined}).savesPerReach,null)
  assert.equal(instagramPerformanceRates({...metrics(10,1),saves:measured(-1)}).savesPerReach,null)
  assert.equal(instagramPerformanceRates({...metrics(10,1),saves:measured(Number.NaN)}).savesPerReach,null)
})

test('ranking compares verified receipts only within one requested account, format, language and age cohort',()=>{
  const rows=[post('100001',metrics(100,10)),post('100002',metrics(100,20)),
    post('100003',metrics(100,90),{socialAccountId:'andy_therapist'}),
    post('100004',metrics(100,90),{format:'REEL'}),
    post('100006',metrics(100,90),{apiVersion:'v26.0'}),
    post('100007',metrics(100,90),{capturedAt:'2026-10-01T12:00:00.000Z'}),
    post('100005',metrics(100,90),{receipt:{provider:'meta_graph_api',accountId:'wizards_secrets',providerPostId:'100005',url:'https://example.com/',publishedAt:'2026-11-01T12:00:00.000Z'}})]
  const result=rankInstagramPerformance({cohort,observations:rows,metric:'savesPerReach',minimumSample:2})
  assert.equal(result.status,'READY')
  assert.equal(result.sampleSize,2)
  assert.deepEqual(result.rows.map(row=>row.providerPostId),['100002','100001'])
  assert.deepEqual(result.rows.map(row=>row.value),[0.2,0.1])
})

test('small samples and absent measurements never become a fabricated leaderboard',()=>{
  const result=rankInstagramPerformance({cohort,observations:[post('100001',metrics(100,2)),post('100002',{reach:measured(100)})],metric:'savesPerReach',minimumSample:2})
  assert.equal(result.status,'INSUFFICIENT_EVIDENCE')
  assert.equal(result.sampleSize,1)
  assert.deepEqual(result.rows,[])
})

test('ranking accepts the timezone format stored from Meta publication receipts',()=>{
  const first=post('100001',metrics(100,4))
  first.receipt.publishedAt='2026-11-01T12:00:00+0000'
  const second=post('100002',metrics(100,8))
  second.receipt.publishedAt='2026-11-01T12:00:00+0000'
  const result=rankInstagramPerformance({cohort,observations:[first,second],metric:'savesPerReach',minimumSample:2})
  assert.equal(result.status,'READY')
  assert.equal(result.sampleSize,2)
})

test('duplicate snapshots and invalid cohort or ranking configuration are rejected',()=>{
  const row=post('100001',metrics(100,2))
  assert.throws(()=>rankInstagramPerformance({cohort,observations:[row,row],metric:'savesPerReach',minimumSample:2}),/duplicate_observation/)
  assert.throws(()=>rankInstagramPerformance({cohort:{...cohort,socialAccountId:'andy_therapist'},observations:[],metric:'savesPerReach',minimumSample:2}),/invalid_cohort/)
  assert.throws(()=>rankInstagramPerformance({cohort,observations:[],metric:'likes',minimumSample:1}),/invalid_ranking/)
})
