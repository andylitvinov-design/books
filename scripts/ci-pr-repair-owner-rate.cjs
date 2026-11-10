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
// GitHub Actions job-scoped GITHUB_TOKEN is granted contents:write by the
// protected workflow. Repository GET permissions.push is user-role metadata,
// not an authoritative per-job installation-token permission probe. Only the
// authenticated repo read and real rate budget can be proven before mutation;
// GitHub's Git Data API independently ENFORCES write authorization. Never
// select the repeatedly 403-denied owner PAT as a fallback.
function requireScopedJobWriterProbe(probe,required){
 if(!Number.isSafeInteger(required)||required<10||required>17)
   throw Error('HH_REPAIR_OWNER_RATE_INVALID_BUDGET');
 if(probe?.ok!==true)
   throw Error('HH_REPAIR_JOB_TOKEN_REPOSITORY_READ_UNVERIFIED');
 if(!Number.isSafeInteger(probe.remaining)||probe.remaining<required)
   throw Error('HH_REPAIR_JOB_TOKEN_RATE_RESERVE_UNVERIFIED');
 return Object.freeze({mode:'job',repositoryVerified:true,
   remaining:probe.remaining,required,
   gitDataWriteVerified:false,proofLevel:'REPOSITORY_READ_AND_RATE_NOT_WRITE'});
}
module.exports={requiredOwnerBudget,requireOwnerRateBudget,eligibleWriter,chooseWriterMode,requireScopedJobWriterProbe};
