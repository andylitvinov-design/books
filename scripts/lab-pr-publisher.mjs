#!/usr/bin/env node
// Manual, fail-closed release PR publisher. Requires a release packet and GitHub CLI.
// No automatic merging or production deployment. Run only by the exclusive release owner.
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const REPO='andylitvinov-design/books';
const BASE='codex/public-book-library';
const SHA=/^[a-f0-9]{40}$/i;
function command(bin,args,cwd){return execFileSync(bin,args,{cwd,encoding:'utf8',timeout:45000,maxBuffer:8*1024*1024}).trim()}
export function validatePublish(packet,{head,base,prs}={}){
 if(packet?.status!=='RELEASE_CANDIDATE'||packet?.targetBranch!==BASE)return 'invalid-release-packet';
 if(!SHA.test(head||'')||!SHA.test(base||'')||packet.headSha!==head||packet.baseSha!==base)return 'stale-sha';
 if(packet.qaPassed!==true||packet.testEvidence!==true)return 'missing-qa';
 if(!Array.isArray(packet.changedFiles)||!packet.changedFiles.length||packet.changedFiles.some(f=>f.startsWith('.hh-lab-')))return 'invalid-diff';
 if(!Array.isArray(prs))return 'missing-pr-inventory';
 if(prs.some(pr=>pr.headRefName==='release/'+packet.id.toLowerCase()||pr.headRefOid===head||pr.title?.includes('['+packet.id+']')))return 'existing-pr';
 return null;
}
export async function publishRelease(workspace,{execute=false}={}){
 const cwd=resolve(workspace);
 const packet=JSON.parse(await readFile(join(cwd,'.hh-lab-release.json'),'utf8'));
 const head=command('git',['rev-parse','HEAD'],cwd);
 const base=command('git',['rev-parse','refs/remotes/origin/'+BASE],cwd);
 const prs=JSON.parse(command('gh',['pr','list','--repo',REPO,'--state','open','--limit','500','--json','headRefName,headRefOid,title'],cwd));
 const error=validatePublish(packet,{head,base,prs});
 if(error)throw Error('Release blocked: '+error);
 if(command('git',['status','--porcelain','--untracked-files=no'],cwd))throw Error('Dirty tracked files');
 const releaseBranch='release/'+packet.id.toLowerCase();
 const remote=command('git',['remote','get-url','origin'],cwd);
 if(!/github\.com[:/]andylitvinov-design\/books(?:\.git)?$/.test(remote))throw Error('Unexpected Git remote');
 const result={ready:true,releaseBranch,head,base,files:packet.changedFiles,action:execute?'publish':'dry-run'};
 if(!execute)return result;
 if(process.env.HH_RELEASE_OWNER_LEASE_VERIFIED!=='true'||process.env.HH_RELEASE_PR_WRITE_ENABLED!=='true')throw Error('Release owner lease and write permission required');
 // Recheck production branch from GitHub immediately before writing.
 const liveBase=command('gh',['api','repos/'+REPO+'/git/ref/heads/'+BASE,'--jq','.object.sha'],cwd);
 if(liveBase!==base)throw Error('Remote production base changed');
 command('git',['push','origin',head+':refs/heads/'+releaseBranch],cwd);
 const url=command('gh',['pr','create','--repo',REPO,'--base',BASE,'--head',releaseBranch,'--title','['+packet.id+'] '+packet.title,'--body','Lab release candidate '+packet.id+'\\n\\nQA evidence must be independently verified on exact HEAD. No bypass of required CI/review.'],cwd);
 return {...result,prUrl:url};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{console.log(JSON.stringify(await publishRelease(process.argv[2]||'.',{execute:process.argv.includes('--execute')}),null,2))}
 catch(e){console.error('RELEASE PUBLISH BLOCKED: '+e.message);process.exitCode=2}
}
