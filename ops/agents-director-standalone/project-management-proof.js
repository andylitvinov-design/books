'use strict';
/* Exact-HEAD GitHub evidence for public Project Management. No auth, writes, timers or CI dispatch. */
(function (host) {
  const SHA=/^[0-9a-f]{40}$/i;
  const REPO='andylitvinov-design/books';
  const PR_NAMES=Object.freeze({
    merged:'MERGED',open:'OPEN',draft:'DRAFT',closed_unmerged:'CLOSED без merge',unknown:'PR UNKNOWN'
  });
  const CI_NAMES=Object.freeze({
    pass:'Merge Gate ✓',fail:'Merge Gate FAILED',pending:'Merge Gate ожидает',
    unknown:'Merge Gate неизвестен'
  });
  function evaluatePR(pr,checks,observedAt){
    if(!pr||!Number.isSafeInteger(pr.number)||pr.number<1||
       !SHA.test(pr.head?.sha||'')||
       !['open','closed'].includes(pr.state)||
       (pr.base?.repo?.full_name&&pr.base.repo.full_name!==REPO)){
      return {pr:'unknown',ci:'unknown',head:null,live:'unknown',
        observedAt:observedAt||null,reason:'PR_IDENTITY_UNVERIFIED',
        label:'PR UNKNOWN · Merge Gate неизвестен · LIVE не подтверждён'};
    }
    const head=pr.head.sha.toLowerCase();
    const prStatus=pr.state==='closed'
      ?pr.merged_at&&Number.isFinite(Date.parse(pr.merged_at))?'merged':'closed_unmerged'
      :pr.draft?'draft':'open';
    let ci='unknown', reason='MISSING_EXACT_HEAD_GATE';
    const complete=checks&&Number.isSafeInteger(checks.total_count)&&
      checks.total_count>=0&&checks.total_count<=100&&
      Array.isArray(checks.check_runs)&&checks.check_runs.length===checks.total_count;
    if(complete){
      const eligible=checks.check_runs.filter(r=>r?.name==='hh-merge-check'&&
        typeof r.head_sha==='string'&&r.head_sha.toLowerCase()===head);
      eligible.sort((a,b)=>Date.parse(b.completed_at||b.started_at||0)-
        Date.parse(a.completed_at||a.started_at||0));
      const gate=eligible[0];
      if(gate){
        reason=null;
        if(gate.status!=='completed')ci='pending';
        else if(gate.conclusion==='success')ci='pass';
        else if(['failure','timed_out','action_required','startup_failure'].includes(gate.conclusion))ci='fail';
        else {ci='unknown';reason='GATE_NOT_SUCCESSFUL_OR_FAILED';}
      }
    }else if(checks){reason='PARTIAL_CHECKRUN_COVERAGE';}
    return {pr:prStatus,ci,head,live:'unknown',reason,
      observedAt:observedAt||null,
      label:PR_NAMES[prStatus]+' · '+CI_NAMES[ci]+' · HEAD '+head.slice(0,9)+
        ' · LIVE не подтверждён'};
  }
  const api=Object.freeze({evaluatePR});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(host)host.HHPMProof=api;
})(typeof window==='object'?window:null);
