#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { appendFileSync, lstatSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const owner='gh-actions-eslint-repair';
const target='codex/public-book-library';
const lintStep='Lint changed JS/TS sources on PR; full lint for manual/merge queue';
const shaPattern=/^[0-9a-f]{40}$/;
const apiRoot='https://api.github.com';

export function isSafeEslintFixPath(file) {
  if(typeof file!=='string'||!file||/[\r\n\0]/.test(file)||file.startsWith('/')||
    file.split('/').some(part=>!part||part==='.'||part==='..')) return false;
  if(!/^(?:app|components|lib|scripts|tests)\/.+\.(?:cjs|mjs|js|jsx|ts|tsx)$/.test(file)) return false;
  if(file.startsWith('app/api/')||file.startsWith('components/app/')||file.startsWith('lib/practitioners/')) return false;
  return !/(^|[\/_.-])(?:auth|security|privacy|private|payment|billing|checkout|rls|secret|token|consent|crm|messenger|messages|client|contact|email|phone|order|booking|consultation|session|storage|health|admin|account|profile|wallet|migration)(?=$|[\/_.-])/i.test(file);
}
export function hasExactLintFailure(jobs) {
  return Array.isArray(jobs)&&jobs.some(j=>j?.name==='core-lint-types-build'&&
    Array.isArray(j.steps)&&j.steps.some(s=>s?.name===lintStep&&s.conclusion==='failure'));
}
export function isEligiblePullRequest(pr,e) {
  return Boolean(pr&&pr.number===e.number&&pr.state==='open'&&pr.draft===false&&
    pr.base?.ref===target&&pr.base?.sha===e.baseSha&&pr.head?.sha===e.headSha&&
    pr.head?.ref===e.headRef&&pr.head?.repo?.full_name===e.repository&&
    pr.base?.repo?.full_name===e.repository&&e.headRef!==target&&
    shaPattern.test(e.baseSha||'')&&shaPattern.test(e.headSha||''));
}
function run(bin,args,cwd,env={},timeout=600000){
  const r=spawnSync(bin,args,{cwd,encoding:'utf8',timeout,maxBuffer:20*1024*1024,
    env:{...process.env,...env},stdio:['ignore','pipe','pipe']});
  if(r.error)throw r.error;
  if(r.status!==0)throw new Error(bin+' failed ('+r.status+'): '+String(r.stderr||r.stdout||'').slice(-2000));
  return String(r.stdout||'');
}
function need(name){if(!process.env[name])throw new Error('MISSING_'+name);return process.env[name];}
function note(s){console.log(s);if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,s+'\n');}
async function gh(repo,token,path,method='GET',body=null){
  const r=await fetch(apiRoot+'/repos/'+repo+path,{method,headers:{
    authorization:'Bearer '+token,accept:'application/vnd.github+json',
    'x-github-api-version':'2022-11-28',...(body?{'content-type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw new Error('GITHUB_HTTP_'+r.status);
  return r.status===204?null:r.json();
}
async function markManual(repo,token,n,head,reason){
  const comments=await gh(repo,token,'/issues/'+n+'/comments?per_page=100');
  const marker='<!-- HH_DETERMINISTIC_ESLINT_REPAIR_V1 '+head+' -->';
  if(!comments.some(c=>String(c.body||'').includes(marker))){
    await gh(repo,token,'/issues/'+n+'/comments','POST',{body:marker+
      '\nNo complete safe deterministic ESLint autofix was available for this exact HEAD. No source commit was created and required checks remain mandatory.\nReason: '+reason.replace(/[<>\r\n]/g,' ').slice(0,220)});
  }
  await gh(repo,token,'/issues/'+n+'/labels','POST',['hh:repair-manual']);
}
async function main(){
  const repo=need('GITHUB_REPOSITORY'),token=process.env.GH_TOKEN||process.env.GITHUB_TOKEN;
  if(!token)throw new Error('MISSING_GITHUB_TOKEN');
  const n=Number(need('HH_PR_NUMBER')),base=need('HH_BASE_SHA'),head=need('HH_HEAD_SHA');
  const ref=need('HH_HEAD_REF'),headRepo=need('HH_HEAD_REPO'),cwd=need('GITHUB_WORKSPACE');
  if(!Number.isSafeInteger(n)||n<1||!shaPattern.test(base)||!shaPattern.test(head)||headRepo!==repo||
    !/^[A-Za-z0-9._/-]{1,240}$/.test(ref)||ref.includes('..')||ref.startsWith('/')||ref.endsWith('/')||ref===target)throw new Error('INVALID_REPAIR_CONTEXT');
  if(run('git',['rev-parse','HEAD'],cwd).trim()!==head)throw new Error('CHECKOUT_NOT_EXACT_HEAD');
  const jobs=await gh(repo,token,'/actions/runs/'+need('GITHUB_RUN_ID')+'/jobs?per_page=100');
  if(!hasExactLintFailure(jobs.jobs)){note('NO_REPAIR: failure was not the Core changed-file ESLint step.');return;}
  const expected={number:n,baseSha:base,headSha:head,headRef:ref,repository:repo};
  if(!isEligiblePullRequest(await gh(repo,token,'/pulls/'+n),expected)){note('NO_REPAIR: PR/base/HEAD moved or is not eligible.');return;}

  run('git',['fetch','--no-tags','--depth=1','origin',base],cwd);
  const trusted=join(need('RUNNER_TEMP'),'hh-trusted-eslint-base');
  run('git',['worktree','add','--detach',trusted,base],cwd);
  const leaseTool=join(trusted,'scripts','pr-sweep-guard.mjs');
  let leased=false;
  try{
    const claim=run('node',[leaseTool,'claim',repo,String(n),owner],trusted,{GH_TOKEN:token,GITHUB_TOKEN:token});
    const state=JSON.parse(claim.trim().split('\n').at(-1));
    if(!state.claimed){note('NO_REPAIR: another worker owns the exact PR lease.');return;}
    leased=true;
    const files=run('git',['diff','--name-only','-z',base,head],cwd).split('\0').filter(Boolean);
    const regularFiles = files.every(file => {
      try {
        let current = cwd;
        for (const part of file.split('/')) {
          current = join(current, part);
          const stat = lstatSync(current);
          if (stat.isSymbolicLink()) return false;
        }
        return lstatSync(current).isFile();
      } catch { return false; }
    });
    if(!files.length||files.length>20||files.some(f=>!isSafeEslintFixPath(f))||!regularFiles){
      await markManual(repo,token,n,head,'Changed paths are mixed, too large or outside the safe allowlist.');
      note('MANUAL_HANDOFF: source scope is not wholly eligible; no file was modified.');return;
    }
    note('REPAIR_STARTED: exact ESLint failure; install trusted BASE dependencies with lifecycle scripts disabled.');
    run('npm',['ci','--ignore-scripts','--no-audit','--no-fund'],trusted,{},600000);
    if(!isEligiblePullRequest(await gh(repo,token,'/pulls/'+n),expected)){note('NO_REPAIR: PR moved during setup.');return;}
    const eslint=join(trusted,'node_modules','.bin','eslint'),config=join(trusted,'eslint.config.mjs');
    run(eslint,['--no-config-lookup','--config',config,'--fix',...files],cwd,{},180000);
    const status=run('git',['status','--porcelain=v1','--untracked-files=all'],cwd).split('\n').filter(Boolean);
    if(status.some(line=>line.length<4||line.slice(0,2).includes('?')||!files.includes(line.slice(3)))){
      run('git',['restore','--worktree','--staged','.'],cwd);
      throw new Error('AUTOFIX_CREATED_UNTRACKED_OR_UNAPPROVED_PATH');
    }
    const diff=run('git',['diff','--name-only','-z','HEAD'],cwd).split('\0').filter(Boolean);
    if(!diff.length){await markManual(repo,token,n,head,'ESLint produced no automatic fix.');note('MANUAL_HANDOFF: no deterministic autofix.');return;}
    if(diff.some(f=>!files.includes(f))){run('git',['restore','--worktree','--staged','.'],cwd);throw new Error('AUTOFIX_CHANGED_UNAPPROVED_PATH');}
    run('git',['diff','--check'],cwd);
    try{run(eslint,['--no-config-lookup','--config',config,...diff],cwd,{},180000);}
    catch{
      run('git',['restore','--worktree','--staged','.'],cwd);
      await markManual(repo,token,n,head,'Autofix did not make every eligible file lint-clean.');
      note('MANUAL_HANDOFF: partial autofix discarded.');return;
    }
    if(!isEligiblePullRequest(await gh(repo,token,'/pulls/'+n),expected)){
      run('git',['restore','--worktree','--staged','.'],cwd);note('NO_REPAIR: PR moved before commit; diff discarded.');return;
    }
    run('node',[leaseTool,'heartbeat',repo,String(n),owner],trusted,{GH_TOKEN:token,GITHUB_TOKEN:token});
    run('git',['config','user.name','github-actions[bot]'],cwd);
    run('git',['config','user.email','41898282+github-actions[bot]@users.noreply.github.com'],cwd);
    run('git',['add','--',...diff],cwd);
    run('git',['commit','-m','fix(ci): apply verified deterministic ESLint autofixes'],cwd);
    const commit=run('git',['rev-parse','HEAD'],cwd).trim();
    run('git',['push','origin','HEAD:refs/heads/'+ref],cwd,{},120000);
    const after=await gh(repo,token,'/pulls/'+n);
    if(after.head?.sha!==commit)throw new Error('PUSH_SHA_READBACK_MISMATCH');
    note('FIX_PUSHED_WAIT_CI: '+commit+' pushed non-force. New exact-HEAD checks remain mandatory; no merge/LIVE claim.');
  }finally{
    if(leased)try{run('node',[leaseTool,'release',repo,String(n),owner],trusted,{GH_TOKEN:token,GITHUB_TOKEN:token},30000);}
      catch(e){note('LEASE_RELEASE_WARNING: '+String(e.message||e).slice(0,180));}
    try{run('git',['worktree','remove','--force',trusted],cwd);}catch{}
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  main().catch(e=>{console.error('DETERMINISTIC_REPAIR_BLOCKED: '+String(e.message||e));
    if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      'DETERMINISTIC_REPAIR_BLOCKED: '+String(e.message||e).replace(/[\r\n]/g,' ').slice(0,450)+'\n');
    process.exitCode=1;});
}
