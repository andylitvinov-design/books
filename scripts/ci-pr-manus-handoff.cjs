'use strict';

// Optional, single-use Manus webhook escalation from an already-running trusted
// Repair Worker publisher. Never called in a checkout of untrusted PR source.
const {readCompleteIssueComments,parseRecords,trustedControlComment,
  externalOwnerLeaseStatus}=require('./ci-pr-task-state.cjs');
const {safeSourcePath}=require('./ci-pr-repair-free-agent.cjs');
const REPO='andylitvinov-design/books';
const PROD='codex/public-book-library';
const MARKER='HH_MANUS_HANDOFF_V1';
const SHA=/^[a-f0-9]{40}$/i;
const KEY=/^[a-f0-9]{32}$/i;
const INHIBIT=new Set(['hh:hold','hh:blocked','hh:worker-claimed',
  'hh:conflict-repair-needed','hh:release-gate-review',
  'hh:specialist-repair-needed','hh:direction-override:invalid']);

function parseWebhookConfig({enabled,creditsApproved,url,authHeader}) {
  if(enabled!=='true'||creditsApproved!=='true')return null;
  if(!url||!authHeader)return null;
  try {
    const u=new URL(url);
    if(u.protocol!=='https:'||u.username||u.password||
       !/(^|\.)manus\.(?:im|ai)$/i.test(u.hostname))return null;
    const m=/^([A-Za-z][A-Za-z0-9-]{0,63}):\s*(\S[^\r\n]*)$/.exec(authHeader);
    if(!m||!(/^(?:authorization|x-[a-z0-9-]+)$/i.test(m[1])))return null;
    return {url:u.toString(),headerName:m[1],headerValue:m[2]};
  }catch{return null;}
}

function handoffPrompt(data) {
  return [
    'HOLISTIC HOUSE SECONDARY SOURCE REPAIR — ONE EXACT PR HEAD ONLY',
    'Read first: https://github.com/andylitvinov-design/ai-projects-brain/blob/main/systems/pr-one-publish-standard.md',
    'Then read: https://github.com/andylitvinov-design/books/blob/codex/bootstrap-books/docs/operations/PR_AUTOMATION_CANONICAL_V1.md',
    'Repository: '+REPO,
    'Existing PR: '+data.url,
    'Expected immutable HEAD: '+data.sha,
    'Trusted Repair Worker run: '+data.runUrl,
    'Verified terminal reason: '+data.reason,
    'Changed safe source files: '+data.files.join(', '),
    'Owner-authorized escalation marker: '+MARKER+' '+data.sha,
    'Task: diagnose the exact-head failed Core source check; create ONE coherent, locally verified minimal patch only for the existing root. Never create a duplicate PR.',
    'Before any source write: verify current HEAD, failure logs, allowed owner lease, no hh:hold, consent/security/payment risks, and current CI status. If any condition fails, leave the code untouched and comment with a precise HOLD.',
    'The hh:repair-manual label identifies the worker escalation; it is not permission to bypass checks. Do not remove holds or manual labels yourself.',
    'Prepare all changes and focused tests before one allowed remote publication. No incremental pushes, empty commits, CI retries, force push, expensive build, external service purchase or paid upsell.',
    'Use only already-connected GitHub, existing resources and included Manus credits. Stop on uncertain additional cost.',
    'Do not auto-merge. Normal Core/Specialist/Guard/lease/branch-protection and independently checked production LIVE are mandatory. Report patch SHA, tests, blocker/receipt to the existing PR.'
  ].join('\n');
}

