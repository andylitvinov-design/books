#!/usr/bin/env node
// Fail-closed scheduler client. Only an explicitly allowlisted isolated Postgres host.
import pg from 'pg';
import {execFileSync} from 'node:child_process';
const {Client}=pg;
function requireIsolatedDb(raw,allowedHost){
 if(!raw||!allowedHost)throw Error('Isolated scheduler database is not configured');
 const url=new URL(raw);
 if(url.protocol!=='postgres:'&&url.protocol!=='postgresql:')throw Error('Invalid database protocol');
 if(url.hostname!==allowedHost||url.hostname==='db.shervdixkaxurnaecioe.supabase.co')throw Error('Unapproved scheduler host');
 if(!url.username||!url.password||!url.pathname||url.pathname==='/')throw Error('Incomplete scheduler credentials');
 return url;
}
export {requireIsolatedDb};
async function main(){
 const url=requireIsolatedDb(process.env.HH_LAB_SCHEDULER_DATABASE_URL,process.env.HH_LAB_SCHEDULER_DATABASE_HOST);
 if(process.env.HH_LAB_ISOLATED_SERVICES!=='verified'||process.env.HH_LAB_COST_APPROVED!=='verified')throw Error('Lab isolation and cost evidence missing');
 const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(!/^[0-9a-f]{40}$/.test(sha))throw Error('Invalid SHA');
 const client=new Client({connectionString:url.toString(),ssl:{rejectUnauthorized:true},connectionTimeoutMillis:5000});
 try{
  await client.connect();
  const {rows}=await client.query('select accepted,reason,request_id from hh_lab_ops.reserve_preview($1)',[sha]);
  const result=rows[0];
  console.log(JSON.stringify({accepted:result?.accepted===true,reason:result?.reason,request_id:result?.request_id}));
  if(result?.accepted!==true)process.exitCode=2;
 }finally{await client.end().catch(()=>{});}
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href)main().catch(e=>{console.error(e.message);process.exitCode=1});
