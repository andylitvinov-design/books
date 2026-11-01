#!/usr/bin/env node
// Read-only exact-HEAD and exact-BASE coverage of applicable specialist workflows.
// Runs from the PR merge checkout; no third-party API and no write permissions.
import { readFileSync, readdirSync, appendFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { classifyStaticUiText, scopedCssIsSafe } from '../lib/ci/fast-static-ui-text.mjs';
import {
  TARGET, WORKFLOW_PREFIX, expectedWorkflows, classifyPackageImpact, resolveExpectedSpecialists,
  inspectWorkflowRuns, inspectJobs, validateParameters, classifyReleaseRisk, concurrencyOnlyAdvisory, isConcurrencyAdvisoryRun,
} from '../lib/ci/specialist-aggregate.mjs';

export function worktreeSources(baseSha, cwd = process.cwd()) {
  const baseNames = execFileSync('git', ['ls-tree','-r','--name-only',baseSha,'--',WORKFLOW_PREFIX],
    {cwd, encoding:'utf8',maxBuffer:5e6}).split('\n').filter(x => /\.ya?ml$/.test(x));
  const base = new Map();
  for (const name of baseNames) {
    const text = execFileSync('git', ['show',baseSha + ':' + name], {cwd,encoding:'utf8',maxBuffer:2e6});
    base.set(name,text);
  }
  const current = new Map(), dir = join(cwd,WORKFLOW_PREFIX);
  for (const name of readdirSync(dir)) {
    if (/\.ya?ml$/.test(name)) current.set(WORKFLOW_PREFIX + name,readFileSync(join(dir,name),'utf8'));
  }
  if (!base.size || !current.size) throw Error('NO_WORKFLOW_SOURCES');
  // Always compare the immutable base manifest to the exact proposed checkout.
  const basePackage = execFileSync('git', ['show',baseSha + ':package.json'], {cwd,encoding:'utf8',maxBuffer:2e6});
  const currentPackage = readFileSync(join(cwd,'package.json'),'utf8');
  return {base,current,basePackage,currentPackage};
}

// Use the exact tested merge checkout, including both sides of renames, rather
// than a live PR file listing that can change when production advances.
export function checkoutChangedRows(baseSha, cwd = process.cwd()) {
  const raw = execFileSync('git', ['diff','--no-renames','--name-status','-z',baseSha,'HEAD'],
    {cwd, encoding:'utf8', maxBuffer:5e6}).split('\0');
  if (raw.at(-1) === '') raw.pop();
  if (!raw.length || raw.length % 2 || raw.length / 2 >= 3000) throw Error('CHECKOUT_CHANGED_FILES_INVALID');
  const rows = [];
  for (let i = 0; i < raw.length; i += 2) {
    if (!/^[AMDT]$/.test(raw[i]) || !raw[i + 1]) throw Error('CHECKOUT_CHANGED_FILES_INVALID');
    rows.push({ status: raw[i], filename: raw[i + 1] });
  }
  return rows;
}

export function verifiedCheckoutBase(env, ctx, cwd = process.cwd()) {
  if (!env.HH_TRUSTED_BASE_SHA) return null; // Compatibility with existing in-flight workflows.
  const git = (...args) => execFileSync('git', args, {cwd,encoding:'utf8'}).trim();
  if (!/^[0-9a-f]{40}$/.test(env.HH_TRUSTED_BASE_SHA) ||
      git('rev-parse','HEAD') !== env.GITHUB_SHA ||
      git('rev-parse','HEAD^1') !== env.HH_TRUSTED_BASE_SHA ||
      git('rev-parse','HEAD^2') !== ctx.head) throw Error('UNVERIFIED_MERGE_CHECKOUT');
  return env.HH_TRUSTED_BASE_SHA;
}

export function githubReader(repo, token, transport = fetch) {
  const root = 'https://api.github.com/repos/' + repo;
  const headers = {
    Authorization: 'Bearer ' + token,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  async function get(path) {
    const response = await transport(root + path,{headers});
    if (!response.ok) throw Error('GitHub read ' + path.split('?')[0] + ' HTTP ' + response.status);
    return response.json();
  }
  async function pages(path, kind, maximum = 1000) {
    const out = [];
    for (let page = 1; page <= Math.ceil(maximum / 100) + 1; page++) {
      const separator = path.includes('?') ? '&' : '?';
      const response = await get(path + separator + 'per_page=100&page=' + page);
      const chunk = kind ? response?.[kind] : response;
      if (!Array.isArray(chunk)) throw Error('GITHUB_PAGE_SHAPE:' + path);
      out.push(...chunk);
      if (out.length > maximum) throw Error('GITHUB_PAGE_LIMIT:' + path);
      if (chunk.length < 100) return out;
    }
    throw Error('GITHUB_PAGINATION_INCOMPLETE:' + path);
  }
  return {
    pr: (n) => get('/pulls/' + n),
    changed: (n) => pages('/pulls/' + n + '/files',null,3000),
    runs: (sha) => pages('/actions/runs?head_sha=' + sha,'workflow_runs',1000),
    jobs: (runId) => pages('/actions/runs/' + runId + '/jobs','jobs',1000),
  };
}

// Loose BASE is permitted only for recognizable, non-sensitive source paths.
// A surprising path, CI/policy change, credential-related name, private-data
// surface, API, or billing/security feature retains fresh production-base
// matching. This is deliberately independent of FAST UI routing: normal
// application code still requires Core and all applicable specialist checks.
export function requiresCurrentProductionBase(changed) {
  if (!Array.isArray(changed) || changed.length === 0) return true;
  const ordinaryRoots = /^(?:app|components|lib|tests|public|content|data|docs)\//;
  const sensitiveName = /(?:^|[\/_.-])(?:account|admin|api|auth|billing|booking|cabinet|chat|checkout|client|consent|conversation|credential|crm|database|health|identity|inbox|login|medical|message|messages|messaging|migration|patient|payment|private|privacy|profile|rls|secret|security|session|storage|supabase|token|wallet)(?:$|[\/_.-])/i;
  const sensitiveRoots = /^(?:app\/(?:\[[^/]+\]\/)?api\/|app\/(?:\[[^/]+\]\/)?app\/|components\/app\/|lib\/(?:app|assessments|ia|practitioners)\/|docs\/operations\/|docs\/billing\/|docs\/payments\/)/i;
  return changed.some(file =>
    typeof file !== 'string' ||
    !ordinaryRoots.test(file) ||
    file.split('/').some(segment => segment === '.' || segment === '..' || segment === '') ||
    sensitiveName.test(file) ||
    sensitiveRoots.test(file)
  );
}

// A precise PR state reason is actionable; a generic HEAD/BASE message is not.
// Keep the fail-closed prefix for existing consumers and expose the precise cause.
export function classifyPrState(pr, ctx, requireCurrentBase = false) {
  if (!pr || pr.number !== ctx.number) return 'WRONG_PR_NUMBER';
  if (pr.state !== 'open') return 'PR_NOT_OPEN';
  if (pr.draft) return 'PR_DRAFT';
  if (pr.head?.sha !== ctx.head) return 'PR_HEAD_CHANGED';
  if (!/^[0-9a-f]{40}$/i.test(pr.base?.sha || '')) return 'INVALID_BASE_SHA';
  if (pr.base?.ref !== TARGET) return 'WRONG_PRODUCTION_TARGET';
  if (pr.base?.repo?.full_name !== ctx.repo || pr.head?.repo?.full_name !== ctx.repo) return 'WRONG_REPOSITORY';
  if (requireCurrentBase && pr.base.sha !== ctx.base) return 'PRODUCTION_BASE_CHANGED';
  if (pr.mergeable === false || pr.mergeable_state === 'dirty') return 'MERGE_CONFLICT';
  return null;
}

function assertSame(pr, ctx, requireCurrentBase = false) {
  const reason = classifyPrState(pr, ctx, requireCurrentBase);
  if (reason) throw Error('PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:' + reason);
}

// These broad domain/browser diagnostics remain visible in Actions. Only a
// proven FAST presentation change may stop waiting for an unchanged BASE copy.
const FAST_ADVISORY_WORKFLOWS = new Set([
  '.github/workflows/hh-public-services-production.yml',
  '.github/workflows/hh-app-r1.yml',
  '.github/workflows/hh-app-browser.yml',
  '.github/workflows/ia-v2.yml',
  '.github/workflows/opora-module-ci.yml',
  '.github/workflows/site-video-browser.yml',
  '.github/workflows/hh-benchmark-public-browser.yml',
]);

// Load only the BASE-pinned parser, without PR dependencies or npm scripts.
// A failed install never waives checks: callers fall back to STRICT.
export function loadTrustedTypescript(base) {
  if (!/^[0-9a-f]{40}$/.test(base || '')) return null;
  let dir;
  try {
    const read=path=>execFileSync('git',['show',base+':'+path],{encoding:'utf8',maxBuffer:100_000,stdio:['ignore','pipe','pipe']});
    const manifest=read('lib/ci/fast-ui-parser/package.json');
    const lock=read('lib/ci/fast-ui-parser/parser-lock.json');
    const pkg=JSON.parse(manifest), parsed=JSON.parse(lock);
    const entry=parsed.packages?.['node_modules/typescript'];
    if (Object.keys(pkg).sort().join(',') !== 'dependencies,name,private,version' ||
        pkg.name !== 'hh-fast-ui-parser' || pkg.private !== true || pkg.version !== '1.0.0' ||
        JSON.stringify(pkg.dependencies) !== JSON.stringify({typescript:'5.9.3'}) ||
        JSON.stringify(parsed.packages?.['']?.dependencies) !== JSON.stringify({typescript:'5.9.3'}) ||
        Object.keys(parsed.packages || {}).sort().join(',') !== ',node_modules/typescript' ||
        entry?.version !== '5.9.3' || entry.resolved !== 'https://registry.npmjs.org/typescript/-/typescript-5.9.3.tgz' ||
        entry.integrity !== 'sha512-jl1vZzPDinLr9eUt3J/t7V6FgNEw9QjvBPdysz9KfQDD41fQrC2Y4vKQdiaUpFT4bXlb1RHhLpp8wtm6M5TgSw==') return null;
    dir=mkdtempSync(join(tmpdir(),'hh-ci-ui-parser-'));
    writeFileSync(join(dir,'package.json'),manifest,{mode:0o600});
    writeFileSync(join(dir,'package-lock.json'),lock,{mode:0o600});
    const env={PATH:process.env.PATH || '/usr/bin:/bin',CI:'true',npm_config_userconfig:join(dir,'user.npmrc'),
      npm_config_globalconfig:join(dir,'global.npmrc'),npm_config_cache:join(dir,'cache')};
    execFileSync('npm',['ci','--ignore-scripts','--no-audit','--no-fund'],
      {cwd:dir,env,timeout:45_000,maxBuffer:1_000_000,stdio:['ignore','pipe','pipe']});
    return createRequire(join(dir,'package.json'))('typescript');
  } catch {
    console.warn('Trusted UI parser unavailable; routing this change to STRICT.');
    return null;
  }
  finally { if (dir) rmSync(dir,{recursive:true,force:true}); }
}

export async function verify(api,ctx,files,options={}) {
  // Distinguish an absent workflow from a queued run and genuine execution.
  // Only a running specialist may use the long completion deadline.
  const boundedMs = (value, maximum, minimum = 0) => {
    const n = Number(value);
    if (!Number.isFinite(n)) throw Error('INVALID_SPECIALIST_WAIT_CONFIG');
    return Math.max(minimum, Math.min(maximum, n));
  };
  const maxWait = boundedMs(options.maxWaitMs ?? 35*60_000, 40*60_000);
  const missingGrace = Math.min(maxWait, boundedMs(options.missingGraceMs ?? 60_000, 120_000));
  const queuedGrace = Math.min(maxWait, boundedMs(options.queuedGraceMs ?? 180_000, 300_000));
  const pollMs = boundedMs(options.pollMs ?? 20_000, 30_000, 100);
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? delay;
  const pinnedChangeRows = Array.isArray(files.changedRows) && files.changedRows.length > 0;
  const pr = await api.pr(ctx.number);
  // Loose base is never allowed for legacy/unverified live file listings.
  // Only exact merged checkout rows can prove what was tested.
  assertSame(pr,ctx,!pinnedChangeRows);
  const changedRows=pinnedChangeRows ? files.changedRows : await api.changed(ctx.number);
  if (changedRows.some(row => row.status === 'renamed' && typeof row.previous_filename !== 'string')) {
    throw Error('PR_CHANGED_FILES_RENAME_SOURCE_MISSING');
  }
  const changed=changedRows.flatMap(row => row.previous_filename ? [row.filename, row.previous_filename] : [row.filename]);
  if (!changed.length || changedRows.length >= 3000 || changed.some(x=>typeof x!=='string')) throw Error('PR_CHANGED_FILES_MISSING_OR_TRUNCATED');
  // BASE/HEAD workflow definitions and the actual merge snapshot stay
  // immutable even when the production target moves after the check started.
  const requireCurrentBase=!pinnedChangeRows || requiresCurrentProductionBase(changed);
  assertSame(pr,ctx,requireCurrentBase);
  let risk=classifyReleaseRisk(changed);
  const readSource=options.readSource ?? ((rev,path)=>execFileSync('git',['show',rev+':'+path],
    {encoding:'utf8',maxBuffer:1_000_000,stdio:['ignore','pipe','pipe']}));
  const sources=(side,path)=>readSource(side === 'base' ? ctx.base : ctx.head,path);
  if (risk === 'FAST' && !scopedCssIsSafe(changedRows,sources)) risk='STRICT';
  if (risk !== 'FAST') {
    let loaded=false, parser;
    const loadTypescript=()=>{
      if (!loaded) { loaded=true; parser=(options.loadTypescript ?? (()=>loadTrustedTypescript(ctx.base)))(); }
      return parser;
    };
    risk=classifyStaticUiText(changedRows,sources,{loadTypescript});
  }
  const packageImpact=classifyPackageImpact({changed,basePackage:files.basePackage,currentPackage:files.currentPackage});
  const baselineExpected=expectedWorkflows({ ...files,changed,packageImpact });
  const routed=resolveExpectedSpecialists({ ...files,changed,expected:baselineExpected });
  const delegated=routed.delegated;
  const replacements=new Set(delegated.map(item=>item.replacement));
  const syntaxWorkflow=WORKFLOW_PREFIX+'hh-actionlint.yml';
  // The unchanged BASE-owned actionlint workflow must independently validate
  // every modified YAML; never let a PR replace or omit that enforcement.
  const trustedSyntax=pinnedChangeRows && baselineExpected.includes(syntaxWorkflow) &&
    files.base.has(syntaxWorkflow) && files.base.get(syntaxWorkflow) === files.current.get(syntaxWorkflow) &&
    !changed.includes(syntaxWorkflow);
  const concurrencyAdvisory=trustedSyntax ? concurrencyOnlyAdvisory({
    ...files,changedRows,expected:routed.expected,
  }) : new Set();
  for (const replacement of replacements) concurrencyAdvisory.delete(replacement);
  const advisoryPaths=new Set(risk === 'FAST' ? [...FAST_ADVISORY_WORKFLOWS].filter(name=>
    files.base.has(name) && files.base.get(name) === files.current.get(name) && !replacements.has(name)) : []);
  const expected=routed.expected.filter(name=>!advisoryPaths.has(name) && !concurrencyAdvisory.has(name));
  // BASE/HEAD rules enumerate applicable PR specialists. Only completed/pending
  // PR workflow runs proven non-applicable may be advisory. Same-HEAD push
  // failures and orphan/unassociated runs remain fail-closed: there is no
  // trustworthy PR scope evidence to waive them.
  // Keep unknown workflows and failed retired migration workflows fail-closed.
  const catalog = new Set([...files.base.keys(), ...files.current.keys()]);
  const retired = new Set(delegated.map(item => item.retired));
  const workflowPath = item => item.slice(0, item.lastIndexOf(':'));
  const start = now();
  const deadline = start + maxWait;
  const missingDeadline = start + missingGrace;
  const queuedDeadline = start + queuedGrace;
  let state, fastDiagnostics=[];
  for (;;) {
    const allRuns=await api.runs(ctx.head);
    fastDiagnostics=allRuns.filter(run=>advisoryPaths.has(String(run.path || '').split('@')[0]) &&
      (run.status !== 'completed' || run.conclusion !== 'success')).map(run=>String(run.path).split('@')[0]+':'+(run.conclusion || run.status || 'unknown'));
    state=inspectWorkflowRuns({expected,runs:allRuns.filter(run=>!advisoryPaths.has(String(run.path || '').split('@')[0]) && !isConcurrencyAdvisoryRun(run,pr,concurrencyAdvisory)),pr});
    const unregistered = state.observedUnrelated.filter(item => !catalog.has(workflowPath(item)));
    const retiredProblems = state.observedUnrelated.filter(item => retired.has(workflowPath(item)));
    if (state.failed.length || state.pushFailures.length || state.orphanFailures.length ||
        unregistered.length || retiredProblems.length) {
      throw Error('SPECIALIST_FAILED:' + JSON.stringify({
        failed:state.failed, push:state.pushFailures, orphan:state.orphanFailures,
        unregistered, retired:retiredProblems,
      }));
    }
    if (!state.missing.length && !state.pending.length) break;
    // GitHub may take a few seconds to register a newly triggered workflow.
    // After the short discovery grace, absence is a configuration/dispatch
    // failure, NOT a 35-minute running test. Never waive an expected workflow.
    const timestamp = now();
    if (state.missing.length && timestamp >= missingDeadline) {
      throw Error('SPECIALIST_MISSING_OR_PENDING:NOT_TRIGGERED:' +
        JSON.stringify({missing:state.missing,pending:state.pending}));
    }
    // A registered but queued/requested/waiting workflow is not an executing
    // test. Give the GitHub runner queue a separate bounded startup window.
    const notStarted = state.pending.filter(item => !item.endsWith(':in_progress'));
    if (notStarted.length && timestamp >= queuedDeadline) {
      throw Error('SPECIALIST_MISSING_OR_PENDING:NOT_STARTED:' +
        JSON.stringify({queued:notStarted,running:state.pending.filter(item => item.endsWith(':in_progress'))}));
    }
    if (timestamp >= deadline) {
      throw Error('SPECIALIST_MISSING_OR_PENDING:RUNNING_TIMEOUT:' +
        JSON.stringify({pending:state.pending}));
    }
    const nextDeadline = Math.min(deadline,
      state.missing.length ? missingDeadline : Infinity,
      notStarted.length ? queuedDeadline : Infinity);
    const interval = (state.missing.length || notStarted.length) ? Math.min(pollMs, 10_000) : pollMs;
    await sleep(Math.max(1, Math.min(interval, nextDeadline - timestamp)));
  }
  const executed=[];
  for (const run of state.passed) {
    const jobs=await api.jobs(run.id);
    executed.push({name:run.path,run_id:run.id,jobs:inspectJobs(jobs,run.path)});
  }
  const fresh=await api.pr(ctx.number);
  assertSame(fresh,ctx,requireCurrentBase);
  // Report non-gating runs for audit; never confuse them with validated CI.
  const advisory={
    nonApplicable:[...state.observedUnrelated.filter(item => !retired.has(workflowPath(item))),...fastDiagnostics],
    concurrencyOnly:[...concurrencyAdvisory].sort(),
  };
  return {risk,expected,delegated,executed,advisory,packageImpact,head:ctx.head,base:ctx.base};
}

// Normalize observable symptoms across PRs without claiming identical root causes.
// Actual code failures require comparison of the exact-HEAD job logs before repair.
export function diagnoseAggregateError(error) {
  const message = String(error?.message || error || 'unknown');
  const rules = [
    ['PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:PRODUCTION_BASE_CHANGED','BASE_ADVANCED','Rebase/update the sensitive PR against current production, then validate exact HEAD.'],
    ['PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:PR_HEAD_CHANGED','HEAD_ADVANCED','Discard stale results and run checks on the new PR HEAD.'],
    ['PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:MERGE_CONFLICT','MERGE_CONFLICT','Resolve the real merge conflict; do not bypass the gate.'],
    ['PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:PR_DRAFT','DRAFT_PR','Mark Ready only after the implementation is complete.'],
    ['PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED','PR_STATE_INVALID','Inspect the precise PR state/repository/target reason.'],
    ['SPECIALIST_MISSING_OR_PENDING:NOT_TRIGGERED','WORKFLOW_NOT_TRIGGERED','Fix scoped dispatch or use the guarded recovery path; never mark missing CI successful.'],
    ['SPECIALIST_MISSING_OR_PENDING:NOT_STARTED','RUNNER_QUEUE','Inspect GitHub runner capacity; rerun only after a confirmed transient interruption.'],
    ['SPECIALIST_MISSING_OR_PENDING:RUNNING_TIMEOUT','CHECK_TIMEOUT','Inspect the running job and optimize its actual bottleneck.'],
    ['SPECIALIST_FAILED:','SPECIALIST_FAILED','Compare exact-HEAD logs across affected PRs; fix confirmed common code roots once.'],
    ['ZERO_JOB_WORKFLOW:','WORKFLOW_JOBLESS','Check runner/workflow dispatch; safely rerun a confirmed interrupted run once.'],
    ['UNSUCCESSFUL_SPECIALIST_JOB:','SPECIALIST_JOB_FAILED','Inspect the named failing job; never treat a skipped or failed job as green.'],
    ['UNVERIFIED_MERGE_CHECKOUT','CHECKOUT_UNVERIFIED','Rebuild a verified exact-HEAD/exact-BASE merge checkout.'],
    ['GitHub read ','GITHUB_API_READ_FAILED','Check API availability and permissions, then retry only this transient read.'],
  ];
  const found = rules.find(([prefix]) => message.startsWith(prefix));
  const category = found?.[1] || 'CI_UNKNOWN_FAILURE';
  const action = found?.[2] || 'Inspect the exact failure; do not auto-waive a required check.';
  let payload = {};
  const jsonStart = message.indexOf('{');
  if (jsonStart >= 0) {
    try { payload = JSON.parse(message.slice(jsonStart)); } catch { /* preserve fail-closed status */ }
  }
  const symptoms = [];
  const add = (type, raw) => {
    const path = String(raw).split(':')[0];
    if (/^\.github\/workflows\/[a-z0-9._-]+\.ya?ml$/i.test(path)) {
      symptoms.push(type + '/' + path);
    }
  };
  if (category === 'SPECIALIST_FAILED') {
    for (const field of ['failed','retired','unregistered','push','orphan']) {
      for (const item of Array.isArray(payload[field]) ? payload[field] : []) add(field,item);
    }
  }
  if (category === 'WORKFLOW_NOT_TRIGGERED' || category === 'RUNNER_QUEUE' || category === 'CHECK_TIMEOUT') {
    for (const field of ['missing','pending','queued','running']) {
      for (const item of Array.isArray(payload[field]) ? payload[field] : []) add(field,item);
    }
  }
  if (category === 'WORKFLOW_JOBLESS' || category === 'SPECIALIST_JOB_FAILED') {
    add('job',message.split(':')[1] || '');
  }
  // Shared SYMPTOM keys are a triage aid, not proof that the code root is shared.
  return {category,action,symptomKeys:[...new Set(symptoms)].sort().slice(0,30)};
}

async function main() {
  const env=process.env;
  if (env.GITHUB_EVENT_NAME !== 'pull_request') throw Error('ONLY_PULL_REQUEST_EVENT');
  const ctx=validateParameters(env);
  const api=githubReader(ctx.repo,ctx.token);
  const verifiedBase = verifiedCheckoutBase(env, ctx);
  const testedBase = verifiedBase || ctx.base;
  const files=worktreeSources(testedBase);
  if (verifiedBase) files.changedRows=checkoutChangedRows(verifiedBase);
  // The verified merge parent is always the trusted tested BASE. Only
  // non-sensitive ordinary paths permit a newer live production BASE; security,
  // payment, privacy, auth, policy and unknown paths still require freshness.
  const result=await verify(api,{...ctx,base:testedBase},files);
  const report='Specialist CI aggregate for PR #' + ctx.number + ' head=' + ctx.head +
    ' event_base=' + ctx.base + ' tested_base=' + testedBase + '\nRisk: ' + result.risk + '\nVerified applicable workflows: ' + result.expected.length +
    '\n' + result.executed.map(x=>'- ' + x.name + ' (' + x.jobs + ' executed jobs; run ' + x.run_id + ')').join('\n') +
    '\nTrusted replacements: ' + result.delegated.map(x=>x.retired + ' => ' + x.replacement).join(', ') +
    '\nPackage impact: ' + result.packageImpact.mode + ' (' + result.packageImpact.reason + ')' +
    '\nNon-gating CI advisory: ' + JSON.stringify(result.advisory).slice(0,2000);
  console.log(report);
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY,report+'\n');
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href===import.meta.url) {
  main().catch(error=>{
    const diagnosis = diagnoseAggregateError(error);
    const detail = String(error?.message || error).slice(0,1200);
    const escaped = (diagnosis.category + ': ' + detail).replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A');
    console.error('::error title=HH CI ' + diagnosis.category + '::' + escaped);
    console.error('CI_SPECIALIST_FAIL_CLOSED: ' + detail);
    const report = ['## HH CI blocker diagnosis', '',
      '- Category: \`' + diagnosis.category + '\`',
      '- Next action: ' + diagnosis.action,
      '- Shared symptom keys (NOT verified common root causes): ' +
        (diagnosis.symptomKeys.length ? diagnosis.symptomKeys.map(x=>'\`'+x+'\`').join(', ') : 'none'),
      '- Check exact-head job logs before combining repairs.', ''].join('\n');
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,report);
    process.exitCode=1;
  });
}
