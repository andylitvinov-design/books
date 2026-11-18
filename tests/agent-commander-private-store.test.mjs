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
  assert.match(session, /data\?\.owner\s*!==\s*true/)
})

test('one-time owner token is carried in a URL fragment, not query or browser storage', () => {
  const main = read('public/commander-connect.js')
  assert.match(main, /target\.hash = new URLSearchParams\(\{/)
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
  assert.match(edge, /dispatchEnabled:false,dispatchAvailable:openRouterReady/); assert.match(edge, /executionRunLedger:true,dispatchMode:"FIRST_PARTY_AGENT_DIRECTOR"/)
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

test('private store preserves native JSONB objects and arrays when persisting payloads',()=>{
  const edge=read('supabase/functions/agent-commander-private-store-v1/index.ts');
  assert.match(edge,/function jsonbText\(value\)/);
  assert.match(edge,/payload=\$\d+::text::jsonb/);
  assert.match(edge,/payload=\$\d+::text::jsonb/);
  assert.match(edge,/jsonbText\(event\.failed_jobs\)/);
  assert.match(edge,/jsonbText\(event\.failed_steps\)/);
  assert.match(edge,/receipt=\$\d+::text::jsonb/);
  assert.doesNotMatch(edge,/\$[0-9]+::jsonb/);
  assert.doesNotMatch(edge,/jsonb_set\(payload,'\{executionState\}'/);
  assert.match(edge,/set execution_state=\$1,updated_at=now\(\)/);
  assert.match(edge,/jsonbText\(event\.failed_jobs\)/);
  assert.match(edge,/jsonbText\(event\.failed_steps\)/);
});


test('Agent Director owns its run path and the Supabase store does not depend on an external Hermes HTTP service',()=>{
  const edge=read('supabase/functions/agent-commander-private-store-v1/index.ts');
  const route=read('app/api/agent-director/commander-run/route.js');
  const runtime=read('lib/agent-director/commander-owned-runtime.mjs');
  assert.match(edge,/DIRECTOR_ORIGIN="https:\/\/holistichouse\.vercel\.app"/);
  assert.match(edge,/ownedDirectorCall\(req,/);
  assert.match(edge,/const canDispatch=\(executor==="local"\|\|executor==="openrouter"\)&&!writeConfirmed&&openRouterReady/);
  assert.match(edge,/EXTERNAL_HERMES_SERVICE_DISABLED_FIRST_PARTY_ONLY/);
  assert.match(edge,/function trustedOwnedDirectorReceipt\(value,run\)/);
  assert.match(edge,/async function saveOwnedDirectorReceipt\(db,ownerId,chatId,runId,report\)/);
  assert.doesNotMatch(edge,/HERMES_ORIGIN_URL|HERMES_SHARED_SECRET|hermesCall\(|trustedHermesReceipt/);
  assert.match(route,/auth\/v1\/user/);
  assert.match(route,/privateStoreConfigured!==true/);
  assert.match(route,/executeOwnedCommanderRun/);
  assert.match(route,/store\?\.canWrite!==true/);
  assert.match(route,/runs\?\.chatId!==body\.chatId/);
  assert.match(route,/run\.request_sha256!==body\.requestSha256/);
  assert.match(route,/consumeRate\(config/);
  assert.match(edge,/canWrite:writable/);
  assert.match(edge,/requestSha256/); assert.match(edge,/projectKey:"holistic-house"/);
  assert.match(runtime,/HH_AGENT_OLLAMA_ENABLED!=='true'/);
  assert.match(runtime,/AGENT_DIRECTOR_GITHUB_APP_NOT_CONFIGURED/);
  assert.match(runtime,/AGENT_DIRECTOR_READ_ONLY_RESPONSE/);
  assert.doesNotMatch(runtime,/OPENROUTER_API_KEY|GITHUB_TOKEN/);
  assert.match(edge,/dispatchEnabled:false,dispatchAvailable:openRouterReady/);
});


test('CI inbox is scoped to one owner while first-party Director dispatch stays intact',()=>{
 const edge=read('supabase/functions/agent-commander-private-store-v1/index.ts');
 const migration=read('supabase/migrations/20261110134000_commander_ci_inbox_owner_scope_v1.sql');
 assert.match(edge,/select user_id from business_brain\.owner_access where can_read=true/);
 assert.match(edge,/readableOwners.length!==1/);
 assert.ok(edge.includes('oidc_workflow_ref, inbox_owner_id'));
 assert.ok(edge.includes("where project_key='agent-commander' and owner_id=$1::uuid"));
 assert.ok(edge.includes('where inbox_owner_id=$3::uuid'));
 assert.ok(edge.includes('ownedDirectorCall(req,'));
 assert.ok(edge.includes('FIRST_PARTY_AGENT_DIRECTOR'));
 assert.doesNotMatch(edge,/HERMES_ORIGIN_URL|HERMES_SHARED_SECRET|hermesCall\(/);
 assert.match(migration,/alter column inbox_owner_id set not null/);
 assert.match(migration,/revoke all on business_brain\.commander_ci_event_inbox/);
});
