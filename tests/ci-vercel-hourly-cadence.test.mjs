import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const workflow=readFileSync(new URL('../.github/workflows/hh-hourly-vercel-production.yml',import.meta.url),'utf8')

test('hourly Vercel workflow schedules at Toronto hour start including DST',()=>{
  assert.match(workflow,/cron:\s*'0 \* \* \* \*'/)
  assert.doesNotMatch(workflow,/cron:\s*'17 \* \* \* \*'/)
  assert.match(workflow,/HH_VERCEL_HOURLY_ENABLED/)
  assert.match(workflow,/refs\/heads\/codex\/public-book-library/)
})

test('routine production releases skip any build already started in rolling hour',()=>{
  assert.match(workflow,/cutoff_ms="\$\(\( \$\(date -u \+%s\) \* 1000 - 3600000 \)\)"/)
  assert.match(workflow,/\.created \/\/ \.createdAt \/\/ 0/)
  assert.match(workflow,/\.target == "production"/)
  assert.match(workflow,/Production deployment created within the last 60 minutes/)
  assert.match(workflow,/Already deployed or in progress:/)
  assert.match(workflow,/concurrency:[\s\S]*cancel-in-progress: false/)
})

test('emergency Deploy Now and manual-only guarded cleanup remain available',()=>{
  assert.match(workflow,/workflow_dispatch:/)
  assert.match(workflow,/emergency:[\s\S]*type: boolean/)
  assert.match(workflow,/if \[\[ "\$EMERGENCY" != "true" \]\]; then/)
  assert.match(workflow,/if \[\[ "\$EMERGENCY" == "true" \]\]; then url="\$url&forceNew=1"/)
  assert.match(workflow,/github\.event_name == 'workflow_dispatch' && inputs\.cleanup_mode != 'off'/)
  assert.doesNotMatch(workflow,/push:\s*\n\s*branches:/)
})
