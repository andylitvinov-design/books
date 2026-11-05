import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createLabWorkspace} from '../scripts/lab-workspace.mjs';
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
test('creates detached Lab worktree without PR or push',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'hh-lab-'));
 try{
  git(dir,'init','-q');
  git(dir,'config','user.email','test@example.invalid');
  git(dir,'config','user.name','Lab Test');
  git(dir,'commit','--allow-empty','-qm','initial');
  const sha=git(dir,'rev-parse','HEAD');
  git(dir,'update-ref','refs/remotes/origin/codex/public-book-library',sha);
  const item={id:'LAB-101',title:'Improve meditation editor',owner:'agent-a',baseSha:sha};
  const {workspace,manifest}=await createLabWorkspace(item,{repo:dir,root:join(dir,'workspaces')});
  assert.equal(manifest.pr,null);
  assert.equal(manifest.releaseStatus,'LOCAL');
  assert.equal(git(workspace,'rev-parse','HEAD'),sha);
  assert.equal(git(workspace,'branch','--show-current'),'');
  assert.equal(JSON.parse(await readFile(join(workspace,'.hh-lab-task.json'),'utf8')).id,'LAB-101');
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('rejects production base mismatch before writing workspace',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'hh-lab-invalid-'));
 try{
  git(dir,'init','-q');git(dir,'config','user.email','test@example.invalid');git(dir,'config','user.name','Lab Test');git(dir,'commit','--allow-empty','-qm','initial');
  const sha=git(dir,'rev-parse','HEAD');git(dir,'update-ref','refs/remotes/origin/codex/public-book-library',sha);
  await assert.rejects(createLabWorkspace({id:'LAB-102',title:'Improve video studio',owner:'agent-b',baseSha:'a'.repeat(40)},{repo:dir}),/differs/);
 }finally{await rm(dir,{recursive:true,force:true})}
});
