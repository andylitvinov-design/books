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
  inspectWorkflowRuns, inspectJobs, validateParameters, classifyReleaseRisk,
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

function assertSame(pr, ctx) {
  if (pr.number !== ctx.number || pr.state !== 'open' || pr.draft ||
      pr.head?.sha !== ctx.head || pr.base?.sha !== ctx.base || pr.base?.ref !== TARGET ||
      pr.base?.repo?.full_name !== ctx.repo || pr.head?.repo?.full_name !== ctx.repo) {
    throw Error('PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED');
  }
}

// Load only the BASE-pinned parser, without PR dependencies or npm scripts.
// A failed install never waives checks: callers fall back to STRICT.
export function loadTrustedTypescript(base) {
  if (!/^[0-9a-f]{40}$/.test(base || '')) return null;
  let dir;
  try {
    const read=path=>execFileSync('git',['show',base+':'+path],{encoding:'utf8',maxBuffer:100_000,stdio:['ignore','pipe','pipe']});
    const manifest=read('lib/ci/fast-ui-parser/package.json');
    const lock=read('lib/ci/fast-ui-parser/package-lock.json');
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
  // Specialist workflows may run for up to 40 minutes; keep waiting fail-closed
  // long enough for their results instead of rejecting a still-running check.
  const maxWait = Math.max(0,Math.min(40*60_000,Number(options.maxWaitMs ?? 35*60_000)));
  const pollMs = Math.max(100,Math.min(30_000,Number(options.pollMs ?? 20_000)));
  const pr = await api.pr(ctx.number);
  assertSame(pr,ctx);
  const changedRows=await api.changed(ctx.number);
  if (changedRows.some(row => row.status === 'renamed' && typeof row.previous_filename !== 'string')) {
    throw Error('PR_CHANGED_FILES_RENAME_SOURCE_MISSING');
  }
  const changed=changedRows.flatMap(row => row.previous_filename ? [row.filename, row.previous_filename] : [row.filename]);
  if (!changed.length || changedRows.length >= 3000 || changed.some(x=>typeof x!=='string')) throw Error('PR_CHANGED_FILES_MISSING_OR_TRUNCATED');
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
  if (risk === 'FAST') {
    assertSame(await api.pr(ctx.number),ctx);
    return {risk,expected:[],delegated:[],executed:[],advisory:{nonApplicable:[]},packageImpact:{mode:'none',reason:'presentation-only'},head:ctx.head,base:ctx.base};
  }
  const packageImpact=classifyPackageImpact({changed,basePackage:files.basePackage,currentPackage:files.currentPackage});
  const baselineExpected=expectedWorkflows({ ...files,changed,packageImpact });
  const {expected, delegated}=resolveExpectedSpecialists({ ...files,changed,expected:baselineExpected });
  // BASE/HEAD rules enumerate applicable PR specialists. Only completed/pending
  // PR workflow runs proven non-applicable may be advisory. Same-HEAD push
  // failures and orphan/unassociated runs remain fail-closed: there is no
  // trustworthy PR scope evidence to waive them.
  // Keep unknown workflows and failed retired migration workflows fail-closed.
  const catalog = new Set([...files.base.keys(), ...files.current.keys()]);
  const retired = new Set(delegated.map(item => item.retired));
  const workflowPath = item => item.slice(0, item.lastIndexOf(':'));
  const deadline=Date.now()+maxWait;
  let state;
  for (;;) {
    const allRuns=await api.runs(ctx.head);
    state=inspectWorkflowRuns({expected,runs:allRuns,pr});
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
    if (Date.now() >= deadline) {
      throw Error('SPECIALIST_MISSING_OR_PENDING:' + JSON.stringify({missing:state.missing,pending:state.pending}));
    }
    await delay(pollMs);
  }
  const executed=[];
  for (const run of state.passed) {
    const jobs=await api.jobs(run.id);
    executed.push({name:run.path,run_id:run.id,jobs:inspectJobs(jobs,run.path)});
  }
  const fresh=await api.pr(ctx.number);
  assertSame(fresh,ctx);
  // Report non-gating runs for audit; never confuse them with validated CI.
  const advisory={
    nonApplicable:state.observedUnrelated.filter(item => !retired.has(workflowPath(item))),
  };
  return {risk,expected,delegated,executed,advisory,packageImpact,head:ctx.head,base:ctx.base};
}

async function main() {
  const env=process.env;
  if (env.GITHUB_EVENT_NAME !== 'pull_request') throw Error('ONLY_PULL_REQUEST_EVENT');
  const ctx=validateParameters(env);
  const api=githubReader(ctx.repo,ctx.token);
  const files=worktreeSources(ctx.base);
  const result=await verify(api,ctx,files);
  const report='Specialist CI aggregate for PR #' + ctx.number + ' head=' + ctx.head +
    ' base=' + ctx.base + '\nRisk: ' + result.risk + '\nVerified applicable workflows: ' + result.expected.length +
    '\n' + result.executed.map(x=>'- ' + x.name + ' (' + x.jobs + ' executed jobs; run ' + x.run_id + ')').join('\n') +
    '\nTrusted replacements: ' + result.delegated.map(x=>x.retired + ' => ' + x.replacement).join(', ') +
    '\nPackage impact: ' + result.packageImpact.mode + ' (' + result.packageImpact.reason + ')' +
    '\nNon-gating CI advisory: ' + JSON.stringify(result.advisory).slice(0,2000);
  console.log(report);
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY,report+'\n');
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href===import.meta.url) {
  main().catch(error=>{ console.error('CI_SPECIALIST_FAIL_CLOSED: ' + String(error?.message || error));process.exitCode=1; });
}
