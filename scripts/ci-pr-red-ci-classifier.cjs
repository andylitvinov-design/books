'use strict';

/**
 * Pure, bounded diagnostic of terminal exact-HEAD CI jobs already fetched by
 * Watchdog. NEVER use this result alone to authorize a source write, retry,
 * merge, security waiver, or additional GitHub API request.
 */
const FAILED=new Set(['failure','timed_out','startup_failure']);
const AGGREGATE=new Set([
  'hh-merge-check','hh-core-verified','hh-specialist',
  'hh-specialists-verified','release-ready'
]);
const SECURITY=/(?:\bsecurity\b|secret[- ]?scan|codeql|sast|vulnerabilit|dependency[- ]?audit|trivy|semgrep|gitleaks)/i;
const INFRA=/^(?:set ?up job|run actions\/(?:checkout|setup-node)@|checkout|install dependencies|download|fetch|restore cache|prepare runner)/i;
const TYPESCRIPT=/(?:^TypeScript (?:build|check|compile)\b|\btypecheck\b|\btsc\b|^Run TypeScript\b)/i;
const TEST=/(?:\btests?\b|\bunit\b|\bcontracts?\b|\be2e\b|\bplaywright\b|\bwebkit\b|\bspecs?\b|\bassertions?\b)/i;
const BASE=/(?:BASE_ADVANCED|production[- ]base (?:advanced|moved)|stale[- ]base|base[- ]ancestry|base[- ]sha mismatch)/i;
const SHA=/^[0-9a-f]{40}$/i;

const proof=(category,job='',step='',message='')=>({
  category,failed_job:job||null,failed_step:step||null,
  evidence:message||null,
  source_write_authorized:false,
  status:'DIAGNOSTIC_ONLY'
});

function classifyRedCiError({pr,jobs,coreRoot='UNVERIFIED'}={}) {
  if(!SHA.test(pr?.head?.sha||'')||!Array.isArray(jobs)||!jobs.length)
    return proof('UNKNOWN');
  const failed=jobs.filter(j=>j&&FAILED.has(j.conclusion));
  if(!failed.length)return proof('UNKNOWN');
  const causal=failed.filter(j=>!AGGREGATE.has(j.name));
  const evidence=causal.flatMap(j=>{
    const steps=Array.isArray(j.steps)?j.steps.filter(s=>s?.conclusion==='failure'):[];
    if(steps.length)return steps.map(s=>({job:j.name||'',step:s.name||'',reason:j.conclusion}));
    return [{job:j.name||'',step:'',reason:j.conclusion}];
  });
  // A verified security gate is always a safety hold; do not auto-write.
  const security=evidence.find(x=>SECURITY.test(x.step)||SECURITY.test(x.job));
  if(security)return proof('SECURITY',security.job,security.step,'FAILED_SECURITY_GATE');
  if(pr.mergeable===false&&pr.mergeable_state==='dirty')
    return proof('MERGE_CONFLICT',failed[0]?.name,'','CURRENT_DIRTY');
  const infra=evidence.find(x=>x.reason==='timed_out'||x.reason==='startup_failure'||INFRA.test(x.step));
  if(coreRoot==='CI_INFRA_OR_ENVIRONMENT' ||
     (causal.length>0 && evidence.length>0 && evidence.every(x=>
       x.reason==='timed_out'||x.reason==='startup_failure'||INFRA.test(x.step))))
    return proof('INFRASTRUCTURE',infra?.job||causal[0]?.name,infra?.step||'','RUNNER_OR_SETUP_FAILED');
  const base=evidence.find(x=>BASE.test(x.step)||BASE.test(x.job));
  if(base)return proof('BASE_ADVANCED',base.job,base.step,'EXPLICIT_BASE_FAILURE');
  if(coreRoot==='CI_PREFLIGHT_OR_ROUTING')
    return proof('BASE_OR_CI_ROUTING',causal[0]?.name,'','NO_PROVEN_BASE_ADVANCED');
  if(!causal.length || !evidence.length ||
     causal.some(j=>['timed_out','startup_failure'].includes(j.conclusion)))
    return proof('UNKNOWN');
  const types=evidence.filter(x=>TYPESCRIPT.test(x.step));
  const tests=evidence.filter(x=>TEST.test(x.step));
  if(types.length && types.length===evidence.length)
    return proof('TYPESCRIPT',types[0].job,types[0].step,'FAILED_TYPESCRIPT_STEP');
  if(tests.length && tests.length===evidence.length)
    return proof('TEST_FAILURE',tests[0].job,tests[0].step,'FAILED_TEST_STEP');
  return proof('UNKNOWN',causal[0]?.name,'','MIXED_OR_UNRECOGNIZED_FAILURE');
}

module.exports={classifyRedCiError};
