#!/usr/bin/env node
// LAB worktree bootstrap. No PR, no push, no deployment.
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {planLabWork} from './lab-work-item.mjs';
function git(args,cwd){return execFileSync('git',args,{cwd,encoding:'utf8',timeout:30000}).trim()}
export async function createLabWorkspace(item,{repo=process.cwd(),root=resolve(repo,'..','hh-lab-workspaces')}={}){
 const plan=planLabWork(item);
 if(plan.requiresPr||plan.route!=='lab')throw Error('Not a local Lab task');
 const base=git(['rev-parse','refs/remotes/origin/codex/public-book-library'],repo);
 if(base.toLowerCase()!==plan.baseSha.toLowerCase())throw Error('Production tracking ref differs from approved base SHA; fetch and re-plan');
 if(git(['status','--porcelain'],repo))throw Error('Source worktree must be clean');
 await mkdir(root,{recursive:true});
 const target=join(root,plan.id.toLowerCase());
 // git worktree add fails rather than silently overwriting an existing worktree.
 git(['worktree','add','--detach',target,base],repo);
 const manifest={...plan,createdAt:new Date().toISOString(),baseRef:'origin/codex/public-book-library',releaseStatus:'LOCAL',pr:null,labUrl:null};
 await writeFile(join(target,'.hh-lab-task.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
 return {workspace:target,manifest};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const path=process.argv[2];if(!path)throw Error('Usage: node scripts/lab-workspace.mjs task.json');
  const item=JSON.parse(await readFile(resolve(path),'utf8'));
  const result=await createLabWorkspace(item);
  console.log(JSON.stringify(result,null,2));
 }catch(e){console.error('LAB WORKSPACE BLOCKED: '+e.message);process.exitCode=2}
}
