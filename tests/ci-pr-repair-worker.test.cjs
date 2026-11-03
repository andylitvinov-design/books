'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {eligible,safeFiles,claim,publish,finalize,finalizeFailedFix,prioritizedRepairCandidates,validBranch,validCandidate,activeSweepLease,repairMode,hasVerifiedSourceHandoff,verifiedCoreCodeFailure,MARKER}=require('../scripts/ci-pr-repair-worker.cjs');
const {taskFor,commentBody,reservation,reservationStatus}=require('../scripts/ci-pr-task-state.cjs');
const sha='a'.repeat(40), newSha='b'.repeat(40), owner='andylitvinov-design', repo='books';
const context={repo:{owner,repo}};
const core={info:()=>{},outputs:{},setOutput(k,v){this.outputs[k]=v;}};
const pr=(extra={})=>({number:11,state:'open',draft:false,user:{login:owner},
  mergeable:true,mergeable_state:'blocked',
  base:{ref:'codex/public-book-library'},head:{ref:'fix/pr-11',sha,
    repo:{full_name:owner+'/'+repo}},labels:[{name:'hh:repair-needed'}],...extra});
const sourceFiles=[{filename:'lib/a.ts',status:'modified'}];
function fixture(options={}){
  const p=options.pr||pr(), log={comments:0,commentBodies:[],assigned:0,labels:0,removed:[],read:0,commit:0};
  const github={rest:{pulls:{
    get:async()=>({data:options.fresh||p}),list:async()=>({data:options.children||[]}),
    listFiles:async()=>({data:sourceFiles})},
    issues:{listForRepo:async()=>({data:[{number:11,pull_request:{}}]}),
      listComments:async()=>({data:options.comments ?? [{user:{id:41898282,login:'github-actions[bot]',type:'Bot'},performed_via_github_app:¶»§q«^