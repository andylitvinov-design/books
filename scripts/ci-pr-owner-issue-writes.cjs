'use strict';

/**
 * Trusted default-branch PR-queue write adapter.
 * Prefer the scoped Actions GITHUB_TOKEN. Only for a proven write-permission
 * denial, use the already configured owner token on an allowlisted issue API.
 * Never send either credential to an untrusted PR checkout or arbitrary URL.
 */
const REPO='andylitvinov-design/books';
const LABELS=new Set([
  'hh:ci-needed','hh:ci-bootstrap-attempted','hh:repair-needed',
  'hh:conflict-repair-needed','hh:release-gate-review','hh:repair-manual'
]);
const OWNER='andylitvinov-design';
function assertRepo(args) {
  if (args?.owner!==OWNER || args?.repo!=='books')
    throw Error('HH_ISSUE_WRITER_WRONG_REPOSITORY');
}
function assertPR(args){
  assertRepo(args);
  if (!Number.isSafeInteger(args.issue_number) || args.issue_number<1)
    throw Error('HH_ISSUE_WRITER_INVALID_PR_NUMBER');
}
function assertLabel(value){
  if(!LABELS.has(value))throw Error('HH_ISSUE_WRITER_UNAPPROVED_LABEL');
}
function needsFallback(error) {
  return Number(error?.status)===403 &&
    /Resource not accessible by integration|Resource not accessible by personal access token/i
      .test(String(error?.message||''));
}
function withOwnerIssueWrites(github,token,{owner=OWNER,repo='books',fetchImpl=globalThis.fetch}={}){
  if(owner+'/'+repo!==REPO)throw Error('HH_ISSUE_WRITER_WRONG_REPOSITORY');
  if(!github?.rest?.issues)throw Error('HH_ISSUE_WRITER_MISSING_GITHUB_CLIENT');
  if(typeof token!=='string' || !token.trim())return github;
  if(typeof fetchImpl!=='function')throw Error('HH_ISSUE_WRITER_MISSING_FETCH');
  const prefix='https://api.github.com/repos/'+REPO;
  async function ownerRequest(method,path,body) {
    const response=await fetchImpl(prefix+path,{
      method,signal:AbortSignal.timeout(20000),
      headers:{
        Authorization:'Bearer '+token,
        Accept:'application/vnd.github+json',
        'Content-Type':'application/json',
        'X-GitHub-Api-Version':'2022-11-28'
      },
      ...(body===undefined?{}:{body:JSON.stringify(body)})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok) {
      const e=Error('HH_OWNER_ISSUE_WRITE_HTTP_'+response.status+': '+
        String(data.message||'GitHub denied issue write').slice(0,150));
      e.status=response.status;
      throw e;
    }
    const remaining=response.headers?.get?.('x-ratelimit-remaining');
    return {data,headers:remaining==null?{}:{'x-ratelimit-remaining':remaining}};
  }
  const original=github.rest.issues;
  const issues=Object.create(original);
  function safeWrite(name,validate,method,route,payload){
    issues[name]=async args=>{
      validate(args);
      try {return await original[name](args);}
      catch(error) {
        if(!needsFallback(error))throw error;
        return ownerRequest(method,route(args),payload(args));
      }
    };
  }
  safeWrite('addLabels',args=>{
    assertPR(args);
    if(!Array.isArray(args.labels) || args.labels.length<1 || args.labels.length>3)
      throw Error('HH_ISSUE_WRITER_UNSAFE_LABEL_COUNT');
    args.labels.forEach(assertLabel);
  },'POST',args=>'/issues/'+args.issue_number+'/labels',args=>({labels:args.labels}));
  safeWrite('createLabel',args=>{
    assertRepo(args);assertLabel(args.name);
    if(!/^[0-9a-fA-F]{6}$/.test(args.color || '') ||
      typeof args.description!=='string' || args.description.length>250)
      throw Error('HH_ISSUE_WRITER_UNSAFE_LABEL_META');
  },'POST',()=>'/labels',args=>({name:args.name,color:args.color,description:args.description}));
  safeWrite('removeLabel',args=>{
    assertPR(args);assertLabel(args.name);
  },'DELETE',args=>'/issues/'+args.issue_number+'/labels/'+encodeURIComponent(args.name),()=>undefined);
  safeWrite('createComment',args=>{
    assertPR(args);
    if(typeof args.body!=='string' || args.body.length<1 || args.body.length>15000)
      throw Error('HH_ISSUE_WRITER_UNSAFE_COMMENT');
  },'POST',args=>'/issues/'+args.issue_number+'/comments',args=>({body:args.body}));
  safeWrite('addAssignees',args=>{
    assertPR(args);
    if(!Array.isArray(args.assignees) || args.assignees.length!==1 ||
       args.assignees[0]!==OWNER)
      throw Error('HH_ISSUE_WRITER_UNSAFE_ASSIGNEE');
  },'POST',args=>'/issues/'+args.issue_number+'/assignees',args=>({assignees:args.assignees}));
  const rest=Object.create(github.rest);
  rest.issues=issues;
  const scoped=Object.create(github);
  scoped.rest=rest;
  return scoped;
}
module.exports={withOwnerIssueWrites,needsFallback,assertLabel};
