#!/usr/bin/env node
// One entry point for Developer -> focused tests -> release candidate -> guarded PR.
// Does not merge or deploy. GitHub required CI remains the final release gate.
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {prepareReleaseCandidate} from './lab-release-candidate.mjs';
import {publishRelease} from './lab-pr-publisher.mjs';
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',timeout:30000}).trim();
export async function runLabReleaseGate(workspace,{execute=false}={}){
 const cwd=resolve(workspace);
 const task=JSON.parse(await readFile(join(cwd,'.hh-lab-task.json'),'utf8'));
 const head=git(cwd,'rev-parse','HEAD');
 if(!/^[a-f0-9]{40}$/i.test(head)||!Array.isArray(task.focusedTests)||!task.focusedTests.length)throw Error('Exact HEAD and focusedTests required');
 if(task.focusedTests.some(x=>typeof x!=='string'||!/^tests\/[a-zA-Z0-9_./-]+\.test\.mjs$/.test(x)||x.includes('..')))throw Error('Invalid focused test path');
 // Tests run in the same worktree against the exact source being released.
 execFileSync(process.execPath,['--test',...task.focusedTests],{cwd,stdio:'inherit',timeout:180000});
 if(git(cwd,'rev-parse','HEAD')!==head)throw Error('HEAD changed during tests');
 const packet=await prepareReleaseCandidate(cwd,{qaPassed:true,testEvidence:true});
 const result=await publishRelease(cwd,{execute});
 return {featureId:packet.id,testedSha:head,tests:task.focusedTests,release:result};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{console.log(JSON.stringify(await runLabReleaseGate(process.argv[2]||'.',{execute:process.argv.includes('--execute')}),null,2))}
 catch(e){console.error('LAB RELEASE GATE BLOCKED: '+e.message);process.exitCode=2}
}
