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
// The Actions job explicitly declares contents:write in the trusted
// default-branch workflow. GET /repos may omit permissions.push for its scoped
// GITHUB_TOKEN; that read-only field is not an authoritative write probe.
// Only the known *job credential* may use this metadata path. GitHub still
// enforces the actual Git Data write, and publication remains unverified
// until the new remote ref and parent SHA are read back.
function eligibleScopedJobWriter(probe,required,writeJobAuthorized=false){
 return writeJobAuthorized===true&&probe?.ok===true&&
  Number.isSafeInteger(probe.remaining)&&probe.remaining>=required;
}
function chooseWriterMode({job,owner}={},required,{writeJobAuthorized=false}={}){
 if(!Number.isSafeInteger(required)||required<10||required>17)
  throw Error('HH_REPAIR_OWNER_RATE_INVALID_BUDGET');
 if(eligibleWriter(job,required)||eligibleScopedJobWriter(job,required,writeJobAuthorized))
   return 'job';
 if(eligibleWriter(owner,required))return 'owner';
 throw Error('HH_REPAIR_NO_VERIFIED_WRITER_CREDENTIAL_OR_RATE');
}
// Never copy untrusted error body/path/token into a GitHub Actions log.
// This fixed-vocabulary receipt identifies which protected API operation
// returned 403, so a missing scope is not misreported as an AI failure.
function writerOperation(method,path){
 if(typeof method!=='string'||typeof path!=='string')return 'UNKNOWN';
 const prefix='/repos/andylitvinov-design/books';
 if(path===prefix&&method==='GET')return 'REPOSITORY_READ';
 if(!path.startsWith(prefix+'/'))return 'OUTSIDE_REPO';
 const route=path.slice(prefix.length);
 if(/^\/git\/ref\/heads\/[a-z0-9_./-]+$/i.test(route))
   return method==='PATCH'?'UPDATE_REF':method==='GET'?'READ_REF':'UNKNOWN';
 if(method==='POST'&&route==='/git/blobs')return 'CREATE_BLOB';
 if(method==='POST'&&route==='/git/trees')return 'CREATE_TREE';
 if(method==='POST'&&route==='/git/commits')return 'CREATE_COMMIT';
 return 'UNKNOWN';
}
function errorKind(status,message){
 if(status===403&&message==='Resource not accessible by integration')
   return 'INTEGRATION_PERMISSION_DENIED';
 if(status===403&&message==='Resource not accessible by personal access token')
   return 'PERSONAL_TOKEN_PERMISSION_DENIED';
 if((status===403||status===429)&&
   typeof message==='string'&&/rate limit|secondary rate limit/i.test(message))
   return 'PROVIDER_RATE_LIMIT';
 return 'HTTP_REJECTED';
}
function allowedPermissions(value){
 if(typeof value!=='string'||value.length>1024)return [];
 const allowed=new Set(['contents','pull_requests','actions','issues','metadata','administration']);
 const output=[];
 for(const match of value.matchAll(/\b([a-z_]+)=(read|write)\b/g))
   if(allowed.has(match[1])&&!output.includes(match[1]+'='+match[2]))
     output.push(match[1]+'='+match[2]);
 return output.slice(0,12);
}

module.exports={requiredOwnerBudget,requireOwnerRateBudget,eligibleWriter,eligibleScopedJobWriter,chooseWriterMode,writerOperation,errorKind,allowedPermissions};
