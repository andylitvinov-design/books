#!/usr/bin/env node
// Shared reservation CLI. Must run in an isolated scheduler database.
import pg from 'pg';
import {execFileSync} from 'node:child_process';
const {Client}=pg;
const url=process.env.HH_LAB_SCHEDULER_DATABASE_URL;
const expected=process.env.HH_LAB_SCHEDULER_DATABASE_HOST;
if(!url||!expected)throw Error('Isolated scheduler database is not configured');
const parsed=new URL(url);
if(parsed.hostname!==expected||expected==='db.shervdixkaxurnaecioe.supabase.co'||!expected.startsWith('db.'))throw Error('Scheduler host is not an approved isolated database');
if(process.env.HH_LAB_ISOLATED_SERVICES!=='verified'||process.env.HH_LAB_COST_APPROVED!=='verified')throw Error('Lab isolation and cost evidence missing');
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(!/^[0-9a-f]{40}$/.test(sha))throw Error('Invalid SHA');
const client=new Client({connectionString:url,ssl:{rejectUnauthorized:true},connectionTimeoutMillis:5000});
try{
 await client.connect();
 const {rows}=await client.query('select accepted,reason,request_id from hh_lab_ops.reserve_preview($1)',[sha]);
 const result=rows[0];
 console.log(JSON.stringify({accepted:result?.accepted===true,reason:result?.reason,request_id:result?.request_id}));
 if(result?.accepted!==true)process.exitCode=2;
}finally{await client.end().catch(()=>{});}
