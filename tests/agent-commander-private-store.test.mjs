import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8')

test('commander OAuth continuation is fixed and owner-verified', () => {
  const route = read('app/api/app/[...path]/route.js')
  const session = read('app/api/app/commander/session/route.js')
  assert.match(route, /commander-monitor/)
  assert.match(route, /commander-connect\.html\?finish=1/)
  assert.match(session, /requireSameOrigin/)
  assert.match(session, /auth\.verified\(\)/)
  assert.match(session, /AGENT_COMMANDER_PRIVATE_STORE_V1/)
  assert.match(session, /data\?\.owner!==true/)
})

test('one-time owner token is carried in a URL fragment, not query or browser storage', () => {
  const main = read('public/commander-connect.js')
  assert.match(main, /target\.hash = 'token='/)
  assert.doesNotMatch(main, /searchParams\.set\(['"]token/)
  assert.doesNotMatch(main, /localStorage/)
  assert.match(main, /sessionStorage\.setItem\(KEY, next\)/)
})

test('private store source requires a verified Supabase user and owner ACL', () => {
  const edge = read('supabase/functions/agent-commander-private-store-v1/index.ts')
  const config = read('supabase/config.toml')
  assert.match(edge, /auth\/v1\/user/)
  assert.match(edge, /business_brain\.owner_access/)
  assert.match(edge, /can_read/)
  assert.match(edge, /can_write/)
  assert.match(edge, /assistant_unverified/)
  assert.match(edge, /executorDispatch:Boolean\(hermesConfiguration\(\)\)/)
  assert.match(config, /verify_jwt = true/)
})

test('GET read endpoints preserve only the approved query arguments', () => {
  const edge = read('supabase/functions/agent-commander-private-store-v1/index.ts')
  assert.match(edge, /const params=new URL\(req\.url\)\.searchParams/)
  assert.match(edge, /\["issueNumber","pr","limit"\]\.includes\(key\)/)
  assert.match(edge, /DUPLICATE_QUERY_PARAMETER/)
})

test('private tables are forced-RLS and direct privileges are revoked', () => {
  const migration = read('supabase/migrations/20261108202918_agent_commander_private_store_v1_20261108.sql')
  for (const table of ['commander_tasks','commander_chats','commander_chat_events']) {
    assert.match(migration,new RegExp('alter table business_brain\\.'+table+' enable row level security'))
    assert.match(migration,new RegExp('alter table business_brain\\.'+table+' force row level security'))
    assert.match(migration,new RegExp('revoke all on business_brain\\.'+table+' from public,anon,authenticated,service_role'))
  }
})

test('Commander Edge Function TypeScript parses before deployment', () => {
  const source = read('supabase/functions/agent-commander-private-store-v1/index.ts')
  const transpiled = ts.transpileModule(source, {
    fileName: 'index.ts',
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
  })
  const errors = (transpiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error)
  assert.deepEqual(errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')), [])
})

test('owner-authenticated Hermes dispatch is opt-in, free-only and idempotent', () => {
  const edge = read('supabase/functions/agent-commander-private-store-v1/index.ts')
  assert.match(edge, /HERMES_ORIGIN_URL/)
  assert.match(edge, /HERMES_SHARED_SECRET/)
  assert.match(edge, /url.protocol!=="https:"/)
  assert.match(edge, /const canUseHermes=executor==="hermes"\|\|executor==="openrouter"/)
  assert.match(edge, /const validModel=MODEL_ID.test\(modelId\)/)
  assert.match(edge, /const writeConfirmed=body.confirmGitHubWrite===true/)
  assert.match(edge, /run\.request_sha256!==requestSha256\|\|run\.run_id!==runId/)
  assert.match(edge, /trustedHermesReceipt\(remote,runId,null,modelId\)/)
  assert.match(edge, /await saveHermesReceipt\(db,ownerId,chat.chat_id,runId,verified\)/)
  assert.doesNotMatch(edge, /GITHUB_WRITE_ENABLED\s*=\s*true/)
})

test('Commander execution events preserve existing database kind CHECK and do not forge LIVE', () => {
  const edge = read('supabase/functions/agent-commander-private-store-v1/index.ts')
  assert.match(edge, /kind:report.status==="COMPLETED"\?"agent_final":"execution_blocked"/)
  assert.match(edge, /values\(\$1::uuid,\$2::uuid,\$3::uuid,'note',\$4::jsonb,\$5::boolean\)/)
  assert.match(edge, /values\(\$1::uuid,\$2::uuid,\$3::uuid,'note',\$4::jsonb,false\)/)
  assert.doesNotMatch(edge, /values\(\$1::uuid,\$2::uuid,\$3::uuid,'execution_blocked'/)
  assert.match(edge, /"DRAFT_PR_COMMIT_VERIFIED_NOT_LIVE"/)
  assert.match(edge, /runId,chatId:chat.chat_id,ownerId,projectKey:"holistic-house"/)
})


test('private store preserves native JSONB objects and arrays when persisting payloads',()=>{
  const edge=read('supabase/functions/agent-commander-private-store-v1/index.ts');
  assert.match(edge,/function jsonbText\(value\)/);
  assert.match(edge,/payload=\$4::text::jsonb/);
  assert.match(edge,/payload=\$2::text::jsonb/);
  assert.match(edge,/failed_jobs[\\s\\S]{0,300}\\$15::text::jsonb/);
  assert.match(edge,/failed_steps[\\s\\S]{0,100}\\$16::text::jsonb/);
  assert.match(edge,/receipt=\$4::text::jsonb/);
  assert.doesNotMatch(edge,/\$[0-9]+::jsonb/);
  assert.doesNotMatch(edge,/jsonb_set\(payload,'\{executionState\}'/);
  assert.match(edge,/set execution_state=\$1,updated_at=now\(\)/);
  assert.match(edge,/jsonbText\(event\.failed_jobs\)/);
  assert.match(edge,/jsonbText\(event\.failed_steps\)/);
});
