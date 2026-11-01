'use strict';

/* Trusted default-branch PR Repair Worker. Never execute PR code with a write token. */
const PROD = 'codex/public-book-library';
const DEFAULT = 'codex/bootstrap-books';
const SOURCE = 'hh:repair-needed';
const CONFLICT = 'hh:conflict-repair-needed';
const MANUAL = 'hh:repair-manual';
const MARKER = 'HH_PR_REPAIR_WORKER_V1';
const SHA = /^[0-9a-f]{40}$/i;
const PATH = /^(?!\/)(?!.*(?:^|\/)\.)(?!.*\.\.)(?:[\w.-]+\/)*[\w.-]+\.(?:js|jsx|ts|tsx|mjs|cjs)$/;
const MAX_FILES = 8;
const MAX_CANDIDATES = 4;
const MAX_READS = 24;
const RATE_RESERVE = 100;

function validBranch(ref) {
  return typeof ref === 'string' && ref.length <= 160 &&
    /^[A-Za-z0-9][\w./-]*$/.test(ref) && !ref.includes('..') &&
    !ref.includes('//') && !ref.includes('@{') && !ref.endsWith('/') &&
    ref !== PROD && ref !== DEFAULT;
}
function eligible(pr, fullRepo) {
  const owner = fullRepo.split('/')[0];
  return !!(pr && pr.state === 'open' && !pr.draft &&
    pr.user?.login === owner && pr.base?.ref === PROD &&
    pr.head?.repo?.full_name === fullRepo &&
    SHA.test(pr.head?.sha || '') && validBranch(pr.head?.ref) &&
    pr.labels?.some(l => [SOURCE, CONFLICT].includes(l.name)));
}
function activeSweepLease(comments, sha, now) {
  for (const c of comments) {
    if (!(c.body || '').includes('HH_PR_SWEEP_LEASE_V1')) continue;
    const start=(c.body || '').indexOf('{');
    const end=(c.body || '').indexOf('}',start);
    if (start<0 || end<0) return true;
    try {
      const lease = JSON.parse(c.body.slice(start,end+1));
      if (lease.schema !== 'HH_PR_SWEEP_LEASE_V1') return true;
      if (lease.head_sha === sha && ['active','claim','heartbeat'].includes(lease.state || lease.last_action) &&
        Date.parse(lease.expires_at) > now) return true;
    } catch { return true; }
  }
  return false;
}
function safeFiles(items) {
  return Array.isArray(items) && items.length < 100 &&
    items.filter(f => ['added','modified'].includes(f.status) &&
      PATH.test(f.filename) && !f.filename.startsWith('tests/') &&
      !f.filename.startsWith('.github/') &&
      !f.filename.includes('/__tests__/')).slice(0, MAX_FILES).map(f => f.filename);
}
function writeOutputs(core, values) {
  for (const [k, v] of Object.entries(values)) core.setOutput(k, String(v));
}
function prioritizedRepairCandidates(source,conflicts,now,max=MAX_CANDIDATES) {
  const eligible=items=>[...new Map((items || []).filter(i=>
    i && i.pull_request && Number.isSafeInteger(i.number) && i.number>0)
    .map(i=>[i.number,i])).values()];
  const sourceItems=eligible(source), sourceIDs=new Set(sourceItems.map(i=>i.number));
  const conflictItems=eligible(conflicts).filter(i=>!sourceIDs.has(i.number));
  const rotate=(items,count)=>{
    if(!items.length || count<=0)return [];
    const offset=(Math.floor(now/600000)*MAX_CANDIDATES)%items.length;
    return [...items.slice(offset),...items.slice(0,offset)].slice(0,count);
  };
  const sourceSlots=conflictItems.length?Math.max(1,max-1):max;
  const first=rotate(sourceItems,sourceSlots);
  return [...first,...rotate(conflictItems,max-first.length)];
}
async function claim({github,core,context,number=0,expectedSha='',dryRun=false,hasToken=false,now=Date.now()}) {
  const {owner,repo} = context.repo, fullRepo = owner + '/' + repo;
  const log = message => core.info('HH_REPAIR: ' + message);
  const skip = reason => { log('SKIP ' + reason); return {status:'skipped',reason}; };
  let reads=0, remaining=null;
  const limited=async(label,fn)=>{
    if(reads>=MAX_READS || (remaining !== null && remaining < RATE_RESERVE))
      throw Error('HH_REPAIR_API_BUDGET_PAUSE:'+label);
    reads++;
    const response=await fn();
    const rate=response?.headers?.['x-ratelimit-remaining'];
    if(rate!==undefined && Number.isFinite(Number(rate)))remaining=Number(rate);
    return response;
  };
  if (fullRepo !== 'andylitvinov-design/books') return skip('WRONG_REPOSITORY');
  if (!dryRun && !hasToken) return skip('HH_AUTOMERGE_TOKEN_MISSING');
  try {
  let candidates = [];
  if (Number.isSafeInteger(number) && number > 0) candidates = [{number}];
  else {
    const found = await Promise.all([SOURCE,CONFLICT].map(labels =>
      limited('repair-queue',()=>github.rest.issues.listForRepo({owner,repo,state:'open',labels,
        sort:'updated',direction:'asc',per_page:40}))));
    if (found.some(r => !Array.isArray(r.data))) return skip('INCOMPLETE_QUEUE');
    // Recover real source fixes before cycling through manual-only conflicts.
    // Reserve one conflict slot so the owner handoff queue also progresses.
    candidates=prioritizedRepairCandidates(found[0].data,found[1].data,now);
  }
  for (const item of candidates) {
    const pr = (await limited('live-pr',()=>github.rest.pulls.get({owner,repo,pull_number:item.number}))).data;
    if (!eligible(pr,fullRepo) ||
        (expectedSha && pr.head.sha !== expectedSha)) continue;
    // If the branch is a parent of another open PR, never modify its history.
    const children = (await limited('stacked-children',()=>github.rest.pulls.list({owner,repo,state:'open',base:pr.head.ref,per_page:1}))).data;
    if (!Array.isArray(children) || children.length) continue;
    // An incomplete comment history cannot prove the absence of a repair lease.
    const comments = (await limited('repair-lease',()=>github.rest.issues.listComments({owner,repo,issue_number:pr.number,per_page:100,page:1}))).data;
    if (!Array.isArray(comments) || comments.length >= 100) continue;
    const marker = '<!-- ' + MARKER + ' ' + pr.head.sha + ' -->';
    if (comments.some(c => (c.body || '').includes(marker)) ||
        activeSweepLease(comments,pr.head.sha,now)) continue;
    const conflict = pr.labels.some(l=>l.name===CONFLICT);
    let files = [];
    if (!conflict) {
      const response = (await limited('changed-files',()=>github.rest.pulls.listFiles({owner,repo,pull_number:pr.number,per_page:100,page:1}))).data;
      files = safeFiles(response);
      if (!files || files.length === 0) continue;
    }
    if (remaining !== null && remaining < RATE_RESERVE) return skip('GITHUB_API_RESERVE');
    if (dryRun) {
      log('WOULD_CLAIM #' + pr.number + ' owner=' + pr.user.login + ' SHA=' + pr.head.sha);
      return {status:'dry_run',number:pr.number,sha:pr.head.sha,files};
    }
    // A persistent exact-HEAD claim is written before expensive untrusted checkout.
    await github.rest.issues.createComment({owner,repo,issue_number:pr.number,body:
      marker + '\n**HH Repair Worker claimed this HEAD.**\n' +
      'Owner: @' + pr.user.login + '; strategy: ' + (conflict?'conflict/manual':'targeted ESLint autofix') +
      '. The worker does not bypass checks or overwrite another source branch.'});
    try { await github.rest.issues.addAssignees({owner,repo,issue_number:pr.number,assignees:[pr.user.login]}); }
    catch (error) { log('Could not assign owner to #' + pr.number + ': ' + error.message); }
    if (conflict) {
      await github.rest.issues.createComment({owner,repo,issue_number:pr.number,body:
        'HH Repair Worker: true merge conflict detected. No safe deterministic resolution; '+
        '@' + pr.user.login + ' must resolve the conflicting source semantics or use an approved coding agent. '+
        'No force-push or automatic ours/theirs resolution performed.'});
      log('MANUAL_CONFLICT #' + pr.number);
      return {status:'manual_conflict',number:pr.number,sha:pr.head.sha};
    }
    writeOutputs(core,{strategy:'lint',pr_number:pr.number,sha:pr.head.sha,branch:pr.head.ref,
      files_json:JSON.stringify(files)});
    log('CLAIMED #' + pr.number + ' owner=' + pr.user.login + ' SHA=' + pr.head.sha);
    return {status:'claimed',number:pr.number,sha:pr.head.sha,files};
  }
  return skip('NO_UNCLAIMED_OWNER_PR');
  } catch(error) {
    if (String(error.message).startsWith('HH_REPAIR_API_BUDGET_PAUSE:'))
      return skip('GITHUB_API_BUDGET_PAUSE');
    throw error;
  }
}
function validCandidate(candidate, sha) {
  return !!(candidate && candidate.head_sha === sha && Array.isArray(candidate.files) &&
    candidate.files.length <= MAX_FILES && candidate.files.every(f=>
      f && typeof f.path === 'string' && PATH.test(f.path) &&
      SHA.test(f.original_sha || '') &&
      typeof f.base64 === 'string' && f.base64.length <= 200_000 &&
      /^[A-Za-z0-9+/]*={0,2}$/.test(f.base64)));
}
async function publish({github,core,context,prNumber,expectedSha,candidate,writer=null}) {
  const {owner,repo} = context.repo, fullRepo=owner+'/'+repo;
  if (fullRepo !== 'andylitvinov-design/books' || !Number.isSafeInteger(prNumber) || prNumber<1 ||
      !SHA.test(expectedSha || '') || !validCandidate(candidate,expectedSha))
    throw Error('HH_REPAIR_PUBLISH_INVALID_CANDIDATE');
  const pr=(await github.rest.pulls.get({owner,repo,pull_number:prNumber})).data;
  if (!eligible(pr,fullRepo) || pr.head.sha !== expectedSha)
    throw Error('HH_REPAIR_PUBLISH_STALE_OR_UNAUTHORIZED');
  const files = (await github.rest.pulls.listFiles({owner,repo,pull_number:prNumber,per_page:100,page:1})).data;
  const allowed = safeFiles(files);
  if (!allowed || candidate.files.some(f => !allowed.includes(f.path)) ||
      new Set(candidate.files.map(f=>f.path)).size !== candidate.files.length)
    throw Error('HH_REPAIR_PUBLISH_UNSAFE_PATH');
  const verified = [];
  for (const f of candidate.files) {
    const data = (await github.rest.repos.getContent({owner,repo,path:f.path,ref:expectedSha})).data;
    const content = Buffer.from(f.base64,'base64');
    if (data.type !== 'file' || data.sha !== f.original_sha ||
        content.length > 150_000 || content.includes(0) ||
        Buffer.from(content.toString('utf8'),'utf8').compare(content) !== 0)
      throw Error('HH_REPAIR_PUBLISH_BLOB_MISMATCH');
    verified.push({path:f.path,content:f.base64});
  }
  if (!verified.length) {
    try {
      await github.rest.issues.addLabels({owner,repo,issue_number:prNumber,labels:[MANUAL]});
    } catch(error) {
      if (![404,422].includes(error.status)) throw error;
      try {
        await github.rest.issues.createLabel({owner,repo,name:MANUAL,color:'d93f0b',
          description:'Repair Worker attempted; source fix needs owner or coding agent'});
      } catch(createError) {
        if(createError.status!==422)throw createError;
      }
      await github.rest.issues.addLabels({owner,repo,issue_number:prNumber,labels:[MANUAL]});
    }
    await github.rest.issues.createComment({owner,repo,issue_number:prNumber,body:
      'HH Repair Worker: ran targeted ESLint autofix, but no safe validated source change was produced '+
      'for HEAD ' + expectedSha + '. Owner action required: diagnose the failed Core/TypeScript build and '+
      'apply a tested source fix. No checks were bypassed.'});
    return {status:'manual_required',number:prNumber};
  }
  if (!writer) throw Error('HH_REPAIR_PUBLISH_OWNER_TOKEN_REQUIRED');
  const parent = (await github.rest.git.getCommit({owner,repo,commit_sha:expectedSha})).data;
  if (!SHA.test(parent.tree?.sha || '')) throw Error('HH_REPAIR_PUBLISH_MISSING_PARENT_TREE');
  const created = await writer.commit({owner,repo,branch:pr.head.ref,expectedSha,
    treeSha:parent.tree.sha,files:verified,number:prNumber});
  if (!SHA.test(created?.sha || '') || created.sha===expectedSha)
    throw Error('HH_REPAIR_PUBLISH_NOT_COMMITTED');
  await github.rest.issues.createComment({owner,repo,issue_number:prNumber,body:
    'HH Repair Worker: committed targeted ESLint autofix ' + created.sha +
    ' for previous HEAD ' + expectedSha + '. Genuine PR synchronize should trigger Core CI; '+
    'AutoMerge is allowed only after exact-HEAD required checks pass.'});
  try { await github.rest.issues.removeLabel({owner,repo,issue_number:prNumber,name:SOURCE}); }
  catch (e) { core.info('HH_REPAIR: fix pushed; queue label remains: '+e.message); }
  return {status:'committed',number:prNumber,sha:created.sha};
}
module.exports={claim,publish,prioritizedRepairCandidates,eligible,validBranch,safeFiles,validCandidate,activeSweepLease,PROD,SOURCE,CONFLICT,MARKER};
