import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {observePmWatchdogRun} from '../lib/project-management/execution.mjs';

const requestId='9d3948d6-1648-46be-bce2-7c2854ed9ed5';
const title='HH watchdog / PM #3857 / '+requestId;
const workflow={
 id:42312345678,event:'workflow_dispatch',head_branch:'codex/bootstrap-books',
 display_title:title,status:'completed',conclusion:'success',created_at:'2026-11-07T17:00:00Z'
};
const jobs={jobs:[{name:'direct-handoff',status:'completed',conclusion:'success',
 started_at:'2026-11-07T17:01:00Z'}]};

test('Watchdog dispatcher success is never misrepresented as a code agent or source commit',()=>{
 const got=observePmWatchdogRun({workflow,jobs,prNumber:3857,requestId});
 assert.equal(got.stage,'WATCHDOG_COMPLETED_UNVERIFIED');
 assert.equal(got.watchdogStarted,true);
 assert.equal(got.codeWorkerProof,'UNVERIFIED');
 assert.equal(got.sourceCommitProof,'UNVERIFIED');
 assert.equal(Object.hasOwn(got,'runnerStarted'),false);
 assert.equal(got.url,'https://github.com/andylitvinov-design/books/actions/runs/42312345678');
});

test('Queued and still-running Watchdog never pretend that source was published',()=>{
 const queued=observePmWatchdogRun({workflow:{...workflow,status:'queued',conclusion:null},jobs:null,prNumber:3857,requestId});
 assert.equal(queued.stage,'DISPATCH_ACCEPTED');
 assert.equal(queued.watchdogStarted,false);
 const running=observePmWatchdogRun({workflow:{...workflow,status:'in_progress',conclusion:null},jobs,prNumber:3857,requestId});
 assert.equal(running.stage,'WATCHDOG_DISPATCHER_STARTED');
 assert.equal(running.codeWorkerProof,'UNVERIFIED');
 const failure=observePmWatchdogRun({workflow:{...workflow,conclusion:'failure'},jobs,prNumber:3857,requestId});
 assert.equal(failure.stage,'WATCHDOG_FAILED');
});

test('No cross-task correlation: exact PR, UUID, branch, workflow and identity are required',()=>{
 const args={workflow,jobs,prNumber:3857,requestId};
 for(const other of [
  {...args,prNumber:3858},
  {...args,requestId:'31ac0912-e125-4fa8-b7ac-6b76c7f18f05'},
  {...args,requestId:'not-a-uuid'},
  {...args,workflow:{...workflow,display_title:title+' extra'}},
  {...args,workflow:{...workflow,head_branch:'codex/public-book-library'}},
  {...args,workflow:{...workflow,event:'schedule'}},
  {...args,workflow:{...workflow,id:'bad'}}
 ])assert.equal(observePmWatchdogRun(other),null);
});

test('Owner status API uses exact correlation and never treats handoff job as code proof',()=>{
 const route=readFileSync(new URL('../app/api/admin/project-management/route.js',import.meta.url),'utf8');
 const client=readFileSync(new URL('../app/admin/project-management/project-management-client.jsx',import.meta.url),'utf8');
 assert.match(route,/observePmWatchdogRun\(/);
 assert.match(route,/x\.display_title===title/);
 assert.doesNotMatch(route,/runnerStarted:started|\.includes\(last\.result\.requestId\)/);
 for(const a of ['Watchdog — диспетчер','Watchdog is a dispatcher','Watchdog es un despachador'])
  assert.ok(client.includes(a));
 assert.match(client,/WATCHDOG_NOT_VERIFIED/);
 assert.match(route,/ownerMaterialRequest/);
});
