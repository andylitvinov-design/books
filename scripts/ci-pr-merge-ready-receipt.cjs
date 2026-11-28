'use strict';
// Trusted default-branch consumer. A receipt is only a shortcut to the
// existing read-only base freshness proof. No status writes or merge bypass.
const SHA=/^[a-f0-9]{40}$/;
const PROD='codex/public-book-library';
const WORKFLOW='.github/workflows/hh-pr-core-release.yml';
const PRODUCER='scripts/ci-specialist-aggregate.mjs';
const CORE='HH PR core release gate';
const MARK='CI_MERGE_READY_V1:';
const MAX_LOG=24*1024*1024;
const REQUIRED_STEPS=['Validate exact-head risk and required specialist workflows',
  'Confirm one-runner Core and independent specialist release evidence'];
const positive=n=>Number.isSafeInteger(n)&&n>0;
const sha=x=>typeof x==='string'&&SHA.test(x);
function parseReceipt(log){
  if(typeof log!=='string'||!log.length||log.length>MAX_LOG)return null;
  const lines=log.split(/\r?\n/).map(line=>line.replace(/^\d{4}-\d\d-\d\dT[\d:.]+Z[ \t]+/,''));
  const markers=lines.filter(line=>line.startsWith(MARK));
  if(markers.length!==1||markers[0].length>1024)return null;
  try{
    const r=JSON.parse(markers[0].slice(MARK.length));
    if(!r||Object.keys(r).sort().join(',')!=='head,pr,repository,run_attempt,run_id,tested_base,tested_merge,verified_base,version'||
       r.version!==1||typeof r.repository!=='string'||!positive(r.pr)||!positive(r.run_id)||
       !positive(r.run_attempt)||![r.head,r.tested_base,r.tested_merge,r.verified_base].every(sha))return null;
    return r;
  }catch{return null;}
}
function passedJob(jobs,name,runId){
  const rows=Array.isArray(jobs)?jobs.filter(j=>j?.name===name):[];
  const j=rows[0];
  return rows.length===1&&positive(j.id)&&j.run_id===runId&&
    j.status==='completed'&&j.conclusion==='success'?j:null;
}
function passedSteps(job){
  return REQUIRED_STEPS.every(name=>{
    const steps=Array.isArray(job?.steps)?job.steps.filter(s=>s?.name===name):[];
    return steps.length===1&&steps[0].status==='completed'&&steps[0].conclusion==='success';
  });
}
function boundRun(run,pr,full){
  return full==='andylitvinov-design/books'&&positive(pr?.number)&&
    pr.state==='open'&&pr.draft===false&&pr.base?.ref===PROD&&
    pr.head?.repo?.full_name===full&&sha(pr.head.sha)&&pr.mergeable===true&&
    pr.mergeable_state!=='dirty'&&positive(run?.id)&&positive(run.run_attempt)&&
    run.status==='completed'&&run.conclusion==='success'&&run.event==='pull_request'&&
    run.name===CORE&&String(run.path||'').split('@')[0]===WORKFLOW&&
    run.repository?.full_name===full&&run.head_repository?.full_name===full&&
    run.head_branch===pr.head.ref&&sha(run.head_sha);
}
async function readMergeReadyReceipt({github,owner,repo,pr,run,jobs}){
  const full=owner+'/'+repo;
  if(!boundRun(run,pr,full)||!passedJob(jobs,'core-lint-types-build',run.id))return null;
  const gate=passedJob(jobs,'hh-merge-check',run.id);
  if(!gate||!passedSteps(gate))return null;
  try{
    const raw=(await github.request('GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs',
      {owner,repo,job_id:gate.id})).data;
    const log=typeof raw==='string'?raw:Buffer.isBuffer(raw)||raw instanceof ArrayBuffer?Buffer.from(raw).toString('utf8'):'';
    const r=parseReceipt(log);
    if(!r||r.repository!==full||r.pr!==pr.number||r.head!==pr.head.sha||
       r.run_id!==run.id||r.run_attempt!==run.run_attempt||
       ![r.head,r.tested_merge].includes(run.head_sha))return null;
    // An associated event must identify this PR/source; unassociated runs
    // may use the exact immutable run source, never a mutable branch guess.
    if(!Array.isArray(run.pull_requests))return null;
    if(run.pull_requests.length){
      const refs=run.pull_requests.filter(p=>p.number===pr.number&&
        p.head?.sha===r.head&&p.head?.ref===pr.head.ref&&p.base?.ref===PROD);
      if(refs.length!==1)return null;
    }else if(run.head_sha!==r.head)return null;
    const branch=async()=>(await github.rest.repos.getBranch({owner,repo,branch:PROD})).data;
    const current=await branch();
    if(current?.protected!==true||current.commit?.sha!==r.verified_base)return null;
    const merge=(await github.rest.repos.getCommit({owner,repo,ref:r.tested_merge})).data;
    if(merge?.sha!==r.tested_merge||merge.parents?.length!==2||
       merge.parents[0]?.sha!==r.tested_base||merge.parents[1]?.sha!==r.head)return null;
    // Never trust a receipt's self-claimed base. Establish protected ancestry.
    if(r.tested_base!==r.verified_base){
      const rel=(await github.rest.repos.compareCommits({owner,repo,
        base:r.tested_base,head:r.verified_base,per_page:1})).data;
      if(rel?.status!=='ahead'||rel.behind_by!==0||
         rel.base_commit?.sha!==r.tested_base||rel.merge_base_commit?.sha!==r.tested_base)return null;
    }
    const file=async(path,ref)=>(await github.rest.repos.getContent({owner,repo,path,ref})).data;
    // The workflow that emitted the receipt must be the immutable protected
    // workflow, not a PR-controlled variant. Pin both source and merge bytes.
    const refs=[...new Set([r.tested_base,r.tested_merge,run.head_sha])];
    const files=await Promise.all(refs.map(ref=>file(WORKFLOW,ref)));
    if(files.some(f=>f?.type!=='file'||f.path!==WORKFLOW||!sha(f.sha)||f.sha!==files[0].sha))return null;
    // Old protected validators cannot have emitted V1. Never authorize
    // the bootstrap workflow's candidate-script fallback.
    const producer=await file(PRODUCER,r.tested_base);
    if(producer?.type!=='file'||producer.path!==PRODUCER||!sha(producer.sha)||
       producer.encoding!=='base64'||typeof producer.content!=='string'||
       producer.content.length>2_000_000||
       !Buffer.from(producer.content,'base64').toString('utf8').includes(MARK))return null;
    const last=await branch();
    if(last?.protected!==true||last.commit?.sha!==r.verified_base)return null;
    // Recheck run attempt after log/ancestry reads; reruns cannot inherit the
    // older attempt's success. Later review/lease/conflict/native rules remain.
    const latest=(await github.rest.actions.getWorkflowRun({owner,repo,run_id:run.id})).data;
    if(!boundRun(latest,pr,full)||latest.id!==run.id||latest.run_attempt!==run.run_attempt||
       latest.head_sha!==run.head_sha)return null;
    return {ok:true,reason:'UNIFIED_GATE_RECEIPT_REUSED',base:r.verified_base};
  }catch{return null;}
}
module.exports={parseReceipt,passedJob,passedSteps,boundRun,readMergeReadyReceipt};
