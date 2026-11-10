import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker = fs.readFileSync(
  new URL('../supabase/functions/agent-commander-openrouter-worker/index.ts', import.meta.url),
  'utf8'
);

test('tracked worker matches the deployed first-party Supabase OpenRouter worker contract', () => {
  assert.match(worker, /WORKER_SECRET_NAME\s*=\s*["']agent_commander_worker_token["']/);
  assert.match(worker, /MAX_ATTEMPTS\s*=\s*3/);
  assert.match(worker, /MODEL\s*=\s*["']openrouter\/free["']/);
  assert.match(worker, /vault\.decrypted_secrets/);
  assert.match(worker, /constantTimeEqual/);
});

test('worker leases one queued run with SKIP LOCKED and a fencing token', () => {
  assert.match(worker, /FOR UPDATE SKIP LOCKED LIMIT 1/i);
  assert.match(worker, /worker_lease_token=\$1::uuid/);
  assert.match(worker, /worker_lease_expires_at=now\(\)\+interval '110 seconds'/);
  assert.match(worker, /worker_attempt_count=worker_attempt_count\+1/);
  assert.match(worker, /where run_id=\$2::uuid and status='QUEUED'/);
});

test('worker completion and failure updates are fenced to the current lease', () => {
  assert.match(worker, /where run_id=\$5::uuid and status='RUNNING' and worker_lease_token=\$6::uuid/);
  assert.match(worker, /where run_id=\$5::uuid and status='RUNNING' and worker_lease_token=\$6::uuid/);
  assert.match(worker, /WORKER_LEASE_EXPIRED/);
  assert.match(worker, /WORKER_RETRY_LIMIT_REACHED/);
});

test('worker remains read-only and enforces explicit zero-cost OpenRouter execution', () => {
  assert.match(worker, /provider:\s*\{\s*allow_fallbacks:\s*false/);
  assert.match(worker, /max_price:\s*\{\s*prompt:\s*0,\s*completion:\s*0\s*\}/);
  assert.match(worker, /usage\.cost\s*!==\s*0/);
  assert.match(worker, /usage\.is_byok\s*===\s*true/);
  assert.match(worker, /assistant\.tool_calls\)\s*&&\s*assistant\.tool_calls\.length/);
  assert.match(worker, /sourceWrite:\s*null/);
  assert.doesNotMatch(worker, /hermes\.github\.patch\.publish|github\.write/i);
});

test('worker returns bounded non-sensitive diagnostics and never logs response bodies or secrets', () => {
  assert.match(worker, /OPENROUTER_API_KEY_NOT_CONFIGURED/);
  assert.match(worker, /OPENROUTER_ZERO_COST_NOT_VERIFIED/);
  assert.match(worker, /console\.error\(["']AGENT_COMMANDER_OPENROUTER_WORKER_ERROR["'],\s*String\(error\?\.name/);
  assert.doesNotMatch(worker, /console\.(?:log|error|warn)\([^\n]*(?:apiKey|decrypted_secret|Authorization|Bearer)/i);
});