async function handoff({github,core,context,number,sha,taskKey,terminalState,
  terminalReason,claimStatus,enabled,creditsApproved,url,authHeader,
  fetchImpl=fetch,now=Date.now()}) {
  const log=(status,reason)=>{core.info('HH_MANUS_HANDOFF '+status+' '+reason);return {status,reason};};
  const cfg=parseWebhookConfig({enabled,creditsApproved,url,authHeader});
  if(!cfg)return log('DISABLED','CONFIG_OR_CREDIT_CONSENT_MISSING');
  const {owner,repo}=context.repo||{};
  if(owner+'/'+repo!==REPO||terminalState!=='MANUAL'||
      claimStatus!=='claimed'||!Number.isSafeInteger(number)||number<1||
      !SHA.test(sha||'')||!KEY.test(taskKey||''))
    return log('SKIPPED','NOT_VERIFIED_TERMINAL_SOURCE_REPAIR');
  const pr=(await github.rest.pulls.get({owner,repo,pull_number:number})).data;
  const labels=new Set((pr?.labels||[]).map(l=>l.name));
  if(pr?.state!=='open'||pr?.draft||pr?.user?.login!==owner||
      pr?.head?.repo?.full_name!==REPO||pr?.head?.sha!==sha||
      pr?.base?.ref!==PROD||pr?.mergeable_state==='dirty'||
      !labels.has('hh:repair-manual')||[...INHIBIT].some(x=>labels.has(x)))
    return log('HOLD','STALE_HEAD_OR_SAFETY_GATE');
  const files=(await github.rest.pulls.listFiles({owner,repo,pull_number:number,
    per_page:30,page:1})).data;
  if(!Array.isArray(files)||files.length===0||files.length>=30||files.length>8||
      !files.every(f=>f?.status==='modified'&&safeSourcePath(f.filename)))
    return log('HOLD','SOURCE_PATH_OR_FILE_COUNT_UNVERIFIED');
  let reads=0;
  const comments=await readCompleteIssueComments(github,owner,repo,number,async(_label,fn)=>{
    if(++reads>12)throw Error('HH_MANUS_HISTORY_BUDGET');
    return fn();
  });
  if(!comments)return log('HOLD','COMMENT_HISTORY_UNAVAILABLE');
  if(comments.some(c=>trustedControlComment(c)&&
       String(c.body||'').includes('<!-- '+MARKER+' '+sha+' -->')))
    return log('SKIPPED','ALREADY_HANDOFF_FOR_THIS_HEAD');
  if(externalOwnerLeaseStatus(comments,sha,now)!=='FREE')
    return log('HOLD','EXTERNAL_SOURCE_OWNER_LEASE');
  const signed=comments.filter(trustedControlComment);
  const records=signed.flatMap(c=>parseRecords([c])||[]);
  const run=String(context.runId||'');
  const confirmed=records.some(r=>r.schema==='HH_PR_TASK_V1'&&
    r.state==='MANUAL'&&r.claim_status==='claimed'&&
    r.pr_number===number&&r.head_sha===sha&&r.task_key===taskKey&&
    r.owner_run_id===run&&r.source_published===false);
  if(!confirmed)return log('HOLD','SIGNED_MANUAL_OUTCOME_NOT_FOUND');
  const changed=files.map(f=>f.filename);
  const runUrl='https://github.com/'+REPO+'/actions/runs/'+run;
  const payload={schema:MARKER,repo:REPO,pr_number:number,
    pr_url:'https://github.com/'+REPO+'/pull/'+number,expected_sha:sha,
    task_key:taskKey,reason:String(terminalReason||'MANUAL').slice(0,100),
    worker_run_url:runUrl,source_files:changed,
    instruction:handoffPrompt({url:'https://github.com/'+REPO+'/pull/'+number,
      sha,runUrl,reason:terminalReason||'MANUAL',files:changed})};
  // Exactly-once claim before any potentially credit-consuming external POST.
  // If the HTTP response is lost, do NOT retry: the remote task may be running.
  await github.rest.issues.createComment({owner,repo,issue_number:number,body:
    '<!-- '+MARKER+' '+sha+' -->\n'+
    'Manus handoff REQUESTED for verified Repair Worker MANUAL outcome; '+
    'one request per exact HEAD. Run: '+runUrl+
    '\nNo CI, merge, source commit or LIVE proof is implied.'});
  try {
    const response=await fetchImpl(cfg.url,{method:'POST',
      signal:AbortSignal.timeout(12000),
      headers:{'Content-Type':'application/json',[cfg.headerName]:cfg.headerValue},
      body:JSON.stringify(payload)});
    if(!response.ok) {
      core.warning('HH_MANUS_HANDOFF_HTTP_'+response.status+
        ' — no automatic retry; exact-head handoff marker retained');
      return {status:'HOLD',reason:'WEBHOOK_HTTP_'+response.status};
    }
    await github.rest.issues.createComment({owner,repo,issue_number:number,body:
      'HH_MANUS_DISPATCHED_V1: Manus webhook accepted task for HEAD '+sha+
      '; actual code change/CI/MERGED/LIVE remain unverified. '+
      'Worker run: '+runUrl});
    return log('DISPATCHED','ACCEPTED_NOT_REPAIRED');
  }catch(error){
    core.warning('HH_MANUS_HANDOFF_SEND_UNCERTAIN — no retry: '+
      String(error?.name||'NETWORK_ERROR').slice(0,40));
    return {status:'HOLD',reason:'DELIVERY_UNCERTAIN_NO_RETRY'};
  }
}
module.exports={handoff,parseWebhookConfig,handoffPrompt,MARKER};
