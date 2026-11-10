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
function eligibleJobWriter(probe,required){
 // The REST repository permissions.push is a user/installation view, not
 // authoritative for this workflow-scoped GITHUB_TOKEN. Job permissions are
 // explicitly contents:write in trusted publish YAML. Do not borrow a PAT.
 return probe?.ok===true && Number.isSafeInteger(probe.remaining) &&
   probe.remaining>=required;
}
function chooseWriterMode({job}={},required){
 if(!Number.isSafeInteger(required)||required<10||required>17)
  throw Error('HH_REPAIR_OWNER_RATE_INVALID_BUDGET');
 if(eligibleJobWriter(job,required))return 'job';
 throw Error('HH_REPAIR_JOB_TOKEN_UNVERIFIED_OR_RATE_LOW');
}
module.exports={requiredOwnerBudget,requireOwnerRateBudget,eligibleWriter,eligibleJobWriter,chooseWriterMode};
