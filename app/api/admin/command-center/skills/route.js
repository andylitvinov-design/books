import {ownerMaterialRequest} from '@/lib/clients/material-library-http';
import {privateJson} from '@/lib/clients/delivery-http';
import {transaction,consumeRate,closeDatabase} from '@/lib/app/database';
import {ccUuid} from '@/lib/command-center/contracts.mjs';
import {CRON_SKILLS,validateCronJob} from '@/lib/command-center/cron-skills.mjs';
import {readCronJobs,saveCronJob,controlCronJob} from '@/lib/command-center/cron-jobs.mjs';
import {createAutomation,updateAutomation,assignAutomationAgent,CRON_AGENT_PROFILES,CRON_SYSTEM_JOBS,CRON_BRAIN_SOURCES} from '@/lib/command-center/cron-automations.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;
export const maxDuration=20;
export async function GET(request){
 try{return await ownerMaterialRequest(request,async({config})=>{
  if(new URL(request.url).search)return privateJson({error:'INVALID_QUERY'},400);
  const state=await transaction(config,null,db=>readCronJobs(db),{server:true});
  return privateJson({...state,catalog:CRON_SKILLS,systemJobs:CRON_SYSTEM_JOBS,brainSources:CRON_BRAIN_SOURCES,agentProfiles:CRON_AGENT_PROFILES});
 });}catch{return privateJson({error:'SKILL_REGISTRY_UNAVAILABLE'},503);}
 finally{await closeDatabase();}
}
export async function POST(request){
 const origin=request.headers.get('origin');
 if(!origin||origin!==new URL(request.url).origin)return privateJson({error:'CROSS_ORIGIN_DENIED'},403);
 try{return await ownerMaterialRequest(request,async({config,data})=>{
  if(!data||!ccUuid(data.requestId)||typeof data.action!=='string')
   return privateJson({error:'INVALID_CONTROL'},400);
  await consumeRate(config,'owner-command-center-skills',6,60);
  let result;
  if(data.action==='save_job'){
   if(Object.keys(data).some(k=>!['action','requestId','skillId','schedule','projectKey','enabled'].includes(k))||
     !validateCronJob(data))return privateJson({error:'INVALID_JOB'},400);
   result=await transaction(config,null,db=>saveCronJob(db,data,data.requestId),{server:true});
  }else if(data.action==='create_custom_job'){
   if(Object.keys(data).some(k=>!['action','requestId','title','instruction','schedule',
     'skillIds','brainScope','agentRole','enabled'].includes(k)))
    return privateJson({error:'INVALID_AUTOMATION'},400);
   result=await transaction(config,null,db=>createAutomation(db,data,data.requestId),{server:true});
  }else if(data.action==='update_job'){
   if(Object.keys(data).some(k=>!['action','requestId','jobId','expectedRevision','title',
     'instruction','schedule','skillIds','brainScope','agentRole','enabled'].includes(k)))
    return privateJson({error:'INVALID_AUTOMATION'},400);
   result=await transaction(config,null,db=>updateAutomation(db,data,data.requestId),{server:true});
  }else if(data.action==='assign_agent'){
   if(Object.keys(data).some(k=>!['action','requestId','jobId','expectedRevision','agentRole'].includes(k)))
    return privateJson({error:'INVALID_AGENT_ASSIGNMENT'},400);
   result=await transaction(config,null,db=>assignAutomationAgent(db,data,data.requestId),{server:true});
  }else if(data.action==='control_job'){
   if(Object.keys(data).some(k=>!['action','requestId','jobId','mode'].includes(k))||
     !ccUuid(data.jobId)||!['pause','resume','queue_now'].includes(data.mode))
    return privateJson({error:'INVALID_CONTROL'},400);
   result=await transaction(config,null,db=>controlCronJob(db,
    {jobId:data.jobId,action:data.mode,requestId:data.requestId}),{server:true});
  }else return privateJson({error:'INVALID_ACTION'},400);
  const code=['invalid','limit','not_found','runtime_unavailable','running','revision_conflict','blocked_no_runner'].includes(result.status)?409:200;
  return privateJson(result,code);
 },{body:true});}catch{return privateJson({error:'SKILL_ACTION_UNAVAILABLE'},503);}
 finally{await closeDatabase();}
}
