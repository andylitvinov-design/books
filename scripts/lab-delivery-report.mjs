#!/usr/bin/env node
// Offline delivery evidence report. Consumes snapshots from trusted API collectors;
// it does not fetch, push, merge, deploy or mutate production.
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {classifyDelivery} from './lab-delivery-evidence.mjs';
export function buildDeliveryReport(snapshot){
 if(!snapshot||typeof snapshot!=='object'||!Array.isArray(snapshot.features))throw Error('Invalid evidence snapshot');
 return {
  generatedAt:new Date().toISOString(),
  source:'supplied-evidence-snapshot',
  results:snapshot.features.map(feature=>{
   if(typeof feature.id!=='string'||!/^LAB-[1-9][0-9]*$/.test(feature.id))return {id:null,state:'UNVERIFIED',reason:'invalid-feature-id'};
   const result=classifyDelivery(feature);
   return {id:feature.id,...result};
  })
 };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  if(!process.argv[2])throw Error('Usage: node scripts/lab-delivery-report.mjs evidence.json');
  const input=JSON.parse(await readFile(resolve(process.argv[2]),'utf8'));
  const report=buildDeliveryReport(input);
  console.log(JSON.stringify(report,null,2));
  if(report.results.some(x=>x.state==='UNVERIFIED'))process.exitCode=2;
 }catch(e){console.error('DELIVERY REPORT BLOCKED: '+e.message);process.exitCode=2}
}
