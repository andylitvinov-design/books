import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

const root=resolve(fileURLToPath(new URL('..',import.meta.url)))
const source=path=>readFileSync(resolve(root,path),'utf8')

test('Context Cloud v2 compatibility report names current v1 and no duplicate archive',()=>{
  const report=source('docs/coaching/CONTEXT_CLOUD_V2_COMPATIBILITY_20261120.md')
  assert.match(report,/client-context\.mjs/)
  assert.match(report,/coaching_session_records/)
  assert.match(report,/not a second archive/i)
})

test('compatibility report keeps the Director and current voice work out of P0.A scope',()=>{
  const report=source('docs/coaching/CONTEXT_CLOUD_V2_COMPATIBILITY_20261120.md')
  assert.match(report,/coach-session-director\.mjs/)
  assert.match(report,/#5221/)
  assert.match(report,/#5234/)
  assert.match(report,/does not modify.*voice|voice.*does not modify/i)
})
