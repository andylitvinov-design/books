import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  FREE_MODELS, SAFE_EDIT_FILES, REQUIRED_CRITERIA, CONTRACT_TESTS,
  parseGauntletArgs, changedPathsFromPorcelain, checkEditScope, parseCriticVerdict,
  allowsSyntheticActionsRun,
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

test('CI model runs require exact GitHub-hosted, no-key, nonproduction sandbox', () => {
  const env = {
    CI: 'true', GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: 'pull_request',
    GITHUB_REPOSITORY: 'andylitvinov-design/books',
    HH_GAUNTLET_CI_SYNTHETIC: 'isolated-20261027',
    RUNNER_TEMP: '/home/runner/work/_temp',
    HOME: '/home/runner/work/_temp/hh-oc-home',
    XDG_CONFIG_HOME: '/home/runner/work/_temp/hh-oc-home/config',
    XDG_DATA_HOME: '/home/runner/work/_temp/hh-oc-home/data',
    XDG_CACHE_HOME: '/home/runner/work/_temp/hh-oc-home/cache',
  };
  assert.equal(allowsSyntheticActionsRun(env), true);
  for (const [name, value] of [
    ['CI', 'false'], ['GITHUB_ACTIONS', 'false'],
    ['GITHUB_EVENT_NAME', 'push'], ['GITHUB_REPOSITORY', 'other/books'],
    ['HH_GAUNTLET_CI_SYNTHETIC', '1'],
    ['HOME', '/home/runner'],
    ['XDG_CONFIG_HOME', '/home/runner/.config'],
    ['XDG_DATA_HOME', '/home/runner/.local/share'],
    ['XDG_CACHE_HOME', '/home/runner/.cache'],
    ['OPENCODE_API_KEY', 'fake-credential'],
    ['VERCEL', '1'], ['OPENCODE_DISABLE_FREE_MODELS', '1'],
  ]) assert.equal(allowsSyntheticActionsRun({ ...env, [name]: value }), false, name);
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

test('OpenCode v2 agents enforce ordered deny-all, scoped Builder edits and read-only Critic', () => {
  const builder = source('.opencode/agents/hh-gauntlet-builder.md');
  const critic = source('.opencode/agents/hh-gauntlet-critic.md');
  for (const agent of [builder, critic]) {
    const frontmatter = agent.split('---')[1];
    assert.match(frontmatter, /mode: primary/);
    assert.match(frontmatter, /\npermissions:\n/);
    assert.doesNotMatch(frontmatter, /\npermission:|\nbash:|\ntemperature:/);
    const rules = [...frontmatter.matchAll(/^  - action: "([^"]+)"\n    resource: "([^"]+)"\n    effect: (allow|deny)$/gm)]
      .map(x => ({ action: x[1], resource: x[2], effect: x[3] }));
    assert.deepEqual(rules[0], { action: '*', resource: '*', effect: 'deny' });
    assert.ok(rules.some(x => x.action === 'read' && x.resource === '*' && x.effect === 'allow'));
    assert.ok(rules.some(x => x.action === 'glob' && x.effect === 'allow'));
    assert.ok(rules.some(x => x.action === 'grep' && x.effect === 'allow'));
    assert.ok(rules.some(x => x.action === 'read' && x.resource === '**/.env.*' && x.effect === 'deny'));
    assert.ok(!rules.some(x => x.effect === 'allow' &&
      ['shell', 'execute', 'external_directory', 'webfetch', 'websearch', 'subagent'].includes(x.action)));
    const approved = rules.filter(x => x.action === 'edit' && x.effect === 'allow').map(x => x.resource);
    if (agent === builder) {
      assert.deepEqual(approved.sort(), SAFE_EDIT_FILES.slice().sort());
    } else {
      assert.deepEqual(approved, [], 'Critic must have no edit permission');
    }
    assert.equal(rules.length, agent === builder ? 14 : 8, 'No hidden permission grants');
  }
  assert.match(critic, /fresh session/);
});

test('deterministic typecheck leaves the disposable Git worktree free of cache files', () => {
  const script = source('scripts/benchmarking/hh-gauntlet-loop.mjs');
  assert.match(script, /\['--noEmit', '--incremental', 'false'\]/);
  assert.match(script, /git\(\['status', '--porcelain=v1', '--untracked-files=all'\]\)/);
});

test('OpenCode v2 provider listing uses the supported standalone CLI form', () => {
  const script = source('scripts/benchmarking/hh-gauntlet-loop.mjs');
  assert.match(script, /\['models', '--standalone'\]/);
  assert.doesNotMatch(script, /\['models', 'opencode'\]/);
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
