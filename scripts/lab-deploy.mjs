#!/usr/bin/env node
// Holistic House Lab: fail-closed local preview publisher. Node 22+.
import {mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {resolve,join} from 'node:path';
const root=resolve(process.env.HH_LAB_WORKDIR||'.');
const state=resolve(process.env.HH_LAB_STATE_DIR||join(root,'.hh-lab-state'));
const project='prj_bjwATbHF61gzEhfsrNe54lEnvJZw';
const team='team_OSf690d0nxRHWVMXCElA8i95';
function block(message){throw Error('LAB BLOCKED: '+message)}
function command(bin,args,timeout=30000){const p=spawnSync(bin,args,{cwd:root,encoding:'utf8',timeout,env:process.env});if(p.status!==0)block(bin+' failed: '+(p.stderr||p.stdout||'').slice(0,300));return p.stdout.trim()}
async function main(){
 if(process.env.HH_LAB_PREVIEW_ENABLED!=='true')block('preview is not enabled');
 if(process.env.HH_LAB_ISOLATED_SERVICES!=='true')block('isolated test services not certified');
 if(process.env.HH_LAB_COST_APPROVED!=='true')block('billing budget not certified');
 if(process.env.HH_LAB_CENTRAL_LEASE_VERIFIED!=='true')block('multi-agent lease not verified');
 // These flags are NOT sufficient: the central lease and isolation must be enforced by external infrastructure.
 block('Centralized lease and isolated test services are not yet implemented. Do not deploy.');
 if(process.env.VERCEL_PROJECT_ID!==project||process.env.VERCEL_ORG_ID!==team)block('wrong Vercel project');
 if(!process.env.VERCEL_TOKEN)block('missing Vercel token');
 const sha=command('git',['rev-parse','HEAD']);
 if(!/^[a-f0-9]{40}$/.test(sha)||command('git',['status','--porcelain']))block('source not clean');
 const cfg=join(root,'ops/vercel.lab.json');
 const config=JSON.parse(await readFile(cfg,'utf8'));
 if(config.ignoreCommand!=='exit 1'||config.git?.deploymentEnabled?.['**']!==false)block('unexpected Lab config');
 await mkdir(state,{recursive:true});
 const lock=join(state,'lock');
 try{await mkdir(lock)}catch{block('local lease busy')}
 try{
  const path=join(state,'history.json');let history=[];
  try{history=JSON.parse(await readFile(path,'utf8'))}catch(e){if(e.code!=='ENOENT')block('history unreadable')}
  const now=Date.now();history=history.filter(x=>now-x.time<86400000);
  if(history.length>=12||history.some(x=>now-x.time<1800000)||history.some(x=>x.sha===sha))block('rate limit or duplicate SHA');
  history.push({sha,time:now,status:'requested'});await writeFile(path,JSON.stringify(history,null,2));
  const url=command('vercel',['deploy','--yes','--local-config',cfg,'--scope','super10'],900000).split('\n').findLast(x=>/^https:\/\//.test(x.trim()));
  if(!url)block('missing deployment URL');
  const inspected=command('vercel',['inspect',url,'--scope','super10'],60000);
  if(!/Target:\s*preview/i.test(inspected)||/Target:\s*production/i.test(inspected))block('target is not confirmed preview: cancel deployment');
  history[history.length-1].status='preview-verified';history[history.length-1].url=url;
  await writeFile(path,JSON.stringify(history,null,2));process.stdout.write(url+'\n');
 }finally{await rm(lock,{recursive:true,force:true})}
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
