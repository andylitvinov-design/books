'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {queryBatch,collectTimelineGraphQL}=require('../scripts/ci-pr-graphql-timeline.cjs');
const d='2026-11-03T13:';
const pr=n=>({number:n,created_at:d+'00:00Z',closed_at:d+'40:00Z'});
function res(ids){
 const repository={};
 for(const n of ids)repository['p'+n]={number:n,createdAt:d+'00:00Z',closedAt:d+'40:00Z',
  timelineItems:{pageInfo:{hasNextPage:false},nodes:[
   {__typename:'ReadyForReviewEvent',createdAt:d+'04:00Z'},
   {__typename:'HeadRefForcePushedEvent',createdAt:d+'09:00Z',afterCommit:{oid:'a'.repeat(40)}},
   {__typename:'ReviewRequestedEvent',createdAt:d+'20:00Z'},
   {__typename:'PullRequestReview',createdAt:d+'30:00Z',state:'APPROVED'}
  ]}};
 return {rateLimit:{remaining:4300},repository};
}
test('query is bounded, aliases numeric, no mutation, includes event timestamps',()=>{
 const q=queryBatch([12,13]);assert.match(q,/p12:pullRequest\(number:12\)/);
 assert.match(q,/timelineItems\(first:70\)/);assert.doesNotMatch(q,/mutation|workflowDispatch/i);
 assert.throws(()=>queryBatch([13,13]),/INVALID/);
});
test('one grouped GraphQL read creates authenticated source/ready/review observations',async()=>{
 let calls=0;const out=await collectTimelineGraphQL({prs:[pr(12),pr(13)],read:async(q,variables)=>{
  assert.equal(variables.owner,'andylitvinov-design');calls++;return res([12,13]);}});
 assert.equal(calls,1);assert.equal(out.complete,true);assert.equal(out.matched_events,8);
 assert.equal(out.observations.filter(o=>o.kind==='head_changed').length,2);
 assert.ok(out.observations.every(o=>o.source==='github_issue_timeline'));
});
test('partial timeline does not claim complete source coverage, but keeps evidence',async()=>{
 const x=res([12]);x.repository.p12.timelineItems.pageInfo.hasNextPage=true;
 const out=await collectTimelineGraphQL({prs:[pr(12)],read:async()=>x});
 assert.deepEqual(out.partial_prs,[12]);assert.equal(out.complete,false);assert.equal(out.matched_events,4);
});
test('wrong PR identity and misleading future event fail closed',async()=>{
 const x=res([12]);x.repository.p12.createdAt=d+'01:00Z';
 const a=await collectTimelineGraphQL({prs:[pr(12)],read:async()=>x});
 assert.deepEqual(a.partial_prs,[12]);assert.equal(a.matched_events,0);
});
test('rate reserve prevents unbounded 302 PR scan and retains previous partial receipts',async()=>{
 const p=Array.from({length:30},(_,i)=>pr(i+1));let calls=0;
 const a=await collectTimelineGraphQL({prs:p,read:async(q)=>{calls++;const ids=[...q.matchAll(/p(\d+):pullRequest/g)].map(x=>Number(x[1]));const x=res(ids);x.rateLimit.remaining=150;return x;}});
 assert.equal(calls,1);assert.equal(a.reason,'GRAPHQL_RATE_RESERVE');assert.equal(a.complete,false);assert.equal(a.observations.length,26*4);
});