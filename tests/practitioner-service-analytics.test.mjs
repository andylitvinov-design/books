import test from 'node:test'
import assert from 'node:assert/strict'
import {summarizeServiceAnalytics} from '../lib/practitioners/service-analytics.js'

const days={yesterday:'2026-10-16',weekStart:'2026-10-10'}
const services=[
  {id:'a',copy:{title:'Free Wu Xing'},slug:'free-wu-xing'},
  {id:'b',copy:{title:'Personal consultation'},slug:'personal'},
  {id:'c',copy:{title:'Not shown'},slug:'not-shown'},
]
test('yesterday and prior seven complete Toronto days are kept separate',()=>{
  const result=summarizeServiceAnalytics(services,[
    {serviceId:'a',day:'2026-10-16',impressions:4,orders:2,whatsapp:1,telegram:1},
    {serviceId:'a',day:'2026-10-10',impressions:6,orders:3,whatsapp:0,telegram:2},
    {serviceId:'b',day:'2026-10-15',impressions:3,orders:1,whatsapp:1,telegram:0},
    {serviceId:'a',day:'2026-10-17',impressions:1000,orders:1000,whatsapp:1000,telegram:1000},
    {serviceId:'a',day:'2026-10-09',impressions:1000,orders:1000,whatsapp:1000,telegram:1000},
  ],days)
  assert.equal(result.timeZone,'America/Toronto')
  assert.equal(result.yesterday,'2026-10-16')
  assert.equal(result.weekStart,'2026-10-10')
  assert.deepEqual(result.services[0].yesterday,{impressions:4,orders:2,whatsapp:1,telegram:1})
  assert.deepEqual(result.services[0].week,{impressions:10,orders:5,whatsapp:1,telegram:3})
  assert.deepEqual(result.services[1].week,{impressions:3,orders:1,whatsapp:1,telegram:0})
  assert.deepEqual(result.services[2].week,{impressions:0,orders:0,whatsapp:0,telegram:0})
})
test('does not include data from other practitioners or invalid negatives',()=>{
  const result=summarizeServiceAnalytics(services,[
    {serviceId:'foreign',day:'2026-10-16',impressions:9999,orders:9999},
    {serviceId:'a',day:'2026-10-16',impressions:-5,orders:null,whatsapp:2,telegram:0},
  ],days)
  assert.deepEqual(result.services[0].yesterday,{impressions:0,orders:0,whatsapp:2,telegram:0})
  assert.equal(result.services.length,3)
})
