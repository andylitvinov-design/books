#!/usr/bin/env node
// Read-only exact-HEAD and exact-BASE coverage of applicable specialist workflows.
// Runs from the PR merge checkout; no third-party API and no write permissions.
import { readFileSync, readdirSync, appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import {
  TARGET, WORKFLOW_PREFIX, expectedWorkflows, resolveExpectedSpecialists,
  inspectWorkflowRuns, inspectJobs, validateParameters,
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
  return {base,current};
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

export async function verify(api,ctx,files,options={}) {
  const maxWait = Math.max(0,Math.min(15*60_000,Number(options.maxWaitMs ?? 12*60_000)));
  const pollMs = Math.max(100,Math.min(30_000,Number(options.pollMs ?? 20_000)));
  const pr = await api.pr(ctx.number);
  assertSame(pr,ctx);
  const changedRows=await api.changed(ctx.number);
  const changed=changedRows.map(row => row.filename);
  if (!changed.length || changedRows.length >= 3000 || changed.some(x=>typeof x!=='string')) throw Error('PR_CHANGED_FILES_MISSING_OR_TRUNCATED');
  const baselineExpected=expectedWorkflows({ ...files,changed });
  const {expected, delegated}=resolveExpectedSpecialists({ ...files,changed,expected:baselineExpected });
  const deadline=Date.now()+maxWait;
  let state;
  for (;;) {
    const allRuns=await api.runs(ctx.head);
    state=inspectWorkflowRuns({expected,runs:allRuns,pr});
    if (state.pushFailures.length || state.orphanFailures.length || state.failed.length ||
        state.observedUnrelated.some(x => x.includes(':failure') || x.includes(':cancelled') || x.includes(':timed_out'))) {
      throw Error('SPECIALIST_FAILED:' + JSON.stringify({failed:state.failed,push:state.pushFailures,
        orphan:state.orphanFailures,other:state.observedUnrelated}));
    }
    if (!state.missing.length && !state.pending.length && !state.observedUnrelated.length) break;
    if (Date.now() >= deadline) {
      throw Error('SPECIALIST_MISSING_OR_PENDING:' + JSON.stringify({missing:state.missing,pending:state.pending,other:state.observedUnrelated}));
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
  return {expected,delegated,executed,pushFailures:state.pushFailures,head:ctx.head,base:ctx.base};
}

async function main() {
  const env=process.env;
  if (env.GITHUB_EVENT_NAME !== 'pull_request') throw Error('ONLY_PULL_REQUEST_EVENT');
  const ctx=validateParameters(env);
  const api=githubReader(ctx.repo,ctx.token);
  const files=worktreeSources(ctx.base);
  const result=await verify(api,ctx,files);
  const report='Specialist CI aggregate for PR #' + ctx.number + ' head=' + ctx.head +
    ' base=' + ctx.base + '\nVerified applicable workflows: ' + result.expected.length +
    '\n' + result.executed.map(x=>'- ' + x.name + ' (' + x.jobs + ' executed jobs; run ' + x.run_id + ')').join('\n') +
    '\nTrusted replacements: ' + result.delegated.map(x=>x.retired + ' => ' + x.replacement).join(', ');
  console.log(report);
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY,report+'\n');
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href===import.meta.url) {
  main().catch(error=>{ console.error('CI_SPECIALIST_FAIL_CLOSED: ' + String(error?.message || error));process.exitCode=1; });
}