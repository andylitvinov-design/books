#!/usr/bin/env node
// Explicit opt-in pilot: OpenCode builder + fresh-context critic + deterministic checks.
// No Git pushes, external messages, provider E2E, production changes or paid models.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FREE_MODELS, SAFE_EDIT_FILES, REQUIRED_CRITERIA, CONTRACT_TESTS,
  parseGauntletArgs, changedPathsFromPorcelain, checkEditScope, parseCriticVerdict,
} from '../../lib/benchmarking/hh-gauntlet-loop.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const task = [
  'Pilot only: improve the existing Free Express wizard WITHOUT changing backend semantics.',
  'Path: /{en,ru,es}/services/free-situation-review -> explicit visitor opt-in',
  '-> exactly one existing service enquiry/CRM request -> HH reference receipt.',
  'The protected client/practitioner inbox and real lead persistence are OUTSIDE this',
  'synthetic-only pilot; NEVER describe mocked browser writes as real CRM delivery.',
  'Keep EN/RU/ES parity and 320/390/430px usability. Protect consent and privacy.',
  'Allowed changes are existing wizard UI and its synthetic regression tests only.',
  'No paid APIs, provider calls, migrations, secrets, real leads or advertisements.',
].join(' ');

function run(command, args, timeoutMs, env = process.env) {
  const result = spawnSync(command, args, {
    cwd: root, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 1_500_000,
    env, windowsHide: true,
  });
  return {
    ok: result.status === 0 && !result.error,
    stdout: String(result.stdout || ''),
    stderr: String(result.stderr || ''),
    status: result.status,
    error: result.error?.code || null,
  };
}

function git(args) {
  const result = run('git', args, 20_000);
  if (!result.ok) throw new Error('Git preflight failed: ' + args[0]);
  return result.stdout.replace(/\s+$/, '');
}

function agentEnv() {
  // Deliberately do not inherit DATABASE_URL, VERCEL_TOKEN, SUPABASE_*, etc.
  const allowed = ['HOME', 'PATH', 'LANG', 'LC_ALL', 'TERM', 'TMPDIR',
    'XDG_CONFIG_HOME', 'OPENCODE_API_KEY'];
  const env = Object.fromEntries(allowed.filter(key => process.env[key])
    .map(key => [key, process.env[key]]));
  env.OPENCODE_DISABLE_CLAUDE_CODE = '1';
  env.OPENCODE_ENABLE_EXA = '0';
  env.OPENCODE_ENABLE_PARALLEL = '0';
  return env;
}

function preflight(model) {
  if (process.env.CI || process.env.VERCEL) throw new Error('Model loop forbidden in CI/Vercel');
  if (process.env.OPENCODE_DISABLE_FREE_MODELS === '1')
    throw new Error('Free models are disabled by OpenCode configuration');
  const branch = git(['branch', '--show-current']);
  if (!/^codex\/hh-gauntlet-[\w-]+$/.test(branch))
    throw new Error('Use a disposable codex/hh-gauntlet-* branch, never production/default');
  const remote = git(['remote', 'get-url', 'origin']);
  if (!/github\.com[:/]andylitvinov-design\/books(?:\.git)?$/.test(remote))
    throw new Error('Wrong repository origin');
  if (git(['status', '--porcelain=v1', '--untracked-files=all']))
    throw new Error('Pilot worktree must start clean');
  for (const secret of ['.env', '.env.local', '.env.production', '.env.development',
    '.vercel', 'supabase/.env', 'supabase/.env.local']) {
    if (existsSync(join(root, secret))) throw new Error('Private runtime file present: ' + secret);
  }
  const models = run('opencode', ['models', 'opencode'], 40_000, agentEnv());
  if (!models.ok || !models.stdout.split(/\r?\n/).some(line => line.trim() === model))
    throw new Error('Chosen verified-free model not enabled in OpenCode; connect provider, never fall back to paid');
  return branch;
}

function summarize(out) {
  return (out.stdout + '\n' + out.stderr).split('\n').slice(-28).join('\n').slice(-5000);
}

function deterministicGates() {
  const tests = run(process.execPath, ['--test', ...CONTRACT_TESTS], 120_000);
  const tsc = run(join(root, 'node_modules/.bin/tsc'), ['--noEmit'], 180_000);
  const lint = run(join(root, 'node_modules/.bin/eslint'),
    SAFE_EDIT_FILES.filter(path => /\.(mjs|js|jsx|ts|tsx)$/.test(path)), 120_000);
  const whitespace = run('git', ['diff', '--check'], 20_000);
  return {
    ok: tests.ok && tsc.ok && lint.ok && whitespace.ok,
    checks: {
      contracts: tests.ok, typecheck: tsc.ok, lint: lint.ok, whitespace: whitespace.ok,
    },
    // Synthetic-only logs. Never persist production payloads, credentials or contacts.
    digest: [tests, tsc, lint, whitespace].map((r, i) =>
      ['contracts', 'typecheck', 'lint', 'whitespace'][i] +
      ': ' + (r.ok ? 'PASS' : 'FAIL') + (r.ok ? '' : '\n' + summarize(r))).join('\n').slice(0, 12000),
  };
}

function invoke(agent, model, prompt, ms) {
  const result = run('opencode', [
    'run', '--auto', '--model', model, '--agent', agent,
    '--format', 'json', prompt,
  ], ms, agentEnv());
  if (!result.ok) throw new Error(agent + ' failed or timed out (no paid fallback): ' +
    (result.error || result.status || 'unknown') + '\n' + summarize(result).slice(-1100));
  return result.stdout;
}

