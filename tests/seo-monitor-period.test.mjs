import assert from 'node:assert/strict'
import test from 'node:test'
import {seoMonitorPeriod,shiftDate} from '../lib/analytics/seo-monitor-period.mjs'

test('Toronto November DST fallback',()=>{
  const p=seoMonitorPeriod('today',new Date('2026-11-01T18:00:00Z'))
  assert.deepEqual([p.from,p.to,p.previousFrom,p.previousTo],
    ['2026-11-01','2026-11-01','2026-10-31','2026-10-31'])
  assert.equal(p.partial,true)
})
test('Toronto date differs from UTC near midnight',()=>{
  assert.equal(seoMonitorPeriod('today',new Date('2026-11-02T03:30:00Z')).from,'2026-11-01')
})
test('Yesterday and week compare equal, non-overlapping periods',()=>{
  const a=seoMonitorPeriod('yesterday',new Date('2026-11-01T18:00:00Z'))
  assert.deepEqual([a.from,a.to,a.previousFrom,a.previousTo],
    ['2026-10-31','2026-10-31','2026-10-30','2026-10-30'])
  assert.equal(a.partial,false)
  const b=seoMonitorPeriod('7d',new Date('2026-11-01T18:00:00Z'))
  assert.deepEqual([b.from,b.to,b.previousFrom,b.previousTo],
    ['2026-10-26','2026-11-01','2026-10-19','2026-10-25'])
})
test('30d covers leap day and previous 30d',()=>{
  const p=seoMonitorPeriod('30d',new Date('2028-03-01T17:00:00Z'))
  assert.deepEqual([p.from,p.to,p.previousFrom,p.previousTo],
    ['2028-02-01','2028-03-01','2028-01-02','2028-01-31'])
  assert.equal(shiftDate('2028-02-29',1),'2028-03-01')
})
test('Unknown period and invalid dates rejected',()=>{
  assert.throws(()=>seoMonitorPeriod('all'))
  assert.throws(()=>shiftDate('2026-02-30',1))
})
