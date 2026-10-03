import test from 'node:test'
import assert from 'node:assert/strict'
import {databaseTimestamp} from '../lib/app/timestamps.js'
import './app-origin.test.mjs'
test('PG measurement microseconds survive DB to JSON to SQL round-trip',()=>{
 assert.equal(databaseTimestamp('2026-10-02 18:54:19.260741+00'),'2026-10-02T18:54:19.260741Z')
 assert.equal(databaseTimestamp('2026-10-02 14:54:19.26-04'),'2026-10-02T14:54:19.26-04:00')
 assert.equal(databaseTimestamp('2026-10-02 18:54:19+00:00'),'2026-10-02T18:54:19Z')
 assert.throws(()=>databaseTimestamp('infinity'))
 assert.throws(()=>databaseTimestamp(null))
})
