import test from 'node:test'
import assert from 'node:assert/strict'
import {parseGrowthCsv,growthCsvTemplate} from '../lib/growth-studio/csv.mjs'

test('CSV template parses as one reviewed draft, never as scheduled publication',()=>{
  const result=parseGrowthCsv(growthCsvTemplate)
  assert.equal(result.total,1)
  assert.equal(result.items[0].brand,'holistic_house')
  assert.equal(result.items[0].channel,'instagram')
  assert.equal(result.items[0].scheduledAt,'')
  assert.deepEqual(result.errors,[])
})
test('supports quoted delimiters, CRLF and explicit UTC offset',()=>{
  const input='title;caption;channel;scheduledAt\r\n"Post; one";"Say ""hello"", world";telegram;2026-12-01T12:30:00-05:00'
  const result=parseGrowthCsv(input)
  assert.equal(result.items[0].caption,'Say "hello", world')
  assert.equal(result.items[0].scheduledAt,'2026-12-01T17:30:00.000Z')
})
test('rejects guessed time zones, unsupported platforms and private links row by row',()=>{
  const input='caption,channel,scheduled_at,sourceUrl\nHello,instagram,2026-11-02 12:00,/en/academy\nWorld,twitter,,/en/academy\nSafe,telegram,,/en/client'
  const result=parseGrowthCsv(input)
  assert.equal(result.items.length,0)
  assert.deepEqual(result.errors.map(x=>x.reason),['timezone_required','invalid_post','invalid_post'])
})
test('rejects duplicate headers, overly large batch, unclosed quotes, missing caption',()=>{
  assert.throws(()=>parseGrowthCsv('caption,caption\nA,B'),/invalid_csv/)
  assert.throws(()=>parseGrowthCsv('title,brand\nHi,holistic_house'),/invalid_csv/)
  assert.throws(()=>parseGrowthCsv('caption\n"hello'),/invalid_csv/)
  assert.throws(()=>parseGrowthCsv('caption\n'+Array.from({length:501},()=> 'hi').join('\n')),/too_many_rows/)
})
test('does not infer private client URLs or keep unknown columns as storage fields',()=>{
  const parsed=parseGrowthCsv('text,platform,secret\nhello,telegram,hidden')
  assert.equal(parsed.items.length,1)
  assert.equal(Object.hasOwn(parsed.items[0],'secret'),false)
})
