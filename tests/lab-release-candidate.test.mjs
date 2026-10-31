import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {prepareReleaseCandidate} from '../scripts/lab-release-candidate.mjs';
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
test('release candidate requires QA, committed changes, and correct base',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'hh-rc-'));
 try{
  git(dir,'init','-q');git(dir,'config','user.email','test@example.invalid');git(dir,'config','user.name','Lab Test');
  await writeFile(join(dir,'base.txt'),'base');git(dir,'add','base.txt');git(dir,'commit','-qm','base');
  const base=git(dir,'rev-parse','HEAD');
  await writeFile(join(dir,'.hh-lab-task.json'),JSON.stringify({id:'LAB-101',title:'Improve meditation editor',owner:'agent-a',baseSha:base}));
  await assert.rejects(prepareReleaseCandidate(dir,{}),/QA evidence/);
  await assert.rejects(prepareReleaseCandidate(dir,{qaPassed:true,testEvidence:true}),/No committed changes/);
  await writeFile(join(dir,'feature.txt'),'feature');git(dir,'add','feature.txt');git(dir,'commit','-qm','feature');
  const acceptance={accepted:true,headSha:git(dir,'rev-parse','HEAD'),reviewEvidenceId:'review-123'};
  const packet=await prepareReleaseCandidate(dir,{qaPassed:true,testEvidence:true,acceptance});
  assert.equal(packet.status,'RELEASE_CANDIDATE');assert.equal(packet.pr,null);assert.deepEqual(packet.changedFiles,['feature.txt']);
  const repeated=await prepareReleaseCandidate(dir,{qaPassed:true,testEvidence:true,acceptance});
  assert.equal(repeated.headSha,packet.headSha);
  await writeFile(join(dir,'extra.txt'),'untracked');
  await assert.rejects(prepareReleaseCandidate(dir,{qaPassed:true,testEvidence:true,acceptance}),/Untracked files/);
 }finally{await rm(dir,{recursive:true,force:true})}
});

test('never publish Lab metadata as application changes',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'hh-rc-meta-'));
 try{
  git(dir,'init','-q');git(dir,'config','user.email','test@example.invalid');git(dir,'config','user.name','Lab Test');
  await writeFile(join(dir,'base.txt'),'base');git(dir,'add','base.txt');git(dir,'commit','-qm','base');
  const base=git(dir,'rev-parse','HEAD');
  await writeFile(join(dir,'.hh-lab-task.json'),JSON.stringify({id:'LAB-105',title:'Improve course page',owner:'agent-b',baseSha:base}));
  git(dir,'add','.hh-lab-task.json');git(dir,'commit','-qm','accidental manifest');
  await assert.rejects(prepareReleaseCandidate(dir,{qaPassed:true,testEvidence:true,acceptance:{accepted:true,headSha:git(dir,'rev-parse','HEAD'),reviewEvidenceId:'review-123'}}),/metadata must never/);
 }finally{await rm(dir,{recursive:true,force:true})}
});

test('rejects release candidate without independent acceptance',async()=>{const dir=await mkdtemp(join(tmpdir(),'hh-rc-no-accept-'));try{git(dir,'init','-q');git(dir,'config','user.email','test@example.invalid');git(dir,'config','user.name','Lab Test');await writeFile(join(dir,'base.txt'),'base');git(dir,'add','base.txt');git(dir,'commit','-qm','base');const base=git(dir,'rev-parse','HEAD');await writeFile(join(dir,'.hh-lab-task.json'),JSON.stringify({id:'LAB-106',title:'Improve course navigation',owner:'agent-a',baseSha:base}));await writeFile(join(dir,'feature.txt'),'new');git(dir,'add','feature.txt');git(dir,'commit','-qm','feature');await assert.rejects(prepareReleaseCandidate(dir,{qaPassed:true,testEvidence:true}),/Independent acceptance/)}finally{await rm(dir,{recursive:true,force:true})}});
