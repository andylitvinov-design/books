#!/usr/bin/env node
// Produce a release candidate manifest from a LAB worktree; never opens a PR.
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
function git(args,cwd){return execFileSync('git',args,{cwd,encoding:'utf8',timeout:30000,maxBuffer:16*1024*1024}).trim()}
export async function prepareReleaseCandidate(workspace,{qaPassed=false,testEvidence=false,acceptance=null}={}){
 const cwd=resolve(workspace);
 const manifest=JSON.parse(await readFile(join(cwd,'.hh-lab-task.json'),'utf8'));
 if(!/^LAB-[1-9][0-9]*$/.test(manifest.id)||!/^[a-f0-9]{40}$/i.test(manifest.baseSha))throw Error('Invalid task manifest');
 if(qaPassed!==true||testEvidence!==true)throw Error('QA evidence is required');
 const base=manifest.baseSha;
 git(['cat-file','-e',base+'^{commit}'],cwd);
 const mergeBase=git(['merge-base',base,'HEAD'],cwd);
 if(mergeBase.toLowerCase()!==base.toLowerCase())throw Error('Worktree diverged from task base');
 const status=git(['status','--porcelain','--untracked-files=all'],cwd).split('\n').filter(Boolean);
 const localArtifacts=new Set(['.hh-lab-task.json','.hh-lab-release.json']);
 const untracked=status.filter(x=>x.startsWith('??')&&!localArtifacts.has(x.slice(3)));
 if(untracked.length)throw Error('Untracked files must be explicitly staged or removed');
 const changed=git(['diff','--name-only',base,'HEAD'],cwd).split('\n').filter(Boolean);
 const dirty=status.filter(x=>!x.startsWith('??'));
 if(dirty.length)throw Error('Commit all tracked changes before release preparation');
 if(changed.some(x=>localArtifacts.has(x)))throw Error('Lab metadata must never be included in release');
 if(!changed.length)throw Error('No committed changes');
 const head=git(['rev-parse','HEAD'],cwd);
 if(manifest.releaseStatus==='LIVE')throw Error('Already live');
 if(head===base)throw Error('Nothing to release');
 if(acceptance?.accepted!==true||acceptance.headSha!==head||!acceptance.reviewEvidenceId)throw Error('Independent acceptance for exact HEAD is required');
 const packet={id:manifest.id,title:manifest.title,owner:manifest.owner,baseSha:base,headSha:head,changedFiles:changed,qaPassed:true,testEvidence:true,acceptance,status:'RELEASE_CANDIDATE',targetBranch:'codex/public-book-library',pr:null};
 await writeFile(join(cwd,'.hh-lab-release.json'),JSON.stringify(packet,null,2)+'\n');
 return packet;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{console.log(JSON.stringify(await prepareReleaseCandidate(process.argv[2]||process.cwd(),{qaPassed:process.env.HH_LAB_QA_PASSED==='true',testEvidence:process.env.HH_LAB_TEST_EVIDENCE==='true',acceptance:process.env.HH_LAB_ACCEPTANCE_FILE?JSON.parse(await readFile(resolve(process.env.HH_LAB_ACCEPTANCE_FILE),'utf8')):null}),null,2))}
 catch(e){console.error('RELEASE CANDIDATE BLOCKED: '+e.message);process.exitCode=2}
}
