import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
const workflow=readFileSync(new URL('../.github/workflows/hh-hourly-vercel-production.yml',import.meta.url),'utf8')

test('hourly Vercel workflow re-registers one hourly off-peak cron at minute 37',()=>{
  assert.match(workflow,/cron:\s*'37 \* \* \* \*'/)
  assert.doesNotMatch(workflow,/cron:\s*'0 \* \* \* \*'/)
  assert.match(workflow,/HH_VERCEL_HOURLY_ENABLED/)
  assert.match(workflow,/refs\/heads\/codex\/public-book-library/)
})

test('release history runs before POST for schedule and emergency',()=>{
  const start=workflow.indexOf('# BEGIN HH_PRODUCTION_COOLDOWN')
  const end=workflow.indexOf('# END HH_PRODUCTION_COOLDOWN')
  assert.ok(start>workflow.indexOf('Deploy exact production SHA'))
  assert.ok(start<end&&end<workflow.indexOf('-X POST',start))
  assert.match(workflow,/Already deployed or in progress:/)
  assert.match(workflow,/concurrency:[\s\S]*cancel-in-progress: false/)
  const section=workflow.slice(start,end)
  const now=Date.parse('2026-11-18T15:06:24Z')
  const exec=(history,emergency='false')=>spawnSync('bash',['-c',[
    'set -euo pipefail',
    'curl() { if [[ "${MOCK_ERROR:-false}" == "true" ]]; then return 22; fi; printf "%s" "$MOCK_HISTORY"; }',
    'date() { printf "%s" "$MOCK_NOW"; }',
    section,
    'echo reached-post',
  ].join('\n')],{encoding:'utf8',env:{...process.env,VERCEL_TOKEN:'fake',EMERGENCY:emergency,MOCK_NOW:String(now/1000),MOCK_HISTORY:JSON.stringify(history??{}),MOCK_ERROR:history===null?'true':'false'}})
  const prior=(ms,state='READY',field='created')=>({target:'production',[field]:now-ms,state})
  for(const emergency of ['false','true']){
    for(const d of [prior(3599999),prior(2049677),prior(10,'ERROR'),prior(1,'BUILDING'),prior(2400000,'CANCELED','createdAt')]){
      const r=exec({deployments:[d]},emergency)
      assert.equal(r.status,0,r.stderr)
      assert.match(r.stdout,/deferring build/)
      assert.doesNotMatch(r.stdout,/reached-post/)
    }
    for(const deployments of [[],[prior(3600000)],[prior(3600001)]]){
      const r=exec({deployments},emergency)
      assert.equal(r.status,0,r.stderr)
      assert.match(r.stdout,/reached-post/)
    }
    for(const bad of [null,{}, {deployments:[{target:'production'}]}, {deployments:[{target:'production',created:'1795014384385'}]}]){
      const r=exec(bad,emergency)
      assert.notEqual(r.status,0)
      assert.doesNotMatch(r.stdout,/reached-post/)
    }
  }
})

test('owner-approved emergency dispatch and manual-only guarded cleanup remain separate',()=>{
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

test('hourly 400 diagnostics preserve fields without leaking error text or retrying POST',()=>{
  assert.match(workflow,/error_field=.*jq -r/);
  assert.match(workflow,/\.error\.errors \/\/ \.error\.details \/\/ \.error\.validationErrors/);
  assert.match(workflow,/case "\$error_field" in gitSource\|gitSource\.\*\|name\|project\|target/);
  assert.match(workflow,/code=\$error_code, field=\$error_field/);
  assert.doesNotMatch(workflow,/echo "\$\(cat "\$response_file"\)"/);
  assert.doesNotMatch(workflow,/\bcurl[^\n]*--retry[^\n]*-X POST|\bcurl[^\n]*-X POST[^\n]*--retry/);
  assert.match(workflow,/No automatic retry/);
  assert.match(workflow,/Production deployment created within the last 60 minutes/);
  assert.match(workflow,/Already deployed or in progress:/);
  assert.doesNotMatch(workflow,/skipAutoDetectionConfirmation|forceNew=1.*cron/);
});

test('protected merges never trigger the hourly publisher',()=>{
  const top=workflow.slice(0,workflow.indexOf('jobs:'))
  const pub=workflow.slice(workflow.indexOf('  publish:'),workflow.indexOf('  cleanup:'))
  assert.doesNotMatch(top,/^  (?:push|pull_request|pull_request_target|repository_dispatch):/m)
  assert.match(pub,/github\.event_name == 'schedule' && vars\.HH_VERCEL_HOURLY_ENABLED == 'true'/)
  assert.match(pub,/inputs\.emergency == true && inputs\.cleanup_mode == 'off'/)
  assert.doesNotMatch(pub,/actions\/checkout|github\.event\.pull_request\.head\.sha/)
})
