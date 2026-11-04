'use strict';
/**
 * Bounded, read-only GitHub GraphQL timeline read for all members of exactly
 * three historical PR cohorts. No workflow dispatches, tokens, mutation or cron.
 * A closed PR's native GraphQL identity is stronger than guessing from branch.
 * Incomplete pageInfo is reported, not interpreted as absence of events.
 */
const REPO='andylitvinov-design/books';
const RANGE=26,MAX_BATCHES=12,MIN_REMAINING=200;
const SHA=/^[0-9a-f]{40}$/i;
const TYPE={
 ReadyForReviewEvent:'pr_ready',HeadRefForcePushedEvent:'head_changed',
 ReviewRequestedEvent:'review_requested',BaseRefChangedEvent:'base_changed',
 MergedEvent:'merged',ClosedEvent:'closed_unmerged'};
function queryBatch(numbers){
 if(!Array.isArray(numbers)||!numbers.length||numbers.length>RANGE||
  new Set(numbers).size!==numbers.length||numbers.some(n=>!Number.isSafeInteger(n)||n<1))throw Error('INVALID_TIMELINE_BATCH');
 const fragments=`timelineItems(first:70){pageInfo{hasNextPage}nodes{__typename
 ... on ReadyForReviewEvent{createdAt}
 ... on HeadRefForcePushedEvent{createdAt afterCommit{oid}}
 ... on ReviewRequestedEvent{createdAt}
 ... on PullRequestReview{createdAt state}
 ... on IssueComment{createdAt}
 ... on BaseRefChangedEvent{createdAt}
 ... on LabeledEvent{createdAt label{name}}
 ... on UnlabeledEvent{createdAt label{name}}
 ... on MergedEvent{createdAt}
 ... on ClosedEvent{createdAt}
 }}`;
 return `query($owner:String!,$name:String!){rateLimit{remaining}repository(owner:$owner,name:$name){${numbers.map(n=>`p${n}:pullRequest(number:${n}){number createdAt closedAt ${fragments}}`).join('\n')}}`;
}
function normalize(pr,nodes,number){
 const rows=[];let lastMs=-Infinity;
 for(const x of nodes){
  let kind=TYPE[x?.__typename];
  if(x?.__typename==='PullRequestReview')kind=x.state==='APPROVED'?'review_approved':'review_feedback';
  if(x?.__typename==='IssueComment')kind='discussion_event';
  if(x?.__typename==='LabeledEvent'&&x.label?.name==='hh:conflict-repair-needed')kind='conflict_started';
  if(x?.__typename==='UnlabeledEvent'&&x.label?.name==='hh:conflict-repair-needed')kind='conflict_resolved';
  if(x?.__typename==='LabeledEvent'&&x.label?.name==='hh:merge-stage:inspect')kind='triage';
  if(x?.__typename==='LabeledEvent'&&x.label?.name==='hh:repair-needed')kind='triage';
  if(!kind)continue;
  const at=Date.parse(x.createdAt||'');if(!Number.isFinite(at)||at<Date.parse(pr.created_at)||at>Date.parse(pr.closed_at))continue;
  const head=x.__typename==='HeadRefForcePushedEvent'&&SHA.test(x.afterCommit?.oid||'')?x.afterCommit.oid:null;
  rows.push({pr:number,kind,at:x.createdAt,source:'github_issue_timeline',
   url:`https://github.com/${REPO}/pull/${number}`,head_sha:head});
  lastMs=Math.max(lastMs,at);
 }
 return rows;
}
async function collectTimelineGraphQL({prs,read,maxBatches=MAX_BATCHES,minRemaining=MIN_REMAINING}={}){
 if(!Array.isArray(prs)||typeof read!=='function'||!Number.isSafeInteger(maxBatches)||maxBatches<1||maxBatches>MAX_BATCHES||
  !Number.isSafeInteger(minRemaining)||minRemaining<100)throw Error('INVALID_TIMELINE_COLLECTOR');
 const valid=prs.filter(p=>Number.isSafeInteger(p.number)&&p.number>0&&
  Number.isFinite(Date.parse(p.created_at||''))&&Number.isFinite(Date.parse(p.closed_at||'')));
 if(new Set(valid.map(p=>p.number)).size!==valid.length)throw Error('TIMELINE_DUPLICATE_PR');
 const observations=[],batchErrors=[],incomplete=[],seen=new Set(),all=valid.length;
 let calls=0,reason=null,remaining=null;
 for(let i=0;i<valid.length;i+=RANGE){
  if(calls>=maxBatches){reason='BATCH_LIMIT_NOT_COMPLETE';break;}
  const chunk=valid.slice(i,i+RANGE);
  const query=queryBatch(chunk.map(p=>p.number));calls++;
  let response;
  try{response=await read(query,{owner:'andylitvinov-design',name:'books'});}catch(e){reason='GRAPHQL_READ_FAILED';batchErrors.push(String(e?.message||e).slice(0,180));break;}
  remaining=Number(response?.rateLimit?.remaining);
  if(!Number.isSafeInteger(remaining)){reason='GRAPHQL_RATE_UNVERIFIED';break;}
  if(!response.repository){reason='GRAPHQL_REPO_UNVERIFIED';break;}
  for(const p of chunk){
   const node=response.repository['p'+p.number];
   if(!node||node.number!==p.number||Date.parse(node.createdAt||'')!==Date.parse(p.created_at)||Date.parse(node.closedAt||'')!==Date.parse(p.closed_at)){
    incomplete.push(p.number);continue;}
   if(!Array.isArray(node.timelineItems?.nodes)||typeof node.timelineItems?.pageInfo?.hasNextPage!=='boolean'){
    incomplete.push(p.number);continue;}
   if(node.timelineItems.pageInfo.hasNextPage)incomplete.push(p.number);
   // Even partial timelines have useful witnessed events; never assert a
   // missing event did not occur when history is truncated.
   const values=normalize(p,node.timelineItems.nodes,p.number);
   for(const ev of values){const key=ev.pr+':'+ev.kind+':'+ev.at+':'+ev.url;
    if(seen.has(key))continue;seen.add(key);observations.push(ev);}
  }
  if(remaining<minRemaining){reason='GRAPHQL_RATE_RESERVE';break;}
 }
 return {observations,calls,matched_events:observations.length,partial_prs:incomplete,
  batch_errors:batchErrors,remaining,reason,
  complete:reason===null&&incomplete.length===0&&calls===Math.ceil(all/RANGE)};
}
module.exports={queryBatch,normalize,collectTimelineGraphQL,RANGE,MAX_BATCHES};