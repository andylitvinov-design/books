'use strict';
// One credential-isolated source-publish transaction. After the initial
// authenticated GET /repos/:owner/:repo, the writer needs:
// GET current ref; N POST blobs; POST tree; POST commit; GET ref; PATCH ref;
// GET published ref => N+6 requests. Keep three additional calls in reserve.
function requiredOwnerBudget(fileCount){
 if(!Number.isSafeInteger(fileCount)||fileCount<1||fileCount>8)
  throw Error('HH_REPAIR_OWNER_RATE_INVALID_SOURCE_SCOPE');
 return fileCount+9;
}
function requireOwnerRateBudget(headers,required){
 if(!Number.isSafeInteger(required)||required<10||required>17)
  throw Error('HH_REPAIR_OWNER_RATE_INVALID_BUDGET');
 const raw=headers&&typeof headers.get==='function'
  ?headers.get('x-ratelimit-remaining'):null;
 if(typeof raw!=='string'||!/^(?:0|[1-9][0-9]{0,9})$/.test(raw))
  throw Error('HH_REPAIR_OWNER_RATE_NOT_VERIFIED');
 const remaining=Number(raw);
 if(!Number.isSafeInteger(remaining)||remaining<required)
  throw Error('HH_REPAIR_OWNER_RATE_RESERVE_LOW remaining='+remaining+' required='+required);
 return {remaining,required,source:'GITHUB_AUTHENTICATED_RESPONSE_HEADER'};
}
// A repository-scoped Actions credential is preferred over a broad owner
// PAT after the PAT was proven to return 403 on the Git Data write endpoint.
// No credential is chosen merely from its existence, a UI flag or unknown quota.
function eligibleWriter(probe,required){
 return !!(probe?.ok===true&&probe?.canPush===true&&
  Number.isSafeInteger(probe.remaining)&&probe.remaining>=required);
}
function chooseWriterMode({job,owner}={},required){
 if(!Number.isSafeInteger(required)||required<10||required>17)
  throw Error('HH_REPAIR_OWNER_RATE_INVALID_BUDGET');
 if(eligibleWriter(job,required))return 'job';
 if(eligibleWriter(owner,required))return 'owner';
 throw Error('HH_REPAIR_NO_VERIFIED_WRITER_CREDENTIAL_OR_RATE');
}
// GitHub's repository "permissions.push" metadata is NOT a reliable probe
// for the ephemeral Actions token's per-job contents:write permission. Only
// run this selection from the immutable trusted workflow_dispatch publisher.
// The Git Data API itself decides whether a source write is authorized.
function requireScopedJobWriter({probe,required,identity}={}){
 if(!Number.isSafeInteger(required)||required<10||required>17)
  throw Error('HH_REPAIR_SCOPED_JOB_INVALID_BUDGET');
 if(identity?.repository!=='andylitvinov-design/books'||
    identity.ref!=='refs/heads/codex/bootstrap-books'||
    identity.eventName!=='workflow_dispatch')
  throw Error('HH_REPAIR_SCOPED_JOB_UNTRUSTED_WORKFLOW_CONTEXT');
 if(probe?.ok!==true||
    !Number.isSafeInteger(probe.remaining)||probe.remaining<required)
  throw Error('HH_REPAIR_SCOPED_JOB_API_PROOF_OR_RATE_MISSING');
 // No PAT fallback based on a GET /repos permissions hint. A 403 during
 // source mutation must be reported as a real publisher failure.
 return 'job';
}
module.exports={requiredOwnerBudget,requireOwnerRateBudget,eligibleWriter,chooseWriterMode,requireScopedJobWriter};
