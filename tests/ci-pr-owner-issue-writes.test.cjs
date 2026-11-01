'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {withOwnerIssueWrites,needsFallback}=require('../scripts/ci-pr-owner-issue-writes.cjs');
const owner='andylitvinov-design',repo='books';
const args={owner,repo,issue_number:1421,labels:['hh:conflict-repair-needed']};
const denied=()=>Object.assign(Error('Resource not accessible by integration'),{status:403});
const base=opts=>{
  const log={reads:0,labels:0};
  const issues={
    listComments:async()=>{log.reads++;return {data:[]};},
    addLabels:async()=>{log.labels++;if(opts?.deny)throw denied();return {data:[]};},
    createLabel:async()=>{throw denied();},
    createComment:async()=>{throw denied();},
    removeLabel:async()=>{throw denied();},
    addAssignees:async()=>{throw denied();}
  };
  const gh={rest:{issues,pulls:{get:async()=>({data:{}})}},request:async()=>42};
  return {gh,log};
};
const response=()=>({ok:true,status:200,headers:{get:()=>null},json:async()=>[]});
test('no owner credential preserves original read and write client',()=>{
  const {gh}=base();
  assert.equal(withOwnerIssueWrites(gh,''),gh);
});
test('keep original scoped token when PR issue write succeeds',async()=>{
  const {gh,log}=base();
  const scope=withOwnerIssueWrites(gh,'owner-token',{fetchImpl:async()=>{throw Error('unexpected PAT use')}});
  await scope.rest.issues.addLabels(args);
  assert.equal(log.labels,1);
  assert.equal(scope.rest.pulls,gh.rest.pulls);
  await scope.rest.issues.listComments({});
  assert.equal(log.reads,1);
});
test('fallback to existing owner token only for proven GitHub permission denial',async()=>{
  const {gh}=base({deny:true});
  const calls=[];
  const scope=withOwnerIssueWrites(gh,'owner-token',{fetchImpl:async(url,init)=>{
    calls.push({url,init});return response();
  }});
  await scope.rest.issues.addLabels(args);
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,'https://api.github.com/repos/andylitvinov-design/books/issues/1421/labels');
  assert.equal(calls[0].init.method,'POST');
  assert.equal(calls[0].init.headers.Authorization,'Bearer owner-token');
  assert.deepEqual(JSON.parse(calls[0].init.body),{labels:['hh:conflict-repair-needed']});
});
test('reject unauthorized PRs, labels, and assignees before any API write',async()=>{
  const {gh}=base({deny:true});
  const scope=withOwnerIssueWrites(gh,'owner-token',{fetchImpl:async()=>{throw Error('unsafe network')}});
  for(const invalid of [
    {...args,repo:'external'},
    {...args,issue_number:-3},
    {...args,labels:['unapproved']},
    {...args,labels:[]}
  ])await assert.rejects(()=>scope.rest.issues.addLabels(invalid),/HH_ISSUE_WRITER/);
  await assert.rejects(()=>scope.rest.issues.addAssignees({
    owner,repo,issue_number:1421,assignees:['not-the-owner']
  }),/HH_ISSUE_WRITER_UNSAFE_ASSIGNEE/);
});
test('comment and label metadata fallback are limited to safe issue endpoints',async()=>{
  const {gh}=base({deny:true});
  const urls=[];
  const scope=withOwnerIssueWrites(gh,'owner-token',{fetchImpl:async(url,init)=>{
    urls.push({url,method:init.method});return response();
  }});
  await scope.rest.issues.createLabel({
    owner,repo,name:'hh:ci-needed',color:'0e8a16',description:'Missing Core'
  });
  await scope.rest.issues.createComment({owner,repo,issue_number:1421,body:'Queued HEAD 123'});
  await scope.rest.issues.removeLabel({owner,repo,issue_number:1421,name:'hh:ci-needed'});
  await scope.rest.issues.addAssignees({owner,repo,issue_number:1421,assignees:[owner]});
  assert.deepEqual(urls.map(x=>x.method),['POST','POST','DELETE','POST']);
  assert.ok(urls.every(x=>x.url.startsWith('https://api.github.com/repos/andylitvinov-design/books/')));
});
test('non-permission errors must remain hard failures, not mask actual bugs',async()=>{
  const {gh}=base();
  gh.rest.issues.addLabels=async()=>{throw Object.assign(Error('Server Error'),{status:500});};
  const scope=withOwnerIssueWrites(gh,'owner-token',{fetchImpl:async()=>{throw Error('not reached')}});
  await assert.rejects(()=>scope.rest.issues.addLabels(args),/Server Error/);
  assert.equal(needsFallback({status:422,message:'Resource not accessible by integration'}),false);
});
