import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const workflow=readFileSync(new URL('../.github/workflows/hh-hourly-vercel-production.yml',import.meta.url),'utf8')

test('Vercel workflow uses two off-peak ticks every two hours',()=>{
  assert.match(workflow,/cron:\s*'13,43 \*\/2 \* \* \*'/)
  assert.doesNotMatch(workflow,/cron:\s*'0 \* \* \* \*'/)
  assert.match(workflow,/HH_VERCEL_HOURLY_ENABLED/)
  assert.match(workflow,/refs\/heads\/codex\/public-book-library/)
})

test('routine production releases skip any build already started in rolling two-hour window',()=>{
  assert.match(workflow,/cutoff_ms="\$\(\( \$\(date -u \+%s\) \* 1000 - 7200000 \)\)"/)
  assert.match(workflow,/\.created \/\/ \.createdAt \/\/ 0/)
  assert.match(workflow,/slot_start_ms=.*\/ 7200\) \* 7200000/)
  assert.match(workflow,/\.target == "production"/)
  assert.match(workflow,/Production deployment created within the last 120 minutes/)
  assert.match(workflow,/Already deployed or in progress:/)
  assert.match(workflow,/concurrency:[\s\S]*cancel-in-progress: false/)
})

test('emergency Deploy Now and manual-only guarded cleanup remain available',()=>{
  assert.match(workflow,/workflow_dispatch:/)
  assert.match(workflow,/emergency:[\s\S]*type: boolean/)
  assert.match(workflow,/if \[\[ "\$EMERGENCY" != "true" && "\$PREBUILT_TEST" != "true" \]\]; then/)
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
  assert.match(workflow,/Production deployment created within the last 120 minutes/);
  assert.match(workflow,/Already deployed or in progress:/);
  assert.doesNotMatch(workflow,/skipAutoDetectionConfirmation|forceNew=1.*cron/);
});

test('trusted closed-PR completion wakes the same guarded publisher',()=>{
  const top=workflow.slice(0,workflow.indexOf('jobs:'))
  const pub=workflow.slice(workflow.indexOf('  publish:'),workflow.indexOf('  cleanup:'))
  assert.match(top,/workflow_run:\s*\n\s*workflows: \['HH closed PR Actions cleanup'\]/)
  assert.match(pub,/github\.ref == 'refs\/heads\/codex\/bootstrap-books'/)
  assert.match(pub,/github\.event\.workflow_run\.event == 'pull_request_target'/)
  assert.match(pub,/github\.event\.workflow_run\.conclusion == 'success'/)
  assert.match(pub,/github\.event\.workflow_run\.head_repository\.full_name == github\.repository/)
  assert.match(pub,/cutoff_ms=.*7200000/)
  assert.match(pub,/slot_start_ms=.*\/ 7200\) \* 7200000/)
  assert.match(pub,/ref: \$\{\{ steps\.gate\.outputs\.sha \}\}/)
  assert.doesNotMatch(pub,/github\.event\.pull_request\.head\.sha|github\.event\.workflow_run\.head_sha/)
})

test('prebuilt pilot never deploys, never uploads artifacts and is isolated from emergency',()=>{
  const pub=workflow.slice(workflow.indexOf('  publish:'),workflow.indexOf('  cleanup:'))
  assert.match(pub,/inputs\.prebuilt_test == true &&\s*inputs\.emergency != true/)
  assert.match(pub,/node-version: '24'/)
  assert.match(pub,/npm install --global vercel@66\.6\.0/)
  assert.match(pub,/vercel pull --yes --environment=production/)
  assert.match(pub,/vercel build --prod/)
  assert.match(pub,/test -s \.vercel\/output\/config\.json/)
  assert.match(pub,/vars\.HH_VERCEL_PREBUILT_ENABLED == 'true' && inputs\.prebuilt_test != true && inputs\.emergency != true/)
  assert.match(pub,/inputs\.prebuilt_test != true && \(vars\.HH_VERCEL_PREBUILT_ENABLED != 'true' \|\| inputs\.emergency == true\)/)
  assert.doesNotMatch(pub,/actions\/upload-artifact|actions\/cache|--token\s/)
  assert.match(pub,/run: rm -rf \.vercel/)
})

test('prebuilt promotion is fail closed on exact deployment, smoke and provider status',()=>{
  const stage=workflow.slice(workflow.indexOf('      - name: Stage prebuilt'),workflow.indexOf('      - name: Remove pulled'))
  assert.match(stage,/vercel deploy --prebuilt --prod --skip-domain/)
  assert.match(stage,/\.meta\.githubCommitSha == \$sha/)
  assert.match(stage,/vercel curl \/ --deployment/)
  assert.match(stage,/vercel curl \/api\/public\/release-evidence/)
  assert.match(stage,/\.deployment_id == \$id/)
  assert.match(stage,/\.state == "success" and \.target_url == \$url/)
  assert.ok(stage.indexOf('vercel promote')>stage.indexOf('.state == "success"'))
  assert.match(stage,/\/v4\/aliases\/holistichouse\.vercel\.app/)
  assert.match(stage,/https:\/\/holistichouse\.vercel\.app\/api\/public\/release-evidence/)
})
