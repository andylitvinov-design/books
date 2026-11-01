'use strict';
const {collectBacklog}=require('./ci-pr-kpi-backlog.cjs');
const {collectReceiptEvents}=require('./ci-pr-kpi-collector.cjs');
const {collectMergeEvents}=require('./ci-pr-kpi-merges.cjs');
const {collectCompletedJobs}=require('./ci-pr-kpi-actions.cjs');
const {collectDispatcherEvents}=require('./ci-pr-kpi-dispatch-collector.cjs');
const {normalizeCoreEvidence}=require('./ci-pr-kpi-ci.cjs');
const {buildReport}=require('./ci-pr-kpi-report.cjs');
async function run({github,core,context,now=Date.now(),deps={}}){
 const {owner,repo}=context.repo;
 if(owner!=='andylitvinov-design'||repo!=='books'||!Number.isFinite(now))throw Error('INVALID_CONTEXT');
 const d={collectBacklog,collectReceiptEvents,collectMergeEvents,collectCompletedJobs,collectDispatcherEvents,normalizeCoreEvidence,...deps};
 const common={github,owner,repo,minRemaining:500};const since=now-14*86400000;
 const backlog=await d.collectBacklog({...common,maxRequests:12});
 const receipts=await d.collectReceiptEvents({...common,since,maxRequests:40});
 const merges=await d.collectMergeEvents({...common,since,maxRequests:30});
 const actions=await d.collectCompletedJobs({...common,since,until:now,maxRequests:60});
 const dispatch=await d.collectDispatcherEvents({...common,runs:actions.workflowRuns,jobs:actions.jobs,runsComplete:actions.complete,jobsComplete:actions.complete,maxRequests:30});
 dispatch.since=actions.since;
 const ci=d.normalizeCoreEvidence(actions.workflowRuns,actions.jobs);
 const report=buildReport({now,backlog,receipts,merges,actions,dispatch,ci});
 const text=JSON.stringify(report);core.info('HH_CONTROL_KPI '+text);
 await core.summary.addHeading('HH Control Tower KPI: evidence and coverage').addCodeBlock(text,'json').write();
 return report;
}
module.exports={run};