function baselineCheck() {
  for (const file of [
    'components/free-express-wizard.tsx',
    'scripts/verify-free-express-wizard-v2.mjs',
    '.opencode/agents/hh-gauntlet-builder.md',
    '.opencode/agents/hh-gauntlet-critic.md',
  ]) if (!existsSync(join(root, file))) throw new Error('Missing existing pilot dependency: ' + file);
}

function showCheck() {
  baselineCheck();
  console.log('HH Gauntlet pilot: OFFLINE CHECK PASS');
  console.log('No model calls, installs, writes, Git operations or paid usage performed.');
  console.log('Approved free model IDs: ' + FREE_MODELS.join(', '));
  console.log('Existing browser smoke: scripts/verify-free-express-wizard-v2.mjs (synthetic only)');
  console.log('To run: use a CLEAN disposable codex/hh-gauntlet-* worktree,');
  console.log('verify current zero-cost model pricing and OpenCode login, then:');
  console.log('node scripts/benchmarking/hh-gauntlet-loop.mjs --run');
}

function writeEvidence(dir, record) {
  writeFileSync(join(dir, 'scorecard.json'), JSON.stringify(record, null, 2) + '\n',
    { flag: 'w', mode: 0o600 });
}

async function main() {
  const opts = parseGauntletArgs(process.argv.slice(2));
  if (!opts.run) { showCheck(); return; }
  baselineCheck();
  const branch = preflight(opts.model);
  const directory = mkdtempSync(join(tmpdir(), 'hh-gauntlet-scorecard-'));
  const record = {
    kind: 'Holistic House Gauntlet pilot',
    evidence_level: 'synthetic_only',
    real_crm_delivery: 'NOT_VERIFIED',
    real_provider_receipt: 'NOT_VERIFIED',
    git_branch: branch, model: opts.model, max_rounds: opts.rounds, rounds: [],
    result: 'NOT_PASSED',
  };
  console.log('Safe synthetic pilot only. Evidence: ' + directory);
  try {
    const baseline = deterministicGates();
    record.baseline = baseline.checks;
    let feedback = baseline.ok ? 'Do not regress the current green contracts.' :
      'Existing deterministic checks are red; repair ONLY within the approved scope.\n' +
      baseline.digest;
    for (let round = 1; round <= opts.rounds; round++) {
      console.log('Builder round ' + round + '/' + opts.rounds);
      invoke('hh-gauntlet-builder', opts.model,
        task + '\nRound ' + round + '. Previous independent evidence:\n' +
        feedback.slice(0, 6000) + '\nMake the smallest useful changes in the allowed files. ' +
        'Do NOT commit, push, publish or call providers.', opts.timeoutSeconds * 1000);
      const paths = changedPathsFromPorcelain(git(['status', '--porcelain=v1', '--untracked-files=all']));
      const scope = checkEditScope(paths);
      const roundResult = { round, paths, scope, deterministic: null, critic: null };
      record.rounds.push(roundResult);
      if (!scope.ok) {
        feedback = scope.reason;
        console.error('BLOCKED: ' + feedback);
        break;
      }
      const diff = git(['diff', '--no-ext-diff', '--no-color', 'HEAD', '--', ...SAFE_EDIT_FILES]);
      if (diff.length > 35_000) {
        feedback = 'Diff exceeds 35k characters; split work and review manually.';
        console.error('BLOCKED: ' + feedback);
        break;
      }
      const gates = deterministicGates();
      roundResult.deterministic = gates.checks;
      const rubric = REQUIRED_CRITERIA.map(id =>
        '{ "id": "' + id + '", "status": "PASS|FAIL|UNKNOWN", "evidence": "specific check and limitation" }'
      ).join(',\n');
      const review = [
        'Fresh-context, independent critic. Judge only the original objective, diff,',
        'and deterministic outputs BELOW, never the Builder self-assessment.',
        'Scope is SYNTHETIC ONLY: positive provider CRM/cabinet E2E is not verified.',
        'Return ONE valid JSON object with decision "PASS" or "FAIL",',
        'criteria array of exactly these six IDs, and findings array of strings.',
        'Missing test evidence must be UNKNOWN (decision FAIL), not invented.',
        'The pilot cannot PASS unless all deterministic gates pass.',
        'Required JSON criteria entries:\n' + rubric,
        'Original objective:\n' + task,
        'Deterministic evidence:\n' + gates.digest,
        'Independent code diff:\n' + diff,
      ].join('\n\n');
      const raw = invoke('hh-gauntlet-critic', opts.model, review,
        opts.timeoutSeconds * 1000);
      const verdict = parseCriticVerdict(raw);
      roundResult.critic = verdict;
      if (gates.ok && verdict.passed) {
        record.result = 'PASS_SYNTHETIC_ONLY';
        console.log('PASS: independent critic + contracts + lint + typecheck.');
        break;
      }
      feedback = ('Deterministic: ' + gates.digest + '\nCritic: ' +
        JSON.stringify(verdict)).slice(0, 6000);
      console.log('FAIL: critic/gates require another bounded iteration.');
    }
  } finally {
    writeEvidence(directory, record);
    console.log('Scorecard: ' + join(directory, 'scorecard.json'));
    console.log('NO real CRM/provider E2E; NO commit, merge, deployment or paid AI.');
  }
  if (record.result !== 'PASS_SYNTHETIC_ONLY') process.exitCode = 2;
}

main().catch(error => {
  console.error('HH GAUNTLET BLOCKED: ' + String(error.message).slice(0, 700));
  process.exitCode = 2;
});
