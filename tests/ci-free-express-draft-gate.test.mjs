import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const filename = '.github/workflows/hh-free-express-wizard-v2.yml';
const yaml = readFileSync(new URL('../'+filename,import.meta.url),'utf8');

test('Free Express heavy browser and database skip Draft and re-enable on exact Ready',()=>{
  assert.match(yaml,/^  pull_request:\n    types: \[opened, synchronize, reopened, ready_for_review, converted_to_draft\]/m);
  assert.match(yaml,/^    branches: \['codex\/public-book-library'\]/m);
  const ready="    if: \u0024{{ github.event_name != 'pull_request' || github.event.pull_request.draft == false }}";
  for(const job of ['protected-wizard','guest-continuation-rls-postgres17']){
    assert.ok(yaml.includes("  "+job+":\n"+ready+"\n"),job+' must be gated on Ready');
  }
  assert.match(yaml,/^  workflow_dispatch:/m);
  assert.ok(yaml.includes("group: hh-free-express-v2-\u0024{{ github.event_name == 'pull_request' && github.event.action == 'synchronize' && github.event.before != github.event.after && format('pr-{0}', github.event.pull_request.number) || format('run-{0}', github.run_id) }}"));
  assert.ok(yaml.includes("cancel-in-progress: \u0024{{ github.event_name == 'pull_request' && github.event.action == 'synchronize' && github.event.before != github.event.after }}"));
  assert.ok(yaml.includes("      - 'tests/ci-free-express-draft-gate.test.mjs'"));
  assert.ok(yaml.includes("node --test tests/free-express-wizard-v2.test.mjs tests/free-express-unified-v2.test.mjs tests/free-express-owner-reply.test.mjs tests/free-express-retention.test.mjs tests/ci-free-express-draft-gate.test.mjs"));
});

test('Privacy, synthetic browser, PostgreSQL RLS and all real original gates remain intact',()=>{
  for(const required of [
    'tests/free-express-wizard-v2.test.mjs',
    'tests/free-express-unified-v2.test.mjs',
    'tests/free-express-owner-reply.test.mjs',
    'tests/free-express-retention.test.mjs',
    'tests/free-express-rls-isolated.integration.mjs',
    'HH_FREE_EXPRESS_V2_ENABLED',
    'npm run build',
    'node scripts/verify-free-express-wizard-v2.mjs',
    'playwright@1.63.0',
    'postgres:17-alpine',
    'HH_APP_TEST_RUNTIME: isolated',
    'HH_TEST_ADMIN_DATABASE_URL',
    'synthetic-ci-admin',
  ]) assert.ok(yaml.includes(required),'Lost real acceptance contract '+required);
  assert.doesNotMatch(yaml,/continue-on-error:\s*true/);
});
