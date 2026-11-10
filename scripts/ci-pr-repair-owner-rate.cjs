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
// A malformed, NON-WRITING Git blob request is used to establish the
// actual token's Git Data API access rather than trusting repository metadata
// permissions.push, which can disagree with fine-grained token enforcement.
// Exactly 422 with a missing/invalid content/encoding error counts as proof.
// Never treat a 403, 429, generic 422/abuse message or 201 as permission.
function verifiedInvalidGitBlobProbe(status,data){
 if(status!==422||!data||typeof data!=='object'||Array.isArray(data))return false;
 const errors=Array.isArray(data.errors)?data.errors:[];
 if(errors.some(item=>item&&typeof item==='object'&&
   ['content','encoding'].includes(item.field)&&
   ['missing','missing_field','invalid','unprocessable'].includes(item.code)))
   return true;
 // GitHub also uses an Invalid request message with no errors array.
 return typeof data.message==='string'&&
   /^Invalid request\\./.test(data.message)&&
   /(?:\\\"content\\\"|\\\"encoding\\\").{0,100}(?:wasn.t supplied|required|invalid|must be)/i.test(data.message);
}
// Repo identity + real Git Data validation + bounded remaining quota are
// mandatory for every credential, including broad owner PATs.
// A GitHub Actions job may have contents:write even when its public
// repository metadata omits the user-oriented permissions.push property.
function eligibleWriter(probe,required){
 return !!(probe?.ok===true&&probe?.gitDataWriteVerified===true&&
  Number.isSafeInteger(probe.remaining)&&probe.remaining>=required);
}
function chooseWriterMode({job,owner}={},required){
 if(!Number.isSafeInteger(required)||required<10||required>17)
  throw Error('HH_REPAIR_OWNER_RATE_INVALID_BUDGET');
 if(eligibleWriter(job,required))return 'job';
 if(eligibleWriter(owner,required))return 'owner';
 throw Error('HH_REPAIR_NO_VERIFIED_WRITER_CREDENTIAL_OR_RATE');
}
module.exports={requiredOwnerBudget,requireOwnerRateBudget,verifiedInvalidGitBlobProbe,eligibleWriter,chooseWriterMode};
