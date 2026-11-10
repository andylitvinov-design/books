import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const worker=fs.readFileSync(path.join(root,'supabase/functions/agent-commander-openrouter-worker/index.ts'),'utf8');
const store=fs.readFileSync(path.join(root,'supabase/functions/agent-commander-private-store-v1/index.ts'),'utf8');
const migration=fs.readFileSync(path.join(root,'supabase/migrations/20261110144812_commander_openrouter_worker_leases_20261110.sql'),'utf8');
const workerDeno=JSON.parse(fs.readFileSync(path.join(root,'supabase/functions/agent-commander-openrouter-worker/deno.json'),'utf8'));

test('cloud worker is owner-independent but protected by Vault bearer or a scoped OpenRouter key',()=>{
 assert.match(worker,/x-agent-commander-worker/);
 assert.match(worker,/vault\.decrypted_secrets/);
 assert.match(worker,/agent_commander_worker_token/);
 assert.match(worker,/constantTimeEqual/);
 assert.match(worker,/WORKER_AUTH_REJECTED/);
 assert.doesNotMatch(worker,/service_role.*console\.log|console\.log.*apiKey/i);
});

test('worker claims one durable run with a fenced lease and recovers expired attempts',()=>{
 assert.match(worker,/pg_try_advisory_lock/);
 assert.match(worker,/for update skip locked limit 1/i);
 assert.match(worker,/worker_lease_token/);
 assert.match(worker,/worker_lease_expires_at/);
 assert.match(worker,/worker_attempt_count/);
 assert.match(worker,/worker_lease_token=\$6::uuid/);
 assert.match(worker,/WORKER_LEASE_EXPIRED/);
});

test('OpenRouter execution uses only the free router and verifies zero price before persisting success',()=>{
 assert.match(worker,/const MODEL = "openrouter\/free"/);
 assert.match(worker,/allow_fallbacks: false/);
 assert.match(worker,/max_price: \{ prompt: 0, completion: 0 \}/);
 assert.match(worker,/usage\.cost !== 0/);
 assert.match(worker,/usage\.is_byok === true/);
 assert.match(worker,/OPENROUTER_ZERO_COST_NOT_VERIFIED/);
 assert.match(worker,/status='COMPLETED'/);
 assert.match(worker,/cost_usd=0/);
 assert.match(worker,/COMPLETED_UNVERIFIED/);
});

test('private store queues owner-authorized read-only local/OpenRouter runs independently of worker secret placement',()=>{
 assert.ok(store.includes('const canDispatch=(executor==="local"||executor==="openrouter")&&!writeConfirmed&&openRouterReady'));
 assert.match(store,/OPENROUTER_WORKER_QUEUED/);
 assert.ok(store.includes('const firstStatus=canDispatch?"QUEUED":"BLOCKED"'));
 assert.match(store,/dispatchAvailable:openRouterReady/);
 assert.match(store,/openRouterConfigured:openRouterReady/);
 assert.match(store,/OPENROUTER_API_KEY_NOT_CONFIGURED/);
 assert.match(store,/receiveCommanderCiRoute\(req,origin\)/);
 assert.match(store,/route_receipt/);
 assert.match(store,/ensureCiIncidentTask/);
});

test('lease/checkpoint migration uses the existing private execution ledger, not a second queue',()=>{
 assert.match(migration,/alter table business_brain\.commander_execution_runs/i);
 assert.match(migration,/worker_checkpoint jsonb/i);
 assert.match(migration,/worker_attempt_count integer/i);
 assert.match(migration,/worker_lease_token uuid/i);
 assert.match(migration,/worker_next_attempt_at timestamptz/i);
 assert.match(migration,/create index if not exists commander_execution_runs_worker_queue_idx/i);
 assert.doesNotMatch(migration,/create table/i);
});

test('worker is read-only and cannot merge, deploy or write source files',()=>{
 assert.match(worker,/read-only/i);
 assert.match(worker,/sourceWrite: null/);
 assert.doesNotMatch(worker,/github\.com\/repos\/.*\/git\/refs|\/pulls/);
 assert.doesNotMatch(worker,/merge.*pull|git push/i);
});

test('Deno v2 worker directory opts into automatic npm node_modules installation',()=>{
 assert.equal(workerDeno.nodeModulesDir,'auto');
});

test('SQLSTATE 42P08 regression: scalar placeholders are cast before JSONB checkpoint construction',()=>{
 assert.ok(worker.includes('actual_model_id=$1::text'));
 assert.ok(worker.includes("'model',$1::text"));
 assert.ok(worker.includes('status=$1::text,reason_code=$2::text,worker_last_error_code=$2::text'));
 assert.ok(worker.includes("'phase',$4::text,'errorCode',$2::text"));
 assert.ok(worker.includes("'answerSha256',$3::text,'completedAt',$4::timestamptz"));
});


test('OpenRouter final answers preserve Markdown and newlines without unsafe controls',()=>{
 const declaration=worker.match(/^const cleanMultiline = .*;$/m)?.[0];
 assert.ok(declaration);
 const sanitizer=Function(declaration+'\nreturn cleanMultiline;')();
 assert.equal(sanitizer('  Первый\r\n\r\n### Тема\r**жирный**\n- Пункт\t\u0000',8000),
  'Первый\n\n### Тема\n**жирный**\n- Пункт');
 assert.match(worker,/text: cleanMultiline\(text, 8000\)/);
 assert.match(worker,/const answer = cleanMultiline\(assistant\.content, 8000\)/);
 assert.match(worker,/Format answers as readable Markdown/);
});
