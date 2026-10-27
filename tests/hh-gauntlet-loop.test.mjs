import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  FREE_MODELS, SAFE_EDIT_FILES, REQUIRED_CRITERIA, CONTRACT_TESTS,
  parseGauntletArgs, changedPathsFromPorcelain, checkEditScope, parseCriticVerdict,
} from '../lib/benchmarking/hh-gauntlet-loop.mjs';

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const complete = (status = 'PASS') => ({
  decision: 'PASS',
  criteria: REQUIRED_CRITERIA.map(id => ({ id, status, evidence: 'Synthetic contract check: ' + id })),
  findings: [],
});

test('models are strictly provider-qualified and free: no Step 5 paid fallback', () => {
  assert.deepEqual(FREE_MODELS, [
    'opencode/glm-5.3-flash-free', 'opencode/deepseek-v4.1-flash-free',
  ]);
  assert.equal(parseGauntletArgs([]).run, false);
  assert.equal(parseGauntletArgs(['--run', '--model', FREE_MODELS[1]]).model, FREE_MODELS[1]);
  for (const name of ['openrouter/stepfun/step-5-preview',
    'opencode/step-5-preview', 'opencode/glm-5.3-flash', 'fake/free-model']) {
    assert.throws(() => parseGauntletArgs(['--run', '--model', name]), /not in the verified-free/);
  }
});

test('rounds, timeout, repeated flags and unexpected CLI arguments fail closed', () => {
  assert.equal(parseGauntletArgs(['--run', '--rounds','3','--timeout-seconds','60']).rounds, 3);
  for (const opts of [
    ['--run','--check'], ['--run','--run'], ['--rounds','0'],
    ['--rounds','4'], ['--rounds','2.5'], ['--rounds'], ['--timeout-seconds','601'],
    ['--timeout-seconds','NaN'], ['--model'], ['--model',FREE_MODELS[0],'--model',FREE_MODELS[1]],
    ['--paid'], ['--run','--auto-merge'],
  ]) assert.throws(() => parseGauntletArgs(opts));
});

test('scope permits only existing low-risk UI and synthetic test paths', () => {
  assert.ok(SAFE_EDIT_FILES.includes('components/free-express-wizard.tsx'));
  assert.ok(CONTRACT_TESTS.includes('tests/free-express-unified-v2.test.mjs'));
  assert.equal(checkEditScope(['components/free-express-wizard.tsx']).ok, true);
  assert.equal(checkEditScope([]).ok, false);
  for (const forbidden of [
    '.env.local', '.github/workflows/hh-gauntlet-loop.yml',
    'supabase/migrations/20261027000000.sql', 'app/api/service-enquiries/route.js',
    'lib/practitioners/free-express-owner.js', 'app/api/stripe/route.js',
    'tests/hh-gauntlet-loop.test.mjs', '../secret',
  ]) assert.equal(checkEditScope([forbidden]).ok, false, forbidden);
  assert.equal(checkEditScope(SAFE_EDIT_FILES).ok, false, 'Bounded to max five files');
});

test('git porcelain parser keeps status prefixes and sees untracked additions', () => {
  assert.deepEqual(changedPathsFromPorcelain(
    ' M components/free-express-wizard.tsx\n?? .env.local\n',
  ), ['components/free-express-wizard.tsx', '.env.local']);
  assert.throws(() => changedPathsFromPorcelain('M invalid-prefix'));
});

test('critic cannot approve missing, invalid, duplicated or unknown criteria', () => {
  assert.equal(parseCriticVerdict(JSON.stringify(complete())).passed, true);
  assert.equal(parseCriticVerdict(JSON.stringify(complete('UNKNOWN'))).passed, false);
  assert.equal(parseCriticVerdict(JSON.stringify(complete('FAIL'))).passed, false);
  assert.equal(parseCriticVerdict(JSON.stringify({
    ...complete(), criteria: complete().criteria.slice(1),
  })).passed, false);
  assert.equal(parseCriticVerdict(JSON.stringify({
    ...complete(), criteria: [...complete().criteria, complete().criteria[0]],
  })).passed, false);
  assert.equal(parseCriticVerdict(JSON.stringify({
    ...complete(), findings: ['Consent missing'],
  })).passed, false);
  assert.equal(parseCriticVerdict('Great work, PASS!').passed, false);
  assert.equal(parseCriticVerdict(JSON.stringify({
    ...complete(), criteria: [{id:'provider-delivery',status:'PASS', evidence:'not observed'}],
  })).passed, false);
});

test('critic parses isolated JSON event text and refuses malformed JSON', () => {
  const report = JSON.stringify(complete());
  const event = JSON.stringify({type:'text',part:{type:'text',text:report}});
  assert.equal(parseCriticVerdict(event + '\n').passed, true);
  assert.equal(parseCriticVerdict('```json\n' + report + '\n```').passed, true);
  assert.equal(parseCriticVerdict('anything {not valid}').passed, false);
});

test('OpenCode agents are separate; Builder scope restricted, Critic read-only', () => {
  const builder = source('.opencode/agents/hh-gauntlet-builder.md');
  const critic = source('.opencode/agents/hh-gauntlet-critic.md');
  for (const agent of [builder, critic]) {
    assert.match(agent, /mode: primary/);
    assert.match(agent, /external_directory: deny/);
    assert.match(agent, /webfetch: deny/);
    assert.match(agent, /bash: deny/);
    assert.match(agent, /"mcp_\*": deny/);
  }
  assert.match(builder, /"\*": deny/);
  assert.match(builder, /components\/free-express-wizard.tsx/);
  assert.match(critic, /edit: deny/);
  assert.match(critic, /fresh session/);
});

test('offline --check makes no provider calls; --run with paid model stops before executing', () => {
  const script = new URL('../scripts/benchmarking/hh-gauntlet-loop.mjs', import.meta.url);
  const offline = spawnSync(process.execPath, [script.pathname, '--check'],
    {encoding:'utf8', timeout:15000});
  assert.equal(offline.status, 0, offline.stderr);
  assert.match(offline.stdout, /OFFLINE CHECK PASS/);
  assert.match(offline.stdout, /No model calls/);
  const blocked = spawnSync(process.execPath,
    [script.pathname, '--run', '--model', 'openrouter/stepfun/step-5-preview'],
    {encoding:'utf8',timeout:15000});
  assert.equal(blocked.status, 2, blocked.stderr);
  assert.match(blocked.stderr, /not in the verified-free allowlist/);
});
