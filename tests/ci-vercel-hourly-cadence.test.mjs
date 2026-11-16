import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const workflow=readFileSync(new URL('../.github/workflows/hh-hourly-vercel-production.yml',import.meta.url),'utf8')

test('hourly Vercel workflow avoids GitHub top-of-hour drops at minute 17',()=>{
  assert.match(workflow,/cron:\s*'17 \* \* \* \*'/)
  assert.doesNotMatch(workflow,/cron:\s*'0 \* \* \* \*'/)
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

test('hourly release recovers previously accepted minimal GitSource POST and reports sanitized errors',()=>{
  assert.match(workflow,/payload=.*gitSource:/)
  assert.match(workflow,/repoId:1229814825,ref:"codex\/public-book-library",sha:/)
  assert.doesNotMatch(workflow,/meta:\{hhReleaseController/)
  assert.match(workflow,/http_status=.*curl -sS --max-time 30/)
  assert.match(workflow,/if \[\[ "\$http_status" != "200" && "\$http_status" != "201" \]\]; then/)
  assert.match(workflow,/error_code=.*jq -r '.error.code/)
  assert.match(workflow,/code=\$error_code/)
  assert.match(workflow,/No automatic retry/)
  assert.match(workflow,/response_file=.*mktemp/)
  assert.doesNotMatch(workflow,/echo "\$response"/)
})
