#!/usr/bin/env node
/** Read-only local-source planner. Does NOT download/stream/reuse any stock media. */
import {readFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {buildSourcingQueue,sourceQueueCsv} from '../lib/video-vault/sourcing-queue.mjs';
function exit(message){console.error(message);process.exitCode=2}
const args=process.argv.slice(2);
const inputArg=args.find(a=>a.startsWith('--input='));
const csv=args.includes('--csv');
const unknown=args.filter(a=>a!=='--json'&&a!=='--csv'&&!a.startsWith('--input='));
if(!inputArg||unknown.length||args.includes('--csv')&&args.includes('--json')){
 exit('Usage: node scripts/plan-video-vault-sourcing.mjs --input=local-research-candidates.json [--json|--csv]');
}else{
 try{
  const path=resolve(inputArg.slice(8));
  if(statSync(path).size>2_000_000)throw Error('INPUT_TOO_LARGE');
  const source=JSON.parse(readFileSync(path,'utf8'));
  const report=buildSourcingQueue(source);
  console.log(csv?sourceQueueCsv(report):JSON.stringify(report,null,2));
 }catch(e){exit('HH_SOURCE_QUEUE_'+(e?.code||e?.message||'FAILED'))}
}
